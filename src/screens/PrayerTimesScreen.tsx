import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CommonActions, useFocusEffect, useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { ErrorView } from '../components/ErrorView';
import { Icon } from '../components/Icon';
import { LoadingView } from '../components/LoadingView';
import { saveCachedLocation } from '../services/locationCache';
import { schedulePrayerNotifications } from '../services/notifications';
import {
  formatCountdown,
  formatNextPrayerLabel,
  formatTime,
  getPrayerTimesForNotifications,
  PrayerMethodInfo,
  PrayerTimeEntry,
  runPrayerEngine,
} from '../services/prayerTimes';
import { useI18n } from '../i18n/LanguageContext';
import { formatHijri, isRamadan } from '../services/hijri';
import { getCalculationMethod, saveWidgetPayload } from '../services/settings';
import { rescheduleSmartNotifications } from '../services/smartNotifications';
import { useTheme } from '../theme/ThemeContext';
import { radius, space } from '../theme/tokens';

export function PrayerTimesScreen() {
  const { colors, isDark, fonts } = useTheme();
  const { t, locale, textAlign } = useI18n();
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [times, setTimes] = useState<PrayerTimeEntry[]>([]);
  const [nextPrayer, setNextPrayer] = useState<PrayerTimeEntry | null>(null);
  const [currentPrayer, setCurrentPrayer] = useState<PrayerTimeEntry | null>(null);
  const [locationName, setLocationName] = useState('');
  const [method, setMethod] = useState<PrayerMethodInfo | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const loadTimes = useCallback(async () => {
    try {
      setError(null);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError(t('prayer.locationDenied'));
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = location.coords;

      let locName = '';
      let countryCode: string | null = null;
      let countryName: string | null = null;
      try {
        const [geo] = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geo) {
          locName = [geo.city || geo.subregion, geo.region].filter(Boolean).join('، ');
          countryCode = geo.isoCountryCode ?? null;
          countryName = geo.country ?? null;
          setLocationName(locName);
        }
      } catch {
        setLocationName('موقعك الحالي');
      }

      const preferredMethod = await getCalculationMethod();
      const engine = runPrayerEngine(latitude, longitude, {
        countryCode,
        countryName,
        preferredMethod,
      });

      setTimes(engine.times);
      setNextPrayer(engine.nextPrayer);
      setCurrentPrayer(engine.currentPrayer);
      setMethod(engine.method);

      await saveCachedLocation({
        latitude,
        longitude,
        countryCode,
        countryName,
      });

      const notifyTimes = getPrayerTimesForNotifications(
        latitude,
        longitude,
        countryCode,
        countryName,
        preferredMethod
      );
      await schedulePrayerNotifications(notifyTimes);
      await rescheduleSmartNotifications().catch(() => undefined);
      const fajr = engine.times.find((p) => p.name === 'fajr');
      const maghrib = engine.times.find((p) => p.name === 'maghrib');
      await saveWidgetPayload({
        updatedAt: new Date().toISOString(),
        locationName: locName,
        nextPrayerAr: engine.nextPrayer ? t(`prayer.${engine.nextPrayer.name}`) : '',
        nextPrayerTime: engine.nextPrayer ? formatTime(engine.nextPrayer.time, locale) : '',
        prayers: engine.times
          .filter((p) => p.name !== 'sunrise')
          .map((p) => ({
            nameAr: t(`prayer.${p.name}`),
            time: formatTime(p.time, locale),
          })),
        hijriLabel: formatHijri(),
        ayahOfDay: 'واصِل وردك — آية اليوم بانتظارك',
        wirdLine: 'افتح الختمة أو سورة اليوم',
        ...(isRamadan() && fajr && maghrib
          ? {
              imsak: formatTime(fajr.time, locale),
              iftar: formatTime(maghrib.time, locale),
            }
          : {}),
      });
    } catch {
      setError(t('prayer.calcError'));
    }
  }, [t, locale]);

  useFocusEffect(
    useCallback(() => {
      loadTimes().finally(() => setLoading(false));
    }, [loadTimes])
  );

  const countdown = useMemo(() => {
    if (!nextPrayer) return '00:00:00';
    return formatCountdown(nextPrayer.time.getTime() - now.getTime());
  }, [nextPrayer, now]);

  const nextLabel = useMemo(
    () => formatNextPrayerLabel(nextPrayer, now),
    [nextPrayer, now]
  );

  if (loading) return <LoadingView message={t('prayer.loading')} />;
  if (error) return <ErrorView message={error} />;

  const hijri = formatHijri(now);
  const ramadan = isRamadan(now);
  const imsakTime = times.find((p) => p.name === 'fajr');
  const iftarTime = times.find((p) => p.name === 'maghrib');
  const gregorian = now.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const heroColors = isDark
    ? [colors.primaryDark, colors.background]
    : [colors.primaryDark, colors.primary, colors.primaryLight];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={heroColors as [string, string, ...string[]]} style={styles.hero}>
        <View style={styles.heroTop}>
          <TouchableOpacity
            style={styles.heroAction}
            onPress={() =>
              navigation.dispatch(
                CommonActions.navigate({
                  name: 'More',
                  params: {
                    state: {
                      routes: [{ name: 'MoreMenu' }, { name: 'Qibla' }],
                      index: 1,
                    },
                  },
                })
              )
            }
            hitSlop={8}
          >
            <Icon name="compass" size={22} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text style={[styles.heroTitle, { fontFamily: fonts.uiExtra }]}>
              {t('prayer.title')}
            </Text>
            <Text style={styles.heroLoc}>{locationName || t('prayer.byGps')}</Text>
          </View>
          <TouchableOpacity
            style={styles.heroAction}
            onPress={() =>
              navigation.dispatch(
                CommonActions.navigate({
                  name: 'More',
                  params: {
                    state: {
                      routes: [{ name: 'MoreMenu' }, { name: 'AppSettings' }],
                      index: 1,
                    },
                  },
                })
              )
            }
            hitSlop={8}
          >
            <Icon name="settings" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        <Text style={styles.remainLabel}>{nextLabel}</Text>
        <Text style={[styles.countdown, { fontFamily: fonts.uiExtra }]}>{countdown}</Text>
        {currentPrayer ? (
          <Text style={styles.currentHint}>
            {t('prayer.currentTime', { name: t(`prayer.${currentPrayer.name}`) })}
          </Text>
        ) : null}
      </LinearGradient>

      <View style={[styles.dateBar, { backgroundColor: colors.primaryDark }]}>
        <Text style={styles.dateText}>
          {t('common.today')} {gregorian}
          {hijri ? ` • ${hijri}` : ''}
        </Text>
      </View>

      {ramadan && imsakTime && iftarTime ? (
        <View
          style={{
            marginHorizontal: space.md,
            marginTop: space.sm,
            padding: space.md,
            borderRadius: radius.lg,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ color: colors.accent, fontFamily: fonts.uiBold, textAlign, marginBottom: 6 }}>
            رمضان — إمساك / إفطار
          </Text>
          <Text style={{ color: colors.text, textAlign }}>
            الإمساك: {formatTime(imsakTime.time, locale)} • الإفطار: {formatTime(iftarTime.time, locale)}
          </Text>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await loadTimes();
              setRefreshing(false);
            }}
            colors={[colors.primary]}
          />
        }
      >
        {times.map((prayer) => {
          const isPast = prayer.time.getTime() < now.getTime();
          const isNext = nextPrayer?.name === prayer.name && nextPrayer.time.getDate() === prayer.time.getDate();
          const isCurrent =
            currentPrayer?.name === prayer.name && prayer.name !== 'sunrise';

          return (
            <View
              key={prayer.name}
              style={[
                styles.row,
                {
                  backgroundColor: isCurrent
                    ? isDark
                      ? colors.mist
                      : colors.mist
                    : isNext
                      ? isDark
                        ? colors.sand
                        : '#E8EFE3'
                      : colors.surface,
                  borderColor: isCurrent ? colors.primary : colors.border,
                  borderWidth: isCurrent ? 2 : 1,
                },
              ]}
            >
              <Icon
                name={prayer.name === 'sunrise' ? 'sunrise' : isCurrent ? 'sun' : 'bell'}
                size={22}
                color={
                  isCurrent || isNext
                    ? colors.primary
                    : isPast
                      ? colors.textSecondary
                      : colors.text
                }
              />
              <Text
                style={[
                  styles.time,
                  {
                    color: isCurrent || isNext ? colors.primary : colors.text,
                    fontFamily: fonts.uiBold,
                  },
                  isPast && !isCurrent && !isNext && { opacity: 0.45 },
                ]}
              >
                {formatTime(prayer.time, locale)}
              </Text>
              <View style={[styles.nameCol, { alignItems: textAlign === 'right' ? 'flex-end' : 'flex-start' }]}>
                <Text
                  style={[
                    styles.name,
                    {
                      color: isCurrent || isNext ? colors.primary : colors.text,
                      fontFamily: fonts.uiExtra,
                      textAlign,
                    },
                    isPast && !isCurrent && !isNext && { opacity: 0.45 },
                  ]}
                >
                  {t(`prayer.${prayer.name}`)}
                </Text>
                {isCurrent ? (
                  <Text style={[styles.badge, { color: colors.accent }]}>
                    {t('prayer.currentBadge')}
                  </Text>
                ) : isNext ? (
                  <Text style={[styles.badge, { color: colors.primary }]}>
                    {t('prayer.nextBadge')}
                  </Text>
                ) : null}
              </View>
            </View>
          );
        })}

        <Text style={[styles.note, { color: colors.textSecondary }]}>
          {t('prayer.method', { method: method?.labelAr ?? '—' })}
          {'\n'}
          {t('prayer.offlineNote')}
          {'\n'}
          {t('prayer.pullRefresh')}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: {
    paddingTop: 50,
    paddingBottom: 22,
    paddingHorizontal: 18,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroAction: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
  heroLoc: {
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginTop: 2,
    fontSize: 13,
  },
  remainLabel: {
    color: 'rgba(255,255,255,0.95)',
    textAlign: 'center',
    marginTop: 18,
    fontSize: 16,
    fontWeight: '600',
  },
  countdown: {
    color: '#fff',
    fontSize: 42,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 6,
    letterSpacing: 2,
  },
  currentHint: {
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginTop: 8,
    fontSize: 13,
  },
  dateBar: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  dateText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
  },
  list: { padding: space.md, paddingBottom: 130, gap: 8 },
  row: {
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  time: { flex: 1, fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  nameCol: { alignItems: 'flex-end' },
  name: { fontSize: 18, fontWeight: '800' },
  badge: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  note: { textAlign: 'center', marginTop: 16, lineHeight: 20, fontSize: 12 },
});
