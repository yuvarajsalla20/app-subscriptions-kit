import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, ActivityIndicator, Modal, Platform, Pressable, Switch, View } from 'react-native';
import { Crowns, useLook, type LookProps } from './look';
import { UpdatingBox, type UpdatingDone } from './Updating';
import type { StoreOffer, StorePlan } from './payments';
import { isPlan, months, money, offerSaving, savings } from './pricing';
import { shortDay, subscriptionTerms } from './status';
import { SubscriptionStatusCard } from './StatusCard';
import { useSubscription } from './SubscriptionProvider';
import { DEFAULT_THEME, type StorePlatform } from './theme';
import { SubscriptionRow } from './SubscriptionRow';

/** One feature on the Premium page. The app says what it is; the kit draws it locked, switched or included. */
export interface PremiumFeature {
  /** Unique within the page. */
  key: string;
  label: string;
  /** A short line under the label, such as "7 Additional Sounds". */
  detail?: string;
  /** The app's icon (any element, such as a tinted tile). */
  icon?: ReactNode;
  /** A feature with its own on/off switch once unlocked. Without it the row says "Included" once unlocked. */
  toggle?: { value: boolean; onChange: (value: boolean) => void };
  /** Shown under the row once unlocked (and switched on, for a feature with a switch): an editor, more rows. */
  children?: ReactNode;
  /**
   * A feature that lives on another page (Data Export, in Account): once unlocked, a tap opens it and the row shows an arrow after "Included".
   * Locked, a tap still opens the plans. Not used on a row with a switch.
   */
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
  /**
   * Quiet after the store's own screen closes (default false). No "Updating Your Subscription…" loader and no "hasn't confirmed"
   * line: the page just stays as it is. It still listens quietly for 15 minutes, and if the store then shows a change, the page
   * updates and says "You're All Set!" or "Subscription Updated" as usual. Fits apps where closing the sheet with no change is common.
   */
  quietAfterStore?: boolean;
}


/** How long "You're All Set" or "No Purchases Found" stays before the hint comes back. */
export const RESTORE_NOTE_MS = 4000;

type RestoreState = 'idle' | 'checking' | 'allSet' | 'done' | 'none' | 'failed';

/**
 * A whole Premium page for Settings, the same for every app: only the features, words, colors and icon are the app's.
 * Free: Get Premium, then See Plans, Restore Purchases and Redeem a Code. Paid: the status card, Premium Settings (the
 * features with their own controls), then Cancel Subscription (with Before You Go first), Change Plan (not on the longest
 * plan) and Restore Purchases. After a cancel: Ends, then Renew Subscription and what is lost, then Premium Settings. Right
 * after a purchase: a welcome card. 3.0.0: the Free and Premium comparison follows this page, drawn by app-settings-kit.
 */
/** A date that never breaks across two lines ("Nov 15, 2026", not "Nov 15," then "2026"). */
const keepTogether = (date: string) => date.replace(/ /g, '\u00A0');
/** How long "Updating Your Subscription…" may show when nothing changes (the store's manage screen was closed as it was). */
const UPDATING_MS = 20_000;
/** How long the box says what changed before it closes by itself. */
export const UPDATED_MS = 2_200;
/**
 * The page state "Updating…" was waiting to change from, when the store still hadn't confirmed after UPDATING_MS. Kept outside
 * the page so that leaving Settings and coming back still shows the calm line and asks the store again. Null when nothing waits.
 */
let unconfirmedFrom: string | null = null;
let unconfirmedAt = 0;
/** How long the calm line may wait. Past this (also after Done with nothing changed) it goes, so it never stays for good. */
export const UNCONFIRMED_MS = 15 * 60_000;
/** The waiting state if it is still fresh; an old one is dropped. */
const stillUnconfirmed = () => {
  if (unconfirmedFrom !== null && Date.now() - unconfirmedAt > UNCONFIRMED_MS) unconfirmedFrom = null;
  return unconfirmedFrom;
};

