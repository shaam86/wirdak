import { ThemeColors, darkColors, lightColors } from './colors';

/** ثيمات متعددة للتطبيق */
export type AppPaletteId = 'emerald' | 'mushaf' | 'warmNight';

export const PALETTE_LABELS: Record<AppPaletteId, string> = {
  emerald: 'زمردي',
  mushaf: 'مصحف',
  warmNight: 'ليلي دافئ',
};

const mushafLight: ThemeColors = {
  ...lightColors,
  primary: '#8B6914',
  primaryDark: '#5C4510',
  primaryLight: '#C9A227',
  background: '#F7F3EA',
  surface: '#FFFDF8',
  accent: '#A67C52',
  border: '#E6DFD0',
  sand: '#EFE6D4',
  mist: '#F3EBD8',
  iconWell: '#F5EBD6',
  glow: '#E8D9B8',
};

const mushafDark: ThemeColors = {
  ...darkColors,
  primary: '#E0B34A',
  primaryDark: '#3D2E14',
  primaryLight: '#F0C96A',
  background: '#1A1610',
  surface: '#242018',
  accent: '#D4A853',
  border: '#3A3228',
  sand: '#2A241C',
  mist: '#322C20',
  iconWell: '#2E281E',
  glow: '#3A3020',
};

const warmNightDark: ThemeColors = {
  ...darkColors,
  primary: '#E8A87C',
  primaryDark: '#2A1F1A',
  primaryLight: '#F0C4A8',
  background: '#1C1412',
  surface: '#2A1E1A',
  accent: '#D4A373',
  border: '#3D2E28',
  sand: '#322420',
  mist: '#3A2A24',
  iconWell: '#342620',
  glow: '#4A3228',
  text: '#F5EDE6',
  textSecondary: '#C4A99A',
};

const warmNightLight: ThemeColors = {
  ...lightColors,
  primary: '#B86B45',
  primaryDark: '#7A4228',
  primaryLight: '#D4896A',
  background: '#FBF4EF',
  surface: '#FFF9F5',
  accent: '#C7922D',
  border: '#EBD9CE',
  sand: '#F3E8DF',
  mist: '#F6EBE3',
  iconWell: '#F5E6DC',
  glow: '#E8D0C0',
};

export function resolvePaletteColors(palette: AppPaletteId, isDark: boolean): ThemeColors {
  if (palette === 'mushaf') return isDark ? mushafDark : mushafLight;
  if (palette === 'warmNight') return isDark ? warmNightDark : warmNightLight;
  return isDark ? darkColors : lightColors;
}
