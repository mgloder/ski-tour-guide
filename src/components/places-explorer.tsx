"use client";
import { useState, useMemo, useRef } from "react";
import Link from "next/link";
import type { DbPlace } from "@/lib/places";
import { getRecommendedEquipment, getRecommendedExercises } from "@/lib/places";
import { equipment } from "@/data/equipment";
import { exercises } from "@/data/exercises";
import PlacesMap from "./places-map";

// ── Filter / sort definitions ─────────────────────────────────────────────────

const LEVEL_OPTIONS = [
  { value: null as string | null, label: "Any level",    hint: "" },
  { value: "beginner",     label: "First timer",  hint: "green runs · learning zones", tags: ["beginner-friendly"] },
  { value: "intermediate", label: "Getting there",hint: "blues & easy reds",            tags: ["intermediate"] },
  { value: "advanced",     label: "Confident",    hint: "reds, blacks & beyond",        tags: ["advanced", "expert"] },
];

const TERRAIN_OPTIONS = [
  { value: null as string | null, label: "Any terrain",      hint: "" },
  { value: "powder",      label: "Powder & freeride", hint: "off-piste · deep snow",       tags: ["powder", "off-piste"] },
  { value: "glacier",     label: "Glacier",           hint: "high altitude · year-round",  tags: ["glacier"] },
  { value: "backcountry", label: "Backcountry",       hint: "touring · remote terrain",    tags: ["backcountry"] },
  { value: "summer",      label: "Summer skiing",     hint: "open July–August",            tags: ["summer-skiing"] },
];

const SIZE_OPTIONS = [
  { value: null as string | null, label: "Any size", hint: "" },
  { value: "S",  label: "S",  hint: "< 50 km"   },
  { value: "M",  label: "M",  hint: "50–150 km"  },
  { value: "L",  label: "L",  hint: "150–300 km" },
  { value: "XL", label: "XL", hint: "300+ km"    },
];

const SORT_OPTIONS = [
  { value: "size",     label: "Largest first"  },
  { value: "alpha",    label: "A → Z"          },
  { value: "altitude", label: "Highest first"  },
];

const PAGE = 60;

// ── Helpers ───────────────────────────────────────────────────────────────────

function filterPlaces(
  places: DbPlace[],
  level: string | null,
  terrain: string | null,
  query: string,
  country: string | null,
  size: string | null,
) {
  const levelTags   = LEVEL_OPTIONS.find(o => o.value === level)?.tags   ?? [];
  const terrainTags = TERRAIN_OPTIONS.find(o => o.value === terrain)?.tags ?? [];
  const q = query.trim().toLowerCase();
  return places.filter(p => {
    const t = new Set(p.tags);
    if (levelTags.length   && !levelTags.some(x => t.has(x)))   return false;
    if (terrainTags.length && !terrainTags.some(x => t.has(x))) return false;
    if (q && !p.name.toLowerCase().includes(q) && !(p.country ?? "").toLowerCase().includes(q)) return false;
    if (country && p.country !== country) return false;
    if (size) {
      const km = p.total_km ?? 0;
      if (size === "S"  && !(km > 0  && km < 50))   return false;
      if (size === "M"  && !(km >= 50  && km < 150)) return false;
      if (size === "L"  && !(km >= 150 && km < 300)) return false;
      if (size === "XL" && !(km >= 300))             return false;
    }
    return true;
  });
}

