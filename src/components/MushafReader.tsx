import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ReadingFontFamily, resolveFontFamily } from '../services/readingPrefs';
import { Ayah } from '../services/quranApi';
import { mushaf } from '../theme/mushaf';
import { useTheme } from '../theme/ThemeContext';
import { toEasternDigits } from '../utils/arabicNumerals';
import { BASMALA_UTHMANI, stripLeadingBasmala, surahShowsBasmala } from '../utils/mushafText';

type Props = {
  surahNumber: number;
  surahName: string;
  juzNumber: number;
  pageNumber?: number;
  ayahs: Ayah[];
  selectedAyah: number | null;
  playingAyah: number | null;
  onSelectAyah: (ayah: Ayah) => void;
  fontSize?: number;
  fontFamily?: ReadingFontFamily;
  /** وضع التسميع: إخفاء الآيات بعد revealedCount */
  hifzMode?: boolean;
  revealedCount?: number;
  onRevealNext?: () => void;
  highlightAyah?: number;
  /** فرض ألوان المصحف الليلي حتى لو الوضع العام فاتح */
  forceNight?: boolean;
};

export function MushafReader({
  surahNumber,
  surahName,
  juzNumber,
  pageNumber,
  ayahs,
  selectedAyah,
  playingAyah,
  onSelectAyah,
  fontSize = 26,
  fontFamily = 'uthmani',
  hifzMode = false,
  revealedCount = 0,
  onRevealNext,
  highlightAyah,
  forceNight = false,
}: Props) {
  const { isDark, colors } = useTheme();
  const showBasmala = surahShowsBasmala(surahNumber);
  const displayName = surahName.replace(/^سُورَةُ\s*/, '').replace(/^سورة\s*/, '');
  const font = resolveFontFamily(fontFamily);
  const lineHeight = Math.round(fontSize * 2.15);
  const night = forceNight || isDark;

  const paper = night ? '#1A1F1C' : mushaf.paper;
  const paperDeep = night ? '#121612' : mushaf.paperDeep;
  const ink = night ? '#E8E4D9' : mushaf.ink;
  const gold = night ? '#C9A227' : mushaf.gold;

  function handlePressAyah(ayah: Ayah) {
    if (hifzMode) {
      onRevealNext?.();
      return;
    }
    onSelectAyah(ayah);
  }

  return (
    <View style={[styles.root, { backgroundColor: paperDeep }]}>
      <View style={[styles.topMeta, { backgroundColor: paper, borderBottomColor: gold + '55' }]}>
        <Text style={[styles.metaText, { color: gold }]}>الجزء {toEasternDigits(juzNumber)}</Text>
        <View style={styles.metaCenter}>
          <View style={[styles.metaDot, { backgroundColor: gold }]} />
          <View style={[styles.metaLine, { flex: 1, backgroundColor: gold + '66' }]} />
          <View style={[styles.metaDot, { backgroundColor: gold }]} />
        </View>
        <Text style={[styles.metaText, { color: gold }]}>{displayName}</Text>
      </View>

      {hifzMode ? (
        <Pressable style={styles.hifzBanner} onPress={() => onRevealNext?.()}>
          <Text style={{ color: colors.text, fontWeight: '700', textAlign: 'center' }}>
            وضع التسميع — اضغط لإظهار الآية التالية ({toEasternDigits(revealedCount)}/
            {toEasternDigits(ayahs.length)})
          </Text>
        </Pressable>
      ) : null}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.pageOuter}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          style={[styles.pageFrame, { backgroundColor: paper, borderColor: gold }]}
          onPress={() => hifzMode && onRevealNext?.()}
        >
          <View style={[styles.pageInner, { borderColor: gold + '66' }]}>
            <View style={[styles.bannerOuter, { borderColor: gold, backgroundColor: gold + '22' }]}>
              <View style={[styles.bannerInner, { borderColor: gold + '88', backgroundColor: isDark ? colors.sand : '#F7F0E4' }]}>
                <Text style={[styles.bannerSide, { color: gold, fontFamily: font }]}>﴾</Text>
                <View style={styles.bannerCenter}>
                  <Text style={[styles.bannerLabel, { color: gold }]}>سُورَةُ</Text>
                  <Text style={[styles.bannerName, { color: ink, fontFamily: font, fontSize: fontSize + 2 }]}>
                    {displayName}
                  </Text>
                </View>
                <Text style={[styles.bannerSide, { color: gold, fontFamily: font }]}>﴿</Text>
              </View>
            </View>

            {showBasmala ? (
              <View style={styles.basmalaWrap}>
                <Text
                  style={[
                    styles.basmala,
                    { color: ink, fontSize: fontSize + 2, lineHeight, fontFamily: font },
                  ]}
                >
                  {BASMALA_UTHMANI}
                </Text>
              </View>
            ) : null}

            <Text style={[styles.body, { color: ink, fontSize, lineHeight, fontFamily: font }]}>
              {ayahs.map((ayah) => {
                const raw =
                  showBasmala && ayah.numberInSurah === 1
                    ? stripLeadingBasmala(ayah.text)
                    : ayah.text;
                const text = raw || ayah.text;
                const selected = selectedAyah === ayah.numberInSurah;
                const playing = playingAyah === ayah.numberInSurah;
                const highlighted = highlightAyah === ayah.numberInSurah;
                const hidden = hifzMode && ayah.numberInSurah > revealedCount;

                return (
                  <Text
                    key={ayah.numberInSurah}
                    onPress={() => handlePressAyah(ayah)}
                    onLongPress={() => onSelectAyah(ayah)}
                    style={[
                      styles.ayahInline,
                      {
                        color: ink,
                        fontSize,
                        lineHeight,
                        fontFamily: font,
                        opacity: hidden ? 0.07 : 1,
                      },
                      selected && { backgroundColor: mushaf.highlight },
                      playing && !selected && { backgroundColor: mushaf.playing },
                      highlighted && { backgroundColor: isDark ? '#3A4A20' : '#E8F5C8' },
                    ]}
                  >
                    {hidden ? '████ ███ ██ ████ ' : text}
                    <Text style={[styles.ayahMarker, { color: gold, fontSize: fontSize * 0.65, fontFamily: font }]}>
                      {' '}
                      ﴿{toEasternDigits(ayah.numberInSurah)}﴾{' '}
                    </Text>
                  </Text>
                );
              })}
            </Text>

            <View style={styles.footer}>
              <View style={[styles.footerRule, { backgroundColor: gold + '66' }]} />
              <View style={[styles.pageOval, { borderColor: gold, backgroundColor: isDark ? colors.sand : '#FBF6EC' }]}>
                <Text style={[styles.pageNumber, { color: gold }]}>
                  {toEasternDigits(pageNumber ?? ayahs[0]?.page ?? surahNumber)}
                </Text>
              </View>
              <View style={[styles.footerRule, { backgroundColor: gold + '66' }]} />
            </View>
          </View>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  metaText: {
    fontSize: 13,
    fontWeight: '600',
    minWidth: 72,
    textAlign: 'center',
  },
  metaCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
    gap: 6,
  },
  metaLine: { height: 1 },
  metaDot: { width: 5, height: 5, borderRadius: 3 },
  hifzBanner: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(201,162,39,0.2)',
  },
  scroll: { flex: 1 },
  pageOuter: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 36,
  },
  pageFrame: {
    borderRadius: 4,
    borderWidth: 2,
    padding: 3,
  },
  pageInner: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 18,
  },
  bannerOuter: {
    borderWidth: 1.5,
    marginBottom: 16,
    padding: 3,
  },
  bannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  bannerSide: {
    fontSize: 22,
    width: 28,
    textAlign: 'center',
  },
  bannerCenter: { flex: 1, alignItems: 'center' },
  bannerLabel: {
    fontSize: 12,
    letterSpacing: 2,
    marginBottom: 2,
  },
  bannerName: { textAlign: 'center' },
  basmalaWrap: { alignItems: 'center', marginBottom: 16 },
  basmala: { textAlign: 'center' },
  body: {
    textAlign: 'justify',
    writingDirection: 'rtl',
  },
  ayahInline: {},
  ayahMarker: {},
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
    gap: 12,
  },
  footerRule: { width: 40, height: 1 },
  pageOval: {
    minWidth: 58,
    paddingHorizontal: 18,
    paddingVertical: 5,
    borderRadius: 22,
    borderWidth: 1.5,
  },
  pageNumber: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
});
