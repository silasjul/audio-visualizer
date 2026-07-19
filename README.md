# Audio Visualizer

Audio-reactive 3D visualizer — glowing plasma aesthetic (pulsing core, curl-noise particle streams, heavy HDR bloom) driven by real-time FFT analysis **and** offline whole-song structure analysis. Built on Next.js 16 / React 19 / React Three Fiber v9.

Scaffolded from `npx create-next-app . --example https://github.com/silasjul/r3f-template`.

## What's built

### Audio pipeline

- **[lib/audio/audioEngine.ts](lib/audio/audioEngine.ts)** — framework-free Web Audio chain: `AudioContext → source → AnalyserNode` (fftSize 2048). Source creation is isolated behind one private `setSource()`; `connectMediaElement(el)` is used today, `connectStream(stream, monitor)` is ready for tab-capture (`getDisplayMedia`) or mic later — everything downstream is source-agnostic. Per frame: frequency bins collapse into bass/mid/treble (bin ranges computed from `sampleRate / fftSize`), asymmetric smoothing (fast attack, slow release, framerate-independent), and beat detection (raw bass spiking above a 1 s rolling average, with cooldown). `AudioLevels` also carries the section style fields below.
- **[lib/audio/songAnalysis.ts](lib/audio/songAnalysis.ts)** — offline structure analysis, runs once per loaded file: decodes the full mp3, computes a normalized energy envelope (full-signal + bass-weighted RMS via cascaded one-pole IIRs, 0.25 s hop), then segments the song into `calm / verse / buildup / chorus` sections. Choruses = sustained high-energy plateaus (quantile thresholds), calm = sustained lows, buildups = steady energy ramps carved out of the section preceding a chorus. Energy-*shape* analysis, not repetition detection — works best on produced music with clear dynamics. `computeStyleTargets()` maps a section + progress + intensity to style targets (hue/sat/light shift, energy multiplier, tension ramp).
- **[hooks/useAudioAnalyser.ts](hooks/useAudioAnalyser.ts)** — React wrapper owning the engine, `<audio>` element (created once — `createMediaElementSource` only works once per element), object URLs, play/pause/seek, and per-frame `update(dt)`: engine update → section lookup at the playhead → smoothed style eased into the levels object (colors drift slowly, energy reacts faster). `sectionPulse` spikes to 1 on section transitions for one-shot effects. AudioContext is created lazily inside the file-pick gesture and `resume()`d before every play (autoplay policy).

### Scene ([components/visualizer/](components/visualizer/))

