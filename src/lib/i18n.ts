export type Locale = "en" | "zh";

export type Translations = {
  nav: { brand: string; training: string; equipment: string; places: string };
  home: {
    tagline: string; title: string; description: string;
    searchPlaceholder: (n: number) => string;
    search: string; destinations: string; countries: string; kmOfPiste: string;
    openIn: (m: string) => string;
    bestIn: (m: string) => string;
    seeAll: string;
    modules: {
      training:  { tag: string; title: string; description: string };
      equipment: { tag: string; title: string; description: string };
      places:    { tag: string; title: string; description: string };
    };
    agentPanel: { title: string; mcp: string; tools: string; discovery: string; tryIt: string };
  };
  homeClient: {
    randomDestination: string; finding: string; trainingInProgress: string;
    skillsCompleted: (n: number) => string;
    continueTraining: string;
    recommendedFor: (level: string) => string;
    seeAll: string; notStarted: string; noSavesYet: string; quizNotTaken: string;
    savedResorts: (n: number) => string;
    levelLabel: (l: string) => string;
    levelDisplay: (l: string) => string;
    addToHomeScreen: string; install: string;
  };
  module: {
    training:  { label: string; title: string; description: string };
    equipment: { label: string; title: string; description: string };
  };
  places: { loadError: string };
};

const MONTHS_ZH: Record<string, string> = {
  Jan: "1月", Feb: "2月",  Mar: "3月",  Apr: "4月",
  May: "5月", Jun: "6月",  Jul: "7月",  Aug: "8月",
  Sep: "9月", Oct: "10月", Nov: "11月", Dec: "12月",
};

const LEVELS_ZH: Record<string, string> = {
  beginner:         "初学者",
  intermediate:     "中级",
  advanced:         "高级",
  expert:           "专家",
  "first-timer":    "初次尝试",
  "some-experience":"有些经验",
};

export const translations: Record<Locale, Translations> = {
  en: {
    nav: {
      brand:     "The Ski Handbook",
      training:  "Training",
      equipment: "Equipment",
      places:    "Places",
    },
    home: {
      tagline:           "Human & AI-agent-friendly",
      title:             "The Ski Handbook",
      description:       "Everything you need on the mountain — training, equipment, and destinations. Also accessible to AI agents via MCP endpoint and llms.txt.",
      searchPlaceholder: (n: number) => `Search ${n.toLocaleString()} destinations…`,
      search:            "Search",
      destinations:      "destinations",
      countries:         "countries",
      kmOfPiste:         "km of piste",
      openIn:            (m: string) => `open in ${m}`,
      bestIn:            (m: string) => `Best in ${m}`,
      seeAll:            "See all →",
      modules: {
        training:  { tag: "skill roadmap",  title: "Training",   description: "Technique drills, off-snow conditioning, and balance work. From beginner parallel turns to expert carving." },
        equipment: { tag: "gear guide",     title: "Equipment",  description: "Gear guides covering skis, boots, poles, helmets, safety equipment, and clothing with maintenance tips." },
        places:    { tag: "destinations",   title: "Places",     description: "Resort and destination guides with piste breakdowns, altitude data, and best-season recommendations." },
      },
      agentPanel: { title: "For AI Agents", mcp: "MCP Server", tools: "Tools", discovery: "Discovery", tryIt: "Try it" },
    },
    homeClient: {
      randomDestination: "Random Destination",
      finding:           "Finding…",
      trainingInProgress:"Training in progress",
      skillsCompleted:   (n: number) => `${n} skill${n !== 1 ? "s" : ""} completed`,
      continueTraining:  "Continue your training →",
      recommendedFor:    (level: string) => `Recommended for ${level}`,
      seeAll:            "See all →",
      notStarted:        "Not started",
      noSavesYet:        "No saves yet",
      quizNotTaken:      "Quiz not taken",
      savedResorts:      (n: number) => `${n} saved resort${n !== 1 ? "s" : ""}`,
      levelLabel:        (l: string) => `Level: ${l}`,
      levelDisplay:      (l: string) => ({ beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced", expert: "Expert", "first-timer": "First-timer", "some-experience": "Some experience" } as Record<string, string>)[l] ?? l,
      addToHomeScreen:   "Add The Ski Handbook to your home screen for quick access.",
      install:           "Install",
    },
    module: {
      training:  { label: "Module 01", title: "Training",   description: "Technique drills, off-snow conditioning, and balance training for all levels — from first-timers to expert carvers." },
      equipment: { label: "Module 02", title: "Equipment",  description: "Click a body zone to explore gear for that area." },
    },
    places: {
      loadError: "Unable to load destinations. Please try again later.",
    },
  },

  zh: {
    nav: {
      brand:     "滑雪手册",
      training:  "训练",
      equipment: "装备",
      places:    "目的地",
    },
    home: {
      tagline:           "人类与 AI 代理友好",
      title:             "滑雪手册",
      description:       "山地运动全指南 — 训练、装备和目的地。同时支持 AI 代理通过 MCP 接口和 llms.txt 接入。",
      searchPlaceholder: (n: number) => `搜索 ${n.toLocaleString()} 个目的地…`,
      search:            "搜索",
      destinations:      "个目的地",
      countries:         "个国家",
      kmOfPiste:         "公里雪道",
      openIn:            (m: string) => `${MONTHS_ZH[m] ?? m}开放`,
      bestIn:            (m: string) => `${MONTHS_ZH[m] ?? m}最佳`,
      seeAll:            "查看全部 →",
      modules: {
        training:  { tag: "技能路径",   title: "训练",    description: "技术动作、陆上体能和平衡训练，从初学并行转弯到高级刻滑。" },
        equipment: { tag: "装备指南",   title: "装备",    description: "雪橇、雪靴、雪杖、头盔、安全设备和服装的完整选购与保养指南。" },
        places:    { tag: "目的地",     title: "目的地",  description: "度假村与目的地指南，含雪道详情、海拔数据和最佳季节推荐。" },
      },
      agentPanel: { title: "AI 代理接入", mcp: "MCP 服务器", tools: "工具", discovery: "接口发现", tryIt: "示例请求" },
    },
    homeClient: {
      randomDestination: "随机目的地",
      finding:           "查找中…",
      trainingInProgress:"训练进行中",
      skillsCompleted:   (n: number) => `已完成 ${n} 个技能`,
      continueTraining:  "继续训练 →",
      recommendedFor:    (level: string) => `${LEVELS_ZH[level] ?? level}推荐`,
      seeAll:            "查看全部 →",
      notStarted:        "尚未开始",
      noSavesYet:        "暂无收藏",
      quizNotTaken:      "尚未完成测验",
      savedResorts:      (n: number) => `已收藏 ${n} 个度假村`,
      levelLabel:        (l: string) => `级别：${LEVELS_ZH[l] ?? l}`,
      levelDisplay:      (l: string) => LEVELS_ZH[l] ?? l,
      addToHomeScreen:   "将滑雪手册添加到主屏幕以快速访问。",
      install:           "安装",
    },
    module: {
      training:  { label: "模块 01", title: "训练",  description: "适合各水平的技术动作、陆上训练和平衡练习，从初学者到专家级刻滑。" },
      equipment: { label: "模块 02", title: "装备",  description: "点击身体部位探索该区域的装备。" },
    },
    places: {
      loadError: "无法加载目的地，请稍后再试。",
    },
  },
};
