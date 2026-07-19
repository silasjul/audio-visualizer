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
  const wire = useRef<THREE.Mesh>(null);
  const cfg = useLevaStore((s) => s.core);
  const palette = PALETTES[cfg.palette];

  const rimUniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color() },
      uIntensity: { value: 0.35 },
    }),
    []
  );

  const baseColors = useRef({
    color: new THREE.Color(),
    emissive: new THREE.Color(),
    rim: new THREE.Color(),
  });

  useEffect(() => {
    baseColors.current.color.set(palette.core);
    baseColors.current.emissive.set(palette.coreEmissive);
    baseColors.current.rim.set(palette.rim);
  }, [palette]);

  useFrame(({ clock }, dt) => {
    const a = levels.current;
    const energy = a.styleEnergy;
    const hue = a.styleHue + a.hueDrift;
    const glowScale = 0.55 + 0.55 * energy;
    const idle = 0.05 * Math.sin(clock.elapsedTime * 1.4);
    const scale =
      cfg.baseScale * (1 + idle + a.bass * cfg.bassPulse * (0.55 + 0.55 * energy) + a.beat * 0.18);
    group.current?.scale.setScalar(scale);
    const base = baseColors.current;
    if (material.current) {
      material.current.emissiveIntensity =
        (cfg.glow + a.bass * cfg.glowPunch + a.beat * cfg.glowPunch * 0.8) * glowScale;
      material.current.distort = cfg.distort + a.bass * 0.35 + a.styleTension * 0.18;
      material.current.color.copy(base.color).offsetHSL(hue, a.styleSat, a.styleLight);
      material.current.emissive.copy(base.emissive).offsetHSL(hue, a.styleSat, a.styleLight);
    }
    if (rim.current) {
      rim.current.uniforms.uIntensity.value =
        (0.35 + a.treble * 1.1 + a.beat * 0.9) * (0.6 + 0.5 * energy);
      rim.current.uniforms.uColor.value.copy(base.rim).offsetHSL(hue, a.styleSat, a.styleLight);
    }
    if (wire.current) {
      wire.current.rotation.y -= dt * (0.15 + energy * 0.25 + a.beat * 0.6);
      wire.current.rotation.x += dt * 0.07;
      const m = wire.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.07 + a.treble * 0.5 + a.beat * 0.3;
      m.color.copy(base.rim).offsetHSL(hue + 0.12, a.styleSat, a.styleLight);
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
      <mesh ref={wire} scale={1.5}>
        <icosahedronGeometry args={[0.85, 1]} />
        <meshBasicMaterial
          wireframe
          transparent
          opacity={0.08}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
