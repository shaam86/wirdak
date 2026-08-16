import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { Magnetometer } from 'expo-sensors';
import { LinearGradient } from 'expo-linear-gradient';
import { ErrorView } from '../components/ErrorView';
import { LoadingView } from '../components/LoadingView';
import { QiblaCompass } from '../components/QiblaCompass';
import { useI18n } from '../i18n/LanguageContext';
import {
  adaptiveSmoothHeading,
  alignmentTolerance,
  angleToQibla,
  calculateQiblaDirection,
  classifyCompassAccuracy,
  classifyMagneticField,
  formatCoord,
  getDistanceToMecca,
} from '../services/qibla';
import { useTheme } from '../theme/ThemeContext';
import { radius, space } from '../theme/tokens';

export function QiblaScreen() {
  const { colors, isDark, fonts, scale } = useTheme();
  const { t, textAlign, locale } = useI18n();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qiblaDirection, setQiblaDirection] = useState(0);
  const [deviceHeading, setDeviceHeading] = useState(0);
  const [rawAccuracy, setRawAccuracy] = useState<number | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [distance, setDistance] = useState(0);
  const [cityLabel, setCityLabel] = useState('');
  const [coordsLabel, setCoordsLabel] = useState('');
  const [usingTrueNorth, setUsingTrueNorth] = useState(true);
  const [maguT, setMaguT] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const smoothRef = useRef<number | null>(null);
  const wasAligned = useRef(false);
  const nearAligned = useRef(false);
  const lastUiHeadingAt = useRef(0);
  const pendingHeading = useRef<number | null>(null);
  const rafHeading = useRef<number | null>(null);

  const applyLocation = useCallback(
    async (latitude: number, longitude: number, accuracy: number | null) => {
      const qibla = calculateQiblaDirection(latitude, longitude);
      setQiblaDirection(qibla);
      setDistance(getDistanceToMecca(latitude, longitude));
      setGpsAccuracy(accuracy != null && Number.isFinite(accuracy) ? accuracy : null);
      setCoordsLabel(formatCoord(latitude, longitude));

      try {
        const [geo] = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geo) {
          setCityLabel(
            [geo.city || geo.subregion, geo.country].filter(Boolean).join(' · ')
          );
        }
      } catch {
        setCityLabel(`${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`);
      }
    },
    []
  );

  const flushHeading = useCallback(() => {
    rafHeading.current = null;
    if (pendingHeading.current == null) return;
    const now = Date.now();
    // حدّث واجهة النصوص بحد أقصى ~20 إطار/ث لتقليل إعادة الرسم مع الإبقاء على نعومة الأنيميشن
    if (now - lastUiHeadingAt.current < 48) {
      rafHeading.current = requestAnimationFrame(flushHeading);
      return;
    }
    lastUiHeadingAt.current = now;
    setDeviceHeading(pendingHeading.current);
  }, []);

  useEffect(() => {
    let headingSub: Location.LocationSubscription | null = null;
    let watchSub: Location.LocationSubscription | null = null;
    let magSub: { remove: () => void } | null = null;
    let cancelled = false;

    async function init() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError(t('qibla.permission'));
          setLoading(false);
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
          mayShowUserSettingsDialog: true,
        });
        if (cancelled) return;

        await applyLocation(
          location.coords.latitude,
          location.coords.longitude,
          location.coords.accuracy
        );

        watchSub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 8,
            timeInterval: 12000,
          },
          (loc) => {
            if (cancelled) return;
            void applyLocation(loc.coords.latitude, loc.coords.longitude, loc.coords.accuracy);
          }
        );

        headingSub = await Location.watchHeadingAsync((heading) => {
          const trueOk = heading.trueHeading >= 0;
          const value = trueOk ? heading.trueHeading : heading.magHeading;
          setUsingTrueNorth(trueOk);
          const normalized = ((value % 360) + 360) % 360;
          const prev = smoothRef.current;
          const smoothed =
            prev == null
              ? normalized
              : adaptiveSmoothHeading(prev, normalized, {
                  accuracyDeg: heading.accuracy,
                });
          smoothRef.current = smoothed;
          pendingHeading.current = smoothed;
          setRawAccuracy(Number.isFinite(heading.accuracy) ? heading.accuracy : null);
          if (rafHeading.current == null) {
            rafHeading.current = requestAnimationFrame(flushHeading);
          }
        });

        if (Platform.OS !== 'web') {
          try {
            Magnetometer.setUpdateInterval(400);
            magSub = Magnetometer.addListener((data) => {
              const strength = Math.sqrt(data.x * data.x + data.y * data.y + data.z * data.z);
              // على كثير من الأجهزة القيم بالميكروتسلا مباشرة
              setMaguT(strength);
            });
          } catch {
            // الجهاز لا يدعم المغناطومتر
          }
        }

        setLoading(false);
      } catch {
        setError(t('qibla.error'));
        setLoading(false);
      }
    }

    init();

    return () => {
      cancelled = true;
      headingSub?.remove();
      watchSub?.remove();
      magSub?.remove();
      if (rafHeading.current != null) cancelAnimationFrame(rafHeading.current);
    };
  }, [t, applyLocation, flushHeading]);

  const refreshLocation = useCallback(async () => {
    setRefreshing(true);
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });
      await applyLocation(
        location.coords.latitude,
        location.coords.longitude,
        location.coords.accuracy
      );
    } catch {
      // تجاهل — نبقي آخر قيمة
    } finally {
      setRefreshing(false);
    }
  }, [applyLocation]);

  const relative = useMemo(
    () => angleToQibla(qiblaDirection, deviceHeading),
    [qiblaDirection, deviceHeading]
  );

  const tol = alignmentTolerance(rawAccuracy);
  const aligned = Math.abs(relative) < tol;
  const accuracyLevel = classifyCompassAccuracy(rawAccuracy);
  const mag = classifyMagneticField(maguT);

  useEffect(() => {
    const near = Math.abs(relative) < tol + 8;
    if (near && !nearAligned.current && !aligned) {
      Haptics.selectionAsync().catch(() => undefined);
    }
    nearAligned.current = near;

    if (aligned && !wasAligned.current) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    }
    wasAligned.current = aligned;
  }, [aligned, relative, tol]);

  const cardinals = useMemo(() => {
    if (locale.startsWith('ar')) return { n: 'ش', e: 'ق', s: 'ج', w: 'غ' };
    if (locale.startsWith('tr')) return { n: 'K', e: 'D', s: 'G', w: 'B' };
    return { n: 'N', e: 'E', s: 'S', w: 'W' };
  }, [locale]);

  if (loading) return <LoadingView message={t('qibla.loading')} />;
  if (error) return <ErrorView message={error} />;

  const accuracyColor =
    accuracyLevel === 'high'
      ? colors.success
      : accuracyLevel === 'medium'
        ? colors.accent
        : accuracyLevel === 'low' || accuracyLevel === 'unreliable'
          ? colors.error
          : colors.textSecondary;

  const magColor =
    mag.level === 'ok'
      ? colors.success
      : mag.level === 'weak' || mag.level === 'strong'
        ? colors.error
        : colors.textSecondary;

  const turnLabel =
    aligned
      ? t('qibla.aligned')
      : relative > 0
        ? t('qibla.turnRight', { n: Math.abs(relative).toFixed(Math.abs(relative) < 15 ? 1 : 0) })
        : t('qibla.turnLeft', { n: Math.abs(relative).toFixed(Math.abs(relative) < 15 ? 1 : 0) });

  const distanceLabel = Math.round(distance).toLocaleString(locale);
  const bearingFine = qiblaDirection.toFixed(1);
  const headingFine = deviceHeading.toFixed(1);
  const needCalibrate =
    accuracyLevel === 'low' ||
    accuracyLevel === 'unreliable' ||
    accuracyLevel === 'unknown' ||
    mag.level === 'weak' ||
    mag.level === 'strong' ||
    !usingTrueNorth;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={
          isDark
            ? [colors.primaryDark, colors.background]
            : [colors.primary, colors.primaryLight, colors.background]
        }
        style={styles.hero}
      >
        <Text style={[styles.heroTitle, { fontFamily: fonts.uiExtra, textAlign, fontSize: scale(22) }]}>
          {t('qibla.title')}
        </Text>
        <Text style={[styles.heroSub, { fontFamily: fonts.uiRegular, textAlign, fontSize: scale(14) }]}>
          {cityLabel
            ? t('qibla.distanceFrom', { city: cityLabel, km: distanceLabel })
            : t('qibla.distanceKm', { km: distanceLabel })}
        </Text>
        {coordsLabel ? (
          <Text style={[styles.coords, { fontFamily: fonts.ui, textAlign }]}>{coordsLabel}</Text>
        ) : null}
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.compassWrap}>
          <QiblaCompass
            deviceHeading={deviceHeading}
            qiblaBearing={qiblaDirection}
            relativeAngle={relative}
            aligned={aligned}
            size={308}
            cardinals={cardinals}
          />
        </View>

        <View
          style={[
            styles.statusCard,
            {
              backgroundColor: aligned ? colors.mist : colors.surface,
              borderColor: aligned ? colors.success : colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.statusMain,
              {
                color: aligned ? colors.success : colors.text,
                fontFamily: fonts.uiExtra,
                textAlign: 'center',
                fontSize: scale(17),
              },
            ]}
          >
            {turnLabel}
          </Text>
          <Text
            style={[
              styles.statusDeg,
              { color: colors.primary, fontFamily: fonts.uiBold, textAlign: 'center', fontSize: scale(20) },
            ]}
          >
            {t('qibla.bearingFine', { n: bearingFine })}
          </Text>
          <Text
            style={[
              styles.statusMeta,
              { color: colors.textSecondary, fontFamily: fonts.uiRegular, textAlign: 'center' },
            ]}
          >
            {t('qibla.offsetDetail', {
              n: Math.abs(relative).toFixed(1),
              tol: String(tol),
            })}
          </Text>
        </View>

        <View style={styles.metricsRow}>
          <Metric
            label={t('qibla.deviceHeading')}
            value={`${headingFine}°`}
            colors={colors}
            fonts={fonts}
          />
          <Metric
            label={t('qibla.accuracy')}
            value={
              rawAccuracy != null && rawAccuracy >= 0
                ? `${t(`qibla.accuracy_${accuracyLevel}`)} (±${Math.round(rawAccuracy)}°)`
                : t(`qibla.accuracy_${accuracyLevel}`)
            }
            colors={colors}
            fonts={fonts}
            valueColor={accuracyColor}
          />
          <Metric
            label={t('qibla.northMode')}
            value={usingTrueNorth ? t('qibla.trueNorth') : t('qibla.magneticNorth')}
            colors={colors}
            fonts={fonts}
            valueColor={usingTrueNorth ? colors.success : colors.accent}
          />
        </View>

        <View style={styles.metricsRow}>
          <Metric
            label={t('qibla.gpsAccuracy')}
            value={
              gpsAccuracy != null
                ? t('qibla.gpsAccuracyValue', { n: Math.round(gpsAccuracy) })
                : '—'
            }
            colors={colors}
            fonts={fonts}
          />
          <Metric
            label={t('qibla.magneticField')}
            value={
              mag.microTesla != null
                ? `${Math.round(mag.microTesla)} μT · ${t(`qibla.mag_${mag.level}`)}`
                : t('qibla.mag_unknown')
            }
            colors={colors}
            fonts={fonts}
            valueColor={magColor}
          />
          <Metric
            label={t('qibla.distanceShort')}
            value={`${distanceLabel} ${t('qibla.km')}`}
            colors={colors}
            fonts={fonts}
          />
        </View>

        <TouchableOpacity
          onPress={refreshLocation}
          disabled={refreshing}
          style={[
            styles.refreshBtn,
            { backgroundColor: colors.primary, opacity: refreshing ? 0.7 : 1 },
          ]}
        >
          <Text style={{ color: '#fff', fontFamily: fonts.uiBold, fontSize: scale(14) }}>
            {refreshing ? t('qibla.refreshing') : t('qibla.refreshLocation')}
          </Text>
        </TouchableOpacity>

        {needCalibrate ? (
          <View
            style={[
              styles.tipCard,
              { backgroundColor: colors.sand, borderColor: colors.border },
            ]}
          >
            <Text
              style={[
                styles.tipTitle,
                { color: colors.accent, fontFamily: fonts.uiBold, textAlign, fontSize: scale(14) },
              ]}
            >
              {t('qibla.calibrateTitle')}
            </Text>
            <Text
              style={[
                styles.tipBody,
                {
                  color: colors.textSecondary,
                  fontFamily: fonts.uiRegular,
                  textAlign,
                  fontSize: scale(13),
                },
              ]}
            >
              {!usingTrueNorth ? `${t('qibla.magNorthHint')}\n\n` : ''}
              {t('qibla.calibrateBody')}
            </Text>
          </View>
        ) : null}

        <Text style={[styles.footnote, { color: colors.textSecondary, fontFamily: fonts.uiRegular }]}>
          {t('qibla.footnote')}
        </Text>
      </ScrollView>
    </View>
  );
}

