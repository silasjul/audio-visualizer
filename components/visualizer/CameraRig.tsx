import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { PerspectiveCamera } from 'three';
import type { LevelsRef } from '@/hooks/useAudioAnalyser';

const BASE_FOV = 55;

export default function CameraRig({ levels }: { levels: LevelsRef }) {
  const fov = useRef(BASE_FOV);

  useFrame((state, dt) => {
    const a = levels.current;
    // buildups slowly zoom in (tension), beats punch the fov back out
    const target = BASE_FOV - a.styleTension * 8 + a.beat * (2 + a.styleEnergy * 1.5);
    fov.current += (target - fov.current) * (1 - Math.exp(-dt * 7));
    const cam = state.camera as PerspectiveCamera;
    if (Math.abs(cam.fov - fov.current) > 0.01) {
      cam.fov = fov.current;
      cam.updateProjectionMatrix();
    }
    const controls = state.controls as unknown as { autoRotateSpeed: number } | null;
    if (controls) {
      controls.autoRotateSpeed = 0.3 + a.styleEnergy * 0.45 + a.styleTension * 1.7;
    }
  });

  return null;
}
