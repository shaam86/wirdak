import { getActivityDays } from './activityStore';
import { getTasbihRecord } from './tasbihStore';
import { smartShare } from './smartShare';
import { formatHijri } from './hijri';

export type WeeklyReport = {
  weekLabel: string;
  hijriLabel: string;
  activeDays: number;
  adhkarCount: number;
  tasbihCount: number;
  quranDays: number;
  quranMinutes: number;
  streakHint: string;
};

export async function buildWeeklyReport(): Promise<WeeklyReport> {
  const days = await getActivityDays(7);
  const tasbih = await getTasbihRecord();
  const activeDays = days.filter((d) => d.adhkar || d.quran || d.tasbih || d.wird).length;
  const adhkarCount = days.reduce((s, d) => s + (d.adhkar_count || 0), 0);
  const tasbihCount = days.reduce((s, d) => s + (d.tasbih_count || 0), 0);
  const quranDays = days.filter((d) => d.quran).length;
  const quranMinutes = days.reduce((s, d) => s + ((d as any).quran_minutes || 0), 0);

  return {
    weekLabel: 'آخر 7 أيام',
    hijriLabel: formatHijri(),
    activeDays,
    adhkarCount,
    tasbihCount,
    quranDays,
    quranMinutes,
    streakHint: `أيام نشطة: ${activeDays}/7 • تسبيح تراكمي: ${tasbih.lifetime_total}`,
  };
}

export function formatWeeklyReportMessage(r: WeeklyReport): string {
  return [
    '📊 تقرير وردك الأسبوعي',
    `📅 ${r.weekLabel} • ${r.hijriLabel}`,
    `✅ أيام نشطة: ${r.activeDays}/7`,
    `📿 أذكار: ${r.adhkarCount}`,
    `🟢 تسبيح (خلال الأسبوع): ${r.tasbihCount}`,
    `📖 أيام قرآن: ${r.quranDays}${r.quranMinutes ? ` • ≈ ${r.quranMinutes} دقيقة` : ''}`,
    r.streakHint,
  ].join('\n');
}

export async function shareWeeklyReport(): Promise<boolean> {
  const report = await buildWeeklyReport();
  return smartShare({
    text: formatWeeklyReportMessage(report),
    title: 'تقرير وردك الأسبوعي',
  });
}
