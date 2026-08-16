import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { getReciterById, Reciter } from '../data/reciters';
import { claimAudioFocus } from '../services/audioCoordinator';
import {
  configureBackgroundAudio,
  formatPlaybackTime,
  resolveFullSurahUrl,
} from '../services/surahAudio';
import { getReciterId, setReciterId } from '../services/settings';
import { mushaf } from '../theme/mushaf';
import { ReciterPickerModal } from './ReciterPickerModal';

type Props = {
  surahNumber: number;
  surahName: string;
  autoPlay?: boolean;
  compact?: boolean;
};

export function SurahAudioPlayer({ surahNumber, surahName, autoPlay, compact }: Props) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const trackWidth = useRef(0);
  const seekingRef = useRef(false);
  const releaseFocusRef = useRef<(() => void) | null>(null);

  const [reciterId, setReciter] = useState(getReciterById('alafasy').reciter_id);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const autoStarted = useRef(false);

  const reciter = getReciterById(reciterId);
  const progress = durationMs > 0 ? Math.min(positionMs / durationMs, 1) : 0;

  useEffect(() => {
    getReciterId().then(setReciter);
    configureBackgroundAudio().catch(() => undefined);
    return () => {
      soundRef.current?.unloadAsync().catch(() => undefined);
      soundRef.current = null;
    };
  }, []);

  const onStatus = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) setError('تعذّر تشغيل التلاوة');
      return;
    }
    if (!seekingRef.current) setPositionMs(status.positionMillis);
    setDurationMs(status.durationMillis ?? 0);
    setPlaying(status.isPlaying);
    if (status.didJustFinish) {
      setPlaying(false);
      setPositionMs(0);
    }
  }, []);

  const unload = useCallback(async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
      } catch {
        // ignore
      }
      soundRef.current = null;
    }
    setPlaying(false);
  }, []);

  const loadAndPlay = useCallback(
    async (id: string, resumeMs = 0, shouldPlay = true) => {
      setLoading(true);
      setError(null);
      try {
        await configureBackgroundAudio();
        await unload();
        releaseFocusRef.current = await claimAudioFocus(async () => {
          await unload();
        });
        const { uri } = await resolveFullSurahUrl(surahNumber, id);
        const { sound } = await Audio.Sound.createAsync(
          { uri },
          {
            shouldPlay,
            positionMillis: resumeMs,
            progressUpdateIntervalMillis: 400,
          },
          onStatus
        );
        soundRef.current = sound;
        setPlaying(shouldPlay);
      } catch {
        setError('تعذّر تحميل صوت السورة. تحقق من الاتصال.');
        setPlaying(false);
      } finally {
        setLoading(false);
      }
    },
    [onStatus, surahNumber, unload]
  );

  useEffect(() => {
    if (!autoPlay || autoStarted.current) return;
    autoStarted.current = true;
    getReciterId().then((id) => {
      setReciter(id);
      loadAndPlay(id, 0, true);
    });
  }, [autoPlay, loadAndPlay]);

  async function togglePlay() {
    if (loading) return;
    if (!soundRef.current) {
      await loadAndPlay(reciterId, 0, true);
      return;
    }
    const status = await soundRef.current.getStatusAsync();
    if (!status.isLoaded) {
      await loadAndPlay(reciterId, 0, true);
      return;
    }
    if (status.isPlaying) {
      await soundRef.current.pauseAsync();
    } else {
      if (
        (status.durationMillis ?? 0) > 0 &&
        status.positionMillis >= (status.durationMillis ?? 0) - 500
      ) {
        await soundRef.current.setPositionAsync(0);
      }
      await soundRef.current.playAsync();
    }
  }

  async function seekToMs(ms: number) {
    if (!soundRef.current || durationMs <= 0) return;
    const clamped = Math.max(0, Math.min(durationMs, Math.floor(ms)));
    seekingRef.current = true;
    setPositionMs(clamped);
    try {
      await soundRef.current.setPositionAsync(clamped);
    } finally {
      seekingRef.current = false;
    }
  }

  async function seekBySeconds(deltaSec: number) {
    const status = soundRef.current ? await soundRef.current.getStatusAsync() : null;
    const current = status && status.isLoaded ? status.positionMillis : positionMs;
    await seekToMs(current + deltaSec * 1000);
  }

  async function seekToRatio(ratio: number) {
    if (durationMs <= 0) return;
    await seekToMs(Math.max(0, Math.min(1, ratio)) * durationMs);
  }

  function onTrackLayout(e: LayoutChangeEvent) {
    trackWidth.current = e.nativeEvent.layout.width;
  }

  async function onSelectReciter(next: Reciter) {
    setPickerOpen(false);
    if (next.reciter_id === reciterId) return;
    const resume = positionMs;
    const wasPlaying = playing;
    setReciter(next.reciter_id);
    await setReciterId(next.reciter_id);
    await loadAndPlay(next.reciter_id, resume, wasPlaying || !!soundRef.current);
  }

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <TouchableOpacity style={styles.reciterBtn} onPress={() => setPickerOpen(true)} activeOpacity={0.85}>
        <View style={styles.reciterBadge}>
          <Text style={styles.reciterBadgeText}>♪</Text>
        </View>
        <View style={styles.reciterInfo}>
          <Text style={styles.reciterName} numberOfLines={1}>
            {reciter.reciter_name}
          </Text>
          <Text style={styles.rewayat} numberOfLines={1}>
            {reciter.rewayat} • {surahName}
          </Text>
        </View>
        <Text style={styles.changeReciter}>تغيير</Text>
      </TouchableOpacity>

      <View style={styles.seekRow}>
        <Text style={styles.time}>{formatPlaybackTime(positionMs)}</Text>
        <TouchableOpacity
          activeOpacity={1}
          style={styles.trackHit}
          onLayout={onTrackLayout}
          onPress={(e) => {
            if (trackWidth.current <= 0) return;
            seekToRatio(e.nativeEvent.locationX / trackWidth.current);
          }}
        >
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${progress * 100}%` }]} />
            <View style={[styles.thumb, { left: `${progress * 100}%` }]} />
          </View>
        </TouchableOpacity>
        <Text style={styles.time}>{formatPlaybackTime(durationMs)}</Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.skipBtn} onPress={() => seekBySeconds(-15)} disabled={!durationMs}>
          <Text style={styles.skipText}>−١٥</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.playBtn} onPress={togglePlay} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.playText}>{playing ? '❚❚' : '▶'}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipBtn} onPress={() => seekBySeconds(15)} disabled={!durationMs}>
          <Text style={styles.skipText}>+١٥</Text>
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <ReciterPickerModal
        visible={pickerOpen}
        selectedId={reciterId}
        onClose={() => setPickerOpen(false)}
        onSelect={onSelectReciter}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: mushaf.goldLight,
    backgroundColor: '#FBF6EC',
    padding: 12,
  },
  wrapCompact: {
    paddingVertical: 10,
  },
  reciterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: mushaf.goldSoft,
    backgroundColor: mushaf.paper,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  reciterBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: mushaf.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reciterBadgeText: { color: mushaf.goldDark, fontSize: 16, fontWeight: '700' },
  reciterInfo: { flex: 1, marginHorizontal: 10 },
  reciterName: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'right',
    color: mushaf.ink,
  },
  rewayat: {
    fontSize: 11,
    textAlign: 'right',
    marginTop: 2,
    color: mushaf.muted,
  },
  changeReciter: {
    color: mushaf.gold,
    fontSize: 12,
    fontWeight: '700',
  },
  seekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  time: {
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    minWidth: 40,
    textAlign: 'center',
    color: mushaf.muted,
  },
  trackHit: { flex: 1, height: 28, justifyContent: 'center' },
  track: {
    height: 5,
    borderRadius: 3,
    backgroundColor: mushaf.goldSoft,
    justifyContent: 'center',
  },
  fill: {
    height: 5,
    borderRadius: 3,
    backgroundColor: mushaf.gold,
  },
  thumb: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    marginLeft: -7,
    backgroundColor: mushaf.goldDark,
    borderWidth: 2,
    borderColor: '#FBF6EC',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    marginTop: 10,
  },
  playBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: mushaf.gold,
    shadowColor: mushaf.goldDark,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  playText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  skipBtn: {
    minWidth: 48,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: mushaf.goldLight,
    backgroundColor: mushaf.paper,
    alignItems: 'center',
  },
  skipText: { color: mushaf.goldDark, fontWeight: '800', fontSize: 14 },
  error: { textAlign: 'center', marginTop: 8, fontSize: 12, color: '#B33A3A' },
});
