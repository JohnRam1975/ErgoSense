import { ErgoSenseLogo } from './ErgoSenseLogo';

import { useEffect } from 'react';

import { useApp } from '../context/AppContext';

import { BNAV_MAP, DRAWER_MAP, FULLSCREEN_SCREENS, MAIN_TAB_SCREENS } from '../data/constants';

import { vibrate } from '../hooks/useClock';

import { usePwaInstall } from '../hooks/usePwaInstall';

import type { ScreenId } from '../types';



const NAV_ITEMS = [

  { id: 'dashboard', bnId: 'bn-dashboard', icon: '🏠', label: 'Início' },

  { id: 'history', bnId: 'bn-history', icon: '📋', label: 'Análises' },

  { id: 'collabs', bnId: 'bn-collabs', icon: '👥', label: 'Equipe' },

  { id: 'reports', bnId: 'bn-reports', icon: '📊', label: 'Relatórios' },

  { id: 'menu', bnId: 'bn-menu', icon: '☰', label: 'Menu' },

] as const;



const TAB_TITLES: Partial<Record<ScreenId, string>> = {

  dashboard: 'Dashboard',

  history: 'Análises',

  collabs: 'Equipe',

  reports: 'Relatórios',

};



export function AppChrome({ screen }: { screen: ScreenId }) {

  const { go, openMenu, session, selectedCompany, logout, showModal } = useApp();

  if (FULLSCREEN_SCREENS.includes(screen)) return null;



  const activeBn = BNAV_MAP[screen] ?? '';

  const showBrand = (MAIN_TAB_SCREENS as readonly string[]).includes(screen);

  const pageTitle = TAB_TITLES[screen] ?? '';



  return (
    <header id="app-chrome" className={showBrand ? 'app-chrome--main' : 'app-chrome--sub'}>
      <div className="app-chrome-inset">
        {showBrand && (
          <div className="app-chrome-brand">
            <div className="app-chrome-brand-left">
              <ErgoSenseLogo size="sm" showText />
              <div className="app-chrome-title">{pageTitle}</div>
            </div>
            <div className="app-chrome-tenant">
              <div className="app-chrome-meta">{selectedCompany.name}</div>
              <div className="app-chrome-location">{session?.location ?? 'Carajás'}</div>
              <button
                type="button"
                className="btn bd btn-sm btn-inline app-chrome-logout"
                aria-label="Sair da conta"
                onClick={() =>
                  showModal('Sair da Conta', 'Tem certeza que deseja encerrar a sessão?', 'Sim, Sair', logout)
                }
              >
                Sair
              </button>
            </div>
          </div>
        )}
        <nav className="app-chrome-nav" aria-label="Navegação principal">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.bnId}
              type="button"
              className={`bn-item ${activeBn === item.bnId ? 'on' : ''}`}
              onClick={() => {
                vibrate();
                if (item.id === 'menu') openMenu();
                else go(item.id as ScreenId);
              }}
            >
              <div className="ico">{item.icon}</div>
              <div className="lbl">{item.label}</div>
            </button>
          ))}
        </nav>
      </div>
    </header>
  );

}



/** @deprecated Use AppChrome — mantido para compatibilidade interna */

export function BottomNav({ screen }: { screen: ScreenId }) {

  return <AppChrome screen={screen} />;

}



