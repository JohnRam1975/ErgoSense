import type { PostureDurationInfo } from '../utils/postureDuration';
import { POSTURE_DURATION_LIMITS } from '../utils/postureDuration';

interface PostureDurationBannerProps {
  duration: PostureDurationInfo;
}

export function PostureDurationBanner({ duration }: PostureDurationBannerProps) {
  if (!duration.inRisk && duration.streakSecs === 0) return null;

  const pct = Math.min(100, (duration.streakSecs / POSTURE_DURATION_LIMITS.criticoSecs) * 100);
  const isCrit = duration.level === 'critico';
  const isWarn = duration.level === 'atencao';

  return (
    <div
      className={`posture-duration-banner posture-duration--${duration.level}`}
      role="status"
    >
      <div className="posture-duration-header">
        <span className="posture-duration-icon">{isCrit ? '⛔' : isWarn ? '⏱️' : '✓'}</span>
        <span className="posture-duration-title">
          {isCrit ? 'TEMPO EM RISCO — CRÍTICO' : isWarn ? 'TEMPO EM RISCO — ATENÇÃO' : 'MONITORANDO POSTURA'}
        </span>
        <span className="posture-duration-timer">
          {String(Math.floor(duration.streakSecs / 60)).padStart(2, '0')}:
          {String(duration.streakSecs % 60).padStart(2, '0')}
        </span>
      </div>
      <p className="posture-duration-msg">{duration.message}</p>
      <div className="posture-duration-bar">
        <div className="posture-duration-fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="posture-duration-hint">
        Limite atenção: {POSTURE_DURATION_LIMITS.atencaoSecs}s · crítico: {POSTURE_DURATION_LIMITS.criticoSecs}s
        {duration.totalRiskSecs > 0 && ` · acumulado: ${formatTotal(duration.totalRiskSecs)}`}
      </p>
    </div>
  );
}

function formatTotal(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}min ${s}s` : `${s}s`;
}
