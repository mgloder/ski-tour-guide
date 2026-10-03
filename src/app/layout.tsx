import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Nav from "@/components/nav";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "SKI GUIDE — Exercise, Equipment & Places",
  description:
    "A human & AI-agent-friendly guide to ski exercises, equipment, and destinations. Exposes an MCP endpoint for programmatic access.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-black text-white">
        <Nav />
        <main className="flex-1">{children}</main>
        <footer className="border-t-2 border-white py-6 text-center text-xs font-mono text-zinc-500 uppercase tracking-widest">
          AI endpoint:{" "}
          <code className="text-zinc-300">POST /api/mcp</code>
          {"  —  "}
          <a href="/llms.txt" className="hover:text-[#ffd400] transition-colors">
            llms.txt
          </a>
        </footer>
      </body>
    </html>
  );
}
