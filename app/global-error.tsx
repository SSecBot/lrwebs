"use client";

/**
 * Kök düzenin kendisi hata verdiğinde gösterilir. Genel stiller yüklenmediği için
 * görünüm satır içi stillerle sitenin renklerine uyarlanmıştır.
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="tr">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
          textAlign: "center",
          background: "#020617",
          color: "#f8fafc",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <title>Bir hata oluştu</title>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>Bir şeyler ters gitti</h1>
        <p style={{ maxWidth: "28rem", marginTop: "0.75rem", fontSize: "0.875rem", lineHeight: 1.6, color: "#94a3b8" }}>
          Site şu anda yüklenemedi. Lütfen biraz sonra tekrar deneyin.
        </p>
        {error.digest ? (
          <p style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "#64748b", fontFamily: "ui-monospace, monospace" }}>
            Hata kodu: {error.digest}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => retry()}
          style={{
            marginTop: "2rem",
            border: 0,
            borderRadius: "0.5rem",
            padding: "0.75rem 1.25rem",
            background: "#06b6d4",
            color: "#020617",
            fontSize: "0.875rem",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Tekrar dene
        </button>
      </body>
    </html>
  );
}
