'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioEngine, createLevels } from '@/lib/audio/audioEngine';
import {
  analyzeSong,
  computeStyleTargets,
  type Section,
  type SectionStyle,
  type SongMap,
} from '@/lib/audio/songAnalysis';
import { useLevaStore } from '@/stores/levaStore';

export function useAudioAnalyser() {
  const engineRef = useRef<AudioEngine | null>(null);
  const elementRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const levelsRef = useRef(createLevels());
  const songMapRef = useRef<SongMap | null>(null);
  const sectionIndexRef = useRef(0);
  const styleScratchRef = useRef<SectionStyle>({ hue: 0, sat: 0, light: 0, energy: 1, tension: 0 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackName, setTrackName] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [sections, setSections] = useState<Section[] | null>(null);

  const loadFile = useCallback(async (file: File) => {
    // engine (and its AudioContext) is created lazily here, inside a user gesture
    if (!engineRef.current) engineRef.current = new AudioEngine();
    const engine = engineRef.current;
    await engine.resume();

    if (!elementRef.current) {
      const el = new Audio();
      el.preload = 'auto';
      el.addEventListener('ended', () => setIsPlaying(false));
      el.addEventListener('durationchange', () => setDuration(el.duration || 0));
      // timeupdate fires ~4x/s — cheap enough for React state, and the Canvas is memo-isolated
      el.addEventListener('timeupdate', () => setCurrentTime(el.currentTime));
      elementRef.current = el;
      // createMediaElementSource only works once per element, so the element is reused across files
      engine.connectMediaElement(el);
    }

    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = URL.createObjectURL(file);
    elementRef.current.src = urlRef.current;
    setTrackName(file.name);
    setCurrentTime(0);
    songMapRef.current = null;
    sectionIndexRef.current = 0;
    setSections(null);

    try {
      await elementRef.current.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }

    // offline structure analysis in the background; visuals fall back gracefully until it lands
    try {
      const decoded = await engine.decode(await file.arrayBuffer());
      const map = analyzeSong(decoded);
      songMapRef.current = map;
      sectionIndexRef.current = 0;
      setSections(map.sections);
    } catch {
      songMapRef.current = null;
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

  const seek = useCallback((time: number) => {
    const el = elementRef.current;
    if (!el || !el.src || !Number.isFinite(time)) return;
    el.currentTime = Math.max(0, Math.min(time, el.duration || time));
    setCurrentTime(el.currentTime);
  }, []);

  const update = useCallback((dt: number) => {
    const out = levelsRef.current;
    engineRef.current?.update(dt, useLevaStore.getState().audio, out);

    out.sectionPulse *= Math.exp(-dt * 3);
    const map = songMapRef.current;
    const el = elementRef.current;
    if (map && el && map.sections.length > 0) {
      const t = el.currentTime;
      const secs = map.sections;
      let i = sectionIndexRef.current;
      if (i >= secs.length || t < secs[i].start || t >= secs[i].end) {
        let found = -1;
        for (let k = 0; k < secs.length; k++) {
          if (t >= secs[k].start && (t < secs[k].end || k === secs.length - 1)) found = k;
        }
        if (found >= 0 && found !== i) {
          out.sectionPulse = 1;
          out.hueDrift += 0.08;
          sectionIndexRef.current = found;
          i = found;
        } else if (found < 0) {
          i = sectionIndexRef.current;
        }
      }
      const s = secs[Math.min(i, secs.length - 1)];
      out.sectionType = s.type;
      out.sectionProgress = Math.min(1, Math.max(0, (t - s.start) / Math.max(0.001, s.end - s.start)));
      out.intensity = map.envelope[Math.min(map.envelope.length - 1, Math.floor(t / map.hop))];
    } else {
      out.sectionType = 'verse';
      out.sectionProgress = 0;
      out.intensity = out.level;
    }

    // ease the style toward its section target — colors drift slowly, energy reacts faster
    const target = styleScratchRef.current;
    computeStyleTargets(out.sectionType, out.sectionProgress, out.intensity, target);
    const kColor = 1 - Math.exp(-dt * 1.3);
    const kEnergy = 1 - Math.exp(-dt * 2.5);
    out.styleHue += (target.hue - out.styleHue) * kColor;
    out.styleSat += (target.sat - out.styleSat) * kColor;
    out.styleLight += (target.light - out.styleLight) * kColor;
    out.styleEnergy += (target.energy - out.styleEnergy) * kEnergy;
    out.styleTension += (target.tension - out.styleTension) * kEnergy;
    out.hueDrift =
      (out.hueDrift + dt * (0.008 + 0.02 * out.styleEnergy + 0.05 * out.styleTension)) % 1;
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
    seek,
    isPlaying,
    trackName,
    duration,
    currentTime,
    sections,
  };
}

export type AudioAnalyser = ReturnType<typeof useAudioAnalyser>;
export type LevelsRef = AudioAnalyser['levels'];
