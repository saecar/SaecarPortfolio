export interface FeatureFlags {
  enableMagicBento: boolean;
  enableScrollStack: boolean;
  enableUmami: boolean;
  enableChat: boolean;
  enableAos: boolean;
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  enableMagicBento: true,
  enableScrollStack: true,
  enableUmami: true,
  enableChat: true,
  enableAos: true,
};
