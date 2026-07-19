'use client';

import { memo, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useAudioAnalyser, type LevelsRef } from '@/hooks/useAudioAnalyser';
import { useLevaStore } from '@/stores/levaStore';
import { PALETTES } from '@/configs/palettes';
import Core from './Core';
import Particles from './Particles';
import Effects from './Effects';
import SpectrumRing from './SpectrumRing';
import Starfield from './Starfield';
import Lasers from './Lasers';
import CameraRig from './CameraRig';
import AudioControls from './AudioControls';

const CAMERA = { position: [0, 1.2, 7] as [number, number, number], fov: 55 };
const DPR: [number, number] = [1, 1.75];
const GL = { antialias: false, powerPreference: 'high-performance' as const };

function AudioFrame({ update }: { update: (dt: number) => void }) {
  useFrame((_, dt) => update(dt), -1);
  return null;
}

function Backdrop({ levels }: { levels: LevelsRef }) {
  const palette = PALETTES[useLevaStore((s) => s.core.palette)];
  const scratch = useMemo(() => new THREE.Color(), []);

  useFrame(({ scene }) => {
    const a = levels.current;
    scratch
      .set(palette.background)
      .offsetHSL(a.styleHue + a.hueDrift, 0.04 * a.styleEnergy, a.beat * 0.012 + a.styleTension * 0.02);
    if (scene.background instanceof THREE.Color) scene.background.copy(scratch);
    if (scene.fog) scene.fog.color.copy(scratch);
  });

  return (
    <>
      <color attach="background" args={[palette.background]} />
      <fogExp2 attach="fog" args={[palette.background, 0.045]} />
    </>
  );
}

// memoized so audio UI state changes (play/pause, track name) never re-render
// the Canvas tree — its only props are a stable ref and a stable callback
const VisualizerScene = memo(function VisualizerScene({
  levels,
  update,
}: {
  levels: LevelsRef;
  update: (dt: number) => void;
}) {
  return (
    <Canvas camera={CAMERA} dpr={DPR} gl={GL}>
      <Backdrop levels={levels} />
      <AudioFrame update={update} />
      <ambientLight intensity={0.15} />
      <Core levels={levels} />
      <Particles levels={levels} />
      <SpectrumRing levels={levels} />
      <Starfield levels={levels} />
      <Lasers levels={levels} />
      <CameraRig levels={levels} />
      <Effects levels={levels} />
      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.05}
        autoRotate
        autoRotateSpeed={0.5}
        minDistance={3}
        maxDistance={14}
      />
    </Canvas>
  );
});

export default function Visualizer() {
  const audio = useAudioAnalyser();

  return (
    <div className="relative h-full w-full">
      <VisualizerScene levels={audio.levels} update={audio.update} />
      <AudioControls
        isPlaying={audio.isPlaying}
        trackName={audio.trackName}
        duration={audio.duration}
        currentTime={audio.currentTime}
        onFile={audio.loadFile}
        onToggle={audio.togglePlay}
        onSeek={audio.seek}
      />
    </div>
  );
}
