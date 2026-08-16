import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFullSurah } from '../data/quranFull';
import { getReciterById } from '../data/reciters';
import { getReciterId } from './settings';

export type Ayah = {
  number: number;
  numberInSurah: number;
  text: string;
  translation?: string;
  page?: number;
  juz?: number;
};

export type SurahDetail = {
  number: number;
  name: string;
  nameAr: string;
  revelationType?: string;
  ayahs: Ayah[];
};

export type PageAyah = Ayah & {
  surahNumber: number;
  surahNameAr: string;
  surahNameEn?: string;
};

export type MushafPageData = {
  page: number;
  juz: number;
  ayahs: PageAyah[];
};

const CACHE_PREFIX = 'quran_surah_uthmani_v2_';
const PAGE_CACHE_PREFIX = 'quran_page_uthmani_v1_';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const MUSHAF_PAGE_COUNT = 604;

type CachedSurah = {
  data: SurahDetail;
  cachedAt: number;
};

export async function getAudioUrl(surahNumber: number, ayahNumber: number): Promise<string> {
  const reciterId = await getReciterId();
  const reciter = getReciterById(reciterId);
  const paddedSurah = String(surahNumber).padStart(3, '0');
  const paddedAyah = String(ayahNumber).padStart(3, '0');
  return `https://everyayah.com/data/${reciter.ayahPath}/${paddedSurah}${paddedAyah}.mp3`;
}

export type SurahLoadSource = 'network' | 'cache' | 'bundle';

export type SurahFetchResult = {
  surah: SurahDetail;
  source: SurahLoadSource;
};

function surahFromLocalBundle(surahNumber: number): SurahDetail {
  const full = getFullSurah(surahNumber);
  if (!full) throw new Error('Failed to fetch surah (offline)');

  const parts = full.text
    .split(/(?=﴿)/)
    .map((p) => p.trim())
    .filter(Boolean);
  const ayahList: Ayah[] = parts.map((chunk, i) => {
    const text = chunk.replace(/﴿[^﴾]+﴾/g, '').trim() || chunk;
    return {
      number: surahNumber * 1000 + (i + 1),
      numberInSurah: i + 1,
      text,
    };
  });

  if (!ayahList.length) {
    ayahList.push({
      number: surahNumber * 1000 + 1,
      numberInSurah: 1,
      text: full.text,
    });
  }

  return {
    number: surahNumber,
    name: full.name,
    nameAr: full.name,
    revelationType: full.type === 'مكية' ? 'Meccan' : 'Medinan',
    ayahs: ayahList,
  };
}

export async function fetchSurahWithSource(surahNumber: number): Promise<SurahFetchResult> {
  const cacheKey = `${CACHE_PREFIX}${surahNumber}`;
  const cached = await AsyncStorage.getItem(cacheKey);

  if (cached) {
    const parsed: CachedSurah = JSON.parse(cached);
    if (Date.now() - parsed.cachedAt < CACHE_TTL_MS) {
      return { surah: parsed.data, source: 'cache' };
    }
  }

  try {
    const [arabicRes, translationRes] = await Promise.all([
      fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/quran-uthmani`),
      fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/en.sahih`),
    ]);

    if (!arabicRes.ok || !translationRes.ok) {
      throw new Error('Failed to fetch surah');
    }

    const arabic = await arabicRes.json();
    const translation = await translationRes.json();

    const detail: SurahDetail = {
      number: surahNumber,
      name: arabic.data.englishName,
      nameAr: arabic.data.name,
      revelationType: arabic.data.revelationType,
      ayahs: arabic.data.ayahs.map(
        (
          ayah: {
            number: number;
            numberInSurah: number;
            text: string;
            page?: number;
            juz?: number;
          },
          i: number
        ) => ({
          number: ayah.number,
          numberInSurah: ayah.numberInSurah,
          text: ayah.text,
          page: ayah.page,
          juz: ayah.juz,
          translation: translation.data.ayahs[i]?.text,
        })
      ),
    };

    await AsyncStorage.setItem(cacheKey, JSON.stringify({ data: detail, cachedAt: Date.now() }));
    return { surah: detail, source: 'network' };
  } catch {
    if (cached) {
      return { surah: (JSON.parse(cached) as CachedSurah).data, source: 'cache' };
    }
    return { surah: surahFromLocalBundle(surahNumber), source: 'bundle' };
  }
}

export async function fetchSurah(surahNumber: number): Promise<SurahDetail> {
  const { surah } = await fetchSurahWithSource(surahNumber);
  return surah;
}

export async function fetchMushafPage(pageNumber: number): Promise<MushafPageData> {
  const page = Math.min(MUSHAF_PAGE_COUNT, Math.max(1, pageNumber));
  const cacheKey = `${PAGE_CACHE_PREFIX}${page}`;
  const cached = await AsyncStorage.getItem(cacheKey);
  if (cached) {
    const parsed = JSON.parse(cached) as { data: MushafPageData; cachedAt: number };
    if (Date.now() - parsed.cachedAt < CACHE_TTL_MS) return parsed.data;
  }

  try {
    const res = await fetch(`https://api.alquran.cloud/v1/page/${page}/quran-uthmani`);
    if (!res.ok) throw new Error('Failed to fetch page');
    const json = await res.json();
    const ayahsRaw = json.data.ayahs as Array<{
      number: number;
      numberInSurah: number;
      text: string;
      page?: number;
      juz?: number;
      surah: { number: number; name: string; englishName: string };
    }>;

    const data: MushafPageData = {
      page,
      juz: ayahsRaw[0]?.juz ?? 1,
      ayahs: ayahsRaw.map((ayah) => ({
        number: ayah.number,
        numberInSurah: ayah.numberInSurah,
        text: ayah.text,
        page: ayah.page ?? page,
        juz: ayah.juz,
        surahNumber: ayah.surah.number,
        surahNameAr: ayah.surah.name.replace(/^سُورَةُ\s*/, '').replace(/^سورة\s*/, ''),
        surahNameEn: ayah.surah.englishName,
      })),
    };

    await AsyncStorage.setItem(cacheKey, JSON.stringify({ data, cachedAt: Date.now() }));
    return data;
  } catch {
    // استخدم الكاش حتى لو منتهي الصلاحية عند انقطاع الشبكة
    if (cached) {
      return (JSON.parse(cached) as { data: MushafPageData }).data;
    }
    throw new Error('Failed to fetch page (offline)');
  }
}

export async function resolveMushafPage(surahNumber: number, ayahNumber: number): Promise<number> {
  const surah = await fetchSurah(surahNumber);
  const ayah = surah.ayahs.find((a) => a.numberInSurah === ayahNumber) ?? surah.ayahs[0];
  return ayah?.page ?? 1;
}
