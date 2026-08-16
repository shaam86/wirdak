import {
  CalculationMethod,
  CalculationParameters,
  Coordinates,
  HighLatitudeRule,
  Madhab,
  PrayerTimes as AdhanPrayerTimes,
  Rounding,
} from 'adhan';
import { t } from '../i18n';

export type PrayerName = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

/** الصلوات الخمس فقط (بدون الشروق) */
export type SalahName = Exclude<PrayerName, 'sunrise'>;

export type PrayerTimeEntry = {
  name: PrayerName;
  labelAr: string;
  labelEn: string;
  time: Date;
};

export type CalculationMethodId =
  | 'auto'
  | 'egyptian'
  | 'umm_al_qura'
  | 'mwl'
  | 'karachi'
  | 'uae'
  | 'morocco';

export type PrayerMethodInfo = {
  id: CalculationMethodId;
  labelAr: string;
  labelEn: string;
};

export type PrayerEngineResult = {
  times: PrayerTimeEntry[];
  method: PrayerMethodInfo;
  /** الصلاة التالية (خمس صلوات) */
  nextPrayer: PrayerTimeEntry | null;
  /** الصلاة الحالية في النافزة الزمنية */
  currentPrayer: PrayerTimeEntry | null;
  coordinates: { latitude: number; longitude: number };
  /** يستخدم توقيت الجهاز المحلي — DST تلقائي */
  calculatedAt: Date;
};

const PRAYER_LABELS: Record<PrayerName, { ar: string; en: string }> = {
  fajr: { ar: 'الفجر', en: 'Fajr' },
  sunrise: { ar: 'الشروق', en: 'Sunrise' },
  dhuhr: { ar: 'الظهر', en: 'Dhuhr' },
  asr: { ar: 'العصر', en: 'Asr' },
  maghrib: { ar: 'المغرب', en: 'Maghrib' },
  isha: { ar: 'العشاء', en: 'Isha' },
};

const SALAH_ORDER: SalahName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

/** طرق الحساب المعروضة في الإعدادات */
export const CALCULATION_METHODS: PrayerMethodInfo[] = [
  { id: 'auto', labelAr: 'تلقائي حسب الدولة', labelEn: 'Auto by country' },
  { id: 'egyptian', labelAr: 'الهيئة المصرية للمساحة', labelEn: 'Egyptian General Authority' },
  { id: 'umm_al_qura', labelAr: 'أم القرى — مكة المكرمة', labelEn: 'Umm Al-Qura' },
  { id: 'mwl', labelAr: 'رابطة العالم الإسلامي', labelEn: 'Muslim World League' },
  { id: 'karachi', labelAr: 'جامعة العلوم الإسلامية — كراتشي', labelEn: 'Karachi' },
  { id: 'uae', labelAr: 'هيئة الأوقاف — الإمارات', labelEn: 'UAE / Dubai' },
  { id: 'morocco', labelAr: 'وزارة الأوقاف — المغرب', labelEn: 'Morocco' },
];

/** وزارة الأوقاف المغربية — زوايا شائعة معتمدة محلياً */
function moroccoParams(): CalculationParameters {
  const params = new CalculationParameters('Other', 19, 17);
  params.methodAdjustments.dhuhr = 1;
  return params;
}

function buildParams(methodId: Exclude<CalculationMethodId, 'auto'>): CalculationParameters {
  switch (methodId) {
    case 'egyptian':
      return CalculationMethod.Egyptian();
    case 'umm_al_qura':
      return CalculationMethod.UmmAlQura();
    case 'karachi':
      return CalculationMethod.Karachi();
    case 'uae':
      return CalculationMethod.Dubai();
    case 'morocco':
      return moroccoParams();
    case 'mwl':
    default:
      return CalculationMethod.MuslimWorldLeague();
  }
}

/**
 * اختيار الهيئة تلقائياً من رمز/اسم الدولة.
 */
export function resolveMethodForCountry(
  countryCode?: string | null,
  countryName?: string | null
): Exclude<CalculationMethodId, 'auto'> {
  const code = (countryCode ?? '').toUpperCase();
  const name = (countryName ?? '').toLowerCase();

  if (code === 'EG' || name.includes('egypt')) return 'egyptian';
  if (code === 'SA' || name.includes('saudi')) return 'umm_al_qura';
  if (code === 'AE' || name.includes('emirates') || name.includes('dubai') || name.includes('uae')) {
    return 'uae';
  }
  if (code === 'MA' || name.includes('morocco') || name.includes('maroc')) return 'morocco';
  if (
    code === 'PK' ||
    code === 'IN' ||
    code === 'BD' ||
    name.includes('pakistan') ||
    name.includes('india') ||
    name.includes('bangladesh')
  ) {
    return 'karachi';
  }
  return 'mwl';
}

export function resolveCalculationMethod(
  countryCode?: string | null,
  countryName?: string | null,
  preferredMethod: CalculationMethodId = 'auto'
): { params: CalculationParameters; info: PrayerMethodInfo } {
  const resolvedId: Exclude<CalculationMethodId, 'auto'> =
    preferredMethod === 'auto'
      ? resolveMethodForCountry(countryCode, countryName)
      : preferredMethod;

  const params = buildParams(resolvedId);
  params.madhab = Madhab.Shafi;
  params.rounding = Rounding.Nearest;

  const baseLabel = t(`methods.${resolvedId}`);
  return {
    params,
    info: {
      id: preferredMethod === 'auto' ? 'auto' : resolvedId,
      labelAr:
        preferredMethod === 'auto'
          ? t('methods.autoSuffix', { name: baseLabel })
          : baseLabel,
      labelEn: baseLabel,
    },
  };
}

