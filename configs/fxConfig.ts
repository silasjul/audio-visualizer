export type FxConfig = {
  glow: number;
  glowPunch: number;
  darkness: number;
  chroma: number;
  chromaPunch: number;
  grain: number;
};

export const FX_DEFAULTS: FxConfig = {
  glow: 0.08,
  glowPunch: 0.3,
  darkness: 0.78,
  chroma: 0.0005,
  chromaPunch: 0.0045,
  grain: 0.28,
};
