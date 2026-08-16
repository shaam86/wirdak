import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import {
  getSmartNotificationById,
  pickRotatingBody,
  SMART_NOTIFICATIONS,
} from '../data/smartNotifications';
import { getCachedLocation } from './locationCache';
import { ensureNotificationPermissions } from './notifications';
import {
  CalculationMethodId,
  getPrayerTimes,
  PrayerName,
  PrayerTimeEntry,
} from './prayerTimes';
import { getAppPrefs } from './appPrefs';
import { getCalculationMethod } from './settings';

const KEY = 'wirdak_smart_notifications_v1';
const CHANNEL = 'wirdak-smart';
const ID_PREFIX = 'wirdak-smart-';

export type IntervalHours = 1 | 2 | 3 | 4 | 6;

export type SmartNotifToggle = {
  enabled: boolean;
};

export type SmartNotifPeriodic = SmartNotifToggle & {
  intervalHours: IntervalHours;
};

export type SmartNotificationSettings = {
  salawat: SmartNotifPeriodic;
  istighfar: SmartNotifPeriodic;
  friday_response_hour: SmartNotifToggle;
  kahf_friday_morning: SmartNotifToggle;
  kahf_friday_night: SmartNotifToggle;
  last_third_night: SmartNotifToggle;
  between_adhan_iqama: SmartNotifToggle;
  fast_monday_thursday: SmartNotifToggle;
  white_days: SmartNotifToggle;
};

export const DEFAULT_SMART_NOTIFICATIONS: SmartNotificationSettings = {
  salawat: { enabled: true, intervalHours: 1 },
  istighfar: { enabled: true, intervalHours: 2 },
  friday_response_hour: { enabled: true },
  kahf_friday_morning: { enabled: false }, // موجود أيضاً في منبّهات السور
  kahf_friday_night: { enabled: true },
  last_third_night: { enabled: true },
  between_adhan_iqama: { enabled: true },
  fast_monday_thursday: { enabled: true },
  white_days: { enabled: true },
};

export const INTERVAL_OPTIONS: { hours: IntervalHours; label: string }[] = [
  { hours: 1, label: 'كل ساعة' },
  { hours: 2, label: 'كل ساعتين' },
  { hours: 3, label: 'كل 3 ساعات' },
  { hours: 4, label: 'كل 4 ساعات' },
  { hours: 6, label: 'كل 6 ساعات' },
];

function cloneDefaults(): SmartNotificationSettings {
  return {
    salawat: { ...DEFAULT_SMART_NOTIFICATIONS.salawat },
    istighfar: { ...DEFAULT_SMART_NOTIFICATIONS.istighfar },
    friday_response_hour: { ...DEFAULT_SMART_NOTIFICATIONS.friday_response_hour },
    kahf_friday_morning: { ...DEFAULT_SMART_NOTIFICATIONS.kahf_friday_morning },
    kahf_friday_night: { ...DEFAULT_SMART_NOTIFICATIONS.kahf_friday_night },
    last_third_night: { ...DEFAULT_SMART_NOTIFICATIONS.last_third_night },
    between_adhan_iqama: { ...DEFAULT_SMART_NOTIFICATIONS.between_adhan_iqama },
    fast_monday_thursday: { ...DEFAULT_SMART_NOTIFICATIONS.fast_monday_thursday },
    white_days: { ...DEFAULT_SMART_NOTIFICATIONS.white_days },
  };
}

export async function getSmartNotificationSettings(): Promise<SmartNotificationSettings> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return cloneDefaults();
  try {
    const parsed = JSON.parse(raw) as Partial<SmartNotificationSettings>;
    const base = cloneDefaults();
    return {
      salawat: { ...base.salawat, ...parsed.salawat },
      istighfar: { ...base.istighfar, ...parsed.istighfar },
      friday_response_hour: { ...base.friday_response_hour, ...parsed.friday_response_hour },
      kahf_friday_morning: { ...base.kahf_friday_morning, ...parsed.kahf_friday_morning },
      kahf_friday_night: { ...base.kahf_friday_night, ...parsed.kahf_friday_night },
      last_third_night: { ...base.last_third_night, ...parsed.last_third_night },
      between_adhan_iqama: { ...base.between_adhan_iqama, ...parsed.between_adhan_iqama },
      fast_monday_thursday: { ...base.fast_monday_thursday, ...parsed.fast_monday_thursday },
      white_days: { ...base.white_days, ...parsed.white_days },
    };
  } catch {
    return cloneDefaults();
  }
}

