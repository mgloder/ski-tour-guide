import { equipment, type EquipmentCategory, type SkillLevel } from "@/data/equipment";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "EQUIPMENT — Ski Guide",
  description: "Gear guides for skis, boots, poles, helmets, safety equipment, and clothing.",
};

const categoryVariant: Record<EquipmentCategory, string> = {
  skis: "bx-badge-primary",
  boots: "bx-badge-info",
  poles: "bx-badge-info",
  helmet: "bx-badge-warning",
  clothing: "bx-badge-primary",
  safety: "bx-badge-danger",
  accessories: "bx-badge-warning",
};

const levelVariant: Record<SkillLevel, string> = {
  beginner: "bx-badge-success",
  intermediate: "bx-badge-info",
  advanced: "bx-badge-warning",
  all: "",
};

export default function EquipmentPage() {
  return (
    <div className="bx-container bx-py-6">
      <div className="bx-mb-6" style={{ borderBottom: "3px solid currentColor", paddingBottom: "1.5rem" }}>
        <p className="bx-text-xs bx-uppercase bx-tracking-wide" style={{ opacity: 0.5 }}>Module 02</p>
        <h1 className="bx-display-2 bx-mb-0">Equipment</h1>
        <p className="bx-text-sm" style={{ opacity: 0.5 }}>{equipment.length} entries</p>
      </div>

      <div className="bx-brick bx-brick-2">
        {equipment.map((item) => (
          <article key={item.id} className="bx-card" data-equipment-id={item.id}>
            <div className="bx-card-header" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <span className={`bx-badge ${categoryVariant[item.category]}`}>{item.category}</span>
              <span className={`bx-badge ${levelVariant[item.skillLevel]}`}>{item.skillLevel}</span>
            </div>
            <div className="bx-card-body">
              <h3 className="bx-card-title">{item.name}</h3>
              <p className="bx-card-text">{item.description}</p>
              <p className="bx-text-xs bx-uppercase" style={{ opacity: 0.5, marginTop: "0.5rem" }}>
                Price: {item.priceRange}
              </p>
            </div>
            <div className="bx-card-footer">
              <details>
                <summary className="bx-btn bx-btn-ghost bx-btn-sm" style={{ cursor: "pointer", listStyle: "none" }}>
                  Features &amp; Maintenance
                </summary>
                <div className="bx-pt-3" style={{ borderTop: "3px solid currentColor", marginTop: "0.75rem" }}>
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
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
