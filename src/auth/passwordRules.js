// Passwortregeln – nur Frontend-Hinweise; Server/Supabase Auth prüft zusätzlich.
export const PASSWORD_MIN_LENGTH = 12;

export const PASSWORD_RULES = [
  { id: "length", label: `Mindestens ${PASSWORD_MIN_LENGTH} Zeichen`, test: (p) => p.length >= PASSWORD_MIN_LENGTH },
  { id: "upper", label: "Mindestens ein Großbuchstabe", test: (p) => /[A-ZÄÖÜ]/.test(p) },
  { id: "lower", label: "Mindestens ein Kleinbuchstabe", test: (p) => /[a-zäöü]/.test(p) },
  { id: "digit", label: "Mindestens eine Zahl", test: (p) => /\d/.test(p) },
  { id: "special", label: "Mindestens ein Sonderzeichen", test: (p) => /[^A-Za-zÄÖÜäöü0-9]/.test(p) },
];

export function validatePassword(password) {
  const p = String(password || "");
  const failed = PASSWORD_RULES.filter((r) => !r.test(p)).map((r) => r.label);
  return { ok: failed.length === 0, failed };
}

export function passwordMismatch(password, confirm) {
  return String(password || "") !== String(confirm || "");
}
