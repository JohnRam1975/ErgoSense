/**
 * Envelope padronizado de respostas REST (PROMPT UNIVERSAL — API).
 * Adoção incremental: novos endpoints e erros transversais usam estes helpers.
 */

export function apiSuccess(res, data = null, message = 'Operação realizada com sucesso', status = 200) {
  const body = { success: true, message };
  if (data !== null && data !== undefined) body.data = data;
  return res.status(status).json(body);
}

export function apiError(res, message, status = 400, extra = {}) {
  return res.status(status).json({ success: false, message, ...extra });
}

export function apiCreated(res, data, message = 'Recurso criado com sucesso') {
  return apiSuccess(res, data, message, 201);
}
