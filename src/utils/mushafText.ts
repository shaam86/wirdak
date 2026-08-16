const BASMALA_PATTERNS = [
  /^بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ\s*/,
  /^بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ\s*/,
  /^بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ\s*/,
  /^بسم الله الرحمن الرحيم\s*/,
];

export const BASMALA_UTHMANI = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';

/** إزالة البسملة من أول الآية إن وُجدت (نعرضها منفصلة في واجهة المصحف) */
export function stripLeadingBasmala(text: string): string {
  let out = text.trim();
  for (const re of BASMALA_PATTERNS) {
    if (re.test(out)) {
      out = out.replace(re, '').trim();
      break;
    }
  }
  return out;
}

export function surahShowsBasmala(surahNumber: number): boolean {
  return surahNumber !== 1 && surahNumber !== 9;
}
