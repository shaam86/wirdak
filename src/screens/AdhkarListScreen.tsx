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
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, IconBadge } from '../components/Icon';
import { adhkarCategories } from '../data/adhkar';
import { useI18n } from '../i18n/LanguageContext';
import { AdhkarListNavigation } from '../navigation/types';
import { getActivityDays } from '../services/activityStore';
import { addCustomDhikr, listCustomAdhkar } from '../services/customAdhkar';
import { refreshCustomAdhkarSearchCache } from '../services/searchEngine';
import type { FeatureTintKey } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { control, radius, softShadow, space } from '../theme/tokens';
import { toEasternDigits } from '../utils/arabicNumerals';

type Props = {
  navigation: AdhkarListNavigation;
};

const CATEGORY_META: Record<
  string,
  {
    icon:
      | 'sun'
      | 'moon'
      | 'cloud'
      | 'home'
      | 'heart'
      | 'book'
      | 'compass'
      | 'shield'
      | 'map'
      | 'feather';
    tint: FeatureTintKey;
  }
> = {
  morning: { icon: 'sun', tint: 'adhkar' },
  evening: { icon: 'moon', tint: 'qibla' },
  sleep: { icon: 'cloud', tint: 'search' },
  wake: { icon: 'sun', tint: 'badges' },
  'after-prayer': { icon: 'heart', tint: 'reminders' },
  mosque: { icon: 'home', tint: 'prayer' },
  quranic: { icon: 'book', tint: 'quran' },
  mathur: { icon: 'feather', tint: 'khatmah' },
  travel: { icon: 'map', tint: 'search' },
  ruqyah: { icon: 'shield', tint: 'tasbih' },
  illness: { icon: 'heart', tint: 'reminders' },
  rain: { icon: 'cloud', tint: 'qibla' },
  'ruqyah-session': { icon: 'shield', tint: 'tasbih' },
  food: { icon: 'heart', tint: 'badges' },
  toilet: { icon: 'home', tint: 'search' },
  clothing: { icon: 'feather', tint: 'khatmah' },
  custom: { icon: 'feather', tint: 'adhkar' },
};

