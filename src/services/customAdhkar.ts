import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'wirdak_custom_adhkar_v1';

export type CustomDhikr = {
  id: string;
  text: string;
  translation?: string;
  count: number;
  source?: string;
  createdAt: string;
};

export async function listCustomAdhkar(): Promise<CustomDhikr[]> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as CustomDhikr[]) : [];
}

export async function addCustomDhikr(input: {
  text: string;
  translation?: string;
  count?: number;
  source?: string;
}): Promise<CustomDhikr> {
  const rows = await listCustomAdhkar();
  const item: CustomDhikr = {
    id: `custom_${Date.now()}`,
    text: input.text.trim(),
    translation: input.translation?.trim(),
    count: Math.max(1, input.count ?? 1),
    source: input.source?.trim() || 'أذكاري',
    createdAt: new Date().toISOString(),
  };
  rows.unshift(item);
  await AsyncStorage.setItem(KEY, JSON.stringify(rows));
  return item;
}

export async function removeCustomDhikr(id: string): Promise<void> {
  const rows = await listCustomAdhkar();
  await AsyncStorage.setItem(KEY, JSON.stringify(rows.filter((r) => r.id !== id)));
}
