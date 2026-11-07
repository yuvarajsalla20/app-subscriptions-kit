import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Lock, useLook, type LookProps } from './look';
import { useSubscription } from './SubscriptionProvider';

/** The "Premium" pill: a lock and the tier name, in the premium color. */
export function PremiumPill({ tier, label, ...look }: LookProps & { tier?: string; label?: string }) {
  const { c, Text } = useLook(look);
  const { config } = useSubscription();
  const name = label ?? config.tierLabels[tier ?? config.tiers[1]!] ?? '';
  return (
    <View accessibilityRole="text" accessibilityLabel={name} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: c.premium, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
      <Lock color={c.onPremium} size={11} />
      <Text style={{ color: c.onPremium, fontSize: 11, fontWeight: '800' }}>{name}</Text>
    </View>
  );
}

/** A round lock badge for cards and icons. */
export function LockBadge({ size = 36, ...look }: LookProps & { size?: number }) {
  const { c } = useLook(look);
  return (
    <View accessibilityElementsHidden importantForAccessibility="no" style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.premium, alignItems: 'center', justifyContent: 'center' }}>
      <Lock color={c.onPremium} size={size * 0.45} />
    </View>
  );
}

/**
 * Shows its children when the account can use `feature`; otherwise a locked card that opens the plans.
 * In a kids' app the button says "Ask a grown-up".
 */
export function PremiumGate({ feature, name, onUnlock, children, ...look }: LookProps & { feature: string; name: string; onUnlock: () => void; children?: ReactNode }) {
  const { c, s, Text } = useLook(look);
  const sub = useSubscription();
  if (sub.canUse(feature)) return <>{children}</>;
  const tierLabel = sub.config.tierLabels[sub.tierFor(feature)] ?? '';
  const button = sub.config.kids ? s.askGrownUp : s.unlock;
  return (
    <View style={{ backgroundColor: c.premiumSoft, borderColor: c.premium, borderWidth: 2, borderRadius: c.radius + 2, padding: 14, gap: 8, alignItems: 'flex-start' }}>
      <LockBadge {...look} />
      <Text style={{ color: c.text, fontSize: 16, fontWeight: '800' }}>{s.locked(name, tierLabel)}</Text>
      <Text style={{ color: c.text, fontSize: 14, lineHeight: 20 }}>{s.lockedBody}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={button} onPress={onUnlock} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 18, borderRadius: c.radius, backgroundColor: c.premium }}>
        <Text style={{ color: c.onPremium, fontWeight: '800', fontSize: 15 }}>{button}</Text>
      </Pressable>
    </View>
  );
}
