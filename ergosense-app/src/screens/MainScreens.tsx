import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ErgoSenseLogo } from '../components/ErgoSenseLogo';
import { AnalysisCard } from '../components/UI';
import { countPostureRisks, riskBadgeClass, riskLabel } from '../utils/ergonomics';
import { vibrate } from '../hooks/useClock';
import type { Analysis } from '../types';

function analysisTimestamp(a: Analysis) {
  const [d, m, y] = a.date.split('/').map(Number);
  const [h, min] = a.time.split(':').map(Number);
  return new Date(y, m - 1, d, h, min).getTime();
}

function collaboratorGroupKey(a: Analysis) {
  return `${a.collaboratorId}::${a.setor}::${a.activity}`;
}

function activityShortLabel(activity: string) {
  const word = activity.split(' ').slice(-1)[0] ?? activity;
  return word.toLowerCase();
}

export function SplashScreen() {
  const { go } = useApp();

  return (
    <div className="home-screen">
      <div className="home-corner home-corner-tl" aria-hidden />
      <div className="home-corner home-corner-tr" aria-hidden />
      <div className="home-corner home-corner-bl" aria-hidden />
      <div className="home-corner home-corner-br" aria-hidden />
      <div className="home-content">
        <ErgoSenseLogo size="xl" showTagline className="ergo-logo--splash" />
        <p className="home-tagline">
          Análise ergonômica com IA para todas as atividades · Conformidade NR-17
        </p>
        <button type="button" className="btn bp home-enter-btn" onClick={() => go('login')}>
          Acessar o Sistema
        </button>
      </div>
      <div className="home-footer">
        <div className="home-footer-version">v1.0.0 MVP · Android · iOS · Tablet</div>
      </div>
    </div>
  );
}

export function LoginScreen() {
  const { login, verifyMfaLogin, showToast, go } = useApp();
  const [email, setEmail] = useState('lucas@vale.com.br');
  const [password, setPassword] = useState('ergo1234');
  const [mfaPending, setMfaPending] = useState<{ token: string; email: string; name: string } | null>(null);
  const [mfaCode, setMfaCode] = useState('');

  const handleLogin = async () => {
    const result = await login(email, password);
    if (result === false) return;
    if (result === true) return;
    setMfaPending({ token: result.mfaToken, email: result.email, name: result.name });
    setMfaCode('');
    showToast('Informe o código do autenticador', 'info');
  };

  const handleMfaVerify = async () => {
    if (!mfaPending) return;
    const ok = await verifyMfaLogin(mfaPending.token, mfaCode);
    if (ok) setMfaPending(null);
  };

  return (
    <>
      <div className="login-top">
        <button type="button" className="btn bp login-back-btn" onClick={() => go('splash')}>
          Voltar
        </button>
      </div>
      <div className="login-hero">
        <ErgoSenseLogo size="lg" showTagline className="ergo-logo--login" />
      </div>
      <div className="scroll" style={{ flex: 'none', paddingBottom: 'calc(30px + var(--safe-bot))' }}>
        <div className="hl">
          <div style={{ fontFamily: 'var(--fd)', fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 18 }}>
            {mfaPending ? 'Verificação MFA' : 'Acesso à Plataforma'}
          </div>
          {mfaPending ? (
            <>
              <p className="access-form-intro" style={{ marginBottom: 16 }}>
                Olá, <strong>{mfaPending.name}</strong>. Informe o código de 6 dígitos do autenticador.
              </p>
              <label className="lbl">Código MFA</label>
              <input
                className="inp"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                placeholder="000000"
              />
              <button type="button" className="btn bp mt12" onClick={() => void handleMfaVerify()}>
                Confirmar →
              </button>
              <button
                type="button"
                className="btn bs mt8"
                style={{ width: '100%' }}
                onClick={() => {
                  setMfaPending(null);
                  setMfaCode('');
                }}
              >
                Voltar ao login
              </button>
            </>
          ) : (
            <>
              <label className="lbl">E-mail corporativo</label>
              <input className="inp" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@empresa.com.br" />
              <label className="lbl">Senha</label>
              <input className="inp" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              <div style={{ textAlign: 'right', margin: '4px 0 18px' }}>
                <span style={{ fontSize: 12, color: 'var(--amber)', fontFamily: 'var(--fd)', fontWeight: 700, cursor: 'pointer', letterSpacing: '.5px', textTransform: 'uppercase' }} onClick={() => showToast('Link enviado para seu e-mail', 'success')}>
                  Esqueci a senha
                </span>
              </div>
              <button type="button" className="btn bp" onClick={() => void handleLogin()}>
                Entrar →
              </button>
              <div style={{ textAlign: 'center', marginTop: 14, fontSize: 13, color: 'var(--t1)' }}>
                Cadastrar empresa?{' '}
                <span style={{ color: 'var(--amber)', cursor: 'pointer', fontWeight: 600 }} onClick={() => go('request-access')}>
                  Solicitar acesso
                </span>
              </div>
              <div style={{ textAlign: 'center', marginTop: 8, fontSize: 12, color: 'var(--t2)' }}>
                Já tem convite?{' '}
                <span style={{ color: 'var(--amber)', cursor: 'pointer' }} onClick={() => go('employee-access-request')}>
                  Sou colaborador
                </span>
              </div>
            </>
          )}
        </div>
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <div style={{ fontSize: 9, fontFamily: 'var(--fd)', letterSpacing: 1.5, color: 'var(--t2)', textTransform: 'uppercase' }}>
            🔒 JWT · TLS 1.3 · SECURE STORAGE · LGPD
          </div>
        </div>
      </div>
    </>
  );
}

