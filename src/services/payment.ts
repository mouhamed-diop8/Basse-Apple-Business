import { PaymentMethodId } from '@/data/types';

export interface PaymentResult {
  success: boolean;
  /** Référence d'autorisation renvoyée par le prestataire. */
  authorization?: string;
  message?: string;
}

export interface PaymentRequest {
  method: PaymentMethodId;
  amount: number;
  /** Numéro de carte saisi. Il n'est ni stocké ni journalisé. */
  cardNumber?: string;
  mobileNumber?: string;
}

/**
 * Passerelle de paiement.
 *
 * L’intégration réelle (Stripe, PayPal, agrégateur mobile money) se branche
 * ici. Tant que les clés marchandes ne sont pas configurées, l’appel est
 * simulé côté client pour valider le parcours. Le serveur n’enregistre jamais
 * un paiement comme réglé à partir de ce résultat : le statut reste `pending`
 * jusqu’à confirmation manuelle (ou un prestataire serveur plus tard).
 *
 * Aucune donnée de carte ne quitte cette fonction.
 */
export const authorizePayment = async (request: PaymentRequest): Promise<PaymentResult> => {
  // Le paiement à la livraison n'appelle aucun prestataire.
  if (request.method === 'cash_on_delivery') {
    return { success: true, authorization: 'COD' };
  }

  await new Promise((resolve) => setTimeout(resolve, 1400));

  const digits = request.cardNumber?.replace(/\D/g, '') ?? '';

  // Carte de test : permet de vérifier l'écran d'échec de paiement.
  if (request.method === 'card' && digits.endsWith('0000')) {
    return {
      success: false,
      message:
        'Paiement refusé par votre banque. Vérifiez vos informations ou utilisez un autre moyen de paiement.',
    };
  }

  return {
    success: true,
    authorization: `AUTH-${Date.now().toString(36).toUpperCase()}`,
  };
};

/** Indique si le moyen de paiement nécessite un appel au prestataire. */
export const requiresAuthorization = (method: PaymentMethodId): boolean =>
  method !== 'cash_on_delivery';
