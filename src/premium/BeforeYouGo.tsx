import type { ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';
import type { StoreOffer, StorePlan } from '../subscription/payments';
import { months, money, savings } from '../subscription/pricing';
import { BigButton, cardStyle, Heading, PageRow, statusColors, Tag, type Look } from './parts';

interface Props {
  look: Look;
  visible: boolean;
  onClose: () => void;
  /** Called once the sheet has gone, after Continue to Cancel. */
  onDismiss: () => void;
  onContinueToCancel: () => void;
  planName: string;
  tierLabel: string;
  until: string;
  lose: ReactNode;
  stay: StoreOffer | null;
  offerPct: number;
  onTakeOffer: (offer: StoreOffer) => void;
  switchTo: StorePlan | null;
  plans: StorePlan[];
  labelOf: (p: StorePlan) => string;
  per: (p: { priceString: string; period: StorePlan['period'] }) => string;
  onOpenPlans: () => void;
}

/**
 * Before You Go, shown when Cancel Subscription is tapped: what is kept until the end date, what is lost, a stay offer or a
 * longer plan when the store has one, Keep Premium, and Continue to Cancel.
 */
export function BeforeYouGo({ look, visible, onClose, onDismiss, onContinueToCancel, planName, tierLabel, until, lose, stay, offerPct, onTakeOffer, switchTo, plans, labelOf, per, onOpenPlans }: Props) {
  const { c, s, Text } = look;
  const { danger, success } = statusColors(c);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} onDismiss={onDismiss}>
      <Pressable accessibilityLabel={s.close} onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} />
      <View style={{ backgroundColor: c.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 36, gap: 12 }}>
        <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: c.border, marginBottom: 4 }} />
        <Text accessibilityRole="header" style={{ color: c.text, fontSize: 22, fontWeight: '800', textAlign: 'center' }}>{s.beforeYouGo}</Text>
        {until ? <Text style={{ color: c.muted, fontSize: 14, textAlign: 'center' }}>{s.keepEitherWay(planName, until)}</Text> : null}
        {lose}
        {stay || switchTo ? <Heading look={look} text={s.insteadYouCould} /> : null}
        {stay ? (
          <View style={cardStyle(c)}>
            <PageRow
              look={look}
              label={s.stayOffer(offerPct)}
              detail={s.offerLine(per({ priceString: stay.priceString, period: stay.period }), stay.cycles * stay.period.count, stay.period.unit)}
              onPress={() => onTakeOffer(stay)}
              right={<Tag look={look} text={s.offerTag} bg={c.premium} />}
              first
            />
          </View>
        ) : null}
        {switchTo ? (
          <View style={cardStyle(c)}>
            <PageRow
              look={look}
              label={s.switchToPlan(labelOf(switchTo))}
              detail={s.aboutPerMonth(switchTo.period ? `${switchTo.priceString} ${s.every(switchTo.period.unit, switchTo.period.count)}` : switchTo.priceString, money(switchTo.price / (months(switchTo) ?? 1), switchTo.currency))}
              onPress={() => {
                onClose();
                onOpenPlans();
              }}
              right={<Tag look={look} text={s.saveTag(savings(switchTo, plans))} bg={success} />}
              first
            />
          </View>
        ) : null}
        <BigButton look={look} label={s.keepPremium(tierLabel)} detail="" bg={c.accent} fg={c.onAccent} onPress={onClose} />
        <Pressable accessibilityRole="button" onPress={onContinueToCancel} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: danger, fontSize: 15, fontWeight: '700' }}>{s.continueToCancel}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}
