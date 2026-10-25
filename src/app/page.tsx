export const dynamic = "force-dynamic";
import Link from "next/link";
import { getPlaces } from "@/lib/places";
import HomeClient from "@/components/home-client";

const modules = [
  {
    href: "/training",
    title: "Training",
    tag: "skill roadmap",
    description: "Technique drills, off-snow conditioning, and balance work. From beginner parallel turns to expert carving.",
  },
  {
    href: "/equipment",
    title: "Equipment",
    tag: "gear guide",
    description: "Gear guides covering skis, boots, poles, helmets, safety equipment, and clothing with maintenance tips.",
  },
  {
    href: "/places",
    title: "Places",
    tag: "destinations",
    description: "Resort and destination guides with piste breakdowns, altitude data, and best-season recommendations.",
  },
];

const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default async function Home() {
  const places = await getPlaces();

  const totalKm = places.reduce((s, p) => s + (p.total_km ?? 0), 0);
  const countries = new Set(places.map(p => p.country).filter(Boolean)).size;

  // Best for right now
  const currentMonth = MONTH_ABBR[new Date().getMonth()];
  const inSeasonNow = places
    .filter(p => (p.best_months ?? []).some(m => m.startsWith(currentMonth.slice(0, 3))))
    .sort((a, b) => (b.total_km ?? 0) - (a.total_km ?? 0))
    .slice(0, 6);

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

        {/* Quick search */}
        <form action="/places" method="GET" style={{ marginTop: "1.5rem", display: "flex", gap: "0.5rem", maxWidth: "36rem" }}>
          <input
            name="q"
            type="search"
            placeholder={`Search ${places.length.toLocaleString()} destinations…`}
            style={{ flex: 1, border: "2px solid currentColor", background: "transparent", color: "inherit", padding: "0.6rem 0.75rem", fontSize: "0.9rem", fontFamily: "inherit", outline: "none" }}
          />
          <button type="submit" style={{ border: "2px solid currentColor", background: "currentColor", color: "var(--bx-paper, #fff)", padding: "0.6rem 1.25rem", fontSize: "0.75rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.06em", cursor: "pointer", flexShrink: 0 }}>
            Search
          </button>
        </form>

        {/* Client-side interactive sections: random destination, training teaser, level recommendations */}
        <HomeClient places={places} />
      </div>

      {/* Stats bar */}
      <div style={{ display: "flex", gap: "2rem", marginBottom: "2rem", paddingBottom: "1.5rem", borderBottom: "2px solid currentColor", flexWrap: "wrap" }}>
        {[
          { value: places.length.toLocaleString(), label: "destinations" },
          { value: countries.toString(),            label: "countries"    },
          { value: `${Math.round(totalKm / 1000)}k+`, label: "km of piste" },
          { value: inSeasonNow.length.toString(),   label: `open in ${currentMonth}` },
        ].map(({ value, label }) => (
          <div key={label}>
            <p style={{ fontSize: "1.5rem", fontWeight: 900, lineHeight: 1, marginBottom: "0.15rem" }}>{value}</p>
            <p style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.45 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Best for right now */}
      {inSeasonNow.length > 0 && (
        <div style={{ marginBottom: "2.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.75rem" }}>
            <p className="bx-text-xs bx-uppercase bx-fw-black bx-tracking-wide" style={{ opacity: 0.5 }}>
              Best in {currentMonth}
            </p>
            <Link href={`/places?month=${currentMonth}`} style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", opacity: 0.4 }}>
              See all →
            </Link>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {inSeasonNow.map(p => (
              <Link
                key={p.id}
                href={`/places?q=${encodeURIComponent(p.name)}`}
                style={{ border: "2px solid currentColor", padding: "0.4rem 0.75rem", textDecoration: "none", color: "inherit", display: "inline-flex", flexDirection: "column", gap: "0.1rem" }}
              >
                <span style={{ fontWeight: 900, fontSize: "0.8rem" }}>{p.name}</span>
                <span style={{ fontSize: "0.6rem", opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {p.country}{(p.total_km ?? 0) > 0 ? ` · ${p.total_km} km` : ""}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Module cards */}
      <div className="bx-brick bx-brick-3 bx-mb-6">
        {modules.map(({ href, title, tag, description }) => (
          <Link href={href} key={title} style={{ textDecoration: "none", color: "inherit" }}>
            <div className="bx-card" style={{ height: "100%" }}>
              <div className="bx-card-header">
                <span className="bx-badge">{tag}</span>
              </div>
              <div className="bx-card-body">
                <h3 className="bx-card-title">{title}</h3>
                <p className="bx-card-text">{description}</p>
              </div>
            </div>
          </Link>
        ))}
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
              <a href="/api/mcp" target="_blank"><code>GET /api/mcp</code></a> — tool list
            </p>
          </div>
        </div>
        <div style={{ marginTop: "1rem" }}>
          <p className="bx-fw-black bx-uppercase bx-mb-1">Try it</p>
          <pre className="bx-text-xs" style={{ fontFamily: "monospace", lineHeight: 1.6, opacity: 0.7, overflow: "auto", fontSize: "0.6rem" }}>
{`curl -X POST /api/mcp \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,
       "method":"tools/call",
       "params":{"name":"ski_list_places",
                 "arguments":{"tags":["powder"]}}}'`}
          </pre>
        </div>
      </div>
    </div>
  );
}
