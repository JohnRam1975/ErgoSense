import { useCallback, useRef, useState } from 'react';
import type { LoadRiskResult } from '../types/loadAssessment';
import { factorDetail, factorLabel } from '../utils/loadFactorMeta';

interface LoadFactorsPanelProps {
  loadResult: LoadRiskResult;
}

export function LoadFactorsPanel({ loadResult }: LoadFactorsPanelProps) {
  const [activeFactor, setActiveFactor] = useState<string | null>(null);
  const recRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const toggleFactor = useCallback(
    (factorId: string) => {
      setActiveFactor((prev) => (prev === factorId ? null : factorId));
      const meta = factorDetail(factorId, loadResult);
      const recId = meta.recommendation?.id;
      if (recId) {
        requestAnimationFrame(() => {
          recRefs.current[recId]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
      }
    },
    [loadResult],
  );

  if (!loadResult.factorsFound.length) return null;

  const activeDetail = activeFactor ? factorDetail(activeFactor, loadResult) : null;

  return (
    <div className="load-result-factors">
      <span className="lbl">Principais fatores</span>
      <p className="load-factors-hint">Toque em um fator para ver a explicação e a recomendação.</p>
      <div className="load-result-tags" role="group" aria-label="Principais fatores de risco">
        {loadResult.factorsFound.map((f) => (
          <button
            key={f}
            type="button"
            className={`tag load-factor-btn${activeFactor === f ? ' on' : ''}`}
            aria-pressed={activeFactor === f}
            onClick={() => toggleFactor(f)}
          >
            {factorLabel(f)}
          </button>
        ))}
      </div>
      {activeDetail && (
        <div className="load-factor-detail" role="region" aria-live="polite">
          <strong>{activeDetail.label}</strong>
          <p>{activeDetail.description}</p>
        </div>
      )}
      <div className="load-result-recs">
        {loadResult.recomendacoes.slice(0, 6).map((r) => (
          <div
            key={r.id}
            ref={(el) => {
              recRefs.current[r.id] = el;
            }}
            className={`load-rec load-rec--${r.prioridade}${
              activeDetail?.recommendation?.id === r.id ? ' load-rec--highlight' : ''
            }`}
          >
            <strong>{r.titulo}</strong>
            <p>{r.detalhe}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
