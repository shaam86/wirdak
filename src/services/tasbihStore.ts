import AsyncStorage from '@react-native-async-storage/async-storage';

const TABLE_KEY = 'wirdak_tasbih_table_v1';
const LEGACY_COUNT = 'tasbih_count';
const LEGACY_TARGET = 'tasbih_target';

export type TasbihRecord = {
  /** عدّ الجلسة الحالية */
  session_count: number;
  /** الهدف الحالي (33 / 100 / مخصص) */
  target: number;
  /** الذكر النشط */
  dhikr_id: string;
  /** المجموع التراكمي لكل التسبيحات */
  lifetime_total: number;
  /** مجموع تراكمي لكل نوع ذكر */
  per_dhikr: Record<string, number>;
  updated_at: string;
};

const DEFAULT: TasbihRecord = {
  session_count: 0,
  target: 33,
  dhikr_id: 'subhanallah',
  lifetime_total: 0,
  per_dhikr: {},
  updated_at: new Date().toISOString(),
};

async function read(): Promise<TasbihRecord> {
  const raw = await AsyncStorage.getItem(TABLE_KEY);
  if (raw) {
    return { ...DEFAULT, ...(JSON.parse(raw) as TasbihRecord) };
  }

  // ترحيل من المفاتيح القديمة إن وُجدت
  const [count, target] = await Promise.all([
    AsyncStorage.getItem(LEGACY_COUNT),
    AsyncStorage.getItem(LEGACY_TARGET),
  ]);
  if (count || target) {
    const migrated: TasbihRecord = {
      ...DEFAULT,
      session_count: count ? Number(count) : 0,
      target: target ? Number(target) : 33,
      lifetime_total: count ? Number(count) : 0,
      updated_at: new Date().toISOString(),
    };
    await write(migrated);
    return migrated;
  }
  return { ...DEFAULT };
}

async function write(row: TasbihRecord): Promise<void> {
  await AsyncStorage.setItem(TABLE_KEY, JSON.stringify(row));
}

export async function getTasbihRecord(): Promise<TasbihRecord> {
  return read();
}

export async function setTasbihTarget(target: number): Promise<TasbihRecord> {
  const row = await read();
  row.target = Math.max(1, Math.min(target, 10000));
  row.session_count = 0;
  row.updated_at = new Date().toISOString();
  await write(row);
  return row;
}

export async function setTasbihDhikr(dhikrId: string): Promise<TasbihRecord> {
  const row = await read();
  row.dhikr_id = dhikrId;
  row.session_count = 0;
  row.updated_at = new Date().toISOString();
  await write(row);
  return row;
}

export async function resetTasbihSession(): Promise<TasbihRecord> {
  const row = await read();
  row.session_count = 0;
  row.updated_at = new Date().toISOString();
  await write(row);
  return row;
}

/**
 * زيادة واحدة — تحدّث الجلسة + Lifetime Total + لكل ذكر
 */
export async function incrementTasbih(): Promise<{
  record: TasbihRecord;
  hitTarget: boolean;
  hitMilestone: boolean;
}> {
  const row = await read();
  row.session_count += 1;
  row.lifetime_total += 1;
  row.per_dhikr[row.dhikr_id] = (row.per_dhikr[row.dhikr_id] ?? 0) + 1;
  row.updated_at = new Date().toISOString();
  await write(row);

  const hitTarget = row.session_count > 0 && row.session_count % row.target === 0;
  const hitMilestone =
    hitTarget || row.session_count % 33 === 0 || row.session_count % 100 === 0;

  return { record: row, hitTarget, hitMilestone };
}
