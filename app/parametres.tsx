import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';

import {
  AppText,
  Card,
  ConfirmDialog,
  Divider,
  ListRow,
  ScreenHeader,
  Sheet,
  SwitchRow,
} from '@/components/ui';
import { db } from '@/data';
import { FREE_SHIPPING_THRESHOLD, RETURN_DAYS, STORE } from '@/data/constants';
import { NotificationKind } from '@/data/types';
import { useCartStore } from '@/store/cart';
import { useNotificationsStore } from '@/store/notifications';
import { useSearchStore } from '@/store/search';
import { toast } from '@/store/toast';
import { colors, layout, spacing } from '@/theme';
import { formatPrice } from '@/utils/format';

const NOTIFICATION_SETTINGS: { kind: NotificationKind; label: string; description: string }[] = [
  {
    kind: 'order_confirmed',
    label: 'Confirmation de commande',
    description: 'À chaque commande enregistrée.',
  },
  {
    kind: 'status_change',
    label: 'Changement de statut',
    description: 'Préparation, expédition et suivi.',
  },
  { kind: 'delivery', label: 'Livraison', description: 'Colis en cours de livraison ou livré.' },
  { kind: 'promotion', label: 'Promotions', description: 'Codes promo et ventes flash.' },
  { kind: 'new_product', label: 'Nouveautés', description: 'Nouveaux produits ajoutés au catalogue.' },
  {
    kind: 'price_drop',
    label: 'Baisses de prix',
    description: 'Quand un produit favori devient moins cher.',
  },
];

type LegalDoc = 'cgv' | 'privacy' | null;

const LEGAL_CONTENT: Record<'cgv' | 'privacy', { title: string; body: string }> = {
  cgv: {
    title: 'Conditions générales de vente',
    body: `1. Objet
Les présentes conditions régissent les ventes réalisées par ${STORE.name}, boutique située au ${STORE.address}. ${STORE.disclaimer}

2. Prix
Les prix sont indiqués en francs CFA (F CFA). Les frais de livraison à Dakar sont annoncés avant la validation de la commande. La livraison est offerte à partir de ${formatPrice(FREE_SHIPPING_THRESHOLD)}.

3. Commande
La commande est ferme dès validation du paiement. Un billet de commande est disponible au téléchargement.

4. Livraison
Les délais (express le jour même ou sous 24 h, standard 24 à 48 h, retrait à Keur Massar sous 2 h) courent à compter de la confirmation du paiement.

5. Droit de rétractation
Vous disposez de ${RETURN_DAYS} jours après réception pour retourner un produit non ouvert, dans son emballage d’origine, avec le billet de commande.

6. Garantie
Les produits neufs et reconditionnés sont garantis 12 mois par la boutique. AppleCare n’est pas systématique et dépend du statut du produit.

7. Service client
WhatsApp ${STORE.phone} · ${STORE.email} · ${STORE.address}.`,
  },
  privacy: {
    title: 'Politique de confidentialité',
    body: `Données collectées
Nous collectons votre nom, votre email, votre téléphone et vos adresses de livraison, ainsi que l’historique de vos commandes.

Finalité
Ces données servent uniquement à traiter vos commandes, assurer la livraison et vous informer de l’avancement de vos achats.

Paiement
Aucune donnée bancaire n’est stockée par l’application. Les informations de carte sont transmises directement au prestataire de paiement et seuls les quatre derniers chiffres sont conservés à titre d’affichage.

Conservation
Vos données sont conservées le temps nécessaire au suivi de vos commandes et à nos obligations comptables.

Vos droits
Vous pouvez demander l’accès, la rectification ou la suppression de vos données en écrivant à ${STORE.email}.

Partage
Aucune donnée n’est revendue. Seules les informations nécessaires à la livraison sont transmises au transporteur.`,
  },
};

