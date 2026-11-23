import { useEffect, useState, type ReactNode } from 'react';
import { Platform, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
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
  /** "Free Plan", "Premium Monthly" or "Premium Yearly". */
  title: string;
  /** "Active", "Free Trial" or "Ending"; empty for a free account. */
  badge: string;
  /** The colored line: "Your Current Plan", "Renews Dec 23, 2026", "Free Trial Ends Nov 30, 2026" or "Ends Dec 23, 2026". */
  status: string;
  /** True when the plan will not renew: the status line takes the Premium color instead of the accent. */
  ending: boolean;
  /** The quieter line: what is included, or the price and the store ("$3.99/month. Billed through the App Store."). */
  detail: string;
  /** A payment problem, said in full; empty when there is none. */
  note: string;
}

/** The free plan's mark: a shield with a check, drawn in the accent color. */
function Shield({ color, size = 24 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityElementsHidden importantForAccessibility="no">
      <Path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <Path d="M8.8 12.2l2.2 2.2 4.2-4.4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** A soft wash of a hex color (e.g., the accent at 10%), for the card's fill and border. Other color forms are used as given. */
const wash = (color: string, alpha: string) => (/^#[0-9a-f]{6}$/i.test(color) ? `${color}${alpha}` : color);

/**
 * 8.0.0: the first card on the Subscription page, the same in every app. It says which plan the account holds, so a person
 * never has to work it out from the comparison. 11.0.0: drawn in the same pattern as the Get Premium card (a round mark on
 * the left, a bold title, a colored line and a quieter line), in the calm accent color, so Get Premium remains the card that
 * leads on a free account. Paid: a small badge (Active, Free Trial or Ending), the date, the store's price and the store.
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
  const said = [s.yourPlan, l.title, l.badge, l.status, l.detail, l.note].filter(Boolean).join('. ');
  const statusColor = l.ending ? c.premium : c.accent;
  return (
    <View
      accessible
      accessibilityLabel={said}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: c.radius + 8, backgroundColor: c.surface, borderWidth: 1.5, borderColor: wash(c.accent, '8C'), overflow: 'hidden' }}
    >
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: wash(c.accent, '1A') }} />
      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
        {sub.paid ? icon ?? <Crowns size={18} king={c.king} kingFill={c.kingFill} queen={c.queen} queenFill={c.queenFill} /> : <Shield color={c.accent} />}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ flex: 1, color: c.text, fontSize: 18, fontWeight: '800' }}>{l.title}</Text>
          {l.badge ? (
            <View style={{ borderRadius: 10, borderWidth: 1, borderColor: wash(statusColor, '8C'), backgroundColor: c.bg, paddingHorizontal: 8, paddingVertical: 2 }}>
              <Text style={{ color: statusColor, fontSize: 11, fontWeight: '800' }}>{l.badge}</Text>
            </View>
          ) : null}
        </View>
        <Text style={{ color: statusColor, fontSize: 14, fontWeight: '700' }}>{l.status}</Text>
        {l.detail ? <Text style={{ color: c.muted, fontSize: 13 }}>{l.detail}</Text> : null}
        {l.note ? <Text style={{ color: c.text, fontSize: 13, fontWeight: '600', marginTop: 4 }}>{l.note}</Text> : null}
      </View>
    </View>
  );
}

type Sub = ReturnType<typeof useSubscription>;
type Strings = ReturnType<typeof useLook>['s'];

/** The words on the card, from the same rule as the rest of the page (`subscriptionTerms`). */
export function yourPlanLines(sub: Pick<Sub, 'paid' | 'tierLabel' | 'tier' | 'config' | 'renewal' | 'server' | 'source'>, plans: readonly StorePlan[], s: Strings, now = new Date()): YourPlanLines {
  const free = sub.config.tierLabels[sub.config.tiers[0] ?? 'free'] ?? 'Free';
  if (!sub.paid) return { title: s.freePlanTitle(free), badge: '', status: s.yourCurrentPlan, ending: false, detail: s.freeIncluded, note: '' };
  const t = subscriptionTerms({ server: sub.server, renewal: sub.renewal, source: sub.source, now });
  const product = sub.renewal?.productId?.toLowerCase() ?? '';
  const configPlan = product ? sub.config.plans.find((p) => isPlan(product, p.id)) : undefined;
  const store = product ? plans.find((p) => isPlan(product, p.id)) : undefined;
  const title = configPlan ? `${sub.tierLabel} ${configPlan.label}` : sub.tierLabel;
  const price = store ? `${store.priceString}${store.period ? s.per(store.period.unit, store.period.count) : ''}` : '';
  const date = shortDay(t.until);
  const trial = !!sub.renewal?.trial;
  const badge = t.ending ? s.planEnding : trial ? s.planTrial : s.planActive;
  const status = !date ? s.yourCurrentPlan : t.ending ? s.endsOn(date) : trial ? s.trialEndsOn(date) : s.renewsOnDate(date);
  const billedBy = sub.renewal?.billedBy;
  const platform: StorePlatform | null =
    billedBy === 'app_store' ? 'ios' : billedBy === 'google_play' ? 'android' : billedBy === 'web' || billedBy === 'other' ? null
    : sub.renewal && (Platform.OS === 'ios' || Platform.OS === 'android') ? Platform.OS : null;
  const where = platform ? s.billedThroughStore(platform) : '';
  const detail = t.ending ? s.endingDetail(sub.tierLabel)
    : !date ? s.allIncludedLine(sub.tierLabel)
    : [price ? (trial ? s.thenPriceShort(price) : `${price}.`) : '', where].filter(Boolean).join(' ');
  return { title, badge, status, ending: t.ending, detail, note: t.billingIssue ? s.graceNote : '' };
}
