import { ImageResponse } from "next/og";

export const runtime = "edge";

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 116,
          background: "linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)",
          position: "relative",
        }}
      >
        <svg
          width="270"
          height="270"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M20 70L40 40L60 55L80 25"
            stroke="white"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M65 25H80V40"
            stroke="white"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div
          style={{
            position: "absolute",
            bottom: 48,
            fontSize: 48,
            fontWeight: 700,
            color: "rgba(255,255,255,0.9)",
            letterSpacing: 3,
          }}
        >
          SF
        </div>
      </div>
    ),
    { width: 512, height: 512 },
  );
}
