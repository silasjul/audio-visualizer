export type LasersConfig = {
  intensity: number;
  brightness: number;
  sweep: number;
  threshold: number;
};

export const LASERS_DEFAULTS: LasersConfig = {
  intensity: 1.2,
  brightness: 3,
  sweep: 0.7,
  threshold: 0,
};
