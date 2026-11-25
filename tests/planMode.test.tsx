import { afterEach, describe, expect, it, vi } from 'vitest';
import { FloatingCrown, PremiumGate, PremiumPill, SubscriptionProvider, defineSubscription, getPlanMode, offeredOptions, planModeFrom, setPlanMode, usePremium, useSubscription } from '../src';
import { act, fakePayments, mount } from './render';

const config = defineSubscription({ tiers: ['free', 'premium'], tierLabels: { premium: 'Premium' }, features: { effects: 'premium' }, plans: [{ id: 'yearly', tier: 'premium', label: 'Yearly' }] });
let seen: { premium: boolean; paid: boolean; canUse: boolean; selling: boolean } | null = null;
function Probe() {
  const { premium } = usePremium();
  const s = useSubscription();
  seen = { premium, paid: s.paid, canUse: s.canUse('effects'), selling: s.selling };
  return null;
}

describe('plan mode (9.0.0)', () => {
  afterEach(() => setPlanMode('free'));

  it('reads config/app: only "subscription" sells, and a tester list limits it to those accounts', () => {
    expect(planModeFrom(undefined, 'u1')).toBe('free');
    expect(planModeFrom({}, 'u1')).toBe('free');
    expect(planModeFrom({ planMode: 'free' }, 'u1')).toBe('free');
    expect(planModeFrom({ planMode: 'Subscription' }, 'u1')).toBe('free');
    expect(planModeFrom({ planMode: 'subscription' }, 'u1')).toBe('subscription');
    expect(planModeFrom({ planMode: 'subscription', subscriptionTesters: [] }, 'u1')).toBe('subscription');
    expect(planModeFrom({ planMode: 'subscription', subscriptionTesters: ['u1'] }, 'u1')).toBe('subscription');
    expect(planModeFrom({ planMode: 'subscription', subscriptionTesters: ['u2'] }, 'u1')).toBe('free');
    expect(planModeFrom({ planMode: 'subscription', subscriptionTesters: ['u2'] }, null)).toBe('free');
  });

  it('is free by default (10.0.0): Premium hidden, the store never asked, and no crown, pill, lock or gate', async () => {
    const payments = fakePayments();
    const onUnlock = vi.fn();
    const m = await mount(
      <SubscriptionProvider config={config} payments={payments} userId="u1">
        <Probe />
        <FloatingCrown onPress={vi.fn()} />
        <PremiumPill />
        <PremiumGate feature="effects" name="Effects" onUnlock={onUnlock} />
      </SubscriptionProvider>,
    );
    expect(seen).toEqual({ premium: false, paid: false, canUse: false, selling: false });
    expect(payments.watch).not.toHaveBeenCalled();
    expect(m.label('Premium')).toBeUndefined();
    expect(m.root.toJSON()).toBeNull();
    expect(getPlanMode()).toBe('free');
  });

  it('turns selling on when the source says "subscription" for this account', async () => {
    const payments = fakePayments();
    const source = vi.fn(async (uid: string | null) => planModeFrom({ planMode: 'subscription', subscriptionTesters: ['u1'] }, uid));
    await mount(
      <SubscriptionProvider planMode={source} config={config} payments={payments} userId="u1">
        <Probe />
      </SubscriptionProvider>,
    );
    await act(async () => undefined);
    expect(source).toHaveBeenCalledWith('u1');
    expect(seen).toEqual({ premium: false, paid: false, canUse: false, selling: true });
    expect(payments.watch).toHaveBeenCalled();
    expect(getPlanMode()).toBe('subscription');
  });

  it('offers Premium only in subscription mode, and keeps a chosen locked option (10.0.0)', () => {
    expect(offeredOptions(['daily', 'hourly', 'custom'], false, (v) => v !== 'daily', (v) => v === 'custom')).toEqual(['daily', 'custom']);
    expect(offeredOptions(['daily', 'hourly'], true, () => true, () => false)).toEqual(['daily', 'hourly']);
  });

  it('stays free when the source fails', async () => {
    await mount(
      <SubscriptionProvider planMode={async () => { throw new Error('offline'); }} config={config} payments={fakePayments()} userId="u1">
        <Probe />
      </SubscriptionProvider>,
    );
    await act(async () => undefined);
    expect(seen?.selling).toBe(false);
    expect(getPlanMode()).toBe('free');
  });

  it('keeps loading until the source answers, then remembers the answer for an offline launch (11.1.0)', async () => {
    const kept = new Map<string, string>();
    const storage = { getItem: async (k: string) => kept.get(k) ?? null, setItem: async (k: string, v: string) => void kept.set(k, v), removeItem: async (k: string) => void kept.delete(k) };
    let answer: (m: 'subscription') => void = () => undefined;
    const slow = () => new Promise<'subscription'>((resolve) => (answer = resolve));
    let state: { loading: boolean; selling: boolean } | null = null;
    function Loading() {
      const s = useSubscription();
      state = { loading: s.loading, selling: s.selling };
      return null;
    }
    const payments = fakePayments();
    const m = await mount(
      <SubscriptionProvider planMode={slow} storage={storage} config={config} payments={payments} userId="u1">
        <Loading />
      </SubscriptionProvider>,
    );
    expect(state).toEqual({ loading: true, selling: false });
    await act(async () => answer('subscription'));
    expect(state?.selling).toBe(true);
    expect(kept.get('app-subscriptions-kit:plan-mode:u1')).toBe('subscription');
    m.root.unmount();

    // The next launch is offline: the source fails and the kept answer is used.
    await mount(
      <SubscriptionProvider planMode={async () => { throw new Error('offline'); }} storage={storage} config={config} payments={fakePayments()} userId="u1">
        <Loading />
      </SubscriptionProvider>,
    );
    await act(async () => undefined);
    expect(state?.selling).toBe(true);
  });
});
