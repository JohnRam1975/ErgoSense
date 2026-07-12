import type { PostureRiskFlags } from '../utils/ergonomics';
import type { PostureDurationInfo } from '../utils/postureDuration';

interface CameraAnalysisDockProps {
  risks: PostureRiskFlags;
  duration: PostureDurationInfo;
  alerts: { id: string; label: string }[];
  recLabel: string;
  evaluateRisk: boolean;
}

/** Faixa mínima — não cobre o esqueleto */
export function CameraAnalysisDock({
  duration,
  alerts,
  recLabel,
  evaluateRisk,
}: CameraAnalysisDockProps) {
  const timer = `${String(Math.floor(duration.streakSecs / 60)).padStart(2, '0')}:${String(duration.streakSecs % 60).padStart(2, '0')}`;
  const showRiskBar = evaluateRisk && (duration.inRisk || alerts.length > 0);

  return (
    <div className="cam-strip" role="status">
      <div className="cam-strip-legend">
        <span className="cam-strip-pill cam-strip-pill--ok">
          <span className="cam-strip-dot" /> Conforme
        </span>
        <span className="cam-strip-pill cam-strip-pill--risk">
          <span className="cam-strip-dot" /> Risco
        </span>
      </div>
      <span className="cam-strip-rec">{recLabel}</span>
      {showRiskBar && (
        <span className={`cam-strip-risk${duration.level === 'critico' ? ' cam-strip-risk--crit' : ''}`}>
          {duration.inRisk ? `⚠ ${timer}` : alerts[0]?.label}
        </span>
      )}
    </div>
  );
}
