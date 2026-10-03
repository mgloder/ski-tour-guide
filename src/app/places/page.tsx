import { places } from "@/data/places";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PLACES — Ski Guide",
  description: "Resort and destination guides with piste data, altitude, and seasonal recommendations.",
};

export default function PlacesPage() {
  return (
    <div className="bx-container bx-py-6">
      <div className="bx-mb-6" style={{ borderBottom: "3px solid currentColor", paddingBottom: "1.5rem" }}>
        <p className="bx-text-xs bx-uppercase bx-tracking-wide" style={{ opacity: 0.5 }}>Module 03</p>
        <h1 className="bx-display-2 bx-mb-0">Places</h1>
        <p className="bx-text-sm" style={{ opacity: 0.5 }}>{places.length} entries</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {places.map((place) => (
          <article key={place.id} className="bx-card" data-place-id={place.id}>
            <div className="bx-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
              <div>
                <p className="bx-text-xs bx-uppercase" style={{ opacity: 0.5, marginBottom: "0.25rem" }}>
                  {place.country} · {place.region}
                </p>
                <h2 className="bx-card-title bx-mb-0">{place.name}</h2>
              </div>
              <div style={{ display: "flex", gap: "1rem", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ opacity: 0.5 }}>Pistes</div>
                  <strong>{place.totalKm} km</strong>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ opacity: 0.5 }}>Altitude</div>
                  <strong>{place.altitude.base}–{place.altitude.peak}m</strong>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ opacity: 0.5 }}>Level</div>
                  <strong>{place.difficulty}</strong>
                </div>
              </div>
            </div>

            <div className="bx-card-body">
              <p className="bx-card-text bx-mb-3">{place.description}</p>

              {/* Run breakdown strip */}
              <div className="run-strip bx-mb-3">
                <div className="run-strip-cell" style={{ background: "#166534" }}>
                  <div>{place.runs.green}</div>
                  <div>Green</div>
                </div>
                <div className="run-strip-cell" style={{ background: "#1e40af" }}>
                  <div>{place.runs.blue}</div>
                  <div>Blue</div>
                </div>
                <div className="run-strip-cell" style={{ background: "#991b1b" }}>
                  <div>{place.runs.red}</div>
                  <div>Red</div>
                </div>
                <div className="run-strip-cell" style={{ background: "#18181b" }}>
                  <div>{place.runs.black}</div>
                  <div>Black</div>
                </div>
              </div>
            </div>

            <div className="bx-card-footer">
              <details>
                <summary className="bx-btn bx-btn-ghost bx-btn-sm" style={{ cursor: "pointer", listStyle: "none" }}>
                  Highlights &amp; Best Months
                </summary>
                <div className="bx-pt-3" style={{ borderTop: "3px solid currentColor", marginTop: "0.75rem" }}>
                  <p className="bx-fw-black bx-uppercase bx-text-xs bx-mb-2">Highlights</p>
                  <ul style={{ paddingLeft: "1.25rem", marginBottom: "1rem" }}>
                    {place.highlights.map((h, i) => (
                      <li key={i} className="bx-text-sm bx-mb-1">{h}</li>
                    ))}
                  </ul>
                  <p className="bx-fw-black bx-uppercase bx-text-xs bx-mb-1">Best Months</p>
                  <p className="bx-text-sm bx-mb-3" style={{ opacity: 0.7 }}>{place.bestMonths.join(" · ")}</p>
                  {place.website && (
                    <a href={place.website} target="_blank" rel="noopener noreferrer" className="bx-btn bx-btn-ghost bx-btn-sm">
                      Official Website →
                    </a>
                  )}
                </div>
              </details>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
