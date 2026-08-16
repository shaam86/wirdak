import AsyncStorage from '@react-native-async-storage/async-storage';
import { getJuzForAyah, getJuzRange } from '../data/juz';
import { surahs } from '../data/surahs';
import { fetchMushafPage, MUSHAF_PAGE_COUNT, resolveMushafPage } from './quranApi';

const TABLE_KEY = 'wirdak_khatmah_table_v2';
const LEGACY_KEY = 'noor_khatmah_v1';
const LEGACY_TABLE_V1 = 'wirdak_khatmah_table_v1';
const LAST_READ_KEY = 'noor_last_read_v1';

/** مقدار الورد اليومي */
export type WirdAmount = 'juz' | 'surah' | 'page';

/**
 * سجل ختمة — يعادل صفّاً في جدول Khatmah
 */
export type KhatmahRecord = {
  khatmah_id: string;
  khatmah_name: string;
  creation_date: string;
  current_surah_id: number;
  current_ayah_id: number;
  /** صفحة المصحف الحالية (1–604) — أساس التنقّل المنظّم */
  current_page: number;
  is_completed: boolean;
  wird_amount: WirdAmount;
  completed_at: string | null;
};

export type LastRead = {
  surahNumber: number;
  surahNameAr: string;
  ayahNumber: number;
  updatedAt: string;
};

export const WIRD_AMOUNT_LABELS: Record<WirdAmount, string> = {
  juz: 'جزء يومياً',
  surah: 'سورة يومياً',
  page: 'صفحة مصحف يومياً',
};

const TOTAL_AYAHS = surahs.reduce((sum, s) => sum + s.ayahCount, 0);

function normalizeRecord(row: Partial<KhatmahRecord> & { khatmah_id: string }): KhatmahRecord {
  return {
    khatmah_id: row.khatmah_id,
    khatmah_name: row.khatmah_name ?? 'ختمة',
    creation_date: row.creation_date ?? new Date().toISOString(),
    current_surah_id: row.current_surah_id ?? 1,
    current_ayah_id: row.current_ayah_id ?? 1,
    current_page: row.current_page ?? 1,
    is_completed: !!row.is_completed,
    wird_amount: row.wird_amount ?? 'page',
    completed_at: row.completed_at ?? null,
  };
}

