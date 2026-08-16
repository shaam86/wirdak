import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getStoredLanguage, setI18nLocale, t } from '../i18n';
import { getCachedLocation } from './locationCache';
import {
  formatTime,
  getPrayerTimesForNotifications,
  PrayerTimeEntry,
} from './prayerTimes';
import { getAppPrefs } from './appPrefs';
import { getCalculationMethod, getNotificationSettings } from './settings';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const ANDROID_CHANNEL = 'prayer-adhan';
const ID_PREFIX = 'wirdak-prayer-';

export async function ensureNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
      name: t('notifs.channelAdhan'),
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0F7A5A',
      sound: 'default',
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  return finalStatus === 'granted';
}

export async function cancelPrayerNotifications(): Promise<void> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    all
      .filter((n) => n.identifier.startsWith(ID_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}

async function scheduleOne(
  identifier: string,
  title: string,
  body: string,
  date: Date,
  data: Record<string, string>
): Promise<boolean> {
  if (date.getTime() <= Date.now()) return false;
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title,
      body,
      sound: true,
      data,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      channelId: Platform.OS === 'android' ? ANDROID_CHANNEL : undefined,
    },
  });
  return true;
}

/**
 * جدولة إشعارات الأذان عند الموعد + تذكير قبل الصلاة (اختياري).
 */
export async function schedulePrayerNotifications(
  prayers: PrayerTimeEntry[],
  minutesBefore?: number
): Promise<number> {
  const lang = await getStoredLanguage();
  setI18nLocale(lang);

  const settings = await getNotificationSettings();
  if (!settings.enabled) {
    await cancelPrayerNotifications();
    return 0;
  }

  const granted = await ensureNotificationPermissions();
  if (!granted) return 0;

  await cancelPrayerNotifications();

  const prefs = await getAppPrefs();
  const offset = minutesBefore ?? settings.minutesBefore;
  const now = Date.now();
  let scheduled = 0;

  for (const [index, prayer] of prayers.entries()) {
    if (prayer.name === 'sunrise') continue;
    const name = t(`prayer.${prayer.name}`);
    const timeStr = formatTime(prayer.time, lang === 'tr' ? 'tr-TR' : lang === 'en' ? 'en-US' : 'ar-SA');

    const adhanOk = await scheduleOne(
      `${ID_PREFIX}adhan-${prayer.name}-${index}`,
      t('notifs.adhanTitle', { name }),
      t('notifs.adhanBody', { name, time: timeStr }),
      prayer.time,
      { kind: 'adhan', prayer: prayer.name, adhanSoundId: prefs.adhanSoundId }
    );
    if (adhanOk) scheduled += 1;

    if (offset > 0) {
      const reminder = new Date(prayer.time);
      reminder.setMinutes(reminder.getMinutes() - offset);
      if (reminder.getTime() > now) {
        const remOk = await scheduleOne(
          `${ID_PREFIX}prep-${prayer.name}-${index}`,
          t('notifs.prepTitle', { name }),
          t('notifs.prepBody', { name, minutes: offset, time: timeStr }),
          reminder,
          { kind: 'prayer_prep', prayer: prayer.name }
        );
        if (remOk) scheduled += 1;
      }
    }
  }

  return scheduled;
}

export async function reschedulePrayerNotificationsFromCache(): Promise<number> {
  const settings = await getNotificationSettings();
  if (!settings.enabled) {
    await cancelPrayerNotifications();
    return 0;
  }

  const loc = await getCachedLocation();
  if (!loc) return 0;

  const method = await getCalculationMethod();
  const prayers = getPrayerTimesForNotifications(
    loc.latitude,
    loc.longitude,
    loc.countryCode,
    loc.countryName,
    method
  );
  return schedulePrayerNotifications(prayers);
}
