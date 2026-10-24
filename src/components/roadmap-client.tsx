"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  roadmap, LEARNING_CONTEXTS, HANDBOOK_LEVELS,
  type LearningContext, type Checkpoint, type SkillItem,
} from "@/data/roadmap";
import { exercises, type Exercise } from "@/data/exercises";

const STORAGE_KEY = "ski-training-v2";
const LEVEL_ORDER = ["development", "performance", "high-performance"] as const;

const DIFFICULTY_RANK: Record<string, number> = { beginner: 0, intermediate: 1, advanced: 2, expert: 3 };
const CONTEXT_MIN_RANK: Record<string, number> = {
  "first-timer": 0,
  "some-experience": 0,
  "intermediate": 1,
  "advanced": 2,
};
// Beginner exercises are hidden from performance/high-performance checkpoints regardless of user context
const LEVEL_MIN_RANK: Record<string, number> = {
  "performance": 1,
  "high-performance": 1,
};

type StoredState = {
  context: LearningContext | null;
  scenario: string | null;
  foundationTab: string;
  checkedSkills: string[];
  openExercises: string[];
};

const DEFAULT_STATE: StoredState = {
  context: null,
  scenario: null,
  foundationTab: roadmap.commonPath[0].id,
  checkedSkills: [],
  openExercises: [],
};

const VALID_CONTEXTS = new Set<string>(["first-timer", "some-experience", "intermediate", "advanced"]);

function loadState(): StoredState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    if (parsed.context && !VALID_CONTEXTS.has(parsed.context)) parsed.context = null;
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return DEFAULT_STATE;
  }
}

