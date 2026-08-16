/**
 * تحويل تقريبي ميلادي → هجري (خوارزمية مدنية بسيطة)
 * كافية للعرض اليومي ومواعيد رمضان التقريبية.
 */

export type HijriDate = {
  day: number;
  month: number;
  year: number;
  monthNameAr: string;
};

const HIJRI_MONTHS = [
  'محرم',
  'صفر',
  'ربيع الأول',
  'ربيع الآخر',
  'جمادى الأولى',
  'جمادى الآخرة',
  'رجب',
  'شعبان',
  'رمضان',
  'شوال',
  'ذو القعدة',
  'ذو الحجة',
];

export function gregorianToHijri(date = new Date()): HijriDate {
  // خوارزمية Kuwaiti algorithm (شائعة في التطبيقات)
  let day = date.getDate();
  let month = date.getMonth() + 1;
  let year = date.getFullYear();

  let m = month;
  let y = year;
  if (m < 3) {
    y -= 1;
    m += 12;
  }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  const jd =
    Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524.5;

  const iyear = Math.floor((30 * (jd - 1948439.5) + 10646) / 10631);
  const imonth = Math.min(
    12,
    Math.ceil((jd - 29 - islamicJd(iyear, 1, 1)) / 29.5) + 1
  );
  const iday = Math.floor(jd - islamicJd(iyear, imonth, 1)) + 1;

  return {
    day: iday,
    month: imonth,
    year: iyear,
    monthNameAr: HIJRI_MONTHS[imonth - 1] ?? '',
  };
}

function islamicJd(year: number, month: number, day: number): number {
  return (
    day +
    Math.ceil(29.5 * (month - 1)) +
    (year - 1) * 354 +
    Math.floor((3 + 11 * year) / 30) +
    1948439.5 -
    1
  );
}

export function formatHijri(date = new Date()): string {
  const h = gregorianToHijri(date);
  return `${h.day} ${h.monthNameAr} ${h.year} هـ`;
}

export function isRamadan(date = new Date()): boolean {
  return gregorianToHijri(date).month === 9;
}
