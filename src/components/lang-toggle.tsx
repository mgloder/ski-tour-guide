"use client";

import { useLocale } from "@/components/i18n-provider";

export default function LangToggle() {
  const { locale, setLocale } = useLocale();

  return (
    <div
      style={{
        display: "flex",
        border: "2px solid currentColor",
        overflow: "hidden",
        fontSize: "0.65rem",
        fontWeight: 900,
        letterSpacing: "0.05em",
        flexShrink: 0,
      }}
      role="group"
      aria-label="Language"
    >
      {(["en", "zh"] as const).map((lang, i) => (
        <button
          key={lang}
          onClick={() => setLocale(lang)}
          title={lang === "en" ? "English" : "中文"}
          style={{
            padding: "0.25rem 0.55rem",
            border: "none",
            borderLeft: i > 0 ? "2px solid currentColor" : "none",
            background: locale === lang ? "currentColor" : "transparent",
            color: locale === lang ? "var(--bx-paper, #fff)" : "inherit",
            cursor: locale === lang ? "default" : "pointer",
            fontFamily: "inherit",
            fontSize: "inherit",
            fontWeight: "inherit",
            letterSpacing: "inherit",
            lineHeight: 1,
            transition: "background 0.15s, color 0.15s",
          }}
        >
          {lang === "en" ? "EN" : "中"}
        </button>
      ))}
    </div>
  );
}
