export type ThemeColors = {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  accent: string;
  border: string;
  error: string;
  success: string;
  ink: string;
  sand: string;
  /** تدرج خفيف للبطاقات */
  mist: string;
  /** خلفية أيقونة زاهية */
  iconWell: string;
  /** توهج خفيف للهيرو */
  glow: string;
};

/**
 * وردك — زمردي حيّ + ذهب دافئ
 * ألوان أغنى وتباين أوضح دون بهتان
 */
export const lightColors: ThemeColors = {
  primary: '#0F7A5A',
  primaryDark: '#0A4F3C',
  primaryLight: '#1FA075',
  background: '#F3F6F2',
  surface: '#FFFFFF',
  text: '#14201B',
  textSecondary: '#5A6B63',
  accent: '#C7922D',
  border: '#D7E3DC',
  error: '#C4463B',
  success: '#1B8A5A',
  ink: '#14201B',
  sand: '#EEF5F0',
  mist: '#D8F0E5',
  iconWell: '#E3F6ED',
  glow: '#B8E6D2',
};

export const darkColors: ThemeColors = {
  primary: '#3DDBA0',
  primaryDark: '#0E5C45',
  primaryLight: '#6EE7B7',
  background: '#0E1411',
  surface: '#182119',
  text: '#EAF4EE',
  textSecondary: '#9BB0A4',
  accent: '#E0B34A',
  border: '#2A3A31',
  error: '#E07A72',
  success: '#4ADE80',
  ink: '#EAF4EE',
  sand: '#1C2921',
  mist: '#1A3328',
  iconWell: '#1F3A2E',
  glow: '#145C44',
};

/** @deprecated Use useTheme().colors instead */
export const colors = lightColors;

/** ألوان أيقونات الميزات — لوحات حيّة */
export const featureTints = {
  prayer: { bg: '#DFF5EC', fg: '#0F7A5A' },
  quran: { bg: '#FFF0D6', fg: '#B8860B' },
  adhkar: { bg: '#FFE8D6', fg: '#C45C26' },
  qibla: { bg: '#E0F0FF', fg: '#1B6CA8' },
  tasbih: { bg: '#EDE4FF', fg: '#6B4FBF' },
  search: { bg: '#E8EEF8', fg: '#3D5A80' },
  badges: { bg: '#FFF3D0', fg: '#B8860B' },
  reminders: { bg: '#FFE4EC', fg: '#C23B6E' },
  khatmah: { bg: '#E4F3E8', fg: '#2F7D4A' },
} as const;

export type FeatureTintKey = keyof typeof featureTints;
