"use client";

import { useLocale } from "@/components/i18n-provider";

type ModuleKey = "training" | "equipment";

export default function ModuleHeader({ moduleKey }: { moduleKey: ModuleKey }) {
  const { t } = useLocale();
  const m = t.module[moduleKey];
  return (
    <div style={{ padding: "1.5rem 1.5rem 1rem", borderBottom: "3px solid currentColor" }}>
      <p className="bx-text-xs bx-uppercase bx-tracking-wide" style={{ opacity: 0.5 }}>{m.label}</p>
      <h1 className="bx-display-2 bx-mb-0">{m.title}</h1>
      <p className="bx-text-sm" style={{ opacity: 0.5 }}>{m.description}</p>
    </div>
  );
}
