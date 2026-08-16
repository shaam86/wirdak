import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import type { FeatureTintKey } from '../theme/colors';
import { featureTints } from '../theme/colors';

export type IonIconName = ComponentProps<typeof Ionicons>['name'];

/** خريطة أيقونات أكثر واقعية (ممتلئة) */
export const APP_ICONS = {
  home: 'home',
  adhkar: 'sunny',
  prayer: 'time',
  clock: 'time',
  index: 'book',
  book: 'book',
  'book-open': 'book-outline',
  more: 'menu',
  menu: 'menu',
  search: 'search',
  compass: 'compass',
  qibla: 'compass',
  bell: 'notifications',
  award: 'ribbon',
  settings: 'settings',
  sun: 'sunny',
  sunrise: 'sunny',
  moon: 'moon',
  bookmark: 'bookmark',
  layers: 'layers',
  circle: 'radio-button-on',
  shield: 'shield-checkmark',
  mail: 'mail',
  star: 'star',
  share: 'share-social',
  'share-2': 'share-social',
  'chevron-left': 'chevron-back',
  'chevron-right': 'chevron-forward',
  map: 'map',
  feather: 'leaf',
  heart: 'heart',
  cloud: 'cloudy',
  mic: 'mic',
  'volume-high': 'volume-high',
  eye: 'eye',
  'eye-off': 'eye-off',
  trash: 'trash',
  play: 'play',
  pause: 'pause',
  stop: 'stop',
  square: 'square',
  ribbon: 'ribbon',
  kahf: 'book',
  mulk: 'moon',
  baqarah: 'library',
  library: 'library',
  sparkles: 'sparkles',
  flame: 'flame',
  trophy: 'trophy',
  leaf: 'leaf',
  time: 'time',
  hand: 'hand-left',
  'hand-left': 'hand-left',
  homeNav: 'home',
} as const;

export type AppIconKey = keyof typeof APP_ICONS;

type IconProps = {
  name: AppIconKey | IonIconName;
  size?: number;
  color?: string;
  focused?: boolean;
  /** أيقونة ممتلئة (أوضح وأقرب للواقع) */
  filled?: boolean;
};

function resolveName(name: string, filled: boolean): IonIconName {
  const mapped = (APP_ICONS as Record<string, string>)[name] ?? name;
  let base = mapped;
  if (base.endsWith('-outline')) base = base.replace(/-outline$/, '');
  if (base.endsWith('-sharp')) base = base.replace(/-sharp$/, '');

  if (filled) return base as IonIconName;
  // بعض الأيقونات لا تملك outline — نستخدم الأصل
  const outline = `${base}-outline` as IonIconName;
  return outline;
}

/**
 * أيقونات Ionicons أوضح من الخطوط الرفيعة — مع خيار ممتلئ.
 */
export function Icon({ name, size = 22, color, focused, filled = true }: IconProps) {
  const { colors } = useTheme();
  const iconName = resolveName(String(name), filled ?? focused ?? true);
  return (
    <Ionicons
      name={iconName}
      size={size}
      color={color ?? (focused ? colors.primary : colors.textSecondary)}
    />
  );
}

type BadgeProps = {
  name: AppIconKey | IonIconName;
  tint?: FeatureTintKey;
  size?: number;
  iconSize?: number;
  style?: ViewStyle;
  bg?: string;
  fg?: string;
};

/** فقاعة أيقونة ملوّنة حيّة — الافتراضي badgeMd */
export function IconBadge({
  name,
  tint = 'prayer',
  size = 44,
  iconSize = 22,
  style,
  bg,
  fg,
}: BadgeProps) {
  const { isDark } = useTheme();
  const palette = featureTints[tint];
  const background = bg ?? (isDark ? palette.fg + '33' : palette.bg);
  const foreground = fg ?? palette.fg;

  return (
    <View
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: size * 0.28,
          backgroundColor: background,
        },
        style,
      ]}
    >
      <Icon name={name} size={iconSize} color={foreground} filled />
    </View>
  );
}

export type IconName = AppIconKey | IonIconName;

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
