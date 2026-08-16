import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';
import { ADHAN_SOUNDS, type AdhanSoundId, getAppPrefs } from './appPrefs';

let current: Audio.Sound | null = null;

async function resolveAdhanUrl(soundId?: string): Promise<string | null> {
  const prefs = await getAppPrefs();
  const id = (soundId as AdhanSoundId | undefined) ?? prefs.adhanSoundId;
  return ADHAN_SOUNDS.find((s) => s.id === id)?.url ?? null;
}

/**
 * تشغيل صوت الأذان المختار.
 * بدون خلفية طويلة / foreground service لتوافق سياسات Google Play.
 */
export async function playSelectedAdhanPreview(
  maxMs = 45000,
  soundId?: string
): Promise<void> {
  const url = await resolveAdhanUrl(soundId);
  if (!url) return;

  try {
    if (current) {
      await current.stopAsync().catch(() => undefined);
      await current.unloadAsync().catch(() => undefined);
      current = null;
    }
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    const { sound } = await Audio.Sound.createAsync(
      { uri: url },
      { shouldPlay: true, volume: 1 }
    );
    current = sound;
    setTimeout(() => {
      void (async () => {
        try {
          await sound.stopAsync();
          await sound.unloadAsync();
        } catch {
          // ignore
        }
        if (current === sound) current = null;
      })();
    }, maxMs);
  } catch {
    // الشبكة أو الصلاحيات — صامت
  }
}

function soundIdFromData(data: Record<string, unknown> | undefined): string | undefined {
  if (!data) return undefined;
  return typeof data.adhanSoundId === 'string' ? data.adhanSoundId : undefined;
}

/** يستمع لإشعارات الأذان (وصول أو ضغط) ويشغّل الصوت المختار */
export function installAdhanForegroundPlayer(): () => void {
  const received = Notifications.addNotificationReceivedListener((notification) => {
    const data = notification.request.content.data as Record<string, unknown> | undefined;
    if (data?.kind === 'adhan') {
      void playSelectedAdhanPreview(45000, soundIdFromData(data));
    }
  });
  const response = Notifications.addNotificationResponseReceivedListener((res) => {
    const data = res.notification.request.content.data as Record<string, unknown> | undefined;
    if (data?.kind === 'adhan') {
      void playSelectedAdhanPreview(45000, soundIdFromData(data));
    }
  });
  return () => {
    received.remove();
    response.remove();
  };
}
