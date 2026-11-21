// Code review 2026-11-21: rows 36 (billing issue), 37 (stay percent), 50 (stale server row), 84 (SubscriptionRow results),
// 83 (trial length in months) and 11 (no store while sign-in is loading).
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_STRINGS, PlansScreen, PremiumPage, SubscriptionProvider, SubscriptionRow, defineSubscription, offerSaving, statusLines, subscriptionTerms, useSubscription } from '../src';
import { act, fakePayments, mount, plan, press } from './render';

const config = defineSubscription({
  features: { effects: 'premium' },
  plans: [
    { id: 'yearly', tier: 'premium', label: 'Yearly' },
    { id: 'monthly', tier: 'premium', label: 'Monthly' },
  ],
});
const app = (ui: React.ReactNode, payments = fakePayments(), userId: string | null | 'loading' = 'u1') => (
  <SubscriptionProvider config={config} payments={payments} userId={userId === 'loading' ? undefined : userId}>
    {ui}
  </SubscriptionProvider>
);
const now = new Date('2026-11-21T10:00:00Z');
const future = '2099-01-15T12:00:00Z';
const past = '2026-01-01T00:00:00Z';
const features = [{ key: 'effects', label: 'Background Effects' }];

describe('a payment problem shows without a server (row 36)', () => {
  const issue = { until: future, willRenew: true, productId: 'x_monthly', billingIssue: true };

  it('statusLines puts the payment note first from the store alone', () => {
    const l = statusLines({ tierLabel: 'Premium', server: null, renewal: issue, plans: config.plans, strings: DEFAULT_STRINGS, now });
    expect(l.note).toBe(DEFAULT_STRINGS.graceNote);
  });

  it('the Premium page and SubscriptionRow ask the person to update their payment', async () => {
    const payments = fakePayments();
    const m = await mount(app(<><PremiumPage onOpenPlans={vi.fn()} features={features} /><SubscriptionRow onOpenPlans={vi.fn()} /></>, payments));
    await act(async () => payments.emit({ tier: 'premium', source: 'store', renewal: issue }));
    // The status card, the Subscription section and the Settings row.
    expect(m.texts().filter((t) => t === DEFAULT_STRINGS.graceNote).length).toBe(3);
    await act(async () => payments.emit({ tier: 'premium', source: 'store', renewal: { ...issue, billingIssue: undefined } }));
    expect(m.shown(DEFAULT_STRINGS.graceNote)).toBe(false);
  });
});

describe('a stale server row never overrides the store (row 50)', () => {
  it('a row still saying "renews" loses to the store that already shows the cancel', () => {
    const t = subscriptionTerms({ server: { tier: 'premium', activeUntil: future, status: 'active', willRenew: true }, renewal: { until: future, willRenew: false }, source: 'store', now });
    expect(t).toEqual({ ending: true, until: future, billingIssue: false });
  });

  it('an expired or refunded row is ignored while the store gives the tier', () => {
    const t = subscriptionTerms({ server: { tier: 'premium', activeUntil: past, status: 'expired', willRenew: false }, renewal: { until: future, willRenew: true }, source: 'store', now });
    expect(t).toEqual({ ending: false, until: future, billingIssue: false });
  });

  it('the row counts when it gives the tier, and the later of the two dates wins', () => {
    const row = { tier: 'premium', activeUntil: '2099-06-01T00:00:00Z', status: 'active', willRenew: false };
    expect(subscriptionTerms({ server: row, renewal: null, source: 'account', now })).toMatchObject({ ending: true, until: row.activeUntil });
    expect(subscriptionTerms({ server: row, renewal: { until: future, willRenew: true }, source: 'store', now })).toMatchObject({ ending: true, until: row.activeUntil });
  });

  it('the Premium page shows Cancel and the store date, never "Renew" or a date already past', async () => {
    const payments = fakePayments();
    const m = await mount(app(<PremiumPage onOpenPlans={vi.fn()} features={features} />, payments));
    await act(async () => payments.emit({ tier: 'premium', source: 'store', server: { tier: 'premium', activeUntil: past, status: 'expired', willRenew: false }, renewal: { until: future, willRenew: true, productId: 'x_monthly' } }));
    expect(m.shown(DEFAULT_STRINGS.cancelSubscription)).toBe(true);
    expect(m.shown(DEFAULT_STRINGS.renewSubscription)).toBe(false);
    expect(m.texts().some((t) => t.includes('2026'))).toBe(false);
  });

  it('SubscriptionRow leaves a past date out', async () => {
    const payments = fakePayments();
    const m = await mount(app(<SubscriptionRow onOpenPlans={vi.fn()} />, payments));
    await act(async () => payments.emit({ tier: 'premium', source: 'store', server: { tier: 'premium', activeUntil: past, status: 'cancelled', willRenew: false }, renewal: null }));
    expect(m.shown('Ends')).toBe(false);
    expect(m.shown('Renews')).toBe(false);
  });
});

