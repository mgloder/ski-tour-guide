export type EquipmentCategory =
  | "skis"
  | "boots"
  | "poles"
  | "helmet"
  | "clothing"
  | "safety"
  | "accessories";

export type SkillLevel = "beginner" | "intermediate" | "advanced" | "all";

export type EquipmentItem = {
  id: string;
  name: string;
  description: string;
  category: EquipmentCategory;
  skillLevel: SkillLevel;
  features: string[];
  maintenanceTips: string[];
  priceRange: string;
};

export const equipment: EquipmentItem[] = [
  {
    id: "all-mountain-skis",
    name: "All-Mountain Skis",
    description:
      "Versatile skis designed for groomed runs, off-piste, and varied conditions. The best starting point for most recreational skiers.",
    category: "skis",
    skillLevel: "intermediate",
    priceRange: "€400–€900",
    features: [
      "Waist width 85–95mm for float and edge grip balance",
      "Moderate rocker for easy turn initiation",
      "Cambered underfoot for edge control on groomers",
      "Works in most snow conditions from packed powder to light off-piste",
    ],
    maintenanceTips: [
      "Wax edges and base at least once per season",
      "Edge sharpen every 10–15 ski days",
      "Store vertically or with tip/tail protectors in summer",
      "Dry bindings and edges before storage to prevent rust",
    ],
  },
  {
    id: "alpine-ski-boots",
    name: "Alpine Ski Boots",
    description:
      "Hard-shell boots that transfer precise movements from your leg to the ski. Fit is the single most important factor.",
    category: "boots",
    skillLevel: "all",
    priceRange: "€200–€800",
    features: [
      "Flex index 60–90 for beginners, 90–120 for advanced",
      "Last width (volume) varies — key for comfort and performance",
      "Walk mode on some models for easier resort navigation",
      "Heat-moldable liners available for custom fit",
    ],
    maintenanceTips: [
      "Always buckle boots loosely when walking, firmly when skiing",
      "Remove liners to dry overnight after each ski day",
      "Check binding release values annually",
      "Store buckles loose to preserve cuff shape",
    ],
  },
  {
    id: "ski-poles",
    name: "Ski Poles",
    description:
      "Poles aid balance, rhythm, and turn initiation. Length: stand straight, grip pole upside down — elbow should be at 90°.",
    category: "poles",
    skillLevel: "all",
    priceRange: "€30–€200",
    features: [
      "Aluminum poles are durable and affordable",
      "Carbon poles are lighter and absorb vibration",
      "Adjustable-length poles suit changing terrain",
      "Powder baskets for off-piste, race baskets for groomers",
    ],
    maintenanceTips: [
      "Inspect grip and strap before each trip",
      "Replace bent aluminum poles — straightening weakens them",
      "Check basket attachment is secure after hard impacts",
    ],
  },
  {
    id: "ski-helmet",
    name: "Ski Helmet",
    description:
      "Non-negotiable safety equipment. A properly fitted helmet reduces head injury risk by up to 60%. Replace after any significant impact.",
    category: "helmet",
    skillLevel: "all",
    priceRange: "€60–€400",
    features: [
      "In-mold or hardshell construction (hardshell is more durable)",
      "MIPS or similar rotational impact protection on modern helmets",
      "Integrated ventilation system",
      "Compatible with most ski goggles",
      "Bluetooth audio options on premium models",
    ],
    maintenanceTips: [
      "Replace after any direct impact, even without visible damage",
      "Replace every 5–8 years regardless — foam degrades",
      "Store away from UV, heat, and solvents",
      "Check goggle-to-helmet seal before riding",
    ],
  },
  {
    id: "avalanche-airbag-pack",
    name: "Avalanche Airbag Pack",
    description:
      "Backpack with an inflatable airbag system that, when deployed, helps the wearer stay near the snow surface in an avalanche.",
    category: "safety",
    skillLevel: "advanced",
    priceRange: "€600–€1,200",
    features: [
      "Battery or compressed air activation",
      "30–35L pack capacity for touring gear",
      "Integrated avalanche safety tool pockets",
      "Works best combined with beacon, probe, and shovel",
    ],
    maintenanceTips: [
      "Test deploy at season start (check manufacturer procedure)",
      "Repack airbag carefully following manufacturer instructions",
      "Replace cylinder after every deployment",
      "Service trigger mechanism every 2–3 years",
    ],
  },
  {
    id: "avalanche-beacon",
    name: "Avalanche Transceiver (Beacon)",
    description:
      "Electronic device worn on the body that transmits a signal so you can be located, or received to search for buried victims. Mandatory for off-piste and backcountry skiing.",
    category: "safety",
    skillLevel: "intermediate",
    priceRange: "€200–€400",
    features: [
      "Three-antenna digital transceivers for fastest search",
      "Range up to 70m in search mode",
      "Multiple burial indicator",
      "Automatic revert to transmit after prolonged search",
    ],
    maintenanceTips: [
      "Practice search drills before every backcountry trip",
      "Replace batteries before each season (alkaline recommended)",
      "Check transmit mode is active before leaving the lift",
      "Send in for professional service every 3 years",
    ],
  },
  {
    id: "ski-goggles",
    name: "Ski Goggles",
    description:
      "Protect eyes from UV, wind, and snow impact. Lens tint should match the light conditions you ski in most.",
    category: "accessories",
    skillLevel: "all",
    priceRange: "€40–€350",
    features: [
      "Double-lens construction reduces fogging",
      "Photochromic lenses auto-adjust to changing light",
      "VLT (Visible Light Transmission): 5–15% for bright, 50–80% for flat light",
      "OTG (over-the-glasses) versions for eyeglass wearers",
    ],
    maintenanceTips: [
      "Never wipe the inner lens — use a dry microfibre cloth on the outside only",
      "Store in a soft pouch to prevent scratches",
      "Avoid leaving goggles in a hot car — heat degrades the foam and lens coating",
    ],
  },
  {
    id: "ski-base-layer",
    name: "Merino Wool Base Layer",
    description:
      "Next-to-skin layer responsible for moisture management. Merino wool regulates temperature naturally and resists odour.",
    category: "clothing",
    skillLevel: "all",
    priceRange: "€50–€180",
    features: [
      "Moisture-wicking — moves sweat away from skin",
      "Natural temperature regulation in both cold and warm conditions",
      "Odour-resistant for multi-day trips",
      "Flatlock seams reduce pressure points under ski boots",
    ],
    maintenanceTips: [
      "Wash in cold water with wool-safe detergent",
      "Lay flat to dry — do not tumble dry",
      "Air out after use to extend time between washes",
    ],
  },
];
