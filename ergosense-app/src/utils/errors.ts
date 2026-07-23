/** Extrai mensagem de erro segura para toast / UI */
export function getErrorMessage(err: unknown, fallback = 'Erro inesperado'): string {
  if (err instanceof Error && err.message.trim()) return err.message;
  if (typeof err === 'string' && err.trim()) return err;
  return fallback;
}
