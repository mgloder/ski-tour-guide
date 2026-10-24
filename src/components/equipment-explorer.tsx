"use client";

import React, { useState } from "react";
import Link from "next/link";
import { equipment, type SkillLevel } from "@/data/equipment";
import BodyMap, { type BodyZoneId } from "@/components/body-map";
import { useIsMobile } from "@/lib/use-is-mobile";

// Equipment ID → relevant place terrain tags/links
const EQUIPMENT_PLACE_LINKS: Record<string, { label: string; href: string }[]> = {
  "avalanche-beacon":    [{ label: "Backcountry destinations", href: "/places?tags=backcountry" }],
  "avalanche-airbag-pack": [{ label: "Backcountry destinations", href: "/places?tags=backcountry" }],
  "all-mountain-skis":  [{ label: "Powder resorts", href: "/places?tags=powder" }],
  "ski-helmet":         [{ label: "Beginner-friendly resorts", href: "/places?tags=beginner-friendly" }],
  "alpine-ski-boots":   [{ label: "Beginner-friendly resorts", href: "/places?tags=beginner-friendly" }],
  "ski-goggles":        [{ label: "Powder resorts", href: "/places?tags=powder" }],
};

const SKILL_OPTIONS: { label: string; value: SkillLevel }[] = [
  { label: "First timer",        value: "beginner" },
  { label: "Getting comfortable", value: "intermediate" },
  { label: "Experienced",        value: "advanced" },
];

type Scenario = "first-day" | "resort" | "offpiste" | "backcountry";
const SCENARIO_OPTIONS: { label: string; value: Scenario; hint: string; itemIds: string[] | null }[] = [
  { label: "First day on slopes", value: "first-day",   hint: "beginner area · instructor",
    itemIds: ["ski-helmet", "alpine-ski-boots", "ski-poles", "ski-goggles", "ski-base-layer"] },
  { label: "Ski resort",          value: "resort",      hint: "groomed pistes · lifts",
    itemIds: ["all-mountain-skis", "alpine-ski-boots", "ski-poles", "ski-helmet", "ski-goggles", "ski-base-layer"] },
  { label: "Off-piste",           value: "offpiste",    hint: "ungroomed terrain · powder",
    itemIds: null },
  { label: "Backcountry",         value: "backcountry", hint: "remote mountains · touring",
    itemIds: null },
];

type SportType = "ski" | "snowboard";
const SPORT_OPTIONS: { label: string; value: SportType; excludeIds: string[] }[] = [
  { label: "Skis",       value: "ski",        excludeIds: [] },
  { label: "Snowboard",  value: "snowboard",  excludeIds: ["all-mountain-skis", "alpine-ski-boots", "ski-poles"] },
];

type SubPart = {
  id: string;
  label: string;
  equipmentIds: string[];
};

type Zone = {
  id: BodyZoneId;
  label: string;
  hint: string;
  equipmentIds: string[];
  subParts: SubPart[];
};

const ZONES: Zone[] = [
  {
    id: "head",
    label: "Head",
    hint: "Helmet · Goggles",
    equipmentIds: ["ski-helmet", "ski-goggles"],
    subParts: [
      { id: "eyes", label: "Eyes", equipmentIds: ["ski-goggles"] },
      { id: "head-protection", label: "Protection", equipmentIds: ["ski-helmet"] },
    ],
  },
  {
    id: "torso",
    label: "Torso",
    hint: "Layers · Safety gear",
    equipmentIds: ["ski-base-layer", "avalanche-airbag-pack", "avalanche-beacon"],
    subParts: [
      { id: "base-layer", label: "Base Layer", equipmentIds: ["ski-base-layer"] },
      { id: "airbag", label: "Airbag Pack", equipmentIds: ["avalanche-airbag-pack"] },
      { id: "beacon", label: "Beacon", equipmentIds: ["avalanche-beacon"] },
    ],
  },
  {
    id: "hands",
    label: "Hands",
    hint: "Poles",
    equipmentIds: ["ski-poles"],
    subParts: [],
  },
  {
    id: "legs",
    label: "Legs",
    hint: "Ski pants",
    equipmentIds: [],
    subParts: [],
  },
  {
    id: "feet",
    label: "Feet",
    hint: "Boots · Skis",
    equipmentIds: ["alpine-ski-boots", "all-mountain-skis"],
    subParts: [
      { id: "boots", label: "Boots", equipmentIds: ["alpine-ski-boots"] },
      { id: "skis", label: "Skis", equipmentIds: ["all-mountain-skis"] },
    ],
  },
];

