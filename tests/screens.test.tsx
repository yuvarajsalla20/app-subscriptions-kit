import { describe, expect, it, vi } from 'vitest';
import { CompareTable, PlansScreen, PremiumGate, SubscriptionProvider, SubscriptionRow, defineSubscription, months, usePremium, useSubscription, type StorePlan, type SubscriptionConfig } from '../src';
import { act, fakePayments, mount, plan, press } from './render';
import { Platform, Text } from './stubs/react-native';

const config = defineSubscription({
  features: { practiceTest: 'premium' },
  limits: { children: { free: 2, premium: 4 } },
  plans: [
    { id: 'yearly', tier: 'premium', label: 'Yearly', badge: 'Most popular' },
    { id: 'monthly', tier: 'premium', label: 'Monthly' },
  ],
  compare: [
    { label: 'Full practice tests', values: { free: '–', premium: '✓' } },
    { label: 'Daily mission', values: { free: '✓', premium: '✓' } },
  ],
});
const legal = { onOpenTerms: () => undefined, onOpenPrivacy: () => undefined };
const app = (ui: React.ReactNode, payments = fakePayments(), c: SubscriptionConfig = config, grownUpCheck?: () => Promise<boolean>) => (
  <SubscriptionProvider config={c} payments={payments} userId="u1" grownUpCheck={grownUpCheck}>
    {ui}
  </SubscriptionProvider>
);

describe('PlansScreen layout', () => {
  type N = import('react-test-renderer').ReactTestInstance;
  /** The nearest real element above this one (the test tree also holds components). */
  const up = (n: N): N => {
    let p = n.parent!;
    while (typeof p.type !== 'string') p = p.parent!;
    return p;
  };
  const sameRow = (a?: N, b?: N) => !!a && !!b && up(a) === up(b);

  it('puts the app logo and Close in one row', async () => {
    const m = await mount(app(<PlansScreen {...legal} onClose={() => undefined} header={<Text accessibilityLabel="logo">Logo</Text>} />));
    const logo = m.label('logo')!;
    const close = m.label('Close')!;
    // Logo sits in a box that is a sibling of the Close button: one row, not two.
    expect(up(up(logo))).toBe(up(close));
  });

  it('keeps Restore Purchases and Redeem a Code on one line, with no Already subscribed box', async () => {
    const m = await mount(app(<PlansScreen {...legal} />));
    expect(m.shown('Already Subscribed?')).toBe(false);
    expect(sameRow(m.button('Restore Purchases'), m.button('Redeem a Code'))).toBe(true);
  });

  it('puts the main button after the plans and table, inside the scroll, not pinned below it', async () => {
    const m = await mount(app(<PlansScreen {...legal} />));
    const scroll = m.root.root.findAll((n) => n.type === 'ScrollView')[0]!;
    expect(scroll.findAll((n) => n.props.accessibilityRole === 'button' && n.props.accessibilityLabel === 'Start 7-Day Free Trial')).not.toHaveLength(0);
  });
});

