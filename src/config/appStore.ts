/**
 * إعدادات النشر والمتاجر — حدّث الروابط قبل الرفع على المتاجر.
 *
 * Google Play يطلب رابط HTTPS عام لسياسة الخصوصية في Play Console.
 */
export const APP_IDENTITY = {
  nameAr: 'وردك',
  nameEn: 'Wirdak',
  androidPackage: 'com.noorapp.mobile',
  versionName: '1.0.0',
  /** ضع رقم التطبيق من App Store Connect بعد النشر */
  iosAppStoreId: '',
  supportEmail: 'support@wirdak.app',
  /**
   * رابط HTTPS عام لسياسة الخصوصية (مطلوب في Play Console).
   * مستضاف عبر GitHub Pages من مجلد docs/
   */
  privacyPolicyUrl: 'https://shaam86.github.io/wirdak/privacy-policy.html',
} as const;

export const SHARE_FOOTER =
  'تمت المشاركة من تطبيق وردك — الأذكار والقرآن';

export function playStoreUrl(): string {
  return `https://play.google.com/store/apps/details?id=${APP_IDENTITY.androidPackage}`;
}

export function playStoreMarketUrl(): string {
  return `market://details?id=${APP_IDENTITY.androidPackage}&showAllReviews=true`;
}

export function appStoreUrl(): string | null {
  if (!APP_IDENTITY.iosAppStoreId) return null;
  return `https://apps.apple.com/app/id${APP_IDENTITY.iosAppStoreId}`;
}

export function appStoreReviewUrl(): string | null {
  if (!APP_IDENTITY.iosAppStoreId) return null;
  return `itms-apps://itunes.apple.com/app/id${APP_IDENTITY.iosAppStoreId}?action=write-review`;
}

export function supportMailto(subject?: string, body?: string): string {
  const s = encodeURIComponent(subject ?? 'دعم فني — تطبيق وردك');
  const b = encodeURIComponent(
    body ??
      `السلام عليكم،\n\nوصف المشكلة أو الاقتراح:\n\n—\nالجهاز / النظام:\nإصدار التطبيق: ${APP_IDENTITY.versionName}\n`
  );
  return `mailto:${APP_IDENTITY.supportEmail}?subject=${s}&body=${b}`;
}

/** هل رُبط رابط خصوصية عام صالح لمتجر Play؟ */
export function hasHostedPrivacyPolicy(): boolean {
  const url = APP_IDENTITY.privacyPolicyUrl?.trim() ?? '';
  return /^https:\/\//i.test(url);
}
