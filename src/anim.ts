import { LayoutAnimation, Platform, UIManager } from 'react-native';

// Enable LayoutAnimation on old-architecture Android (no-op elsewhere).
export function enableLayoutAnimations() {
  if (
    Platform.OS === 'android' &&
    UIManager.setLayoutAnimationEnabledExperimental
  ) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

let enabled = true;
export const setAnimationsEnabled = (v: boolean) => {
  enabled = v;
};
export const animationsEnabled = () => enabled;

// A gentle spring reflow — call right before a state change that alters layout
// (adding/removing a row, expanding a panel) so the next render animates.
const SPRING = {
  duration: 260,
  create: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
  update: {
    type: LayoutAnimation.Types.spring,
    springDamping: 0.75,
  },
  delete: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
};

export function animateLayout() {
  if (!enabled) return;
  try {
    LayoutAnimation.configureNext(SPRING);
  } catch {
    // LayoutAnimation can occasionally throw mid-transition — never fatal.
  }
}
