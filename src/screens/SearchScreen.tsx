import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { searchSmart, SearchHit, warmSearchIndex } from '../services/searchEngine';
import { navigationRef } from '../navigation/AppNavigator';
import { useTheme } from '../theme/ThemeContext';
import { toEasternDigits } from '../utils/arabicNumerals';

export function SearchScreen() {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');

  useEffect(() => {
    warmSearchIndex();
  }, []);

  const results = useMemo(() => searchSmart(query, 50), [query]);

  /** يفتح الآية في تبويب الفهرس ويمرّر إليها مباشرة */
  function openQuranAyah(hit: Extract<SearchHit, { kind: 'quran' }>) {
    if (!navigationRef.isReady()) return;

    navigationRef.navigate('Index', {
      screen: 'SurahDetail',
      params: {
        surahNumber: hit.surahNumber,
        surahName: hit.surahName,
        startAyah: hit.ayahNumber,
        highlightAyah: hit.ayahNumber,
        autoPlay: false,
      },
    });
  }

  function openAdhkar(hit: Extract<SearchHit, { kind: 'adhkar' }>) {
    if (!navigationRef.isReady()) return;

    navigationRef.navigate('Adhkar', {
      screen: 'AdhkarDetail',
      params: {
        categoryId: hit.categoryId,
        focusItemId: hit.itemId,
      },
    });
  }

  function openHit(hit: SearchHit) {
    if (hit.kind === 'quran') {
      openQuranAyah(hit);
      return;
    }
    openAdhkar(hit);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="ابحث في القرآن أو الأذكار..."
          placeholderTextColor={colors.textSecondary}
          style={[styles.input, { color: colors.text }]}
          autoFocus
          textAlign="right"
        />
      </View>

      {query.trim().length > 0 && query.trim().length < 2 ? (
        <Text style={[styles.hint, { color: colors.textSecondary }]}>اكتب حرفين على الأقل</Text>
      ) : null}

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          query.trim().length >= 2 ? (
            <Text style={[styles.hint, { color: colors.textSecondary }]}>لا نتائج مطابقة</Text>
          ) : (
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              مثال: الرحمن • استغفر • آية الكرسي
            </Text>
          )
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => openHit(item)}
            activeOpacity={0.75}
          >
            <Text style={[styles.kind, { color: colors.primary }]}>
              {item.kind === 'quran'
                ? `قرآن • ${item.surahName} • آية ${toEasternDigits(item.ayahNumber)}`
                : `أذكار • ${item.categoryTitle}`}
            </Text>
            <Text style={[styles.snippet, { color: colors.text }]} numberOfLines={3}>
              {item.snippet}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 8 },
  searchBox: {
    marginHorizontal: 14,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  input: {
    fontSize: 16,
    paddingVertical: 12,
    fontWeight: '600',
  },
  list: { padding: 14, paddingBottom: 120 },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  kind: { textAlign: 'right', fontWeight: '800', fontSize: 13, marginBottom: 6 },
  snippet: { textAlign: 'right', lineHeight: 24, fontSize: 15 },
  hint: { textAlign: 'center', marginTop: 28, fontSize: 14, paddingHorizontal: 24 },
});
