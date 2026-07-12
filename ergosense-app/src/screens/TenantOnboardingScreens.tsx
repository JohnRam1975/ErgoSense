import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ErgoSenseLogo } from '../components/ErgoSenseLogo';
import {
  apiActivateAccount,
  apiActivateAccountPreview,
  apiAdminTenantRequests,
  apiAdminTenantRequestDetail,
  apiApproveTenantRequest,
  apiBlockAdminTenant,
  apiListAdminTenants,
  apiReactivateAdminTenant,
  apiRejectTenantRequest,
  apiRequestTenantAdjustment,
  apiSubmitTenantRequest,
  type TenantRequestItem,
} from '../api/client';

function formatCnpjInput(value: string) {
  const d = value.replace(/\D/g, '').slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function EmployeeAccessRequestScreen() {
  const { go, showToast, submitAccessRequest } = useApp();
  const [form, setForm] = useState({ name: '', email: '', funcao: '', matricula: '' });
  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = () => {
    if (!form.name.trim() || !form.email.includes('@') || !form.funcao.trim() || !form.matricula.trim()) {
      showToast('Preencha todos os campos', 'warn');
      return;
    }
    void (async () => {
      const ok = await submitAccessRequest({
        nome: form.name.trim(),
        email: form.email.trim(),
        funcao: form.funcao.trim(),
        matricula: form.matricula.trim(),
      });
      if (ok) {
        showToast('Solicitação enviada!', 'success');
        go('login');
      }
    })();
  };

  return (
    <PublicFormShell title="Solicitar acesso (colaborador)" onBack={() => go('login')}>
      <label className="lbl">Nome completo *</label>
      <input className="inp" value={form.name} onChange={(e) => set('name', e.target.value)} />
      <label className="lbl">E-mail corporativo *</label>
      <input className="inp" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
      <label className="lbl">Função *</label>
      <input className="inp" value={form.funcao} onChange={(e) => set('funcao', e.target.value)} />
      <label className="lbl">Matrícula *</label>
      <input className="inp" value={form.matricula} onChange={(e) => set('matricula', e.target.value)} />
      <button type="button" className="btn bp mt12" onClick={handleSubmit}>Enviar solicitação</button>
    </PublicFormShell>
  );
}

export function TenantRequestAccessScreen() {
  const { go, showToast } = useApp();
  const [form, setForm] = useState({
    razaoSocial: '',
    nomeFantasia: '',
    cnpj: '',
    segmento: '',
    quantidadeFuncionarios: '',
    responsavelNome: '',
    email: '',
    telefone: '',
  });
  const [protocolo, setProtocolo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = () => {
    if (!form.razaoSocial.trim() || form.cnpj.replace(/\D/g, '').length < 14) {
      showToast('Informe razão social e CNPJ válido', 'warn');
      return;
    }
    if (!form.email.includes('@') || !form.responsavelNome.trim() || !form.telefone.trim()) {
      showToast('Preencha responsável, e-mail e telefone', 'warn');
      return;
    }
    void (async () => {
      setLoading(true);
      try {
        const res = await apiSubmitTenantRequest({
          razaoSocial: form.razaoSocial.trim(),
          nomeFantasia: form.nomeFantasia.trim() || form.razaoSocial.trim(),
          cnpj: form.cnpj,
          segmento: form.segmento.trim() || 'Geral',
          quantidadeFuncionarios: Number(form.quantidadeFuncionarios) || undefined,
          responsavelNome: form.responsavelNome.trim(),
          email: form.email.trim(),
          telefone: form.telefone.trim(),
        });
        setProtocolo(res.protocolo);
        showToast('Solicitação registrada!', 'success');
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Erro ao enviar', 'warn');
      } finally {
        setLoading(false);
      }
    })();
  };

  if (protocolo) {
    return (
      <PublicFormShell title="Solicitação enviada" onBack={() => go('login')}>
        <div className="hl" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <p>Protocolo:</p>
          <div style={{ fontFamily: 'var(--fm)', fontSize: 20, color: 'var(--amber)', margin: '12px 0' }}>{protocolo}</div>
          <p className="access-form-intro">Nossa equipe analisará seu cadastro. Você receberá um e-mail com instruções de ativação após aprovação.</p>
          <button type="button" className="btn bp mt12" onClick={() => go('login')}>Voltar ao login</button>
        </div>
      </PublicFormShell>
    );
  }

  return (
    <PublicFormShell title="Cadastrar empresa" onBack={() => go('login')}>
      <p className="access-form-intro">Solicite acesso ao ErgoSensePro para sua organização. Análise em até 2 dias úteis.</p>
      <label className="lbl">Razão Social *</label>
      <input className="inp" value={form.razaoSocial} onChange={(e) => set('razaoSocial', e.target.value)} />
      <label className="lbl">Nome Fantasia</label>
      <input className="inp" value={form.nomeFantasia} onChange={(e) => set('nomeFantasia', e.target.value)} />
      <label className="lbl">CNPJ *</label>
      <input className="inp" value={form.cnpj} onChange={(e) => set('cnpj', formatCnpjInput(e.target.value))} placeholder="00.000.000/0000-00" />
      <label className="lbl">Segmento *</label>
      <input className="inp" value={form.segmento} onChange={(e) => set('segmento', e.target.value)} placeholder="Ex.: Mineração, Saúde" />
      <label className="lbl">Quantidade de Funcionários</label>
      <input className="inp" type="number" min={1} value={form.quantidadeFuncionarios} onChange={(e) => set('quantidadeFuncionarios', e.target.value)} />
      <label className="lbl">Nome do Responsável *</label>
      <input className="inp" value={form.responsavelNome} onChange={(e) => set('responsavelNome', e.target.value)} />
      <label className="lbl">E-mail *</label>
      <input className="inp" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
      <label className="lbl">Telefone *</label>
      <input className="inp" value={form.telefone} onChange={(e) => set('telefone', e.target.value)} />
      <button type="button" className="btn bp mt12" disabled={loading} onClick={handleSubmit}>
        {loading ? 'Enviando…' : 'Enviar solicitação'}
      </button>
    </PublicFormShell>
  );
}

export function ActivateAccountScreen() {
  const { go, showToast } = useApp();
  const token = useMemo(() => new URLSearchParams(window.location.search).get('token') ?? '', []);
  const [preview, setPreview] = useState<{ email: string; companyName: string; qrDataUrl: string } | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    void apiActivateAccountPreview(token)
      .then(setPreview)
      .catch(() => showToast('Link de ativação inválido ou expirado', 'warn'));
  }, [token, showToast]);

  const handleActivate = () => {
    if (password.length < 8) {
      showToast('Senha deve ter ao menos 8 caracteres', 'warn');
      return;
    }
    if (password !== confirm) {
      showToast('Senhas não conferem', 'warn');
      return;
    }
    if (!mfaCode.trim()) {
      showToast('Informe o código MFA do autenticador', 'warn');
      return;
    }
    void (async () => {
      setLoading(true);
      try {
        await apiActivateAccount({ token, password, confirmPassword: confirm, mfaCode: mfaCode.trim() });
        showToast('Conta ativada! Faça login.', 'success');
        window.history.replaceState({}, '', '/');
        go('login');
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Erro na ativação', 'warn');
      } finally {
        setLoading(false);
      }
    })();
  };

  return (
    <PublicFormShell title="Ativar conta" onBack={() => go('login')}>
      {!preview ? (
        <p className="access-form-intro">Carregando…</p>
      ) : (
        <>
          <p className="access-form-intro">
            Empresa: <strong>{preview.companyName}</strong><br />E-mail: {preview.email}
          </p>
          <label className="lbl">1. Escaneie o QR Code no app autenticador (Google Authenticator, etc.)</label>
          {preview.qrDataUrl && <img src={preview.qrDataUrl} alt="QR MFA" style={{ maxWidth: 200, margin: '12px auto', display: 'block' }} />}
          <label className="lbl">2. Nova senha *</label>
          <input className="inp" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <label className="lbl">Confirmar senha *</label>
          <input className="inp" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          <label className="lbl">3. Código MFA *</label>
          <input className="inp" inputMode="numeric" maxLength={8} value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} placeholder="000000" />
          <button type="button" className="btn bp mt12" disabled={loading} onClick={handleActivate}>
            {loading ? 'Ativando…' : 'Ativar conta'}
          </button>
        </>
      )}
    </PublicFormShell>
  );
}

