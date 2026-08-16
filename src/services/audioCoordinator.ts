type StopHandler = () => void | Promise<void>;

let activeStop: StopHandler | null = null;

/** يوقف أي مشغّل سابق ثم يسجّل المشغّل الحالي كمالك للصوت */
export async function claimAudioFocus(stopSelf: StopHandler): Promise<() => void> {
  const prev = activeStop;
  activeStop = stopSelf;
  if (prev && prev !== stopSelf) {
    try {
      await prev();
    } catch {
      // ignore
    }
  }
  return () => {
    if (activeStop === stopSelf) activeStop = null;
  };
}
