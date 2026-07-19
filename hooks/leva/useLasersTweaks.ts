import { useEffect } from 'react';
import { useControls } from 'leva';
import { LASERS_DEFAULTS } from '@/configs/lasersConfig';
import { useLevaStore } from '@/stores/levaStore';

export function useLasersTweaks() {
  const setConfig = useLevaStore((s) => s.setLasers);

  const { intensity, brightness, sweep, threshold } = useControls(
    'Lasers',
    {
      intensity: { value: LASERS_DEFAULTS.intensity, min: 0, max: 3, step: 0.05 },
      brightness: { value: LASERS_DEFAULTS.brightness, min: 0, max: 3, step: 0.05 },
      sweep: { value: LASERS_DEFAULTS.sweep, min: 0, max: 3, step: 0.05, label: 'sweep speed' },
      threshold: { value: LASERS_DEFAULTS.threshold, min: 0, max: 1, step: 0.01 },
    },
    { collapsed: true }
  );

  useEffect(() => {
    setConfig({ intensity, brightness, sweep, threshold });
  }, [setConfig, intensity, brightness, sweep, threshold]);
}
