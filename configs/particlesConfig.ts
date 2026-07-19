export type ParticlesConfig = {
  count: number;
  size: number;
  brightness: number;
  flowSpeed: number;
  noiseScale: number;
  noiseAmp: number;
};

export const PARTICLES_DEFAULTS: ParticlesConfig = {
  count: 78000,
  size: 0.13,
  brightness: 0.3,
  flowSpeed: 0.15,
  noiseScale: 0.45,
  noiseAmp: 1,
};
