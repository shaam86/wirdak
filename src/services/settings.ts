import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_RECITER_ID } from '../data/reciters';
import type { CalculationMethodId } from './prayerTimes';

const KEYS = {
  reciter: 'settings_reciter',
  notificationsEnabled: 'settings_notifications_enabled',
  notifyMinutesBefore: 'settings_notify_minutes',
  calculationMethod: 'settings_prayer_calculation_method',
  tasbihCount: 'tasbih_count',
  tasbihTarget: 'tasbih_target',
  widgetPayload: 'widget_prayer_payload',
};

export type AppSettings = {
  reciterId: string;
  notificationsEnabled: boolean;
  notifyMinutesBefore: number;
  calculationMethod: CalculationMethodId;
};

const METHOD_IDS: CalculationMethodId[] = [
  'auto',
  'egyptian',
  'umm_al_qura',
  'mwl',
  'karachi',
  'uae',
  'morocco',
];

export async function getReciterId(): Promise<string> {
  return (await AsyncStorage.getItem(KEYS.reciter)) ?? DEFAULT_RECITER_ID;
}

export async function setReciterId(id: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.reciter, id);
}

export async function getNotificationSettings(): Promise<{
  enabled: boolean;
  minutesBefore: number;
}> {
  const [enabled, minutes] = await Promise.all([
    AsyncStorage.getItem(KEYS.notificationsEnabled),
    AsyncStorage.getItem(KEYS.notifyMinutesBefore),
  ]);
  return {
    enabled: enabled !== 'false',
    minutesBefore: minutes ? Number(minutes) : 15,
  };
}

export async function setNotificationsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(KEYS.notificationsEnabled, String(enabled));
}

export async function setNotifyMinutesBefore(minutes: number): Promise<void> {
  await AsyncStorage.setItem(KEYS.notifyMinutesBefore, String(minutes));
}

export async function getCalculationMethod(): Promise<CalculationMethodId> {
  const raw = await AsyncStorage.getItem(KEYS.calculationMethod);
  if (raw && (METHOD_IDS as string[]).includes(raw)) {
    return raw as CalculationMethodId;
  }
  return 'auto';
}

export async function setCalculationMethod(method: CalculationMethodId): Promise<void> {
  await AsyncStorage.setItem(KEYS.calculationMethod, method);
}

export async function getTasbihState(): Promise<{ count: number; target: number }> {
  const [count, target] = await Promise.all([
    AsyncStorage.getItem(KEYS.tasbihCount),
    AsyncStorage.getItem(KEYS.tasbihTarget),
  ]);
  return {
    count: count ? Number(count) : 0,
    target: target ? Number(target) : 33,
  };
}

export async function setTasbihState(count: number, target: number): Promise<void> {
  await AsyncStorage.multiSet([
    [KEYS.tasbihCount, String(count)],
    [KEYS.tasbihTarget, String(target)],
  ]);
}

export type WidgetPrayerPayload = {
  updatedAt: string;
  locationName: string;
  nextPrayerAr: string;
  nextPrayerTime: string;
  prayers: { nameAr: string; time: string }[];
  ayahOfDay?: string;
  ayahRef?: string;
  wirdLine?: string;
  hijriLabel?: string;
  imsak?: string;
  iftar?: string;
};

export async function saveWidgetPayload(payload: WidgetPrayerPayload): Promise<void> {
  await AsyncStorage.setItem(KEYS.widgetPayload, JSON.stringify(payload));
}

export async function getWidgetPayload(): Promise<WidgetPrayerPayload | null> {
  const raw = await AsyncStorage.getItem(KEYS.widgetPayload);
  return raw ? (JSON.parse(raw) as WidgetPrayerPayload) : null;
}
