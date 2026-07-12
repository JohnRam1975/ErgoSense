export type EsocialEventType = 'S-2210' | 'S-2220' | 'S-2240';

export type EsocialEventStatus =
  | 'RASCUNHO'
  | 'VALIDADO'
  | 'ASSINADO'
  | 'PRONTO_ENVIO'
  | 'ENVIADO'
  | 'ACEITO'
  | 'REJEITADO'
  | 'CANCELADO';

export type EsocialTransmissionStatus =
  | 'PENDENTE'
  | 'ENVIANDO'
  | 'ENVIADO'
  | 'PROCESSANDO'
  | 'ACEITO'
  | 'REJEITADO'
  | 'ERRO'
  | 'TIMEOUT';

export type EsocialProcessingStatus =
  | 'NAO_ENVIADO'
  | EsocialTransmissionStatus;

export interface EsocialConfig {
  tpInsc: number;
  nrInsc: string;
  razaoSocial?: string;
  ambiente: number;
  procEmi: number;
  verProc: string;
  certificadoSerial?: string;
  certificadoValidade?: string;
  govbrHabilitado: boolean;
  govbrModo?: 'MOCK' | 'HTTP';
  certificadoPfxPath?: string;
  certificadoSenhaEnv?: string;
  govbrEndpointProd?: string;
  govbrEndpointRestrito?: string;
}

export interface EsocialValidationIssue {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface EsocialEvent {
  id: string;
  eventType: EsocialEventType;
  eventId: string;
  collaboratorId?: string | null;
  collaboratorName?: string | null;
  analysisId?: string | null;
  riskId?: string | null;
  payload: Record<string, unknown>;
  status: EsocialEventStatus;
  validationOk: boolean;
  validationErrors: EsocialValidationIssue[];
  hashDocument?: string | null;
  govbrProtocol?: string | null;
  govbrMessage?: string | null;
  govbrLoteId?: string | null;
  processingStatus?: EsocialProcessingStatus;
  transmissionAttempts?: number;
  lastTransmissionId?: string | null;
  sentAt?: string | null;
  createdAt: string;
  updatedAt: string;
  hasXml: boolean;
  hasSignedXml: boolean;
  signatures?: EsocialSignature[];
  xml?: string;
}

export interface EsocialSignature {
  id: string;
  eventDbId: string;
  type: string;
  name: string;
  document?: string;
  registry?: string;
  hashDocument: string;
  certificateSerial?: string;
  signedAt: string;
}

export interface EsocialHistoryEntry {
  id: string;
  eventDbId?: string | null;
  action: string;
  userName?: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

export interface EsocialDashboard {
  total: number;
  rascunho: number;
  validado: number;
  assinado: number;
  prontoEnvio: number;
  enviado: number;
  aceito: number;
  rejeitado: number;
  s2210: number;
  s2220: number;
  s2240: number;
  govbrHabilitado: boolean;
  configOk: boolean;
  recentHistory?: EsocialHistoryEntry[];
}

export interface EsocialValidationResult {
  valid: boolean;
  errors: EsocialValidationIssue[];
  warnings: EsocialValidationIssue[];
  xml?: string;
  schemaVersion?: string;
}

export interface EsocialTransmission {
  id: string;
  eventDbId: string;
  attempt: number;
  status: EsocialTransmissionStatus;
  protocol?: string | null;
  loteId?: string | null;
  responseCode?: string | null;
  message?: string | null;
  errors: EsocialValidationIssue[];
  endpoint?: string | null;
  sentAt?: string | null;
  processedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EsocialTransmitResult {
  transmission: EsocialTransmission;
  eventStatus: EsocialEventStatus;
  protocol?: string | null;
  errors: EsocialValidationIssue[];
}
