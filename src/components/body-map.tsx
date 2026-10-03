"use client";

export type BodyZoneId = "head" | "torso" | "hands" | "legs" | "feet";

interface Props {
  activeZone: BodyZoneId | null;
  onZoneClick: (zone: BodyZoneId) => void;
}

// ── Shape paths ───────────────────────────────────────────────

const HEAD =
  "M 145,14 Q 176,14 176,46 Q 177,70 161,79 " +
  "Q 154,84 145,85 Q 136,84 129,79 " +
  "Q 113,70 114,46 Q 114,14 145,14 Z";

// Helmet: full dome + ear pads covering the head
const HELMET =
  "M 113,56 Q 111,10 145,9 Q 179,10 177,56 " +
  "Q 177,65 167,70 Q 156,74 145,74 " +
  "Q 134,74 123,70 Q 113,65 113,56 Z";

// Goggle frame: one-piece goggle unit sitting on the visor
const GOGGLE_FRAME =
  "M 118,50 Q 117,38 132,36 Q 145,34 158,36 " +
  "Q 173,38 173,50 Q 173,65 158,67 " +
  "Q 145,68 132,67 Q 118,65 118,50 Z";

const TORSO =
  "M 137,92 L 153,92 " +
  "Q 167,94 178,104 Q 191,116 188,140 " +
  "Q 190,162 181,176 Q 172,188 164,196 " +
  "Q 161,204 164,212 " +
  "L 126,212 " +
  "Q 129,204 126,196 Q 118,188 109,176 " +
  "Q 100,162 102,140 Q 99,116 112,104 " +
  "Q 123,94 137,92 Z";

// Arms — clipped to stay behind torso via <clipPath>
const LEFT_ARM =
  "M 112,104 Q 96,114 82,138 L 68,190 " +
  "Q 66,202 72,217 L 92,217 " +
  "Q 90,202 92,190 L 106,140 " +
  "Q 114,118 126,110 Z";

const RIGHT_ARM =
  "M 178,104 Q 194,114 208,138 L 222,190 " +
  "Q 224,202 218,217 L 198,217 " +
  "Q 200,202 198,190 L 184,140 " +
  "Q 176,118 164,110 Z";

// Hands — rounded ski-glove silhouette with thumb bump on outer side
// Left glove: thumb sticks left, palm rounds down-right
const LEFT_HAND =
  "M 74,218 " +
  "Q 66,218 63,224 Q 60,230 62,236 Q 65,242 72,242 " + // thumb
  "Q 70,246 74,250 Q 83,254 92,250 " +                 // palm bottom
  "Q 100,246 100,236 Q 100,224 94,218 Z";              // palm right + wrist

// Right glove: mirror (thumb sticks right)
const RIGHT_HAND =
  "M 216,218 " +
  "Q 224,218 227,224 Q 230,230 228,236 Q 225,242 218,242 " + // thumb
  "Q 220,246 216,250 Q 207,254 198,250 " +                   // palm bottom
  "Q 190,246 190,236 Q 190,224 196,218 Z";                   // palm left + wrist

// Legs — A-stance: top connects to torso hips, bottom splays outward
const LEFT_LEG =
  "M 126,212 L 144,212 " +
  "Q 143,240 138,268 Q 134,292 128,328 L 110,328 " +
  "Q 110,292 112,268 Q 116,240 126,212 Z";

const RIGHT_LEG =
  "M 146,212 L 164,212 " +
  "Q 174,240 178,268 Q 180,292 180,328 L 162,328 " +
  "Q 156,292 152,268 Q 147,240 146,212 Z";

// Boot cuffs — positioned under splayed legs
const LEFT_CUFF =
  "M 108,303 Q 107,296 112,294 L 128,294 " +
  "Q 133,296 131,303 L 128,328 L 110,328 Z";

const RIGHT_CUFF =
  "M 182,303 Q 183,296 178,294 L 162,294 " +
  "Q 157,296 159,303 L 162,328 L 180,328 Z";

