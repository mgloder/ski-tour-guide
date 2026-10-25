"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DbPlace } from "@/lib/places";

// ── Random Destination Button ─────────────────────────────────────────────

export function RandomDestinationButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: { name: "ski_random_place", arguments: {} },
        }),
      });
      const json = await res.json() as {
        result?: { content?: { text?: string }[] };
        error?: { message: string };
      };
      if (json.error) throw new Error(json.error.message);
      const text = json.result?.content?.[0]?.text;
      if (!text) throw new Error("No result from server");
      const place = JSON.parse(text) as { name?: string };
      if (place.name) {
        router.push(`/places?q=${encodeURIComponent(place.name)}`);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: "0.75rem", display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
      <button
        onClick={handleClick}
        disabled={loading}
        style={{
          border: "2px solid currentColor",
          background: "transparent",
          color: "inherit",
          padding: "0.6rem 1.25rem",
          fontSize: "0.75rem",
          fontWeight: 900,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          cursor: loading ? "not-allowed" : "pointer",
          fontFamily: "inherit",
          opacity: loading ? 0.5 : 1,
        }}
      >
        {loading ? "Finding…" : "Random Destination"}
      </button>
      {error && (
        <span style={{ fontSize: "0.7rem", opacity: 0.5 }}>{error}</span>
      )}
    </div>
  );
}

// ── Training Progress Teaser ──────────────────────────────────────────────

type TrainingState = {
  checkedSkills?: string[];
  context?: string | null;
};

