import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'tafsir_ibn_kathir_';
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

type Cached = { text: string; cachedAt: number };

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h\d>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function fetchArabicIbnKathir(surah: number, ayah: number): Promise<string | null> {
  const url = `https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/${surah}/${ayah}.json`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (!data?.text) return null;
  return stripHtml(String(data.text));
}

async function fetchEnglishIbnKathir(surah: number, ayah: number): Promise<string | null> {
  const url = `https://api.quran.com/api/v4/tafsirs/en-tafsir-ibn-kathir/by_ayah/${surah}:${ayah}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const text = data?.tafsir?.text;
  if (!text) return null;
  return stripHtml(String(text));
}

export async function fetchIbnKathirTafsir(
  surahNumber: number,
  ayahNumber: number
): Promise<{ text: string; language: 'ar' | 'en' }> {
  const cacheKey = `${CACHE_PREFIX}${surahNumber}_${ayahNumber}`;
  const cached = await AsyncStorage.getItem(cacheKey);
  if (cached) {
    const parsed: Cached & { language?: 'ar' | 'en' } = JSON.parse(cached);
    if (Date.now() - parsed.cachedAt < CACHE_TTL_MS && parsed.text) {
      return { text: parsed.text, language: parsed.language ?? 'ar' };
    }
  }

  let text = await fetchArabicIbnKathir(surahNumber, ayahNumber);
  let language: 'ar' | 'en' = 'ar';

  if (!text) {
    text = await fetchEnglishIbnKathir(surahNumber, ayahNumber);
    language = 'en';
  }

  if (!text) {
    throw new Error('تعذّر جلب تفسير ابن كثير لهذه الآية');
  }

  await AsyncStorage.setItem(
    cacheKey,
    JSON.stringify({ text, language, cachedAt: Date.now() } satisfies Cached & { language: 'ar' | 'en' })
  );

  return { text, language };
}
