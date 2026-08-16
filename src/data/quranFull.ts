import quranFullJson from './quranFull.json';

export type QuranSurahFull = {
  id: number;
  name: string;
  type: 'مكية' | 'مدنية';
  text: string;
};

/** القرآن كاملاً — كل سورة نص متصل بالرسم العثماني مع أرقام الآيات ﴿١﴾ */
export const quranFullSurahs = quranFullJson as QuranSurahFull[];

export function getFullSurah(id: number): QuranSurahFull | undefined {
  return quranFullSurahs.find((s) => s.id === id);
}
