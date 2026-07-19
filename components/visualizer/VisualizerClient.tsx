'use client';

import dynamic from 'next/dynamic';

// the Canvas is WebGL-only — skipping SSR avoids Next 16's dev log-replay
// choking on circular R3F objects during the server prerender
const Visualizer = dynamic(() => import('./Visualizer'), { ssr: false });

export default function VisualizerClient() {
  return <Visualizer />;
}
