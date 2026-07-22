import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ErgoSenseLogo } from '../components/ErgoSenseLogo';
import { AnalysisCard } from '../components/UI';
import { PwaDownloadCard } from '../components/PwaInstallBanner';
import { PasswordField } from '../components/PasswordField';
import { SELF_COLLABORATOR_MATRICULA } from '../data/constants';
import { openCollaboratorEditor } from './AnalysisScreens';
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
  const { login, verifyMfaLogin, showToast, showModal, go } = useApp();
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
    <div className="login-page">
      <button type="button" className="btn bp login-back-btn login-page-back" onClick={() => go('splash')}>
        Voltar
      </button>

      <div className="login-panel">
        <div className="login-panel-brand">
          <ErgoSenseLogo size="md" showTagline className="ergo-logo--login" />
        </div>

        <form
          className="login-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (mfaPending) void handleMfaVerify();
            else void handleLogin();
          }}
        >
          <h1 className="login-form-title">{mfaPending ? 'Verificação MFA' : 'Entrar'}</h1>
          <p className="login-form-sub">
            {mfaPending
              ? `Olá, ${mfaPending.name}. Informe o código do autenticador.`
              : 'Acesse sua conta corporativa'}
          </p>

          {mfaPending ? (
            <>
              <label className="lbl" htmlFor="login-mfa">
                Código MFA
              </label>
              <input
                id="login-mfa"
                className="inp login-inp"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                placeholder="000000"
              />
              <div className="login-form-actions">
                <button type="submit" className="btn bp">
                  Confirmar
                </button>
                <button
                  type="button"
                  className="btn bs"
                  onClick={() => {
                    setMfaPending(null);
                    setMfaCode('');
                  }}
                >
                  Voltar ao login
                </button>
              </div>
            </>
          ) : (
            <>
              <label className="lbl" htmlFor="login-email">
                E-mail corporativo
              </label>
              <input
                id="login-email"
                className="inp login-inp"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@empresa.com.br"
              />
              <label className="lbl" htmlFor="login-pass">
                Senha
              </label>
              <PasswordField
                id="login-pass"
                inputClassName="inp login-inp"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <button
                type="button"
                className="login-forgot"
                onClick={() =>
                  showModal(
                    'Redefinir senha',
                    'Recuperação por e-mail (SMTP) está planejada para uma atualização futura. Por enquanto, use “Falar com o suporte” (ergosense.suporte@dejohn.com.br) ou peça ao administrador da empresa para redefinir sua senha.',
                    'Entendi',
                  )
                }
              >
                Esqueci a senha
              </button>
              <div className="login-form-actions">
                <button type="submit" className="btn bp">
                  Entrar
                </button>
              </div>
              <div className="login-form-links">
                <button type="button" className="login-text-link" onClick={() => go('request-access')}>
                  Cadastrar empresa
                </button>
                <span className="login-link-sep">·</span>
                <button type="button" className="login-text-link" onClick={() => go('request-access-autonomo')}>
                  Sou autônomo
                </button>
                <span className="login-link-sep">·</span>
                <button type="button" className="login-text-link" onClick={() => go('contact-support')}>
                  Falar com o suporte
                </button>
              </div>
              <PwaDownloadCard />
            </>
          )}
        </form>

        <div className="login-panel-foot">JWT · TLS · LGPD</div>
      </div>
    </div>
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
          <PasswordField
            value={form.adminPassword}
            onChange={(e) => set('adminPassword', e.target.value)}
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
          />
          <label className="lbl">Confirmar senha *</label>
          <PasswordField
            value={form.adminPassword2}
            onChange={(e) => set('adminPassword2', e.target.value)}
            placeholder="Repita a senha"
            autoComplete="new-password"
          />
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
  const {
    session,
    selectCompany,
    selectedCompanyId,
    companies,
    logout,
    showModal,
    isGlobalAdmin,
    go,
    showToast,
  } = useApp();
  const [search, setSearch] = useState('');
  const allowedId = !isGlobalAdmin ? session?.tenantId : undefined;
  const tenantCompanies = companies.filter(
    (c) => c.id !== 'ergosense' && (!allowedId || c.id === allowedId),
  );
  const filtered = tenantCompanies.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  const colorStyles: Record<string, { bg: string; border: string }> = {
    amber: { bg: 'var(--a10)', border: 'var(--a35)' },
    cyan: { bg: 'var(--c10)', border: 'var(--c25)' },
    green: { bg: 'var(--g10)', border: 'var(--g25)' },
    neutral: { bg: 'var(--bg3)', border: 'var(--b1)' },
  };

  const requestNewCompanyAccess = () => {
    showModal(
      'Solicitar acesso',
      'Escolha: cadastrar uma empresa nova no ErgoSense, ou pedir vínculo a uma empresa existente (precisa do ID do tenant).',
      'Cadastrar nova empresa',
      () => go('request-access'),
    );
  };

  const requestExistingTenant = () => {
    if (!session?.email) {
      showToast('Faça login para solicitar acesso', 'warn');
      return;
    }
    const tenantId = window.prompt('Informe o ID do tenant da empresa desejada:');
    if (!tenantId?.trim()) return;
    void import('../api/client')
      .then(({ apiSubmitAccessRequest }) =>
        apiSubmitAccessRequest({
          nome: session.name || session.email,
          email: session.email,
          funcao: session.role || 'Ergonomista',
          matricula: 'ACCESS-REQ',
          tenantId: tenantId.trim(),
        }),
      )
      .then(() => showToast('Solicitação registrada. Aguarde o admin da empresa.', 'success'))
      .catch((err) => showToast(err instanceof Error ? err.message : 'Falha ao enviar solicitação', 'warn'));
  };

  return (
    <>
      <div className="nav-hdr" style={{ paddingTop: 8 }}>
        <div className="nav-hdr-brand">
          <ErgoSenseLogo size="sm" showText />
          <div className="hdr-title">Selecionar Empresa</div>
        </div>
        <button
          type="button"
          className="btn bd btn-sm btn-inline"
          aria-label="Sair da conta"
          onClick={() =>
            showModal('Sair da Conta', 'Tem certeza que deseja encerrar a sessão?', 'Sim, Sair', logout)
          }
        >
          Sair
        </button>
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
        <button
          type="button"
          style={{
            marginTop: 8,
            padding: 14,
            border: '1px dashed rgba(255,255,255,.07)',
            borderRadius: 14,
            textAlign: 'center',
            cursor: 'pointer',
            width: '100%',
            background: 'transparent',
          }}
          onClick={requestNewCompanyAccess}
        >
          <span style={{ fontSize: 13, fontFamily: 'var(--fd)', fontWeight: 700, color: 'var(--t2)', letterSpacing: 1, textTransform: 'uppercase' }}>
            + Solicitar cadastro de nova empresa
          </span>
        </button>
        <button
          type="button"
          style={{
            marginTop: 8,
            padding: 14,
            border: '1px dashed rgba(255,255,255,.07)',
            borderRadius: 14,
            textAlign: 'center',
            cursor: 'pointer',
            width: '100%',
            background: 'transparent',
          }}
          onClick={requestExistingTenant}
        >
          <span style={{ fontSize: 13, fontFamily: 'var(--fd)', fontWeight: 700, color: 'var(--t2)', letterSpacing: 1, textTransform: 'uppercase' }}>
            + Pedir acesso a empresa existente
          </span>
        </button>
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
    if (c.matricula === SELF_COLLABORATOR_MATRICULA) return false;
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.matricula.includes(search);
    const matchTag = filter === 'Todos' || c.setor === filter;
    return matchSearch && matchTag;
  });

  return (
    <>
      <div className="scroll">
        <div className="sec" style={{ marginTop: 0 }}>
          <span className="stl">Colaboradores</span>
          <button type="button" className="btn bp btn-sm btn-inline" onClick={() => { openCollaboratorEditor(null); go('new-collab'); }}>
            ＋ Novo
          </button>
        </div>
        <p className="t2" style={{ marginBottom: 10 }}>
          Cadastre e gerencie os colaboradores da empresa neste painel.
        </p>
        <input className="inp" placeholder="🔍  Buscar colaborador..." value={search} onChange={(e) => setSearch(e.target.value)} />
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
            onClick={() => {
              openCollaboratorEditor(c.id);
              go('new-collab');
            }}
          />
        ))}
        <button className="btn bp mt8" onClick={() => { openCollaboratorEditor(null); go('new-collab'); }}>
          ＋ Novo Colaborador
        </button>
      </div>
    </>
  );
}
