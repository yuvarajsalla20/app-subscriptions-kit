# app-subscriptions-kit

The subscription pattern for React Native / Expo apps (iOS, Android, web): one config for tiers, features and limits, checks such as `canUse()` and `limit()`, a `useSubscription()` hook, and themeable screens that follow the App Store and Google Play rules.

It never talks to a store. Give it [app-payments-kit](https://github.com/yuvarajsalla20/app-payments-kit), or any object with the same few functions (`PaymentsLike` in `src/payments.ts`).

## What you get

| Piece | What it does |
|---|---|
| `defineSubscription({ tiers, features, limits, plans, compare, kids })` | The app's rules in one place. Checks them at start, so a typo fails loudly instead of unlocking something |
| `<SubscriptionProvider config payments userId grownUpCheck>` | Follows the account's tier (store, server row, tester switch) and shares it with every screen |
| `useSubscription()` | `tier`, `paid`, `canUse(f)`, `limit(n)`, `allowed(n, v)`, `isAtLeast(t)`, `buy`, `restore`, `redeemCode`, `openManage`, `tester` |
| `usePremium()` / `useTier()` | Shortcuts: `{ premium }` for one-tier apps, or the tier name |
| `<PlansScreen>` | Store prices, per-month price and savings, trial wording only when the store offers it, a tab per paid tier, restore, codes, manage, auto-renew wording, terms and privacy links |
| `<CompareTable>` | Free vs paid tiers, one column per tier, extra rows highlighted |
| `<PremiumGate>`, `<PremiumPill>`, `<LockBadge>` | A locked card in place of a feature, the gold pill and the lock badge |
| `<SubscriptionRow>` | For a Settings screen (app-account-kit's App slot): tier, renew or end date, manage, code, restore, payment-problem note, developer tester switch |

## Use it

```ts
// subscription.ts  (one per app)
import { defineSubscription } from 'app-subscriptions-kit';

export const plan = defineSubscription({
  tiers: ['free', 'premium'],                  // or ['free', 'plus', 'pro']
  features: { practiceTest: 'premium', hardLevel: 'premium' },   // not listed = free
  limits: {
    children: { free: 2, premium: 4 },         // a count
    setSizes: { free: [5], premium: [5, 10, 20, 30] },   // or a list of allowed values
  },
  plans: [                                     // order and wording; prices come from the store
    { id: 'yearly', tier: 'premium', label: 'Yearly', badge: 'Most popular' },
    { id: 'monthly', tier: 'premium', label: 'Monthly' },
  ],
  compare: [
    { label: 'Full practice tests', values: { free: '–', premium: '✓' } },
    { label: 'Children', values: { free: 'Up to 2', premium: 'Up to 4' } },
  ],
  kids: true,                                  // buy, restore and manage ask the grown-ups check first
});
```

```tsx
// app/_layout.tsx
<SubscriptionProvider config={plan} payments={payments} userId={user?.id ?? null} grownUpCheck={askGrownUp}>
  <Stack />
</SubscriptionProvider>

// any screen
const { canUse, limit } = useSubscription();
if (!canUse('practiceTest')) return <PremiumGate feature="practiceTest" name="Practice tests" onUnlock={() => router.push('/plans')} />;

// app/plans.tsx
<PlansScreen header={<Logo />} onClose={router.back} onOpenTerms={openTerms} onOpenPrivacy={openPrivacy} theme={{ accent: '#5B4BD6' }} />

// settings
<SubscriptionRow onOpenPlans={() => router.push('/plans')} />
```

`grownUpCheck` is your own check (a times-table question, a PIN …): resolve `true` to go on.

## Tiers, plans and limits

- **Tiers** are levels of access, lowest first, starting with `free`. A higher tier includes everything below it.
- **Plans** are ways to pay for a tier. Any number per tier. Their ids match the payments kit's plan ids.
- **Limits** take a value per tier. A tier with no value gets the value of the nearest tier below it.

Keep the limits that matter on the server too (app-payments-kit's `has_tier()` in a database trigger): the phone's answer is for showing locks.

## Current plan and switching

Pass `currentPlanId` (the plan the account pays for) and the Plans screen marks it **Current plan** and draws that row in the Premium colours (`premiumSoft` fill, `premium` border and badge) so it stands apart from the picked plan, and the Free vs paid table puts a **CURRENT** badge over the account's tier. With `onSwitch`, the current plan can't be picked, the best other length (its `badge`, then `selected`, then the first) is picked to start with, and the button says **Switch to …**; the app decides what that does (explain when the change applies, then open the store's or the checkout's own page). Without `onSwitch`, or with `switchBlocked` (a sentence for a plan bought somewhere this device can't change, such as another store), the current plan stays picked, the others are locked, and the line under the button shows the current price.

Pass `canSwitchTo(from, to)` to narrow which plans a subscriber may switch to, for example longer plans only (`(a, b) => months(b)! > months(a)!`), so a yearly member is never invited to move to a shorter plan. When no plan is allowed, no switch is offered: the current plan stays picked and the button says **You have …**. Pass `currentMark` (any element, such as the app's Premium icon) to draw it next to the current plan's name.

Pass `onManage` to show your own sheet before the store's manage page (for example a simple "cancel" sheet that says what happens), and change `strings.manage` to match (for example "Turn renewal back on" after a cancel).

## On the website

With app-payments-kit's RevenueCat web provider (`revenueCatWeb`), the same Plans screen sells on the website with card checkout. The website has no store codes, so "Have a code?" is hidden there (`payments.canRedeemCode` is false; any payments object can set it). Restore and Manage work the same.

## Look and words

Every screen takes `theme` (colors, radius), `strings` (every word, for rewording or translation) and `components` (`Text`, for your fonts). Pass only what differs. The default is the gold Premium look.

The Plans screen has the app's logo (`header`) and Close in one row, then the plans, then the Free vs paid table (`compareFirst` puts the table on top), then the main button, then Restore, Have a code? and Manage on one line, then the legal line. `theme.shadow` (a CSS box-shadow) makes cards float with no outline; `theme.button` / `theme.onButton` color the main button (the accent by default).

## Versions

Every release is tagged in git (`v1.13.0`). In the app's `package.json` pin the full commit SHA of that tag and write the tag in a comment.

### 1.13.1

Review fixes for the booked plan switch.
- **It no longer gets stuck.** It also goes once the store has renewed past its start date on the old plan (the switch was undone in the store), and 40 days after booking when no start date was known.
- It shows only while it can still happen: a paid account on that plan's tier that is still renewing. "Ends Dec 12" and "Switching to Yearly" never show together.
- A sign-in change never shows or clears the last person's switch, and broken saved data is ignored instead of crashing.
- Plans: with a switch booked, the plan in use stays the checked one, and the button's spoken name has no "✓".
- `switchPlan` uses the same purchase path as `buy`.

### 1.13.0

- **A booked plan switch shows.** On the App Store a longer plan of the same level (Monthly to Yearly) starts at the next renewal. `sub.switchPlan(plan)` buys it and, when the store still shows the old plan, remembers it as `sub.pendingSwitch` (`{ planId, startsAt }`) until the store shows the new plan or stops renewing.
  - Status card: "→ Switching to Yearly on Dec 12" under the plan.
  - Premium page: Change Plan reads "Yearly Starts Dec 12"; Before You Go doesn't offer the switch again.
  - Plans: the current plan says "Until Dec 12", the next one is tagged NEXT with "Yearly Starts Dec 12", one line explains it, and the button reads "✓ Yearly Starts Dec 12" (no second switch).
- `SubscriptionProvider` takes `storage` (AsyncStorage fits) to keep it between launches.
- New strings: `switchingTo`, `planStarts`, `nextPlan`, `untilDay`, `switchBooked`. `shortDay(iso)` is exported.

### 1.12.0

- The stay offer in Before You Go shows only to people on the plan it belongs to (a yearly subscriber is never offered a monthly discount that would move them down).
- Change Plan names only a longer plan; on the longest plan it names none.
- Cancel, Renew, Continue to Cancel and the stay offer run one at a time: a second quick tap does nothing. Restore's guard now holds for two taps in the same moment, and nothing updates after the page closes.
- Restore results are read out by VoiceOver and TalkBack. The welcome card no longer hides Start Exploring from VoiceOver.
- Plans: `onSwitch` may return the purchase result; a failed switch now says why.
- `isPlan(productId, planId)` (exported) matches "monthly", "app_monthly", "com.app.monthly" and "sub:base", not "bimonthly". Used for the current plan and the status card.
- Smaller: "What You Lose" without a date, the welcome card resets when someone else signs in.

### 1.11.0

- The default Premium mark is now **a king and a queen crown** (`<Crowns>`), drawn with SVG, on the top card, the welcome card and the status card; an outline version heads the Premium Features row. It replaces the rotated-square `<Diamond>` (still exported). Colors: `theme.king`, `kingFill`, `queen`, `queenFill`. `icon` still replaces it.
- Needs `react-native-svg` (a new peer dependency; Expo apps have it).

### 1.10.0

- **Restore Subscription always answers.** The row dims while pressed, shows a spinner and "Checking With the App Store…" (a second tap is ignored), then says what happened for a few seconds (`RESTORE_NOTE_MS`, 4 s): "You're All Set. Premium Is Active on This Apple ID.", "Premium Restored.", or "No Purchases Found on This Apple ID.". A failure says "Couldn't Reach the App Store. Tap to Try Again." until tapped, and still calls `onError`. On Android the words say Google Play and Google Account.
- Once paid, the hint under Restore is "Premium Missing on a Device? Tap to Check." instead of "Already paid on another device?".
- New strings: `restoreHintPaid(tier)`, `restoreChecking(store)`, `restoreAllSet(tier, account)`, `restoreDone(tier)`, `restoreNone(account)`, `restoreFailed(store)`.

### 1.9.0

The Premium page's subscription actions, the same for every app. Only the features, words, colors and icon are the app's.

- Free: **Get Premium** card with store prices ("From $3.99/month", "Or $29.99/year"), then **See Plans**, Restore Subscription and Have a Code?, then the features (open, a lock on each).
- Renewing: the status card, the features (closed, tap to open), then a **Cancel Subscription** button ("You keep Premium until Dec 12"), Change Plan (the other plan's price and a "Save n%" tag worked out from store prices) and Restore Subscription.
- **Before You Go**: Cancel opens a sheet first with what is lost (`loseList`), a subscriber discount when the store has `stayOfferId` (needs app-payments-kit 2.3.0 `loadOffer`/`buyOffer`), Switch to the longer plan with its saving, Keep Premium, and Continue to Cancel (always one tap). Skipped when there is nothing to show, or with `beforeCancel={false}`.
- After a cancel: Ends and "Auto-renew is off", then a **Renew Subscription** button and what is lost, then the features.
- Right after a first purchase on this phone, a **Welcome to Premium** card until Start Exploring (`useSubscription().justSubscribed` / `dismissWelcome()`).
- New props: `icon` (default `<Diamond>`), `loseList`, `featuresOpen` ({ free, paid }), `stayOfferId`, `beforeCancel`. `SubscriptionStatusCard` takes `icon` too.
- New theme colors `danger`, `onDanger`. New strings for every new word; `endsNote` is now "Auto-renew is off". `autoRenewOn` is no longer shown.
- `useSubscription()` adds `loadOffer(id)`, `buyOffer(offer)`. `PaymentsLike` can add `loadOffer?`, `buyOffer?`.

### 1.8.0

A whole Premium page for Settings, and its status card. **Nothing changes for an app that does not use them.**

- `<PremiumPage features onOpenPlans onError>`: the app lists its features (`{ key, label, detail?, icon?, toggle?, children? }`) and the kit draws them. Free: a lock on each, a tap opens the plans, then Upgrade, code and restore. Paid: the status card, each feature with its switch (when it has `toggle`) or "Included", then Manage, code and restore. After a cancel, Manage reads "Turn auto-renew back on". Development builds keep `SubscriptionRow` at the bottom for the tester switch.
- `<SubscriptionStatusCard>`: "You have Premium", the plan (the plan whose `id` ends the store product id, so `hringnring_yearly` is "Yearly"), and "Renews …" or, after a cancel, "Ends …" with "Auto-renew is off. You keep it until then." A payment problem shows `graceNote`. Nothing for a free account.
- `statusLines(...)`: the same words without drawing, for tests or an app's own layout.
- New strings: `planName`, `endsNote`, `included`, `lockedHint`, `lockedLabel`, `autoRenewOn`.

### 1.7.0

Apps with no server row now see when Premium renews or ends. **Nothing to change in code; needs app-payments-kit 2.2.0 or later.**

- `SubscriptionRow` shows **Renews <date>**, or **Ends <date>** after a cancel, from the store's `renewal` when there is no server row. A server row still wins when there is one.
- `useSubscription().renewal` gives `{ until, willRenew, productId }` for screens of your own.

### 1.6.0

Prices are easier to read. **The wording changed for every app that upgrades; nothing to change in code.**

- Each plan shows its price and period on one line, `$29.99/year`, instead of the price with "a year" under it. The new `strings.per(unit, count)` makes the `/year` part.
- The per-month line under a longer plan reads `$2.50/month · save 50%` (was `$2.50 a month`).

### 1.5.0

The Plans screen is tighter. **The layout changed for every app that upgrades; nothing to change in code.**

- The app's logo (`header`) and Close share the first row, with less padding above them. Before, Close had a row of its own above the logo.
- Less space between the heading, the plans and the table.
- The main button sits right under the plans and the table, inside the scroll, instead of being pinned to the bottom of the screen (so a message above it can no longer crowd it).
- Restore purchases, Have a code? and Manage are on one line (they wrap on a narrow screen). The "Already subscribed?" box and its heading are gone; `strings.alreadySubscribed` is no longer shown but still accepted.
- The legal line is centred.

An app that draws the screen inside its own padded frame should drop the top padding it added for Close, or the space will show twice.

### 1.4.1 and earlier

See the git history.

## Testing

`npm test` runs the rules, pricing and screen tests with a fake payments object. In an app, the payments kit's tester switch shows in `SubscriptionRow` in development builds, so every locked and unlocked screen can be tried on the web and in Expo Go.

## License

MIT