describe('the stay offer percent is per month (row 37)', () => {
  const monthly = plan('monthly', 'premium', 3.99, 1);

  it('a pay-up-front offer is compared month for month', () => {
    // 3 months for $5.99 on the $3.99 Monthly plan: about $2.00 a month, so 50% off (it read -50% before).
    expect(offerSaving({ price: 5.99, period: { unit: 'MONTH', count: 3 }, plan: monthly })).toBe(50);
    expect(offerSaving({ price: 1.99, period: { unit: 'MONTH', count: 1 }, plan: monthly })).toBe(50);
    expect(offerSaving({ price: 0, period: { unit: 'MONTH', count: 3 }, plan: monthly })).toBe(100);
    expect(offerSaving({ price: 14.99, period: { unit: 'MONTH', count: 3 }, plan: monthly })).toBe(0);
  });

  it('Before You Go says the right percent, and leaves out an offer that saves nothing', async () => {
    const offer = (price: number) => ({ id: 'stay', plan: plan('monthly', 'premium', 3.99, 1), priceString: `$${price}`, price, period: { unit: 'MONTH' as const, count: 3 }, cycles: 1 });
    const loadPlans = vi.fn(async () => [plan('yearly', 'premium', 29.99, 12), plan('monthly', 'premium', 3.99, 1)]);
    for (const [price, shown] of [[5.99, 'Stay for 50% Off'], [14.99, null]] as const) {
      const payments = fakePayments({ loadPlans, loadOffer: vi.fn(async () => offer(price)), buyOffer: vi.fn() });
      const m = await mount(app(<PremiumPage onOpenPlans={vi.fn()} features={features} loseList={['Effects']} stayOfferId="stay" />, payments));
      await act(async () => payments.emit({ tier: 'premium', source: 'store', renewal: { until: future, willRenew: true, productId: 'x_monthly' } }));
      await press(m.button(DEFAULT_STRINGS.cancelSubscription));
      expect(m.shown(DEFAULT_STRINGS.beforeYouGo)).toBe(true);
      expect(m.texts().some((t) => t.startsWith('Stay for'))).toBe(shown !== null);
      if (shown) expect(m.shown(shown)).toBe(true);
    }
  });
});

describe('SubscriptionRow says what Restore, a code and Manage did (row 84)', () => {
  it('nothing to restore, restored, a store message, and a failure', async () => {
    const restore = vi.fn(async () => ({ ok: true as const, tier: 'free' }));
    const payments = fakePayments({ restore });
    const m = await mount(app(<SubscriptionRow onOpenPlans={vi.fn()} />, payments));
    await press(m.button(DEFAULT_STRINGS.restore));
    expect(m.shown(DEFAULT_STRINGS.nothingToRestore)).toBe(true);
    restore.mockResolvedValueOnce({ ok: true, tier: 'premium' });
    await press(m.button(DEFAULT_STRINGS.restore));
    expect(m.shown(DEFAULT_STRINGS.restored('Premium'))).toBe(true);
    restore.mockResolvedValueOnce({ ok: false, cancelled: false, message: 'No internet connection. Please try again.' } as never);
    await press(m.button(DEFAULT_STRINGS.restore));
    expect(m.shown('No internet connection. Please try again.')).toBe(true);
    restore.mockRejectedValueOnce(new Error('offline'));
    await press(m.button(DEFAULT_STRINGS.restore));
    expect(m.shown(DEFAULT_STRINGS.pricesFailed)).toBe(true);
  });

  it('a code sheet or manage screen that fails to open says so instead of an unhandled error', async () => {
    const payments = fakePayments({ redeemCode: vi.fn(async () => { throw new Error('x'); }) });
    const m = await mount(app(<SubscriptionRow onOpenPlans={vi.fn()} />, payments));
    await press(m.button(DEFAULT_STRINGS.haveCode));
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    expect(m.shown(DEFAULT_STRINGS.pricesFailed)).toBe(true);
  });
});

describe('a trial of months says months (row 83)', () => {
  it('"Start 1-month free trial", not 30 days', async () => {
    const yearly = { ...plan('yearly', 'premium', 39.99, 12, 30), trial: { unit: 'MONTH' as const, count: 1 } };
    const payments = fakePayments({ loadPlans: vi.fn(async () => [yearly, plan('monthly', 'premium', 6.99, 1)]) });
    const m = await mount(app(<PlansScreen onOpenTerms={vi.fn()} onOpenPrivacy={vi.fn()} />, payments));
    expect(m.shown('Start 1-month free trial')).toBe(true);
    expect(m.shown('Start 30-day free trial')).toBe(false);
    expect(m.shown('Free for 1 month, then $39.99 a year. Cancel any time.')).toBe(true);
  });
});

describe('nothing is asked of the store while sign-in is loading (row 11)', () => {
  it('userId undefined: no watch, still loading; the account then starts it', async () => {
    const payments = fakePayments();
    let loading: boolean | undefined;
    const Probe = () => { loading = useSubscription().loading; return null; };
    const m = await mount(app(<Probe />, payments, 'loading'));
    expect(payments.watch).not.toHaveBeenCalled();
    expect(loading).toBe(true);
    await act(async () => m.root.update(app(<Probe />, payments, 'u1')));
    expect(payments.watch).toHaveBeenCalledWith('u1', expect.any(Function));
    expect(loading).toBe(false);
  });
});
