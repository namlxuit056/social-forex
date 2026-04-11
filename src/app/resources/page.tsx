import Link from "next/link";
import { ebookResources } from "@/lib/content/resources";

export const metadata = { title: "Tài liệu & Ebook" };

export default function ResourcesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Kho tài liệu</h1>
        <p className="mt-2 text-zinc-400">
          PDF và liên kết ngoài — thay <code className="font-mono">href</code> khi có file thật.
        </p>
      </div>
      <ul className="space-y-3">
        {ebookResources.map((r) => (
          <li
            key={r.title}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3"
          >
            <div>
              <span className="font-medium text-zinc-100">{r.title}</span>
              {r.note && (
                <p className="mt-1 text-xs text-zinc-500">{r.note}</p>
              )}
            </div>
            <Link
              href={r.href}
              className="text-sm text-emerald-500 hover:underline"
            >
              {r.kind === "pdf" ? "Tải / xem" : "Mở"}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
