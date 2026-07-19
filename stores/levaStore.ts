import { create } from 'zustand';
import { CUBE_DEFAULTS, type CubeConfig } from '@/configs/cubeConfig';
import { AUDIO_DEFAULTS, type AudioConfig } from '@/configs/audioConfig';
import { CORE_DEFAULTS, type CoreConfig } from '@/configs/coreConfig';
import { PARTICLES_DEFAULTS, type ParticlesConfig } from '@/configs/particlesConfig';
import { BLOOM_DEFAULTS, type BloomConfig } from '@/configs/bloomConfig';
import { FX_DEFAULTS, type FxConfig } from '@/configs/fxConfig';
import { LASERS_DEFAULTS, type LasersConfig } from '@/configs/lasersConfig';
import { RING_DEFAULTS, type RingConfig } from '@/configs/ringConfig';
import { STARS_DEFAULTS, type StarsConfig } from '@/configs/starsConfig';

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
  fx: FxConfig;
  setFx: (fx: FxConfig) => void;
  lasers: LasersConfig;
  setLasers: (lasers: LasersConfig) => void;
  ring: RingConfig;
  setRing: (ring: RingConfig) => void;
  stars: StarsConfig;
  setStars: (stars: StarsConfig) => void;
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
  fx: FX_DEFAULTS,
  setFx: (fx) => set({ fx }),
  lasers: LASERS_DEFAULTS,
  setLasers: (lasers) => set({ lasers }),
  ring: RING_DEFAULTS,
  setRing: (ring) => set({ ring }),
  stars: STARS_DEFAULTS,
  setStars: (stars) => set({ stars }),
}));
