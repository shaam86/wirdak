import Slider from '@react-native-community/slider';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  FONT_FAMILY_LABELS,
  MushafViewMode,
  ReadingFontFamily,
  ReadingPrefs,
  VIEW_MODE_LABELS,
} from '../services/readingPrefs';
import { ThemeMode, useTheme } from '../theme/ThemeContext';
import { radius } from '../theme/tokens';

type Props = {
  prefs: ReadingPrefs;
  onChange: (patch: Partial<ReadingPrefs>) => void;
  showTheme?: boolean;
};

const FONTS: ReadingFontFamily[] = ['uthmani', 'amiri', 'simple'];
const VIEWS: MushafViewMode[] = ['mushaf', 'list', 'mushafNight'];
const THEMES: { id: ThemeMode; label: string }[] = [
  { id: 'light', label: 'فاتح' },
  { id: 'dark', label: 'ليلي' },
  { id: 'system', label: 'تلقائي' },
];

export function ReadingControls({
  prefs,
  onChange,
  showTheme = true,
}: Props) {
  const { colors, mode, setMode, elderMode } = useTheme();
  const maxFont = elderMode ? 48 : 42;

  return (
    <View style={[styles.wrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        حجم الخط: {prefs.fontSize}
      </Text>
      <Slider
        style={styles.slider}
        minimumValue={16}
        maximumValue={maxFont}
        step={1}
        value={prefs.fontSize}
        onValueChange={(v) => onChange({ fontSize: Math.round(v) })}
        minimumTrackTintColor={colors.primary}
        maximumTrackTintColor={colors.border}
        thumbTintColor={colors.primary}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>وضع العرض</Text>
      <View style={styles.row}>
        {VIEWS.map((v) => {
          const active = prefs.viewMode === v;
          return (
            <TouchableOpacity
              key={v}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? colors.primary : colors.sand,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
              onPress={() => onChange({ viewMode: v })}
            >
              <Text style={{ color: active ? '#fff' : colors.text, fontWeight: '700', fontSize: 12 }}>
                {VIEW_MODE_LABELS[v]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.label, { color: colors.textSecondary, marginTop: 10 }]}>نوع الخط</Text>
      <View style={styles.row}>
        {FONTS.map((f) => {
          const active = prefs.fontFamily === f;
          return (
            <TouchableOpacity
              key={f}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? colors.primary : colors.sand,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
              onPress={() => onChange({ fontFamily: f })}
            >
              <Text style={{ color: active ? '#fff' : colors.text, fontWeight: '700', fontSize: 12 }}>
                {FONT_FAMILY_LABELS[f]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={[
          styles.chip,
          {
            marginTop: 10,
            alignSelf: 'flex-end',
            backgroundColor: prefs.showTranslationInline ? colors.primary : colors.sand,
            borderColor: colors.border,
          },
        ]}
        onPress={() => onChange({ showTranslationInline: !prefs.showTranslationInline })}
      >
        <Text
          style={{
            color: prefs.showTranslationInline ? '#fff' : colors.text,
            fontWeight: '700',
            fontSize: 12,
          }}
        >
          {prefs.showTranslationInline ? 'إخفاء الترجمة تحت الآية' : 'إظهار الترجمة تحت الآية'}
        </Text>
      </TouchableOpacity>

      {showTheme ? (
        <>
          <Text style={[styles.label, { color: colors.textSecondary, marginTop: 10 }]}>المظهر</Text>
          <View style={styles.row}>
            {THEMES.map((t) => {
              const active = mode === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? colors.primary : colors.sand,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setMode(t.id)}
                >
                  <Text style={{ color: active ? '#fff' : colors.text, fontWeight: '700', fontSize: 12 }}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 12,
  },
  label: {
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  slider: { width: '100%', height: 36 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
  },
});
