# Google Play — دليل نشر وردك (Wirdak)

استخدم هذا الملف أثناء تعبئة **Play Console**. الحزمة: `com.wirdak.app`.

## قبل الرفع (إلزامي)

1. **استضف سياسة الخصوصية** على رابط HTTPS عام:
   - الملف الجاهز: [`docs/privacy-policy.html`](./privacy-policy.html)
   - انشره عبر GitHub Pages / Netlify / Cloudflare Pages / موقعك
   - ضع الرابط في `src/config/appStore.ts` → `privacyPolicyUrl`
   - والصق **نفس الرابط** في Play Console → App content → Privacy policy

2. ابنِ **AAB** للإنتاج:
   ```bash
   npm run build:aab
   ```

3. أكمل في Play Console:
   - Data safety
   - App access (لا يحتاج حساب → اختر «كل الوظائف متاحة بدون قيود»)
   - Ads (لا إعلانات)
   - Content rating (استبيان IARC)
   - Target audience (مثلاً 13+ أو All ages حسب اختيارك)
   - News apps / COVID / Data safety declarations حسب النماذج

## Data safety — إجابات مقترحة

| سؤال | الجواب المقترح |
| --- | --- |
| هل يجمع التطبيق بيانات المستخدم؟ | **نعم** (محلياً على الجهاز) |
| هل تُشارك البيانات مع أطراف ثالثة؟ | **لا** (عدا ما يختاره المستخدم عند المشاركة، ومزوّدي محتوى القرآن/الصوت عند التحميل) |
| هل تُشفَّر البيانات أثناء النقل؟ | **نعم** (HTTPS عند جلب المحتوى الشبكي) |
| هل يمكن للمستخدم طلب حذف البيانات؟ | **نعم** — من داخل التطبيق: الإعدادات → حذف بياناتي |

### أنواع البيانات (محلية / ليست للبيع)

- **Location** — Approximate و/أو Precise: مواقيت الصلاة + القبلة. الاستخدام: App functionality. Collected: Yes. Shared: No. Ephemeral optional: يمكن اعتبار الموقع لحظياً مع كاش محلي.
- **App info and performance** — تفضيلات وإعدادات محلية.
- **Other user-generated content** — أذكار مخصّصة، علامات، تقدّم ختمة (محلي).
- **Device or other IDs** — **لا** (لا Advertising ID؛ محظور في `app.json`).

### أغراض غير مستخدمة

- Advertising / Marketing / Fraud prevention via third parties: **لا**
- لا حسابات، لا تسجيل دخول، لا تحليلات طرف ثالث مدمجة حالياً

## الأذونات ولماذا

| إذن | السبب |
| --- | --- |
| `ACCESS_COARSE/FINE_LOCATION` | مواقيت الصلاة واتجاه القبلة فقط (مقدمة) |
| `POST_NOTIFICATIONS` | أذان وتذكير أذكار/سور |
| `SCHEDULE_EXACT_ALARM` | جدولة مواقيت الصلاة بدقة مقبولة |
| `VIBRATE` | اهتزاز المسبحة/العدّ |
| `MODIFY_AUDIO_SETTINGS` | تشغيل التلاوة/الأذان عبر expo-av |

محظور عمداً: الميكروفون، الكاميرا، التخزين العريض، خلفية الموقع، **AD_ID**.

في Play Console → App content → Sensitive permissions: برّر الموقع والإشعارات/الإنذارات الدقيقة إن طُلب منك.

## محتوى المتجر (Listing)

- العنوان: وردك / Wirdak
- الوصف القصير: أذكار، قرآن، قبلة، مواقيت صلاة
- لقطات شاشة: هاتف + جهاز لوحي إن أمكن
- أيقونة 512×512، صورة مميزة 1024×500
- فئة: Lifestyle أو Books & Reference
- بريد الدعم: `support@wirdak.app` (حدّثه إن لزم)

## اختبار داخلي

ارفع أولاً على **Internal testing** ثم **Closed** قبل Production، وتأكد من:

- طلب إذن الموقع عند فتح المواقيت/القبلة
- جدولة إشعار تجريبي
- فتح سياسة الخصوصية
- «حذف بياناتي» يصفّر الإعدادات والأذكار المخصّصة

## ملاحظات تقنية

- Expo SDK 54 يستهدف **API 36** (متوافق مع متطلبات Play 2026).
- لا إعلانات → في نموذج Ads اختر **No**.
- إن غيّرت بريد الدعم أو رابط الخصوصية، حدّث `src/config/appStore.ts` وملف HTML معاً.
