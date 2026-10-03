import { exercises, type Difficulty, type ExerciseType } from "@/data/exercises";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ski Exercises — Ski Guide",
  description: "Technique drills, conditioning, and balance exercises for skiers of all levels.",
};

const difficultyColor: Record<Difficulty, string> = {
  beginner: "text-green-400 bg-green-400/10",
  intermediate: "text-sky-400 bg-sky-400/10",
  advanced: "text-orange-400 bg-orange-400/10",
  expert: "text-red-400 bg-red-400/10",
};

const typeColor: Record<ExerciseType, string> = {
  technique: "text-violet-400 bg-violet-400/10",
  fitness: "text-amber-400 bg-amber-400/10",
  balance: "text-teal-400 bg-teal-400/10",
  conditioning: "text-rose-400 bg-rose-400/10",
};

export default function ExercisePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Exercise</h1>
      <p className="text-slate-400 mb-10">
        {exercises.length} exercises across technique, fitness, balance, and conditioning.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {exercises.map((ex) => (
          <article
            key={ex.id}
            className="rounded-xl border border-white/10 p-6 bg-white/[0.02]"
            data-exercise-id={ex.id}
          >
            <div className="flex flex-wrap gap-2 mb-3">
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${difficultyColor[ex.difficulty]}`}
              >
                {ex.difficulty}
              </span>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeColor[ex.type]}`}
              >
                {ex.type}
              </span>
            </div>

            <h2 className="text-lg font-semibold mb-1">{ex.name}</h2>
            <p className="text-sm text-slate-400 mb-4 leading-relaxed">{ex.description}</p>

            <div className="text-xs text-slate-500 mb-4">Duration: {ex.duration}</div>

            <details className="group">
              <summary className="cursor-pointer text-sm text-sky-400 hover:text-sky-300 transition-colors list-none">
                Steps &amp; tips
              </summary>
              <div className="mt-4 space-y-4">
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                    Steps
                  </h3>
                  <ol className="space-y-1.5 text-sm text-slate-300">
                    {ex.steps.map((step, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-slate-600 shrink-0">{i + 1}.</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                    Tips
                  </h3>
                  <ul className="space-y-1 text-sm text-slate-400 list-disc list-inside">
                    {ex.tips.map((tip, i) => (
                      <li key={i}>{tip}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                    Target muscles
                  </h3>
                  <p className="text-sm text-slate-400">{ex.targetMuscles.join(", ")}</p>
                </div>
              </div>
            </details>
          </article>
        ))}
      </div>
    </div>
  );
}
