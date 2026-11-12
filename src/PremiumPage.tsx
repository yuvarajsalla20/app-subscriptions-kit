import type { ReactNode } from 'react';
import { Pressable, Switch, View } from 'react-native';
import { Lock, useLook, type LookProps } from './look';
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
  /** Opens the plans: a tap on a locked row, and Upgrade. */
  onOpenPlans: () => void;
  /** Called when Manage, a code or Restore fails, with the error. */
  onError?: (error: unknown) => void;
}

/**
 * A whole Premium page for Settings. Free: every feature with a lock (a tap opens the plans), then Upgrade, code and
 * restore. Paid: the status card (plan, renews or ends), each feature with its switch or "Included", then Manage, code
 * and restore. Development builds keep SubscriptionRow at the bottom, for the tester switch.
 */
export function PremiumPage({ features, onOpenPlans, onError, ...look }: PremiumPageProps) {
  const { c, s, Text } = useLook(look);
  const sub = useSubscription();
  const paid = sub.paid;
  const ending = sub.server ? sub.server.willRenew === false : sub.renewal?.willRenew === false;
  const fail = (e: unknown) => onError?.(e);
  const card = { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: c.radius, overflow: 'hidden' as const };
  const line = { borderTopWidth: 1, borderTopColor: c.border };

  const action = (label: string, onPress: () => void, first: boolean) => (
    <Pressable key={label} accessibilityRole="button" onPress={onPress} style={[{ flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: 14 }, !first && line]}>
      <Text style={{ flex: 1, color: c.text, fontWeight: '600', fontSize: 15 }}>{label}</Text>
      <Text style={{ color: c.muted, fontSize: 18 }}>›</Text>
    </Pressable>
  );

  return (
    <View style={{ gap: 14 }}>
      <SubscriptionStatusCard {...look} />
      <View style={card}>
        {features.map((f, i) => {
          const on = paid && (!f.toggle || f.toggle.value);
          const press = !paid ? onOpenPlans : f.toggle ? () => f.toggle!.onChange(!f.toggle!.value) : undefined;
          return (
            <View key={f.key} style={i > 0 ? line : undefined}>
              <Pressable
                onPress={press}
                disabled={!press}
                accessibilityRole={paid && f.toggle ? 'switch' : 'button'}
                accessibilityLabel={paid ? f.label : `${f.label}, ${s.lockedLabel}`}
                accessibilityState={paid && f.toggle ? { checked: f.toggle.value } : undefined}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, minHeight: 56 }}
              >
                {f.icon ?? null}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.text, fontSize: 16, fontWeight: '600' }}>{f.label}</Text>
                  {f.detail || !paid ? <Text style={{ color: c.muted, fontSize: 12, marginTop: 2 }}>{f.detail ?? s.lockedHint}</Text> : null}
                </View>
                {!paid ? (
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c.premiumSoft, alignItems: 'center', justifyContent: 'center' }}>
                    <Lock color={c.premium} size={14} />
                  </View>
                ) : f.toggle ? (
                  <Switch value={f.toggle.value} onValueChange={f.toggle.onChange} trackColor={{ true: c.accent, false: c.border }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
                ) : (
                  <Text style={{ color: c.accent, fontSize: 13, fontWeight: '700' }}>{`✓ ${s.included}`}</Text>
                )}
              </Pressable>
              {on && f.children ? <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>{f.children}</View> : null}
            </View>
          );
        })}
      </View>
      {paid && !sub.tester.available ? (
        <View style={card}>
          {[
            action(ending ? s.autoRenewOn : s.manage, () => void sub.openManage().catch(fail), true),
            sub.canRedeemCode ? action(s.haveCode, () => void sub.redeemCode('').catch(fail), false) : null,
            action(s.restore, () => void sub.restore().catch(fail), false),
          ]}
        </View>
      ) : (
        <SubscriptionRow onOpenPlans={onOpenPlans} {...look} />
      )}
    </View>
  );
}
