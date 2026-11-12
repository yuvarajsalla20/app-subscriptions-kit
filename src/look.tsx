import { useMemo } from 'react';
import { Text as RNText, View } from 'react-native';
import { DEFAULT_STRINGS, DEFAULT_THEME, type SubscriptionComponents, type SubscriptionStrings, type SubscriptionTheme } from './theme';

/** Looks shared by every piece: pass only what differs from the defaults. */
export interface LookProps {
  theme?: Partial<SubscriptionTheme>;
  strings?: Partial<SubscriptionStrings>;
  components?: Partial<SubscriptionComponents>;
}

export function useLook({ theme, strings, components }: LookProps) {
  // Compared by value, so an inline object doesn't rebuild everything on each render.
  const t = JSON.stringify(theme ?? {});
  return useMemo(
    () => ({ c: { ...DEFAULT_THEME, ...theme }, s: { ...DEFAULT_STRINGS, ...strings }, Text: components?.Text ?? RNText }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, strings, components?.Text],
  );
}

/** A small padlock drawn with views (no icon font needed). */
export function Lock({ color, size = 12 }: { color: string; size?: number }) {
  const w = size * 0.75;
  return (
    <View accessibilityElementsHidden importantForAccessibility="no" style={{ width: size, height: size, alignItems: 'center', justifyContent: 'flex-end' }}>
      <View style={{ width: w * 0.66, height: size * 0.45, borderWidth: Math.max(1.5, size / 8), borderBottomWidth: 0, borderColor: color, borderTopLeftRadius: w, borderTopRightRadius: w }} />
      <View style={{ width: w, height: size * 0.5, borderRadius: size / 8, backgroundColor: color }} />
    </View>
  );
}

/** A cut gem drawn with views: the default Premium mark. Pass any element instead through the page's `icon`. */
export function Diamond({ color, fill, size = 24 }: { color: string; fill: string; size?: number }) {
  const side = size * 0.62;
  return (
    <View accessibilityElementsHidden importantForAccessibility="no" style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: side, height: side, backgroundColor: fill, borderWidth: Math.max(1.5, size / 12), borderColor: color, borderRadius: size / 10, transform: [{ rotate: '45deg' }] }} />
    </View>
  );
}
