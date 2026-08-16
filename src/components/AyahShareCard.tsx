import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../theme/ThemeContext';
import { radius, space } from '../theme/tokens';
import { shareAyah } from '../services/smartShare';

type Props = {
  visible: boolean;
  surahName: string;
  ayahNumber: number;
  text: string;
  onClose: () => void;
};

/**
 * بطاقة مشاركة آية — صورة على الأجهزة الأصلية، ونص جميل كاحتياطي.
 */
export function AyahShareCard({ visible, surahName, ayahNumber, text, onClose }: Props) {
  const { colors, fonts } = useTheme();
  const cardRef = useRef<View>(null);
  const [busy, setBusy] = useState(false);

  async function onShareImage() {
    setBusy(true);
    try {
      if (Platform.OS === 'web' || !cardRef.current) {
        await shareAyah({ surahName, ayahNumber, text });
        onClose();
        return;
      }
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      const can = await Sharing.isAvailableAsync();
      if (can) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'مشاركة آية' });
      } else {
        await shareAyah({ surahName, ayahNumber, text });
      }
      onClose();
    } catch {
      await shareAyah({ surahName, ayahNumber, text });
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View
          ref={cardRef}
          collapsable={false}
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.accent }]}
        >
          <Text style={[styles.brand, { color: colors.accent, fontFamily: fonts.uiBold }]}>وردك</Text>
          <Text style={[styles.ayah, { color: colors.text, fontFamily: fonts.quran }]}>{text}</Text>
          <Text style={[styles.meta, { color: colors.textSecondary, fontFamily: fonts.ui }]}>
            سورة {surahName} — آية {ayahNumber}
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary }]}
            onPress={onShareImage}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>مشاركة كبطاقة</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btnOutline, { borderColor: colors.border }]} onPress={onClose}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>إغلاق</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    borderRadius: radius.xl,
    borderWidth: 2,
    padding: space.xl,
    minHeight: 220,
  },
  brand: { textAlign: 'center', fontSize: 14, marginBottom: 16, letterSpacing: 2 },
  ayah: { fontSize: 24, lineHeight: 44, textAlign: 'center' },
  meta: { textAlign: 'center', marginTop: 18, fontSize: 13 },
  actions: { marginTop: 16, gap: 10 },
  btn: {
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  btnOutline: {
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
});
