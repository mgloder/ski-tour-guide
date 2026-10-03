import { exercises, type Difficulty, type ExerciseType } from "@/data/exercises";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "EXERCISE — Ski Guide",
  description: "Technique drills, conditioning, and balance exercises for skiers of all levels.",
};

const difficultyStyle: Record<Difficulty, string> = {
  beginner: "border-green-400 text-green-400",
  intermediate: "border-sky-400 text-sky-400",
  advanced: "border-orange-400 text-orange-400",
  expert: "border-red-400 text-red-400",
};

const typeStyle: Record<ExerciseType, string> = {
  technique: "border-violet-400 text-violet-400",
  fitness: "border-amber-400 text-amber-400",
  balance: "border-teal-400 text-teal-400",
  conditioning: "border-rose-400 text-rose-400",
};

export default function ExercisePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="border-b-2 border-white pb-8 mb-12">
        <p className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">Module 01</p>
        <h1 className="text-5xl font-black uppercase tracking-tighter">Exercise</h1>
        <p className="text-zinc-400 mt-2 font-mono text-sm">{exercises.length} entries</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {exercises.map((ex) => (
          <article key={ex.id} className="brut-card p-6 bg-black" data-exercise-id={ex.id}>
            <div className="flex flex-wrap gap-2 mb-4">
              <span
                className={`text-xs font-mono font-bold uppercase tracking-widest px-2 py-0.5 border ${difficultyStyle[ex.difficulty]}`}
              >
                {ex.difficulty}
              </span>
              <span
                className={`text-xs font-mono font-bold uppercase tracking-widest px-2 py-0.5 border ${typeStyle[ex.type]}`}
              >
                {ex.type}
              </span>
            </div>

            <h2 className="text-xl font-black uppercase tracking-tight mb-2">{ex.name}</h2>
            <p className="text-sm text-zinc-400 mb-4 leading-relaxed">{ex.description}</p>
            <p className="text-xs font-mono text-zinc-600 uppercase tracking-widest mb-4">
              Duration: {ex.duration}
            </p>

            <details>
              <summary className="cursor-pointer text-xs font-black uppercase tracking-widest text-[#ffd400] hover:underline list-none select-none">
                [ Steps &amp; Tips ]
              </summary>
              <div className="mt-4 space-y-4 border-t-2 border-white pt-4">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest mb-2">Steps</h3>
                  <ol className="space-y-1.5 text-sm text-zinc-300">
                    {ex.steps.map((step, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="font-mono text-zinc-600 shrink-0">{String(i + 1).padStart(2, "0")}.</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest mb-2">Tips</h3>
                  <ul className="space-y-1 text-sm text-zinc-400">
                    {ex.tips.map((tip, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-[#ffd400] shrink-0">—</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest mb-1">Target muscles</h3>
                  <p className="text-xs font-mono text-zinc-500 uppercase tracking-wide">
                    {ex.targetMuscles.join(" · ")}
                  </p>
                </div>
              </div>
            </details>
          </article>
        ))}
      </div>
    </div>
  );
}
