import { usePwaInstall } from '../hooks/usePwaInstall';

function platformCtaLabel(platform: 'ios' | 'android' | 'desktop', canInstall: boolean) {
  if (canInstall) return 'Instalar';
  if (platform === 'ios') return 'Adicionar à tela';
  if (platform === 'android') return 'Instalar app';
  return 'Instalar no PC';
}

/** Banner flutuante: só quando o navegador oferece instalação nativa (Chrome/Edge). */
export function PwaInstallBanner() {
  const { showBanner, canInstall, downloadApp, dismiss, platform } = usePwaInstall();

  // Sem beforeinstallprompt (iOS / Safari / etc.) o banner vira só “explicação” — não mostrar.
  if (!showBanner || !canInstall) return null;

  return (
    <div className="pwa-install" role="region" aria-label="Instalar aplicativo">
      <div className="pwa-install__copy">
        <strong>Instalar ErgoSense</strong>
        <span>Abrir como app · tela cheia</span>
      </div>
      <button
        type="button"
        className="pwa-install__cta"
        onClick={() => {
          void downloadApp();
        }}
      >
        {platformCtaLabel(platform, true)}
      </button>
      <button type="button" className="pwa-install__close" onClick={dismiss} aria-label="Agora não">
        ×
      </button>
    </div>
  );
}

/** Guia curto: só o sistema atual (sem poluir com PC+Android+iOS juntos). */
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
          <h2 id="pwa-guide-title">Instalar ErgoSense</h2>
          <button type="button" className="pwa-guide__x" onClick={closeGuide} aria-label="Fechar">
            ×
          </button>
        </div>

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
            Instalar agora
          </button>
        )}

        {platform === 'desktop' && (
          <div className="pwa-guide__card pwa-guide__card--focus">
            <div className="pwa-guide__kicker">Computador</div>
            <ol>
              <li>Use <strong>Chrome</strong> ou <strong>Edge</strong> em HTTPS.</li>
              <li>Ícone <strong>Instalar</strong> na barra de endereço — ou menu ⋮ → <strong>Instalar ErgoSense</strong>.</li>
              <li>Confirme. O app abre em janela própria.</li>
            </ol>
          </div>
        )}

        {platform === 'android' && (
          <div className="pwa-guide__card pwa-guide__card--focus">
            <div className="pwa-guide__kicker">Android (Chrome)</div>
            <ol>
              <li>Abra este site no <strong>Chrome</strong>.</li>
              <li>Menu <strong>⋮</strong> → <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>.</li>
              <li>Confirme. O ícone aparece na tela inicial.</li>
            </ol>
          </div>
        )}

        {platform === 'ios' && (
          <div className="pwa-guide__card pwa-guide__card--focus">
            <div className="pwa-guide__kicker">iPhone / iPad</div>
            <ol>
              <li>Abra no <strong>Safari</strong> (obrigatório).</li>
              <li>Toque em <strong>Compartilhar</strong> (□↑).</li>
              <li><strong>Adicionar à Tela de Início</strong> → Adicionar.</li>
            </ol>
            <p className="pwa-guide__note">No iPhone o Safari não mostra botão “Baixar” — só este fluxo.</p>
          </div>
        )}

        <button type="button" className="btn bp" onClick={closeGuide}>
          Fechar
        </button>
      </div>
    </div>
  );
}

/** Link discreto (login) — sem card/ícone poluindo a tela. */
export function PwaDownloadCard() {
  const { installed, downloadApp, canInstall, platform } = usePwaInstall();

  if (installed) return null;

  return (
    <div className="pwa-download-link-wrap">
      <button type="button" className="login-text-link pwa-download-link" onClick={() => void downloadApp()}>
        {platformCtaLabel(platform, canInstall)}
      </button>
    </div>
  );
}
