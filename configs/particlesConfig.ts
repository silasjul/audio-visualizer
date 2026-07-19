export type ParticlesConfig = {
  count: number;
  size: number;
  brightness: number;
  flowSpeed: number;
  noiseScale: number;
  noiseAmp: number;
};

export const PARTICLES_DEFAULTS: ParticlesConfig = {
  count: 40000,
  size: 0.14,
  brightness: 1,
  flowSpeed: 0.35,
  noiseScale: 0.5,
  noiseAmp: 0.7,
};
