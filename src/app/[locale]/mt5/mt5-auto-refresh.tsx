"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { useRouter } from "@/i18n/navigation";

const REFRESH_MS = 5_000;

export function Mt5AutoRefresh({ label }: { label: string }) {
  const router = useRouter();

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      router.refresh();
    }, REFRESH_MS);

    return () => window.clearInterval(id);
  }, [router]);

  return (
    <div className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/25 px-2 py-1 text-xs text-muted-foreground">
      <RefreshCw className="size-3.5" aria-hidden />
      {label}
    </div>
  );
}
