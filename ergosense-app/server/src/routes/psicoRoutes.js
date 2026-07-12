/**
 * Psicossocial — APIs REST (NR-01 / Guia MTE / LGPD)
 */
import crypto from 'crypto';
import { requirePermission } from '../auth/rbac.js';
import { sanitizePlainText } from '../auth/sanitize.js';
import { query } from '../db.js';
import { MTE_FATORES, getMteFator } from '../data/mteFatores.js';
import { publicFormRateLimit } from '../middleware/rateLimit.js';
import { logPsicoHistory, mapPsicoHistoryRow } from '../services/psicoHistory.js';
import {
  LGPD_CONSENT_TEXT,
  nivelFromMatriz,
  scoreFromProbSev,
  scoreQuestionnaire,
} from '../services/psicoScoring.js';
import { integrateFromPsicoFator, integrateFromPsicoResposta } from '../services/riskIntegrationHub.js';
import { evaluateForTenant, getActiveCriteria } from '../services/riskCriteriaService.js';
import { anonymizeIp, generateAccessToken, hashAccessToken } from '../services/denunciaService.js';
import { clientIp } from '../supportAuth.js';

const QUESTIONNAIRE_TYPES = ['COPSOQ_III', 'HSE', 'BURNOUT', 'CLIMA'];
const ACTION_STATUSES = ['aberto', 'andamento', 'concluido', 'atrasado', 'cancelado'];
const PRIORITIES = ['critico', 'alto', 'medio', 'baixo'];

function mapFator(catalog, row, setorNome) {
  const avaliado = Boolean(row?.probabilidade && row?.severidade);
  const prob = row?.probabilidade ?? null;
  const sev = row?.severidade ?? null;
  const score = avaliado ? scoreFromProbSev(prob, sev) : 0;
  const nivel = avaliado ? row.nivel_risco ?? nivelFromMatriz(prob, sev) : 'baixo';
  return {
    codigo: catalog.codigo,
    nome: catalog.nome,
    avaliado,
    setorId: row?.setor_id ? String(row.setor_id) : null,
    setor: setorNome ?? '—',
    probabilidade: prob,
    severidade: sev,
    score,
    nivel,
    observacoes: row?.observacoes ?? '',
    avaliadoEm: row?.avaliado_em ?? null,
  };
}

