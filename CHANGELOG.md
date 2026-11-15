# Changelog

Release notes for app-subscriptions-kit, newest first. Each version is tagged in git (`v1.18.0`).

## 1.18.1

Nothing to change in apps: the kit's own tests now run on React 19.3.0 and React Native 0.88.1, the versions the apps ship (they ran on React 18.3 and React Native 0.76 before). Code is unchanged.

## 1.18.0

- **Renew and Cancel feel instant:** "Updating Your Subscription…" shows the moment Apple's manage sheet closes (with app-payments-kit 2.5.0's `openManage(onClosed)`; with an older payments kit it shows after the first check, as before). It stays until what the person changed in the sheet shows (the tier, auto-renew, the plan or a booked switch), then the page and "You're All Set!" change together. A fresher end date alone no longer closes it early.
- **Renew line fits one line:** `continuesAfter` is now "Keep Premium Monthly beyond Dec 12, 2026" (was "Turn auto-renew back on to keep … after …"). The date under Renew and Cancel never breaks across lines.
- `useSubscription().openManage(onClosed?)` and the payments `openManage?(onClosed?)` take the new callback; both are optional, so nothing else changes.

## 1.17.0

- `<PremiumPill>` now has the approved look by default: the king and queen crowns and the tier name, gold on soft gold, the same as the paid plan pill. Pass `lock` for the older solid pill with a padlock. Apps can put it beside any paid feature's row (Data Export) instead of drawing their own.
- Upgrading: every app's `PremiumPill` changes look. Pass `lock` to keep the old one.
- A change of signed-in account clears the last account's tier, dates and welcome at once (until the new answer arrives, `loading` is true and the tier is free).
- The Premium page's colors and store names come from the theme and strings: `success`, `successSoft`, `onTag`, `info`, `infoSoft`, `infoBadge`, `dangerSoft`, `dangerBadge`, and `storeName` / `storeAccount` / `storeCompany(platform)`. The website no longer says "App Store".
- Continue to Cancel opens the store's sheet once Before You Go has closed (iPhone refused a sheet while another was closing).
- Per-month prices never lose a cent to rounding (19.99 used to show 19.98).
- The Plans screen's button and Restore link come back if the store call throws.

## 1.16.0

- **A feature row can open its own page:** `PremiumFeature.onPress`. Once unlocked, a tap on a row without a switch opens the page where the feature lives (Data Export, which sits in Account under Your Data), and the row shows an arrow after Included. Locked, the tap still opens the plans. New string `opensPage` (the VoiceOver hint).

## 1.15.1

- **No dead-end Change Plan:** on the longest plan (Yearly) the Premium page leaves out Change Plan, since the Plans screen only offers longer plans. A Yearly subscriber sees Cancel Subscription and Restore Subscription. A booked switch still shows in Change Plan. Moving down (Yearly to Monthly) stays with the store's own subscription settings.

## 1.15.0

- **A happy updating box:** after the store's manage screen closes, a dark box over the page says "Updating Your Subscription…" with "Apple is confirming your change. This page will update by itself." The art swings like a ringing bell (`updatingArt`, default the crowns; wrap your own in `<Swing>`), a ring pulses and three dots bounce. Once the change shows, the mark pops in and the box says what changed for about 2 seconds (`UPDATED_MS`): confetti and "You're All Set! Premium Monthly renews on …" when the plan now renews, a calm "Subscription Updated" after a cancel. A tap closes it. Motion stops when the phone asks for less motion (`useReduceMotion`). New strings `updatingBody`, `allSet`, `subscriptionUpdated`, `renewsOn`; new theme `hud`, `onHud`, `hudAccent`, `confetti`.
- **`PlanBadge`:** a small pill with the account's level for a Settings row: the crowns and "Monthly" or "Yearly" in gold once paid, a gray "Free" otherwise. `planLabel` / `usePlanLabel` give the same word as text. New theme `premiumText` (the pill's words).

## 1.14.0

