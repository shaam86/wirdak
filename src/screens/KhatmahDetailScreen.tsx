import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RouteProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ensureKhatmahPage,
  getKhatmahById,
  getPositionLabel,
  getProgressPercent,
  KhatmahRecord,
  markKhatmahCompleted,
} from '../services/khatmahStore';
import { MUSHAF_PAGE_COUNT } from '../services/quranApi';
import { HomeStackParamList } from '../navigation/types';
import { useTheme } from '../theme/ThemeContext';
import { toEasternDigits } from '../utils/arabicNumerals';

type Props = {
  route: RouteProp<HomeStackParamList, 'KhatmahDetail'>;
};

export function KhatmahDetailScreen({ route }: Props) {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const { khatmahId } = route.params;
  const [record, setRecord] = useState<KhatmahRecord | null>(null);

  const reload = useCallback(async () => {
    const ensured = await ensureKhatmahPage(khatmahId);
    setRecord(ensured ?? (await getKhatmahById(khatmahId)));
  }, [khatmahId]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  if (!record) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  const percent = getProgressPercent(record);
  const page = record.current_page || 1;

  function openPageReader() {
    navigation.navigate('KhatmahPage', { khatmahId: record!.khatmah_id });
  }

  function onMarkComplete() {
    Alert.alert('إتمام الختمة؟', 'سيتم تعليم هذه الختمة كمكتملة.', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'إتمام',
        onPress: async () => {
          const next = await markKhatmahCompleted(khatmahId);
          setRecord(next);
        },
      },
    ]);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={isDark ? ['#163033', '#10181A'] : ['#0E5F63', '#1A8A90']}
        style={styles.header}
      >
        <Text style={styles.kicker}>ختمة بالصفحات — منظّمة وواضحة</Text>
        <Text style={styles.title}>{record.khatmah_name}</Text>
        <Text style={styles.sub}>
          {record.is_completed
            ? 'مكتملة'
            : `وصلت إلى الصفحة ${toEasternDigits(page)} من ${toEasternDigits(MUSHAF_PAGE_COUNT)}`}
        </Text>
      </LinearGradient>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {record.is_completed ? (
          <Text style={[styles.doneBanner, { color: colors.success }]}>✓ أتممت هذه الختمة</Text>
        ) : (
          <>
            <Text style={[styles.posLabel, { color: colors.textSecondary }]}>آخر موضع محفوظ</Text>
            <Text style={[styles.posValue, { color: colors.text }]}>{getPositionLabel(record)}</Text>

            <View style={[styles.track, { backgroundColor: colors.border }]}>
              <View
                style={[styles.fill, { width: `${Math.max(percent, 3)}%`, backgroundColor: colors.primary }]}
              />
            </View>
            <Text style={[styles.percent, { color: colors.textSecondary }]}>
              إنجاز الختمة: {percent}%
            </Text>

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={openPageReader}
            >
              <Text style={styles.primaryText}>
                متابعة القراءة من الصفحة {toEasternDigits(page)}
              </Text>
            </TouchableOpacity>

            <Text style={[styles.howTo, { color: colors.textSecondary }]}>
              داخل الصفحة: اقرأ ثم اضغط «أكملت الصفحة» للانتقال تلقائياً للصفحة التالية مع حفظ
              موضعك.
            </Text>
          </>
        )}

        {record.is_completed ? (
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: 8 }]}
            onPress={openPageReader}
          >
            <Text style={styles.primaryText}>مراجعة المصحف</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={onMarkComplete} style={styles.linkBtn}>
            <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>
              تعليم الختمة كمكتملة يدوياً
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.note, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.noteTitle, { color: colors.text }]}>كيف تعمل؟</Text>
        <Text style={[styles.noteBody, { color: colors.textSecondary }]}>
          1) افتح الصفحة الحالية{'\n'}
          2) اقرأها{'\n'}
          3) اضغط «أكملت الصفحة» → تُحفظ ويُفتح ما بعدها مباشرة{'\n'}
          القراءة من الفهرس لا تغيّر هذه الختمة.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingBottom: 120 },
  header: {
    paddingTop: 20,
    paddingBottom: 28,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  kicker: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  title: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 6,
  },
  sub: {
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginTop: 6,
    fontSize: 13,
  },
  card: {
    marginHorizontal: 16,
    marginTop: -16,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
  },
  doneBanner: {
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 18,
    marginBottom: 10,
  },
  posLabel: { textAlign: 'right', fontSize: 12 },
  posValue: {
    textAlign: 'right',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 4,
    marginBottom: 14,
  },
  track: { height: 10, borderRadius: 5, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
  percent: { textAlign: 'center', marginTop: 10, fontSize: 13, fontWeight: '600' },
  primaryBtn: {
    marginTop: 16,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  howTo: {
    textAlign: 'center',
    marginTop: 12,
    fontSize: 12,
    lineHeight: 18,
  },
  linkBtn: { alignItems: 'center', marginTop: 14, padding: 8 },
  note: {
    margin: 16,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  noteTitle: { fontWeight: '800', textAlign: 'right', marginBottom: 6 },
  noteBody: { textAlign: 'right', lineHeight: 22, fontSize: 13 },
});
