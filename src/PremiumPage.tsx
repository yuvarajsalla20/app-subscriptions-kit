import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, ActivityIndicator, Modal, Platform, Pressable, Switch, View } from 'react-native';
import { Crowns, Lock, useLook, type LookProps } from './look';
import type { StoreOffer, StorePlan } from './payments';
import { isPlan, months, money, savings } from './pricing';
import { shortDay } from './status';
import { SubscriptionStatusCard } from './StatusCard';
import { useSubscription } from './SubscriptionProvider';
import { SubscriptionRow } from './SubscriptionRow';

/** One feature on the Premium page. The app says what it is; the kit draws it locked, switched or included. */
export interface PremiumFeature {
  /** Unique within the page. */
  key: string;
  label: string;
  /** A short line under the label, such as "7 extra sounds". Without one, a locked row shows `strings.lockedHint`. */
  detail?: string;
  /** The app's icon (any element, such as a tinted tile). */
  icon?: ReactNode;
  /** A feature with its own on/off switch once unlocked. Without it the row says "Included" once unlocked. */
  toggle?: { value: boolean; onChange: (value: boolean) => void };
  /** Shown under the row once unlocked (and switched on, for a feature with a switch): an editor, more rows. */
  children?: ReactNode;
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
  /** Whether the features list starts open. Default: open for a free account, closed once paid. */
  featuresOpen?: { free?: boolean; paid?: boolean };
  /** A store discount for subscribers (an App Store promotional offer id), offered in Before You Go when the store has it. */
  stayOfferId?: string;
  /** Before You Go when Cancel Subscription is tapped (default true). It is skipped when it has nothing to show. */
  beforeCancel?: boolean;
}


/** How long "You're All Set" or "No Purchases Found" stays before the hint comes back. */
export const RESTORE_NOTE_MS = 4000;

type RestoreState = 'idle' | 'checking' | 'allSet' | 'done' | 'none' | 'failed';

/**
 * A whole Premium page for Settings, the same for every app: only the features, words, colors and icon are the app's.
 * Free: Get Premium, then See Plans, Restore and Have a Code?, then the features (open) with locks. Paid: the status
 * card, the features (closed), then Cancel Subscription (with Before You Go first), Change Plan and Restore. After a
 * cancel: Ends, then Renew Subscription and what is lost, then the features. Right after a purchase: a welcome card.
 */
