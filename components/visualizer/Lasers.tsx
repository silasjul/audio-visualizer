import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useLevaStore } from '@/stores/levaStore';
import { PALETTES } from '@/configs/palettes';
import type { LevelsRef } from '@/hooks/useAudioAnalyser';

const BEAMS = 14;
const LENGTH = 28;
const GOLDEN_ANGLE = 2.399963;

type Beam = {
  yawPhase: number;
  yawSpeed: number;
  dir: number;
  tiltBase: number;
  tiltAmp: number;
  tiltSpeed: number;
  tiltPhase: number;
  hueOff: number;
};

function buildBeams(): Beam[] {
  let seed = 424242;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  return Array.from({ length: BEAMS }, (_, i) => ({
    yawPhase: rand() * Math.PI * 2,
    yawSpeed: 0.25 + rand() * 0.5,
    dir: i % 2 === 0 ? 1 : -1,
    tiltBase: (i % 2 === 0 ? 1 : -1) * (0.85 + rand() * 0.55),
    tiltAmp: 0.2 + rand() * 0.3,
    tiltSpeed: 0.6 + rand() * 0.9,
    tiltPhase: rand() * Math.PI * 2,
    hueOff: (i / BEAMS) * 0.5,
  }));
}

// club lasers: only alive during the song's high-energy sections (chorus / drop),
// sweeping continuously and snapping the whole fan to a new position on each beat
export default function Lasers({ levels }: { levels: LevelsRef }) {
  const group = useRef<THREE.Group>(null);
  const pivots = useRef<(THREE.Group | null)[]>([]);
  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  const beams = useMemo(() => buildBeams(), []);
  const gate = useRef(0);
  const time = useRef(0);
  const lastBeat = useRef(0);
  const snap = useRef(0);
  const snapTarget = useRef(0);
  const baseHue = useRef(0.75);
  const paletteName = useLevaStore((s) => s.core.palette);

  useEffect(() => {
    const hsl = { h: 0, s: 0, l: 0 };
    new THREE.Color(PALETTES[paletteName].coreEmissive).getHSL(hsl);
    baseHue.current = hsl.h;
  }, [paletteName]);

  useFrame((_, dt) => {
    const a = levels.current;
    const cfg = useLevaStore.getState().lasers;
    const lo = 1.1 + cfg.threshold * 0.5;
    const target =
      a.sectionType === 'chorus'
        ? 1
        : THREE.MathUtils.smoothstep(a.styleEnergy, lo, lo + 0.3) * 0.85;
    gate.current += (target - gate.current) * (1 - Math.exp(-dt * 3));

    const g = group.current;
    if (!g) return;
    const visible = gate.current > 0.02 && cfg.intensity > 0;
    g.visible = visible;
    if (!visible) return;

    time.current += dt * cfg.sweep * (0.7 + a.styleEnergy * 0.4 + a.beat * 1.1);
    if (a.beatCount !== lastBeat.current) {
      lastBeat.current = a.beatCount;
      snapTarget.current += GOLDEN_ANGLE;
    }
    snap.current += (snapTarget.current - snap.current) * (1 - Math.exp(-dt * 10));

    const opacity = Math.min(
      1,
      gate.current * cfg.intensity * (0.3 + a.beat * 0.45 + a.treble * 0.2)
    );
    for (let i = 0; i < BEAMS; i++) {
      const pivot = pivots.current[i];
      const mesh = meshes.current[i];
      if (!pivot || !mesh) continue;
      const b = beams[i];
      const yaw = b.yawPhase + time.current * b.yawSpeed * b.dir + snap.current;
      const tilt = b.tiltBase + Math.sin(time.current * b.tiltSpeed + b.tiltPhase) * b.tiltAmp;
      pivot.rotation.set(tilt, yaw, 0, 'YXZ');
      const m = mesh.material as THREE.MeshBasicMaterial;
      m.opacity = opacity;
      m.color
        .setHSL(baseHue.current + a.styleHue + a.hueDrift + b.hueOff, 0.95, 0.55)
        .multiplyScalar((1.2 + a.beat * 1.8 + a.styleEnergy * 0.4) * cfg.brightness);
    }
  });

  return (
    <group ref={group} visible={false}>
      {beams.map((_, i) => (
        <group
          key={i}
          ref={(el) => {
            pivots.current[i] = el;
          }}
        >
          <mesh
            position={[0, LENGTH / 2, 0]}
            ref={(el) => {
              meshes.current[i] = el;
            }}
          >
            <cylinderGeometry args={[0.055, 0.012, LENGTH, 6, 1, true]} />
            <meshBasicMaterial
              transparent
              opacity={0}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
