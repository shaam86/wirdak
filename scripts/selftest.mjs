/**
 * اختبارات خفيفة بدون Jest — تشغيل: npm test
 */

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

/** نسخة مبسّطة من normalizeDegrees / shortestAngleDelta / angleToQibla */
function normalizeDegrees(value) {
  return ((value % 360) + 360) % 360;
}
function shortestAngleDelta(from, to) {
  return ((to - from + 540) % 360) - 180;
}
function angleToQibla(qiblaBearing, deviceHeading) {
  return shortestAngleDelta(deviceHeading, qiblaBearing);
}

assert(normalizeDegrees(-10) === 350, 'normalizeDegrees wrap');
assert(Math.abs(angleToQibla(90, 80) - 10) < 0.001, 'angleToQibla right');
assert(Math.abs(angleToQibla(10, 350) - 20) < 0.001, 'angleToQibla wrap');

/** tokenize بسيط */
function stripQuranMarks(text) {
  return text.replace(/[﴿﴾]/g, ' ');
}
function tokenizeArabic(displayText) {
  return stripQuranMarks(displayText)
    .split(/\s+/)
    .filter(Boolean)
    .map((display) => ({ display }));
}
assert(tokenizeArabic('بِسْمِ اللَّهِ').length >= 2, 'tokenize words');

console.log('selftest: ok');
