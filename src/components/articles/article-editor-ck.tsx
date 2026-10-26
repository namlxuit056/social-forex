"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import "ckeditor5/ckeditor5.css";
import {
  ClassicEditor,
  Autoformat,
  Bold,
  Italic,
  Essentials,
  Heading,
  Image,
  ImageCaption,
  ImageResize,
  ImageStyle,
  ImageToolbar,
  ImageUpload,
  FileRepository,
  FullPage,
  GeneralHtmlSupport,
  Link,
  List,
  Paragraph,
  SourceEditing,
  Table,
  TableToolbar,
  BlockQuote,
  HorizontalLine,
  Indent,
  IndentBlock,
  type Editor,
  type FileLoader,
} from "ckeditor5";
import { CKEditor } from "@ckeditor/ckeditor5-react";

class ArticleUploadAdapter {
  private loader: FileLoader;
  constructor(loader: FileLoader) {
    this.loader = loader;
  }
  async upload(): Promise<Record<string, string>> {
    const file = await this.loader.file;
    if (!file) throw new Error("No file");
    const formData = new FormData();
    formData.append("upload", file);
    const res = await fetch("/api/articles/images/upload", { method: "POST", body: formData });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.message ?? `Upload failed: ${res.status}`);
    }
    const { url } = (await res.json()) as { url: string };
    return { default: url };
  }
  abort() {}
}

function uploadAdapterPlugin(editor: Editor) {
  const repo = editor.plugins.get("FileRepository") as FileRepository & {
    createUploadAdapter: (loader: FileLoader) => ArticleUploadAdapter;
  };
  repo.createUploadAdapter = (loader: FileLoader) => new ArticleUploadAdapter(loader);
}

const PLUGINS = [
  Autoformat, BlockQuote, Bold, Essentials, FileRepository, Heading,
  HorizontalLine, Image, ImageCaption, ImageResize, ImageStyle, ImageToolbar,
  ImageUpload, Indent, IndentBlock, Italic, Link, List, Paragraph, Table, TableToolbar,
  FullPage, GeneralHtmlSupport, SourceEditing,
];

const TOOLBAR = [
  "heading", "|", "bold", "italic", "link", "|",
  "bulletedList", "numberedList", "outdent", "indent", "|",
  "uploadImage", "blockQuote", "insertTable", "horizontalLine", "|",
  "undo", "redo", "|", "sourceEditing",
];

