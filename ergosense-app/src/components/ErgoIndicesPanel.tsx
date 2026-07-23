import { ERGO_INDEX_BANDS, ergoIndexBandLabel } from '../config/ergoMethodology';
import type { ErgoSenseIndices } from '../utils/ergoIndices';
import type { SamplingConfidenceResult } from '../utils/samplingConfidence';

interface Props {
  indices: ErgoSenseIndices;
  sampling?: SamplingConfidenceResult;
  compact?: boolean;
}

function bandColor(band: keyof typeof ERGO_INDEX_BANDS | string | undefined): string {
  const entry = band ? ERGO_INDEX_BANDS[band as keyof typeof ERGO_INDEX_BANDS] : undefined;
  return entry?.color ?? 'var(--t1)';
}

export function ErgoIndicesPanel({ indices, sampling, compact }: Props) {
  const rows = [
    { key: 'IERE', label: 'Risco Ergonômico', value: indices.riskIndex, band: indices.riskBand },
    { key: 'IEE', label: 'Exposição', value: indices.exposureIndex, band: indices.exposureBand },
    { key: 'IECI', label: 'Conformidade Interna', value: indices.internalConformityIndex, band: indices.conformityBand },
  ] as const;

  return (
    <div className={`ergo-indices ${compact ? 'ergo-indices--compact' : ''}`}>
      {sampling && (
        <div className={`ergo-sampling ergo-sampling--${sampling.level}`}>
          <div className="ergo-sampling-label">Confiabilidade Estatística da Avaliação</div>
          <div className="ergo-sampling-value">{sampling.label}</div>
          <div className="ergo-sampling-desc">{sampling.description}</div>
          {sampling.blocksFormalReport && (
            <div className="ergo-sampling-warn">Amostragem insuficiente — repita a captura (mín. 30 s).</div>
          )}
        </div>
      )}
      <div className="ergo-indices-grid">
        {rows.map((r) => (
          <div key={r.key} className="ergo-index-card">
            <div className="ergo-index-kicker">{r.key}</div>
            <div className="ergo-index-value" style={{ color: bandColor(r.band) }}>
              {r.value}
            </div>
            <div className="ergo-index-label">{r.label}</div>
            <div className="ergo-index-band" style={{ color: bandColor(r.band) }}>
              {ergoIndexBandLabel(r.band)}
            </div>
          </div>
        ))}
      </div>
      {!compact && (
        <p className="ergo-indices-note t2">
          Índices ErgoSense — metodologia proprietária de apoio à AEP/AET. Não representam percentual legal oficial da NR-17.
        </p>
      )}
    </div>
  );
}
