import { useCallback, useEffect, useMemo, useState } from 'react';
import { getErrorMessage } from '../utils/errors';
import { validatePasswordForm } from '../utils/passwordForm';
import { useApp } from '../context/AppContext';
import { ErgoSenseLogo } from '../components/ErgoSenseLogo';
import { PasswordField } from '../components/PasswordField';
import {
  apiActivateAccount,
  apiActivateAccountPreview,
  apiAdminTenantRequests,
  apiAdminTenantRequestDetail,
  apiApproveTenantRequest,
  apiBlockAdminTenant,
  apiDeactivateAdminTenant,
  apiGrantAdminTenantAccess,
  apiListAdminTenants,
  apiGetAdminTenant,
  apiUpdateAdminTenant,
  apiRejectTenantRequest,
  apiRequestTenantAdjustment,
  apiSubmitTenantRequest,
  apiGetSupportContactInfo,
  apiSubmitSupportContact,
  type TenantRequestItem,
  type AdminTenantDetail,
} from '../api/client';
import {
  formatCepInput,
  formatCnpjInput,
  formatCpfInput,
  formatPhoneInput,
  isValidCnpjDigits,
  isValidCpfDigits,
  isValidEmail,
  lookupCep,
  onlyDigits,
} from '../utils/brMasks';

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
    password: '',
    confirmPassword: '',
  });
  const [protocolo, setProtocolo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = () => {
    if (!form.razaoSocial.trim() || !isValidCnpjDigits(form.cnpj)) {
      showToast('Informe razão social e CNPJ válido', 'warn');
      return;
    }
    if (!form.segmento.trim()) {
      showToast('Informe o segmento', 'warn');
      return;
    }
    if (!isValidEmail(form.email) || !form.responsavelNome.trim() || onlyDigits(form.telefone).length < 10) {
      showToast('Preencha responsável, e-mail e telefone válidos', 'warn');
      return;
    }
    const check = validatePasswordForm(form.password, form.confirmPassword, { requireComplexity: true });
    if (!check.ok) {
      showToast(check.message, 'warn');
      return;
    }
    void (async () => {
      setLoading(true);
      try {
        const res = await apiSubmitTenantRequest({
          tipoCadastro: 'EMPRESA',
          razaoSocial: form.razaoSocial.trim(),
          nomeFantasia: form.nomeFantasia.trim() || form.razaoSocial.trim(),
          cnpj: form.cnpj,
          segmento: form.segmento.trim() || 'Geral',
          quantidadeFuncionarios: Number(form.quantidadeFuncionarios) || undefined,
          responsavelNome: form.responsavelNome.trim(),
          email: form.email.trim(),
          telefone: form.telefone.trim(),
          password: form.password,
          confirmPassword: form.confirmPassword,
        });
        setProtocolo(res.protocolo);
        showToast('Solicitação registrada!', 'success');
      } catch (err) {
        showToast(getErrorMessage(err, 'Erro ao enviar'), 'warn');
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
          <p className="access-form-intro">
            Após a aprovação, use o e-mail e a senha cadastrados. Você receberá um link para ativar a conta.
          </p>
          <button type="button" className="btn bp mt12" onClick={() => go('login')}>Voltar ao login</button>
        </div>
      </PublicFormShell>
    );
  }

  return (
    <PublicFormShell title="Cadastrar empresa" onBack={() => go('login')}>
      <p className="access-form-intro">Solicite acesso ao ErgoSense para sua organização. Análise em até 2 dias úteis.</p>
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
      <input className="inp" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" />
      <label className="lbl">Telefone *</label>
      <input className="inp" value={form.telefone} onChange={(e) => set('telefone', formatPhoneInput(e.target.value))} placeholder="(11) 99999-9999" />
      <label className="lbl">Senha de acesso *</label>
      <PasswordField
        value={form.password}
        onChange={(e) => set('password', e.target.value)}
        placeholder="Mín. 8 · maiúscula, minúscula e número"
        autoComplete="new-password"
      />
      <label className="lbl">Confirmar senha *</label>
      <PasswordField
        value={form.confirmPassword}
        onChange={(e) => set('confirmPassword', e.target.value)}
        placeholder="Repita a senha"
        autoComplete="new-password"
      />
      <button type="button" className="btn bp mt12" disabled={loading} onClick={handleSubmit}>
        {loading ? 'Enviando…' : 'Enviar solicitação'}
      </button>
    </PublicFormShell>
  );
}

export function AutonomoRequestAccessScreen() {
  const { go, showToast } = useApp();
  const [form, setForm] = useState({
    nomeCompleto: '',
    cpf: '',
    areaAtuacao: '',
    email: '',
    telefone: '',
    password: '',
    confirmPassword: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
  });
  const [protocolo, setProtocolo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleCepBlur = () => {
    const digits = onlyDigits(form.cep, 8);
    if (digits.length !== 8) return;
    void (async () => {
      setCepLoading(true);
      try {
        const addr = await lookupCep(digits);
        if (!addr) {
          showToast('CEP não encontrado', 'warn');
          return;
        }
        setForm((f) => ({
          ...f,
          logradouro: addr.logradouro || f.logradouro,
          bairro: addr.bairro || f.bairro,
          cidade: addr.cidade || f.cidade,
          estado: addr.estado || f.estado,
          complemento: addr.complemento && !f.complemento ? addr.complemento : f.complemento,
        }));
      } catch {
        showToast('Não foi possível consultar o CEP', 'warn');
      } finally {
        setCepLoading(false);
      }
    })();
  };

  const handleSubmit = () => {
    if (!form.nomeCompleto.trim() || !isValidCpfDigits(form.cpf)) {
      showToast('Informe nome completo e CPF válido', 'warn');
      return;
    }
    if (!isValidEmail(form.email) || onlyDigits(form.telefone).length < 10) {
      showToast('Preencha e-mail e telefone válidos', 'warn');
      return;
    }
    const check = validatePasswordForm(form.password, form.confirmPassword, { requireComplexity: true });
    if (!check.ok) {
      showToast(check.message, 'warn');
      return;
    }
    if (
      onlyDigits(form.cep).length !== 8 ||
      !form.logradouro.trim() ||
      !form.numero.trim() ||
      !form.bairro.trim() ||
      !form.cidade.trim() ||
      form.estado.trim().length !== 2
    ) {
      showToast('Preencha o endereço completo (CEP, logradouro, nº, bairro, cidade e UF)', 'warn');
      return;
    }
    void (async () => {
      setLoading(true);
      try {
        const res = await apiSubmitTenantRequest({
          tipoCadastro: 'AUTONOMO',
          razaoSocial: form.nomeCompleto.trim(),
          nomeFantasia: form.nomeCompleto.trim(),
          cpf: form.cpf,
          segmento: form.areaAtuacao.trim() || 'Autônomo',
          industria: form.areaAtuacao.trim() || 'Autônomo',
          quantidadeFuncionarios: 1,
          responsavelNome: form.nomeCompleto.trim(),
          email: form.email.trim(),
          telefone: form.telefone.trim(),
          password: form.password,
          confirmPassword: form.confirmPassword,
          cep: form.cep,
          logradouro: form.logradouro.trim(),
          numero: form.numero.trim(),
          complemento: form.complemento.trim() || undefined,
          bairro: form.bairro.trim(),
          cidade: form.cidade.trim(),
          estado: form.estado.trim().toUpperCase(),
        });
        setProtocolo(res.protocolo);
        showToast('Cadastro enviado!', 'success');
      } catch (err) {
        showToast(getErrorMessage(err, 'Erro ao enviar'), 'warn');
      } finally {
        setLoading(false);
      }
    })();
  };

  if (protocolo) {
    return (
      <PublicFormShell title="Cadastro enviado" onBack={() => go('login')}>
        <div className="hl" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <p>Protocolo:</p>
          <div style={{ fontFamily: 'var(--fm)', fontSize: 20, color: 'var(--amber)', margin: '12px 0' }}>{protocolo}</div>
          <p className="access-form-intro">
            Após a aprovação, use o e-mail e a senha cadastrados. Você receberá um link para ativar o MFA.
          </p>
          <button type="button" className="btn bp mt12" onClick={() => go('login')}>Voltar ao login</button>
        </div>
      </PublicFormShell>
    );
  }

  return (
    <PublicFormShell title="Cadastro de autônomo" onBack={() => go('login')}>
      <p className="access-form-intro">
        Cadastro com CPF. Análise em até 2 dias úteis.
      </p>

      <label className="lbl">Nome completo *</label>
      <input className="inp" value={form.nomeCompleto} onChange={(e) => set('nomeCompleto', e.target.value)} />

      <div className="form-row">
        <div className="form-field">
          <label className="lbl">CPF *</label>
          <input
            className="inp"
            value={form.cpf}
            onChange={(e) => set('cpf', formatCpfInput(e.target.value))}
            placeholder="000.000.000-00"
            inputMode="numeric"
          />
        </div>
        <div className="form-field">
          <label className="lbl">Telefone *</label>
          <input
            className="inp"
            value={form.telefone}
            onChange={(e) => set('telefone', formatPhoneInput(e.target.value))}
            placeholder="(11) 99999-9999"
            inputMode="tel"
          />
        </div>
      </div>

      <label className="lbl">Área de atuação *</label>
      <input
        className="inp"
        value={form.areaAtuacao}
        onChange={(e) => set('areaAtuacao', e.target.value)}
        placeholder="Ex.: Ergonomia, Fisioterapia, SST"
      />

      <label className="lbl">E-mail *</label>
      <input className="inp" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" />

      <label className="lbl">Senha de acesso *</label>
      <PasswordField
        value={form.password}
        onChange={(e) => set('password', e.target.value)}
        placeholder="Mín. 8 · maiúscula, minúscula e número"
        autoComplete="new-password"
      />

      <label className="lbl">Confirmar senha *</label>
      <PasswordField
        value={form.confirmPassword}
        onChange={(e) => set('confirmPassword', e.target.value)}
        placeholder="Repita a senha"
        autoComplete="new-password"
      />

      <div className="form-row form-row--cep">
        <div className="form-field">
          <label className="lbl">CEP *</label>
          <input
            className="inp"
            value={form.cep}
            onChange={(e) => set('cep', formatCepInput(e.target.value))}
            onBlur={handleCepBlur}
            placeholder="00000-000"
            inputMode="numeric"
          />
        </div>
        <div className="form-field">
          <label className="lbl">UF *</label>
          <input
            className="inp"
            value={form.estado}
            onChange={(e) => set('estado', e.target.value.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase())}
            placeholder="SP"
            maxLength={2}
          />
        </div>
      </div>
      {cepLoading && <p className="t2">Consultando CEP…</p>}

      <label className="lbl">Logradouro *</label>
      <input className="inp" value={form.logradouro} onChange={(e) => set('logradouro', e.target.value)} placeholder="Rua, avenida…" />

      <div className="form-row form-row--num">
        <div className="form-field">
          <label className="lbl">Número *</label>
          <input className="inp" value={form.numero} onChange={(e) => set('numero', e.target.value)} />
        </div>
        <div className="form-field">
          <label className="lbl">Complemento</label>
          <input className="inp" value={form.complemento} onChange={(e) => set('complemento', e.target.value)} placeholder="Apto, sala…" />
        </div>
      </div>

      <div className="form-row">
        <div className="form-field">
          <label className="lbl">Bairro *</label>
          <input className="inp" value={form.bairro} onChange={(e) => set('bairro', e.target.value)} />
        </div>
        <div className="form-field">
          <label className="lbl">Cidade *</label>
          <input className="inp" value={form.cidade} onChange={(e) => set('cidade', e.target.value)} />
        </div>
      </div>

      <button type="button" className="btn bp mt12" disabled={loading} onClick={handleSubmit}>
        {loading ? 'Enviando…' : 'Enviar cadastro'}
      </button>
    </PublicFormShell>
  );
}

export function ActivateAccountScreen() {
  const { go, showToast } = useApp();
  const token = useMemo(() => new URLSearchParams(window.location.search).get('token') ?? '', []);
  const [preview, setPreview] = useState<{
    email: string;
    companyName: string;
    qrDataUrl: string;
    passwordPreset?: boolean;
  } | null>(null);
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
    const passwordPreset = Boolean(preview?.passwordPreset);
    if (!passwordPreset) {
      const check = validatePasswordForm(password, confirm);
      if (!check.ok) {
        showToast(check.message, 'warn');
        return;
      }
    } else if (password || confirm) {
      if (password !== confirm) {
        showToast('Senhas não conferem', 'warn');
        return;
      }
    }
    if (!mfaCode.trim()) {
      showToast('Informe o código MFA do autenticador', 'warn');
      return;
    }
    void (async () => {
      setLoading(true);
      try {
        await apiActivateAccount({
          token,
          ...(password ? { password, confirmPassword: confirm } : {}),
          mfaCode: mfaCode.trim(),
        });
        showToast('Conta ativada! Faça login.', 'success');
        window.history.replaceState({}, '', '/');
        go('login');
      } catch (err) {
        showToast(getErrorMessage(err, 'Erro na ativação'), 'warn');
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
          {preview.passwordPreset ? (
            <p className="access-form-intro">2. Sua senha já foi definida no cadastro. Continuar para o MFA.</p>
          ) : (
            <>
              <label className="lbl">2. Nova senha *</label>
              <PasswordField
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
              <label className="lbl">Confirmar senha *</label>
              <PasswordField
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </>
          )}
          <label className="lbl">{preview.passwordPreset ? '2' : '3'}. Código MFA *</label>
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
    <div className="public-onboard">
      <div className="public-onboard-top">
        <button type="button" className="btn bp login-back-btn" onClick={onBack}>Voltar</button>
        <ErgoSenseLogo size="sm" showText className="ergo-logo--login" />
      </div>
      <div className="scroll public-onboard-scroll">
        <div className="hl public-onboard-card">
          <div className="public-onboard-title">{title}</div>
          {children}
        </div>
      </div>
    </div>
  );
}

const DEFAULT_SUPPORT_SUBJECTS = [
  'Dúvida sobre o produto',
  'Problema de acesso / login',
  'Solicitação comercial',
  'LGPD / privacidade',
  'Outro',
];

export function ContactSupportScreen() {
  const { go, showToast, session } = useApp();
  const backScreen = session ? 'settings' : 'login';
  const [supportEmail, setSupportEmail] = useState('ergosense.suporte@dejohn.com.br');
  const [subjects, setSubjects] = useState<string[]>(DEFAULT_SUPPORT_SUBJECTS);
  const [loading, setLoading] = useState(false);
  const [protocolo, setProtocolo] = useState('');
  const [form, setForm] = useState({
    nome: '',
    email: '',
    telefone: '',
    empresa: '',
    assunto: DEFAULT_SUPPORT_SUBJECTS[0],
    mensagem: '',
  });

  useEffect(() => {
    void apiGetSupportContactInfo()
      .then((info) => {
        if (info.supportEmail) setSupportEmail(info.supportEmail);
        if (info.subjects?.length) {
          setSubjects(info.subjects);
          setForm((f) => ({ ...f, assunto: info.subjects[0] }));
        }
      })
      .catch(() => {
        /* mantém defaults offline */
      });
  }, []);

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = () => {
    void (async () => {
      if (!form.nome.trim() || !form.email.trim() || !form.mensagem.trim()) {
        showToast('Preencha nome, e-mail e mensagem', 'warn');
        return;
      }
      setLoading(true);
      try {
        const res = await apiSubmitSupportContact({
          nome: form.nome.trim(),
          email: form.email.trim(),
          telefone: form.telefone.trim() || undefined,
          empresa: form.empresa.trim() || undefined,
          assunto: form.assunto.trim(),
          mensagem: form.mensagem.trim(),
        });
        setProtocolo(res.protocolo);
        if (res.supportEmail) setSupportEmail(res.supportEmail);
        showToast('Mensagem enviada ao suporte', 'success');
      } catch (err) {
        showToast(getErrorMessage(err, 'Erro ao enviar'), 'warn');
      } finally {
        setLoading(false);
      }
    })();
  };

  if (protocolo) {
    return (
      <PublicFormShell title="Mensagem enviada" onBack={() => go(backScreen)}>
        <div className="hl" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <p>Protocolo de atendimento:</p>
          <div style={{ fontFamily: 'var(--fm)', fontSize: 20, color: 'var(--amber)', margin: '12px 0' }}>{protocolo}</div>
          <p className="access-form-intro">
            Sua mensagem foi registrada para a equipe de suporte em{' '}
            <strong>{supportEmail}</strong>. Retornaremos o mais breve possível.
          </p>
          <button type="button" className="btn bp mt12" onClick={() => go(backScreen)}>
            {session ? 'Voltar às configurações' : 'Voltar ao login'}
          </button>
        </div>
      </PublicFormShell>
    );
  }

  return (
    <PublicFormShell title="Falar com o suporte" onBack={() => go(backScreen)}>
      <p className="access-form-intro">
        Canal oficial: <strong>{supportEmail}</strong>. Descreva sua dúvida ou problema e nossa equipe responde
        com base no protocolo gerado.
      </p>
      <label className="lbl">Nome *</label>
      <input className="inp" value={form.nome} onChange={(e) => set('nome', e.target.value)} autoComplete="name" />
      <label className="lbl">E-mail *</label>
      <input
        className="inp"
        type="email"
        value={form.email}
        onChange={(e) => set('email', e.target.value)}
        autoComplete="email"
      />
      <label className="lbl">Telefone</label>
      <input
        className="inp"
        value={form.telefone}
        onChange={(e) => set('telefone', formatPhoneInput(e.target.value))}
        placeholder="(11) 99999-9999"
        autoComplete="tel"
      />
      <label className="lbl">Empresa</label>
      <input className="inp" value={form.empresa} onChange={(e) => set('empresa', e.target.value)} />
      <label className="lbl">Assunto *</label>
      <select className="inp" value={form.assunto} onChange={(e) => set('assunto', e.target.value)}>
        {subjects.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <label className="lbl">Mensagem *</label>
      <textarea
        className="inp"
        rows={5}
        value={form.mensagem}
        onChange={(e) => set('mensagem', e.target.value)}
        placeholder="Descreva o problema ou a dúvida com o máximo de detalhes possível."
        style={{ resize: 'vertical', minHeight: 120 }}
      />
      <button type="button" className="btn bp mt12" disabled={loading} onClick={handleSubmit}>
        {loading ? 'Enviando…' : 'Enviar para o suporte'}
      </button>
    </PublicFormShell>
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
        <button type="button" className="btn bs btn-sm btn-inline" onClick={load}>Filtrar</button>
      </div>
      <div className="admin-table">
        {items.map((item) => (
          <div key={item.id} className="admin-row">
            <div>
              <strong>{item.protocolo}</strong>
              <div className="t2">
                {item.tipoCadastro === 'AUTONOMO' ? 'Autônomo · ' : ''}
                {item.razaoSocial}
              </div>
            </div>
            <div>{item.tipoCadastro === 'AUTONOMO' ? (item.cpf || '—') : (item.cnpj || '—')}</div>
            <div>{item.responsavelNome}</div>
            <div>{new Date(item.dataSolicitacao).toLocaleDateString('pt-BR')}</div>
            <div><span className={`badge ${statusBadge(item.status)}`}>{item.status}</span></div>
            <div className="admin-row-actions">
              <button
                type="button"
                className="btn bs btn-sm btn-inline"
                onClick={() => {
                  sessionStorage.setItem('ergosense_admin_request_id', item.id);
                  go('admin-tenant-request-detail');
                }}
              >
                Exibir
              </button>
            </div>
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
          Tipo: item.tipoCadastro === 'AUTONOMO' ? 'Autônomo (PF)' : 'Empresa (PJ)',
          'Razão Social / Nome': item.razaoSocial,
          'Nome Fantasia': item.nomeFantasia,
          ...(item.tipoCadastro === 'AUTONOMO'
            ? { CPF: item.cpf }
            : { CNPJ: item.cnpj }),
          Segmento: item.segmento,
          Funcionários: item.quantidadeFuncionarios,
          CEP: item.cep,
          Logradouro: item.logradouro,
          Número: item.numero,
          Complemento: item.complemento,
          Bairro: item.bairro,
          Cidade: item.cidade,
          UF: item.estado,
          Endereço: item.endereco,
          Responsável: item.responsavelNome,
          'E-mail': item.email,
          Telefone: item.telefone,
          Plano: item.plano,
          Status: item.status,
        }).map(([k, v]) => (
          <div key={k} style={{ marginBottom: 8 }}><span className="lbl">{k}</span><div>{v ?? '—'}</div></div>
        ))}
      </div>
      {['PENDENTE', 'EM_ANALISE', 'REJEITADO'].includes(item.status) && (
        <div className="admin-actions mt12">
          {item.status === 'REJEITADO' && (
            <p className="access-form-intro">
              Solicitação rejeitada. Após as correções, aprove diretamente ou reabra para análise.
            </p>
          )}
          <button
            type="button"
            className="btn bp btn-sm btn-inline"
            onClick={() =>
              void apiApproveTenantRequest(item.id)
                .then((r) => {
                  showToast(`Aprovado! Tenant: ${r.tenantId}`, 'success');
                  go('admin-tenant-requests');
                })
                .catch((e) => showToast(e instanceof Error ? e.message : 'Erro ao aprovar', 'warn'))
            }
          >
            {item.status === 'REJEITADO' ? 'Aceitar após correção' : 'Aprovar'}
          </button>
          {['PENDENTE', 'EM_ANALISE'].includes(item.status) && (
            <>
              <input
                className="inp mt8"
                placeholder="Motivo rejeição"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
              <button
                type="button"
                className="btn br btn-sm btn-inline mt8"
                onClick={() =>
                  void apiRejectTenantRequest(item.id, rejectReason)
                    .then(() => go('admin-tenant-requests'))
                    .catch((e) => showToast(e instanceof Error ? e.message : 'Erro ao rejeitar', 'warn'))
                }
              >
                Rejeitar
              </button>
            </>
          )}
          <input
            className="inp mt8"
            placeholder={item.status === 'REJEITADO' ? 'Mensagem ao reabrir (opcional)' : 'Mensagem de ajuste'}
            value={adjustMsg}
            onChange={(e) => setAdjustMsg(e.target.value)}
          />
          <button
            type="button"
            className="btn bs btn-sm btn-inline mt8"
            onClick={() =>
              void apiRequestTenantAdjustment(
                item.id,
                adjustMsg || (item.status === 'REJEITADO' ? 'Reaberta após correções' : 'Ajuste solicitado'),
              )
                .then(() => apiAdminTenantRequestDetail(item.id))
                .then((updated) => {
                  setItem(updated);
                  showToast(item.status === 'REJEITADO' ? 'Solicitação reaberta' : 'Ajuste solicitado', 'success');
                })
                .catch((e) => showToast(e instanceof Error ? e.message : 'Erro', 'warn'))
            }
          >
            {item.status === 'REJEITADO' ? 'Reabrir análise' : 'Solicitar ajuste'}
          </button>
        </div>
      )}
    </AdminTenantShell>
  );
}

export function AdminTenantsListScreen({ filter }: { filter: 'active' | 'blocked' | 'expired' }) {
  const { go, showToast, showModal } = useApp();
  const [items, setItems] = useState<
    Array<{ id: string; name: string; plan: string; statusConta: string; userCount: number }>
  >([]);
  const titles = { active: 'Empresas Ativas', blocked: 'Empresas Bloqueadas', expired: 'Empresas Expiradas' };
  const nav = { active: 'active' as const, blocked: 'blocked' as const, expired: 'expired' as const };

  const reload = useCallback(() => {
    void apiListAdminTenants(filter).then(setItems).catch(() => showToast('Erro ao carregar', 'warn'));
  }, [filter, showToast]);

  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <AdminTenantShell active={nav[filter]} title={titles[filter]}>
      <div className="admin-table">
        {items.map((t) => (
          <div key={t.id} className="admin-row">
            <div>
              <strong>{t.name}</strong>
              <div className="t2">{t.id}</div>
            </div>
            <div>{t.plan}</div>
            <div>{t.userCount} usuários</div>
            <div>
              <span className="badge bn">{t.statusConta}</span>
            </div>
            <div className="admin-row-actions">
              <button
                type="button"
                className="btn bs btn-sm btn-inline"
                onClick={() => {
                  sessionStorage.setItem('ergosense_admin_tenant_id', t.id);
                  go('admin-tenant-detail');
                }}
              >
                Ver / Editar
              </button>
              {filter !== 'active' && (
                <button
                  type="button"
                  className="btn bs btn-sm btn-inline"
                  onClick={() =>
                    void apiGrantAdminTenantAccess(t.id, { paymentNote: 'Reativação admin' }).then(() => {
                      showToast('Acesso liberado', 'success');
                      reload();
                    })
                  }
                >
                  Liberar
                </button>
              )}
              {filter === 'active' && (
                <>
                  <button
                    type="button"
                    className="btn bd btn-sm btn-inline"
                    onClick={() => {
                      const reason = window.prompt('Motivo da desativação:') ?? '';
                      if (reason.trim().length < 3) return;
                      void apiDeactivateAdminTenant(t.id, reason).then(() => {
                        showToast('Acesso desativado', 'success');
                        reload();
                      });
                    }}
                  >
                    Desativar
                  </button>
                  <button
                    type="button"
                    className="btn br btn-sm btn-inline"
                    onClick={() => {
                      showModal('Bloquear empresa', `Bloquear ${t.name}? O login será impedido.`, 'Bloquear', () => {
                        void apiBlockAdminTenant(t.id, 'Bloqueio admin').then(() => {
                          showToast('Bloqueada', 'success');
                          reload();
                        });
                      });
                    }}
                  >
                    Bloquear
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </AdminTenantShell>
  );
}

/** Painel comercial: liberar após pagamento, desativar e bloquear */
export function AdminAccessControlScreen() {
  const { showToast, showModal } = useApp();
  const [tab, setTab] = useState<'pending' | 'active' | 'blocked'>('pending');
  const [items, setItems] = useState<
    Array<{
      id: string;
      name: string;
      plan: string;
      statusConta: string;
      userCount: number;
      blockedReason?: string | null;
    }>
  >([]);
  const [paymentNote, setPaymentNote] = useState('Pagamento confirmado');
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = useCallback(() => {
    void apiListAdminTenants(tab)
      .then(setItems)
      .catch(() => showToast('Erro ao carregar empresas', 'warn'));
  }, [tab, showToast]);

  useEffect(() => {
    reload();
  }, [reload]);

  const run = async (id: string, action: () => Promise<unknown>, okMsg: string) => {
    setBusyId(id);
    try {
      await action();
      showToast(okMsg, 'success');
      reload();
    } catch (err) {
      showToast(getErrorMessage(err, 'Falha na operação'), 'warn');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminTenantShell active="access" title="Controle de Acesso">
      <p className="t2 mb16">
        Fluxo comercial: cliente contrata e paga → admin global libera o acesso. Use Desativar para pausar o
        contrato ou Bloquear em casos de inadimplência / violação.
      </p>

      <div className="admin-tabs mb16">
        {(
          [
            ['pending', 'Aguardando liberação'],
            ['active', 'Ativas'],
            ['blocked', 'Bloqueadas / suspensas'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`admin-tab ${tab === id ? 'on' : ''}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'pending' && (
        <div className="mb16">
          <label className="lbl">Nota do pagamento (ao liberar)</label>
          <input
            className="inp"
            value={paymentNote}
            onChange={(e) => setPaymentNote(e.target.value)}
            placeholder="Ex.: PIX confirmado em 12/07 — plano Professional"
          />
        </div>
      )}

      {items.length === 0 ? (
        <div className="admin-empty">
          <p>Nenhuma empresa neste filtro.</p>
        </div>
      ) : (
        <div className="admin-table">
          {items.map((t) => (
            <div key={t.id} className="admin-row">
              <div>
                <strong>{t.name}</strong>
                <div className="t2">{t.id}</div>
                {t.blockedReason && <div className="t2">Motivo: {t.blockedReason}</div>}
              </div>
              <div>{t.plan}</div>
              <div>{t.userCount} usuários</div>
              <div>
                <span className={`badge ${t.statusConta === 'ATIVO' ? 'bg' : 'ba'}`}>{t.statusConta}</span>
              </div>
              <div className="admin-row-actions" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(tab === 'pending' || tab === 'blocked') && (
                  <button
                    type="button"
                    className="btn bp btn-sm btn-inline"
                    disabled={busyId === t.id}
                    onClick={() =>
                      showModal(
                        'Liberar acesso',
                        `Confirmar liberação de ${t.name} após pagamento?`,
                        'Liberar',
                        () => {
                          void run(
                            t.id,
                            () => apiGrantAdminTenantAccess(t.id, { paymentNote: paymentNote || undefined }),
                            'Acesso liberado',
                          );
                        },
                      )
                    }
                  >
                    Liberar acesso
                  </button>
                )}
                {tab === 'active' && (
                  <>
                    <button
                      type="button"
                      className="btn bd btn-sm btn-inline"
                      disabled={busyId === t.id}
                      onClick={() => {
                        const reason = window.prompt('Motivo da desativação (mín. 3 caracteres):') ?? '';
                        if (reason.trim().length < 3) return;
                        void run(t.id, () => apiDeactivateAdminTenant(t.id, reason), 'Desativada');
                      }}
                    >
                      Desativar
                    </button>
                    <button
                      type="button"
                      className="btn br btn-sm btn-inline"
                      disabled={busyId === t.id}
                      onClick={() => {
                        const reason = window.prompt('Motivo do bloqueio:') ?? '';
                        if (reason.trim().length < 3) return;
                        void run(t.id, () => apiBlockAdminTenant(t.id, reason), 'Bloqueada');
                      }}
                    >
                      Bloquear
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminTenantShell>
  );
}

function AdminTenantShell({ active, title, children }: { active: string; title: string; children: React.ReactNode }) {
  const { go, session, logout, showModal } = useApp();
  const nav = [
    { id: 'access', label: 'Controle de Acesso', screen: 'admin-access-control' as const },
    { id: 'requests', label: 'Solicitações', screen: 'admin-tenant-requests' as const },
    { id: 'active', label: 'Empresas Ativas', screen: 'admin-tenants-active' as const },
    { id: 'blocked', label: 'Empresas Bloqueadas', screen: 'admin-tenants-blocked' as const },
    { id: 'expired', label: 'Empresas Expiradas', screen: 'admin-tenants-expired' as const },
  ];

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <ErgoSenseLogo size="md" showText showTagline className="ergo-logo--admin" />
        </div>
        <nav className="admin-nav">
          <button type="button" className="admin-nav-item" onClick={() => go('global-admin')}>
            ← Painel global
          </button>
          {nav.map((n) => (
            <button
              key={n.id}
              type="button"
              className={`admin-nav-item ${active === n.id ? 'on' : ''}`}
              onClick={() => go(n.screen)}
            >
              {n.label}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-foot">
          <div className="admin-user-name">{session?.name}</div>
          <button
            type="button"
            className="admin-nav-item admin-nav-item--danger"
            onClick={() => showModal('Sair', 'Encerrar sessão?', 'Sim', logout)}
          >
            Sair
          </button>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <h1 className="admin-topbar-title">{title}</h1>
        </header>
        <div className="admin-content scroll">{children}</div>
      </div>
    </div>
  );
}

function toDateInput(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export function AdminTenantDetailScreen() {
  const { go, showToast, refreshCompanies } = useApp();
  const tenantId = sessionStorage.getItem('ergosense_admin_tenant_id') ?? '';
  const [item, setItem] = useState<AdminTenantDetail | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    industry: '',
    plan: 'STARTER' as 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE',
    expiresAt: '',
    icon: '🏢',
    color: 'amber' as 'amber' | 'cyan' | 'green' | 'neutral',
    razaoSocial: '',
    nomeFantasia: '',
    cnpj: '',
    inscricaoEstadual: '',
  });

  const load = useCallback(() => {
    if (!tenantId) return;
    void apiGetAdminTenant(tenantId)
      .then((data) => {
        setItem(data);
        setForm({
          name: data.name ?? '',
          industry: data.industry ?? '',
          plan: (data.plan as 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE') || 'STARTER',
          expiresAt: toDateInput(data.expiresAt),
          icon: data.icon || '🏢',
          color: (data.color as 'amber' | 'cyan' | 'green' | 'neutral') || 'amber',
          razaoSocial: data.razaoSocial ?? data.name ?? '',
          nomeFantasia: data.nomeFantasia ?? '',
          cnpj: data.cnpj ?? '',
          inscricaoEstadual: data.inscricaoEstadual ?? '',
        });
      })
      .catch(() => showToast('Erro ao carregar empresa', 'warn'));
  }, [showToast, tenantId]);

  useEffect(() => {
    load();
  }, [load]);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    if (!tenantId) return;
    if (form.name.trim().length < 2) {
      showToast('Informe o nome da empresa', 'warn');
      return;
    }
    setSaving(true);
    try {
      const updated = await apiUpdateAdminTenant(tenantId, {
        name: form.name.trim(),
        industry: form.industry.trim(),
        plan: form.plan,
        expiresAt: form.expiresAt ? new Date(`${form.expiresAt}T23:59:59.000Z`).toISOString() : null,
        icon: form.icon.trim() || '🏢',
        color: form.color,
        razaoSocial: form.razaoSocial.trim() || form.name.trim(),
        nomeFantasia: form.nomeFantasia.trim() || null,
        cnpj: form.cnpj.trim() || null,
        inscricaoEstadual: form.inscricaoEstadual.trim() || null,
      });
      setItem(updated);
      setEditing(false);
      showToast('Empresa atualizada', 'success');
      void refreshCompanies();
    } catch (err) {
      showToast(getErrorMessage(err, 'Erro ao salvar'), 'warn');
    } finally {
      setSaving(false);
    }
  };

  if (!tenantId) {
    return (
      <AdminTenantShell active="empresas" title="Empresa">
        <p>Nenhuma empresa selecionada.</p>
        <button type="button" className="btn bs btn-sm btn-inline" onClick={() => go('global-admin')}>
          Voltar
        </button>
      </AdminTenantShell>
    );
  }

  if (!item) {
    return (
      <AdminTenantShell active="empresas" title="Empresa">
        <p>Carregando…</p>
      </AdminTenantShell>
    );
  }

  return (
    <AdminTenantShell active="empresas" title={item.name}>
      <div className="admin-toolbar" style={{ marginBottom: 16 }}>
        <button type="button" className="btn bs btn-sm btn-inline" onClick={() => go('global-admin')}>
          ← Voltar
        </button>
        {!editing ? (
          <button type="button" className="btn bp btn-sm btn-inline" onClick={() => setEditing(true)}>
            Editar dados
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn bp btn-sm btn-inline" disabled={saving} onClick={() => void save()}>
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
            <button
              type="button"
              className="btn bs btn-sm btn-inline"
              disabled={saving}
              onClick={() => {
                setEditing(false);
                load();
              }}
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      <div className="hl mb12">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 28 }}>{item.icon}</span>
          <div>
            <div style={{ fontFamily: 'var(--fd)', fontWeight: 800, fontSize: 18 }}>{item.name}</div>
            <div className="t2">{item.id}</div>
          </div>
          <span
            className={`badge ${item.statusConta === 'ATIVO' ? 'bl' : item.blocked ? 'br' : 'ba'}`}
            style={{ marginLeft: 'auto' }}
          >
            {item.statusConta}
          </span>
        </div>
      </div>

      {!editing ? (
        <>
          <div className="card mb12">
            <div className="stl mb8">Cadastro</div>
            {[
              ['Nome exibido', item.name],
              ['Razão social', item.razaoSocial],
              ['Nome fantasia', item.nomeFantasia || '—'],
              ['CNPJ', item.cnpj || '—'],
              ['Inscrição estadual', item.inscricaoEstadual || '—'],
              ['Segmento / indústria', item.industry || '—'],
              ['Plano', item.plan],
              ['Ícone', item.icon],
              ['Cor', item.color],
              ['Usuários', String(item.userCount)],
              ['Expira em', item.expiresAt ? new Date(item.expiresAt).toLocaleDateString('pt-BR') : '—'],
              ['Criada em', item.createdAt ? new Date(item.createdAt).toLocaleString('pt-BR') : '—'],
              ['Atualizada em', item.updatedAt ? new Date(item.updatedAt).toLocaleString('pt-BR') : '—'],
              ['Bloqueada', item.blocked ? `Sim — ${item.blockedReason || 'sem motivo'}` : 'Não'],
              [
                'Suporte',
                item.supportAuthorized
                  ? `Autorizado até ${item.supportExpiresAt ? new Date(item.supportExpiresAt).toLocaleString('pt-BR') : '—'}`
                  : 'Não autorizado',
              ],
            ].map(([k, v]) => (
              <div key={String(k)} style={{ marginBottom: 8 }}>
                <span className="lbl">{k}</span>
                <div>{v}</div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="stl mb8">Usuários da empresa</div>
            {!item.admins?.length ? (
              <p className="t2">Nenhum usuário cadastrado.</p>
            ) : (
              item.admins.map((u) => (
                <div key={u.id} className="admin-row" style={{ padding: '8px 0' }}>
                  <div>
                    <strong>{u.name}</strong>
                    <div className="t2">{u.email}</div>
                  </div>
                  <div>{u.role}</div>
                  <div>{u.title || '—'}</div>
                  <div>
                    <span className={`badge ${u.active ? 'bl' : 'br'}`}>{u.active ? 'ATIVO' : 'INATIVO'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <div className="card">
          <div className="stl mb8">Editar cadastro</div>
          <label className="lbl">Nome exibido *</label>
          <input className="inp" value={form.name} onChange={(e) => set('name', e.target.value)} />
          <label className="lbl">Razão social</label>
          <input className="inp" value={form.razaoSocial} onChange={(e) => set('razaoSocial', e.target.value)} />
          <label className="lbl">Nome fantasia</label>
          <input className="inp" value={form.nomeFantasia} onChange={(e) => set('nomeFantasia', e.target.value)} />
          <label className="lbl">CNPJ</label>
          <input className="inp" value={form.cnpj} onChange={(e) => set('cnpj', formatCnpjInput(e.target.value))} />
          <label className="lbl">Inscrição estadual</label>
          <input
            className="inp"
            value={form.inscricaoEstadual}
            onChange={(e) => set('inscricaoEstadual', e.target.value)}
          />
          <label className="lbl">Segmento / indústria</label>
          <input className="inp" value={form.industry} onChange={(e) => set('industry', e.target.value)} />
          <label className="lbl">Plano</label>
          <select className="inp" value={form.plan} onChange={(e) => set('plan', e.target.value as typeof form.plan)}>
            <option value="STARTER">STARTER</option>
            <option value="PROFESSIONAL">PROFESSIONAL</option>
            <option value="ENTERPRISE">ENTERPRISE</option>
          </select>
          <label className="lbl">Expira em</label>
          <input
            className="inp"
            type="date"
            value={form.expiresAt}
            onChange={(e) => set('expiresAt', e.target.value)}
          />
          <label className="lbl">Ícone (emoji)</label>
          <input className="inp" value={form.icon} onChange={(e) => set('icon', e.target.value)} maxLength={8} />
          <label className="lbl">Cor</label>
          <select className="inp" value={form.color} onChange={(e) => set('color', e.target.value as typeof form.color)}>
            <option value="amber">amber</option>
            <option value="cyan">cyan</option>
            <option value="green">green</option>
            <option value="neutral">neutral</option>
          </select>
        </div>
      )}
    </AdminTenantShell>
  );
}
