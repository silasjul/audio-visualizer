import { useEffect } from 'react';
import { useControls } from 'leva';
import { STARS_DEFAULTS } from '@/configs/starsConfig';
import { useLevaStore } from '@/stores/levaStore';

export function useStarsTweaks() {
  const setConfig = useLevaStore((s) => s.setStars);

  const { size, brightness } = useControls(
    'Stars',
    {
      size: { value: STARS_DEFAULTS.size, min: 0.1, max: 2, step: 0.05 },
      brightness: { value: STARS_DEFAULTS.brightness, min: 0, max: 3, step: 0.05 },
    },
    { collapsed: true }
  );

  useEffect(() => {
    setConfig({ size, brightness });
  }, [setConfig, size, brightness]);
}
