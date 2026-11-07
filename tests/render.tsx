import type { ReactElement } from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { vi } from 'vitest';
import type { PaymentsLike, StorePlan, WatchState } from '../src';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

export const plan = (id: string, tier: string, price: number, months: number, trialDays: number | null = null): StorePlan => ({
  id,
  tier,
  price,
  currency: 'USD',
  priceString: `$${price.toFixed(2)}`,
  trialDays,
  period: months === 12 ? { unit: 'YEAR', count: 1 } : { unit: 'MONTH', count: months },
});

/** A payments object the tests drive: `emit` changes the tier as the store would. */
export function fakePayments(over: Partial<PaymentsLike> = {}) {
  let cb: (s: WatchState) => void = () => undefined;
  const p = {
    ready: true,
    loadPlans: vi.fn(async () => [plan('yearly', 'premium', 39.99, 12, 7), plan('monthly', 'premium', 6.99, 1)]),
    buy: vi.fn(async (pl: StorePlan) => ({ ok: true as const, tier: pl.tier })),
    restore: vi.fn(async () => ({ ok: true as const, tier: 'free' })),
    redeemCode: vi.fn(async () => {}),
    openManage: vi.fn(async () => {}),
    watch: vi.fn((_: string | null, f: (s: WatchState) => void) => {
      cb = f;
      f({ tier: 'free', source: 'free', server: null });
      return () => undefined;
    }),
    testerAvailable: false,
    ...over,
  };
  return Object.assign(p, { emit: (s: Partial<WatchState>) => act(() => cb({ tier: 'free', source: 'store', server: null, ...s })) });
}

export const mount = async (ui: ReactElement) => {
  let root!: ReactTestRenderer;
  await act(async () => {
    root = TestRenderer.create(ui);
  });
  const hosts = (test: (n: ReactTestInstance) => boolean) => root.root.findAll((n) => typeof n.type === 'string' && test(n));
  const textOf = (n: ReactTestInstance): string => n.children.map((c) => (typeof c === 'string' ? c : textOf(c))).join('');
  return {
    root,
    shown: (t: string) => hosts((n) => n.type === 'Text' && textOf(n) === t).length > 0,
    texts: () => hosts((n) => n.type === 'Text').map(textOf),
    label: (l: string) => hosts((n) => n.props.accessibilityLabel === l)[0],
    /** The nearest pressable around this visible text. */
    button: (t: string) => {
      let n: ReactTestInstance | null | undefined = hosts((x) => x.type === 'Text' && textOf(x) === t)[0];
      while (n && !n.props.onPress) n = n.parent;
      return n ?? undefined;
    },
  };
};

export const press = (n: ReactTestInstance | undefined) =>
  act(async () => {
    await n!.props.onPress();
  });
export { act };
