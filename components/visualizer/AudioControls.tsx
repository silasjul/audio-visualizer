import { useRef } from 'react';
import { Pause, Play, Upload } from 'lucide-react';

type Props = {
  isPlaying: boolean;
  trackName: string | null;
  duration: number;
  currentTime: number;
  onFile: (file: File) => void;
  onToggle: () => void;
  onSeek: (time: number) => void;
};

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function Timeline({
  duration,
  currentTime,
  onSeek,
}: Pick<Props, 'duration' | 'currentTime' | 'onSeek'>) {
  const bar = useRef<HTMLDivElement>(null);

  const seekFromEvent = (e: React.PointerEvent) => {
    const el = bar.current;
    if (!el || duration <= 0) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    onSeek(ratio * duration);
  };

  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div
      ref={bar}
      className="group relative h-1.5 flex-1 cursor-pointer overflow-hidden rounded-full bg-white/10 transition-[height] hover:h-2.5"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        seekFromEvent(e);
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) seekFromEvent(e);
      }}
    >
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-violet-400"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

export default function AudioControls({
  isPlaying,
  trackName,
  duration,
  currentTime,
  onFile,
  onToggle,
  onSeek,
}: Props) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center">
      <div
        className={`pointer-events-auto flex flex-col gap-2.5 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 backdrop-blur-md ${
          trackName ? 'w-[min(92vw,540px)]' : 'w-auto'
        }`}
      >
        <div className="flex items-center gap-3">
          <label className="cursor-pointer rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20">
            <Upload className="h-4 w-4" />
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onFile(file);
                e.target.value = '';
              }}
            />
          </label>
          <button
            onClick={onToggle}
            disabled={!trackName}
            className="rounded-full bg-white/10 p-2 text-white transition enabled:hover:bg-white/20 disabled:opacity-30"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <span className="min-w-0 flex-1 truncate text-xs text-white/60">
            {trackName ?? 'load a track to begin'}
          </span>
        </div>
        {trackName && (
          <div className="flex items-center gap-2.5">
            <span className="w-9 text-right text-[10px] tabular-nums text-white/50">
              {formatTime(currentTime)}
            </span>
            <Timeline duration={duration} currentTime={currentTime} onSeek={onSeek} />
            <span className="w-9 text-[10px] tabular-nums text-white/50">{formatTime(duration)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