function toEntries(adhan: AdhanPrayerTimes): PrayerTimeEntry[] {
  return (['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as PrayerName[]).map((name) => ({
    name,
    labelAr: PRAYER_LABELS[name].ar,
    labelEn: PRAYER_LABELS[name].en,
    time: adhan[name],
  }));
}

/**
 * حساب مواقيت يوم معيّن محلياً عبر مكتبة Adhan.
 * يعتمد على Date المحلي للجهاز → التوقيت الصيفي (DST) يُطبَّق تلقائياً.
 */
export function getPrayerTimes(
  lat: number,
  lng: number,
  date: Date = new Date(),
  countryCode?: string | null,
  countryName?: string | null,
  preferredMethod: CalculationMethodId = 'auto'
): { times: PrayerTimeEntry[]; method: PrayerMethodInfo } {
  const coordinates = new Coordinates(lat, lng);
  const { params, info } = resolveCalculationMethod(countryCode, countryName, preferredMethod);
  // خطوط العرض العليا — اختيار تلقائي حسب خط العرض
  params.highLatitudeRule = HighLatitudeRule.recommended(coordinates);
  // تاريخ محلي للجهاز → DST يُطبَّق تلقائياً عبر منطقة الهاتف الزمنية
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
  const prayerTimes = new AdhanPrayerTimes(coordinates, day, params);
  return { times: toEntries(prayerTimes), method: info };
}

/** الصلوات الخمس فقط مرتبة */
export function getSalahTimes(times: PrayerTimeEntry[]): PrayerTimeEntry[] {
  return SALAH_ORDER.map((name) => times.find((t) => t.name === name)!).filter(Boolean);
}

/**
 * الصلاة القادمة بين الخمس صلوات.
 * إن انتهت العشاء → فجر الغد.
 */
export function getNextPrayer(
  times: PrayerTimeEntry[],
  now: Date = new Date(),
  tomorrowTimes?: PrayerTimeEntry[]
): PrayerTimeEntry | null {
  const salah = getSalahTimes(times);
  const upcoming = salah.find((p) => p.time.getTime() > now.getTime());
  if (upcoming) return upcoming;

  if (tomorrowTimes?.length) {
    const fajr = getSalahTimes(tomorrowTimes).find((p) => p.name === 'fajr');
    if (fajr) return fajr;
  }

  // احتياطي: فجر اليوم + 24 ساعة
  const fajr = salah.find((p) => p.name === 'fajr');
  if (!fajr) return null;
  const next = new Date(fajr.time);
  next.setDate(next.getDate() + 1);
  return { ...fajr, time: next };
}

/**
 * الصلاة الحالية = آخر صلاة بدأ وقتها ولم تدخل التالية بعد.
 */
export function getCurrentPrayer(
  times: PrayerTimeEntry[],
  now: Date = new Date()
): PrayerTimeEntry | null {
  const salah = getSalahTimes(times);
  let current: PrayerTimeEntry | null = null;
  for (const p of salah) {
    if (p.time.getTime() <= now.getTime()) current = p;
    else break;
  }
  return current;
}

export function formatTime(date: Date, locale = 'ar-SA'): string {
  return date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

/** مثال: "العصر بعد 01:24" / "Asr in 01:24" */
export function formatNextPrayerLabel(next: PrayerTimeEntry | null, now: Date = new Date()): string {
  if (!next) return '—';
  const ms = Math.max(0, next.time.getTime() - now.getTime());
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const hh = String(h).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return t('prayer.after', { name: t(`prayer.${next.name}`), time: `${hh}:${mm}` });
}

/**
 * محرك كامل ليوم واحد + غد (للصلاة القادمة بعد العشاء) + إشعارات.
 */
export function runPrayerEngine(
  lat: number,
  lng: number,
  options?: {
    now?: Date;
    countryCode?: string | null;
    countryName?: string | null;
    preferredMethod?: CalculationMethodId;
  }
): PrayerEngineResult {
  const now = options?.now ?? new Date();
  const preferredMethod = options?.preferredMethod ?? 'auto';
  const today = getPrayerTimes(
    lat,
    lng,
    now,
    options?.countryCode,
    options?.countryName,
    preferredMethod
  );
  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = getPrayerTimes(
    lat,
    lng,
    tomorrowDate,
    options?.countryCode,
    options?.countryName,
    preferredMethod
  );

  return {
    times: today.times,
    method: today.method,
    nextPrayer: getNextPrayer(today.times, now, tomorrow.times),
    currentPrayer: getCurrentPrayer(today.times, now),
    coordinates: { latitude: lat, longitude: lng },
    calculatedAt: now,
  };
}

/** مواقيت اليوم + الغد لجدولة الإشعارات */
export function getPrayerTimesForNotifications(
  lat: number,
  lng: number,
  countryCode?: string | null,
  countryName?: string | null,
  preferredMethod: CalculationMethodId = 'auto'
): PrayerTimeEntry[] {
  const now = new Date();
  const today = getPrayerTimes(lat, lng, now, countryCode, countryName, preferredMethod).times;
  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = getPrayerTimes(
    lat,
    lng,
    tomorrowDate,
    countryCode,
    countryName,
    preferredMethod
  ).times;
  return [...today, ...tomorrow];
}
