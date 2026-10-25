import Link from "next/link";
import ThemePanel from "@/components/theme-panel";

export default function Nav() {
  return (
    <nav className="bx-navbar">
      <Link href="/" className="bx-navbar-brand">
        The Ski Handbook
      </Link>
      <ul className="bx-navbar-nav">
        <li><Link href="/training" className="bx-nav-link">Training</Link></li>
        <li><Link href="/equipment" className="bx-nav-link">Equipment</Link></li>
        <li><Link href="/places" className="bx-nav-link">Places</Link></li>
      </ul>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginLeft: "auto" }}>
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
