import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { mushaf } from '../theme/mushaf';
import { toEasternDigits } from '../utils/arabicNumerals';

type Props = {
  visible: boolean;
  ayahNumber: number;
  onClose: () => void;
  onTafsir: () => void;
  onTranslation: () => void;
  onListen: () => void;
  onBookmark: () => void;
  onShare: () => void;
};

const ACTIONS = [
  { key: 'tafsir', label: 'تفسير ابن كثير', icon: '📜', action: 'onTafsir' as const },
  { key: 'translation', label: 'الترجمة', icon: '🌐', action: 'onTranslation' as const },
  { key: 'listen', label: 'الاستماع من الآية', icon: '🔊', action: 'onListen' as const },
  { key: 'bookmark', label: 'علامة مرجعية', icon: '🔖', action: 'onBookmark' as const },
  { key: 'share', label: 'مشاركة', icon: '📤', action: 'onShare' as const },
];

export function AyahActionMenu({
  visible,
  ayahNumber,
  onClose,
  onTafsir,
  onTranslation,
  onListen,
  onBookmark,
  onShare,
}: Props) {
  const handlers = { onTafsir, onTranslation, onListen, onBookmark, onShare };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <View style={styles.handle} />
          <Text style={styles.title}>الآية {toEasternDigits(ayahNumber)}</Text>
          <Text style={styles.sub}>اختر ما تريد فعله بهذه الآية</Text>
          {ACTIONS.map((item, index) => (
            <TouchableOpacity
              key={item.key}
              style={[styles.row, index === ACTIONS.length - 1 && styles.rowLast]}
              onPress={() => handlers[item.action]()}
              activeOpacity={0.8}
            >
              <Text style={styles.icon}>{item.icon}</Text>
              <Text style={styles.label}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(40, 28, 16, 0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FBF6EC',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 2,
    borderColor: mushaf.goldLight,
    paddingBottom: 28,
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: mushaf.goldLight,
    marginBottom: 10,
  },
  title: {
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 18,
    color: mushaf.goldDark,
  },
  sub: {
    textAlign: 'center',
    fontSize: 12,
    color: mushaf.muted,
    marginTop: 4,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: mushaf.goldSoft,
    gap: 12,
  },
  rowLast: { borderBottomWidth: 0 },
  icon: { fontSize: 18, width: 28, textAlign: 'center' },
  label: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
    color: mushaf.ink,
  },
});
