const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/** Accepte les formats internationaux avec espaces, points et tirets. */
const PHONE_RE = /^\+?[\d\s().-]{8,20}$/;

export const isValidEmail = (value: string): boolean => EMAIL_RE.test(value.trim());

export const isValidPhone = (value: string): boolean => {
  const digits = value.replace(/\D/g, '');
  return PHONE_RE.test(value.trim()) && digits.length >= 8;
};

export interface PasswordCheck {
  valid: boolean;
  message: string | null;
}

/**
 * Exigences minimales : 8 caractères, une lettre et un chiffre. Volontairement
 * simple à expliquer à l'utilisateur, et vérifié aussi côté serveur par
 * Supabase Auth.
 */
export const checkPassword = (value: string): PasswordCheck => {
  if (value.length < 8) {
    return { valid: false, message: 'Le mot de passe doit contenir au moins 8 caractères.' };
  }
  if (!/[a-zA-Z]/.test(value) || !/\d/.test(value)) {
    return { valid: false, message: 'Ajoutez au moins une lettre et un chiffre.' };
  }
  return { valid: true, message: null };
};

/** Première lettre de chaque mot en majuscule, espaces normalisés. */
export const titleCaseName = (value: string): string =>
  value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/(^|[\s'-])\S/g, (chunk) => chunk.toUpperCase());

export type FieldErrors<T extends string> = Partial<Record<T, string>>;

export const required = (value: string, label: string): string | undefined =>
  value.trim().length === 0 ? `${label} est obligatoire.` : undefined;

/* ------------------------- validation de paiement ------------------------- */

/** Algorithme de Luhn : détecte les numéros de carte manifestement erronés. */
export const isValidCardNumber = (value: string): boolean => {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;

  let sum = 0;
  let double = false;

  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let digit = Number(digits[i]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }

  return sum % 10 === 0;
};

export const isValidExpiry = (value: string): boolean => {
  const match = value.match(/^(\d{2})\s*\/?\s*(\d{2})$/);
  if (!match) return false;

  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return false;

  // La carte est valide jusqu'au dernier jour du mois indiqué.
  const expiry = new Date(year, month, 0, 23, 59, 59);
  return expiry.getTime() > Date.now();
};

export const isValidCvc = (value: string): boolean => /^\d{3,4}$/.test(value.trim());

export const formatCardNumber = (value: string): string =>
  value
    .replace(/\D/g, '')
    .slice(0, 19)
    .replace(/(.{4})/g, '$1 ')
    .trim();

export const formatExpiry = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
};

/** N'affiche que les 4 derniers chiffres : rien d'autre n'est conservé. */
export const maskCardNumber = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 4 ? `•••• •••• •••• ${digits.slice(-4)}` : '••••';
};
