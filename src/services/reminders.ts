import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { ensureNotificationPermissions } from './notifications';

const KEY = 'wirdak_reminders_v1';
const CHANNEL = 'wirdak-reminders';

export type TimeHM = { hour: number; minute: number };

export type ReminderSettings = {
  morningAdhkar: { enabled: boolean; time: TimeHM };
  eveningAdhkar: { enabled: boolean; time: TimeHM };
  kahf: { enabled: boolean; time: TimeHM }; // Friday
  mulk: { enabled: boolean; time: TimeHM };
  baqarah: { enabled: boolean; time: TimeHM };
};

export const DEFAULT_REMINDERS: ReminderSettings = {
  morningAdhkar: { enabled: true, time: { hour: 5, minute: 0 } },
  eveningAdhkar: { enabled: true, time: { hour: 19, minute: 30 } },
  kahf: { enabled: true, time: { hour: 9, minute: 0 } },
  mulk: { enabled: true, time: { hour: 0, minute: 0 } },
  baqarah: { enabled: false, time: { hour: 20, minute: 30 } },
};

export function formatHM(t: TimeHM): string {
  const h = String(t.hour).padStart(2, '0');
  const m = String(t.minute).padStart(2, '0');
  return `${h}:${m}`;
}

export async function getReminderSettings(): Promise<ReminderSettings> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) {
    return {
      morningAdhkar: { ...DEFAULT_REMINDERS.morningAdhkar },
      eveningAdhkar: { ...DEFAULT_REMINDERS.eveningAdhkar },
      kahf: { ...DEFAULT_REMINDERS.kahf },
      mulk: { ...DEFAULT_REMINDERS.mulk },
      baqarah: { ...DEFAULT_REMINDERS.baqarah },
    };
  }
  const parsed = JSON.parse(raw) as Partial<ReminderSettings>;
  return {
    morningAdhkar: { ...DEFAULT_REMINDERS.morningAdhkar, ...parsed.morningAdhkar },
    eveningAdhkar: { ...DEFAULT_REMINDERS.eveningAdhkar, ...parsed.eveningAdhkar },
    kahf: { ...DEFAULT_REMINDERS.kahf, ...parsed.kahf },
    mulk: { ...DEFAULT_REMINDERS.mulk, ...parsed.mulk },
    baqarah: { ...DEFAULT_REMINDERS.baqarah, ...parsed.baqarah },
  };
}

export async function saveReminderSettings(settings: ReminderSettings): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(settings));
  await rescheduleAllReminders(settings);
}

async function ensureChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'منبّهات وردك',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0E5F63',
    });
  }
}

export async function cancelReminderNotifications(): Promise<void> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    all
      .filter((n) => n.identifier.startsWith('wirdak-reminder-'))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}

async function scheduleDaily(
  id: string,
  title: string,
  body: string,
  time: TimeHM,
  data: Record<string, string>
) {
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: { title, body, sound: true, data },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: time.hour,
      minute: time.minute,
      channelId: Platform.OS === 'android' ? CHANNEL : undefined,
    },
  });
}

async function scheduleWeeklyFriday(
  id: string,
  title: string,
  body: string,
  time: TimeHM,
  data: Record<string, string>
) {
  // Expo: Sunday = 1 ... Friday = 6
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: { title, body, sound: true, data },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 6,
      hour: time.hour,
      minute: time.minute,
      channelId: Platform.OS === 'android' ? CHANNEL : undefined,
    },
  });
}

export async function rescheduleAllReminders(settings?: ReminderSettings): Promise<number> {
  const cfg = settings ?? (await getReminderSettings());
  const granted = await ensureNotificationPermissions();
  if (!granted) return 0;

  await ensureChannel();
  await cancelReminderNotifications();

  let count = 0;

  if (cfg.morningAdhkar.enabled) {
    await scheduleDaily(
      'wirdak-reminder-adhkar-morning',
      'أذكار الصباح',
      'حان وقت أذكار الصباح — بارك الله صباحك',
      cfg.morningAdhkar.time,
      { kind: 'adhkar', categoryId: 'morning' }
    );
    count += 1;
  }

  if (cfg.eveningAdhkar.enabled) {
    await scheduleDaily(
      'wirdak-reminder-adhkar-evening',
      'أذكار المساء',
      'حان وقت أذكار المساء — لا تنسَ وردك',
      cfg.eveningAdhkar.time,
      { kind: 'adhkar', categoryId: 'evening' }
    );
    count += 1;
  }

  if (cfg.kahf.enabled) {
    await scheduleWeeklyFriday(
      'wirdak-reminder-surah-kahf',
      'سورة الكهف',
      'يوم الجمعة — حان وقت قراءة سورة الكهف',
      cfg.kahf.time,
      { kind: 'surah', surahNumber: '18', surahName: 'الكهف' }
    );
    count += 1;
  }

  if (cfg.mulk.enabled) {
    await scheduleDaily(
      'wirdak-reminder-surah-mulk',
      'سورة الملك',
      'حان وقت قراءة سورة الملك',
      cfg.mulk.time,
      { kind: 'surah', surahNumber: '67', surahName: 'الملك' }
    );
    count += 1;
  }

  if (cfg.baqarah.enabled) {
    await scheduleDaily(
      'wirdak-reminder-surah-baqarah',
      'سورة البقرة',
      'حان وقت قراءة سورة البقرة',
      cfg.baqarah.time,
      { kind: 'surah', surahNumber: '2', surahName: 'البقرة' }
    );
    count += 1;
  }

  return count;
}

export const TIME_PRESETS: TimeHM[] = [
  { hour: 0, minute: 0 },
  { hour: 5, minute: 0 },
  { hour: 6, minute: 0 },
  { hour: 8, minute: 0 },
  { hour: 9, minute: 0 },
  { hour: 12, minute: 0 },
  { hour: 18, minute: 0 },
  { hour: 19, minute: 30 },
  { hour: 20, minute: 30 },
  { hour: 21, minute: 0 },
  { hour: 22, minute: 0 },
];
