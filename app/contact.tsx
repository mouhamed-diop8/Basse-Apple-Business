import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Divider, ListRow, ScreenHeader } from '@/components/ui';
import { FREE_SHIPPING_THRESHOLD, RETURN_DAYS, STORE, whatsappUrl } from '@/data/constants';
import { toast } from '@/store/toast';
import { formatPrice } from '@/utils/format';
import { colors, layout, radius, spacing } from '@/theme';

const FAQ: { question: string; answer: string }[] = [
  {
    question: 'Quels sont les délais de livraison ?',
    answer:
      'Livraison express le jour même ou sous 24 h à Dakar, livraison standard en 24 à 48 h, ou retrait gratuit au Centre commercial Keur Massar sous 2 h.',
  },
  {
    question: 'La livraison est-elle gratuite ?',
    answer: `Oui, à partir de ${formatPrice(FREE_SHIPPING_THRESHOLD)} d’achat. En dessous, elle est facturée selon le mode choisi.`,
  },
  {
    question: 'Puis-je payer à la livraison ?',
    answer:
      'Oui. Vous pouvez régler en espèces ou par carte à la réception du colis, sans frais supplémentaires.',
  },
  {
    question: 'Les produits sont-ils garantis ?',
    answer:
      'Les produits neufs sont garantis 12 mois par la boutique (SAV sur place à Keur Massar). AppleCare dépend du statut du produit. Les reconditionnés sont garantis 12 mois.',
  },
  {
    question: 'Comment retourner un produit ?',
    answer:
      `Vous disposez de ${RETURN_DAYS} jours après réception. Contactez-nous par WhatsApp avec votre numéro de commande pour lancer le retour.`,
  },
];

const openUrl = async (url: string, failureMessage: string) => {
  try {
    await Linking.openURL(url);
  } catch {
    toast.error(failureMessage);
  }
};

export default function ContactScreen() {
  return (
    <View style={styles.root}>
      <ScreenHeader title="Nous contacter" withStatusBar />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="headset-outline" size={26} color={colors.white} />
          </View>

          <AppText variant="subheading" center>
            Une question sur un produit ou une commande ?
          </AppText>

          <AppText variant="caption" center style={styles.heroText}>
            Boutique au Centre commercial Keur Massar. {STORE.hours} Le plus rapide reste WhatsApp.
          </AppText>

          <Button
            label="Discuter sur WhatsApp"
            icon="logo-whatsapp"
            onPress={() =>
              openUrl(
                whatsappUrl(`Bonjour ${STORE.name}, j’aurais besoin d’un renseignement.`),
                'WhatsApp n’est pas disponible sur cet appareil.',
              )
            }
            fullWidth
            haptic
          />
        </Card>

        <View style={styles.group}>
          <AppText variant="micro" color={colors.muted} style={styles.groupLabel}>
            AUTRES MOYENS DE CONTACT
          </AppText>

          <Card padded={false}>
            <ListRow
              icon="call-outline"
              label="Appeler la boutique"
              description={STORE.phone}
              onPress={() =>
                openUrl(
                  `tel:${STORE.phone.replace(/\s/g, '')}`,
                  'Impossible de lancer l’appel depuis cet appareil.',
                )
              }
            />
            <Divider />
            <ListRow
              icon="mail-outline"
              label="Envoyer un email"
              description={STORE.email}
              onPress={() =>
                openUrl(`mailto:${STORE.email}`, 'Aucune application email n’est configurée.')
              }
            />
            <Divider />
            <ListRow
              icon="location-outline"
              label="Venir en boutique"
              description={STORE.address}
              onPress={async () => {
                await Clipboard.setStringAsync(STORE.address);
                toast.success('Adresse copiée.');
              }}
            />
            <Divider />
            <ListRow icon="time-outline" label="Horaires d’ouverture" description={STORE.hours} />
          </Card>
        </View>

        <View style={styles.group}>
          <AppText variant="micro" color={colors.muted} style={styles.groupLabel}>
            QUESTIONS FRÉQUENTES
          </AppText>

          <Card style={styles.faqCard}>
            {FAQ.map((entry, index) => (
              <View key={entry.question} style={styles.faqItem}>
                {index > 0 ? <Divider style={styles.faqDivider} /> : null}

                <AppText variant="captionStrong">{entry.question}</AppText>
                <AppText variant="caption" style={styles.faqAnswer}>
                  {entry.answer}
                </AppText>
              </View>
            ))}
          </Card>
        </View>

        <AppText variant="micro" color={colors.muted} center>
          {STORE.disclaimer}
        </AppText>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceAlt },
  content: {
    padding: layout.screenPadding,
    paddingBottom: spacing.huge,
    gap: spacing.lg,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  hero: { alignItems: 'center', gap: spacing.md },
  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: radius.pill,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: { maxWidth: 320 },
  group: { gap: spacing.sm },
  groupLabel: { marginLeft: spacing.md, letterSpacing: 0.6 },
  faqCard: { gap: 0 },
  faqItem: { gap: spacing.xs },
  faqDivider: { marginVertical: spacing.md },
  faqAnswer: { lineHeight: 20 },
});
