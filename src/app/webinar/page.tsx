export const metadata = { title: "Webinar / Live" };

export default function WebinarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Webinar & livestream</h1>
        <p className="mt-2 text-zinc-400">
          Nhúng YouTube Live hoặc Zoom Webinar — thay <code className="font-mono">VIDEO_ID</code> bên dưới.
        </p>
      </div>
      <div className="aspect-video max-w-3xl overflow-hidden rounded-xl border border-zinc-800 bg-black">
        <iframe
          className="h-full w-full"
          src="https://www.youtube.com/embed/dQw4w9WgXcQ"
          title="Webinar placeholder"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      <p className="text-sm text-zinc-500">
        Lịch phát sóng có thể lưu trong CMS hoặc bảng <code className="font-mono">Event</code> sau.
      </p>
    </div>
  );
}
