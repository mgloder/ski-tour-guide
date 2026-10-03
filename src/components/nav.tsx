import Link from "next/link";

export default function Nav() {
  return (
    <nav className="bx-navbar">
      <Link href="/" className="bx-navbar-brand">
        The Ski Handbook
      </Link>
      <ul className="bx-navbar-nav">
        <li><Link href="/exercise" className="bx-nav-link">Exercise</Link></li>
        <li><Link href="/equipment" className="bx-nav-link">Equipment</Link></li>
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
