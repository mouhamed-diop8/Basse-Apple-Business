import { createElement, useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { Order } from '@/data/types';
import { colors, radius, spacing } from '@/theme';
import { buildOrderTicketPdf } from '@/utils/orderPdf';
import { buildOrderTicketHtml } from '@/utils/receipt';

/** Aperçu de la confirmation : PDF si possible, sinon HTML. */
export const OrderTicketPreview = ({ order }: { order: Order }) => {
  const [url, setUrl] = useState<string | null>(null);
  const html = buildOrderTicketHtml(order);

  useEffect(() => {
    let revoked = false;
    let objectUrl: string | null = null;
    setUrl(null);

    buildOrderTicketPdf(order)
      .then((bytes) => {
        if (revoked) return;
        objectUrl = URL.createObjectURL(
          new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }),
        );
        setUrl(objectUrl);
      })
      .catch(() => {
        /* L’iframe HTML ci-dessous reste visible. */
      });

    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [order]);

  if (Platform.OS !== 'web') {
    return (
      <View style={styles.fallback}>
        <AppText variant="caption" center>
          Votre confirmation PDF est prête. Utilisez le bouton pour la télécharger.
        </AppText>
      </View>
    );
  }

  return (
    <View style={styles.wrap} accessibilityLabel={`Bon de commande ${order.reference}`}>
      {createElement('iframe', {
        src: url ? `${url}#toolbar=1&navpanes=0` : undefined,
        srcDoc: url ? undefined : html,
        title: `Confirmation ${order.reference}`,
        style: {
          width: '100%',
          height: '100%',
          border: '0',
          background: colors.white,
        },
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    height: 840,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  fallback: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
});
