/**
 * توافق خلفي — المنطق الجديد في khatmahStore.ts
 * فهرس القراءة منفصل تماماً عن جدول الختمات المتعددة.
 */
export {
  completeDailyWird,
  completeMushafPage,
  createKhatmah,
  getActiveKhatmahSummary,
  getKhatmahById,
  getLastRead,
  getPositionLabel,
  getProgressPercent,
  listKhatmahs,
  saveIndexReadingPosition,
  saveLastRead,
  updateKhatmahPosition,
  type KhatmahRecord,
  type LastRead,
  type WirdAmount,
} from './khatmahStore';
