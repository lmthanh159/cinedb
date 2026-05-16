export const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export const PASSWORD_POLICY_MESSAGE =
  'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.';

export const LOGIN_ATTEMPTS_LIMIT = 5;
export const LOGIN_ATTEMPTS_TTL_SECONDS = 30 * 60;
export const EMAIL_VERIFY_TOKEN_EXPIRY = '24h';
export const PASSWORD_RESET_TOKEN_EXPIRY = '1h';
