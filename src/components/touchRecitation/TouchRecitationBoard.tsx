import { forwardRef, useCallback, type ReactElement, type RefObject } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ListRenderItem,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TouchRecitationAyahRow } from './TouchRecitationAyahRow';
import type { TouchRecitationApi } from '../../hooks/useTouchRecitation';
import { useTheme } from '../../theme/ThemeContext';
import { radius, softShadow } from '../../theme/tokens';

type AyahLike = { number: number; numberInSurah: number; text: string };

type Props = {
  ayahs: AyahLike[];
  api: TouchRecitationApi;
  fontSize: number;
  fontFamily?: string;
  activeAyah?: number | null;
  onOpenMenu?: (ayah: AyahLike) => void;
  listHeader?: ReactElement | null;
  contentBackground?: string;
};

/**
 * قائمة آيات محسّنة للتسميع باللمس + زر عائم لإعادة الإخفاء.
 */
export const TouchRecitationBoard = forwardRef<FlatList<AyahLike>, Props>(
  function TouchRecitationBoard(
    {
      ayahs,
      api,
      fontSize,
      fontFamily,
      activeAyah,
      onOpenMenu,
      listHeader,
      contentBackground,
    },
    ref
  ) {
    const { colors, isDark, fonts } = useTheme();
    const insets = useSafeAreaInsets();

    const renderItem: ListRenderItem<AyahLike> = useCallback(
      ({ item }) => (
        <TouchRecitationAyahRow
          ayah={item}
          api={api}
          fontSize={fontSize}
          fontFamily={fontFamily}
          active={activeAyah === item.numberInSurah}
          onOpenMenu={() => onOpenMenu?.(item)}
        />
      ),
      [api, fontSize, fontFamily, activeAyah, onOpenMenu]
    );

    return (
      <View style={styles.root}>
        <FlatList
          ref={ref}
          data={ayahs}
          keyExtractor={(a) => String(a.number)}
          renderItem={renderItem}
          ListHeaderComponent={listHeader}
          contentContainerStyle={[
            styles.list,
            { backgroundColor: contentBackground ?? (isDark ? colors.background : '#F7F1E6') },
          ]}
          showsVerticalScrollIndicator={false}
          initialNumToRender={12}
          maxToRenderPerBatch={10}
          windowSize={7}
          removeClippedSubviews
          extraData={{
            enabled: api.enabled,
            unit: api.unit,
            revealMode: api.revealMode,
            tapRevealed: api.tapRevealed,
            heldKey: api.heldKey,
            activeAyah,
          }}
          onScrollToIndexFailed={(info) => {
            setTimeout(() => {
              (ref as RefObject<FlatList<AyahLike> | null>)?.current?.scrollToIndex({
                index: info.index,
                animated: true,
                viewPosition: 0.25,
              });
            }, 350);
          }}
        />

        {api.enabled && api.revealMode === 'tap' ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="إعادة إخفاء الكل"
            onPress={api.resetMask}
            style={[
              styles.fab,
              {
                backgroundColor: colors.primary,
                bottom: Math.max(insets.bottom, 12) + 12,
              },
              softShadow(isDark),
            ]}
          >
            <Text style={[styles.fabText, { fontFamily: fonts.uiBold }]}>إعادة إخفاء</Text>
          </TouchableOpacity>
        ) : null}

        {api.enabled && api.revealMode === 'tap' ? (
          <TouchableOpacity
            accessibilityRole="button"
            onPress={api.onSequentialTap}
            style={[
              styles.fabSecondary,
              {
                backgroundColor: colors.accent,
                bottom: Math.max(insets.bottom, 12) + 68,
              },
              softShadow(isDark),
            ]}
          >
            <Text style={[styles.fabText, { fontFamily: fonts.uiBold }]}>كشف التالي</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { paddingBottom: 120 },
  fab: {
    position: 'absolute',
    left: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radius.xl,
    minHeight: 48,
    justifyContent: 'center',
  },
  fabSecondary: {
    position: 'absolute',
    left: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radius.xl,
    minHeight: 48,
    justifyContent: 'center',
  },
  fabText: { color: '#fff', fontSize: 13 },
});
