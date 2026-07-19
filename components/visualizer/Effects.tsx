import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
  Noise,
  ToneMapping,
  Vignette,
} from '@react-three/postprocessing';
import {
  BlendFunction,
  Effect,
  ToneMappingMode,
  type BloomEffect,
  type ChromaticAberrationEffect,
  type NoiseEffect,
  type VignetteEffect,
} from 'postprocessing';
import * as THREE from 'three';
import { useLevaStore } from '@/stores/levaStore';
import { PALETTES } from '@/configs/palettes';
import { BLOOM_DEFAULTS } from '@/configs/bloomConfig';
import { FX_DEFAULTS } from '@/configs/fxConfig';
import type { LevelsRef } from '@/hooks/useAudioAnalyser';

const CHROMA_OFFSET = new THREE.Vector2(0.0006, 0.0003);

const vignetteGlowFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uStrength;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  float vig = smoothstep(0.3, 0.85, distance(uv, vec2(0.5)));
  outputColor = vec4(uColor * vig * uStrength, inputColor.a);
}
`;

// edge glow tinted with the core's live color, pulsing with the music
class VignetteGlowEffect extends Effect {
  readonly color: THREE.Color;

  constructor() {
    const color = new THREE.Color();
    super('VignetteGlowEffect', vignetteGlowFragment, {
      blendFunction: BlendFunction.ADD,
      uniforms: new Map<string, THREE.Uniform>([
        ['uColor', new THREE.Uniform(color)],
        ['uStrength', new THREE.Uniform(0)],
      ]),
    });
    this.color = color;
  }

  set strength(v: number) {
    this.uniforms.get('uStrength')!.value = v;
  }
}

// bloom values are applied imperatively per frame instead of via props:
// changed props would make <Bloom> rebuild its BloomEffect and re-render
// <primitive>, which crashes Next 16's dev log serialization on the
// circular effect graph — and a React re-render per slider tick is waste anyway
export default function Effects({ levels }: { levels: LevelsRef }) {
  const bloom = useRef<BloomEffect>(null);
  const chroma = useRef<ChromaticAberrationEffect>(null);
  const grain = useRef<NoiseEffect>(null);
  const vignette = useRef<VignetteEffect>(null);
  const vignetteGlow = useRef<VignetteGlowEffect>(null);
  const glowInstance = useMemo(() => new VignetteGlowEffect(), []);

  useFrame(() => {
    const effect = bloom.current;
    const a = levels.current;
    if (effect) {
      const cfg = useLevaStore.getState().bloom;
      effect.intensity =
        cfg.intensity * (0.75 + 0.4 * a.styleEnergy) + a.bass * cfg.punch + a.beat * cfg.punch * 0.6;
      effect.luminanceMaterial.threshold = cfg.threshold;
      effect.mipmapBlurPass.radius = cfg.radius;
    }
    const fx = useLevaStore.getState().fx;
    if (chroma.current) {
      const off =
        fx.chroma +
        a.beat * fx.chromaPunch +
        a.bass * fx.chromaPunch * 0.18 +
        a.styleTension * fx.chromaPunch * 0.33;
      chroma.current.offset.set(off, off * 0.5);
    }
    if (grain.current) grain.current.blendMode.opacity.value = fx.grain;
    if (vignette.current) vignette.current.darkness = fx.darkness;
    const glow = vignetteGlow.current;
    if (glow) {
      const palette = PALETTES[useLevaStore.getState().core.palette];
      glow.color
        .set(palette.coreEmissive)
        .offsetHSL(a.styleHue + a.hueDrift, a.styleSat, a.styleLight);
      glow.strength =
        (fx.glow + a.bass * fx.glowPunch + a.beat * fx.glowPunch * 0.75) *
        (0.5 + 0.5 * a.styleEnergy);
    }
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
      <ChromaticAberration
        ref={chroma}
        offset={CHROMA_OFFSET}
        radialModulation
        modulationOffset={0.4}
      />
      <Noise ref={grain} premultiply opacity={FX_DEFAULTS.grain} />
      <Vignette ref={vignette} eskil={false} offset={0.15} darkness={FX_DEFAULTS.darkness} />
      <primitive ref={vignetteGlow} object={glowInstance} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}
