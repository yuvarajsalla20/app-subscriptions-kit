import { useEffect, useState, type ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { Crowns, useLook, type LookProps } from './look';
import type { StorePlan } from './payments';
import { isPlan } from './pricing';
import { shortDay, subscriptionTerms } from './status';
import { useSubscription } from './SubscriptionProvider';
import type { StorePlatform } from './theme';

export interface YourPlanCardProps extends LookProps {
  /** The mark beside a paid plan. Default: a king and a queen crown (`<Crowns>`). */
  icon?: ReactNode;
  /** The store's plans, when the page has loaded them already. Left out, the card asks the store itself. */
  plans?: readonly StorePlan[];
}

/** What the card says, worked out from the subscription. Exported for tests and for screen readers. */
export interface YourPlanLines {
  /** "Free", "Premium Monthly" or "Premium Yearly". */
  title: string;
  /** "Active", "Free Trial" or "Ending"; empty for a free account. */
  badge: string;
  /** One calm sentence: the renewal, the trial end or the end date, with the price when the store gives it. */
  line: string;
  /** "App Store" or "Google Play" for a paid plan; empty for a free account. */
  billedBy: string;
  /** A payment problem, said in full; empty when there is none. */
  note: string;
}

/**
 * 8.0.0: the first card on the Subscription page, the same in every app. It says which plan the account holds, so a person
 * never has to work it out from the comparison. Free: the free plan's name and one line. Paid: the plan's name, a badge (Active,
 * Free Trial or Ending), when it renews or ends with the store's price, and the store that bills it. Buying stays on Plans.
 */
export function YourPlanCard({ icon, plans: given, ...look }: YourPlanCardProps) {
  const { c, s, Text } = useLook(look);
  const sub = useSubscription();
  const [loaded, setLoaded] = useState<StorePlan[]>([]);
  useEffect(() => {
    if (given || !sub.paid) return;
    let live = true;
    sub.loadPlans().then((p) => { if (live) setLoaded(p); }).catch(() => undefined);
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [given, sub.paid, sub.ready]);
  const plans = given ?? loaded;
  const l = yourPlanLines(sub, plans, s);
  const premium = sub.paid;
  const said = [s.yourPlan, l.title, l.badge, l.line, l.billedBy ? `${s.billedThrough} ${l.billedBy}` : '', l.note].filter(Boolean).join('. ');
  return (
    <View
      accessible
      accessibilityLabel={said}
      style={{ borderRadius: c.radius + 8, backgroundColor: c.surface, borderWidth: 1, borderColor: premium ? c.premium : c.border, overflow: 'hidden' }}
    >
      <View style={{ padding: 18, gap: 10, backgroundColor: premium ? c.premiumSoft : c.surface }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 24 }}>
          <Text style={{ color: c.muted, fontSize: 12, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase' }}>{s.yourPlan}</Text>
          {l.badge ? (
            <View style={{ backgroundColor: l.badge === s.planEnding ? c.border : c.premium, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ color: l.badge === s.planEnding ? c.text : c.onPremium, fontSize: 12, fontWeight: '800' }}>{l.badge}</Text>
            </View>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: premium ? c.surface : c.bg, borderWidth: premium ? 0 : 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' }}>
            {premium ? icon ?? <Crowns size={18} king={c.king} kingFill={c.kingFill} queen={c.queen} queenFill={c.queenFill} /> : <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: c.muted }} />}
          </View>
          <Text style={{ flex: 1, color: c.text, fontSize: 22, fontWeight: '800' }}>{l.title}</Text>
        </View>
        {l.line ? <Text style={{ color: c.muted, fontSize: 14, lineHeight: 20 }}>{l.line}</Text> : null}
        {l.note ? <Text style={{ color: c.text, fontSize: 14, lineHeight: 20, fontWeight: '600' }}>{l.note}</Text> : null}
        {l.billedBy ? (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 1, borderTopColor: c.border }}>
            <Text style={{ color: c.muted, fontSize: 13 }}>{s.billedThrough}</Text>
            <Text style={{ color: c.text, fontSize: 13, fontWeight: '700' }}>{l.billedBy}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

type Sub = ReturnType<typeof useSubscription>;
type Strings = ReturnType<typeof useLook>['s'];

/** The words on the card, from the same rule as the rest of the page (`subscriptionTerms`). */
export function yourPlanLines(sub: Pick<Sub, 'paid' | 'tierLabel' | 'tier' | 'config' | 'renewal' | 'server' | 'source'>, plans: readonly StorePlan[], s: Strings, now = new Date()): YourPlanLines {
  const free = sub.config.tierLabels[sub.config.tiers[0] ?? 'free'] ?? 'Free';
  if (!sub.paid) return { title: free, badge: '', line: s.freePlanLine(free), billedBy: '', note: '' };
  const t = subscriptionTerms({ server: sub.server, renewal: sub.renewal, source: sub.source, now });
  const product = sub.renewal?.productId?.toLowerCase() ?? '';
  const configPlan = product ? sub.config.plans.find((p) => isPlan(product, p.id)) : undefined;
  const store = product ? plans.find((p) => isPlan(product, p.id)) : undefined;
  const title = configPlan ? `${sub.tierLabel} ${configPlan.label}` : sub.tierLabel;
  const price = store ? (store.period ? `${store.priceString} ${s.every(store.period.unit, store.period.count)}` : store.priceString) : '';
  const date = shortDay(t.until);
  const trial = !!sub.renewal?.trial;
  const badge = t.ending ? s.planEnding : trial ? s.planTrial : s.planActive;
  const line = !date ? s.allIncludedLine(sub.tierLabel)
    : t.ending ? s.endsLine(sub.tierLabel, date)
    : trial ? s.trialEndsLine(date, title, price)
    : s.renewsLine(date, price);
  const billedBy = sub.renewal?.billedBy;
  const platform: StorePlatform | null =
    billedBy === 'app_store' ? 'ios' : billedBy === 'google_play' ? 'android' : billedBy === 'web' || billedBy === 'other' ? null
    : sub.renewal && (Platform.OS === 'ios' || Platform.OS === 'android') ? Platform.OS : null;
  return { title, badge, line, billedBy: platform ? s.storeName(platform) : '', note: t.billingIssue ? s.graceNote : '' };
}