function PublicFormShell({ title, onBack, children }: { title: string; onBack: () => void; children: React.ReactNode }) {
  return (
    <>
      <div className="login-top">
        <button type="button" className="btn bp login-back-btn" onClick={onBack}>Voltar</button>
      </div>
      <div className="login-hero login-hero--compact">
        <ErgoSenseLogo size="md" showText className="ergo-logo--login" />
      </div>
      <div className="scroll" style={{ flex: 'none', paddingBottom: 'calc(30px + var(--safe-bot))' }}>
        <div className="hl">
          <div style={{ fontFamily: 'var(--fd)', fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 8 }}>
            {title}
          </div>
          {children}
        </div>
      </div>
    </>
  );
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    PENDENTE: 'ba',
    EM_ANALISE: 'bo',
    APROVADO: 'bg',
    REJEITADO: 'br',
    BLOQUEADO: 'br',
  };
  return map[status] ?? 'bn';
}

export function AdminTenantRequestsScreen() {
  const { go, showToast } = useApp();
  const [items, setItems] = useState<TenantRequestItem[]>([]);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    void apiAdminTenantRequests({ status: status || undefined, search: search || undefined })
      .then(setItems)
      .catch(() => showToast('Erro ao carregar solicitações', 'warn'));
  }, [search, showToast, status]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AdminTenantShell active="requests" title="Solicitações de cadastro">
      <div className="admin-toolbar">
        <select className="inp admin-search" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos status</option>
          <option value="PENDENTE">Pendente</option>
          <option value="EM_ANALISE">Em análise</option>
          <option value="APROVADO">Aprovado</option>
          <option value="REJEITADO">Rejeitado</option>
        </select>
        <input className="inp admin-search" placeholder="Buscar…" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
        <button type="button" className="btn bs" onClick={load}>Filtrar</button>
      </div>
      <div className="admin-table">
        {items.map((item) => (
          <div key={item.id} className="admin-row" onClick={() => { sessionStorage.setItem('ergosense_admin_request_id', item.id); go('admin-tenant-request-detail'); }}>
            <div><strong>{item.protocolo}</strong><div className="t2">{item.razaoSocial}</div></div>
            <div>{item.cnpj}</div>
            <div>{item.responsavelNome}</div>
            <div>{new Date(item.dataSolicitacao).toLocaleDateString('pt-BR')}</div>
            <div><span className={`badge ${statusBadge(item.status)}`}>{item.status}</span></div>
          </div>
        ))}
      </div>
    </AdminTenantShell>
  );
}

