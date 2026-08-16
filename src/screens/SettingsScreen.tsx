import { useCallback, useState, type ReactNode } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { Icon, IconName } from '../components/Icon';
import { ScreenHeader } from '../components/ScreenHeader';
import { getReciterById, reciters } from '../data/reciters';
import { APP_LANGUAGES, AppLanguage } from '../i18n';
import { useI18n } from '../i18n/LanguageContext';
import { MoreStackParamList } from '../navigation/types';
import { getCachedLocation, saveCachedLocation } from '../services/locationCache';
import {
  cancelPrayerNotifications,
  reschedulePrayerNotificationsFromCache,
  schedulePrayerNotifications,
} from '../services/notifications';
import {
  CALCULATION_METHODS,
  CalculationMethodId,
  formatTime,
  getPrayerTimesForNotifications,
  runPrayerEngine,
} from '../services/prayerTimes';
import {
  getCalculationMethod,
  getNotificationSettings,
  getReciterId,
  getWidgetPayload,
  saveWidgetPayload,
  setCalculationMethod,
  setNotificationsEnabled,
  setNotifyMinutesBefore,
  setReciterId,
  WidgetPrayerPayload,
} from '../services/settings';
import {
  openContactSupport,
  openPrivacyPolicyExternal,
  openRateApp,
} from '../services/storeCompliance';
import { clearAllLocalUserData } from '../services/userDataPrivacy';
import { APP_IDENTITY, hasHostedPrivacyPolicy } from '../config/appStore';
import { Audio } from 'expo-av';
import {
  ADHAN_SOUNDS,
  AdhanSoundId,
  getAppPrefs,
  setAppPrefs,
} from '../services/appPrefs';
import { formatHijri, isRamadan } from '../services/hijri';
import { AppPaletteId, PALETTE_LABELS } from '../theme/palettes';
import { ThemeMode, useTheme } from '../theme/ThemeContext';

const MINUTE_OPTIONS = [5, 10, 15, 30];
const PALETTE_IDS = Object.keys(PALETTE_LABELS) as AppPaletteId[];

