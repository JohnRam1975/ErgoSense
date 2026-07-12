/**
 * Mapeadores compartilhados — camada de apresentação (Clean Architecture)
 */
import { repairPortugueseText } from '../textEncoding.js';

export function mapTenant(row) {
  return {
    id: row.id ?? row.tenant_id,
    name: row.name ?? row.nome,
    industry: row.industry ?? row.industria ?? '',
    schema: row.schema ?? row.schema_name ?? undefined,
    icon: row.icon ?? row.icone ?? '🏢',
    color: row.color ?? row.cor ?? 'neutral',
    active: row.active ?? row.ativo,
    employees: row.employees ?? undefined,
  };
}

export function mapCollaborator(row) {
  return {
    id: String(row.id),
    name: repairPortugueseText(row.nome),
    matricula: row.matricula,
    cargo: repairPortugueseText(row.cargo ?? ''),
    setor: repairPortugueseText(row.setor ?? ''),
    functionId: row.funcao_id ? String(row.funcao_id) : null,
    functionName: row.funcao_nome ? repairPortugueseText(row.funcao_nome) : null,
    workPostId: row.posto_trabalho_id ? String(row.posto_trabalho_id) : null,
    workPostName: row.posto_nome ? repairPortugueseText(row.posto_nome) : null,
    turno: row.turno ?? '',
    birthDate: row.data_nascimento ? String(row.data_nascimento).slice(0, 10) : undefined,
    notes: row.observacoes ?? undefined,
    consent: row.consentimento_lgpd,
    consentDate: row.consentimento_data
      ? new Date(row.consentimento_data).toLocaleString('pt-BR')
      : undefined,
    risk: row.risk_level ?? 'baixo',
    icon: row.icone ?? '👷',
    iconBg: row.icone_bg ?? 'var(--g10)',
  };
}

export function mapAnalysis(row) {
  const angles = row.angulos_json ?? {};
  const loadParams = row.load_params_json ?? undefined;
  const loadResult = row.load_result_json ?? undefined;
  const loadEstimate = row.load_estimate_json ?? undefined;
  const loadManual = row.load_manual_json ?? undefined;
  const loadEffort = row.load_effort_json ?? undefined;
  const loadAssessment =
    loadParams || loadResult || loadManual || loadEffort
      ? {
          manual: loadManual ?? {},
          estimate: loadEstimate,
          params: loadParams ?? {},
          result: loadResult,
          effort: loadEffort,
        }
      : undefined;
  return {
    id: String(row.id),
    collaboratorId: String(row.colaborador_id),
    collaboratorName: repairPortugueseText(row.collaborator_name),
    setor: repairPortugueseText(row.setor ?? ''),
    activity: repairPortugueseText(row.atividade),
    activityContext: row.activity_context ?? undefined,
    notes: row.observacoes ?? undefined,
    date: formatDate(row.data_analise),
    time: formatTime(row.hora_analise),
    score: row.score ?? 0,
    risk: row.risk_level ?? 'baixo',
    rula: row.rula ?? 0,
    reba: row.reba ?? 0,
    angles,
    workstation: row.workstation_json ?? undefined,
    mode: row.modo,
    synced: row.synced,
    icon: row.icone ?? '👷',
    iconBg: row.icone_bg ?? 'var(--g10)',
    captureImage: row.imagem_base64 ?? undefined,
    hasVideoRecording: Boolean(row.video_formato || row.video_mime || row.storage_key),
    videoFormat: row.video_formato ?? undefined,
    videoMimeType: row.video_mime ?? undefined,
    recordingSecs: row.duracao_gravacao ?? undefined,
    maxRiskStreakSecs: row.max_risk_streak_secs ?? undefined,
    totalRiskSecs: row.total_risk_secs ?? undefined,
    nr17Report: row.nr17_report_json ?? undefined,
    sessionSampleCount: row.session_sample_count ?? undefined,
    loadParams,
    loadResult,
    loadEstimate,
    loadManual,
    loadEffort,
    loadAssessment,
  };
}

export function parseDateBR(d) {
  if (!d) return new Date().toISOString().slice(0, 10);
  const [day, month, year] = d.split('/');
  if (year && month && day) return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  return d;
}

export function parseTimeBR(t) {
  if (!t) return '00:00:00';
  return t.length === 5 ? `${t}:00` : t;
}

export function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString('pt-BR');
}

export function formatTime(t) {
  if (!t) return '';
  return String(t).slice(0, 5);
}

export function slugify(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}
