import Link from "next/link";

const modules = [
  {
    href: "/exercise",
    title: "Exercise",
    description:
      "Technique drills, off-snow conditioning, and balance work. From beginner parallel turns to expert carving.",
    tag: "06 entries",
  },
  {
    href: "/equipment",
    title: "Equipment",
    description:
      "Gear guides covering skis, boots, poles, helmets, safety equipment, and clothing with maintenance tips.",
    tag: "08 entries",
  },
  {
    href: "/places",
    title: "Places",
    description:
      "Resort and destination guides with piste breakdowns, altitude data, and best-season recommendations.",
    tag: "06 entries",
  },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      {/* Hero */}
      <div className="mb-16 border-b-2 border-white pb-12">
        <p className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-4">
          Human &amp; AI-agent-friendly
        </p>
        <h1 className="text-6xl md:text-8xl font-black uppercase leading-none tracking-tighter mb-6">
          Ski<br />Guide
        </h1>
        <p className="text-zinc-400 max-w-xl leading-relaxed">
          A reference for skiers and AI agents alike — exercises, equipment, and mountain
          destinations. All content accessible via{" "}
          <a href="/api/mcp" className="text-[#ffd400] hover:underline">
            MCP endpoint
          </a>{" "}
          and{" "}
          <a href="/llms.txt" className="text-[#ffd400] hover:underline">
            llms.txt
          </a>
          .
        </p>
      </div>

      {/* Module cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        {modules.map(({ href, title, description, tag }) => (
          <Link key={href} href={href} className="block brut-card-accent p-6 bg-black group">
            <p className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-4">{tag}</p>
            <h2 className="text-2xl font-black uppercase mb-3 group-hover:text-[#ffd400] transition-colors">
              {title}
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">{description}</p>
          </Link>
        ))}
      </div>

      {/* Agent panel */}
      <div className="brut-card p-6">
        <p className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-4">
          For AI Agents
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div>
            <p className="font-black uppercase mb-1">MCP Server</p>
            <p className="text-zinc-400">
              <code className="text-[#ffd400] font-mono">POST /api/mcp</code>
              <br />
              JSON-RPC 2.0 · MCP 2024-11-05
            </p>
          </div>
          <div>
            <p className="font-black uppercase mb-1">Tools</p>
            <p className="text-zinc-400 font-mono text-xs leading-relaxed">
              ski_list_exercises<br />
              ski_get_exercise<br />
              ski_list_equipment<br />
              ski_get_equipment<br />
              ski_list_places<br />
              ski_get_place
            </p>
          </div>
          <div>
            <p className="font-black uppercase mb-1">Discovery</p>
            <p className="text-zinc-400">
              <a href="/llms.txt" className="text-[#ffd400] font-mono hover:underline">
                /llms.txt
              </a>{" "}
              — structured index
              <br />
              <a href="/api/mcp" className="text-[#ffd400] font-mono hover:underline">
                GET /api/mcp
              </a>{" "}
              — tool list
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
