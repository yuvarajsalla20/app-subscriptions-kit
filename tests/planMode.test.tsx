import { afterEach, describe, expect, it, vi } from 'vitest';
import { FloatingCrown, PremiumGate, PremiumPill, SubscriptionProvider, defineSubscription, getPlanMode, planModeFrom, setPlanMode, usePremium, useSubscription } from '../src';
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

  it('is free by default: everything open, the store never asked, and no crown, pill or lock', async () => {
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
    expect(seen).toEqual({ premium: true, paid: false, canUse: true, selling: false });
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
});
