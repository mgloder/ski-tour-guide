import Link from "next/link";

export default function Nav() {
  return (
    <nav className="bx-navbar">
      <Link href="/" className="bx-navbar-brand">
        The Ski Handbook
      </Link>
      <ul className="bx-navbar-nav">
        <li><span className="bx-nav-link" style={{ opacity: 0.3, cursor: "not-allowed", pointerEvents: "none" }}>Training</span></li>
        <li><span className="bx-nav-link" style={{ opacity: 0.3, cursor: "not-allowed", pointerEvents: "none" }}>Equipment</span></li>
        <li><Link href="/places" className="bx-nav-link">Places</Link></li>
      </ul>
      <a
        href="/api/mcp"
        target="_blank"
        rel="noopener noreferrer"
        className="bx-btn bx-btn-ghost bx-btn-xs"
      >
        MCP
      </a>
    </nav>
  );
}
