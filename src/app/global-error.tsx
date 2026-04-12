"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="vi">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, sans-serif",
          background: "#09090b",
          color: "#fafafa",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          textAlign: "center",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
            Lỗi nghiêm trọng
          </h1>
          <p style={{ color: "#a1a1aa", maxWidth: "24rem", margin: "0 auto" }}>
            Ứng dụng không thể tải. Vui lòng thử lại.
          </p>
          {error.digest && (
            <p
              style={{
                marginTop: "0.5rem",
                fontFamily: "monospace",
                fontSize: "0.75rem",
                color: "#71717a",
              }}
            >
              {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              padding: "0.5rem 1.5rem",
              borderRadius: "0.5rem",
              border: "1px solid #3f3f46",
              background: "#18181b",
              color: "#fafafa",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            Thử lại
          </button>
        </div>
      </body>
    </html>
  );
}
