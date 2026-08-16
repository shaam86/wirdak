import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaskedText } from './MaskedText';
import type { TouchRecitationApi } from '../../hooks/useTouchRecitation';
import { tokenizeArabic } from '../../utils/quranTokenize';
import { useTheme } from '../../theme/ThemeContext';
import { toEasternDigits } from '../../utils/arabicNumerals';

type AyahLike = { numberInSurah: number; text: string };

type Props = {
  ayah: AyahLike;
  api: TouchRecitationApi;
  fontSize: number;
  fontFamily?: string;
  active?: boolean;
  onOpenMenu?: () => void;
};

function TouchRecitationAyahRowInner({
  ayah,
  api,
  fontSize,
  fontFamily,
  active,
  onOpenMenu,
}: Props) {
  const { colors, isDark } = useTheme();
  const words = useMemo(() => tokenizeArabic(ayah.text), [ayah.text]);

  if (!api.enabled) {
    return (
      <Pressable
        onPress={onOpenMenu}
        onLongPress={onOpenMenu}
        style={[
          styles.row,
          {
            borderBottomColor: isDark ? colors.border : '#E4D6BE',
            backgroundColor: active ? (isDark ? colors.primary + '33' : '#EFE2C8') : 'transparent',
          },
        ]}
      >
        <Text style={[styles.num, { color: colors.accent }]}>
          {toEasternDigits(ayah.numberInSurah)}
        </Text>
        <Text
          style={[
            styles.plain,
            { color: colors.text, fontSize, fontFamily, lineHeight: Math.round(fontSize * 2.05) },
          ]}
        >
          {ayah.text}
        </Text>
      </Pressable>
    );
  }

  if (api.unit === 'ayah') {
    const ref = {
      kind: 'ayah' as const,
      ayahNumber: ayah.numberInSurah,
      globalIndex: api.globalIndexForAyah(ayah.numberInSurah),
    };
    const visible = api.isVisible(ref);

    return (
      <Pressable
        onPress={() => {
          if (api.revealMode === 'tap') api.onTapUnit(ref);
          else onOpenMenu?.();
        }}
        onPressIn={() => api.onHoldStart(ref)}
        onPressOut={() => api.onHoldEnd()}
        delayLongPress={280}
        style={[
          styles.row,
          {
            borderBottomColor: isDark ? colors.border : '#E4D6BE',
            backgroundColor: active ? (isDark ? colors.primary + '22' : '#EFE2C8') : 'transparent',
          },
        ]}
      >
        <Text style={[styles.num, { color: colors.accent }]}>
          {toEasternDigits(ayah.numberInSurah)}
        </Text>
        <MaskedText
          text={ayah.text}
          masked={!visible}
          fontSize={fontSize}
          fontFamily={fontFamily}
          marker={`﴿${toEasternDigits(ayah.numberInSurah)}﴾`}
        />
      </Pressable>
    );
  }

  // كلمة كلمة
  return (
    <View
      style={[
        styles.row,
        {
          borderBottomColor: isDark ? colors.border : '#E4D6BE',
          backgroundColor: active ? (isDark ? colors.primary + '22' : '#EFE2C8') : 'transparent',
        },
      ]}
    >
      <Text style={[styles.num, { color: colors.accent }]}>
        {toEasternDigits(ayah.numberInSurah)}
      </Text>
      <View style={styles.words}>
        {words.map((w, wordIndex) => {
          const ref = {
            kind: 'word' as const,
            ayahNumber: ayah.numberInSurah,
            wordIndex,
            globalIndex: api.globalIndexForWord(ayah.numberInSurah, wordIndex),
          };
          const visible = api.isVisible(ref);
          return (
            <Pressable
              key={`${ayah.numberInSurah}-${wordIndex}`}
              onPress={() => {
                if (api.revealMode === 'tap') api.onTapUnit(ref);
              }}
              onPressIn={() => api.onHoldStart(ref)}
              onPressOut={() => api.onHoldEnd()}
              style={styles.wordHit}
            >
              <MaskedText
                text={w.display}
                masked={!visible}
                fontSize={fontSize}
                fontFamily={fontFamily}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function propsEqual(prev: Props, next: Props) {
  if (prev.ayah.numberInSurah !== next.ayah.numberInSurah) return false;
  if (prev.ayah.text !== next.ayah.text) return false;
  if (prev.fontSize !== next.fontSize) return false;
  if (prev.fontFamily !== next.fontFamily) return false;
  if (prev.active !== next.active) return false;
  if (prev.api.enabled !== next.api.enabled) return false;
  if (prev.api.unit !== next.api.unit) return false;
  if (prev.api.revealMode !== next.api.revealMode) return false;
  if (prev.api.tapRevealed !== next.api.tapRevealed) return false;
  if (prev.api.heldKey !== next.api.heldKey) return false;
  return true;
}

export const TouchRecitationAyahRow = memo(TouchRecitationAyahRowInner, propsEqual);

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  num: { fontSize: 12, fontWeight: '800', textAlign: 'right', marginBottom: 6 },
  plain: { textAlign: 'right', writingDirection: 'rtl' },
  words: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'flex-start',
  },
  wordHit: { maxWidth: '100%' },
});
