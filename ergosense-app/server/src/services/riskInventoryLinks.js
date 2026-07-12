/**
 * NR-01 §1.5.7.3.2 — Vínculos obrigatórios Inventário ↔ Análise ↔ AET ↔ GRO ↔ PGR
 */
import { query as defaultQuery } from '../db.js';
import { logGroHistory } from './groHistory.js';
import { logPgrHistory } from './pgrHistory.js';
import { buildPgrSnapshot } from './pgrSnapshot.js';

export const LINK_MODULES = ['ANALISE', 'AET', 'GRO', 'PGR'];

function q(client) {
  return client?.query ? client.query.bind(client) : defaultQuery;
}

export function parseEvidencias(raw) {
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : [];
  return list
    .map((item) => {
      if (typeof item === 'string') {
        return { tipo: 'DOCUMENTO', descricao: item.trim(), referencia: '', createdAt: new Date().toISOString() };
      }
      return {
        tipo: String(item?.tipo ?? item?.type ?? 'DOCUMENTO').slice(0, 64),
        descricao: String(item?.descricao ?? item?.description ?? '').trim(),
        referencia: String(item?.referencia ?? item?.reference ?? '').slice(0, 512),
        hash: item?.hash ? String(item.hash).slice(0, 128) : undefined,
        createdAt: item?.createdAt ?? new Date().toISOString(),
      };
    })
    .filter((e) => e.descricao || e.referencia);
}

export function validateNr015732Payload(parsed, links = {}) {
  const errors = [];

  if (!parsed.exposicaoDuracao?.trim()) errors.push('Duração da exposição é obrigatória (NR-01 §1.5.7.3.2 g)');
  if (!parsed.exposicaoFrequencia?.trim()) errors.push('Frequência da exposição é obrigatória (NR-01 §1.5.7.3.2 g)');
  if (!parsed.exposicaoIntensidade?.trim()) errors.push('Intensidade da exposição é obrigatória (NR-01 §1.5.7.3.2 g)');
  if (parsed.numeroTrabalhadoresExpostos == null || parsed.numeroTrabalhadoresExpostos < 1) {
    errors.push('Número de trabalhadores expostos deve ser ≥ 1 (NR-01 §1.5.7.3.2 e)');
  }
  if (!parsed.grupoHomogeneoExposicao?.trim()) {
    errors.push('Grupo homogêneo de exposição (GHE) é obrigatório (NR-01 §1.5.7.3.2 e)');
  }
  if (!parsed.evidencias?.length) {
    errors.push('Pelo menos uma evidência deve ser registrada (NR-01 §1.5.7.3.2)');
  }

  if (parsed.tipo === 'ERGONOMICO') {
    const hasAnalise = links.analiseId || links.hasAnaliseLink;
    const hasAet = links.aetProcessoId || links.hasAetLink;
    if (!hasAnalise && !hasAet) {
      errors.push('Risco ergonômico exige vínculo com Análise Ergonômica ou AET (NR-01 §1.5.7.3.2 h)');
    }
  }

  return errors;
}

export async function loadRiskLinks(runQuery, tenantId, riskId) {
  const { rows } = await runQuery(
    `SELECT v.*,
            CASE v.modulo
              WHEN 'ANALISE' THEN (SELECT COALESCE(a.atividade, 'Análise #' || a.id::text) FROM analises a WHERE a.id = v.entidade_id AND a.tenant_id = v.tenant_id LIMIT 1)
              WHEN 'AET' THEN (SELECT COALESCE(p.titulo, 'AET #' || p.id::text) FROM aet_processos p WHERE p.id = v.entidade_id AND p.tenant_id = v.tenant_id LIMIT 1)
              WHEN 'PGR' THEN (SELECT COALESCE(pv.numero, 'PGR v' || pv.numero_sequencial::text) FROM pgr_versoes pv WHERE pv.id = v.entidade_id AND pv.tenant_id = v.tenant_id LIMIT 1)
              WHEN 'GRO' THEN 'Ciclo GRO — ' || COALESCE(
                (SELECT etapa_gro FROM inventario_riscos WHERE id = v.inventario_risco_id LIMIT 1), 'IDENTIFICACAO')
            END AS entidade_rotulo
     FROM inventario_vinculos v
     WHERE v.tenant_id = $1 AND v.inventario_risco_id = $2
     ORDER BY v.modulo, v.created_at`,
    [tenantId, riskId],
  );

  return rows.map((r) => ({
    id: String(r.id),
    module: r.modulo,
    entityId: String(r.entidade_id),
    label: r.entidade_rotulo ?? r.rotulo ?? r.modulo,
    required: r.obrigatorio,
    createdAt: r.created_at,
  }));
}

