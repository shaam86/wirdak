import AsyncStorage from '@react-native-async-storage/async-storage';

const ACTIVITY_KEY = 'wirdak_activity_table_v1';
const BADGES_KEY = 'wirdak_badges_table_v1';

export type ActivityKind = 'adhkar' | 'quran' | 'tasbih' | 'wird';

/** صف يوم في جدول النشاط */
export type ActivityDay = {
  date: string; // YYYY-MM-DD
  adhkar: boolean;
  quran: boolean;
  tasbih: boolean;
  wird: boolean;
  tasbih_count: number;
  adhkar_count: number;
  /** دقائق تقديرية لقراءة القرآن */
  quran_minutes?: number;
};

export type BadgeDef = {
  id: string;
  title: string;
  description: string;
  icon: string;
};

export type BadgeUnlock = {
  badge_id: string;
  unlocked_at: string;
};

export const BADGE_CATALOG: BadgeDef[] = [
  {
    id: 'first_dhikr',
    title: 'بداية النور',
    description: 'أول تسبيحة في التطبيق',
    icon: 'sparkles',
  },
  {
    id: 'mustaghfir',
    title: 'المستغفر',
    description: 'تكرار الاستغفار 1000 مرة',
    icon: 'leaf',
  },
  {
    id: 'musabbih',
    title: 'المسبّح',
    description: 'إجمالي 500 تسبيحة تراكمية',
    icon: 'radio-button-on',
  },
  {
    id: 'multazim',
    title: 'الملتزم',
    description: 'المحافظة 7 أيام متتالية',
    icon: 'flame',
  },
  {
    id: 'sahib_wird',
    title: 'صاحب الورد',
    description: 'المحافظة 30 يوماً متتالية',
    icon: 'trophy',
  },
  {
    id: 'qari',
    title: 'القارئ',
    description: 'قراءة القرآن في 5 أيام مختلفة',
    icon: 'book',
  },
  {
    id: 'dhakir',
    title: 'الذاكر',
    description: 'إكمال أذكار في 3 أيام',
    icon: 'moon',
  },
];

function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function shiftDate(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return todayKey(dt);
}

async function readDays(): Promise<Record<string, ActivityDay>> {
  const raw = await AsyncStorage.getItem(ACTIVITY_KEY);
  return raw ? (JSON.parse(raw) as Record<string, ActivityDay>) : {};
}

async function writeDays(map: Record<string, ActivityDay>): Promise<void> {
  await AsyncStorage.setItem(ACTIVITY_KEY, JSON.stringify(map));
}

async function readUnlocks(): Promise<Record<string, BadgeUnlock>> {
  const raw = await AsyncStorage.getItem(BADGES_KEY);
  return raw ? (JSON.parse(raw) as Record<string, BadgeUnlock>) : {};
}

async function writeUnlocks(map: Record<string, BadgeUnlock>): Promise<void> {
  await AsyncStorage.setItem(BADGES_KEY, JSON.stringify(map));
}

function emptyDay(date: string): ActivityDay {
  return {
    date,
    adhkar: false,
    quran: false,
    tasbih: false,
    wird: false,
    tasbih_count: 0,
    adhkar_count: 0,
    quran_minutes: 0,
  };
}

/** هل اليوم يُحسب «نشطاً» للسلسلة؟ */
export function isActiveDay(day: ActivityDay | undefined): boolean {
  if (!day) return false;
  return day.adhkar || day.quran || day.tasbih || day.wird;
}

export async function recordActivity(
  kind: ActivityKind,
  amount = 1
): Promise<{ day: ActivityDay; streak: number; newBadges: BadgeDef[] }> {
  const map = await readDays();
  const date = todayKey();
  const day = map[date] ?? emptyDay(date);

  if (kind === 'adhkar') {
    day.adhkar = true;
    day.adhkar_count += amount;
  } else if (kind === 'quran') {
    day.quran = true;
    day.quran_minutes = (day.quran_minutes ?? 0) + Math.max(0, amount > 1 ? amount : 0);
  } else if (kind === 'tasbih') {
    day.tasbih = true;
    day.tasbih_count += amount;
  } else if (kind === 'wird') {
    day.wird = true;
  }

  map[date] = day;
  await writeDays(map);

  const streak = computeStreak(map);
  const newBadges = await evaluateBadges(map, streak);

  return { day, streak, newBadges };
}