function persistState(s: StoredState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

function progressFor(cp: Checkpoint, checkedSkills: string[]) {
  const done = cp.skills.filter(s => checkedSkills.includes(`${cp.id}:${s.id}`)).length;
  return { done, total: cp.skills.length };
}

// ── Main component ────────────────────────────────────────────────────────

export default function RoadmapClient() {
  const [mounted, setMounted] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [context, setContext]           = useState<LearningContext | null>(null);
  const [scenario, setScenario]         = useState<string | null>(null);
  const [foundationTab, setFoundationTab] = useState<string>(roadmap.commonPath[0].id);
  const [checkedSkills, setCheckedSkills] = useState<string[]>([]);
  const [openExercises, setOpenExercises] = useState<string[]>([]);

  useEffect(() => {
    const s = loadState();
    setContext(s.context);
    setScenario(s.scenario);
    setFoundationTab(s.foundationTab);
    setCheckedSkills(s.checkedSkills);
    setOpenExercises(s.openExercises);
    setMounted(true);
  }, []);

  function save(updates: Partial<StoredState>) {
    const next: StoredState = { context, scenario, foundationTab, checkedSkills, openExercises, ...updates };
    if ("context"      in updates) setContext(updates.context ?? null);
    if ("scenario"     in updates) setScenario(updates.scenario ?? null);
    if ("foundationTab" in updates) setFoundationTab(updates.foundationTab!);
    if ("checkedSkills" in updates) setCheckedSkills(updates.checkedSkills!);
    if ("openExercises" in updates) setOpenExercises(updates.openExercises!);
    persistState(next);
  }

  function toggleSkill(key: string) {
    save({ checkedSkills: checkedSkills.includes(key) ? checkedSkills.filter(s => s !== key) : [...checkedSkills, key] });
  }

  function toggleExercises(id: string) {
    save({ openExercises: openExercises.includes(id) ? openExercises.filter(x => x !== id) : [...openExercises, id] });
  }

  const activeBranch = roadmap.branches.find(b => b.id === scenario) ?? null;

  const allCheckpointsMap = new Map<string, Checkpoint>();
  roadmap.commonPath.forEach(cp => allCheckpointsMap.set(cp.id, cp));
  roadmap.branches.forEach(b => b.checkpoints.forEach(cp => allCheckpointsMap.set(cp.id, cp)));

  function prereqStatus(ids: string[]) {
    return ids.map(id => {
      const cp = allCheckpointsMap.get(id);
      if (!cp) return { id, name: id, doneCount: 0, total: 0, complete: false, skills: [] as SkillItem[], checkpointId: id, isFoundation: false, branchId: null as string | null, branchName: null as string | null };
      const doneCount = cp.skills.filter(s => checkedSkills.includes(`${cp.id}:${s.id}`)).length;
      const total = cp.skills.length;
      const isFoundation = roadmap.commonPath.some(c => c.id === id);
      const ownerBranch = isFoundation ? null : roadmap.branches.find(b => b.checkpoints.some(c => c.id === id)) ?? null;
      return {
        id, name: cp.name, doneCount, total,
        complete: total > 0 && doneCount === total,
        skills: cp.skills,
        checkpointId: cp.id,
        isFoundation,
        branchId: ownerBranch?.id ?? null,
        branchName: ownerBranch?.name ?? null,
      };
    });
  }

  const allCheckpoints = [...roadmap.commonPath, ...(activeBranch?.checkpoints ?? [])];
  const totalSkills = allCheckpoints.reduce((s, cp) => s + cp.skills.length, 0);
  const checkedCount = checkedSkills.filter(k =>
    allCheckpoints.some(cp => cp.skills.some(s => `${cp.id}:${s.id}` === k))
  ).length;

  const selectedFoundation = roadmap.commonPath.find(cp => cp.id === foundationTab) ?? roadmap.commonPath[0];
  const isFoundationSkippable = !!(context && selectedFoundation.skipFor?.includes(context));
  const foundationMinRank = Math.max(
    isFoundationSkippable ? (CONTEXT_MIN_RANK[context!] ?? 0) : 0,
    LEVEL_MIN_RANK[selectedFoundation.level ?? ""] ?? 0,
  );
  const foundationExercises = exercises.filter(e =>
    selectedFoundation.exerciseIds.includes(e.id) &&
    (DIFFICULTY_RANK[e.difficulty] ?? 0) >= foundationMinRank
  );

  function autoComplete(cp: Checkpoint) {
    const allKeys = cp.skills.map(s => `${cp.id}:${s.id}`);
    const allDone = allKeys.every(k => checkedSkills.includes(k));
    save({ checkedSkills: allDone ? checkedSkills.filter(k => !allKeys.includes(k)) : [...new Set([...checkedSkills, ...allKeys])] });
  }

  function handleReset() {
    setContext(null); setScenario(null); setFoundationTab(roadmap.commonPath[0].id);
    setCheckedSkills([]); setOpenExercises([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }

  function handleScenarioSelect(id: string) {
    const next = scenario === id ? null : id;
    setTransitioning(true);
    setTimeout(() => {
      const branch = next ? roadmap.branches.find(b => b.id === next) : null;
      const toOpen = branch
        ? branch.checkpoints
            .filter(cp => exercises.some(e => cp.exerciseIds.includes(e.id)))
            .filter(cp => !(context && cp.skipFor?.includes(context)))
            .map(cp => cp.id)
            .filter(cpId => !openExercises.includes(cpId))
        : [];
      save({
        scenario: next,
        openExercises: toOpen.length > 0 ? [...openExercises, ...toOpen] : openExercises,
      });
      setTransitioning(false);
      if (next) scrollRef.current?.scrollTo({ top: 0 });
    }, 200);
  }

  function goToFoundation(cpId: string) {
    setTransitioning(true);
    setTimeout(() => { save({ scenario: null, foundationTab: cpId }); setTransitioning(false); }, 200);
  }

  return (
    <div>
      <style>{`
        @keyframes bxFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .progression-scroll { scrollbar-width: none; }
        .progression-scroll::-webkit-scrollbar { display: none; }
      `}</style>

      {/* ── PAGE HEADER ── */}
      <div style={{ padding: "1.5rem 1.5rem 1rem", borderBottom: "3px solid currentColor" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <p className="bx-text-xs bx-uppercase bx-tracking-wide" style={{ opacity: 0.5 }}>Module 01</p>
            <h1 className="bx-display-2 bx-mb-0">Training</h1>
            <p className="bx-text-sm" style={{ opacity: 0.5 }}>
              {mounted ? `${checkedCount} / ${totalSkills} skills checked` : "Your skill roadmap"}
            </p>
          </div>
          {mounted && (context || scenario || checkedSkills.length > 0) && (
            <button onClick={handleReset} className="bx-btn bx-btn-ghost bx-btn-xs" style={{ opacity: 0.5 }}>
              Reset progress
            </button>
          )}
        </div>
      </div>

      {/* ── CONTEXT BAR ── */}
      <div style={{ borderBottom: "3px solid currentColor", padding: "0.75rem 1.5rem", display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.12em", opacity: 0.4, minWidth: "4rem" }}>My level</span>
        {LEARNING_CONTEXTS.map(ctx => (
          <button
            key={ctx.value}
            onClick={() => save({ context: context === ctx.value ? null : ctx.value })}
            className={`bx-btn bx-btn-xs ${mounted && context === ctx.value ? "bx-btn-primary" : "bx-btn-ghost"}`}
            title={ctx.hint}
          >
            {ctx.label}
          </button>
        ))}
        <span style={{ fontSize: "0.6rem", opacity: 0.3, marginLeft: "0.25rem", fontStyle: "italic" }}>
          {mounted && context
            ? LEARNING_CONTEXTS.find(c => c.value === context)?.hint
            : "— select your level to personalise tips on each checkpoint"}
        </span>
      </div>

      {/* ── ANIMATED VIEW SWITCHER ── */}
      <div style={{
        opacity: transitioning ? 0 : 1,
        transform: transitioning ? "translateY(8px)" : "translateY(0)",
        transition: "opacity 0.18s ease, transform 0.18s ease",
      }}>

        {mounted && activeBranch ? (

          /* ── PROGRESSION VIEW ── */
          <div>

            {/* Compact controls bar */}
            <div style={{ borderBottom: "3px solid currentColor", padding: "0.6rem 1.5rem", display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
              {/* Common Foundation button */}
              <button
                onClick={() => goToFoundation(roadmap.commonPath[0]?.id ?? "")}
                className="bx-btn bx-btn-xs bx-btn-ghost"
              >
                Common Foundation
              </button>
              <div style={{ width: "2px", height: "1.4rem", background: "currentColor", opacity: 0.15, flexShrink: 0 }} />
              {/* Scenario selector */}
              {roadmap.branches.map(branch => {
                const isSelected = scenario === branch.id;
                return (
                  <button
                    key={branch.id}
                    onClick={() => handleScenarioSelect(branch.id)}
                    className={`bx-btn bx-btn-xs ${isSelected ? "bx-btn-primary" : "bx-btn-ghost"}`}
                  >
                    {branch.name}
                  </button>
                );
              })}
            </div>

            {/* Scrollable content panel */}
            <div ref={scrollRef} className="progression-scroll" style={{ overflowY: "auto", maxHeight: "calc(100svh - 260px)", minHeight: "400px" }}>
              <div key={activeBranch.id} style={{ padding: "1.5rem 1.5rem 3rem" }}>

                {/* Branch heading */}
                <ScrollReveal style={{ marginBottom: "1.25rem" }}>
                  <h2 style={{ fontSize: "1.3rem", fontWeight: 900, margin: "0 0 0.25rem", lineHeight: 1.1 }}>{activeBranch.name}</h2>
                  <p className="bx-text-xs" style={{ opacity: 0.45, margin: 0 }}>Development → Performance → High Performance</p>
                </ScrollReveal>

                {activeBranch.prerequisiteIds && (
                  <ScrollReveal>
                    <PrereqsFlow
                      prereqs={prereqStatus(activeBranch.prerequisiteIds)}
                      checkedSkills={checkedSkills}
                      onNavigateFoundation={(id) => goToFoundation(id)}
                      onNavigateBranch={(branchId, checkpointId) => {
                        handleScenarioSelect(branchId);
                        setTimeout(() => {
                          document.getElementById(`checkpoint-${checkpointId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }, 280);
                      }}
                    />
                  </ScrollReveal>
                )}

                {LEVEL_ORDER.map((levelId, levelIndex) => {
                  const levelInfo = HANDBOOK_LEVELS[levelId];
                  const levelCheckpoints = activeBranch.checkpoints.filter(cp => cp.level === levelId);
                  const nextLevelId = LEVEL_ORDER[levelIndex + 1];

                  return (
                    <React.Fragment key={levelId}>
                    <ScrollReveal id={`level-${levelId}`} style={{ marginBottom: "0" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.875rem" }}>
                        <span className={`bx-badge ${levelInfo.badge}`} style={{ flexShrink: 0 }}>{levelInfo.label}</span>
                        <div style={{ flex: 1, height: "2px", background: "currentColor", opacity: 0.1 }} />
                      </div>

                      {levelCheckpoints.length === 0 ? (() => {
                        const firstLevelWithContent = LEVEL_ORDER.find(l => activeBranch.checkpoints.some(cp => cp.level === l));
                        const isBeforeContent = firstLevelWithContent && LEVEL_ORDER.indexOf(levelId) < LEVEL_ORDER.indexOf(firstLevelWithContent);
                        if (isBeforeContent) {
                          const firstLevelLabel = HANDBOOK_LEVELS[firstLevelWithContent].label;
                          return (
                            <div style={{ border: "3px solid currentColor", padding: "1rem 1.25rem", display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                              <span style={{ fontSize: "1rem", lineHeight: 1 }}>↗</span>
                              <div>
                                <p className="bx-text-xs bx-fw-black bx-uppercase" style={{ letterSpacing: "0.1em", marginBottom: "0.2rem" }}>
                                  Starts at {firstLevelLabel}
                                </p>
                                <p className="bx-text-xs" style={{ opacity: 0.55, margin: 0, lineHeight: 1.4 }}>
                                  This scenario has no beginner phase — it requires solid blue-run skills from the Foundation path before entry.
                                </p>
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div style={{ border: "3px dashed currentColor", padding: "1.25rem", opacity: 0.3 }}>
                            <p className="bx-text-xs bx-uppercase" style={{ letterSpacing: "0.1em" }}>
                              {levelInfo.label} content coming soon
                            </p>
                          </div>
                        );
                      })() : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                          {levelCheckpoints.map(cp => {
                            const cpIsSkippable = !!(context && cp.skipFor?.includes(context));
                            const cpMinRank = Math.max(
                              cpIsSkippable ? (CONTEXT_MIN_RANK[context!] ?? 0) : 0,
                              LEVEL_MIN_RANK[cp.level ?? ""] ?? 0,
                            );
                            const cpExercises = exercises.filter(e =>
                              cp.exerciseIds.includes(e.id) &&
                              (DIFFICULTY_RANK[e.difficulty] ?? 0) >= cpMinRank
                            );
                            return (
                              <div key={cp.id} id={`checkpoint-${cp.id}`} style={{ border: "3px solid currentColor", padding: "1.5rem" }}>
                                <CheckpointContent
                                  checkpoint={cp}
                                  checkpointExercises={cpExercises}
                                  checkedSkills={checkedSkills}
                                  onToggleSkill={toggleSkill}
                                  contextNote={context ? cp.contextNotes?.[context] : undefined}
                                  exercisesOpen={openExercises.includes(cp.id)}
                                  onToggleExercises={() => toggleExercises(cp.id)}
                                  isSkippable={cpIsSkippable}
                                  onAutoComplete={() => autoComplete(cp)}
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </ScrollReveal>

                    {nextLevelId && levelCheckpoints.length > 0 && (
                      <LevelTransition
                        toLabel={HANDBOOK_LEVELS[nextLevelId].label}
                        toId={`level-${nextLevelId}`}
                        levelCheckpoints={levelCheckpoints}
                        openExercises={openExercises}
                        onToggleExercises={toggleExercises}
                        nextLevelHasContent={activeBranch.checkpoints.some(cp => cp.level === nextLevelId)}
                      />
                    )}
                    </React.Fragment>
                  );
                })}

              </div>
            </div>
          </div>

        ) : (

          /* ── LANDING VIEW ── */
          <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "2rem 1.5rem 4rem" }}>

            {/* SECTION 01: FOUNDATION */}
            <div id="section-01">
              <SectionHeader number="01" title="Common Foundation" subtitle="Entry level — core skills every skier needs before specialising" />

              <div style={{ display: "flex", overflowX: "auto", border: "3px solid currentColor" }}>
                {roadmap.commonPath.map((cp, i) => {
                  const isActive = mounted && foundationTab === cp.id;
                  const { done, total } = progressFor(cp, checkedSkills);
                  const isComplete = done === total && total > 0;
                  return (
                    <button
                      key={cp.id}
                      onClick={() => save({ foundationTab: cp.id })}
                      style={{
                        flex: "1 1 140px",
                        padding: "0.875rem 1rem",
                        border: "none",
                        borderRight: i < roadmap.commonPath.length - 1 ? "3px solid currentColor" : "none",
                        background: isActive ? "var(--bx-primary)" : "transparent",
                        color: isActive ? "var(--bx-primary-ink)" : "currentColor",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        textAlign: "left",
                        transition: "background 0.1s",
                      }}
                    >
                      <div style={{ fontSize: "0.55rem", opacity: isActive ? 0.7 : 0.35, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "0.25rem" }}>
                        Step {i + 1}
                      </div>
                      <div style={{ fontWeight: 900, fontSize: "0.8rem", lineHeight: 1.2, marginBottom: "0.2rem" }}>
                        {cp.name}
                      </div>
                      <div style={{ fontSize: "0.58rem", opacity: isActive ? 0.7 : 0.35 }}>
                        {isComplete ? `✓ ${done}/${total}` : `${done}/${total} skills`}
                      </div>
                    </button>
                  );
                })}
              </div>

              {mounted && (
                <div style={{ border: "3px solid currentColor", borderTop: "none", padding: "1.5rem", marginBottom: "3rem" }}>
                  <CheckpointContent
                    checkpoint={selectedFoundation}
                    checkpointExercises={foundationExercises}
                    checkedSkills={checkedSkills}
                    onToggleSkill={toggleSkill}
                    contextNote={context ? selectedFoundation.contextNotes?.[context] : undefined}
                    exercisesOpen={openExercises.includes(selectedFoundation.id)}
                    onToggleExercises={() => toggleExercises(selectedFoundation.id)}
                    isSkippable={isFoundationSkippable}
                    onAutoComplete={() => autoComplete(selectedFoundation)}
                  />
                </div>
              )}
            </div>

            {/* SECTION 02: CHOOSE SCENARIO */}
            <div id="section-02">
              <SectionHeader number="02" title="Choose Your Scenario" subtitle="Pick a direction — you can always come back and explore others" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", border: "3px solid currentColor", marginBottom: "3rem" }}>
              {roadmap.branches.map((branch, i) => {
                const isSelected = mounted && scenario === branch.id;
                const branchCheckpoints = branch.checkpoints;
                const branchTotal = branchCheckpoints.reduce((s, cp) => s + cp.skills.length, 0);
                const branchDone = checkedSkills.filter(k =>
                  branchCheckpoints.some(cp => cp.skills.some(s => `${cp.id}:${s.id}` === k))
                ).length;
                return (
                  <button
                    key={branch.id}
                    onClick={() => handleScenarioSelect(branch.id)}
                    style={{
                      padding: "1.25rem",
                      border: "none",
                      borderRight: i < roadmap.branches.length - 1 ? "3px solid currentColor" : "none",
                      background: isSelected ? "var(--bx-primary)" : "transparent",
                      color: isSelected ? "var(--bx-primary-ink)" : "currentColor",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      textAlign: "left",
                      transition: "background 0.1s",
                      opacity: mounted ? 1 : 0.7,
                    }}
                  >
                    <div style={{ fontWeight: 900, fontSize: "0.875rem", lineHeight: 1.2, marginBottom: "0.4rem" }}>
                      {branch.name}
                    </div>
                    <p style={{ fontSize: "0.65rem", opacity: isSelected ? 0.75 : 0.5, margin: "0 0 0.5rem", lineHeight: 1.45 }}>
                      {branch.description}
                    </p>
                    {mounted && branch.prerequisiteIds && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem", marginBottom: "0.4rem" }}>
                        {prereqStatus(branch.prerequisiteIds).map(p => (
                          <div key={p.id} style={{ fontSize: "0.58rem", opacity: isSelected ? 0.8 : 0.5, display: "flex", alignItems: "center", gap: "0.3rem" }}>
                            <span style={{ opacity: p.complete ? 1 : 0.4 }}>{p.complete ? "✓" : "○"}</span>
                            <span style={{ textDecoration: p.complete ? "line-through" : "none", opacity: p.complete ? 0.6 : 1 }}>{p.name}</span>
                            {p.total > 0 && <span style={{ opacity: 0.35 }}>{p.doneCount}/{p.total}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                    {mounted && (
                      <div style={{ fontSize: "0.58rem", opacity: isSelected ? 0.65 : 0.35 }}>
                        {branchDone}/{branchTotal} skills
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {mounted && (
              <div style={{ borderTop: "3px solid currentColor", paddingTop: "2rem", textAlign: "center", opacity: 0.35 }}>
                <p className="bx-text-sm">Select a scenario above to see your progression path ↑</p>
              </div>
            )}

            {/* Cross-module link to destinations */}
            <div style={{ marginTop: "3rem", borderTop: "3px solid currentColor", paddingTop: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
              <p className="bx-text-sm" style={{ opacity: 0.55, margin: 0 }}>
                Ready to test your skills on the mountain?
              </p>
              <a
                href="/places"
                style={{
                  border: "2px solid currentColor",
                  padding: "0.45rem 1rem",
                  fontSize: "0.7rem",
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  textDecoration: "none",
                  color: "inherit",
                  flexShrink: 0,
                }}
              >
                Browse destinations →
              </a>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────

function SectionHeader({ number, title, subtitle }: { number: string; title: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <div style={{ fontSize: "0.58rem", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.3, marginBottom: "0.2rem" }}>
        {number}
      </div>
      <h2 style={{ fontSize: "1.3rem", fontWeight: 900, margin: "0 0 0.25rem", lineHeight: 1.1 }}>{title}</h2>
      <p className="bx-text-xs" style={{ opacity: 0.45, margin: 0 }}>{subtitle}</p>
    </div>
  );
}

// ── Checkpoint content ────────────────────────────────────────────────────

type CheckpointContentProps = {
  checkpoint: Checkpoint;
  checkpointExercises: Exercise[];
  checkedSkills: string[];
  onToggleSkill: (key: string) => void;
  contextNote?: string;
  isSkippable?: boolean;
  onAutoComplete?: () => void;
  exercisesOpen: boolean;
  onToggleExercises: () => void;
};

function CheckpointContent({ checkpoint, checkpointExercises, checkedSkills, onToggleSkill, contextNote, isSkippable, onAutoComplete, exercisesOpen, onToggleExercises }: CheckpointContentProps) {
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const expandedEx = expandedExercise ? (checkpointExercises.find(e => e.id === expandedExercise) ?? null) : null;
  const done = checkpoint.skills.filter(s => checkedSkills.includes(`${checkpoint.id}:${s.id}`)).length;
  const total = checkpoint.skills.length;
  const allDone = done === total && total > 0;

  return (
    <div>
      {/* Skip banner for returning / context-skippable checkpoints */}
      {isSkippable && onAutoComplete && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", padding: "0.5rem 0.75rem", marginBottom: "1rem", background: "rgba(0,0,0,0.04)", border: "2px solid currentColor", opacity: 0.7 }}>
          <p className="bx-text-xs" style={{ margin: 0, opacity: 0.75 }}>
            You likely know this already — mark complete or review below.
          </p>
          <button
            onClick={onAutoComplete}
            style={{ background: "transparent", border: "2px solid currentColor", padding: "0.2rem 0.6rem", cursor: "pointer", fontFamily: "inherit", fontSize: "0.6rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", color: "currentColor", whiteSpace: "nowrap", flexShrink: 0 }}
          >
            {allDone ? "Unmark" : "Mark complete"}
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.45rem", flexWrap: "wrap", alignItems: "center" }}>
          {allDone && <span className="bx-badge bx-badge-success">Complete</span>}
        </div>
        <h3 style={{ fontSize: "1.05rem", fontWeight: 900, margin: "0 0 0.2rem", lineHeight: 1.2 }}>{checkpoint.name}</h3>
        <p className="bx-text-xs" style={{ opacity: 0.5, margin: 0, lineHeight: 1.4 }}>{checkpoint.tagline}</p>
      </div>

      {/* Context note */}
      {contextNote && (
        <div style={{ borderLeft: "3px solid currentColor", paddingLeft: "0.75rem", marginBottom: "1rem" }}>
          <p className="bx-text-xs bx-fw-black bx-uppercase" style={{ letterSpacing: "0.1em", opacity: 0.45, marginBottom: "0.2rem" }}>For you</p>
          <p className="bx-text-sm" style={{ opacity: 0.8, margin: 0 }}>{contextNote}</p>
        </div>
      )}

      {/* Skills */}
      {total > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.5rem" }}>
            <p className="bx-text-xs bx-fw-black bx-uppercase" style={{ letterSpacing: "0.1em", margin: 0 }}>Skills</p>
            <p className="bx-text-xs" style={{ opacity: 0.4, margin: 0 }}>{done}/{total}</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
            {checkpoint.skills.map(skill => {
              const key = `${checkpoint.id}:${skill.id}`;
              const checked = checkedSkills.includes(key);
              return (
                <label key={skill.id} style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start", cursor: "pointer", padding: "0.45rem 0.6rem", border: "2px solid", borderColor: checked ? "currentColor" : "transparent", background: checked ? "rgba(0,0,0,0.04)" : "transparent" }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleSkill(key)}
                    style={{ marginTop: "2px", flexShrink: 0, accentColor: "currentColor", width: "0.9rem", height: "0.9rem", cursor: "pointer" }}
                  />
                  <span className="bx-text-sm" style={{ textDecoration: checked ? "line-through" : "none", opacity: checked ? 0.45 : 1 }}>{skill.text}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Exercises toggle */}
      {checkpointExercises.length > 0 && (
        <div>
          <button
            onClick={onToggleExercises}
            style={{
              background: "transparent",
              border: "2px solid currentColor",
              padding: "0.3rem 0.7rem",
              fontFamily: "inherit",
              fontSize: "0.68rem",
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              cursor: "pointer",
              color: "currentColor",
            }}
          >
            {exercisesOpen ? "▲" : "▼"} {checkpointExercises.length} Exercise{checkpointExercises.length !== 1 ? "s" : ""}
          </button>
          {exercisesOpen && (
            expandedEx ? (
              <ExerciseDetail exercise={expandedEx} onBack={() => setExpandedExercise(null)} />
            ) : (
              <div style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "0.75rem" }}>
                {checkpointExercises.map(ex => (
                  <ExerciseCard key={ex.id} exercise={ex} onExpand={() => setExpandedExercise(ex.id)} />
                ))}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

// ── Exercise card ─────────────────────────────────────────────────────────

function ExerciseCard({ exercise: ex, onExpand }: { exercise: Exercise; onExpand: () => void }) {
  return (
    <article className="bx-card">
      <div className="bx-card-header" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <span className="bx-badge bx-badge-primary">{ex.type}</span>
        <span className={`bx-badge ${{ beginner: "bx-badge-success", intermediate: "bx-badge-info", advanced: "bx-badge-warning", expert: "bx-badge-danger" }[ex.difficulty] ?? ""}`}>{ex.difficulty}</span>
      </div>
      <div className="bx-card-body">
        <h3 className="bx-card-title">{ex.name}</h3>
        <p className="bx-card-text">{ex.description}</p>
        <p className="bx-text-xs bx-uppercase" style={{ opacity: 0.5, marginTop: "0.5rem" }}>Duration: {ex.duration}</p>
      </div>
      <div className="bx-card-footer">
        <button
          onClick={onExpand}
          className="bx-btn bx-btn-ghost bx-btn-sm"
          style={{ cursor: "pointer" }}
        >
          Steps &amp; Tips →
        </button>
      </div>
    </article>
  );
}

// ── Exercise detail (expanded view) ──────────────────────────────────────

function ExerciseDetail({ exercise: ex, onBack }: { exercise: Exercise; onBack: () => void }) {
  return (
    <div style={{ marginTop: "1rem", border: "3px solid currentColor" }}>
      {/* Detail header */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.75rem 1.25rem", borderBottom: "3px solid currentColor" }}>
        <button
          onClick={onBack}
          style={{
            background: "transparent",
            border: "2px solid currentColor",
            padding: "0.25rem 0.65rem",
            fontFamily: "inherit",
            fontSize: "0.68rem",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            cursor: "pointer",
            color: "currentColor",
            flexShrink: 0,
          }}
        >
          ← Back
        </button>
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          <span className="bx-badge bx-badge-primary">{ex.type}</span>
          <span className="bx-badge">{ex.difficulty}</span>
        </div>
        <span style={{ fontWeight: 900, fontSize: "0.9rem", lineHeight: 1.2 }}>{ex.name}</span>
      </div>

      {/* Detail body */}
      <div style={{ padding: "1.25rem", display: "grid", gridTemplateColumns: ex.images?.length ? "1fr 1fr" : "1fr", gap: "1.5rem" }}>

        {/* Left: images */}
        {ex.images && ex.images.length > 0 && (
          <div>
            {ex.images.map((src, i) => (
              <img key={i} src={src} alt={`${ex.name} illustration`} style={{ width: "100%", display: "block", border: "3px solid currentColor", marginBottom: "0.5rem" }} />
            ))}
          </div>
        )}

        {/* Right: steps + tips */}
        <div>
          <p style={{ opacity: 0.65, fontSize: "0.8rem", marginBottom: "1rem", lineHeight: 1.5 }}>{ex.description}</p>

          <p className="bx-fw-black bx-uppercase bx-text-xs bx-mb-2">Steps</p>
          <ol style={{ paddingLeft: "1.25rem", marginBottom: "1.25rem" }}>
            {ex.steps.map((step, i) => <li key={i} className="bx-text-sm bx-mb-1">{step}</li>)}
          </ol>

          <p className="bx-fw-black bx-uppercase bx-text-xs bx-mb-2">Tips</p>
          <ul style={{ paddingLeft: "1.25rem", marginBottom: "1.25rem" }}>
            {ex.tips.map((tip, i) => <li key={i} className="bx-text-sm bx-mb-1">{tip}</li>)}
          </ul>

          {ex.videoUrl && (
            <div style={{ marginBottom: "1.25rem" }}>
              <p className="bx-fw-black bx-uppercase bx-text-xs bx-mb-2">Video</p>
              <a
                href={ex.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  border: "2px solid currentColor",
                  padding: "0.3rem 0.75rem",
                  fontFamily: "inherit",
                  fontSize: "0.68rem",
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  textDecoration: "none",
                  color: "currentColor",
                }}
              >
                ▶ Watch on YouTube
              </a>
            </div>
          )}

          <p className="bx-fw-black bx-uppercase bx-text-xs bx-mb-1">Target muscles</p>
          <p className="bx-text-xs" style={{ opacity: 0.6, marginBottom: "0.75rem" }}>{ex.targetMuscles.join(" · ")}</p>

          <p className="bx-text-xs bx-uppercase" style={{ opacity: 0.4 }}>Duration: {ex.duration}</p>
        </div>
      </div>
    </div>
  );
}

// ── Prerequisites flow ────────────────────────────────────────────────────

type PrereqItem = {
  id: string;
  name: string;
  doneCount: number;
  total: number;
  complete: boolean;
  skills: SkillItem[];
  checkpointId: string;
  isFoundation: boolean;
  branchId: string | null;
  branchName: string | null;
};

type PrereqsFlowProps = {
  prereqs: PrereqItem[];
  checkedSkills: string[];
  onNavigateFoundation: (id: string) => void;
  onNavigateBranch: (branchId: string, checkpointId: string) => void;
};

function PrereqsFlow({ prereqs, checkedSkills, onNavigateFoundation, onNavigateBranch }: PrereqsFlowProps) {
  const allMet = prereqs.every(p => p.complete);
  return (
    <div style={{ marginBottom: "0" }}>
      <div style={{ fontSize: "0.58rem", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.3, marginBottom: "0.6rem" }}>
        Requires
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", border: "3px solid currentColor", opacity: allMet ? 0.55 : 1 }}>
        {prereqs.map((p, i) => (
          <PrereqCard
            key={p.id}
            prereq={p}
            checkedSkills={checkedSkills}
            isLast={i === prereqs.length - 1}
            onNavigateFoundation={onNavigateFoundation}
            onNavigateBranch={onNavigateBranch}
          />
        ))}
      </div>
      <div style={{ height: "1.75rem" }} />
    </div>
  );
}

function PrereqCard({ prereq: p, checkedSkills, isLast, onNavigateFoundation, onNavigateBranch }: {
  prereq: PrereqItem;
  checkedSkills: string[];
  isLast: boolean;
  onNavigateFoundation: (id: string) => void;
  onNavigateBranch: (branchId: string, checkpointId: string) => void;
}) {
  const pct = p.total > 0 ? (p.doneCount / p.total) * 100 : 0;

  return (
    <div style={{ flex: "1 1 180px", borderRight: isLast ? "none" : "3px solid currentColor", display: "flex", flexDirection: "column" }}>
      {/* Card header */}
      <div style={{ padding: "0.875rem 1rem 0.625rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
          <span style={{ fontWeight: 900, fontSize: "0.78rem", lineHeight: 1.2 }}>{p.name}</span>
          <span style={{ fontSize: "0.8rem", opacity: p.complete ? 1 : 0.25, flexShrink: 0, marginLeft: "0.5rem" }}>
            {p.complete ? "✓" : "○"}
          </span>
        </div>
        {/* Progress bar */}
        <div style={{ height: "3px", background: "currentColor", opacity: 0.12, marginBottom: "0.3rem", position: "relative" }}>
          <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: `${pct}%`, background: "currentColor", opacity: 0.7, transition: "width 0.3s" }} />
        </div>
        <div style={{ fontSize: "0.58rem", opacity: 0.4 }}>{p.doneCount}/{p.total} skills</div>
      </div>

      {/* Action */}
      <div style={{ borderTop: "2px solid currentColor", opacity: 0.12 }} />
      <div style={{ padding: "0.4rem 1rem" }}>
        {p.isFoundation ? (
          <button
            onClick={() => onNavigateFoundation(p.checkpointId)}
            style={{ background: "transparent", border: "none", padding: 0, fontFamily: "inherit", fontSize: "0.62rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", cursor: "pointer", color: "currentColor", opacity: 0.55 }}
          >
            View in foundation ↑
          </button>
        ) : (
          <button
            onClick={() => p.branchId && onNavigateBranch(p.branchId, p.checkpointId)}
            style={{ background: "transparent", border: "none", padding: 0, fontFamily: "inherit", fontSize: "0.62rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", cursor: "pointer", color: "currentColor", opacity: 0.55 }}
          >
            View in {p.name} ↓
          </button>
        )}
      </div>
    </div>
  );
}

// ── Scroll-triggered reveal ───────────────────────────────────────────────

function ScrollReveal({ children, style, id }: { children: React.ReactNode; style?: React.CSSProperties; id?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.05 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      id={id}
      ref={ref}
      style={{ ...style, ...(visible ? { animation: "bxFadeUp 0.3s ease both" } : { opacity: 0 }) }}
    >
      {children}
    </div>
  );
}

// ── Level transition ──────────────────────────────────────────────────────

function LevelTransition({ toLabel, toId, levelCheckpoints, openExercises, onToggleExercises, nextLevelHasContent }: {
  toLabel: string;
  toId: string;
  levelCheckpoints: Checkpoint[];
  openExercises: string[];
  onToggleExercises: (id: string) => void;
  nextLevelHasContent: boolean;
}) {
  const withExercises = levelCheckpoints.filter(cp =>
    exercises.some(e => cp.exerciseIds.includes(e.id))
  );

  const allOpen = withExercises.length > 0 && withExercises.every(cp => openExercises.includes(cp.id));

  function handle() {
    if (withExercises.length > 0 && !allOpen) {
      withExercises.forEach(cp => {
        if (!openExercises.includes(cp.id)) onToggleExercises(cp.id);
      });
    } else if (nextLevelHasContent) {
      document.getElementById(toId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  const label = allOpen && nextLevelHasContent
    ? `Continue to ${toLabel}`
    : withExercises.length > 0
      ? "Practice exercises"
      : nextLevelHasContent ? `Continue to ${toLabel}` : "";

  if (!label) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "0.5rem 0 2rem" }}>
      <div style={{ flex: 1, height: "2px", background: "currentColor", opacity: 0.08 }} />
      <button
        onClick={handle}
        style={{
          background: "transparent",
          border: "2px solid currentColor",
          padding: "0.3rem 0.85rem",
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: "0.62rem",
          fontWeight: 900,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "currentColor",
          opacity: 0.5,
          whiteSpace: "nowrap",
        }}
      >
        {label} ↓
      </button>
      <div style={{ flex: 1, height: "2px", background: "currentColor", opacity: 0.08 }} />
    </div>
  );
}