async function upsertLink(runQuery, tenantId, riskId, modulo, entidadeId, rotulo, obrigatorio = true) {
  if (!entidadeId) return null;
  const { rows } = await runQuery(
    `INSERT INTO inventario_vinculos (tenant_id, inventario_risco_id, modulo, entidade_id, rotulo, obrigatorio)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (inventario_risco_id, modulo, entidade_id)
     DO UPDATE SET rotulo = EXCLUDED.rotulo, obrigatorio = EXCLUDED.obrigatorio, updated_at = NOW()
     RETURNING id`,
    [tenantId, riskId, modulo, entidadeId, rotulo ?? null, obrigatorio],
  );
  return rows[0]?.id ?? null;
}

async function syncPgrLink(runQuery, tenantId, riskId, user) {
  const { rows: draft } = await runQuery(
    `SELECT v.id, v.numero FROM pgr_versoes v
     JOIN pgr_programas p ON p.id = v.programa_id AND p.tenant_id = $1 AND p.deleted_at IS NULL
     WHERE v.tenant_id = $1 AND v.status IN ('RASCUNHO','EM_REVISAO')
     ORDER BY v.numero_sequencial DESC LIMIT 1`,
    [tenantId],
  );

  let versionId = draft[0]?.id ?? null;
  let versionLabel = draft[0]?.numero ?? null;

  if (versionId) {
    const snapshot = await buildPgrSnapshot(tenantId);
    await runQuery(
      `UPDATE pgr_versoes SET snapshot_json = $1, requer_atualizacao = FALSE, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(snapshot), versionId],
    );
  } else {
    const { rows: approved } = await runQuery(
      `SELECT v.id, v.numero FROM pgr_versoes v
       JOIN pgr_programas p ON p.id = v.programa_id AND p.tenant_id = $1
       WHERE v.tenant_id = $1 AND v.status = 'APROVADO'
       ORDER BY v.numero_sequencial DESC LIMIT 1`,
      [tenantId],
    );
    versionId = approved[0]?.id ?? null;
    versionLabel = approved[0]?.numero ?? null;
    if (versionId) {
      await runQuery(
        `UPDATE pgr_versoes SET requer_atualizacao = TRUE, updated_at = NOW() WHERE id = $1`,
        [versionId],
      );
    }
  }

  if (versionId) {
    await upsertLink(runQuery, tenantId, riskId, 'PGR', versionId, `PGR ${versionLabel ?? versionId}`, true);
    await runQuery(
      `UPDATE inventario_riscos SET pgr_versao_id = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3`,
      [versionId, riskId, tenantId],
    );
    await logPgrHistory({
      tenantId,
      versionId,
      action: 'VINCULO_INVENTARIO_SINCRONIZADO',
      user,
      details: { inventarioRiscoId: riskId },
    });
  }

  return versionId;
}

export async function syncMandatoryLinks(client, payload) {
  const runQuery = q(client);
  const {
    tenantId,
    riskId,
    tipo,
    analiseId = null,
    aetProcessoId = null,
    groStage = 'IDENTIFICACAO',
    user = null,
  } = payload;

  const links = [];

  if (analiseId) {
    const { rows } = await runQuery(
      `SELECT id, atividade FROM analises WHERE id = $1 AND tenant_id = $2`,
      [analiseId, tenantId],
    );
    if (rows[0]) {
      await runQuery(
        `UPDATE analises SET inventario_risco_id = $1 WHERE id = $2 AND tenant_id = $3`,
        [riskId, analiseId, tenantId],
      );
      await runQuery(
        `UPDATE inventario_riscos SET analise_id = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3`,
        [analiseId, riskId, tenantId],
      );
      const linkId = await upsertLink(runQuery, tenantId, riskId, 'ANALISE', analiseId, rows[0].atividade ?? `Análise #${analiseId}`);
      links.push({ module: 'ANALISE', entityId: analiseId, linkId });
    }
  }

  if (aetProcessoId) {
    const { rows } = await runQuery(
      `SELECT id, titulo FROM aet_processos WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [aetProcessoId, tenantId],
    );
    if (rows[0]) {
      await runQuery(
        `UPDATE aet_processos SET inventario_risco_id = $1 WHERE id = $2 AND tenant_id = $3`,
        [riskId, aetProcessoId, tenantId],
      );
      await runQuery(
        `UPDATE inventario_riscos SET aet_processo_id = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3`,
        [aetProcessoId, riskId, tenantId],
      );
      const linkId = await upsertLink(runQuery, tenantId, riskId, 'AET', aetProcessoId, rows[0].titulo ?? `AET #${aetProcessoId}`);
      links.push({ module: 'AET', entityId: aetProcessoId, linkId });
    }
  }

  const groLinkId = await upsertLink(
    runQuery,
    tenantId,
    riskId,
    'GRO',
    riskId,
    `Etapa ${groStage}`,
    true,
  );
  links.push({ module: 'GRO', entityId: riskId, linkId: groLinkId });

  const pgrVersionId = await syncPgrLink(runQuery, tenantId, riskId, user);
  if (pgrVersionId) {
    links.push({ module: 'PGR', entityId: pgrVersionId });
  }

  await logGroHistory({
    tenantId,
    riskId,
    stage: groStage,
    action: 'VINCULOS_NR01_SINCRONIZADOS',
    user,
    details: { links: links.map((l) => l.module), tipo },
  });

  return { links, pgrVersionId };
}

