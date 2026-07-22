import {
  getAccessToken,
  getApiAuthHeaders,
  getCsrfToken,
  setAccessToken,
  setCsrfToken,
} from './authHeaders';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          ...(getCsrfToken() ? { 'X-CSRF-Token': getCsrfToken()! } : {}),
        },
      });
      if (!res.ok) return false;
      const data = (await res.json()) as {
        accessToken: string;
        csrfToken?: string;
      };
      setAccessToken(data.accessToken);
      if (data.csrfToken) setCsrfToken(data.csrfToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function unwrapApiBody<T>(body: T & { success?: boolean; data?: unknown }): T {
  if (body && typeof body === 'object' && body.success === true && 'data' in body && body.data !== undefined) {
    return body.data as T;
  }
  return body;
}

async function parseApiError(res: Response): Promise<string> {
  const text = await res.text().catch(() => '');
  try {
    const body = JSON.parse(text) as { error?: string; message?: string };
    return body.message ?? body.error ?? `Erro ${res.status}`;
  } catch {
    if (res.status === 404) {
      return 'Serviço não encontrado (404). Confirme o DNS do domínio e tente de novo.';
    }
    if (res.status >= 500) return `Erro no servidor (${res.status}). Tente novamente.`;
    return `Erro ${res.status}`;
  }
}

async function request<T>(path: string, options?: RequestInit, retried = false): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...getApiAuthHeaders(),
      ...(options?.headers as Record<string, string>),
    },
    ...options,
  });

  if (res.status === 401 && !retried && getAccessToken() && !path.includes('/api/auth/login')) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return request<T>(path, options, true);
  }

  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }
  const body = await res.json();
  return unwrapApiBody(body) as T;
}

export async function apiHealth(): Promise<{ ok: boolean }> {
  return request('/api/health');
}

export interface ApiAuthUser {
  email: string;
  name: string;
  role: string;
  company: string;
  location: string;
  tenantId: string;
}

export interface ApiLoginSuccess {
  user: ApiAuthUser;
  accessToken: string;
  expiresIn: number;
  csrfToken: string;
}

export type ApiLoginResult =
  | ApiLoginSuccess
  | { mfaRequired: true; mfaToken: string; user: { email: string; name: string } };

export async function apiLogin(email: string, password: string): Promise<ApiLoginResult> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }
  const raw = (await res.json()) as ApiLoginResult & { success?: boolean; data?: ApiLoginResult };
  const data = unwrapApiBody(raw);
  if ('mfaRequired' in data && data.mfaRequired) {
    return {
      mfaRequired: true,
      mfaToken: data.mfaToken,
      user: data.user,
    };
  }
  const success = data as ApiLoginSuccess;
  setAccessToken(success.accessToken);
  setCsrfToken(success.csrfToken);
  return success;
}

export async function apiMfaVerify(mfaToken: string, code: string): Promise<ApiLoginSuccess> {
  const res = await fetch(`${API_BASE}/api/auth/mfa/verify`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ mfaToken, code }),
  });
  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }
  const data = unwrapApiBody((await res.json()) as ApiLoginSuccess & { data?: ApiLoginSuccess });
  setAccessToken(data.accessToken);
  setCsrfToken(data.csrfToken);
  return data;
}

export async function apiLogout(): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        ...getApiAuthHeaders(),
      },
    });
  } finally {
    setAccessToken(null);
    setCsrfToken(null);
  }
}

