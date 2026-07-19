export type AudioConfig = {
  attack: number;
  release: number;
  beatSensitivity: number;
  beatCooldown: number;
};

export const AUDIO_DEFAULTS: AudioConfig = {
  attack: 0.5,
  release: 0.06,
  beatSensitivity: 1.35,
  beatCooldown: 0.22,
};
