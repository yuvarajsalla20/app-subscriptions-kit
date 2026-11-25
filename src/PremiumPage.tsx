import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, View } from 'react-native';
import { Crowns, useLook, type LookProps } from './look';
import { UpdatingBox, type UpdatingDone } from './Updating';
import type { StoreOffer, StorePlan } from './payments';
import { isPlan, months, offerSaving, savings } from './pricing';
import { shortDay, subscriptionTerms } from './status';
import { useSubscription } from './SubscriptionProvider';
import type { StorePlatform } from './theme';
import { SubscriptionRow } from './SubscriptionRow';
import { usePremiumPageOpen } from './pageOpen';
import { BeforeYouGo } from './premium/BeforeYouGo';
import { IncludedList } from './premium/IncludedList';
import { useManage } from './premium/manage';
import { BigButton, cardStyle, Heading, keepTogether, PageRow, statusColors, Tag } from './premium/parts';
import { RestoreRow, useRestore } from './premium/restore';
import { TopCard } from './premium/TopCard';

export { SETTLE_MS, UNCONFIRMED_MS, UPDATED_MS } from './premium/manage';
export { RESTORE_NOTE_MS } from './premium/restore';

/** One feature on the Premium page. The app says what it is; 5.0.0: the kit lists it under Included With Premium. */
export interface PremiumFeature {
  /** Unique within the page. */
  key: string;
  label: string;
  /** A short line under the label, such as "7 Additional Sounds". */
  detail?: string;
  /** The app's icon (any element, such as a tinted tile). */
  icon?: ReactNode;
  /**
   * 5.0.0: its settings live in Preferences (an app-account-kit extra page with `under: 'app'`), and the line under the
   * included list names it. The Premium page shows plan facts only, never a switch or an editor.
   */
  inPreferences?: boolean;
  /** A feature that lives on another page (Data Export, in Account): once paid, a tap on its included row opens it. */
  onPress?: () => void;
}

export interface PremiumPageProps extends LookProps {
  features: readonly PremiumFeature[];
  /** Opens the plans: See Plans, Change Plan, Switch to Yearly and a tap on a locked row. */
  onOpenPlans: () => void;
  /** Called when Cancel, Renew, a code, Restore or an offer fails, with the error. */
  onError?: (error: unknown) => void;
  /** The mark on the top cards and the features row. Default: a king and a queen crown (`<Crowns>`). */
  icon?: ReactNode;
  /** What stops working when the paid tier ends, one short line each. Shown after a cancel and in Before You Go. */
  loseList?: readonly string[];
  /** @deprecated 3.0.0: ignored. The page no longer lists the features (app-settings-kit's comparison does); Premium Settings is always open. */
  featuresOpen?: { free?: boolean; paid?: boolean };
  /** A store discount for subscribers (an App Store promotional offer id), offered in Before You Go when the store has it. */
  stayOfferId?: string;
  /** Before You Go when Cancel Subscription is tapped (default true). It is skipped when it has nothing to show. */
  beforeCancel?: boolean;
  /** What swings in the box while a change is confirmed (wrap your own art in `<Swing>`). Default: the crowns, swinging. */
  updatingArt?: ReactNode;
}


/**
 * A whole Premium page for Settings, the same for every app: only the features, words, colors and icon are the app's.
 * 8.0.0: every account first sees the Your Plan card, which names the plan it holds. Free: Your Plan, Get Premium, then See
 * Plans, Restore Purchases and Redeem a Code. Paid (5.0.0, plan facts only): Your Plan,
 * Included With Premium (every feature, with a check), Manage (Change Plan, not on the longest plan, and Restore Purchases),
 * then Cancel Subscription last as a quiet red row (with Before You Go first). After a cancel: Manage with Renew
 * Subscription and what is lost, then the included list. Right after a purchase: a welcome card. The Free and Premium
 * comparison follows this page, drawn by app-settings-kit. While the page is open, the floating crown stays hidden.
 */
