'use client';

import { useEffect, useState } from 'react';
import { Leva } from 'leva';
import { useAudioTweaks } from '@/hooks/leva/useAudioTweaks';
import { useCoreTweaks } from '@/hooks/leva/useCoreTweaks';
import { useParticlesTweaks } from '@/hooks/leva/useParticlesTweaks';
import { useBloomTweaks } from '@/hooks/leva/useBloomTweaks';

export default function LevaControls() {
  useAudioTweaks();
  useCoreTweaks();
  useParticlesTweaks();
  useBloomTweaks();

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
