/**
 * Valida IDs numéricos de rota — evita NaN no PostgreSQL
 */
export function parseNumericId(raw) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

export function requireNumericId(req, res, paramName = 'id') {
  const id = parseNumericId(req.params[paramName]);
  if (id === null) {
    res.status(400).json({ success: false, message: 'ID inválido' });
    return null;
  }
  return id;
}