export function PremiumPage({ features, onOpenPlans, onError, icon, loseList, stayOfferId, beforeCancel = true, updatingArt, ...lookProps }: PremiumPageProps) {
  const look = useLook(lookProps);
  const { c, s, Text } = look;
  const sub = useSubscription();
  const { paid, config } = sub;
  // 5.0.0: the floating crown hides while this page is open; it covered Change Plan and repeats what the page already says.
  usePremiumPageOpen();
  // The server row only while it gives the tier, else the store; a date already past is left out (as on the status card).
  const terms = subscriptionTerms({ server: sub.server, renewal: sub.renewal, source: sub.source });
  const ending = terms.ending;
  const until = shortDay(terms.until);
  const fail = (e: unknown) => onError?.(e);
  const { danger, success, info, infoSoft } = statusColors(c);
  const plans = useStorePlans(sub, paid, ending, stayOfferId);
  const [sheet, setSheet] = useState(false);

  const per = (p: { priceString: string; period: StorePlan['period'] }) => `${p.priceString}${p.period ? s.per(p.period.unit, p.period.count) : ''}`;
  const tier = config.tiers[1] ?? 'premium';
  // The paid tier's name even on a free account ("Get Premium", not "Get Free").
  const tierLabel = paid ? sub.tierLabel : config.tierLabels[tier] ?? tier;
  const ofTier = plans.list.filter((p) => p.tier === (paid ? sub.tier : tier));
  const monthly = ofTier.find((p) => months(p) === 1);
  const longest = [...ofTier].sort((a, b) => (months(b) ?? 0) - (months(a) ?? 0))[0];
  const product = sub.renewal?.productId?.toLowerCase() ?? '';
  const mine = product ? ofTier.find((p) => isPlan(product, p.id)) : undefined;
  // Change Plan names a longer plan to move up to; on the longest plan it names none (the Plans screen only offers longer ones).
  const other = mine ? ofTier.find((p) => (months(p) ?? 0) > (months(mine) ?? 0)) : ofTier.find((p) => p !== mine);
  const labelOf = (p: StorePlan) => config.plans.find((x) => x.id === p.id)?.label ?? p.id;
  // A switch booked for the next renewal: Change Plan says when it starts instead of offering it again.
  const next = sub.pendingSwitch ? ofTier.find((p) => p.id === sub.pendingSwitch!.planId) : undefined;
  // "Premium Monthly" when the plan is known, so a date line says which plan it is about.
  const planName = mine ? `${tierLabel} ${labelOf(mine)}` : tierLabel;
  /** What the box says for a moment once a change shows: "You're All Set!" or "Subscription Updated", with the date line. */
  const describe = (): UpdatingDone => {
    const party = paid && !ending;
    const nextLabel = next ? labelOf(next) : '';
    const line = !until ? ''
      : sub.pendingSwitch && nextLabel ? s.switchingTo(nextLabel, shortDay(sub.pendingSwitch.startsAt) || until)
      : party ? s.renewsOn(planName, until)
      : paid ? s.keepUntil(planName, until)
      : '';
    return { title: party ? s.allSet : s.subscriptionUpdated, line, party };
  };
  const { updating, updated, waiting, manage, oneAtATime, closeBox } = useManage(sub, ending, describe, fail);

  // 2.1.0: the store that bills the subscription, when the store says (an iPhone subscription seen on Android names the App Store).
  const billedBy = sub.renewal?.billedBy;
  const platform: StorePlatform =
    billedBy === 'app_store' ? 'ios' : billedBy === 'google_play' ? 'android' : billedBy === 'web' ? 'web' : Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web';
  const words = { tierLabel, store: s.storeName(platform), account: s.storeAccount(platform) };
  const restore = useRestore(look, sub, words, fail);
  const restoreRow = (first = false) => <RestoreRow look={look} state={restore.state} onPress={() => void restore.restore()} paid={paid} words={words} first={first} />;

  const crowns = { king: c.king, kingFill: c.kingFill, queen: c.queen, queenFill: c.queenFill };
  // The crowns are wider than tall, so they are drawn a little shorter than the space they sit in.
  const mark = (size: number) => icon ?? <Crowns size={Math.round(size * 0.75)} {...crowns} />;
  const lose = loseList?.length ? (
    <View style={{ backgroundColor: c.premiumSoft, borderColor: c.premium, borderWidth: 1, borderRadius: c.radius + 4, padding: 14 }}>
      <Text style={{ color: c.text, fontSize: 14, fontWeight: '800' }}>{s.whatYouLose(until)}</Text>
      {loseList.map((l) => <Text key={l} style={{ color: c.text, fontSize: 13, marginTop: 4 }}>{`• ${l}`}</Text>)}
    </View>
  ) : null;

  const savePct = other ? savings(other, plans.list) : 0;
  // The stay offer belongs to one plan: offered only to people on that plan, never as a move to another one.
  // Offered only when it really costs less a month than the plan (a pay-up-front offer covers several months at once).
  const stay = plans.offer && mine && plans.offer.plan.id === mine.id && offerSaving(plans.offer) > 0 ? plans.offer : null;
  const switchTo = !next && longest && mine && longest !== mine && savings(longest, plans.list) > 0 ? longest : null;
  const hasSheet = beforeCancel && (!!lose || !!stay || !!switchTo);
  const card = cardStyle(c);

  // ---- Subscription section ----
  let actions: ReactNode;
  if (!paid) {
    const choice = monthly && longest && longest !== monthly ? s.priceChoice(per(monthly), per(longest)) : '';
    actions = (
      <>
        <Heading look={look} text={s.subscription} />
        <BigButton look={look} label={s.unlock} detail={choice} bg={c.premium} fg={c.onPremium} onPress={onOpenPlans} />
        <View style={card}>
          {restoreRow(true)}
          {sub.canRedeemCode ? <PageRow look={look} label={s.haveCode} detail={null} onPress={() => void sub.redeemCode('').catch(fail)} /> : null}
        </View>
      </>
    );
  } else {
    actions = (
      <>
        {/* 8.0.0: "Manage"; "Your Plan" is now the card at the top of the page. */}
        <Heading look={look} text={s.manageHeading} />
        {terms.billingIssue ? (
          <View accessibilityLiveRegion="polite" style={{ padding: 12, borderRadius: c.radius, backgroundColor: c.warn }}>
            <Text style={{ color: c.text, fontSize: 14, lineHeight: 20 }}>{s.graceNote}</Text>
          </View>
        ) : null}
        {waiting ? (
          <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: c.radius, backgroundColor: infoSoft }}>
            <ActivityIndicator size="small" color={info} />
            <Text style={{ flex: 1, color: c.text, fontSize: 14, lineHeight: 20 }}>{s.notConfirmedYet(s.storeCompany(platform))}</Text>
          </View>
        ) : null}
        {ending ? <BigButton look={look} label={s.renewSubscription} detail={until ? s.continuesAfter(planName, keepTogether(until)) : ''} bg={c.accent} fg={c.onAccent} onPress={manage} /> : null}
        {ending ? lose : null}
        <View style={card}>
          {/* On the longest plan there is nothing to move up to, so Change Plan is left out instead of opening an empty choice. */}
          {next ? (
            <PageRow look={look} label={s.changePlan} detail={s.planStarts(labelOf(next), shortDay(sub.pendingSwitch!.startsAt))} onPress={onOpenPlans} first detailColor={c.accent} bold />
          ) : other ? (
            <PageRow look={look} label={s.changePlan} detail={s.planLine(labelOf(other), per(other))} onPress={onOpenPlans} right={savePct > 0 ? <Tag look={look} text={s.saveTag(savePct)} bg={success} /> : null} first />
          ) : null}
          {restoreRow()}
        </View>
        {/* 5.0.0: Cancel is the last thing on the page, a quiet red row in its own card, with the end date under it. */}
        {ending ? null : (
          <View style={{ gap: 6 }}>
            <View style={card}>
              <Pressable accessibilityRole="button" accessibilityLabel={s.cancelSubscription} accessibilityHint={until ? s.keepUntil(planName, until) : undefined}
                onPress={hasSheet ? () => setSheet(true) : manage}
                style={({ pressed }) => [{ minHeight: 52, justifyContent: 'center', paddingHorizontal: 16 }, pressed ? { opacity: 0.6 } : null]}>
                <Text style={{ color: danger, fontSize: 16, fontWeight: '600' }}>{s.cancelSubscription}</Text>
              </Pressable>
            </View>
            {until ? <Text style={{ color: c.muted, fontSize: 13, lineHeight: 18, marginHorizontal: 16 }}>{s.keepUntil(planName, keepTogether(until))}</Text> : null}
          </View>
        )}
      </>
    );
  }

  const list = <IncludedList look={look} features={features} tierLabel={tierLabel} show={paid} />;
  // Free and after a cancel the Subscription section leads; a renewing subscriber sees the features first.
  const subscriptionFirst = !paid || ending;
  const close = () => setSheet(false);
  // Continue to Cancel opens the store's sheet only once this one has gone: iPhone will not show a sheet while another is closing.
  // onDismiss is iPhone only; elsewhere (and if it never comes) the effect below opens it after the slide-away.
  const manageAfterClose = useRef(false);
  const afterClose = () => {
    if (!manageAfterClose.current) return;
    manageAfterClose.current = false;
    manage();
  };
  useEffect(() => {
    if (sheet || !manageAfterClose.current) return;
    const t = setTimeout(afterClose, Platform.OS === 'ios' ? 700 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet]);
  const longPlan = ofTier.find((p) => p !== monthly && p.period);
  return (
    <View style={{ gap: 14 }}>
      <TopCard look={look} lookProps={lookProps} sub={sub} plans={plans.list} icon={icon} mark={mark} tierLabel={tierLabel} until={until} fromPrice={monthly ? per(monthly) : null} orPrice={longPlan ? per(longPlan) : null} />
      <UpdatingBox waiting={updating} done={updated} company={s.storeCompany(platform)} art={updatingArt} mark={icon} onClose={closeBox} {...lookProps} />
      {subscriptionFirst ? actions : list}
      {subscriptionFirst ? list : actions}
      {sub.tester.available ? <SubscriptionRow onOpenPlans={onOpenPlans} {...lookProps} /> : null}
      <BeforeYouGo
        look={look}
        visible={sheet}
        onClose={close}
        onDismiss={afterClose}
        onContinueToCancel={() => {
          manageAfterClose.current = true;
          close();
        }}
        planName={planName}
        tierLabel={tierLabel}
        until={until}
        lose={lose}
        stay={stay}
        offerPct={stay ? offerSaving(stay) : 0}
        onTakeOffer={(o) => oneAtATime(async () => { const r = await sub.buyOffer(o); if (r.ok) close(); else if (!r.cancelled) fail(new Error(r.message)); })}
        switchTo={switchTo}
        plans={plans.list}
        labelOf={labelOf}
        per={per}
        onOpenPlans={onOpenPlans}
      />
    </View>
  );
}

/** The store's plans, and the stay offer for a renewing subscriber when the app names one. */
function useStorePlans(sub: ReturnType<typeof useSubscription>, paid: boolean, ending: boolean, stayOfferId: string | undefined) {
  const [list, setList] = useState<StorePlan[]>([]);
  const [offer, setOffer] = useState<StoreOffer | null>(null);
  useEffect(() => {
    let live = true;
    sub.loadPlans().then((p) => { if (live) setList(p); }).catch(() => undefined);
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sub.ready]);
  useEffect(() => {
    let live = true;
    if (paid && !ending && stayOfferId) void sub.loadOffer(stayOfferId).then((o) => { if (live) setOffer(o); });
    else setOffer(null);
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paid, ending, stayOfferId, sub.ready]);
  return { list, offer };
}
