/**
 * تطبيع وتقسيم نص القرآن للتسميع باللمس.
 */

const TASHKEEL_RE =
  /[\u064B-\u065F\u0670\u06D6-\u06ED\u08F0-\u08FF\u0610-\u061A\u06DF-\u06E8\u06EA-\u06ED]/g;

const QURAN_MARKS_RE =
  /[\u06D6\u06D7\u06D8\u06D9\u06DA\u06DB\u06DC\u06DD\u06DE\u06E9\u06FF\u0615\u0616\u0617\u0618\u0619\u06E0\u06E1\u06E2\u06E3\u06E4\u06E5\u06E6\u06E7\u06E8]/g;

export function stripTashkeel(text: string): string {
  return text.replace(TASHKEEL_RE, '');
}

export function stripQuranMarks(text: string): string {
  return text.replace(QURAN_MARKS_RE, ' ').replace(/[﴿﴾]/g, ' ');
}

export function normalizeArabicLetters(text: string): string {
  return text
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/\u0640/g, '')
    .replace(/[^\u0600-\u06FF\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeForMatch(text: string): string {
  return normalizeArabicLetters(stripTashkeel(stripQuranMarks(text)));
}

/** تقسيم إلى كلمات مع الاحتفاظ بالنص الأصلي المعروض */
export function tokenizeArabic(displayText: string): { display: string; key: string }[] {
  const cleaned = stripQuranMarks(displayText);
  const parts = cleaned.split(/\s+/).filter(Boolean);
  return parts.map((display) => ({
    display,
    key: normalizeForMatch(display),
  }));
}
