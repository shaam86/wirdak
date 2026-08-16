import * as Notifications from 'expo-notifications';
import type { NavigationContainerRefWithCurrent } from '@react-navigation/native';
import type { RootTabParamList } from '../navigation/types';

type Nav = NavigationContainerRefWithCurrent<RootTabParamList>;

/**
 * توجيه ضغط الإشعار إلى الشاشة المناسبة (أذكار / سورة).
 * الأذان يُعالَج في adhanPlayer بشكل منفصل للصوت.
 */
export function installAppNotificationRouting(getNav: () => Nav | null): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as Record<string, unknown>;
    const nav = getNav();
    if (!nav?.isReady() || !data?.kind) return;

    if (data.kind === 'adhkar' && typeof data.categoryId === 'string') {
      nav.navigate('Adhkar', {
        screen: 'AdhkarDetail',
        params: { categoryId: data.categoryId },
      });
      return;
    }

    if (data.kind === 'surah' && data.surahNumber != null) {
      const surahNumber = Number(data.surahNumber);
      if (!Number.isFinite(surahNumber)) return;
      nav.navigate('Index', {
        screen: 'SurahDetail',
        params: {
          surahNumber,
          surahName: typeof data.surahName === 'string' ? data.surahName : '',
        },
      });
    }
  });
  return () => sub.remove();
}
