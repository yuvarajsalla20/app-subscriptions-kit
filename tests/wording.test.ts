// 2.0.0: the default words follow the Writing rule (Title Case titles and buttons, full calm sentences with periods).
import { describe, expect, it } from 'vitest';
import { DEFAULT_STRINGS as s } from '../src';

describe('default wording (2.0.0)', () => {
  it('titles and buttons are in Title Case', () => {
    expect([s.choosePlan, s.currentPlan, s.alreadySubscribed, s.compareTitle, s.restore, s.haveCode, s.enterCode, s.manage, s.terms, s.privacy, s.tryAgain, s.unlock, s.askGrownUp, s.autoRenewOn, s.nextPlan, s.insteadYouCould, s.tapToSee, s.restoreHint, s.allSet])
      .toEqual(['Choose a Plan', 'Current Plan', 'Already Subscribed?', 'Compare Plans', 'Restore Purchases', 'Have a Code?', 'Enter Code', 'Manage or Cancel Subscription', 'Terms of Use', 'Privacy Policy', 'Try Again', 'See Plans', 'Ask a Parent or Guardian', 'Turn Auto-Renew Back On', 'Next', 'Other Options', 'Tap to View', 'Already Subscribed on Another Device?', 'You Are All Set']);
    expect(s.startTrial(7)).toBe('Start 7-Day Free Trial');
    expect(s.startTrialPeriod('MONTH', 1)).toBe('Start 1-Month Free Trial');
    expect(s.youHave('Premium')).toBe('You Have Premium');
    expect(s.planName('Monthly')).toBe('Monthly Plan');
    expect(s.continuesAfter('Premium', 'Dec 12')).toBe('Keep Premium Beyond Dec 12');
    expect(s.featureCount(3)).toBe('3 Features');
  });

  it('one spelling of "Save" and of "Cancel any time."', () => {
    expect(s.save(20)).toBe(s.saveTag(20));
    expect(s.orPrice('$29.99/year')).toBe('Or $29.99/year. Cancel any time.');
    expect(s.thenPrice('$6.99', 'a month')).toContain('Cancel any time.');
  });

  it('sentence lines are calm full sentences that end with a period', () => {
    const lines = [s.locked('Data Export', 'Premium'), s.lockedBody, s.welcome('Premium'), s.welcomeBody, s.getPremiumNote, s.endsNote, s.pricesFailed, s.keepUntil('Premium', 'Dec 12'),
      s.restoreHintPaid('Premium'), s.restoreAllSet('Premium', 'Apple ID'), s.restoreDone('Premium'), s.restoreNone('Apple ID'), s.restoreFailed('App Store'),
      s.planNotOffered('Monthly', 'Yearly', 'Premium'), s.notConfirmedYet('Apple'), s.aboutPerMonth('$59.99 a year', '$4.99')];
    for (const l of lines) {
      expect(l).toMatch(/[.?]$/);
      expect(l).not.toMatch(/!|n't|'re /);
    }
  });
});
