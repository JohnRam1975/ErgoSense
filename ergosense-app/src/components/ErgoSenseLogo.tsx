/** Marca ErgoSense — ícone laranja com braço de robô + wordmark */
function LogoMark({ size }: { size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' }) {
  return (
    <div className={`ergo-logo-mark ergo-logo-mark--${size}`} aria-hidden>
      <span className="ergo-logo-robot">🦾</span>
    </div>
  );
}

export function ErgoSenseLogo({
  size = 'md',
  showText = true,
  showTagline = false,
  className = '',
  onClick,
}: {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  showTagline?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  const Tag = onClick ? 'button' : 'div';
  const extra = [
    `ergo-logo--${size}`,
    showText && size === 'xs' ? 'ergo-logo--xs-text' : '',
    onClick ? 'ergo-logo--btn' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  const props = onClick
    ? { type: 'button' as const, onClick, className: `ergo-logo ${extra}`.trim() }
    : { className: `ergo-logo ${extra}`.trim() };

  return (
    <Tag {...props} aria-label={onClick ? 'ErgoSense — início' : 'ErgoSense'}>
      <LogoMark size={size} />
      {showText && (
        <div className="ergo-logo-copy">
          <div className="ergo-logo-word">
            ERGO<span className="ergo-logo-accent">SENSE</span>
          </div>
          {showTagline && <div className="ergo-logo-tagline">AI · Ergonomia para todas as atividades</div>}
        </div>
      )}
    </Tag>
  );
}
