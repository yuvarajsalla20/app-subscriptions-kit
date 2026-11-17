import { describe, expect, it } from 'vitest';
import { DEFAULT_STRINGS, money, perMonth } from '../src';

describe('review fixes', () => {
  it('never loses a cent to floating point', () => {
    for (const price of [0.29, 1.13, 19.99, 4.35, 8.2, 16.08]) expect(money(price, 'USD')).toBe('$' + price.toFixed(2));
    expect(perMonth({ id: 'y', tier: 'premium', priceString: '', price: 24.12, currency: 'USD', period: { unit: 'YEAR', count: 1 }, trialDays: null })).toBe(2.01);
  });
  it('names the store per platform', () => {
    expect([DEFAULT_STRINGS.storeName('ios'), DEFAULT_STRINGS.storeAccount('android'), DEFAULT_STRINGS.storeCompany('web')]).toEqual(['App Store', 'Google Account', 'The store']);
  });
});

describe('sameWatchState', () => {
  it('treats a repeated store answer as the same, and a real change as new', async () => {
    const { sameWatchState } = await import('../src/payments');
    const a = { tier: 'premium', source: 'store' as const, server: null, renewal: { until: '2026-12-01', willRenew: true, productId: 'p', trial: false } };
    expect(sameWatchState(a, { ...a, renewal: { ...a.renewal } })).toBe(true);
    expect(sameWatchState(a, { ...a, renewal: { ...a.renewal, willRenew: false } })).toBe(false);
    expect(sameWatchState(a, { ...a, tier: 'free' })).toBe(false);
    expect(sameWatchState({ tier: 'free', source: 'free', server: null }, { tier: 'free', source: 'free', server: null, renewal: null })).toBe(true);
  });
});
