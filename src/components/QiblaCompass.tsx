import { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { shortestAngleDelta } from '../services/qibla';
import { useTheme } from '../theme/ThemeContext';

type Props = {
  /** اتجاه الجهاز (0–360) بعد التنعيم */
  deviceHeading: number;
  /** زاوية القبلة من الشمال الحقيقي */
  qiblaBearing: number;
  /** فرق نسبي للهواتف (-180..180) */
  relativeAngle: number;
  aligned: boolean;
  size?: number;
  /** حروف الجهات: ar → ش ق ج غ */
  cardinals?: { n: string; e: string; s: string; w: string };
};

const TICKS = Array.from({ length: 72 }, (_, i) => i * 5);
const DEGREE_MARKS = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

export function QiblaCompass({
  deviceHeading,
  qiblaBearing,
  relativeAngle,
  aligned,
  size = 320,
  cardinals = { n: 'N', e: 'E', s: 'S', w: 'W' },
}: Props) {
  const { colors, isDark, fonts } = useTheme();
  const rotateAnim = useRef(new Animated.Value(-deviceHeading)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  /** اتجاه مستمر غير ملفوف ليطابق قيمة الأنيميشن */
  const unwrappedRef = useRef(deviceHeading);

  useEffect(() => {
    const prev = unwrappedRef.current;
    const delta = shortestAngleDelta(((prev % 360) + 360) % 360, deviceHeading);
    const next = prev + delta;
    unwrappedRef.current = next;

    Animated.spring(rotateAnim, {
      toValue: -next,
      useNativeDriver: true,
      stiffness: 145,
      damping: 20,
      mass: 0.75,
      restDisplacementThreshold: 0.08,
      restSpeedThreshold: 0.08,
      overshootClamping: false,
    }).start();
  }, [deviceHeading, rotateAnim]);

  useEffect(() => {
    if (!aligned) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.035,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [aligned, pulse]);

  const dialRotate = rotateAnim.interpolate({
    inputRange: [-2160, 2160],
    outputRange: ['-2160deg', '2160deg'],
  });

  const ringColor = aligned ? colors.success : colors.accent;
  const faceInner = isDark ? '#1A1F1A' : '#FBF7F0';
  const faceOuter = isDark ? '#262C24' : '#EFE6D6';
  const tickMajor = isDark ? '#D4C4A0' : '#8A7350';
  const tickMinor = isDark ? '#5A6258' : '#C4B59A';

  const ticks = useMemo(
    () =>
      TICKS.map((deg) => {
        const isCardinal = deg % 90 === 0;
        const isMajor = deg % 30 === 0;
        const len = isCardinal ? 18 : isMajor ? 13 : 6;
        const width = isCardinal ? 2.5 : isMajor ? 2 : 1;
        return (
          <View
            key={deg}
            style={[
              styles.tickWrap,
              {
                width: size,
                height: size,
                transform: [{ rotate: `${deg}deg` }],
              },
            ]}
          >
            <View
              style={{
                width,
                height: len,
                borderRadius: 1,
                backgroundColor: isCardinal ? colors.error : isMajor ? tickMajor : tickMinor,
                marginTop: 12,
                opacity: isCardinal || isMajor ? 1 : 0.7,
              }}
            />
          </View>
        );
      }),
    [size, colors.error, tickMajor, tickMinor]
  );

  const degreeLabels = useMemo(
    () =>
      DEGREE_MARKS.map((d) => (
        <Text
          key={d}
          style={[
            styles.degreeLabel,
            {
              color: d === 0 ? colors.error : colors.textSecondary,
              fontFamily: fonts.uiBold,
              fontSize: d % 90 === 0 ? 11 : 9,
              opacity: d % 90 === 0 ? 0.95 : 0.65,
              transform: [
                { rotate: `${d}deg` },
                { translateY: -(size / 2 - 40) },
                { rotate: `${-d}deg` },
              ],
            },
          ]}
        >
          {d}°
        </Text>
      )),
    [size, colors.error, colors.textSecondary, fonts.uiBold]
  );

  const absRel = Math.abs(relativeAngle);
  const turnHint = absRel < 5 ? null : relativeAngle > 0 ? '↻' : '↺';

  return (
    <Animated.View style={{ transform: [{ scale: pulse }] }}>
      <View
        style={[
          styles.outerGlow,
          {
            width: size + 32,
            height: size + 32,
            borderRadius: (size + 32) / 2,
            borderColor: aligned ? colors.success + '88' : colors.border,
            backgroundColor: aligned ? colors.success + '18' : 'transparent',
          },
        ]}
      >
        <LinearGradient
          colors={[faceOuter, faceInner, faceOuter]}
          style={[
            styles.face,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderColor: ringColor,
            },
          ]}
        >
          <View
            style={[
              styles.innerRing,
              {
                width: size - 26,
                height: size - 26,
                borderRadius: (size - 26) / 2,
                borderColor: colors.accent + '77',
              },
            ]}
          />
          <View
            style={[
              styles.innerRing,
              {
                width: size - 52,
                height: size - 52,
                borderRadius: (size - 52) / 2,
                borderColor: isDark ? '#3A4238' : '#E2D5BF',
                borderWidth: 1,
              },
            ]}
          />

          <Animated.View
            style={[
              styles.dial,
              {
                width: size,
                height: size,
                transform: [{ rotate: dialRotate }],
              },
            ]}
          >
            {ticks}
            {degreeLabels}

            <Text style={[styles.cardinalN, { color: colors.error, fontFamily: fonts.uiExtra }]}>
              {cardinals.n}
            </Text>
            <Text style={[styles.cardinalE, { color: tickMajor, fontFamily: fonts.uiBold }]}>
              {cardinals.e}
            </Text>
            <Text style={[styles.cardinalS, { color: tickMajor, fontFamily: fonts.uiBold }]}>
              {cardinals.s}
            </Text>
            <Text style={[styles.cardinalW, { color: tickMajor, fontFamily: fonts.uiBold }]}>
              {cardinals.w}
            </Text>

            {/* شعاع القبلة */}
            <View
              style={[
                styles.qiblaArm,
                {
                  height: size * 0.44,
                  transform: [{ rotate: `${qiblaBearing}deg` }],
                },
              ]}
            >
              <View style={[styles.qiblaAura, { backgroundColor: colors.success + '28' }]} />
              <LinearGradient
                colors={[colors.success, colors.accent, colors.success]}
                style={styles.qiblaBeam}
              />
              <View
                style={[
                  styles.kaabaBadge,
                  {
                    backgroundColor: colors.surface,
                    borderColor: aligned ? colors.success : colors.accent,
                  },
                ]}
              >
                <View style={[styles.kaabaBox, { borderColor: colors.text }]}>
                  <View style={[styles.kaabaDoor, { backgroundColor: colors.accent }]} />
                </View>
              </View>
            </View>

            {/* مؤشر جنوب معاكس خفيف للتوازن */}
            <View
              style={[
                styles.tailArm,
                {
                  height: size * 0.18,
                  transform: [{ rotate: `${qiblaBearing + 180}deg` }],
                },
              ]}
            >
              <View style={[styles.tailBeam, { backgroundColor: tickMinor }]} />
            </View>
          </Animated.View>

          {/* مؤشر اتجاه الهاتف (ثابت للأعلى) */}
          <View style={styles.phoneStack} pointerEvents="none">
            <View
              style={[
                styles.phoneTip,
                { borderBottomColor: aligned ? colors.success : colors.primary },
              ]}
            />
            <View
              style={[
                styles.phoneStem,
                { backgroundColor: aligned ? colors.success : colors.primary },
              ]}
            />
          </View>

          <View
            style={[
              styles.hub,
              {
                backgroundColor: colors.surface,
                borderColor: ringColor,
              },
            ]}
          >
            <Text style={[styles.hubText, { color: colors.text, fontFamily: fonts.uiExtra }]}>
              {absRel < 10 ? absRel.toFixed(1) : Math.round(absRel)}°
            </Text>
            {turnHint ? (
              <Text style={{ color: colors.accent, fontSize: 13 }}>{turnHint}</Text>
            ) : (
              <Text style={{ color: colors.success, fontSize: 11, fontFamily: fonts.uiBold }}>✓</Text>
            )}
          </View>
        </LinearGradient>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outerGlow: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  face: {
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  innerRing: {
    position: 'absolute',
    borderWidth: 1.5,
  },
  dial: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickWrap: {
    position: 'absolute',
    alignItems: 'center',
  },
  cardinalN: {
    position: 'absolute',
    top: 22,
    fontSize: 22,
    fontWeight: '800',
  },
  cardinalS: {
    position: 'absolute',
    bottom: 22,
    fontSize: 17,
  },
  cardinalE: {
    position: 'absolute',
    right: 24,
    fontSize: 17,
  },
  cardinalW: {
    position: 'absolute',
    left: 24,
    fontSize: 17,
  },
  degreeLabel: {
    position: 'absolute',
    fontVariant: ['tabular-nums'],
  },
  qiblaArm: {
    position: 'absolute',
    width: 48,
    alignItems: 'center',
    bottom: '50%',
  },
  qiblaAura: {
    position: 'absolute',
    width: 18,
    top: 8,
    bottom: 36,
    borderRadius: 9,
  },
  qiblaBeam: {
    width: 5,
    flex: 1,
    borderRadius: 3,
    minHeight: 78,
  },
  kaabaBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  kaabaBox: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 2,
  },
  kaabaDoor: {
    width: 5,
    height: 7,
    borderRadius: 1,
  },
  tailArm: {
    position: 'absolute',
    width: 20,
    alignItems: 'center',
    bottom: '50%',
  },
  tailBeam: {
    width: 3,
    flex: 1,
    borderRadius: 2,
    opacity: 0.55,
    minHeight: 28,
  },
  phoneStack: {
    position: 'absolute',
    top: 18,
    alignItems: 'center',
    zIndex: 5,
  },
  phoneTip: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 16,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  phoneStem: {
    width: 3.5,
    height: 20,
    borderRadius: 2,
    marginTop: -1,
  },
  hub: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 6,
    elevation: 6,
  },
  hubText: {
    fontSize: 19,
    fontVariant: ['tabular-nums'],
  },
});
