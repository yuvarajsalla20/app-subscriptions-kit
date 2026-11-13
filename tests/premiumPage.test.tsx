import { describe, expect, it, vi } from 'vitest';
import { Pressable, Text } from 'react-native';
import { DEFAULT_STRINGS, PlanBadge, PremiumPage, SubscriptionProvider, UPDATED_MS, defineSubscription, statusLines, useSubscription } from '../src';
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

  it('dates carry the year and name the plan; Renew says what turning auto-renew on does', async () => {
    const payments = fakePayments();
    const m = await mount(page(payments));
    await act(async () => payments.emit(renewing));
    expect(m.shown('You keep Premium Monthly until Jan 15, 2099')).toBe(true);
    await act(async () => payments.emit(ended));
    expect(m.shown('Turn auto-renew back on to keep Premium Monthly after Jan 15, 2099')).toBe(true);
    expect(m.texts().some((t) => t.startsWith('What You Lose After') && t.includes('2099'))).toBe(false); // no lose list passed
  });

  it('says it is updating after the manage screen closes, until the change shows', async () => {
    const payments = fakePayments();
    const m = await mount(page(payments, vi.fn(), vi.fn(), { beforeCancel: false }));
    await act(async () => payments.emit(renewing));
    await press(m.button(DEFAULT_STRINGS.cancelSubscription));
    expect(m.shown(DEFAULT_STRINGS.updatingSubscription)).toBe(true);
    await act(async () => payments.emit(ended));
    expect(m.shown(DEFAULT_STRINGS.updatingSubscription)).toBe(false);
  });

  it('the box says what changed: confetti and the renew date after Renew, a calm line after Cancel', async () => {
    vi.useFakeTimers();
    try {
      const payments = fakePayments();
      const m = await mount(page(payments, vi.fn(), vi.fn(), { beforeCancel: false }));
      await act(async () => payments.emit(ended));
      await press(m.button(DEFAULT_STRINGS.renewSubscription));
      expect(m.shown(DEFAULT_STRINGS.updatingBody('Apple'))).toBe(true);
      await act(async () => payments.emit(renewing));
      expect(m.shown(DEFAULT_STRINGS.allSet)).toBe(true);
      expect(m.shown('Premium Monthly renews on Jan 15, 2099')).toBe(true);
      expect(m.shown(DEFAULT_STRINGS.updatingSubscription)).toBe(false);
      await act(async () => { await vi.advanceTimersByTimeAsync(UPDATED_MS + 100); });
      expect(m.shown(DEFAULT_STRINGS.allSet)).toBe(false);
      await press(m.button(DEFAULT_STRINGS.cancelSubscription));
      await act(async () => payments.emit(ended));
      expect(m.shown(DEFAULT_STRINGS.subscriptionUpdated)).toBe(true);
      expect(m.shown('You keep Premium Monthly until Jan 15, 2099')).toBe(true);
      expect(m.shown(DEFAULT_STRINGS.allSet)).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('the app can swap the swinging art', async () => {
    const payments = fakePayments();
    const m = await mount(page(payments, vi.fn(), vi.fn(), { beforeCancel: false, updatingArt: <Text>Bells</Text> }));
    await act(async () => payments.emit(renewing));
    await press(m.button(DEFAULT_STRINGS.cancelSubscription));
    expect(m.shown('Bells')).toBe(true);
  });

  it('PlanBadge names the plan once paid, Free otherwise', async () => {
    const payments = fakePayments();
    const m = await mount(
      <SubscriptionProvider config={config} payments={payments} userId="u1">
        <PlanBadge />
      </SubscriptionProvider>,
    );
    expect(m.shown('Free')).toBe(true);
    await act(async () => payments.emit(renewing));
    expect(m.shown('Monthly')).toBe(true);
    expect(m.label('Monthly')).toBeTruthy();
  });

  it('the updating line goes by itself when nothing changed', async () => {
    vi.useFakeTimers();
    try {
      const payments = fakePayments();
      const m = await mount(page(payments, vi.fn(), vi.fn(), { beforeCancel: false }));
      await act(async () => payments.emit(renewing));
      await press(m.button(DEFAULT_STRINGS.cancelSubscription));
      expect(m.shown(DEFAULT_STRINGS.updatingSubscription)).toBe(true);
      await act(async () => { await vi.advanceTimersByTimeAsync(21_000); });
      expect(m.shown(DEFAULT_STRINGS.updatingSubscription)).toBe(false);
    } finally {
      vi.useRealTimers();
    }
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

  it('a yearly subscriber never sees the monthly stay offer or a move down', async () => {
    const loadOffer = vi.fn(async () => offer); // the offer is on the monthly plan
    const payments = fakePayments({ loadOffer, buyOffer: vi.fn() });
    const m = await mount(page(payments, vi.fn(), vi.fn(), { loseList: ['7 extra sounds'], stayOfferId: 'stay' }));
    await act(async () => payments.emit({ ...renewing, renewal: { ...renewing.renewal, productId: 'x_yearly' } }));
    expect(m.texts().some((t) => t.startsWith('Monthly ·'))).toBe(false);
    // Nothing longer to move up to: no Change Plan row, only Cancel and Restore.
    expect(m.shown(DEFAULT_STRINGS.changePlan)).toBe(false);
    expect(m.shown(DEFAULT_STRINGS.restoreSubscription)).toBe(true);
    await press(m.button(DEFAULT_STRINGS.cancelSubscription));
    expect(m.shown(DEFAULT_STRINGS.beforeYouGo)).toBe(true);
    expect(m.shown('Stay for 50% Off')).toBe(false);
  });

  it('a booked switch shows on the status card and in Change Plan', async () => {
    const payments = fakePayments();
    let switchTo: () => Promise<unknown> = async () => undefined;
    const Grab = () => { const sub = useSubscription(); switchTo = () => sub.switchPlan(plan('yearly', 'premium', 39.99, 12)); return null; };
    const m = await mount(
      <SubscriptionProvider config={config} payments={payments} userId="u1">
        <Grab />
        <PremiumPage onOpenPlans={vi.fn()} features={features()} />
      </SubscriptionProvider>,
    );
    await act(async () => payments.emit(renewing));
    await act(async () => { await switchTo(); });
    expect(m.texts().some((t) => t.startsWith('→ Switching to Yearly on '))).toBe(true);
    expect(m.texts().some((t) => t.startsWith('Yearly Starts '))).toBe(true);
    expect(m.shown('Save 52%')).toBe(false);
  });

  it('a second tap on Cancel while the store sheet is open does nothing', async () => {
    let close: () => void = () => undefined;
    const payments = fakePayments({ openManage: vi.fn(() => new Promise<void>((r) => { close = r; })) });
    const m = await mount(page(payments, vi.fn(), vi.fn(), { beforeCancel: false }));
    await act(async () => payments.emit(renewing));
    const cancel = m.button(DEFAULT_STRINGS.cancelSubscription)!;
    await act(async () => { cancel.props.onPress(); cancel.props.onPress(); });
    expect(payments.openManage).toHaveBeenCalledOnce();
    await act(async () => close());
    await press(m.button(DEFAULT_STRINGS.cancelSubscription));
    expect(payments.openManage).toHaveBeenCalledTimes(2);
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

  it('the default mark is the king and queen crowns; an icon replaces them', async () => {
    const svgs = (m: Awaited<ReturnType<typeof mount>>) => m.root.root.findAll((n) => n.type === 'Svg').length;
    const m = await mount(page());
    expect(svgs(m)).toBeGreaterThan(0);
    const own = await mount(page(fakePayments(), vi.fn(), vi.fn(), { icon: <Text>★</Text> }));
    expect(svgs(own)).toBe(0);
    expect(own.shown('★')).toBe(true);
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