export function TrainingProgressTeaser() {
  const [hasProgress, setHasProgress] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("ski-training-v2");
      if (!raw) return;
      const parsed = JSON.parse(raw) as TrainingState;
      const checked = parsed.checkedSkills ?? [];
      if (checked.length > 0) {
        setHasProgress(true);
        setCount(checked.length);
      }
    } catch {
      // ignore
    }
  }, []);

  if (!hasProgress) return null;

  return (
    <div style={{
      border: "2px solid currentColor",
      padding: "0.75rem 1rem",
      marginTop: "1rem",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: "1rem",
      flexWrap: "wrap",
    }}>
      <div>
        <p style={{ fontWeight: 900, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>
          Training in progress
        </p>
        <p style={{ fontSize: "0.65rem", opacity: 0.5, margin: "0.15rem 0 0" }}>
          {count} skill{count !== 1 ? "s" : ""} completed
        </p>
      </div>
      <Link
        href="/training"
        style={{
          border: "2px solid currentColor",
          padding: "0.4rem 0.9rem",
          fontSize: "0.7rem",
          fontWeight: 900,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          textDecoration: "none",
          color: "inherit",
          flexShrink: 0,
        }}
      >
        Continue your training →
      </Link>
    </div>
  );
}

// ── Level Recommendations ─────────────────────────────────────────────────

type FiltersState = {
  level?: string;
  [key: string]: unknown;
};

// Map storage level values to place tags
const LEVEL_TAG_MAP: Record<string, string> = {
  beginner:     "beginner-friendly",
  intermediate: "intermediate",
  advanced:     "advanced",
  expert:       "expert",
  // training context values
  "first-timer":      "beginner-friendly",
  "some-experience":  "beginner-friendly",
};

function levelLabel(level: string): string {
  const labels: Record<string, string> = {
    beginner: "Beginner",
    intermediate: "Intermediate",
    advanced: "Advanced",
    expert: "Expert",
    "first-timer": "First-timer",
    "some-experience": "Some experience",
  };
  return labels[level] ?? level;
}

type LevelRecommendationsProps = {
  places: DbPlace[];
};

export function LevelRecommendations({ places }: LevelRecommendationsProps) {
  const [level, setLevel] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<DbPlace[]>([]);

  useEffect(() => {
    try {
      // Check ski-filters-v1 first
      const raw = localStorage.getItem("ski-filters-v1");
      if (raw) {
        const parsed = JSON.parse(raw) as FiltersState;
        if (parsed.level && typeof parsed.level === "string") {
          setLevel(parsed.level);
          return;
        }
      }
      // Fallback: check training context
      const trainingRaw = localStorage.getItem("ski-training-v2");
      if (trainingRaw) {
        const parsed = JSON.parse(trainingRaw) as TrainingState;
        if (parsed.context) {
          setLevel(parsed.context);
          return;
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!level) return;
    const tag = LEVEL_TAG_MAP[level] ?? level;
    const filtered = places
      .filter(p => p.tags?.includes(tag))
      .sort((a, b) => (b.total_km ?? 0) - (a.total_km ?? 0))
      .slice(0, 3);
    setRecommendations(filtered);
  }, [level, places]);

  if (!level || recommendations.length === 0) return null;

  return (
    <div style={{ marginTop: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.6rem" }}>
        <p className="bx-text-xs bx-uppercase bx-fw-black bx-tracking-wide" style={{ opacity: 0.5 }}>
          Recommended for {levelLabel(level)}
        </p>
        <Link
          href={`/places?tags=${LEVEL_TAG_MAP[level] ?? level}`}
          style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", opacity: 0.4, textDecoration: "none", color: "inherit" }}
        >
          See all →
        </Link>
      </div>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {recommendations.map(p => (
          <Link
            key={p.id}
            href={`/places?q=${encodeURIComponent(p.name)}`}
            style={{
              border: "2px solid currentColor",
              padding: "0.4rem 0.75rem",
              textDecoration: "none",
              color: "inherit",
              display: "inline-flex",
              flexDirection: "column",
              gap: "0.1rem",
            }}
          >
            <span style={{ fontWeight: 900, fontSize: "0.8rem" }}>{p.name}</span>
            <span style={{ fontSize: "0.6rem", opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {p.country}{(p.total_km ?? 0) > 0 ? ` · ${p.total_km} km` : ""}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Module progress cards (#89) ───────────────────────────────────────────

function ModuleProgressCards() {
  const [trainingCount, setTrainingCount] = useState(0);
  const [favCount, setFavCount] = useState(0);
  const [quizLevel, setQuizLevel] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("ski-training-v2");
      if (raw) {
        const parsed = JSON.parse(raw) as TrainingState;
        setTrainingCount((parsed.checkedSkills ?? []).length);
      }
    } catch {}
    try {
      const raw = localStorage.getItem("ski-favorites-v1");
      if (raw) {
        const ids: string[] = JSON.parse(raw);
        setFavCount(Array.isArray(ids) ? ids.length : 0);
      }
    } catch {}
    try {
      const raw = localStorage.getItem("ski-quiz-level");
      if (raw) setQuizLevel(raw);
    } catch {}
  }, []);

  const cards = [
    {
      href: "/training",
      label: "Training",
      status: trainingCount > 0
        ? `${trainingCount} skill${trainingCount !== 1 ? "s" : ""} completed`
        : "Not started",
      active: trainingCount > 0,
    },
    {
      href: "/places",
      label: "Places",
      status: favCount > 0
        ? `${favCount} saved resort${favCount !== 1 ? "s" : ""}`
        : "No saves yet",
      active: favCount > 0,
    },
    {
      href: "/equipment",
      label: "Equipment",
      status: quizLevel
        ? `Level: ${quizLevel}`
        : "Quiz not taken",
      active: !!quizLevel,
    },
  ];

  return (
    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "1rem" }}>
      {cards.map(card => (
        <Link
          key={card.label}
          href={card.href}
          style={{
            border: "2px solid currentColor",
            padding: "0.5rem 0.75rem",
            textDecoration: "none",
            color: "inherit",
            display: "inline-flex",
            flexDirection: "column",
            gap: "0.15rem",
            opacity: card.active ? 1 : 0.55,
            minWidth: "7rem",
          }}
        >
          <span style={{ fontWeight: 900, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>{card.label}</span>
          <span style={{ fontSize: "0.6rem", opacity: 0.65 }}>{card.status}</span>
        </Link>
      ))}
    </div>
  );
}

// ── Combined home client section ──────────────────────────────────────────

type HomeClientProps = {
  places: DbPlace[];
};

export default function HomeClient({ places }: HomeClientProps) {
  return (
    <div>
      <RandomDestinationButton />
      <TrainingProgressTeaser />
      <LevelRecommendations places={places} />
      <ModuleProgressCards />
    </div>
  );
}