export async function buildNr015732Compliance(runQuery, tenantId, row, links) {
  const linkModules = new Set(links.map((l) => l.module));
  const checks = [
    { id: 'g_duracao', label: 'Caracterização da exposição — duração', ok: !!row.exposicao_duracao?.trim() },
    { id: 'g_frequencia', label: 'Caracterização da exposição — frequência', ok: !!row.exposicao_frequencia?.trim() },
    { id: 'g_intensidade', label: 'Caracterização da exposição — intensidade', ok: !!row.exposicao_intensidade?.trim() },
    { id: 'e_trabalhadores', label: 'Número de trabalhadores expostos', ok: (row.numero_trabalhadores_expostos ?? 0) >= 1 },
    { id: 'e_ghe', label: 'Grupo homogêneo de exposição (GHE)', ok: !!row.grupo_homogeneo_exposicao?.trim() },
    { id: 'c_fonte', label: 'Fonte geradora', ok: !!row.fonte_geradora?.trim() },
    { id: 'f_medidas', label: 'Medidas existentes', ok: !!row.medidas_existentes?.trim() || !!row.medidas_controle?.trim() },
    { id: 'evidencias', label: 'Evidências registradas', ok: (Array.isArray(row.evidencias_json) ? row.evidencias_json : []).length > 0 },
    { id: 'link_gro', label: 'Vínculo GRO', ok: linkModules.has('GRO') },
    { id: 'link_pgr', label: 'Vínculo PGR', ok: linkModules.has('PGR') || !!row.pgr_versao_id },
  ];

  if (row.tipo === 'ERGONOMICO') {
    checks.push({
      id: 'h_ergo',
      label: 'Vínculo Análise Ergonômica ou AET (NR-17)',
      ok: linkModules.has('ANALISE') || linkModules.has('AET') || !!row.analise_id || !!row.aet_processo_id,
    });
  }

  const ok = checks.filter((c) => c.ok).length;
  return {
    norma: 'NR-01 §1.5.7.3.2',
    scorePct: Math.round((ok / checks.length) * 100),
    checks,
    compliant: ok === checks.length,
  };
}
