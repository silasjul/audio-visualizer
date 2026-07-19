'use client';

import { useEffect, useState } from 'react';
import { button, Leva, useControls } from 'leva';
import { useLevaStore } from '@/stores/levaStore';
import { useAudioTweaks } from '@/hooks/leva/useAudioTweaks';
import { useCoreTweaks } from '@/hooks/leva/useCoreTweaks';
import { useParticlesTweaks } from '@/hooks/leva/useParticlesTweaks';
import { useBloomTweaks } from '@/hooks/leva/useBloomTweaks';
import { useFxTweaks } from '@/hooks/leva/useFxTweaks';
import { useLasersTweaks } from '@/hooks/leva/useLasersTweaks';
import { useRingTweaks } from '@/hooks/leva/useRingTweaks';
import { useStarsTweaks } from '@/hooks/leva/useStarsTweaks';

export default function LevaControls() {
  useAudioTweaks();
  useCoreTweaks();
  useParticlesTweaks();
  useBloomTweaks();
  useFxTweaks();
  useLasersTweaks();
  useRingTweaks();
  useStarsTweaks();

  useControls({
    'log configs': button(() => {
      const { cube, audio, core, particles, bloom, fx, lasers, ring, stars } =
        useLevaStore.getState();
      console.log({ cube, audio, core, particles, bloom, fx, lasers, ring, stars });
    }),
  });

  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'h') return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      setHidden((prev) => !prev);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return <Leva hidden={hidden} />;
}