function Metric({
  label,
  value,
  colors,
  fonts,
  valueColor,
}: {
  label: string;
  value: string;
  colors: { surface: string; border: string; text: string; textSecondary: string };
  fonts: { ui: string; uiBold: string };
  valueColor?: string;
}) {
  return (
    <View
      style={[
        styles.metric,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.metricLabel, { color: colors.textSecondary, fontFamily: fonts.ui }]}>
        {label}
      </Text>
      <Text
        style={[
          styles.metricValue,
          { color: valueColor ?? colors.text, fontFamily: fonts.uiBold },
        ]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: {
    paddingTop: 16,
    paddingBottom: 18,
    paddingHorizontal: space.lg,
  },
  heroTitle: {
    color: '#fff',
    marginBottom: 4,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.92)',
    lineHeight: 22,
  },
  coords: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
    marginTop: 6,
    fontVariant: ['tabular-nums'],
  },
  scroll: {
    paddingBottom: 120,
    alignItems: 'center',
  },
  compassWrap: {
    marginTop: 8,
    marginBottom: 18,
  },
  statusCard: {
    width: '90%',
    maxWidth: 400,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  statusMain: {
    lineHeight: 26,
  },
  statusDeg: {
    marginTop: 8,
  },
  statusMeta: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    width: '90%',
    maxWidth: 400,
    marginBottom: 10,
  },
  metric: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    minHeight: 64,
    justifyContent: 'center',
  },
  metricLabel: {
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  refreshBtn: {
    width: '90%',
    maxWidth: 400,
    minHeight: 46,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  tipCard: {
    width: '90%',
    maxWidth: 400,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  tipTitle: {
    marginBottom: 6,
  },
  tipBody: {
    lineHeight: 22,
  },
  footnote: {
    width: '90%',
    maxWidth: 400,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
  },
});
