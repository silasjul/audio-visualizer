import { useEffect } from 'react';
import { useControls } from 'leva';
import { RING_DEFAULTS } from '@/configs/ringConfig';
import { useLevaStore } from '@/stores/levaStore';

export function useRingTweaks() {
  const setConfig = useLevaStore((s) => s.setRing);

  const { radius, height, brightness } = useControls(
    'Ring',
    {
      radius: { value: RING_DEFAULTS.radius, min: 1, max: 4, step: 0.05 },
      height: { value: RING_DEFAULTS.height, min: 0, max: 3, step: 0.05 },
      brightness: { value: RING_DEFAULTS.brightness, min: 0, max: 3, step: 0.05 },
    },
    { collapsed: true }
  );

  useEffect(() => {
    setConfig({ radius, height, brightness });
  }, [setConfig, radius, height, brightness]);
}
