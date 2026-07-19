import { useEffect, useMemo, useRef, type ComponentRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { useLevaStore } from '@/stores/levaStore';
import { PALETTES } from '@/configs/palettes';
import type { LevelsRef } from '@/hooks/useAudioAnalyser';

const rimVertex = /* glsl */ `
varying vec3 vNormal;
varying vec3 vView;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vView = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}
`;

const rimFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uIntensity;
varying vec3 vNormal;
varying vec3 vView;

void main() {
  float fresnel = pow(1.0 - abs(dot(normalize(vView), normalize(vNormal))), 3.0);
  gl_FragColor = vec4(uColor * fresnel * uIntensity, fresnel);
}
`;

export default function Core({ levels }: { levels: LevelsRef }) {
  const group = useRef<THREE.Group>(null);
  const material = useRef<ComponentRef<typeof MeshDistortMaterial>>(null);
  const rim = useRef<THREE.ShaderMaterial>(null);
  const cfg = useLevaStore((s) => s.core);
  const palette = PALETTES[cfg.palette];

  const rimUniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color() },
      uIntensity: { value: 0.35 },
    }),
    []
  );

  useEffect(() => {
    rim.current?.uniforms.uColor.value.set(palette.rim);
  }, [palette]);

  useFrame(({ clock }) => {
    const a = levels.current;
    const idle = 0.05 * Math.sin(clock.elapsedTime * 1.4);
    const scale = cfg.baseScale * (1 + idle + a.bass * cfg.bassPulse + a.beat * 0.18);
    group.current?.scale.setScalar(scale);
    if (material.current) {
      material.current.emissiveIntensity =
        cfg.glow + a.bass * cfg.glowPunch + a.beat * cfg.glowPunch * 0.8;
      material.current.distort = cfg.distort + a.bass * 0.35;
    }
    if (rim.current) {
      rim.current.uniforms.uIntensity.value = 0.35 + a.treble * 1.1 + a.beat * 0.9;
    }
  });

  return (
    <group ref={group}>
      <mesh>
        <icosahedronGeometry args={[0.85, 20]} />
        <MeshDistortMaterial
          ref={material}
          color={palette.core}
          emissive={palette.coreEmissive}
          emissiveIntensity={cfg.glow}
          roughness={0.25}
          metalness={0.1}
          distort={cfg.distort}
          speed={cfg.distortSpeed}
          toneMapped={false}
        />
      </mesh>
      <mesh scale={1.25}>
        <sphereGeometry args={[0.85, 48, 48]} />
        <shaderMaterial
          ref={rim}
          vertexShader={rimVertex}
          fragmentShader={rimFragment}
          uniforms={rimUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}
