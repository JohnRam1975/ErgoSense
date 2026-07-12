import type { LoadDistanceEstimate } from '../types/loadAssessment';
import { LOAD_DISTANCE_OPTIMAL_CM } from '../utils/loadHandling';
import { loadProximityLabel } from '../utils/loadDistanceEstimation';
import { riskBadgeClass, riskLabel } from '../utils/ergonomics';
import type { RiskLevel } from '../types';

interface LoadRiskPanelProps {
  weightKg: number;
  estimate: LoadDistanceEstimate | null;
  liveRisk?: RiskLevel | null;
  liveScore?: number;
}

export function LoadRiskPanel({ weightKg, estimate, liveRisk, liveScore }: LoadRiskPanelProps) {
  const dist = estimate?.distanceCm ?? 0;
  const prox = loadProximityLabel(dist);
  const proxLabel =
    prox === 'proxima'
      ? 'Próxima ao corpo'
      : prox === 'moderada'
        ? 'Distância moderada'
        : prox === 'distante'
          ? 'Carga distante'
          : 'Medindo...';

  return (
    <div className="load-risk-panel">
      <div className="load-risk-panel-title">CARGA · AO VIVO</div>
      <div className="load-risk-panel-row">
        <span>Peso</span>
        <strong>{weightKg > 0 ? `${weightKg} kg` : '—'}</strong>
      </div>
      <div className="load-risk-panel-row">
        <span>Distância</span>
        <strong>{dist > 0 ? `${dist} cm` : '—'}</strong>
      </div>
      <div className="load-risk-panel-row">
        <span>Referência</span>
        <strong>≤{LOAD_DISTANCE_OPTIMAL_CM} cm</strong>
      </div>
      <div className={`load-risk-panel-prox load-risk-panel-prox--${prox}`}>{proxLabel}</div>
      {estimate && estimate.confidence > 0 && (
        <div className="load-risk-panel-conf">Confiança visão: {Math.round(estimate.confidence * 100)}%</div>
      )}
      {liveRisk && liveScore !== undefined && (
        <div className={`badge ${riskBadgeClass(liveRisk)} load-risk-panel-badge`}>
          {liveScore} · {riskLabel(liveRisk)}
        </div>
      )}
    </div>
  );
}