export async function saveSmartNotificationSettings(
  settings: SmartNotificationSettings
): Promise<number> {
  await AsyncStorage.setItem(KEY, JSON.stringify(settings));
  return rescheduleSmartNotifications(settings);
}

async function ensureChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'تنبيهات وردك الذكية',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 200, 150, 200],
      lightColor: '#0E5F63',
    });
  }
}

export async function cancelSmartNotifications(): Promise<void> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    all
      .filter((n) => n.identifier.startsWith(ID_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}

function channelId() {
  return Platform.OS === 'android' ? CHANNEL : undefined;
}

async function scheduleInterval(
  id: string,
  title: string,
  body: string,
  seconds: number,
  data: Record<string, string>
) {
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: { title, body, sound: true, data },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(60, seconds),
      repeats: true,
      channelId: channelId(),
    },
  });
}

async function scheduleWeekly(
  id: string,
  title: string,
  body: string,
  weekday: number,
  hour: number,
  minute: number,
  data: Record<string, string>
) {
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: { title, body, sound: true, data },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday,
      hour,
      minute,
      channelId: channelId(),
    },
  });
}

async function scheduleDate(
  id: string,
  title: string,
  body: string,
  date: Date,
  data: Record<string, string>
) {
  if (date.getTime() <= Date.now() + 15_000) return false;
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: { title, body, sound: true, data },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      channelId: channelId(),
    },
  });
  return true;
}

/** Expo: Sunday = 1 … Saturday = 7 */
function nextWeekdayDate(weekday: number, hour: number, minute: number, from = new Date()): Date {
  const d = new Date(from);
  d.setSeconds(0, 0);
  d.setHours(hour, minute, 0, 0);
  const jsDay = d.getDay(); // 0=Sun
  const expoWeekday = jsDay + 1;
  let add = (weekday - expoWeekday + 7) % 7;
  if (add === 0 && d.getTime() <= from.getTime()) add = 7;
  d.setDate(d.getDate() + add);
  return d;
}

function getHijriDay(date: Date): number | null {
  try {
    const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      day: 'numeric',
    }).formatToParts(date);
    const day = parts.find((p) => p.type === 'day')?.value;
    return day ? Number(day) : null;
  } catch {
    try {
      const parts = new Intl.DateTimeFormat('en-u-ca-islamic', { day: 'numeric' }).formatToParts(
        date
      );
      const day = parts.find((p) => p.type === 'day')?.value;
      return day ? Number(day) : null;
    } catch {
      return null;
    }
  }
}

/** أقرب أمسيات يوم 12 هجري خلال الأشهر القادمة */
function nextWhiteDayReminders(count = 3, hour = 20, minute = 0): Date[] {
  const results: Date[] = [];
  const cursor = new Date();
  cursor.setHours(hour, minute, 0, 0);
  if (cursor.getTime() <= Date.now()) {
    cursor.setDate(cursor.getDate() + 1);
  }

  for (let i = 0; i < 120 && results.length < count; i += 1) {
    const d = new Date(cursor);
    d.setDate(cursor.getDate() + i);
    d.setHours(hour, minute, 0, 0);
    if (getHijriDay(d) === 12) results.push(d);
  }
  return results;
}

function prayerByName(times: PrayerTimeEntry[], name: PrayerName): Date | undefined {
  return times.find((p) => p.name === name)?.time;
}

function lastThirdStart(maghrib: Date, nextFajr: Date): Date {
  const span = nextFajr.getTime() - maghrib.getTime();
  return new Date(maghrib.getTime() + (span * 2) / 3);
}

function buildPrayerDays(
  lat: number,
  lng: number,
  days: number,
  countryCode?: string | null,
  countryName?: string | null,
  preferredMethod: CalculationMethodId = 'auto'
): PrayerTimeEntry[][] {
  const out: PrayerTimeEntry[][] = [];
  for (let i = 0; i < days; i += 1) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    date.setHours(12, 0, 0, 0);
    const { times } = getPrayerTimes(
      lat,
      lng,
      date,
      countryCode,
      countryName,
      preferredMethod
    );
    out.push(times);
  }
  return out;
}

