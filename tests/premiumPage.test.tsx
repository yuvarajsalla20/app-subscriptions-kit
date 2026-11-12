import { describe, expect, it, vi } from 'vitest';
import { Pressable, Text } from 'react-native';
import { DEFAULT_STRINGS, PremiumPage, SubscriptionProvider, defineSubscription, statusLines, useSubscription } from '../src';
import { act, fakePayments, mount, plan, press } from './render';

const config = defineSubscription({
  features: { effects: 'premium' },
  plans: [
    { id: 'yearly', tier: 'premium', label: 'Yearly' },
    { id: 'monthly', tier: 'premium', label: 'Monthly' },
  ],
});
const fmt = () => 'Nov 12, 11:35 PM';
const now = new Date('2026-11-12T10:00:00Z');
const later = '2026-11-13T05:35:00Z';

describe('statusLines', () => {
  const base = { tierLabel: 'Premium', server: null, plans: config.plans, strings: DEFAULT_STRINGS, now, format: fmt };

  it('names the plan from the store product and says when it renews', () => {
    const l = statusLines({ ...base, renewal: { until: later, willRenew: true, productId: 'app_monthly' } });
    expect(l).toEqual({ title: 'You have Premium', plan: 'Monthly plan', when: 'Renews Nov 12, 11:35 PM', ending: false, note: '' });
  });

  it('says when it ends once auto-renew is off', () => {
    const l = statusLines({ ...base, renewal: { until: later, willRenew: false, productId: 'app_yearly' } });
    expect(l).toMatchObject({ plan: 'Yearly plan', when: 'Ends Nov 12, 11:35 PM', ending: true, note: DEFAULT_STRINGS.endsNote });
  });

  it('leaves out an unknown or past date, and puts a payment problem first', () => {
    expect(statusLines({ ...base, renewal: null })).toMatchObject({ plan: '', when: '', note: '' });
    expect(statusLines({ ...base, renewal: { until: '2026-01-01T00:00:00Z', willRenew: true, productId: null } }).when).toBe('');
    const grace = statusLines({ ...base, renewal: null, server: { tier: 'premium', activeUntil: later, status: 'grace', willRenew: false } });
    expect(grace.note).toBe(DEFAULT_STRINGS.graceNote);
  });
});

