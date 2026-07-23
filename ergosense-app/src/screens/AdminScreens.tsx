import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ErgoSenseLogo } from '../components/ErgoSenseLogo';

const colorStyles: Record<string, { bg: string; border: string }> = {
  amber: { bg: 'var(--a10)', border: 'var(--a35)' },
  cyan: { bg: 'var(--c10)', border: 'var(--c25)' },
  green: { bg: 'var(--g10)', border: 'var(--g25)' },
  neutral: { bg: 'var(--bg3)', border: 'var(--b1)' },
};

import { formatDateTime, timeRemaining } from '../utils/datetime';

export function GlobalAdminScreen() {
  const {
    session,
    tenantMetadata,
    refreshCompanies,
    go,
    accessTenantWithSupport,
    showModal,
    logout,
    dbConnected,
  } = useApp();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'all' | 'support'>('all');

  useEffect(() => {
    void refreshCompanies();
  }, [refreshCompanies]);

  const filtered = tenantMetadata.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
  const activeSupport = tenantMetadata.filter((t) => t.supportActive);
  const list = tab === 'support' ? activeSupport : filtered;

  const stats = useMemo(() => {
    const active = tenantMetadata.filter((c) => c.active !== false).length;
    const employees = tenantMetadata.reduce((sum, c) => sum + (c.employees ?? 0), 0);
    return { total: tenantMetadata.length, active, employees, support: activeSupport.length };
  }, [tenantMetadata, activeSupport.length]);

  const openCompany = (id: string, supportActive: boolean) => {
    if (!supportActive) {
      showModal(
        'Suporte não autorizado',
        'Este tenant ainda não liberou acesso de suporte. Peça ao administrador da empresa (perfil ADMIN_EMPRESA) para autorizar em Configurações → Autorizar suporte da plataforma. Ergonomistas não podem liberar esse acesso. Ou use Ver / Editar para ver apenas metadados.',
        'Entendi',
      );
      return;
    }
    void accessTenantWithSupport(id);
  };

  const confirmLogout = () => {
    showModal('Sair da Conta', 'Encerrar sessão de administrador global?', 'Sim, Sair', logout);
  };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <ErgoSenseLogo size="md" showText showTagline className="ergo-logo--admin" />
        </div>
        <nav className="admin-nav">
          <button type="button" className="admin-nav-item on" onClick={() => go('global-admin')}>
            <span className="admin-nav-ico">🏢</span>
            <span>Empresas</span>
          </button>
          <button type="button" className="admin-nav-item" onClick={() => go('admin-access-control')}>
            <span className="admin-nav-ico">🔑</span>
            <span>Controle de Acesso</span>
          </button>
          <button type="button" className="admin-nav-item" onClick={() => go('admin-tenant-requests')}>
            <span className="admin-nav-ico">📋</span>
            <span>Solicitações</span>
          </button>
          <button type="button" className="admin-nav-item" onClick={() => go('admin-tenants-active')}>
            <span className="admin-nav-ico">✅</span>
            <span>Empresas Ativas</span>
          </button>
          <button type="button" className="admin-nav-item" onClick={() => go('admin-tenants-blocked')}>
            <span className="admin-nav-ico">🚫</span>
            <span>Empresas Bloqueadas</span>
          </button>
          <button type="button" className="admin-nav-item" onClick={() => go('admin-tenants-expired')}>
            <span className="admin-nav-ico">⏱</span>
            <span>Empresas Expiradas</span>
          </button>
          <button type="button" className="admin-nav-item" onClick={() => go('register-company')}>
            <span className="admin-nav-ico">➕</span>
            <span>Nova empresa</span>
          </button>
        </nav>
        <div className="admin-sidebar-foot">
          <div className="admin-user">
            <div className="admin-user-av">👤</div>
            <div className="admin-user-info">
              <div className="admin-user-name">{session?.name ?? 'Administrador'}</div>
              <div className="admin-user-role">Admin Global</div>
            </div>
          </div>
          <button type="button" className="admin-nav-item admin-nav-item--danger" onClick={confirmLogout}>
            <span className="admin-nav-ico">🚪</span>
            <span>Sair</span>
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <ErgoSenseLogo size="sm" showText className="admin-topbar-logo-mobile" />
            <div>
              <div className="admin-topbar-kicker">Painel da Plataforma</div>
              <h1 className="admin-topbar-title">Admin Global</h1>
            </div>
          </div>
          <div className="admin-topbar-actions">
            <button type="button" className="btn bp btn-sm btn-inline admin-btn-new" onClick={() => go('register-company')}>
              + Nova empresa
            </button>
            <button type="button" className="btn bd btn-sm btn-inline" onClick={confirmLogout} aria-label="Sair da conta">
              Sair
            </button>
          </div>
        </header>

        <div className="admin-content scroll">
          <div className="admin-welcome">
            <div>
              <div className="admin-welcome-kicker">Bem-vindo</div>
              <div className="admin-welcome-title">Olá, {session?.name?.split(' ')[0] ?? 'Admin'}</div>
              <p className="admin-welcome-desc">
                Gerencie empresas usuárias, cadastre novos tenants e acompanhe o uso do ErgoSense.
              </p>
            </div>
            {!dbConnected && <div className="badge br">API offline — inicie o servidor</div>}
          </div>

          <div className="admin-stats">
            <div className="admin-stat-card">
              <div className="admin-stat-value tc">{stats.total}</div>
              <div className="admin-stat-label">Empresas cadastradas</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-value tg">{stats.active}</div>
              <div className="admin-stat-label">Empresas ativas</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-value ta">{stats.support}</div>
              <div className="admin-stat-label">Suporte ativo agora</div>
            </div>
          </div>

          <div className="admin-tabs">
            <button type="button" className={`admin-tab ${tab === 'all' ? 'on' : ''}`} onClick={() => setTab('all')}>
              Todas empresas
            </button>
            <button type="button" className={`admin-tab ${tab === 'support' ? 'on' : ''}`} onClick={() => setTab('support')}>
              Suporte ativo ({activeSupport.length})
            </button>
          </div>

          <div className="admin-toolbar">
            <div className="admin-section-title">
              <span className="admin-section-bar" />
              {tab === 'support' ? 'Tenants com suporte autorizado' : 'Metadados das empresas'} ({list.length})
            </div>
            <input
              className="inp admin-search"
              placeholder="Buscar empresa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {list.length === 0 ? (
            <div className="admin-empty">
              <div className="admin-empty-icon">{tab === 'support' ? '🔒' : '🏢'}</div>
              <p>{tab === 'support' ? 'Nenhum tenant com suporte ativo no momento.' : 'Nenhuma empresa encontrada.'}</p>
              {tab === 'all' && (
                <button type="button" className="btn bp btn-sm btn-inline" onClick={() => go('register-company')}>
                  Cadastrar empresa
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Empresa</th>
                      <th>Plano</th>
                      <th>Usuários</th>
                      <th>Status</th>
                      {tab === 'support' && (
                        <>
                          <th>Início</th>
                          <th>Expira</th>
                          <th>Restante</th>
                        </>
                      )}
                      <th aria-label="Ações" />
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((c) => {
                      const cs = colorStyles[c.color] ?? colorStyles.neutral;
                      return (
                        <tr key={c.id}>
                          <td>
                            <div className="admin-table-company">
                              <span className="admin-table-icon" style={{ background: cs.bg, border: `1px solid ${cs.border}` }}>
                                {c.icon}
                              </span>
                              <span>
                                {c.name}
                                <div className="admin-table-sub">{c.industry}</div>
                              </span>
                            </div>
                          </td>
                          <td>{c.plan}</td>
                          <td>{c.userCount}</td>
                          <td>
                            <span
                              className={`badge ${
                                c.supportActive ? 'bi' : c.active ? 'bl' : 'br'
                              }`}
                            >
                              {c.supportActive ? 'SUPORTE OK' : c.active ? 'ATIVA' : 'INATIVA'}
                            </span>
                          </td>
                          {tab === 'support' && (
                            <>
                              <td>{formatDateTime(c.supportStartsAt)}</td>
                              <td>{formatDateTime(c.supportExpiresAt)}</td>
                              <td>{timeRemaining(c.supportExpiresAt)}</td>
                            </>
                          )}
                          <td className="admin-table-actions">
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                className="btn bs btn-sm btn-inline"
                                onClick={() => {
                                  sessionStorage.setItem('ergosense_admin_tenant_id', c.id);
                                  go('admin-tenant-detail');
                                }}
                              >
                                Ver / Editar
                              </button>
                              <button
                                type="button"
                                className={`btn btn-sm btn-inline ${c.supportActive ? 'bp' : 'bs'} admin-table-btn`}
                                title={
                                  c.supportActive
                                    ? 'Entrar no ambiente do tenant (suporte autorizado)'
                                    : 'Suporte ainda não autorizado — clique para ver como liberar'
                                }
                                onClick={() => openCompany(c.id, c.supportActive)}
                              >
                                {c.supportActive ? 'Acessar ambiente' : 'Suporte pendente'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="admin-cards-mobile">
                {list.map((c) => {
                  const cs = colorStyles[c.color] ?? colorStyles.neutral;
                  return (
                    <div key={c.id} className="cch admin-company-card">
                      <div className="ci" style={{ background: cs.bg, border: `1px solid ${cs.border}` }}>
                        {c.icon}
                      </div>
                      <div className="admin-company-card-body">
                        <div className="admin-company-card-name">{c.name}</div>
                        <div className="admin-company-card-meta">
                          {c.plan} · {c.userCount} usuários · {c.storageMb ?? 0} MB
                        </div>
                        {c.supportActive && (
                          <div className="admin-company-card-meta">
                            Suporte até {formatDateTime(c.supportExpiresAt)} ({timeRemaining(c.supportExpiresAt)})
                          </div>
                        )}
                        <div
                          className={`badge ${
                            c.supportActive ? 'bi' : c.active ? 'bl' : 'br'
                          } mt4`}
                        >
                          {c.supportActive ? 'SUPORTE AUTORIZADO' : c.active ? 'ATIVA' : 'INATIVA'}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn bs btn-sm btn-inline"
                        onClick={() => {
                          sessionStorage.setItem('ergosense_admin_tenant_id', c.id);
                          go('admin-tenant-detail');
                        }}
                      >
                        Ver / Editar
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm btn-inline ${c.supportActive ? 'bp' : 'bs'} admin-table-btn`}
                        title={
                          c.supportActive
                            ? 'Entrar no ambiente do tenant (suporte autorizado)'
                            : 'Suporte ainda não autorizado — clique para ver como liberar'
                        }
                        onClick={() => openCompany(c.id, c.supportActive)}
                      >
                        {c.supportActive ? 'Acessar' : 'Suporte pendente'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
