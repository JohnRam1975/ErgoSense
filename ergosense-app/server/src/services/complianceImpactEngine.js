/**
 * Motor de impacto — sistema · clientes · tarefas de adequação
 * NUNCA aplica regras automaticamente.
 */
import { query } from '../db.js';
import { logComplianceHistory } from './complianceUtils.js';

const SYSTEM_COMPONENTS = {
  PGR: ['pgrSnapshot.js', 'PgrScreens.tsx', 'pgrRoutes.js'],
  GRO: ['groRoutes.js', 'GroScreens.tsx', 'riskIntegrationHub.js'],
  INVENTARIO: ['riskInventoryRoutes.js', 'RiskInventoryScreens.tsx'],
  AET: ['aetCorporateService.js', 'aetReport.js', 'AetScreens.tsx'],
  NR17: ['nr17.ts', 'exportNr17Pdf.ts', 'vibrationScoring.js'],
  ESOCIAL: ['esocialXml.js', 'esocialXsdValidator.js', 'esocialTransmissionService.js'],
  PSICOSSOCIAL: ['psicoRoutes.js', 'psicoScoring.js', 'PsicossocialScreens.tsx'],
  SST: ['sstRoutes.js', 'SstScreens.tsx'],
  COMPLIANCE: ['complianceMonitor.js', 'ComplianceScreens.tsx'],
};

const CLIENT_PROFILES = [
  { perfil: 'INDUSTRIA', desc: 'Operações industriais com PGR/GRO ativos' },
  { perfil: 'ESCRITORIO', desc: 'Teleatendimento e ergonomia NR-17' },
  { perfil: 'SAUDE', desc: 'Exposições SST e eSocial SST' },
  { perfil: 'GERAL', desc: 'Todos os clientes ErgoSensePro' },
];

export function analyzeSystemImpact(detection) {
  const modules = detection.modulos_afetados ?? detection.affectedModules ?? [];
  const modList = Array.isArray(modules) ? modules : JSON.parse(modules || '[]');
  const impacts = [];

  for (const mod of modList) {
    const components = SYSTEM_COMPONENTS[mod] ?? ['core'];
    impacts.push({
      modulo: mod,
      componente: components.join(', '),
      descricao: `Módulo ${mod} requer revisão técnica após ${detection.tipo_evento ?? detection.eventType} em ${detection.codigo_norma ?? detection.normCode}.`,
      severidade: detection.impacto_nivel ?? detection.impactLevel ?? 'medio',
      acao_sistema: `Revisar templates, validações e relatórios do módulo ${mod}. Não alterar regras sem aprovação humana.`,
      requer_atualizacao: true,
    });
  }

  if (!impacts.length) {
    impacts.push({
      modulo: 'COMPLIANCE',
      componente: 'complianceMonitor.js',
      descricao: 'Alteração regulatória transversal detectada.',
      severidade: 'medio',
      acao_sistema: 'Análise jurídica e mapeamento de impacto nos módulos ErgoSensePro.',
      requer_atualizacao: true,
    });
  }
  return impacts;
}

export function analyzeClientImpact(detection) {
  const modules = detection.modulos_afetados ?? detection.affectedModules ?? [];
  const modList = Array.isArray(modules) ? modules : JSON.parse(modules || '[]');
  const level = detection.impacto_nivel ?? detection.impactLevel ?? 'medio';
  const impacts = [];

  for (const profile of CLIENT_PROFILES) {
    let relevant = profile.perfil === 'GERAL';
    if (profile.perfil === 'INDUSTRIA' && modList.some((m) => ['PGR', 'GRO', 'INVENTARIO'].includes(m))) relevant = true;
    if (profile.perfil === 'ESCRITORIO' && modList.some((m) => ['NR17', 'AET'].includes(m))) relevant = true;
    if (profile.perfil === 'SAUDE' && modList.some((m) => ['ESOCIAL', 'SST'].includes(m))) relevant = true;
    if (!relevant) continue;

    impacts.push({
      perfil_cliente: profile.perfil,
      descricao: `${profile.desc}: impacto ${level} por alteração em ${detection.codigo_norma ?? detection.normCode}.`,
      urgencia: level === 'critico' ? 'critica' : level === 'alto' ? 'alta' : 'media',
      comunicacao_sugerida:
        `Comunicar clientes ${profile.perfil}: revisar ${modList.join(', ')} conforme ${detection.titulo ?? detection.title}. ` +
        'Adequação somente após validação humana da detecção.',
    });
  }
  return impacts;
}

