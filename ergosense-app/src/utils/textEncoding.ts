const REPLACEMENT = '\uFFFD';

const REPLACEMENTS: Array<[RegExp, string]> = [
  [/Jo\uFFFDo/gi, 'João'],
  [/Jo\?o/gi, 'João'],
  [/JoÃ£o/gi, 'João'],
  [/Produ\uFFFDo/gi, 'Produção'],
  [/Produ\?\?o/gi, 'Produção'],
  [/ProduÃ§Ã£o/gi, 'Produção'],
  [/Constru\uFFFDo/gi, 'Construção'],
  [/ConstruÃ§Ã£o/gi, 'Construção'],
  [/ManutenÃ§Ã£o/gi, 'Manutenção'],
  [/OperaÃ§Ã£o/gi, 'Operação'],
];

export function repairPortugueseText(value: string | null | undefined): string {
  if (value == null) return '';
  let text = value;
  if (!/[Ã�?]/.test(text) && !text.includes(REPLACEMENT)) return text;

  for (const [pattern, replacement] of REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }

  if (/Ã/.test(text)) {
    try {
      const bytes = Uint8Array.from([...text].map((ch) => ch.charCodeAt(0) & 0xff));
      const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
      if (decoded && !decoded.includes(REPLACEMENT)) text = decoded;
    } catch {
      /* ignore */
    }
  }

  return text.replace(/\uFFFD/g, 'ã').replace(/\?\?/g, 'ç');
}
