/** Definições de questionários psicossociais (espelho do servidor) */
import type { PsicoQuestionnaireType, PsicoRiskLevel } from '../types/psicossocial';

export const LIKERT_5 = ['Nunca', 'Raramente', 'Às vezes', 'Frequentemente', 'Sempre'];

export const COPSOQ_DIMS = [
  { id: 'd1', titulo: 'Exigências quantitativas', perguntas: ['Qual a frequência de sua carga de trabalho excessiva?', 'Você tem trabalho suficiente para preencher todo o seu tempo?', 'É necessário trabalhar muito rapidamente?'] },
  { id: 'd2', titulo: 'Influência no trabalho', perguntas: ['Você pode influenciar a quantidade de trabalho?', 'Você participa da escolha das pessoas com quem trabalha?', 'Você pode influenciar o método de trabalho?'] },
  { id: 'd3', titulo: 'Qualidade da liderança', perguntas: ['Seu superior imediato planeja bem o trabalho?', 'Seu superior resolve conflitos de forma adequada?', 'Seu superior é bom em comunicação?'] },
  { id: 'd4', titulo: 'Reconhecimento', perguntas: ['Seu trabalho é reconhecido pela gestão?', 'Você recebe feedback construtivo sobre seu desempenho?', 'É tratado de forma justa no trabalho?'] },
  { id: 'd5', titulo: 'Suporte social dos colegas', perguntas: ['Seus colegas apoiam você quando o trabalho é difícil?', 'Você recebe ajuda quando necessário?', 'Existe boa colaboração entre colegas?'] },
];

export const HSE_DIMS = [
  { id: 'hse1', titulo: 'Demandas', descricao: 'Carga de trabalho, padrões de trabalho e ambiente de trabalho', cor: 'var(--red)', perguntas: ['Tenho que trabalhar intensamente para cumprir minhas tarefas.', 'Tenho escolha na forma como executo meu trabalho.', 'Tenho prazos impossíveis de cumprir.', 'Tenho que negligenciar algumas tarefas por excesso de trabalho.', 'Tenho um volume de trabalho adequado para realizar bem meu trabalho.'], invertidas: [1, 4] },
  { id: 'hse2', titulo: 'Controle', descricao: 'Autonomia e influência sobre o modo de executar o trabalho', cor: 'var(--amber)', perguntas: ['Posso decidir quando fazer uma pausa.', 'Tenho autonomia para decidir como realizar meu trabalho.', 'Posso influenciar meu ritmo de trabalho.', 'Posso escolher o que faço no trabalho.', 'Tenho controle suficiente sobre meu trabalho.'], invertidas: [] },
  { id: 'hse3', titulo: 'Suporte do gestor', descricao: 'Incentivo, suporte e recursos fornecidos pela liderança imediata', cor: 'var(--cyan)', perguntas: ['Posso contar com meu gestor quando o trabalho fica difícil.', 'Meu gestor me oferece feedback útil sobre o meu desempenho.', 'Meu gestor respeita minha vida pessoal.', 'Meu gestor me mantém informado sobre o que está acontecendo.', 'Meu gestor me incentiva no trabalho.'], invertidas: [] },
  { id: 'hse4', titulo: 'Suporte dos colegas', descricao: 'Incentivo, suporte e apoio fornecidos pelos colegas de trabalho', cor: 'var(--green)', perguntas: ['Posso contar com colegas quando o trabalho fica difícil.', 'Meus colegas estão dispostos a me ouvir sobre problemas no trabalho.', 'Meus colegas me apoiam nos momentos difíceis.', 'Meus colegas me ajudam quando preciso de apoio.', 'Sinto que faço parte de uma equipe que trabalha bem junto.'], invertidas: [] },
  { id: 'hse5', titulo: 'Relacionamentos', descricao: 'Comportamentos no trabalho e prevenção de assédio', cor: 'var(--orange)', perguntas: ['Sou alvo de comportamentos ofensivos no trabalho.', 'Há tensão ou raiva entre colegas.', 'Meus colegas se tratam com respeito.', 'As pessoas no trabalho se tratam de forma justa.', 'Existe um ambiente de trabalho positivo no meu setor.'], invertidas: [0, 1] },
  { id: 'hse6', titulo: 'Papel', descricao: 'Clareza sobre responsabilidades e funções do cargo', cor: 'var(--t0)', perguntas: ['Sei o que se espera de mim no trabalho.', 'Sei quais são minhas responsabilidades.', 'Entendo como meu trabalho se encaixa nos objetivos da organização.', 'Tenho clareza sobre as metas do meu setor.', 'Sei quais são os objetivos da organização.'], invertidas: [] },
  { id: 'hse7', titulo: 'Mudanças', descricao: 'Comunicação sobre mudanças organizacionais', cor: 'var(--cyan)', perguntas: ['Tenho oportunidade de questionar gestores sobre mudanças no trabalho.', 'A organização nos consulta sobre mudanças que nos afetam.', 'Quando há mudanças, sou informado com antecedência suficiente.', 'Quando há mudanças, recebo suporte adequado para me adaptar.', 'A organização leva em conta as preocupações dos trabalhadores nas mudanças.'], invertidas: [] },
];

