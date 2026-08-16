export type Juz = {
  number: number;
  startSurah: number;
  startAyah: number;
  startSurahAr: string;
};

/** Approximate juz start points for index + daily wird */
export const juzList: Juz[] = [
  { number: 1, startSurah: 1, startAyah: 1, startSurahAr: 'الفاتحة' },
  { number: 2, startSurah: 2, startAyah: 142, startSurahAr: 'البقرة' },
  { number: 3, startSurah: 2, startAyah: 253, startSurahAr: 'البقرة' },
  { number: 4, startSurah: 3, startAyah: 93, startSurahAr: 'آل عمران' },
  { number: 5, startSurah: 4, startAyah: 24, startSurahAr: 'النساء' },
  { number: 6, startSurah: 4, startAyah: 148, startSurahAr: 'النساء' },
  { number: 7, startSurah: 5, startAyah: 82, startSurahAr: 'المائدة' },
  { number: 8, startSurah: 6, startAyah: 111, startSurahAr: 'الأنعام' },
  { number: 9, startSurah: 7, startAyah: 88, startSurahAr: 'الأعراف' },
  { number: 10, startSurah: 8, startAyah: 41, startSurahAr: 'الأنفال' },
  { number: 11, startSurah: 9, startAyah: 93, startSurahAr: 'التوبة' },
  { number: 12, startSurah: 11, startAyah: 6, startSurahAr: 'هود' },
  { number: 13, startSurah: 12, startAyah: 53, startSurahAr: 'يوسف' },
  { number: 14, startSurah: 15, startAyah: 1, startSurahAr: 'الحجر' },
  { number: 15, startSurah: 17, startAyah: 1, startSurahAr: 'الإسراء' },
  { number: 16, startSurah: 18, startAyah: 75, startSurahAr: 'الكهف' },
  { number: 17, startSurah: 21, startAyah: 1, startSurahAr: 'الأنبياء' },
  { number: 18, startSurah: 23, startAyah: 1, startSurahAr: 'المؤمنون' },
  { number: 19, startSurah: 25, startAyah: 21, startSurahAr: 'الفرقان' },
  { number: 20, startSurah: 27, startAyah: 56, startSurahAr: 'النمل' },
  { number: 21, startSurah: 29, startAyah: 46, startSurahAr: 'العنكبوت' },
  { number: 22, startSurah: 33, startAyah: 31, startSurahAr: 'الأحزاب' },
  { number: 23, startSurah: 36, startAyah: 28, startSurahAr: 'يس' },
  { number: 24, startSurah: 39, startAyah: 32, startSurahAr: 'الزمر' },
  { number: 25, startSurah: 41, startAyah: 47, startSurahAr: 'فصلت' },
  { number: 26, startSurah: 46, startAyah: 1, startSurahAr: 'الأحقاف' },
  { number: 27, startSurah: 51, startAyah: 31, startSurahAr: 'الذاريات' },
  { number: 28, startSurah: 58, startAyah: 1, startSurahAr: 'المجادلة' },
  { number: 29, startSurah: 67, startAyah: 1, startSurahAr: 'الملك' },
  { number: 30, startSurah: 78, startAyah: 1, startSurahAr: 'النبأ' },
];

export function getJuzRange(juzNumber: number) {
  const current = juzList.find((j) => j.number === juzNumber) ?? juzList[0];
  const next = juzList.find((j) => j.number === juzNumber + 1);
  return {
    from: current,
    to: next
      ? { surah: next.startSurah, ayah: Math.max(1, next.startAyah - 1), surahAr: next.startSurahAr }
      : { surah: 114, ayah: 6, surahAr: 'الناس' },
  };
}

/** رقم الجزء لموضع (سورة، آية) */
export function getJuzForAyah(surahNumber: number, ayahNumber: number): number {
  let juz = 1;
  for (const item of juzList) {
    if (
      surahNumber > item.startSurah ||
      (surahNumber === item.startSurah && ayahNumber >= item.startAyah)
    ) {
      juz = item.number;
    } else {
      break;
    }
  }
  return juz;
}