export async function apiSubmitTenantRequest(data: {
  tipoCadastro?: 'EMPRESA' | 'AUTONOMO';
  razaoSocial: string;
  nomeFantasia?: string;
  cnpj?: string;
  cpf?: string;
  segmento: string;
  industria?: string;
  quantidadeFuncionarios?: number;
  responsavelNome: string;
  email: string;
  telefone: string;
  plano?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  endereco?: string;
  password?: string;
  confirmPassword?: string;
}) {
  return request<{ protocolo: string; id: string; status: string }>('/api/public/tenant-request', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export interface TenantRequestItem {
  id: string;
  protocolo: string;
  tipoCadastro?: 'EMPRESA' | 'AUTONOMO';
  razaoSocial: string;
  nomeFantasia?: string;
  cnpj?: string | null;
  cpf?: string | null;
  segmento?: string;
  quantidadeFuncionarios?: number;
  responsavelNome: string;
  email: string;
  telefone?: string;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  endereco?: string | null;
  plano: string;
  status: string;
  dataSolicitacao: string;
}

export async function apiAdminTenantRequests(params?: { status?: string; search?: string }) {
  const q = new URLSearchParams();
  if (params?.status) q.set('status', params.status);
  if (params?.search) q.set('search', params.search);
  const suffix = q.toString() ? `?${q}` : '';
  return request<TenantRequestItem[]>(`/api/admin/tenant-requests${suffix}`);
}

export async function apiAdminTenantRequestDetail(id: string) {
  return request<TenantRequestItem>(`/api/admin/tenant-requests/${id}`);
}

export async function apiApproveTenantRequest(id: string) {
  return request<{ tenantId: string; activationUrl: string; tempPassword: string }>(
    `/api/admin/tenant-requests/${id}/approve`,
    { method: 'POST', body: JSON.stringify({}) },
  );
}

export async function apiRejectTenantRequest(id: string, reason: string) {
  return request(`/api/admin/tenant-requests/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function apiRequestTenantAdjustment(id: string, message: string) {
  return request(`/api/admin/tenant-requests/${id}/request-adjustment`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

export async function apiListAdminTenants(
  filter: 'active' | 'blocked' | 'expired' | 'pending' | 'inactive' | 'all' = 'all',
) {
  return request<
    Array<{
      id: string;
      name: string;
      industry?: string;
      plan: string;
      statusConta: string;
      userCount: number;
      blockedReason?: string | null;
      expiresAt?: string | null;
      cnpj?: string | null;
      razaoSocial?: string;
    }>
  >(`/api/admin/tenants?filter=${filter}`);
}

export type AdminTenantDetail = {
  id: string;
  name: string;
  industry: string;
  icon: string;
  color: string;
  plan: string;
  statusConta: string;
  active: boolean;
  blocked: boolean;
  blockedAt?: string | null;
  blockedReason?: string | null;
  expiresAt?: string | null;
  userCount: number;
  createdAt?: string;
  updatedAt?: string;
  razaoSocial?: string;
  nomeFantasia?: string | null;
  cnpj?: string | null;
  inscricaoEstadual?: string | null;
  supportAuthorized?: boolean;
  supportExpiresAt?: string | null;
  admins?: Array<{
    id: number;
    email: string;
    name: string;
    role: string;
    title?: string;
    active: boolean;
    createdAt?: string;
  }>;
};

export async function apiGetAdminTenant(id: string) {
  return request<AdminTenantDetail>(`/api/admin/tenants/${encodeURIComponent(id)}`);
}

export async function apiUpdateAdminTenant(
  id: string,
  data: {
    name?: string;
    industry?: string;
    plan?: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
    expiresAt?: string | null;
    icon?: string;
    color?: 'amber' | 'cyan' | 'green' | 'neutral';
    razaoSocial?: string;
    nomeFantasia?: string | null;
    cnpj?: string | null;
    inscricaoEstadual?: string | null;
  },
) {
  return request<AdminTenantDetail>(`/api/admin/tenants/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function apiBlockAdminTenant(id: string, reason?: string) {
  return request(`/api/admin/tenants/${id}/block`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function apiSuspendAdminTenant(id: string, reason: string) {
  return request(`/api/admin/tenants/${id}/suspend`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function apiDeactivateAdminTenant(id: string, reason: string) {
  return request(`/api/admin/tenants/${id}/deactivate`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

/** Libera acesso após pagamento confirmado (admin global) */
export async function apiGrantAdminTenantAccess(
  id: string,
  opts?: { paymentNote?: string; plan?: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'; expiresAt?: string | null },
) {
  return request(`/api/admin/tenants/${id}/grant-access`, {
    method: 'POST',
    body: JSON.stringify({ confirm: true, ...opts }),
  });
}

export async function apiReactivateAdminTenant(id: string) {
  return request(`/api/admin/tenants/${id}/reactivate`, {
    method: 'POST',
    body: JSON.stringify({ confirm: true }),
  });
}

export async function apiActivateAccountPreview(token: string) {
  return request<{
    email: string;
    companyName: string;
    qrDataUrl: string;
    otpauthUrl?: string;
    passwordPreset?: boolean;
  }>(`/api/auth/activate-account/preview?token=${encodeURIComponent(token)}`);
}

export async function apiActivateAccount(data: {
  token: string;
  password?: string;
  confirmPassword?: string;
  mfaCode: string;
}) {
  return request('/api/auth/activate-account', { method: 'POST', body: JSON.stringify(data) });
}

export async function apiSubmitAccessRequest(data: {
  nome: string;
  email: string;
  funcao: string;
  matricula: string;
  tenantId?: string;
}): Promise<void> {
  await request('/api/access-requests', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function apiGetSupportContactInfo(): Promise<{
  supportEmail: string;
  subjects: string[];
}> {
  return request('/api/public/support-contact');
}

export async function apiSubmitSupportContact(data: {
  nome: string;
  email: string;
  telefone?: string;
  empresa?: string;
  assunto: string;
  mensagem: string;
}): Promise<{ protocolo: string; supportEmail: string }> {
  return request('/api/public/support-contact', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function apiUpdateProfile(data: { nome: string; localizacao?: string }) {
  return request<{
    id: string;
    email: string;
    name: string;
    role: string;
    roleCode: string;
    location: string;
    tenantId: string;
  }>('/api/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function apiGetMe() {
  return request<{
    id: string;
    email: string;
    name: string;
    role: string;
    roleCode: string;
    location: string;
    company: string;
    tenantId: string;
  }>('/api/auth/me');
}

export async function apiRegisterCompany(data: {
  nome: string;
  industria: string;
  tenantId?: string;
  adminNome: string;
  adminEmail: string;
  adminPassword: string;
  icone?: string;
  cor?: string;
}) {
  return request<{ tenant: import('../types').Company; adminEmail: string }>('/api/tenants', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export interface TenantMetadata {
  id: string;
  name: string;
  industry: string;
  icon: string;
  color: string;
  active: boolean;
  plan: string;
  userCount: number;
  employees: number;
  storageMb: number;
  supportActive: boolean;
  supportStartsAt?: string | null;
  supportExpiresAt?: string | null;
  supportAuthorizedBy?: string | null;
}

export interface SupportStatus {
  tenantId: string;
  tenantName: string;
  plan: string;
  active: boolean;
  userCount: number;
  supportAuthorized: boolean;
  supportStartsAt: string | null;
  supportExpiresAt: string | null;
  authorizedBy: string | null;
  reason: string | null;
}

export interface SupportAuditEntry {
  id: string;
  tenantId: string;
  tenantName: string | null;
  authorizedBy: string | null;
  globalUser: string | null;
  action: string;
  module: string | null;
  at: string;
  ip: string | null;
  note: string | null;
}

export async function apiGetTenantMetadata(): Promise<TenantMetadata[]> {
  return request('/api/tenants');
}

export async function apiGetActiveSupportTenants(): Promise<TenantMetadata[]> {
  return request('/api/admin/support/active');
}

export async function apiGetSupportStatus(tenantId: string): Promise<SupportStatus> {
  return request(`/api/support/status?tenantId=${encodeURIComponent(tenantId)}`);
}

export async function apiAuthorizeSupport(
  tenantId: string,
  duration: '1h' | '24h' | '7d',
  reason?: string,
): Promise<SupportStatus> {
  return request('/api/support/authorize', {
    method: 'POST',
    body: JSON.stringify({ tenantId, duration, reason }),
  });
}

export async function apiRevokeSupport(tenantId: string): Promise<{ ok: boolean }> {
  return request('/api/support/revoke', {
    method: 'POST',
    body: JSON.stringify({ tenantId }),
  });
}

export async function apiGetSupportAudit(tenantId: string): Promise<SupportAuditEntry[]> {
  return request(`/api/support/audit?tenantId=${encodeURIComponent(tenantId)}`);
}

export async function apiGetSectors(tenantId: string) {
  return request<Array<{ id: string; name: string }>>(`/api/sectors?tenantId=${encodeURIComponent(tenantId)}`);
}

export async function apiUpdateCollaborator(
  tenantId: string,
  id: string,
  data: {
    nome: string;
    matricula: string;
    cargo: string;
    setor: string;
    turno: string;
    birthDate?: string;
    notes?: string;
    consent: boolean;
  },
) {
  return request<import('../types').Collaborator>(`/api/collaborators/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ tenantId, ...data }),
  });
}

export async function apiGetTenants(): Promise<
  Array<{
    id: string;
    name: string;
    industry: string;
    icon: string;
    color: string;
    active?: boolean;
    employees?: number;
  }>
> {
  return request('/api/tenants');
}

export async function apiGetCollaborators(tenantId: string) {
  return request<import('../types').Collaborator[]>(`/api/collaborators?tenantId=${encodeURIComponent(tenantId)}`);
}

export async function apiGetAnalyses(tenantId: string) {
  return request<import('./dto/analysis.dto').AnalysisResponseDto[]>(
    `/api/analyses?tenantId=${encodeURIComponent(tenantId)}`,
  );
}

export async function apiGetReports(tenantId: string) {
  return request<import('../types').Report[]>(`/api/reports?tenantId=${encodeURIComponent(tenantId)}`);
}

export async function apiSaveCollaborator(
  tenantId: string,
  data: {
    nome: string;
    matricula: string;
    cargo: string;
    setor: string;
    turno: string;
    birthDate?: string;
    notes?: string;
    consent: boolean;
  },
) {
  return request<import('../types').Collaborator>('/api/collaborators', {
    method: 'POST',
    body: JSON.stringify({ tenantId, ...data }),
  });
}

export async function apiSaveAnalysis(
  tenantId: string,
  analysis: Omit<import('./dto/analysis.dto').AnalysisCreateDto, 'tenantId'>,
) {
  return request<{ id: string }>('/api/analyses', {
    method: 'POST',
    body: JSON.stringify({ tenantId, ...analysis }),
  });
}

export async function apiFetchAnalysisVideoUrl(tenantId: string, analysisId: string): Promise<string> {
  const API_BASE = import.meta.env.VITE_API_URL ?? '';
  const path = `/api/analyses/${encodeURIComponent(analysisId)}/video?tenantId=${encodeURIComponent(tenantId)}`;
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: getApiAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export async function apiDeleteAnalysis(tenantId: string, analysisId: string) {
  return request<{ ok: boolean }>(
    `/api/analyses/${encodeURIComponent(analysisId)}?tenantId=${encodeURIComponent(tenantId)}`,
    { method: 'DELETE' },
  );
}

export async function apiGetRiskInventorySummary(tenantId: string) {
  return request<import('../types/riskInventory').RiskInventorySummary>(
    `/api/risk-inventory/summary?tenantId=${encodeURIComponent(tenantId)}`,
  );
}

export async function apiGetRiskInventory(
  tenantId: string,
  filters?: { type?: string; level?: string },
) {
  const params = new URLSearchParams({ tenantId });
  if (filters?.type) params.set('type', filters.type);
  if (filters?.level) params.set('level', filters.level);
  return request<import('../types/riskInventory').RiskInventoryItem[]>(
    `/api/risk-inventory?${params.toString()}`,
  );
}

export async function apiGetRiskInventoryItem(tenantId: string, id: string) {
  return request<import('../types/riskInventory').RiskInventoryItem>(
    `/api/risk-inventory/${encodeURIComponent(id)}?tenantId=${encodeURIComponent(tenantId)}`,
  );
}

export async function apiSaveRiskInventory(
  tenantId: string,
  data: Omit<import('../types/riskInventory').RiskInventoryFormData, never> & { id?: string },
) {
  const payload = {
    tenantId,
    type: data.type,
    sectorName: data.sectorName,
    collaboratorId: data.collaboratorId || undefined,
    workPostId: data.workPostId || undefined,
    generatingSource: data.generatingSource,
    hazard: data.hazard,
    consequence: data.consequence,
    probability: data.probability,
    severity: data.severity,
    exposureDuration: data.exposureDuration,
    exposureFrequency: data.exposureFrequency,
    exposureIntensity: data.exposureIntensity,
    exposedWorkersCount: data.exposedWorkersCount,
    homogeneousExposureGroup: data.homogeneousExposureGroup,
    existingMeasures: data.existingMeasures,
    controlMeasures: data.controlMeasures,
    evidences: data.evidences,
    analysisId: data.analysisId || undefined,
    aetProcessId: data.aetProcessId || undefined,
    responsible: data.responsible,
    reviewDate: data.reviewDate || null,
    status: data.status,
  };
  if (data.id) {
    return request<import('../types/riskInventory').RiskInventoryItem>(
      `/api/risk-inventory/${encodeURIComponent(data.id)}`,
      { method: 'PUT', body: JSON.stringify(payload) },
    );
  }
  return request<import('../types/riskInventory').RiskInventoryItem>('/api/risk-inventory', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function apiDeleteRiskInventory(tenantId: string, id: string) {
  return request<{ ok: boolean }>(
    `/api/risk-inventory/${encodeURIComponent(id)}?tenantId=${encodeURIComponent(tenantId)}`,
    { method: 'DELETE' },
  );
}

export async function apiGetDenunciaDashboard(tenantId: string) {
  return request<import('../types/denuncia').DenunciaDashboard>(
    `/api/denuncias/dashboard?tenantId=${encodeURIComponent(tenantId)}`,
  );
}

export async function apiGetDenuncias(tenantId: string, filters?: { status?: string; type?: string }) {
  const params = new URLSearchParams({ tenantId });
  if (filters?.status) params.set('status', filters.status);
  if (filters?.type) params.set('type', filters.type);
  return request<import('../types/denuncia').DenunciaItem[]>(`/api/denuncias?${params.toString()}`);
}

export async function apiGetDenuncia(tenantId: string, id: string) {
  return request<import('../types/denuncia').DenunciaItem>(
    `/api/denuncias/${encodeURIComponent(id)}?tenantId=${encodeURIComponent(tenantId)}`,
  );
}

export async function apiCreateDenuncia(tenantId: string, data: import('../types/denuncia').DenunciaFormData) {
  return request<import('../types/denuncia').DenunciaItem>('/api/denuncias', {
    method: 'POST',
    body: JSON.stringify({
      tenantId,
      type: data.type,
      modality: data.modality,
      description: data.description,
      location: data.location,
      occurrenceDate: data.occurrenceDate || null,
      reporterName: data.reporterName,
      reporterEmail: data.reporterEmail,
      reporterPhone: data.reporterPhone,
      collaboratorId: data.collaboratorId || undefined,
      sectorName: data.sectorName || undefined,
      lgpdConsent: data.lgpdConsent,
    }),
  });
}

export async function apiUpdateDenunciaStatus(tenantId: string, id: string, status: string) {
  return request<import('../types/denuncia').DenunciaItem>(
    `/api/denuncias/${encodeURIComponent(id)}/status?tenantId=${encodeURIComponent(tenantId)}`,
    { method: 'PATCH', body: JSON.stringify({ tenantId, status }) },
  );
}

export async function apiAddDenunciaTreatment(
  tenantId: string,
  id: string,
  data: { type: string; description: string; responsible?: string; dueDate?: string },
) {
  return request<import('../types/denuncia').DenunciaItem>(
    `/api/denuncias/${encodeURIComponent(id)}/tratativas?tenantId=${encodeURIComponent(tenantId)}`,
    { method: 'POST', body: JSON.stringify({ tenantId, ...data }) },
  );
}

export async function apiAddDenunciaEvidence(
  tenantId: string,
  id: string,
  data: { description: string; reference?: string; type?: string },
) {
  return request<import('../types/denuncia').DenunciaItem>(
    `/api/denuncias/${encodeURIComponent(id)}/evidencias?tenantId=${encodeURIComponent(tenantId)}`,
    { method: 'POST', body: JSON.stringify({ tenantId, ...data }) },
  );
}

export async function apiIntegrateDenuncia(tenantId: string, id: string) {
  return request<{ integration: unknown; denuncia: import('../types/denuncia').DenunciaItem }>(
    `/api/denuncias/${encodeURIComponent(id)}/integrar?tenantId=${encodeURIComponent(tenantId)}`,
    { method: 'POST', body: JSON.stringify({ tenantId }) },
  );
}

export async function apiConcludeDenuncia(tenantId: string, id: string, conclusion: string) {
  return request<import('../types/denuncia').DenunciaItem>(
    `/api/denuncias/${encodeURIComponent(id)}/conclusao?tenantId=${encodeURIComponent(tenantId)}`,
    { method: 'PATCH', body: JSON.stringify({ tenantId, conclusion }) },
  );
}

export async function apiGetActiveCriteria(tenantId: string) {
  return request<import('../types/riskCriteria').ActiveCriteria>(
    `/api/risk-criteria/active?tenantId=${encodeURIComponent(tenantId)}`,
  );
}

export async function apiGetCriteriaDocumentation(tenantId: string) {
  return request<import('../types/riskCriteria').CriteriaDocumentation>(
    `/api/risk-criteria/documentation?tenantId=${encodeURIComponent(tenantId)}`,
  );
}

export async function apiFetchCriteriaMethodologies(tenantId: string) {
  return request<import('../types/riskCriteria').RiskMethodology[]>(
    `/api/risk-criteria/methodologies?tenantId=${encodeURIComponent(tenantId)}`,
  );
}

export async function apiCreateCriteriaMethodology(
  tenantId: string,
  data: { name: string; matrixType: string; activate?: boolean; description?: string },
) {
  return request<{ methodologyId: string; versionId: string }>('/api/risk-criteria/methodologies', {
    method: 'POST',
    body: JSON.stringify({ tenantId, ...data }),
  });
}

export async function apiFetchCriteriaVersions(methodologyId: string, tenantId?: string) {
  const q = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
  return request<import('../types/riskCriteria').CriteriaVersion[]>(
    `/api/risk-criteria/methodologies/${encodeURIComponent(methodologyId)}/versions${q}`,
  );
}

export async function apiActivateCriteriaVersion(tenantId: string, methodologyId: string, versionId: string) {
  return request<{ activated: boolean; versionNumber: number }>(
    `/api/risk-criteria/methodologies/${encodeURIComponent(methodologyId)}/activate/${encodeURIComponent(versionId)}?tenantId=${encodeURIComponent(tenantId)}`,
    { method: 'POST', body: JSON.stringify({ tenantId }) },
  );
}

export async function apiFetchCriteriaAudit(tenantId: string) {
  return request<import('../types/riskCriteria').CriteriaAuditEntry[]>(
    `/api/risk-criteria/audit?tenantId=${encodeURIComponent(tenantId)}`,
  );
}

export async function apiEvaluateRiskCriteria(tenantId: string, probability: number, severity: number) {
  return request<import('../types/riskCriteria').RiskEvaluation>('/api/risk-criteria/evaluate', {
    method: 'POST',
    body: JSON.stringify({ tenantId, probability, severity }),
  });
}

export async function apiGetGroDashboard(tenantId: string) {
  return request<import('../types/gro').GroDashboard>(
    `/api/gro/dashboard?tenantId=${encodeURIComponent(tenantId)}`,
  );
}

export async function apiGetGroWorkflow(tenantId: string) {
  return request<import('../types/gro').GroWorkflow>(
    `/api/gro/workflow?tenantId=${encodeURIComponent(tenantId)}`,
  );
}

export async function apiAdvanceGroWorkflow(tenantId: string, riskId: string) {
  return request<{ ok: boolean; stage: string; label: string }>(
    `/api/gro/workflow/${encodeURIComponent(riskId)}/advance?tenantId=${encodeURIComponent(tenantId)}`,
    { method: 'POST', body: JSON.stringify({ tenantId }) },
  );
}

export async function apiCompleteGroReview(tenantId: string, riskId: string, nextReviewDate?: string, notes?: string) {
  return request<{ ok: boolean; stage: string }>(
    `/api/gro/workflow/${encodeURIComponent(riskId)}/complete-review?tenantId=${encodeURIComponent(tenantId)}`,
    { method: 'POST', body: JSON.stringify({ tenantId, nextReviewDate, notes }) },
  );
}

export async function apiGetGroActionPlans(tenantId: string, riskId?: string) {
  const params = new URLSearchParams({ tenantId });
  if (riskId) params.set('riskId', riskId);
  return request<import('../types/gro').GroActionPlan[]>(`/api/gro/action-plans?${params.toString()}`);
}

export async function apiSaveGroActionPlan(tenantId: string, data: import('../types/gro').GroActionPlanForm) {
  const payload = { tenantId, ...data };
  if (data.id) {
    return request<import('../types/gro').GroActionPlan>(`/api/gro/action-plans/${encodeURIComponent(data.id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }
  return request<import('../types/gro').GroActionPlan>('/api/gro/action-plans', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function apiDeleteGroActionPlan(tenantId: string, id: string) {
  return request<{ ok: boolean }>(
    `/api/gro/action-plans/${encodeURIComponent(id)}?tenantId=${encodeURIComponent(tenantId)}`,
    { method: 'DELETE' },
  );
}

export async function apiGetGroIndicators(tenantId: string) {
  return request<import('../types/gro').GroIndicator[]>(
    `/api/gro/indicators?tenantId=${encodeURIComponent(tenantId)}`,
  );
}

export async function apiSaveGroIndicator(tenantId: string, data: import('../types/gro').GroIndicatorForm) {
  const payload = {
    tenantId,
    riskId: data.riskId || undefined,
    name: data.name,
    type: data.type,
    target: data.target ? Number(data.target) : null,
    currentValue: data.currentValue ? Number(data.currentValue) : null,
    unit: data.unit,
    frequency: data.frequency,
    lastMeasurement: data.lastMeasurement || null,
    nextMeasurement: data.nextMeasurement || null,
    notes: data.notes,
  };
  if (data.id) {
    return request<import('../types/gro').GroIndicator>(`/api/gro/indicators/${encodeURIComponent(data.id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }
  return request<import('../types/gro').GroIndicator>('/api/gro/indicators', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function apiDeleteGroIndicator(tenantId: string, id: string) {
  return request<{ ok: boolean }>(
    `/api/gro/indicators/${encodeURIComponent(id)}?tenantId=${encodeURIComponent(tenantId)}`,
    { method: 'DELETE' },
  );
}

export async function apiGetGroHistory(tenantId: string, riskId?: string, limit = 100) {
  const params = new URLSearchParams({ tenantId, limit: String(limit) });
  if (riskId) params.set('riskId', riskId);
  return request<import('../types/gro').GroHistoryEntry[]>(`/api/gro/history?${params.toString()}`);
}

export async function apiGetGroReports(tenantId: string) {
  return request<import('../types/gro').GroReportSummary[]>(
    `/api/gro/reports?tenantId=${encodeURIComponent(tenantId)}`,
  );
}

export async function apiGetGroReport(tenantId: string, id: string) {
  return request<import('../types/gro').GroReport>(
    `/api/gro/reports/${encodeURIComponent(id)}?tenantId=${encodeURIComponent(tenantId)}`,
  );
}

export async function apiGenerateGroReport(tenantId: string, type: import('../types/gro').GroReportType) {
  return request<import('../types/gro').GroReport>('/api/gro/reports/generate', {
    method: 'POST',
    body: JSON.stringify({ tenantId, type }),
  });
}

export async function apiGetPgrProgram(tenantId: string) {
  return request<import('../types/pgr').PgrProgram>(`/api/pgr/program?tenantId=${encodeURIComponent(tenantId)}`);
}

export async function apiUpdatePgrProgram(
  tenantId: string,
  data: Partial<Pick<import('../types/pgr').PgrProgram, 'title' | 'description' | 'technicalResponsible' | 'legalResponsible'>>,
) {
  return request<import('../types/pgr').PgrProgram>('/api/pgr/program', {
    method: 'PUT',
    body: JSON.stringify({ tenantId, title: data.title, description: data.description, technicalResponsible: data.technicalResponsible, legalResponsible: data.legalResponsible }),
  });
}

export async function apiGetPgrVersions(tenantId: string) {
  return request<import('../types/pgr').PgrVersionSummary[]>(
    `/api/pgr/versions?tenantId=${encodeURIComponent(tenantId)}`,
  );
}

export async function apiGetPgrVersion(tenantId: string, id: string) {
  return request<import('../types/pgr').PgrVersionDetail>(
    `/api/pgr/versions/${encodeURIComponent(id)}?tenantId=${encodeURIComponent(tenantId)}`,
  );
}

export async function apiGeneratePgrVersion(tenantId: string, data?: { reviewReason?: string; nextReviewAt?: string; notes?: string }) {
  return request<import('../types/pgr').PgrVersionDetail>('/api/pgr/versions/generate', {
    method: 'POST',
    body: JSON.stringify({ tenantId, ...data }),
  });
}

export async function apiRefreshPgrVersion(tenantId: string, id: string) {
  return request<import('../types/pgr').PgrVersionDetail>(`/api/pgr/versions/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify({ tenantId, refreshSnapshot: true }),
  });
}

export async function apiSubmitPgrApproval(
  tenantId: string,
  versionId: string,
  data: { approverName: string; approverRole?: string; approverEmail?: string },
) {
  return request<import('../types/pgr').PgrVersionDetail>(
    `/api/pgr/versions/${encodeURIComponent(versionId)}/submit-approval?tenantId=${encodeURIComponent(tenantId)}`,
    { method: 'POST', body: JSON.stringify({ tenantId, ...data }) },
  );
}

export async function apiApprovePgrVersion(tenantId: string, versionId: string, notes?: string) {
  return request<import('../types/pgr').PgrVersionDetail>(
    `/api/pgr/versions/${encodeURIComponent(versionId)}/approve?tenantId=${encodeURIComponent(tenantId)}`,
    { method: 'POST', body: JSON.stringify({ tenantId, notes }) },
  );
}

export async function apiRejectPgrVersion(tenantId: string, versionId: string, notes?: string) {
  return request<import('../types/pgr').PgrVersionDetail>(
    `/api/pgr/versions/${encodeURIComponent(versionId)}/reject?tenantId=${encodeURIComponent(tenantId)}`,
    { method: 'POST', body: JSON.stringify({ tenantId, notes }) },
  );
}

export async function apiSignPgrVersion(
  tenantId: string,
  versionId: string,
  data: { type: import('../types/pgr').PgrSignatureType; name: string; role?: string; document?: string; statement?: string },
) {
  return request<import('../types/pgr').PgrSignature>(
    `/api/pgr/versions/${encodeURIComponent(versionId)}/sign?tenantId=${encodeURIComponent(tenantId)}`,
    { method: 'POST', body: JSON.stringify({ tenantId, ...data }) },
  );
}

export async function apiStartPgrRevision(tenantId: string, versionId: string, reviewReason?: string) {
  return request<import('../types/pgr').PgrVersionDetail>(
    `/api/pgr/versions/${encodeURIComponent(versionId)}/revision?tenantId=${encodeURIComponent(tenantId)}`,
    { method: 'POST', body: JSON.stringify({ tenantId, reviewReason }) },
  );
}

export async function apiGetPgrHistory(tenantId: string, limit = 100) {
  return request<import('../types/pgr').PgrHistoryEntry[]>(
    `/api/pgr/history?tenantId=${encodeURIComponent(tenantId)}&limit=${limit}`,
  );
}

export async function apiGetPsicoDashboard(tenantId: string) {
  return request<import('../types/psicossocial').PsicoDashboard>(
    `/api/psico/dashboard?tenantId=${encodeURIComponent(tenantId)}`,
  );
}

export async function apiGetPsicoFatores(tenantId: string) {
  return request<import('../types/psicossocial').PsicoMteFactor[]>(
    `/api/psico/fatores?tenantId=${encodeURIComponent(tenantId)}`,
  );
}

export async function apiSavePsicoFator(
  tenantId: string,
  codigo: string,
  data: { probabilidade: number; severidade: number; setorId?: string; observacoes?: string },
) {
  return request<import('../types/psicossocial').PsicoMteFactor>(
    `/api/psico/fatores/${encodeURIComponent(codigo)}?tenantId=${encodeURIComponent(tenantId)}`,
    { method: 'PUT', body: JSON.stringify({ tenantId, ...data }) },
  );
}

export async function apiGetPsicoMatriz(tenantId: string) {
  return request<import('../types/psicossocial').PsicoMatrizItem[]>(
    `/api/psico/matriz?tenantId=${encodeURIComponent(tenantId)}`,
  );
}

export async function apiGetPsicoConformidade(tenantId: string) {
  return request<import('../types/psicossocial').PsicoConformity>(
    `/api/psico/conformidade?tenantId=${encodeURIComponent(tenantId)}`,
  );
}

export async function apiSubmitPsicoResposta(
  tenantId: string,
  data: {
    type: import('../types/psicossocial').PsicoQuestionnaireType;
    answers: Record<string, number>;
    consentimentoLgpd: boolean;
    anonymous?: boolean;
    sectorId?: string;
    campaignId?: string;
  },
) {
  return request<import('../types/psicossocial').PsicoSubmitResult>(
    `/api/psico/respostas?tenantId=${encodeURIComponent(tenantId)}`,
    { method: 'POST', body: JSON.stringify({ tenantId, ...data }) },
  );
}

async function publicRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...(options?.headers as Record<string, string>),
    },
    ...options,
  });
  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }
  const body = await res.json();
  return unwrapApiBody(body) as T;
}

export async function apiGetPsicoCampanhas(tenantId: string) {
  return request<import('../types/psicossocial').PsicoCampanha[]>(
    `/api/psico/campanhas?tenantId=${encodeURIComponent(tenantId)}`,
  );
}

export async function apiCreatePsicoCampanha(
  tenantId: string,
  data: {
    type: import('../types/psicossocial').PsicoQuestionnaireType;
    title: string;
    anonymous?: boolean;
    sectorId?: string;
  },
) {
  return request<import('../types/psicossocial').PsicoCampanhaCreated>(
    `/api/psico/campanhas?tenantId=${encodeURIComponent(tenantId)}`,
    { method: 'POST', body: JSON.stringify({ tenantId, ...data }) },
  );
}

export async function apiRegeneratePsicoCampanhaLink(tenantId: string, campaignId: string) {
  return request<{ id: string; accessToken: string; publicLink: string; message: string }>(
    `/api/psico/campanhas/${encodeURIComponent(campaignId)}/link?tenantId=${encodeURIComponent(tenantId)}`,
    { method: 'POST', body: JSON.stringify({ tenantId }) },
  );
}

export async function apiGetPublicPsicoForm(token: string) {
  return publicRequest<import('../types/psicossocial').PsicoPublicFormMeta>(
    `/api/psico/public/form/${encodeURIComponent(token)}`,
  );
}

export async function apiSubmitPublicPsicoForm(
  token: string,
  data: { answers: Record<string, number>; consentimentoLgpd: boolean },
) {
  return publicRequest<import('../types/psicossocial').PsicoSubmitResult>(
    `/api/psico/public/form/${encodeURIComponent(token)}/respostas`,
    { method: 'POST', body: JSON.stringify(data) },
  );
}

export async function apiGetPsicoPlanoAcao(tenantId: string) {
  return request<import('../types/psicossocial').PsicoActionPlan[]>(
    `/api/psico/plano-acao?tenantId=${encodeURIComponent(tenantId)}`,
  );
}

export async function apiSavePsicoPlanoAcao(
  tenantId: string,
  data: Partial<import('../types/psicossocial').PsicoActionPlan> & { id?: string },
) {
  if (data.id) {
    return request<import('../types/psicossocial').PsicoActionPlan>(
      `/api/psico/plano-acao/${encodeURIComponent(data.id)}?tenantId=${encodeURIComponent(tenantId)}`,
      {
        method: 'PUT',
        body: JSON.stringify({
          tenantId,
          description: data.description,
          responsible: data.responsible,
          dueDate: data.dueDate,
          status: data.status,
          priority: data.priority,
          fatorCodigo: data.fatorCodigo,
        }),
      },
    );
  }
  return request<import('../types/psicossocial').PsicoActionPlan>(
    `/api/psico/plano-acao?tenantId=${encodeURIComponent(tenantId)}`,
    {
      method: 'POST',
      body: JSON.stringify({
        tenantId,
        description: data.description,
        responsible: data.responsible,
        dueDate: data.dueDate,
        priority: data.priority,
        fatorCodigo: data.fatorCodigo,
      }),
    },
  );
}

export async function apiDeletePsicoPlanoAcao(tenantId: string, id: string) {
  return request<{ ok: boolean }>(
    `/api/psico/plano-acao/${encodeURIComponent(id)}?tenantId=${encodeURIComponent(tenantId)}`,
    { method: 'DELETE', body: JSON.stringify({ tenantId }) },
  );
}

export async function apiGetPsicoHistorico(tenantId: string, limit = 50) {
  return request<import('../types/psicossocial').PsicoHistoryEntry[]>(
    `/api/psico/historico?tenantId=${encodeURIComponent(tenantId)}&limit=${limit}`,
  );
}

export async function apiGetPsicoTendencias(tenantId: string) {
  return request<import('../types/psicossocial').PsicoTrendPoint[]>(
    `/api/psico/tendencias?tenantId=${encodeURIComponent(tenantId)}`,
  );
}

export async function apiMarkPsicoAlertRead(tenantId: string, id: string) {
  return request<{ ok: boolean }>(
    `/api/psico/alertas/${encodeURIComponent(id)}/read?tenantId=${encodeURIComponent(tenantId)}`,
    { method: 'PATCH', body: JSON.stringify({ tenantId }) },
  );
}

export async function apiGetAetDashboard(tenantId: string) {
  return request<import('../types/aet').AetDashboard>(`/api/aet/dashboard?tenantId=${encodeURIComponent(tenantId)}`);
}

export async function apiGetAetProcessos(tenantId: string) {
  return request<import('../types/aet').AetProcess[]>(`/api/aet/processos?tenantId=${encodeURIComponent(tenantId)}`);
}

export async function apiGetAetProcesso(tenantId: string, id: string) {
  return request<import('../types/aet').AetProcess>(
    `/api/aet/processos/${encodeURIComponent(id)}?tenantId=${encodeURIComponent(tenantId)}`,
  );
}

export async function apiCreateAetProcesso(tenantId: string, data: Partial<import('../types/aet').AetProcess>) {
  return request<import('../types/aet').AetProcess>(`/api/aet/processos?tenantId=${encodeURIComponent(tenantId)}`, {
    method: 'POST',
    body: JSON.stringify({ tenantId, title: data.title, collaboratorId: data.collaboratorId, sectorId: data.sectorId, analysisId: data.analysisId, characterization: data.characterization }),
  });
}

export async function apiUpdateAetProcesso(tenantId: string, id: string, patch: Record<string, unknown>) {
  return request<import('../types/aet').AetProcess>(
    `/api/aet/processos/${encodeURIComponent(id)}?tenantId=${encodeURIComponent(tenantId)}`,
    { method: 'PUT', body: JSON.stringify({ tenantId, ...patch }) },
  );
}

export async function apiAdvanceAetStage(tenantId: string, id: string) {
  return request<import('../types/aet').AetProcess>(
    `/api/aet/processos/${encodeURIComponent(id)}/advance?tenantId=${encodeURIComponent(tenantId)}`,
    { method: 'POST', body: JSON.stringify({ tenantId }) },
  );
}

export async function apiSaveAetVibracaoCorpo(tenantId: string, id: string, data: { aceleracaoMs2: number; horasExposicao: number; frequenciaHz?: number }) {
  return request<import('../types/aet').AetProcess>(
    `/api/aet/processos/${encodeURIComponent(id)}/vibracao-corpo?tenantId=${encodeURIComponent(tenantId)}`,
    { method: 'PUT', body: JSON.stringify({ tenantId, ...data }) },
  );
}

export async function apiSaveAetVibracaoMaos(tenantId: string, id: string, data: { aceleracaoMs2: number; horasExposicao: number }) {
  return request<import('../types/aet').AetProcess>(
    `/api/aet/processos/${encodeURIComponent(id)}/vibracao-maos?tenantId=${encodeURIComponent(tenantId)}`,
    { method: 'PUT', body: JSON.stringify({ tenantId, ...data }) },
  );
}

export async function apiSaveAetTeleatendimento(tenantId: string, id: string, answers: Record<string, number>) {
  return request<import('../types/aet').AetProcess>(
    `/api/aet/processos/${encodeURIComponent(id)}/teleatendimento?tenantId=${encodeURIComponent(tenantId)}`,
    { method: 'PUT', body: JSON.stringify({ tenantId, answers }) },
  );
}

export async function apiSaveAetOrganizacao(tenantId: string, id: string, answers: Record<string, number>) {
  return request<import('../types/aet').AetProcess>(
    `/api/aet/processos/${encodeURIComponent(id)}/organizacao?tenantId=${encodeURIComponent(tenantId)}`,
    { method: 'PUT', body: JSON.stringify({ tenantId, answers }) },
  );
}

export async function apiSaveAetMetodos(tenantId: string, id: string, methods: Record<string, unknown>, importAnalysisId?: string) {
  return request<import('../types/aet').AetProcess>(
    `/api/aet/processos/${encodeURIComponent(id)}/metodos?tenantId=${encodeURIComponent(tenantId)}`,
    { method: 'PUT', body: JSON.stringify({ tenantId, methods, importAnalysisId }) },
  );
}

export async function apiGenerateAetReport(tenantId: string, id: string) {
  return request<import('../types/aet').AetNormativeReport>(
    `/api/aet/processos/${encodeURIComponent(id)}/gerar-relatorio?tenantId=${encodeURIComponent(tenantId)}`,
    { method: 'POST', body: JSON.stringify({ tenantId }) },
  );
}

export async function apiSignAet(tenantId: string, id: string, ergonomistName: string, ergonomistRegistry: string) {
  return request<import('../types/aet').AetProcess>(
    `/api/aet/processos/${encodeURIComponent(id)}/assinar?tenantId=${encodeURIComponent(tenantId)}`,
    { method: 'POST', body: JSON.stringify({ tenantId, ergonomistName, ergonomistRegistry }) },
  );
}

export async function apiGetAetMobiliario(tenantId: string) {
  return request<import('../types/aet').AetFurniture[]>(`/api/aet/mobiliario?tenantId=${encodeURIComponent(tenantId)}`);
}

export async function apiSaveAetMobiliario(tenantId: string, data: Partial<import('../types/aet').AetFurniture> & { id?: string }) {
  if (data.id) {
    return request<import('../types/aet').AetFurniture>(
      `/api/aet/mobiliario/${encodeURIComponent(data.id)}?tenantId=${encodeURIComponent(tenantId)}`,
      { method: 'PUT', body: JSON.stringify({ tenantId, ...data }) },
    );
  }
  return request<import('../types/aet').AetFurniture>(`/api/aet/mobiliario?tenantId=${encodeURIComponent(tenantId)}`, {
    method: 'POST',
    body: JSON.stringify({ tenantId, type: data.type, description: data.description, brand: data.brand, model: data.model, sectorId: data.sectorId, nr17Compliance: data.nr17Compliance, notes: data.notes }),
  });
}

export async function apiGetAetEquipamentos(tenantId: string) {
  return request<import('../types/aet').AetEquipment[]>(`/api/aet/equipamentos?tenantId=${encodeURIComponent(tenantId)}`);
}

export async function apiSaveAetEquipamento(tenantId: string, data: Partial<import('../types/aet').AetEquipment> & { id?: string }) {
  if (data.id) {
    return request<import('../types/aet').AetEquipment>(
      `/api/aet/equipamentos/${encodeURIComponent(data.id)}?tenantId=${encodeURIComponent(tenantId)}`,
      { method: 'PUT', body: JSON.stringify({ tenantId, ...data }) },
    );
  }
  return request<import('../types/aet').AetEquipment>(`/api/aet/equipamentos?tenantId=${encodeURIComponent(tenantId)}`, {
    method: 'POST',
    body: JSON.stringify({ tenantId, type: data.type, identification: data.identification, description: data.description, manufacturer: data.manufacturer, emitsVibration: data.emitsVibration, sectorId: data.sectorId, nr17Compliance: data.nr17Compliance, notes: data.notes }),
  });
}

export async function apiGetAetHistorico(tenantId: string, processId?: string, versionId?: string) {
  const q = new URLSearchParams({ tenantId });
  if (processId) q.set('processId', processId);
  if (versionId) q.set('versionId', versionId);
  return request<import('../types/aet').AetHistoryEntry[]>(`/api/aet/historico?${q}`);
}

export async function apiUpdateAetTechnicalResponsible(tenantId: string, processId: string, data: Record<string, unknown>) {
  return request<import('../types/aet').AetProcess>(
    `/api/aet/processos/${encodeURIComponent(processId)}/responsavel-tecnico?tenantId=${encodeURIComponent(tenantId)}`,
    { method: 'PUT', body: JSON.stringify({ tenantId, ...data }) },
  );
}

export async function apiGetAetVersions(tenantId: string, processId: string) {
  return request<import('../types/aet').AetVersionDetail[]>(
    `/api/aet/processos/${encodeURIComponent(processId)}/versoes?tenantId=${encodeURIComponent(tenantId)}`,
  );
}

export async function apiCreateAetVersion(tenantId: string, processId: string, data?: Record<string, unknown>) {
  return request<import('../types/aet').AetVersionDetail>(
    `/api/aet/processos/${encodeURIComponent(processId)}/versoes?tenantId=${encodeURIComponent(tenantId)}`,
    { method: 'POST', body: JSON.stringify({ tenantId, ...data }) },
  );
}

export async function apiGetAetVersion(tenantId: string, versionId: string) {
  return request<import('../types/aet').AetVersionDetail>(
    `/api/aet/versoes/${encodeURIComponent(versionId)}?tenantId=${encodeURIComponent(tenantId)}`,
  );
}

export async function apiRefreshAetVersionSnapshot(tenantId: string, versionId: string) {
  return request<import('../types/aet').AetVersionDetail>(
    `/api/aet/versoes/${encodeURIComponent(versionId)}/atualizar-snapshot?tenantId=${encodeURIComponent(tenantId)}`,
    { method: 'POST', body: JSON.stringify({ tenantId }) },
  );
}

export async function apiGenerateAetVersionReport(tenantId: string, versionId: string) {
  return request<import('../types/aet').AetNormativeReport>(
    `/api/aet/versoes/${encodeURIComponent(versionId)}/gerar-relatorio?tenantId=${encodeURIComponent(tenantId)}`,
    { method: 'POST', body: JSON.stringify({ tenantId }) },
  );
}

export async function apiSubmitAetApproval(tenantId: string, versionId: string, approverName: string, approverRole?: string) {
  return request<import('../types/aet').AetVersionDetail>(
    `/api/aet/versoes/${encodeURIComponent(versionId)}/submit-approval?tenantId=${encodeURIComponent(tenantId)}`,
    { method: 'POST', body: JSON.stringify({ tenantId, approverName, approverRole }) },
  );
}

export async function apiApproveAetVersion(tenantId: string, versionId: string, notes?: string) {
  return request<import('../types/aet').AetVersionDetail>(
    `/api/aet/versoes/${encodeURIComponent(versionId)}/approve?tenantId=${encodeURIComponent(tenantId)}`,
    { method: 'POST', body: JSON.stringify({ tenantId, notes }) },
  );
}

export async function apiRejectAetVersion(tenantId: string, versionId: string, notes?: string) {
  return request<import('../types/aet').AetVersionDetail>(
    `/api/aet/versoes/${encodeURIComponent(versionId)}/reject?tenantId=${encodeURIComponent(tenantId)}`,
    { method: 'POST', body: JSON.stringify({ tenantId, notes }) },
  );
}

export async function apiSignAetVersion(
  tenantId: string,
  versionId: string,
  type: import('../types/aet').AetSignatureType,
  name: string,
  role?: string,
  document?: string,
) {
  return request<import('../types/aet').AetSignature>(
    `/api/aet/versoes/${encodeURIComponent(versionId)}/sign?tenantId=${encodeURIComponent(tenantId)}`,
    { method: 'POST', body: JSON.stringify({ tenantId, type, name, role, document }) },
  );
}

export async function apiStartAetRevision(tenantId: string, versionId: string, reviewReason?: string) {
  return request<import('../types/aet').AetVersionDetail>(
    `/api/aet/versoes/${encodeURIComponent(versionId)}/revision?tenantId=${encodeURIComponent(tenantId)}`,
    { method: 'POST', body: JSON.stringify({ tenantId, reviewReason }) },
  );
}

export async function apiGetAetIntegrations(tenantId: string, processId: string) {
  return request<import('../types/aet').AetIntegration[]>(
    `/api/aet/processos/${encodeURIComponent(processId)}/integracoes?tenantId=${encodeURIComponent(tenantId)}`,
  );
}

export async function apiGetSstDashboard(tenantId: string) {
  return request<import('../types/sst').SstDashboard>(`/api/sst/dashboard?tenantId=${encodeURIComponent(tenantId)}`);
}

export async function apiGetSstApr(tenantId: string) {
  return request<import('../types/sst').SstApr[]>(`/api/sst/apr?tenantId=${encodeURIComponent(tenantId)}`);
}

export async function apiCreateSstApr(tenantId: string, data: Partial<import('../types/sst').SstApr>) {
  return request<import('../types/sst').SstApr>(`/api/sst/apr?tenantId=${encodeURIComponent(tenantId)}`, {
    method: 'POST', body: JSON.stringify({ tenantId, title: data.title, activity: data.activity, workplace: data.workplace, riskId: data.riskId, sectorId: data.sectorId }),
  });
}

export async function apiGetSstEpi(tenantId: string) {
  return request<import('../types/sst').SstEpi[]>(`/api/sst/epi?tenantId=${encodeURIComponent(tenantId)}`);
}

export async function apiCreateSstEpi(tenantId: string, data: Partial<import('../types/sst').SstEpi>) {
  return request<import('../types/sst').SstEpi>(`/api/sst/epi?tenantId=${encodeURIComponent(tenantId)}`, {
    method: 'POST', body: JSON.stringify({ tenantId, description: data.description, type: data.type, ca: data.ca, manufacturer: data.manufacturer, caExpiry: data.caExpiry, riskId: data.riskId }),
  });
}

export async function apiGetSstEpc(tenantId: string) {
  return request<import('../types/sst').SstEpc[]>(`/api/sst/epc?tenantId=${encodeURIComponent(tenantId)}`);
}

export async function apiCreateSstEpc(tenantId: string, data: Partial<import('../types/sst').SstEpc>) {
  return request<import('../types/sst').SstEpc>(`/api/sst/epc?tenantId=${encodeURIComponent(tenantId)}`, {
    method: 'POST', body: JSON.stringify({ tenantId, type: data.type, description: data.description, location: data.location, riskId: data.riskId }),
  });
}

export async function apiGetSstInspecoes(tenantId: string) {
  return request<import('../types/sst').SstInspecao[]>(`/api/sst/inspecoes?tenantId=${encodeURIComponent(tenantId)}`);
}

export async function apiCreateSstInspecao(tenantId: string, title: string) {
  return request<import('../types/sst').SstInspecao>(`/api/sst/inspecoes?tenantId=${encodeURIComponent(tenantId)}`, {
    method: 'POST', body: JSON.stringify({ tenantId, title }),
  });
}

export async function apiGetSstAuditorias(tenantId: string) {
  return request<import('../types/sst').SstAuditoria[]>(`/api/sst/auditorias?tenantId=${encodeURIComponent(tenantId)}`);
}

export async function apiCreateSstAuditoria(tenantId: string, title: string) {
  return request<import('../types/sst').SstAuditoria>(`/api/sst/auditorias?tenantId=${encodeURIComponent(tenantId)}`, {
    method: 'POST', body: JSON.stringify({ tenantId, title }),
  });
}

export async function apiGetSstNc(tenantId: string) {
  return request<import('../types/sst').SstNc[]>(`/api/sst/nc?tenantId=${encodeURIComponent(tenantId)}`);
}

export async function apiCreateSstNc(tenantId: string, data: { title?: string; description: string; severity?: string; riskId?: string }) {
  return request<import('../types/sst').SstNc>(`/api/sst/nc?tenantId=${encodeURIComponent(tenantId)}`, {
    method: 'POST', body: JSON.stringify({ tenantId, ...data }),
  });
}

export async function apiGetSstCapa(tenantId: string) {
  return request<import('../types/sst').SstCapa[]>(`/api/sst/capa?tenantId=${encodeURIComponent(tenantId)}`);
}

export async function apiCreateSstCapa(tenantId: string, data: { description: string; ncId?: string; riskId?: string; syncGro?: boolean }) {
  return request<import('../types/sst').SstCapa>(`/api/sst/capa?tenantId=${encodeURIComponent(tenantId)}`, {
    method: 'POST', body: JSON.stringify({ tenantId, ...data }),
  });
}

export async function apiGetSstTreinamentos(tenantId: string) {
  return request<import('../types/sst').SstTreinamento[]>(`/api/sst/treinamentos?tenantId=${encodeURIComponent(tenantId)}`);
}

export async function apiCreateSstTreinamento(tenantId: string, title: string) {
  return request<import('../types/sst').SstTreinamento>(`/api/sst/treinamentos?tenantId=${encodeURIComponent(tenantId)}`, {
    method: 'POST', body: JSON.stringify({ tenantId, title }),
  });
}

export async function apiGenerateSstReport(tenantId: string) {
  return request<import('../types/sst').SstReport>(`/api/sst/relatorios/gerar?tenantId=${encodeURIComponent(tenantId)}`, {
    method: 'POST', body: JSON.stringify({ tenantId }),
  });
}

export async function apiGetSstRelatorios(tenantId: string) {
  return request<import('../types/sst').SstReportSummary[]>(`/api/sst/relatorios?tenantId=${encodeURIComponent(tenantId)}`);
}

export async function apiGetEsocialDashboard(tenantId: string) {
  return request<import('../types/esocial').EsocialDashboard>(`/api/esocial/dashboard?tenantId=${encodeURIComponent(tenantId)}`);
}

export async function apiGetEsocialConfig(tenantId: string) {
  return request<import('../types/esocial').EsocialConfig>(`/api/esocial/config?tenantId=${encodeURIComponent(tenantId)}`);
}

export async function apiUpdateEsocialConfig(tenantId: string, data: Partial<import('../types/esocial').EsocialConfig>) {
  return request<import('../types/esocial').EsocialConfig>(`/api/esocial/config?tenantId=${encodeURIComponent(tenantId)}`, {
    method: 'PUT', body: JSON.stringify({ tenantId, ...data }),
  });
}

export async function apiGetEsocialEventos(tenantId: string, tipo?: string) {
  const q = tipo ? `&tipo=${encodeURIComponent(tipo)}` : '';
  return request<import('../types/esocial').EsocialEvent[]>(`/api/esocial/eventos?tenantId=${encodeURIComponent(tenantId)}${q}`);
}

export async function apiGetEsocialEvento(tenantId: string, id: string, includeXml = false) {
  const q = includeXml ? '&includeXml=1' : '';
  return request<import('../types/esocial').EsocialEvent>(`/api/esocial/eventos/${id}?tenantId=${encodeURIComponent(tenantId)}${q}`);
}

export async function apiCreateEsocialEvento(tenantId: string, data: {
  eventType: import('../types/esocial').EsocialEventType;
  payload?: Record<string, unknown>;
  collaboratorId?: string;
  analysisId?: string;
  riskId?: string;
}) {
  return request<import('../types/esocial').EsocialEvent>(`/api/esocial/eventos?tenantId=${encodeURIComponent(tenantId)}`, {
    method: 'POST', body: JSON.stringify({ tenantId, ...data }),
  });
}

export async function apiValidateEsocialEvento(tenantId: string, id: string) {
  return request<import('../types/esocial').EsocialValidationResult>(`/api/esocial/eventos/${id}/validar?tenantId=${encodeURIComponent(tenantId)}`, {
    method: 'POST', body: JSON.stringify({ tenantId }),
  });
}

export async function apiSignEsocialEvento(tenantId: string, id: string, data: { name: string; type?: string; document?: string; registry?: string; certificateSerial?: string }) {
  return request<{ hash: string }>(`/api/esocial/eventos/${id}/assinar?tenantId=${encodeURIComponent(tenantId)}`, {
    method: 'POST', body: JSON.stringify({ tenantId, ...data }),
  });
}

export async function apiPrepareEsocialEnvio(tenantId: string, id: string) {
  return request<{ loteId: string; endpoint: string; status: string }>(`/api/esocial/eventos/${id}/preparar-envio?tenantId=${encodeURIComponent(tenantId)}`, {
    method: 'POST', body: JSON.stringify({ tenantId }),
  });
}

export async function apiGetEsocialXml(tenantId: string, id: string) {
  return request<{ xml: string; eventId: string; eventType: string }>(`/api/esocial/eventos/${id}/xml?tenantId=${encodeURIComponent(tenantId)}`);
}

export async function apiGetEsocialHistorico(tenantId: string, eventId?: string) {
  const q = eventId ? `&eventId=${encodeURIComponent(eventId)}` : '';
  return request<import('../types/esocial').EsocialHistoryEntry[]>(`/api/esocial/historico?tenantId=${encodeURIComponent(tenantId)}${q}`);
}

export async function apiTransmitEsocialEvento(tenantId: string, id: string) {
  return request<import('../types/esocial').EsocialTransmitResult>(
    `/api/esocial/eventos/${encodeURIComponent(id)}/enviar?tenantId=${encodeURIComponent(tenantId)}`,
    { method: 'POST', body: JSON.stringify({}) },
  );
}

export async function apiResendEsocialEvento(tenantId: string, id: string) {
  return request<import('../types/esocial').EsocialTransmitResult>(
    `/api/esocial/eventos/${encodeURIComponent(id)}/reenviar?tenantId=${encodeURIComponent(tenantId)}`,
    { method: 'POST', body: JSON.stringify({}) },
  );
}

export async function apiConsultEsocialStatus(tenantId: string, id: string) {
  return request<{ status: string; message?: string; errors: import('../types/esocial').EsocialValidationIssue[]; eventStatus: string }>(
    `/api/esocial/eventos/${encodeURIComponent(id)}/consultar-status?tenantId=${encodeURIComponent(tenantId)}`,
    { method: 'POST', body: JSON.stringify({}) },
  );
}

export async function apiGetEsocialTransmissions(tenantId: string, eventId: string) {
  return request<import('../types/esocial').EsocialTransmission[]>(
    `/api/esocial/eventos/${encodeURIComponent(eventId)}/transmissoes?tenantId=${encodeURIComponent(tenantId)}`,
  );
}

export async function apiGetComplianceDashboard(tenantId: string) {
  return request<import('../types/compliance').ComplianceDashboard>(`/api/compliance/dashboard?tenantId=${encodeURIComponent(tenantId)}`);
}

export async function apiGetComplianceFontes(tenantId: string) {
  return request<import('../types/compliance').ComplianceFonte[]>(`/api/compliance/fontes?tenantId=${encodeURIComponent(tenantId)}`);
}

export async function apiUpdateComplianceFonte(tenantId: string, code: string, data: { active?: boolean; intervalHours?: number }) {
  return request<import('../types/compliance').ComplianceFonte>(`/api/compliance/fontes/${encodeURIComponent(code)}?tenantId=${encodeURIComponent(tenantId)}`, {
    method: 'PUT', body: JSON.stringify(data),
  });
}

export async function apiRunComplianceScan(tenantId: string, sources?: string[]) {
  return request<import('../types/compliance').ComplianceScanResult>(`/api/compliance/scan?tenantId=${encodeURIComponent(tenantId)}`, {
    method: 'POST', body: JSON.stringify({ sources }),
  });
}

export async function apiGetComplianceNormas(tenantId: string) {
  return request<import('../types/compliance').ComplianceNorma[]>(`/api/compliance/normas?tenantId=${encodeURIComponent(tenantId)}`);
}

export async function apiGetComplianceNormaVersoes(tenantId: string, normId: string) {
  return request<import('../types/compliance').ComplianceNormaVersao[]>(`/api/compliance/normas/${encodeURIComponent(normId)}/versoes?tenantId=${encodeURIComponent(tenantId)}`);
}

export async function apiGetComplianceDeteccoes(tenantId: string, status?: string) {
  const q = status ? `&status=${encodeURIComponent(status)}` : '';
  return request<import('../types/compliance').ComplianceDeteccao[]>(`/api/compliance/deteccoes?tenantId=${encodeURIComponent(tenantId)}${q}`);
}

export async function apiGetComplianceImpactos(tenantId: string, detectionId: string) {
  return request<import('../types/compliance').ComplianceDetectionImpacts>(
    `/api/compliance/deteccoes/${encodeURIComponent(detectionId)}/impactos?tenantId=${encodeURIComponent(tenantId)}`,
  );
}

export async function apiValidateComplianceDetection(tenantId: string, id: string, data: { decision: string; justification: string; validatorName?: string; applyRules?: boolean }) {
  return request<import('../types/compliance').ComplianceValidationResult>(`/api/compliance/deteccoes/${encodeURIComponent(id)}/validar?tenantId=${encodeURIComponent(tenantId)}`, {
    method: 'POST', body: JSON.stringify(data),
  });
}

export async function apiGetComplianceAlertas(tenantId: string, unreadOnly = false) {
  const q = unreadOnly ? '&unread=1' : '';
  return request<import('../types/compliance').ComplianceAlerta[]>(`/api/compliance/alertas?tenantId=${encodeURIComponent(tenantId)}${q}`);
}

export async function apiMarkComplianceAlertRead(tenantId: string, id: string) {
  return request<{ ok: boolean }>(`/api/compliance/alertas/${encodeURIComponent(id)}/lida?tenantId=${encodeURIComponent(tenantId)}`, {
    method: 'PUT', body: JSON.stringify({}),
  });
}

export async function apiGetComplianceHistorico(tenantId: string, limit = 50) {
  return request<import('../types/compliance').ComplianceHistoryEntry[]>(`/api/compliance/historico?tenantId=${encodeURIComponent(tenantId)}&limit=${limit}`);
}

export async function apiGenerateComplianceReport(tenantId: string) {
  return request<import('../types/compliance').ComplianceReport>(`/api/compliance/relatorios/gerar?tenantId=${encodeURIComponent(tenantId)}`, {
    method: 'POST', body: JSON.stringify({}),
  });
}

export async function apiGetComplianceRelatorios(tenantId: string) {
  return request<import('../types/compliance').ComplianceReportSummary[]>(`/api/compliance/relatorios?tenantId=${encodeURIComponent(tenantId)}`);
}

export async function apiCompareComplianceNormVersions(tenantId: string, normId: string, fromId: string, toId: string) {
  return request<import('../types/compliance').ComplianceVersionCompare>(
    `/api/compliance/normas/${encodeURIComponent(normId)}/versoes/compare?tenantId=${encodeURIComponent(tenantId)}&from=${encodeURIComponent(fromId)}&to=${encodeURIComponent(toId)}`,
  );
}

export async function apiGetComplianceSchedule(tenantId: string) {
  return request<import('../types/compliance').ComplianceSchedule>(`/api/compliance/agendamento?tenantId=${encodeURIComponent(tenantId)}`);
}

export async function apiUpdateComplianceSchedule(tenantId: string, data: { active?: boolean; intervalHours?: number }) {
  return request<import('../types/compliance').ComplianceSchedule>(`/api/compliance/agendamento?tenantId=${encodeURIComponent(tenantId)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function apiGetComplianceTasks(tenantId: string, status?: string) {
  const q = status ? `&status=${encodeURIComponent(status)}` : '';
  return request<import('../types/compliance').ComplianceAdequationTask[]>(`/api/compliance/tarefas?tenantId=${encodeURIComponent(tenantId)}${q}`);
}

export async function apiUpdateComplianceTask(tenantId: string, id: string, patch: { status?: string; responsible?: string }) {
  return request<import('../types/compliance').ComplianceAdequationTask>(
    `/api/compliance/tarefas/${encodeURIComponent(id)}?tenantId=${encodeURIComponent(tenantId)}`,
    { method: 'PUT', body: JSON.stringify(patch) },
  );
}

export async function apiGetComplianceVarreduras(tenantId: string) {
  return request<import('../types/compliance').ComplianceScanRun[]>(`/api/compliance/varreduras?tenantId=${encodeURIComponent(tenantId)}`);
}

// ─── Estrutura Organizacional NR-01 ─────────────────────────────
export async function apiGetOrgTree(tenantId: string) {
  return request<import('../types/org').OrgTree>(`/api/org/tree?tenantId=${encodeURIComponent(tenantId)}`);
}

export async function apiGetOrgCompany(tenantId: string) {
  return request<import('../types/org').OrgCompany>(`/api/org/empresa?tenantId=${encodeURIComponent(tenantId)}`);
}

export async function apiUpdateOrgCompany(tenantId: string, body: Partial<import('../types/org').OrgCompany>) {
  return request<import('../types/org').OrgCompany>(`/api/org/empresa?tenantId=${encodeURIComponent(tenantId)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function apiCreateOrgUnit(tenantId: string, body: { name: string; type?: string; city?: string; state?: string }) {
  return request<import('../types/org').OrgUnit>(`/api/org/unidades?tenantId=${encodeURIComponent(tenantId)}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function apiCreateOrgSector(tenantId: string, body: { name: string; unitId?: string; description?: string }) {
  return request<import('../types/org').OrgSector>(`/api/org/setores?tenantId=${encodeURIComponent(tenantId)}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function apiCreateOrgFunction(tenantId: string, body: { name: string; sectorId: string; description?: string }) {
  return request<import('../types/org').OrgFunction>(`/api/org/funcoes?tenantId=${encodeURIComponent(tenantId)}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function apiCreateOrgActivity(tenantId: string, body: { name: string; functionId: string; description?: string }) {
  return request<import('../types/org').OrgActivity>(`/api/org/atividades?tenantId=${encodeURIComponent(tenantId)}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function apiCreateOrgWorkPost(tenantId: string, body: { name: string; activityId: string; location?: string }) {
  return request<import('../types/org').OrgWorkPost>(`/api/org/postos?tenantId=${encodeURIComponent(tenantId)}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function apiDeleteOrgEntity(tenantId: string, level: string, id: string) {
  const paths: Record<string, string> = {
    unidade: 'unidades',
    setor: 'setores',
    funcao: 'funcoes',
    atividade: 'atividades',
    posto: 'postos',
  };
  const path = paths[level];
  if (!path) throw new Error('Nível inválido');
  return request<{ ok: boolean; id: string }>(`/api/org/${path}/${id}?tenantId=${encodeURIComponent(tenantId)}`, {
    method: 'DELETE',
  });
}

export async function apiRestoreSession(): Promise<boolean> {
  return refreshAccessToken();
}

export async function isApiAvailable(): Promise<boolean> {
  try {
    const h = await apiHealth();
    return h.ok === true;
  } catch {
    return false;
  }
}

// ─── ErgoSense AI Expert ───────────────────────────────────────
export interface AiExpertTransparency {
  disclaimer: string;
  dataSourcesUsed: string[];
  methodology: string[];
  normsConsidered: string[];
  controlHierarchy?: string[];
  limitations: string[];
}

export interface AiExpertResponse {
  action: string;
  provider: string;
  disclaimer: string;
  analysis: { narrative?: string } | Record<string, unknown>;
  transparency: AiExpertTransparency;
  generatedAt: string;
  pdf?: { mimeType: string; filename: string; base64: string; sizeBytes: number };
  complianceScore?: number;
}

export async function apiGetAiStatus() {
  return request<{ provider: string; configured: boolean }>('/api/system/ai-status');
}

export async function apiAiExpertAnalyzeErgonomics(
  tenantId: string,
  body: { prompt?: string; modules?: string[]; entityRefs?: Record<string, string> },
) {
  return request<AiExpertResponse>(`/api/ai/expert/analyze-ergonomics?tenantId=${encodeURIComponent(tenantId)}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function apiAiExpertGenerateAet(
  tenantId: string,
  body: { prompt?: string; modules?: string[]; entityRefs?: Record<string, string> },
) {
  return request<AiExpertResponse>(`/api/ai/expert/aet?tenantId=${encodeURIComponent(tenantId)}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function apiAiExpertGenerateIt(
  tenantId: string,
  body: { prompt?: string; entityRefs?: Record<string, string>; aetSummary?: string },
) {
  return request<AiExpertResponse>(`/api/ai/expert/work-instruction?tenantId=${encodeURIComponent(tenantId)}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function apiAiExpertQuery(
  tenantId: string,
  body: { prompt: string; modules?: string[] },
) {
  return request<AiExpertResponse>(`/api/ai/expert/query?tenantId=${encodeURIComponent(tenantId)}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function apiAiExpertPsicossocial(tenantId: string, prompt?: string) {
  return request<AiExpertResponse>(`/api/ai/expert/psicossocial?tenantId=${encodeURIComponent(tenantId)}`, {
    method: 'POST',
    body: JSON.stringify(prompt ? { prompt } : {}),
  });
}
