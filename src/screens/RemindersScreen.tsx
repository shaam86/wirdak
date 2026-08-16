import { useCallback, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { IconBadge, IconName } from '../components/Icon';
import { SMART_NOTIFICATIONS } from '../data/smartNotifications';
import {
  DEFAULT_REMINDERS,
  formatHM,
  getReminderSettings,
  ReminderSettings,
  saveReminderSettings,
  TIME_PRESETS,
  TimeHM,
} from '../services/reminders';
import {
  DEFAULT_SMART_NOTIFICATIONS,
  getSmartNotificationSettings,
  INTERVAL_OPTIONS,
  IntervalHours,
  saveSmartNotificationSettings,
  SmartNotificationSettings,
} from '../services/smartNotifications';
import type { FeatureTintKey } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { control, radius, space } from '../theme/tokens';

type ReminderKey = keyof ReminderSettings;
type SmartKey = keyof SmartNotificationSettings;

const CLASSIC_ITEMS: {
  key: ReminderKey;
  title: string;
  subtitle: string;
  icon: IconName;
  tint: FeatureTintKey;
}[] = [
  {
    key: 'morningAdhkar',
    title: 'منبّه أذكار الصباح',
    subtitle: 'تذكير يومي',
    icon: 'sun',
    tint: 'adhkar',
  },
  {
    key: 'eveningAdhkar',
    title: 'منبّه أذكار المساء',
    subtitle: 'تذكير يومي',
    icon: 'moon',
    tint: 'qibla',
  },
  {
    key: 'kahf',
    title: 'منبّه سورة الكهف',
    subtitle: 'كل يوم جمعة',
    icon: 'book',
    tint: 'quran',
  },
  {
    key: 'mulk',
    title: 'منبّه سورة الملك',
    subtitle: 'تذكير يومي',
    icon: 'moon',
    tint: 'reminders',
  },
  {
    key: 'baqarah',
    title: 'منبّه سورة البقرة',
    subtitle: 'تذكير يومي',
    icon: 'library',
    tint: 'khatmah',
  },
];

const SMART_ICON: Record<string, { icon: IconName; tint: FeatureTintKey }> = {
  salawat: { icon: 'heart', tint: 'reminders' },
  istighfar: { icon: 'leaf', tint: 'khatmah' },
  friday_response_hour: { icon: 'time', tint: 'badges' },
  kahf_friday_morning: { icon: 'book', tint: 'quran' },
  kahf_friday_night: { icon: 'moon', tint: 'quran' },
  last_third_night: { icon: 'moon', tint: 'tasbih' },
  between_adhan_iqama: { icon: 'bell', tint: 'prayer' },
  fast_monday_thursday: { icon: 'sunny', tint: 'adhkar' },
  white_days: { icon: 'star', tint: 'badges' },
  default: { icon: 'bell', tint: 'reminders' },
};

const TRIGGER_LABEL: Record<string, string> = {
  periodic: 'دوري',
  scheduled: 'وقت محدد',
  occasion: 'مناسبة',
};

export function RemindersScreen() {
  const { colors } = useTheme();
  const [settings, setSettings] = useState<ReminderSettings>(DEFAULT_REMINDERS);
  const [smart, setSmart] = useState<SmartNotificationSettings>(DEFAULT_SMART_NOTIFICATIONS);
  const [editing, setEditing] = useState<ReminderKey | null>(null);
  const [editingInterval, setEditingInterval] = useState<'salawat' | 'istighfar' | null>(null);

  useFocusEffect(
    useCallback(() => {
      getReminderSettings().then(setSettings);
      getSmartNotificationSettings().then(setSmart);
    }, [])
  );

  async function updateClassic(next: ReminderSettings) {
    setSettings(next);
    return saveReminderSettings(next);
  }

  async function updateSmart(next: SmartNotificationSettings) {
    setSmart(next);
    return saveSmartNotificationSettings(next);
  }

  async function toggleClassic(key: ReminderKey, enabled: boolean) {
    const next = { ...settings, [key]: { ...settings[key], enabled } };
    const count = await updateClassic(next);
    if (enabled) Alert.alert('تم التفعيل', `تم جدولة المنبّهات (${count}).`);
  }

  async function setTime(key: ReminderKey, time: TimeHM) {
    await updateClassic({ ...settings, [key]: { ...settings[key], time } });
    setEditing(null);
  }

  async function toggleSmart(key: SmartKey, enabled: boolean) {
    const current = smart[key];
    const next = {
      ...smart,
      [key]: { ...current, enabled },
    } as SmartNotificationSettings;
    const count = await updateSmart(next);
    if (enabled) {
      Alert.alert('تم التفعيل', `تم جدولة التنبيهات الذكية (${count}).`);
    }
  }

  async function setIntervalHours(key: 'salawat' | 'istighfar', hours: IntervalHours) {
    const next = {
      ...smart,
      [key]: { ...smart[key], intervalHours: hours },
    };
    await updateSmart(next);
    setEditingInterval(null);
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.intro, { color: colors.textSecondary }]}>
        فعّل المنبّهات والتنبيهات الذكية. تعمل حتى لو أغلقت التطبيق. لبعضها (ثلث الليل، ساعة
        الجمعة، بين الأذان والإقامة) يُفضّل فتح شاشة الصلاة مرة لحفظ موقعك.
      </Text>

      <Text style={[styles.section, { color: colors.primary }]}>منبّهات أساسية</Text>
      {CLASSIC_ITEMS.map((item) => {
        const value = settings[item.key];
        const open = editing === item.key;
        return (
          <View
            key={item.key}
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={styles.row}>
              <Switch
                value={value.enabled}
                onValueChange={(v) => toggleClassic(item.key, v)}
                trackColor={{ true: colors.primary }}
              />
              <View style={styles.info}>
                <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.sub, { color: colors.textSecondary }]}>{item.subtitle}</Text>
              </View>
              <IconBadge
                name={item.icon}
                tint={item.tint}
                size={control.badgeMd}
                iconSize={control.iconMd}
              />
            </View>

            <TouchableOpacity
              style={[styles.timeBtn, { backgroundColor: colors.sand }]}
              onPress={() => setEditing(open ? null : item.key)}
            >
              <Text style={{ color: colors.ink, fontWeight: '700' }}>
                الوقت: {formatHM(value.time)} {open ? '▲' : '▼'}
              </Text>
            </TouchableOpacity>

            {open ? (
              <View style={styles.presets}>
                {TIME_PRESETS.map((t) => {
                  const active = t.hour === value.time.hour && t.minute === value.time.minute;
                  return (
                    <TouchableOpacity
                      key={`${t.hour}-${t.minute}`}
                      style={[
                        styles.preset,
                        {
                          backgroundColor: active ? colors.primary : colors.background,
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={() => setTime(item.key, t)}
                    >
                      <Text style={{ color: active ? '#fff' : colors.text, fontWeight: '700' }}>
                        {formatHM(t)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}
          </View>
        );
      })}

      <Text style={[styles.section, { color: colors.primary, marginTop: 8 }]}>
        تنبيهات ذكية
      </Text>
      <Text style={[styles.intro, { color: colors.textSecondary }]}>
        تذكير بالذكر، الجمعة، القيام، الدعاء بين الأذان والإقامة، وصيام النوافل.
      </Text>

      {SMART_NOTIFICATIONS.map((item) => {
        const key = item.id as SmartKey;
        const value = smart[key];
        if (!value) return null;
        const isPeriodic = item.trigger_type === 'periodic';
        const intervalKey = key === 'salawat' || key === 'istighfar' ? key : null;
        const openInterval = editingInterval === intervalKey;

        return (
          <View
            key={item.id}
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={styles.row}>
              <Switch
                value={value.enabled}
                onValueChange={(v) => toggleSmart(key, v)}
                trackColor={{ true: colors.primary }}
              />
              <View style={styles.info}>
                <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.sub, { color: colors.textSecondary }]}>
                  {TRIGGER_LABEL[item.trigger_type]} • {item.schedule}
                </Text>
              </View>
              <IconBadge
                name={(SMART_ICON[item.id] ?? SMART_ICON.default).icon}
                tint={(SMART_ICON[item.id] ?? SMART_ICON.default).tint}
                size={control.badgeMd}
                iconSize={control.iconMd}
              />
            </View>

            <Text style={[styles.bodyPreview, { color: colors.textSecondary }]} numberOfLines={3}>
              {item.body}
            </Text>

            {isPeriodic && intervalKey ? (
              <>
                <TouchableOpacity
                  style={[styles.timeBtn, { backgroundColor: colors.sand }]}
                  onPress={() => setEditingInterval(openInterval ? null : intervalKey)}
                >
                  <Text style={{ color: colors.ink, fontWeight: '700' }}>
                    التكرار:{' '}
                    {INTERVAL_OPTIONS.find((o) => o.hours === smart[intervalKey].intervalHours)
                      ?.label ?? '—'}{' '}
                    {openInterval ? '▲' : '▼'}
                  </Text>
                </TouchableOpacity>
                {openInterval ? (
                  <View style={styles.presets}>
                    {INTERVAL_OPTIONS.map((opt) => {
                      const active = smart[intervalKey].intervalHours === opt.hours;
                      return (
                        <TouchableOpacity
                          key={opt.hours}
                          style={[
                            styles.preset,
                            {
                              backgroundColor: active ? colors.primary : colors.background,
                              borderColor: colors.border,
                            },
                          ]}
                          onPress={() => setIntervalHours(intervalKey, opt.hours)}
                        >
                          <Text style={{ color: active ? '#fff' : colors.text, fontWeight: '700' }}>
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : null}
              </>
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: control.screenInset, paddingBottom: 40 },
  intro: {
    textAlign: 'right',
    marginBottom: 14,
    lineHeight: 20,
    fontSize: 13,
  },
  section: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'right',
    marginBottom: 10,
  },
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: space.md,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: control.touch,
  },
  info: { flex: 1 },
  title: { fontSize: 16, fontWeight: '800', textAlign: 'right' },
  sub: { fontSize: 12, textAlign: 'right', marginTop: 3, lineHeight: 18 },
  bodyPreview: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 22,
    textAlign: 'right',
  },
  timeBtn: {
    marginTop: 12,
    borderRadius: radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
    minHeight: 40,
    justifyContent: 'center',
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    justifyContent: 'flex-end',
  },
  preset: {
    paddingHorizontal: control.chipPadH,
    paddingVertical: control.chipPadV,
    borderRadius: radius.pill,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
  },
});
