import Link from "next/link";

const links = [
  { href: "/exercise", label: "Exercise" },
  { href: "/equipment", label: "Equipment" },
  { href: "/places", label: "Places" },
];

export default function Nav() {
  return (
    <header className="border-b-2 border-white bg-black sticky top-0 z-50">
      <div className="mx-auto max-w-6xl px-4 flex items-center gap-8 h-14">
        <Link
          href="/"
          className="font-black uppercase tracking-widest text-white text-sm hover:text-[#ffd400] transition-colors"
        >
          Ski Guide
        </Link>
        <nav className="flex gap-1">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-xs font-bold uppercase tracking-widest px-3 py-1 border-2 border-transparent hover:border-white hover:text-[#ffd400] transition-colors"
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
            className="text-xs font-mono uppercase tracking-widest text-zinc-500 border border-zinc-700 px-2 py-0.5 hover:border-white hover:text-white transition-colors"
          >
            MCP
          </a>
        </div>
      </div>
    </header>
  );
}
