import Link from "next/link";

const links = [
  { href: "/exercise", label: "Exercise" },
  { href: "/equipment", label: "Equipment" },
  { href: "/places", label: "Places" },
];

export default function Nav() {
  return (
    <header className="border-b border-white/10 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
      <div className="mx-auto max-w-6xl px-4 flex items-center gap-8 h-14">
        <Link href="/" className="font-semibold text-white tracking-tight">
          Ski Guide
        </Link>
        <nav className="flex gap-6">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-sm text-slate-300 hover:text-white transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto">
          <a
            href="/api/mcp"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            MCP endpoint
          </a>
        </div>
      </div>
    </header>
  );
}
