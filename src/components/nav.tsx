"use client";

import Link from "next/link";
import ThemePanel from "@/components/theme-panel";
import LangToggle from "@/components/lang-toggle";
import { useLocale } from "@/components/i18n-provider";

export default function Nav() {
  const { t } = useLocale();

  return (
    <nav className="bx-navbar">
      <Link href="/" className="bx-navbar-brand">
        {t.nav.brand}
      </Link>
      <ul className="bx-navbar-nav">
        <li><Link href="/training"  className="bx-nav-link">{t.nav.training}</Link></li>
        <li><Link href="/equipment" className="bx-nav-link">{t.nav.equipment}</Link></li>
        <li><Link href="/places"    className="bx-nav-link">{t.nav.places}</Link></li>
      </ul>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginLeft: "auto" }}>
        <LangToggle />
        <a
          href="/api/mcp"
          target="_blank"
          rel="noopener noreferrer"
          className="bx-btn bx-btn-ghost bx-btn-xs"
        >
          MCP
        </a>
        <ThemePanel />
      </div>
    </nav>
  );
}