export default function SettingsScreen() {
  const router = useRouter();

  const enabled = useNotificationsStore((state) => state.enabled);
  const setEnabled = useNotificationsStore((state) => state.setEnabled);
  const clearSearchHistory = useSearchStore((state) => state.clear);
  const clearCart = useCartStore((state) => state.clear);

  const [legal, setLegal] = useState<LegalDoc>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <View style={styles.root}>
      <ScreenHeader title="Paramètres" withStatusBar />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.group}>
          <AppText variant="micro" color={colors.muted} style={styles.groupLabel}>
            NOTIFICATIONS
          </AppText>

          <Card padded={false}>
            {NOTIFICATION_SETTINGS.map((setting, index) => (
              <View key={setting.kind}>
                {index > 0 ? <Divider /> : null}
                <SwitchRow
                  label={setting.label}
                  description={setting.description}
                  value={enabled[setting.kind]}
                  onChange={(value) => setEnabled(setting.kind, value)}
                />
              </View>
            ))}
          </Card>
        </View>

        <View style={styles.group}>
          <AppText variant="micro" color={colors.muted} style={styles.groupLabel}>
            DONNÉES LOCALES
          </AppText>

          <Card padded={false}>
            <ListRow
              icon="time-outline"
              label="Effacer l’historique de recherche"
              description="Supprime les recherches récentes de cet appareil"
              onPress={() => {
                clearSearchHistory();
                toast.info('Historique de recherche effacé.');
              }}
            />
            <Divider />
            <ListRow
              icon="refresh-outline"
              label="Réinitialiser l’application"
              description="Vide le panier et les données mises en cache"
              destructive
              onPress={() => setConfirmReset(true)}
            />
          </Card>
        </View>

        <View style={styles.group}>
          <AppText variant="micro" color={colors.muted} style={styles.groupLabel}>
            INFORMATIONS LÉGALES
          </AppText>

          <Card padded={false}>
            <ListRow
              icon="document-text-outline"
              label="Conditions générales de vente"
              onPress={() => setLegal('cgv')}
            />
            <Divider />
            <ListRow
              icon="shield-checkmark-outline"
              label="Politique de confidentialité"
              onPress={() => setLegal('privacy')}
            />
            <Divider />
            <ListRow
              icon="mail-outline"
              label="Nous écrire"
              value={STORE.email}
              onPress={() => Linking.openURL(`mailto:${STORE.email}`)}
            />
            <Divider />
            <ListRow
              icon="help-buoy-outline"
              label="Aide et contact"
              onPress={() => router.push('/contact')}
            />
          </Card>
        </View>

        <View style={styles.about}>
          <AppText variant="micro" color={colors.mutedLight} center>
            {STORE.name} · version 1.0.0
          </AppText>
          <AppText variant="micro" color={colors.mutedLight} center>
            Source de données : {db.mode === 'demo' ? 'démonstration locale' : 'Supabase'}
          </AppText>
        </View>
      </ScrollView>

      <Sheet
        visible={legal !== null}
        onClose={() => setLegal(null)}
        title={legal ? LEGAL_CONTENT[legal].title : undefined}
        fullHeight
      >
        <AppText variant="caption" style={styles.legalBody}>
          {legal ? LEGAL_CONTENT[legal].body : ''}
        </AppText>
      </Sheet>

      <ConfirmDialog
        visible={confirmReset}
        title="Réinitialiser l’application ?"
        message="Votre panier sera vidé. Vos commandes déjà passées ne sont pas affectées."
        confirmLabel="Réinitialiser"
        destructive
        onConfirm={() => {
          clearCart();
          clearSearchHistory();
          setConfirmReset(false);
          toast.info('Application réinitialisée.');
        }}
        onCancel={() => setConfirmReset(false)}
      />
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
  group: { gap: spacing.sm },
  groupLabel: { marginLeft: spacing.md, letterSpacing: 0.6 },
  about: { gap: 2, marginTop: spacing.sm },
  legalBody: { lineHeight: 21 },
});
