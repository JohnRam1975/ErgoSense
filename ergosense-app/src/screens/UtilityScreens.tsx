import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { NavHeader, Toggle, OptionSheet } from '../components/UI';
import { CAPTURE_QUALITY_OPTIONS, AI_ENGINE_OPTIONS, REPORT_PERIOD_OPTIONS } from '../data/constants';
import type { Analysis } from '../types';
import { riskLabel } from '../utils/ergonomics';
import { UpgradeBanner } from '../components/UpgradeBanner';
import { canUseAdvancedHistory, planLimits } from '../plan/planFeatures';
import { usePwaInstall } from '../hooks/usePwaInstall';

function analysisTimestamp(a: Analysis) {
  const [d, m, y] = a.date.split('/').map(Number);
  const [h, min] = a.time.split(':').map(Number);
  return new Date(y, m - 1, d, h, min).getTime();
}

function activityGroupKey(a: Analysis) {
  return `${a.setor}::${a.activity}`;
}

export function HistoryScreen() {
  const { analyses, openAnalysis, deleteAnalysis, showToast, planTier, selectedCompany } = useApp();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Todos');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const limits = planLimits(planTier);
  const advanced = canUseAdvancedHistory(planTier);
  const tags = advanced
    ? ['Todos', 'Crítico', 'Alto', 'Médio', 'Com carga', 'Hoje', 'Esta semana']
    : ['Todos', 'Crítico', 'Alto', 'Hoje'];

  const filtered = useMemo(() => {
    const today = new Date();
    const todayStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    const q = search.toLowerCase();
    return analyses.filter((a) => {
      const matchSearch =
        a.collaboratorName.toLowerCase().includes(q) ||
        a.setor.toLowerCase().includes(q) ||
        a.activity.toLowerCase().includes(q);
      let matchFilter = true;
      if (filter === 'Crítico') matchFilter = a.risk === 'critico';
      else if (filter === 'Alto') matchFilter = a.risk === 'alto';
      else if (filter === 'Médio') matchFilter = a.risk === 'medio';
      else if (filter === 'Com carga') matchFilter = !!(a.loadResult || a.loadParams);
      else if (filter === 'Hoje') matchFilter = a.date === todayStr;
      else if (filter === 'Esta semana') {
        const [d, m, y] = a.date.split('/').map(Number);
        const ad = new Date(y, m - 1, d);
        const diff = (today.getTime() - ad.getTime()) / (1000 * 60 * 60 * 24);
        matchFilter = diff <= 7;
      }
      return matchSearch && matchFilter;
    });
  }, [analyses, search, filter]);

  const visibleAnalyses = useMemo(() => {
    const sorted = [...filtered].sort((x, y) => analysisTimestamp(y) - analysisTimestamp(x));
    if (advanced) return sorted;
    return sorted.slice(0, limits.maxHistoryVisible);
  }, [filtered, advanced, limits.maxHistoryVisible]);

  const activityGroups = useMemo(() => {
    const map = new Map<string, Analysis[]>();
    visibleAnalyses.forEach((a) => {
      const key = activityGroupKey(a);
      const list = map.get(key);
      if (list) list.push(a);
      else map.set(key, [a]);
    });
    return [...map.entries()]
      .map(([key, items]) => {
        const sorted = [...items].sort((x, y) => analysisTimestamp(y) - analysisTimestamp(x));
        return { key, setor: sorted[0].setor, activity: sorted[0].activity, items: sorted };
      })
      .sort((a, b) => analysisTimestamp(b.items[0]) - analysisTimestamp(a.items[0]));
  }, [visibleAnalyses]);

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <>
      <div className="scroll">
        {!advanced && filtered.length > limits.maxHistoryVisible && (
          <UpgradeBanner message={`Modo gratuito: exibindo ${limits.maxHistoryVisible} avaliações mais recentes de ${selectedCompany.name}.`} />
        )}
        <input className="inp" placeholder="🔍  Buscar por setor ou atividade..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="tagrow">
          {tags.map((t) => (
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
        {activityGroups.map((group) => {
          const [latest, ...older] = group.items;
          const expanded = !!expandedGroups[group.key];
          return (
            <div key={group.key} className="history-activity-group">
              <div className="history-activity-head">
                <div className="history-activity-head-main">
                  <div className="history-activity-title">{group.setor}</div>
                  {group.activity !== group.setor && (
                    <div className="history-activity-sub">{group.activity}</div>
                  )}
                  <div className="history-activity-latest">
                    Última: {latest.time}
                    {(latest.loadEffort ?? latest.loadAssessment?.effort) && (
                      <> · Índice {(latest.loadEffort ?? latest.loadAssessment?.effort)!.indiceEsforco} · {riskLabel((latest.loadEffort ?? latest.loadAssessment?.effort)!.risk)}</>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  className="history-delete-btn history-delete-btn--xs"
                  title="Excluir análise"
                  aria-label="Excluir análise"
                  onClick={() => deleteAnalysis(latest.id)}
                >
                  🗑
                </button>
              </div>
              <div className="history-activity-actions">
                <button
                  type="button"
                  className="btn bp btn-sm history-activity-btn"
                  onClick={() => openAnalysis(latest.id)}
                >
                  📋 Exibir análise ergonômica
                </button>
              </div>
              {older.length > 0 && !expanded && (
                <button
                  type="button"
                  className="history-activity-more"
                  onClick={() => toggleGroup(group.key)}
                >
                  (+{older.length} análise{older.length > 1 ? 's' : ''} anterior{older.length > 1 ? 'es' : ''})
                </button>
              )}
              {older.length > 0 && expanded && (
                <div className="history-activity-older">
                  <button
                    type="button"
                    className="history-activity-older-toggle"
                    onClick={() => toggleGroup(group.key)}
                  >
                    ▼ Análises anteriores
                  </button>
                  {older.map((a) => (
                    <div key={a.id} className="history-activity-older-row">
                      <span className="history-activity-older-time">{a.time}</span>
                      <div className="history-activity-older-actions">
                        <button
                          type="button"
                          className="btn bp btn-sm btn-inline history-activity-older-btn"
                          onClick={() => openAnalysis(a.id)}
                        >
                          📋 Exibir análise ergonômica
                        </button>
                        <button
                          type="button"
                          className="history-delete-btn history-delete-btn--xs"
                          title="Excluir análise"
                          aria-label="Excluir análise"
                          onClick={() => deleteAnalysis(a.id)}
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--t2)', fontSize: 14 }}>Nenhuma análise encontrada</div>
        )}
      </div>
    </>
  );
}

export function ReportsScreen() {
  const { reports, reportType, setReportType, generateReport, exportReportPdf, canExportPdf } = useApp();
  const [periodId, setPeriodId] = useState<(typeof REPORT_PERIOD_OPTIONS)[number]['id']>('30');

  const types = [
    { id: 'NR17' as const, elId: 'rNR17', icon: '📋', title: 'Relatório NR17', sub: 'Consolidado das análises no período' },
    { id: 'colab' as const, elId: 'rColab', icon: '👤', title: 'Por Colaborador', sub: 'Histórico individual agrupado' },
    { id: 'setor' as const, elId: 'rSetor', icon: '🏭', title: 'Por Setor', sub: 'Ranking de exposição por setor' },
  ];

  const period = REPORT_PERIOD_OPTIONS.find((p) => p.id === periodId) ?? REPORT_PERIOD_OPTIONS[1];

  return (
    <>
      <div className="scroll">
        <div className="hl">
          <div style={{ fontFamily: 'var(--fd)', fontSize: 13, fontWeight: 700, color: 'var(--amber)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
            📄 Gerar Novo Relatório
          </div>
          <div style={{ fontSize: 13, color: 'var(--t1)', marginBottom: 13 }}>Selecione o tipo e o período</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 13 }}>
            {types.map((t) => (
              <div
                key={t.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: 12,
                  background: reportType === t.id ? 'var(--a10)' : 'var(--bg1)',
                  border: `1px solid ${reportType === t.id ? 'var(--a35)' : 'var(--b1)'}`,
                  borderRadius: 12,
                  cursor: 'pointer',
                }}
                onClick={() => setReportType(t.id)}
              >
                <span style={{ fontSize: 18 }}>{t.icon}</span>
                <div>
                  <div style={{ fontFamily: 'var(--fd)', fontSize: 14, fontWeight: 700, color: reportType === t.id ? 'var(--amber)' : 'var(--t1)', textTransform: 'uppercase' }}>
                    {t.title}
                  </div>
                  <div style={{ fontSize: 11, color: reportType === t.id ? 'var(--t1)' : 'var(--t2)' }}>{t.sub}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 13 }}>
            {REPORT_PERIOD_OPTIONS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`btn ${periodId === p.id ? 'bp' : 'bs'} btn-sm mb0`}
                onClick={() => setPeriodId(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
          {canExportPdf ? (
            <button
              className="btn bp btn-sm mb0"
              onClick={() =>
                generateReport({
                  periodDays: period.days,
                  periodLabel: period.label,
                })
              }
            >
              Exportar Relatório PDF
            </button>
          ) : (
            <UpgradeBanner />
          )}
        </div>
        <div className="sec">
          <span className="stl">Relatórios Gerados</span>
        </div>
        {reports.length === 0 && (
          <div className="card">
            <div style={{ fontSize: 13, color: 'var(--t1)' }}>Nenhum relatório gerado ainda.</div>
          </div>
        )}
        {reports.map((r) => (
          <div key={r.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontFamily: 'var(--fd)', fontSize: 14, fontWeight: 700, color: 'var(--t0)', textTransform: 'uppercase' }}>{r.title}</div>
                <div style={{ fontSize: 11, color: 'var(--t1)' }}>{r.subtitle}</div>
              </div>
              <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
                <div className={`badge ${r.status === 'ready' ? 'bl' : 'bm'}`}>{r.status === 'ready' ? '✓ Pronto' : '⏳ Gerando'}</div>
                {r.status === 'ready' && (
                  <span
                    style={{ fontSize: 24, cursor: 'pointer', color: 'var(--amber)' }}
                    title="Exportar PDF"
                    onClick={() => exportReportPdf(r.id)}
                  >
                    ⬇
                  </span>
                )}
              </div>
            </div>
            {r.status === 'generating' && r.progress !== undefined && (
              <div className="pb mt8">
                <div className="pf" style={{ width: `${r.progress}%`, background: 'var(--amber)', animation: 'loadBar 3s ease infinite' }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

export function SettingsScreen() {
  const {
    go,
    session,
    selectedCompany,
    settings,
    updateSettings,
    updateSession,
    setAnalysisMode,
    showToast,
    showModal,
    logout,
    pendingSync,
    isTenantAdmin,
    dbConnected,
  } = useApp();
  const { canInstall, installed: pwaInstalled, downloadApp, openGuide } = usePwaInstall();

  const [profileOpen, setProfileOpen] = useState(false);
  const [qualityOpen, setQualityOpen] = useState(false);
  const [engineOpen, setEngineOpen] = useState(false);
  const [profileName, setProfileName] = useState(session?.name ?? '');
  const [profileLocation, setProfileLocation] = useState(session?.location ?? '');

  const roleBadge = session?.roleCode === 'ADMIN_EMPRESA' ? 'ADMIN EMPRESA' : session?.roleCode === 'ADMIN_GLOBAL' ? 'ADMIN GLOBAL' : session?.roleCode ?? 'ERGONOMISTA';

  const openProfile = () => {
    setProfileName(session?.name ?? '');
    setProfileLocation(session?.location ?? '');
    setProfileOpen(true);
  };

  const saveProfile = () => {
    if (!profileName.trim()) {
      showToast('Informe seu nome', 'warn');
      return;
    }
    updateSession({ name: profileName.trim(), location: profileLocation.trim() || session?.location || 'Carajás' });
    setProfileOpen(false);
    showToast('Perfil atualizado', 'success');
  };

  const selectQuality = (id: string) => {
    const opt = CAPTURE_QUALITY_OPTIONS.find((o) => o.id === id);
    if (!opt) return;
    updateSettings({ captureQuality: opt.label });
    showToast(`Qualidade: ${opt.label}`, 'success');
  };

  const selectEngine = (id: string) => {
    const opt = AI_ENGINE_OPTIONS.find((o) => o.id === id);
    if (!opt) return;
    updateSettings({ aiEngine: opt.label });
    setAnalysisMode(opt.mode);
    showToast(`Motor: ${opt.label}`, 'success');
  };

  const selectedEngineId = useMemo(
    () => AI_ENGINE_OPTIONS.find((o) => o.label === settings.aiEngine)?.id ?? 'complete',
    [settings.aiEngine],
  );

  return (
    <>
      <NavHeader back={() => go('dashboard')} title="Configurações" home={() => go('dashboard')} />
      <div className="scroll scroll--form">
        <div style={{ background: 'linear-gradient(135deg,var(--a10),transparent)', border: '1px solid var(--a35)', borderRadius: 18, padding: 16, marginBottom: 15, display: 'flex', alignItems: 'center', gap: 13 }}>
          <div style={{ width: 54, height: 54, background: 'linear-gradient(135deg,var(--amber),#d96500)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>
            👤
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--fd)', fontSize: 19, fontWeight: 800, color: 'var(--t0)' }}>{session?.name ?? 'Lucas Andrade'}</div>
            <div style={{ fontSize: 12, color: 'var(--t1)' }}>
              {session?.role ?? 'Ergonomista Sênior'} · {selectedCompany.name}
            </div>
            <div className="badge bm mt4" style={{ fontSize: 9 }}>
              {roleBadge}
            </div>
          </div>
          <button type="button" className="btn bp btn-icon" onClick={openProfile} aria-label="Editar perfil" title="Editar perfil">
            ✏️
          </button>
        </div>
        {isTenantAdmin && (
          <>
            <div style={{ fontFamily: 'var(--fd)', fontSize: 10, fontWeight: 700, letterSpacing: 2, color: 'var(--t1)', textTransform: 'uppercase', marginBottom: 9, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 2, background: 'var(--cyan)', display: 'inline-block' }} />
              ADMINISTRAÇÃO
            </div>
            <div className="card card--flush" style={{ marginBottom: 14 }}>
              <button type="button" className="btn bp btn-list" onClick={() => go('support-access')}>
                <div>
                  <div style={{ fontSize: 15, color: 'var(--t0)' }}>Autorizar suporte da plataforma</div>
                  <div className="btn-list-sub">Controle de acesso LGPD · auditoria</div>
                </div>
                <span style={{ color: 'var(--amber)', fontSize: 18 }}>›</span>
              </button>
            </div>
          </>
        )}
        <div style={{ fontFamily: 'var(--fd)', fontSize: 10, fontWeight: 700, letterSpacing: 2, color: 'var(--t1)', textTransform: 'uppercase', marginBottom: 9, display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 10, height: 2, background: 'var(--amber)', display: 'inline-block' }} />
          CÂMERA E IA
        </div>
        <div className="card" style={{ padding: 0, marginBottom: 14 }}>
          <button type="button" className="settings-row" onClick={() => setQualityOpen(true)}>
            <div>
              <div className="settings-row-title">Qualidade de captura</div>
              <div className="settings-row-sub">{settings.captureQuality}</div>
            </div>
            <span className="settings-row-chevron">›</span>
          </button>
          <button type="button" className="settings-row" onClick={() => setEngineOpen(true)}>
            <div>
              <div className="settings-row-title">Motor de IA</div>
              <div className="settings-row-sub">{settings.aiEngine}</div>
            </div>
            <span className="settings-row-chevron">›</span>
          </button>
          <div style={{ padding: '14px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--b1)' }}>
            <div style={{ fontSize: 15, color: 'var(--t0)' }}>Overlay de esqueleto</div>
            <Toggle
              on={settings.skeletonOverlay}
              onToggle={() => {
                updateSettings({ skeletonOverlay: !settings.skeletonOverlay });
                showToast(`Overlay de esqueleto: ${!settings.skeletonOverlay ? 'Ativado' : 'Desativado'}`, !settings.skeletonOverlay ? 'success' : '');
              }}
            />
          </div>
          <div style={{ padding: '14px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 15, color: 'var(--t0)' }}>Alertas sonoros</div>
            <Toggle
              on={settings.soundAlerts}
              onToggle={() => {
                updateSettings({ soundAlerts: !settings.soundAlerts });
                showToast(`Alertas sonoros: ${!settings.soundAlerts ? 'Ativado' : 'Desativado'}`, !settings.soundAlerts ? 'success' : '');
              }}
            />
          </div>
        </div>
        <div style={{ fontFamily: 'var(--fd)', fontSize: 10, fontWeight: 700, letterSpacing: 2, color: 'var(--t1)', textTransform: 'uppercase', marginBottom: 9, display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 10, height: 2, background: 'var(--amber)', display: 'inline-block' }} />
          SISTEMA
        </div>
        <div className="card" style={{ padding: 0, marginBottom: 14 }}>
          <div style={{ padding: '14px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--b0)' }}>
            <div>
              <div style={{ fontSize: 15, color: 'var(--t0)' }}>Servidor API</div>
              <div style={{ fontSize: 11, color: 'var(--t1)', fontFamily: 'var(--fm)' }}>localhost:3001</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div className={dbConnected ? 'dot-g' : 'dot-r'} />
              <span style={{ fontSize: 11, color: dbConnected ? 'var(--green)' : 'var(--red)', fontFamily: 'var(--fd)' }}>
                {dbConnected ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
          {pwaInstalled ? (
            <div style={{ padding: '14px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--b0)' }}>
              <div>
                <div className="settings-row-title">App instalado</div>
                <div className="settings-row-sub">Rodando como PWA (tela cheia)</div>
              </div>
              <span style={{ fontSize: 11, color: 'var(--green)', fontFamily: 'var(--fd)' }}>OK</span>
            </div>
          ) : (
            <>
              <button
                type="button"
                className="settings-row"
                onClick={async () => {
                  const result = await downloadApp();
                  if (result === 'installed') showToast('App instalado', 'success');
                }}
              >
                <div>
                  <div className="settings-row-title">⬇ Baixar app</div>
                  <div className="settings-row-sub">PC e celular · atalho na tela inicial</div>
                </div>
                <span className="settings-row-chevron">›</span>
              </button>
              <button type="button" className="settings-row" onClick={openGuide}>
                <div>
                  <div className="settings-row-title">Como instalar (PC / celular)</div>
                  <div className="settings-row-sub">
                    {canInstall ? 'Instalação nativa disponível neste navegador' : 'Chrome, Edge, Android e Safari iOS'}
                  </div>
                </div>
                <span className="settings-row-chevron">›</span>
              </button>
            </>
          )}
          <button type="button" className="settings-row" onClick={() => go('sync')}>
            <div>
              <div className="settings-row-title">Modo offline</div>
              <div className="settings-row-sub">{pendingSync} análises em fila</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {pendingSync > 0 && (
                <div className="badge bm" style={{ fontSize: 9 }}>
                  {pendingSync}
                </div>
              )}
              <span className="settings-row-chevron">›</span>
            </div>
          </button>
          <button type="button" className="settings-row" onClick={() => go('company')}>
            <div>
              <div className="settings-row-title">Trocar empresa</div>
              <div className="settings-row-sub">Atualmente: {selectedCompany.name}</div>
            </div>
            <span className="settings-row-chevron">›</span>
          </button>
        </div>
        <div style={{ fontFamily: 'var(--fd)', fontSize: 10, fontWeight: 700, letterSpacing: 2, color: 'var(--t1)', textTransform: 'uppercase', marginBottom: 9, display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 10, height: 2, background: 'var(--amber)', display: 'inline-block' }} />
          SOBRE
        </div>
        <div className="card" style={{ padding: 0, marginBottom: 14 }}>
          <div style={{ padding: '14px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--b0)' }}>
            <div style={{ fontSize: 15, color: 'var(--t0)' }}>Versão do app</div>
            <span style={{ fontSize: 13, color: 'var(--t1)', fontFamily: 'var(--fm)' }}>v1.0.0-mvp</span>
          </div>
          <div style={{ padding: '14px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 15, color: 'var(--t0)' }}>Tecnologia</div>
            <span style={{ fontSize: 13, color: 'var(--t1)' }}>React · Vite · PWA</span>
          </div>
        </div>
        <button className="btn bp" onClick={() => showModal('Sair da Conta', 'Tem certeza que deseja encerrar a sessão?', 'Sim, Sair', logout)}>
          🚪 Sair da Conta
        </button>
        <button className="btn bp btn-sm" onClick={() => go('dashboard')}>
          🏠 Voltar ao Início
        </button>
      </div>

      {profileOpen && (
        <div className="option-sheet open" onClick={(e) => e.target === e.currentTarget && setProfileOpen(false)}>
          <div className="option-sheet-box">
            <div className="modal-title">Editar Perfil</div>
            <div className="profile-sheet-fields">
              <label className="lbl">Nome completo</label>
              <input className="inp" value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder="Seu nome" />
              <label className="lbl">Localização</label>
              <input className="inp" value={profileLocation} onChange={(e) => setProfileLocation(e.target.value)} placeholder="Ex.: Carajás" />
              <label className="lbl">E-mail</label>
              <input className="inp" value={session?.email ?? ''} readOnly style={{ opacity: 0.6 }} />
            </div>
            <button type="button" className="btn bp mb0" onClick={saveProfile}>
              Salvar Perfil
            </button>
            <button type="button" className="btn bp btn-sm" style={{ marginTop: 8, opacity: 0.85 }} onClick={() => setProfileOpen(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      <OptionSheet
        open={qualityOpen}
        title="Qualidade de captura"
        options={CAPTURE_QUALITY_OPTIONS}
        selected={settings.captureQuality}
        onSelect={selectQuality}
        onClose={() => setQualityOpen(false)}
      />

      <OptionSheet
        open={engineOpen}
        title="Motor de IA"
        options={AI_ENGINE_OPTIONS}
        selected={AI_ENGINE_OPTIONS.find((o) => o.id === selectedEngineId)?.label ?? settings.aiEngine}
        onSelect={selectEngine}
        onClose={() => setEngineOpen(false)}
      />
    </>
  );
}

export function SyncScreen() {
  const { go, analyses, pendingSync, startSync, settings, updateSettings, showToast, dbConnected } = useApp();
  const pending = analyses.filter((a) => !a.synced);
  const synced = analyses.filter((a) => a.synced);
  const online = typeof navigator !== 'undefined' ? navigator.onLine && dbConnected : dbConnected;

  return (
    <>
      <NavHeader back={() => go('settings')} title="Sincronização" home={() => go('dashboard')} />
      <div className="scroll">
        <div className={online ? 'hl-g' : 'hl'}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div className={online ? 'dot-g' : 'dot-r'} />
            <div style={{ fontFamily: 'var(--fd)', fontSize: 15, fontWeight: 700, color: online ? 'var(--green)' : 'var(--amber)', letterSpacing: 1, textTransform: 'uppercase' }}>
              {online ? 'Conectado · API' : 'Offline / API indisponível'}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--fd)', fontSize: 28, fontWeight: 800, color: 'var(--green)' }}>{pendingSync}</div>
              <div style={{ fontSize: 9, color: 'var(--t1)', fontFamily: 'var(--fd)', letterSpacing: 1, textTransform: 'uppercase' }}>Pendentes</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--fd)', fontSize: 28, fontWeight: 800, color: 'var(--t0)' }}>{synced.length}</div>
              <div style={{ fontSize: 9, color: 'var(--t1)', fontFamily: 'var(--fd)', letterSpacing: 1, textTransform: 'uppercase' }}>Sincronizadas</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--fd)', fontSize: 28, fontWeight: 800, color: 'var(--red)' }}>{pending.length}</div>
              <div style={{ fontSize: 9, color: 'var(--t1)', fontFamily: 'var(--fd)', letterSpacing: 1, textTransform: 'uppercase' }}>Na fila</div>
            </div>
          </div>
        </div>
        <button className="btn bp" onClick={startSync}>
          🔄 Sincronizar Agora ({pendingSync})
        </button>
        <div className="sec">
          <span className="stl">Fila de Sincronização</span>
        </div>
        <div className="card" style={{ padding: 0 }}>
          {pending.length === 0 && (
            <div style={{ padding: '13px 15px', fontSize: 13, color: 'var(--t1)' }}>Nenhuma análise pendente.</div>
          )}
          {pending.slice(0, 5).map((a) => (
            <div key={a.id} style={{ padding: '13px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--b0)' }}>
              <div style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
                <span style={{ fontSize: 18 }}>{a.icon}</span>
                <div>
                  <div style={{ fontFamily: 'var(--fd)', fontSize: 14, fontWeight: 700, color: 'var(--t0)' }}>{a.collaboratorName}</div>
                  <div style={{ fontSize: 11, color: 'var(--t1)' }}>Análise · {a.time}</div>
                </div>
              </div>
              <div style={{ fontSize: 10, fontFamily: 'var(--fd)', fontWeight: 700, color: 'var(--amber)', letterSpacing: 1, textTransform: 'uppercase' }}>
                Pendente
              </div>
            </div>
          ))}
          {synced.slice(0, 2).map((a) => (
            <div key={a.id} style={{ padding: '13px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
                <span style={{ fontSize: 18 }}>✅</span>
                <div>
                  <div style={{ fontFamily: 'var(--fd)', fontSize: 14, fontWeight: 700, color: 'var(--t1)' }}>{a.collaboratorName}</div>
                  <div style={{ fontSize: 11, color: 'var(--t2)' }}>Análise · {a.date}</div>
                </div>
              </div>
              <div className="badge bl" style={{ fontSize: 9 }}>
                ✓ Enviado
              </div>
            </div>
          ))}
        </div>
        <div className="card mt8">
          <div style={{ fontFamily: 'var(--fd)', fontSize: 10, fontWeight: 700, letterSpacing: 2, color: 'var(--t1)', textTransform: 'uppercase', marginBottom: 11 }}>
            Config de Sync
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 13 }}>
            <div style={{ fontSize: 14, color: 'var(--t0)' }}>Sync automático ao reconectar</div>
            <Toggle
              on={settings.autoSync}
              onToggle={() => {
                updateSettings({ autoSync: !settings.autoSync });
                showToast(`Sync automático: ${!settings.autoSync ? 'Ativado' : 'Desativado'}`, !settings.autoSync ? 'success' : '');
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 14, color: 'var(--t0)' }}>Somente Wi-Fi / cabo</div>
            <Toggle
              on={settings.wifiOnly}
              onToggle={() => {
                updateSettings({ wifiOnly: !settings.wifiOnly });
                showToast(`Somente Wi-Fi: ${!settings.wifiOnly ? 'Ativado' : 'Desativado'}`, !settings.wifiOnly ? 'success' : '');
              }}
            />
          </div>
        </div>
        <button className="btn bp btn-sm mt4" onClick={() => go('dashboard')}>
          🏠 Voltar ao Início
        </button>
      </div>
    </>
  );
}
