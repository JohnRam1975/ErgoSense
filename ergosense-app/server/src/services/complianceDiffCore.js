export function compareNormTexts(oldText = '', newText = '') {
  const oldLines = String(oldText || '').split('\n').map((l) => l.trim()).filter(Boolean);
  const newLines = String(newText || '').split('\n').map((l) => l.trim()).filter(Boolean);
  const oldSet = new Set(oldLines);
  const newSet = new Set(newLines);

  const added = newLines.filter((l) => !oldSet.has(l));
  const removed = oldLines.filter((l) => !newSet.has(l));
  const unchanged = newLines.filter((l) => oldSet.has(l));

  return {
    summary: `${added.length} linha(s) adicionada(s), ${removed.length} removida(s), ${unchanged.length} inalterada(s)`,
    stats: { added: added.length, removed: removed.length, unchanged: unchanged.length },
    added,
    removed,
    unchanged: unchanged.slice(0, 20),
  };
}
