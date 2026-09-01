const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 320;

/** Normalize a submitted email, returning null when it is not valid. */
export function normalizeContactEmail(value) {
  if (typeof value !== 'string') return null;

  const email = value.trim().toLowerCase();
  if (!email || email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
    return null;
  }

  return email;
}
