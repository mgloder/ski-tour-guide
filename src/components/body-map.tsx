"use client";

export type BodyZoneId = "head" | "torso" | "hands" | "legs" | "feet";

interface Props {
  activeZone: BodyZoneId | null;
  onZoneClick: (zone: BodyZoneId) => void;
}

export default function BodyMap({ activeZone, onZoneClick }: Props) {
  const active = (id: BodyZoneId) => id === activeZone;

  const shapeProps = (id: BodyZoneId) => ({
    fill: active(id) ? "currentColor" : "transparent",
    stroke: "currentColor",
    strokeWidth: 2.5,
  });

  const zone = (id: BodyZoneId) => ({
    onClick: () => onZoneClick(id),
    style: { cursor: "pointer" as const, outline: "none" },
    role: "button" as const,
    "aria-label": id,
    "aria-pressed": active(id),
  });

  // decorative (non-interactive) elements
  const deco = {
    fill: "currentColor",
    stroke: "none",
    opacity: 0.25,
    style: { pointerEvents: "none" as const },
  };

  return (
    <svg
      viewBox="0 0 200 268"
      style={{ width: "100%", maxWidth: "180px", display: "block" }}
      aria-label="Human body diagram — click a zone to filter equipment"
    >
      {/* HEAD */}
      <g {...zone("head")}>
        <circle cx={100} cy={24} r={20} {...shapeProps("head")} />
      </g>

      {/* Neck connector */}
      <rect x={94} y={44} width={12} height={11} {...deco} />

      {/* TORSO */}
      <g {...zone("torso")}>
        <rect x={58} y={55} width={84} height={94} rx={3} {...shapeProps("torso")} />
      </g>

      {/* Arm connectors */}
      <line x1={58} y1={68} x2={28} y2={85} stroke="currentColor" strokeWidth={2.5} opacity={0.25} style={{ pointerEvents: "none" }} />
      <line x1={142} y1={68} x2={172} y2={85} stroke="currentColor" strokeWidth={2.5} opacity={0.25} style={{ pointerEvents: "none" }} />

      {/* HANDS — both in same group */}
      <g {...zone("hands")}>
        <rect x={10} y={77} width={20} height={24} rx={3} {...shapeProps("hands")} />
        <rect x={170} y={77} width={20} height={24} rx={3} {...shapeProps("hands")} />
      </g>

      {/* Hip connector */}
      <rect x={66} y={149} width={68} height={8} {...deco} />

      {/* LEGS */}
      <g {...zone("legs")}>
        <rect x={64} y={157} width={30} height={82} rx={3} {...shapeProps("legs")} />
        <rect x={106} y={157} width={30} height={82} rx={3} {...shapeProps("legs")} />
      </g>

      {/* FEET — boots + skis */}
      <g {...zone("feet")}>
        <rect x={54} y={239} width={44} height={18} rx={3} {...shapeProps("feet")} />
        <rect x={102} y={239} width={44} height={18} rx={3} {...shapeProps("feet")} />
        <rect x={20} y={256} width={80} height={5} rx={2} {...shapeProps("feet")} strokeWidth={1.5} />
        <rect x={100} y={256} width={80} height={5} rx={2} {...shapeProps("feet")} strokeWidth={1.5} />
      </g>
    </svg>
  );
}
