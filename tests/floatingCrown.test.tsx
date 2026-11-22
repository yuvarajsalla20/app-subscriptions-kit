import { PanResponder } from 'react-native';
import { describe, expect, it, vi } from 'vitest';
import { CROWN_KEY, DEFAULT_PLACE, FloatingCrown, SubscriptionProvider, defineSubscription, placeAt, readPlace, settle } from '../src';
import { act, fakePayments, mount, press } from './render';

const config = defineSubscription({ tiers: ['free', 'premium'], tierLabels: { premium: 'Premium' }, features: { effects: 'premium' }, plans: [{ id: 'yearly', tier: 'premium', label: 'Yearly' }] });
const memory = (start: string | null = null) => {
  let v = start;
  return { getItem: vi.fn(async () => v), setItem: vi.fn(async (_: string, x: string) => void (v = x)) };
};
const crown = (payments = fakePayments(), onPress = vi.fn(), storage = memory()) => (
  <SubscriptionProvider config={config} payments={payments} userId="u1">
    <FloatingCrown onPress={onPress} storage={storage} />
  </SubscriptionProvider>
);

describe('FloatingCrown', () => {
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

  it('opens the plans on a tap, for a free account and for a member', async () => {
    const onPress = vi.fn();
    const payments = fakePayments();
    const m = await mount(crown(payments, onPress));
    await press(m.label('Premium'));
    expect(onPress).toHaveBeenCalledTimes(1);
    await payments.emit({ tier: 'premium' });
    await press(m.label('Premium Member'));
    expect(onPress).toHaveBeenCalledTimes(2);
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
