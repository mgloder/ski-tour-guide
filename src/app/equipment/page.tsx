import type { Metadata } from "next";
import EquipmentExplorer from "@/components/equipment-explorer";

export const metadata: Metadata = {
  title: "EQUIPMENT — Ski Guide",
  description: "Human-centric ski equipment guide. Select a body zone to find the right gear.",
};

export default function EquipmentPage() {
  return (
    <div>
      <div style={{ padding: "1.5rem 1.5rem 1rem", borderBottom: "3px solid currentColor" }}>
        <p className="bx-text-xs bx-uppercase bx-tracking-wide" style={{ opacity: 0.5 }}>Module 02</p>
        <h1 className="bx-display-2 bx-mb-0">Equipment</h1>
        <p className="bx-text-sm" style={{ opacity: 0.5 }}>Click a body zone to explore gear for that area.</p>
      </div>
      <EquipmentExplorer />
    </div>
  );
}
