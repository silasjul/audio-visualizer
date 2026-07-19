import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useLevaStore } from '@/stores/levaStore';
import { PALETTES } from '@/configs/palettes';
import type { LevelsRef } from '@/hooks/useAudioAnalyser';

const COUNT = 1500;
const MIN_RADIUS = 20;
const MAX_RADIUS = 55;

const starVertex = /* glsl */ `
uniform float uTime;
uniform float uSize;

attribute vec4 aRand;

varying float vTwinkle;
varying float vTint;

void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  vTwinkle = 0.55 + 0.45 * sin(uTime * mix(0.4, 1.8, aRand.y) + aRand.x * 6.2831853);
  vTint = aRand.w;
  gl_PointSize = uSize * mix(0.5, 1.7, aRand.z) * (160.0 / -mv.z);
}
`;

const starFragment = /* glsl */ `
uniform vec3 uTint;
uniform float uBrightness;

varying float vTwinkle;
varying float vTint;

void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float falloff = max(1.0 - d, 0.0);
  float alpha = pow(falloff, 3.0) * vTwinkle;
  if (alpha < 0.01) discard;
  vec3 col = mix(vec3(1.0), uTint, vTint * 0.85);
  gl_FragColor = vec4(col * uBrightness * alpha, alpha);
}
`;

function buildStars() {
  let seed = 987654321;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const positions = new Float32Array(COUNT * 3);
  const rands = new Float32Array(COUNT * 4);
  for (let i = 0; i < COUNT; i++) {
    const dir = new THREE.Vector3(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1).normalize();
    const r = MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * rand();
    positions[i * 3] = dir.x * r;
    positions[i * 3 + 1] = dir.y * r;
    positions[i * 3 + 2] = dir.z * r;
    rands[i * 4] = rand();
    rands[i * 4 + 1] = rand();
    rands[i * 4 + 2] = rand();
    rands[i * 4 + 3] = rand();
  }
  return { positions, rands };
}

export default function Starfield({ levels }: { levels: LevelsRef }) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const baseTint = useRef(new THREE.Color());
  const palette = PALETTES[useLevaStore((s) => s.core.palette)];

  const { positions, rands } = useMemo(() => buildStars(), []);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: 0.55 },
      uTint: { value: new THREE.Color() },
      uBrightness: { value: 0.6 },
    }),
    []
  );

  useEffect(() => {
    baseTint.current.set(palette.rim);
  }, [palette]);

  useFrame((_, dt) => {
    const mat = material.current;
    if (!mat) return;
    const a = levels.current;
    const cfg = useLevaStore.getState().stars;
    mat.uniforms.uTime.value += dt * (1 + a.styleEnergy * 0.5);
    mat.uniforms.uSize.value = cfg.size;
    mat.uniforms.uBrightness.value = (0.45 + a.level * 0.9 + a.beat * 0.35) * cfg.brightness;
    mat.uniforms.uTint.value
      .copy(baseTint.current)
      .offsetHSL(a.styleHue + a.hueDrift, 0.1, 0);
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aRand" args={[rands, 4]} />
      </bufferGeometry>
      <shaderMaterial
        ref={material}
        vertexShader={starVertex}
        fragmentShader={starFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
