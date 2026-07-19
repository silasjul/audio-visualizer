import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Bloom, EffectComposer, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode, type BloomEffect } from 'postprocessing';
import { useLevaStore } from '@/stores/levaStore';
import { BLOOM_DEFAULTS } from '@/configs/bloomConfig';
import type { LevelsRef } from '@/hooks/useAudioAnalyser';

// bloom values are applied imperatively per frame instead of via props:
// changed props would make <Bloom> rebuild its BloomEffect and re-render
// <primitive>, which crashes Next 16's dev log serialization on the
// circular effect graph — and a React re-render per slider tick is waste anyway
export default function Effects({ levels }: { levels: LevelsRef }) {
  const bloom = useRef<BloomEffect>(null);

  useFrame(() => {
    const effect = bloom.current;
    if (!effect) return;
    const cfg = useLevaStore.getState().bloom;
    const a = levels.current;
    effect.intensity = cfg.intensity + a.bass * cfg.punch + a.beat * cfg.punch * 0.6;
    effect.luminanceMaterial.threshold = cfg.threshold;
    effect.mipmapBlurPass.radius = cfg.radius;
  });

  return (
    <EffectComposer multisampling={0}>
      <Bloom
        ref={bloom}
        mipmapBlur
        intensity={BLOOM_DEFAULTS.intensity}
        luminanceThreshold={BLOOM_DEFAULTS.threshold}
        luminanceSmoothing={0.15}
        radius={BLOOM_DEFAULTS.radius}
      />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}
