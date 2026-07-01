import { ImageResponse } from "next/og";

export const runtime = "edge";

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 192,
          height: 192,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 44,
          background: "linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)",
          position: "relative",
        }}
      >
        <svg
          width="100"
          height="100"
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
            bottom: 18,
            fontSize: 18,
            fontWeight: 700,
            color: "rgba(255,255,255,0.9)",
            letterSpacing: 1,
          }}
        >
          SF
        </div>
      </div>
    ),
    { width: 192, height: 192 },
  );
}
