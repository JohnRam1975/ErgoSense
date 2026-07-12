/** 13 fatores psicossociais — Guia MTE 2025 */
export const MTE_FATORES = [
  { codigo: 'F01', nome: 'Sobrecarga / excesso de demandas' },
  { codigo: 'F02', nome: 'Assédio de qualquer natureza' },
  { codigo: 'F03', nome: 'Baixo controle / falta de autonomia' },
  { codigo: 'F04', nome: 'Más relações no local de trabalho' },
  { codigo: 'F05', nome: 'Trabalho remoto / isolado' },
  { codigo: 'F06', nome: 'Má gestão de mudanças org.' },
  { codigo: 'F07', nome: 'Baixa clareza de papel/função' },
  { codigo: 'F08', nome: 'Baixas recompensas / reconhecimento' },
  { codigo: 'F09', nome: 'Falta de suporte / apoio' },
  { codigo: 'F10', nome: 'Baixa justiça organizacional' },
  { codigo: 'F11', nome: 'Eventos violentos / traumáticos' },
  { codigo: 'F12', nome: 'Baixa demanda (subcarga)' },
  { codigo: 'F13', nome: 'Difícil comunicação no trabalho' },
];

export function getMteFator(codigo) {
  return MTE_FATORES.find((f) => f.codigo === codigo) ?? null;
}
