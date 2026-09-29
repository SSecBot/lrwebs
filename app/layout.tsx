import type { Metadata, Viewport } from "next";
import { ToastProvider } from "@/components/ui/toast";
import type { CSSProperties } from "react";
import { getCms } from "@/lib/cms";
import { BASE_SIZES, effectiveWeight, fontStack } from "@/lib/font-catalog";
import { fontVariables } from "@/lib/fonts";
import { iconMimeType, resolveFavicon, resolveTitleTemplate } from "@/lib/site-identity";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { general } = await getCms();
  // Tüm sekme kimliği yönetim panelinden gelir; hatalı/elle bozulmuş değerlerde güvenli varsayılana düşülür.
  const favicon = resolveFavicon(general);
  const iconType = iconMimeType(favicon);
  let metadataBase: URL | undefined;
  try {
    metadataBase = new URL(general.siteUrl);
  } catch {
    metadataBase = undefined;
  }
  return {
    metadataBase,
    title: { default: general.siteTitle, template: resolveTitleTemplate(general) },
    icons: {
      icon: [{ url: favicon, type: iconType }],
      shortcut: [{ url: favicon, type: iconType }],
      apple: [{ url: favicon, type: iconType }],
    },
    description: general.siteDescription,
    keywords: general.keywords,
    applicationName: general.brandName,
    authors: [{ name: general.brandName }],
    creator: general.brandName,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      locale: "tr_TR",
      url: "/",
      siteName: general.brandName,
      title: general.siteTitle,
      description: general.siteDescription,
    },
    twitter: {
      card: "summary_large_image",
      title: general.siteTitle,
      description: general.siteDescription,
    },
    robots: { index: true, follow: true },
    formatDetection: { telephone: false, email: false, address: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#020617",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Yazı tipleri yönetim panelinden gelir (Yazı Tipleri sekmesi); kayıttan sonra anında uygulanır.
  const { typography: t } = await getCms();
  const fontStyle = {
    "--site-font-body": fontStack(t.bodyFont),
    "--site-font-heading": fontStack(t.headingFont),
    "--site-font-brand": fontStack(t.brandFont),
    "--site-heading-weight": String(effectiveWeight(t.headingFont, t.headingWeight)),
    "--site-brand-weight": String(effectiveWeight(t.brandFont, 700)),
    "--site-base-size": `${BASE_SIZES[t.baseSize] ?? 16}px`,
  } as CSSProperties;

  return (
    <html lang="tr" className={`${fontVariables} antialiased`} style={fontStyle}>
      <body className="min-h-dvh">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
