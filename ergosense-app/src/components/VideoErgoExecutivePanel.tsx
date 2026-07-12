import type { VideoErgonomicReport } from '../types/videoErgo';

interface VideoErgoExecutivePanelProps {
  report: VideoErgonomicReport;
}

export function VideoErgoExecutivePanel({ report }: VideoErgoExecutivePanelProps) {
  const { executive, scores, repetitiveMovement } = report;

  return (
    <div className="grid-2" style={{ gap: 10 }}>
      <div className="card kpi-card">
        <div className="kpi-val" style={{ color: executive.ergonomicIndex >= 70 ? 'var(--green)' : 'var(--amber)' }}>
          {executive.ergonomicIndex}
        </div>
        <div className="kpi-lbl">Índice ergonômico</div>
      </div>
      <div className="card kpi-card">
        <div className="kpi-val" style={{ color: executive.safetyScore >= 70 ? 'var(--green)' : 'var(--red)' }}>
          {executive.safetyScore}
        </div>
        <div className="kpi-lbl">Score de segurança</div>
      </div>
      <div className="card kpi-card">
        <div className="kpi-val">{executive.nr17CompliancePct}%</div>
        <div className="kpi-lbl">Conformidade NR-17</div>
      </div>
      <div className="card kpi-card">
        <div className="kpi-val">{repetitiveMovement.classificationLabel}</div>
        <div className="kpi-lbl">Repetição ({repetitiveMovement.movementsPerMinute}/min)</div>
      </div>

      <div className="card" style={{ gridColumn: '1 / -1' }}>
        <div className="card-t">Scores automáticos</div>
        <div className="list-row">
          <span>RULA</span>
          <span><strong>{scores.rula.score}</strong> — {scores.rula.actionLevel}</span>
        </div>
        <div className="list-row">
          <span>REBA</span>
          <span><strong>{scores.reba.score}</strong> — {scores.reba.riskLevel}</span>
        </div>
        <div className="list-row">
          <span>OWAS</span>
          <span>Classe <strong>{scores.owas.class}</strong> — {scores.owas.label}</span>
        </div>
        <div className="list-row">
          <span>NR-17</span>
          <span>{scores.nr17.compliant ? '✓ Conforme' : '✗ Não conforme'} ({scores.nr17.compliancePct}%)</span>
        </div>
      </div>

      {executive.riskRanking.length > 0 && (
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-t">Ranking de riscos</div>
          {executive.riskRanking.map((r, i) => (
            <div key={r.label} className="list-row">
              <span>{i + 1}. {r.label}</span>
              <span className="t2">{r.pct}% exposição</span>
            </div>
          ))}
          <div className="t2" style={{ fontSize: 11, marginTop: 8 }}>
            Tendência: {executive.trend === 'melhorando' ? '↗ Melhorando' : executive.trend === 'piorando' ? '↘ Piorando' : '→ Estável'}
          </div>
        </div>
      )}
    </div>
  );
}
