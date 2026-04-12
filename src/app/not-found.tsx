import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted ring-1 ring-border">
        <FileQuestion className="size-8 text-muted-foreground" />
      </div>
      <h1 className="font-heading text-3xl font-semibold text-foreground">
        404 — Không tìm thấy
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        Trang bạn tìm không tồn tại hoặc đã bị di chuyển. Kiểm tra URL hoặc quay về trang chính.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className={cn(buttonVariants({ size: "lg" }))}>
          Về trang chủ
        </Link>
        <Link
          href="/quotes"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
        >
          Tỷ giá live
        </Link>
        <Link
          href="/forum"
          className={cn(buttonVariants({ variant: "ghost", size: "lg" }))}
        >
          Diễn đàn
        </Link>
      </div>
    </div>
  );
}
