import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = { params: Promise<{ locale: string; slug: string }> };

export default async function ArticleOgImage({ params }: Props) {
  const { slug } = await params;

  const article = await prisma.aiGeneratedArticle.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: { title: true, keyword: true, summary: true },
  });

  const title = article?.title ?? "Forex Article";
  const keyword = article?.keyword ?? "Forex";
  const summary = article?.summary?.slice(0, 120) ?? "";

  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #0a0f1e 0%, #0f1e35 50%, #0d1a2e 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 64px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Top: site brand + keyword badge */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
                fontWeight: 700,
                color: "white",
              }}
            >
              T
            </div>
            <span style={{ color: "#94a3b8", fontSize: "20px", fontWeight: 600 }}>
              toolforex.xyz
            </span>
          </div>
          <div
            style={{
              background: "rgba(37,99,235,0.25)",
              border: "1px solid rgba(59,130,246,0.5)",
              color: "#93c5fd",
              padding: "6px 16px",
              borderRadius: "20px",
              fontSize: "16px",
              fontWeight: 600,
            }}
          >
            {keyword}
          </div>
        </div>

        {/* Middle: article title */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div
            style={{
              color: "#f1f5f9",
              fontSize: title.length > 60 ? "42px" : "52px",
              fontWeight: 700,
              lineHeight: 1.2,
              letterSpacing: "-0.5px",
            }}
          >
            {title}
          </div>
          {summary && (
            <div
              style={{
                color: "#94a3b8",
                fontSize: "22px",
                lineHeight: 1.5,
              }}
            >
              {summary}
            </div>
          )}
        </div>

        {/* Bottom: SEO label */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#22c55e",
            }}
          />
          <span style={{ color: "#64748b", fontSize: "16px" }}>
            Bài viết giáo dục forex · Educational forex article
          </span>
        </div>
      </div>
    ),
    size,
  );
}