export function AdhkarListScreen({ navigation }: Props) {
  const { colors, isDark, fonts } = useTheme();
  const { t, textAlign } = useI18n();
  const insets = useSafeAreaInsets();
  const [customCount, setCustomCount] = useState(0);
  const [weekAdhkar, setWeekAdhkar] = useState(0);
  const [monthAdhkar, setMonthAdhkar] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [draftCount, setDraftCount] = useState('1');

  useFocusEffect(
    useCallback(() => {
      listCustomAdhkar().then((rows) => setCustomCount(rows.length));
      getActivityDays(30).then((days) => {
        const week = days.slice(-7).reduce((s, d) => s + (d.adhkar_count || 0), 0);
        const month = days.reduce((s, d) => s + (d.adhkar_count || 0), 0);
        setWeekAdhkar(week);
        setMonthAdhkar(month);
      });
    }, [])
  );

  async function saveCustom() {
    const text = draftText.trim();
    if (!text) {
      Alert.alert(t('adhkar.alertTitle'), t('adhkar.alertNeedText'));
      return;
    }
    const count = Math.max(1, Number(draftCount) || 1);
    await addCustomDhikr({ text, count });
    setDraftText('');
    setDraftCount('1');
    setShowAdd(false);
    const rows = await listCustomAdhkar();
    setCustomCount(rows.length);
    await refreshCustomAdhkarSearchCache().catch(() => undefined);
    navigation.navigate('AdhkarDetail', { categoryId: 'custom' });
  }

  const categories = [
    ...adhkarCategories,
    {
      id: 'custom',
      title: t('adhkar.customTitleEn'),
      titleAr: t('adhkar.customTitle'),
      icon: '✏️',
      color: colors.primary,
      items: Array.from({ length: customCount }),
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={
          isDark
            ? [colors.primaryDark, colors.glow, colors.background]
            : [colors.primaryDark, colors.primary, colors.primaryLight]
        }
        style={[styles.hero, { paddingTop: Math.max(insets.top, 12) + 12 }]}
      >
        <Text style={[styles.title, { fontFamily: fonts.uiExtra, textAlign }]}>
          {t('adhkar.title')}
        </Text>
        <Text style={[styles.subtitle, { fontFamily: fonts.uiRegular, textAlign }]}>
          {t('adhkar.subtitle')}
        </Text>
        <View style={styles.statsRow}>
          <Text style={styles.statChip}>
            {t('adhkar.weekStat', { n: toEasternDigits(weekAdhkar) })}
          </Text>
          <Text style={styles.statChip}>
            {t('adhkar.monthStat', { n: toEasternDigits(monthAdhkar) })}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => setShowAdd(true)}
          style={[
            styles.card,
            {
              backgroundColor: colors.primary + '18',
              borderColor: colors.primary,
            },
          ]}
        >
          <IconBadge name="feather" tint="adhkar" size={control.badgeLg} iconSize={control.iconXl} />
          <View style={styles.body}>
            <Text style={[styles.cardTitle, { color: colors.text, fontFamily: fonts.uiBold }]}>
              {t('adhkar.addCustom')}
            </Text>
            <Text style={[styles.cardSub, { color: colors.textSecondary, fontFamily: fonts.uiRegular }]}>
              {t('adhkar.addCustomSub')}
            </Text>
          </View>
          <Icon name="chevron-left" size={control.iconMd} color={colors.primary} filled={false} />
        </TouchableOpacity>

        {categories.map((item) => {
          const meta = CATEGORY_META[item.id] ?? { icon: 'heart' as const, tint: 'adhkar' as const };
          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.88}
              onPress={() => navigation.navigate('AdhkarDetail', { categoryId: item.id })}
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
                softShadow(isDark),
              ]}
            >
              <IconBadge
                name={meta.icon}
                tint={meta.tint}
                size={control.badgeLg}
                iconSize={control.iconXl}
              />
              <View style={styles.body}>
                <Text style={[styles.cardTitle, { color: colors.text, fontFamily: fonts.uiBold }]}>
                  {item.titleAr}
                </Text>
                <Text
                  style={[styles.cardSub, { color: colors.textSecondary, fontFamily: fonts.uiRegular }]}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                <Text style={[styles.count, { color: colors.primary, fontFamily: fonts.ui }]}>
                  {t('adhkar.countLabel', { n: toEasternDigits(item.items.length) })}
                </Text>
              </View>
              <Icon name="chevron-left" size={control.iconMd} color={colors.primary} filled={false} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Modal visible={showAdd} transparent animationType="fade" onRequestClose={() => setShowAdd(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={{ color: colors.text, fontFamily: fonts.uiBold, textAlign, fontSize: 18 }}>
              {t('adhkar.newDhikr')}
            </Text>
            <TextInput
              value={draftText}
              onChangeText={setDraftText}
              placeholder={t('adhkar.textPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              multiline
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                  textAlign,
                },
              ]}
            />
            <TextInput
              value={draftCount}
              onChangeText={setDraftCount}
              keyboardType="number-pad"
              placeholder={t('adhkar.countPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                  textAlign,
                  minHeight: 48,
                },
              ]}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowAdd(false)} style={styles.modalBtn}>
                <Text style={{ color: colors.textSecondary }}>{t('adhkar.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={saveCustom}
                style={[styles.modalBtn, { backgroundColor: colors.primary, borderRadius: radius.md }]}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>{t('adhkar.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: {
    paddingBottom: 28,
    paddingHorizontal: space.lg,
  },
  title: { color: '#fff', fontSize: 30, marginBottom: 6 },
  subtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 14 },
  statsRow: { flexDirection: 'row-reverse', gap: 8, marginTop: 14 },
  statChip: {
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
  },
  list: { padding: space.md, gap: 10, paddingBottom: 40 },
  card: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  body: { flex: 1 },
  cardTitle: { fontSize: 16, textAlign: 'right' },
  cardSub: { fontSize: 12, marginTop: 2, textAlign: 'right' },
  count: { fontSize: 12, marginTop: 4, textAlign: 'right' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: space.lg,
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 12,
    minHeight: 88,
    fontSize: 16,
  },
  modalActions: { flexDirection: 'row-reverse', justifyContent: 'space-between', gap: 12 },
  modalBtn: { paddingVertical: 12, paddingHorizontal: 18 },
});
