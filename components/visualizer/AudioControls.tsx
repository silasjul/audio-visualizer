import { Pause, Play, Upload } from 'lucide-react';

type Props = {
  isPlaying: boolean;
  trackName: string | null;
  onFile: (file: File) => void;
  onToggle: () => void;
};

export default function AudioControls({ isPlaying, trackName, onFile, onToggle }: Props) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center">
      <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-md">
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
        <span className="max-w-48 truncate text-xs text-white/60">
          {trackName ?? 'load a track to begin'}
        </span>
      </div>
    </div>
  );
}
