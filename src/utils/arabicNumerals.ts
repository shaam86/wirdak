const EASTERN = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

export function toEasternDigits(value: number | string): string {
  return String(value).replace(/\d/g, (d) => EASTERN[Number(d)] ?? d);
}
