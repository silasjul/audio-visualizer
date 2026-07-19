import type { PaletteName } from '@/configs/palettes';

export type CoreConfig = {
  palette: PaletteName;
  baseScale: number;
  bassPulse: number;
  glow: number;
  glowPunch: number;
  distort: number;
  distortSpeed: number;
};

export const CORE_DEFAULTS: CoreConfig = {
  palette: 'plasma',
  baseScale: 1,
  bassPulse: 0.45,
  glow: 1.6,
  glowPunch: 5,
  distort: 0.22,
  distortSpeed: 2,
};