- **[Visualizer.tsx](components/visualizer/Visualizer.tsx)** — drop-in root: memoized Canvas scene + control bar overlay. `AudioFrame` runs `update()` at `useFrame` priority −1 so levels are fresh before consumers read them.
- **[Core.tsx](components/visualizer/Core.tsx)** — icosahedron with drei `MeshDistortMaterial` (HDR emissive, `toneMapped={false}`), bass-driven scale/glow/distortion, beat spikes, plus an additive fresnel rim shell flaring on treble. Section style shifts its colors per frame (`Color.copy(base).offsetHSL(...)`).
- **[Particles.tsx](components/visualizer/Particles.tsx)** + **[particleShaders.ts](components/visualizer/particleShaders.ts)** — 40k (Leva up to 100k) fully-GPU stateless particles: position is a pure function of (seed, time) — 8 tilted orbital streams displaced by real curl noise (divergence-free, so they swirl like plasma; can never diverge like an FBO sim). Soft radial additive sprites with hot centers. Bass surges curl amplitude, treble sparkles size, buildup tension contracts orbit radius (`uTension`), section energy scales size/brightness/flow.
- **[Shockwaves.tsx](components/visualizer/Shockwaves.tsx)** — pooled additive HDR rings fired on beats (strength = bass × section energy; weak ones in calm sections are skipped) and a big one on `sectionPulse`. Ease-out expansion + quadratic fade; bloom turns them into light waves.
- **[CameraRig.tsx](components/visualizer/CameraRig.tsx)** — FOV punches on beats, zooms in up to 8° through buildups, auto-rotate speed follows energy/tension. Reads `state.camera` / `state.controls` inside `useFrame` only.
- **[Effects.tsx](components/visualizer/Effects.tsx)** — `EffectComposer` + mipmap-blur Bloom (low threshold ~0.18) + ACES tone mapping. **All bloom values are applied imperatively per frame through the effect ref** — see gotcha #2.
- **[AudioControls.tsx](components/visualizer/AudioControls.tsx)** — upload, play/pause, and a scrubbable timeline (pointer-capture drag) that paints the detected sections: violet = verse, amber = buildup, fuchsia = chorus, dim blue = calm.
- **[VisualizerClient.tsx](components/visualizer/VisualizerClient.tsx)** — `next/dynamic` + `ssr: false` wrapper (see gotcha #1). [app/page.tsx](app/page.tsx) mounts this, not Visualizer directly.

### Tunables

- Leva folders (press `h` to toggle panel): **Audio** (attack/release, beat sensitivity/cooldown), **Core** (palette select, scale, bass pulse, glow, distort), **Particles** (count, size, brightness, flow, noise), **Bloom** (intensity, punch, threshold, radius). Wiring follows the CLAUDE.md `config → hook → LevaControls → store → consumer` flow.
- Palettes (plasma / ice / ember) in [configs/palettes.ts](configs/palettes.ts) — add moods there.
- Section style targets (`CALM/VERSE/CHORUS` constants) and detection thresholds (`HI_QUANTILE`, `LO_QUANTILE`, `BUILDUP_MIN_RISE`…) at the top/bottom of [lib/audio/songAnalysis.ts](lib/audio/songAnalysis.ts).
- Audio→visual coupling multipliers are labeled constants at the top of `Particles.tsx`, `Shockwaves.tsx`, `CameraRig.tsx`.

## Hard-won gotchas — read before touching the Canvas

1. **Next 16 dev crashes with `TypeError: Converting circular structure to JSON` if the Canvas subtree re-renders in the wrong way.** Next 16's dev pipeline stringifies React's dev-mode logging/props-diffing, and R3F objects are circular (`instance.children[0].parent`). Three defenses are in place, keep all of them:
   - Canvas is never SSR'd (`VisualizerClient.tsx`, `ssr: false`).
   - The Canvas scene is `React.memo`'d with only **stable** props (`levels` ref + `update` callback); `camera`/`gl`/`dpr` are module constants. Audio UI state (play, track name, 4 Hz `timeupdate`) re-renders only the control bar.
   - **Never pass changing props to `@react-three/postprocessing` effect components** — changed props rebuild the effect object and re-render `<primitive object={...}>`, which crashes. Mount `<Bloom>` once with static props and mutate `effect.intensity` / `effect.luminanceMaterial.threshold` / `effect.mipmapBlurPass.radius` via ref in `useFrame`. Apply the same pattern to any new postprocessing effect.
2. **No audio data in React state, ever.** Levels live in a mutable object passed around as a **ref object** (`LevelsRef`); consumers read `.current` inside `useFrame` and mutate three.js objects/uniforms directly. The eslint react-hooks rules (React-Compiler era) enforce the discipline: don't mutate `useMemo` values in callbacks (mutate via element refs instead), no `Math.random()` during render (particle attributes use a seeded mulberry32), don't read `ref.current` during render.
3. **Leva values** are read reactively via `useLevaStore((s) => s.x)` where a re-render is safe (Core, Particles), and imperatively via `useLevaStore.getState().x` inside `useFrame` where it isn't (Effects, Shockwaves, engine config).
4. **drei `MeshDistortMaterial`**: `distort` and colors are runtime-drivable via ref; `speed` is *not* (captured in the wrapper's closure) — treat it as mount-time only.
5. **Verification**: only `npm run lint` and `npx tsc --noEmit`. Never run `npm run build` or the dev server — ask the user to check visually (per CLAUDE.md).

## Ideas for the next session

- Auto-tune `HI_QUANTILE`/`LO_QUANTILE` from the envelope's spread so quiet/loud genres segment well without manual tweaks.
- True chorus detection via self-similarity (repetition) instead of pure energy shape.
- Tab-capture / mic input — UI toggle calling `engine.connectStream()` (plumbing already exists; no song map for live sources, falls back to live `level` as intensity).
- Waveform or spectral detail on the seek bar; section labels on hover.
- More one-shot effects on `sectionPulse` (palette flip on drop, particle burst emission, chromatic aberration hit).
- GPGPU (FBO ping-pong) particles if counts beyond ~100k are wanted.
