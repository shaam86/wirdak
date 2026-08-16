import { Alert, Linking, Platform } from 'react-native';
import * as StoreReview from 'expo-store-review';
import {
  APP_IDENTITY,
  appStoreReviewUrl,
  appStoreUrl,
  playStoreMarketUrl,
  playStoreUrl,
  supportMailto,
} from '../config/appStore';
import { t } from '../i18n';

async function openUrl(url: string): Promise<boolean> {
  try {
    const can = await Linking.canOpenURL(url);
    if (!can) {
      await Linking.openURL(url);
      return true;
    }
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * يفتح صفحة التقييم على المتجر (زر صريح — أفضل من requestReview).
 */
export async function openRateApp(): Promise<void> {
  if (Platform.OS === 'android') {
    const ok = await openUrl(playStoreMarketUrl());
    if (!ok) await openUrl(playStoreUrl());
    return;
  }

  if (Platform.OS === 'ios') {
    const review = appStoreReviewUrl();
    if (review && (await openUrl(review))) return;
    const store = appStoreUrl();
    if (store && (await openUrl(store))) return;
    Alert.alert(t('store.rateTitle'), t('store.rateIosPending'));
    return;
  }

  await openUrl(playStoreUrl());
}

/** يفتح بريد الدعم الفني */
export async function openContactSupport(): Promise<void> {
  const mailto = supportMailto();
  try {
    await Linking.openURL(mailto);
  } catch {
    Alert.alert(
      t('store.supportTitle'),
      t('store.supportBody', { email: APP_IDENTITY.supportEmail })
    );
  }
}

/** يفتح سياسة الخصوصية الخارجية إن وُجدت، وإلا يعيد false لفتح الشاشة داخل التطبيق */
export async function openPrivacyPolicyExternal(): Promise<boolean> {
  const url = APP_IDENTITY.privacyPolicyUrl?.trim();
  if (!url) return false;
  return openUrl(url);
}

/** طلب مراجعة داخلية (اختياري بعد إنجاز مهم — ليس من زر التقييم) */
export async function maybeRequestInAppReview(): Promise<void> {
  try {
    if (await StoreReview.isAvailableAsync()) {
      await StoreReview.requestReview();
    }
  } catch {
    // تجاهل
  }
}
