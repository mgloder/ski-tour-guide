import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Script from "next/script";
import Nav from "@/components/nav";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  metadataBase: new URL("https://theskihandbook.com"),
  title: {
    default: "The Ski Handbook — Training, Equipment & Places",
    template: "%s — The Ski Handbook",
  },
  description:
    "Your complete mountain sport reference — ski training, gear guides, and resort destinations for skiers and snowboarders of every level.",
  keywords: [
    "ski guide", "ski equipment", "ski training", "ski resorts",
    "snowboard guide", "backcountry skiing", "ski handbook",
    "avalanche safety", "ski gear", "mountain sport",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://theskihandbook.com",
    siteName: "The Ski Handbook",
    title: "The Ski Handbook",
    description:
      "Your complete mountain sport reference — ski training, gear guides, and resort destinations for skiers and snowboarders of every level.",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Ski Handbook",
    description:
      "Your complete mountain sport reference — ski training, gear guides, and resort destinations for skiers and snowboarders of every level.",
  },
  alternates: {
    canonical: "https://theskihandbook.com",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={geist.variable}>
      <head>
        <link rel="stylesheet" href="/brutalix.css" />
      </head>
      <body>
        <Script src="/brutalix.js" strategy="afterInteractive" />
        <div style={{
          maxWidth: "1100px",
          margin: "0 auto",
          border: "3px solid currentColor",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
        }}>
          <Nav />
          <main style={{ flex: 1 }}>{children}</main>
          <footer style={{ borderTop: "3px solid currentColor", padding: "1.5rem", textAlign: "center", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.5 }}>
            AI endpoint: <code>POST /api/mcp</code>
            {" — "}
            <a href="/llms.txt">llms.txt</a>
          </footer>
        </div>
      </body>
    </html>
  );
}
