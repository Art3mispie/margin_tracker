import * as Haptics from 'expo-haptics';

// Thin, fail-safe wrappers — haptics are a nice-to-have, never a hard dependency,
// so every call swallows errors (e.g. unsupported platforms / simulators) and
// respects the user's global preference.

let enabled = true;
export const setHapticsEnabled = (v: boolean) => {
  enabled = v;
};

/** A light tick — for taps, selecting a suggestion, small toggles. */
export const hapticTap = () => {
  if (!enabled) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};

/** A firmer bump — for committing a checkbox / state change. */
export const hapticToggle = () => {
  if (!enabled) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
};

/** Selection feedback — for cycling values, picking a theme. */
export const hapticSelect = () => {
  if (!enabled) return;
  Haptics.selectionAsync().catch(() => {});
};

/** A satisfying success rumble — completing a task, archiving, saving. */
export const hapticSuccess = () => {
  if (!enabled) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
};

/** A cautionary buzz — destructive actions like delete. */
export const hapticWarning = () => {
  if (!enabled) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
};
