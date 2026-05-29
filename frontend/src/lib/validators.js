export const getPasswordValidationRules = (val) => {
  const password = val || '';
  return {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
};

export const validatePassword = (val) => {
  if (!val) return 'Password is required.';
  const rules = getPasswordValidationRules(val);
  if (!rules.length) return 'Password must be at least 8 characters.';
  if (!rules.uppercase) return 'Password must include at least one uppercase letter.';
  if (!rules.number) return 'Password must include at least one number.';
  if (!rules.special) return 'Password must include at least one special character.';
  return '';
};

export const validateName = (val) => {
  const parts = (val || '').trim().split(/\s+/);
  if (parts.length < 2) return 'Please enter your first and last name.';
  for (const p of parts) {
    if (p.length < 3) return 'Each name must be at least 3 characters.';
    if (p.length > 15) return 'Each name must be at most 15 characters.';
  }
  return '';
};

export const validateGmail = (val) => {
  if (!val) return '';
  return val.toLowerCase().endsWith('@gmail.com') ? '' : 'Only Gmail addresses are allowed (@gmail.com).';
};
