import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Nav from "@/components/nav";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "Ski Guide — Exercise, Equipment & Places",
  description:
    "A human & AI-agent-friendly guide to ski exercises, equipment, and destinations. Exposes an MCP endpoint for programmatic access.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100">
        <Nav />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-white/5 py-6 text-center text-xs text-slate-600">
          AI-agent endpoint: <code className="text-slate-500">POST /api/mcp</code> &mdash;{" "}
          <a href="/llms.txt" className="hover:text-slate-400 transition-colors">
            llms.txt
          </a>
        </footer>
      </body>
    </html>
  );
}
