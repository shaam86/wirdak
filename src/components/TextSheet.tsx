import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';

type Props = {
  visible: boolean;
  title: string;
  subtitle?: string;
  body?: string;
  loading?: boolean;
  rtl?: boolean;
  onClose: () => void;
};

export function TextSheet({
  visible,
  title,
  subtitle,
  body,
  loading,
  rtl = true,
  onClose,
}: Props) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>إغلاق</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
              {subtitle ? (
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
              ) : null}
            </View>
          </View>

          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text style={{ color: colors.textSecondary, marginTop: 12 }}>جاري التحميل...</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.body}>
              <Text
                style={[
                  styles.text,
                  {
                    color: colors.text,
                    textAlign: rtl ? 'right' : 'left',
                    writingDirection: rtl ? 'rtl' : 'ltr',
                  },
                ]}
              >
                {body || 'لا يوجد محتوى'}
              </Text>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    maxHeight: '78%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'right',
  },
  subtitle: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 2,
  },
  body: {
    padding: 18,
    paddingBottom: 40,
  },
  text: {
    fontSize: 17,
    lineHeight: 30,
  },
  loading: {
    padding: 40,
    alignItems: 'center',
  },
});
