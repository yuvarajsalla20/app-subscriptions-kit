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
}

/**
 * The Plans screen: the store's real prices, a trial only when this person can still use it, restore, codes,
 * manage, and the wording and links Apple and Google ask for.
 */
export function PlansScreen({ header, onClose, onOpenTerms, onOpenPrivacy, previewPlans, initialTier, onUnlocked, hideCompare, ...look }: PlansScreenProps) {
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
  const [note, setNote] = useState<{ text: string; good: boolean } | null>(null);
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
  const chosen = shown.find((x) => x.cfg.id === pick) ?? shown.find((x) => x.cfg.selected) ?? shown[0];
  const live = sub.ready && store.length > 0;
  const has = rank(config, sub.tier) >= rank(config, tab);
  const tabLabel = config.tierLabels[tab]!;
  const trial = !sub.paid ? chosen?.sp.trialDays ?? null : null;
  const label = has ? s.youHave(config.tierLabels[sub.tier]!) : trial ? s.startTrial(trial) : sub.paid ? s.switchTo(tabLabel) : s.upgrade(tabLabel);

  const after = (r: PurchaseResult, success: string, nothing: string) => {
    if (r.ok) {
      const on = rank(config, r.tier) > 0;
      setNote({ text: on ? success : nothing, good: on });
      if (on) onUnlocked?.(r.tier);
    } else if (!r.cancelled) setNote({ text: r.message, good: false });
  };
  const notYet = () => setNote({ text: sub.ready ? s.pricesFailed : s.notOpenYet, good: false });
  const buy = async () => {
    if (!live || !chosen) return notYet();
    setBusy('buy'); setNote(null);
    after(await sub.buy(chosen.sp), s.welcome(tabLabel), s.boughtNotActive);
    setBusy('');
  };
  const restore = async () => {
    if (!sub.ready) return notYet();
    setBusy('restore'); setNote(null);
    const r = await sub.restore();
    after(r, s.restored(r.ok ? config.tierLabels[r.tier] ?? '' : ''), s.nothingToRestore);
    setBusy('');
  };
  // iPhone shows Apple's own code sheet; elsewhere the code is typed here and sent to the store.
  const openCode = () => (sub.ready && Platform.OS === 'ios' ? void sub.redeemCode('') : setCodeOpen(true));
  const applyCode = () => (sub.ready ? void sub.redeemCode(code) : notYet());

  const link = (text: string, onPress: () => void, disabled = false) => (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} style={{ minHeight: 44, justifyContent: 'center' }}>
      <Text style={{ color: c.accent, fontWeight: '700', fontSize: 15, textAlign: 'center', textDecorationLine: 'underline' }}>{text}</Text>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
        {onClose && (
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
            <Pressable accessibilityRole="button" accessibilityLabel={s.close} onPress={onClose} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 24, color: c.text }}>×</Text>
            </Pressable>
          </View>
        )}
        {header}
        {!hideCompare && <CompareTable {...look} />}

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

        <View accessibilityRole="radiogroup" style={{ gap: 10 }}>
          {shown.map(({ cfg, sp }) => {
            const on = cfg.id === chosen?.cfg.id;
            const pm = perMonth(sp);
            const saved = savings(sp, source);
            return (
              <Pressable key={cfg.id} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={`${cfg.label}, ${sp.priceString}`} onPress={() => setPick(cfg.id)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: c.radius + 2, borderWidth: on ? 2 : 1, borderColor: on ? c.accent : c.border, backgroundColor: c.surface }}>
                <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: on ? 6 : 2, borderColor: on ? c.accent : c.border }} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ color: c.text, fontWeight: '800', fontSize: 16 }}>{cfg.label}</Text>
                    {cfg.badge ? <Text style={{ fontSize: 11, fontWeight: '800', color: c.onPremium, backgroundColor: c.premium, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' }}>{cfg.badge}</Text> : null}
                  </View>
                  {pm !== null || sp.period ? (
                    <Text style={{ color: c.muted, fontSize: 13 }}>
                      {pm !== null ? `${s.perMonth(money(pm, sp.currency))}${saved ? ` · ${s.save(saved)}` : ''}` : sp.period ? s.every(sp.period.unit, sp.period.count) : ''}
                    </Text>
                  ) : null}
                </View>
                <Text style={{ color: c.text, fontWeight: '800', fontSize: 16 }}>{sp.priceString}</Text>
              </Pressable>
            );
          })}
        </View>

        {codeOpen ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput accessibilityLabel={s.enterCode} value={code} onChangeText={setCode} placeholder={s.enterCode} placeholderTextColor={c.muted} autoCapitalize="characters"
              style={{ flex: 1, minHeight: 48, borderRadius: c.radius, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, paddingHorizontal: 14, fontSize: 16, color: c.text }} />
            <Pressable accessibilityRole="button" onPress={applyCode} disabled={!code.trim()} style={{ minHeight: 48, paddingHorizontal: 18, justifyContent: 'center', borderRadius: c.radius, backgroundColor: c.accent, opacity: code.trim() ? 1 : 0.5 }}>
              <Text style={{ color: c.onAccent, fontWeight: '800' }}>{s.apply}</Text>
            </Pressable>
          </View>
        ) : (
          link(s.haveCode, openCode)
        )}
        {link(busy === 'restore' ? s.restoring : s.restore, () => void restore(), busy !== '')}
        {sub.paid && link(s.manage, () => void sub.openManage())}
        {note && (
          <View accessibilityLiveRegion="polite" style={{ backgroundColor: note.good ? c.good : c.warn, borderRadius: c.radius, padding: 12 }}>
            <Text style={{ color: c.text, fontSize: 14 }}>{note.text}</Text>
          </View>
        )}
        <Text style={{ fontSize: 11, lineHeight: 16, color: c.muted }}>
          {s.legal(!!trial)}
          <Text accessibilityRole="link" style={{ color: c.accent, fontWeight: '600' }} onPress={onOpenTerms}>{s.terms}</Text>
          {' · '}
          <Text accessibilityRole="link" style={{ color: c.accent, fontWeight: '600' }} onPress={onOpenPrivacy}>{s.privacy}</Text>
        </Text>
      </ScrollView>

      <View style={{ gap: 6, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.surface }}>
        <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: has, busy: busy === 'buy' }} onPress={() => void buy()} disabled={has || busy !== ''}
          style={{ minHeight: 52, borderRadius: c.radius, alignItems: 'center', justifyContent: 'center', backgroundColor: c.accent, opacity: has ? 0.5 : 1 }}>
          <Text style={{ color: c.onAccent, fontWeight: '800', fontSize: 16 }}>{busy === 'buy' ? '…' : label}</Text>
        </Pressable>
        {chosen && chosen.sp.period && <Text style={{ fontSize: 12, color: c.muted, textAlign: 'center' }}>{s.thenPrice(chosen.sp.priceString, s.every(chosen.sp.period.unit, chosen.sp.period.count), trial)}</Text>}
      </View>
    </View>
  );
}
