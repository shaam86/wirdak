import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Bookmark, getBookmarks, removeBookmark } from '../services/bookmarks';
import { MoreMenuNavigation } from '../navigation/types';
import { useTheme } from '../theme/ThemeContext';

type Props = {
  navigation: MoreMenuNavigation;
};

export function BookmarksScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const [items, setItems] = useState<Bookmark[]>([]);

  useFocusEffect(
    useCallback(() => {
      getBookmarks().then(setItems);
    }, [])
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {items.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textSecondary }]}>
          لا توجد علامات مرجعية بعد. اضغط على آية واختر «علامة مرجعية».
        </Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TouchableOpacity
                onPress={() =>
                  navigation.getParent()?.navigate('Index', {
                    screen: 'SurahDetail',
                    params: {
                      surahNumber: item.surahNumber,
                      surahName: item.surahName,
                      startAyah: item.ayahNumber,
                      highlightAyah: item.ayahNumber,
                    },
                  })
                }
              >
                <Text style={[styles.meta, { color: colors.primary }]}>
                  {item.surahName} — آية {item.ayahNumber}
                </Text>
                <Text style={[styles.text, { color: colors.text }]}>{item.text}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => setItems(await removeBookmark(item.id))}
                style={styles.remove}
              >
                <Text style={{ color: colors.error, fontWeight: '700' }}>حذف</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: {
    textAlign: 'center',
    marginTop: 40,
    paddingHorizontal: 24,
    lineHeight: 22,
  },
  list: { padding: 16, paddingBottom: 40 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  meta: { fontWeight: '800', textAlign: 'right', marginBottom: 8 },
  text: {
    fontSize: 18,
    lineHeight: 32,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  remove: { alignSelf: 'flex-start', marginTop: 10 },
});
