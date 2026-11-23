import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { useLook, type LookProps } from './look';
import { usePremiumPageShown } from './pageOpen';
import { useSubscription, type SubscriptionStorage } from './SubscriptionProvider';

/** The crown's gold, light to deep: the same gold as the Premium tag and the comparison table. */
export const DEFAULT_GOLD = ['#F3D58A', '#C9952B', '#9A6B12'] as const;

/** The crown's diameter, in points. */
export const CROWN_SIZE = 60;
/** The room a list leaves under its last row, so the floating crown never hides it. */
export const CROWN_SPACE = CROWN_SIZE + 36;
/** Where the crown's place is kept between launches. */
export const CROWN_KEY = 'app-subscriptions-kit/crown';
/** Distance from the side edge, and the movement that turns a press into a drag. */
const EDGE = 12;
const DRAG = 6;

/** Which side the crown rests on, and how far down the free band it sits (0 at the top, 1 at the bottom). */
export interface CrownPlace {
  side: 'left' | 'right';
  at: number;
}
export const DEFAULT_PLACE: CrownPlace = { side: 'right', at: 1 };

/** Reads a kept place, or the default when nothing was kept or the value is not one this kit wrote. */
export function readPlace(raw: string | null): CrownPlace {
  try {
    const p = raw ? (JSON.parse(raw) as Partial<CrownPlace>) : null;
    if (p && (p.side === 'left' || p.side === 'right') && typeof p.at === 'number' && p.at >= 0 && p.at <= 1) return { side: p.side, at: p.at };
  } catch {
    /* fall through */
  }
  return DEFAULT_PLACE;
}

/** Where a released crown settles: the nearest side edge, at the height it was let go, kept inside the free band. */
export function settle(x: number, y: number, width: number, top: number, bottom: number, size = CROWN_SIZE): CrownPlace {
  const side = x + size / 2 < width / 2 ? 'left' : 'right';
  const band = Math.max(1, bottom - top - size);
  return { side, at: Math.min(1, Math.max(0, (y - top) / band)) };
}

/** The crown's top-left corner for a place. */
export function placeAt(p: CrownPlace, width: number, top: number, bottom: number, size = CROWN_SIZE) {
  return { x: p.side === 'left' ? EDGE : width - size - EDGE, y: top + p.at * Math.max(0, bottom - top - size) };
}

export interface FloatingCrownProps extends LookProps {
  /** Opens the Plans screen. Only a free account sees the crown (6.0.0). */
  onPress: () => void;
  /** Keeps the place the person dragged it to (AsyncStorage). Without it the crown starts in the bottom-right corner each launch. */
  storage?: Pick<SubscriptionStorage, 'getItem' | 'setItem'>;
  /** Space kept clear at the top (the top bar) and bottom (the Home indicator), in points. */
  top?: number;
  bottom?: number;
  /** Called once as a drag begins, e.g. for a light haptic tap. */
  onLift?: () => void;
}

