/**
 * Middleware de validação Zod
 */
import { apiError } from '../utils/apiResponse.js';

export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      const issues = result.error.issues ?? result.error.errors ?? [];
      const message = issues.map((e) => e.message).join('; ') || 'Dados inválidos';
      return apiError(res, message, 400);
    }
    req.validatedBody = result.data;
    next();
  };
}
