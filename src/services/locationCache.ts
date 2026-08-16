import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'wirdak_location_cache_v1';

export type CachedLocation = {
  latitude: number;
  longitude: number;
  countryCode?: string | null;
  countryName?: string | null;
  updatedAt: string;
};

export async function saveCachedLocation(loc: Omit<CachedLocation, 'updatedAt'>): Promise<void> {
  const payload: CachedLocation = { ...loc, updatedAt: new Date().toISOString() };
  await AsyncStorage.setItem(KEY, JSON.stringify(payload));
}

export async function getCachedLocation(): Promise<CachedLocation | null> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CachedLocation;
  } catch {
    return null;
  }
}
