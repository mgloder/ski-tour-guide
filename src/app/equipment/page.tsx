import { equipment, type EquipmentCategory, type SkillLevel } from "@/data/equipment";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "EQUIPMENT — Ski Guide",
  description: "Gear guides for skis, boots, poles, helmets, safety equipment, and clothing.",
};

const categoryStyle: Record<EquipmentCategory, string> = {
  skis: "border-sky-400 text-sky-400",
  boots: "border-indigo-400 text-indigo-400",
  poles: "border-teal-400 text-teal-400",
  helmet: "border-orange-400 text-orange-400",
  clothing: "border-violet-400 text-violet-400",
  safety: "border-red-400 text-red-400",
  accessories: "border-amber-400 text-amber-400",
};

const levelStyle: Record<SkillLevel, string> = {
  beginner: "text-green-400",
  intermediate: "text-sky-400",
  advanced: "text-orange-400",
  all: "text-zinc-500",
};

export default function EquipmentPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="border-b-2 border-white pb-8 mb-12">
        <p className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">Module 02</p>
        <h1 className="text-5xl font-black uppercase tracking-tighter">Equipment</h1>
        <p className="text-zinc-400 mt-2 font-mono text-sm">{equipment.length} entries</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {equipment.map((item) => (
          <article key={item.id} className="brut-card p-6 bg-black" data-equipment-id={item.id}>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span
                className={`text-xs font-mono font-bold uppercase tracking-widest px-2 py-0.5 border ${categoryStyle[item.category]}`}
              >
                {item.category}
              </span>
              <span className={`text-xs font-mono uppercase tracking-widest ${levelStyle[item.skillLevel]}`}>
                {item.skillLevel}
              </span>
            </div>

            <h2 className="text-xl font-black uppercase tracking-tight mb-2">{item.name}</h2>
            <p className="text-sm text-zinc-400 mb-3 leading-relaxed">{item.description}</p>
            <p className="text-xs font-mono text-zinc-600 uppercase tracking-widest mb-4">
              Price: {item.priceRange}
            </p>

            <details>
              <summary className="cursor-pointer text-xs font-black uppercase tracking-widest text-[#ffd400] hover:underline list-none select-none">
                [ Features &amp; Maintenance ]
              </summary>
              <div className="mt-4 space-y-4 border-t-2 border-white pt-4">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest mb-2">Features</h3>
                  <ul className="space-y-1.5 text-sm text-zinc-300">
                    {item.features.map((f, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-[#ffd400] shrink-0">—</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest mb-2">Maintenance</h3>
                  <ul className="space-y-1.5 text-sm text-zinc-400">
                    {item.maintenanceTips.map((tip, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-zinc-600 shrink-0">—</span>
                        {tip}
                      </li>
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
