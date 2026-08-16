import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

type Props = {
  title: string;
  subtitle?: string;
};

export function ScreenHeader({ title, subtitle }: Props) {
  const { colors, fonts, scale } = useTheme();
  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.title,
          { color: colors.text, fontFamily: fonts.uiExtra, fontSize: scale(28) },
        ]}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={[
            styles.subtitle,
            { color: colors.textSecondary, fontFamily: fonts.uiRegular, fontSize: scale(14) },
          ]}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    fontWeight: '800',
    textAlign: 'right',
  },
  subtitle: {
    marginTop: 4,
    textAlign: 'right',
  },
});
