import { describe, expect, it, vi } from 'vitest';
import { Pressable, Text } from 'react-native';
import { Crowns, DEFAULT_STRINGS, yourPlanLines, PlanBadge, PremiumPill, PremiumPage, SubscriptionProvider, SETTLE_MS, UNCONFIRMED_MS, UPDATED_MS, defineSubscription, statusLines, useSubscription } from '../src';
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
    expect(l).toEqual({ title: 'You Have Premium', plan: 'Monthly Plan', when: 'Renews Nov 12, 11:35 PM', ending: false, note: '' });
  });

  it('says when it ends once auto-renew is off', () => {
    const l = statusLines({ ...base, renewal: { until: later, willRenew: false, productId: 'app_yearly' } });
    expect(l).toMatchObject({ plan: 'Yearly Plan', when: 'Ends Nov 12, 11:35 PM', ending: true, note: DEFAULT_STRINGS.endsNote });
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
    { key: 'effects', label: 'Background Effects', inPreferences: true },
    { key: 'sounds', label: 'More Alert Sounds', detail: '7 extra sounds' },
  ];
  const page = (payments = fakePayments(), onOpenPlans = vi.fn(), onChange = vi.fn(), extra: Record<string, unknown> = {}) => (
    <SubscriptionProvider planMode="subscription" config={config} payments={payments} userId="u1">
      <PremiumPage onOpenPlans={onOpenPlans} features={features(onChange)} {...extra} />
    </SubscriptionProvider>
  );
  const renewing = { tier: 'premium', source: 'store' as const, renewal: { until: '2099-01-15T12:00:00Z', willRenew: true, productId: 'x_monthly' } };
  const ended = { tier: 'premium', source: 'store' as const, renewal: { until: '2099-01-15T12:00:00Z', willRenew: false, productId: 'x_monthly' } };
  const offer = { id: 'stay', plan: plan('monthly', 'premium', 6.99, 1), priceString: '$3.49', price: 3.49, period: { unit: 'MONTH' as const, count: 1 }, cycles: 3 };

  it('free: Get Premium with store prices and See Plans first; 3.0.0: no feature list (the settings kit compares Free and Premium)', async () => {
    const onOpenPlans = vi.fn();
    const m = await mount(page(fakePayments(), onOpenPlans));
    expect(m.shown('You Have Premium')).toBe(false);
    // 11.0.0: the Your Plan card comes first, in the Get Premium pattern, and names the free plan.
    expect(m.shown('Free Plan')).toBe(true);
    expect(m.shown(DEFAULT_STRINGS.yourCurrentPlan)).toBe(true);
    expect(m.shown(DEFAULT_STRINGS.freeIncluded)).toBe(true);
    expect(m.label('Your Plan. Free Plan. Your Current Plan. Every free feature is included.')).toBeTruthy();
    expect(m.texts().indexOf('Free Plan')).toBeLessThan(m.texts().indexOf('Get Premium'));
    expect(m.shown('Get Premium')).toBe(true);
    expect(m.shown('From $6.99/month')).toBe(true);
    expect(m.shown('$6.99/month or $39.99/year')).toBe(true);
    expect(m.shown(DEFAULT_STRINGS.restoreSubscription)).toBe(true);
    expect(m.shown(DEFAULT_STRINGS.cancelSubscription)).toBe(false);
    expect(m.shown(DEFAULT_STRINGS.restoreHint)).toBe(true);
    await press(m.button(DEFAULT_STRINGS.unlock));
    expect(onOpenPlans).toHaveBeenCalledTimes(1);
    expect(m.shown('More Alert Sounds')).toBe(false);
    expect(m.shown('Background Effects')).toBe(false);
    expect(m.shown(DEFAULT_STRINGS.premiumSettings('Premium'))).toBe(false);
  });

  it('paid (8.0.0): Your Plan card, every feature under Included With Premium with no switch, then Manage, then Cancel last', async () => {
    const payments = fakePayments();
    const onChange = vi.fn();
    const m = await mount(page(payments, vi.fn(), onChange));
    await act(async () => payments.emit(renewing));
    expect(m.shown('Premium Monthly')).toBe(true);
    expect(m.shown(DEFAULT_STRINGS.planActive)).toBe(true);
    expect(m.texts().some((t) => t.startsWith('Renews ') && t.endsWith('2099'))).toBe(true);
    expect(m.shown(DEFAULT_STRINGS.manageHeading)).toBe(true);
    expect(m.shown('Included With Premium')).toBe(true);
    expect(m.shown('Premium Settings')).toBe(false);
    expect(m.shown('Background Effects')).toBe(true);
    expect(m.shown('More Alert Sounds')).toBe(true);
    expect(m.label('Background Effects. Included')).toBeTruthy();
    // No switch on the plan page: the setting lives in Preferences, and the line under the list says so.
    expect(m.root.root.findAll((n) => n.type === 'Switch')).toHaveLength(0);
    expect(m.shown('Background Effects is set in Settings, under Preferences.')).toBe(true);
    expect(m.shown(DEFAULT_STRINGS.manageHeading)).toBe(true);
    expect(m.shown('Yearly · $39.99/year')).toBe(true);
    expect(m.shown('Save 52%')).toBe(true);
    // Cancel comes after Change Plan and Restore Purchases, as a row, with the end date under it.
    const t = m.texts();
    expect(t.indexOf(DEFAULT_STRINGS.cancelSubscription)).toBeGreaterThan(t.indexOf(DEFAULT_STRINGS.restoreSubscription));
    expect(t.lastIndexOf(DEFAULT_STRINGS.cancelSubscription)).toBe(t.indexOf(DEFAULT_STRINGS.cancelSubscription));
    expect(t.indexOf('You keep Premium Monthly until Jan\u00A015,\u00A02099.')).toBeGreaterThan(t.indexOf(DEFAULT_STRINGS.cancelSubscription));
  });

  it('names several Preferences features in one line', () => {
    expect(DEFAULT_STRINGS.setInPreferences(['Background Effects', 'Falling Names', 'Workspaces'])).toBe('Background Effects, Falling Names and Workspaces are set in Settings, under Preferences.');
  });

  it('a feature with onPress opens its page once paid, and is not shown before', async () => {
    const onOpen = vi.fn();
    const onOpenPlans = vi.fn();
    const withLink = [{ key: 'export', label: 'Data Export', detail: 'CSV or PDF', onPress: onOpen }];
    const payments = fakePayments();
    const m = await mount(
      <SubscriptionProvider planMode="subscription" config={config} payments={payments} userId="u1">
        <PremiumPage onOpenPlans={onOpenPlans} features={withLink} />
      </SubscriptionProvider>,
    );
    expect(m.shown('Data Export')).toBe(false);
    await act(async () => payments.emit(renewing));
    expect(m.shown('CSV or PDF')).toBe(true);
    await press(m.label('Data Export. CSV or PDF. Included'));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('Cancel Subscription goes straight to the store when Before You Go has nothing to show', async () => {
    const payments = fakePayments();
    const m = await mount(page(payments, vi.fn(), vi.fn(), { beforeCancel: false }));
    await act(async () => payments.emit(renewing));
    await press(m.button(DEFAULT_STRINGS.cancelSubscription));
    expect(payments.openManage).toHaveBeenCalled();
  });

  it('dates carry the year, name the plan and never break; Renew says it in one short line', async () => {
    const payments = fakePayments();
    const m = await mount(page(payments));
    await act(async () => payments.emit(renewing));
    expect(m.shown('You keep Premium Monthly until Jan\u00A015,\u00A02099.')).toBe(true);
    await act(async () => payments.emit(ended));
    expect(m.shown('Keep Premium Monthly Beyond Jan\u00A015,\u00A02099')).toBe(true);
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
      expect(m.shown('You keep Premium Monthly until Jan 15, 2099.')).toBe(true);
      expect(m.shown(DEFAULT_STRINGS.allSet)).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows Updating the moment the store screen closes, and keeps it through a date-only change until auto-renew is back on', async () => {
    let closeSheet: () => void = () => {};
    let finish: () => void = () => {};
    const payments = fakePayments({ openManage: vi.fn((onClosed?: () => void) => new Promise<void>((done) => { closeSheet = () => onClosed?.(); finish = done; })) });
    const m = await mount(page(payments, vi.fn(), vi.fn(), { beforeCancel: false }));
    await act(async () => payments.emit(ended));
    await press(m.button(DEFAULT_STRINGS.renewSubscription));
    expect(m.shown(DEFAULT_STRINGS.updatingSubscription)).toBe(false); // Apple's sheet is still up
    await act(async () => closeSheet());
    expect(m.shown(DEFAULT_STRINGS.updatingSubscription)).toBe(true); // before the store is asked again
    // A fresher end date arrives first, auto-renew still off: still updating, nothing celebrated yet.
    await act(async () => payments.emit({ ...ended, renewal: { ...ended.renewal, until: '2099-01-15T13:00:00Z' } }));
    expect(m.shown(DEFAULT_STRINGS.updatingSubscription)).toBe(true);
    expect(m.shown(DEFAULT_STRINGS.allSet)).toBe(false);
    expect(m.shown(DEFAULT_STRINGS.renewSubscription)).toBe(true);
    // Auto-renew is on: the page and "You're All Set!" change together.
    await act(async () => payments.emit(renewing));
    expect(m.shown(DEFAULT_STRINGS.updatingSubscription)).toBe(false);
    expect(m.shown(DEFAULT_STRINGS.allSet)).toBe(true);
    expect(m.shown(DEFAULT_STRINGS.cancelSubscription)).toBe(true);
    await act(async () => finish());
    expect(m.shown(DEFAULT_STRINGS.updatingSubscription)).toBe(false);
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
      <SubscriptionProvider planMode="subscription" config={config} payments={payments} userId="u1">
        <PlanBadge />
      </SubscriptionProvider>,
    );
    expect(m.shown('Free')).toBe(true);
    await act(async () => payments.emit(renewing));
    expect(m.shown('Monthly')).toBe(true);
    expect(m.label('Monthly')).toBeTruthy();
  });

  it('PremiumPill has the crowns and the tier name by default', async () => {
    const m = await mount(
      <SubscriptionProvider planMode="subscription" config={config} payments={fakePayments()} userId="u1">
        <PremiumPill label="Premium" />
      </SubscriptionProvider>,
    );
    expect(m.shown('Premium')).toBe(true);
    expect(m.root.root.findAllByType(Crowns).length).toBe(1);
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

  it('when Apple is slow: a calm line after Updating, a recheck when the page opens again, and All Set once it answers', async () => {
    vi.useFakeTimers();
    try {
      const calm = DEFAULT_STRINGS.notConfirmedYet('Apple');
      // The store takes 25 seconds to answer after its screen closes.
      const openManage = vi.fn(async (onClosed?: () => void) => { onClosed?.(); await new Promise((r) => setTimeout(r, 25_000)); });
      const payments = fakePayments({ refresh: vi.fn(async () => undefined), openManage });
      const m = await mount(page(payments, vi.fn(), vi.fn(), { beforeCancel: false }));
      await act(async () => payments.emit(renewing));
      expect(m.shown(calm)).toBe(false);
      await press(m.button(DEFAULT_STRINGS.cancelSubscription));
      await act(async () => { await vi.advanceTimersByTimeAsync(21_000); });
      // The loader gives up waiting, but the page says so instead of going quiet.
      expect(m.shown(DEFAULT_STRINGS.updatingSubscription)).toBe(false);
      expect(m.shown(calm)).toBe(true);
      expect(payments.refresh).not.toHaveBeenCalled();
      // Leaving Settings and coming back (the app's provider stays): the line is still there and the store is asked again.
      const shell = (show: boolean) => (
        <SubscriptionProvider planMode="subscription" config={config} payments={payments} userId="u1">
          {show ? <PremiumPage onOpenPlans={vi.fn()} features={features()} beforeCancel={false} /> : null}
        </SubscriptionProvider>
      );
      await act(async () => m.root.update(shell(false)));
      expect(m.shown(calm)).toBe(false);
      await act(async () => m.root.update(shell(true)));
      expect(m.shown(calm)).toBe(true);
      expect(payments.refresh).toHaveBeenCalledOnce();
      // Apple answers late: the line goes and the page still confirms the change.
      await act(async () => payments.emit(ended));
      expect(m.shown(calm)).toBe(false);
      expect(m.shown(DEFAULT_STRINGS.subscriptionUpdated)).toBe(true);
      // Nothing is waiting any more: opening the page again asks nothing.
      await act(async () => m.root.update(shell(false)));
      await act(async () => m.root.update(shell(true)));
      expect(m.shown(calm)).toBe(false);
      expect(payments.refresh).toHaveBeenCalledOnce();
      // A slow store with nothing changed: the line waits a while and then goes by itself.
      await act(async () => { await vi.advanceTimersByTimeAsync(5_000); }); // the first store call ends
      await press(m.button(DEFAULT_STRINGS.renewSubscription));
      await act(async () => { await vi.advanceTimersByTimeAsync(21_000); });
      expect(m.shown(calm)).toBe(true);
      await act(async () => { await vi.advanceTimersByTimeAsync(5_000); }); // the store answers: the line stays
      expect(m.shown(calm)).toBe(true);
      await act(async () => { await vi.advanceTimersByTimeAsync(UNCONFIRMED_MS); });
      expect(m.shown(calm)).toBe(false);
      await act(async () => m.root.update(shell(false)));
      await act(async () => m.root.update(shell(true)));
      expect(m.shown(calm)).toBe(false);
      expect(payments.refresh).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });

  it("closing the store's screen with nothing changed: the loader shows briefly, then closes quietly, and a late change still confirms", async () => {
    vi.useFakeTimers();
    try {
      const calm = DEFAULT_STRINGS.notConfirmedYet('Apple');
      const payments = fakePayments({ openManage: vi.fn(async (onClosed?: () => void) => { onClosed?.(); await new Promise((r) => setTimeout(r, 800)); }) });
      const m = await mount(page(payments, vi.fn(), vi.fn(), { beforeCancel: false }));
      await act(async () => payments.emit(renewing));
      await press(m.button(DEFAULT_STRINGS.cancelSubscription));
      expect(m.shown(DEFAULT_STRINGS.updatingSubscription)).toBe(true);
      await act(async () => { await vi.advanceTimersByTimeAsync(1_000); });
      expect(m.shown(DEFAULT_STRINGS.updatingSubscription)).toBe(true); // never just a flash
      await act(async () => { await vi.advanceTimersByTimeAsync(600); });
      expect(m.shown(DEFAULT_STRINGS.updatingSubscription)).toBe(false);
      await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
      expect(m.shown(calm)).toBe(false);
      expect(m.shown(DEFAULT_STRINGS.updatingSubscription)).toBe(false);
      // The store passes a cancel on late: the page still says the change went through.
      await act(async () => payments.emit(ended));
      expect(m.shown(DEFAULT_STRINGS.subscriptionUpdated)).toBe(true);
      expect(m.shown(calm)).toBe(false);
      // The next time, the loader shows again.
      await act(async () => { await vi.advanceTimersByTimeAsync(3_000); });
      await press(m.button(DEFAULT_STRINGS.renewSubscription));
      expect(m.shown(DEFAULT_STRINGS.updatingSubscription)).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows the loader after the store closes in every app: quietAfterStore is gone (4.0.0)', async () => {
    const payments = fakePayments();
    // An app that still passes the old option gets the loader anyway.
    const m = await mount(page(payments, vi.fn(), vi.fn(), { beforeCancel: false, ...({ quietAfterStore: true } as object) }));
    await act(async () => payments.emit(renewing));
    await press(m.button(DEFAULT_STRINGS.cancelSubscription));
    expect(m.shown(DEFAULT_STRINGS.updatingSubscription)).toBe(true);
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
    // 2.0.0: a calm sentence, the price with words rather than "/year".
    expect(m.texts().some((x) => /^\$39\.99 a year, about \$3\.33 a month\.$/.test(x))).toBe(true);
    expect(m.shown('Other Options')).toBe(true);
    await press(m.button('Stay for 50% Off'));
    expect(payments.buyOffer).toHaveBeenCalledWith(offer);
    await press(m.button(DEFAULT_STRINGS.cancelSubscription));
    await press(m.button(DEFAULT_STRINGS.continueToCancel));
    // The store's sheet opens only once Before You Go has slid away (iPhone cannot show one sheet while another closes).
    expect(payments.openManage).not.toHaveBeenCalled();
    await act(async () => { await new Promise((r) => setTimeout(r, 750)); });
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
      <SubscriptionProvider planMode="subscription" config={config} payments={payments} userId="u1">
        <Grab />
        <PremiumPage onOpenPlans={vi.fn()} features={features()} />
      </SubscriptionProvider>,
    );
    await act(async () => payments.emit(renewing));
    await act(async () => { await switchTo(); });
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
    await act(async () => { await new Promise((r) => setTimeout(r, SETTLE_MS + 50)); }); // the loader's shortest time
    await press(m.button(DEFAULT_STRINGS.cancelSubscription));
    expect(payments.openManage).toHaveBeenCalledTimes(2);
  });

  it('after a cancel: Ends, Renew Subscription first and what is lost', async () => {
    const payments = fakePayments();
    const m = await mount(page(payments, vi.fn(), vi.fn(), { loseList: ['Data Export'] }));
    await act(async () => payments.emit(ended));
    expect(m.texts().some((t) => t.startsWith('Ends ') && t.endsWith('2099'))).toBe(true);
    expect(m.shown(DEFAULT_STRINGS.endingDetail('Premium'))).toBe(true);
    expect(m.shown(DEFAULT_STRINGS.planEnding)).toBe(true);
    expect(m.shown('• Data Export')).toBe(true);
    await press(m.button(DEFAULT_STRINGS.renewSubscription));
    expect(payments.openManage).toHaveBeenCalled();
  });

  it('the default mark is the king and queen crowns; an icon replaces them', async () => {
    const svgs = (m: Awaited<ReturnType<typeof mount>>) => m.root.root.findAll((n) => n.type === 'Svg').length;
    const m = await mount(page());
    expect(svgs(m)).toBeGreaterThan(0);
    const own = await mount(page(fakePayments(), vi.fn(), vi.fn(), { icon: <Text>★</Text> }));
    // 11.0.0: a free account's Your Plan card draws the free plan's shield, its only drawing; the crowns are replaced.
    expect(svgs(own)).toBe(1);
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

  it('2.1.0: names the store that bills the subscription, not the phone it is on', async () => {
    let finish: (r: { ok: true; tier: string }) => void = () => undefined;
    const payments = fakePayments({ restore: vi.fn(() => new Promise((r) => { finish = r; })) });
    const m = await mount(page(payments));
    await act(async () => payments.emit({ ...renewing, renewal: { ...renewing.renewal, billedBy: 'google_play' as const } }));
    const tap = m.button(DEFAULT_STRINGS.restoreSubscription)!;
    await act(async () => { void tap.props.onPress(); });
    expect(m.shown(DEFAULT_STRINGS.restoreChecking('Google Play'))).toBe(true);
    await act(async () => finish({ ok: true, tier: 'premium' }));
    expect(m.shown(DEFAULT_STRINGS.restoreAllSet('Premium', 'Google Account'))).toBe(true);
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
      <SubscriptionProvider planMode="subscription" config={config} payments={payments} userId="u1">
        <Buy />
        <PremiumPage onOpenPlans={vi.fn()} features={features()} />
      </SubscriptionProvider>,
    );
    await press(m.button('Buy'));
    expect(m.shown('Welcome to Premium')).toBe(true);
    await press(m.button(DEFAULT_STRINGS.startExploring));
    expect(m.shown('Welcome to Premium')).toBe(false);
    expect(m.root.root.findAll((n) => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Your Plan. ')).length).toBeGreaterThan(0);
  });

  it('7.0.0 Page rule: a switch or an editor passed to the Premium page is not drawn and is named in development', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    const withSwitch = [{ key: 'effects', label: 'Background Effects', toggle: { value: true, onChange: vi.fn() } }] as never;
    const payments = fakePayments();
    const m = await mount(
      <SubscriptionProvider planMode="subscription" config={config} payments={payments} userId="u1">
        <PremiumPage onOpenPlans={vi.fn()} features={withSwitch} />
      </SubscriptionProvider>,
    );
    await act(async () => payments.emit(renewing));
    expect(m.shown('Background Effects')).toBe(true);
    expect(warn.mock.calls.some(([w]) => String(w).includes('Page rule'))).toBe(true);
    delete (globalThis as { __DEV__?: boolean }).__DEV__;
    warn.mockRestore();
  });
});

describe('yourPlanLines (11.0.0)', () => {
  const store = [plan('monthly', 'premium', 3.99, 1), plan('yearly', 'premium', 29.99, 12)];
  const base = { tier: 'premium', tierLabel: 'Premium', paid: true, config, server: null, source: 'store' as const };
  const at = new Date('2026-11-23T12:00:00Z');

  it('a free account: Free Plan, Your Current Plan and what is included, no badge', () => {
    const l = yourPlanLines({ ...base, tier: 'free', tierLabel: 'Free', paid: false, renewal: null }, store, DEFAULT_STRINGS, at);
    expect(l).toEqual({ title: 'Free Plan', badge: '', status: 'Your Current Plan', ending: false, detail: 'Every free feature is included.', note: '' });
  });

  it('renewing: the plan, Active, the date, then the store price and the billing store', () => {
    const l = yourPlanLines({ ...base, renewal: { until: '2026-12-23T12:00:00Z', willRenew: true, productId: 'x_monthly', billedBy: 'google_play' } }, store, DEFAULT_STRINGS, at);
    expect(l.title).toBe('Premium Monthly');
    expect(l.badge).toBe('Active');
    expect(l.status).toMatch(/^Renews .*2026$/);
    expect(l.detail).toBe('$3.99/month. Billed through Google Play.');
    expect(l.ending).toBe(false);
  });

  it('a free trial leads with its end date; an ending plan says auto-renew is off', () => {
    const trial = yourPlanLines({ ...base, renewal: { until: '2026-11-30T12:00:00Z', willRenew: true, productId: 'x_yearly', trial: true, billedBy: 'app_store' } }, store, DEFAULT_STRINGS, at);
    expect(trial.badge).toBe('Trial');
    expect(trial.status).toMatch(/^Free Trial Ends .*2026$/);
    expect(trial.detail).toBe('Then $29.99/year. Billed through the App Store.');
    const ending = yourPlanLines({ ...base, renewal: { until: '2026-12-23T12:00:00Z', willRenew: false, productId: 'x_monthly' } }, store, DEFAULT_STRINGS, at);
    expect(ending.badge).toBe('Ending');
    expect(ending.status).toMatch(/^Ends .*2026$/);
    expect(ending.detail).toBe('Auto-renew is off. Premium stays until then.');
    expect(ending.ending).toBe(true);
  });

  it('leaves the price out when the store has not given it, and names a payment problem', () => {
    const l = yourPlanLines({ ...base, renewal: { until: '2026-12-23T12:00:00Z', willRenew: true, productId: 'x_monthly', billingIssue: true, billedBy: 'app_store' } }, [], DEFAULT_STRINGS, at);
    expect(l.detail).toBe('Billed through the App Store.');
    expect(l.note).toBe(DEFAULT_STRINGS.graceNote);
  });
});
