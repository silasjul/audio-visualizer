import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useLevaStore } from '@/stores/levaStore';
import { PALETTES } from '@/configs/palettes';
import type { LevelsRef } from '@/hooks/useAudioAnalyser';
import { particleFragment, particleVertex } from './particleShaders';

// audio → visual coupling strengths
const FLOW_BASS_BOOST = 1.2;
const FLOW_BEAT_BOOST = 0.5;
const BRIGHTNESS_FLOOR = 0.55;
const BRIGHTNESS_LEVEL_BOOST = 1.4;
const BRIGHTNESS_BEAT_BOOST = 0.8;

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildAttributes(count: number) {
  const rand = mulberry32(20260719);
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = rand();
    positions[i * 3 + 1] = rand();
    positions[i * 3 + 2] = rand();
    seeds[i * 4] = rand();
    seeds[i * 4 + 1] = rand();
    seeds[i * 4 + 2] = rand();
    seeds[i * 4 + 3] = rand();
  }
  return { positions, seeds };
}

export default function Particles({ levels }: { levels: LevelsRef }) {
  const cfg = useLevaStore((s) => s.particles);
  const palette = PALETTES[useLevaStore((s) => s.core.palette)];
  const material = useRef<THREE.ShaderMaterial>(null);
  const flowTime = useRef(0);
  const scaleMod = useRef(1);
  const baseColors = useRef({ a: new THREE.Color(), b: new THREE.Color(), hot: new THREE.Color() });

  const { positions, seeds } = useMemo(() => buildAttributes(cfg.count), [cfg.count]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uNoiseScale: { value: 0.5 },
      uNoiseAmp: { value: 0.7 },
      uSize: { value: 0.14 },
      uBass: { value: 0 },
      uTreble: { value: 0 },
      uBeat: { value: 0 },
      uEnergy: { value: 1 },
      uTension: { value: 0 },
      uBrightness: { value: 1 },
      uHueShift: { value: 0 },
      uColorA: { value: new THREE.Color() },
      uColorB: { value: new THREE.Color() },
      uColorHot: { value: new THREE.Color() },
    }),
    []
  );

  useEffect(() => {
    baseColors.current.a.set(palette.particleA);
    baseColors.current.b.set(palette.particleB);
    baseColors.current.hot.set(palette.hot);
  }, [palette]);

  useFrame((_, dt) => {
    const mat = material.current;
    if (!mat) return;
    const a = levels.current;
    const energy = a.styleEnergy;
    // chill sections crawl, hype sections race
    flowTime.current +=
      dt *
      cfg.flowSpeed *
      (0.2 + 0.6 * energy + a.styleTension * 1.5 + a.bass * FLOW_BASS_BOOST + a.beat * FLOW_BEAT_BOOST);
    // eased slowly: positions are a pure function of noiseScale, so fast changes would
    // teleport particles instead of morphing the flow
    const scaleTarget = 0.45 + 0.55 * energy + a.styleTension * 0.35;
    scaleMod.current += (scaleTarget - scaleMod.current) * (1 - Math.exp(-dt * 1.2));
    const u = mat.uniforms;
    u.uTime.value = flowTime.current;
    u.uNoiseScale.value = cfg.noiseScale * scaleMod.current;
    u.uNoiseAmp.value = cfg.noiseAmp * (0.75 + 0.45 * energy);
    u.uSize.value = cfg.size;
    u.uBass.value = a.bass;
    u.uTreble.value = a.treble;
    u.uBeat.value = a.beat;
    u.uEnergy.value = energy;
    u.uTension.value = a.styleTension;
    u.uBrightness.value =
      cfg.brightness *
      (BRIGHTNESS_FLOOR + a.level * BRIGHTNESS_LEVEL_BOOST + a.beat * BRIGHTNESS_BEAT_BOOST) *
      (0.55 + 0.55 * energy);
    u.uHueShift.value = a.hueDrift * Math.PI * 2;
    const base = baseColors.current;
    u.uColorA.value.copy(base.a).offsetHSL(a.styleHue, a.styleSat, a.styleLight);
    u.uColorB.value.copy(base.b).offsetHSL(a.styleHue, a.styleSat, a.styleLight);
    u.uColorHot.value.copy(base.hot);
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry key={cfg.count}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSeed" args={[seeds, 4]} />
      </bufferGeometry>
      <shaderMaterial
        ref={material}
        vertexShader={particleVertex}
        fragmentShader={particleFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
