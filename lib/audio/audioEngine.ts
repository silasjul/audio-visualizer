import type { AudioConfig } from '@/configs/audioConfig';
import type { SectionType } from '@/lib/audio/songAnalysis';

export type AudioLevels = {
  bass: number;
  mid: number;
  treble: number;
  level: number;
  /** 1 on a detected beat, then decays exponentially to 0 */
  beat: number;
  beatCount: number;
  /** normalized whole-song energy at the playhead (from the offline analysis) */
  intensity: number;
  sectionType: SectionType;
  sectionProgress: number;
  /** 1 when the song enters a new section, then decays — for one-shot transitions */
  sectionPulse: number;
  /** smoothed section style, ready to apply: hue/sat/light shifts + energy/tension */
  styleHue: number;
  styleSat: number;
  styleLight: number;
  styleEnergy: number;
  styleTension: number;
  /** ever-rotating hue offset (1 = full wheel) — add to styleHue so colors never sit still */
  hueDrift: number;
  /** log-spaced spectrum bands (0..1), smoothed with the same attack/release as the bands */
  spectrum: Float32Array;
};

export function createLevels(): AudioLevels {
  return {
    bass: 0,
    mid: 0,
    treble: 0,
    level: 0,
    beat: 0,
    beatCount: 0,
    intensity: 0,
    sectionType: 'verse',
    sectionProgress: 0,
    sectionPulse: 0,
    styleHue: 0,
    styleSat: 0,
    styleLight: 0,
    styleEnergy: 1,
    styleTension: 0,
    hueDrift: 0,
    spectrum: new Float32Array(SPECTRUM_BANDS),
  };
}

export const SPECTRUM_BANDS = 64;
const SPECTRUM_LO_HZ = 32;
const SPECTRUM_HI_HZ = 13000;

const FFT_SIZE = 2048;
const BASS_HZ: [number, number] = [20, 250];
const MID_HZ: [number, number] = [250, 2000];
const TREBLE_HZ: [number, number] = [2000, 12000];
const BEAT_HISTORY = 60;
const BEAT_MIN_BASS = 0.12;
const BEAT_DECAY = 5;

export class AudioEngine {
  private ctx: AudioContext;
  private analyser: AnalyserNode;
  private bins: Uint8Array<ArrayBuffer>;
  private sources: AudioNode[] = [];
  private bassHistory = new Float32Array(BEAT_HISTORY);
  private historyIndex = 0;
  private historyFilled = 0;
  private time = 0;
  private lastBeatAt = -Infinity;

  constructor() {
    this.ctx = new AudioContext();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = FFT_SIZE;
    // light built-in smoothing only; the real shaping is the asymmetric attack/release below
    this.analyser.smoothingTimeConstant = 0.35;
    this.bins = new Uint8Array(this.analyser.frequencyBinCount);
  }

  /** All source creation funnels through here — everything downstream is source-agnostic. */
  private setSource(node: AudioNode, monitor: boolean) {
    for (const s of this.sources) s.disconnect();
    this.sources = [node];
    node.connect(this.analyser);
    // the analyser produces data without a downstream connection, so monitoring is a separate tap
    if (monitor) node.connect(this.ctx.destination);
  }

  connectMediaElement(el: HTMLAudioElement) {
    this.setSource(this.ctx.createMediaElementSource(el), true);
  }

  /** For tab capture (getDisplayMedia) or microphone later. monitor=false avoids mic feedback. */
  connectStream(stream: MediaStream, monitor = false) {
    this.setSource(this.ctx.createMediaStreamSource(stream), monitor);
  }

  async resume() {
    if (this.ctx.state === 'suspended') await this.ctx.resume();
  }

  decode(buffer: ArrayBuffer) {
    return this.ctx.decodeAudioData(buffer);
  }

  /** Bins map linearly from 0 to Nyquist (sampleRate / 2), so each bin spans sampleRate / fftSize Hz. */
  private bandAverage([lo, hi]: [number, number]) {
    const hzPerBin = this.ctx.sampleRate / FFT_SIZE;
    const from = Math.max(0, Math.floor(lo / hzPerBin));
    const to = Math.min(this.bins.length - 1, Math.ceil(hi / hzPerBin));
    let sum = 0;
    for (let i = from; i <= to; i++) sum += this.bins[i];
    return sum / ((to - from + 1) * 255);
  }

  update(dt: number, cfg: AudioConfig, out: AudioLevels) {
    this.time += dt;
    this.analyser.getByteFrequencyData(this.bins);

    const rawBass = this.bandAverage(BASS_HZ);
    const rawMid = this.bandAverage(MID_HZ);
    const rawTreble = this.bandAverage(TREBLE_HZ);

    // fast attack / slow release, framerate-independent (cfg values are per-frame lerp at 60fps)
    const smooth = (current: number, target: number) => {
      const factor = target > current ? cfg.attack : cfg.release;
      return current + (target - current) * (1 - Math.pow(1 - Math.min(factor, 0.99), dt * 60));
    };
    out.bass = smooth(out.bass, rawBass);
    out.mid = smooth(out.mid, rawMid);
    out.treble = smooth(out.treble, rawTreble);
    out.level = (out.bass + out.mid + out.treble) / 3;

    // log-spaced bands with a gentle high-end tilt (byte FFT data rolls off up top)
    const hzPerBin = this.ctx.sampleRate / FFT_SIZE;
    const ratio = SPECTRUM_HI_HZ / SPECTRUM_LO_HZ;
    for (let b = 0; b < SPECTRUM_BANDS; b++) {
      const f0 = SPECTRUM_LO_HZ * Math.pow(ratio, b / SPECTRUM_BANDS);
      const f1 = SPECTRUM_LO_HZ * Math.pow(ratio, (b + 1) / SPECTRUM_BANDS);
      const from = Math.max(0, Math.floor(f0 / hzPerBin));
      const to = Math.min(this.bins.length - 1, Math.max(from, Math.ceil(f1 / hzPerBin) - 1));
      let sum = 0;
      for (let i = from; i <= to; i++) sum += this.bins[i];
      const tilt = 0.7 + (b / SPECTRUM_BANDS) * 0.9;
      out.spectrum[b] = smooth(out.spectrum[b], Math.min(1, (sum / ((to - from + 1) * 255)) * tilt));
    }

    // beat = raw bass spiking above its own rolling average, with a cooldown
    let avg = 0;
    for (let i = 0; i < this.historyFilled; i++) avg += this.bassHistory[i];
    avg = this.historyFilled > 0 ? avg / this.historyFilled : 0;

    const isBeat =
      rawBass > BEAT_MIN_BASS &&
      rawBass > avg * cfg.beatSensitivity &&
      this.time - this.lastBeatAt > cfg.beatCooldown &&
      this.historyFilled >= BEAT_HISTORY / 2;

    if (isBeat) {
      out.beat = 1;
      out.beatCount++;
      this.lastBeatAt = this.time;
    } else {
      out.beat *= Math.exp(-dt * BEAT_DECAY);
    }

    this.bassHistory[this.historyIndex] = rawBass;
    this.historyIndex = (this.historyIndex + 1) % BEAT_HISTORY;
    this.historyFilled = Math.min(this.historyFilled + 1, BEAT_HISTORY);
  }

  dispose() {
    for (const s of this.sources) s.disconnect();
    this.sources = [];
    if (this.ctx.state !== 'closed') void this.ctx.close();
  }
}