function newId(): string {
  return `khatmah_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function getSurahName(number: number) {
  return surahs.find((s) => s.number === number)?.nameAr ?? `سورة ${number}`;
}

function getSurahAyahCount(surahNumber: number) {
  return surahs.find((s) => s.number === surahNumber)?.ayahCount ?? 1;
}

/** عدد الآيات المقروءة حتى موضع (سورة، آية) شامل الآية الحالية */
export function ayahsReadUntil(surahId: number, ayahId: number): number {
  let count = 0;
  for (const s of surahs) {
    if (s.number < surahId) count += s.ayahCount;
    else if (s.number === surahId) {
      count += Math.min(Math.max(ayahId, 0), s.ayahCount);
      break;
    } else break;
  }
  return count;
}

export function getKhatmahProgress(record: KhatmahRecord): number {
  if (record.is_completed) return 1;
  const page = Math.max(1, Math.min(MUSHAF_PAGE_COUNT, record.current_page || 1));
  return Math.min(1, (page - 1) / MUSHAF_PAGE_COUNT);
}

export function getProgressPercent(record: KhatmahRecord): number {
  return Math.round(getKhatmahProgress(record) * 100);
}

async function readTable(): Promise<KhatmahRecord[]> {
  const raw = await AsyncStorage.getItem(TABLE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as KhatmahRecord[];
      return Array.isArray(parsed) ? parsed.map(normalizeRecord) : [];
    } catch {
      return [];
    }
  }

  // ترحيل من جدول v1
  const v1 = await AsyncStorage.getItem(LEGACY_TABLE_V1);
  if (v1) {
    try {
      const parsed = JSON.parse(v1) as KhatmahRecord[];
      const table = (Array.isArray(parsed) ? parsed : []).map((r) =>
        normalizeRecord({ ...r, current_page: r.current_page ?? 1, wird_amount: r.wird_amount ?? 'page' })
      );
      await writeTable(table);
      return table;
    } catch {
      // fall through
    }
  }

  // ترحيل من النظام الأقدم (ختمة واحدة)
  const legacy = await AsyncStorage.getItem(LEGACY_KEY);
  if (legacy) {
    try {
      const old = JSON.parse(legacy) as {
        resumeSurah?: number;
        resumeAyah?: number;
        startedAt?: string;
        completedKhatmahs?: number;
      };
      const migrated = normalizeRecord({
        khatmah_id: newId(),
        khatmah_name: 'ختمتي الأولى',
        creation_date: old.startedAt ?? new Date().toISOString(),
        current_surah_id: old.resumeSurah ?? 1,
        current_ayah_id: old.resumeAyah ?? 1,
        current_page: 1,
        is_completed: false,
        wird_amount: 'page',
        completed_at: null,
      });
      const extras: KhatmahRecord[] = [];
      for (let i = 0; i < (old.completedKhatmahs ?? 0); i += 1) {
        extras.push(
          normalizeRecord({
            khatmah_id: newId(),
            khatmah_name: `ختمة مكتملة ${i + 1}`,
            creation_date: old.startedAt ?? new Date().toISOString(),
            current_surah_id: 114,
            current_ayah_id: 6,
            current_page: MUSHAF_PAGE_COUNT,
            is_completed: true,
            wird_amount: 'page',
            completed_at: new Date().toISOString(),
          })
        );
      }
      const table = [...extras, migrated];
      await writeTable(table);
      return table;
    } catch {
      // fall through
    }
  }

  return [];
}

async function writeTable(rows: KhatmahRecord[]): Promise<void> {
  await AsyncStorage.setItem(TABLE_KEY, JSON.stringify(rows));
}

export async function listKhatmahs(): Promise<KhatmahRecord[]> {
  const rows = await readTable();
  return rows.sort((a, b) => {
    if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
    return b.creation_date.localeCompare(a.creation_date);
  });
}

export async function getKhatmahById(id: string): Promise<KhatmahRecord | null> {
  const rows = await readTable();
  return rows.find((r) => r.khatmah_id === id) ?? null;
}

export async function createKhatmah(
  name: string,
  wirdAmount: WirdAmount = 'page'
): Promise<KhatmahRecord> {
  const rows = await readTable();
  const record = normalizeRecord({
    khatmah_id: newId(),
    khatmah_name: name.trim() || `ختمة ${rows.length + 1}`,
    creation_date: new Date().toISOString(),
    current_surah_id: 1,
    current_ayah_id: 1,
    current_page: 1,
    is_completed: false,
    wird_amount: wirdAmount,
    completed_at: null,
  });
  rows.unshift(record);
  await writeTable(rows);
  return record;
}

export async function updateKhatmahPosition(
  khatmahId: string,
  surahId: number,
  ayahId: number,
  page?: number
): Promise<KhatmahRecord | null> {
  const rows = await readTable();
  const idx = rows.findIndex((r) => r.khatmah_id === khatmahId);
  if (idx < 0) return null;

  const maxAyah = getSurahAyahCount(surahId);
  const resolvedPage =
    page ??
    (await resolveMushafPage(surahId, ayahId).catch(() => rows[idx].current_page || 1));

  rows[idx] = {
    ...rows[idx],
    current_surah_id: Math.min(114, Math.max(1, surahId)),
    current_ayah_id: Math.min(maxAyah, Math.max(1, ayahId)),
    current_page: Math.min(MUSHAF_PAGE_COUNT, Math.max(1, resolvedPage)),
    is_completed: false,
    completed_at: null,
  };

  await writeTable(rows);
  return rows[idx];
}

/** يضمن أن current_page متزامن مع السورة/الآية */
export async function ensureKhatmahPage(khatmahId: string): Promise<KhatmahRecord | null> {
  const rows = await readTable();
  const idx = rows.findIndex((r) => r.khatmah_id === khatmahId);
  if (idx < 0) return null;
  const r = rows[idx];
  const looksStale =
    !r.current_page ||
    (r.current_page === 1 && (r.current_surah_id > 1 || r.current_ayah_id > 1));
  if (!looksStale) return r;
  try {
    const page = await resolveMushafPage(r.current_surah_id, r.current_ayah_id);
    rows[idx] = { ...r, current_page: page };
    await writeTable(rows);
    return rows[idx];
  } catch {
    return r;
  }
}

/**
 * أكملت الصفحة الحالية → احفظ وانتقل لبداية الصفحة التالية
 */
export async function completeMushafPage(khatmahId: string): Promise<{
  record: KhatmahRecord;
  completedKhatmah: boolean;
  nextPage: number;
}> {
  const rows = await readTable();
  const idx = rows.findIndex((r) => r.khatmah_id === khatmahId);
  if (idx < 0) throw new Error('الختمة غير موجودة');

  const current = rows[idx];
  if (current.is_completed) {
    return { record: current, completedKhatmah: true, nextPage: MUSHAF_PAGE_COUNT };
  }

  const page = Math.max(1, current.current_page || 1);
  if (page >= MUSHAF_PAGE_COUNT) {
    rows[idx] = {
      ...current,
      current_page: MUSHAF_PAGE_COUNT,
      current_surah_id: 114,
      current_ayah_id: 6,
      is_completed: true,
      completed_at: new Date().toISOString(),
    };
    await writeTable(rows);
    return { record: rows[idx], completedKhatmah: true, nextPage: MUSHAF_PAGE_COUNT };
  }

  const nextPage = page + 1;
  const pageData = await fetchMushafPage(nextPage);
  const first = pageData.ayahs[0];
  rows[idx] = {
    ...current,
    current_page: nextPage,
    current_surah_id: first?.surahNumber ?? current.current_surah_id,
    current_ayah_id: first?.numberInSurah ?? 1,
    is_completed: false,
    completed_at: null,
  };
  await writeTable(rows);
  return { record: rows[idx], completedKhatmah: false, nextPage };
}

export async function renameKhatmah(khatmahId: string, name: string): Promise<void> {
  const rows = await readTable();
  const idx = rows.findIndex((r) => r.khatmah_id === khatmahId);
  if (idx < 0) return;
  rows[idx] = { ...rows[idx], khatmah_name: name.trim() || rows[idx].khatmah_name };
  await writeTable(rows);
}

export async function deleteKhatmah(khatmahId: string): Promise<void> {
  const rows = await readTable();
  await writeTable(rows.filter((r) => r.khatmah_id !== khatmahId));
}

export async function markKhatmahCompleted(khatmahId: string): Promise<KhatmahRecord | null> {
  const rows = await readTable();
  const idx = rows.findIndex((r) => r.khatmah_id === khatmahId);
  if (idx < 0) return null;
  rows[idx] = {
    ...rows[idx],
    is_completed: true,
    completed_at: new Date().toISOString(),
    current_surah_id: 114,
    current_ayah_id: 6,
    current_page: MUSHAF_PAGE_COUNT,
  };
  await writeTable(rows);
  return rows[idx];
}

/** تقدّم موضع الختمة بمقدار ورد واحد */
export async function completeDailyWird(khatmahId: string): Promise<KhatmahRecord | null> {
  const rows = await readTable();
  const idx = rows.findIndex((r) => r.khatmah_id === khatmahId);
  if (idx < 0) return null;

  const current = rows[idx];
  if (current.is_completed) return current;

  const next = advanceByWird(
    current.current_surah_id,
    current.current_ayah_id,
    current.wird_amount
  );

  if (next.completed) {
    rows[idx] = {
      ...current,
      current_surah_id: 114,
      current_ayah_id: 6,
      current_page: MUSHAF_PAGE_COUNT,
      is_completed: true,
      completed_at: new Date().toISOString(),
    };
  } else {
    const page = await resolveMushafPage(next.surahId, next.ayahId).catch(() => current.current_page);
    rows[idx] = {
      ...current,
      current_surah_id: next.surahId,
      current_ayah_id: next.ayahId,
      current_page: page,
    };
  }

  await writeTable(rows);
  return rows[idx];
}

function advanceByWird(
  surahId: number,
  ayahId: number,
  amount: WirdAmount
): { surahId: number; ayahId: number; completed: boolean } {
  if (amount === 'juz') {
    const juz = getJuzForAyah(surahId, ayahId);
    if (juz >= 30) return { surahId: 114, ayahId: 6, completed: true };
    const range = getJuzRange(juz + 1);
    return {
      surahId: range.from.startSurah,
      ayahId: range.from.startAyah,
      completed: false,
    };
  }

  if (amount === 'surah') {
    if (surahId >= 114) return { surahId: 114, ayahId: 6, completed: true };
    return { surahId: surahId + 1, ayahId: 1, completed: false };
  }

  // page ≈ 15 آيات
  let remaining = 15;
  let s = surahId;
  let a = ayahId;
  while (remaining > 0) {
    const max = getSurahAyahCount(s);
    const room = max - a + 1;
    if (remaining < room) {
      a += remaining;
      remaining = 0;
    } else {
      remaining -= room;
      if (s >= 114) return { surahId: 114, ayahId: 6, completed: true };
      s += 1;
      a = 1;
    }
  }
  return { surahId: s, ayahId: a, completed: s === 114 && a >= 6 };
}

export function getWirdTargetLabel(record: KhatmahRecord): string {
  if (record.wird_amount === 'juz') {
    const juz = getJuzForAyah(record.current_surah_id, record.current_ayah_id);
    return `ورد اليوم: الجزء ${juz}`;
  }
  if (record.wird_amount === 'surah') {
    return `ورد اليوم: سورة ${getSurahName(record.current_surah_id)}`;
  }
  return `الصفحة الحالية: ${record.current_page || 1} / ${MUSHAF_PAGE_COUNT}`;
}

export function getPositionLabel(record: KhatmahRecord): string {
  return `صفحة ${record.current_page || 1} • ${getSurahName(record.current_surah_id)} — آية ${record.current_ayah_id}`;
}

export function getActiveKhatmahSummary(rows: KhatmahRecord[]) {
  const active = rows.filter((r) => !r.is_completed);
  const completed = rows.filter((r) => r.is_completed).length;
  return { activeCount: active.length, completedCount: completed, primary: active[0] ?? null };
}

// —— فهرس القراءة العام (معزول تماماً عن الختمات) ——

export async function getLastRead(): Promise<LastRead | null> {
  const raw = await AsyncStorage.getItem(LAST_READ_KEY);
  return raw ? (JSON.parse(raw) as LastRead) : null;
}

export async function saveLastRead(pos: LastRead): Promise<void> {
  await AsyncStorage.setItem(LAST_READ_KEY, JSON.stringify(pos));
}

export async function saveIndexReadingPosition(
  surahNumber: number,
  ayahNumber: number
): Promise<void> {
  await saveLastRead({
    surahNumber,
    surahNameAr: getSurahName(surahNumber),
    ayahNumber,
    updatedAt: new Date().toISOString(),
  });
}

export { getSurahName, TOTAL_AYAHS };
