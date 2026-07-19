export type SectionType = 'calm' | 'verse' | 'buildup' | 'chorus';
export type Section = { start: number; end: number; type: SectionType };
export type SongMap = {
  duration: number;
  hop: number;
  envelope: Float32Array;
  sections: Section[];
};

const HOP_S = 0.25;
const SMOOTH_RADIUS = 4;
const HI_QUANTILE = 0.7;
const LO_QUANTILE = 0.35;
const MIN_SECTION_S = 5;
const BUILDUP_MAX_S = 12;
const BUILDUP_MIN_S = 3;
const BUILDUP_MIN_RISE = 0.15;

function smooth(data: Float32Array, radius: number) {
  const src = data.slice();
  for (let i = 0; i < data.length; i++) {
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - radius); j <= Math.min(data.length - 1, i + radius); j++) {
      sum += src[j];
      count++;
    }
    data[i] = sum / count;
  }
}

function quantile(data: Float32Array, q: number) {
  const sorted = data.slice().sort();
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
}

/** Full-song energy segmentation: choruses/drops are sustained high-energy plateaus,
 *  calm parts are sustained lows, and a steady energy ramp into a chorus is a buildup.
 *  Not true chorus *repetition* detection, but tracks the shape of most produced music well. */
export function analyzeSong(buffer: AudioBuffer): SongMap {
  const sr = buffer.sampleRate;
  const ch0 = buffer.getChannelData(0);
  const ch1 = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : ch0;
  const hopN = Math.round(HOP_S * sr);
  const n = Math.max(1, Math.floor(buffer.length / hopN));

  // per-window RMS of the signal and of a ~180 Hz low-passed copy (bass weight),
  // filtered with two cascaded one-pole IIRs in a single pass
  const env = new Float32Array(n);
  const bassEnv = new Float32Array(n);
  const alpha = 1 - Math.exp((-2 * Math.PI * 180) / sr);
  let lp1 = 0;
  let lp2 = 0;
  for (let w = 0; w < n; w++) {
    let sum = 0;
    let bassSum = 0;
    const start = w * hopN;
    for (let i = start; i < start + hopN; i++) {
      const x = (ch0[i] + ch1[i]) * 0.5;
      lp1 += alpha * (x - lp1);
      lp2 += alpha * (lp1 - lp2);
      sum += x * x;
      bassSum += lp2 * lp2;
    }
    env[w] = Math.sqrt(sum / hopN);
    bassEnv[w] = Math.sqrt(bassSum / hopN);
  }

  smooth(env, SMOOTH_RADIUS);
  smooth(bassEnv, SMOOTH_RADIUS);

  // normalize by the 95th percentile so one loud transient doesn't compress everything
  for (const arr of [env, bassEnv]) {
    const ref = Math.max(1e-6, quantile(arr, 0.95));
    for (let i = 0; i < n; i++) arr[i] = Math.min(1, arr[i] / ref);
  }

  const energy = new Float32Array(n);
  for (let i = 0; i < n; i++) energy[i] = Math.min(1, 0.55 * env[i] + 0.45 * bassEnv[i]);

  const hi = quantile(energy, HI_QUANTILE);
  const lo = quantile(energy, LO_QUANTILE);

  // 0 = calm, 1 = verse, 2 = chorus
  const labels: number[] = [];
  for (let i = 0; i < n; i++) labels.push(energy[i] > hi ? 2 : energy[i] < lo ? 0 : 1);

  // runs of equal labels; absorb runs shorter than MIN_SECTION_S into the larger neighbour
  type Run = { start: number; end: number; label: number };
  let runs: Run[] = [];
  for (let i = 0; i < n; ) {
    let j = i;
    while (j < n && labels[j] === labels[i]) j++;
    runs.push({ start: i, end: j, label: labels[i] });
    i = j;
  }
  const minWin = Math.round(MIN_SECTION_S / HOP_S);
  let changed = true;
  while (changed && runs.length > 1) {
    changed = false;
    for (let i = 0; i < runs.length; i++) {
      const r = runs[i];
      if (r.end - r.start >= minWin) continue;
      const prev = runs[i - 1];
      const next = runs[i + 1];
      const intoPrev =
        prev !== undefined && (next === undefined || prev.end - prev.start >= next.end - next.start);
      if (intoPrev) {
        prev.end = r.end;
      } else if (next !== undefined) {
        next.start = r.start;
      }
      runs.splice(i, 1);
      // coalesce neighbours that now touch with equal labels
      runs = runs.filter((run, k) => {
        if (k === 0) return true;
        if (runs[k - 1].label === run.label) {
          runs[k - 1].end = run.end;
          return false;
        }
        return true;
      });
      changed = true;
      break;
    }
  }

  const types: SectionType[] = ['calm', 'verse', 'chorus'];
  let sections: Section[] = runs.map((r) => ({
    start: r.start * HOP_S,
    end: r.end * HOP_S,
    type: types[r.label],
  }));

  // carve a buildup out of the tail of any section that ramps steadily into a chorus
  const result: Section[] = [];
  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    const next = sections[i + 1];
    if (!next || next.type !== 'chorus' || sec.type === 'chorus') {
      result.push(sec);
      continue;
    }
    const chorusIdx = Math.round(next.start / HOP_S);
    const limit = Math.max(Math.round(sec.start / HOP_S), chorusIdx - Math.round(BUILDUP_MAX_S / HOP_S));
    // walk back while energy keeps (mostly) descending away from the chorus
    let idx = chorusIdx;
    while (idx > limit && energy[idx - 1] <= energy[idx] + 0.02) idx--;
    const rampLen = (chorusIdx - idx) * HOP_S;
    const rise = energy[Math.max(0, chorusIdx - 1)] - energy[idx];
    if (rampLen >= BUILDUP_MIN_S && rise >= BUILDUP_MIN_RISE) {
      const buildStart = idx * HOP_S;
      if (buildStart - sec.start > 1) {
        result.push({ ...sec, end: buildStart });
        result.push({ start: buildStart, end: next.start, type: 'buildup' });
      } else {
        result.push({ start: sec.start, end: next.start, type: 'buildup' });
      }
    } else {
      result.push(sec);
    }
  }
  sections = result.filter((s) => s.end > s.start);
  if (sections.length > 0) sections[sections.length - 1].end = buffer.duration;

  return { duration: buffer.duration, hop: HOP_S, envelope: energy, sections };
}

export type SectionStyle = {
  hue: number;
  sat: number;
  light: number;
  energy: number;
  tension: number;
};

const CALM: SectionStyle = { hue: -0.05, sat: -0.3, light: -0.07, energy: 0.6, tension: 0 };
const VERSE: SectionStyle = { hue: 0, sat: 0, light: 0, energy: 1, tension: 0 };
const CHORUS: SectionStyle = { hue: 0.1, sat: 0.1, light: 0.09, energy: 1.6, tension: 0 };

export function computeStyleTargets(
  type: SectionType,
  progress: number,
  intensity: number,
  out: SectionStyle
) {
  if (type === 'buildup') {
    // creep toward the chorus look but hold back the full payoff for the drop
    const p = 0.6 * progress;
    out.hue = CHORUS.hue * p;
    out.sat = CHORUS.sat * p;
    out.light = CHORUS.light * p;
    out.energy = 1 + 0.35 * progress;
    out.tension = progress;
  } else {
    const s = type === 'calm' ? CALM : type === 'chorus' ? CHORUS : VERSE;
    out.hue = s.hue;
    out.sat = s.sat;
    out.light = s.light;
    out.energy = s.energy;
    out.tension = 0;
  }
  out.energy *= 0.75 + 0.5 * intensity;
}
