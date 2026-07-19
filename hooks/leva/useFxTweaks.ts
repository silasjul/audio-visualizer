import { useEffect } from 'react';
import { useControls } from 'leva';
import { FX_DEFAULTS } from '@/configs/fxConfig';
import { useLevaStore } from '@/stores/levaStore';

export function useFxTweaks() {
  const setConfig = useLevaStore((s) => s.setFx);

  const { glow, glowPunch, darkness, chroma, chromaPunch, grain } = useControls(
    'Fx',
    {
      glow: { value: FX_DEFAULTS.glow, min: 0, max: 0.5, step: 0.01, label: 'edge glow' },
      glowPunch: { value: FX_DEFAULTS.glowPunch, min: 0, max: 1.5, step: 0.05, label: 'glow punch' },
      darkness: { value: FX_DEFAULTS.darkness, min: 0, max: 1, step: 0.01, label: 'vignette' },
      chroma: { value: FX_DEFAULTS.chroma, min: 0, max: 0.005, step: 0.0001, label: 'rgb split' },
      chromaPunch: {
        value: FX_DEFAULTS.chromaPunch,
        min: 0,
        max: 0.02,
        step: 0.0005,
        label: 'split punch',
      },
      grain: { value: FX_DEFAULTS.grain, min: 0, max: 1, step: 0.01 },
    },
    { collapsed: true }
  );

  useEffect(() => {
    setConfig({ glow, glowPunch, darkness, chroma, chromaPunch, grain });
  }, [setConfig, glow, glowPunch, darkness, chroma, chromaPunch, grain]);
}
