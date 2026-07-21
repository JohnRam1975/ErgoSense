/**
 * ColaboradorService — CRUD de colaboradores (SRP)
 */
import { query } from '../db.js';
import { sanitizePlainText } from '../auth/sanitize.js';
import { ensureEmpresaUnidade, ensureOrgForCollaborator } from './orgUtils.js';
import { mapCollaborator } from '../mappers/coreMappers.js';

const COLLABORATOR_SELECT = `
  SELECT c.id, c.nome, c.matricula, c.cargo, c.turno, c.data_nascimento, c.observacoes,
         c.consentimento_lgpd, c.consentimento_data, c.risk_level, c.icone, c.icone_bg,
         c.funcao_id, c.posto_trabalho_id,
         s.nome AS setor, fn.nome AS funcao_nome, pt.nome AS posto_nome
  FROM colaboradores c
  LEFT JOIN setores s ON s.id = c.setor_id
  LEFT JOIN funcoes fn ON fn.id = c.funcao_id
  LEFT JOIN postos_trabalho pt ON pt.id = c.posto_trabalho_id`;

const ICONS = ['👷', '🦺', '⚙️', '🔧', '👨‍🔧'];
const BGS = ['var(--g10)', 'var(--r10)', 'var(--a10)', 'var(--o10)', 'var(--c10)'];

async function resolveSetorId(tenantId, setorName) {
  if (!setorName) return null;
  const safeSetor = sanitizePlainText(setorName, 120);
  const setorRow = await query(
    `SELECT id FROM setores WHERE tenant_id = $1 AND nome = $2 LIMIT 1`,
    [tenantId, safeSetor],
  );
  if (setorRow.rows[0]?.id) return setorRow.rows[0].id;

  const { unidade } = await ensureEmpresaUnidade(query, tenantId);
  const ins = await query(
    `INSERT INTO setores (tenant_id, unidade_id, nome) VALUES ($1, $2, $3) RETURNING id`,
    [tenantId, unidade.id, safeSetor],
  );
  return ins.rows[0].id;
}

async function fetchCollaboratorById(id) {
  const full = await query(`${COLLABORATOR_SELECT} WHERE c.id = $1`, [id]);
  return full.rows[0] ? mapCollaborator(full.rows[0]) : null;
}

export async function listCollaborators(tenantId) {
  const { rows } = await query(
    `${COLLABORATOR_SELECT}
     WHERE c.tenant_id = $1 AND c.deleted_at IS NULL
     ORDER BY c.nome`,
    [tenantId],
  );
  return rows.map(mapCollaborator);
}

export async function createCollaborator(tenantId, body) {
  const { nome, matricula, cargo, setor, turno, birthDate, notes, consent } = body;
  const safeNome = sanitizePlainText(nome, 200);
  const safeMatricula = sanitizePlainText(matricula, 64);
  const safeCargo = cargo ? sanitizePlainText(cargo, 120) : null;
  const safeTurno = turno ? sanitizePlainText(turno, 64) : null;
  const safeNotes = notes ? sanitizePlainText(notes, 2000) : null;

  const setorId = await resolveSetorId(tenantId, setor);
  const idx = Math.floor(Math.random() * ICONS.length);

  const existing = await query(
    `SELECT id FROM colaboradores WHERE tenant_id = $1 AND matricula = $2 AND deleted_at IS NULL LIMIT 1`,
    [tenantId, safeMatricula],
  );
  if (existing.rows[0]?.id) {
    return fetchCollaboratorById(existing.rows[0].id);
  }

  const { rows } = await query(
    `INSERT INTO colaboradores (tenant_id, setor_id, nome, matricula, cargo, turno, data_nascimento,
      observacoes, consentimento_lgpd, consentimento_data, risk_level, icone, icone_bg)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'baixo',$11,$12)
     RETURNING id`,
    [
      tenantId,
      setorId,
      safeNome,
      safeMatricula,
      safeCargo,
      safeTurno,
      birthDate || null,
      safeNotes,
      !!consent,
      consent ? new Date() : null,
      ICONS[idx],
      BGS[idx],
    ],
  );

  if (setorId) {
    await ensureOrgForCollaborator(query, tenantId, {
      setorId,
      cargo: safeCargo,
      matricula: safeMatricula,
    });
  }

  return fetchCollaboratorById(rows[0].id);
}

export async function updateCollaborator(tenantId, id, body) {
  const { nome, matricula, cargo, setor, turno, birthDate, notes, consent } = body;
  const safeNome = sanitizePlainText(nome, 200);
  const safeMatricula = sanitizePlainText(matricula, 64);
  const safeCargo = cargo ? sanitizePlainText(cargo, 120) : null;
  const safeTurno = turno ? sanitizePlainText(turno, 64) : null;
  const safeNotes = notes ? sanitizePlainText(notes, 2000) : null;

  const setorId = setor ? await resolveSetorId(tenantId, setor) : null;

  const { rowCount } = await query(
    `UPDATE colaboradores SET setor_id = $1, nome = $2, matricula = $3, cargo = $4, turno = $5,
      data_nascimento = $6, observacoes = $7, consentimento_lgpd = $8,
      consentimento_data = CASE WHEN $8 THEN COALESCE(consentimento_data, NOW()) ELSE consentimento_data END,
      updated_at = NOW()
     WHERE id = $9 AND tenant_id = $10 AND deleted_at IS NULL`,
    [setorId, safeNome, safeMatricula, safeCargo, safeTurno, birthDate || null, safeNotes, !!consent, id, tenantId],
  );

  if (!rowCount) return null;

  if (setorId) {
    await ensureOrgForCollaborator(query, tenantId, {
      setorId,
      cargo: safeCargo,
      matricula: safeMatricula,
    });
  }

  return fetchCollaboratorById(id);
}
