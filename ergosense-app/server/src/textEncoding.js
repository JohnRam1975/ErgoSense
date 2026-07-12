const REPLACEMENT = '\uFFFD';

const REPLACEMENTS = [
  [/Jo\uFFFDo/gi, 'João'],
  [/Jo\?o/gi, 'João'],
  [/JoÃ£o/gi, 'João'],
  [/Produ\uFFFDo/gi, 'Produção'],
  [/Produ\?\?o/gi, 'Produção'],
  [/ProduÃ§Ã£o/gi, 'Produção'],
  [/Produo/gi, 'Produção'],
  [/Constru\uFFFDo/gi, 'Construção'],
  [/Constru\?\?o/gi, 'Construção'],
  [/ConstruÃ§Ã£o/gi, 'Construção'],
  [/Construo/gi, 'Construção'],
  [/Manuten\uFFFDo/gi, 'Manutenção'],
  [/ManutenÃ§Ã£o/gi, 'Manutenção'],
  [/Opera\uFFFDo/gi, 'Operação'],
  [/OperaÃ§Ã£o/gi, 'Operação'],
  [/Administra\uFFFDo/gi, 'Administração'],
  [/AdministraÃ§Ã£o/gi, 'Administração'],
];

/** Corrige textos PT-BR corrompidos por encoding (Windows-1252 / Latin-1 vs UTF-8). */
export function repairPortugueseText(value) {
  if (value == null || typeof value !== 'string') return value ?? '';
  let text = value;
  if (!/[Ã�?]/.test(text) && !text.includes(REPLACEMENT)) return text;

  for (const [pattern, replacement] of REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }

  if (/Ã/.test(text)) {
    try {
      const bytes = Uint8Array.from([...text].map((ch) => ch.charCodeAt(0) & 0xff));
      const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
      if (decoded && !decoded.includes(REPLACEMENT) && decoded.length > 0) {
        text = decoded;
      }
    } catch {
      /* ignore */
    }
  }

  return text.replace(/\uFFFD/g, 'ã').replace(/\?\?/g, 'ç');
}

export function repairRowText(row, fields) {
  if (!row) return row;
  const next = { ...row };
  for (const field of fields) {
    if (typeof next[field] === 'string') next[field] = repairPortugueseText(next[field]);
  }
  return next;
}
