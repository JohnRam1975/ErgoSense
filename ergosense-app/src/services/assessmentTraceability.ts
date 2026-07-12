/**
 * Rastreabilidade técnica — metadados obrigatórios em laudos AEP/AET.
 */
import {
  ERGONOMIC_CRITERIA_VERSION,
} from '../config/ergonomicCriteriaMaster';
import {
  ERGOSENSE_ENGINE_VERSION,
  ERGOSENSE_NORM_BASE_DATE,
  ERGOSENSE_POSE_MODEL,
  NORM_REGISTRY,
} from '../config/ergoMethodology';
import type { UserSession } from '../types';
import type { ActivityContext } from '../data/activityProfiles';

export interface AssessmentTraceability {
  generatedAt: string;
  date: string;
  time: string;
  userEmail: string;
  userName: string;
  userRole: string;
  companyId: string;
  companyName: string;
  obra?: string;
  setor: string;
  atividade: string;
  activityContext: ActivityContext | null;
  engineVersion: string;
  poseModel: string;
  criteriaVersion: string;
  normBaseDate: string;
  normsApplied: typeof NORM_REGISTRY;
}

export function buildAssessmentTraceability(params: {
  session: UserSession | null;
  companyId: string;
  companyName: string;
  setor: string;
  atividade: string;
  activityContext?: ActivityContext | null;
  obra?: string;
  date?: string;
  time?: string;
}): AssessmentTraceability {
  const now = new Date();
  return {
    generatedAt: now.toISOString(),
    date: params.date ?? now.toLocaleDateString('pt-BR'),
    time: params.time ?? now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    userEmail: params.session?.email ?? '—',
    userName: params.session?.name ?? '—',
    userRole: params.session?.role ?? '—',
    companyId: params.companyId,
    companyName: params.companyName,
    obra: params.obra,
    setor: params.setor,
    atividade: params.atividade,
    activityContext: params.activityContext ?? null,
    engineVersion: ERGOSENSE_ENGINE_VERSION,
    poseModel: ERGOSENSE_POSE_MODEL,
    criteriaVersion: ERGONOMIC_CRITERIA_VERSION,
    normBaseDate: ERGOSENSE_NORM_BASE_DATE,
    normsApplied: NORM_REGISTRY,
  };
}