export function RequestAccessScreen() {
  const { go, showToast, submitAccessRequest } = useApp();
  const [form, setForm] = useState({
    name: '',
    email: '',
    funcao: '',
    matricula: '',
  });

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = () => {
    if (!form.name.trim()) {
      showToast('Informe o nome completo', 'warn');
      return;
    }
    if (!form.email.includes('@')) {
      showToast('Informe um e-mail válido', 'warn');
      return;
    }
    if (!form.funcao.trim()) {
      showToast('Informe a função', 'warn');
      return;
    }
    if (!form.matricula.trim()) {
      showToast('Informe a matrícula', 'warn');
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
        showToast('Solicitação enviada! Aguarde aprovação do administrador.', 'success');
        go('login');
      }
    })();
  };

  return (
    <>
      <div className="login-top">
        <button type="button" className="btn bp login-back-btn" onClick={() => go('login')}>
          Voltar
        </button>
      </div>
      <div className="login-hero login-hero--compact">
        <ErgoSenseLogo size="md" showText className="ergo-logo--login" />
      </div>
      <div className="scroll" style={{ flex: 'none', paddingBottom: 'calc(30px + var(--safe-bot))' }}>
        <div className="hl">
          <div style={{ fontFamily: 'var(--fd)', fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 8 }}>
            Solicitar acesso
          </div>
          <p className="access-form-intro">
            Preencha os dados abaixo. Um administrador analisará sua solicitação e enviará as credenciais por e-mail.
          </p>
          <label className="lbl">Nome completo *</label>
          <input
            className="inp"
            type="text"
            autoComplete="name"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Seu nome completo"
          />
          <label className="lbl">E-mail corporativo *</label>
          <input
            className="inp"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            placeholder="usuario@empresa.com.br"
          />
          <label className="lbl">Função *</label>
          <input
            className="inp"
            type="text"
            value={form.funcao}
            onChange={(e) => set('funcao', e.target.value)}
            placeholder="Ex.: Ergonomista, Técnico de SST"
          />
          <label className="lbl">Matrícula *</label>
          <input
            className="inp"
            type="text"
            inputMode="numeric"
            value={form.matricula}
            onChange={(e) => set('matricula', e.target.value)}
            placeholder="Número da matrícula"
          />
          <button type="button" className="btn bp mt12" onClick={handleSubmit}>
            Enviar solicitação
          </button>
          <button type="button" className="btn bs mt8" onClick={() => go('login')}>
            Já tenho acesso — Entrar
          </button>
        </div>
      </div>
    </>
  );
}