export function AdminTenantRequestDetailScreen() {
  const { go, showToast } = useApp();
  const requestId = sessionStorage.getItem('ergosense_admin_request_id') ?? '';
  const [item, setItem] = useState<TenantRequestItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [adjustMsg, setAdjustMsg] = useState('');

  useEffect(() => {
    if (!requestId) return;
    void apiAdminTenantRequestDetail(requestId).then(setItem);
  }, [requestId]);

  if (!item) return <AdminTenantShell active="requests" title="Detalhe"><p>Carregando…</p></AdminTenantShell>;

  return (
    <AdminTenantShell active="requests" title={`Solicitação ${item.protocolo}`}>
      <div className="hl">
        {Object.entries({
          'Razão Social': item.razaoSocial,
          'Nome Fantasia': item.nomeFantasia,
          CNPJ: item.cnpj,
          Segmento: item.segmento,
          Funcionários: item.quantidadeFuncionarios,
          Responsável: item.responsavelNome,
          'E-mail': item.email,
          Telefone: item.telefone,
          Plano: item.plano,
          Status: item.status,
        }).map(([k, v]) => (
          <div key={k} style={{ marginBottom: 8 }}><span className="lbl">{k}</span><div>{v ?? '—'}</div></div>
        ))}
      </div>
      {['PENDENTE', 'EM_ANALISE'].includes(item.status) && (
        <div className="admin-actions mt12">
          <button type="button" className="btn bp" onClick={() => void apiApproveTenantRequest(item.id).then((r) => {
            showToast(`Aprovado! Tenant: ${r.tenantId}`, 'success');
            go('admin-tenant-requests');
          }).catch((e) => showToast(e.message, 'warn'))}>Aprovar</button>
          <input className="inp mt8" placeholder="Motivo rejeição" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          <button type="button" className="btn br mt8" onClick={() => void apiRejectTenantRequest(item.id, rejectReason).then(() => go('admin-tenant-requests'))}>Rejeitar</button>
          <input className="inp mt8" placeholder="Mensagem de ajuste" value={adjustMsg} onChange={(e) => setAdjustMsg(e.target.value)} />
          <button type="button" className="btn bs mt8" onClick={() => void apiRequestTenantAdjustment(item.id, adjustMsg).then(() => showToast('Ajuste solicitado', 'success'))}>Solicitar ajuste</button>
        </div>
      )}
    </AdminTenantShell>
  );
}

