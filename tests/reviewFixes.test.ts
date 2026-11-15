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
