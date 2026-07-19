import { useEffect } from 'react';
import { useControls } from 'leva';
import { BLOOM_DEFAULTS } from '@/configs/bloomConfig';
import { useLevaStore } from '@/stores/levaStore';

export function useBloomTweaks() {
  const setConfig = useLevaStore((s) => s.setBloom);

  const { intensity, punch, threshold, radius } = useControls(
    'Bloom',
    {
      intensity: { value: BLOOM_DEFAULTS.intensity, min: 0, max: 5, step: 0.05 },
      punch: { value: BLOOM_DEFAULTS.punch, min: 0, max: 5, step: 0.05 },
      threshold: { value: BLOOM_DEFAULTS.threshold, min: 0, max: 1, step: 0.01 },
      radius: { value: BLOOM_DEFAULTS.radius, min: 0.1, max: 1, step: 0.01 },
    },
    { collapsed: true }
  );

  useEffect(() => {
    setConfig({ intensity, punch, threshold, radius });
  }, [setConfig, intensity, punch, threshold, radius]);
}
