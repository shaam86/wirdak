import { Coordinates, Qibla } from 'adhan';

const MECCA_LAT = 21.422487;
const MECCA_LNG = 39.826206;

/** Qibla bearing in degrees from true north (0–360), using adhan's formula. */
export function calculateQiblaDirection(lat: number, lng: number): number {
  const bearing = Qibla(new Coordinates(lat, lng));
  return normalizeDegrees(bearing);
}

export function getDistanceToMecca(lat: number, lng: number): number {
  const R = 6371.0088;
  const dLat = ((MECCA_LAT - lat) * Math.PI) / 180;
  const dLng = ((MECCA_LNG - lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat * Math.PI) / 180) *
      Math.cos((MECCA_LAT * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Shortest signed angle from device heading to qibla (-180..180). */
export function angleToQibla(qiblaBearing: number, deviceHeading: number): number {
  return shortestAngleDelta(deviceHeading, qiblaBearing);
}

/** أقصر فرق زاوي مع اتجاه الدوران (-180..180) */
export function shortestAngleDelta(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180;
}

/**
 * تنعيم تكيّفي: يستجيب بسرعة عند الدوران الكبير، ويثبّت الارتعاش عند الثبات.
 * alphaBase ≈ 0.18–0.35 حسب دقة البوصلة.
 */
export function adaptiveSmoothHeading(
  previous: number,
  next: number,
  options?: { accuracyDeg?: number | null; alpha?: number }
): number {
  const acc = options?.accuracyDeg;
  let alpha = options?.alpha ?? 0.24;
  if (acc != null && acc >= 0) {
    if (acc <= 12) alpha = 0.32;
    else if (acc <= 25) alpha = 0.24;
    else if (acc <= 40) alpha = 0.16;
    else alpha = 0.1;
  }

  const delta = shortestAngleDelta(previous, next);
  const abs = Math.abs(delta);
  // تسريع الاستجابة عند دوران واضح، وتثقيل عند الاهتزاز الصغير
  if (abs > 25) alpha = Math.min(0.55, alpha + 0.22);
  else if (abs > 10) alpha = Math.min(0.42, alpha + 0.1);
  else if (abs < 1.2) alpha = Math.max(0.06, alpha * 0.45);

  return normalizeDegrees(previous + delta * alpha);
}

/** @deprecated استخدم adaptiveSmoothHeading */
export function smoothHeading(previous: number, next: number, alpha = 0.22): number {
  return adaptiveSmoothHeading(previous, next, { alpha });
}

export type CompassAccuracyLevel = 'high' | 'medium' | 'low' | 'unreliable' | 'unknown';

/**
 * تصنيف دقة البوصلة من expo-location heading.accuracy (درجات).
 * قيم سالبة = غير متاحة.
 */
export function classifyCompassAccuracy(accuracy: number | null | undefined): CompassAccuracyLevel {
  if (accuracy == null || accuracy < 0) return 'unknown';
  if (accuracy <= 12) return 'high';
  if (accuracy <= 25) return 'medium';
  if (accuracy <= 40) return 'low';
  return 'unreliable';
}

export function normalizeDegrees(value: number): number {
  return ((value % 360) + 360) % 360;
}

/** عتبة المحاذاة حسب دقة البوصلة */
export function alignmentTolerance(accuracy: number | null | undefined): number {
  const level = classifyCompassAccuracy(accuracy);
  if (level === 'high') return 4;
  if (level === 'medium') return 6;
  if (level === 'low') return 10;
  return 12;
}

/** شدة الحقل المغناطيسي μT — نطاق الأرض تقريباً 25–65 */
export function classifyMagneticField(microTesla: number | null | undefined): {
  level: 'ok' | 'weak' | 'strong' | 'unknown';
  microTesla: number | null;
} {
  if (microTesla == null || !Number.isFinite(microTesla)) {
    return { level: 'unknown', microTesla: null };
  }
  if (microTesla < 20) return { level: 'weak', microTesla };
  if (microTesla > 70) return { level: 'strong', microTesla };
  return { level: 'ok', microTesla };
}

export function formatCoord(lat: number, lng: number): string {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(5)}°${ns}  ${Math.abs(lng).toFixed(5)}°${ew}`;
}

export { MECCA_LAT, MECCA_LNG };