export function SettingsScreen() {
  const { colors, mode, setMode, isDark, palette, setPalette, elderMode, setElderMode } = useTheme();
  const { t, language, setLanguage, textAlign, locale } = useI18n();
  const navigation = useNavigation<NativeStackNavigationProp<MoreStackParamList>>();
  const [reciterId, setReciter] = useState('alafasy');
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [minutesBefore, setMinutes] = useState(15);
  const [calcMethod, setCalcMethod] = useState<CalculationMethodId>('auto');
  const [widget, setWidget] = useState<WidgetPrayerPayload | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [adhanSoundId, setAdhanSoundId] = useState<AdhanSoundId>('makkah');
  const [preferredHours, setPreferredHours] = useState<number[]>([7, 12, 17, 21]);

  async function onOpenPrivacy() {
    const openedExternal = await openPrivacyPolicyExternal();
    if (!openedExternal) {
      navigation.navigate('PrivacyPolicy');
    }
  }

  function onDeleteMyData() {
    Alert.alert(t('compliance.deleteDataConfirmTitle'), t('compliance.deleteDataConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('compliance.deleteDataAction'),
        style: 'destructive',
        onPress: async () => {
          await clearAllLocalUserData();
          Alert.alert(t('common.done'), t('compliance.deleteDataDone'));
        },
      },
    ]);
  }

  useFocusEffect(
    useCallback(() => {
      getReciterId().then(setReciter);
      getNotificationSettings().then((s) => {
        setNotifEnabled(s.enabled);
        setMinutes(s.minutesBefore);
      });
      getCalculationMethod().then(setCalcMethod);
      getWidgetPayload().then(setWidget);
      getAppPrefs().then((p) => {
        setAdhanSoundId(p.adhanSoundId);
        setPreferredHours(p.preferredNotifHours);
      });
    }, [])
  );

  async function onSelectAdhan(id: AdhanSoundId) {
    setAdhanSoundId(id);
    await setAppPrefs({ adhanSoundId: id });
    const sound = ADHAN_SOUNDS.find((s) => s.id === id);
    if (!sound?.url) return;
    try {
      const { sound: player } = await Audio.Sound.createAsync({ uri: sound.url }, { shouldPlay: true });
      setTimeout(() => {
        player.stopAsync().catch(() => undefined);
        player.unloadAsync().catch(() => undefined);
      }, 8000);
    } catch {
      /* معاينة اختيارية */
    }
  }

  async function onToggleNotifications(value: boolean) {
    setNotifEnabled(value);
    await setNotificationsEnabled(value);
    if (!value) {
      await cancelPrayerNotifications();
      return;
    }
    await refreshPrayerReminders(minutesBefore);
  }

  async function onChangeMinutes(m: number) {
    setMinutes(m);
    await setNotifyMinutesBefore(m);
    if (notifEnabled) await refreshPrayerReminders(m);
  }

  async function onSelectReciter(id: string) {
    setReciter(id);
    await setReciterId(id);
  }

  async function onSelectLanguage(id: AppLanguage) {
    if (id === language) return;
    await setLanguage(id);
  }

  async function onSelectMethod(id: CalculationMethodId) {
    setCalcMethod(id);
    await setCalculationMethod(id);
    if (notifEnabled) {
      const count = await reschedulePrayerNotificationsFromCache();
      if (count > 0) {
        Alert.alert(
          t('settings.methodUpdated'),
          t('settings.methodRescheduled', { count })
        );
      }
    } else {
      Alert.alert(t('common.done'), t('settings.methodSaved'));
    }
  }

  async function refreshPrayerReminders(offset: number) {
    try {
      const cached = await getCachedLocation();
      let latitude = cached?.latitude;
      let longitude = cached?.longitude;
      let countryCode = cached?.countryCode ?? null;
      let countryName = cached?.countryName ?? null;

      if (latitude == null || longitude == null) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(t('common.locationRequired'), t('settings.locationForNotifs'));
          return;
        }
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        latitude = location.coords.latitude;
        longitude = location.coords.longitude;
        try {
          const [geo] = await Location.reverseGeocodeAsync({ latitude, longitude });
          countryCode = geo?.isoCountryCode ?? null;
          countryName = geo?.country ?? null;
        } catch {
          // ignore
        }
        await saveCachedLocation({ latitude, longitude, countryCode, countryName });
      }

      const method = await getCalculationMethod();
      const times = getPrayerTimesForNotifications(
        latitude,
        longitude,
        countryCode,
        countryName,
        method
      );
      const count = await schedulePrayerNotifications(times, offset);
      Alert.alert(t('common.done'), t('settings.scheduled', { count }));
    } catch {
      Alert.alert(t('common.error'), t('settings.scheduleError'));
    }
  }

  async function syncWidgetData() {
    setSyncing(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('common.locationRequired'), t('settings.locationForWidget'));
        return;
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = location.coords;
      let locationName = '';
      let countryCode: string | null = null;
      let countryName: string | null = null;
      const [geo] = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geo) {
        locationName = [geo.city || geo.subregion, geo.country].filter(Boolean).join(', ');
        countryCode = geo.isoCountryCode ?? null;
        countryName = geo.country ?? null;
      }
      await saveCachedLocation({ latitude, longitude, countryCode, countryName });
      const preferredMethod = await getCalculationMethod();
      const engine = runPrayerEngine(latitude, longitude, {
        countryCode,
        countryName,
        preferredMethod,
      });

      const fajr = engine.times.find((p) => p.name === 'fajr');
      const maghrib = engine.times.find((p) => p.name === 'maghrib');
      const payload: WidgetPrayerPayload = {
        updatedAt: new Date().toISOString(),
        locationName,
        nextPrayerAr: engine.nextPrayer ? t(`prayer.${engine.nextPrayer.name}`) : '',
        nextPrayerTime: engine.nextPrayer ? formatTime(engine.nextPrayer.time, locale) : '',
        prayers: engine.times
          .filter((p) => p.name !== 'sunrise')
          .map((p) => ({
            nameAr: t(`prayer.${p.name}`),
            time: formatTime(p.time, locale),
          })),
        hijriLabel: formatHijri(),
        ayahOfDay: 'آية اليوم من وردك',
        wirdLine: 'واصل وردك اليوم',
        ...(isRamadan() && fajr && maghrib
          ? {
              imsak: formatTime(fajr.time, locale),
              iftar: formatTime(maghrib.time, locale),
            }
          : {}),
      };
      await saveWidgetPayload(payload);
      setWidget(payload);
      Alert.alert(t('settings.synced'), t('settings.syncedBody'));
    } catch {
      Alert.alert(t('common.error'), t('settings.syncError'));
    } finally {
      setSyncing(false);
    }
  }

  const themeOptions: { id: ThemeMode; label: string }[] = [
    { id: 'light', label: t('settings.light') },
    { id: 'dark', label: t('settings.dark') },
    { id: 'system', label: t('settings.system') },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <ScreenHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />

      {/* لغة التطبيق — أول قسم ليظهر مباشرة */}
      <Section title={t('settings.language')} colors={colors} textAlign={textAlign}>
        <Text style={[styles.hint, { color: colors.textSecondary, marginBottom: 12, marginTop: 0, textAlign }]}>
          {t('settings.languageHint')}
        </Text>
        {APP_LANGUAGES.map((opt) => {
          const selected = language === opt.id;
          return (
            <TouchableOpacity
              key={opt.id}
              style={[
                styles.langRow,
                {
                  backgroundColor: selected ? colors.primary : colors.sand,
                  borderColor: selected ? colors.primary : colors.border,
                },
              ]}
              onPress={() => onSelectLanguage(opt.id)}
              activeOpacity={0.85}
            >
              <Text style={[styles.langCheck, { color: selected ? '#fff' : colors.textSecondary }]}>
                {selected ? '✓' : ''}
              </Text>
              <Text
                style={[
                  styles.langLabel,
                  { color: selected ? '#fff' : colors.text, textAlign },
                ]}
              >
                {opt.nativeLabel}
              </Text>
            </TouchableOpacity>
          );
        })}
      </Section>

      <Section title={t('settings.appearance')} colors={colors} textAlign={textAlign}>
        <View style={[styles.rowWrap, { justifyContent: textAlign === 'right' ? 'flex-end' : 'flex-start' }]}>
          {themeOptions.map((opt) => (
            <TouchableOpacity
              key={opt.id}
              style={[
                styles.chip,
                {
                  backgroundColor: mode === opt.id ? colors.primary : colors.surface,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setMode(opt.id)}
            >
              <Text style={{ color: mode === opt.id ? '#fff' : colors.text, fontWeight: '600' }}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.hint, { color: colors.textSecondary, textAlign, marginBottom: 8 }]}>
          الثيم
        </Text>
        <View style={[styles.rowWrap, { justifyContent: textAlign === 'right' ? 'flex-end' : 'flex-start' }]}>
          {PALETTE_IDS.map((id) => (
            <TouchableOpacity
              key={id}
              style={[
                styles.chip,
                {
                  backgroundColor: palette === id ? colors.primary : colors.surface,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setPalette(id)}
            >
              <Text style={{ color: palette === id ? '#fff' : colors.text, fontWeight: '600' }}>
                {PALETTE_LABELS[id]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={[styles.switchRow, { marginTop: 12 }]}>
          <Switch value={elderMode} onValueChange={setElderMode} trackColor={{ true: colors.primary }} />
          <Text style={{ color: colors.text, fontWeight: '600', flex: 1, textAlign }}>
            وضع كبار السن (نصوص أوضح وأكبر)
          </Text>
        </View>
        <Text style={[styles.hint, { color: colors.textSecondary, textAlign }]}>
          {t('settings.currentMode', {
            mode: isDark ? t('settings.modeDark') : t('settings.modeLight'),
          })}
        </Text>
      </Section>

      <Section title={t('settings.calcMethod')} colors={colors} textAlign={textAlign}>
        <Text style={[styles.hint, { color: colors.textSecondary, marginBottom: 10, marginTop: 0, textAlign }]}>
          {t('settings.calcHint')}
        </Text>
        {CALCULATION_METHODS.map((m) => {
          const selected = calcMethod === m.id;
          return (
            <TouchableOpacity
              key={m.id}
              style={[
                styles.listItem,
                {
                  backgroundColor: selected ? colors.primary + '22' : colors.surface,
                  borderColor: selected ? colors.primary : colors.border,
                },
              ]}
              onPress={() => onSelectMethod(m.id)}
            >
              <Text style={[styles.listTitle, { color: colors.text, textAlign }]}>
                {t(`methods.${m.id}`)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </Section>

      <Section title={t('settings.adhanNotifs')} colors={colors} textAlign={textAlign}>
        <View style={styles.switchRow}>
          <Switch
            value={notifEnabled}
            onValueChange={onToggleNotifications}
            trackColor={{ true: colors.primary }}
          />
          <Text style={[styles.switchLabel, { color: colors.text, textAlign }]}>
            {t('settings.adhanToggle')}
          </Text>
        </View>
        <Text style={[styles.hint, { color: colors.textSecondary, textAlign }]}>
          {t('settings.remindBefore')}
        </Text>
        <View style={[styles.rowWrap, { justifyContent: textAlign === 'right' ? 'flex-end' : 'flex-start' }]}>
          {MINUTE_OPTIONS.map((m) => (
            <TouchableOpacity
              key={m}
              style={[
                styles.chip,
                {
                  backgroundColor: minutesBefore === m ? colors.primary : colors.surface,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => onChangeMinutes(m)}
            >
              <Text style={{ color: minutesBefore === m ? '#fff' : colors.text }}>
                {t('settings.minutes', { n: m })}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.hint, { color: colors.textSecondary, textAlign, marginTop: 12 }]}>
          صوت الأذان (معاينة عند الاختيار)
        </Text>
        {ADHAN_SOUNDS.map((s) => {
          const selected = adhanSoundId === s.id;
          return (
            <TouchableOpacity
              key={s.id}
              style={[
                styles.listItem,
                {
                  backgroundColor: selected ? colors.primary + '22' : colors.surface,
                  borderColor: selected ? colors.primary : colors.border,
                },
              ]}
              onPress={() => onSelectAdhan(s.id)}
            >
              <Text style={[styles.listTitle, { color: colors.text, textAlign }]}>{s.label}</Text>
            </TouchableOpacity>
          );
        })}
        <Text style={[styles.hint, { color: colors.textSecondary, textAlign, marginTop: 12 }]}>
          ساعات مفضّلة للإشعارات الذكية (تتعلّم من نشاطك)
        </Text>
        <View style={[styles.rowWrap, { justifyContent: textAlign === 'right' ? 'flex-end' : 'flex-start' }]}>
          {[6, 7, 9, 12, 15, 17, 20, 21].map((h) => {
            const on = preferredHours.includes(h);
            return (
              <TouchableOpacity
                key={h}
                style={[
                  styles.chip,
                  {
                    backgroundColor: on ? colors.primary : colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                onPress={async () => {
                  const next = on
                    ? preferredHours.filter((x) => x !== h)
                    : [...preferredHours, h].sort((a, b) => a - b);
                  setPreferredHours(next);
                  await setAppPrefs({ preferredNotifHours: next });
                }}
              >
                <Text style={{ color: on ? '#fff' : colors.text }}>{`${h}:00`}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Section>

      <Section title={t('settings.reciter')} colors={colors} textAlign={textAlign}>
        <Text style={[styles.hint, { color: colors.textSecondary, marginBottom: 10, textAlign }]}>
          {t('settings.reciterHint')}
        </Text>
        {reciters.map((r) => {
          const selected = r.reciter_id === reciterId;
          return (
            <TouchableOpacity
              key={r.reciter_id}
              style={[
                styles.listItem,
                {
                  backgroundColor: selected ? colors.primary + '22' : colors.surface,
                  borderColor: selected ? colors.primary : colors.border,
                },
              ]}
              onPress={() => onSelectReciter(r.reciter_id)}
            >
              <Text style={[styles.listTitle, { color: colors.text, textAlign }]}>{r.reciter_name}</Text>
              <Text style={{ color: colors.textSecondary, textAlign }}>
                {r.rewayat} • {r.nameEn}
              </Text>
            </TouchableOpacity>
          );
        })}
        <Text style={[styles.hint, { color: colors.textSecondary, textAlign }]}>
          {t('settings.selected', { name: getReciterById(reciterId).reciter_name })}
        </Text>
      </Section>

      <Section title={t('settings.widget')} colors={colors} textAlign={textAlign}>
        <Text style={[styles.hint, { color: colors.textSecondary, marginBottom: 12, textAlign }]}>
          {t('settings.widgetHint')}
        </Text>
        {widget ? (
          <View style={[styles.widgetPreview, { backgroundColor: colors.primary }]}>
            <Text style={styles.widgetLabel}>{t('settings.widgetNext')}</Text>
            <Text style={styles.widgetName}>{widget.nextPrayerAr}</Text>
            <Text style={styles.widgetTime}>{widget.nextPrayerTime}</Text>
            {widget.hijriLabel ? <Text style={styles.widgetLoc}>{widget.hijriLabel}</Text> : null}
            {widget.ayahOfDay ? <Text style={styles.widgetLoc}>{widget.ayahOfDay}</Text> : null}
            {widget.wirdLine ? <Text style={styles.widgetLoc}>{widget.wirdLine}</Text> : null}
            {widget.imsak && widget.iftar ? (
              <Text style={styles.widgetLoc}>
                إمساك {widget.imsak} • إفطار {widget.iftar}
              </Text>
            ) : null}
            <Text style={styles.widgetLoc}>{widget.locationName}</Text>
          </View>
        ) : (
          <Text style={[styles.hint, { color: colors.textSecondary, textAlign }]}>
            {t('settings.widgetEmpty')}
          </Text>
        )}
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          onPress={syncWidgetData}
          disabled={syncing}
        >
          <Text style={styles.primaryBtnText}>
            {syncing ? t('settings.syncing') : t('settings.syncWidget')}
          </Text>
        </TouchableOpacity>
      </Section>

      <Section title={t('settings.storeSection')} colors={colors} textAlign={textAlign}>
        <Text style={[styles.hint, { color: colors.textSecondary, marginBottom: 12, marginTop: 0, textAlign }]}>
          {t('settings.storeHint')}
        </Text>
        {(
          [
            {
              key: 'rate',
              title: t('compliance.rate'),
              subtitle: t('compliance.rateSub'),
              icon: 'star' as IconName,
              onPress: () => openRateApp(),
            },
            {
              key: 'support',
              title: t('compliance.support'),
              subtitle: t('compliance.supportSub'),
              icon: 'mail' as IconName,
              onPress: () => openContactSupport(),
            },
            {
              key: 'privacy',
              title: t('compliance.privacy'),
              subtitle: t('compliance.privacySub'),
              icon: 'shield' as IconName,
              onPress: () => onOpenPrivacy(),
            },
            {
              key: 'delete',
              title: t('compliance.deleteData'),
              subtitle: t('compliance.deleteDataSub'),
              icon: 'trash' as IconName,
              onPress: () => onDeleteMyData(),
            },
          ] as const
        ).map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[
              styles.complianceRow,
              { backgroundColor: colors.sand, borderColor: colors.border },
            ]}
            onPress={item.onPress}
            activeOpacity={0.85}
          >
            <Icon name={item.icon} size={20} color={item.key === 'delete' ? colors.error : colors.primary} />
            <View style={styles.complianceText}>
              <Text style={[styles.listTitle, { color: colors.text, textAlign }]}>{item.title}</Text>
              <Text style={{ color: colors.textSecondary, textAlign, fontSize: 12, marginTop: 2 }}>
                {item.subtitle}
              </Text>
            </View>
            <Icon
              name={textAlign === 'right' ? 'chevron-left' : 'chevron-right'}
              size={18}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        ))}
        <Text style={[styles.hint, { color: colors.textSecondary, textAlign, marginTop: 10 }]}>
          {APP_IDENTITY.nameEn} · {APP_IDENTITY.androidPackage} · v{APP_IDENTITY.versionName}
          {!hasHostedPrivacyPolicy() ? `\n${t('compliance.privacyHostHint')}` : ''}
        </Text>
      </Section>
    </ScrollView>
  );
}

function Section({
  title,
  children,
  colors,
  textAlign = 'right',
}: {
  title: string;
  children: ReactNode;
  colors: { surface: string; border: string; text: string };
  textAlign?: 'left' | 'right';
}) {
  return (
    <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.text, textAlign }]}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  section: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 12,
  },
  langCheck: {
    width: 22,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  langLabel: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
  },
  hint: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 20,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  listItem: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  widgetPreview: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  widgetLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  widgetName: { color: '#fff', fontSize: 26, fontWeight: '800', marginTop: 4 },
  widgetTime: { color: '#D4A853', fontSize: 32, fontWeight: '700', marginTop: 4 },
  widgetLoc: { color: 'rgba(255,255,255,0.75)', marginTop: 8, fontSize: 13 },
  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  complianceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 8,
    gap: 12,
  },
  complianceText: { flex: 1 },
});
