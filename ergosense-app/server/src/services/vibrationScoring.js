/**
 * Avaliação de vibração — NR-15 / ISO 2631-1 (corpo inteiro) · ISO 5349 / NHO-10 (mãos-braços)
 */

const CORPO_ACAO = 0.5;
const CORPO_LIMITE = 1.15;
const MAOS_ACAO = 2.5;
const MAOS_LIMITE = 5.0;

export function evaluateVibracaoCorpoInteiro({ aceleracaoMs2, horasExposicao, frequenciaHz = 8 }) {
  const a = Number(aceleracaoMs2);
  const h = Math.min(24, Math.max(0.1, Number(horasExposicao) || 8));
  if (!Number.isFinite(a) || a < 0) throw new Error('Aceleração inválida');

  const a8 = a * Math.sqrt(h / 8);
  let nivel = 'aceitavel';
  if (a8 >= CORPO_LIMITE) nivel = 'acima_limite';
  else if (a8 >= CORPO_ACAO) nivel = 'zona_acao';

  return {
    tipo: 'CORPO_INTEIRO',
    aceleracaoMs2: a,
    frequenciaHz: Number(frequenciaHz),
    horasExposicao: h,
    a8Equivalente: Math.round(a8 * 1000) / 1000,
    valorAcao: CORPO_ACAO,
    valorLimite: CORPO_LIMITE,
    nivel,
    norma: 'NR-15 Anexo 1 · ISO 2631-1',
    recomendacao:
      nivel === 'aceitavel'
        ? 'Exposição dentro dos limites. Manter monitoramento periódico.'
        : nivel === 'zona_acao'
          ? 'Implementar medidas de controle: assentos suspensos, manutenção de vias, rodízio, pausas.'
          : 'Exposição acima do limite. Ação imediata: eliminação/substituição, isolamento, EPI anti-vibração.',
  };
}

export function evaluateVibracaoMaosBracos({ aceleracaoMs2, horasExposicao }) {
  const a = Number(aceleracaoMs2);
  const h = Math.min(8, Math.max(0.1, Number(horasExposicao) || 4));
  if (!Number.isFinite(a) || a < 0) throw new Error('Aceleração inválida');

  const a8 = a * Math.sqrt(h / 8);
  let nivel = 'aceitavel';
  if (a8 >= MAOS_LIMITE) nivel = 'acima_limite';
  else if (a8 >= MAOS_ACAO) nivel = 'zona_acao';

  return {
    tipo: 'MAOS_BRACOS',
    aceleracaoMs2: a,
    horasExposicao: h,
    a8Equivalente: Math.round(a8 * 1000) / 1000,
    valorAcao: MAOS_ACAO,
    valorLimite: MAOS_LIMITE,
    nivel,
    norma: 'NHO-10 · ISO 5349-1',
    recomendacao:
      nivel === 'aceitavel'
        ? 'Exposição aceitável. Manter ferramentas e manutenção preventiva.'
        : nivel === 'zona_acao'
          ? 'Medidas administrativas e de engenharia: ferramentas de baixa vibração, luvas anti-vibração, rodízio.'
          : 'Limite excedido. Reavaliar processo, substituir ferramentas, reduzir tempo de exposição.',
  };
}

export function evaluateTeleatendimento(respostas) {
  const items = [
    { key: 'headset_ajustavel', label: 'Headset ajustável e confortável', peso: 2 },
    { key: 'monitor_altura', label: 'Monitor na altura dos olhos', peso: 2 },
    { key: 'cadeira_regulavel', label: 'Cadeira com regulagem de altura e apoio lombar', peso: 2 },
    { key: 'pausas_programadas', label: 'Pausas programadas (NR-17 17.6.3)', peso: 2 },
    { key: 'iluminacao_adequada', label: 'Iluminação adequada sem reflexos', peso: 1 },
    { key: 'scripts_rotacao', label: 'Rodízio de tarefas / scripts', peso: 1 },
    { key: 'treinamento_postural', label: 'Treinamento em ergonomia para teleatendimento', peso: 1 },
    { key: 'suporte_psicossocial', label: 'Canal de suporte psicossocial', peso: 1 },
  ];
  let max = 0;
  let score = 0;
  const detalhes = items.map((it) => {
    max += it.peso * 2;
    const val = Number(respostas[it.key] ?? 0);
    score += val * it.peso;
    return { ...it, valor: val, maxItem: 2 };
  });
  const pct = max ? Math.round((score / max) * 100) : 0;
  const nivel = pct >= 80 ? 'conforme' : pct >= 60 ? 'parcial' : 'nao_conforme';
  return {
    scorePct: pct,
    nivel,
    itens: detalhes,
    norma: 'NR-17 · Teleatendimento / Escritório',
    recomendacao:
      nivel === 'conforme'
        ? 'Posto de teleatendimento conforme. Revisar semestralmente.'
        : 'Implementar ajustes de mobiliário, pausas e treinamento conforme NR-17 17.3 e 17.6.',
  };
}

export function evaluateOrganizacaoTrabalho(dados) {
  const campos = [
    { key: 'ritmo_trabalho', label: 'Ritmo de trabalho adequado (17.1.1.1)', peso: 2 },
    { key: 'pausas', label: 'Pausas para descanso e recuperação', peso: 2 },
    { key: 'turnos', label: 'Organização de turnos compatível', peso: 2 },
    { key: 'monotonia', label: 'Variedade / alternância de tarefas', peso: 2 },
    { key: 'metas', label: 'Metas realistas e participativas', peso: 1 },
    { key: 'autonomia', label: 'Autonomia para regular o ritmo', peso: 1 },
    { key: 'comunicacao', label: 'Comunicação clara de demandas', peso: 1 },
    { key: 'capacitacao', label: 'Capacitação para a função', peso: 1 },
  ];
  let max = 0;
  let score = 0;
  const itens = campos.map((c) => {
    max += c.peso * 2;
    const val = Number(dados[c.key] ?? 0);
    score += val * c.peso;
    return { ...c, valor: val };
  });
  const pct = max ? Math.round((score / max) * 100) : 0;
  const nivel = pct >= 75 ? 'conforme' : pct >= 50 ? 'parcial' : 'nao_conforme';
  return {
    scorePct: pct,
    nivel,
    itens,
    norma: 'NR-17 17.1.1.1 — Organização do trabalho',
    recomendacao:
      nivel === 'conforme'
        ? 'Organização do trabalho adequada. Documentar e revisar no PGR.'
        : 'Revisar normas de produção, pausas, turnos e participação dos trabalhadores.',
  };
}