function sortPlaces(places: DbPlace[], by: string): DbPlace[] {
  if (by === "alpha")    return [...places].sort((a, b) => a.name.localeCompare(b.name));
  if (by === "altitude") return [...places].sort((a, b) => (b.altitude_peak ?? 0) - (a.altitude_peak ?? 0));
  return [...places].sort((a, b) => (b.total_km ?? 0) - (a.total_km ?? 0));
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Pill({ label, hint, active, onClick }: { label: string; hint: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: "2px solid currentColor",
        background: active ? "var(--bx-primary, #2b44ff)" : "transparent",
        color: active ? "#fff" : "inherit",
        padding: "0.3rem 0.75rem",
        cursor: "pointer",
        fontSize: "0.75rem",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        lineHeight: 1.4,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: "0.1rem",
        whiteSpace: "nowrap",
      }}
    >
      <span>{label}</span>
      {hint && <span style={{ opacity: 0.6, fontWeight: 400, fontSize: "0.65rem", textTransform: "none", letterSpacing: 0 }}>{hint}</span>}
    </button>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      onClick={onRemove}
      style={{
        display: "inline-flex", alignItems: "center", gap: "0.3rem",
        border: "1.5px solid var(--bx-primary, #2b44ff)",
        background: "transparent",
        color: "var(--bx-primary, #2b44ff)",
        padding: "0.2rem 0.5rem",
        cursor: "pointer",
        fontSize: "0.65rem",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        whiteSpace: "nowrap",
      }}
    >
      {label} <span style={{ fontSize: "0.75rem", lineHeight: 1 }}>×</span>
    </button>
  );
}

const selectStyle: React.CSSProperties = {
  border: "2px solid currentColor",
  background: "transparent",
  color: "inherit",
  padding: "0.3rem 0.5rem",
  fontSize: "0.75rem",
  fontWeight: 700,
  fontFamily: "inherit",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  cursor: "pointer",
  outline: "none",
  appearance: "none",
  WebkitAppearance: "none",
  paddingRight: "1.4rem",
};

