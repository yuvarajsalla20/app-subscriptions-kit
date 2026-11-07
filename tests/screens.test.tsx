import { describe, expect, it, vi } from 'vitest';
import { CompareTable, PlansScreen, PremiumGate, SubscriptionProvider, SubscriptionRow, defineSubscription, usePremium, type SubscriptionConfig } from '../src';
import { fakePayments, mount, plan, press } from './render';
import { Platform } from './stubs/react-native';

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

describe('PlansScreen', () => {
  it('shows store prices, the trial only when offered, and the required links', async () => {
    const m = await mount(app(<PlansScreen {...legal} />));
    expect(m.shown('$39.99')).toBe(true);
    expect(m.shown('$3.33 a month · save 52%')).toBe(true);
    expect(m.shown('Start 7-day free trial')).toBe(true);
    expect(m.shown('Restore purchases')).toBe(true);
    expect(m.shown('Terms of use')).toBe(true);
    await press(m.label('Monthly, $6.99'));
    expect(m.shown('Upgrade to Premium')).toBe(true);
  });

  it('buys the chosen plan and says welcome', async () => {
    const payments = fakePayments();
    const onUnlocked = vi.fn();
    const m = await mount(app(<PlansScreen {...legal} onUnlocked={onUnlocked} />, payments));
    await press(m.label('Start 7-day free trial'));
    expect(payments.buy).toHaveBeenCalledWith(expect.objectContaining({ id: 'yearly' }));
    expect(onUnlocked).toHaveBeenCalledWith('premium');
    expect(m.shown('Welcome to Premium! Everything is unlocked.')).toBe(true);
    expect(m.shown('You have Premium')).toBe(true);
  });

  it('shows the store message on failure and nothing on cancel', async () => {
    const payments = fakePayments({ buy: vi.fn(async () => ({ ok: false as const, cancelled: false, message: 'No internet connection.' })) });
    const m = await mount(app(<PlansScreen {...legal} />, payments));
    await press(m.label('Start 7-day free trial'));
    expect(m.shown('No internet connection.')).toBe(true);
  });

  it('never shows made-up prices when the store is ready but unreachable', async () => {
    const payments = fakePayments({ loadPlans: vi.fn(async () => []) });
    const m = await mount(app(<PlansScreen {...legal} previewPlans={[plan('yearly', 'premium', 1, 12)]} />, payments));
    expect(m.shown('$1.00')).toBe(false);
    expect(m.shown('Could not reach the store. Check the connection.')).toBe(true);
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
    await press(m.label('Start 7-day free trial'));
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
    await press(m.button('Have a code?'));
    expect(payments.redeemCode).toHaveBeenCalledWith('');
    Platform.OS = 'android';
    const a = await mount(app(<PlansScreen {...legal} />, fakePayments()));
    await press(a.button('Have a code?'));
    expect(a.label('Enter code')).toBeDefined();
    Platform.OS = 'ios';
  });

  it('has no code box where the provider takes no codes (the website)', async () => {
    const m = await mount(app(<PlansScreen {...legal} />, fakePayments({ canRedeemCode: false })));
    expect(m.shown('Have a code?')).toBe(false);
    expect(m.shown('Restore purchases')).toBe(true);
    const r = await mount(app(<SubscriptionRow onOpenPlans={() => undefined} />, fakePayments({ canRedeemCode: false })));
    expect(r.shown('Have a code?')).toBe(false);
  });
});

describe('gates and badges', () => {
  it('PremiumGate shows the lock until the tier arrives', async () => {
    const payments = fakePayments();
    const unlock = vi.fn();
    const Child = () => <>{'unlocked content'}</>;
    const m = await mount(app(<PremiumGate feature="practiceTest" name="Practice tests" onUnlock={unlock}><Child /></PremiumGate>, payments));
    expect(m.shown('Practice tests is in Premium')).toBe(true);
    await press(m.label('See plans'));
    expect(unlock).toHaveBeenCalled();
    payments.emit({ tier: 'premium' });
    expect(m.shown('Practice tests is in Premium')).toBe(false);
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
    expect(m.shown('Free')).toBe(true);
    expect(m.shown('Full practice tests')).toBe(true);
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
    await press(m.button('Manage or cancel subscription'));
    expect(payments.openManage).toHaveBeenCalled();
    expect(m.texts().some((t) => t.startsWith('There is a problem with your payment'))).toBe(true);
  });

  it('shows the tester switch only when the payments kit offers it', async () => {
    expect((await mount(app(<SubscriptionRow onOpenPlans={() => undefined} />))).label('Pretend to have Premium')).toBeUndefined();
    const setTesterTier = vi.fn(async () => {});
    const payments = fakePayments({ testerAvailable: true, setTesterTier, getTesterTier: async () => null });
    const m = await mount(app(<SubscriptionRow onOpenPlans={() => undefined} />, payments));
    const sw = m.label('Pretend to have Premium')!;
    const { act } = await import('./render');
    await act(async () => { await sw.props.onValueChange(true); });
    expect(setTesterTier).toHaveBeenCalledWith('premium');
  });
});
