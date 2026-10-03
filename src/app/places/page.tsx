import { places } from "@/data/places";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PLACES — Ski Guide",
  description: "Resort and destination guides with piste data, altitude, and seasonal recommendations.",
};

export default function PlacesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="border-b-2 border-white pb-8 mb-12">
        <p className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">Module 03</p>
        <h1 className="text-5xl font-black uppercase tracking-tighter">Places</h1>
        <p className="text-zinc-400 mt-2 font-mono text-sm">{places.length} entries</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {places.map((place) => (
          <article key={place.id} className="brut-card p-6 bg-black" data-place-id={place.id}>
            <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-1">
                  {place.country} · {place.region}
                </p>
                <h2 className="text-2xl font-black uppercase tracking-tight">{place.name}</h2>
              </div>
              <div className="flex flex-wrap gap-4 font-mono text-xs uppercase tracking-widest">
                <div className="text-right">
                  <p className="text-zinc-500">Pistes</p>
                  <p className="text-white font-bold">{place.totalKm} km</p>
                </div>
                <div className="text-right">
                  <p className="text-zinc-500">Altitude</p>
                  <p className="text-white font-bold">{place.altitude.base}–{place.altitude.peak}m</p>
                </div>
                <div className="text-right">
                  <p className="text-zinc-500">Level</p>
                  <p className="text-[#ffd400] font-bold uppercase">{place.difficulty}</p>
                </div>
              </div>
            </div>

            <p className="text-sm text-zinc-400 leading-relaxed mb-4">{place.description}</p>

            {/* Run breakdown */}
            <div className="flex gap-0 mb-4 border-2 border-white">
              {[
                { label: "Green", count: place.runs.green, color: "bg-green-600" },
                { label: "Blue", count: place.runs.blue, color: "bg-sky-600" },
                { label: "Red", count: place.runs.red, color: "bg-red-600" },
                { label: "Black", count: place.runs.black, color: "bg-zinc-900" },
              ].map(({ label, count, color }, i) => (
                <div
                  key={label}
                  className={`flex-1 ${color} px-3 py-2 text-center ${i < 3 ? "border-r-2 border-white" : ""}`}
                >
                  <p className="text-xs font-black uppercase tracking-widest text-white">{count}</p>
                  <p className="text-xs font-mono text-white/70 uppercase">{label}</p>
                </div>
              ))}
            </div>

            <details>
              <summary className="cursor-pointer text-xs font-black uppercase tracking-widest text-[#ffd400] hover:underline list-none select-none">
                [ Highlights &amp; Best Months ]
              </summary>
              <div className="mt-4 space-y-4 border-t-2 border-white pt-4">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest mb-2">Highlights</h3>
                  <ul className="space-y-1.5 text-sm text-zinc-300">
                    {place.highlights.map((h, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-[#ffd400] shrink-0">—</span>
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest mb-1">Best Months</h3>
                  <p className="text-xs font-mono text-zinc-500 uppercase tracking-wide">
                    {place.bestMonths.join(" · ")}
                  </p>
                </div>
                {place.website && (
                  <a
                    href={place.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-xs font-black uppercase tracking-widest text-[#ffd400] hover:underline"
                  >
                    Official Website →
                  </a>
                )}
              </div>
            </details>
          </article>
        ))}
      </div>
    </div>
  );
}
