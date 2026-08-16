import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'wirdak_adhkar_progress_v1';

export type CategoryProgress = {
  remainingMap: Record<string, number>;
  index: number;
  finished: boolean;
};

type Store = {
  /** YYYY-MM-DD بتوقيت الجهاز */
  date: string;
  byCategory: Record<string, CategoryProgress>;
};

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function readStore(): Promise<Store> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return { date: todayKey(), byCategory: {} };
  try {
    const parsed = JSON.parse(raw) as Store;
    if (parsed.date !== todayKey()) {
      return { date: todayKey(), byCategory: {} };
    }
    return parsed;
  } catch {
    return { date: todayKey(), byCategory: {} };
  }
}

export async function loadAdhkarProgress(
  categoryId: string
): Promise<CategoryProgress | null> {
  const store = await readStore();
  return store.byCategory[categoryId] ?? null;
}

export async function saveAdhkarProgress(
  categoryId: string,
  progress: CategoryProgress
): Promise<void> {
  const store = await readStore();
  store.byCategory[categoryId] = progress;
  await AsyncStorage.setItem(KEY, JSON.stringify(store));
}

export async function clearAdhkarProgress(categoryId: string): Promise<void> {
  const store = await readStore();
  delete store.byCategory[categoryId];
  await AsyncStorage.setItem(KEY, JSON.stringify(store));
}
