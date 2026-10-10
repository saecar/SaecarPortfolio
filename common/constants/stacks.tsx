import { icons } from "./icons";

export type SkillProps = {
  [key: string]: {
    icon: JSX.Element;
    background: string;
    color: string;
    isActive?: boolean;
  };
};

const iconSize = 26;

const renderIcon = (name: keyof typeof icons) => {
  const IconComponent = icons[name];
  return IconComponent ? <IconComponent size={iconSize} /> : <div />;
};

export const STACKS: SkillProps = {
  HTML: {
    icon: renderIcon("HTML"),
    background: "bg-orange-500",
    color: "text-orange-500",
    isActive: true,
  },
  CSS: {
    icon: renderIcon("CSS"),
    background: "bg-blue-500",
    color: "text-blue-500",
    isActive: true,
  },
  Bootstrap: {
    icon: renderIcon("Bootstrap"),
    background: "bg-violet-600",
    color: "text-violet-600",
    isActive: true,
  },
  TailwindCSS: {
    icon: renderIcon("TailwindCSS"),
    background: "bg-sky-400",
    color: "text-sky-400",
    isActive: true,
  },
  JavaScript: {
    icon: renderIcon("JavaScript"),
    background: "bg-yellow-400",
    color: "text-yellow-400",
    isActive: true,
  },
  TypeScript: {
    icon: renderIcon("TypeScript"),
    background: "bg-blue-500",
    color: "text-blue-500",
    isActive: true,
  },
  "Vue.js": {
    icon: renderIcon("Vue.js"),
    background: "bg-green-400",
    color: "text-green-400",
    isActive: false,
  },
  "React.js": {
    icon: renderIcon("React.js"),
    background: "bg-cyan-400",
    color: "text-cyan-400",
    isActive: true,
  },
  Vite: {
    icon: renderIcon("Vite"),
    background: "bg-purple-500",
    color: "text-purple-500",
    isActive: true,
  },
  "Astro.js": {
    icon: renderIcon("Astro.js"),
    background: "bg-violet-600",
    color: "text-violet-600",
    isActive: true,
  },
  "Shadcn UI": {
    icon: renderIcon("Shadcn UI"),
    background: "bg-neutral-800",
    color: "text-neutral-800",
    isActive: true,
  },
  "NextAuth.js": {
    icon: renderIcon("NextAuth.js"),
    background: "bg-slate-800",
    color: "text-slate-800",
    isActive: true,
  },
  TanStack: {
    icon: renderIcon("TanStack"),
    background: "bg-amber-500",
    color: "text-amber-500",
    isActive: true,
  },
  "React Table": {
    icon: renderIcon("React Table"),
    background: "bg-rose-600",
    color: "text-rose-600",
    isActive: false,
  },
  "React Hook Form": {
    icon: renderIcon("React Hook Form"),
    background: "bg-pink-500",
    color: "text-pink-500",
    isActive: false,
  },
  "React Router": {
    icon: renderIcon("React Router"),
    background: "bg-red-500",
    color: "text-red-500",
    isActive: false,
  },
  Axios: {
    icon: renderIcon("Axios"),
    background: "bg-violet-600",
    color: "text-violet-600",
    isActive: true,
  },
  Zod: {
    icon: renderIcon("Zod"),
    background: "bg-blue-600",
    color: "text-blue-600",
    isActive: true,
  },
  "Framer Motion": {
    icon: renderIcon("Framer Motion"),
    background: "bg-yellow-400",
    color: "text-yellow-400",
    isActive: true,
  },
  Redux: {
    icon: renderIcon("Redux"),
    background: "bg-violet-500",
    color: "text-violet-500",
    isActive: true,
  },
  Prisma: {
    icon: renderIcon("Prisma"),
    background: "bg-teal-500",
    color: "text-teal-500",
    isActive: true,
  },
  "Next.js": {
    icon: renderIcon("Next.js"),
    background: "bg-neutral-800",
    color: "text-neutral-50",
    isActive: true,
  },
  "Node.js": {
    icon: renderIcon("Node.js"),
    background: "bg-green-600",
    color: "text-green-600",
    isActive: true,
  },
  "Express.js": {
    icon: renderIcon("Express.js"),
    background: "bg-neutral-800",
    color: "text-neutral-800",
    isActive: true,
  },
  "Nest.js": {
    icon: renderIcon("Nest.js"),
    background: "bg-rose-600",
    color: "text-rose-600",
    isActive: false,
  },
  Go: {
    icon: renderIcon("Go"),
    background: "bg-sky-500",
    color: "text-sky-500",
    isActive: true,
  },
  PHP: {
    icon: renderIcon("PHP"),
    background: "bg-indigo-400",
    color: "text-indigo-400",
    isActive: true,
  },
  Laravel: {
    icon: renderIcon("Laravel"),
    background: "bg-red-700",
    color: "text-red-700",
    isActive: true,
  },
  Kotlin: {
    icon: renderIcon("Kotlin"),
    background: "bg-violet-600",
    color: "text-violet-600",
    isActive: true,
  },
  "Jetpack Compose": {
    icon: renderIcon("Jetpack Compose"),
    background: "bg-cyan-800",
    color: "text-cyan-800",
    isActive: true,
  },
  PostgreSql: {
    icon: renderIcon("PostgreSql"),
    background: "bg-blue-500",
    color: "text-blue-500",
    isActive: true,
  },
  MySql: {
    icon: renderIcon("MySql"),
    background: "bg-cyan-700",
    color: "text-cyan-700",
    isActive: true,
  },
  MongoDb: {
    icon: renderIcon("MongoDb"),
    background: "bg-green-600",
    color: "text-green-600",
    isActive: false,
  },
  Firebase: {
    icon: renderIcon("Firebase"),
    background: "bg-amber-500",
    color: "text-amber-500",
    isActive: true,
  },
  Supabase: {
    icon: renderIcon("Supabase"),
    background: "bg-emerald-500",
    color: "text-emerald-500",
    isActive: true,
  },
  Jest: {
    icon: renderIcon("Jest"),
    background: "bg-pink-600",
    color: "text-pink-600",
    isActive: false,
  },
  Docker: {
    icon: renderIcon("Docker"),
    background: "bg-blue-600",
    color: "text-blue-500",
    isActive: true,
  },
  AI: {
    icon: renderIcon("AI"),
    background: "bg-fuchsia-700",
    color: "text-fuchsia-700",
    isActive: false,
  },
  Npm: {
    icon: renderIcon("Npm"),
    background: "bg-red-700",
    color: "text-red-500",
    isActive: true,
  },
  Yarn: {
    icon: renderIcon("Yarn"),
    background: "bg-violet-800",
    color: "text-sky-400",
    isActive: true,
  },
  bun: {
    icon: renderIcon("bun"),
    background: "bg-orange-100",
    color: "text-yellow-50",
    isActive: true,
  },
  Github: {
    icon: renderIcon("Github"),
    background: "bg-slate-800",
    color: "text-neutral-50",
    isActive: true,
  },
  Vercel: {
    icon: renderIcon("Vercel"),
    background: "bg-neutral-900",
    color: "text-neutral-50",
    isActive: true,
  },
  Python: {
    icon: renderIcon("Python"),
    background: "bg-yellow-400",
    color: "text-yellow-400",
    isActive: true,
  },
  Arduino: {
    icon: renderIcon("Arduino"),
    background: "bg-teal-600",
    color: "text-teal-500",
    isActive: true,
  },
  ESP32: {
    icon: renderIcon("ESP32"),
    background: "bg-red-600",
    color: "text-red-500",
    isActive: true,
  },
  "Raspberry Pi": {
    icon: renderIcon("Raspberry Pi"),
    background: "bg-rose-700",
    color: "text-rose-500",
    isActive: true,
  },
  PlatformIO: {
    icon: renderIcon("PlatformIO"),
    background: "bg-orange-600",
    color: "text-orange-500",
    isActive: true,
  },
  "C++": {
    icon: renderIcon("C++"),
    background: "bg-blue-600",
    color: "text-blue-500",
    isActive: true,
  },
  MQTT: {
    icon: renderIcon("MQTT"),
    background: "bg-purple-600",
    color: "text-purple-400",
    isActive: true,
  },
  Unity: {
    icon: renderIcon("Unity"),
    background: "bg-neutral-800",
    color: "text-neutral-300",
    isActive: true,
  },
  Godot: {
    icon: renderIcon("Godot"),
    background: "bg-sky-600",
    color: "text-sky-400",
    isActive: true,
  },
  "Unreal Engine": {
    icon: renderIcon("Unreal Engine"),
    background: "bg-neutral-900",
    color: "text-neutral-300",
    isActive: true,
  },
  "Three.js": {
    icon: renderIcon("Three.js"),
    background: "bg-neutral-800",
    color: "text-neutral-200",
    isActive: true,
  },
  Blender: {
    icon: renderIcon("Blender"),
    background: "bg-amber-600",
    color: "text-amber-500",
    isActive: true,
  },
};