describe('PlansScreen', () => {
  it('shows store prices, the trial only when offered, and the required links', async () => {
    const m = await mount(app(<PlansScreen {...legal} />));
    expect(m.shown('$39.99')).toBe(true);
    expect(m.shown('$3.33/month · Save 52%')).toBe(true);
    expect(m.shown('/year')).toBe(true);
    expect(m.shown('Start 7-Day Free Trial')).toBe(true);
    expect(m.shown('Restore Purchases')).toBe(true);
    expect(m.shown('Terms of Use')).toBe(true);
    await press(m.label('Monthly, $6.99'));
    expect(m.shown('Upgrade to Premium')).toBe(true);
  });

  it('buys the chosen plan and says welcome', async () => {
    const payments = fakePayments();
    const onUnlocked = vi.fn();
    const m = await mount(app(<PlansScreen {...legal} onUnlocked={onUnlocked} />, payments));
    await press(m.label('Start 7-Day Free Trial'));
    expect(payments.buy).toHaveBeenCalledWith(expect.objectContaining({ id: 'yearly' }));
    expect(onUnlocked).toHaveBeenCalledWith('premium');
    expect(m.shown('Welcome to Premium. Every feature is now available.')).toBe(true);
    expect(m.shown('You Have Premium')).toBe(true);
  });

  it('greys out the current plan and starts on a switch to the best other length', async () => {
    const payments = fakePayments();
    const onSwitch = vi.fn();
    const m = await mount(app(<PlansScreen {...legal} currentPlanId="monthly" onSwitch={onSwitch} />, payments));
    await payments.emit({ tier: 'premium' });
    expect(m.shown('Current Plan')).toBe(true);
    expect(m.shown('CURRENT')).toBe(true);
    expect(m.label('Monthly, $6.99, Current Plan')!.props.accessibilityState.disabled).toBe(true);
    // The badge plan is picked to start with, and the footer prices the plan being switched to.
    expect(m.shown('Switch to Yearly')).toBe(true);
    expect(m.shown('$39.99 a year. Cancel any time.')).toBe(true);
    await press(m.label('Switch to Yearly'));
    expect(onSwitch).toHaveBeenCalledWith(expect.objectContaining({ id: 'yearly' }));
    expect(payments.buy).not.toHaveBeenCalled();
  });

  it('says why when a switch fails', async () => {
    const payments = fakePayments();
    const onSwitch = vi.fn(async () => ({ ok: false as const, cancelled: false, message: 'No connection' }));
    const m = await mount(app(<PlansScreen {...legal} currentPlanId="monthly" onSwitch={onSwitch} />, payments));
    await payments.emit({ tier: 'premium' });
    await press(m.label('Switch to Yearly'));
    expect(m.shown('No connection')).toBe(true);
  });

  it('a switch that starts at renewal shows as booked until the store shows the new plan, and is kept between launches', async () => {
    const saved = new Map<string, string>();
    const storage = { getItem: vi.fn(async (k: string) => saved.get(k) ?? null), setItem: vi.fn(async (k: string, v: string) => { saved.set(k, v); }), removeItem: vi.fn(async (k: string) => { saved.delete(k); }) };
    const monthly = { tier: 'premium', renewal: { until: '2099-12-12T10:00:00Z', willRenew: true, productId: 'app_monthly' } };
    const Switcher = () => {
      const sub = useSubscription();
      return <PlansScreen {...legal} currentPlanId="monthly" onSwitch={(p) => sub.switchPlan(p)} />;
    };
    const payments = fakePayments();
    const wrap = (ui: React.ReactNode) => <SubscriptionProvider config={config} payments={payments} userId="u1" storage={storage}>{ui}</SubscriptionProvider>;
    const m = await mount(wrap(<Switcher />));
    await payments.emit(monthly);
    await press(m.label('Switch to Yearly'));
    expect(payments.buy).toHaveBeenCalledOnce();
    expect(m.shown('Next')).toBe(true);
    expect(m.texts().some((x) => x.startsWith('Yearly Starts '))).toBe(true);
    expect(m.texts().some((x) => x.startsWith('Your switch to Yearly is booked.'))).toBe(true);
    expect(m.texts().some((x) => x.startsWith('✓ Yearly Starts '))).toBe(true);
    expect(m.texts().some((x) => x.startsWith('Switch to'))).toBe(false);
    expect([...saved.values()][0]).toContain('"planId":"yearly"');

    // A new launch reads it back.
    const again = await mount(wrap(<Switcher />));
    await payments.emit(monthly);
    expect(again.shown('Next')).toBe(true);

    // Renewal on Yearly: the note goes and the saved copy with it.
    await payments.emit({ tier: 'premium', renewal: { until: '2100-12-12T10:00:00Z', willRenew: true, productId: 'app_yearly' } });
    expect(again.shown('Next')).toBe(false);
    expect(saved.size).toBe(0);
  });

  it('a booked switch: keeps the plan in use marked, lets go when undone or ending, and ignores broken saved data', async () => {
    const saved = new Map<string, string>();
    const storage = { getItem: vi.fn(async (k: string) => saved.get(k) ?? null), setItem: vi.fn(async (k: string, v: string) => { saved.set(k, v); }), removeItem: vi.fn(async (k: string) => { saved.delete(k); }) };
    const monthly = { tier: 'premium', renewal: { until: '2099-12-12T10:00:00Z', willRenew: true, productId: 'app_monthly' } };
    const Switcher = () => {
      const sub = useSubscription();
      return <PlansScreen {...legal} currentPlanId="monthly" onSwitch={(p) => sub.switchPlan(p)} />;
    };
    const payments = fakePayments();
    const wrap = (ui: React.ReactNode) => <SubscriptionProvider config={config} payments={payments} userId="u1" storage={storage}>{ui}</SubscriptionProvider>;
    const m = await mount(wrap(<Switcher />));
    await payments.emit(monthly);
    await press(m.label('Switch to Yearly'));
    // The plan in use stays the checked one; the button's spoken name has no tick.
    const radio = (name: string) => m.root.root.findAll((n) => typeof n.type === 'string' && n.props.accessibilityRole === 'radio' && String(n.props.accessibilityLabel).startsWith(name))[0]!;
    expect(radio('Monthly').props.accessibilityState.checked).toBe(true);
    expect(radio('Yearly').props.accessibilityState.checked).toBe(false);
    expect(m.root.root.findAll((n) => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('✓')).length).toBe(0);

    // Turned off auto-renew: the booked switch is hidden and dropped.
    await payments.emit({ tier: 'premium', renewal: { ...monthly.renewal, willRenew: false } });
    expect(m.shown('Next')).toBe(false);
    expect(saved.size).toBe(0);

    // Undone in the store: it renewed past the start date still on Monthly.
    await payments.emit(monthly);
    await press(m.label('Switch to Yearly'));
    expect(m.shown('Next')).toBe(true);
    await payments.emit({ tier: 'premium', renewal: { until: '2100-01-12T10:00:00Z', willRenew: true, productId: 'app_monthly' } });
    expect(m.shown('Next')).toBe(false);
    expect(saved.size).toBe(0);

    // Broken saved data is ignored rather than crashing.
    saved.set('app-subscriptions-kit:pending-switch:u1', '{}');
    const again = await mount(wrap(<Switcher />));
    await payments.emit(monthly);
    expect(again.shown('Next')).toBe(false);
    expect(again.shown('Switch to Yearly')).toBe(true);
  });

  it("never shows or clears another account's booked switch", async () => {
    const saved = new Map<string, string>([['app-subscriptions-kit:pending-switch:u2', JSON.stringify({ planId: 'yearly', startsAt: '2099-12-12T10:00:00Z' })]]);
    const storage = { getItem: vi.fn(async (k: string) => saved.get(k) ?? null), setItem: vi.fn(async (k: string, v: string) => { saved.set(k, v); }), removeItem: vi.fn(async (k: string) => { saved.delete(k); }) };
    const payments = fakePayments();
    const Switcher = () => <PlansScreen {...legal} currentPlanId="monthly" onSwitch={vi.fn()} />;
    const wrap = (uid: string) => <SubscriptionProvider config={config} payments={payments} userId={uid} storage={storage}><Switcher /></SubscriptionProvider>;
    const m = await mount(wrap('u1'));
    await payments.emit({ tier: 'premium', renewal: { until: '2099-12-12T10:00:00Z', willRenew: false, productId: 'app_monthly' } });
    await act(async () => { m.root.update(wrap('u2')); });
    expect(saved.has('app-subscriptions-kit:pending-switch:u2')).toBe(true);
  });

  it('offers only the plans the app allows, and no switch at all when none is allowed', async () => {
    const longer = (from: StorePlan, to: StorePlan) => (months(to) ?? 0) > (months(from) ?? 0);
    const payments = fakePayments();
    const m = await mount(app(<PlansScreen {...legal} currentPlanId="yearly" onSwitch={vi.fn()} canSwitchTo={longer} currentMark={<Text>MARK</Text>} />, payments));
    await payments.emit({ tier: 'premium' });
    // Yearly is the longest: nothing shorter is offered, the yearly row stays picked and the button says so.
    expect(m.shown('You Have Premium')).toBe(true);
    expect(m.texts().some((t) => t.startsWith('Switch to'))).toBe(false);
    expect(m.label('Monthly, $6.99')!.props.accessibilityState.disabled).toBe(true);
    expect(m.shown('MARK')).toBe(true);
    // Tapping Monthly never moves the pick: Yearly stays, and the screen says why instead of looking ignored.
    await press(m.label('Monthly, $6.99'));
    expect(m.shown('You are on Premium Yearly. Monthly is not available while this plan is active.')).toBe(true);
    expect(m.label('Yearly, $39.99, Current Plan')!.props.accessibilityState.checked).toBe(true);
    expect(m.label('Monthly, $6.99')!.props.accessibilityState.checked).toBe(false);
  });

  it('picks no plan for a subscriber whose plan the store has not named yet', async () => {
    const payments = fakePayments();
    const m = await mount(app(<PlansScreen {...legal} />, payments));
    await payments.emit({ tier: 'premium' });
    // Before 1.18.2 Yearly showed as picked here, so a Monthly member saw the wrong plan chosen.
    expect(m.label('Yearly, $39.99')!.props.accessibilityState.checked).toBe(false);
    expect(m.label('Monthly, $6.99')!.props.accessibilityState.checked).toBe(false);
    await press(m.label('Monthly, $6.99'));
    expect(m.shown('You already have Premium.')).toBe(true);
    expect(m.label('Monthly, $6.99')!.props.accessibilityState.checked).toBe(false);
  });

  it('lets a free person pick Monthly, and buys Monthly', async () => {
    const payments = fakePayments();
    const m = await mount(app(<PlansScreen {...legal} />, payments));
    await press(m.label('Monthly, $6.99'));
    expect(m.label('Monthly, $6.99')!.props.accessibilityState.checked).toBe(true);
    expect(m.label('Yearly, $39.99')!.props.accessibilityState.checked).toBe(false);
    await press(m.label('Upgrade to Premium'));
    expect(payments.buy).toHaveBeenCalledWith(expect.objectContaining({ id: 'monthly' }));
  });

  it('lets a monthly member switch only to a longer plan when the app asks for that', async () => {
    const longer = (from: StorePlan, to: StorePlan) => (months(to) ?? 0) > (months(from) ?? 0);
    const payments = fakePayments();
    const m = await mount(app(<PlansScreen {...legal} currentPlanId="monthly" onSwitch={vi.fn()} canSwitchTo={longer} />, payments));
    await payments.emit({ tier: 'premium' });
    expect(m.shown('Switch to Yearly')).toBe(true);
    expect(m.label('Yearly, $39.99')!.props.accessibilityState.disabled).toBe(false);
  });

  it('prices the footer by the current plan when switching is not offered', async () => {
    const payments = fakePayments();
    const m = await mount(app(<PlansScreen {...legal} currentPlanId="monthly" />, payments));
    await payments.emit({ tier: 'premium' });
    expect(m.shown('You Have Premium')).toBe(true);
    expect(m.shown('$6.99 a month. Cancel any time.')).toBe(true);
    expect(m.texts().some((t) => t.includes('$39.99 a year'))).toBe(false);
  });

  it('lets the app show its own sheet for manage or cancel', async () => {
    const payments = fakePayments();
    const onManage = vi.fn();
    const m = await mount(app(<PlansScreen {...legal} currentPlanId="monthly" onManage={onManage} />, payments));
    await payments.emit({ tier: 'premium' });
    await press(m.button('Manage or Cancel Subscription'));
    expect(onManage).toHaveBeenCalled();
    expect(m.shown('Restore Purchases')).toBe(true);
  });

  it('keeps other plans locked while subscribed when switching is not offered or blocked', async () => {
    const payments = fakePayments();
    const m = await mount(app(<PlansScreen {...legal} currentPlanId="monthly" onSwitch={vi.fn()} switchBlocked="Change your plan where you bought it." />, payments));
    await payments.emit({ tier: 'premium' });
    expect(m.shown('Change your plan where you bought it.')).toBe(true);
    expect(m.label('Yearly, $39.99')!.props.accessibilityState.disabled).toBe(true);
    expect(m.shown('Switch to Yearly')).toBe(false);
  });

  it('shows the store message on failure and nothing on cancel', async () => {
    const payments = fakePayments({ buy: vi.fn(async () => ({ ok: false as const, cancelled: false, message: 'No internet connection.' })) });
    const m = await mount(app(<PlansScreen {...legal} />, payments));
    await press(m.label('Start 7-Day Free Trial'));
    expect(m.shown('No internet connection.')).toBe(true);
  });

  it('never shows made-up prices when the store is ready but unreachable', async () => {
    const payments = fakePayments({ loadPlans: vi.fn(async () => []) });
    const m = await mount(app(<PlansScreen {...legal} previewPlans={[plan('yearly', 'premium', 1, 12)]} />, payments));
    expect(m.shown('$1.00')).toBe(false);
    expect(m.shown('Could not reach the store. Check your connection and try again.')).toBe(true);
  });

  it('uses preview prices where there is no store (web, Expo Go)', async () => {
    const payments = fakePayments({ ready: false });
    const m = await mount(app(<PlansScreen {...legal} previewPlans={[plan('yearly', 'premium', 39.99, 12)]} />, payments));
    expect(m.shown('$39.99')).toBe(true);
    await press(m.label('Upgrade to Premium'));
    expect(payments.buy).not.toHaveBeenCalled();
    expect(m.shown('Purchases open when the app is in the store.')).toBe(true);
  });

  it('a kids app asks the grown-ups check before buying', async () => {
    const payments = fakePayments();
    const kids = defineSubscription({ ...config, kids: true });
    const check = vi.fn(async () => false);
    const m = await mount(app(<PlansScreen {...legal} />, payments, kids, check));
    await press(m.label('Start 7-Day Free Trial'));
    expect(check).toHaveBeenCalled();
    expect(payments.buy).not.toHaveBeenCalled();
  });

  it('shows a tab per paid tier and the plans of that tier', async () => {
    const tiers = defineSubscription({
      tiers: ['free', 'plus', 'pro'],
      plans: [
        { id: 'plus_m', tier: 'plus', label: 'Plus monthly' },
        { id: 'pro_m', tier: 'pro', label: 'Pro monthly' },
      ],
    });
    const payments = fakePayments({ loadPlans: vi.fn(async () => [plan('plus_m', 'plus', 4.99, 1), plan('pro_m', 'pro', 9.99, 1)]) });
    const m = await mount(app(<PlansScreen {...legal} />, payments, tiers));
    expect(m.shown('Plus monthly')).toBe(true);
    expect(m.shown('Pro monthly')).toBe(false);
    await press(m.button('Pro'));
    expect(m.shown('Pro monthly')).toBe(true);
    expect(m.shown('Upgrade to Pro')).toBe(true);
  });

  it('on iPhone opens the store code sheet; elsewhere asks for the code', async () => {
    const payments = fakePayments();
    const m = await mount(app(<PlansScreen {...legal} />, payments));
    await press(m.button('Redeem a Code'));
    expect(payments.redeemCode).toHaveBeenCalledWith('');
    Platform.OS = 'android';
    const a = await mount(app(<PlansScreen {...legal} />, fakePayments()));
    await press(a.button('Redeem a Code'));
    expect(a.label('Enter Code')).toBeDefined();
    Platform.OS = 'ios';
  });

  it('has no code box where the provider takes no codes (the website)', async () => {
    const m = await mount(app(<PlansScreen {...legal} />, fakePayments({ canRedeemCode: false })));
    expect(m.shown('Have a Code?')).toBe(false);
    expect(m.shown('Restore Purchases')).toBe(true);
    const r = await mount(app(<SubscriptionRow onOpenPlans={() => undefined} />, fakePayments({ canRedeemCode: false })));
    expect(r.shown('Have a Code?')).toBe(false);
  });
});