export async function rescheduleSmartNotifications(
  settings?: SmartNotificationSettings
): Promise<number> {
  const cfg = settings ?? (await getSmartNotificationSettings());
  const granted = await ensureNotificationPermissions();
  if (!granted) return 0;

  await ensureChannel();
  await cancelSmartNotifications();

  let count = 0;
  const loc = await getCachedLocation();
  const appPrefs = await getAppPrefs();
  const preferredHours = appPrefs.preferredNotifHours?.length
    ? appPrefs.preferredNotifHours
    : [7, 12, 17, 21];

  async function schedulePreferredDaily(
    baseId: string,
    title: string,
    body: string,
    data: Record<string, string>
  ) {
    for (const [i, hour] of preferredHours.entries()) {
      await Notifications.scheduleNotificationAsync({
        identifier: `${baseId}-h${hour}-${i}`,
        content: { title, body, sound: true, data },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute: 0,
          channelId: channelId(),
        },
      });
      count += 1;
    }
  }

  // —— دورية / ساعات مفضّلة متعلَّمة ——
  if (cfg.salawat.enabled) {
    const item = getSmartNotificationById('salawat')!;
    if (preferredHours.length > 0) {
      await schedulePreferredDaily(
        `${ID_PREFIX}salawat`,
        item.title,
        pickRotatingBody(item),
        { kind: 'smart', id: 'salawat' }
      );
    } else {
      await scheduleInterval(
        `${ID_PREFIX}salawat`,
        item.title,
        pickRotatingBody(item),
        cfg.salawat.intervalHours * 3600,
        { kind: 'smart', id: 'salawat' }
      );
      count += 1;
    }
  }

  if (cfg.istighfar.enabled) {
    const item = getSmartNotificationById('istighfar')!;
    if (preferredHours.length > 0) {
      // نصف الساعات لتفادي الإزعاج
      const hours = preferredHours.filter((_, i) => i % 2 === 0);
      for (const [i, hour] of hours.entries()) {
        await Notifications.scheduleNotificationAsync({
          identifier: `${ID_PREFIX}istighfar-h${hour}-${i}`,
          content: {
            title: item.title,
            body: pickRotatingBody(item, Date.now() + 1),
            sound: true,
            data: { kind: 'smart', id: 'istighfar' },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour,
            minute: 20,
            channelId: channelId(),
          },
        });
        count += 1;
      }
    } else {
      await scheduleInterval(
        `${ID_PREFIX}istighfar`,
        item.title,
        pickRotatingBody(item, Date.now() + 1),
        cfg.istighfar.intervalHours * 3600,
        { kind: 'smart', id: 'istighfar' }
      );
      count += 1;
    }
  }

  // —— جمعة ——
  if (cfg.kahf_friday_morning.enabled) {
    const item = getSmartNotificationById('kahf_friday_morning')!;
    await scheduleWeekly(
      `${ID_PREFIX}kahf-morning`,
      item.title,
      item.body,
      6, // Friday
      9,
      0,
      { kind: 'smart', id: 'kahf_friday_morning', surahNumber: '18' }
    );
    count += 1;
  }

  if (cfg.kahf_friday_night.enabled) {
    const item = getSmartNotificationById('kahf_friday_night')!;
    await scheduleWeekly(
      `${ID_PREFIX}kahf-night`,
      item.title,
      item.body,
      5, // Thursday evening = ليلة الجمعة
      21,
      0,
      { kind: 'smart', id: 'kahf_friday_night', surahNumber: '18' }
    );
    count += 1;
  }

  // —— صيام الإثنين والخميس ——
  if (cfg.fast_monday_thursday.enabled) {
    const item = getSmartNotificationById('fast_monday_thursday')!;
    await scheduleWeekly(
      `${ID_PREFIX}fast-sun`,
      item.title,
      item.body,
      1, // Sunday evening → صيام الإثنين
      20,
      30,
      { kind: 'smart', id: 'fast_monday_thursday' }
    );
    await scheduleWeekly(
      `${ID_PREFIX}fast-wed`,
      item.title,
      'غداً الخميس تُعرض الأعمال. نوِ صيام غدٍ؛ فالصيام جُنّة والأجر مضاعف.',
      4, // Wednesday evening → صيام الخميس
      20,
      30,
      { kind: 'smart', id: 'fast_monday_thursday' }
    );
    count += 2;
  }

  // —— الأيام البيض ——
  if (cfg.white_days.enabled) {
    const item = getSmartNotificationById('white_days')!;
    const dates = nextWhiteDayReminders(3);
    for (const [i, date] of dates.entries()) {
      const ok = await scheduleDate(
        `${ID_PREFIX}white-${i}`,
        item.title,
        item.body,
        date,
        { kind: 'smart', id: 'white_days' }
      );
      if (ok) count += 1;
    }
  }

  // —— يعتمد على الموقع ومواقيت الصلاة ——
  if (loc) {
    const preferredMethod = await getCalculationMethod();
    const days = buildPrayerDays(
      loc.latitude,
      loc.longitude,
      3,
      loc.countryCode,
      loc.countryName,
      preferredMethod
    );

    if (cfg.friday_response_hour.enabled) {
      const item = getSmartNotificationById('friday_response_hour')!;
      let fridayScheduled = 0;
      for (let i = 0; i < days.length; i += 1) {
        const sample = prayerByName(days[i], 'maghrib');
        if (!sample || sample.getDay() !== 5) continue; // JS: 5 = Friday
        const trigger = new Date(sample);
        trigger.setHours(trigger.getHours() - 1);
        const ok = await scheduleDate(
          `${ID_PREFIX}friday-hour-${i}`,
          item.title,
          item.body,
          trigger,
          { kind: 'smart', id: 'friday_response_hour' }
        );
        if (ok) {
          fridayScheduled += 1;
          count += 1;
        }
      }
      if (fridayScheduled === 0) {
        const fallback = nextWeekdayDate(6, 16, 30);
        const ok = await scheduleDate(
          `${ID_PREFIX}friday-hour-fallback`,
          item.title,
          item.body,
          fallback,
          { kind: 'smart', id: 'friday_response_hour' }
        );
        if (ok) count += 1;
      }
    }

    if (cfg.last_third_night.enabled) {
      const item = getSmartNotificationById('last_third_night')!;
      for (let i = 0; i < days.length - 1; i += 1) {
        const maghrib = prayerByName(days[i], 'maghrib');
        const fajrNext = prayerByName(days[i + 1], 'fajr');
        if (!maghrib || !fajrNext) continue;
        const start = lastThirdStart(maghrib, fajrNext);
        const ok = await scheduleDate(
          `${ID_PREFIX}last-third-${i}`,
          item.title,
          item.body,
          start,
          { kind: 'smart', id: 'last_third_night' }
        );
        if (ok) count += 1;
      }
    }

    if (cfg.between_adhan_iqama.enabled) {
      const item = getSmartNotificationById('between_adhan_iqama')!;
      const prayerNames: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
      let idx = 0;
      for (const dayTimes of days) {
        for (const name of prayerNames) {
          const adhan = prayerByName(dayTimes, name);
          if (!adhan) continue;
          const trigger = new Date(adhan);
          trigger.setMinutes(trigger.getMinutes() + 3);
          const ok = await scheduleDate(
            `${ID_PREFIX}iqama-${idx}`,
            item.title,
            pickRotatingBody(item, idx),
            trigger,
            { kind: 'smart', id: 'between_adhan_iqama', prayer: name }
          );
          if (ok) count += 1;
          idx += 1;
        }
      }
    }
  } else {
    // بدون موقع: بدائل تقريبية للأوقات الحساسة
    if (cfg.friday_response_hour.enabled) {
      const item = getSmartNotificationById('friday_response_hour')!;
      await scheduleWeekly(
        `${ID_PREFIX}friday-hour-approx`,
        item.title,
        `${item.body} (فعّل الموقع لحساب أدق قبل المغرب)`,
        6,
        16,
        30,
        { kind: 'smart', id: 'friday_response_hour' }
      );
      count += 1;
    }

    if (cfg.last_third_night.enabled) {
      const item = getSmartNotificationById('last_third_night')!;
      await Notifications.scheduleNotificationAsync({
        identifier: `${ID_PREFIX}last-third-approx`,
        content: {
          title: item.title,
          body: `${item.body} (افتح مواقيت الصلاة لتفعيل الحساب الدقيق)`,
          sound: true,
          data: { kind: 'smart', id: 'last_third_night' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: 2,
          minute: 30,
          channelId: channelId(),
        },
      });
      count += 1;
    }
  }

  return count;
}

/** قائمة للواجهة: كل عنصر من قاعدة البيانات مع حالته */
export function listSmartNotificationMeta() {
  return SMART_NOTIFICATIONS.map((n) => ({
    id: n.id as keyof SmartNotificationSettings,
    title: n.title,
    schedule: n.schedule,
    trigger_type: n.trigger_type,
    icon: n.icon,
    body: n.body,
  }));
}
