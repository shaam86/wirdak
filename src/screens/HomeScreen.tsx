import { useCallback, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CommonActions, useFocusEffect, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { Icon, IconBadge, IconName } from '../components/Icon';
import { useI18n } from '../i18n/LanguageContext';
import type { FeatureTintKey } from '../theme/colors';
import {
  getActiveKhatmahSummary,
  getPositionLabel,
  listKhatmahs,
} from '../services/khatmahStore';
import {
  formatNextPrayerLabel,
  formatTime,
  PrayerTimeEntry,
  runPrayerEngine,
} from '../services/prayerTimes';
import { getCachedLocation } from '../services/locationCache';
import { getCalculationMethod } from '../services/settings';
import { useTheme } from '../theme/ThemeContext';
import { control, radius, softShadow, space } from '../theme/tokens';

export function HomeScreen() {
  const { colors, isDark, fonts } = useTheme();
  const { t, textAlign, locale } = useI18n();
  const navigation = useNavigation<any>();
  const [nextPrayer, setNextPrayer] = useState<PrayerTimeEntry | null>(null);
  const [wirdLine, setWirdLine] = useState(() => t('home.startKhatmah'));
  const [primaryId, setPrimaryId] = useState<string | null>(null);
  const hour = new Date().getHours();
  const greeting = useMemo(() => {
    if (hour >= 5 && hour < 12) return t('home.greetingMorning');
    if (hour >= 12 && hour < 17) return t('home.greetingAfternoon');
    if (hour >= 17 && hour < 21) return t('home.greetingEvening');
    return t('home.greetingNight');
  }, [hour, t]);

  useFocusEffect(
    useCallback(() => {
      listKhatmahs().then((rows) => {
        const summary = getActiveKhatmahSummary(rows);
        if (summary.primary) {
          setPrimaryId(summary.primary.khatmah_id);
          setWirdLine(
            `${summary.primary.khatmah_name} • ${getPositionLabel(summary.primary)}`
          );
        } else {
          setPrimaryId(null);
          setWirdLine(t('home.noKhatmah'));
        }
      });

      (async () => {
        try {
          const preferredMethod = await getCalculationMethod();
          const cached = await getCachedLocation();
          if (cached) {
            const engine = runPrayerEngine(cached.latitude, cached.longitude, {
              countryCode: cached.countryCode,
              countryName: cached.countryName,
              preferredMethod,
            });
            setNextPrayer(engine.nextPrayer);
            return;
          }
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') return;
          const loc = await Location.getCurrentPositionAsync({});
          const engine = runPrayerEngine(loc.coords.latitude, loc.coords.longitude, {
            preferredMethod,
          });
          setNextPrayer(engine.nextPrayer);
        } catch {
          // اختياري
        }
      })();
    }, [t])
  );

  /**
   * اختصارات الرئيسية: تفتح الشاشة وحدها في تبويب المزيد
   * حتى زر الرجوع يعود للرئيسية (وليس للإعدادات/قائمة المزيد).
   */
  function openMoreStack(screen: 'Search' | 'Dashboard' | 'Qibla' | 'Reminders') {
    navigation.getParent()?.dispatch(
      CommonActions.navigate({
        name: 'More',
        params: {
          state: {
            routes: [{ name: screen }],
            index: 0,
          },
        },
      })
    );
  }

  const quickActions: {
    id: string;
    title: string;
    icon: IconName;
    tint: FeatureTintKey;
    onPress: () => void;
  }[] = [
    {
      id: 'search',
      title: t('home.search'),
      icon: 'search',
      tint: 'search',
      onPress: () => openMoreStack('Search'),
    },
    {
      id: 'dashboard',
      title: t('home.badges'),
      icon: 'award',
      tint: 'badges',
      onPress: () => openMoreStack('Dashboard'),
    },
    {
      id: 'prayer',
      title: t('home.prayer'),
      icon: 'clock',
      tint: 'prayer',
      onPress: () => navigation.getParent()?.navigate('Prayer'),
    },
    {
      id: 'qibla',
      title: t('home.qibla'),
      icon: 'compass',
      tint: 'qibla',
      onPress: () => openMoreStack('Qibla'),
    },
    {
      id: 'reminders',
      title: t('home.reminders'),
      icon: 'bell',
      tint: 'reminders',
      onPress: () => openMoreStack('Reminders'),
    },
  ];

  const cards: {
    id: string;
    title: string;
    subtitle: string;
    icon: IconName;
    tint: FeatureTintKey;
    onPress: () => void;
  }[] = [
    {
      id: 'adhkar',
      title: t('home.adhkar'),
      subtitle: t('home.adhkarSub'),
      icon: 'sun',
      tint: 'adhkar',
      onPress: () => navigation.getParent()?.navigate('Adhkar'),
    },
    {
      id: 'quran',
      title: t('home.quran'),
      subtitle: t('home.quranSub'),
      icon: 'book-open',
      tint: 'quran',
      onPress: () => navigation.getParent()?.navigate('Index'),
    },
    {
      id: 'khatmah',
      title: t('home.khatmah'),
      subtitle: wirdLine,
      icon: 'bookmark',
      tint: 'khatmah',
      onPress: () => {
        if (primaryId) {
          navigation.navigate('KhatmahDetail', { khatmahId: primaryId });
        } else {
          navigation.navigate('KhatmahList');
        }
      },
    },
    {
      id: 'khatmahManage',
      title: t('home.khatmahManage'),
      subtitle: t('home.khatmahManageSub'),
      icon: 'layers',
      tint: 'prayer',
      onPress: () => navigation.navigate('KhatmahList'),
    },
    {
      id: 'tasbih',
      title: t('home.tasbih'),
      subtitle: t('home.tasbihSub'),
      icon: 'circle',
      tint: 'tasbih',
      onPress: () => navigation.navigate('Tasbih'),
    },
    {
      id: 'hifz',
      title: t('home.hifz'),
      subtitle: t('home.hifzSub'),
      icon: 'hand-left',
      tint: 'quran',
      onPress: () => navigation.navigate('HifzTouchPicker'),
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={
            isDark
              ? [colors.primaryDark, colors.glow, colors.background]
              : [colors.primaryDark, colors.primary, colors.primaryLight]
          }
          locations={isDark ? [0, 0.55, 1] : [0, 0.45, 1]}
          style={styles.hero}
        >
          <Text style={[styles.brand, { fontFamily: fonts.uiRegular, textAlign }]}>
            {t('home.brand')}
          </Text>
          <Text style={[styles.greeting, { fontFamily: fonts.uiExtra, textAlign }]}>{greeting}</Text>
          <Text style={[styles.heroHint, { fontFamily: fonts.uiRegular, textAlign }]}>
            {t('home.heroHint')}
          </Text>

          <View
            style={[
              styles.smartCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
              softShadow(isDark),
            ]}
          >
            <TouchableOpacity
              style={styles.smartRow}
              onPress={() => navigation.getParent()?.navigate('Prayer')}
            >
              <IconBadge name="clock" tint="prayer" size={control.badgeMd} iconSize={control.iconMd} />
              <View style={styles.smartText}>
                <Text
                  style={[
                    styles.smartLabel,
                    { color: colors.textSecondary, fontFamily: fonts.uiRegular, textAlign },
                  ]}
                >
                  {t('home.nextPrayer')}
                </Text>
                <Text
                  style={[
                    styles.smartValue,
                    { color: colors.text, fontFamily: fonts.uiBold, textAlign },
                  ]}
                >
                  {nextPrayer
                    ? `${formatNextPrayerLabel(nextPrayer)} (${formatTime(nextPrayer.time, locale)})`
                    : t('home.enableLocation')}
                </Text>
              </View>
            </TouchableOpacity>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <TouchableOpacity
              style={styles.smartRow}
              onPress={() => {
                if (primaryId) {
                  navigation.navigate('KhatmahDetail', { khatmahId: primaryId });
                } else {
                  navigation.navigate('KhatmahList');
                }
              }}
            >
              <IconBadge name="book" tint="quran" size={control.badgeMd} iconSize={control.iconMd} />
              <View style={styles.smartText}>
                <Text
                  style={[
                    styles.smartLabel,
                    { color: colors.textSecondary, fontFamily: fonts.uiRegular },
                  ]}
                >
                  الورد اليومي — اضغط للمتابعة
                </Text>
                <Text
                  style={[styles.smartValue, { color: colors.text, fontFamily: fonts.ui }]}
                  numberOfLines={2}
                >
                  {wirdLine}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <Text style={[styles.section, { color: colors.text, fontFamily: fonts.uiBold }]}>
          اختصارات
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickRow}
        >
          {quickActions.map((a) => (
            <TouchableOpacity
              key={a.id}
              style={[
                styles.quickChip,
                { backgroundColor: colors.surface, borderColor: colors.border },
                softShadow(isDark),
              ]}
              onPress={a.onPress}
            >
              <IconBadge name={a.icon} tint={a.tint} size={control.badgeSm} iconSize={control.iconSm} />
              <Text style={{ color: colors.text, fontFamily: fonts.uiBold, fontSize: 12 }}>
                {a.title}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={[styles.section, { color: colors.text, fontFamily: fonts.uiBold }]}>
          ابدأ من هنا
        </Text>

        <View style={styles.cards}>
          {cards.map((card) => (
            <TouchableOpacity
              key={card.id}
              activeOpacity={0.88}
              onPress={card.onPress}
              style={[
                styles.bigCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
                softShadow(isDark),
              ]}
            >
              <IconBadge
                name={card.icon}
                tint={card.tint}
                size={control.badgeLg}
                iconSize={control.iconXl}
              />
              <View style={styles.cardBody}>
                <Text style={[styles.cardTitle, { color: colors.text, fontFamily: fonts.uiExtra }]}>
                  {card.title}
                </Text>
                <Text
                  style={[
                    styles.cardSub,
                    { color: colors.textSecondary, fontFamily: fonts.uiRegular },
                  ]}
                  numberOfLines={2}
                >
                  {card.subtitle}
                </Text>
              </View>
              <Icon name="chevron-left" size={control.iconMd} color={colors.primary} filled={false} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: 130 },
  hero: {
    paddingTop: 52,
    paddingHorizontal: space.lg,
    paddingBottom: space.xl,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  brand: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    textAlign: 'right',
    letterSpacing: 1,
  },
  greeting: {
    color: '#fff',
    fontSize: 32,
    textAlign: 'right',
    marginTop: 4,
    lineHeight: 44,
  },
  heroHint: {
    color: 'rgba(255,255,255,0.88)',
    textAlign: 'right',
    marginTop: 4,
    fontSize: 14,
    lineHeight: 22,
  },
  smartCard: {
    marginTop: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: space.md,
  },
  smartRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  smartText: { flex: 1 },
  smartLabel: { fontSize: 12, textAlign: 'right', lineHeight: 18 },
  smartValue: { fontSize: 15, textAlign: 'right', marginTop: 2, lineHeight: 24 },
  divider: { height: 1, marginVertical: 12 },
  section: {
    marginTop: space.lg,
    marginHorizontal: space.lg,
    fontSize: 18,
    textAlign: 'right',
    lineHeight: 28,
  },
  quickRow: {
    paddingHorizontal: space.lg,
    paddingTop: 10,
    gap: 8,
  },
  quickChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  cards: {
    marginTop: space.md,
    paddingHorizontal: control.screenInset,
    gap: 14,
  },
  bigCard: {
    minHeight: 90,
    borderRadius: radius.xl,
    borderWidth: 1,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 14,
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 18, textAlign: 'right', lineHeight: 28 },
  cardSub: { fontSize: 13, textAlign: 'right', marginTop: 2, lineHeight: 20 },
});
