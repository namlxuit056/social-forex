import { PageCtaRow } from "@/components/layout/page-cta-row";
import { pageCtas } from "@/lib/page-cta-presets";

export const metadata = { title: "Webinar / Live" };

export default function WebinarPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          Webinar & livestream
        </h1>
        <p className="mt-2 text-muted-foreground">
          Nhúng YouTube Live hoặc Zoom Webinar — thay{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-sm">
            VIDEO_ID
          </code>{" "}
          bên dưới.
        </p>
      </div>
      <div className="aspect-video max-w-3xl overflow-hidden rounded-xl border border-border bg-black ring-1 ring-foreground/10">
        <iframe
          className="h-full w-full"
          src="https://www.youtube.com/embed/dQw4w9WgXcQ"
          title="Webinar placeholder"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      <p className="text-sm text-muted-foreground">
        Lịch phát sóng có thể lưu trong CMS hoặc bảng{" "}
        <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">Event</code>{" "}
        sau.
      </p>
      <PageCtaRow heading="Tiếp theo" items={[...pageCtas.learn, ...pageCtas.community]} />
    </div>
  );
}
