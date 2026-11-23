import { PanResponder } from 'react-native';
import { describe, expect, it, vi } from 'vitest';
import { CROWN_KEY, CROWN_SPACE, DEFAULT_PLACE, FloatingCrown, useCrownSpace, PremiumPage, SubscriptionProvider, defineSubscription, placeAt, readPlace, settle } from '../src';
import { act, fakePayments, mount, press } from './render';

const config = defineSubscription({ tiers: ['free', 'premium'], tierLabels: { premium: 'Premium' }, features: { effects: 'premium' }, plans: [{ id: 'yearly', tier: 'premium', label: 'Yearly' }] });
const memory = (start: string | null = null) => {
  let v = start;
  return { getItem: vi.fn(async () => v), setItem: vi.fn(async (_: string, x: string) => void (v = x)) };
};
const crown = (payments = fakePayments(), onPress = vi.fn(), storage = memory()) => (
  <SubscriptionProvider planMode="subscription" config={config} payments={payments} userId="u1">
    <FloatingCrown onPress={onPress} storage={storage} />
  </SubscriptionProvider>
);

describe('FloatingCrown', () => {
  it('hides while the Premium page is open and returns once it closes (5.0.0)', async () => {
    const payments = fakePayments();
    const ui = (withPage: boolean) => (
      <SubscriptionProvider planMode="subscription" config={config} payments={payments} userId="u1">
        {withPage ? <PremiumPage onOpenPlans={vi.fn()} features={[]} /> : null}
        <FloatingCrown onPress={vi.fn()} />
      </SubscriptionProvider>
    );
    const m = await mount(ui(true));
    expect(m.label('Premium')).toBeUndefined();
    await act(async () => m.root.update(ui(false)));
    expect(m.label('Premium')).toBeTruthy();
  });

  it('settles on the nearest side edge, inside the free band', () => {
    expect(settle(40, 400, 390, 120, 810)).toEqual({ side: 'left', at: expect.closeTo(280 / 630, 5) });
    expect(settle(300, 2000, 390, 120, 810)).toEqual({ side: 'right', at: 1 });
    expect(settle(300, -50, 390, 120, 810)).toEqual({ side: 'right', at: 0 });
    expect(placeAt({ side: 'left', at: 0 }, 390, 120, 810)).toEqual({ x: 12, y: 120 });
    expect(placeAt(DEFAULT_PLACE, 390, 120, 810)).toEqual({ x: 318, y: 750 });
  });

  it('reads only a place it wrote, else starts bottom right', () => {
    expect(readPlace(null)).toEqual(DEFAULT_PLACE);
    expect(readPlace('nonsense')).toEqual(DEFAULT_PLACE);
    expect(readPlace('{"side":"up","at":0.2}')).toEqual(DEFAULT_PLACE);
    expect(readPlace('{"side":"left","at":0.25}')).toEqual({ side: 'left', at: 0.25 });
  });

  it('opens the plans on a tap for a free account', async () => {
    const onPress = vi.fn();
    const m = await mount(crown(fakePayments(), onPress));
    await press(m.label('Premium'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('hides for a member, a trial and a store grace period, and returns when the plan ends (6.0.0)', async () => {
    const payments = fakePayments();
    const m = await mount(crown(payments));
    expect(m.label('Premium')).toBeTruthy();
    await payments.emit({ tier: 'premium' });
    expect(m.label('Premium')).toBeUndefined();
    await payments.emit({ tier: 'premium', renewal: { until: '2099-01-01T00:00:00Z', willRenew: true, trial: true } });
    expect(m.label('Premium')).toBeUndefined();
    await payments.emit({ tier: 'premium', renewal: { until: '2099-01-01T00:00:00Z', willRenew: true, billingIssue: true } });
    expect(m.label('Premium')).toBeUndefined();
    await payments.emit({ tier: 'free' });
    expect(m.label('Premium')).toBeTruthy();
  });

  it('stays hidden until the subscription is known, so a member never sees it flash (6.0.0)', async () => {
    let answer: (s: { tier: string; source: 'store'; server: null }) => void = () => undefined;
    const payments = fakePayments({ watch: vi.fn((_: string | null, f) => ((answer = f), () => undefined)) });
    const m = await mount(crown(payments));
    expect(m.label('Premium')).toBeUndefined();
    await act(async () => answer({ tier: 'premium', source: 'store', server: null }));
    expect(m.label('Premium')).toBeUndefined();
  });

  it('leaves room under a list only while the crown is shown (6.0.0)', async () => {
    const seen: number[] = [];
    const Probe = () => (seen.push(useCrownSpace()), null);
    const payments = fakePayments();
    await mount(
      <SubscriptionProvider planMode="subscription" config={config} payments={payments} userId="u1">
        <Probe />
      </SubscriptionProvider>,
    );
    expect(seen.at(-1)).toBe(CROWN_SPACE);
    await payments.emit({ tier: 'premium' });
    expect(seen.at(-1)).toBe(0);
  });

  it('keeps the place it was dragged to, and a small movement is not a drag', async () => {
    const storage = memory();
    await mount(crown(fakePayments(), vi.fn(), storage));
    const h = PanResponder.last!;
    expect(h.onMoveShouldSetPanResponder!(null, { dx: 3, dy: 2 })).toBe(false);
    expect(h.onMoveShouldSetPanResponder!(null, { dx: -200, dy: -300 })).toBe(true);
    await act(async () => {
      h.onPanResponderGrant!(null, { dx: 0, dy: 0 });
      h.onPanResponderRelease!(null, { dx: -250, dy: -300 });
    });
    expect(storage.setItem).toHaveBeenCalledWith(CROWN_KEY, expect.stringContaining('"side":"left"'));
  });
});
