"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ErrorBoundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-destructive/10 ring-1 ring-destructive/30">
        <AlertTriangle className="size-8 text-destructive" />
      </div>
      <h1 className="font-heading text-3xl font-semibold text-foreground">
        Đã xảy ra lỗi
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        Ứng dụng gặp sự cố khi xử lý yêu cầu. Bạn có thể thử lại hoặc quay về trang chủ.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-xs text-muted-foreground">
          Mã lỗi: {error.digest}
        </p>
      )}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button size="lg" onClick={reset}>
          Thử lại
        </Button>
        <Link href="/" className={cn(buttonVariants({ size: "lg", variant: "outline" }))}>
          Về trang chủ
        </Link>
      </div>
    </div>
  );
}
