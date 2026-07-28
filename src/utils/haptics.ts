// iOS Safari does not support navigator.vibrate (returns undefined).
// The Web Vibration API is Android/Chrome-only; iOS provides no fallback.
export const vibrate = (pattern: number | number[] = 50) => {
  if (typeof window !== "undefined" && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignora silenciosamente em navegadores que não suportam ou bloqueiam
    }
  }
};

export const haptics = {
  light: () => vibrate(30),
  medium: () => vibrate(50),
  heavy: () => vibrate(100),
  success: () => vibrate([30, 50, 30]),
  error: () => vibrate([50, 100, 50, 100, 50]),
};
