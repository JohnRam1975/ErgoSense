import { useApp } from '../context/AppContext';

const HIDDEN_ON = new Set(['global-admin', 'camera', 'splash', 'login', 'register-company', 'request-access', 'request-access-autonomo']);

/** Barra compacta — só no modo suporte do Admin Global (dentro do tenant). */
export function SupportModeBar() {
  const { globalSupportMode, selectedCompany, exitGlobalSupport, screen } = useApp();

  if (!globalSupportMode || HIDDEN_ON.has(screen)) {
    return null;
  }

  return (
    <div className="support-mode-bar" role="banner">
      <button type="button" className="btn bc2 btn-icon" onClick={exitGlobalSupport} aria-label="Voltar ao painel">
        ‹
      </button>
      <div className="support-mode-bar-text">
        <span className="support-mode-bar-kicker">Suporte</span>
        <span className="support-mode-bar-tenant">{selectedCompany.name}</span>
      </div>
      <button type="button" className="btn bc2 btn-sm btn-inline" onClick={exitGlobalSupport}>
        Voltar ao painel
      </button>
    </div>
  );
}

export function SupportModeCameraExit() {
  const { globalSupportMode, exitGlobalSupport, screen } = useApp();
  if (!globalSupportMode || screen !== 'camera') return null;

  return (
    <button type="button" className="btn bc2 btn-sm btn-inline support-mode-camera-exit" onClick={exitGlobalSupport}>
      ‹ Painel
    </button>
  );
}
