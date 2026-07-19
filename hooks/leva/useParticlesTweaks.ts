import { useEffect } from 'react';
import { useControls } from 'leva';
import { PARTICLES_DEFAULTS } from '@/configs/particlesConfig';
import { useLevaStore } from '@/stores/levaStore';

export function useParticlesTweaks() {
  const setConfig = useLevaStore((s) => s.setParticles);

  const { count, size, brightness, flowSpeed, noiseScale, noiseAmp } = useControls(
    'Particles',
    {
      count: { value: PARTICLES_DEFAULTS.count, min: 1000, max: 100000, step: 1000 },
      size: { value: PARTICLES_DEFAULTS.size, min: 0.03, max: 0.5, step: 0.01 },
      brightness: { value: PARTICLES_DEFAULTS.brightness, min: 0, max: 4, step: 0.05 },
      flowSpeed: { value: PARTICLES_DEFAULTS.flowSpeed, min: 0, max: 2, step: 0.05, label: 'flow speed' },
      noiseScale: { value: PARTICLES_DEFAULTS.noiseScale, min: 0.1, max: 2, step: 0.05, label: 'noise scale' },
      noiseAmp: { value: PARTICLES_DEFAULTS.noiseAmp, min: 0, max: 3, step: 0.05, label: 'noise amp' },
    },
    { collapsed: true }
  );

  useEffect(() => {
    setConfig({ count, size, brightness, flowSpeed, noiseScale, noiseAmp });
  }, [setConfig, count, size, brightness, flowSpeed, noiseScale, noiseAmp]);
}
