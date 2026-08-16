import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'wirdak_bookmarks_v1';

export type Bookmark = {
  id: string;
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  text: string;
  createdAt: string;
};

export async function getBookmarks(): Promise<Bookmark[]> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as Bookmark[]) : [];
}

export async function addBookmark(bookmark: Omit<Bookmark, 'id' | 'createdAt'>): Promise<Bookmark[]> {
  const list = await getBookmarks();
  const id = `${bookmark.surahNumber}:${bookmark.ayahNumber}`;
  const next = [
    {
      ...bookmark,
      id,
      createdAt: new Date().toISOString(),
    },
    ...list.filter((b) => b.id !== id),
  ];
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export async function removeBookmark(id: string): Promise<Bookmark[]> {
  const list = await getBookmarks();
  const next = list.filter((b) => b.id !== id);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export async function isBookmarked(surahNumber: number, ayahNumber: number): Promise<boolean> {
  const list = await getBookmarks();
  return list.some((b) => b.id === `${surahNumber}:${ayahNumber}`);
}