export function RegisterCompanyScreen() {
  const { go, showToast, registerCompany, isGlobalAdmin } = useApp();
  const [form, setForm] = useState({
    nome: '',
    industria: '',
    adminNome: '',
    adminEmail: '',
    adminPassword: '',
    adminPassword2: '',
  });
  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    if (!isGlobalAdmin) go('login');
  }, [isGlobalAdmin, go]);

  const handleSubmit = () => {
    if (!form.nome.trim() || !form.industria.trim()) {
      showToast('Informe nome e indústria da empresa', 'warn');
      return;
    }
    if (!form.adminNome.trim() || !form.adminEmail.includes('@')) {
      showToast('Informe responsável e e-mail válido', 'warn');
      return;
    }
    if (form.adminPassword.length < 8) {
      showToast('Senha com mínimo 8 caracteres (maiúscula, minúscula e número)', 'warn');
      return;
    }
    if (form.adminPassword !== form.adminPassword2) {
      showToast('Senhas não conferem', 'warn');
      return;
    }
    void (async () => {
      const ok = await registerCompany({
        nome: form.nome.trim(),
        industria: form.industria.trim(),
        adminNome: form.adminNome.trim(),
        adminEmail: form.adminEmail.trim(),
        adminPassword: form.adminPassword,
      });
      if (ok) go(isGlobalAdmin ? 'global-admin' : 'login');
    })();
  };

  const formFields = (
    <div className="hl admin-register-form">
      <div style={{ fontFamily: 'var(--fd)', fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 8 }}>
        Cadastrar empresa
      </div>
      <p className="access-form-intro">
        Registre uma nova empresa usuária no ErgoSense. O administrador da empresa poderá cadastrar funcionários e realizar avaliações ergonômicas NR-17.
      </p>
      <div className="admin-form-grid">
        <div className="admin-form-col">
          <label className="lbl">Nome da empresa *</label>
          <input className="inp" value={form.nome} onChange={(e) => set('nome', e.target.value)} placeholder="Ex.: Mineração ABC Ltda" />
          <label className="lbl">Indústria / segmento *</label>
          <input className="inp" value={form.industria} onChange={(e) => set('industria', e.target.value)} placeholder="Ex.: Mineração, Construção, Industrial" />
        </div>
        <div className="admin-form-col">
          <label className="lbl">Nome do responsável (admin) *</label>
          <input className="inp" value={form.adminNome} onChange={(e) => set('adminNome', e.target.value)} placeholder="Nome completo" />
          <label className="lbl">E-mail do administrador *</label>
          <input className="inp" type="email" value={form.adminEmail} onChange={(e) => set('adminEmail', e.target.value)} placeholder="admin@empresa.com.br" />
          <label className="lbl">Senha de acesso *</label>
          <input className="inp" type="password" value={form.adminPassword} onChange={(e) => set('adminPassword', e.target.value)} placeholder="Mínimo 8 caracteres" />
          <label className="lbl">Confirmar senha *</label>
          <input className="inp" type="password" value={form.adminPassword2} onChange={(e) => set('adminPassword2', e.target.value)} placeholder="Repita a senha" />
        </div>
      </div>
      <button type="button" className="btn bp mt12" onClick={handleSubmit}>
        Cadastrar empresa
      </button>
    </div>
  );

  if (isGlobalAdmin) {
    return (
      <div className="admin-form-shell">
        <div className="admin-form-panel">
          <div className="admin-form-back-row">
            <button type="button" className="btn bp login-back-btn" onClick={() => go('global-admin')}>
              ← Voltar ao painel
            </button>
          </div>
          <div className="login-hero login-hero--compact admin-form-hero">
            <ErgoSenseLogo size="md" showText className="ergo-logo--login" />
          </div>
          <div className="scroll" style={{ flex: 1, paddingBottom: 'calc(24px + var(--safe-bot))' }}>
            {formFields}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="login-top">
        <button type="button" className="btn bp login-back-btn" onClick={() => go('login')}>
          Voltar
        </button>
      </div>
      <div className="login-hero login-hero--compact">
        <ErgoSenseLogo size="md" showText className="ergo-logo--login" />
      </div>
      <div className="scroll" style={{ flex: 'none', paddingBottom: 'calc(30px + var(--safe-bot))' }}>
        {formFields}
      </div>
    </>
  );
}

