import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../i18n/LanguageContext';
import { APP_IDENTITY } from '../config/appStore';
import { useTheme } from '../theme/ThemeContext';
import { space } from '../theme/tokens';

type Section = { title: string; body: string };

function sectionsFor(lang: string): Section[] {
  if (lang === 'en') {
    return [
      {
        title: 'Introduction',
        body: `${APP_IDENTITY.nameEn} (“${APP_IDENTITY.nameAr}”) respects your privacy. This policy describes what data the app may use and how. By using the app, you agree to this policy.`,
      },
      {
        title: 'Data we use',
        body: 'We do not require an account and do not collect personal data for sale or advertising. Data may be stored locally on your device only: location (prayer times and Qibla), preferences, khatmah/adhkar progress, bookmarks, and activity badges.',
      },
      {
        title: 'Location & notifications',
        body: 'Location is used in the foreground only to compute prayer times and Qibla on-device. We do not track you in the background. Prayer and reminder notifications are scheduled locally by the OS and are not sent to our servers.',
      },
      {
        title: 'Storage & processing',
        body: 'Settings and progress are stored locally. Prayer times are calculated on-device. Quran text or audio may be fetched from Islamic content providers when needed for reading or playback.',
      },
      {
        title: 'Sharing & ads',
        body: 'We do not sell your data or share it for marketing. The app shows no ads and does not use the Advertising ID. When you use Share, you choose the destination via the system share sheet.',
      },
      {
        title: 'Deleting your data',
        body: `There is no server-side account. Erase all local data from Settings → Delete my data, or by uninstalling the app. Help: ${APP_IDENTITY.supportEmail}`,
      },
      {
        title: 'Children',
        body: 'The app is intended for a general Muslim audience including families. We do not knowingly collect personal identifiers from children.',
      },
      {
        title: 'Contact',
        body: `Privacy or support: ${APP_IDENTITY.supportEmail}`,
      },
    ];
  }

  if (lang === 'tr') {
    return [
      {
        title: 'Giriş',
        body: `${APP_IDENTITY.nameEn} (“${APP_IDENTITY.nameAr}”) gizliliğinize saygı duyar. Bu politika uygulamanın hangi verileri kullanabileceğini açıklar.`,
      },
      {
        title: 'Kullandığımız veriler',
        body: 'Hesap istemeyiz; reklam veya satış için kişisel veri toplamayız. Konum, tercihler, hatim/zikir ilerlemesi ve yer imleri yalnızca cihazınızda saklanabilir.',
      },
      {
        title: 'Konum ve bildirimler',
        body: 'Konum yalnızca ön planda namaz vakitleri ve kıble için kullanılır. Arka planda takip yoktur. Bildirimler yerelde zamanlanır.',
      },
      {
        title: 'Depolama',
        body: 'Ayarlar yerelde tutulur. Kur’an metni/sesi gerektiğinde içerik sağlayıcılardan indirilebilir.',
      },
      {
        title: 'Paylaşım ve reklam',
        body: 'Verilerinizi satmayız. Reklam yok, Advertising ID kullanılmaz.',
      },
      {
        title: 'Veri silme',
        body: `Sunucu hesabı yoktur. Ayarlar → Verilerimi sil veya uygulamayı kaldırın. Destek: ${APP_IDENTITY.supportEmail}`,
      },
      {
        title: 'Çocuklar',
        body: 'Uygulama genel Müslüman kitleye yöneliktir; çocuklardan bilerek kimlik verisi toplanmaz.',
      },
      {
        title: 'İletişim',
        body: APP_IDENTITY.supportEmail,
      },
    ];
  }

  return [
    {
      title: 'مقدمة',
      body: `يحترم تطبيق «${APP_IDENTITY.nameAr}» (${APP_IDENTITY.nameEn}) خصوصيتك. توضح هذه السياسة أنواع البيانات التي قد يجمعها التطبيق وكيف تُستخدم. باستخدامك للتطبيق فإنك توافق على هذه السياسة.`,
    },
    {
      title: 'البيانات التي نجمعها',
      body: 'لا نطلب إنشاء حساب ولا نجمع بيانات شخصية للبيع أو الإعلان. قد يُستخدم محلياً على جهازك: موقعك الجغرافي (لحساب مواقيت الصلاة واتجاه القبلة)، تفضيلاتك، تقدّم الختمات والأذكار والعلامات المرجعية، وبيانات النشاط والأوسمة المخزّنة على الجهاز فقط.',
    },
    {
      title: 'الموقع والإشعارات',
      body: 'يُستخدم إذن الموقع في المقدمة فقط لحساب المواقيت والقبلة فلكياً على الجهاز. لا نتتبّع موقعك في الخلفية. تُرسل إشعارات الأذان والتذكيرات محلياً عبر نظام التشغيل ولا تُرسل إلى خوادمنا.',
    },
    {
      title: 'التخزين والمعالجة',
      body: 'تُحفظ إعداداتك وتقدّمك عبر التخزين المحلي على جهازك. حساب مواقيت الصلاة يتم محلياً. قد يُحمَّل نص القرآن أو التلاوة من مزوّدي محتوى إسلامي عند الحاجة.',
    },
    {
      title: 'مشاركة البيانات والإعلانات',
      body: 'لا نبيع بياناتك ولا نشاركها لأغراض تسويقية. التطبيق لا يعرض إعلانات ولا يستخدم معرّف الإعلان. عند «المشاركة» تختار أنت الجهة عبر نظام جهازك.',
    },
    {
      title: 'حذف البيانات',
      body: `لا يوجد حساب على خوادمنا. احذف كل البيانات المحلية من: الإعدادات ← حذف بياناتي، أو بإلغاء تثبيت التطبيق. للمساعدة: ${APP_IDENTITY.supportEmail}`,
    },
    {
      title: 'خصوصية الأطفال',
      body: 'التطبيق موجّه لعامة المسلمين بما في ذلك العائلات. لا نجمع عن قصد بيانات تعريف شخصية من الأطفال.',
    },
    {
      title: 'التواصل',
      body: `للاستفسارات المتعلقة بالخصوصية أو الدعم الفني: ${APP_IDENTITY.supportEmail}`,
    },
  ];
}

export function PrivacyPolicyScreen() {
  const { colors, fonts } = useTheme();
  const { t, textAlign, language } = useI18n();
  const sections = sectionsFor(language);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.title, { color: colors.text, fontFamily: fonts.uiExtra, textAlign }]}>
        {t('compliance.privacyTitle')}
      </Text>
      <Text style={[styles.meta, { color: colors.textSecondary, fontFamily: fonts.uiRegular, textAlign }]}>
        {t('compliance.privacyUpdated')}
      </Text>

      {sections.map((section) => (
        <View
          key={section.title}
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={[styles.heading, { color: colors.primary, fontFamily: fonts.uiBold, textAlign }]}>
            {section.title}
          </Text>
          <Text style={[styles.body, { color: colors.text, fontFamily: fonts.uiRegular, textAlign }]}>
            {section.body}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: space.lg, paddingBottom: 120, gap: 12 },
  title: { fontSize: 22, marginBottom: 4 },
  meta: { fontSize: 13, marginBottom: 12 },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  heading: { fontSize: 16, marginBottom: 8 },
  body: { fontSize: 14, lineHeight: 24 },
});
