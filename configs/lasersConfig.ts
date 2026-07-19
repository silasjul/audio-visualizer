export type LasersConfig = {
  intensity: number;
  brightness: number;
  sweep: number;
  threshold: number;
};

export const LASERS_DEFAULTS: LasersConfig = {
  intensity: 1,
  brightness: 1,
  sweep: 1,
  threshold: 0.5,
};
