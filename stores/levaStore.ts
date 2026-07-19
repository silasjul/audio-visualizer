import { create } from 'zustand';
import { CUBE_DEFAULTS, type CubeConfig } from '@/configs/cubeConfig';
import { AUDIO_DEFAULTS, type AudioConfig } from '@/configs/audioConfig';
import { CORE_DEFAULTS, type CoreConfig } from '@/configs/coreConfig';
import { PARTICLES_DEFAULTS, type ParticlesConfig } from '@/configs/particlesConfig';
import { BLOOM_DEFAULTS, type BloomConfig } from '@/configs/bloomConfig';

interface LevaState {
  cube: CubeConfig;
  setCube: (cube: CubeConfig) => void;
  audio: AudioConfig;
  setAudio: (audio: AudioConfig) => void;
  core: CoreConfig;
  setCore: (core: CoreConfig) => void;
  particles: ParticlesConfig;
  setParticles: (particles: ParticlesConfig) => void;
  bloom: BloomConfig;
  setBloom: (bloom: BloomConfig) => void;
}

export const useLevaStore = create<LevaState>((set) => ({
  cube: CUBE_DEFAULTS,
  setCube: (cube) => set({ cube }),
  audio: AUDIO_DEFAULTS,
  setAudio: (audio) => set({ audio }),
  core: CORE_DEFAULTS,
  setCore: (core) => set({ core }),
  particles: PARTICLES_DEFAULTS,
  setParticles: (particles) => set({ particles }),
  bloom: BLOOM_DEFAULTS,
  setBloom: (bloom) => set({ bloom }),
}));