const EDITOR_CONFIG = {
  licenseKey: "GPL",
  plugins: PLUGINS,
  extraPlugins: [uploadAdapterPlugin],
  toolbar: { items: TOOLBAR },
  heading: {
    options: [
      { model: "paragraph" as const, title: "Paragraph", class: "ck-heading_paragraph" },
      { model: "heading2" as const, view: "h2", title: "Heading 2", class: "ck-heading_heading2" },
      { model: "heading3" as const, view: "h3", title: "Heading 3", class: "ck-heading_heading3" },
    ],
  },
  image: {
    toolbar: [
      "imageStyle:inline", "imageStyle:block", "imageStyle:wrapText",
      "|", "imageTextAlternative", "toggleImageCaption",
    ],
    resizeOptions: [
      { name: "resizeImage:original", value: null, label: "Original" },
      { name: "resizeImage:50", value: "50", label: "50%" },
      { name: "resizeImage:75", value: "75", label: "75%" },
    ],
  },
  table: { contentToolbar: ["tableColumn", "tableRow", "mergeTableCells"] },
  link: { addTargetToExternalLinks: true },
  // Keep class/style on hand-written HTML (Source mode), and with FullPage a pasted
  // whole page keeps its <head><style>. The public page sanitizes the HTML and
  // scopes that CSS to the article (src/lib/article-styles.ts).
  htmlSupport: {
    allow: [{ name: /^(div|span|p|h[1-6]|ul|ol|li|table|thead|tbody|tr|th|td|blockquote|strong|em|figure|section)$/, classes: true as const, styles: true as const }],
  },
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function imageHtml(url: string, alt: string) {
  const safeUrl = escapeHtml(url);
  const safeAlt = escapeHtml(alt);
  return `<figure class="image"><img src="${safeUrl}" alt="${safeAlt}"><figcaption>${safeAlt}</figcaption></figure>`;
}

function insertImageNearLocation(html: string, url: string, alt: string, location?: string) {
  if (!location?.trim()) return null;

  const doc = new DOMParser().parseFromString(html, "text/html");
  const locationText = normalizeText(location);
  const headings = [...doc.body.querySelectorAll("h2, h3")];
  const target = headings.find((heading) => {
    const headingText = normalizeText(heading.textContent ?? "");
    return (
      headingText.length > 0 &&
      (locationText.includes(headingText) || headingText.includes(locationText))
    );
  });

  if (!target) return null;

  const template = doc.createElement("template");
  template.innerHTML = imageHtml(url, alt);
  const figure = template.content.firstElementChild;
  if (!figure) return null;

  target.insertAdjacentElement("afterend", figure);
  return doc.body.innerHTML;
}

export interface ArticleEditorCKHandle {
  setData: (html: string) => void;
  insertImage: (url: string, alt: string, location?: string) => void;
}

type Props = {
  defaultValue: string;
  onValueChange?: (html: string) => void;
};

export const ArticleEditorCK = forwardRef<ArticleEditorCKHandle, Props>(
  function ArticleEditorCK({ defaultValue, onValueChange }, ref) {
    const editorRef = useRef<Editor | null>(null);

    useImperativeHandle(ref, () => ({
      setData(html: string) {
        if (!editorRef.current) return;
        editorRef.current.setData(html);
        onValueChange?.(html);
      },
      insertImage(url: string, alt: string, location?: string) {
        const editor = editorRef.current;
        if (!editor) return;

        const current = editor.getData();
        const locationMatch = insertImageNearLocation(current, url, alt, location);
        if (locationMatch) {
          editor.setData(locationMatch);
          onValueChange?.(locationMatch);
          return;
        }

        editor.model.change(() => {
          const viewFragment = editor.data.processor.toView(imageHtml(url, alt));
          const modelFragment = editor.data.toModel(viewFragment);
          editor.model.insertContent(modelFragment, editor.model.document.selection);
        });

        const next = editor.getData();
        onValueChange?.(next);
      },
    }));

    return (
      <div className="article-editor-ck">
        <style>{`
          .article-editor-ck .ck-editor__editable {
            min-height: 480px;
            background: hsl(var(--background)) !important;
            color: hsl(var(--foreground)) !important;
            border-color: hsl(var(--input)) !important;
          }
          .article-editor-ck .ck-toolbar {
            background: hsl(var(--muted)) !important;
            border-color: hsl(var(--input)) !important;
          }
          .article-editor-ck .ck-toolbar__items button { color: hsl(var(--foreground)) !important; }
          .article-editor-ck .ck-toolbar__items button:hover,
          .article-editor-ck .ck-toolbar__items button.ck-on { background: hsl(var(--accent)) !important; }
          .article-editor-ck .ck-dropdown__panel {
            background: hsl(var(--popover)) !important;
            border-color: hsl(var(--border)) !important;
            color: hsl(var(--popover-foreground)) !important;
          }
          .article-editor-ck .ck-list__item .ck-button { color: hsl(var(--popover-foreground)) !important; }
          .article-editor-ck .ck-list__item .ck-button:hover { background: hsl(var(--accent)) !important; }
          .article-editor-ck .ck-editor__editable h2 { font-size: 1.25rem; font-weight: 600; margin: 1.5rem 0 0.5rem; }
          .article-editor-ck .ck-editor__editable h3 { font-size: 1.1rem; font-weight: 500; margin: 1.25rem 0 0.5rem; }
          .article-editor-ck .ck-editor__editable p  { margin: 0.5rem 0; line-height: 1.7; }
          .article-editor-ck .ck-editor__editable ul,
          .article-editor-ck .ck-editor__editable ol { padding-left: 1.5rem; margin: 0.5rem 0; }
          .article-editor-ck .ck-editor__editable img { max-width: 100%; border-radius: 0.5rem; }
          .article-editor-ck .ck-editor__editable figure { margin: 1rem 0; }
          .article-editor-ck .ck-focused { border-color: hsl(var(--ring)) !important; }
        `}</style>

        <CKEditor
          editor={ClassicEditor}
          config={EDITOR_CONFIG}
          data={defaultValue}
          onReady={(editor) => { editorRef.current = editor; }}
          onChange={(_event, editor) => onValueChange?.(editor.getData())}
        />
      </div>
    );
  },
);
