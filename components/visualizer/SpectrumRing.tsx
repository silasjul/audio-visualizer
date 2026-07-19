import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useLevaStore } from '@/stores/levaStore';
import { PALETTES } from '@/configs/palettes';
import { SPECTRUM_BANDS } from '@/lib/audio/audioEngine';
import type { LevelsRef } from '@/hooks/useAudioAnalyser';

// spectrum is mirrored around the circle so the ring loops seamlessly
const BARS = SPECTRUM_BANDS * 2;
const HUE_SPAN = 0.45;

export default function SpectrumRing({ levels }: { levels: LevelsRef }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const group = useRef<THREE.Group>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);
  const baseHue = useRef(0.75);
  const paletteName = useLevaStore((s) => s.core.palette);

  useEffect(() => {
    const hsl = { h: 0, s: 0, l: 0 };
    new THREE.Color(PALETTES[paletteName].particleB).getHSL(hsl);
    baseHue.current = hsl.h;
  }, [paletteName]);

  useFrame((_, dt) => {
    const m = mesh.current;
    if (!m) return;
    const a = levels.current;
    if (group.current) {
      group.current.rotation.y += dt * (0.1 + a.styleEnergy * 0.15 + a.styleTension * 0.6);
    }
    const cfg = useLevaStore.getState().ring;
    const boost = 0.55 + a.styleEnergy * 0.45;
    for (let i = 0; i < BARS; i++) {
      const band = i < SPECTRUM_BANDS ? i : BARS - 1 - i;
      const v = a.spectrum[band];
      const angle = (i / BARS) * Math.PI * 2;
      dummy.position.set(Math.cos(angle) * cfg.radius, 0, Math.sin(angle) * cfg.radius);
      dummy.rotation.set(0, -angle, 0);
      dummy.scale.set(1, (0.1 + v * v * 2.6 * boost + a.beat * 0.15) * cfg.height, 1);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      const hue = baseHue.current + a.styleHue + a.hueDrift + (band / SPECTRUM_BANDS) * HUE_SPAN;
      color
        .setHSL(hue, 0.85, 0.55 + v * 0.2)
        .multiplyScalar((0.35 + v * 2.2 + a.beat * 0.5) * cfg.brightness);
      m.setColorAt(i, color);
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });

  return (
    <group ref={group} rotation={[0.12, 0, 0]}>
      <instancedMesh ref={mesh} args={[undefined, undefined, BARS]} frustumCulled={false}>
        <boxGeometry args={[0.05, 0.5, 0.05]} />
        <meshBasicMaterial
          transparent
          opacity={0.9}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </instancedMesh>
    </group>
  );
}
