import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Poppins } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import { getCms } from "@/lib/cms";
import { iconMimeType, resolveFavicon, resolveTitleTemplate } from "@/lib/site-identity";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin", "latin-ext"],
  weight: ["700"],
  display: "swap",
});

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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className={`${poppins.variable} ${jetbrains.variable} antialiased`}>
      <body className="min-h-dvh">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