describe('gates and badges', () => {
  it('PremiumGate shows the lock until the tier arrives', async () => {
    const payments = fakePayments();
    const unlock = vi.fn();
    const Child = () => <>{'unlocked content'}</>;
    const m = await mount(app(<PremiumGate feature="practiceTest" name="Practice tests" onUnlock={unlock}><Child /></PremiumGate>, payments));
    expect(m.shown('Practice tests is part of Premium.')).toBe(true);
    await press(m.label('See Plans'));
    expect(unlock).toHaveBeenCalled();
    payments.emit({ tier: 'premium' });
    expect(m.shown('Practice tests is part of Premium.')).toBe(false);
  });

  it('usePremium follows the store', async () => {
    const payments = fakePayments();
    const seen: boolean[] = [];
    const Probe = () => { seen.push(usePremium().premium); return null; };
    await mount(app(<Probe />, payments));
    payments.emit({ tier: 'premium' });
    expect(seen.at(-1)).toBe(true);
  });

  it('CompareTable has a column per tier', async () => {
    const m = await mount(app(<CompareTable />));
    expect(m.shown('FREE')).toBe(true);
    expect(m.shown('PREMIUM')).toBe(true);
    expect(m.shown('Full practice tests')).toBe(true);
  });

  it('CompareTable: a paid gain is a solid tick or a number pill, and a row can carry an icon', async () => {
    const c = defineSubscription({
      plans: [{ id: 'monthly', tier: 'premium', label: 'Monthly' }],
      compare: [
        { label: 'Effects', values: { free: '–', premium: '✓' }, icon: <Text>icon-fx</Text> },
        { label: 'Sounds', values: { free: '4', premium: '11' } },
        { label: 'Sync', values: { free: '✓', premium: '✓' } },
      ],
    });
    const m = await mount(app(<CompareTable />, fakePayments(), c));
    expect(m.shown('icon-fx')).toBe(true);
    expect(m.label('Included')).toBeTruthy(); // the solid tick for Effects
    expect(m.shown('11')).toBe(true);
    expect(m.root.root.findAll((n) => n.props.accessibilityLabel === 'Included' && typeof n.type === 'string').length).toBe(1); // Sync is the same everywhere: a plain tick
  });
});

