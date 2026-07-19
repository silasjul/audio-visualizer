import { useEffect } from 'react';
import { useControls } from 'leva';
import { CORE_DEFAULTS } from '@/configs/coreConfig';
import { PALETTES, type PaletteName } from '@/configs/palettes';
import { useLevaStore } from '@/stores/levaStore';

export function useCoreTweaks() {
  const setConfig = useLevaStore((s) => s.setCore);

  const { palette, baseScale, bassPulse, glow, glowPunch, distort, distortSpeed } = useControls(
    'Core',
    {
      palette: {
        value: CORE_DEFAULTS.palette as PaletteName,
        options: Object.keys(PALETTES) as PaletteName[],
      },
      baseScale: { value: CORE_DEFAULTS.baseScale, min: 0.3, max: 2, step: 0.05, label: 'base scale' },
      bassPulse: { value: CORE_DEFAULTS.bassPulse, min: 0, max: 1.5, step: 0.05, label: 'bass pulse' },
      glow: { value: CORE_DEFAULTS.glow, min: 0, max: 6, step: 0.1 },
      glowPunch: { value: CORE_DEFAULTS.glowPunch, min: 0, max: 15, step: 0.5, label: 'glow punch' },
      distort: { value: CORE_DEFAULTS.distort, min: 0, max: 0.8, step: 0.01 },
      distortSpeed: {
        value: CORE_DEFAULTS.distortSpeed,
        min: 0,
        max: 6,
        step: 0.1,
        label: 'distort speed',
      },
    },
    { collapsed: true }
  );

  useEffect(() => {
    setConfig({ palette, baseScale, bassPulse, glow, glowPunch, distort, distortSpeed });
  }, [setConfig, palette, baseScale, bassPulse, glow, glowPunch, distort, distortSpeed]);
}