/** The crown mark: a gold disc with a dark crown. */
function CrownMark({ gold, ink, size }: { gold: readonly [string, string, string]; ink: string; size: number }) {
  const g = size / 2;
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Defs>
        <LinearGradient id="crownGold" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={gold[0]} />
          <Stop offset="0.55" stopColor={gold[1]} />
          <Stop offset="1" stopColor={gold[2]} />
        </LinearGradient>
      </Defs>
      <Path d={`M${g} 1a${g - 1} ${g - 1} 0 1 0 0.01 0Z`} fill="url(#crownGold)" stroke="rgba(255,255,255,0.75)" strokeWidth={2} />
      <Path d="M17 38h26M17.8 35 16.5 24.5l6.5 4.7L30 20l7 9.2 6.5-4.7L42.2 35z" fill="none" stroke={ink} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/**
 * 6.0.0: whether the floating crown is on screen. Only for a free account, and only once the subscription is known, so a member
 * never sees it appear for a moment at launch. A trial and a store grace period count as Premium. Hidden on the Premium page.
 */
export function useCrownShown(): boolean {
  const { paid, loading, selling } = useSubscription();
  const premiumOpen = usePremiumPageShown();
  // 9.0.0: never while the plan mode is 'free', where nothing is on sale.
  return selling && !paid && !loading && !premiumOpen;
}

/** The room a list leaves under its last row: `CROWN_SPACE` while the crown is shown, otherwise none (6.0.0). */
export function useCrownSpace(): number {
  return useCrownShown() ? CROWN_SPACE : 0;
}

/**
 * A gold crown that floats over the app's main pages and opens the Plans screen. The person can drag it anywhere; on release it
 * settles on the nearest side edge and the place is kept. A press that moves less than a few points is a tap.
 * Place it last inside a full-screen view. Lists under it end with `CROWN_SPACE` of room. 5.0.0: it hides while the Premium page
 * is open, where it covered Change Plan and repeated what the page already says. 6.0.0: it shows only to a free account, once the
 * subscription is known; a member (including a trial or a store grace period) never sees it.
 */
export function FloatingCrown({ onPress, storage, top = 120, bottom = 34, onLift, ...look }: FloatingCrownProps) {
  const { c, s } = useLook(look);
  const shown = useCrownShown();
  const { width, height } = useWindowDimensions();
  const low = height - bottom;
  const [place, setPlace] = useState<CrownPlace>(DEFAULT_PLACE);
  const pos = useRef(new Animated.ValueXY(placeAt(DEFAULT_PLACE, width, top, low))).current;
  const [lifted, setLifted] = useState(false);
  const live = useRef({ place, width, top, low, storage, onLift });
  live.current = { place, width, top, low, storage, onLift };

  useEffect(() => {
    let on = true;
    storage?.getItem(CROWN_KEY).then((raw) => on && setPlace(readPlace(raw)), () => undefined);
    return () => {
      on = false;
    };
  }, [storage]);
  // A kept place, a turned phone or a new top bar: glide to the right spot.
  useEffect(() => {
    Animated.spring(pos, { toValue: placeAt(place, width, top, low), useNativeDriver: false, friction: 7 }).start();
  }, [pos, place, width, top, low]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > DRAG || Math.abs(g.dy) > DRAG,
        onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > DRAG || Math.abs(g.dy) > DRAG,
        onPanResponderGrant: () => {
          const l = live.current;
          pos.setOffset(placeAt(l.place, l.width, l.top, l.low));
          pos.setValue({ x: 0, y: 0 });
          setLifted(true);
          l.onLift?.();
        },
        onPanResponderMove: Animated.event([null, { dx: pos.x, dy: pos.y }], { useNativeDriver: false }),
        onPanResponderRelease: (_, g) => end(g.dx, g.dy),
        onPanResponderTerminate: (_, g) => end(g.dx, g.dy),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pos],
  );
  function end(dx: number, dy: number) {
    const l = live.current;
    const from = placeAt(l.place, l.width, l.top, l.low);
    pos.flattenOffset();
    setLifted(false);
    const next = settle(from.x + dx, from.y + dy, l.width, l.top, l.low);
    setPlace(next);
    l.storage?.setItem(CROWN_KEY, JSON.stringify(next)).catch(() => undefined);
  }

  const gold = c.crown ?? DEFAULT_GOLD;
  if (!shown) return null;
  return (
    <Animated.View
      {...pan.panHandlers}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: CROWN_SIZE,
        height: CROWN_SIZE,
        transform: [...pos.getTranslateTransform(), { scale: lifted ? 1.12 : 1 }],
        shadowColor: gold[2],
        shadowOpacity: lifted ? 0.45 : 0.38,
        shadowRadius: lifted ? 22 : 14,
        shadowOffset: { width: 0, height: lifted ? 18 : 10 },
        elevation: lifted ? 14 : 8,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={s.crownLabel(false)}
        accessibilityHint={s.crownHint}
        onPress={onPress}
        hitSlop={6}
        style={{ width: CROWN_SIZE, height: CROWN_SIZE, borderRadius: CROWN_SIZE / 2 }}
      >
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <CrownMark gold={gold} ink={c.onPremium} size={CROWN_SIZE} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

