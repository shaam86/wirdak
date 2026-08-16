import { Share, Platform } from 'react-native';
import { SHARE_FOOTER } from '../config/appStore';

export type SharePayload = {
  /** النص الرئيسي بالتشكيل الكامل */
  text: string;
  /** مصدر اختياري (سورة، فئة أذكار…) */
  source?: string;
  title?: string;
};

/** يبني رسالة المشاركة مع تذييل اسم التطبيق */
export function buildShareMessage({ text, source }: SharePayload): string {
  const body = text.trim();
  const parts = [body];
  if (source?.trim()) parts.push(`— ${source.trim()}`);
  parts.push(SHARE_FOOTER);
  return parts.join('\n\n');
}

/**
 * يفتح نافذة المشاركة الأصلية للهاتف (Native Share Sheet).
 */
export async function smartShare(payload: SharePayload): Promise<boolean> {
  const message = buildShareMessage(payload);
  try {
    const result = await Share.share(
      Platform.OS === 'ios'
        ? { message, title: payload.title ?? 'وردك' }
        : { message, title: payload.title ?? 'وردك' }
    );
    if (result.action === Share.sharedAction) return true;
    return false;
  } catch {
    return false;
  }
}

export async function shareDhikr(opts: {
  text: string;
  categoryTitle?: string;
  translation?: string;
  source?: string;
}): Promise<boolean> {
  const blocks = [opts.text.trim()];
  if (opts.translation?.trim()) blocks.push(opts.translation.trim());
  if (opts.source?.trim()) blocks.push(opts.source.trim());
  return smartShare({
    text: blocks.join('\n\n'),
    source: opts.categoryTitle,
    title: opts.categoryTitle ?? 'ذكر',
  });
}

export async function shareAyah(opts: {
  text: string;
  surahName: string;
  ayahNumber: number;
}): Promise<boolean> {
  return smartShare({
    text: opts.text.trim(),
    source: `سورة ${opts.surahName}، آية ${opts.ayahNumber}`,
    title: `سورة ${opts.surahName}`,
  });
}
