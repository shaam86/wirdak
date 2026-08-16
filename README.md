# وردك — Wirdak

تطبيق إسلامي متكامل للأندرويد و iOS يتضمن:

- **الأذكار** — أذكار الصباح والمساء وبعد الصلاة مع عدّاد
- **القرآن الكريم** — 114 سورة + ترجمة + قراء متعددون
- **عدّاد التسبيح** — مستقل مع أهداف 33 / 99 / 100
- **بوصلة القبلة** — اتجاه الكعبة باستخدام GPS والمغناطيس
- **مواقيت الصلاة** — مع إشعارات قبل الموعد
- **وضع ليلي** — فاتح / ليلي / تلقائي
- **ودجت** — مزامنة بيانات الصلاة (يتطلب EAS Build)

## التشغيل

```bash
npm install
npx expo start
```

امسح QR Code بتطبيق Expo Go على هاتفك.

## بناء للنشر

```bash
npm install -g eas-cli
eas login
eas build --platform android
eas build --platform ios
```

## Google Play

راجع الدليل الكامل: [`docs/GOOGLE_PLAY.md`](./docs/GOOGLE_PLAY.md)

قبل الرفع:

1. انشر [`docs/privacy-policy.html`](./docs/privacy-policy.html) على رابط HTTPS
2. ضع الرابط في `src/config/appStore.ts` → `privacyPolicyUrl`
3. ابنِ الحزمة: `npm run build:aab`
