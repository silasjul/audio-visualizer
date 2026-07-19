export const PALETTES = {
  plasma: {
    background: '#050011',
    core: '#7c3aed',
    coreEmissive: '#a855f7',
    rim: '#22d3ee',
    particleA: '#5b21b6',
    particleB: '#06b6d4',
    hot: '#f5f3ff',
  },
  ice: {
    background: '#02081a',
    core: '#0ea5e9',
    coreEmissive: '#7dd3fc',
    rim: '#e0f2fe',
    particleA: '#1d4ed8',
    particleB: '#67e8f9',
    hot: '#f0f9ff',
  },
  ember: {
    background: '#0c0302',
    core: '#ea580c',
    coreEmissive: '#fb923c',
    rim: '#fde047',
    particleA: '#991b1b',
    particleB: '#f59e0b',
    hot: '#fff7ed',
  },
  aurora: {
    background: '#02100d',
    core: '#059669',
    coreEmissive: '#34d399',
    rim: '#a7f3d0',
    particleA: '#065f46',
    particleB: '#22d3ee',
    hot: '#ecfdf5',
  },
  neon: {
    background: '#0a0114',
    core: '#db2777',
    coreEmissive: '#f472b6',
    rim: '#22d3ee',
    particleA: '#7c3aed',
    particleB: '#f43f5e',
    hot: '#fdf2f8',
  },
} as const;

export type PaletteName = keyof typeof PALETTES;
export type Palette = (typeof PALETTES)[PaletteName];
