/** رموز التصميم المشتركة — زوايا، مسافات، ظلال، أحجام تحكم */
export const radius = {
  sm: 12,
  md: 14,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const space = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
} as const;

/** أحجام أيقونات وأزرار موحّدة عبر التطبيق */
export const control = {
  iconSm: 18,
  iconMd: 22,
  iconLg: 26,
  iconXl: 28,
  badgeSm: 36,
  badgeMd: 44,
  badgeLg: 56,
  touch: 44,
  rowMin: 64,
  chipPadH: 14,
  chipPadV: 8,
  /** هامش أفقي موحّد للشاشات */
  screenInset: 18,
} as const;

export const type = {
  /** واجهات وقوائم — Cairo */
  ui: 'Cairo_600SemiBold',
  uiBold: 'Cairo_700Bold',
  uiRegular: 'Cairo_400Regular',
  uiExtra: 'Cairo_800ExtraBold',
  /** قرآن — رسم عثماني */
  quran: 'AmiriQuran',
} as const;

export const lineHeights = {
  ui: 1.55,
  body: 1.7,
  quran: 2.1,
} as const;

export function softShadow(isDark: boolean) {
  return {
    shadowColor: isDark ? '#000' : '#0A4F3C',
    shadowOpacity: isDark ? 0.4 : 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  } as const;
}
