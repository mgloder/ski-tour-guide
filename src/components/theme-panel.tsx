"use client";
import { useEffect, useRef } from "react";

const FAMILIES = ["default","acid","flare","blood","bubble","cyber","violet","concrete","xerox"] as const;

const btnBase: React.CSSProperties = {
  background: "transparent",
  border: "2px solid currentColor",
  cursor: "pointer",
  fontFamily: "inherit",
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "currentColor",
};

export default function ThemePanel() {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (detailsRef.current && !detailsRef.current.contains(e.target as Node)) {
        detailsRef.current.open = false;
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  return (
    <div style={{ position: "fixed", bottom: "1.25rem", left: "1.25rem", zIndex: 1000 }}>
      <details ref={detailsRef} style={{ background: "var(--bx-paper)", border: "3px solid currentColor" }}>
        <summary style={{
          padding: "0.4rem 0.75rem", cursor: "pointer", listStyle: "none",
          fontFamily: "inherit", fontWeight: 900, fontSize: "0.65rem",
          textTransform: "uppercase", letterSpacing: "0.12em",
          display: "flex", alignItems: "center", gap: "0.4rem",
        }}>
          ◐ Theme
        </summary>

        <div style={{ padding: "0.75rem", borderTop: "3px solid currentColor", minWidth: "170px", display: "flex", flexDirection: "column", gap: "0.5rem" }}>

          {/* Mode toggle */}
          <button
            data-bx-toggle="mode"
            style={{ ...btnBase, padding: "0.3rem 0.6rem", fontSize: "0.62rem", width: "100%" }}
          >
            ◐ Light / Dark
          </button>

          {/* Theme families */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.2rem" }}>
            {FAMILIES.map(id => (
              <button
                key={id}
                onClick={() => (window as any).skin?.setFamily(id)}
                style={{ ...btnBase, padding: "0.2rem 0.3rem", fontSize: "0.55rem" }}
              >
                {id}
              </button>
            ))}
          </div>

        </div>
      </details>
    </div>
  );
}
