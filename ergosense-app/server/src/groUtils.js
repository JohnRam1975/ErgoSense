/**
 * Ciclo GRO — etapas, transições e validações (NR-01)
 */
export const GRO_STAGES = [
  'IDENTIFICACAO',
  'AVALIACAO',
  'CONTROLE',
  'MONITORAMENTO',
  'REVISAO',
];

export const GRO_STAGE_LABELS = {
  IDENTIFICACAO: 'Identificação',
  AVALIACAO: 'Avaliação',
  CONTROLE: 'Controle',
  MONITORAMENTO: 'Monitoramento',
  REVISAO: 'Revisão',
};

export const CONTROL_TYPES = ['ELIMINACAO', 'SUBSTITUICAO', 'ENGENHARIA', 'ADMINISTRATIVA', 'EPI'];

export const ACTION_STATUSES = ['aberto', 'andamento', 'concluido', 'atrasado', 'cancelado'];

export const INDICATOR_TYPES = ['LEADING', 'LAGGING'];

export const REPORT_TYPES = ['CICLO_COMPLETO', 'INVENTARIO', 'PLANO_ACAO', 'INDICADORES', 'DOSSIE_GRO'];

export function nextStage(current) {
  const idx = GRO_STAGES.indexOf(current);
  if (idx < 0 || idx >= GRO_STAGES.length - 1) return null;
  return GRO_STAGES[idx + 1];
}

export function prevStage(current) {
  const idx = GRO_STAGES.indexOf(current);
  if (idx <= 0) return null;
  return GRO_STAGES[idx - 1];
}

export async function validateStageAdvance(query, tenantId, riskId, currentStage, targetStage) {
  const { rows } = await query(
    `SELECT id, fonte_geradora, perigo, probabilidade, severidade, medidas_controle, data_revisao
     FROM inventario_riscos WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [riskId, tenantId],
  );
  const risk = rows[0];
  if (!risk) return { ok: false, error: 'Risco não encontrado' };

  if (targetStage === 'AVALIACAO') {
    if (!risk.fonte_geradora || !risk.perigo) {
      return { ok: false, error: 'Complete identificação: fonte geradora e perigo' };
    }
  }

  if (targetStage === 'CONTROLE') {
    if (!risk.probabilidade || !risk.severidade) {
      return { ok: false, error: 'Complete avaliação: probabilidade e severidade' };
    }
  }

  if (targetStage === 'MONITORAMENTO') {
    const hasMeasures = risk.medidas_controle?.trim();
    const { rows: plans } = await query(
      `SELECT COUNT(*)::int AS c FROM gro_plano_acao
       WHERE inventario_risco_id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [riskId, tenantId],
    );
    if (!hasMeasures && (plans[0]?.c ?? 0) === 0) {
      return { ok: false, error: 'Defina medidas de controle ou cadastre ações no plano' };
    }
  }

  if (targetStage === 'REVISAO') {
    const { rows: ind } = await query(
      `SELECT COUNT(*)::int AS c FROM gro_indicadores
       WHERE inventario_risco_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
         AND (valor_atual IS NOT NULL OR ultima_medicao IS NOT NULL)`,
      [riskId, tenantId],
    );
    if ((ind[0]?.c ?? 0) === 0) {
      return { ok: false, error: 'Registre pelo menos uma medição de indicador' };
    }
  }

  return { ok: true, risk };
}

export function computeGroMaturity(byStage, total) {
  if (!total) return 0;
  const weights = { IDENTIFICACAO: 1, AVALIACAO: 2, CONTROLE: 3, MONITORAMENTO: 4, REVISAO: 5 };
  let sum = 0;
  for (const [stage, count] of Object.entries(byStage)) {
    sum += (weights[stage] ?? 0) * count;
  }
  return Math.round((sum / (total * 5)) * 100);
}
