import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { useState } from 'react';
import { Icon } from './Icon';
import { useI18n } from '../i18n/LanguageContext';
import { useTheme } from '../theme/ThemeContext';

type Props = {
  onShare: () => void | boolean | Promise<void | boolean>;
  label?: string;
  style?: ViewStyle;
  /** أيقونة فقط بدون نص */
  iconOnly?: boolean;
};

/**
 * زر مشاركة أنيق وغير مشتت — أسفل شاشات القراءة.
 */
export function ShareButton({ onShare, label, style, iconOnly }: Props) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);

  async function handlePress() {
    if (busy) return;
    setBusy(true);
    try {
      await onShare();
    } finally {
      setBusy(false);
    }
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={busy}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={label ?? t('share.action')}
      style={[
        styles.btn,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        iconOnly && styles.iconOnly,
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Icon name="share-2" size={20} color={colors.primary} />
      )}
      {!iconOnly ? (
        <Text style={[styles.label, { color: colors.primary }]}>
          {label ?? t('share.action')}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: 4,
  },
  iconOnly: {
    width: 44,
    height: 44,
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: 22,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
  },
});