export default function EquipmentExplorer() {
  const isMobile = useIsMobile();
  const [selectedZone, setSelectedZone] = useState<BodyZoneId | null>(null);
  const [selectedSub, setSelectedSub] = useState<string | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<SkillLevel | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [selectedSport, setSelectedSport] = useState<SportType | null>(null);

  const activeZone = ZONES.find(z => z.id === selectedZone) ?? null;
  const activeSub = activeZone?.subParts.find(s => s.id === selectedSub) ?? null;

  function handleZoneClick(zone: BodyZoneId) {
    if (selectedZone === zone) {
      setSelectedZone(null);
      setSelectedSub(null);
    } else {
      setSelectedZone(zone);
      setSelectedSub(null);
    }
  }

  function handleSubClick(subId: string) {
    setSelectedSub(prev => (prev === subId ? null : subId));
  }

  const ids = activeSub?.equipmentIds ?? activeZone?.equipmentIds ?? null;
  const zoneFiltered = ids ? equipment.filter(e => ids.includes(e.id)) : equipment;

  const scenarioIds = selectedScenario
    ? (SCENARIO_OPTIONS.find(s => s.value === selectedScenario)?.itemIds ?? null)
    : null;
  const scenarioFiltered = scenarioIds
    ? zoneFiltered.filter(e => scenarioIds.includes(e.id))
    : zoneFiltered;

  const skillFiltered = !selectedSkill
    ? scenarioFiltered
    : scenarioFiltered.filter(e => e.skillLevel === selectedSkill || e.skillLevel === "all");

  const excludeIds = selectedSport
    ? (SPORT_OPTIONS.find(s => s.value === selectedSport)?.excludeIds ?? [])
    : [];

  const filtered = excludeIds.length
    ? skillFiltered.filter(e => !excludeIds.includes(e.id))
    : skillFiltered;

  const breadcrumb = activeSub
    ? `${activeZone?.label} → ${activeSub.label}`
    : activeZone
    ? activeZone.label
    : "All Equipment";

  const hasFilters = selectedSkill || selectedScenario || selectedSport;

  const mobileSelectStyle: React.CSSProperties = {
    border: "2px solid currentColor",
    background: "var(--bx-paper, #fff)",
    color: "inherit",
    padding: "0 1.2rem 0 0.5rem",
    height: "44px",
    fontSize: "0.7rem",
    fontWeight: 700,
    fontFamily: "inherit",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    cursor: "pointer",
    outline: "none",
    appearance: "none",
    WebkitAppearance: "none",
    flexShrink: 0,
    minWidth: "7rem",
  };

  const filterBar = isMobile ? (
    /* ── MOBILE: single horizontal-scrolling row of <select> dropdowns ── */
    <div style={{ borderBottom: "3px solid currentColor", padding: "0.5rem 0.75rem", display: "flex", gap: "0.4rem", overflowX: "auto", alignItems: "center" }}>
      <select
        value={selectedSkill ?? ""}
        onChange={e => setSelectedSkill((e.target.value as SkillLevel) || null)}
        style={{ ...mobileSelectStyle, outline: selectedSkill ? "2px solid currentColor" : "none", outlineOffset: "-3px" }}
        aria-label="Skill level"
      >
        <option value="">All levels</option>
        {SKILL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <select
        value={selectedScenario ?? ""}
        onChange={e => setSelectedScenario((e.target.value as Scenario) || null)}
        style={{ ...mobileSelectStyle, outline: selectedScenario ? "2px solid currentColor" : "none", outlineOffset: "-3px" }}
        aria-label="Scenario"
      >
        <option value="">All scenarios</option>
        {SCENARIO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <select
        value={selectedSport ?? ""}
        onChange={e => setSelectedSport((e.target.value as SportType) || null)}
        style={{ ...mobileSelectStyle, outline: selectedSport ? "2px solid currentColor" : "none", outlineOffset: "-3px" }}
        aria-label="Sport"
      >
        <option value="">All sports</option>
        {SPORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {hasFilters && (
        <button
          onClick={() => { setSelectedSkill(null); setSelectedScenario(null); setSelectedSport(null); }}
          className="bx-btn bx-btn-xs bx-btn-ghost"
          style={{ flexShrink: 0, opacity: 0.6 }}
        >✕</button>
      )}
    </div>
  ) : (
    /* ── DESKTOP: three rows of pill buttons ── */
    <div style={{ borderBottom: "3px solid currentColor", padding: "1rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.65rem" }}>

      {/* Row 1: Skill */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.12em", opacity: 0.4, minWidth: "3.5rem" }}>I'm a</span>
        {SKILL_OPTIONS.map(opt => (
          <button key={opt.value}
            onClick={() => setSelectedSkill(prev => prev === opt.value ? null : opt.value)}
            className={`bx-btn bx-btn-xs ${selectedSkill === opt.value ? "bx-btn-primary" : "bx-btn-ghost"}`}
          >{opt.label}</button>
        ))}
      </div>

      {/* Row 2: Scenario */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.12em", opacity: 0.4, minWidth: "3.5rem" }}>Going to</span>
        {SCENARIO_OPTIONS.map(opt => (
          <button key={opt.value}
            onClick={() => setSelectedScenario(prev => prev === opt.value ? null : opt.value)}
            className={`bx-btn bx-btn-xs ${selectedScenario === opt.value ? "bx-btn-primary" : "bx-btn-ghost"}`}
            title={opt.hint}
          >{opt.label}</button>
        ))}
      </div>

      {/* Row 3: Sport */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.12em", opacity: 0.4, minWidth: "3.5rem" }}>I ride</span>
        {SPORT_OPTIONS.map(opt => (
          <button key={opt.value}
            onClick={() => setSelectedSport(prev => prev === opt.value ? null : opt.value)}
            className={`bx-btn bx-btn-xs ${selectedSport === opt.value ? "bx-btn-primary" : "bx-btn-ghost"}`}
          >{opt.label}</button>
        ))}
        {hasFilters && (
          <button
            onClick={() => { setSelectedSkill(null); setSelectedScenario(null); setSelectedSport(null); }}
            className="bx-btn bx-btn-xs bx-btn-ghost"
            style={{ opacity: 0.5, marginLeft: "auto" }}
          >✕ Clear all</button>
        )}
      </div>

    </div>
  );

  return (
    <div>

      {filterBar}

    <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: "0", alignItems: "flex-start" }}>

      {/* ── LEFT (desktop) / TOP (mobile): Body map ── */}
      <div style={{
        width: isMobile ? "100%" : "38%",
        minWidth: isMobile ? "unset" : "220px",
        borderRight: isMobile ? "none" : "3px solid currentColor",
        borderBottom: isMobile ? "3px solid currentColor" : "none",
        padding: isMobile ? "1rem" : "1.5rem",
        position: isMobile ? "relative" : "sticky",
        top: "0",
        alignSelf: "flex-start",
      }}>

        {/* SVG — hidden on mobile */}
        {!isMobile && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
            <BodyMap activeZone={selectedZone} onZoneClick={handleZoneClick} />
          </div>
        )}

        {/* Zone buttons — horizontal scroll row on mobile, vertical list on desktop */}
        <div style={{
          display: "flex",
          flexDirection: isMobile ? "row" : "column",
          gap: "0.4rem",
          marginBottom: "1rem",
          overflowX: isMobile ? "auto" : "visible",
          paddingBottom: isMobile ? "0.25rem" : 0,
        }}>
          {ZONES.map(zone => (
            <button
              key={zone.id}
              onClick={() => handleZoneClick(zone.id)}
              className={`bx-btn bx-btn-sm ${selectedZone === zone.id ? "bx-btn-primary" : "bx-btn-ghost"}`}
              style={{
                justifyContent: isMobile ? "center" : "space-between",
                display: "flex",
                width: isMobile ? "auto" : "100%",
                flexShrink: isMobile ? 0 : undefined,
                textAlign: "left",
                whiteSpace: "nowrap",
              }}
            >
              <span className="bx-fw-black bx-uppercase">{zone.label}</span>
              {!isMobile && <span style={{ opacity: 0.5, fontSize: "0.7rem", fontWeight: "normal", textTransform: "none" }}>{zone.hint}</span>}
            </button>
          ))}
        </div>

        {/* Drill-down sub-parts */}
        {activeZone && activeZone.subParts.length > 0 && (
          <div style={{ borderTop: "3px solid currentColor", paddingTop: "1rem" }}>
            <p style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.12em", opacity: 0.5, marginBottom: "0.5rem" }}>
              {activeZone.label} →
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
              <button
                onClick={() => setSelectedSub(null)}
                className={`bx-btn bx-btn-xs ${selectedSub === null ? "bx-btn-primary" : "bx-btn-ghost"}`}
                style={{ width: "100%", textAlign: "left", justifyContent: "flex-start" }}
              >
                All {activeZone.label}
              </button>
              {activeZone.subParts.map(sub => (
                <button
                  key={sub.id}
                  onClick={() => handleSubClick(sub.id)}
                  className={`bx-btn bx-btn-xs ${selectedSub === sub.id ? "bx-btn-primary" : "bx-btn-ghost"}`}
                  style={{ width: "100%", textAlign: "left", justifyContent: "flex-start", paddingLeft: "1.25rem" }}
                >
                  ↳ {sub.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Reset */}
        {selectedZone && (
          <div style={{ borderTop: "3px solid currentColor", marginTop: "1rem", paddingTop: "0.75rem" }}>
            <button
              onClick={() => { setSelectedZone(null); setSelectedSub(null); }}
              className="bx-btn bx-btn-ghost bx-btn-xs"
              style={{ width: "100%", opacity: 0.6 }}
            >
              ← Show all equipment
            </button>
          </div>
        )}
      </div>

      {/* ── RIGHT: Equipment list ── */}
      <div style={{ flex: 1, padding: "1.5rem" }}>
        {/* Status bar */}
        <div style={{ borderBottom: "3px solid currentColor", paddingBottom: "0.75rem", marginBottom: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <p className="bx-fw-black bx-uppercase" style={{ fontSize: "0.8rem", letterSpacing: "0.1em" }}>
            {breadcrumb}
          </p>
          <p style={{ fontSize: "0.65rem", opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            {filtered.length} item{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>

        {filtered.length === 0 ? (
          <div className="bx-box" style={{ textAlign: "center", padding: "3rem 1rem", opacity: 0.5 }}>
            <p className="bx-fw-black bx-uppercase" style={{ fontSize: "0.8rem", letterSpacing: "0.1em" }}>
              No equipment listed for this zone yet.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {filtered.map(item => (
              <article key={item.id} className="bx-card" data-equipment-id={item.id}>
                <div className="bx-card-header" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <span className="bx-badge bx-badge-primary">{item.category}</span>
                  <span className="bx-badge">{item.skillLevel}</span>
                  <span className="bx-badge bx-badge-ghost" style={{ marginLeft: "auto" }}>{item.priceRange}</span>
                </div>
                <div className="bx-card-body">
                  <h3 className="bx-card-title">{item.name}</h3>
                  <p className="bx-card-text">{item.description}</p>
                </div>
                <div className="bx-card-footer">
                  <details>
                    <summary
                      className="bx-btn bx-btn-ghost bx-btn-sm"
                      style={{ cursor: "pointer", listStyle: "none" }}
                    >
                      Features &amp; Maintenance
                    </summary>
                    <div style={{ borderTop: "3px solid currentColor", marginTop: "0.75rem", paddingTop: "0.75rem" }}>
                      <p className="bx-fw-black bx-uppercase bx-text-xs bx-mb-2">Features</p>
                      <ul style={{ paddingLeft: "1.25rem", marginBottom: "1rem" }}>
                        {item.features.map((f, i) => (
                          <li key={i} className="bx-text-sm bx-mb-1">{f}</li>
                        ))}
                      </ul>
                      <p className="bx-fw-black bx-uppercase bx-text-xs bx-mb-2">Maintenance</p>
                      <ul style={{ paddingLeft: "1.25rem" }}>
                        {item.maintenanceTips.map((tip, i) => (
                          <li key={i} className="bx-text-sm bx-mb-1">{tip}</li>
                        ))}
                      </ul>
                    </div>
                  </details>
                  {EQUIPMENT_PLACE_LINKS[item.id] && (
                    <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "2px solid currentColor", opacity: 0.8 }}>
                      <p style={{ fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.45, marginBottom: "0.35rem" }}>
                        Places where this matters
                      </p>
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        {EQUIPMENT_PLACE_LINKS[item.id].map(link => (
                          <Link
                            key={link.href}
                            href={link.href}
                            style={{ fontSize: "0.7rem", fontWeight: 700, textDecoration: "none", color: "inherit", opacity: 0.65 }}
                          >
                            See destinations →
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
