import { useEffect } from 'react';
import { AppState } from 'react-native';
import { LanguageProvider } from './src/i18n/LanguageContext';
import { AppNavigator, navigationRef } from './src/navigation/AppNavigator';
import { installAdhanForegroundPlayer } from './src/services/adhanPlayer';
import { installAppNotificationRouting } from './src/services/notificationRouting';
import { reschedulePrayerNotificationsFromCache } from './src/services/notifications';
import { rescheduleAllReminders } from './src/services/reminders';
import { rescheduleSmartNotifications } from './src/services/smartNotifications';
import { ThemeProvider } from './src/theme/ThemeContext';

function BootstrapReminders() {
  useEffect(() => {
    const refresh = () => {
      Promise.all([
        rescheduleAllReminders().catch(() => undefined),
        rescheduleSmartNotifications().catch(() => undefined),
        reschedulePrayerNotificationsFromCache().catch(() => undefined),
      ]);
    };
    refresh();
    const unsubAdhan = installAdhanForegroundPlayer();
    const unsubRouting = installAppNotificationRouting(() =>
      navigationRef.isReady() ? navigationRef : null
    );
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      sub.remove();
      unsubAdhan();
      unsubRouting();
    };
  }, []);
  return <AppNavigator />;
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <BootstrapReminders />
      </LanguageProvider>
    </ThemeProvider>
  );
}