// Boots — centered under each leg, clear gap between them
const LEFT_BOOT =
  "M 108,328 L 128,328 Q 138,330 138,342 " +
  "Q 138,356 118,358 Q 96,358 94,344 " +
  "Q 93,330 102,328 Z";

const RIGHT_BOOT =
  "M 162,328 L 182,328 Q 192,330 196,342 " +
  "Q 196,356 176,358 Q 152,358 152,344 " +
  "Q 152,330 162,328 Z";

export default function BodyMap({ activeZone, onZoneClick }: Props) {
  const active = (id: BodyZoneId) => id === activeZone;

  const col = (id: BodyZoneId) => active(id) ? "var(--bx-primary)" : "currentColor";

  const shape = (id: BodyZoneId) => ({
    fill: col(id),
    fillOpacity: active(id) ? 0.25 : 0.07,
    stroke: col(id),
    strokeWidth: active(id) ? 2.5 : 1.8,
    strokeLinejoin: "round" as const,
    strokeLinecap: "round" as const,
  });

  const click = (id: BodyZoneId) => ({
    onClick: () => onZoneClick(id),
    style: { cursor: "pointer" as const },
  });

  return (
    <svg
      viewBox="55 8 180 364"
      style={{ width: "100%", maxWidth: "200px", display: "block" }}
      aria-label="Human body diagram — click a zone to filter equipment"
    >
      <defs>
        {/*
          Mask for arms: white = reveal, black = hide.
          The torso sub-path is painted black, so arm pixels that fall
          inside the torso outline are fully hidden regardless of fill.
        */}
        <mask id="arm-mask">
          <rect x={0} y={0} width={240} height={400} fill="white" />
          <path d={TORSO} fill="black" />
        </mask>
      </defs>

      {/* ── SKIS ── */}
      <g {...click("feet")}>
        <rect x={82}  y={356} width={62} height={6} rx={3} {...shape("feet")} strokeWidth={1.2} />
        <rect x={148} y={356} width={62} height={6} rx={3} {...shape("feet")} strokeWidth={1.2} />
      </g>

      {/* ── LEGS ── */}
      <g {...click("legs")}>
        <path d={LEFT_LEG}  {...shape("legs")} />
        <path d={RIGHT_LEG} {...shape("legs")} />
      </g>

      {/* ── BOOT CUFFS ── */}
      <g {...click("feet")}>
        <path d={LEFT_CUFF}
          fill={col("feet")} fillOpacity={active("feet") ? 0.22 : 0.08}
          stroke={col("feet")} strokeWidth={active("feet") ? 2.2 : 1.6}
          strokeLinejoin="round"
        />
        <path d={RIGHT_CUFF}
          fill={col("feet")} fillOpacity={active("feet") ? 0.22 : 0.08}
          stroke={col("feet")} strokeWidth={active("feet") ? 2.2 : 1.6}
          strokeLinejoin="round"
        />
      </g>

      {/* ── BOOT BODIES ── */}
      <g {...click("feet")}>
        <path d={LEFT_BOOT}  {...shape("feet")} />
        <path d={RIGHT_BOOT} {...shape("feet")} />
      </g>

      {/* ── ARMS — masked so they vanish inside the torso outline ── */}
      <g {...click("torso")} mask="url(#arm-mask)">
        <path d={LEFT_ARM}
          fill={col("torso")} fillOpacity={active("torso") ? 0.22 : 0.07}
          stroke={col("torso")} strokeWidth={active("torso") ? 2.2 : 1.8}
          strokeLinejoin="round" strokeLinecap="round"
        />
        <path d={RIGHT_ARM}
          fill={col("torso")} fillOpacity={active("torso") ? 0.22 : 0.07}
          stroke={col("torso")} strokeWidth={active("torso") ? 2.2 : 1.8}
          strokeLinejoin="round" strokeLinecap="round"
        />
      </g>

      {/* ── TORSO ── */}
      <g {...click("torso")}>
        <path d={TORSO} {...shape("torso")} />
      </g>

      {/* ── HANDS ── */}
      <g {...click("hands")}>
        <path d={LEFT_HAND}  {...shape("hands")} />
        <path d={RIGHT_HAND} {...shape("hands")} />
      </g>

      {/* ── NECK ── */}
      <rect x={137} y={85} width={16} height={8}
        fill="currentColor" opacity={0.1}
        style={{ pointerEvents: "none" }}
      />

      {/* ── HEAD (base face shape) ── */}
      <g {...click("head")}>
        <path d={HEAD} {...shape("head")} />
      </g>

      {/* ── HELMET (dome + ear pads) ── */}
      <g {...click("head")}>
        <path d={HELMET}
          fill={col("head")}
          fillOpacity={active("head") ? 0.25 : 0.13}
          stroke={col("head")}
          strokeWidth={active("head") ? 2.4 : 2.0}
          strokeLinejoin="round"
        />
      </g>

      {/* ── GOGGLE FRAME ── */}
      <g {...click("head")}>
        <path d={GOGGLE_FRAME}
          fill={col("head")}
          fillOpacity={active("head") ? 0.18 : 0.08}
          stroke={col("head")}
          strokeWidth={active("head") ? 2.2 : 1.8}
          strokeLinejoin="round"
        />
      </g>

      {/* ── DETAILS (face, helmet, costume — always on top) ── */}
      <g style={{ pointerEvents: "none" }} stroke="currentColor" fill="none"
        strokeLinecap="round" strokeLinejoin="round">

        {/* ── Helmet ── */}
        <path d="M 114,56 Q 145,61 176,56" strokeWidth={1.5} opacity={0.5} />

        {/* ── Goggles ── */}
        <path d="M 119,50 Q 118,40 133,38 Q 145,36 157,38 Q 172,40 172,50 Q 172,64 157,66 Q 145,67 133,66 Q 119,64 119,50 Z"
          fill="currentColor" fillOpacity={0.15} strokeWidth={0} />
        <line x1={145} y1={38} x2={145} y2={67} strokeWidth={2} opacity={0.45} />
        <path d="M 118,50 Q 114,53 114,56" strokeWidth={2.2} opacity={0.45} />
        <path d="M 173,50 Q 176,53 176,56" strokeWidth={2.2} opacity={0.45} />

        {/* ── Face ── */}
        <ellipse cx={130} cy={72} rx={7} ry={3.5} fill="currentColor" fillOpacity={0.11} strokeWidth={0} />
        <ellipse cx={160} cy={72} rx={7} ry={3.5} fill="currentColor" fillOpacity={0.11} strokeWidth={0} />
        <path d="M 143,70 Q 145,73 147,70" strokeWidth={1.2} opacity={0.5} />
        <path d="M 140,76 Q 145,80 150,76" strokeWidth={1.5} opacity={0.6} />

        {/* ── Jacket ── */}
        <path d="M 137,95 L 145,108 L 153,95" strokeWidth={1.3} opacity={0.35} />

        {/* ── Boots ── */}
        <line x1={109} y1={307} x2={128} y2={307} strokeWidth={1.6} opacity={0.45} />
        <line x1={109} y1={316} x2={128} y2={316} strokeWidth={1.6} opacity={0.45} />
        <line x1={162} y1={307} x2={181} y2={307} strokeWidth={1.6} opacity={0.45} />
        <line x1={162} y1={316} x2={181} y2={316} strokeWidth={1.6} opacity={0.45} />

        {/* ── Skis ── */}
        <line x1={106} y1={357} x2={124} y2={357} strokeWidth={2} opacity={0.45} />
        <line x1={164} y1={357} x2={182} y2={357} strokeWidth={2} opacity={0.45} />

      </g>
    </svg>
  );
}
