/**
 * Validação comum de formulários de senha (reset / ativação / onboarding).
 */
export type PasswordFormResult =
  | { ok: true }
  | { ok: false; message: string };

export function validatePasswordForm(
  password: string,
  confirm: string,
  opts?: { minLength?: number; requireComplexity?: boolean },
): PasswordFormResult {
  const min = opts?.minLength ?? 8;
  if (password.length < min) {
    return { ok: false, message: `Senha deve ter ao menos ${min} caracteres` };
  }
  if (opts?.requireComplexity) {
    const complex = /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password);
    if (!complex) {
      return { ok: false, message: 'Senha deve conter maiúscula, minúscula e número' };
    }
  }
  if (password !== confirm) {
    return { ok: false, message: 'Senhas não conferem' };
  }
  return { ok: true };
}
