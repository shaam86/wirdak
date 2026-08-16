import { useCallback, useMemo, useState } from 'react';
import type { TouchHifzUnit, TouchRevealMode } from '../services/hifzPrefs';
import { tokenizeArabic } from '../utils/quranTokenize';

export type TouchRecitationAyah = {
  numberInSurah: number;
  text: string;
};

export type TouchUnitRef =
  | { kind: 'ayah'; ayahNumber: number; globalIndex: number }
  | { kind: 'word'; ayahNumber: number; wordIndex: number; globalIndex: number };

type Args = {
  ayahs: TouchRecitationAyah[];
  initialEnabled?: boolean;
  initialUnit?: TouchHifzUnit;
  initialRevealMode?: TouchRevealMode;
};

/**
 * حالة التسميع باللمس — معزولة عن شاشة السورة لتقليل إعادة الرسم.
 */
export function useTouchRecitation({
  ayahs,
  initialEnabled = false,
  initialUnit = 'ayah',
  initialRevealMode = 'tap',
}: Args) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [unit, setUnit] = useState<TouchHifzUnit>(initialUnit);
  const [revealMode, setRevealMode] = useState<TouchRevealMode>(initialRevealMode);
  /** وحدات كُشفت نهائياً (وضع النقر) */
  const [tapRevealed, setTapRevealed] = useState(0);
  /** مفتاح الوحدة الممسوكة مؤقتاً: a:3 أو w:3:2 */
  const [heldKey, setHeldKey] = useState<string | null>(null);

  const wordCounts = useMemo(
    () => ayahs.map((a) => tokenizeArabic(a.text).length),
    [ayahs]
  );

  const totalUnits = useMemo(() => {
    if (unit === 'ayah') return ayahs.length;
    return wordCounts.reduce((s, n) => s + n, 0);
  }, [unit, ayahs.length, wordCounts]);

  const resetMask = useCallback(() => {
    setTapRevealed(0);
    setHeldKey(null);
  }, []);

  const enable = useCallback((on: boolean) => {
    setEnabled(on);
    if (on) {
      setTapRevealed(0);
      setHeldKey(null);
    }
  }, []);

  const changeUnit = useCallback((next: TouchHifzUnit) => {
    setUnit(next);
    setTapRevealed(0);
    setHeldKey(null);
  }, []);

  const changeRevealMode = useCallback((next: TouchRevealMode) => {
    setRevealMode(next);
    setTapRevealed(0);
    setHeldKey(null);
  }, []);

  const unitKey = useCallback((ref: TouchUnitRef) => {
    if (ref.kind === 'ayah') return `a:${ref.ayahNumber}`;
    return `w:${ref.ayahNumber}:${ref.wordIndex}`;
  }, []);

  const globalIndexForAyah = useCallback(
    (ayahNumber: number) => Math.max(0, ayahNumber - 1),
    []
  );

  const globalIndexForWord = useCallback(
    (ayahNumber: number, wordIndex: number) => {
      let offset = 0;
      for (let i = 0; i < ayahs.length; i += 1) {
        if (ayahs[i].numberInSurah === ayahNumber) return offset + wordIndex;
        offset += wordCounts[i] ?? 0;
      }
      return offset + wordIndex;
    },
    [ayahs, wordCounts]
  );

  const isPermanentlyRevealed = useCallback(
    (globalIndex: number) => revealMode === 'tap' && globalIndex < tapRevealed,
    [revealMode, tapRevealed]
  );

  const isHeld = useCallback((key: string) => heldKey === key, [heldKey]);

  const isVisible = useCallback(
    (ref: TouchUnitRef) => {
      if (!enabled) return true;
      const key = unitKey(ref);
      if (isHeld(key)) return true;
      return isPermanentlyRevealed(ref.globalIndex);
    },
    [enabled, unitKey, isHeld, isPermanentlyRevealed]
  );

  const onHoldStart = useCallback(
    (ref: TouchUnitRef) => {
      if (!enabled || revealMode !== 'hold') return;
      setHeldKey(unitKey(ref));
    },
    [enabled, revealMode, unitKey]
  );

  const onHoldEnd = useCallback(() => {
    if (revealMode !== 'hold') return;
    setHeldKey(null);
  }, [revealMode]);

  /** نقر متسلسل: يكشف الوحدة التالية عالمياً */
  const onSequentialTap = useCallback(() => {
    if (!enabled || revealMode !== 'tap') return;
    setTapRevealed((n) => Math.min(n + 1, totalUnits));
  }, [enabled, revealMode, totalUnits]);

  const onTapUnit = useCallback(
    (ref: TouchUnitRef) => {
      if (!enabled) return;
      if (revealMode === 'hold') return;
      // يكشف حتى هذه الوحدة إن كانت التالية، أو يتقدّم خطوة واحدة
      setTapRevealed((n) => {
        if (ref.globalIndex === n) return Math.min(n + 1, totalUnits);
        if (ref.globalIndex < n) return n;
        return Math.min(n + 1, totalUnits);
      });
    },
    [enabled, revealMode, totalUnits]
  );

  return {
    enabled,
    unit,
    revealMode,
    tapRevealed,
    totalUnits,
    heldKey,
    wordCounts,
    enable,
    changeUnit,
    changeRevealMode,
    resetMask,
    isVisible,
    onHoldStart,
    onHoldEnd,
    onSequentialTap,
    onTapUnit,
    globalIndexForAyah,
    globalIndexForWord,
    unitKey,
  };
}

export type TouchRecitationApi = ReturnType<typeof useTouchRecitation>;
