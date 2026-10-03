"use client";

import { useState } from "react";
import BodyMap, { type BodyZoneId } from "@/components/body-map";

export default function BodyTestPage() {
  const [active, setActive] = useState<BodyZoneId | null>(null);

  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "3rem", padding: "3rem", minHeight: "100vh" }}>
      <div style={{ width: "220px", flexShrink: 0 }}>
        <BodyMap activeZone={active} onZoneClick={z => setActive(prev => prev === z ? null : z)} />
      </div>
      <div style={{ fontFamily: "monospace", fontSize: "0.8rem", opacity: 0.6, paddingTop: "1rem" }}>
        <p style={{ textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "1rem" }}>
          Active zone: <strong>{active ?? "none"}</strong>
        </p>
        <p style={{ opacity: 0.5 }}>Click zones to toggle</p>
      </div>
    </div>
  );
}