export function PremiumPage({ features, onOpenPlans, onError, icon, loseList, featuresOpen, stayOfferId, beforeCancel = true, ...look }: PremiumPageProps) {
  const { c, s, Text } = useLook(look);
  const sub = useSubscription();
  const { paid, config } = sub;
  const ending = sub.server ? sub.server.willRenew === false : sub.renewal?.willRenew === false;
  const until = shortDay(sub.server?.activeUntil ?? sub.renewal?.until);
  const fail = (e: unknown) => onError?.(e);
  const danger = c.danger ?? '#B42318';
  const onDanger = c.onDanger ?? '#FFFFFF';

  const [plans, setPlans] = useState<StorePlan[]>([]);
  const [offer, setOffer] = useState<StoreOffer | null>(null);
  const [open, setOpen] = useState<boolean | null>(null);
  const [sheet, setSheet] = useState(false);
  const [restoring, setRestoring] = useState<RestoreState>('idle');
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
  const isOpen = open ?? (paid ? featuresOpen?.paid ?? false : featuresOpen?.free ?? true);

  const card = { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: c.radius, overflow: 'hidden' as const };
  const line = { borderTopWidth: 1, borderTopColor: c.border };
  const crowns = { king: c.king, kingFill: c.kingFill, queen: c.queen, queenFill: c.queenFill };
  // The crowns are wider than tall, so they are drawn a little shorter than the space they sit in.
  const mark = (size: number, outline = false) => icon ?? <Crowns size={Math.round(size * 0.75)} outline={outline} {...crowns} />;
  const tag = (text: string, bg: string) => (
    <View style={{ backgroundColor: bg, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>{text}</Text>
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
  const ios = Platform.OS !== 'android';
  const store = ios ? 'App Store' : 'Google Play';
  const account = ios ? 'Apple ID' : 'Google Account';
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
        return row(label, s.restoreAllSet(tierLabel, account), restore, undefined, first, { detailColor: '#15803D', bold: true, end: badge('#15803D', '#FFFFFF', '✓'), tint: '#F0FDF4' });
      case 'done':
        return row(label, s.restoreDone(tierLabel), restore, undefined, first, { detailColor: '#15803D', bold: true, end: badge('#15803D', '#FFFFFF', '✓'), tint: '#F0FDF4' });
      case 'none':
        return row(label, s.restoreNone(account), restore, undefined, first, { detailColor: '#0369A1', bold: true, end: badge('#E0F2FE', '#0369A1', 'i'), tint: '#F0F9FF' });
      case 'failed':
        return row(label, s.restoreFailed(store), restore, undefined, first, { detailColor: danger, bold: true, end: badge('#FDE7E5', danger, '!'), tint: '#FEF3F2' });
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

  const manage = () => oneAtATime(() => sub.openManage());
  const savePct = other ? savings(other, plans) : 0;
  // The stay offer belongs to one plan: offered only to people on that plan, never as a move to another one.
  const stay = offer && mine && offer.plan.id === mine.id ? offer : null;
  const offerPct = stay && stay.plan.price > 0 ? Math.round(100 - (100 * stay.price) / stay.plan.price) : 0;
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
        {ending
          ? bigButton(s.renewSubscription, until ? s.continuesAfter(tierLabel, until) : '', c.accent, c.onAccent, manage)
          : bigButton(s.cancelSubscription, until ? s.keepUntil(tierLabel, until) : '', danger, onDanger, hasSheet ? () => setSheet(true) : manage)}
        {ending ? lose : null}
        <View style={card}>
          {next
            ? row(s.changePlan, s.planStarts(labelOf(next), shortDay(sub.pendingSwitch!.startsAt)), onOpenPlans, undefined, true, { detailColor: c.accent, bold: true })
            : row(s.changePlan, other ? s.planLine(labelOf(other), per(other)) : null, onOpenPlans, savePct > 0 ? tag(s.saveTag(savePct), '#15803D') : null, true)}
          {restoreRow()}
        </View>
      </>
    );
  }

  // ---- Features ----
  const list = (
    <View style={card}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: isOpen }} onPress={() => setOpen(!isOpen)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingVertical: 8, paddingHorizontal: 16 }}>
        {mark(22, true)}
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.text, fontSize: 16, fontWeight: '700' }}>{s.premiumFeatures(tierLabel)}</Text>
          <Text style={{ color: c.muted, fontSize: 13, marginTop: 2 }}>{isOpen ? s.featureCount(features.length) : `${s.featureCount(features.length)} · ${s.tapToSee}`}</Text>
        </View>
        <Text style={{ color: c.muted, fontSize: 16 }}>{isOpen ? '▴' : '▾'}</Text>
      </Pressable>
      {isOpen
        ? features.map((f) => {
            const on = paid && (!f.toggle || f.toggle.value);
            const press = !paid ? onOpenPlans : f.toggle ? () => f.toggle!.onChange(!f.toggle!.value) : undefined;
            return (
              <View key={f.key} style={line}>
                <Pressable
                  onPress={press}
                  disabled={!press}
                  accessibilityRole={paid && f.toggle ? 'switch' : 'button'}
                  accessibilityLabel={paid ? f.label : `${f.label}, ${s.lockedLabel}`}
                  accessibilityState={paid && f.toggle ? { checked: f.toggle.value } : undefined}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, minHeight: 56 }}
                >
                  {f.icon ?? null}
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.text, fontSize: 16, fontWeight: '600' }}>{f.label}</Text>
                    {f.detail || !paid ? <Text style={{ color: c.muted, fontSize: 12, marginTop: 2 }}>{f.detail ?? s.lockedHint}</Text> : null}
                  </View>
                  {!paid ? (
                    <Lock color={c.premium} size={18} />
                  ) : f.toggle ? (
                    <Switch value={f.toggle.value} onValueChange={f.toggle.onChange} trackColor={{ true: c.accent, false: c.border }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
                  ) : (
                    <Text style={{ color: c.accent, fontSize: 13, fontWeight: '700' }}>{`✓ ${s.included}`}</Text>
                  )}
                </Pressable>
                {on && f.children ? <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>{f.children}</View> : null}
              </View>
            );
          })
        : null}
    </View>
  );

  // Free and after a cancel the Subscription section leads; a renewing subscriber sees the features first.
  const subscriptionFirst = !paid || ending;
  const close = () => setSheet(false);
  return (
    <View style={{ gap: 14 }}>
      {top}
      {subscriptionFirst ? actions : list}
      {subscriptionFirst ? list : actions}
      {sub.tester.available ? <SubscriptionRow onOpenPlans={onOpenPlans} {...look} /> : null}
      <Modal visible={sheet} transparent animationType="slide" onRequestClose={close}>
        <Pressable accessibilityLabel={s.close} onPress={close} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} />
        <View style={{ backgroundColor: c.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 36, gap: 12 }}>
          <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: c.border, marginBottom: 4 }} />
          <Text accessibilityRole="header" style={{ color: c.text, fontSize: 22, fontWeight: '800', textAlign: 'center' }}>{s.beforeYouGo}</Text>
          {until ? <Text style={{ color: c.muted, fontSize: 14, textAlign: 'center' }}>{s.keepEitherWay(tierLabel, until)}</Text> : null}
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
              {row(s.switchToPlan(labelOf(switchTo)), s.aboutPerMonth(per(switchTo), money(switchTo.price / (months(switchTo) ?? 1), switchTo.currency)),
                () => { close(); onOpenPlans(); }, tag(s.saveTag(savings(switchTo, plans)), '#15803D'), true)}
            </View>
          ) : null}
          {bigButton(s.keepPremium(tierLabel), '', c.accent, c.onAccent, close)}
          <Pressable accessibilityRole="button" onPress={() => { close(); manage(); }} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: danger, fontSize: 15, fontWeight: '700' }}>{s.continueToCancel}</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}
