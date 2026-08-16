import { StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

type Props = {
  title: string;
  subtitle?: string;
  icon: string;
  onPress: () => void;
  style?: ViewStyle;
};

export function FeatureCard({ title, subtitle, icon, onPress, style }: Props) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 20,
    flex: 1,
    minWidth: '45%',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  icon: {
    fontSize: 32,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'right',
  },
});