- **Every date has the year:** "Ends Thu, Nov 12, 2026, 10:07 PM", "Switching to Yearly on Nov 12, 2026", "Yearly Starts Nov 12, 2026", "What You Lose After Nov 12, 2026", the welcome card and the Plans screen (`shortDay` and the status card's date both include it).
- **The plan is named** under Cancel Subscription ("You keep Premium Monthly until …") and in Before You Go. Under Renew Subscription the line now reads "Turn auto-renew back on to keep Premium Monthly after …", so it no longer seems to contradict "Ends …".
- **"Updating Your Subscription…"** shows under the top card from the moment the store's manage screen closes until the account's state changes, or for 20 seconds if nothing changed. New string `updatingSubscription`.
- **Compare table:** paid columns are tinted with a crown in the header; what a paid tier adds shows as a solid tick or a bold number pill; rows that are the same in every tier are quieter. `CompareRow.icon` puts an icon before the label. New string `feature` (first column heading).

## 1.13.1

Review fixes for the booked plan switch.
- **It no longer gets stuck.** It also goes once the store has renewed past its start date on the old plan (the switch was undone in the store), and 40 days after booking when no start date was known.
- It shows only while it can still happen: a paid account on that plan's tier that is still renewing. "Ends Dec 12" and "Switching to Yearly" never show together.
- A sign-in change never shows or clears the last person's switch, and broken saved data is ignored instead of crashing.
- Plans: with a switch booked, the plan in use stays the checked one, and the button's spoken name has no "✓".
- `switchPlan` uses the same purchase path as `buy`.

## 1.13.0

- **A booked plan switch shows.** On the App Store a longer plan of the same level (Monthly to Yearly) starts at the next renewal. `sub.switchPlan(plan)` buys it and, when the store still shows the old plan, remembers it as `sub.pendingSwitch` (`{ planId, startsAt }`) until the store shows the new plan or stops renewing.
  - Status card: "→ Switching to Yearly on Dec 12" under the plan.
  - Premium page: Change Plan reads "Yearly Starts Dec 12"; Before You Go doesn't offer the switch again.
  - Plans: the current plan says "Until Dec 12", the next one is tagged NEXT with "Yearly Starts Dec 12", one line explains it, and the button reads "✓ Yearly Starts Dec 12" (no second switch).
- `SubscriptionProvider` takes `storage` (AsyncStorage fits) to keep it between launches.
- New strings: `switchingTo`, `planStarts`, `nextPlan`, `untilDay`, `switchBooked`. `shortDay(iso)` is exported.

## 1.12.0

- The stay offer in Before You Go shows only to people on the plan it belongs to (a yearly subscriber is never offered a monthly discount that would move them down).
- Change Plan names only a longer plan; on the longest plan it names none.
- Cancel, Renew, Continue to Cancel and the stay offer run one at a time: a second quick tap does nothing. Restore's guard now holds for two taps in the same moment, and nothing updates after the page closes.
- Restore results are read out by VoiceOver and TalkBack. The welcome card no longer hides Start Exploring from VoiceOver.
- Plans: `onSwitch` may return the purchase result; a failed switch now says why.
- `isPlan(productId, planId)` (exported) matches "monthly", "app_monthly", "com.app.monthly" and "sub:base", not "bimonthly". Used for the current plan and the status card.
- Smaller: "What You Lose" without a date, the welcome card resets when someone else signs in.

## 1.11.0

- The default Premium mark is now **a king and a queen crown** (`<Crowns>`), drawn with SVG, on the top card, the welcome card and the status card; an outline version heads the Premium Features row. It replaces the rotated-square `<Diamond>` (still exported). Colors: `theme.king`, `kingFill`, `queen`, `queenFill`. `icon` still replaces it.
- Needs `react-native-svg` (a new peer dependency; Expo apps have it).

## 1.10.0

- **Restore Subscription always answers.** The row dims while pressed, shows a spinner and "Checking With the App Store…" (a second tap is ignored), then says what happened for a few seconds (`RESTORE_NOTE_MS`, 4 s): "You're All Set. Premium Is Active on This Apple ID.", "Premium Restored.", or "No Purchases Found on This Apple ID.". A failure says "Couldn't Reach the App Store. Tap to Try Again." until tapped, and still calls `onError`. On Android the words say Google Play and Google Account.
- Once paid, the hint under Restore is "Premium Missing on a Device? Tap to Check." instead of "Already paid on another device?".
- New strings: `restoreHintPaid(tier)`, `restoreChecking(store)`, `restoreAllSet(tier, account)`, `restoreDone(tier)`, `restoreNone(account)`, `restoreFailed(store)`.

## 1.9.0

The Premium page's subscription actions, the same for every app. Only the features, words, colors and icon are the app's.

- Free: **Get Premium** card with store prices ("From $3.99/month", "Or $29.99/year"), then **See Plans**, Restore Subscription and Have a Code?, then the features (open, a lock on each).
- Renewing: the status card, the features (closed, tap to open), then a **Cancel Subscription** button ("You keep Premium until Dec 12"), Change Plan (the other plan's price and a "Save n%" tag worked out from store prices) and Restore Subscription.
- **Before You Go**: Cancel opens a sheet first with what is lost (`loseList`), a subscriber discount when the store has `stayOfferId` (needs app-payments-kit 2.3.0 `loadOffer`/`buyOffer`), Switch to the longer plan with its saving, Keep Premium, and Continue to Cancel (always one tap). Skipped when there is nothing to show, or with `beforeCancel={false}`.
- After a cancel: Ends and "Auto-renew is off", then a **Renew Subscription** button and what is lost, then the features.
- Right after a first purchase on this phone, a **Welcome to Premium** card until Start Exploring (`useSubscription().justSubscribed` / `dismissWelcome()`).
- New props: `icon` (default `<Diamond>`), `loseList`, `featuresOpen` ({ free, paid }), `stayOfferId`, `beforeCancel`. `SubscriptionStatusCard` takes `icon` too.
- New theme colors `danger`, `onDanger`. New strings for every new word; `endsNote` is now "Auto-renew is off". `autoRenewOn` is no longer shown.
- `useSubscription()` adds `loadOffer(id)`, `buyOffer(offer)`. `PaymentsLike` can add `loadOffer?`, `buyOffer?`.

## 1.8.0

A whole Premium page for Settings, and its status card. **Nothing changes for an app that does not use them.**

- `<PremiumPage features onOpenPlans onError>`: the app lists its features (`{ key, label, detail?, icon?, toggle?, children? }`) and the kit draws them. Free: a lock on each, a tap opens the plans, then Upgrade, code and restore. Paid: the status card, each feature with its switch (when it has `toggle`) or "Included", then Manage, code and restore. After a cancel, Manage reads "Turn auto-renew back on". Development builds keep `SubscriptionRow` at the bottom for the tester switch.
- `<SubscriptionStatusCard>`: "You have Premium", the plan (the plan whose `id` ends the store product id, so `myapp_yearly` is "Yearly"), and "Renews …" or, after a cancel, "Ends …" with "Auto-renew is off. You keep it until then." A payment problem shows `graceNote`. Nothing for a free account.
- `statusLines(...)`: the same words without drawing, for tests or an app's own layout.
- New strings: `planName`, `endsNote`, `included`, `lockedHint`, `lockedLabel`, `autoRenewOn`.

## 1.7.0

Apps with no server row now see when Premium renews or ends. **Nothing to change in code; needs app-payments-kit 2.2.0 or later.**

- `SubscriptionRow` shows **Renews <date>**, or **Ends <date>** after a cancel, from the store's `renewal` when there is no server row. A server row still wins when there is one.
- `useSubscription().renewal` gives `{ until, willRenew, productId }` for screens of your own.

## 1.6.0

Prices are easier to read. **The wording changed for every app that upgrades; nothing to change in code.**

- Each plan shows its price and period on one line, `$29.99/year`, instead of the price with "a year" under it. The new `strings.per(unit, count)` makes the `/year` part.
- The per-month line under a longer plan reads `$2.50/month · save 50%` (was `$2.50 a month`).

## 1.5.0

The Plans screen is tighter. **The layout changed for every app that upgrades; nothing to change in code.**

- The app's logo (`header`) and Close share the first row, with less padding above them. Before, Close had a row of its own above the logo.
- Less space between the heading, the plans and the table.
- The main button sits right under the plans and the table, inside the scroll, instead of being pinned to the bottom of the screen (so a message above it can no longer crowd it).
- Restore purchases, Have a code? and Manage are on one line (they wrap on a narrow screen). The "Already subscribed?" box and its heading are gone; `strings.alreadySubscribed` is no longer shown but still accepted.
- The legal line is centred.

An app that draws the screen inside its own padded frame should drop the top padding it added for Close, or the space will show twice.

## 1.4.1 and earlier

See the git history.
