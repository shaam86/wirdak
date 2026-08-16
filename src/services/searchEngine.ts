import { adhkarCategories } from '../data/adhkar';
import { quranFullSurahs } from '../data/quranFull';
import { normalizeArabic } from '../utils/arabicNormalize';
import type { CustomDhikr } from './customAdhkar';
import { listCustomAdhkar } from './customAdhkar';

export type QuranSearchHit = {
  kind: 'quran';
  id: string;
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  snippet: string;
};

export type AdhkarSearchHit = {
  kind: 'adhkar';
  id: string;
  categoryId: string;
  categoryTitle: string;
  itemId: string;
  snippet: string;
};

export type SearchHit = QuranSearchHit | AdhkarSearchHit;

type IndexedAyah = {
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  text: string;
  norm: string;
};

let ayahIndex: IndexedAyah[] | null = null;
let customCache: CustomDhikr[] = [];

function parseSurahAyahs(text: string): { number: number; text: string }[] {
  const out: { number: number; text: string }[] = [];
  const re = /([^﴿]+)﴿([^﴾]+)﴾/g;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) != null) {
    i += 1;
    const ayahText = m[1].trim();
    const numRaw = m[2].replace(/[^\d٠-٩]/g, '');
    const eastern = '٠١٢٣٤٥٦٧٨٩';
    let n = i;
    if (numRaw) {
      const digits = [...numRaw]
        .map((ch) => {
          const ei = eastern.indexOf(ch);
          return ei >= 0 ? String(ei) : ch;
        })
        .join('');
      const parsed = Number(digits);
      if (!Number.isNaN(parsed)) n = parsed;
    }
    if (ayahText) out.push({ number: n, text: ayahText });
  }
  return out;
}

function ensureIndex(): IndexedAyah[] {
  if (ayahIndex) return ayahIndex;
  const rows: IndexedAyah[] = [];
  for (const surah of quranFullSurahs) {
    for (const ayah of parseSurahAyahs(surah.text)) {
      rows.push({
        surahNumber: surah.id,
        surahName: surah.name,
        ayahNumber: ayah.number,
        text: ayah.text,
        norm: normalizeArabic(ayah.text),
      });
    }
  }
  ayahIndex = rows;
  return rows;
}

function snippetAround(text: string, query: string, radius = 42): string {
  const normText = normalizeArabic(text);
  const normQ = normalizeArabic(query);
  const idx = normText.indexOf(normQ);
  if (idx < 0) {
    return text.length > 80 ? `${text.slice(0, 80)}…` : text;
  }
  const start = Math.max(0, Math.floor((idx / Math.max(normText.length, 1)) * text.length) - radius);
  const end = Math.min(text.length, start + radius * 2 + query.length);
  const slice = text.slice(start, end).trim();
  return `${start > 0 ? '…' : ''}${slice}${end < text.length ? '…' : ''}`;
}

/**
 * بحث فوري في القرآن والأذكار (بما فيها المخصّصة المخزّنة مؤقتاً).
 */
export function searchSmart(query: string, limit = 40): SearchHit[] {
  const q = normalizeArabic(query);
  if (q.length < 2) return [];

  const hits: SearchHit[] = [];

  for (const ayah of ensureIndex()) {
    if (!ayah.norm.includes(q)) continue;
    hits.push({
      kind: 'quran',
      id: `q-${ayah.surahNumber}-${ayah.ayahNumber}`,
      surahNumber: ayah.surahNumber,
      surahName: ayah.surahName,
      ayahNumber: ayah.ayahNumber,
      snippet: snippetAround(ayah.text, query),
    });
    if (hits.length >= limit) break;
  }

  if (hits.length < limit) {
    for (const cat of adhkarCategories) {
      for (const item of cat.items) {
        const hay = normalizeArabic(`${item.text} ${item.translation ?? ''} ${item.fadl ?? ''}`);
        if (!hay.includes(q)) continue;
        hits.push({
          kind: 'adhkar',
          id: `a-${cat.id}-${item.id}`,
          categoryId: cat.id,
          categoryTitle: cat.titleAr,
          itemId: item.id,
          snippet: snippetAround(item.text, query),
        });
        if (hits.length >= limit) break;
      }
      if (hits.length >= limit) break;
    }
  }

  if (hits.length < limit) {
    for (const item of customCache) {
      const hay = normalizeArabic(`${item.text} ${item.translation ?? ''}`);
      if (!hay.includes(q)) continue;
      hits.push({
        kind: 'adhkar',
        id: `a-custom-${item.id}`,
        categoryId: 'custom',
        categoryTitle: 'أذكاري الخاصة',
        itemId: item.id,
        snippet: snippetAround(item.text, query),
      });
      if (hits.length >= limit) break;
    }
  }

  return hits;
}

/** تجهيز فهرس القرآن + الأذكار المخصّصة */
export function warmSearchIndex(): void {
  ensureIndex();
  listCustomAdhkar()
    .then((rows) => {
      customCache = rows;
    })
    .catch(() => undefined);
}

export async function refreshCustomAdhkarSearchCache(): Promise<void> {
  customCache = await listCustomAdhkar();
}
