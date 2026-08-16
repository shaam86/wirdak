import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useI18n } from '../../i18n/LanguageContext';
import type { TouchHifzUnit, TouchRevealMode } from '../../services/hifzPrefs';
import { useTheme } from '../../theme/ThemeContext';
import { radius, space } from '../../theme/tokens';
import { toEasternDigits } from '../../utils/arabicNumerals';

type Props = {
  enabled: boolean;
  onToggle: (on: boolean) => void;
  /** إخفاء المفتاح عندما تكون الشاشة مخصّصة للتسميع فقط */
  showToggle?: boolean;
  unit: TouchHifzUnit;
  onChangeUnit: (u: TouchHifzUnit) => void;
  revealMode: TouchRevealMode;
  onChangeRevealMode: (m: TouchRevealMode) => void;
  tapRevealed: number;
  totalUnits: number;
  onReset: () => void;
};

export function TouchRecitationPanel({
  enabled,
  onToggle,
  showToggle = true,
  unit,
  onChangeUnit,
  revealMode,
  onChangeRevealMode,
  tapRevealed,
  totalUnits,
  onReset,
}: Props) {
  const { colors, fonts, scale } = useTheme();
  const { t, textAlign } = useI18n();

  return (
    <View style={[styles.wrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {showToggle ? (
        <View style={styles.row}>
          <Switch
            value={enabled}
            onValueChange={onToggle}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor="#fff"
          />
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.title,
                { color: colors.text, fontFamily: fonts.uiBold, fontSize: scale(15), textAlign },
              ]}
            >
              {t('hifz.touchModeTitle')}
            </Text>
            <Text style={[styles.hint, { color: colors.textSecondary, fontSize: scale(12), textAlign }]}>
              {enabled ? t('hifz.touchModeOnHint') : t('hifz.touchModeOffHint')}
            </Text>
          </View>
        </View>
      ) : (
        <Text
          style={[
            styles.title,
            { color: colors.text, fontFamily: fonts.uiBold, fontSize: scale(15), textAlign },
          ]}
        >
          {t('hifz.touchModeOnHint')}
        </Text>
      )}

      {enabled ? (
        <>
          <Text style={[styles.label, { color: colors.textSecondary, fontSize: scale(12), textAlign }]}>
            {t('hifz.revealStyle')}
          </Text>
          <View style={styles.chips}>
            {(
              [
                { id: 'hold' as const, label: t('hifz.holdReveal'), sub: t('hifz.holdRevealSub') },
                { id: 'tap' as const, label: t('hifz.tapReveal'), sub: t('hifz.tapRevealSub') },
              ] as const
            ).map((m) => {
              const on = revealMode === m.id;
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: on ? colors.primary : colors.sand,
                      borderColor: on ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => onChangeRevealMode(m.id)}
                >
                  <Text style={{ color: on ? '#fff' : colors.text, fontWeight: '800', fontSize: scale(13) }}>
                    {m.label}
                  </Text>
                  <Text
                    style={{
                      color: on ? 'rgba(255,255,255,0.85)' : colors.textSecondary,
                      fontSize: scale(11),
                    }}
                  >
                    {m.sub}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.label, { color: colors.textSecondary, fontSize: scale(12), textAlign }]}>
            {t('hifz.hideUnit')}
          </Text>
          <View style={styles.chips}>
            {(
              [
                { id: 'ayah' as const, label: t('hifz.unitAyah') },
                { id: 'word' as const, label: t('hifz.unitWord') },
              ] as const
            ).map((m) => {
              const on = unit === m.id;
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: on ? colors.accent : colors.sand,
                      borderColor: on ? colors.accent : colors.border,
                    },
                  ]}
                  onPress={() => onChangeUnit(m.id)}
                >
                  <Text style={{ color: on ? '#fff' : colors.text, fontWeight: '800', fontSize: scale(13) }}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {revealMode === 'tap' ? (
            <View style={styles.progressRow}>
              <Text
                style={{
                  color: colors.text,
                  fontFamily: fonts.uiBold,
                  flex: 1,
                  textAlign,
                  fontSize: scale(13),
                }}
              >
                {t('hifz.revealedProgress', {
                  a: toEasternDigits(tapRevealed),
                  b: toEasternDigits(totalUnits),
                })}
              </Text>
              <TouchableOpacity
                onPress={onReset}
                style={[styles.resetBtn, { backgroundColor: colors.error + '18', borderColor: colors.error + '55' }]}
              >
                <Text style={{ color: colors.error, fontWeight: '800', fontSize: scale(12) }}>
                  {t('hifz.resetHide')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={[styles.hint, { color: colors.textSecondary, fontSize: scale(12), textAlign }]}>
              {t('hifz.holdHint')}
            </Text>
          )}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: space.md,
    marginTop: space.sm,
    marginBottom: 6,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 10,
  },
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  title: {},
  hint: { lineHeight: 18, marginTop: 2 },
  label: { fontWeight: '700' },
  chips: { flexDirection: 'row-reverse', gap: 8 },
  chip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    gap: 2,
  },
  progressRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  resetBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
  },
});
