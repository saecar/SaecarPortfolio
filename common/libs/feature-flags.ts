import { DEFAULT_FEATURE_FLAGS, FeatureFlags } from "@/common/constants/features";

function parseFlag(val: string | undefined, defaultValue: boolean): boolean {
  if (val === undefined || val === "") return defaultValue;
  return val === "true" || val === "1";
}

export function getFeatureFlags(): FeatureFlags {
  return {
    enableMagicBento: parseFlag(
      process.env.NEXT_PUBLIC_FEATURE_MAGIC_BENTO,
      DEFAULT_FEATURE_FLAGS.enableMagicBento
    ),
    enableScrollStack: parseFlag(
      process.env.NEXT_PUBLIC_FEATURE_SCROLL_STACK,
      DEFAULT_FEATURE_FLAGS.enableScrollStack
    ),
    enableUmami: parseFlag(
      process.env.NEXT_PUBLIC_FEATURE_UMAMI,
      DEFAULT_FEATURE_FLAGS.enableUmami
    ),
    enableChat: parseFlag(
      process.env.NEXT_PUBLIC_FEATURE_CHAT,
      DEFAULT_FEATURE_FLAGS.enableChat
    ),
    enableAos: parseFlag(
      process.env.NEXT_PUBLIC_FEATURE_AOS,
      DEFAULT_FEATURE_FLAGS.enableAos
    ),
  };
}

export const featureFlags = getFeatureFlags();
