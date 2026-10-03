import { equipment, type EquipmentCategory, type SkillLevel } from "@/data/equipment";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ski Equipment — Ski Guide",
  description: "Gear guides for skis, boots, poles, helmets, safety equipment, and clothing.",
};

const categoryColor: Record<EquipmentCategory, string> = {
  skis: "text-sky-400 bg-sky-400/10",
  boots: "text-indigo-400 bg-indigo-400/10",
  poles: "text-teal-400 bg-teal-400/10",
  helmet: "text-orange-400 bg-orange-400/10",
  clothing: "text-violet-400 bg-violet-400/10",
  safety: "text-red-400 bg-red-400/10",
  accessories: "text-amber-400 bg-amber-400/10",
};

const levelColor: Record<SkillLevel, string> = {
  beginner: "text-green-400",
  intermediate: "text-sky-400",
  advanced: "text-orange-400",
  all: "text-slate-400",
};

export default function EquipmentPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Equipment</h1>
      <p className="text-slate-400 mb-10">
        {equipment.length} items across gear categories.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {equipment.map((item) => (
          <article
            key={item.id}
            className="rounded-xl border border-white/10 p-6 bg-white/[0.02]"
            data-equipment-id={item.id}
          >
            <div className="flex flex-wrap gap-2 mb-3">
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${categoryColor[item.category]}`}
              >
                {item.category}
              </span>
              <span className={`text-xs font-medium ${levelColor[item.skillLevel]}`}>
                {item.skillLevel}
              </span>
            </div>

            <h2 className="text-lg font-semibold mb-1">{item.name}</h2>
            <p className="text-sm text-slate-400 mb-3 leading-relaxed">{item.description}</p>

            <div className="text-xs text-slate-500 mb-4">Price range: {item.priceRange}</div>

            <details className="group">
              <summary className="cursor-pointer text-sm text-sky-400 hover:text-sky-300 transition-colors list-none">
                Features &amp; maintenance
              </summary>
              <div className="mt-4 space-y-4">
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                    Features
                  </h3>
                  <ul className="space-y-1 text-sm text-slate-300 list-disc list-inside">
                    {item.features.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                    Maintenance
                  </h3>
                  <ul className="space-y-1 text-sm text-slate-400 list-disc list-inside">
                    {item.maintenanceTips.map((tip, i) => (
                      <li key={i}>{tip}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </details>
          </article>
        ))}
      </div>
    </div>
  );
}
