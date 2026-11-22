import { createElement, forwardRef } from 'react';

// A small stand-in for react-native so the real screens can be rendered in tests: every component is a plain named element.
const host = (name: string) => forwardRef<unknown, Record<string, unknown>>((props, ref) => createElement(name, { ...props, ref }, props.children as never));

export const View = host('View');
export const Text = host('Text');
export const TextInput = host('TextInput');
export const Pressable = host('Pressable');
export const ScrollView = host('ScrollView');
export const Switch = host('Switch');
export const Platform = { OS: 'ios' as string };
export const Modal = host('Modal');
export const ActivityIndicator = host('ActivityIndicator');
export const AccessibilityInfo = { announceForAccessibility: (_: string) => undefined, isReduceMotionEnabled: async () => false, addEventListener: () => ({ remove: () => undefined }) };

// Animations run nowhere in tests: values hold numbers, and every animation starts and stops without moving anything.
class Value {
  constructor(public v: number) {}
  setValue(v: number) { this.v = v; }
  interpolate() { return this; }
}
class ValueXY {
  x: Value;
  y: Value;
  constructor(p: { x: number; y: number } = { x: 0, y: 0 }) { this.x = new Value(p.x); this.y = new Value(p.y); }
  setValue(p: { x: number; y: number }) { this.x.setValue(p.x); this.y.setValue(p.y); }
  setOffset() {}
  flattenOffset() {}
  getTranslateTransform() { return [{ translateX: this.x.v }, { translateY: this.y.v }]; }
}
const anim = () => ({ start: (cb?: (r: { finished: boolean }) => void) => cb?.({ finished: true }), stop: () => undefined });
export const Animated = {
  View: host('Animated.View'),
  Value,
  ValueXY,
  event: () => () => undefined,
  timing: anim,
  spring: anim,
  loop: anim,
  sequence: anim,
  parallel: anim,
  stagger: anim,
  delay: anim,
};
export const Easing = { linear: (t: number) => t, quad: (t: number) => t, out: (f: unknown) => f, inOut: (f: unknown) => f };
export const useWindowDimensions = () => ({ width: 390, height: 844, scale: 3, fontScale: 1 });
// The last responder made, so a test can drive a drag by hand.
type Handlers = Record<string, (e: unknown, g: { dx: number; dy: number }) => unknown>;
export const PanResponder = {
  last: null as Handlers | null,
  create(h: Handlers) { PanResponder.last = h; return { panHandlers: {} }; },
};
