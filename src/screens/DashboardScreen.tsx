import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon, IconName } from '../components/Icon';
import {
  ActivityDay,
  BadgeDef,
  getDashboardStats,
  isActiveDay,
} from '../services/activityStore';
import { getTasbihRecord } from '../services/tasbihStore';
import { useTheme } from '../theme/ThemeContext';
import { control, radius, space } from '../theme/tokens';
import { toEasternDigits } from '../utils/arabicNumerals';

type Stats = Awaited<ReturnType<typeof getDashboardStats>> & {
  lifetimeTasbih: number;
};

export function DashboardScreen() {
  const { colors, isDark } = useTheme();
  const [stats, setStats] = useState<Stats | null>(null);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const dash = await getDashboardStats();
        const tasbih = await getTasbihRecord();
        setStats({ ...dash, lifetimeTasbih: tasbih.lifetime_total });
      })();
    }, [])
  );

  if (!stats) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={isDark ? ['#163033', colors.background] : ['#0E5F63', '#F7F3EA']}
        style={styles.hero}
      >
        <Text style={styles.title}>لوحة التحفيز</Text>
        <Text style={styles.sub}>سلسلتك • نشاطك • أوسمتك</Text>
        <View style={styles.kpiRow}>
          <Kpi label="أيام متتالية" value={toEasternDigits(stats.streak)} />
          <Kpi label="نشط / ٢٨ يوماً" value={toEasternDigits(stats.activeDaysLast28)} />
          <Kpi label="تسبيح تراكمي" value={toEasternDigits(stats.lifetimeTasbih)} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.section, { color: colors.text }]}>تقويم النشاط (٢٨ يوماً)</Text>
        <View style={[styles.calCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.calGrid}>
            {stats.days.map((day) => (
              <DayCell key={day.date} day={day} colors={colors} />
            ))}
          </View>
          <Text style={[styles.legend, { color: colors.textSecondary }]}>
            المربّع المضيء = يوم قرأت فيه أذكاراً أو قرآناً أو سبّحت
          </Text>
        </View>

        <Text style={[styles.section, { color: colors.text }]}>الأوسمة</Text>
        <View style={styles.badgeGrid}>
          {stats.badges.map(({ def, unlocked, unlockedAt }) => (
            <BadgeCard
              key={def.id}
              def={def}
              unlocked={unlocked}
              unlockedAt={unlockedAt}
              colors={colors}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.kpi}>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function DayCell({
  day,
  colors,
}: {
  day: ActivityDay;
  colors: { primary: string; border: string; sand: string; textSecondary: string };
}) {
  const active = isActiveDay(day);
  const dayNum = Number(day.date.slice(-2));
  return (
    <View
      style={[
        styles.dayCell,
        {
          backgroundColor: active ? colors.primary : colors.sand,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={{ color: active ? '#fff' : colors.textSecondary, fontSize: 10, fontWeight: '700' }}>
        {toEasternDigits(dayNum)}
      </Text>
    </View>
  );
}

function BadgeCard({
  def,
  unlocked,
  unlockedAt,
  colors,
}: {
  def: BadgeDef;
  unlocked: boolean;
  unlockedAt?: string;
  colors: { surface: string; border: string; text: string; textSecondary: string; primary: string };
}) {
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors.surface,
          borderColor: unlocked ? colors.primary : colors.border,
          opacity: unlocked ? 1 : 0.55,
        },
      ]}
    >
      <View
        style={[
          styles.badgeIconWell,
          { backgroundColor: unlocked ? colors.primary + '22' : colors.border + '55' },
        ]}
      >
        <Icon
          name={(def.icon as IconName) || 'star'}
          size={control.iconLg}
          color={unlocked ? colors.primary : colors.textSecondary}
        />
      </View>
      <Text style={[styles.badgeTitle, { color: colors.text }]}>{def.title}</Text>
      <Text style={[styles.badgeDesc, { color: colors.textSecondary }]}>{def.description}</Text>
      <Text style={{ color: unlocked ? colors.primary : colors.textSecondary, fontSize: 11, marginTop: 6 }}>
        {unlocked
          ? `مفتوح${unlockedAt ? ` • ${unlockedAt.slice(0, 10)}` : ''}`
          : 'مقفل'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: {
    paddingTop: 16,
    paddingBottom: 22,
    paddingHorizontal: 18,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  title: { color: '#fff', fontSize: 26, fontWeight: '800', textAlign: 'center' },
  sub: { color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginTop: 4, marginBottom: 14 },
  kpiRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  kpi: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  kpiValue: { color: '#fff', fontSize: 22, fontWeight: '800' },
  kpiLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2, textAlign: 'center' },
  content: { padding: control.screenInset, paddingBottom: 120 },
  section: { fontSize: 17, fontWeight: '800', textAlign: 'right', marginBottom: 10, marginTop: 6 },
  calCard: { borderWidth: 1, borderRadius: radius.xl, padding: space.md, marginBottom: 18 },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end' },
  dayCell: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legend: { textAlign: 'center', marginTop: 12, fontSize: 12 },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-end' },
  badge: {
    width: '47%',
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.md,
    alignItems: 'center',
  },
  badgeIconWell: {
    width: control.badgeMd,
    height: control.badgeMd,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  badgeTitle: { fontWeight: '800', fontSize: 15, textAlign: 'center' },
  badgeDesc: { fontSize: 11, textAlign: 'center', marginTop: 4, lineHeight: 16 },
});
