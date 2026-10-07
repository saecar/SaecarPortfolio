/**
 * Auto-detect project category from GitHub repo payload / files.
 * Returns: "iot" | "game" | "web" | "web-frontend" | "web-backend" | "web-fullstack"
 */
export function detectCategory(payload: {
  topics: string[];
  name: string;
  files?: Array<{ path: string }>;
  packageJson?: Record<string, any>;
}): "iot" | "game" | "web" | "web-frontend" | "web-backend" | "web-fullstack" {
  const topics = payload.topics || [];
  const files = payload.files || [];
  const pkg = payload.packageJson || {};

  // 1) Explicit topic override
  if (topics.some((t) => ["iot", "arduino", "esp32", "esp8266", "raspberry-pi", "stm32", "embedded", "hardware", "firmware", "robotics", "sensors"].includes(t.toLowerCase()))) {
    return "iot";
  }
  if (topics.some((t) => ["game", "gamedev", "unity", "godot", "unreal", "phaser", "threejs", "pixel-art", "game-engine", "pygame"].includes(t.toLowerCase()))) {
    return "game";
  }
  if (topics.some((t) => ["web", "frontend", "backend", "fullstack", "nextjs", "react", "vue", "website"].includes(t.toLowerCase()))) {
    return "web";
  }

  // 2) File-based detection
  const paths = files.map((f) => f.path.toLowerCase());

  // IoT: PlatformIO, Arduino .ino, ESP32, Johnny-Five, firmware, wokwi
  if (
    paths.some((p) => p.includes("platformio.ini") || p.endsWith(".ino") || p.includes("wokwi.toml") || p.includes("diagram.json")) ||
    paths.some((p) => p.includes("particle") || p.includes("esp32") || p.includes("esp8266") || p.includes("arduino") || p.includes("stm32")) ||
    pkg.dependencies?.["johnny-five"] ||
    pkg.devDependencies?.["johnny-five"] ||
    pkg.dependencies?.["cylon"]
  ) return "iot";

  // Game: Unity, Godot, Phaser, Three.js, PixiJS, Unreal
  if (
    paths.some((p) =>
      p.includes("projectsettings") ||
      p.includes("project.godot") ||
      p.endsWith(".unity") ||
      p.endsWith(".uproject") ||
      p.includes("assets/scenes") ||
      p.includes("assets/sprites")
    ) ||
    pkg.dependencies?.["phaser"] ||
    pkg.dependencies?.["three"] ||
    pkg.dependencies?.["@react-three/fiber"] ||
    pkg.dependencies?.["pixi.js"] ||
    pkg.dependencies?.["@godotengine"] ||
    pkg.dependencies?.["kaboom"] ||
    pkg.name?.includes("game")
  ) return "game";

  // Web: detect framework + backend
  const isNext = pkg.dependencies?.["next"] || pkg.devDependencies?.["next"];
  const isVite = pkg.devDependencies?.["vite"];
  const isReact = pkg.dependencies?.["react"];
  const isVue = pkg.dependencies?.["vue"];
  const isSvelte = pkg.devDependencies?.["svelte"] || pkg.dependencies?.["svelte"];
  const isExpress = pkg.dependencies?.["express"];
  const isNest = pkg.dependencies?.["@nestjs/core"];
  const isPrisma = pkg.dependencies?.["@prisma/client"];
  const isFastify = pkg.dependencies?.["fastify"];

  const hasFrontend = isNext || isVite || isReact || isVue || isSvelte;
  const hasBackend = isExpress || isNest || isPrisma || isFastify;

  if (hasFrontend && hasBackend) return "web-fullstack";
  if (hasFrontend) return "web-frontend";
  if (hasBackend) return "web-backend";

  // 3) Name heuristic
  const lowerName = payload.name.toLowerCase();
  if (lowerName.includes("iot") || lowerName.includes("esp32") || lowerName.includes("arduino") || lowerName.includes("sensor")) return "iot";
  if (lowerName.includes("game") || lowerName.includes("unity") || lowerName.includes("godot") || lowerName.includes("adventure") || lowerName.includes("quest")) return "game";

  // 4) Default fallback
  return "web";
}

export function getCategoryLabel(cat: ReturnType<typeof detectCategory>): string {
  switch (cat) {
    case "iot":
      return "IoT";
    case "game":
      return "Game";
    case "web-frontend":
      return "Web (Frontend)";
    case "web-backend":
      return "Web (Backend)";
    case "web-fullstack":
      return "Web (Fullstack)";
    default:
      return "Web";
  }
}