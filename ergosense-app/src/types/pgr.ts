/** PGR — Programa de Gerenciamento de Riscos */

export type PgrVersionStatus =
  | 'RASCUNHO'
  | 'EM_REVISAO'
  | 'AGUARDANDO_APROVACAO'
  | 'APROVADO'
  | 'OBSOLETO';

export type PgrSignatureType =
  | 'ELABORADOR'
  | 'RESPONSAVEL_TECNICO'
  | 'REPRESENTANTE_LEGAL'
  | 'CIPA'
  | 'SESMT';

export type PgrApprovalStatus = 'PENDENTE' | 'APROVADO' | 'REJEITADO';

export interface PgrSnapshot {
  generatedAt: string;
  norma: string;
  empresa: { tenantId: string; nome: string; industria: string };
  resumo: {
    totalRiscos: number;
    totalAcoes: number;
    totalIndicadores: number;
    porNivel: Record<string, number>;
  };
  inventarioRiscos: Array<{
    id: string;
    tipo: string;
    setor: string | null;
    fonteGeradora: string;
    perigo: string;
    consequencia: string;
    probabilidade: number;
    severidade: number;
    score: number;
    nivel: string;
    medidasControle: string | null;
    responsavel: string | null;
    etapaGroLabel: string;
  }>;
  planoAcao: Array<{
    id: string;
    riscoPerigo: string;
    descricao: string;
    tipoControle: string;
    responsavel: string | null;
    prazo: string | null;
    status: string;
  }>;
  indicadores: Array<{
    id: string;
    nome: string;
    tipo: string;
    meta: number | null;
    valorAtual: number | null;
    unidade: string | null;
  }>;
}

export interface PgrProgram {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  technicalResponsible: string;
  legalResponsible: string;
  activeVersionId: string | null;
  activeVersionNumber: string | null;
  activeVersionStatus: PgrVersionStatus | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PgrVersionSummary {
  id: string;
  tenantId: string;
  programId: string;
  number: string;
  sequential: number;
  status: PgrVersionStatus;
  snapshot?: { resumo?: PgrSnapshot['resumo'] };
  preparedBy: string;
  reviewedBy: string;
  preparedAt: string | null;
  reviewedAt: string | null;
  nextReviewAt: string | null;
  reviewReason: string;
  notes: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PgrApproval {
  id: string;
  versionId: string;
  approverName: string;
  approverRole: string;
  approverEmail: string;
  status: PgrApprovalStatus;
  decidedAt: string | null;
  notes: string;
  createdAt?: string;
}

export interface PgrSignature {
  id: string;
  versionId: string;
  type: PgrSignatureType;
  name: string;
  role: string;
  document: string;
  statement: string;
  signedAt: string;
  userId: string | null;
}

export interface PgrVersionDetail extends PgrVersionSummary {
  snapshot: PgrSnapshot;
  approvals: PgrApproval[];
  signatures: PgrSignature[];
}

export interface PgrHistoryEntry {
  id: string;
  tenantId: string;
  versionId: string | null;
  versionNumber: string | null;
  action: string;
  userId: string | null;
  userName: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
}

export const PGR_STATUS_LABELS: Record<PgrVersionStatus, string> = {
  RASCUNHO: 'Rascunho',
  EM_REVISAO: 'Em revisão',
  AGUARDANDO_APROVACAO: 'Aguardando aprovação',
  APROVADO: 'Aprovado',
  OBSOLETO: 'Obsoleto',
};

export const PGR_SIGNATURE_LABELS: Record<PgrSignatureType, string> = {
  ELABORADOR: 'Elaborador',
  RESPONSAVEL_TECNICO: 'Responsável técnico',
  REPRESENTANTE_LEGAL: 'Representante legal',
  CIPA: 'CIPA',
  SESMT: 'SESMT',
};

export function pgrActionLabel(action: string): string {
  const map: Record<string, string> = {
    PROGRAMA_ATUALIZADO: 'Programa atualizado',
    VERSAO_GERADA: 'Versão gerada (snapshot automático)',
    VERSAO_ATUALIZADA: 'Versão atualizada',
    ENVIADO_APROVACAO: 'Enviado para aprovação',
    VERSAO_APROVADA: 'Versão aprovada',
    VERSAO_REJEITADA: 'Versão rejeitada',
    ASSINATURA_REGISTRADA: 'Assinatura registrada',
    REVISAO_INICIADA: 'Revisão iniciada',
  };
  return map[action] ?? action;
}

export function statusColor(status: PgrVersionStatus): string {
  if (status === 'APROVADO') return 'var(--green)';
  if (status === 'AGUARDANDO_APROVACAO') return 'var(--amber)';
  if (status === 'OBSOLETO') return 'var(--t2)';
  if (status === 'EM_REVISAO') return 'var(--orange)';
  return 'var(--cyan)';
}
