export type Difficulty = "beginner" | "intermediate" | "advanced" | "expert";
export type ExerciseType = "technique" | "fitness" | "balance" | "conditioning";

export type Exercise = {
  id: string;
  name: string;
  description: string;
  difficulty: Difficulty;
  type: ExerciseType;
  duration: string;
  steps: string[];
  tips: string[];
  targetMuscles: string[];
};

export const exercises: Exercise[] = [
  {
    id: "parallel-turn",
    name: "Parallel Turn",
    description:
      "The foundation of all intermediate skiing. Both skis remain parallel throughout the turn, allowing for precise control and speed management.",
    difficulty: "intermediate",
    type: "technique",
    duration: "30–60 minutes on slope",
    steps: [
      "Start in a relaxed athletic stance, knees slightly bent",
      "Initiate the turn by shifting weight to the downhill ski",
      "Press the downhill ski edge into the snow while releasing the uphill edge",
      "Rotate hips and shoulders in the direction of the turn",
      "Finish the turn by bringing skis back to parallel position",
    ],
    tips: [
      "Keep your hands forward and in your peripheral vision",
      "Look 2–3 turns ahead, not at your ski tips",
      "Focus on smooth, continuous pressure rather than sudden movements",
    ],
    targetMuscles: ["quadriceps", "glutes", "core", "calves"],
  },
  {
    id: "carving",
    name: "Carving",
    description:
      "Advanced edge-based turning technique where the ski follows a clean arc with minimal skidding, maximizing speed and efficiency.",
    difficulty: "advanced",
    type: "technique",
    duration: "45–90 minutes on groomed slope",
    steps: [
      "Stand tall at the start of each turn",
      "Roll ankles and knees into the hill to engage edges early",
      "Drive the shin forward into the boot tongue throughout the arc",
      "Allow the ski's sidecut to do the work — resist over-rotating",
      "Rise and extend out of the turn to transition to the next",
    ],
    tips: [
      "Start on a gentle groomed slope to feel the ski arc",
      "Think 'tipping' not 'turning'",
      "Keep upper body calm and facing downhill",
    ],
    targetMuscles: ["adductors", "quadriceps", "hip flexors", "tibialis anterior"],
  },
  {
    id: "wall-sit",
    name: "Wall Sit",
    description:
      "An off-snow conditioning exercise that builds the quad endurance essential for holding a ski stance all day.",
    difficulty: "beginner",
    type: "conditioning",
    duration: "3 sets of 45–90 seconds",
    steps: [
      "Stand with back flat against a wall",
      "Slide down until thighs are parallel to the floor",
      "Keep knees above ankles, not forward over toes",
      "Hold position, breathing steadily",
      "Slide back up and rest 30 seconds between sets",
    ],
    tips: [
      "Progress by holding longer or adding weight to your lap",
      "Add a balance challenge by lifting one foot slightly",
    ],
    targetMuscles: ["quadriceps", "glutes", "hamstrings"],
  },
  {
    id: "single-leg-balance",
    name: "Single-Leg Balance",
    description:
      "Core balance drill that mirrors the one-ski weighting demands of every turn on snow.",
    difficulty: "beginner",
    type: "balance",
    duration: "3 sets of 30–60 seconds per leg",
    steps: [
      "Stand on one foot on a flat surface",
      "Maintain a soft knee bend — do not lock the standing leg",
      "Hold arms out to sides for counterbalance",
      "Progress to closing your eyes or standing on a balance board",
    ],
    tips: [
      "Focus on a fixed point to help maintain balance",
      "Slightly bend the ankle forward as if pressing into a ski boot",
    ],
    targetMuscles: ["peroneals", "tibialis anterior", "glutes", "core"],
  },
  {
    id: "short-radius-turns",
    name: "Short Radius Turns",
    description:
      "Quick, rhythmic turns used in steep terrain and moguls. Develops edge control and timing.",
    difficulty: "advanced",
    type: "technique",
    duration: "20–40 minutes on steep groomed or mogul terrain",
    steps: [
      "Start with poles planted in front, close together",
      "Use pole plant to trigger each turn",
      "Keep turn radius tight — finish each turn before starting the next",
      "Absorb terrain with ankles and knees, keeping upper body quiet",
      "Maintain a consistent rhythm",
    ],
    tips: [
      "Count turns out loud to develop rhythm",
      "Look far enough ahead to read the terrain",
    ],
    targetMuscles: ["quadriceps", "core", "forearms", "hip flexors"],
  },
  {
    id: "lateral-hops",
    name: "Lateral Hops",
    description:
      "Off-snow plyometric exercise simulating the lateral push of skiing. Builds explosive power and ankle stability.",
    difficulty: "intermediate",
    type: "fitness",
    duration: "4 sets of 20 reps",
    steps: [
      "Stand on one foot with a slight knee bend",
      "Push off laterally, landing softly on the opposite foot",
      "Absorb the landing with your ankle and knee",
      "Immediately push off in the opposite direction",
      "Keep landings controlled — avoid collapsing the knee inward",
    ],
    tips: [
      "Start with small hops and increase distance progressively",
      "Land quietly — loud landings indicate poor absorption",
    ],
    targetMuscles: ["glutes", "quadriceps", "peroneals", "calves"],
  },
];
