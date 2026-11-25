import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import type { StorePlan } from '../payments';
import type { SubscriptionState } from '../SubscriptionProvider';
import { YourPlanCard } from '../YourPlanCard';
import type { LookProps } from '../look';
import type { Look } from './parts';

interface Props {
  look: Look;
  lookProps: LookProps;
  sub: SubscriptionState;
  plans: StorePlan[];
  icon?: ReactNode;
  /** The crowns (or the app's icon) at a size. */
  mark: (size: number) => ReactNode;
  tierLabel: string;
  until: string;
  /** "Starting at ₹99/month" for the monthly plan, when there is one. */
  fromPrice: string | null;
  /** "Or ₹999/year" for a longer plan, when there is one. */
  orPrice: string | null;
}

/**
 * The top of the Premium page. Right after a purchase: a welcome card. Paid (8.0.0): the Your Plan card. Free: Your
 * Plan first, then what Premium offers with its price.
 */
export function TopCard({ look, lookProps, sub, plans, icon, mark, tierLabel, until, fromPrice, orPrice }: Props) {
  const { c, s, Text } = look;
  if (sub.paid && sub.justSubscribed) {
    return (
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
  }
  // 8.0.0: the Your Plan card says which plan the account holds, its status, the next date with the price, and the store.
  if (sub.paid) return <YourPlanCard icon={icon} plans={plans} {...lookProps} />;
  return (
    <>
      <YourPlanCard plans={plans} {...lookProps} />
      <View accessible style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: c.radius + 8, backgroundColor: c.premiumSoft, borderWidth: 1, borderColor: c.premium }}>
        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }}>{mark(26)}</View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: c.text, fontSize: 18, fontWeight: '800' }}>{s.getPremium(tierLabel)}</Text>
          {fromPrice ? <Text style={{ color: c.accent, fontSize: 14, fontWeight: '700' }}>{s.fromPrice(fromPrice)}</Text> : null}
          <Text style={{ color: c.muted, fontSize: 13 }}>{orPrice ? s.orPrice(orPrice) : s.getPremiumNote}</Text>
        </View>
      </View>
    </>
  );
}
