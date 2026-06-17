"use client";

import { useEffect, useRef } from "react";
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
  Link,
  List,
  Paragraph,
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

// Upload adapter that sends image to our Vercel Blob API
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

    const res = await fetch("/api/articles/images/upload", {
      method: "POST",
      body: formData,
    });

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
  repo.createUploadAdapter = (loader: FileLoader) =>
    new ArticleUploadAdapter(loader);
}

const PLUGINS = [
  Autoformat,
  BlockQuote,
  Bold,
  Essentials,
  FileRepository,
  Heading,
  HorizontalLine,
  Image,
  ImageCaption,
  ImageResize,
  ImageStyle,
  ImageToolbar,
  ImageUpload,
  Indent,
  IndentBlock,
  Italic,
  Link,
  List,
  Paragraph,
  Table,
  TableToolbar,
];

const TOOLBAR = [
  "heading",
  "|",
  "bold",
  "italic",
  "link",
  "|",
  "bulletedList",
  "numberedList",
  "outdent",
  "indent",
  "|",
  "uploadImage",
  "blockQuote",
  "insertTable",
  "horizontalLine",
  "|",
  "undo",
  "redo",
];

const EDITOR_CONFIG = {
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
      "imageStyle:inline",
      "imageStyle:block",
      "imageStyle:wrapText",
      "|",
      "imageTextAlternative",
      "toggleImageCaption",
    ],
    resizeOptions: [
      { name: "resizeImage:original", value: null, label: "Original" },
      { name: "resizeImage:50", value: "50", label: "50%" },
      { name: "resizeImage:75", value: "75", label: "75%" },
    ],
  },
  table: {
    contentToolbar: ["tableColumn", "tableRow", "mergeTableCells"],
  },
  link: {
    addTargetToExternalLinks: true,
  },
};

type Props = {
  name: string;
  defaultValue: string;
  onValueChange?: (html: string) => void;
  required?: boolean;
};

export function ArticleEditorCK({ name, defaultValue, onValueChange, required }: Props) {
  const hiddenRef = useRef<HTMLInputElement>(null);

  // Keep hidden input in sync for native form submission
  useEffect(() => {
    if (hiddenRef.current) {
      hiddenRef.current.value = defaultValue;
    }
  }, [defaultValue]);

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
        .article-editor-ck .ck-toolbar__items button {
          color: hsl(var(--foreground)) !important;
        }
        .article-editor-ck .ck-toolbar__items button:hover,
        .article-editor-ck .ck-toolbar__items button.ck-on {
          background: hsl(var(--accent)) !important;
        }
        .article-editor-ck .ck-dropdown__panel {
          background: hsl(var(--popover)) !important;
          border-color: hsl(var(--border)) !important;
          color: hsl(var(--popover-foreground)) !important;
        }
        .article-editor-ck .ck-list__item .ck-button {
          color: hsl(var(--popover-foreground)) !important;
        }
        .article-editor-ck .ck-list__item .ck-button:hover {
          background: hsl(var(--accent)) !important;
        }
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
        onChange={(_event, editor) => {
          const html = editor.getData();
          if (hiddenRef.current) hiddenRef.current.value = html;
          onValueChange?.(html);
        }}
      />

      {/* Hidden input carries the HTML value on native form submit */}
      <input ref={hiddenRef} type="hidden" name={name} defaultValue={defaultValue} required={required} />
    </div>
  );
}