export function CompanyScreen() {
  const { session, selectCompany, showToast, selectedCompanyId, companies } = useApp();
  const [search, setSearch] = useState('');
  const tenantCompanies = companies.filter((c) => c.id !== 'ergosense');
  const filtered = tenantCompanies.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  const colorStyles: Record<string, { bg: string; border: string }> = {
    amber: { bg: 'var(--a10)', border: 'var(--a35)' },
    cyan: { bg: 'var(--c10)', border: 'var(--c25)' },
    green: { bg: 'var(--g10)', border: 'var(--g25)' },
    neutral: { bg: 'var(--bg3)', border: 'var(--b1)' },
  };

  return (
    <>
      <div className="nav-hdr" style={{ paddingTop: 8 }}>
        <div className="nav-hdr-brand">
          <ErgoSenseLogo size="sm" showText />
          <div className="hdr-title">Selecionar Empresa</div>
        </div>
        <div style={{ width: 40 }} />
      </div>
      <div className="scroll">
        <div style={{ fontSize: 13, color: 'var(--t1)', marginBottom: 16 }}>
          Olá, {session?.name?.split(' ')[0] ?? 'Lucas'}. Selecione o tenant para acessar:
        </div>
        <input className="inp" placeholder="🔍  Buscar empresa..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <div style={{ fontFamily: 'var(--fd)', fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--t1)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 2, background: 'var(--amber)', display: 'inline-block' }} />
          EMPRESAS VINCULADAS
        </div>
        {filtered.map((c) => {
          const cs = colorStyles[c.color];
          const sel = c.id === selectedCompanyId;
          return (
            <button key={c.id} type="button" className={`cch ${sel ? 'sel' : ''}`} onClick={() => selectCompany(c.id)}>
              <div className="ci" style={{ background: cs.bg, border: `1px solid ${cs.border}` }}>
                {c.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--fd)', fontSize: 16, fontWeight: 700, color: 'var(--t0)' }}>{c.name}</div>
                <div style={{ fontSize: 12, color: 'var(--t1)' }}>
                  {c.industry}
                  {c.schema ? ` · Schema: ${c.schema}` : c.employees != null ? ` · ${c.employees} funcionários` : ''}
                </div>
                {c.active && (
                  <div className="badge bi mt4" style={{ fontSize: 9 }}>
                    ATIVO
                  </div>
                )}
              </div>
              <span style={{ fontSize: sel ? 22 : 18, color: sel ? 'var(--amber)' : 'var(--t2)' }}>{sel ? '✓' : '›'}</span>
            </button>
          );
        })}
        <div
          style={{ marginTop: 8, padding: 14, border: '1px dashed rgba(255,255,255,.07)', borderRadius: 14, textAlign: 'center', cursor: 'pointer' }}
          onClick={() => showToast('Solicitação enviada ao admin', 'info')}
        >
          <span style={{ fontSize: 13, fontFamily: 'var(--fd)', fontWeight: 700, color: 'var(--t2)', letterSpacing: 1, textTransform: 'uppercase' }}>
            + Solicitar acesso a nova empresa
          </span>
        </div>
      </div>
    </>
  );
}

