import Link from "next/link";

const modules = [
  {
    href: "/exercise",
    title: "Exercise",
    description:
      "Technique drills, off-snow conditioning, and balance work. From beginner parallel turns to expert carving.",
  },
  {
    href: "/equipment",
    title: "Equipment",
    description:
      "Gear guides covering skis, boots, poles, helmets, safety equipment, and clothing with maintenance tips.",
  },
  {
    href: "/places",
    title: "Places",
    description:
      "Resort and destination guides with piste breakdowns, altitude data, and best-season recommendations.",
  },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-20">
      <div className="mb-16">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Ski Guide</h1>
        <p className="text-lg text-slate-400 max-w-2xl">
          A reference for skiers and AI agents alike — covering exercises, equipment, and mountain
          destinations. All content is available via the{" "}
          <a href="/api/mcp" className="text-sky-400 hover:text-sky-300 transition-colors">
            MCP endpoint
          </a>{" "}
          and{" "}
          <a href="/llms.txt" className="text-sky-400 hover:text-sky-300 transition-colors">
            llms.txt
          </a>
          .
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {modules.map(({ href, title, description }) => (
          <Link
            key={href}
            href={href}
            className="group rounded-xl border border-white/10 p-6 hover:border-sky-500/50 hover:bg-white/5 transition-all"
          >
            <h2 className="text-xl font-semibold mb-2 group-hover:text-sky-300 transition-colors">
              {title}
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
          </Link>
        ))}
      </div>

      <div className="mt-16 rounded-xl border border-white/10 p-6 bg-white/[0.02]">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-4">
          For AI Agents
        </h2>
        <div className="space-y-3 text-sm text-slate-400">
          <div>
            <span className="text-slate-300 font-medium">MCP server</span> — POST{" "}
            <code className="text-sky-400 text-xs">/api/mcp</code> with JSON-RPC 2.0. Supports{" "}
            <code className="text-xs text-slate-300">tools/list</code> and{" "}
            <code className="text-xs text-slate-300">tools/call</code>.
          </div>
          <div>
            <span className="text-slate-300 font-medium">Available tools:</span>{" "}
            ski_list_exercises, ski_get_exercise, ski_list_equipment, ski_get_equipment,
            ski_list_places, ski_get_place
          </div>
          <div>
            <span className="text-slate-300 font-medium">Agent discovery:</span>{" "}
            <a href="/llms.txt" className="text-sky-400 hover:text-sky-300 transition-colors">
              /llms.txt
            </a>{" "}
            contains a structured site index.
          </div>
        </div>
      </div>
    </div>
  );
}
