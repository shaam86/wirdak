import { Audio, AVPlaybackStatusSuccess, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { getFullSurahAudioUrl, getReciterById } from '../data/reciters';
import { getReciterId } from './settings';

let configured = false;

export async function configureBackgroundAudio(): Promise<void> {
  if (configured) return;
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
    staysActiveInBackground: true,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
    interruptionModeIOS: InterruptionModeIOS.DuckOthers,
    interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
  });
  configured = true;
}

export async function resolveFullSurahUrl(
  surahNumber: number,
  reciterId?: string
): Promise<{ uri: string; reciterName: string; rewayat: string }> {
  const id = reciterId ?? (await getReciterId());
  const reciter = getReciterById(id);
  return {
    uri: getFullSurahAudioUrl(id, surahNumber),
    reciterName: reciter.reciter_name,
    rewayat: reciter.rewayat,
  };
}

export function formatPlaybackTime(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function isStatusPlaying(status: AVPlaybackStatusSuccess): boolean {
  return status.isPlaying;
}