export function DashboardScreen() {
  const { go, analyses, getStats, openAnalysis } = useApp();
  const [expandedRecent, setExpandedRecent] = useState<Record<string, boolean>>({});
  const stats = getStats();
  const dist = stats.riskDistribution;

  const recentGroups = useMemo(() => {
    const map = new Map<string, Analysis[]>();
    analyses.forEach((a) => {
      const key = collaboratorGroupKey(a);
      const list = map.get(key);
      if (list) list.push(a);
      else map.set(key, [a]);
    });
    return [...map.entries()]
      .map(([key, items]) => {
        const sorted = [...items].sort((x, y) => analysisTimestamp(y) - analysisTimestamp(x));
        return { key, items: sorted, latest: sorted[0] };
      })
      .sort((a, b) => analysisTimestamp(b.latest) - analysisTimestamp(a.latest))
      .slice(0, 6);
  }, [analyses]);

  const toggleRecentGroup = (key: string) => {
    setExpandedRecent((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <>
      <div className="scroll scroll--dashboard">
        {stats.critical > 0 && (
          <div style={{ background: 'var(--r10)', border: '1px solid var(--r25)', borderRadius: 14, padding: '12px 14px', marginBottom: 13, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => go('history')}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)', animation: 'pr 1.6s infinite', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--fd)', fontSize: 13, fontWeight: 700, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
                {stats.critical} Análises Risco Crítico
              </div>
              <div style={{ fontSize: 11, color: 'var(--t1)', marginTop: 2 }}>Beneficiamento — toque para ver</div>
            </div>
            <span style={{ fontSize: 20, color: 'var(--red)' }}>›</span>
          </div>
        )}
        <div className="sg">
          <button type="button" className="sc" style={{ borderColor: 'rgba(255,168,0,.18)' }} onClick={() => go('history')}>
            <div className="sv ta">{stats.totalMonth}</div>
            <div className="sl">
              Análises
              <br />
              Este mês
            </div>
            <div className="pb">
              <div className="pf" style={{ width: '73%', background: 'var(--amber)' }} />
            </div>
          </button>
          <button type="button" className="sc" style={{ borderColor: 'rgba(0,230,118,.14)' }} onClick={() => go('collabs')}>
            <div className="sv tg">{stats.evaluated}</div>
            <div className="sl">
              Colaboradores
              <br />
              Avaliados
            </div>
            <div className="pb">
              <div className="pf" style={{ width: '60%', background: 'var(--green)' }} />
            </div>
          </button>
          <button type="button" className="sc" style={{ borderColor: 'rgba(255,61,61,.14)' }} onClick={() => go('history')}>
            <div className="sv tr">{stats.critical}</div>
            <div className="sl">
              Risco
              <br />
              Crítico
            </div>
          </button>
          <button type="button" className="sc" style={{ borderColor: 'rgba(0,212,255,.14)' }} onClick={() => go('sectors')}>
            <div className="sv tc">{stats.sectors}</div>
            <div className="sl">
              Setores
              <br />
              Auditados
            </div>
          </button>
        </div>
        <div className="card ca">
          <div style={{ fontFamily: 'var(--fd)', fontSize: 10, fontWeight: 700, letterSpacing: 2, color: 'var(--t1)', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 2, background: 'var(--amber)', display: 'inline-block' }} />
            DISTRIBUIÇÃO DE RISCO
          </div>
          {([
            ['Crítico', 'critico', 'var(--red)'],
            ['Alto', 'alto', 'var(--orange)'],
            ['Médio', 'medio', 'var(--amber)'],
            ['Baixo', 'baixo', 'var(--green)'],
          ] as const).map(([label, key, color]) => (
            <div key={key} onClick={() => go('history')} style={{ cursor: 'pointer', marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontFamily: 'var(--fd)', fontWeight: 700, color: 'var(--t1)', letterSpacing: '.5px', textTransform: 'uppercase' }}>{label}</span>
                <span style={{ fontFamily: 'var(--fm)', fontSize: 11, color: color as string }}>
                  {dist[key].count} · {dist[key].pct}%
                </span>
              </div>
              <div className="pb">
                <div className="pf" style={{ width: `${dist[key].pct}%`, background: color }} />
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="hl"
          style={{ width: '100%', border: 'none', textAlign: 'left', cursor: 'pointer', marginBottom: 12 }}
          onClick={() => { vibrate(); go('new-analysis'); }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,var(--amber),#d96500)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
              📷
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--fd)', fontSize: 15, fontWeight: 700, color: 'var(--amber)', letterSpacing: '.5px', textTransform: 'uppercase' }}>
                Nova Análise Ergonômica
              </div>
              <div style={{ fontSize: 11, color: 'var(--t1)', marginTop: 3 }}>Captura com câmera · NR-17 · tempo definido pelo ergonomista</div>
            </div>
            <span style={{ fontSize: 20, color: 'var(--amber)' }}>›</span>
          </div>
        </button>
        <div className="sec sec--recent">
          <span className="stl">Análises Recentes</span>
          <button type="button" className="dash-recent-all" onClick={() => go('history')}>
            Ver todas
          </button>
        </div>
        {recentGroups.map(({ key, items, latest }) => {
          const older = items.slice(1);
          const expanded = !!expandedRecent[key];
          const latestRisks = countPostureRisks(latest.angles, latest.workstation, latest.activityContext);
          const activityShort = activityShortLabel(latest.activity);
          const riskClass = latest.risk === 'critico' || latest.risk === 'alto' ? 'high' : latest.risk === 'medio' ? 'med' : 'low';
          const scoreTone =
            latest.risk === 'critico' ? 'tr' : latest.risk === 'alto' ? 'to' : latest.risk === 'medio' ? 'ta' : 'tg';

          return (
            <div key={key} className={`dash-recent-group dash-recent-group--${riskClass}`}>
              <button type="button" className="dash-recent-main" onClick={() => openAnalysis(latest.id)}>
                <div className="dash-recent-avatar av" style={{ background: latest.iconBg }}>
                  {latest.icon}
                </div>
                <div className="dash-recent-content">
                  <div className="dash-recent-top">
                    <div className="dash-recent-head">
                      <div className="dash-recent-name">{latest.collaboratorName}</div>
                      <div className="dash-recent-meta">
                        {latest.setor} · {activityShort}
                      </div>
                    </div>
                    <div className="dash-recent-score">
                      <span className={`dash-recent-score-val ${scoreTone}`}>{latest.score}</span>
                      <span className="dash-recent-score-lbl">Score</span>
                    </div>
                  </div>
                  {!expanded && (
                    <div className="dash-recent-stats">
                      <span className="dash-recent-stat">
                        <span className="dash-recent-stat-lbl">Última</span>
                        <span className="dash-recent-stat-val">{latest.time}</span>
                      </span>
                      <span className={`dash-recent-stat ${latestRisks > 0 ? 'dash-recent-stat--warn' : 'dash-recent-stat--ok'}`}>
                        <span className="dash-recent-stat-lbl">Riscos</span>
                        <span className="dash-recent-stat-val">{latestRisks}</span>
                      </span>
                    </div>
                  )}
                </div>
              </button>
              {older.length > 0 && !expanded && (
                <button type="button" className="dash-recent-expand" onClick={() => toggleRecentGroup(key)}>
                  <span>+{older.length} análise{older.length > 1 ? 's' : ''} anterior{older.length > 1 ? 'es' : ''}</span>
                  <span className="dash-recent-chevron" aria-hidden>›</span>
                </button>
              )}
              {expanded && (
                <div className="dash-recent-older">
                  <div className="dash-recent-older-head">Histórico</div>
                  {items.map((a) => {
                    const risks = countPostureRisks(a.angles, a.workstation, a.activityContext);
                    return (
                      <button key={a.id} type="button" className="dash-recent-older-row" onClick={() => openAnalysis(a.id)}>
                        <div className="dash-recent-older-info">
                          <span className="dash-recent-older-time">{a.time}</span>
                          <span className={`dash-recent-older-risks ${risks > 0 ? 'dash-recent-older-risks--warn' : ''}`}>
                            {risks} risco{risks !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <span className={`dash-recent-older-score badge ${riskBadgeClass(a.risk)}`}>{a.score}</span>
                      </button>
                    );
                  })}
                  <button type="button" className="dash-recent-expand dash-recent-expand--collapse" onClick={() => toggleRecentGroup(key)}>
                    <span>Recolher</span>
                    <span className="dash-recent-chevron dash-recent-chevron--up" aria-hidden>›</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {recentGroups.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--t2)', fontSize: 13 }}>
            Nenhuma análise recente
          </div>
        )}
      </div>
      <button type="button" className="fab" onClick={() => { vibrate(); go('new-analysis'); }}>
        ＋
      </button>
    </>
  );
}

export function CollabsScreen() {
  const { go, collaborators, showToast, refreshCollaborators, dbConnected, sectors } = useApp();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Todos');

  useEffect(() => {
    if (dbConnected) void refreshCollaborators();
  }, [dbConnected, refreshCollaborators]);

  const sectorTags = useMemo(() => {
    const fromCollabs = [...new Set(collaborators.map((c) => c.setor).filter(Boolean))];
    const merged = [...new Set([...sectors, ...fromCollabs])];
    return ['Todos', ...merged];
  }, [collaborators, sectors]);

  const filtered = collaborators.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.matricula.includes(search);
    const matchTag = filter === 'Todos' || c.setor === filter;
    return matchSearch && matchTag;
  });

  return (
    <>
      <div className="scroll">
        <div className="sec" style={{ marginTop: 0 }}>
          <span className="stl">Funcionários</span>
          <button type="button" className="btn bp btn-sm btn-inline" onClick={() => go('new-collab')}>
            ＋ Novo
          </button>
        </div>
        {dbConnected && (
          <div style={{ fontSize: 11, color: 'var(--green)', marginBottom: 10, fontFamily: 'var(--fm)' }}>
            ● Sincronizado com PostgreSQL
          </div>
        )}
        <input className="inp" placeholder="🔍  Buscar funcionário..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="tagrow">
          {sectorTags.map((t) => (
            <div
              key={t}
              className={`tag ${filter === t ? 'on' : ''}`}
              onClick={() => {
                setFilter(t);
                showToast(`Filtro: ${t}`);
              }}
            >
              {t}
            </div>
          ))}
        </div>
        {filtered.map((c) => (
          <AnalysisCard
            key={c.id}
            icon={c.icon}
            iconBg={c.iconBg}
            name={c.name}
            subtitle={`Mat. ${c.matricula} · ${c.setor}`}
            badge={riskLabel(c.risk)}
            badgeClass={riskBadgeClass(c.risk)}
            onClick={() => go('new-collab')}
          />
        ))}
        <button className="btn bp mt8" onClick={() => go('new-collab')}>
          ＋ Novo Colaborador
        </button>
      </div>
    </>
  );
}
