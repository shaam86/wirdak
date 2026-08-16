import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Reciter, reciters } from '../data/reciters';
import { useTheme } from '../theme/ThemeContext';

type Props = {
  visible: boolean;
  selectedId: string;
  onClose: () => void;
  onSelect: (reciter: Reciter) => void;
};

export function ReciterPickerModal({ visible, selectedId, onClose, onSelect }: Props) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surface }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[styles.title, { color: colors.text }]}>اختر القارئ</Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]}>
            تتغير التلاوة فوراً مع الحفاظ على موضع التشغيل إن أمكن
          </Text>

          <FlatList
            data={reciters}
            keyExtractor={(item) => item.reciter_id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const selected = item.reciter_id === selectedId;
              return (
                <TouchableOpacity
                  style={[
                    styles.row,
                    {
                      backgroundColor: selected ? colors.primary + '18' : colors.background,
                      borderColor: selected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => onSelect(item)}
                  activeOpacity={0.85}
                >
                  <View style={styles.rowText}>
                    <Text style={[styles.name, { color: colors.text }]}>{item.reciter_name}</Text>
                    <Text style={[styles.meta, { color: colors.textSecondary }]}>
                      {item.rewayat} • {item.nameEn}
                    </Text>
                  </View>
                  {selected ? (
                    <Text style={[styles.check, { color: colors.primary }]}>✓</Text>
                  ) : null}
                </TouchableOpacity>
              );
            }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '78%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 10,
    paddingBottom: 24,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'right',
    paddingHorizontal: 18,
  },
  sub: {
    fontSize: 13,
    textAlign: 'right',
    paddingHorizontal: 18,
    marginTop: 4,
    marginBottom: 10,
    lineHeight: 20,
  },
  list: { paddingHorizontal: 14, paddingBottom: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  rowText: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', textAlign: 'right' },
  meta: { fontSize: 12, textAlign: 'right', marginTop: 4 },
  check: { fontSize: 20, fontWeight: '800', marginLeft: 8 },
});
