import { TriangleAlert } from "lucide-react";

export function Disclaimer({
  variant = "default",
}: {
  variant?: "default" | "compact";
}) {
  if (variant === "compact") {
    return (
      <p className="text-xs leading-relaxed text-muted-foreground/70">
        <TriangleAlert className="mr-1 inline-block size-3 align-text-top" />
        Nội dung chỉ mang tính tham khảo, không phải tư vấn đầu tư. Giao dịch
        forex có rủi ro cao.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-amber-500/20 bg-amber-950/10 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
      <div className="flex items-center gap-1.5 font-medium text-amber-400/80">
        <TriangleAlert className="size-3.5" />
        Tuyên bố miễn trừ trách nhiệm
      </div>
      <p className="mt-1">
        Tín hiệu, phân tích và nội dung trên trang này chỉ mang tính chất tham
        khảo và giáo dục, <strong>không phải tư vấn đầu tư</strong>. Bạn tự
        chịu trách nhiệm về mọi quyết định giao dịch.
      </p>
    </div>
  );
}
