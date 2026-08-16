export type Reciter = {
  /** معرف القارئ */
  reciter_id: string;
  /** اسم القارئ بالعربية */
  reciter_name: string;
  /** اسم إنجليزي للعرض */
  nameEn: string;
  /** الرواية */
  rewayat: string;
  /**
   * الرابط الأساسي لملفات السورة الكاملة (MP3)
   * يُلحق به رقم السورة بثلاث خانات: 001.mp3 … 114.mp3
   */
  audio_base_url: string;
  /** مجلد everyayah.com لتلاوة الآية آيةً */
  ayahPath: string;
};

/** توافق مع الكود القديم */
export type ReciterLegacy = Reciter & {
  id: string;
  nameAr: string;
  path: string;
};

export const DEFAULT_RECITER_ID = 'alafasy';

/**
 * أشهر القراء — صوت السورة الكاملة من mp3quran.net (جودة عالية)
 */
export const reciters: Reciter[] = [
  {
    reciter_id: 'alafasy',
    reciter_name: 'مشاري راشد العفاسي',
    nameEn: 'Mishary Alafasy',
    rewayat: 'حفص عن عاصم',
    audio_base_url: 'https://server8.mp3quran.net/afs/',
    ayahPath: 'Alafasy_128kbps',
  },
  {
    reciter_id: 'abdulbasit',
    reciter_name: 'عبد الباسط عبد الصمد',
    nameEn: 'Abdul Basit Abdus Samad',
    rewayat: 'حفص عن عاصم',
    audio_base_url: 'https://server7.mp3quran.net/basit/',
    ayahPath: 'Abdul_Basit_Murattal_192kbps',
  },
  {
    reciter_id: 'muaiqly',
    reciter_name: 'ماهر المعيقلي',
    nameEn: 'Maher Al Muaiqly',
    rewayat: 'حفص عن عاصم',
    audio_base_url: 'https://server12.mp3quran.net/maher/',
    ayahPath: 'MaherAlMuaiqly128kbps',
  },
  {
    reciter_id: 'minshawi',
    reciter_name: 'محمد صديق المنشاوي',
    nameEn: 'Mohamed Siddiq Al-Minshawi',
    rewayat: 'حفص عن عاصم',
    audio_base_url: 'https://server10.mp3quran.net/minsh/',
    ayahPath: 'Minshawy_Murattal_128kbps',
  },
  {
    reciter_id: 'shuraim',
    reciter_name: 'سعود الشريم',
    nameEn: 'Saud Al-Shuraim',
    rewayat: 'حفص عن عاصم',
    audio_base_url: 'https://server7.mp3quran.net/shur/',
    ayahPath: 'Saood_ash-Shuraym_128kbps',
  },
  {
    reciter_id: 'sudais',
    reciter_name: 'عبد الرحمن السديس',
    nameEn: 'Abdul Rahman Al-Sudais',
    rewayat: 'حفص عن عاصم',
    audio_base_url: 'https://server11.mp3quran.net/sds/',
    ayahPath: 'Abdurrahmaan_As-Sudais_192kbps',
  },
  {
    reciter_id: 'husary',
    reciter_name: 'محمود خليل الحصري',
    nameEn: 'Mahmoud Khalil Al-Husary',
    rewayat: 'حفص عن عاصم',
    audio_base_url: 'https://server13.mp3quran.net/husr/',
    ayahPath: 'Husary_128kbps',
  },
  {
    reciter_id: 'ghamadi',
    reciter_name: 'سعد الغامدي',
    nameEn: 'Saad Al-Ghamdi',
    rewayat: 'حفص عن عاصم',
    audio_base_url: 'https://server7.mp3quran.net/s_gmd/',
    ayahPath: 'Ghamadi_40kbps',
  },
  {
    reciter_id: 'ajamy',
    reciter_name: 'أحمد بن علي العجمي',
    nameEn: 'Ahmed Al-Ajamy',
    rewayat: 'حفص عن عاصم',
    audio_base_url: 'https://server10.mp3quran.net/ajm/',
    ayahPath: 'Ahmed_ibn_Ali_al-Ajamy_128kbps_ketaballah.net',
  },
  {
    reciter_id: 'abdulbasit_warsh',
    reciter_name: 'عبد الباسط عبد الصمد (ورش)',
    nameEn: 'Abdul Basit — Warsh',
    rewayat: 'ورش عن نافع',
    audio_base_url: 'https://server7.mp3quran.net/basit/Rewayat-Warsh-A-n-Nafi/',
    ayahPath: 'Abdul_Basit_Murattal_192kbps',
  },
];

export function getReciterById(id: string): Reciter {
  return reciters.find((r) => r.reciter_id === id) ?? reciters[0];
}

/** رابط ملف السورة الكاملة (MP3) */
export function getFullSurahAudioUrl(reciterId: string, surahNumber: number): string {
  const reciter = getReciterById(reciterId);
  const padded = String(surahNumber).padStart(3, '0');
  const base = reciter.audio_base_url.endsWith('/')
    ? reciter.audio_base_url
    : `${reciter.audio_base_url}/`;
  return `${base}${padded}.mp3`;
}

/** توافق: id / nameAr / path */
export function asLegacyReciter(r: Reciter): ReciterLegacy {
  return {
    ...r,
    id: r.reciter_id,
    nameAr: r.reciter_name,
    path: r.ayahPath,
  };
}
