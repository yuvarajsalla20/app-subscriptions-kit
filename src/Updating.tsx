import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, Modal, Pressable, View } from 'react-native';
import { Crowns, useLook, type LookProps } from './look';

/** Whether the phone asks for less motion. Read once, then kept in step. */
export function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled?.().then((r) => { if (live) setReduce(!!r); }).catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (r: boolean) => setReduce(!!r));
    return () => {
      live = false;
      sub?.remove?.();
    };
  }, []);
  return reduce;
}

/** A value that runs from 0 to 1 and back for as long as it is shown (still when the phone asks for less motion). */
function useLoop(ms: number, delay = 0, back = true) {
  const v = useRef(new Animated.Value(0)).current;
  const reduce = useReduceMotion();
  useEffect(() => {
    if (reduce) return;
    const ease = Easing.inOut(Easing.quad);
    const steps = [Animated.timing(v, { toValue: 1, duration: back ? ms / 2 : ms, easing: ease, useNativeDriver: true })];
    if (back) steps.push(Animated.timing(v, { toValue: 0, duration: ms / 2, easing: ease, useNativeDriver: true }));
    else steps.push(Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }));
    const a = Animated.sequence([Animated.delay(delay), Animated.loop(Animated.sequence(steps))]);
    a.start();
    return () => a.stop();
  }, [v, ms, delay, back, reduce]);
  return v;
}

/**
 * Swings its children from side to side like a ringing bell, hinged at the top. `reverse` swings the other way,
 * so two bells side by side ring against each other.
 */
export function Swing({ children, reverse = false, degrees = 14, ms = 700 }: { children: ReactNode; reverse?: boolean; degrees?: number; ms?: number }) {
  const v = useLoop(ms);
  const d = reverse ? -degrees : degrees;
  const rotate = v.interpolate({ inputRange: [0, 1], outputRange: [`${-d}deg`, `${d}deg`] });
  return <Animated.View style={{ transform: [{ rotate }], transformOrigin: '50% 8%' }}>{children}</Animated.View>;
}

function Dot({ color, delay }: { color: string; delay: number }) {
  const v = useLoop(1200, delay);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });
  const opacity = v.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
  return <Animated.View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color, opacity, transform: [{ translateY }] }} />;
}

function Ripple({ color }: { color: string }) {
  const v = useLoop(1400, 0, false);
  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.3] });
  const opacity = v.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] });
  return <Animated.View style={{ position: 'absolute', alignSelf: 'center', top: 4, width: 96, height: 54, borderRadius: 48, borderWidth: 2, borderColor: color, opacity, transform: [{ scale }] }} />;
}

/** Falling pieces of colored paper, across the box. The same pattern every time. */
function Confetti({ colors, height }: { colors: readonly string[]; height: number }) {
  const pieces = useMemo(
    () => Array.from({ length: 22 }, (_, i) => ({
      left: `${(i * 37) % 96 + 2}%` as const,
      w: [6, 8, 10][i % 3]!,
      h: [10, 14][i % 2]!,
      color: colors[i % colors.length] ?? '#FBBF24',
      ms: 1300 + ((i * 173) % 900),
      delay: (i * 97) % 600,
      turn: 200 + ((i * 61) % 240),
    })),
    [colors],
  );
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
      {pieces.map((p, i) => <Piece key={i} {...p} height={height} />)}
    </View>
  );
}

function Piece({ left, w, h, color, ms, delay, turn, height }: { left: `${number}%`; w: number; h: number; color: string; ms: number; delay: number; turn: number; height: number }) {
  const v = useLoop(ms, delay, false);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [-24, height] });
  const rotate = v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${turn}deg`] });
  return <Animated.View style={{ position: 'absolute', top: 0, left, width: w, height: h, borderRadius: 2, backgroundColor: color, transform: [{ translateY }, { rotate }] }} />;
}

/** Grows in with a little bounce once, then stays. */
function Pop({ children }: { children: ReactNode }) {
  const v = useRef(new Animated.Value(0.3)).current;
  const reduce = useReduceMotion();
  useEffect(() => {
    if (reduce) {
      v.setValue(1);
      return;
    }
    const a = Animated.spring(v, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [v, reduce]);
  return <Animated.View style={{ transform: [{ scale: v }] }}>{children}</Animated.View>;
}

export interface UpdatingDone {
  title: string;
  line: string;
  /** Confetti: the plan now renews. A calm box after a cancel. */
  party: boolean;
}

/**
 * The box over the page while a subscription change is confirmed: `art` swings (default: the crowns), a ring pulses
 * and three dots bounce. Once the change shows (`done`), the mark pops in, confetti falls when it is good news, and the
 * page says what changed. A tap closes it.
 */
export function UpdatingBox({ waiting, done, company, art, mark, onClose, ...look }: LookProps & {
  waiting: boolean;
  done: UpdatingDone | null;
  company: string;
  art?: ReactNode;
  mark?: ReactNode;
  onClose: () => void;
}) {
  const { c, s, Text } = useLook(look);
  const visible = waiting || !!done;
  const crowns = { king: c.king, kingFill: c.kingFill, queen: c.queen, queenFill: c.queenFill };
  const hud = c.hud ?? c.text;
  const onHud = c.onHud ?? '#FFFFFF';
  const spark = c.hudAccent ?? c.premium;
  const said = done ? `${done.title}. ${done.line}` : `${s.updatingSubscription} ${s.updatingBody(company)}`;
  useEffect(() => {
    if (visible) AccessibilityInfo.announceForAccessibility(said);
  }, [visible, said]);
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable accessibilityRole="button" accessibilityLabel={said} accessibilityHint={s.close} onPress={onClose} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.12)', padding: 24 }}>
        {done ? (
          <View accessibilityLiveRegion="polite" style={{ width: 260, borderRadius: 26, backgroundColor: c.surface, paddingHorizontal: 18, paddingTop: 26, paddingBottom: 22, alignItems: 'center', overflow: 'hidden' }}>
            {done.party ? <Confetti colors={c.confetti ?? []} height={240} /> : null}
            <Pop>
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: c.premiumSoft, alignItems: 'center', justifyContent: 'center' }}>
                {mark ?? <Crowns size={30} {...crowns} />}
              </View>
            </Pop>
            <Text accessibilityRole="header" style={{ color: c.text, fontSize: 19, fontWeight: '800', marginTop: 14, textAlign: 'center' }}>{done.title}</Text>
            {done.line ? <Text style={{ color: c.muted, fontSize: 14, marginTop: 6, textAlign: 'center', lineHeight: 20 }}>{done.line}</Text> : null}
          </View>
        ) : (
          <View accessibilityLiveRegion="polite" style={{ width: 236, borderRadius: 26, backgroundColor: hud, paddingHorizontal: 18, paddingTop: 22, paddingBottom: 20, alignItems: 'center' }}>
            <View style={{ height: 64, width: '100%', alignItems: 'center', justifyContent: 'center' }}>
              <Ripple color={spark} />
              {art ?? <Swing><Crowns size={34} {...crowns} /></Swing>}
            </View>
            <Text style={{ color: onHud, fontSize: 16, fontWeight: '800', marginTop: 12, textAlign: 'center' }}>{s.updatingSubscription}</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
              {[0, 150, 300].map((d) => <Dot key={d} color={spark} delay={d} />)}
            </View>
            <Text style={{ color: onHud, opacity: 0.78, fontSize: 13, marginTop: 8, textAlign: 'center', lineHeight: 18 }}>{s.updatingBody(company)}</Text>
          </View>
        )}
      </Pressable>
    </Modal>
  );
}
