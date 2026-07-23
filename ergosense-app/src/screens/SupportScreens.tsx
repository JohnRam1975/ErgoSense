import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { NavHeader } from '../components/UI';
import { formatDateTime } from '../utils/datetime';

function actionLabel(action: string) {
  const map: Record<string, string> = {
    SUPORTE_AUTORIZADO: 'Suporte autorizado',
    SUPORTE_ACESSO: 'Acesso do suporte',
    SUPORTE_EXPIRADO: 'Suporte expirado',
    SUPORTE_REVOGADO: 'Suporte revogado',
  };
  return map[action] ?? action;
}

export function SupportAccessScreen() {
  const {
    go,
    isTenantAdmin,
    supportStatus,
    supportAudit,
    refreshSupportStatus,
    refreshSupportAudit,
    authorizeSupport,
    revokeSupport,
    showModal,
    session,
    selectedCompany,
  } = useApp();

  const [modalOpen, setModalOpen] = useState(false);
  const [duration, setDuration] = useState<'1h' | '24h' | '7d'>('24h');
  const [reason, setReason] = useState('');
  const [view, setView] = useState<'panel' | 'history'>('panel');

  useEffect(() => {
    if (!isTenantAdmin) return;
    void refreshSupportStatus();
    void refreshSupportAudit();
  }, [isTenantAdmin, refreshSupportAudit, refreshSupportStatus]);

  const confirmAuthorize = () => {
    setModalOpen(false);
    void authorizeSupport(duration, reason.trim() || undefined);
    setReason('');
  };

  const confirmRevoke = () => {
    showModal(
      'Revogar suporte',
      'O administrador global perderá acesso imediato aos dados operacionais. Confirmar?',
      'Revogar agora',
      () => void revokeSupport(),
    );
  };

  if (!isTenantAdmin) {
    return (
      <>
        <NavHeader back={() => go('settings')} title="Suporte da Plataforma" home={() => go('dashboard')} />
        <div className="scroll app-page">
          <div className="card support-info-card">
            <div className="admin-section-title">
              <span className="admin-section-bar" />
              Acesso restrito
            </div>
            <p className="support-intro" style={{ marginTop: 0 }}>
              Somente o <strong>administrador da empresa</strong> (perfil <strong>ADMIN_EMPRESA</strong>) pode
              autorizar ou revogar o acesso técnico da ErgoSense aos dados operacionais (LGPD).
            </p>
            <p className="support-intro">
              Seu perfil atual ({session?.roleCode ?? 'ERGONOMISTA'}) não tem essa permissão. Peça ao administrador
              da empresa para liberar o suporte em <strong>Configurações → Autorizar suporte da plataforma</strong>.
            </p>
            <button type="button" className="btn bp" onClick={() => go('settings')}>
              Ir para Configurações
            </button>
          </div>
        </div>
      </>
    );
  }

  const active = supportStatus?.supportAuthorized;

  if (view === 'history') {
    return (
      <>
        <NavHeader back={() => setView('panel')} title="Histórico de acessos" home={() => go('dashboard')} />
        <div className="scroll app-page">
          {supportAudit.length === 0 ? (
            <div className="admin-empty">
              <p>Nenhum evento registrado.</p>
            </div>
          ) : (
            supportAudit.map((e) => (
              <div key={e.id} className="card support-audit-item">
                <div className="support-audit-action">{actionLabel(e.action)}</div>
                <div className="support-audit-meta">
                  {formatDateTime(e.at)}
                  {e.globalUser ? ` · ${e.globalUser}` : ''}
                  {e.authorizedBy ? ` · Autorizador: ${e.authorizedBy}` : ''}
                </div>
                {e.module && <div className="support-audit-sub">Módulo: {e.module}</div>}
                {e.note && <div className="support-audit-sub">{e.note}</div>}
                {e.ip && <div className="support-audit-sub">IP: {e.ip}</div>}
              </div>
            ))
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <NavHeader back={() => go('settings')} title="Suporte da Plataforma" home={() => go('dashboard')} />
      <div className="scroll app-page">
        <div className="support-status-card">
          <div className="support-status-kicker">Status do suporte</div>
          {active ? (
            <>
              <div className="support-status-line support-status-line--ok">🟢 Suporte autorizado</div>
              <div className="support-status-detail">
                Até {formatDateTime(supportStatus?.supportExpiresAt)}
              </div>
              {supportStatus?.authorizedBy && (
                <div className="support-status-detail">Autorizado por: {supportStatus.authorizedBy}</div>
              )}
            </>
          ) : (
            <div className="support-status-line support-status-line--off">🔴 Nenhum acesso de suporte autorizado</div>
          )}
        </div>

        <p className="support-intro">
          O Administrador Global da ErgoSense <strong>não acessa</strong> colaboradores, análises ou dados
          operacionais sem autorização explícita do <strong>administrador desta empresa</strong> (ADMIN_EMPRESA).
          Ergonomistas e demais perfis não podem liberar esse acesso. Toda ação fica registrada para auditoria
          (LGPD).
        </p>

        <div className="support-actions">
          <button type="button" className="btn bp" onClick={() => setModalOpen(true)}>
            Autorizar suporte
          </button>
          {active && (
            <button type="button" className="btn bd" onClick={confirmRevoke}>
              Revogar acesso imediatamente
            </button>
          )}
          <button type="button" className="btn bs" onClick={() => setView('history')}>
            Ver histórico de acessos
          </button>
        </div>

        <div className="card support-info-card">
          <div className="admin-section-title">
            <span className="admin-section-bar" />
            Resumo do tenant
          </div>
          <div className="support-info-grid">
            <div><span>Empresa</span><strong>{selectedCompany.name}</strong></div>
            <div><span>Plano</span><strong>{supportStatus?.plan ?? 'Standard'}</strong></div>
            <div><span>Usuários</span><strong>{supportStatus?.userCount ?? '—'}</strong></div>
            <div><span>Admin</span><strong>{session?.name ?? '—'}</strong></div>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="support-modal-overlay" onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="support-modal">
            <h2 className="support-modal-title">Autorizar suporte da plataforma</h2>
            <p className="support-modal-desc">
              Escolha por quanto tempo a equipe ErgoSense poderá acessar dados operacionais para suporte técnico.
              Esta liberação só pode ser feita pelo administrador da empresa.
            </p>
            <label className="lbl">Prazo de liberação</label>
            <select className="inp" value={duration} onChange={(e) => setDuration(e.target.value as typeof duration)}>
              <option value="1h">Liberar acesso por 1 hora</option>
              <option value="24h">Liberar acesso por 24 horas</option>
              <option value="7d">Liberar acesso por 7 dias</option>
            </select>
            <label className="lbl">Motivo (opcional)</label>
            <input
              className="inp"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex.: Ajuste de integração NR-17"
            />
            <div className="support-modal-actions">
              <button type="button" className="btn bs" onClick={() => setModalOpen(false)}>
                Cancelar
              </button>
              <button type="button" className="btn bp" onClick={confirmAuthorize}>
                Confirmar liberação
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
