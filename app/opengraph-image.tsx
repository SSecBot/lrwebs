import { ImageResponse } from "next/og";
import { getCms } from "@/lib/cms";

export const alt = "LrWebs — Modern Web Geliştirme ve Dijital Ajans";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const { general } = await getCms();
  const brand = general.brandName;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: "#020617",
        backgroundImage: "linear-gradient(#0f172a 1px, transparent 1px), linear-gradient(90deg, #0f172a 1px, transparent 1px)",
        backgroundSize: "48px 48px",
        color: "#f8fafc",
        fontFamily: "monospace",
      }}
    >
      <div style={{ display: "flex", fontSize: 44, fontWeight: 700 }}>
        <span>{brand.slice(0, 2)}</span>
        <span style={{ color: "#06b6d4" }}>{brand.slice(2)}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", fontSize: 62, fontWeight: 700, lineHeight: 1.15, maxWidth: 980 }}>
          {general.siteTagline || general.siteTitle}
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: 26, color: "#94a3b8" }}>
          <span style={{ color: "#f59e08" }}>●</span>
          <span>{general.siteUrl.replace(/^https?:\/\//, "")}</span>
        </div>
      </div>
    </div>,
    size,
  );
}
