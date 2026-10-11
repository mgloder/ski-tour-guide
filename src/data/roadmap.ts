export type LearningContext = "first-timer" | "some-experience" | "intermediate" | "advanced";

export const LEARNING_CONTEXTS: { value: LearningContext; label: string; hint: string }[] = [
  { value: "first-timer",      label: "First timer",      hint: "brand new to skiing" },
  { value: "some-experience",  label: "Some experience",  hint: "can stop and turn, still on greens" },
  { value: "intermediate",     label: "Intermediate",     hint: "comfortable on blue runs" },
  { value: "advanced",         label: "Advanced",         hint: "confident on reds and blacks" },
];

export type HandbookLevel = "entry" | "development" | "performance" | "high-performance";

export const HANDBOOK_LEVELS: Record<HandbookLevel, { label: string; badge: string }> = {
  "entry":            { label: "Entry",            badge: "bx-badge-success" },
  "development":      { label: "Development",      badge: "bx-badge-info" },
  "performance":      { label: "Performance",      badge: "bx-badge-warning" },
  "high-performance": { label: "High Performance", badge: "bx-badge-danger" },
};

export type SkillFocus =
  | "global-movements"
  | "lateral-mobility"
  | "fore-aft"
  | "vertical-movement"
  | "line-anticipation"
  | "force-impulse"
  | "separation"
  | "coordination";

export const SKILL_FOCUS_LABELS: Record<SkillFocus, string> = {
  "global-movements":  "Global Movements",
  "lateral-mobility":  "Lateral Mobility",
  "fore-aft":          "Fore-Aft",
  "vertical-movement": "Vertical Movement",
  "line-anticipation": "Line & Anticipation",
  "force-impulse":     "Force & Impulse",
  "separation":        "Separation & Coiling",
  "coordination":      "Coordination",
};

export type SkillItem = {
  id: string;
  text: string;
};

export type Checkpoint = {
  id: string;
  name: string;
  tagline: string;
  level?: HandbookLevel;
  focus?: SkillFocus[];
  exerciseIds: string[];
  skills: SkillItem[];
  contextNotes?: Partial<Record<LearningContext, string>>;
  skipFor?: LearningContext[];
};

export type Branch = {
  id: string;
  name: string;
  description: string;
  prerequisiteIds?: string[];
  checkpoints: Checkpoint[];
};

export type RoadmapData = {
  commonPath: Checkpoint[];
  branches: Branch[];
};

