import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { recordActivity } from '../services/activityStore';
import {
  getTasbihRecord,
  incrementTasbih,
  resetTasbihSession,
  setTasbihDhikr,
  setTasbihTarget,
  TasbihRecord,
} from '../services/tasbihStore';
import { useTheme } from '../theme/ThemeContext';
import { toEasternDigits } from '../utils/arabicNumerals';

const PRESET_TARGETS = [33, 99, 100];

const DHIKR_OPTIONS = [
  { id: 'subhanallah', ar: 'سُبْحَانَ اللَّهِ', en: 'SubhanAllah' },
  { id: 'alhamdulillah', ar: 'الْحَمْدُ لِلَّهِ', en: 'Alhamdulillah' },
  { id: 'allahuakbar', ar: 'اللَّهُ أَكْبَرُ', en: 'Allahu Akbar' },
  { id: 'lailaha', ar: 'لَا إِلٰهَ إِلَّا اللَّهُ', en: 'La ilaha illallah' },
  { id: 'astaghfirullah', ar: 'أَسْتَغْفِرُ اللَّهَ', en: 'Astaghfirullah' },
];

export function TasbihScreen() {
  const { colors, isDark, fonts } = useTheme();
  const navigation = useNavigation<any>();
  const [record, setRecord] = useState<TasbihRecord | null>(null);
  const [customTarget, setCustomTarget] = useState('');

  useFocusEffect(
    useCallback(() => {
      getTasbihRecord().then(setRecord);
    }, [])
  );

  const dhikr = useMemo(() => {
    const id = record?.dhikr_id ?? 'subhanallah';
    return DHIKR_OPTIONS.find((d) => d.id === id) ?? DHIKR_OPTIONS[0];
  }, [record?.dhikr_id]);

  async function onTap() {
    if (!record) return;
    const { record: next, hitMilestone, hitTarget } = await incrementTasbih();
    setRecord(next);

    try {
      if (hitMilestone) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } else {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch {
      // جهاز بلا اهتزاز
    }

    const { newBadges } = await recordActivity('tasbih', 1);
    if (hitTarget) {
      Alert.alert('بارك الله فيك', `وصلت إلى هدف ${next.target} ✓`);
    } else if (newBadges.length) {
      const b = newBadges[0];
      Alert.alert(`وسام جديد ${b.icon}`, `${b.title}\n${b.description}`);
    }
  }

  async function onSelectDhikr(id: string) {
    setRecord(await setTasbihDhikr(id));
  }

  async function onSelectTarget(t: number) {
    setRecord(await setTasbihTarget(t));
    setCustomTarget('');
  }

  async function onApplyCustom() {
    const n = Number(customTarget);
    if (!n || n < 1) {
      Alert.alert('تنبيه', 'أدخل هدفاً صالحاً (مثلاً 33 أو 500).');
      return;
    }
    setRecord(await setTasbihTarget(n));
  }

  async function onReset() {
    setRecord(await resetTasbihSession());
  }

  const count = record?.session_count ?? 0;
  const target = record?.target ?? 33;
  const lifetime = record?.lifetime_total ?? 0;
  const progress = Math.min(count / Math.max(target, 1), 1);
  const done = count > 0 && count % target === 0;
  const gradient = done
    ? (['#1B7A46', '#27AE60'] as const)
    : isDark
      ? (['#3F4A33', '#5C6B4A'] as const)
      : (['#3F4A33', '#5C6B4A'] as const);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={isDark ? [colors.background, colors.surface] : [colors.mist, colors.background]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.subtitle, { color: colors.textSecondary, fontFamily: fonts.uiRegular }]}>
          اهتزاز خفيف مع كل ضغطة • اهتزاز قوي عند المضاعفات
        </Text>

        <View
          style={[styles.lifetimeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={[styles.lifetimeLabel, { color: colors.textSecondary, fontFamily: fonts.ui }]}>
            المجموع التراكمي
          </Text>
          <Text style={[styles.lifetimeValue, { color: colors.primary, fontFamily: fonts.uiExtra }]}>
            {toEasternDigits(lifetime)}
          </Text>
        </View>

        <View style={styles.dhikrRow}>
          {DHIKR_OPTIONS.map((item) => {
            const active = item.id === dhikr.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.dhikrChip,
                  {
                    backgroundColor: active ? colors.primary : colors.surface,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => onSelectDhikr(item.id)}
              >
                <Text
                  style={{
                    color: active ? '#fff' : colors.text,
                    fontWeight: '700',
                    fontSize: 12,
                    fontFamily: fonts.ui,
                  }}
                >
                  {item.ar}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.targets}>
          {PRESET_TARGETS.map((t) => (
            <TouchableOpacity
              key={t}
              style={[
                styles.targetChip,
                {
                  backgroundColor: target === t ? colors.accent : colors.surface,
                  borderColor: target === t ? colors.accent : colors.border,
                },
              ]}
              onPress={() => onSelectTarget(t)}
            >
              <Text
                style={{
                  color: target === t ? '#1A2E35' : colors.text,
                  fontWeight: '800',
                  fontFamily: fonts.uiBold,
                }}
              >
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.customRow}>
          <TouchableOpacity
            style={[styles.customBtn, { backgroundColor: colors.primary }]}
            onPress={onApplyCustom}
          >
            <Text style={{ color: '#fff', fontFamily: fonts.uiBold }}>تعيين</Text>
          </TouchableOpacity>
          <TextInput
            value={customTarget}
            onChangeText={setCustomTarget}
            keyboardType="number-pad"
            placeholder="هدف مخصص"
            placeholderTextColor={colors.textSecondary}
            style={[
              styles.customInput,
              {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                fontFamily: fonts.ui,
              },
            ]}
          />
        </View>

        <TouchableOpacity activeOpacity={0.9} onPress={onTap} disabled={!record}>
          <LinearGradient colors={[...gradient]} style={styles.circle}>
            <View style={styles.ring}>
              <Text style={styles.dhikrMain}>{dhikr.ar}</Text>
              <Text style={styles.count}>{toEasternDigits(count)}</Text>
              <Text style={styles.targetLabel}>من {toEasternDigits(target)}</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
          <LinearGradient
            colors={done ? ['#27AE60', '#2ECC71'] : [colors.accent, colors.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressFill, { width: `${progress * 100}%` }]}
          />
        </View>

        <Text style={[styles.hint, { color: colors.textSecondary, fontFamily: fonts.uiRegular }]}>
          {done ? 'وصلت للهدف — يمكنك المتابعة أو التصفير' : `${dhikr.en} • اضغط الدائرة للعدّ`}
        </Text>

        <TouchableOpacity
          style={[styles.resetBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={onReset}
        >
          <Text style={{ color: colors.text, fontSize: 16, fontFamily: fonts.ui }}>
            إعادة تصفير الجلسة
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 130,
    paddingHorizontal: 12,
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  lifetimeCard: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 22,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  lifetimeLabel: { fontSize: 12 },
  lifetimeValue: { fontSize: 28, marginTop: 2 },
  dhikrRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  dhikrChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  targets: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  targetChip: {
    width: 56,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  customInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    textAlign: 'center',
  },
  customBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  circle: {
    width: 250,
    height: 250,
    borderRadius: 125,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#3F4A33',
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  ring: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  dhikrMain: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  count: { color: '#fff', fontSize: 68, fontWeight: '800', lineHeight: 74 },
  targetLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 16, marginTop: 2 },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    width: '70%',
    marginTop: 28,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 5 },
  hint: { textAlign: 'center', marginTop: 18, fontSize: 15 },
  resetBtn: {
    marginTop: 18,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
});
