import { useEffect } from 'react';
import { useControls } from 'leva';
import { AUDIO_DEFAULTS } from '@/configs/audioConfig';
import { useLevaStore } from '@/stores/levaStore';

export function useAudioTweaks() {
  const setConfig = useLevaStore((s) => s.setAudio);

  const { attack, release, beatSensitivity, beatCooldown } = useControls(
    'Audio',
    {
      attack: { value: AUDIO_DEFAULTS.attack, min: 0.05, max: 0.99, step: 0.01 },
      release: { value: AUDIO_DEFAULTS.release, min: 0.01, max: 0.5, step: 0.01 },
      beatSensitivity: {
        value: AUDIO_DEFAULTS.beatSensitivity,
        min: 1.05,
        max: 2.5,
        step: 0.05,
        label: 'beat sensitivity',
      },
      beatCooldown: {
        value: AUDIO_DEFAULTS.beatCooldown,
        min: 0.1,
        max: 1,
        step: 0.01,
        label: 'beat cooldown',
      },
    },
    { collapsed: true }
  );

  useEffect(() => {
    setConfig({ attack, release, beatSensitivity, beatCooldown });
  }, [setConfig, attack, release, beatSensitivity, beatCooldown]);
}
