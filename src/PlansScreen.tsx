import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { CompareTable } from './CompareTable';
import { useLook, type LookProps } from './look';
import type { PurchaseResult, StorePlan } from './payments';
import { money, perMonth, savings } from './pricing';
import { rank } from './rules';
import { useSubscription } from './SubscriptionProvider';

export interface PlansScreenProps extends LookProps {
  /** Drawn at the top: a logo and a line on what the paid tier gives. */
  header?: ReactNode;
  onClose?: () => void;
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
  /** Shown only where the store can't be reached at all (web, Expo Go), so the screen can be designed and tested. */
  previewPlans?: StorePlan[];
  /** Open on this tier's tab (apps with several paid tiers). */
  initialTier?: string;
  /** Called after a purchase or restore turned a paid tier on. */
  onUnlocked?: (tier: string) => void;
  /** Hide the Free vs paid table. */
  hideCompare?: boolean;
  /**
   * The plan id (from the config) the account pays for now. Its row gets a "Current plan" badge, is picked by default,
   * and the price under the button is its price. Leave out when unknown (a tester grant, a code).
   */
  currentPlanId?: string | null;
  /**
   * Called when a subscriber picks another plan of the tier they have and presses "Switch to …". The app explains when
   * the change applies and sends the person to where it is made (the store's or the checkout's own page).
   * Left out: other plans can't be picked while subscribed.
   */
  onSwitch?: (plan: StorePlan) => void | Promise<void>;
  /**
   * Which other plans a subscriber may switch to (default: all of the same tier). For example, only longer plans, so a
   * yearly member is never invited to move down to a shorter one. With no plan allowed, no switch is offered at all.
   */
  canSwitchTo?: (from: StorePlan, to: StorePlan) => boolean;
  /** Drawn next to the current plan's name (for example, the app's Premium icon). */
  currentMark?: ReactNode;
  /** Shown instead of switching when the plan was bought somewhere this device can't change (another store). */
  switchBlocked?: string | null;
  /** Replaces the default "Manage or cancel" action (for example, to show the app's own cancel sheet first). */
  onManage?: () => void;
  /** Put the Free vs paid table above the plans (the default is plans first, then the table). */
  compareFirst?: boolean;
}

/**
 * The Plans screen: the store's real prices, a trial only when this person can still use it, restore, codes,
 * manage, and the wording and links Apple and Google ask for.
 */
