import { describe, expect, it, vi } from 'vitest';
import { defineSubscription, SubscriptionProvider, useSubscription, type WatchState } from '../src';
import { act, fakePayments, mount } from './render';

const config = defineSubscription({ tiers: ['free', 'premium'] });

describe('a new account never sees the last one', () => {
  it('drops the last tier and dates the moment another person signs in', async () => {
    // A store that answers the first account at once and the second one only later.
    const answer: Record<string, (s: WatchState) => void> = {};
    const payments = fakePayments({
      watch: vi.fn((id: string | null, f: (s: WatchState) => void) => {
        answer[id ?? ''] = f;
        if (id === 'u1') f({ tier: 'premium', source: 'store', server: null, renewal: { until: '2030-01-01T00:00:00Z', willRenew: true } });
        return () => undefined;
      }),
    });
    let seen: { tier: string; renewal: unknown; loading: boolean } | null = null;
    function Probe() {
      const s = useSubscription();
      seen = { tier: s.tier, renewal: s.renewal, loading: s.loading };
      return null;
    }
    const ui = (uid: string) => (
      <SubscriptionProvider config={config} payments={payments} userId={uid}>
        <Probe />
      </SubscriptionProvider>
    );
    const m = await mount(ui('u1'));
    expect(seen).toMatchObject({ tier: 'premium', loading: false });
    await act(async () => m.root.update(ui('u2')));
    expect(seen).toEqual({ tier: 'free', renewal: null, loading: true });
  });

  it('passes on that the subscription is in its free trial', async () => {
    const payments = fakePayments({
      watch: vi.fn((_id: string | null, f: (s: WatchState) => void) => {
        f({ tier: 'premium', source: 'store', server: null, renewal: { until: '2030-01-01T00:00:00Z', willRenew: true, trial: true } });
        return () => undefined;
      }),
    });
    let trial: boolean | undefined;
    function Probe() {
      trial = useSubscription().renewal?.trial;
      return null;
    }
    await mount(
      <SubscriptionProvider config={config} payments={payments} userId="u1">
        <Probe />
      </SubscriptionProvider>,
    );
    expect(trial).toBe(true);
  });
});
