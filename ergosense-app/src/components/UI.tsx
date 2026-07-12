import { useApp } from '../context/AppContext';
import { ErgoSenseLogo } from './ErgoSenseLogo';
import { useClock } from '../hooks/useClock';

export function StatusBar({ hidden }: { hidden?: boolean }) {
  const time = useClock();
  if (hidden) return null;
  return (
    <div id="statusBar">
      <span className="sb-time">{time}</span>
      <div className="sb-icons">
        <div className="dot-g" />
        <div className="sb-wifi" />
        <div className="sb-bat" />
      </div>
    </div>
  );
}

export function Toast() {
  const { toast } = useApp();
  return (
    <div id="toast" className={toast ? `show ${toast.type}` : ''}>
      {toast?.msg ?? ''}
    </div>
  );
}

export function Modal() {
  const { modal, closeModal } = useApp();
  return (
    <div
      id="modal"
      className={modal.open ? 'open' : ''}
      onClick={(e) => e.target === e.currentTarget && closeModal()}
    >
      <div className="modal-box">
        <div className="modal-title">{modal.title}</div>
        <div className="modal-body">{modal.body}</div>
        <button
          className="btn bp mb0"
          onClick={() => {
            modal.onConfirm?.();
            closeModal();
          }}
        >
          {modal.confirmLabel}
        </button>
        <button className="btn bp" style={{ marginTop: 8, opacity: 0.85 }} onClick={closeModal}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

export function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button type="button" className={`tog ${on ? 'on' : 'off'}`} onClick={onToggle}>
      <div className="tok" />
    </button>
  );
}

export function NavHeader({
  back,
  title,
  action,
  home,
}: {
  back?: () => void;
  title: string;
  action?: { icon: string; onClick: () => void; title?: string };
  home?: () => void;
}) {
  return (
    <div className="nav-hdr">
      {back ? (
        <button type="button" className="btn-back" onClick={back} title="Voltar">
          ←
        </button>
      ) : (
        <div style={{ width: 40 }} />
      )}
      <div className="nav-hdr-brand">
        <ErgoSenseLogo size="sm" showText />
        <div className="hdr-title">{title}</div>
      </div>
      {action ? (
        <button type="button" className="btn-act" onClick={action.onClick} title={action.title}>
          {action.icon}
        </button>
      ) : home ? (
        <button type="button" className="btn-home" onClick={home} title="Início">
          🏠
        </button>
      ) : (
        <div style={{ width: 40 }} />
      )}
    </div>
  );
}

export function OptionSheet({
  open,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: {
  open: boolean;
  title: string;
  options: readonly { id: string; label: string; sub?: string }[];
  selected: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="option-sheet open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="option-sheet-box">
        <div className="modal-title">{title}</div>
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={`option-row ${selected === opt.label ? 'on' : ''}`}
            onClick={() => {
              onSelect(opt.id);
              onClose();
            }}
          >
            <div className="option-row-radio">{selected === opt.label ? '✓' : ''}</div>
            <div>
              <div className="option-row-label">{opt.label}</div>
              {opt.sub && <div className="option-row-sub">{opt.sub}</div>}
            </div>
          </button>
        ))}
        <button type="button" className="btn bp mb0" style={{ marginTop: 12 }} onClick={onClose}>
          Fechar
        </button>
      </div>
    </div>
  );
}

export function AnalysisCard({
  icon,
  iconBg,
  name,
  subtitle,
  badge,
  badgeClass,
  onClick,
}: {
  icon: string;
  iconBg: string;
  name: string;
  subtitle: string;
  badge: string | number;
  badgeClass?: string;
  onClick?: () => void;
}) {
  return (
    <button type="button" className="ac" onClick={onClick}>
      <div className="av" style={{ background: iconBg }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'var(--fd)', fontSize: 15, fontWeight: 700, color: 'var(--t0)' }}>
          {name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--t1)' }}>{subtitle}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className={`badge ${badgeClass ?? 'bm'}`}>{badge}</div>
      </div>
    </button>
  );
}