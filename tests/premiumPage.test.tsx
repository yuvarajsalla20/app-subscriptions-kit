import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_STRINGS, PremiumPage, SubscriptionProvider, defineSubscription, statusLines } from '../src';
import { act, fakePayments, mount, press } from './render';

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
  const page = (payments = fakePayments(), onOpenPlans = vi.fn(), onChange = vi.fn()) => (
    <SubscriptionProvider config={config} payments={payments} userId="u1">
      <PremiumPage
        onOpenPlans={onOpenPlans}
        features={[
          { key: 'effects', label: 'Background Effects', toggle: { value: true, onChange } },
          { key: 'sounds', label: 'More Alert Sounds', detail: '7 extra sounds' },
        ]}
      />
    </SubscriptionProvider>
  );

  it('free: every feature is locked and opens the plans, with no status card', async () => {
    const onOpenPlans = vi.fn();
    const m = await mount(page(fakePayments(), onOpenPlans));
    expect(m.shown('You have Premium')).toBe(false);
    expect(m.shown(`✓ ${DEFAULT_STRINGS.included}`)).toBe(false);
    await press(m.label(`More Alert Sounds, ${DEFAULT_STRINGS.lockedLabel}`));
    expect(onOpenPlans).toHaveBeenCalled();
  });

  it('paid: status card, a switch for a toggle, Included for the rest, and Manage', async () => {
    const payments = fakePayments();
    const onChange = vi.fn();
    const m = await mount(page(payments, vi.fn(), onChange));
    await act(async () => payments.emit({ tier: 'premium', source: 'store', renewal: { until: '2099-01-15T12:00:00Z', willRenew: true, productId: 'x_yearly' } }));
    expect(m.shown('You have Premium')).toBe(true);
    expect(m.shown('Yearly plan')).toBe(true);
    expect(m.texts().some((t) => t.startsWith('Renews '))).toBe(true);
    expect(m.shown(`✓ ${DEFAULT_STRINGS.included}`)).toBe(true);
    await press(m.label('Background Effects'));
    expect(onChange).toHaveBeenCalledWith(false);
    await press(m.button(DEFAULT_STRINGS.manage));
    expect(payments.openManage).toHaveBeenCalled();
  });

  it('after a cancel: Ends, and Manage offers to turn auto-renew back on', async () => {
    const payments = fakePayments();
    const m = await mount(page(payments));
    await act(async () => payments.emit({ tier: 'premium', source: 'store', renewal: { until: '2099-01-15T12:00:00Z', willRenew: false, productId: null } }));
    expect(m.texts().some((t) => t.startsWith('Ends '))).toBe(true);
    expect(m.shown(DEFAULT_STRINGS.endsNote)).toBe(true);
    expect(m.button(DEFAULT_STRINGS.autoRenewOn)).toBeDefined();
  });
});
