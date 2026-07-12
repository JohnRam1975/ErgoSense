/** Pontuação de questionários psicossociais */
import { DEFAULT_CRITERIA_CONFIG } from '../riskCriteriaDefaults.js';
import { evaluateWithCriteria } from '../riskInventoryUtils.js';

export function nivelFromScore(score, inverted = false) {
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

export function nivelFromMatriz(prob, sev, config = DEFAULT_CRITERIA_CONFIG) {
  return evaluateWithCriteria(prob, sev, config)?.level ?? 'baixo';
}

export function scoreFromProbSev(prob, sev) {
  return Math.min(100, Math.round((prob * sev / 25) * 100));
}

const COPSOQ_DIMS = [
  { id: 'd1', titulo: 'Exigências quantitativas', keys: ['d1-q0', 'd1-q1', 'd1-q2'] },
  { id: 'd2', titulo: 'Influência no trabalho', keys: ['d2-q0', 'd2-q1', 'd2-q2'] },
  { id: 'd3', titulo: 'Qualidade da liderança', keys: ['d3-q0', 'd3-q1', 'd3-q2'] },
  { id: 'd4', titulo: 'Reconhecimento', keys: ['d4-q0', 'd4-q1', 'd4-q2'] },
  { id: 'd5', titulo: 'Suporte social dos colegas', keys: ['d5-q0', 'd5-q1', 'd5-q2'] },
];

const HSE_DIMS = [
  { id: 'hse1', titulo: 'Demandas', invertidas: [1, 4] },
  { id: 'hse2', titulo: 'Controle', invertidas: [] },
  { id: 'hse3', titulo: 'Suporte do gestor', invertidas: [] },
  { id: 'hse4', titulo: 'Suporte dos colegas', invertidas: [] },
  { id: 'hse5', titulo: 'Relacionamentos', invertidas: [0, 1] },
  { id: 'hse6', titulo: 'Papel', invertidas: [] },
  { id: 'hse7', titulo: 'Mudanças', invertidas: [] },
];

const CLIMA_DIMS = [
  { id: 'cl1', titulo: 'Comunicação interna', keys: ['cl1-q0', 'cl1-q1', 'cl1-q2'] },
  { id: 'cl2', titulo: 'Liderança e gestão', keys: ['cl2-q0', 'cl2-q1', 'cl2-q2'] },
  { id: 'cl3', titulo: 'Reconhecimento e motivação', keys: ['cl3-q0', 'cl3-q1', 'cl3-q2'] },
  { id: 'cl4', titulo: 'Ambiente e colaboração', keys: ['cl4-q0', 'cl4-q1', 'cl4-q2'] },
  { id: 'cl5', titulo: 'Desenvolvimento e carreira', keys: ['cl5-q0', 'cl5-q1', 'cl5-q2'] },
];

function dimScore(respostas, keys, invertidas = []) {
  const vals = keys.map((key, i) => {
    const raw = Number(respostas[key] ?? 0);
    return invertidas.includes(i) ? 4 - raw : raw;
  });
  const sum = vals.reduce((a, b) => a + b, 0);
  return Math.round((sum / (keys.length * 4)) * 100);
}

export function scoreCopsoq(respostas) {
  const dimensoes = COPSOQ_DIMS.map((d) => ({
    key: d.id,
    nome: d.titulo,
    score: dimScore(respostas, d.keys),
  }));
  const global = Math.round(dimensoes.reduce((a, d) => a + d.score, 0) / dimensoes.length);
  return { scoreGlobal: global, nivel: nivelFromScore(global), dimensoes };
}

export function scoreHse(respostas) {
  const dimensoes = HSE_DIMS.map((d) => {
    const keys = [0, 1, 2, 3, 4].map((i) => `${d.id}-q${i}`);
    return {
      key: d.id,
      nome: d.titulo,
      score: dimScore(respostas, keys, d.invertidas),
    };
  });
  const global = Math.round(dimensoes.reduce((a, d) => a + d.score, 0) / dimensoes.length);
  return { scoreGlobal: global, nivel: nivelFromScore(global), dimensoes };
}

export function scoreBurnout(respostas) {
  const keys = [0, 1, 2, 3, 4].map((i) => `cbi-q${i}`);
  const score = dimScore(respostas, keys);
  return {
    scoreGlobal: score,
    nivel: nivelFromScore(score, true),
    dimensoes: [{ key: 'burnout', nome: 'Esgotamento geral', score }],
  };
}

export function scoreClima(respostas) {
  const dimensoes = CLIMA_DIMS.map((d) => ({
    key: d.id,
    nome: d.titulo,
    score: dimScore(respostas, d.keys),
  }));
  const global = Math.round(dimensoes.reduce((a, d) => a + d.score, 0) / dimensoes.length);
  return { scoreGlobal: global, nivel: nivelFromScore(global), dimensoes };
}

export function scoreQuestionnaire(tipo, respostas) {
  switch (tipo) {
    case 'COPSOQ_III':
      return scoreCopsoq(respostas);
    case 'HSE':
      return scoreHse(respostas);
    case 'BURNOUT':
      return scoreBurnout(respostas);
    case 'CLIMA':
      return scoreClima(respostas);
    default:
      throw new Error(`Questionário desconhecido: ${tipo}`);
  }
}

export const LGPD_CONSENT_TEXT =
  'Autorizo o tratamento dos dados desta pesquisa psicossocial de forma agregada e anônima, ' +
  'exclusivamente para gestão de riscos ocupacionais (NR-01), conforme a LGPD (Lei 13.709/2018). ' +
  'Não serão coletados dados que permitam identificação individual quando o modo anônimo estiver ativo.';
