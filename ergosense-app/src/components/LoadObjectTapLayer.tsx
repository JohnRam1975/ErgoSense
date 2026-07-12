import type { ScreenPoint } from '../utils/measureLoadDistance';

interface LoadObjectTapLayerProps {
  /** Permite toque para fixar o objeto na imagem */
  tapActive: boolean;
  trunk?: ScreenPoint | null;
  load?: ScreenPoint | null;
  distanceCm?: number;
  tracking?: boolean;
  onTap: (point: ScreenPoint) => void;
}

export function LoadObjectTapLayer({
  tapActive,
  trunk,
  load,
  distanceCm,
  tracking,
  onTap,
}: LoadObjectTapLayerProps) {
  const showMarkers = !!(trunk && load);

  return (
    <div className="load-tap-wrap">
      {showMarkers && (
        <svg className="load-tap-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          <line
            x1={trunk!.x * 100}
            y1={trunk!.y * 100}
            x2={load!.x * 100}
            y2={load!.y * 100}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}
      {tapActive && (
        <div
          className="load-tap-layer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            onTap({
              x: (e.clientX - rect.left) / rect.width,
              y: (e.clientY - rect.top) / rect.height,
            });
          }}
          role="button"
          tabIndex={0}
          aria-label="Toque sobre o objeto para a câmera rastrear a carga"
        />
      )}
      {trunk && (
        <span
          className="load-tap-marker load-tap-marker--tronco"
          style={{ left: `${trunk.x * 100}%`, top: `${trunk.y * 100}%` }}
          title="Tronco"
        />
      )}
      {load && (
        <span
          className="load-tap-marker load-tap-marker--carga"
          style={{ left: `${load.x * 100}%`, top: `${load.y * 100}%` }}
          title="Objeto / mãos"
        />
      )}
      <p className="load-tap-hint">
        {distanceCm && distanceCm > 0
          ? `Distância: ${distanceCm} cm`
          : tracking
            ? 'Rastreando objeto e corpo…'
            : tapActive
              ? 'Toque no objeto ou mostre as mãos com a carga'
              : 'Aguardando corpo na câmera…'}
      </p>
    </div>
  );
}
