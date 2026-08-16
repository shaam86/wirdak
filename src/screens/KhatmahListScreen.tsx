import { useCallback, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '../components/Icon';
import {
  createKhatmah,
  deleteKhatmah,
  getProgressPercent,
  getSurahName,
  KhatmahRecord,
  listKhatmahs,
  WIRD_AMOUNT_LABELS,
  WirdAmount,
} from '../services/khatmahStore';
import { useTheme } from '../theme/ThemeContext';

const WIRD_OPTIONS: WirdAmount[] = ['juz', 'surah', 'page'];

export function KhatmahListScreen() {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const [rows, setRows] = useState<KhatmahRecord[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [wirdAmount, setWirdAmount] = useState<WirdAmount>('page');

  const reload = useCallback(() => {
    listKhatmahs().then(setRows);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  async function onCreate() {
    const record = await createKhatmah(name || 'ختمة جديدة', wirdAmount);
    setModalOpen(false);
    setName('');
    setWirdAmount('page');
    reload();
    navigation.navigate('KhatmahDetail', { khatmahId: record.khatmah_id });
  }

  function onDelete(item: KhatmahRecord) {
    Alert.alert('حذف الختمة؟', `سيتم حذف «${item.khatmah_name}» نهائياً.`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          await deleteKhatmah(item.khatmah_id);
          reload();
        },
      },
    ]);
  }

  const active = rows.filter((r) => !r.is_completed);
  const done = rows.filter((r) => r.is_completed);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={
          isDark
            ? [colors.primaryDark, colors.background]
            : [colors.primary, colors.primaryLight]
        }
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (navigation.canGoBack()) navigation.goBack();
            else navigation.navigate('HomeMain');
          }}
        >
          <Icon name="chevron-right" size={20} color="#fff" />
          <Text style={styles.backText}>الرئيسية</Text>
        </TouchableOpacity>
        <Text style={styles.brand}>وردك</Text>
        <Text style={styles.title}>ختماتي</Text>
        <Text style={styles.sub}>
          ختمات متعددة معزولة عن فهرس القراءة • النشطة: {active.length} • المكتملة: {done.length}
        </Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          style={[styles.createBtn, { backgroundColor: colors.primary }]}
          onPress={() => setModalOpen(true)}
        >
          <Text style={styles.createText}>＋ بدء ختمة جديدة</Text>
        </TouchableOpacity>

        {rows.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>لا توجد ختمات بعد</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              ابدأ ختمة للتلاوة أو التدبر أو رمضان — كل ختمة تحفظ موضعها وحدها.
            </Text>
          </View>
        ) : null}

        {active.map((item) => (
          <KhatmahCard
            key={item.khatmah_id}
            item={item}
            colors={colors}
            onPress={() => navigation.navigate('KhatmahDetail', { khatmahId: item.khatmah_id })}
            onLongPress={() => onDelete(item)}
          />
        ))}

        {done.length > 0 ? (
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>ختمات مكتملة</Text>
        ) : null}
        {done.map((item) => (
          <KhatmahCard
            key={item.khatmah_id}
            item={item}
            colors={colors}
            onPress={() => navigation.navigate('KhatmahDetail', { khatmahId: item.khatmah_id })}
            onLongPress={() => onDelete(item)}
          />
        ))}
      </ScrollView>

      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>ختمة جديدة</Text>
            <Text style={[styles.modalHint, { color: colors.textSecondary }]}>
              لن تؤثر على ختماتك الأخرى ولا على قراءة الفهرس
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="اسم الختمة (مثال: ختمة رمضان)"
              placeholderTextColor={colors.textSecondary}
              style={[
                styles.input,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
              ]}
              textAlign="right"
            />
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>مقدار الورد اليومي</Text>
            <View style={styles.wirdRow}>
              {WIRD_OPTIONS.map((opt) => {
                const activeOpt = opt === wirdAmount;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      styles.wirdChip,
                      {
                        backgroundColor: activeOpt ? colors.primary : colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={() => setWirdAmount(opt)}
                  >
                    <Text style={{ color: activeOpt ? '#fff' : colors.text, fontWeight: '700', fontSize: 12 }}>
                      {WIRD_AMOUNT_LABELS[opt]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setModalOpen(false)} style={styles.cancelBtn}>
                <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
                onPress={onCreate}
              >
                <Text style={{ color: '#fff', fontWeight: '800' }}>إنشاء</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function KhatmahCard({
  item,
  colors,
  onPress,
  onLongPress,
}: {
  item: KhatmahRecord;
  colors: any;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const percent = getProgressPercent(item);
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.88}
    >
      <View style={styles.cardTop}>
        <Text style={[styles.badge, { color: item.is_completed ? colors.success : colors.primary }]}>
          {item.is_completed ? 'مكتملة' : `${percent}%`}
        </Text>
        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
          {item.khatmah_name}
        </Text>
      </View>
      <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
        {item.is_completed
          ? 'أتممت الختمة — بارك الله فيك'
          : `صفحة ${item.current_page || 1} • ${getSurahName(item.current_surah_id)} — آية ${item.current_ayah_id}`}
      </Text>
      <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
        الورد: {WIRD_AMOUNT_LABELS[item.wird_amount]}
      </Text>
      <View style={[styles.track, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${Math.max(item.is_completed ? 100 : percent, 3)}%`,
              backgroundColor: item.is_completed ? colors.success : colors.primary,
            },
          ]}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 54,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  backText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  brand: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 3,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 4,
  },
  sub: {
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
  },
  list: { padding: 16, paddingBottom: 120 },
  createBtn: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 14,
  },
  createText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  empty: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 22,
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 17, fontWeight: '800', textAlign: 'right' },
  emptySub: { marginTop: 8, textAlign: 'right', lineHeight: 20, fontSize: 13 },
  sectionLabel: {
    marginTop: 10,
    marginBottom: 8,
    textAlign: 'right',
    fontWeight: '700',
    fontSize: 13,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardTitle: { flex: 1, fontSize: 17, fontWeight: '800', textAlign: 'right' },
  badge: { fontWeight: '800', fontSize: 13 },
  cardMeta: { textAlign: 'right', marginTop: 6, fontSize: 12 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 12 },
  fill: { height: '100%', borderRadius: 4 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 22,
  },
  modalCard: { borderRadius: 20, padding: 18 },
  modalTitle: { fontSize: 20, fontWeight: '800', textAlign: 'right' },
  modalHint: { fontSize: 12, textAlign: 'right', marginTop: 6, marginBottom: 14, lineHeight: 18 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
  },
  fieldLabel: { textAlign: 'right', marginTop: 14, marginBottom: 8, fontSize: 12, fontWeight: '700' },
  wirdRow: { gap: 8 },
  wirdChip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 18,
  },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 16 },
  confirmBtn: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 22 },
});
