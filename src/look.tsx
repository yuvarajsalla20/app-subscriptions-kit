import { useMemo } from 'react';
import { Text as RNText, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
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

/**
 * A king and a queen crown side by side: the default Premium mark. `size` is the height; it is about 1.6 times as wide.
 * `outline` draws both without fill (for small rows). Pass any element instead through the page's `icon`.
 */
export function Crowns({ size = 24, outline = false, king = '#B45309', kingFill = '#FCD34D', queen = '#BE185D', queenFill = '#FBCFE8' }:
  { size?: number; outline?: boolean; king?: string; kingFill?: string; queen?: string; queenFill?: string }) {
  const sw = outline ? 1.8 : 1.6;
  const kf = outline ? 'none' : kingFill;
  const qf = outline ? 'none' : queenFill;
  const qs = outline ? king : queen;
  return (
    <View accessibilityElementsHidden importantForAccessibility="no">
      <Svg width={Math.round((size * 38) / 24)} height={size} viewBox="-0.5 0 38 24">
        <Path d="M2.5 18 1.5 6.5 6.5 11 10.5 3 14.5 11 19.5 6.5 18.5 18Z" fill={kf} stroke={king} strokeWidth={sw} strokeLinejoin="round" />
        <Path d="M2.5 18h16v3h-16z" fill={kf} stroke={king} strokeWidth={sw} strokeLinejoin="round" />
        <Circle cx={10.5} cy={13.5} r={1.4} fill={king} />
        <Path d="M19 19 18 11 22.5 14.5 26.5 9 30.5 14.5 35 11 34 19Z" fill={qf} stroke={qs} strokeWidth={sw} strokeLinejoin="round" />
        <Path d="M19 19h15v2.5H19z" fill={qf} stroke={qs} strokeWidth={sw} strokeLinejoin="round" />
        <Circle cx={18} cy={10} r={1.5} fill={qs} />
        <Circle cx={26.5} cy={7.8} r={1.6} fill={qs} />
        <Circle cx={35} cy={10} r={1.5} fill={qs} />
      </Svg>
    </View>
  );
}
