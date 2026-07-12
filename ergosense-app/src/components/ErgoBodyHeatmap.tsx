import type { BodyRegionExposure, ErgoHeatmapLevel } from '../types/videoErgo';
import { calibrateRiskLevel } from '../services/mlFeedbackLoop';

const LEVEL_COLORS: Record<ErgoHeatmapLevel, string> = {
  seguro: '#22c55e',
  atencao: '#eab308',
  risco: '#f97316',
  critico: '#ef4444',
};

const LEVEL_LABELS: Record<ErgoHeatmapLevel, string> = {
  seguro: 'Seguro',
  atencao: 'Atenção',
  risco: 'Risco',
  critico: 'Crítico',
};

/** Regiões SVG mapeadas no modelo corporal simplificado */
const BODY_REGIONS: { id: BodyRegionExposure['regionId']; key: string; d?: string; cx?: number; cy?: number; r?: number }[] = [
  { id: 'pescoco', cx: 100, cy: 32, r: 18, key: 'head' },
  { id: 'pescoco', cx: 100, cy: 52, r: 8, key: 'neck' },
  { id: 'ombroD', key: 'ombroD', cx: 72, cy: 68, r: 12 },
  { id: 'ombroE', key: 'ombroE', cx: 128, cy: 68, r: 12 },
  { id: 'tronco', key: 'tronco', d: 'M 78 76 L 122 76 L 118 130 L 82 130 Z' },
  { id: 'lombar', key: 'lombar', d: 'M 82 118 L 118 118 L 116 148 L 84 148 Z' },
  { id: 'bracoD', key: 'bracoD', d: 'M 72 76 L 48 110 L 54 116 L 76 84 Z' },
  { id: 'bracoE', key: 'bracoE', d: 'M 128 76 L 152 110 L 146 116 L 124 84 Z' },
  { id: 'punhoD', key: 'punhoD', cx: 50, cy: 118, r: 7 },
  { id: 'punhoE', key: 'punhoE', cx: 150, cy: 118, r: 7 },
  { id: 'quadril', key: 'quadril', d: 'M 84 148 L 116 148 L 114 162 L 86 162 Z' },
  { id: 'joelhoD', key: 'joelhoD', cx: 88, cy: 195, r: 10 },
  { id: 'joelhoE', key: 'joelhoE', cx: 112, cy: 195, r: 10 },
  { id: 'tornozeloD', key: 'tornozeloD', cx: 86, cy: 248, r: 8 },
  { id: 'tornozeloE', key: 'tornozeloE', cx: 114, cy: 248, r: 8 },
];

interface ErgoBodyHeatmapProps {
  exposure: BodyRegionExposure[];
  showLegend?: boolean;
  useMlCalibration?: boolean;
}

export function ErgoBodyHeatmap({ exposure, showLegend = true, useMlCalibration = true }: ErgoBodyHeatmapProps) {
  const exposureMap = new Map(exposure.map((e) => [e.regionId, e]));

  function colorForRegion(regionId: BodyRegionExposure['regionId']): string {
    const exp = exposureMap.get(regionId);
    if (!exp) return LEVEL_COLORS.seguro;
    const level = useMlCalibration ? calibrateRiskLevel(regionId, exp.level) : exp.level;
    return LEVEL_COLORS[level];
  }

  return (
    <div className="ergo-heatmap">
      <svg viewBox="0 0 200 280" width="100%" style={{ maxWidth: 220, margin: '0 auto', display: 'block' }}>
        <ellipse cx="100" cy="270" rx="40" ry="6" fill="rgba(255,255,255,0.08)" />
        {BODY_REGIONS.map((region) => {
          const fill = colorForRegion(region.id);
          const exp = exposureMap.get(region.id);
          if (region.d) {
            return (
              <path
                key={region.key}
                d={region.d}
                fill={fill}
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="1"
                opacity={0.9}
              >
                <title>{exp ? `${exp.label}: ${exp.exposurePct}%` : region.id}</title>
              </path>
            );
          }
          return (
            <circle
              key={region.key}
              cx={region.cx}
              cy={region.cy}
              r={region.r}
              fill={fill}
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="1"
              opacity={0.9}
            >
              <title>{exp ? `${exp.label}: ${exp.exposurePct}%` : region.id}</title>
            </circle>
          );
        })}
      </svg>

      {showLegend && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 8 }}>
          {(Object.keys(LEVEL_COLORS) as ErgoHeatmapLevel[]).map((level) => (
            <span key={level} style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: LEVEL_COLORS[level] }} />
              {LEVEL_LABELS[level]}
            </span>
          ))}
        </div>
      )}

      <div style={{ marginTop: 10 }}>
        {exposure
          .filter((e) => e.exposurePct > 0)
          .sort((a, b) => b.exposurePct - a.exposurePct)
          .slice(0, 5)
          .map((e) => (
            <div key={e.regionId} className="bar-row" style={{ fontSize: 11 }}>
              <span>{e.label}</span>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{ width: `${e.exposurePct}%`, background: LEVEL_COLORS[e.level] }}
                />
              </div>
              <span>{e.exposurePct}%</span>
            </div>
          ))}
      </div>
    </div>
  );
}
