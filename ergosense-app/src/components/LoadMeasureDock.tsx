import { useState } from 'react';
import type { LoadAssessmentManualInput } from '../types/loadAssessment';
import type { LoadEffortResult } from '../utils/calculateErgonomicLoadRisk';
import {
  calculateErgonomicLoadRisk,
  formatDistanceDisplay,
  LoadRiskValidationError,
} from '../utils/calculateErgonomicLoadRisk';
import { riskBadgeClass } from '../utils/ergonomics';
import { riskLevelLabelPt } from '../utils/ergonomicRiskEngine';
import { LOAD_EFFORT_RISK_BANDS } from '../config/loadRiskConfig';

interface LoadMeasureDockProps {
  manual: LoadAssessmentManualInput;
  measuredDistanceCm: number;
  measuring: boolean;
  tapMode: boolean;
  onToggleTapMode: () => void;
  onChange: (patch: Partial<LoadAssessmentManualInput>) => void;
  onCalculated?: (result: LoadEffortResult) => void;
}

export function LoadMeasureDock({
  manual,
  measuredDistanceCm,
  measuring,
  tapMode,
  onToggleTapMode,
  onChange,
  onCalculated,
}: LoadMeasureDockProps) {
  const [error, setError] = useState('');
  const [result, setResult] = useState<LoadEffortResult | null>(manual.effortResult ?? null);

  const distCm = manual.measuredDistanceCm ?? measuredDistanceCm ?? 0;
  const hasDistance = distCm > 0;

  const handleCalculate = () => {
    setError('');
    setResult(null);
    if (!hasDistance) {
      setError('Aguarde a câmera capturar a distância (corpo e carga visíveis).');
      return;
    }
    try {
      const effort = calculateErgonomicLoadRisk(manual.weightKg, distCm);
      setResult(effort);
      onChange({ effortResult: effort, measuredDistanceCm: distCm });
      onCalculated?.(effort);
    } catch (err) {
      setError(err instanceof LoadRiskValidationError ? err.message : 'Informe o peso da carga (kg).');
    }
  };

  return (
    <div className="load-measure-dock">
      <div className="load-measure-dock-head">Carga · peso × distância</div>

      <div className="load-measure-step load-measure-step--active">
        <span className="load-measure-step-num">1</span>
        <div className="load-measure-step-body">
          <span className="lbl">Distância (câmera rastreia o objeto)</span>
          {measuring && !hasDistance && (
            <p className="load-measure-capturing">Rastreando mãos/objeto e medindo distância ao corpo…</p>
          )}
          {hasDistance ? (
            <div className="load-measure-dist load-measure-dist--ok">
              Distância ao corpo: <strong>{formatDistanceDisplay(distCm)}</strong>
              <span className="load-measure-live"> · atualização automática</span>
            </div>
          ) : (
            <p className="load-report-no-dist">
              Mostre o corpo e segure a carga (ou toque no objeto na imagem). A linha âmbar indica o rastreio.
            </p>
          )}
          <button type="button" className={`btn bs btn-sm${tapMode ? ' on' : ''}`} onClick={onToggleTapMode}>
            {tapMode ? '✓ Toque no objeto ativo' : '👆 Toque no objeto'}
          </button>
        </div>
      </div>

      <div className={`load-measure-step${hasDistance ? ' load-measure-step--active' : ''}`}>
        <span className="load-measure-step-num">2</span>
        <div className="load-measure-step-body">
          <label className="lbl">2. Peso da carga (kg) — após a distância</label>
          <input
            className="inp inp--sm"
            type="number"
            min={0.1}
            step={0.1}
            value={manual.weightKg > 0 ? manual.weightKg : ''}
            onChange={(e) => {
              setResult(null);
              onChange({ weightKg: Number(e.target.value) || 0, effortResult: undefined });
            }}
            placeholder="Digite o peso"
          />
          <input
            className="inp inp--sm mt6"
            disabled={!hasDistance}
            value={manual.objectDescription ?? ''}
            onChange={(e) => onChange({ objectDescription: e.target.value })}
            placeholder="Descrição do objeto (opcional)"
          />
        </div>
      </div>

      {error && <p className="load-measure-error">{error}</p>}

      <button
        type="button"
        className="btn bp load-measure-calc-btn"
        onClick={handleCalculate}
        disabled={!hasDistance || !(manual.weightKg > 0)}
      >
        Calcular
      </button>

      {result && (
        <div className={`load-measure-result load-measure-result--${result.risk}`}>
          <div className="load-measure-result-title">Resultado</div>
          <div className={`badge ${riskBadgeClass(result.risk)}`}>{riskLevelLabelPt(result.risk)}</div>
          <div className="load-measure-result-grid">
            <div>
              <span>Distância (câmera)</span>
              <strong>{formatDistanceDisplay(result.distanceCm)}</strong>
            </div>
            <div>
              <span>Peso informado</span>
              <strong>{result.weightKg} kg</strong>
            </div>
            <div>
              <span>Índice peso × distância</span>
              <strong>{result.indiceEsforco}</strong>
              <em>
                {result.weightKg} × {result.distanceCm}
              </em>
            </div>
          </div>
          <p className="load-measure-rec">{result.recomendacao}</p>
          <div className="load-report-bands">
            Faixas: até {LOAD_EFFORT_RISK_BANDS.baixo.max} baixo · até {LOAD_EFFORT_RISK_BANDS.medio.max} médio · até{' '}
            {LOAD_EFFORT_RISK_BANDS.alto.max} alto · acima crítico
          </div>
        </div>
      )}
    </div>
  );
}
