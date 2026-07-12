import type {
  Analysis,
  AnalysisMode,
  AppSettings,
  Collaborator,
  Report,
  ReportType,
  UserSession,
  ActivityContext,
} from '../types';
import type { LoadAssessmentManualInput } from '../types';

export interface StoredState {
  session: UserSession | null;
  selectedCompanyId: string;
  collaborators: Collaborator[];
  analyses: Analysis[];
  reports: Report[];
  settings: AppSettings;
  analysisMode: AnalysisMode;
  reportType: ReportType;
}

export interface NewAnalysisDraft {
  collaboratorId: string;
  setor: string;
  activityContext: ActivityContext;
  activity: string;
  notes: string;
  environmental?: import('../services/environmental').EnvironmentalInput;
  loadAssessment: {
    manual: LoadAssessmentManualInput;
    estimate?: import('../types/loadAssessment').LoadDistanceEstimate;
  };
}
