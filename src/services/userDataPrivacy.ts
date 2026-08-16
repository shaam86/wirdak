import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

/**
 * يحذف كل البيانات المحلية للمستخدم (مطلوب لسياسة بيانات Google Play
 * للتطبيقات التي تخزّن بيانات على الجهاز دون حساب سحابي).
 */
export async function clearAllLocalUserData(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // ignore
  }

  try {
    const keys = await AsyncStorage.getAllKeys();
    if (keys.length > 0) {
      await AsyncStorage.multiRemove(keys);
    }
  } catch {
    await AsyncStorage.clear();
  }
}
