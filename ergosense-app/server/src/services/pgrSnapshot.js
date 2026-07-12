/**
 * Snapshot PGR — inventário + plano de ação + indicadores (dados reais)
 */
import { query } from '../db.js';
import { GRO_STAGE_LABELS } from '../groUtils.js';
import { ORG_RISK_SELECT_FIELDS, ORG_RISK_SELECT_JOINS } from './orgUtils.js';
import { getActiveCriteria } from './riskCriteriaService.js';

export async function buildPgrSnapshot(tenantId) {
  const { rows: tenantRows } = await query(
    `SELECT tenant_id, nome, industria FROM tenants WHERE tenant_id = $1 AND deleted_at IS NULL`,
    [tenantId],
  );
  const tenant = tenantRows[0];

  const { rows: empresaRows } = await query(
    `SELECT * FROM empresas WHERE tenant_id = $1 AND deleted_at IS NULL`,
    [tenantId],
  );
  const empresa = empresaRows[0];

  const { rows: risks } = await query(
    `SELECT r.id, r.tipo, r.fonte_geradora, r.perigo, r.consequencia,
            r.probabilidade, r.severidade, r.score_risco, r.nivel_risco,
            r.exposicao_duracao, r.exposicao_frequencia, r.exposicao_intensidade,
            r.numero_trabalhadores_expostos, r.grupo_homogeneo_exposicao,
            r.medidas_existentes, r.medidas_controle, r.evidencias_json,
            r.analise_id, r.aet_processo_id, r.pgr_versao_id, r.origem_modulo,
            r.responsavel, r.data_revisao, r.etapa_gro,
            s.nome AS setor, ${ORG_RISK_SELECT_FIELDS}
     FROM inventario_riscos r
     LEFT JOIN setores s ON s.id = r.setor_id
     ${ORG_RISK_SELECT_JOINS}
     WHERE r.tenant_id = $1 AND r.deleted_at IS NULL
     ORDER BY r.score_risco DESC`,
    [tenantId],
  );

  const { rows: allLinks } = await query(
    `SELECT inventario_risco_id, modulo, entidade_id, rotulo
     FROM inventario_vinculos WHERE tenant_id = $1`,
    [tenantId],
  );
  const linksByRisk = new Map();
  for (const l of allLinks) {
    const key = String(l.inventario_risco_id);
    if (!linksByRisk.has(key)) linksByRisk.set(key, []);
    linksByRisk.get(key).push({
      module: l.modulo,
      entityId: String(l.entidade_id),
      label: l.rotulo ?? l.modulo,
    });
  }

  const { rows: plans } = await query(
    `SELECT p.id, p.descricao, p.tipo_controle, p.responsavel, p.prazo, p.status,
            r.perigo AS risco_perigo, r.id AS risco_id
     FROM gro_plano_acao p
     JOIN inventario_riscos r ON r.id = p.inventario_risco_id
     WHERE p.tenant_id = $1 AND p.deleted_at IS NULL
     ORDER BY p.prazo NULLS LAST`,
    [tenantId],
  );

  const { rows: indicators } = await query(
    `SELECT i.id, i.nome, i.tipo, i.meta, i.valor_atual, i.unidade, i.frequencia,
            r.perigo AS risco_perigo
     FROM gro_indicadores i
     LEFT JOIN inventario_riscos r ON r.id = i.inventario_risco_id
     WHERE i.tenant_id = $1 AND i.deleted_at IS NULL`,
    [tenantId],
  );

  const { rows: stageCounts } = await query(
    `SELECT etapa_gro, COUNT(*)::int AS c FROM inventario_riscos
     WHERE tenant_id = $1 AND deleted_at IS NULL GROUP BY etapa_gro`,
    [tenantId],
  );

  const { rows: orgStats } = await query(
    `SELECT
       (SELECT COUNT(*)::int FROM unidades WHERE tenant_id = $1 AND deleted_at IS NULL) AS unidades,
       (SELECT COUNT(*)::int FROM setores WHERE tenant_id = $1 AND deleted_at IS NULL) AS setores,
       (SELECT COUNT(*)::int FROM funcoes WHERE tenant_id = $1 AND deleted_at IS NULL) AS funcoes,
       (SELECT COUNT(*)::int FROM atividades WHERE tenant_id = $1 AND deleted_at IS NULL) AS atividades,
       (SELECT COUNT(*)::int FROM postos_trabalho WHERE tenant_id = $1 AND deleted_at IS NULL) AS postos`,
    [tenantId],
  );

  let sstResumo = null;
  try {
    const { buildSstDashboard, buildSstIntegracao } = await import('./sstUtils.js');
    const dash = await buildSstDashboard(tenantId);
    const integ = await buildSstIntegracao(tenantId);
    sstResumo = { ...dash, ...integ };
  } catch {
    sstResumo = null;
  }

  const org = orgStats[0] ?? {};
  const activeCriteria = await getActiveCriteria(tenantId);

  return {
    generatedAt: new Date().toISOString(),
    norma: 'NR-01 — Portaria MTE 1.419/2024',
    nr015732: true,
    empresa: {
      tenantId,
      nome: empresa?.razao_social ?? tenant?.nome ?? tenantId,
      nomeFantasia: empresa?.nome_fantasia ?? null,
      cnpj: empresa?.cnpj ?? null,
      industria: tenant?.industria ?? '',
    },
    estruturaOrganizacional: {
      unidades: org.unidades ?? 0,
      setores: org.setores ?? 0,
      funcoes: org.funcoes ?? 0,
      atividades: org.atividades ?? 0,
      postos: org.postos ?? 0,
    },
    resumo: {
      totalRiscos: risks.length,
      totalAcoes: plans.length,
      totalIndicadores: indicators.length,
      porEtapaGro: Object.fromEntries(stageCounts.map((r) => [r.etapa_gro, r.c])),
      porNivel: {
        critico: risks.filter((r) => r.nivel_risco === 'critico').length,
        alto: risks.filter((r) => r.nivel_risco === 'alto').length,
        medio: risks.filter((r) => r.nivel_risco === 'medio').length,
        baixo: risks.filter((r) => r.nivel_risco === 'baixo').length,
      },
      nr015732Completo: risks.filter(
        (r) =>
          r.exposicao_duracao &&
          r.exposicao_frequencia &&
          r.exposicao_intensidade &&
          r.grupo_homogeneo_exposicao &&
          (Array.isArray(r.evidencias_json) ? r.evidencias_json.length : 0) > 0,
      ).length,
    },
    inventarioRiscos: risks.map((r) => ({
      id: String(r.id),
      tipo: r.tipo,
      setor: r.setor,
      unidade: r.unidade_nome,
      funcao: r.funcao_nome,
      atividade: r.atividade_nome,
      posto: r.posto_nome,
      fonteGeradora: r.fonte_geradora,
      perigo: r.perigo,
      consequencia: r.consequencia,
      probabilidade: r.probabilidade,
      severidade: r.severidade,
      score: r.score_risco,
      nivel: r.nivel_risco,
      exposicao: {
        duracao: r.exposicao_duracao,
        frequencia: r.exposicao_frequencia,
        intensidade: r.exposicao_intensidade,
      },
      numeroTrabalhadoresExpostos: r.numero_trabalhadores_expostos,
      grupoHomogeneoExposicao: r.grupo_homogeneo_exposicao,
      medidasExistentes: r.medidas_existentes,
      medidasControle: r.medidas_controle,
      evidencias: Array.isArray(r.evidencias_json) ? r.evidencias_json : [],
      vinculos: linksByRisk.get(String(r.id)) ?? [],
      analiseId: r.analise_id ? String(r.analise_id) : null,
      aetProcessoId: r.aet_processo_id ? String(r.aet_processo_id) : null,
      pgrVersaoId: r.pgr_versao_id ? String(r.pgr_versao_id) : null,
      origemModulo: r.origem_modulo,
      responsavel: r.responsavel,
      dataRevisao: r.data_revisao ? r.data_revisao.toISOString().slice(0, 10) : null,
      etapaGro: r.etapa_gro,
      etapaGroLabel: GRO_STAGE_LABELS[r.etapa_gro] ?? r.etapa_gro,
    })),
    planoAcao: plans.map((p) => ({
      id: String(p.id),
      riskId: String(p.risco_id),
      riscoPerigo: p.risco_perigo,
      descricao: p.descricao,
      tipoControle: p.tipo_controle,
      responsavel: p.responsavel,
      prazo: p.prazo ? p.prazo.toISOString().slice(0, 10) : null,
      status: p.status,
    })),
    indicadores: indicators.map((i) => ({
      id: String(i.id),
      nome: i.nome,
      tipo: i.tipo,
      meta: i.meta != null ? Number(i.meta) : null,
      valorAtual: i.valor_atual != null ? Number(i.valor_atual) : null,
      unidade: i.unidade,
      frequencia: i.frequencia,
      riscoPerigo: i.risco_perigo,
    })),
    sst: sstResumo,
    criteriosAvaliacao: {
      nr01Reference: activeCriteria.config?.nr01Reference ?? 'NR-01 §1.5.4.4.2.2',
      methodologyId: activeCriteria.methodologyId ? String(activeCriteria.methodologyId) : null,
      versionId: activeCriteria.versionId ? String(activeCriteria.versionId) : null,
      versionNumber: activeCriteria.versionNumber,
      name: activeCriteria.name,
      matrixType: activeCriteria.matrixType,
      activatedAt: activeCriteria.activatedAt,
      documentation: activeCriteria.documentation,
    },
  };
}

export function formatVersionNumber(sequential) {
  const major = Math.floor(sequential / 10) + 1;
  const minor = sequential % 10;
  return `${major}.${minor}`;
}
