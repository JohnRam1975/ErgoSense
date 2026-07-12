/**
 * Política de senhas seguras
 */
const MIN_LENGTH = 8;
const HAS_UPPER = /[A-Z]/;
const HAS_LOWER = /[a-z]/;
const HAS_DIGIT = /\d/;

export function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { ok: false, error: 'Senha obrigatória' };
  }
  if (password.length < MIN_LENGTH) {
    return { ok: false, error: `Senha deve ter no mínimo ${MIN_LENGTH} caracteres` };
  }
  if (!HAS_UPPER.test(password) || !HAS_LOWER.test(password) || !HAS_DIGIT.test(password)) {
    return {
      ok: false,
      error: 'Senha deve conter maiúscula, minúscula e número',
    };
  }
  return { ok: true };
}
