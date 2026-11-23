import { useEffect, useSyncExternalStore } from 'react';

/**
 * 5.0.0: whether a Premium page is on screen, so the floating crown can step aside there. A count, so two pages (one closing
 * while the next opens) never leave the crown hidden or shown by mistake.
 */
let open = 0;
const listeners = new Set<() => void>();
const tell = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

/** Marks a Premium page as open for as long as the calling component is mounted. */
export function usePremiumPageOpen() {
  useEffect(() => {
    open += 1;
    tell();
    return () => {
      open -= 1;
      tell();
    };
  }, []);
}

/** True while a Premium page is open. */
export function usePremiumPageShown(): boolean {
  return useSyncExternalStore(subscribe, () => open > 0, () => false);
}
