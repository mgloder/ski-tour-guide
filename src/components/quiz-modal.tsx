"use client";
import { useState } from "react";

const QUESTIONS = [
  {
    q: "How long have you been skiing?",
    answers: ["Never skied before", "A handful of times", "Several seasons", "Many years"],
  },
  {
    q: "Which runs can you ski comfortably?",
    answers: ["Green / beginner only", "Blue runs", "Red runs confidently", "Black runs & off-piste"],
  },
  {
    q: "How do you feel at the top of a steep slope?",
    answers: ["Very nervous — I avoid it", "Nervous but manage", "Comfortable", "I love steep terrain"],
  },
  {
    q: "What's your main goal this ski trip?",
    answers: ["Learn the very basics", "Build confidence on blues", "Improve carving & technique", "Challenge myself / off-piste"],
  },
  {
    q: "How physically active are you day-to-day?",
    answers: ["Low activity", "Moderately active", "Active & sporty", "Athletic training"],
  },
];

function getLevel(answers: number[]): "beginner" | "intermediate" | "advanced" {
  const total = answers.reduce((s, a) => s + a, 0);
  if (total <= 4)  return "beginner";
  if (total <= 9)  return "intermediate";
  return "advanced";
}

const LEVEL_LABELS = {
  beginner:     "First timer",
  intermediate: "Getting there",
  advanced:     "Confident",
};

const LEVEL_DESC = {
  beginner:     "Green runs and learning zones — resorts with dedicated beginner areas, gentle slopes, and good instruction.",
  intermediate: "Blues and easy reds — resorts with varied terrain and good progression routes.",
  advanced:     "Reds, blacks, and beyond — large resorts with technical terrain, powder, and challenging runs.",
};

export default function QuizModal({
  onClose,
  onResult,
}: {
  onClose: () => void;
  onResult: (level: string) => void;
}) {
  const [step, setStep]       = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult]   = useState<string | null>(null);

  function pick(idx: number) {
    const next = [...answers, idx];
    if (next.length < QUESTIONS.length) {
      setAnswers(next);
      setStep(s => s + 1);
    } else {
      const level = getLevel(next);
      setResult(level);
      setAnswers(next);
    }
  }

  function apply() {
    if (result) {
      try { localStorage.setItem("ski-quiz-level", result); } catch {}
      onResult(result);
    }
    onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }} onClick={onClose}>
      <div style={{ background: "var(--bx-paper, #fff)", color: "var(--bx-ink, #111)", border: "3px solid currentColor", maxWidth: "480px", width: "100%", padding: "1.5rem" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <p style={{ fontSize: "0.65rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.5 }}>
            {result ? "Your level" : `Question ${step + 1} of ${QUESTIONS.length}`}
          </p>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem", lineHeight: 1, opacity: 0.5 }}>×</button>
        </div>

        {!result ? (
          <>
            {/* Progress bar */}
            <div style={{ height: 3, background: "currentColor", opacity: 0.12, marginBottom: "1.25rem" }}>
              <div style={{ height: "100%", background: "var(--bx-primary, #2b44ff)", width: `${(step / QUESTIONS.length) * 100}%`, transition: "width 0.3s" }} />
            </div>
            <p style={{ fontWeight: 900, fontSize: "1.05rem", marginBottom: "1.25rem", lineHeight: 1.3 }}>{QUESTIONS[step].q}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {QUESTIONS[step].answers.map((ans, i) => (
                <button
                  key={i}
                  onClick={() => pick(i)}
                  style={{ border: "2px solid currentColor", background: "transparent", color: "inherit", padding: "0.7rem 1rem", textAlign: "left", cursor: "pointer", fontSize: "0.85rem", fontWeight: 500 }}
                >
                  {ans}
                </button>
              ))}
            </div>
            {step > 0 && (
              <button onClick={() => { setStep(s => s - 1); setAnswers(a => a.slice(0, -1)); }} style={{ marginTop: "0.75rem", background: "none", border: "none", cursor: "pointer", opacity: 0.4, fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>← Back</button>
            )}
          </>
        ) : (
          <>
            <p style={{ fontWeight: 900, fontSize: "1.5rem", marginBottom: "0.5rem" }}>{LEVEL_LABELS[result as keyof typeof LEVEL_LABELS]}</p>
            <p style={{ fontSize: "0.85rem", opacity: 0.7, lineHeight: 1.5, marginBottom: "1.5rem" }}>{LEVEL_DESC[result as keyof typeof LEVEL_DESC]}</p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button onClick={apply} style={{ flex: 1, border: "3px solid currentColor", background: "currentColor", color: "var(--bx-paper, #fff)", padding: "0.7rem 1rem", cursor: "pointer", fontSize: "0.8rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Apply filter
              </button>
              <button onClick={() => { setStep(0); setAnswers([]); setResult(null); }} style={{ border: "2px solid currentColor", background: "transparent", padding: "0.7rem 1rem", cursor: "pointer", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Retake
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