export function AdminTenantsListScreen({ filter }: { filter: 'active' | 'blocked' | 'expired' }) {
  const { showToast } = useApp();
  const [items, setItems] = useState<Array<{ id: string; name: string; plan: string; statusConta: string; userCount: number }>>([]);
  const titles = { active: 'Empresas Ativas', blocked: 'Empresas Bloqueadas', expired: 'Empresas Expiradas' };
  const nav = { active: 'active' as const, blocked: 'blocked' as const, expired: 'expired' as const };

  useEffect(() => {
    void apiListAdminTenants(filter).then(setItems).catch(() => showToast('Erro ao carregar', 'warn'));
  }, [filter, showToast]);

  return (
    <AdminTenantShell active={nav[filter]} title={titles[filter]}>
      <div className="admin-table">
        {items.map((t) => (
          <div key={t.id} className="admin-row">
            <div><strong>{t.name}</strong><div className="t2">{t.id}</div></div>
            <div>{t.plan}</div>
            <div>{t.userCount} usuários</div>
            <div><span className="badge bn">{t.statusConta}</span></div>
            <div className="admin-row-actions">
              {filter !== 'active' && (
                <button type="button" className="btn bs btn-sm" onClick={() => void apiReactivateAdminTenant(t.id).then(() => showToast('Reativada', 'success'))}>Reativar</button>
              )}
              {filter === 'active' && (
                <button type="button" className="btn br btn-sm" onClick={() => void apiBlockAdminTenant(t.id, 'Bloqueio admin').then(() => showToast('Bloqueada', 'success'))}>Bloquear</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </AdminTenantShell>
  );
}

function AdminTenantShell({ active, title, children }: { active: string; title: string; children: React.ReactNode }) {
  const { go, session, logout, showModal } = useApp();
  const nav = [
    { id: 'requests', label: 'Solicitações', screen: 'admin-tenant-requests' as const },
    { id: 'active', label: 'Empresas Ativas', screen: 'admin-tenants-active' as const },
    { id: 'blocked', label: 'Empresas Bloqueadas', screen: 'admin-tenants-blocked' as const },
    { id: 'expired', label: 'Empresas Expiradas', screen: 'admin-tenants-expired' as const },
  ];

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand"><ErgoSenseLogo size="md" showText showTagline className="ergo-logo--admin" /></div>
        <nav className="admin-nav">
          <button type="button" className="admin-nav-item" onClick={() => go('global-admin')}>← Painel global</button>
          {nav.map((n) => (
            <button key={n.id} type="button" className={`admin-nav-item ${active === n.id ? 'on' : ''}`} onClick={() => go(n.screen)}>
              {n.label}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-foot">
          <div className="admin-user-name">{session?.name}</div>
          <button type="button" className="admin-nav-item admin-nav-item--danger" onClick={() => showModal('Sair', 'Encerrar sessão?', 'Sim', logout)}>Sair</button>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar"><h1 className="admin-topbar-title">{title}</h1></header>
        <div className="admin-content scroll">{children}</div>
      </div>
    </div>
  );
}
