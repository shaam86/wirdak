import { memo, useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

type Props = {
  text: string;
  masked: boolean;
  fontSize: number;
  fontFamily?: string;
  /** رقم الآية للعرض بجانب النص */
  marker?: string;
};

/**
 * نص مع قناع شفاف متحرّك — بدون إعادة بناء شجرة الصفحة كاملة.
 */
export const MaskedText = memo(function MaskedText({
  text,
  masked,
  fontSize,
  fontFamily,
  marker,
}: Props) {
  const { colors, isDark } = useTheme();
  const clear = useRef(new Animated.Value(masked ? 0 : 1)).current;
  const veil = useRef(new Animated.Value(masked ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(clear, {
        toValue: masked ? 0 : 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(veil, {
        toValue: masked ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [masked, clear, veil]);

  const lineHeight = Math.round(fontSize * 2.05);
  const veilBg = isDark ? 'rgba(28, 32, 30, 0.82)' : 'rgba(247, 241, 230, 0.88)';

  return (
    <View style={styles.wrap}>
      <Animated.Text
        style={[
          styles.text,
          {
            color: colors.text,
            fontSize,
            lineHeight,
            fontFamily,
            opacity: clear,
          },
        ]}
      >
        {text}
        {marker ? (
          <Text style={{ color: colors.accent, fontSize: fontSize * 0.65, fontFamily }}>
            {' '}
            {marker}{' '}
          </Text>
        ) : null}
      </Animated.Text>

      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          styles.veil,
          {
            backgroundColor: veilBg,
            opacity: veil,
            borderColor: colors.border,
          },
        ]}
      >
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: Math.max(14, fontSize * 0.55),
            letterSpacing: 3,
            opacity: 0.55,
          }}
        >
          ░░░░░░░░
        </Text>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { position: 'relative', overflow: 'hidden', borderRadius: 10 },
  text: { textAlign: 'right', writingDirection: 'rtl', paddingVertical: 4, paddingHorizontal: 2 },
  veil: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