export function computeStreak(map: Record<string, ActivityDay>): number {
  let streak = 0;
  let cursor = todayKey();
  // إن لم يكن اليوم نشطاً بعد، ابدأ من الأمس (السلسلة لا تنكسر قبل نهاية اليوم)
  if (!isActiveDay(map[cursor])) {
    cursor = shiftDate(cursor, -1);
  }
  while (isActiveDay(map[cursor])) {
    streak += 1;
    cursor = shiftDate(cursor, -1);
  }
  return streak;
}

export async function recordQuranMinutes(minutes: number): Promise<void> {
  if (minutes <= 0) return;
  await recordActivity('quran', minutes);
}


export async function getActivityDays(lastN = 28): Promise<ActivityDay[]> {
  const map = await readDays();
  const out: ActivityDay[] = [];
  for (let i = lastN - 1; i >= 0; i--) {
    const key = shiftDate(todayKey(), -i);
    out.push(map[key] ?? emptyDay(key));
  }
  return out;
}

export async function getUnlockedBadges(): Promise<BadgeUnlock[]> {
  const map = await readUnlocks();
  return Object.values(map).sort((a, b) => b.unlocked_at.localeCompare(a.unlocked_at));
}

async function evaluateBadges(
  map: Record<string, ActivityDay>,
  streak: number
): Promise<BadgeDef[]> {
  const unlocks = await readUnlocks();
  const newly: BadgeDef[] = [];

  const days = Object.values(map);
  const quranDays = days.filter((d) => d.quran).length;
  const adhkarDays = days.filter((d) => d.adhkar).length;
  const totalTasbih = days.reduce((s, d) => s + d.tasbih_count, 0);

  // نحتاج مجموع الاستغفار من جدول التسبيح
  let istighfar = 0;
  try {
    const raw = await AsyncStorage.getItem('wirdak_tasbih_table_v1');
    if (raw) {
      const t = JSON.parse(raw) as { per_dhikr?: Record<string, number>; lifetime_total?: number };
      istighfar = t.per_dhikr?.astaghfirullah ?? 0;
      // إن لم يُمرَّر عبر activity، lifetime مفيد لـ musabbih
      if (totalTasbih === 0 && t.lifetime_total) {
        // use lifetime for musabbih check below via local
      }
    }
  } catch {
    // ignore
  }

  const tasbihLifetime = (() => {
    // أعد القراءة بشكل متزامن من days + tasbih table
    return totalTasbih;
  })();

  let lifetimeFromTable = tasbihLifetime;
  try {
    const raw = await AsyncStorage.getItem('wirdak_tasbih_table_v1');
    if (raw) {
      const t = JSON.parse(raw) as { lifetime_total?: number };
      lifetimeFromTable = Math.max(lifetimeFromTable, t.lifetime_total ?? 0);
    }
  } catch {
    // ignore
  }

  const checks: Record<string, boolean> = {
    first_dhikr: lifetimeFromTable >= 1 || totalTasbih >= 1,
    mustaghfir: istighfar >= 1000,
    musabbih: lifetimeFromTable >= 500,
    multazim: streak >= 7,
    sahib_wird: streak >= 30,
    qari: quranDays >= 5,
    dhakir: adhkarDays >= 3,
  };

  for (const badge of BADGE_CATALOG) {
    if (unlocks[badge.id]) continue;
    if (!checks[badge.id]) continue;
    unlocks[badge.id] = {
      badge_id: badge.id,
      unlocked_at: new Date().toISOString(),
    };
    newly.push(badge);
  }

  if (newly.length) await writeUnlocks(unlocks);
  return newly;
}

export async function getDashboardStats(): Promise<{
  streak: number;
  activeDaysLast28: number;
  days: ActivityDay[];
  badges: { def: BadgeDef; unlocked: boolean; unlockedAt?: string }[];
}> {
  const map = await readDays();
  const days = await getActivityDays(28);
  const unlocks = await readUnlocks();
  const streak = computeStreak(map);
  // أعد تقييم الأوسمة عند فتح اللوحة
  await evaluateBadges(map, streak);
  const unlocks2 = await readUnlocks();

  return {
    streak,
    activeDaysLast28: days.filter(isActiveDay).length,
    days,
    badges: BADGE_CATALOG.map((def) => ({
      def,
      unlocked: !!unlocks2[def.id],
      unlockedAt: unlocks2[def.id]?.unlocked_at,
    })),
  };
}
