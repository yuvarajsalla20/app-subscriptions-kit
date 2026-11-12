import { describe, expect, it } from 'vitest';
import { allowed, atLeast, canUse, defineSubscription, isPlan, limitFor, money, perMonth, savings, tierAllowing } from '../src';
import { plan } from './render';

const one = defineSubscription({
  features: { practiceTest: 'premium', hard: 'premium' },
  limits: { children: { free: 2, premium: 4 }, setSizes: { free: [5], premium: [5, 10, 20, 30] } },
});
const three = defineSubscription({
  tiers: ['free', 'plus', 'pro'],
  features: { export: 'plus', team: 'pro' },
  limits: { members: { free: 1, plus: 3, pro: 8 }, storageGb: { free: 1, pro: 100 } },
});

describe('defineSubscription', () => {
  it('fills in tiers and labels', () => {
    expect(one.tiers).toEqual(['free', 'premium']);
    expect(one.tierLabels).toEqual({ free: 'Free', premium: 'Premium' });
  });
  it('fails loudly on a typo, so nothing gets unlocked by mistake', () => {
    expect(() => defineSubscription({ features: { x: 'premuim' } })).toThrow(/unknown tier "premuim"/);
    expect(() => defineSubscription({ limits: { kids: { premium: 4 } } })).toThrow(/needs a value for "free"/);
    expect(() => defineSubscription({ tiers: ['free'] })).toThrow();
  });
});

describe('checks', () => {
  it('one paid tier', () => {
    expect(canUse(one, 'free', 'practiceTest')).toBe(false);
    expect(canUse(one, 'premium', 'practiceTest')).toBe(true);
    expect(canUse(one, 'free', 'dailyMission')).toBe(true); // not listed = free
    expect(limitFor(one, 'free', 'children')).toBe(2);
    expect(allowed(one, 'free', 'setSizes', 10)).toBe(false);
    expect(allowed(one, 'premium', 'setSizes', 10)).toBe(true);
    expect(tierAllowing(one, 'setSizes', 20)).toBe('premium');
  });
  it('several tiers: a higher tier gets everything below it', () => {
    expect(canUse(three, 'pro', 'export')).toBe(true);
    expect(canUse(three, 'plus', 'team')).toBe(false);
    expect(atLeast(three, 'pro', 'plus')).toBe(true);
    expect(limitFor(three, 'plus', 'storageGb')).toBe(1); // plus has no value: nearest below
    expect(allowed(three, 'plus', 'members', 3)).toBe(true);
    expect(allowed(three, 'plus', 'members', 4)).toBe(false);
  });
  it('an unknown tier counts as free', () => {
    expect(canUse(three, 'gold', 'export')).toBe(false);
  });
});

describe('pricing', () => {
  const all = [plan('yearly', 'premium', 39.99, 12), plan('half', 'premium', 27.99, 6), plan('monthly', 'premium', 6.99, 1)];
  it('per month and savings against monthly, rounded down', () => {
    expect(perMonth(all[0]!)).toBe(3.33);
    expect(perMonth(all[2]!)).toBeNull();
    expect(savings(all[0]!, all)).toBe(52);
    expect(savings(all[1]!, all)).toBe(33);
  });
  it('no saving is made up when there is no monthly plan to compare', () => {
    expect(savings(all[0]!, all.slice(0, 2))).toBe(0);
  });
  it('formats money in the store currency', () => {
    expect(money(3.339, 'USD')).toMatch(/3\.33/);
  });
});

describe('isPlan', () => {
  it('matches the plan id alone or after a separator, never inside a longer word', () => {
    expect(isPlan('monthly', 'monthly')).toBe(true);
    expect(isPlan('HringNring_Monthly', 'monthly')).toBe(true);
    expect(isPlan('com.app.yearly', 'yearly')).toBe(true);
    expect(isPlan('premium_monthly:base', 'monthly')).toBe(true);
    expect(isPlan('bimonthly', 'monthly')).toBe(false);
    expect(isPlan(null, 'monthly')).toBe(false);
  });
});