function mapPlano(row) {
  const prazo = row.prazo ? row.prazo.toISOString().slice(0, 10) : null;
  let status = row.status;
  if (status !== 'concluido' && status !== 'cancelado' && prazo && prazo < new Date().toISOString().slice(0, 10)) {
    status = 'atrasado';
  }
  return {
    id: String(row.id),
    tenantId: row.tenant_id,
    fatorCodigo: row.fator_codigo ?? null,
    description: row.descricao,
    responsible: row.responsavel ?? '',
    dueDate: prazo,
    status,
    priority: row.prioridade ?? 'medio',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAlerta(row) {
  return {
    id: String(row.id),
    severity: row.severidade,
    title: row.titulo,
    message: row.mensagem,
    sourceType: row.tipo_origem,
    sourceId: row.origem_id ? String(row.origem_id) : null,
    read: row.lido,
    createdAt: row.created_at,
  };
}

function mapIndicador(row) {
  return {
    id: String(row.id),
    questionnaireType: row.tipo_questionario,
    key: row.indicador_key,
    label: row.indicador_label,
    value: Number(row.valor),
    riskLevel: row.nivel_risco,
    period: row.periodo.toISOString().slice(0, 10),
    sampleSize: row.amostra_n,
    sectorId: row.setor_id ? String(row.setor_id) : null,
  };
}

async function loadFatores(tenantId) {
  const { rows } = await query(
    `SELECT f.*, s.nome AS setor_nome
     FROM psico_fatores_mte f
     LEFT JOIN setores s ON s.id = f.setor_id
     WHERE f.tenant_id = $1`,
    [tenantId],
  );
  const byCodigo = new Map(rows.map((r) => [r.fator_codigo, r]));
  return MTE_FATORES.map((cat) => {
    const row = byCodigo.get(cat.codigo);
    return mapFator(cat, row, row?.setor_nome);
  });
}

async function loadMatriz(tenantId) {
  const fatores = await loadFatores(tenantId);
  return fatores
    .filter((f) => f.avaliado)
    .map((f) => ({
      codigo: f.codigo,
      nome: f.nome,
      setor: f.setor,
      sev: f.severidade,
      prob: f.probabilidade,
      score: f.probabilidade * f.severidade,
      nivel: f.nivel,
    }));
}

async function upsertIndicador({ tenantId, tipo, key, label, valor, nivel, periodo, setorId = null }) {
  const period = periodo ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const { rows: existing } = await query(
    `SELECT id, valor, amostra_n FROM psico_indicadores
     WHERE tenant_id = $1 AND tipo_questionario = $2 AND indicador_key = $3
       AND periodo = $4::date AND setor_id IS NOT DISTINCT FROM $5`,
    [tenantId, tipo, key, period, setorId],
  );
  if (existing[0]) {
    const n = existing[0].amostra_n + 1;
    const avg = (Number(existing[0].valor) * existing[0].amostra_n + valor) / n;
    await query(
      `UPDATE psico_indicadores SET valor = $1, amostra_n = $2, nivel_risco = $3 WHERE id = $4`,
      [Math.round(avg * 100) / 100, n, nivel, existing[0].id],
    );
  } else {
    await query(
      `INSERT INTO psico_indicadores (
         tenant_id, tipo_questionario, indicador_key, indicador_label,
         valor, nivel_risco, periodo, amostra_n, setor_id
       ) VALUES ($1,$2,$3,$4,$5,$6,$7::date,1,$8)`,
      [tenantId, tipo, key, label, valor, nivel, period, setorId],
    );
  }
}

async function maybeCreateAlert({ tenantId, severidade, titulo, mensagem, tipoOrigem, origemId }) {
  const { rows } = await query(
    `SELECT id FROM psico_alertas
     WHERE tenant_id = $1 AND titulo = $2 AND lido = FALSE
       AND created_at > NOW() - INTERVAL '7 days'`,
    [tenantId, titulo],
  );
  if (rows.length) return;
  await query(
    `INSERT INTO psico_alertas (tenant_id, severidade, titulo, mensagem, tipo_origem, origem_id)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [tenantId, severidade, titulo, mensagem, tipoOrigem, origemId ?? null],
  );
}

function buildPublicFormLink(req, token) {
  const origin = req.get('origin') || process.env.PUBLIC_APP_URL || 'http://localhost:5173';
  return `${origin.replace(/\/$/, '')}/form/${token}`;
}

function mapCampanhaRow(r) {
  return {
    id: String(r.id),
    type: r.tipo,
    title: r.titulo,
    sectorId: r.setor_id ? String(r.setor_id) : null,
    sectorName: r.setor_nome ?? null,
    anonymous: r.anonima,
    active: r.ativa,
    startDate: r.data_inicio ? r.data_inicio.toISOString().slice(0, 10) : null,
    endDate: r.data_fim ? r.data_fim.toISOString().slice(0, 10) : null,
    responses: r.respostas ?? 0,
    consentText: r.consentimento_texto ?? LGPD_CONSENT_TEXT,
    hasPublicLink: Boolean(r.link_token_hash),
  };
}

function campanhaAtiva(row) {
  if (!row?.ativa) return false;
  const today = new Date().toISOString().slice(0, 10);
  if (row.data_inicio && row.data_inicio.toISOString().slice(0, 10) > today) return false;
  if (row.data_fim && row.data_fim.toISOString().slice(0, 10) < today) return false;
  return true;
}

async function loadCampanhaByToken(token) {
  const hash = hashAccessToken(token);
  const { rows } = await query(
    `SELECT c.*, t.nome AS tenant_nome, s.nome AS setor_nome
     FROM psico_campanhas c
     JOIN tenants t ON t.tenant_id = c.tenant_id AND t.deleted_at IS NULL
     LEFT JOIN setores s ON s.id = c.setor_id
     WHERE c.link_token_hash = $1`,
    [hash],
  );
  return rows[0] ?? null;
}

async function persistPsicoResponse({
  tenantId,
  tipo,
  respostas,
  campanhaId = null,
  setorId = null,
  anonima = true,
  ipAnonimizado = null,
  user = null,
}) {
  let scored;
  scored = scoreQuestionnaire(tipo, respostas);

  const participanteHash = anonima
    ? crypto.createHash('sha256').update(`${tenantId}:${Date.now()}:${Math.random()}`).digest('hex').slice(0, 32)
    : null;

  const { rows } = await query(
    `INSERT INTO psico_respostas (
       tenant_id, campanha_id, tipo_questionario, setor_id, respostas_json,
       score_global, nivel_risco, dimensoes_json, consentimento_lgpd,
       consentimento_em, participante_hash, ip_anonimizado
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TRUE,NOW(),$9,$10) RETURNING id`,
    [
      tenantId,
      campanhaId,
      tipo,
      setorId,
      JSON.stringify(respostas),
      scored.scoreGlobal,
      scored.nivel,
      JSON.stringify(scored.dimensoes),
      participanteHash,
      ipAnonimizado,
    ],
  );

  const periodo = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  await upsertIndicador({
    tenantId,
    tipo,
    key: 'global',
    label: 'Score global',
    valor: scored.scoreGlobal,
    nivel: scored.nivel,
    periodo,
    setorId,
  });
  for (const d of scored.dimensoes) {
    await upsertIndicador({
      tenantId,
      tipo,
      key: d.key,
      label: d.nome,
      valor: d.score,
      nivel: scored.nivel,
      periodo,
      setorId,
    });
  }

  const alertThreshold = tipo === 'BURNOUT' ? 50 : 40;
  if (scored.scoreGlobal <= alertThreshold || scored.nivel === 'critico') {
    await maybeCreateAlert({
      tenantId,
      severidade: scored.nivel === 'critico' ? 'critico' : 'alto',
      titulo: `${tipo}: score ${scored.scoreGlobal}`,
      mensagem: `Questionário ${tipo} registrou score ${scored.scoreGlobal} (nível ${scored.nivel}). Revisar fatores relacionados.`,
      tipoOrigem: 'QUESTIONARIO',
      origemId: rows[0].id,
    });
  }

  await logPsicoHistory({
    tenantId,
    action: 'QUESTIONARIO_RESPONDIDO',
    user: anonima ? null : user,
    details: { tipo, score: scored.scoreGlobal, nivel: scored.nivel, anonimo: anonima, campanhaId },
  });

  try {
    await integrateFromPsicoResposta(null, tenantId, rows[0].id, {
      tipo_questionario: tipo,
      setor_id: setorId,
      score_global: scored.scoreGlobal,
      nivel_risco: scored.nivel,
    }, user);
  } catch (e) {
    console.warn('integrateFromPsicoResposta:', e.message);
  }

  return {
    id: String(rows[0].id),
    type: tipo,
    scoreGlobal: scored.scoreGlobal,
    riskLevel: scored.nivel,
    dimensions: scored.dimensoes,
    lgpd: { anonymous: anonima, consentRecorded: true },
  };
}

async function buildConformidade(tenantId) {
  const fatores = await loadFatores(tenantId);
  const avaliados = fatores.filter((f) => f.avaliado).length;
  const criticos = fatores.filter((f) => f.avaliado && f.nivel === 'critico').length;

  const { rows: respStats } = await query(
    `SELECT tipo_questionario, COUNT(*)::int AS n
     FROM psico_respostas WHERE tenant_id = $1 AND consentimento_lgpd = TRUE
     GROUP BY tipo_questionario`,
    [tenantId],
  );
  const respByType = Object.fromEntries(respStats.map((r) => [r.tipo_questionario, r.n]));

  const { rows: planStats } = await query(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE status = 'concluido')::int AS concluidas
     FROM psico_plano_acao WHERE tenant_id = $1 AND deleted_at IS NULL`,
    [tenantId],
  );

  const { rows: histStats } = await query(
    `SELECT COUNT(*)::int AS total FROM psico_historico WHERE tenant_id = $1`,
    [tenantId],
  );

  const { rows: psicoRisks } = await query(
    `SELECT COUNT(*)::int AS n FROM inventario_riscos
     WHERE tenant_id = $1 AND deleted_at IS NULL
       AND tipo = 'PSICOSSOCIAL'`,
    [tenantId],
  );

  const matriz = await loadMatriz(tenantId);
  const tiposRespondidos = QUESTIONNAIRE_TYPES.filter((t) => (respByType[t] ?? 0) > 0).length;

  const reqs = [
    {
      id: 'A1',
      norma: 'NR-1 1.5.3.1.4',
      requisito: 'Fatores psicossociais incluídos no GRO',
      status: avaliados >= 10 ? 'atendido' : avaliados >= 1 ? 'parcial' : 'pendente',
    },
    {
      id: 'A2',
      norma: 'NR-1 1.5.7.3.2',
      requisito: 'Inventário com campos (g)(h)(i) para psicossociais',
      status: (psicoRisks[0]?.n ?? 0) > 0 ? 'parcial' : avaliados >= 5 ? 'parcial' : 'pendente',
    },
    {
      id: 'A3',
      norma: 'NR-1 1.5.4.4.2.2',
      requisito: 'Critérios GRO documentados expressamente',
      status: matriz.length >= 3 ? 'atendido' : matriz.length >= 1 ? 'parcial' : 'pendente',
    },
    {
      id: 'A4',
      norma: 'Guia MTE — P.4°',
      requisito: 'Comunicação com trabalhadores antes da avaliação',
      status: tiposRespondidos >= 4 ? 'atendido' : tiposRespondidos >= 1 ? 'parcial' : 'pendente',
    },
    {
      id: 'A5',
      norma: 'Guia MTE — P.2°',
      requisito: 'CIPA / SESMT envolvidos no processo GRO',
      status: (histStats[0]?.total ?? 0) >= 10 ? 'parcial' : 'pendente',
    },
    {
      id: 'A6',
      norma: 'ISO 45003',
      requisito: 'Ciclo PDCA para riscos psicossociais',
      status: (planStats[0]?.concluidas ?? 0) >= 2 ? 'parcial' : 'pendente',
    },
    {
      id: 'A7',
      norma: 'NR-1 1.5.5.1.2',
      requisito: 'Hierarquia de medidas preventivas formalizada',
      status: (planStats[0]?.total ?? 0) >= 3 ? 'parcial' : 'pendente',
    },
    {
      id: 'A8',
      norma: 'ISO 45003',
      requisito: 'Processo multidisciplinar e participativo',
      status: tiposRespondidos >= 2 && avaliados >= 5 ? 'parcial' : 'pendente',
    },
    {
      id: 'A9',
      norma: 'NR-1 1.5.3.4',
      requisito: 'Melhoria contínua / PDCA documentado',
      status: (histStats[0]?.total ?? 0) >= 20 ? 'atendido' : (histStats[0]?.total ?? 0) >= 5 ? 'parcial' : 'pendente',
    },
    {
      id: 'A10',
      norma: 'Guia MTE 2025',
      requisito: '13 fatores avaliados e documentados',
      status: avaliados >= 13 ? 'atendido' : avaliados >= 7 ? 'parcial' : 'pendente',
    },
  ];

  const atendidos = reqs.filter((r) => r.status === 'atendido').length;
  const parciais = reqs.filter((r) => r.status === 'parcial').length;
  const conformidade = Math.round(((atendidos + parciais * 0.5) / reqs.length) * 100);

  return { conformidade, requirements: reqs, stats: { atendidos, parciais, pendentes: reqs.length - atendidos - parciais, avaliados, criticos } };
}

async function buildDashboard(tenantId) {
  const fatores = await loadFatores(tenantId);
  const conformidade = await buildConformidade(tenantId);

  const { rows: planStats } = await query(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status NOT IN ('concluido','cancelado'))::int AS abertas,
       COUNT(*) FILTER (WHERE status = 'concluido')::int AS concluidas
     FROM psico_plano_acao WHERE tenant_id = $1 AND deleted_at IS NULL`,
    [tenantId],
  );

  const { rows: alertRows } = await query(
    `SELECT * FROM psico_alertas WHERE tenant_id = $1 AND lido = FALSE
     ORDER BY created_at DESC LIMIT 10`,
    [tenantId],
  );

  const { rows: trendRows } = await query(
    `SELECT tipo_questionario, indicador_key, indicador_label, valor, periodo, nivel_risco
     FROM psico_indicadores
     WHERE tenant_id = $1 AND indicador_key = 'global'
       AND periodo >= (CURRENT_DATE - INTERVAL '6 months')
     ORDER BY periodo ASC`,
    [tenantId],
  );

  const { rows: respStats } = await query(
    `SELECT tipo_questionario, COUNT(*)::int AS n, AVG(score_global)::numeric(10,1) AS media
     FROM psico_respostas WHERE tenant_id = $1
     GROUP BY tipo_questionario`,
    [tenantId],
  );

  const avaliados = fatores.filter((f) => f.avaliado).length;
  const criticos = fatores.filter((f) => f.avaliado && (f.nivel === 'critico' || f.nivel === 'alto'));

  return {
    factorsAssessed: avaliados,
    factorsTotal: 13,
    criticalCount: fatores.filter((f) => f.avaliado && f.nivel === 'critico').length,
    highPriorityFactors: criticos.slice(0, 6),
    conformityPct: conformidade.conformidade,
    actionPlan: {
      total: planStats[0]?.total ?? 0,
      open: planStats[0]?.abertas ?? 0,
      completed: planStats[0]?.concluidas ?? 0,
    },
    alerts: alertRows.map(mapAlerta),
    trends: trendRows.map((r) => ({
      type: r.tipo_questionario,
      label: r.indicador_label ?? r.tipo_questionario,
      value: Number(r.valor),
      period: r.periodo.toISOString().slice(0, 10),
      riskLevel: r.nivel_risco,
    })),
    questionnaires: respStats.map((r) => ({
      type: r.tipo_questionario,
      responses: r.n,
      avgScore: r.media != null ? Number(r.media) : null,
    })),
    lgpd: {
      anonymousDefault: true,
      consentRequired: true,
      consentText: LGPD_CONSENT_TEXT,
      retentionMonths: 24,
    },
  };
}

export function registerPsicoRoutes(app, { resolveOperationalTenant }) {
  app.get('/api/psico/dashboard', requirePermission('psico:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Psicossocial');
    if (!tenantId) return;
    res.json(await buildDashboard(tenantId));
  });

  app.get('/api/psico/fatores', requirePermission('psico:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Psicossocial');
    if (!tenantId) return;
    res.json(await loadFatores(tenantId));
  });

  app.put('/api/psico/fatores/:codigo', requirePermission('psico:write'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Psicossocial');
    if (!tenantId) return;
    const codigo = req.params.codigo?.toUpperCase();
    if (!getMteFator(codigo)) return res.status(404).json({ error: 'Fator MTE não encontrado' });

    const prob = Number(req.body?.probabilidade);
    const sev = Number(req.body?.severidade);
    const active = await getActiveCriteria(tenantId);
    const scaleMin = active.config.scaleMin;
    const scaleMax = active.config.scaleMax;
    if (!Number.isInteger(prob) || prob < scaleMin || prob > scaleMax || !Number.isInteger(sev) || sev < scaleMin || sev > scaleMax) {
      return res.status(400).json({ error: `probabilidade e severidade devem ser inteiros de ${scaleMin} a ${scaleMax}` });
    }

    const setorId = req.body?.setorId ? Number(req.body.setorId) : null;
    const observacoes = sanitizePlainText(req.body?.observacoes ?? '', 2000);
    const evaluation = await evaluateForTenant(tenantId, prob, sev);
    if (!evaluation) return res.status(400).json({ error: 'Avaliação inválida para critérios vigentes' });
    const nivel = evaluation.level;
    const score = scoreFromProbSev(prob, sev);
    const user = req.user;

    const { rows } = await query(
      `INSERT INTO psico_fatores_mte (
         tenant_id, fator_codigo, setor_id, probabilidade, severidade,
         score, nivel_risco, observacoes, avaliado_por, avaliado_em, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())
       ON CONFLICT (tenant_id, fator_codigo)
       DO UPDATE SET
         setor_id = EXCLUDED.setor_id,
         probabilidade = EXCLUDED.probabilidade,
         severidade = EXCLUDED.severidade,
         score = EXCLUDED.score,
         nivel_risco = EXCLUDED.nivel_risco,
         observacoes = EXCLUDED.observacoes,
         avaliado_por = EXCLUDED.avaliado_por,
         avaliado_em = NOW(),
         updated_at = NOW()
       RETURNING *`,
      [tenantId, codigo, setorId, prob, sev, score, nivel, observacoes, user.id],
    );

    if (nivel === 'critico' || nivel === 'alto') {
      await maybeCreateAlert({
        tenantId,
        severidade: nivel === 'critico' ? 'critico' : 'alto',
        titulo: `Fator ${codigo} — risco ${nivel}`,
        mensagem: `${getMteFator(codigo).nome}: Sev ${sev} × Prob ${prob}. Avaliar medidas preventivas.`,
        tipoOrigem: 'FATOR_MTE',
        origemId: rows[0].id,
      });
    }

    await logPsicoHistory({
      tenantId,
      action: 'FATOR_AVALIADO',
      user,
      details: { codigo, prob, sev, nivel },
    });

    const { rows: joined } = await query(
      `SELECT f.*, s.nome AS setor_nome FROM psico_fatores_mte f
       LEFT JOIN setores s ON s.id = f.setor_id WHERE f.id = $1`,
      [rows[0].id],
    );
    try {
      await integrateFromPsicoFator(null, tenantId, joined[0], user);
    } catch (e) {
      console.warn('integrateFromPsicoFator:', e.message);
    }
    res.json(mapFator(getMteFator(codigo), joined[0], joined[0]?.setor_nome));
  });

  app.get('/api/psico/matriz', requirePermission('psico:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Psicossocial');
    if (!tenantId) return;
    res.json(await loadMatriz(tenantId));
  });

  app.get('/api/psico/conformidade', requirePermission('psico:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Psicossocial');
    if (!tenantId) return;
    res.json(await buildConformidade(tenantId));
  });

  app.get('/api/psico/campanhas', requirePermission('psico:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Psicossocial');
    if (!tenantId) return;
    const { rows } = await query(
      `SELECT c.*, s.nome AS setor_nome,
              (SELECT COUNT(*)::int FROM psico_respostas r WHERE r.campanha_id = c.id) AS respostas
       FROM psico_campanhas c
       LEFT JOIN setores s ON s.id = c.setor_id
       WHERE c.tenant_id = $1 ORDER BY c.created_at DESC`,
      [tenantId],
    );
    res.json(rows.map((r) => mapCampanhaRow(r)));
  });

  app.post('/api/psico/campanhas', requirePermission('psico:write'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Psicossocial');
    if (!tenantId) return;
    const tipo = req.body?.type?.toString()?.toUpperCase();
    if (!QUESTIONNAIRE_TYPES.includes(tipo)) {
      return res.status(400).json({ error: 'tipo inválido' });
    }
    const titulo = sanitizePlainText(req.body?.title ?? `Campanha ${tipo}`, 255);
    const setorId = req.body?.sectorId ? Number(req.body.sectorId) : null;
    const anonima = req.body?.anonymous !== false;
    const accessToken = generateAccessToken();
    const { rows } = await query(
      `INSERT INTO psico_campanhas (tenant_id, tipo, titulo, setor_id, anonima, consentimento_texto, ativa, link_token_hash)
       VALUES ($1,$2,$3,$4,$5,$6,TRUE,$7) RETURNING *`,
      [tenantId, tipo, titulo, setorId, anonima, LGPD_CONSENT_TEXT, hashAccessToken(accessToken)],
    );
    await logPsicoHistory({ tenantId, action: 'CAMPANHA_CRIADA', user: req.user, details: { tipo, titulo } });
    res.status(201).json({
      ...mapCampanhaRow({ ...rows[0], respostas: 0, setor_nome: null }),
      accessToken,
      publicLink: buildPublicFormLink(req, accessToken),
    });
  });

  app.post('/api/psico/campanhas/:id/link', requirePermission('psico:write'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Psicossocial');
    if (!tenantId) return;
    const id = Number(req.params.id);
    const accessToken = generateAccessToken();
    const { rows } = await query(
      `UPDATE psico_campanhas SET link_token_hash = $1, updated_at = NOW()
       WHERE id = $2 AND tenant_id = $3 RETURNING id, tipo, titulo`,
      [hashAccessToken(accessToken), id, tenantId],
    );
    if (!rows.length) return res.status(404).json({ error: 'Campanha não encontrada' });
    await logPsicoHistory({
      tenantId,
      action: 'CAMPANHA_LINK_REGENERADO',
      user: req.user,
      details: { id: String(id) },
    });
    res.json({
      id: String(rows[0].id),
      accessToken,
      publicLink: buildPublicFormLink(req, accessToken),
      message: 'Novo link gerado. Links anteriores deixam de funcionar.',
    });
  });

  app.get('/api/psico/public/form/:token', publicFormRateLimit, async (req, res) => {
    const row = await loadCampanhaByToken(req.params.token?.trim());
    if (!row) return res.status(404).json({ error: 'Formulário não encontrado ou link inválido' });
    if (!campanhaAtiva(row)) {
      return res.status(410).json({ error: 'Esta campanha não está mais ativa ou expirou' });
    }
    res.json({
      campaignId: String(row.id),
      type: row.tipo,
      title: row.titulo,
      companyName: row.tenant_nome,
      sectorName: row.setor_nome ?? null,
      consentText: row.consentimento_texto ?? LGPD_CONSENT_TEXT,
      anonymous: row.anonima,
    });
  });

  app.post('/api/psico/public/form/:token/respostas', publicFormRateLimit, async (req, res) => {
    const row = await loadCampanhaByToken(req.params.token?.trim());
    if (!row) return res.status(404).json({ error: 'Formulário não encontrado ou link inválido' });
    if (!campanhaAtiva(row)) {
      return res.status(410).json({ error: 'Esta campanha não está mais ativa ou expirou' });
    }
    if (!req.body?.consentimentoLgpd) {
      return res.status(400).json({ error: 'Consentimento LGPD obrigatório' });
    }
    const respostas = req.body?.answers;
    if (!respostas || typeof respostas !== 'object') {
      return res.status(400).json({ error: 'answers obrigatório' });
    }
    try {
      const result = await persistPsicoResponse({
        tenantId: row.tenant_id,
        tipo: row.tipo,
        respostas,
        campanhaId: row.id,
        setorId: row.setor_id,
        anonima: row.anonima,
        ipAnonimizado: anonymizeIp(clientIp(req)),
        user: null,
      });
      res.status(201).json({
        ...result,
        message: 'Resposta registrada com sucesso. Obrigado pela participação.',
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/psico/respostas', requirePermission('psico:respond'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Psicossocial');
    if (!tenantId) return;

    const tipo = req.body?.type?.toString()?.toUpperCase();
    if (!QUESTIONNAIRE_TYPES.includes(tipo)) {
      return res.status(400).json({ error: 'tipo de questionário inválido' });
    }
    if (!req.body?.consentimentoLgpd) {
      return res.status(400).json({ error: 'Consentimento LGPD obrigatório' });
    }

    const respostas = req.body?.answers;
    if (!respostas || typeof respostas !== 'object') {
      return res.status(400).json({ error: 'answers obrigatório' });
    }

    const setorId = req.body?.sectorId ? Number(req.body.sectorId) : null;
    const campanhaId = req.body?.campaignId ? Number(req.body.campaignId) : null;
    const anonima = req.body?.anonymous !== false;

    try {
      const result = await persistPsicoResponse({
        tenantId,
        tipo,
        respostas,
        campanhaId,
        setorId,
        anonima,
        ipAnonimizado: anonima ? anonymizeIp(clientIp(req)) : null,
        user: req.user,
      });
      res.status(201).json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/psico/indicadores', requirePermission('psico:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Psicossocial');
    if (!tenantId) return;
    const months = Math.min(24, Math.max(1, Number(req.query.months) || 6));
    const tipo = req.query.type?.toString()?.toUpperCase();
    const params = [tenantId, months];
    let sql = `SELECT * FROM psico_indicadores
               WHERE tenant_id = $1 AND periodo >= (CURRENT_DATE - ($2 || ' months')::interval)`;
    if (tipo && QUESTIONNAIRE_TYPES.includes(tipo)) {
      sql += ` AND tipo_questionario = $3`;
      params.push(tipo);
    }
    sql += ' ORDER BY periodo ASC, tipo_questionario, indicador_key';
    const { rows } = await query(sql, params);
    res.json(rows.map(mapIndicador));
  });

  app.get('/api/psico/tendencias', requirePermission('psico:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Psicossocial');
    if (!tenantId) return;
    const { rows } = await query(
      `SELECT tipo_questionario, periodo,
              AVG(valor) FILTER (WHERE indicador_key = 'global') AS media_global,
              SUM(amostra_n) FILTER (WHERE indicador_key = 'global') AS amostra
       FROM psico_indicadores
       WHERE tenant_id = $1 AND periodo >= (CURRENT_DATE - INTERVAL '12 months')
       GROUP BY tipo_questionario, periodo
       ORDER BY periodo ASC`,
      [tenantId],
    );
    res.json(
      rows.map((r) => ({
        type: r.tipo_questionario,
        period: r.periodo.toISOString().slice(0, 10),
        avgScore: r.media_global != null ? Math.round(Number(r.media_global) * 10) / 10 : null,
        sampleSize: Number(r.amostra ?? 0),
      })),
    );
  });

  app.get('/api/psico/alertas', requirePermission('psico:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Psicossocial');
    if (!tenantId) return;
    const unreadOnly = req.query.unread === 'true';
    const { rows } = await query(
      `SELECT * FROM psico_alertas WHERE tenant_id = $1
       ${unreadOnly ? 'AND lido = FALSE' : ''}
       ORDER BY created_at DESC LIMIT 50`,
      [tenantId],
    );
    res.json(rows.map(mapAlerta));
  });

  app.patch('/api/psico/alertas/:id/read', requirePermission('psico:write'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Psicossocial');
    if (!tenantId) return;
    const { rowCount } = await query(
      `UPDATE psico_alertas SET lido = TRUE WHERE id = $1 AND tenant_id = $2`,
      [Number(req.params.id), tenantId],
    );
    if (!rowCount) return res.status(404).json({ error: 'Alerta não encontrado' });
    res.json({ ok: true });
  });

  app.get('/api/psico/plano-acao', requirePermission('psico:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Psicossocial');
    if (!tenantId) return;
    const { rows } = await query(
      `SELECT * FROM psico_plano_acao WHERE tenant_id = $1 AND deleted_at IS NULL ORDER BY prazo NULLS LAST, id`,
      [tenantId],
    );
    res.json(rows.map(mapPlano));
  });

  app.post('/api/psico/plano-acao', requirePermission('psico:write'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Psicossocial');
    if (!tenantId) return;
    const descricao = sanitizePlainText(req.body?.description ?? '', 2000);
    if (!descricao) return res.status(400).json({ error: 'description obrigatório' });
    const prioridade = PRIORITIES.includes(req.body?.priority) ? req.body.priority : 'medio';
    const { rows } = await query(
      `INSERT INTO psico_plano_acao (tenant_id, fator_codigo, descricao, responsavel, prazo, status, prioridade)
       VALUES ($1,$2,$3,$4,$5,'aberto',$6) RETURNING *`,
      [
        tenantId,
        req.body?.fatorCodigo?.toUpperCase() ?? null,
        descricao,
        sanitizePlainText(req.body?.responsible ?? '', 255),
        req.body?.dueDate ?? null,
        prioridade,
      ],
    );
    await logPsicoHistory({ tenantId, action: 'PLANO_CRIADO', user: req.user, details: { id: rows[0].id } });
    res.status(201).json(mapPlano(rows[0]));
  });

  app.put('/api/psico/plano-acao/:id', requirePermission('psico:write'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Psicossocial');
    if (!tenantId) return;
    const id = Number(req.params.id);
    const status = ACTION_STATUSES.includes(req.body?.status) ? req.body.status : undefined;
    const { rows } = await query(
      `UPDATE psico_plano_acao SET
         descricao = COALESCE($3, descricao),
         responsavel = COALESCE($4, responsavel),
         prazo = COALESCE($5, prazo),
         status = COALESCE($6, status),
         prioridade = COALESCE($7, prioridade),
         updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING *`,
      [
        id,
        tenantId,
        req.body?.description ? sanitizePlainText(req.body.description, 2000) : null,
        req.body?.responsible != null ? sanitizePlainText(req.body.responsible, 255) : null,
        req.body?.dueDate ?? null,
        status ?? null,
        PRIORITIES.includes(req.body?.priority) ? req.body.priority : null,
      ],
    );
    if (!rows.length) return res.status(404).json({ error: 'Ação não encontrada' });
    await logPsicoHistory({ tenantId, action: 'PLANO_ATUALIZADO', user: req.user, details: { id } });
    res.json(mapPlano(rows[0]));
  });

  app.delete('/api/psico/plano-acao/:id', requirePermission('psico:write'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Psicossocial');
    if (!tenantId) return;
    await query(
      `UPDATE psico_plano_acao SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2`,
      [Number(req.params.id), tenantId],
    );
    await logPsicoHistory({ tenantId, action: 'PLANO_EXCLUIDO', user: req.user, details: { id: req.params.id } });
    res.json({ ok: true });
  });

  app.get('/api/psico/historico', requirePermission('psico:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Psicossocial');
    if (!tenantId) return;
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const { rows } = await query(
      `SELECT * FROM psico_historico WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [tenantId, limit],
    );
    res.json(rows.map(mapPsicoHistoryRow));
  });

  app.get('/api/psico/lgpd', requirePermission('psico:read'), async (_req, res) => {
    res.json({
      consentText: LGPD_CONSENT_TEXT,
      anonymousDefault: true,
      dataMinimization: true,
      retentionMonths: 24,
      purposes: ['Gestão de riscos psicossociais NR-01', 'Indicadores agregados', 'Conformidade MTE'],
      rights: ['Acesso', 'Correção', 'Eliminação', 'Portabilidade', 'Revogação do consentimento'],
    });
  });
}
