"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function BackToPlace() {
  const [place, setPlace] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("ski-from-place");
      if (stored) setPlace(JSON.parse(stored));
    } catch {}
  }, []);

  if (!place) return null;

  return (
    <div style={{ padding: "0.5rem 1.5rem", borderBottom: "2px solid currentColor", fontSize: "0.7rem", fontWeight: 700, opacity: 0.5 }}>
      <Link href={`/places?q=${encodeURIComponent(place.name)}`} style={{ textDecoration: "none", color: "inherit" }}>
        ← Back to {place.name}
      </Link>
      <button
        onClick={() => {
          try { sessionStorage.removeItem("ski-from-place"); } catch {}
          setPlace(null);
        }}
        style={{ marginLeft: "0.75rem", background: "none", border: "none", cursor: "pointer", fontSize: "0.65rem", opacity: 0.4 }}
      >
        ×
      </button>
    </div>
  );
}