function RunStrip({ place }: { place: DbPlace }) {
  const cells = [
    { bg: "#166534", n: place.runs_green, label: "G" },
    { bg: "#1e40af", n: place.runs_blue,  label: "B" },
    { bg: "#991b1b", n: place.runs_red,   label: "R" },
    { bg: "#18181b", n: place.runs_black, label: "K" },
  ];
  return (
    <div style={{ display: "flex", height: "28px", marginTop: "0.5rem" }}>
      {cells.map(({ bg, n, label }) => (
        <div key={label} style={{ flex: n || 0.3, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", color: "#fff", fontWeight: 700 }}>
          {n > 0 ? n : ""}
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PlacesExplorer({ places }: { places: DbPlace[] }) {
  const [level,         setLevel]         = useState<string | null>(null);
  const [terrain,       setTerrain]       = useState<string | null>(null);
  const [country,       setCountry]       = useState<string | null>(null);
  const [size,          setSize]          = useState<string | null>(null);
  const [sortBy,        setSortBy]        = useState("size");
  const [selected,      setSelected]      = useState<DbPlace | null>(null);
  const [query,         setQuery]         = useState("");
  const [visible,       setVisible]       = useState(PAGE);
  const [clusterIds,    setClusterIds]    = useState<string[] | null>(null);
  const [mapVisibleIds, setMapVisibleIds] = useState<string[] | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const countries = useMemo(
    () => [...new Set(places.map(p => p.country).filter(Boolean))].sort() as string[],
    [places],
  );

  const filtered       = useMemo(() => filterPlaces(places, level, terrain, query, country, size), [places, level, terrain, query, country, size]);
  const sorted         = useMemo(() => sortPlaces(filtered, sortBy), [filtered, sortBy]);
  const highlightedIds = useMemo(() => filtered.map(p => p.id), [filtered]);

  const displayPlaces = useMemo(() => {
    if (clusterIds) return places.filter(p => clusterIds.includes(p.id));
    if (!mapVisibleIds) return sorted;
    const viewport = new Set(mapVisibleIds);
    return sorted.filter(p => viewport.has(p.id) || p.id === selected?.id);
  }, [clusterIds, places, sorted, mapVisibleIds, selected?.id]);

  const visiblePlaces = useMemo(() => displayPlaces.slice(0, visible), [displayPlaces, visible]);

  // Active filter chips
  const chips = [
    level   && { key: "level",   label: LEVEL_OPTIONS.find(o => o.value === level)?.label ?? level,   clear: () => reset({ level: null }) },
    terrain && { key: "terrain", label: TERRAIN_OPTIONS.find(o => o.value === terrain)?.label ?? terrain, clear: () => reset({ terrain: null }) },
    country && { key: "country", label: country,                                                          clear: () => reset({ country: null }) },
    size    && { key: "size",    label: SIZE_OPTIONS.find(o => o.value === size)?.label ?? size,          clear: () => reset({ size: null }) },
    query   && { key: "query",   label: `"${query}"`,                                                     clear: () => reset({ query: "" }) },
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

  // ── Handlers ──────────────────────────────────────────────────────────────

  function reset(patch: Partial<{ level: string|null; terrain: string|null; country: string|null; size: string|null; query: string }>) {
    if ("level"   in patch) setLevel(patch.level!);
    if ("terrain" in patch) setTerrain(patch.terrain!);
    if ("country" in patch) setCountry(patch.country!);
    if ("size"    in patch) setSize(patch.size!);
    if ("query"   in patch) setQuery(patch.query!);
    setSelected(null);
    setClusterIds(null);
    setVisible(PAGE);
  }

  function clearAll() {
    setLevel(null); setTerrain(null); setCountry(null); setSize(null); setQuery("");
    setSelected(null); setClusterIds(null); setVisible(PAGE);
  }

  function handleSelect(place: DbPlace) {
    setSelected(prev => prev?.id === place.id ? null : place);
  }

  function handleMapSelect(place: DbPlace) { setSelected(place); }

  function handleClusterSelect(ids: string[]) {
    setClusterIds(ids); setSelected(null); setVisible(PAGE);
  }

  function clearCluster() {
    setClusterIds(null); setSelected(null); setVisible(PAGE);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

      {/* ── Header + filters ── */}
      <div style={{ padding: "1.5rem 1.5rem 0" }}>
        <div style={{ borderBottom: "3px solid currentColor", paddingBottom: "1.25rem", marginBottom: "1rem" }}>
          <p className="bx-text-xs bx-uppercase bx-tracking-wide" style={{ opacity: 0.5 }}>Module 03</p>
          <h1 className="bx-display-2 bx-mb-0">Places</h1>
          <p className="bx-text-sm" style={{ opacity: 0.5 }}>
            {clusterIds ? `${clusterIds.length} in area` : `${displayPlaces.length} visible · ${places.length} total`}
          </p>
        </div>

        {/* Level */}
        <div style={{ marginBottom: "0.5rem" }}>
          <p className="bx-text-xs bx-uppercase" style={{ opacity: 0.4, marginBottom: "0.4rem", letterSpacing: "0.08em" }}>Level</p>
          <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
            {LEVEL_OPTIONS.map(o => (
              <Pill key={String(o.value)} label={o.label} hint={o.hint} active={level === o.value} onClick={() => reset({ level: o.value })} />
            ))}
          </div>
        </div>

        {/* Terrain */}
        <div style={{ marginBottom: "0.5rem" }}>
          <p className="bx-text-xs bx-uppercase" style={{ opacity: 0.4, marginBottom: "0.4rem", letterSpacing: "0.08em" }}>Terrain</p>
          <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
            {TERRAIN_OPTIONS.map(o => (
              <Pill key={String(o.value)} label={o.label} hint={o.hint} active={terrain === o.value} onClick={() => reset({ terrain: o.value })} />
            ))}
          </div>
        </div>

        {/* Country · Size · Sort — one compact row */}
        <div style={{ marginBottom: "0.5rem", display: "flex", gap: "0.5rem", alignItems: "flex-end", flexWrap: "wrap" }}>
          {/* Country */}
          <div>
            <p className="bx-text-xs bx-uppercase" style={{ opacity: 0.4, marginBottom: "0.4rem", letterSpacing: "0.08em" }}>Country</p>
            <div style={{ position: "relative", display: "inline-block" }}>
              <select
                value={country ?? ""}
                onChange={e => reset({ country: e.target.value || null })}
                style={selectStyle}
              >
                <option value="">All countries</option>
                {countries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <span style={{ position: "absolute", right: "0.4rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", fontSize: "0.6rem", opacity: 0.6 }}>▼</span>
            </div>
          </div>

          {/* Size */}
          <div>
            <p className="bx-text-xs bx-uppercase" style={{ opacity: 0.4, marginBottom: "0.4rem", letterSpacing: "0.08em" }}>Resort size</p>
            <div style={{ display: "flex", gap: "0.35rem" }}>
              {SIZE_OPTIONS.map(o => (
                <Pill key={String(o.value)} label={o.label} hint={o.hint} active={size === o.value} onClick={() => reset({ size: o.value })} />
              ))}
            </div>
          </div>

          {/* Sort */}
          <div style={{ marginLeft: "auto" }}>
            <p className="bx-text-xs bx-uppercase" style={{ opacity: 0.4, marginBottom: "0.4rem", letterSpacing: "0.08em" }}>Sort</p>
            <div style={{ position: "relative", display: "inline-block" }}>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                style={selectStyle}
              >
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <span style={{ position: "absolute", right: "0.4rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", fontSize: "0.6rem", opacity: 0.6 }}>▼</span>
            </div>
          </div>
        </div>

        {/* Search */}
        <div style={{ marginBottom: chips.length ? "0.5rem" : 0 }}>
          <input
            type="search"
            placeholder={`Search ${places.length} destinations…`}
            value={query}
            onChange={e => reset({ query: e.target.value })}
            style={{
              width: "100%",
              border: "2px solid currentColor",
              background: "transparent",
              color: "inherit",
              padding: "0.4rem 0.75rem",
              fontSize: "0.8rem",
              fontFamily: "inherit",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Active filter chips */}
        {chips.length > 0 && (
          <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap", alignItems: "center", paddingBottom: "0.75rem", borderBottom: "2px solid currentColor" }}>
            {chips.map(c => <FilterChip key={c.key} label={c.label} onRemove={c.clear} />)}
            <button
              onClick={clearAll}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.4, padding: "0.2rem 0.25rem" }}
            >
              Clear all
            </button>
          </div>
        )}

        {/* Search bottom border when no chips */}
        {chips.length === 0 && (
          <div style={{ borderBottom: "2px solid currentColor", marginBottom: 0 }} />
        )}
      </div>

      {/* ── Map + list ── */}
      <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>

        {/* Map */}
        <div style={{ flex: "0 0 62%", position: "relative", borderRight: "3px solid currentColor" }}>
          <PlacesMap
            places={places}
            highlightedIds={highlightedIds}
            selected={selected}
            onSelect={handleMapSelect}
            onClusterSelect={handleClusterSelect}
            onBoundsChange={setMapVisibleIds}
          />
        </div>

        {/* List */}
        <div ref={listRef} style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>

          {(clusterIds || selected) && (
            <button
              onClick={clusterIds ? clearCluster : () => setSelected(null)}
              style={{ border: "none", borderBottom: "2px solid currentColor", background: "transparent", padding: "0.6rem 1rem", cursor: "pointer", textAlign: "left", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.5 }}
            >
              ← {clusterIds ? `All ${filtered.length} places` : "All places"}
            </button>
          )}

          {displayPlaces.length === 0 && (
            <p className="bx-text-sm" style={{ padding: "1.5rem", opacity: 0.5 }}>No destinations match these filters.</p>
          )}

          {visiblePlaces.map(place => {
            const isSelected = selected?.id === place.id;
            const equipIds   = getRecommendedEquipment(place.tags);
            const exIds      = getRecommendedExercises(place.tags);
            const equipItems = equipment.filter(e => equipIds.includes(e.id));
            const exItems    = exercises.filter(e => exIds.includes(e.id));

            return (
              <div
                key={place.id}
                onClick={() => handleSelect(place)}
                style={{
                  padding: "1rem 1.25rem",
                  borderBottom: "2px solid currentColor",
                  cursor: "pointer",
                  background: isSelected ? "var(--bx-primary, #2b44ff)" : "transparent",
                  color: isSelected ? "#fff" : "inherit",
                  transition: "background 0.15s",
                }}
              >
                <p style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.06em", opacity: 0.6, marginBottom: "0.2rem" }}>
                  {place.country} · {place.region}
                </p>
                <p style={{ fontWeight: 900, fontSize: "0.95rem", marginBottom: "0.25rem" }}>{place.name}</p>

                <div style={{ display: "flex", gap: "1rem", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.05em", opacity: isSelected ? 0.85 : 0.55 }}>
                  <span>{place.total_km} km</span>
                  <span>{place.altitude_base}–{place.altitude_peak}m</span>
                  <span>{place.difficulty}</span>
                </div>

                <RunStrip place={place} />

                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", marginTop: "0.5rem" }}>
                  {place.tags.slice(0, 4).map(tag => (
                    <span key={tag} style={{ border: `1px solid ${isSelected ? "rgba(255,255,255,0.5)" : "currentColor"}`, padding: "0.1rem 0.4rem", fontSize: "0.6rem", textTransform: "lowercase", opacity: 0.7 }}>
                      {tag}
                    </span>
                  ))}
                </div>

                {isSelected && (
                  <div
                    onClick={e => e.stopPropagation()}
                    style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "2px solid rgba(255,255,255,0.3)", display: "flex", flexDirection: "column", gap: "0.75rem", color: "#fff" }}
                  >
                    <div>
                      <p style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.7, marginBottom: "0.4rem" }}>Highlights</p>
                      <ul style={{ paddingLeft: "1.1rem", margin: 0 }}>
                        {place.highlights.slice(0, 3).map((h, i) => (
                          <li key={i} style={{ fontSize: "0.75rem", marginBottom: "0.2rem", opacity: 0.9 }}>{h}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <p style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.7, marginBottom: "0.2rem" }}>Best months</p>
                      <p style={{ fontSize: "0.75rem", opacity: 0.85 }}>{place.best_months.join(" · ")}</p>
                    </div>

                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                      {place.website && (
                        <a href={place.website} target="_blank" rel="noopener noreferrer"
                          style={{ border: "2px solid rgba(255,255,255,0.6)", color: "#fff", padding: "0.25rem 0.6rem", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", textDecoration: "none" }}>
                          Website →
                        </a>
                      )}
                      {place.skimap_url && (
                        <a href={place.skimap_url} target="_blank" rel="noopener noreferrer"
                          style={{ border: "2px solid rgba(255,255,255,0.6)", color: "#fff", padding: "0.25rem 0.6rem", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", textDecoration: "none" }}>
                          Trail map →
                        </a>
                      )}
                    </div>

                    {equipItems.length > 0 && (
                      <div>
                        <p style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.7, marginBottom: "0.35rem" }}>Gear</p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                          {equipItems.map(e => (
                            <Link key={e.id} href={`/equipment#${e.id}`}
                              style={{ border: "1px solid rgba(255,255,255,0.5)", color: "#fff", padding: "0.15rem 0.5rem", fontSize: "0.65rem", textDecoration: "none" }}>
                              {e.name}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {exItems.length > 0 && (
                      <div>
                        <p style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.7, marginBottom: "0.35rem" }}>Training</p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                          {exItems.map(e => (
                            <Link key={e.id} href={`/training#${e.id}`}
                              style={{ border: "1px solid rgba(255,255,255,0.5)", color: "#fff", padding: "0.15rem 0.5rem", fontSize: "0.65rem", textDecoration: "none" }}>
                              {e.name}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {visible < displayPlaces.length && (
            <button
              onClick={() => setVisible(v => v + PAGE)}
              style={{ border: "none", borderTop: "2px solid currentColor", background: "transparent", padding: "0.75rem 1.25rem", cursor: "pointer", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", width: "100%", textAlign: "center" }}
            >
              Show {Math.min(PAGE, displayPlaces.length - visible)} more
              <span style={{ opacity: 0.4, marginLeft: "0.5rem" }}>({displayPlaces.length - visible} remaining)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