export function PlansScreen({ header, onClose, onOpenTerms, onOpenPrivacy, previewPlans, initialTier, onUnlocked, hideCompare, currentPlanId, onSwitch, canSwitchTo, currentMark, switchBlocked, onManage, compareFirst, ...look }: PlansScreenProps) {
  const { c, s, Text } = useLook(look);
  const sub = useSubscription();
  const { config } = sub;
  const paidTiers = config.tiers.slice(1);
  const [tab, setTab] = useState(initialTier && paidTiers.includes(initialTier) ? initialTier : paidTiers[Math.min(paidTiers.length - 1, Math.max(0, rank(config, sub.tier)))]!);
  const [store, setStore] = useState<StorePlan[]>([]);
  const [load, setLoad] = useState<'loading' | 'ok' | 'failed'>('loading');
  const [tries, setTries] = useState(0);
  const [pick, setPick] = useState<string | null>(null);
  const [busy, setBusy] = useState<'' | 'buy' | 'restore'>('');
  // Where the answer shows: under the restore and code links, or above the main button after a purchase.
  const [note, setNote] = useState<{ text: string; good: boolean; at: 'box' | 'footer' } | null>(null);
  const [codeOpen, setCodeOpen] = useState(false);
  const [code, setCode] = useState('');

  useEffect(() => {
    if (!sub.ready) return;
    let live = true;
    setLoad('loading');
    sub.loadPlans()
      .then((list) => { if (live) { setStore(list); setLoad(list.length ? 'ok' : 'failed'); } })
      .catch(() => { if (live) setLoad('failed'); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sub.ready, tries]);

  // Store prices where there is a store; preview prices only where there is none. A store that can't be reached shows no made-up prices.
  const source = sub.ready ? store : previewPlans ?? [];
  const shown = useMemo(
    () => config.plans.filter((p) => p.tier === tab).flatMap((p) => { const sp = source.find((x) => x.id === p.id); return sp ? [{ cfg: p, sp }] : []; }),
    [config.plans, tab, source],
  );
  const has = rank(config, sub.tier) >= rank(config, tab);
  // The row the account pays for now, only on the tab of the tier it has.
  const current = has && currentPlanId && sub.tier === tab ? shown.find((x) => x.cfg.id === currentPlanId) ?? null : null;
  // The plans a subscriber may move to: the same tier's others, narrowed by the app (for example, longer plans only).
  const targets = current ? shown.filter((x) => x.cfg.id !== current.cfg.id && (!canSwitchTo || canSwitchTo(current.sp, x.sp))) : [];
  const canSwitch = !!current && !!onSwitch && !switchBlocked && targets.length > 0;
  // While switching is offered, the current plan can't be picked and the best allowed plan is picked to start with.
  const others = canSwitch ? targets : shown;
  const chosen = shown.find((x) => x.cfg.id === pick && !(canSwitch && x.cfg.id === current!.cfg.id))
    ?? (canSwitch ? others.find((x) => x.cfg.badge) ?? others.find((x) => x.cfg.selected) ?? others[0] : current ?? shown.find((x) => x.cfg.selected) ?? shown[0]);
  const switching = canSwitch && !!chosen && chosen.cfg.id !== current!.cfg.id;
  const live = sub.ready && store.length > 0;
  const tabLabel = config.tierLabels[tab]!;
  const trial = !sub.paid ? chosen?.sp.trialDays ?? null : null;
  const label = switching ? s.switchPlan(chosen!.cfg.label) : has ? s.youHave(config.tierLabels[sub.tier]!) : trial ? s.startTrial(trial) : sub.paid ? s.switchTo(tabLabel) : s.upgrade(tabLabel);
  // While subscribed, the price under the button is the current plan's, or the one being switched to; never a row just looked at.
  const priced = !has ? chosen : switching ? chosen : current;
  const locked = has && !switching;

  const after = (r: PurchaseResult, success: string, nothing: string, at: 'box' | 'footer') => {
    if (r.ok) {
      const on = rank(config, r.tier) > 0;
      setNote({ text: on ? success : nothing, good: on, at });
      if (on) onUnlocked?.(r.tier);
    } else if (!r.cancelled) setNote({ text: r.message, good: false, at });
  };
  const notYet = (at: 'box' | 'footer') => setNote({ text: sub.ready ? s.pricesFailed : s.notOpenYet, good: false, at });
  const buy = async () => {
    if (switching) {
      setBusy('buy'); setNote(null);
      try { await onSwitch!(chosen!.sp); } finally { setBusy(''); }
      return;
    }
    if (!live || !chosen) return notYet('footer');
    setBusy('buy'); setNote(null);
    after(await sub.buy(chosen.sp), s.welcome(tabLabel), s.boughtNotActive, 'footer');
    setBusy('');
  };
  const restore = async () => {
    if (!sub.ready) return notYet('box');
    setBusy('restore'); setNote(null);
    const r = await sub.restore();
    after(r, s.restored(r.ok ? config.tierLabels[r.tier] ?? '' : ''), s.nothingToRestore, 'box');
    setBusy('');
  };
  // iPhone shows Apple's own code sheet; elsewhere the code is typed here and sent to the store.
  const openCode = () => (sub.ready && Platform.OS === 'ios' ? void sub.redeemCode('') : setCodeOpen(true));
  const applyCode = () => (sub.ready ? void sub.redeemCode(code) : notYet('box'));

  const lift = c.shadow ? { boxShadow: c.shadow } : { borderWidth: 1, borderColor: c.border };
  const button = c.button ?? c.accent;
  const onButton = c.onButton ?? c.onAccent;
  const compare = !hideCompare ? (
    <View style={{ gap: 8 }}>
      <Text style={{ color: c.text, fontSize: 17, fontWeight: '800' }}>{s.compareTitle}</Text>
      <CompareTable {...look} />
    </View>
  ) : null;
  const link = (text: string, onPress: () => void, disabled = false) => (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} style={{ minHeight: 44, justifyContent: 'center' }}>
      <Text style={{ color: c.accent, fontWeight: '700', fontSize: 15, textAlign: 'center', textDecorationLine: 'underline' }}>{text}</Text>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 16, gap: 10 }}>
        {/* Row one: the app's logo on the left, Close on the right. */}
        {header || onClose ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, alignItems: 'flex-start' }}>{header}</View>
            {onClose && (
              <Pressable accessibilityRole="button" accessibilityLabel={s.close} onPress={onClose} hitSlop={8} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 24, color: c.text }}>×</Text>
              </Pressable>
            )}
          </View>
        ) : null}
        {compareFirst && compare}

        {paidTiers.length > 1 && (
          <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: 4, backgroundColor: c.border, borderRadius: c.radius - 2, padding: 4 }}>
            {paidTiers.map((t) => (
              <Pressable key={t} accessibilityRole="tab" accessibilityState={{ selected: t === tab }} onPress={() => { setTab(t); setPick(null); }} style={{ flex: 1, minHeight: 40, borderRadius: c.radius - 4, alignItems: 'center', justifyContent: 'center', backgroundColor: t === tab ? c.surface : 'transparent' }}>
                <Text style={{ fontWeight: '800', color: t === tab ? c.text : c.muted }}>{config.tierLabels[t]}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <Text style={{ color: c.muted, fontSize: 14, fontWeight: '700' }}>{s.choosePlan}</Text>
        {sub.ready && load !== 'ok' && (
          <View style={{ backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: c.radius, padding: 14, gap: 8, alignItems: 'center' }}>
            <Text style={{ color: c.text, textAlign: 'center' }}>{load === 'loading' ? s.loadingPrices : s.pricesFailed}</Text>
            {load === 'failed' && link(s.tryAgain, () => setTries((n) => n + 1))}
          </View>
        )}
        {!sub.ready && !previewPlans?.length && <Text style={{ color: c.muted, textAlign: 'center' }}>{s.notOpenYet}</Text>}

        <View accessibilityRole="radiogroup" style={{ gap: 12, paddingTop: 4 }}>
          {shown.map(({ cfg, sp }) => {
            const on = cfg.id === chosen?.cfg.id;
            const isCurrent = cfg.id === current?.cfg.id;
            // While subscribed, only the allowed other plans can be picked where switching is offered; the current one never then.
            const pickable = !has || (canSwitch ? targets.some((x) => x.cfg.id === cfg.id) : isCurrent);
            const pm = perMonth(sp);
            const saved = savings(sp, source);
            const tag = isCurrent ? s.currentPlan : cfg.badge;
            return (
              <Pressable key={cfg.id} accessibilityRole="radio" accessibilityState={{ checked: on, disabled: !pickable }} accessibilityLabel={`${cfg.label}, ${sp.priceString}${isCurrent ? `, ${s.currentPlan}` : ''}`} onPress={() => setPick(cfg.id)} disabled={!pickable}
                style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: tag ? 18 : 14, paddingBottom: 14, borderRadius: c.radius + 4, backgroundColor: isCurrent ? c.premiumSoft : c.surface, opacity: pickable || isCurrent ? 1 : 0.6 },
                  isCurrent ? { borderWidth: 2, borderColor: c.premium } : on ? { borderWidth: 2, borderColor: c.accent } : lift]}>
                {tag ? (
                  <Text style={{ position: 'absolute', top: -10, left: 14, fontSize: 11, fontWeight: '800', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, overflow: 'hidden',
                    color: c.onPremium, backgroundColor: c.premium }}>{tag}</Text>
                ) : null}
                <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: on ? 6 : 2, borderColor: on ? c.accent : c.border }} />
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ color: c.text, fontWeight: '800', fontSize: 16 }}>{cfg.label}</Text>
                    {isCurrent && currentMark ? currentMark : null}
                  </View>
                  {pm !== null || sp.period ? (
                    <Text style={{ color: c.muted, fontSize: 13 }}>
                      {pm !== null ? `${s.perMonth(money(pm, sp.currency))}${saved ? ` · ${s.save(saved)}` : ''}` : sp.period ? s.every(sp.period.unit, sp.period.count) : ''}
                    </Text>
                  ) : null}
                </View>
                {/* The price and its period on one line, easy to read: $29.99/year. */}
                <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                  <Text style={{ color: c.text, fontWeight: '800', fontSize: 17 }}>{sp.priceString}</Text>
                  {sp.period ? <Text style={{ color: c.muted, fontSize: 13, fontWeight: '600' }}>{s.per(sp.period.unit, sp.period.count)}</Text> : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        {has && current && switchBlocked ? (
          <View style={{ backgroundColor: c.premiumSoft, borderRadius: c.radius, padding: 12 }}>
            <Text style={{ color: c.text, fontSize: 14 }}>{switchBlocked}</Text>
          </View>
        ) : null}
        {!compareFirst && compare}
        {/* The main button sits right under the plans and the table, not pinned to the bottom. */}
        <View style={{ gap: 6 }}>
          {note?.at === 'footer' && (
            <View accessibilityLiveRegion="polite" style={{ backgroundColor: note.good ? c.good : c.warn, borderRadius: c.radius, padding: 12 }}>
              <Text style={{ color: c.text, fontSize: 14, textAlign: 'center' }}>{note.text}</Text>
            </View>
          )}
          <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: locked, busy: busy === 'buy' }} onPress={() => void buy()} disabled={locked || busy !== ''}
            style={{ minHeight: 52, borderRadius: c.shadow ? 26 : c.radius, alignItems: 'center', justifyContent: 'center', backgroundColor: button, opacity: locked ? 0.5 : 1 }}>
            <Text style={{ color: onButton, fontWeight: '800', fontSize: 16 }}>{busy === 'buy' ? '…' : label}</Text>
          </Pressable>
          {priced && priced.sp.period && <Text style={{ fontSize: 12, color: c.muted, textAlign: 'center' }}>{s.thenPrice(priced.sp.priceString, s.every(priced.sp.period.unit, priced.sp.period.count), trial)}</Text>}
        </View>
        {/* Restore, a code and Manage share one line; wraps on a narrow screen. */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 18 }}>
          {link(busy === 'restore' ? s.restoring : s.restore, () => void restore(), busy !== '')}
          {!codeOpen && sub.canRedeemCode && link(s.haveCode, openCode)}
          {sub.paid && link(s.manage, () => (onManage ? onManage() : void sub.openManage()))}
        </View>
        {codeOpen && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput accessibilityLabel={s.enterCode} value={code} onChangeText={setCode} placeholder={s.enterCode} placeholderTextColor={c.muted} autoCapitalize="characters"
              style={{ flex: 1, minHeight: 48, borderRadius: c.radius, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, paddingHorizontal: 14, fontSize: 16, color: c.text }} />
            <Pressable accessibilityRole="button" onPress={applyCode} disabled={!code.trim()} style={{ minHeight: 48, paddingHorizontal: 18, justifyContent: 'center', borderRadius: c.radius, backgroundColor: c.accent, opacity: code.trim() ? 1 : 0.5 }}>
              <Text style={{ color: c.onAccent, fontWeight: '800' }}>{s.apply}</Text>
            </Pressable>
          </View>
        )}
        {/* The answer to restore, a code or a purchase shows right here, under the links just tapped, never off screen. */}
        {note?.at === 'box' && (
          <View accessibilityLiveRegion="polite" style={{ backgroundColor: note.good ? c.good : c.warn, borderRadius: c.radius, padding: 12 }}>
            <Text style={{ color: c.text, fontSize: 14, textAlign: 'center' }}>{note.text}</Text>
          </View>
        )}
        <Text style={{ fontSize: 11, lineHeight: 16, color: c.muted, textAlign: 'center' }}>
          {s.legal(!!trial)}
          <Text accessibilityRole="link" style={{ color: c.accent, fontWeight: '600' }} onPress={onOpenTerms}>{s.terms}</Text>
          {' · '}
          <Text accessibilityRole="link" style={{ color: c.accent, fontWeight: '600' }} onPress={onOpenPrivacy}>{s.privacy}</Text>
        </Text>
      </ScrollView>
    </View>
  );
}
