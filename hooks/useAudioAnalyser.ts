'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioEngine, createLevels } from '@/lib/audio/audioEngine';
import { useLevaStore } from '@/stores/levaStore';

export function useAudioAnalyser() {
  const engineRef = useRef<AudioEngine | null>(null);
  const elementRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const levelsRef = useRef(createLevels());
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackName, setTrackName] = useState<string | null>(null);

  const loadFile = useCallback(async (file: File) => {
    // engine (and its AudioContext) is created lazily here, inside a user gesture
    if (!engineRef.current) engineRef.current = new AudioEngine();
    const engine = engineRef.current;
    await engine.resume();

    if (!elementRef.current) {
      const el = new Audio();
      el.preload = 'auto';
      el.addEventListener('ended', () => setIsPlaying(false));
      elementRef.current = el;
      // createMediaElementSource only works once per element, so the element is reused across files
      engine.connectMediaElement(el);
    }

    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = URL.createObjectURL(file);
    elementRef.current.src = urlRef.current;
    setTrackName(file.name);

    try {
      await elementRef.current.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  }, []);

  const togglePlay = useCallback(async () => {
    const el = elementRef.current;
    if (!el || !el.src) return;
    if (el.paused) {
      await engineRef.current?.resume();
      try {
        await el.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    } else {
      el.pause();
      setIsPlaying(false);
    }
  }, []);

  const update = useCallback((dt: number) => {
    engineRef.current?.update(dt, useLevaStore.getState().audio, levelsRef.current);
  }, []);

  useEffect(
    () => () => {
      elementRef.current?.pause();
      engineRef.current?.dispose();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    []
  );

  // levels is the ref object itself — consumers read .current inside useFrame, never during render
  return {
    levels: levelsRef,
    update,
    loadFile,
    togglePlay,
    isPlaying,
    trackName,
  };
}

export type AudioAnalyser = ReturnType<typeof useAudioAnalyser>;
export type LevelsRef = AudioAnalyser['levels'];