describe('PremiumPage', () => {
  const features = (onChange = vi.fn()) => [
    { key: 'effects', label: 'Background Effects', toggle: { value: true, onChange } },
    { key: 'sounds', label: 'More Alert Sounds', detail: '7 extra sounds' },
  ];
  const page = (payments = fakePayments(), onOpenPlans = vi.fn(), onChange = vi.fn(), extra: Record<string, unknown> = {}) => (
    <SubscriptionProvider config={config} payments={payments} userId="u1">
      <PremiumPage onOpenPlans={onOpenPlans} features={features(onChange)} {...extra} />
    </SubscriptionProvider>
  );
  const renewing = { tier: 'premium', source: 'store' as const, renewal: { until: '2099-01-15T12:00:00Z', willRenew: true, productId: 'x_monthly' } };
  const ended = { tier: 'premium', source: 'store' as const, renewal: { until: '2099-01-15T12:00:00Z', willRenew: false, productId: 'x_monthly' } };
  const offer = { id: 'stay', plan: plan('monthly', 'premium', 6.99, 1), priceString: '$3.49', price: 3.49, period: { unit: 'MONTH' as const, count: 1 }, cycles: 3 };

  it('free: Get Premium with store prices, See Plans first, features open with locks', async () => {
    const onOpenPlans = vi.fn();
    const m = await mount(page(fakePayments(), onOpenPlans));
    expect(m.shown('You have Premium')).toBe(false);
    expect(m.shown('Get Premium')).toBe(true);
    expect(m.shown('From $6.99/month')).toBe(true);
    expect(m.shown('$6.99/month or $39.99/year')).toBe(true);
    expect(m.shown(DEFAULT_STRINGS.restoreSubscription)).toBe(true);
    expect(m.shown(DEFAULT_STRINGS.cancelSubscription)).toBe(false);
    await press(m.button(DEFAULT_STRINGS.unlock));
    await press(m.label(`More Alert Sounds, ${DEFAULT_STRINGS.lockedLabel}`));
    expect(onOpenPlans).toHaveBeenCalledTimes(2);
  });

  it('paid: status card, features closed until tapped, Change Plan shows the saving', async () => {
    const payments = fakePayments();
    const onChange = vi.fn();
    const m = await mount(page(payments, vi.fn(), onChange));
    await act(async () => payments.emit(renewing));
    expect(m.shown('You have Premium')).toBe(true);
    expect(m.shown('Monthly plan')).toBe(true);
    expect(m.texts().some((t) => t.startsWith('Renews '))).toBe(true);
    expect(m.shown('Background Effects')).toBe(false);
    await press(m.button('Premium Features'));
    expect(m.shown(`✓ ${DEFAULT_STRINGS.included}`)).toBe(true);
    await press(m.label('Background Effects'));
    expect(onChange).toHaveBeenCalledWith(false);
    expect(m.shown('Yearly · $39.99/year')).toBe(true);
    expect(m.shown('Save 52%')).toBe(true);
  });

  it('Cancel Subscription goes straight to the store when Before You Go has nothing to show', async () => {
    const payments = fakePayments();
    const m = await mount(page(payments, vi.fn(), vi.fn(), { beforeCancel: false }));
    await act(async () => payments.emit(renewing));
    await press(m.button(DEFAULT_STRINGS.cancelSubscription));
    expect(payments.openManage).toHaveBeenCalled();
  });

  it('Before You Go: what is lost, the stay offer, Keep Premium and Continue to Cancel', async () => {
    const payments = fakePayments({ loadOffer: vi.fn(async (id: string) => (id === 'stay' ? offer : null)), buyOffer: vi.fn(async () => ({ ok: true as const, tier: 'premium' })) });
    const m = await mount(page(payments, vi.fn(), vi.fn(), { loseList: ['7 extra sounds'], stayOfferId: 'stay' }));
    await act(async () => payments.emit(renewing));
    await press(m.button(DEFAULT_STRINGS.cancelSubscription));
    expect(payments.openManage).not.toHaveBeenCalled();
    expect(m.shown(DEFAULT_STRINGS.beforeYouGo)).toBe(true);
    expect(m.shown('• 7 extra sounds')).toBe(true);
    expect(m.shown('Stay for 50% Off')).toBe(true);
    expect(m.shown('$3.49/month for 3 months')).toBe(true);
    expect(m.shown('Switch to Yearly')).toBe(true);
    await press(m.button('Stay for 50% Off'));
    expect(payments.buyOffer).toHaveBeenCalledWith(offer);
    await press(m.button(DEFAULT_STRINGS.cancelSubscription));
    await press(m.button(DEFAULT_STRINGS.continueToCancel));
    expect(payments.openManage).toHaveBeenCalledOnce();
  });

  it('after a cancel: Ends, Renew Subscription first and what is lost', async () => {
    const payments = fakePayments();
    const m = await mount(page(payments, vi.fn(), vi.fn(), { loseList: ['Data Export'] }));
    await act(async () => payments.emit(ended));
    expect(m.texts().some((t) => t.startsWith('Ends '))).toBe(true);
    expect(m.shown(DEFAULT_STRINGS.endsNote)).toBe(true);
    expect(m.shown('• Data Export')).toBe(true);
    await press(m.button(DEFAULT_STRINGS.renewSubscription));
    expect(payments.openManage).toHaveBeenCalled();
  });

  it('Restore answers every time: checking, then all set for a subscriber', async () => {
    let finish: (r: { ok: true; tier: string }) => void = () => undefined;
    const payments = fakePayments({ restore: vi.fn(() => new Promise((r) => { finish = r; })) });
    const m = await mount(page(payments));
    await act(async () => payments.emit(renewing));
    expect(m.shown(DEFAULT_STRINGS.restoreHintPaid('Premium'))).toBe(true);
    const tap = m.button(DEFAULT_STRINGS.restoreSubscription)!;
    await act(async () => { void tap.props.onPress(); });
    expect(m.shown(DEFAULT_STRINGS.restoreChecking('App Store'))).toBe(true);
    // While checking the row takes no second tap.
    expect(m.label(`${DEFAULT_STRINGS.restoreSubscription}. ${DEFAULT_STRINGS.restoreChecking('App Store')}`).props.onPress).toBeUndefined();
    expect(payments.restore).toHaveBeenCalledOnce();
    await act(async () => finish({ ok: true, tier: 'premium' }));
    expect(m.shown(DEFAULT_STRINGS.restoreAllSet('Premium', 'Apple ID'))).toBe(true);
  });

  it('Restore on a free account: restored, nothing found, or failed', async () => {
    const restore = vi.fn()
      .mockResolvedValueOnce({ ok: true, tier: 'free' })
      .mockResolvedValueOnce({ ok: false, cancelled: false, message: 'offline' })
      .mockResolvedValueOnce({ ok: true, tier: 'premium' });
    const onError = vi.fn();
    const m = await mount(page(fakePayments({ restore }), vi.fn(), vi.fn(), { onError }));
    expect(m.shown(DEFAULT_STRINGS.restoreHint)).toBe(true);
    await press(m.button(DEFAULT_STRINGS.restoreSubscription));
    expect(m.shown(DEFAULT_STRINGS.restoreNone('Apple ID'))).toBe(true);
    await press(m.button(DEFAULT_STRINGS.restoreSubscription));
    expect(m.shown(DEFAULT_STRINGS.restoreFailed('App Store'))).toBe(true);
    expect(onError).toHaveBeenCalledOnce();
    await press(m.button(DEFAULT_STRINGS.restoreSubscription));
    expect(m.shown(DEFAULT_STRINGS.restoreDone('Premium'))).toBe(true);
  });

  it('a first purchase shows the welcome card until Start Exploring', async () => {
    const payments = fakePayments();
    const Buy = () => {
      const sub = useSubscription();
      return <Pressable onPress={() => sub.buy(plan('monthly', 'premium', 6.99, 1))}><Text>Buy</Text></Pressable>;
    };
    const m = await mount(
      <SubscriptionProvider config={config} payments={payments} userId="u1">
        <Buy />
        <PremiumPage onOpenPlans={vi.fn()} features={features()} />
      </SubscriptionProvider>,
    );
    await press(m.button('Buy'));
    expect(m.shown('Welcome to Premium')).toBe(true);
    await press(m.button(DEFAULT_STRINGS.startExploring));
    expect(m.shown('Welcome to Premium')).toBe(false);
    expect(m.shown('You have Premium')).toBe(true);
  });
});
