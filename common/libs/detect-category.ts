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
  if (topics.includes("iot")) return "iot";
  if (topics.includes("game")) return "game";
  if (topics.includes("web") || topics.includes("frontend") || topics.includes("backend")) return "web";

  // 2) File-based detection
  const paths = files.map((f) => f.path.toLowerCase());

  // IoT: PlatformIO, Arduino .ino, ESP32, Johnny-Five, firmware
  if (
    paths.some((p) => p.includes("platformio.ini")) ||
    paths.some((p) => p.endsWith(".ino")) ||
    paths.some((p) => p.includes("particle") || p.includes("esp32") || p.includes("arduino")) ||
    pkg.dependencies?.["johnny-five"] ||
    pkg.devDependencies?.["johnny-five"]
  ) return "iot";

  // Game: Unity, Godot, Phaser, Three.js, PixiJS
  if (
    paths.some((p) => p.includes("projectsettings") || p.includes("assets/") || p.endsWith(".unity")) ||
    pkg.dependencies?.["phaser"] ||
    pkg.dependencies?.["three"] ||
    pkg.dependencies?.["pixi.js"] ||
    pkg.dependencies?.["@godotengine"] ||
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
  if (payload.name.toLowerCase().includes("iot")) return "iot";
  if (payload.name.toLowerCase().includes("game")) return "game";

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