export const roadmap: RoadmapData = {
  commonPath: [
    {
      id: "first-steps",
      name: "First Steps",
      tagline: "Day one on snow — gear on, moving, stopping.",
      level: "entry",
      focus: ["global-movements", "coordination"],
      exerciseIds: ["single-leg-balance", "wall-sit"],
      skills: [
        { id: "fs-1", text: "Can put on skis and walk on flat ground" },
        { id: "fs-2", text: "Can make a controlled stop using a snowplow" },
        { id: "fs-3", text: "Can ride a chairlift or T-bar safely" },
      ],
      skipFor: ["intermediate", "advanced"],
      contextNotes: {
        "first-timer":     "Don't rush — getting the stopping right on day one prevents years of bad habits. A full session focused only on snowplow stops is time well spent.",
        "some-experience": "If you can already stop and turn on a green, tick all three and move to Basic Control.",
        "intermediate":    "You're past this — mark complete and continue.",
        "advanced":        "You're past this — mark complete and continue.",
      },
    },
    {
      id: "basic-control",
      name: "Basic Control",
      tagline: "Linking turns, managing speed, moving with intention.",
      level: "entry",
      focus: ["global-movements", "fore-aft", "coordination"],
      exerciseIds: ["single-leg-balance", "wall-sit", "childrens-spiess", "figure-8-skating", "power-plow", "synchronized-skiing"],
      skills: [
        { id: "bc-1", text: "Can link snowplow turns top to bottom on a green run" },
        { id: "bc-2", text: "Can control speed without relying on falling" },
        { id: "bc-3", text: "Can fall safely and get back up independently" },
        { id: "bc-4", text: "Comfortable riding the chairlift alone" },
        { id: "bc-5", text: "Understands that the upper body stays facing downhill while legs do the turning" },
      ],
      skipFor: ["intermediate", "advanced"],
      contextNotes: {
        "first-timer":     "Film yourself from behind if you can — beginners often develop asymmetric turns without noticing. One side usually feels easier, and that's the one to watch.",
        "some-experience": "Check each skill honestly. 'Can link turns' and 'can link turns with consistent form' are different things — the details here matter later.",
        "intermediate":    "You're past this — mark complete and continue.",
        "advanced":        "You're past this — mark complete and continue.",
      },
    },
    {
      id: "green-independence",
      name: "Green Run Independence",
      tagline: "Skiing a full green top to bottom without hesitation.",
      level: "entry",
      focus: ["lateral-mobility", "fore-aft", "separation"],
      exerciseIds: ["parallel-turn", "lateral-hops", "thousand-steps", "hands-all-over", "too-far", "spaghetti-legs", "victory-exercise", "draw-a-line"],
      skills: [
        { id: "gi-1", text: "Can ski any green run start to finish independently" },
        { id: "gi-2", text: "Snowplow turns feel automatic, not forced" },
        { id: "gi-3", text: "Beginning to bring skis closer together (narrowing the wedge)" },
        { id: "gi-4", text: "Comfortable in light crowds on beginner slopes" },
        { id: "gi-5", text: "Weight shifts to the outside ski during each turn, not spread equally across both" },
        { id: "gi-6", text: "Can plant a pole to trigger a turn, even if the timing is still rough" },
      ],
      skipFor: ["intermediate", "advanced"],
      contextNotes: {
        "first-timer":     "This is where most beginners plateau. If you've been on greens for 3–4 sessions without progressing, one session with an instructor is worth it — the wedge-to-parallel shift is hard to self-diagnose.",
        "some-experience": "The wedge-to-parallel transition clicks suddenly, not gradually. If you're in the middle of it, keep going — the moment it locks in, everything changes.",
        "intermediate":    "You're past this — mark complete and continue.",
        "advanced":        "You're past this — mark complete and continue.",
      },
    },
    {
      id: "blue-confidence",
      name: "Blue Run Confidence",
      tagline: "The foundation is solid — time to choose your direction.",
      level: "development",
      focus: ["separation", "vertical-movement", "force-impulse"],
      exerciseIds: ["parallel-turn", "carving", "step-step-arc", "goal-post", "hockey-stop", "roller-knees", "hoppsving", "one-ski-skiing"],
      skills: [
        { id: "brc-1", text: "Can consistently link parallel turns on blue runs" },
        { id: "brc-2", text: "Outside ski stays loaded and edged through the full arc of each turn" },
        { id: "brc-3", text: "Can manage speed without skidding excessively" },
        { id: "brc-4", text: "Upper body faces downhill while legs turn independently beneath it" },
        { id: "brc-5", text: "Fore-aft position is centred over the ski's sweet spot — not sitting back, not pitching forward" },
      ],
      contextNotes: {
        "first-timer":     "This is the target — everything in the foundation builds toward here. Take your time; rushing to blue runs with a shaky parallel turn creates bad habits that are hard to undo.",
        "some-experience": "This is likely where you are now. Work through the five skills honestly — if even one is inconsistent, that's the one to fix before choosing a scenario.",
        "intermediate":    "If you can do all five consistently across varied blue terrain, you're ready. Choose a scenario — it defines the next few seasons of your skiing.",
        "advanced":        "You're past this — mark complete and continue.",
      },
    },
  ],
  branches: [
    {
      id: "recreational",
      name: "Recreational Cruising",
      description: "Comfortable on groomed blue and red runs. The goal is flow, not performance.",
      prerequisiteIds: ["blue-confidence"],
      checkpoints: [
        {
          id: "rec-smooth-blues",
          name: "Smooth Blues",
          tagline: "Parallel turns that feel effortless, not managed.",
          level: "development",
          focus: ["lateral-mobility", "line-anticipation"],
          exerciseIds: ["parallel-turn", "carving", "vrennis-drill", "charleston", "outside-boot-touch", "horizontal-pole", "synchronized-skiing"],
          skipFor: ["advanced"],
          skills: [
            { id: "rsb-1", text: "Can vary turn radius intentionally — wide and tight" },
            { id: "rsb-2", text: "Pole plant is becoming part of the rhythm" },
            { id: "rsb-3", text: "Can ski confidently at the end of a full day" },
            { id: "rsb-4", text: "Can vary stance width intentionally — wide for stability, narrow for agility" },
          ],
        },
        {
          id: "rec-red-runs",
          name: "Red Run Comfort",
          tagline: "Steeper terrain without the fight. Relaxed and in control.",
          level: "performance",
          focus: ["line-anticipation", "force-impulse", "separation"],
          exerciseIds: ["short-radius-turns", "carving", "side-slip", "glenns-drill", "airplane", "inside-ski-turns", "draw-a-line", "two-on-a-bamboo"],
          skipFor: ["advanced"],
          skills: [
            { id: "rrr-1", text: "Can ski a red run without traversing or stopping to rest" },
            { id: "rrr-2", text: "Speed management feels instinctive, not reactive" },
            { id: "rrr-3", text: "Comfortable making short-radius turns when needed" },
            { id: "rrr-4", text: "Can read terrain ahead and adjust line 2–3 turns in advance" },
          ],
        },
      ],
    },
    {
      id: "moguls",
      name: "Moguls & Freestyle",
      description: "Bumps, jumps, and terrain park features. Technical and demanding.",
      prerequisiteIds: ["blue-confidence"],
      checkpoints: [
        {
          id: "mog-intro",
          name: "Mogul Introduction",
          tagline: "First contact with bumps — absorbing, not fighting.",
          level: "development",
          focus: ["vertical-movement", "coordination", "line-anticipation"],
          exerciseIds: ["short-radius-turns", "lateral-hops", "hoppsving", "spiess", "childrens-spiess", "inside-ski-turns"],
          skills: [
            { id: "mi-1", text: "Can ski through a gentle mogul field without losing control" },
            { id: "mi-2", text: "Legs absorbing bumps rather than body bouncing over them" },
            { id: "mi-3", text: "Short-radius turns feel rhythmic on groomed terrain" },
            { id: "mi-4", text: "Extends through legs at turn initiation, flexes to absorb through the arc" },
          ],
        },
        {
          id: "mog-rhythm",
          name: "Mogul Rhythm",
          tagline: "Finding the line and maintaining it through a full run.",
          level: "performance",
          focus: ["line-anticipation", "separation", "vertical-movement"],
          exerciseIds: ["short-radius-turns", "jump-turns", "synchronized-skiing", "backwards-skiing", "spin-around", "two-on-a-bamboo"],
          skills: [
            { id: "mr-1", text: "Can pick and hold a line through a mogul field" },
            { id: "mr-2", text: "Pole plant triggers each turn consistently" },
            { id: "mr-3", text: "Upper body stays calm while legs work independently" },
            { id: "mr-4", text: "Eyes look 3–4 moguls ahead, not at the snow immediately in front" },
          ],
        },
      ],
    },
    {
      id: "backcountry",
      name: "Backcountry & Touring",
      description: "Off-piste powder and ski touring. Safety and fitness first.",
      prerequisiteIds: ["blue-confidence", "rec-red-runs"],
      checkpoints: [
        {
          id: "bc-offpiste",
          name: "Off-piste Fundamentals",
          tagline: "First powder turns outside the groomed piste.",
          level: "performance",
          focus: ["coordination", "fore-aft", "lateral-mobility"],
          exerciseIds: ["carving", "lateral-hops"],
          skills: [
            { id: "bco-1", text: "Can ski ungroomed terrain adjacent to pistes" },
            { id: "bco-2", text: "Understands basic avalanche risk (beacon / probe / shovel basics)" },
            { id: "bco-3", text: "Comfortable with variable snow — crust, crud, wet" },
          ],
        },
        {
          id: "bc-touring",
          name: "Touring Basics",
          tagline: "Uphill on skins, downhill in the wild.",
          level: "high-performance",
          focus: ["coordination", "global-movements"],
          exerciseIds: ["one-ski-skiing", "norwegian-pole-plant"],
          skills: [
            { id: "bct-1", text: "Has completed at least one guided touring day" },
            { id: "bct-2", text: "Can navigate with a map or GPS in mountain terrain" },
            { id: "bct-3", text: "Fitness supports 4+ hours of continuous mountain effort" },
          ],
        },
      ],
    },
    {
      id: "performance",
      name: "Performance & Racing",
      description: "Edge mastery, speed, and carved arcs. Technique over everything.",
      prerequisiteIds: ["blue-confidence"],
      checkpoints: [
        {
          id: "perf-edge",
          name: "Edge Mastery",
          tagline: "Clean arcs driven by legs — upper body calm, outside ski loaded.",
          level: "development",
          focus: ["force-impulse", "separation", "lateral-mobility"],
          exerciseIds: ["carving", "rollerblade-drill", "banana-turn", "horizontal-pole", "pole-pinch", "outside-ski-only", "outside-boot-touch", "handle-bar", "airplane"],
          skills: [
            { id: "pe-1", text: "Can carve a clean arc on a groomed blue without skidding" },
            { id: "pe-2", text: "Edge angle feels intentional, not accidental" },
            { id: "pe-3", text: "Upper body faces downhill and stays still while legs carve the arc independently" },
            { id: "pe-4", text: "Can feel the ski's sweet spot — the point where pressure creates a clean arc without skidding" },
          ],
        },
        {
          id: "perf-speed",
          name: "Speed & Pressure",
          tagline: "Managing G-forces and reading the hill at speed.",
          level: "high-performance",
          focus: ["force-impulse", "line-anticipation", "separation"],
          exerciseIds: ["carving", "short-radius-turns", "hit-hit-hit", "norwegian-pole-plant", "side-slip", "spiess", "hockey-stop"],
          skills: [
            { id: "ps-1", text: "Comfortable at high speed on groomed red runs" },
            { id: "ps-2", text: "Can absorb terrain changes at speed without losing the edge" },
            { id: "ps-3", text: "Has completed a timed course or race training day" },
            { id: "ps-4", text: "Can maintain outside ski dominance and upper body stability at high speed" },
            { id: "ps-5", text: "Pole plant remains crisp and timed at speed — not dropped when things get fast" },
          ],
        },
        {
          id: "gate-entry",
          name: "First Gates",
          tagline: "Introduction to gate skiing — shape, line, and proximity.",
          level: "development",
          focus: ["line-anticipation", "coordination", "vertical-movement"],
          exerciseIds: ["turn-shape-course", "vertical-movement-training-course", "forward-backward-movement-drill", "obstacle-course", "modified-gs-course", "sideslip-drill", "picket-fence-drill", "agility-training-drill", "start-and-finish-drill"],
          skills: [
            { id: "ge-1", text: "Has completed a full gate course without stopping" },
            { id: "ge-2", text: "Understands that turn shape determines gate timing" },
            { id: "ge-3", text: "Can pass gates without flinching or widening the arc defensively" },
            { id: "ge-4", text: "Looks ahead to the next gate before finishing the current turn" },
          ],
        },
        {
          id: "gate-development",
          name: "Gate Development",
          tagline: "GS and SL course work — rhythm, line, and technical consistency.",
          level: "performance",
          focus: ["line-anticipation", "force-impulse", "lateral-mobility"],
          exerciseIds: ["warmup-course-gs", "gs-line-drill", "forward-backward-movement-drill-gs", "lateral-movement-drill-gs", "vertical-movement-drill-gs", "corridor-sets-gs", "three-and-three-sl", "turn-shape-drill-sl", "corridor-sets-sl", "defined-corridors-sl", "warmup-course-sl", "gs-into-slalom-drill", "hairpin-drill-sl-ltr", "horizontal-gate-hinged", "super-g-training"],
          skills: [
            { id: "gd-1", text: "Can ski a GS warm-up course with consistent arc shape" },
            { id: "gd-2", text: "Understands and can execute a direct versus round gate entry" },
            { id: "gd-3", text: "Can navigate slalom hairpins and flushes with correct line" },
            { id: "gd-4", text: "Has trained with hinged (breakaway) poles" },
            { id: "gd-5", text: "Can adapt turn radius between GS and SL spacing in the same run" },
          ],
        },
        {
          id: "gate-performance",
          name: "Race Simulation",
          tagline: "Full race runs at race pace — start to finish.",
          level: "high-performance",
          focus: ["line-anticipation", "force-impulse", "separation"],
          exerciseIds: ["warmup-course-gs-ltr", "handle-bar-drill-gs", "race-simulation-gs", "mark-sharp-drill-sl", "impossible-flush-sl", "hairpin-drill-sl-ttr", "race-simulation-sl", "combination-drill-sl", "super-g-model-training"],
          skills: [
            { id: "gp-1", text: "Has completed a full race simulation at race pace in GS or SL" },
            { id: "gp-2", text: "Start protocol and finish line crossing are trained and automatic" },
            { id: "gp-3", text: "Can navigate all slalom combination types (hairpin, flush, open gates) at race pace" },
            { id: "gp-4", text: "Has completed a Super-G training run with full course inspection" },
          ],
        },
      ],
    },
  ],
};
