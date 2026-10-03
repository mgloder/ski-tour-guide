import Link from "next/link";

const modules = [
  {
    href: undefined,
    title: "Training",
    tag: "coming soon",
    description: "Technique drills, off-snow conditioning, and balance work. From beginner parallel turns to expert carving.",
  },
  {
    href: undefined,
    title: "Equipment",
    tag: "coming soon",
    description: "Gear guides covering skis, boots, poles, helmets, safety equipment, and clothing with maintenance tips.",
  },
  {
    href: "/places",
    title: "Places",
    tag: "2,697 destinations",
    description: "Resort and destination guides with piste breakdowns, altitude data, and best-season recommendations.",
  },
];

export default function Home() {
  return (
    <div style={{ padding: "2rem 1.5rem" }}>
      {/* Hero */}
      <div className="bx-mb-6" style={{ borderBottom: "3px solid currentColor", paddingBottom: "2rem" }}>
        <p className="bx-text-xs bx-uppercase bx-tracking-wide" style={{ opacity: 0.5, marginBottom: "0.5rem" }}>
          Human &amp; AI-agent-friendly
        </p>
        <p className="bx-display-1 bx-mb-2">The Ski Handbook</p>
        <p className="bx-lead" style={{ maxWidth: "40rem" }}>
          Everything you need on the mountain — training, equipment, and destinations.
          Also accessible to AI agents via{" "}
          <a href="/api/mcp">MCP endpoint</a> and <a href="/llms.txt">llms.txt</a>.
        </p>
      </div>

      {/* Module cards */}
      <div className="bx-brick bx-brick-3 bx-mb-6">
        {modules.map(({ href, title, tag, description }) => {
          const card = (
            <div className="bx-card" style={{ height: "100%", opacity: href ? 1 : 0.35 }}>
              <div className="bx-card-header">
                <span className="bx-badge">{tag}</span>
              </div>
              <div className="bx-card-body">
                <h3 className="bx-card-title">{title}</h3>
                <p className="bx-card-text">{description}</p>
              </div>
            </div>
          );
          return href ? (
            <Link href={href} key={title} style={{ textDecoration: "none", color: "inherit" }}>
              {card}
            </Link>
          ) : (
            <div key={title} style={{ cursor: "not-allowed" }}>{card}</div>
          );
        })}
      </div>

      {/* Agent panel */}
      <div className="bx-box bx-p-4">
        <p className="bx-text-xs bx-uppercase bx-fw-black bx-tracking-wide bx-mb-3" style={{ opacity: 0.5 }}>
          For AI Agents
        </p>
        <div className="bx-brick bx-brick-3">
          <div>
            <p className="bx-fw-black bx-uppercase bx-mb-1">MCP Server</p>
            <p className="bx-text-sm">
              <code>POST /api/mcp</code><br />
              JSON-RPC 2.0 · MCP 2024-11-05
            </p>
          </div>
          <div>
            <p className="bx-fw-black bx-uppercase bx-mb-1">Tools</p>
            <p className="bx-text-xs" style={{ fontFamily: "monospace", lineHeight: 1.8 }}>
              ski_list_exercises<br />
              ski_get_exercise<br />
              ski_list_equipment<br />
              ski_get_equipment<br />
              ski_list_places<br />
              ski_get_place
            </p>
          </div>
          <div>
            <p className="bx-fw-black bx-uppercase bx-mb-1">Discovery</p>
            <p className="bx-text-sm">
              <a href="/llms.txt"><code>/llms.txt</code></a> — structured index<br />
              <a href="/api/mcp"><code>GET /api/mcp</code></a> — tool list
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
