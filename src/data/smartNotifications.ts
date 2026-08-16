export type TriggerType = 'periodic' | 'scheduled' | 'occasion';

export type SmartNotificationItem = {
  id: string;
  title: string;
  body: string;
  /** نصوص إضافية للتدوير في التنبيهات الدورية */
  bodies?: string[];
  trigger_type: TriggerType;
  /** وصف بشري لوقت الإرسال */
  schedule: string;
  category: 'dhikr' | 'friday' | 'night' | 'prayer' | 'fasting';
  icon: string;
};

/**
 * قاعدة بيانات التنبيهات الذكية — نصوص إيمانية لطيفة
 */
export const SMART_NOTIFICATIONS: SmartNotificationItem[] = [
  // —— دورية ——
  {
    id: 'salawat',
    title: 'الصلاة على النبي ﷺ',
    body: 'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ',
    bodies: [
      'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ',
      'صَلِّ عَلَى النَّبِيِّ ﷺ — ذكرٌ يثقل الميزان ويرفع الدرجات',
      'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ',
      'أكثر من الصلاة على النبي ﷺ؛ فهي نورٌ في القلب وطريقٌ إلى شفاعته',
      'مَن صَلَّى عَلَيَّ صَلَاةً صَلَّى اللَّهُ عَلَيْهِ بِهَا عَشْرًا',
    ],
    trigger_type: 'periodic',
    schedule: 'كل فترة يحددها المستخدم (افتراضي: كل ساعة)',
    category: 'dhikr',
    icon: '🌿',
  },
  {
    id: 'istighfar',
    title: 'استغفر الله وسبّحه',
    body: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ',
    bodies: [
      'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ — حبيبةٌ إلى الرحمن، خفيفةٌ على اللسان',
      'أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ — بابٌ مفتوح للتائبين',
      'سُبْحَانَ اللَّهِ، وَالْحَمْدُ لِلَّهِ، وَلَا إِلَهَ إِلَّا اللَّهُ، وَاللَّهُ أَكْبَرُ',
      'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ — كنزٌ من كنوز الجنة',
      'استغفر الله العظيم الذي لا إله إلا هو الحي القيوم وأتوب إليه',
      'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ',
    ],
    trigger_type: 'periodic',
    schedule: 'كل فترة يحددها المستخدم (افتراضي: كل ساعتين)',
    category: 'dhikr',
    icon: '💧',
  },

  // —— أوقات معلومة ——
  {
    id: 'friday_response_hour',
    title: 'ساعة الاستجابة يوم الجمعة',
    body: 'اقتربت ساعة الاستجابة آخر نهار الجمعة. ارفع يديك وادعُ؛ فإن الدعاء لا يُردّ بإذن الله.',
    trigger_type: 'scheduled',
    schedule: 'كل جمعة قبل المغرب بساعة',
    category: 'friday',
    icon: '🕌',
  },
  {
    id: 'kahf_friday_morning',
    title: 'سورة الكهف — صباح الجمعة',
    body: 'صباح الجمعة المبارك. اقرأ سورة الكهف تنرْ بنورها بين الجمعتين، ويُعصى بها من فتنة الدجال.',
    trigger_type: 'scheduled',
    schedule: 'صباح كل جمعة',
    category: 'friday',
    icon: '📗',
  },
  {
    id: 'kahf_friday_night',
    title: 'سورة الكهف — ليلة الجمعة',
    body: 'ليلة الجمعة أقبلت. هيّئ قلبك لقراءة سورة الكهف؛ نورٌ يدوم أسبوعاً.',
    trigger_type: 'scheduled',
    schedule: 'ليلة الجمعة (مساء الخميس)',
    category: 'friday',
    icon: '🌙',
  },
  {
    id: 'last_third_night',
    title: 'ثلث الليل الآخر',
    body: 'ينزل ربنا إلى السماء الدنيا في الثلث الأخير فيقول: هل من داعٍ فأستجيب له؟ قم ولو بركعتين، وادعُ بما شئت.',
    trigger_type: 'scheduled',
    schedule: 'يومياً عند بداية ثلث الليل الآخر (حسب مواقيت الصلاة)',
    category: 'night',
    icon: '✨',
  },
  {
    id: 'between_adhan_iqama',
    title: 'بين الأذان والإقامة',
    body: 'بين الأذان والإقامة دعاءٌ لا يُرد. سلِ الله من فضله قبل أن تقوم للصلاة.',
    bodies: [
      'بين الأذان والإقامة دعاءٌ لا يُرد. سلِ الله من فضله قبل أن تقوم للصلاة.',
      'اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ — اغتنم اللحظات بين الأذان والإقامة.',
      'الدعاء بين الأذان والإقامة مستجاب. لا تفوّت هذه الفرصة اللطيفة.',
      'قف لحظة بعد الأذان، وادْعُ بما في قلبك؛ فالباب مفتوح.',
    ],
    trigger_type: 'scheduled',
    schedule: 'بعد كل أذان بدقائق (قبل الإقامة)',
    category: 'prayer',
    icon: '🔔',
  },

  // —— مناسبات ——
  {
    id: 'fast_monday_thursday',
    title: 'صيام الإثنين والخميس',
    body: 'غداً يومٌ تُعرض فيه الأعمال. نوِ صيام غدٍ تقرّباً إلى الله؛ فالإثنين والخميس بابٌ للأجر العظيم.',
    trigger_type: 'occasion',
    schedule: 'مساء الأحد ومساء الأربعاء',
    category: 'fasting',
    icon: '🤍',
  },
  {
    id: 'white_days',
    title: 'صيام الأيام البيض',
    body: 'اقتربت الأيام البيض (13 و14 و15 من الشهر الهجري). صُمها تُكتب لك كصيام الدهر بإذن الله.',
    trigger_type: 'occasion',
    schedule: 'مساء يوم 12 من كل شهر هجري',
    category: 'fasting',
    icon: '🌕',
  },
];

export function getSmartNotificationById(id: string): SmartNotificationItem | undefined {
  return SMART_NOTIFICATIONS.find((n) => n.id === id);
}

export function pickRotatingBody(item: SmartNotificationItem, seed = Date.now()): string {
  const pool = item.bodies?.length ? item.bodies : [item.body];
  return pool[seed % pool.length] ?? item.body;
}