export async function persistSystemImpacts(tenantId, deteccaoId, impacts) {
  for (const imp of impacts) {
    await query(
      `INSERT INTO compliance_impacto_sistema (tenant_id, deteccao_id, modulo, componente, descricao, severidade, acao_sistema, requer_atualizacao)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [tenantId, deteccaoId, imp.modulo, imp.componente, imp.descricao, imp.severidade, imp.acao_sistema, imp.requer_atualizacao !== false],
    );
  }
}

export async function persistClientImpacts(tenantId, deteccaoId, impacts) {
  for (const imp of impacts) {
    await query(
      `INSERT INTO compliance_impacto_clientes (tenant_id, deteccao_id, perfil_cliente, descricao, urgencia, comunicacao_sugerida)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [tenantId, deteccaoId, imp.perfil_cliente, imp.descricao, imp.urgencia, imp.comunicacao_sugerida],
    );
  }
}

export async function generateAdequationTasks(tenantId, deteccaoId, legalImpacts, origem = 'DETECCAO') {
  const tasks = [];
  const prazoBase = new Date();

  for (const imp of legalImpacts) {
    prazoBase.setDate(prazoBase.getDate() + (imp.prazo_dias ?? imp.deadlineDays ?? 30));
    const prazo = prazoBase.toISOString().slice(0, 10);
    const { rows } = await query(
      `INSERT INTO compliance_adequacao_tarefas (tenant_id, deteccao_id, impacto_id, titulo, descricao, modulo, prazo, prioridade, origem)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [
        tenantId,
        deteccaoId,
        imp.id ?? null,
        `Adequar ${imp.modulo ?? imp.module} — ${(imp.descricao_impacto ?? imp.impactDescription ?? '').slice(0, 80)}`,
        imp.acao_recomendada ?? imp.recommendedAction ?? 'Executar adequação conforme análise de impacto.',
        imp.modulo ?? imp.module,
        prazo,
        imp.risco_legal === 'critico' || imp.legalRisk === 'critico' ? 'critica' : 'alta',
        origem,
      ],
    );
    tasks.push(rows[0]);
  }
  return tasks;
}

export async function flagModulesAfterApproval(tenantId, detection, user) {
  const modules = detection.modulos_afetados ?? [];
  const modList = Array.isArray(modules) ? modules : JSON.parse(modules || '[]');
  const flagged = [];

  if (modList.includes('PGR')) {
    const { rowCount } = await query(
      `UPDATE pgr_versoes SET requer_atualizacao = TRUE, updated_at = NOW()
       WHERE tenant_id = $1 AND status = 'APROVADO'
         AND id = (SELECT versao_ativa_id FROM pgr_programas WHERE tenant_id = $1 AND deleted_at IS NULL LIMIT 1)`,
      [tenantId],
    );
    if (rowCount > 0) flagged.push('PGR');
  }

  await logComplianceHistory({
    tenantId,
    entityType: 'APROVACAO',
    entityId: detection.id,
    action: 'MODULOS_SINALIZADOS_REVISAO',
    user,
    details: { modulos: modList, flagged, autoApplyExecuted: false },
  });

  return flagged;
}

export function mapSystemImpact(row) {
  return {
    id: String(row.id),
    detectionId: String(row.deteccao_id),
    module: row.modulo,
    component: row.componente ?? '',
    description: row.descricao,
    severity: row.severidade,
    systemAction: row.acao_sistema,
    requiresUpdate: row.requer_atualizacao,
    createdAt: row.created_at,
  };
}

export function mapClientImpact(row) {
  return {
    id: String(row.id),
    detectionId: String(row.deteccao_id),
    clientProfile: row.perfil_cliente,
    description: row.descricao,
    urgency: row.urgencia,
    suggestedCommunication: row.comunicacao_sugerida,
    createdAt: row.created_at,
  };
}

export function mapAdequationTask(row) {
  return {
    id: String(row.id),
    detectionId: row.deteccao_id ? String(row.deteccao_id) : null,
    impactId: row.impacto_id ? String(row.impacto_id) : null,
    title: row.titulo,
    description: row.descricao ?? '',
    module: row.modulo ?? '',
    responsible: row.responsavel ?? '',
    deadline: row.prazo ? row.prazo.toISOString().slice(0, 10) : null,
    status: row.status,
    priority: row.prioridade,
    origin: row.origem,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
