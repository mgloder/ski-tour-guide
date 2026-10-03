import { exercises, type Difficulty, type ExerciseType } from "@/data/exercises";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Exercise",
  description: "Ski technique drills, off-snow conditioning, and balance exercises for all levels — from first-timers to expert carvers.",
  alternates: { canonical: "https://theskihandbook.com/exercise" },
  openGraph: { url: "https://theskihandbook.com/exercise" },
};

const difficultyVariant: Record<Difficulty, string> = {
  beginner: "bx-badge-success",
  intermediate: "bx-badge-info",
  advanced: "bx-badge-warning",
  expert: "bx-badge-danger",
};

const typeVariant: Record<ExerciseType, string> = {
  technique: "bx-badge-primary",
  fitness: "bx-badge-warning",
  balance: "bx-badge-info",
  conditioning: "bx-badge-danger",
};

export default function ExercisePage() {
  return (
    <div style={{ padding: "2rem 1.5rem" }}>
      <div className="bx-mb-6" style={{ borderBottom: "3px solid currentColor", paddingBottom: "1.5rem" }}>
        <p className="bx-text-xs bx-uppercase bx-tracking-wide" style={{ opacity: 0.5 }}>Module 01</p>
        <h1 className="bx-display-2 bx-mb-0">Exercise</h1>
        <p className="bx-text-sm" style={{ opacity: 0.5 }}>{exercises.length} entries</p>
      </div>

      <div className="bx-brick bx-brick-2">
        {exercises.map((ex) => (
          <article key={ex.id} className="bx-card" data-exercise-id={ex.id}>
            <div className="bx-card-header" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <span className={`bx-badge ${difficultyVariant[ex.difficulty]}`}>{ex.difficulty}</span>
              <span className={`bx-badge ${typeVariant[ex.type]}`}>{ex.type}</span>
            </div>
            <div className="bx-card-body">
              <h3 className="bx-card-title">{ex.name}</h3>
              <p className="bx-card-text">{ex.description}</p>
              <p className="bx-text-xs bx-uppercase" style={{ opacity: 0.5, marginTop: "0.5rem" }}>
                Duration: {ex.duration}
              </p>
            </div>
            <div className="bx-card-footer">
              <details>
                <summary className="bx-btn bx-btn-ghost bx-btn-sm" style={{ cursor: "pointer", listStyle: "none" }}>
                  Steps &amp; Tips
                </summary>
                <div className="bx-pt-3" style={{ borderTop: "3px solid currentColor", marginTop: "0.75rem" }}>
                  <p className="bx-fw-black bx-uppercase bx-text-xs bx-mb-2">Steps</p>
                  <ol style={{ paddingLeft: "1.25rem", marginBottom: "1rem" }}>
                    {ex.steps.map((step, i) => (
                      <li key={i} className="bx-text-sm bx-mb-1">{step}</li>
                    ))}
                  </ol>
                  <p className="bx-fw-black bx-uppercase bx-text-xs bx-mb-2">Tips</p>
                  <ul style={{ paddingLeft: "1.25rem", marginBottom: "1rem" }}>
                    {ex.tips.map((tip, i) => (
                      <li key={i} className="bx-text-sm bx-mb-1">{tip}</li>
                    ))}
                  </ul>
                  <p className="bx-fw-black bx-uppercase bx-text-xs bx-mb-1">Target muscles</p>
                  <p className="bx-text-xs" style={{ opacity: 0.6 }}>{ex.targetMuscles.join(" · ")}</p>
                </div>
              </details>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