export function PremiumPage({ features, onOpenPlans, onError, icon, loseList, stayOfferId, beforeCancel = true, updatingArt, quietAfterStore = false, ...look }: PremiumPageProps) {
  const { c, s, Text } = useLook(look);
  const sub = useSubscription();
  const { paid, config } = sub;
  // The server row only while it gives the tier, else the store; a date already past is left out (as on the status card).
  const terms = subscriptionTerms({ server: sub.server, renewal: sub.renewal, source: sub.source });
  const ending = terms.ending;
  const until = shortDay(terms.until);
  const fail = (e: unknown) => onError?.(e);
  const danger = c.danger ?? DEFAULT_THEME.danger!;
  const onDanger = c.onDanger ?? DEFAULT_THEME.onDanger!;
  const success = c.success ?? DEFAULT_THEME.success!;
  const successSoft = c.successSoft ?? DEFAULT_THEME.successSoft!;
  const onTag = c.onTag ?? DEFAULT_THEME.onTag!;
  const info = c.info ?? DEFAULT_THEME.info!;
  const infoSoft = c.infoSoft ?? DEFAULT_THEME.infoSoft!;
  const infoBadge = c.infoBadge ?? DEFAULT_THEME.infoBadge!;
  const dangerSoft = c.dangerSoft ?? DEFAULT_THEME.dangerSoft!;
  const dangerBadge = c.dangerBadge ?? DEFAULT_THEME.dangerBadge!;

  const [plans, setPlans] = useState<StorePlan[]>([]);
  const [offer, setOffer] = useState<StoreOffer | null>(null);
  const [sheet, setSheet] = useState(false);
  const [restoring, setRestoring] = useState<RestoreState>('idle');
  // After the store's manage screen closes: "Updating Your Subscription…" until what the person changed there shows (or 20 seconds).
  // Only what the sheet can change counts (the tier, auto-renew, the plan, a booked switch). A fresher end date alone is not the
  // answer: it used to close the loader early, and the page then changed by itself a few seconds later.
  const stateKey = JSON.stringify([sub.tier, ending, sub.renewal?.productId ?? null, sub.pendingSwitch?.planId ?? null]);
  const stateNow = useRef(stateKey);
  stateNow.current = stateKey;
  const [updatingFrom, setUpdatingFrom] = useState<string | null>(null);
  const [updated, setUpdated] = useState<UpdatingDone | null>(null);
  // After "Updating…" gave up waiting: a calm line until the store shows the change. Survives leaving the page (see unconfirmedFrom).
  const [waitingFrom, setWaitingFrom] = useState<string | null>(() => (stillUnconfirmed() === stateKey ? stateKey : null));
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guards that read now, not at the last render: two quick taps never start two store calls.
  const restoreBusy = useRef(false);
  const storeBusy = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (noteTimer.current) clearTimeout(noteTimer.current);
    };
  }, []);
  /** Runs one store action at a time (the manage sheet, a purchase); a tap while one runs is ignored. */
  const oneAtATime = (job: () => Promise<unknown>) => {
    if (storeBusy.current) return;
    storeBusy.current = true;
    void job().catch(fail).finally(() => { storeBusy.current = false; });
  };
  // Opening the page while a change is still unconfirmed asks the store again. If it changed while the page was closed, the line just goes.
  useEffect(() => {
    if (stillUnconfirmed() === null) return;
    if (unconfirmedFrom !== stateNow.current) unconfirmedFrom = null;
    else void sub.refresh().catch(fail);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    let live = true;
    sub.loadPlans().then((p) => { if (live) setPlans(p); }).catch(() => undefined);
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

  const per = (p: { priceString: string; period: StorePlan['period'] }) => `${p.priceString}${p.period ? s.per(p.period.unit, p.period.count) : ''}`;
  const tier = config.tiers[1] ?? 'premium';
  // The paid tier's name even on a free account ("Get Premium", not "Get Free").
  const tierLabel = paid ? sub.tierLabel : config.tierLabels[tier] ?? tier;
  const ofTier = plans.filter((p) => p.tier === (paid ? sub.tier : tier));
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
  /** The box says what changed for a moment: "You're All Set!" or "Subscription Updated", with the date line. */
  const confirmed = () => {
    const party = paid && !ending;
    const nextLabel = next ? labelOf(next) : '';
    const line = !until ? ''
      : sub.pendingSwitch && nextLabel ? s.switchingTo(nextLabel, shortDay(sub.pendingSwitch.startsAt) || until)
      : party ? s.renewsOn(planName, until)
      : paid ? s.keepUntil(planName, until)
      : '';
    setUpdated({ title: party ? s.allSet : s.subscriptionUpdated, line, party });
  };
  // The box waits for the change (or 20 seconds). With no answer by then, the calm line takes over and waits on.
  useEffect(() => {
    if (updatingFrom === null) return;
    if (stateKey !== updatingFrom) {
      setUpdatingFrom(null);
      confirmed();
      return;
    }
    const t = setTimeout(() => {
      unconfirmedFrom = updatingFrom;
      unconfirmedAt = Date.now();
      setWaitingFrom(updatingFrom);
      setUpdatingFrom(null);
    }, UPDATING_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updatingFrom, stateKey]);
  // The line never stays for good: it goes once UNCONFIRMED_MS has passed, even with the page open.
  useEffect(() => {
    if (waitingFrom === null) return;
    const t = setTimeout(() => { if (stillUnconfirmed() === null) setWaitingFrom(null); }, Math.max(0, unconfirmedAt + UNCONFIRMED_MS - Date.now()) + 50);
    return () => clearTimeout(t);
  }, [waitingFrom]);
  // A late answer still ends with "You're All Set!" or "Subscription Updated", and the calm line goes.
  useEffect(() => {
    if (waitingFrom === null || stateKey === waitingFrom) return;
    unconfirmedFrom = null;
    setWaitingFrom(null);
    confirmed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitingFrom, stateKey]);
  useEffect(() => {
    if (!updated) return;
    const t = setTimeout(() => setUpdated(null), UPDATED_MS);
    return () => clearTimeout(t);
  }, [updated]);

  const card = { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: c.radius, overflow: 'hidden' as const };
  const line = { borderTopWidth: 1, borderTopColor: c.border };
  const crowns = { king: c.king, kingFill: c.kingFill, queen: c.queen, queenFill: c.queenFill };
  // The crowns are wider than tall, so they are drawn a little shorter than the space they sit in.
  const mark = (size: number, outline = false) => icon ?? <Crowns size={Math.round(size * 0.75)} outline={outline} {...crowns} />;
  const tag = (text: string, bg: string) => (
    <View style={{ backgroundColor: bg, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ color: onTag, fontSize: 11, fontWeight: '800' }}>{text}</Text>
    </View>
  );
  const row = (label: string, detail: string | null, onPress: () => void, right?: ReactNode, first = false,
    opts: { detailColor?: string; bold?: boolean; end?: ReactNode; tint?: string; busy?: boolean } = {}) => (
    <Pressable key={label} accessibilityRole="button" accessibilityState={opts.busy ? { busy: true } : undefined}
      accessibilityLabel={detail ? `${label}. ${detail}` : label} onPress={opts.busy ? undefined : onPress}
      style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 60, paddingVertical: 8, paddingHorizontal: 16 },
        !first && line, opts.tint ? { backgroundColor: opts.tint } : null, pressed && !opts.busy ? { opacity: 0.6 } : null]}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.text, fontWeight: '600', fontSize: 16 }}>{label}</Text>
        {detail ? <Text style={{ color: opts.detailColor ?? c.muted, fontSize: 13, fontWeight: opts.bold ? '700' : '400', marginTop: 2 }}>{detail}</Text> : null}
      </View>
      {right ?? null}
      {opts.end ?? <Text style={{ color: c.muted, fontSize: 18 }}>›</Text>}
    </Pressable>
  );

  // ---- Restore Subscription: always tappable, and it always answers ----
  // 2.1.0: the store that bills the subscription, when the store says (an iPhone subscription seen on Android names the App Store).
  const billedBy = sub.renewal?.billedBy;
  const platform: StorePlatform =
    billedBy === 'app_store' ? 'ios' : billedBy === 'google_play' ? 'android' : billedBy === 'web' ? 'web' : Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web';
  const store = s.storeName(platform);
  const account = s.storeAccount(platform);
  const restore = async () => {
    if (restoreBusy.current) return;
    restoreBusy.current = true;
    if (noteTimer.current) clearTimeout(noteTimer.current);
    const wasPaid = paid;
    setRestoring('checking');
    let next: RestoreState;
    try {
      const r = await sub.restore();
      if (r.ok) next = config.tiers.indexOf(r.tier) > 0 ? (wasPaid ? 'allSet' : 'done') : 'none';
      else if (r.cancelled) next = 'idle';
      else { next = 'failed'; fail(new Error(r.message)); }
    } catch (e) {
      next = 'failed';
      fail(e);
    }
    restoreBusy.current = false;
    if (!alive.current) return;
    setRestoring(next);
    const said = next === 'allSet' ? s.restoreAllSet(tierLabel, account) : next === 'done' ? s.restoreDone(tierLabel)
      : next === 'none' ? s.restoreNone(account) : next === 'failed' ? s.restoreFailed(store) : '';
    if (said) AccessibilityInfo.announceForAccessibility?.(said);
    if (next === 'allSet' || next === 'done' || next === 'none') noteTimer.current = setTimeout(() => { if (alive.current) setRestoring('idle'); }, RESTORE_NOTE_MS);
  };
  const badge = (bg: string, fg: string, glyph: string) => (
    <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: fg, fontSize: 13, fontWeight: '800' }}>{glyph}</Text>
    </View>
  );
  const restoreRow = (first = false) => {
    const label = s.restoreSubscription;
    switch (restoring) {
      case 'checking':
        return row(label, s.restoreChecking(store), restore, undefined, first, { detailColor: c.accent, end: <ActivityIndicator color={c.accent} />, busy: true });
      case 'allSet':
        return row(label, s.restoreAllSet(tierLabel, account), restore, undefined, first, { detailColor: success, bold: true, end: badge(success, onTag, '✓'), tint: successSoft });
      case 'done':
        return row(label, s.restoreDone(tierLabel), restore, undefined, first, { detailColor: success, bold: true, end: badge(success, onTag, '✓'), tint: successSoft });
      case 'none':
        return row(label, s.restoreNone(account), restore, undefined, first, { detailColor: info, bold: true, end: badge(infoBadge, info, 'i'), tint: infoSoft });
      case 'failed':
        return row(label, s.restoreFailed(store), restore, undefined, first, { detailColor: danger, bold: true, end: badge(dangerBadge, danger, '!'), tint: dangerSoft });
      default:
        return row(label, paid ? s.restoreHintPaid(tierLabel) : s.restoreHint, restore, undefined, first);
    }
  };
  const bigButton = (label: string, detail: string, bg: string, fg: string, onPress: () => void) => (
    <Pressable accessibilityRole="button" accessibilityLabel={detail ? `${label}. ${detail}` : label} onPress={onPress}
      style={{ minHeight: 62, borderRadius: c.radius + 8, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 18 }}>
      <Text style={{ color: fg, fontSize: 17, fontWeight: '800' }}>{label}</Text>
      {detail ? <Text style={{ color: fg, fontSize: 13, fontWeight: '600', opacity: 0.9, marginTop: 2 }}>{detail}</Text> : null}
    </Pressable>
  );
  const heading = (text: string) => (
    <Text style={{ color: c.muted, fontSize: 13, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginHorizontal: 6, marginBottom: -6 }}>{text}</Text>
  );
  const lose = loseList?.length ? (
    <View style={{ backgroundColor: c.premiumSoft, borderColor: c.premium, borderWidth: 1, borderRadius: c.radius + 4, padding: 14 }}>
      <Text style={{ color: c.text, fontSize: 14, fontWeight: '800' }}>{s.whatYouLose(until)}</Text>
      {loseList.map((l) => <Text key={l} style={{ color: c.text, fontSize: 13, marginTop: 4 }}>{`• ${l}`}</Text>)}
    </View>
  ) : null;

  const manage = () => oneAtATime(async () => {
    const before = stateNow.current;
    // "Updating…" from the moment the store's screen closes, unless the change is already here. It stays until the change shows,
    // then the page and "You're All Set!" change together.
    const wait = () => {
      if (!alive.current || stateNow.current !== before) return;
      if (quietAfterStore) {
        // Listen without showing anything: a later change still ends with the usual confirmation.
        unconfirmedFrom = before;
        unconfirmedAt = Date.now();
        setWaitingFrom(before);
        return;
      }
      unconfirmedFrom = null;
      setWaitingFrom(null);
      setUpdatingFrom(before);
    };
    await sub.openManage(wait);
    wait(); // app-payments-kit before 2.5.0 does not say when the screen closed
  });
  const updating = (
    <UpdatingBox
      waiting={updatingFrom !== null}
      done={updated}
      company={s.storeCompany(platform)}
      art={updatingArt}
      mark={icon}
      onClose={() => { setUpdatingFrom(null); setUpdated(null); }}
      {...look}
    />
  );
  const savePct = other ? savings(other, plans) : 0;
  // The stay offer belongs to one plan: offered only to people on that plan, never as a move to another one.
  // Offered only when it really costs less a month than the plan (a pay-up-front offer covers several months at once).
  const stay = offer && mine && offer.plan.id === mine.id && offerSaving(offer) > 0 ? offer : null;
  const offerPct = stay ? offerSaving(stay) : 0;
  const switchTo = !next && longest && mine && longest !== mine && savings(longest, plans) > 0 ? longest : null;
  const hasSheet = beforeCancel && (!!lose || !!stay || !!switchTo);

  // ---- Top card ----
  let top: ReactNode;
  if (paid && sub.justSubscribed) {
    top = (
      // Not one accessible block, so VoiceOver can still reach Start Exploring inside it.
      <View style={{ alignItems: 'center', padding: 22, borderRadius: c.radius + 8, backgroundColor: c.premiumSoft, borderWidth: 2, borderColor: c.premium }}>
        <Text style={{ position: 'absolute', left: 28, top: 16, color: c.premium, fontSize: 14 }}>✦</Text>
        <Text style={{ position: 'absolute', right: 30, top: 24, color: c.premium, fontSize: 18 }}>✦</Text>
        <Text style={{ position: 'absolute', left: 54, top: 92, color: c.premium, fontSize: 10 }}>✦</Text>
        <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }}>{mark(44)}</View>
        <Text style={{ color: c.text, fontSize: 22, fontWeight: '800', marginTop: 12 }}>{s.welcomeTitle(tierLabel)}</Text>
        <Text style={{ color: c.muted, fontSize: 14, marginTop: 4, textAlign: 'center' }}>{until ? `${s.welcomeBody} ${s.renews} ${until}.` : s.welcomeBody}</Text>
        <Pressable accessibilityRole="button" onPress={sub.dismissWelcome} style={{ marginTop: 14, minHeight: 46, paddingHorizontal: 26, borderRadius: 23, backgroundColor: c.accent, justifyContent: 'center' }}>
          <Text style={{ color: c.onAccent, fontSize: 16, fontWeight: '800' }}>{s.startExploring}</Text>
        </Pressable>
      </View>
    );
  } else if (paid) {
    top = <SubscriptionStatusCard icon={icon} {...look} />;
  } else {
    const longPlan = ofTier.find((p) => p !== monthly && p.period);
    top = (
      <View accessible style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: c.radius + 8, backgroundColor: c.premiumSoft, borderWidth: 1, borderColor: c.premium }}>
        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }}>{mark(26)}</View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: c.text, fontSize: 18, fontWeight: '800' }}>{s.getPremium(tierLabel)}</Text>
          {monthly ? <Text style={{ color: c.accent, fontSize: 14, fontWeight: '700' }}>{s.fromPrice(per(monthly))}</Text> : null}
          <Text style={{ color: c.muted, fontSize: 13 }}>{longPlan ? s.orPrice(per(longPlan)) : s.getPremiumNote}</Text>
        </View>
      </View>
    );
  }

  // ---- Subscription section ----
  let actions: ReactNode;
  if (!paid) {
    const choice = monthly && longest && longest !== monthly ? s.priceChoice(per(monthly), per(longest)) : '';
    actions = (
      <>
        {heading(s.subscription)}
        {bigButton(s.unlock, choice, c.premium, c.onPremium, onOpenPlans)}
        <View style={card}>
          {restoreRow(true)}
          {sub.canRedeemCode ? row(s.haveCode, null, () => void sub.redeemCode('').catch(fail)) : null}
        </View>
      </>
    );
  } else {
    actions = (
      <>
        {heading(s.subscription)}
        {terms.billingIssue ? (
          <View accessibilityLiveRegion="polite" style={{ padding: 12, borderRadius: c.radius, backgroundColor: c.warn }}>
            <Text style={{ color: c.text, fontSize: 14, lineHeight: 20 }}>{s.graceNote}</Text>
          </View>
        ) : null}
        {waitingFrom !== null && !quietAfterStore ? (
          <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: c.radius, backgroundColor: infoSoft }}>
            <ActivityIndicator size="small" color={info} />
            <Text style={{ flex: 1, color: c.text, fontSize: 14, lineHeight: 20 }}>{s.notConfirmedYet(s.storeCompany(platform))}</Text>
          </View>
        ) : null}
        {ending
          ? bigButton(s.renewSubscription, until ? s.continuesAfter(planName, keepTogether(until)) : '', c.accent, c.onAccent, manage)
          : bigButton(s.cancelSubscription, until ? s.keepUntil(planName, keepTogether(until)) : '', danger, onDanger, hasSheet ? () => setSheet(true) : manage)}
        {ending ? lose : null}
        <View style={card}>
          {/* On the longest plan there is nothing to move up to, so Change Plan is left out instead of opening an empty choice. */}
          {next
            ? row(s.changePlan, s.planStarts(labelOf(next), shortDay(sub.pendingSwitch!.startsAt)), onOpenPlans, undefined, true, { detailColor: c.accent, bold: true })
            : other
              ? row(s.changePlan, s.planLine(labelOf(other), per(other)), onOpenPlans, savePct > 0 ? tag(s.saveTag(savePct), success) : null, true)
              : null}
          {restoreRow()}
        </View>
      </>
    );
  }

  // ---- Premium Settings ----
  // 3.0.0: the plan page in app-settings-kit (10.0.0) ends with its Free and Premium comparison, so this page no longer
  // repeats the feature list. A subscriber sees only the features that have their own controls (a switch, an editor, a
  // page to open), under Premium Settings; a free account sees none here.
  const settable = paid ? features.filter((f) => f.toggle || f.children || f.onPress) : [];
  const list = settable.length ? (
    <>
      {heading(s.premiumSettings(tierLabel))}
      <View style={card}>
        {settable.map((f, i) => {
          const on = !f.toggle || f.toggle.value;
          const press = f.toggle ? () => f.toggle!.onChange(!f.toggle!.value) : f.onPress;
          return (
            <View key={f.key} style={i ? line : undefined}>
              <Pressable
                onPress={press}
                disabled={!press}
                accessibilityRole={f.toggle ? 'switch' : 'button'}
                accessibilityLabel={f.label}
                accessibilityHint={!f.toggle && f.onPress ? s.opensPage : undefined}
                accessibilityState={f.toggle ? { checked: f.toggle.value } : undefined}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, minHeight: 56 }}
              >
                {f.icon ?? null}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.text, fontSize: 16, fontWeight: '600' }}>{f.label}</Text>
                  {f.detail ? <Text style={{ color: c.muted, fontSize: 12, marginTop: 2 }}>{f.detail}</Text> : null}
                </View>
                {f.toggle ? (
                  <Switch value={f.toggle.value} onValueChange={f.toggle.onChange} trackColor={{ true: c.accent, false: c.border }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
                ) : f.onPress ? (
                  <Text style={{ color: c.muted, fontSize: 20, lineHeight: 22 }} accessibilityElementsHidden importantForAccessibility="no">›</Text>
                ) : null}
              </Pressable>
              {on && f.children ? <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>{f.children}</View> : null}
            </View>
          );
        })}
      </View>
    </>
  ) : null;

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
  return (
    <View style={{ gap: 14 }}>
      {top}
      {updating}
      {subscriptionFirst ? actions : list}
      {subscriptionFirst ? list : actions}
      {sub.tester.available ? <SubscriptionRow onOpenPlans={onOpenPlans} {...look} /> : null}
      <Modal visible={sheet} transparent animationType="slide" onRequestClose={close} onDismiss={afterClose}>
        <Pressable accessibilityLabel={s.close} onPress={close} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} />
        <View style={{ backgroundColor: c.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 36, gap: 12 }}>
          <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: c.border, marginBottom: 4 }} />
          <Text accessibilityRole="header" style={{ color: c.text, fontSize: 22, fontWeight: '800', textAlign: 'center' }}>{s.beforeYouGo}</Text>
          {until ? <Text style={{ color: c.muted, fontSize: 14, textAlign: 'center' }}>{s.keepEitherWay(planName, until)}</Text> : null}
          {lose}
          {stay || switchTo ? heading(s.insteadYouCould) : null}
          {stay ? (
            <View style={card}>
              {row(s.stayOffer(offerPct), s.offerLine(per({ priceString: stay.priceString, period: stay.period }), stay.cycles * stay.period.count, stay.period.unit),
                () => oneAtATime(async () => { const r = await sub.buyOffer(stay); if (r.ok) close(); else if (!r.cancelled) fail(new Error(r.message)); }),
                tag(s.offerTag, c.premium), true)}
            </View>
          ) : null}
          {switchTo ? (
            <View style={card}>
              {row(s.switchToPlan(labelOf(switchTo)), s.aboutPerMonth(switchTo.period ? `${switchTo.priceString} ${s.every(switchTo.period.unit, switchTo.period.count)}` : switchTo.priceString, money(switchTo.price / (months(switchTo) ?? 1), switchTo.currency)),
                () => { close(); onOpenPlans(); }, tag(s.saveTag(savings(switchTo, plans)), success), true)}
            </View>
          ) : null}
          {bigButton(s.keepPremium(tierLabel), '', c.accent, c.onAccent, close)}
          <Pressable accessibilityRole="button" onPress={() => { manageAfterClose.current = true; close(); }} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: danger, fontSize: 15, fontWeight: '700' }}>{s.continueToCancel}</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}
