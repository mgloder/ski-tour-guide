import { places } from "@/data/places";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ski Places — Ski Guide",
  description: "Resort and destination guides with piste data, altitude, and seasonal recommendations.",
};

export default function PlacesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Places</h1>
      <p className="text-slate-400 mb-10">
        {places.length} ski destinations across Europe and beyond.
      </p>

      <div className="grid grid-cols-1 gap-6">
        {places.map((place) => (
          <article
            key={place.id}
            className="rounded-xl border border-white/10 p-6 bg-white/[0.02]"
            data-place-id={place.id}
          >
            <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl font-semibold">{place.name}</h2>
                <p className="text-sm text-slate-400 mt-0.5">
                  {place.region}, {place.country}
                </p>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                <span>
                  <span className="text-slate-300 font-medium">{place.totalKm} km</span> pistes
                </span>
                <span>
                  <span className="text-slate-300 font-medium">
                    {place.altitude.base}–{place.altitude.peak}m
                  </span>{" "}
                  altitude
                </span>
                <span className="capitalize text-sky-400">{place.difficulty}</span>
              </div>
            </div>

            <p className="text-sm text-slate-400 leading-relaxed mb-4">{place.description}</p>

            <div className="flex flex-wrap gap-3 mb-4">
              {[
                { label: "Green", count: place.runs.green, color: "text-green-400" },
                { label: "Blue", count: place.runs.blue, color: "text-sky-400" },
                { label: "Red", count: place.runs.red, color: "text-red-400" },
                { label: "Black", count: place.runs.black, color: "text-slate-200" },
              ].map(({ label, count, color }) => (
                <span key={label} className="text-xs">
                  <span className={`font-semibold ${color}`}>{count}</span>{" "}
                  <span className="text-slate-500">{label}</span>
                </span>
              ))}
            </div>

            <details>
              <summary className="cursor-pointer text-sm text-sky-400 hover:text-sky-300 transition-colors list-none">
                Highlights &amp; best months
              </summary>
              <div className="mt-4 space-y-4">
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                    Highlights
                  </h3>
                  <ul className="space-y-1 text-sm text-slate-300 list-disc list-inside">
                    {place.highlights.map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                    Best months
                  </h3>
                  <p className="text-sm text-slate-400">{place.bestMonths.join(", ")}</p>
                </div>
                {place.website && (
                  <a
                    href={place.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-sm text-sky-400 hover:text-sky-300 transition-colors"
                  >
                    Official website
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
