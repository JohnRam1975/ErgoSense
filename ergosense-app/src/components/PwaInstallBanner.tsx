import { usePwaInstall } from '../hooks/usePwaInstall';

/** Banner fixo: sempre oferece baixar no PC e no celular (não depende só do beforeinstallprompt). */
export function PwaInstallBanner() {
  const { showBanner, downloadApp, dismiss, openGuide } = usePwaInstall();

  if (!showBanner) return null;

  return (
    <div className="pwa-install" role="region" aria-label="Baixar aplicativo">
      <div className="pwa-install__icon" aria-hidden>
        <img src="/ergosense-192.png" alt="" width={40} height={40} />
      </div>
      <div className="pwa-install__copy">
        <strong>Baixar ErgoSense</strong>
        <span>PC e celular · atalho + modo offline</span>
      </div>
      <button
        type="button"
        className="pwa-install__cta"
        onClick={() => {
          void downloadApp();
        }}
      >
        Baixar
      </button>
      <button type="button" className="pwa-install__more" onClick={openGuide} aria-label="Como instalar">
        ?
      </button>
      <button type="button" className="pwa-install__close" onClick={dismiss} aria-label="Agora não">
        ×
      </button>
    </div>
  );
}

/** Guia de instalação para PC (Chrome/Edge) e celular (Android/iOS). */
export function PwaInstallGuide() {
  const { guideOpen, closeGuide, canInstall, install, installed, platform } = usePwaInstall();

  if (!guideOpen || installed) return null;

  return (
    <div
      className="pwa-guide-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-guide-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeGuide();
      }}
    >
      <div className="pwa-guide">
        <div className="pwa-guide__head">
          <h2 id="pwa-guide-title">Baixar o app</h2>
          <button type="button" className="pwa-guide__x" onClick={closeGuide} aria-label="Fechar">
            ×
          </button>
        </div>
        <p className="pwa-guide__lead">Instale o ErgoSense no computador ou no celular — funciona como app nativo.</p>

        {canInstall && (
          <button
            type="button"
            className="btn bp pwa-guide__primary"
            onClick={() => {
              void install().then((ok) => {
                if (ok) closeGuide();
              });
            }}
          >
            ⬇ Instalar agora (navegador)
          </button>
        )}

        <div className={`pwa-guide__card${platform === 'desktop' ? ' pwa-guide__card--focus' : ''}`}>
          <div className="pwa-guide__kicker">Computador (PC)</div>
          <ol>
            <li>Abra no <strong>Chrome</strong> ou <strong>Edge</strong> (localhost ou HTTPS).</li>
            <li>Clique no ícone <strong>⊕ Instalar</strong> na barra de endereço — ou menu ⋮ → <strong>Instalar ErgoSense</strong>.</li>
            <li>Confirme. O app abre em janela própria.</li>
          </ol>
        </div>

        <div className={`pwa-guide__card${platform === 'android' ? ' pwa-guide__card--focus' : ''}`}>
          <div className="pwa-guide__kicker">Celular Android</div>
          <ol>
            <li>Abra no <strong>Chrome</strong>.</li>
            <li>Menu ⋮ → <strong>Instalar app</strong> / <strong>Adicionar à tela inicial</strong>.</li>
            <li>Ou toque em <strong>Baixar</strong> no banner do app.</li>
          </ol>
        </div>

        <div className={`pwa-guide__card${platform === 'ios' ? ' pwa-guide__card--focus' : ''}`}>
          <div className="pwa-guide__kicker">iPhone / iPad (Safari)</div>
          <ol>
            <li>Abra no <strong>Safari</strong> (obrigatório no iOS).</li>
            <li>Toque em <strong>Compartilhar</strong> (□↑).</li>
            <li>Escolha <strong>Adicionar à Tela de Início</strong> → Adicionar.</li>
          </ol>
        </div>

        <button type="button" className="btn bp" onClick={closeGuide}>
          Entendi
        </button>
      </div>
    </div>
  );
}

/** Card compacto para dashboard / settings. */
export function PwaDownloadCard() {
  const { installed, downloadApp, openGuide } = usePwaInstall();

  if (installed) return null;

  return (
    <div className="pwa-download-card">
      <div className="pwa-download-card__icon" aria-hidden>
        <img src="/ergosense-192.png" alt="" width={44} height={44} />
      </div>
      <div className="pwa-download-card__body">
        <strong>Baixar o app</strong>
        <span>Disponível no PC e no celular</span>
      </div>
      <div className="pwa-download-card__actions">
        <button type="button" className="pwa-download-card__btn" onClick={() => void downloadApp()}>
          Baixar
        </button>
        <button type="button" className="pwa-download-card__link" onClick={openGuide}>
          Como instalar
        </button>
      </div>
    </div>
  );
}
