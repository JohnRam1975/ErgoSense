interface UpgradeBannerProps {
  message?: string;
  onUpgrade?: () => void;
}

export function UpgradeBanner({
  message = 'Recurso disponível no plano Profissional. Faça upgrade para relatório completo, histórico ilimitado e exportação PDF.',
  onUpgrade,
}: UpgradeBannerProps) {
  return (
    <div className="upgrade-banner" role="status">
      <span className="upgrade-banner-icon">⭐</span>
      <p className="upgrade-banner-text">{message}</p>
      {onUpgrade && (
        <button type="button" className="btn bp btn-sm upgrade-banner-btn" onClick={onUpgrade}>
          Conhecer planos
        </button>
      )}
    </div>
  );
}