export function MenuDrawer() {

  const {

    menuOpen,

    closeMenu,

    go,

    screen,

    session,

    selectedCompany,

    collaborators,

    analyses,

    pendingSync,

    showModal,

    logout,

    isGlobalAdmin,

    globalSupportMode,

    exitGlobalSupport,

  } = useApp();

  const { installed: pwaInstalled, downloadApp } = usePwaInstall();

  useEffect(() => {
    if (FULLSCREEN_SCREENS.includes(screen) && menuOpen) closeMenu();
  }, [screen, menuOpen, closeMenu]);

  if (FULLSCREEN_SCREENS.includes(screen)) return null;



  const drawerActive = DRAWER_MAP[screen] ?? '';



  const items = [

    { id: 'dashboard', icon: '🏠', label: 'Dashboard', sub: 'Visão geral' },

    { id: 'new-analysis', icon: '📷', label: 'Nova Análise', sub: 'Capturar com câmera', badge: '●' },

    { id: 'collabs', icon: '👥', label: 'Colaboradores', sub: `${collaborators.length} avaliados` },

    { id: 'org-structure', icon: '🏢', label: 'Estrutura NR-01', sub: 'Empresa · Unidade · Posto' },

    { id: 'sectors', icon: '🏭', label: 'Setores', sub: `${new Set(analyses.map((a) => a.setor)).size} auditados` },

    null,

    { id: 'history', icon: '📋', label: 'Histórico', sub: `${analyses.length} análises` },

    { id: 'reports', icon: '📊', label: 'Relatórios', sub: 'NR17 · PDF' },

    { id: 'v2-dashboard', icon: '📈', label: 'Dashboard V2', sub: 'KPIs executivos' },

    { id: 'v2-methods', icon: '🧪', label: 'Métodos V2', sub: 'RULA · REBA · NIOSH…' },

    { id: 'sync', icon: '🔄', label: 'Sincronização', sub: `${pendingSync} pendentes`, count: pendingSync },

    null,

    { id: 'v2-environmental', icon: '🌡️', label: 'Ambientais', sub: 'NR-15 · NHO-06 · NHO-11' },

    { id: 'v2-video', icon: '🎬', label: 'Análise por Vídeo', sub: 'IA · MediaPipe · NR-17' },

    { id: 'v2-audit', icon: '📝', label: 'Auditoria', sub: 'Rastreabilidade' },

    { id: 'v2-roadmap', icon: '🚀', label: 'Roadmap futuro', sub: 'Wearables · IoT' },

    null,

    { id: 'psicossocial-dashboard', icon: '🧠', label: 'Psicossocial', sub: 'Dashboard MTE · NR-1' },

    { id: 'psicossocial-fatores', icon: '📋', label: '13 Fatores MTE', sub: 'Guia MTE 2025 · Portaria 1.419' },

    { id: 'psicossocial-questionarios', icon: '📝', label: 'Questionários', sub: 'COPSOQ-III · HSE · CBI' },

    { id: 'psicossocial-matriz', icon: '🔲', label: 'Matriz de Risco', sub: 'Heatmap 5×5 probabilidade × severidade' },

    { id: 'psicossocial-plano', icon: '✅', label: 'Plano de Ação', sub: 'Medidas preventivas' },

    { id: 'psicossocial-conformidade', icon: '⚖️', label: 'Conformidade Legal', sub: 'NR-1 · ISO 45003 · Guia MTE' },

    { id: 'psicossocial-ia', icon: '🤖', label: 'IA Psicossocial', sub: 'Em breve · atualização futura' },

    null,

    { id: 'denuncia-dashboard', icon: '📢', label: 'Canal de Denúncia', sub: 'LGPD · Anônima · NR-01' },

    { id: 'denuncia-nova', icon: '✉️', label: 'Nova Denúncia', sub: 'Assédio · Violência · Discriminação' },

    { id: 'denuncia-lista', icon: '🔍', label: 'Investigações', sub: 'Tratativas · Evidências · Histórico' },

    null,

    { id: 'criterios-dashboard', icon: '📐', label: 'Critérios de Risco', sub: 'NR-01 §1.5.4.4.2.2 · Matrizes' },

    { id: 'criterios-config', icon: '⚙️', label: 'Configurar Critérios', sub: 'Metodologias · Versões' },

    { id: 'criterios-historico', icon: '📜', label: 'Histórico Critérios', sub: 'Versões · Auditoria NR-01' },

    { id: 'criterios-documentacao', icon: '📄', label: 'Doc. Critérios', sub: 'Geração automática NR-01' },

    null,

    { id: 'inventario-dashboard', icon: '📋', label: 'Inventário de Riscos', sub: 'NR-01 · GRO · 6 tipos' },

    { id: 'inventario-lista', icon: '📝', label: 'Lista de Riscos', sub: 'CRUD completo · PostgreSQL' },

    { id: 'inventario-matriz', icon: '🔲', label: 'Matriz NR-01', sub: 'Probabilidade × Severidade 5×5' },

    null,

    { id: 'gro-dashboard', icon: '⚖️', label: 'Ciclo GRO', sub: 'NR-01 · Dashboard executivo' },

    { id: 'gro-workflow', icon: '🔄', label: 'Workflow GRO', sub: 'Identificação → Revisão' },

    { id: 'gro-plano', icon: '✅', label: 'Plano de Ação GRO', sub: 'Medidas de controle persistidas' },

    { id: 'gro-indicadores', icon: '📊', label: 'Indicadores GRO', sub: 'Monitoramento · Leading/Lagging' },

    { id: 'gro-historico', icon: '📝', label: 'Histórico GRO', sub: 'Trilha de auditoria fiscal' },

    { id: 'gro-relatorios', icon: '📄', label: 'Relatórios GRO', sub: 'Dossiê · Inventário · Plano' },

    null,

    { id: 'pgr-dashboard', icon: '📑', label: 'PGR', sub: 'Programa de Gerenciamento de Riscos' },

    { id: 'pgr-versoes', icon: '🔢', label: 'Versões PGR', sub: 'Versionamento · Aprovação · PDF' },

    { id: 'pgr-historico', icon: '📜', label: 'Histórico PGR', sub: 'Auditoria e revisões' },

    null,

    { id: 'aet-dashboard', icon: '📐', label: 'AET Ergonômica', sub: 'NR-17 · Workflow completo' },

    { id: 'aet-workflow', icon: '🔄', label: 'Workflow AET', sub: 'RULA · REBA · OWAS · NIOSH' },

    { id: 'aet-cadastros', icon: '🪑', label: 'Mobiliário · Equipamentos', sub: 'Cadastro NR-17 17.3.2' },

    { id: 'aet-relatorio', icon: '📄', label: 'Relatório AET', sub: 'Laudo normativo PDF' },

    null,

    { id: 'sst-dashboard', icon: '🦺', label: 'SST', sub: 'APR · EPI · NC · CAPA · NR-01' },

    { id: 'sst-apr', icon: '📋', label: 'APR', sub: 'Análise Preliminar de Riscos' },

    { id: 'sst-epi-epc', icon: '🛡️', label: 'EPI · EPC', sub: 'NR-6 · Proteção coletiva' },

    { id: 'sst-inspecoes', icon: '🔍', label: 'Inspeções SST', sub: 'Checklists · NC automática' },

    { id: 'sst-auditorias', icon: '📊', label: 'Auditorias SST', sub: 'NR-01 · ISO 45001' },

    { id: 'sst-nc-capa', icon: '⚠️', label: 'NC · CAPA', sub: 'Não conformidades · GRO' },

    { id: 'sst-treinamentos', icon: '🎓', label: 'Treinamentos SST', sub: 'Capacitação · NR-01' },

    { id: 'sst-relatorios', icon: '📄', label: 'Relatórios SST', sub: 'PDF integrado PGR' },

    null,

    { id: 'esocial-dashboard', icon: '📡', label: 'eSocial', sub: 'Em breve · atualização futura' },

    { id: 'esocial-s2210', icon: '🏥', label: 'S-2210 CAT', sub: 'Em breve' },

    { id: 'esocial-s2220', icon: '🩺', label: 'S-2220 ASO', sub: 'Em breve' },

    { id: 'esocial-s2240', icon: '⚗️', label: 'S-2240 Agentes', sub: 'Em breve' },

    { id: 'esocial-historico', icon: '📝', label: 'Histórico eSocial', sub: 'Em breve' },

    { id: 'esocial-config', icon: '🔐', label: 'Config eSocial', sub: 'Em breve' },

    null,

    { id: 'compliance-dashboard', icon: '⚖️', label: 'Compliance Engine', sub: 'MTE · DOU · Fundacentro · eSocial' },

    { id: 'compliance-normas', icon: '📚', label: 'Normas regulatórias', sub: 'Catálogo versionado' },

    { id: 'compliance-alertas', icon: '🔔', label: 'Alertas compliance', sub: 'Novas normas · revisões' },

    { id: 'compliance-validacao', icon: '✅', label: 'Validação humana', sub: 'Aprovar detecções' },

    { id: 'compliance-relatorios', icon: '📄', label: 'Relatórios compliance', sub: 'Impacto legal' },

    { id: 'compliance-fontes', icon: '🌐', label: 'Fontes monitoradas', sub: 'Varredura · agendamento diário' },
    { id: 'compliance-adequacao', icon: '📋', label: 'Adequação', sub: 'Tarefas · impacto clientes' },

    { id: 'settings', icon: '⚙️', label: 'Configurações', sub: 'Motor IA · Câmera' },

  ];



  const menuGo = (id: ScreenId) => {

    closeMenu();

    setTimeout(() => go(id), 80);

  };



  return (

    <div

      id="menuOverlay"

      className={menuOpen ? 'open' : ''}

      onClick={(e) => e.target === e.currentTarget && closeMenu()}

    >

      <div

        id="menuDrawer"

        onTouchStart={(e) => ((e.currentTarget as HTMLElement & { _tsx?: number })._tsx = e.touches[0].clientX)}

        onTouchEnd={(e) => {

          const start = (e.currentTarget as HTMLElement & { _tsx?: number })._tsx ?? 0;

          if (e.changedTouches[0].clientX - start < -55) closeMenu();

        }}

      >

        <div className="drawer-hdr">

        <ErgoSenseLogo size="md" showTagline />

        </div>

        <div className="drawer-profile">

          <div className="dp-av">👤</div>

          <div>

            <div className="dp-name">{session?.name ?? 'Lucas Andrade'}</div>

            <div className="dp-role">

              {session?.role ?? 'Ergonomista Sênior'} · {selectedCompany.name}

            </div>

            <div className="badge bm mt4" style={{ fontSize: 9 }}>

              {session?.roleCode === 'ADMIN_EMPRESA'

                ? 'ADMIN EMPRESA'

                : session?.roleCode === 'ADMIN_GLOBAL'

                  ? 'ADMIN GLOBAL'

                  : session?.roleCode ?? 'ERGONOMISTA'}

            </div>

          </div>

        </div>

        <div className="di-wrap">

          {items.map((item, i) =>

            item === null ? (

              <div key={`sep-${i}`} className="di-sep" />

            ) : (

              <button
                key={item.id}
                type="button"
                data-screen-id={item.id}
                className={`di ${drawerActive === item.id ? 'on' : ''}`}
                onClick={() => menuGo(item.id as ScreenId)}
              >

                <div className="di-ico">{item.icon}</div>

                <div className="di-txt">

                  <div className="di-lbl">{item.label}</div>

                  <div className="di-sub">{item.sub}</div>

                </div>

                {item.badge && <div className="di-badge ta">{item.badge}</div>}

                {item.count !== undefined && item.count > 0 && (

                  <div className="di-badge ta fw8">{item.count}</div>

                )}

              </button>

            ),

          )}

          {!pwaInstalled && (
            <button
              type="button"
              className="di"
              style={{ marginTop: 4 }}
              onClick={() => {
                closeMenu();
                void downloadApp();
              }}
            >
              <div className="di-ico">⬇</div>
              <div className="di-txt">
                <div className="di-lbl">Instalar app</div>
                <div className="di-sub">Tela inicial · modo app</div>
              </div>
            </button>
          )}

          <button

            type="button"

            className="di"

            style={{ marginTop: 4 }}

            onClick={() => {

              closeMenu();

              showModal('Sair da Conta', 'Tem certeza que deseja encerrar a sessão?', 'Sim, Sair', logout);

            }}

          >

            <div className="di-ico">🚪</div>

            <div className="di-txt">

              <div className="di-lbl" style={{ color: 'var(--red)' }}>

                Sair

              </div>

              <div className="di-sub">Encerrar sessão</div>

            </div>

          </button>

        </div>

        <div className="drawer-ft">
          {globalSupportMode && (
            <button type="button" className="btn bc2 btn-rich" onClick={() => { closeMenu(); exitGlobalSupport(); }}>
              <span className="btn-rich-ico">🌐</span>
              <div className="btn-rich-body">
                <span className="btn-rich-main">Voltar ao painel</span>
                <span className="btn-rich-sub">Sair do ambiente de suporte</span>
              </div>
              <span className="btn-rich-chevron">‹</span>
            </button>
          )}
          {isGlobalAdmin && !globalSupportMode && (
            <button type="button" className="btn bc2 btn-rich" onClick={() => menuGo('global-admin')}>
              <span className="btn-rich-ico">🌐</span>
              <div className="btn-rich-body">
                <span className="btn-rich-main">Admin Global</span>
                <span className="btn-rich-sub">Gerenciar empresas</span>
              </div>
              <span className="btn-rich-chevron">›</span>
            </button>
          )}
          {!globalSupportMode && (
            <button
              type="button"
              className="btn bs btn-rich"
              onClick={() => {
                if (isGlobalAdmin) menuGo('company');
                else closeMenu();
              }}
            >
              <span className="btn-rich-ico">⚙️</span>
              <div className="btn-rich-body">
                <span className="btn-rich-main">{selectedCompany.name}</span>
                <span className="btn-rich-sub">
                  {session?.location ?? 'Carajás'}
                  {isGlobalAdmin ? ' · Trocar empresa' : ' · Sua empresa'}
                </span>
              </div>
              {isGlobalAdmin ? <span className="btn-rich-chevron">›</span> : null}
            </button>
          )}
        </div>

      </div>

    </div>

  );

}



