"use client";

import { useCallback, useRef, useState } from "react";
import { Bold, Eye, FileText, Hash, List, ListOrdered } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  name: string;
  defaultValue: string;
  required?: boolean;
};

type Tab = "write" | "preview";

function renderMarkdown(body: string) {
  return body.split("\n").map((line, i) => {
    if (line.startsWith("## ")) {
      return (
        <h2 key={i} className="mb-3 mt-8 font-heading text-lg font-semibold text-foreground">
          {line.slice(3)}
        </h2>
      );
    }
    if (line.startsWith("### ")) {
      return (
        <h3 key={i} className="mb-2 mt-6 font-heading text-base font-medium text-foreground">
          {line.slice(4)}
        </h3>
      );
    }
    if (line.startsWith("- ")) {
      return (
        <li key={i} className="ml-5 list-disc text-sm text-foreground/80">
          {renderInline(line.slice(2))}
        </li>
      );
    }
    if (/^\d+\. /.test(line)) {
      return (
        <li key={i} className="ml-5 list-decimal text-sm text-foreground/80">
          {renderInline(line.replace(/^\d+\. /, ""))}
        </li>
      );
    }
    if (line.trim() === "") return <div key={i} className="h-2" />;
    return (
      <p key={i} className="text-sm text-foreground/80">
        {renderInline(line)}
      </p>
    );
  });
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold text-foreground">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    ),
  );
}

function insertAtCursor(
  el: HTMLTextAreaElement,
  before: string,
  after = "",
  placeholder = "",
) {
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const selected = el.value.slice(start, end) || placeholder;
  const replacement = `${before}${selected}${after}`;
  el.setRangeText(replacement, start, end, "select");
  // Position cursor after inserted text
  const newPos = start + before.length + selected.length + after.length;
  el.setSelectionRange(newPos, newPos);
  el.focus();
  // Trigger React onChange equivalent
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

const TOOLBAR = [
  {
    label: "H2",
    icon: <Hash className="size-3.5" />,
    title: "Heading H2 (##)",
    action: (el: HTMLTextAreaElement) => {
      const start = el.selectionStart;
      const lineStart = el.value.lastIndexOf("\n", start - 1) + 1;
      const lineText = el.value.slice(lineStart, el.selectionEnd);
      if (lineText.startsWith("## ")) {
        el.setRangeText(lineText.slice(3), lineStart, lineStart + lineText.length, "end");
      } else {
        el.setSelectionRange(lineStart, lineStart);
        insertAtCursor(el, "## ", "", "Heading");
      }
    },
  },
  {
    label: "H3",
    icon: <Hash className="size-3" />,
    title: "Heading H3 (###)",
    action: (el: HTMLTextAreaElement) => {
      const start = el.selectionStart;
      const lineStart = el.value.lastIndexOf("\n", start - 1) + 1;
      const lineText = el.value.slice(lineStart, el.selectionEnd);
      if (lineText.startsWith("### ")) {
        el.setRangeText(lineText.slice(4), lineStart, lineStart + lineText.length, "end");
      } else {
        el.setSelectionRange(lineStart, lineStart);
        insertAtCursor(el, "### ", "", "Subheading");
      }
    },
  },
  {
    label: "Bold",
    icon: <Bold className="size-3.5" />,
    title: "Bold (**text**)",
    action: (el: HTMLTextAreaElement) => insertAtCursor(el, "**", "**", "bold text"),
  },
  {
    label: "Bullet",
    icon: <List className="size-3.5" />,
    title: "Bullet list",
    action: (el: HTMLTextAreaElement) => {
      const start = el.selectionStart;
      const lineStart = el.value.lastIndexOf("\n", start - 1) + 1;
      el.setSelectionRange(lineStart, lineStart);
      insertAtCursor(el, "- ", "", "");
    },
  },
  {
    label: "Numbered",
    icon: <ListOrdered className="size-3.5" />,
    title: "Numbered list",
    action: (el: HTMLTextAreaElement) => {
      const start = el.selectionStart;
      const lineStart = el.value.lastIndexOf("\n", start - 1) + 1;
      el.setSelectionRange(lineStart, lineStart);
      insertAtCursor(el, "1. ", "", "");
    },
  },
] as const;

export function ArticleEditor({ name, defaultValue, required }: Props) {
  const [tab, setTab] = useState<Tab>("write");
  const [value, setValue] = useState(defaultValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleToolbar = useCallback(
    (action: (el: HTMLTextAreaElement) => void) => {
      if (textareaRef.current) {
        action(textareaRef.current);
        setValue(textareaRef.current.value);
      }
    },
    [],
  );

  return (
    <div className="overflow-hidden rounded-md border border-input bg-transparent">
      {/* Tab bar + toolbar */}
      <div className="flex items-center gap-1 border-b border-input bg-muted/30 px-2 py-1.5">
        <button
          type="button"
          onClick={() => setTab("write")}
          className={cn(
            "flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors",
            tab === "write"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <FileText className="size-3.5" />
          Viết
        </button>
        <button
          type="button"
          onClick={() => setTab("preview")}
          className={cn(
            "flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors",
            tab === "preview"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Eye className="size-3.5" />
          Xem trước
        </button>

        {tab === "write" && (
          <>
            <div className="mx-1 h-4 w-px bg-border" />
            {TOOLBAR.map((btn) => (
              <Button
                key={btn.label}
                type="button"
                variant="ghost"
                size="sm"
                title={btn.title}
                className="h-6 px-1.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => handleToolbar(btn.action)}
              >
                {btn.icon}
              </Button>
            ))}
          </>
        )}
      </div>

      {/* Write pane */}
      {tab === "write" && (
        <textarea
          ref={textareaRef}
          name={name}
          value={value}
          required={required}
          onChange={(e) => setValue(e.target.value)}
          rows={28}
          className="w-full resize-y bg-transparent px-3 py-3 font-mono text-xs leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
          spellCheck={false}
        />
      )}

      {/* Preview pane */}
      {tab === "preview" && (
        <div className="min-h-[24rem] space-y-1 px-4 py-4 leading-relaxed">
          {value.trim() ? (
            renderMarkdown(value)
          ) : (
            <p className="text-sm text-muted-foreground">Chưa có nội dung.</p>
          )}
        </div>
      )}
    </div>
  );
}
