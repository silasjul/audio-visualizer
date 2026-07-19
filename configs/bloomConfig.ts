export type BloomConfig = {
  intensity: number;
  punch: number;
  threshold: number;
  radius: number;
};

export const BLOOM_DEFAULTS: BloomConfig = {
  intensity: 1.1,
  punch: 1.6,
  threshold: 0.18,
  radius: 0.85,
};