export const CBI_PERGUNTAS = [
  'Você se sente esgotado(a)?',
  'Você se sente fisicamente exausto(a)?',
  'Você se sente emocionalmente esgotado(a)?',
  'Seu trabalho é emocionalmente desgastante?',
  'Você se sente frustrado(a) com o trabalho?',
];

export const CLIMA_DIMS = [
  { id: 'cl1', titulo: 'Comunicação interna', perguntas: ['Recebo informações claras sobre decisões que me afetam.', 'Sinto que posso expressar minhas opiniões com segurança.', 'A comunicação entre setores funciona bem.'] },
  { id: 'cl2', titulo: 'Liderança e gestão', perguntas: ['Confio na liderança da minha área.', 'Meus gestores tomam decisões justas.', 'Recebo orientação adequada para realizar meu trabalho.'] },
  { id: 'cl3', titulo: 'Reconhecimento e motivação', perguntas: ['Sinto que meu trabalho é valorizado.', 'Recebo reconhecimento quando alcanço bons resultados.', 'A remuneração e benefícios são percebidos como justos.'] },
  { id: 'cl4', titulo: 'Ambiente e colaboração', perguntas: ['O ambiente de trabalho é respeitoso.', 'Há colaboração entre colegas.', 'Sinto-me incluído(a) na equipe.'] },
  { id: 'cl5', titulo: 'Desenvolvimento e carreira', perguntas: ['Tenho oportunidades de aprendizado.', 'Vejo perspectivas de crescimento na organização.', 'Recebo feedback que me ajuda a evoluir.'] },
];

export type QuestionarioResultado = {
  score: number;
  nivel: PsicoRiskLevel;
  dimensoes: { nome: string; score: number; cor: string }[];
};

function nivelFromScore(score: number, inverted = false): PsicoRiskLevel {
  if (inverted) {
    if (score >= 70) return 'critico';
    if (score >= 50) return 'alto';
    if (score >= 30) return 'medio';
    return 'baixo';
  }
  if (score >= 70) return 'baixo';
  if (score >= 50) return 'medio';
  if (score >= 30) return 'alto';
  return 'critico';
}

function dimScore(respostas: Record<string, number>, keys: string[], invertidas: number[] = []) {
  const vals = keys.map((key, i) => {
    const raw = respostas[key] ?? 0;
    return invertidas.includes(i) ? 4 - raw : raw;
  });
  const sum = vals.reduce((a, b) => a + b, 0);
  return Math.round((sum / (keys.length * 4)) * 100);
}

export function calcularCopsoq(respostas: Record<string, number>): QuestionarioResultado {
  const dims = COPSOQ_DIMS.map((d) => {
    const keys = d.perguntas.map((_, i) => `${d.id}-q${i}`);
    return { nome: d.titulo, score: dimScore(respostas, keys), cor: 'var(--amber)' };
  });
  const global = Math.round(dims.reduce((a, d) => a + d.score, 0) / dims.length);
  return { score: global, nivel: nivelFromScore(global), dimensoes: dims };
}

export function calcularHse(respostas: Record<string, number>): QuestionarioResultado {
  const dims = HSE_DIMS.map((d) => {
    const keys = d.perguntas.map((_, i) => `${d.id}-q${i}`);
    return { nome: d.titulo, score: dimScore(respostas, keys, d.invertidas), cor: d.cor };
  });
  const global = Math.round(dims.reduce((a, d) => a + d.score, 0) / dims.length);
  return { score: global, nivel: nivelFromScore(global), dimensoes: dims };
}

export function calcularCbi(respostas: Record<string, number>): QuestionarioResultado {
  const keys = [0, 1, 2, 3, 4].map((i) => `cbi-q${i}`);
  const score = dimScore(respostas, keys);
  return { score, nivel: nivelFromScore(score, true), dimensoes: [{ nome: 'Esgotamento geral', score, cor: 'var(--red)' }] };
}

export function calcularClima(respostas: Record<string, number>): QuestionarioResultado {
  const dims = CLIMA_DIMS.map((d) => {
    const keys = d.perguntas.map((_, i) => `${d.id}-q${i}`);
    return { nome: d.titulo, score: dimScore(respostas, keys), cor: 'var(--cyan)' };
  });
  const global = Math.round(dims.reduce((a, d) => a + d.score, 0) / dims.length);
  return { score: global, nivel: nivelFromScore(global), dimensoes: dims };
}

export function calcularPreview(tipo: PsicoQuestionnaireType, respostas: Record<string, number>): QuestionarioResultado {
  switch (tipo) {
    case 'COPSOQ_III':
      return calcularCopsoq(respostas);
    case 'HSE':
      return calcularHse(respostas);
    case 'BURNOUT':
      return calcularCbi(respostas);
    case 'CLIMA':
      return calcularClima(respostas);
  }
}

export function abaFromTipo(tipo: PsicoQuestionnaireType): 'copsoq' | 'hse' | 'cbi' | 'clima' {
  const map = { COPSOQ_III: 'copsoq', HSE: 'hse', BURNOUT: 'cbi', CLIMA: 'clima' } as const;
  return map[tipo];
}

export function tipoFromAba(aba: 'copsoq' | 'hse' | 'cbi' | 'clima'): PsicoQuestionnaireType {
  const map = { copsoq: 'COPSOQ_III', hse: 'HSE', cbi: 'BURNOUT', clima: 'CLIMA' } as const;
  return map[aba];
}
