import type { PostureRiskFlags } from '../utils/ergonomics';
import type { WorkstationMetrics } from '../types/workstation';

interface WorkstationPanelProps {
  metrics: WorkstationMetrics;
  risks: PostureRiskFlags;
}

function MetricRow({
  label,
  value,
  atRisk,
  sub,
}: {
  label: string;
  value: string;
  atRisk: boolean;
  sub?: string;
}) {
  return (
    <div className={`ws-metric${atRisk ? ' ws-metric--risk' : ' ws-metric--ok'}`}>
      <div className="ws-metric-lbl">{label}</div>
      <div className="ws-metric-val">{value}</div>
      {sub && <div className="ws-metric-sub">{sub}</div>}
    </div>
  );
}

export function WorkstationPanel({ metrics, risks }: WorkstationPanelProps) {
  const alturaLabel =
    metrics.telaAltura === 'ideal' ? 'Nível dos olhos' : metrics.telaAltura === 'baixa' ? 'Muito baixa' : 'Muito alta';
  const filtroLabel =
    metrics.filtroTela === 'adequado' ? 'Filtro OK' : metrics.filtroTela === 'parcial' ? 'Parcial' : 'Sem filtro';
  const luzLabel = metrics.nivelLuz === 'adequado' ? 'Adequada' : metrics.nivelLuz === 'baixo' ? 'Baixa' : 'Alta';

  return (
    <div className="ws-panel">
      <div className="ws-panel-title">Posto · Tela · Ambiente</div>
      <div className="ws-grid">
        <MetricRow
          label="Tela"
          value={`${metrics.telaDistanciaCm} cm`}
          atRisk={risks.telaDistancia}
          sub={alturaLabel}
        />
        <MetricRow label="Luz" value={`${metrics.lux} lux`} atRisk={risks.luz} sub={luzLabel} />
        <MetricRow
          label="Filtro azul"
          value={`${metrics.indiceAzul}%`}
          atRisk={risks.filtroAzul}
          sub={filtroLabel}
        />
      </div>
    </div>
  );
}
