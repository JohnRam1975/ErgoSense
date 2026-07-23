/**
 * Middleware de validação Zod
 */
import { apiError } from '../utils/apiResponse.js';

/**
 * Normaliza issues Zod em { path, message } com mensagens legíveis.
 * Evita respostas genéricas tipo "Invalid input: expected string".
 */
export function formatZodIssues(issues = []) {
  const errors = issues.map((issue) => {
    const path = Array.isArray(issue.path) ? issue.path.filter((p) => p != null && p !== '').join('.') : '';
    let message = typeof issue.message === 'string' && issue.message.trim() ? issue.message.trim() : 'Dados inválidos';

    const isGenericType =
      /^Invalid input: expected /i.test(message) ||
      /^Expected .+?, received /i.test(message);

    if (isGenericType) {
      const received = issue.received ?? issue.input;
      const missing =
        received === 'undefined' ||
        received === undefined ||
        /received undefined$/i.test(message);
      message = missing ? 'Campo obrigatório' : 'Tipo de valor inválido';
    }

    return { path, message };
  });

  const message =
    errors.map((e) => (e.path ? `${e.path}: ${e.message}` : e.message)).join('; ') || 'Dados inválidos';

  return { message, errors };
}

export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      const issues = result.error.issues ?? result.error.errors ?? [];
      const { message, errors } = formatZodIssues(issues);
      return apiError(res, message, 400, { errors });
    }
    req.validatedBody = result.data;
    next();
  };
}
