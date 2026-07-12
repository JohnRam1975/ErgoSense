export type DenunciaType =
  | 'ASSEDIO_MORAL'
  | 'ASSEDIO_SEXUAL'
  | 'VIOLENCIA'
  | 'DISCRIMINACAO'
  | 'SOBRECARGA_PSICOLOGICA';

export type DenunciaModality = 'ANONIMA' | 'IDENTIFICADA';

export type DenunciaStatus =
  | 'RECEBIDA'
  | 'EM_TRIAGEM'
  | 'EM_INVESTIGACAO'
  | 'EM_TRATATIVA'
  | 'CONCLUIDA'
  | 'ARQUIVADA';

export type DenunciaSeverity = 'critico' | 'alto' | 'medio' | 'baixo';

export interface DenunciaLgpd {
  consent: boolean;
  legalBasis: string;
  purpose: string;
  retentionUntil: string | null;
}

export interface DenunciaEvidence {
  id: string;
  type: string;
  description: string;
  reference: string;
  hash?: string | null;
  registeredBy?: string | null;
  createdAt: string;
}

export interface DenunciaTreatment {
  id: string;
  type: string;
  description: string;
  responsible: string;
  dueDate: string | null;
  status: string;
  result: string;
  createdAt: string;
}

export interface DenunciaHistoryEntry {
  id: string;
  action: string;
  userName: string;
  details: unknown;
  createdAt: string;
}

export interface DenunciaItem {
  id: string;
  tenantId: string;
  protocol: string;
  type: DenunciaType;
  typeLabel: string;
  modality: DenunciaModality;
  status: DenunciaStatus;
  severity: DenunciaSeverity;
  sectorId: string | null;
  sectorName: string | null;
  description: string;
  location: string;
  occurrenceDate: string | null;
  reporterName: string | null;
  reporterEmail: string | null;
  lgpd: DenunciaLgpd;
  inventoryRiskId: string | null;
  groActionPlanId: string | null;
  psicoFactorId: string | null;
  investigatorName: string | null;
  conclusion: string;
  evidences?: DenunciaEvidence[];
  treatments?: DenunciaTreatment[];
  history?: DenunciaHistoryEntry[];
  accessToken?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DenunciaDashboard {
  total: number;
  open: number;
  completed: number;
  anonymous: number;
  identified: number;
  critical: number;
  highSeverity: number;
  integratedInventory: number;
  openTreatments: number;
  avgResolutionDays: number | null;
  byType: Partial<Record<DenunciaType, number>>;
  byStatus: Partial<Record<DenunciaStatus, number>>;
  indicators: {
    taxaConclusao: number;
    taxaAnonimato: number;
    taxaIntegracaoGro: number;
  };
  recent: DenunciaItem[];
  lgpd: {
    baseLegal: string;
    purpose: string;
    anonymousDataMinimization: boolean;
  };
}

export interface DenunciaFormData {
  type: DenunciaType;
  modality: DenunciaModality;
  description: string;
  location: string;
  occurrenceDate: string;
  reporterName: string;
  reporterEmail: string;
  reporterPhone: string;
  collaboratorId: string;
  sectorName: string;
  lgpdConsent: boolean;
}

export const DENUNCIA_TYPE_OPTIONS: Array<{ value: DenunciaType; label: string; icon: string }> = [
  { value: 'ASSEDIO_MORAL', label: 'Assédio moral', icon: '😠' },
  { value: 'ASSEDIO_SEXUAL', label: 'Assédio sexual', icon: '🚫' },
  { value: 'VIOLENCIA', label: 'Violência', icon: '⚡' },
  { value: 'DISCRIMINACAO', label: 'Discriminação', icon: '⚖️' },
  { value: 'SOBRECARGA_PSICOLOGICA', label: 'Sobrecarga psicológica', icon: '🧠' },
];

export const DENUNCIA_STATUS_LABELS: Record<DenunciaStatus, string> = {
  RECEBIDA: 'Recebida',
  EM_TRIAGEM: 'Em triagem',
  EM_INVESTIGACAO: 'Em investigação',
  EM_TRATATIVA: 'Em tratativa',
  CONCLUIDA: 'Concluída',
  ARQUIVADA: 'Arquivada',
};

export const LGPD_DENUNCIA_CONSENT =
  'Autorizo o tratamento dos dados informados exclusivamente para apuração desta denúncia, conforme LGPD art. 7º II (obrigação legal) e NR-01. ' +
  'Denúncias anônimas não armazenam identificação pessoal — apenas protocolo e token de acompanhamento.';

export const EMPTY_DENUNCIA_FORM: DenunciaFormData = {
  type: 'ASSEDIO_MORAL',
  modality: 'ANONIMA',
  description: '',
  location: '',
  occurrenceDate: '',
  reporterName: '',
  reporterEmail: '',
  reporterPhone: '',
  collaboratorId: '',
  sectorName: '',
  lgpdConsent: false,
};

export function denunciaStatusColor(status: DenunciaStatus): string {
  if (status === 'CONCLUIDA') return 'var(--green)';
  if (status === 'EM_INVESTIGACAO' || status === 'EM_TRATATIVA') return 'var(--amber)';
  if (status === 'ARQUIVADA') return 'var(--t2)';
  return 'var(--cyan)';
}

export function denunciaSeverityColor(s: DenunciaSeverity): string {
  return s === 'critico' ? 'var(--red)' : s === 'alto' ? 'var(--orange)' : s === 'medio' ? 'var(--amber)' : 'var(--green)';
}