describe('SubscriptionRow', () => {
  it('free: offers the upgrade', async () => {
    const open = vi.fn();
    const m = await mount(app(<SubscriptionRow onOpenPlans={open} />));
    await press(m.button('Upgrade to Premium'));
    expect(open).toHaveBeenCalled();
  });

  it('paid: shows the end date, manage, and a payment problem', async () => {
    const payments = fakePayments();
    const m = await mount(app(<SubscriptionRow onOpenPlans={() => undefined} />, payments));
    payments.emit({ tier: 'premium', source: 'account', server: { tier: 'premium', activeUntil: '2027-01-15T00:00:00Z', status: 'grace', willRenew: false } });
    expect(m.shown('Ends')).toBe(true);
    await press(m.button('Manage or Cancel Subscription'));
    expect(payments.openManage).toHaveBeenCalled();
    expect(m.texts().some((t) => t.startsWith('There is a problem with your payment'))).toBe(true);
  });

  it("paid with no server: shows the store's renew date, then Ends after a cancel", async () => {
    const payments = fakePayments();
    const m = await mount(app(<SubscriptionRow onOpenPlans={() => undefined} />, payments));
    payments.emit({ tier: 'premium', source: 'store', renewal: { until: '2027-01-15T12:00:00Z', willRenew: true } });
    expect(m.shown('Renews')).toBe(true);
    expect(m.shown('Ends')).toBe(false);
    payments.emit({ tier: 'premium', source: 'store', renewal: { until: '2027-01-15T12:00:00Z', willRenew: false } });
    expect(m.shown('Ends')).toBe(true);
    expect(m.shown('Renews')).toBe(false);
  });

  it('shows the tester switch only when the payments kit offers it', async () => {
    expect((await mount(app(<SubscriptionRow onOpenPlans={() => undefined} />))).label('Pretend to Have Premium')).toBeUndefined();
    const setTesterTier = vi.fn(async () => {});
    const payments = fakePayments({ testerAvailable: true, setTesterTier, getTesterTier: async () => null });
    const m = await mount(app(<SubscriptionRow onOpenPlans={() => undefined} />, payments));
    const sw = m.label('Pretend to Have Premium')!;
    const { act } = await import('./render');
    await act(async () => { await sw.props.onValueChange(true); });
    expect(setTesterTier).toHaveBeenCalledWith('premium');
  });
});
