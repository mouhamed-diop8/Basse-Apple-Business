/** Mémoire de session : email de commande invité, hors URL et hors disque. */
const emails = new Map<string, string>();

export const rememberGuestOrderEmail = (reference: string, email: string): void => {
  const key = reference.trim().toUpperCase();
  const value = email.trim().toLowerCase();
  if (key && value.includes('@')) emails.set(key, value);
};

export const guestOrderEmail = (reference: string): string | undefined =>
  emails.get(reference.trim().toUpperCase());
