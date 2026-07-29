import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Mirrors the operating system's reduced-motion preference across native and web.
 * The preference may change while the app is open, so consumers should not cache it.
 */
export function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    let active = true;

    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReducedMotion(enabled);
    });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReducedMotion,
    );

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return reducedMotion;
}
