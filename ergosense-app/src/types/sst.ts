/** SST — APR · EPI · EPC · Inspeções · Auditorias · NC · CAPA · Treinamentos */

export type SstSeverity = 'critico' | 'alto' | 'medio' | 'baixo';
export type SstCapaType = 'CORRETIVA' | 'PREVENTIVA';
export type SstCapaStatus = 'aberto' | 'andamento' | 'concluido' | 'verificado' | 'cancelado';
export type SstNcStatus = 'aberta' | 'analise' | 'tratamento' | 'verificacao' | 'fechada';

export interface SstDashboard {
  apr: number;
  epi: number;
  epc: number;
  inspecoes: number;
  auditorias: number;
  naoConformidades: number;
  ncAbertas: number;
  capa: number;
  capaAbertas: number;
  treinamentos: number;
  epiCaVencidos: number;
  recentHistory?: Array<{ id: string; action: string; entityType: string; createdAt: string }>;
}

export interface SstApr {
  id: string;
  title: string;
  sectorId: string | null;
  sectorName?: string;
  riskId: string | null;
  activity: string;
  workplace: string;
  steps: unknown[];
  risks: unknown[];
  measures: unknown[];
  status: string;
  preparedBy: string;
  validUntil: string | null;
}

export interface SstEpi {
  id: string;
  ca: string;
  type: string;
  description: string;
  manufacturer: string;
  caExpiry: string | null;
  riskId: string | null;
  active: boolean;
}

export interface SstEpc {
  id: string;
  type: string;
  description: string;
  location: string;
  riskId: string | null;
  status: string;
  compliance: string;
}

export interface SstInspecao {
  id: string;
  title: string;
  type: string;
  scheduledDate: string | null;
  performedDate: string | null;
  result: string | null;
  status: string;
  riskId: string | null;
}

export interface SstAuditoria {
  id: string;
  title: string;
  scope: string;
  standard: string;
  startDate: string | null;
  status: string;
}

export interface SstNc {
  id: string;
  title: string;
  description: string;
  originType: string | null;
  severity: SstSeverity;
  status: SstNcStatus;
  riskId: string | null;
  dueDate: string | null;
}

export interface SstCapa {
  id: string;
  ncId: string | null;
  riskId: string | null;
  groPlanId: string | null;
  type: SstCapaType;
  description: string;
  rootCause: string;
  action: string;
  status: SstCapaStatus;
  dueDate: string | null;
}

export interface SstTreinamento {
  id: string;
  title: string;
  type: string;
  scheduledDate: string | null;
  performedDate: string | null;
  status: string;
  riskId: string | null;
  participants: number;
}

export interface SstReport {
  id?: string;
  type: string;
  title: string;
  generatedAt: string;
  dashboard: SstDashboard;
  integracao: { risksLinked: number; capaGroLinked: number };
  normas: string[];
}

export interface SstReportSummary {
  id: string;
  type: string;
  title: string;
  generatedBy: string;
  createdAt: string;
}
