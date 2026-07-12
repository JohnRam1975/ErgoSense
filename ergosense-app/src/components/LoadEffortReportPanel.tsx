import { useState } from 'react';
import type { Analysis } from '../types';
import type { LoadEffortResult } from '../utils/calculateErgonomicLoadRisk';
import {
  calculateErgonomicLoadRisk,
  formatDistanceDisplay,
  LoadRiskValidationError,
} from '../utils/calculateErgonomicLoadRisk';
import { riskBadgeClass } from '../utils/ergonomics';
import { riskLevelLabelPt } from '../utils/ergonomicRiskEngine';
import { LOAD_EFFORT_RISK_BANDS } from '../config/loadRiskConfig';
import { resolveCapturedDistanceCm } from '../utils/resolveCapturedDistance';

interface LoadEffortReportPanelProps {
  analysis: Analysis;
  onApply: (effort: LoadEffortResult, weightKg: number, distanceCm: number) => void;
}

export function LoadEffortReportPanel({ analysis, onApply }: LoadEffortReportPanelProps) {
  const measuredDist = resolveCapturedDistanceCm(analysis);
  const hasDistance = measuredDist > 0;
  const savedEffort = analysis.loadEffort ?? analysis.loadAssessment?.effort ?? null;

  const [weightKg, setWeightKg] = useState(
    savedEffort?.weightKg && savedEffort.weightKg > 0 ? String(savedEffort.weightKg) : '',
  );
  const [error, setError] = useState('');
  const [result, setResult] = useState<LoadEffortResult | null>(savedEffort);

  const objectDesc =
    analysis.loadManual?.objectDescription ??
    analysis.loadAssessment?.manual?.objectDescription ??
    '';

  const canCalculate = hasDistance && Number(weightKg) > 0;

  const handleCalculate = () => {
    setError('');
    if (!hasDistance) {
      setError(
        'Distância não registrada. Na próxima análise, mantenha corpo e carga visíveis na câmera antes de encerrar.',
      );
      return;
    }
    try {
      const effort = calculateErgonomicLoadRisk(Number(weightKg), measuredDist);
      setResult(effort);
      onApply(effort, effort.weightKg, effort.distanceCm);
    } catch (err) {
      setResult(null);
      setError(err instanceof LoadRiskValidationError ? err.message : 'Informe o peso da carga (kg).');
    }
  };

  return (
    <div className="load-report-panel">
      <div className="load-report-panel-head">
        <span className="load-report-panel-icon">⚖️</span>
        <div>
          <div className="load-report-panel-title">Peso × distância da carga</div>
          <div className="load-report-panel-sub">
            A distância vem da câmera. Digite o peso abaixo e toque em Calcular.
          </div>
        </div>
      </div>

      <div className="load-report-form">
        <div className="load-report-distance-readonly">
          <span className="lbl">1. Distância da carga ao corpo (câmera)</span>
          {hasDistance ? (
            <div className="load-measure-dist load-measure-dist--ok">
              Capturada: <strong>{formatDistanceDisplay(measuredDist)}</strong>
            </div>
          ) : (
            <p className="load-report-no-dist load-report-no-dist--warn">
              Não registrada nesta sessão. Refaça a análise com a carga visível na câmera.
            </p>
          )}
        </div>

        <div className="load-report-field">
          <label className="lbl">2. Peso estimado do objeto (kg)</label>
          <input
            className="inp"
            type="number"
            min={0.1}
            step={0.1}
            placeholder="Digite o peso em kg"
            value={weightKg}
            onChange={(e) => {
              setWeightKg(e.target.value);
              setResult(null);
            }}
          />
        </div>

        {objectDesc && (
          <div className="load-report-object">
            <span className="lbl">Objeto</span> {objectDesc}
          </div>
        )}
      </div>

      {error && <p className="load-measure-error">{error}</p>}

      <button
        type="button"
        className={`btn bp load-measure-calc-btn${!canCalculate ? ' load-measure-calc-btn--off' : ''}`}
        onClick={handleCalculate}
      >
        Calcular
      </button>

      {result && (
        <div className={`load-report-result load-report-result--${result.risk}`}>
          <div className="load-measure-result-title">Resultado</div>
          <div className={`badge ${riskBadgeClass(result.risk)}`}>{riskLevelLabelPt(result.risk)}</div>
          <div className="load-report-metrics">
            <div className="load-report-metric load-report-metric--highlight">
              <span>Distância (câmera)</span>
              <strong>{result.distanceCm} cm</strong>
              <em>{result.distanceM} m</em>
            </div>
            <div className="load-report-metric">
              <span>Peso informado</span>
              <strong>{result.weightKg} kg</strong>
            </div>
            <div className="load-report-metric">
              <span>Índice peso × distância</span>
              <strong>{result.indiceEsforco}</strong>
              <em>
                {result.weightKg} × {result.distanceCm}
              </em>
            </div>
          </div>
          <p className="load-report-rec report-justify">{result.recomendacao}</p>
          <div className="load-report-bands">
            Faixas: até {LOAD_EFFORT_RISK_BANDS.baixo.max} baixo · até {LOAD_EFFORT_RISK_BANDS.alto.max} alto · acima
            crítico
          </div>
        </div>
      )}
    </div>
  );
}
