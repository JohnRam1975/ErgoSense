import type { ActivityContext } from '../data/activityProfiles';
import type { JointAngles } from '../types';
import type { PoseFrame, PosePoint } from '../types/pose';
import { assessPostureRisks, type PostureRiskFlags } from '../utils/ergonomics';
import type { WorkstationMetrics } from '../types/workstation';
import {
  FACE_CONNECTIONS,
  HAND_CONNECTIONS,
  MINIMAL_KEY_JOINTS,
  MINIMAL_SKELETON_CONNECTIONS,
  POSE,
  SK_COLORS,
  headCenterFromLandmarks,
  isVisible,
} from '../utils/poseGeometry';

interface SkeletonOverlayProps {
  angles: JointAngles;
  workstation?: WorkstationMetrics | null;
  poseFrame?: PoseFrame | null;
  show?: boolean;
  /** IA de pose pronta (modelo carregado) */
  poseReady?: boolean;
  /** Landmarks visíveis no frame — desenha o esqueleto */
  hasLandmarks?: boolean;
  /** Ângulos válidos (ombros+quadris) — exibe etiquetas de graus */
  anglesReady?: boolean;
  /** Etiquetas de ângulo no vídeo (desligado na câmera para não poluir) */
  showAngleLabels?: boolean;
  /** Se false, todas as linhas ficam verdes (antes de gravar / sem medição) */
  evaluateRisk?: boolean;
  /** Esconde cantos decorativos para ver melhor o corpo */
  minimal?: boolean;
  activityContext?: ActivityContext | null;
}

const NO_RISK: PostureRiskFlags = {
  lombar: false,
  dorso: false,
  pescoco: false,
  ombroD: false,
  ombroE: false,
  cotoveloD: false,
  cotoveloE: false,
  maoD: false,
  maoE: false,
  quadril: false,
  joelhoD: false,
  joelhoE: false,
  tornozeloD: false,
  tornozeloE: false,
  repeticao: false,
  telaDistancia: false,
  telaAltura: false,
  luz: false,
  filtroAzul: false,
};

function GlowLine({
  x1,
  y1,
  x2,
  y2,
  width = 0.42,
  dashed,
  atRisk = false,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width?: number;
  dashed?: string;
  atRisk?: boolean;
}) {
  const stroke = atRisk ? SK_COLORS.critical : SK_COLORS.safe;
  const strokeGlow = atRisk ? SK_COLORS.riskGlow : SK_COLORS.safeGlow;
  const w = atRisk ? width + 0.18 : width;

  return (
    <g className={atRisk ? 'sk-risk-segment' : 'sk-safe-segment'}>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={strokeGlow}
        strokeWidth={w + (atRisk ? 0.55 : 0.35)}
        strokeLinecap="round"
        strokeDasharray={dashed}
        opacity={atRisk ? 0.9 : 0.4}
      />
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={stroke}
        strokeWidth={w}
        strokeLinecap="round"
        strokeDasharray={dashed}
        opacity={1}
      />
    </g>
  );
}

function AngleLabel({
  x,
  y,
  value,
  atRisk,
}: {
  x: number;
  y: number;
  value: number;
  atRisk: boolean;
}) {
  const w = 8.2;
  const h = 3.6;
  const fill = atRisk ? 'rgba(255,61,61,0.95)' : 'rgba(0,230,118,0.92)';
  return (
    <g className={atRisk ? 'sk-risk-label' : 'sk-safe-label'}>
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={1.1} fill={fill} opacity={0.94} />
      <text
        x={x}
        y={y + 0.55}
        fill={atRisk ? 'white' : '#061208'}
        fontSize="2.15"
        fontFamily="JetBrains Mono, monospace"
        fontWeight="600"
        textAnchor="middle"
      >
        {Math.round(value)}°
      </text>
    </g>
  );
}

function jointAtRisk(idx: number, risks: PostureRiskFlags): boolean {
  if (risks.lombar && (idx === POSE.leftHip || idx === POSE.rightHip)) return true;
  if (risks.quadril && (idx === POSE.leftHip || idx === POSE.rightHip || idx === POSE.leftKnee || idx === POSE.rightKnee))
    return true;
  if (risks.joelhoD && (idx === POSE.rightKnee || idx === POSE.rightAnkle)) return true;
  if (risks.joelhoE && (idx === POSE.leftKnee || idx === POSE.leftAnkle)) return true;
  if (risks.tornozeloD && (idx === POSE.rightAnkle || idx === POSE.rightFootIndex)) return true;
  if (risks.tornozeloE && (idx === POSE.leftAnkle || idx === POSE.leftFootIndex)) return true;
  if (risks.dorso && (idx === POSE.leftShoulder || idx === POSE.rightShoulder)) return true;
  if (risks.pescoco && (idx === POSE.nose || idx === POSE.leftEar || idx === POSE.rightEar)) return true;
  if (risks.ombroD && idx === POSE.rightShoulder) return true;
  if (risks.ombroE && idx === POSE.leftShoulder) return true;
  if (risks.cotoveloD && idx === POSE.rightElbow) return true;
  if (risks.cotoveloE && idx === POSE.leftElbow) return true;
  if (risks.maoD && (idx === POSE.rightWrist || idx === POSE.rightIndex || idx === POSE.rightPinky || idx === POSE.rightThumb))
    return true;
  if (risks.maoE && (idx === POSE.leftWrist || idx === POSE.leftIndex || idx === POSE.leftPinky || idx === POSE.leftThumb))
    return true;
  return false;
}

function connectionAtRisk(a: number, b: number, risks: PostureRiskFlags): boolean {
  const pair = `${Math.min(a, b)}-${Math.max(a, b)}`;

  if (risks.lombar) {
    if (pair === `${POSE.leftShoulder}-${POSE.leftHip}` || pair === `${POSE.rightShoulder}-${POSE.rightHip}`) return true;
  }
  if (risks.quadril) {
    if (pair === `${POSE.leftHip}-${POSE.rightHip}`) return true;
    if (pair === `${POSE.leftHip}-${POSE.leftKnee}` || pair === `${POSE.rightHip}-${POSE.rightKnee}`) return true;
  }
  if (risks.joelhoD && (pair === `${POSE.rightHip}-${POSE.rightKnee}` || pair === `${POSE.rightKnee}-${POSE.rightAnkle}`))
    return true;
  if (risks.joelhoE && (pair === `${POSE.leftHip}-${POSE.leftKnee}` || pair === `${POSE.leftKnee}-${POSE.leftAnkle}`))
    return true;
  if (risks.tornozeloD && pair === `${POSE.rightKnee}-${POSE.rightAnkle}`) return true;
  if (risks.tornozeloE && pair === `${POSE.leftKnee}-${POSE.leftAnkle}`) return true;
  if (risks.dorso) {
    if (pair === `${POSE.leftShoulder}-${POSE.rightShoulder}`) return true;
  }
  if (risks.pescoco && FACE_CONNECTIONS.some(([x, y]) => `${Math.min(x, y)}-${Math.max(x, y)}` === pair)) return true;
  if (risks.ombroD && pair === `${POSE.rightShoulder}-${POSE.rightElbow}`) return true;
  if (risks.cotoveloD && pair === `${POSE.rightElbow}-${POSE.rightWrist}`) return true;
  if (risks.ombroE && pair === `${POSE.leftShoulder}-${POSE.leftElbow}`) return true;
  if (risks.cotoveloE && pair === `${POSE.leftElbow}-${POSE.leftWrist}`) return true;
  if (risks.maoD && HAND_CONNECTIONS.some(([x, y]) => `${Math.min(x, y)}-${Math.max(x, y)}` === pair && (x >= 15 || y >= 15)))
    return true;
  if (risks.maoE && HAND_CONNECTIONS.some(([x, y]) => `${Math.min(x, y)}-${Math.max(x, y)}` === pair && (x <= 16 || y <= 16)))
    return true;

  return false;
}

function defaultConnectionStyle(a: number, b: number): { width: number; dashed?: string } {
  const isSpine =
    (a === POSE.leftShoulder && b === POSE.leftHip) || (a === POSE.rightShoulder && b === POSE.rightHip);
  if (isSpine) return { width: 0.45, dashed: '1.2,0.55' };
  return { width: 0.42 };
}

/** Overlay — verde: postura conforme NR-17; vermelho: posição de risco de lesão */
export function SkeletonOverlay({
  angles,
  workstation,
  poseFrame,
  show = true,
  poseReady = false,
  hasLandmarks = false,
  anglesReady = false,
  showAngleLabels = true,
  evaluateRisk = true,
  minimal = false,
  activityContext = null,
}: SkeletonOverlayProps) {
  if (!show) return null;

  const risks = evaluateRisk ? assessPostureRisks(angles, workstation, activityContext) : NO_RISK;
  const hasRisk = hasPostureRiskVisual(risks);
  const screen = poseFrame?.screen;
  const hasPose = hasLandmarks && !!screen?.length;

  const pt = (idx: number) => screen?.[idx];

  const ls = pt(POSE.leftShoulder);
  const rs = pt(POSE.rightShoulder);
  const lh = pt(POSE.leftHip);
  const rh = pt(POSE.rightHip);

  const shoulderMid =
    hasPose && isVisible(ls) && isVisible(rs)
      ? { x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2, visibility: Math.min(ls.visibility, rs.visibility) }
      : null;

  const hipMid =
    hasPose && isVisible(lh) && isVisible(rh)
      ? { x: (lh.x + rh.x) / 2, y: (lh.y + rh.y) / 2, visibility: Math.min(lh.visibility, rh.visibility) }
      : null;

  const headScreen = hasPose ? headScreenFromPoints(pt(POSE.nose), pt(POSE.leftEar), pt(POSE.rightEar)) : null;

  const drawConnections = (pairs: [number, number][], defaultWidth = 0.42) =>
    pairs.map(([a, b]) => {
      const pa = pt(a);
      const pb = pt(b);
      if (!isVisible(pa) || !isVisible(pb)) return null;
      const atRisk = connectionAtRisk(a, b, risks);
      const style = defaultConnectionStyle(a, b);
      return (
        <GlowLine
          key={`${a}-${b}`}
          x1={pa.x}
          y1={pa.y}
          x2={pb.x}
          y2={pb.y}
          width={defaultWidth || style.width}
          dashed={style.dashed}
          atRisk={atRisk}
        />
      );
    });

  const labelLombar = shoulderMid ? { x: shoulderMid.x - 9, y: shoulderMid.y + 5 } : { x: 34, y: 36 };
  const labelPescoco =
    headScreen && shoulderMid
      ? { x: (shoulderMid.x + headScreen.x) / 2 + 5, y: (shoulderMid.y + headScreen.y) / 2 - 4 }
      : { x: 50, y: 28 };
  const labelOmbro =
    pt(POSE.rightShoulder) && isVisible(pt(POSE.rightShoulder)!)
      ? { x: pt(POSE.rightShoulder)!.x + 5, y: pt(POSE.rightShoulder)!.y - 5 }
      : { x: 58, y: 34 };
  const labelCotovelo =
    pt(POSE.rightElbow) && isVisible(pt(POSE.rightElbow)!)
      ? { x: pt(POSE.rightElbow)!.x + 5, y: pt(POSE.rightElbow)!.y + 2 }
      : { x: 64, y: 40 };

  const labelDorso = shoulderMid && headScreen
    ? { x: (shoulderMid.x + headScreen.x) / 2 - 6, y: (shoulderMid.y + headScreen.y) / 2 }
    : { x: 42, y: 30 };
  const labelMao =
    pt(POSE.rightWrist) && isVisible(pt(POSE.rightWrist)!)
      ? { x: pt(POSE.rightWrist)!.x + 5, y: pt(POSE.rightWrist)!.y + 4 }
      : { x: 68, y: 44 };
  const labelQuadril = hipMid ? { x: hipMid.x, y: hipMid.y + 6 } : { x: 50, y: 48 };
  const labelJoelho =
    pt(POSE.rightKnee) && isVisible(pt(POSE.rightKnee)!)
      ? { x: pt(POSE.rightKnee)!.x + 4, y: pt(POSE.rightKnee)!.y }
      : { x: 55, y: 58 };
  const labelTornozelo =
    pt(POSE.rightAnkle) && isVisible(pt(POSE.rightAnkle)!)
      ? { x: pt(POSE.rightAnkle)!.x + 4, y: pt(POSE.rightAnkle)!.y + 3 }
      : { x: 54, y: 72 };

  return (
    <div
      className={`skeleton-overlay${hasRisk ? ' skeleton-overlay--risk' : hasPose ? ' skeleton-overlay--ok' : ''}`}
      aria-hidden="true"
    >
      {!minimal && (
        <>
          <div className="cam-corner cam-corner-tl" />
          <div className="cam-corner cam-corner-tr" />
          <div className="cam-corner cam-corner-bl" />
          <div className="cam-corner cam-corner-br" />
        </>
      )}

      <svg viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" className="sk-svg">
        {hasPose ? (
          <g className="sk-body">
            {drawConnections(MINIMAL_SKELETON_CONNECTIONS, 0.44)}

            {shoulderMid && hipMid && (
              <GlowLine
                x1={hipMid.x}
                y1={hipMid.y}
                x2={shoulderMid.x}
                y2={shoulderMid.y}
                width={0.52}
                dashed="1.2,0.55"
                atRisk={risks.lombar}
              />
            )}

            {shoulderMid && headScreen && (
              <GlowLine
                x1={shoulderMid.x}
                y1={shoulderMid.y}
                x2={headScreen.x}
                y2={headScreen.y}
                width={0.46}
                atRisk={risks.pescoco || risks.dorso}
              />
            )}

            {MINIMAL_KEY_JOINTS.map((i) => {
              const p = pt(i);
              if (!isVisible(p)) return null;
              const atRisk = jointAtRisk(i, risks);
              if (!atRisk) return null;
              return (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={0.95}
                  fill={SK_COLORS.critical}
                  stroke="rgba(255,255,255,0.55)"
                  strokeWidth="0.18"
                  className="sk-risk-joint"
                />
              );
            })}
          </g>
        ) : (
          <text x="50" y="52" fill="rgba(0,212,255,0.7)" fontSize="2.8" fontFamily="var(--fd)" fontWeight="700" textAnchor="middle">
            {poseReady ? 'Posicione-se na câmera...' : 'Carregando IA...'}
          </text>
        )}

        {hasPose && anglesReady && showAngleLabels && (
          <g className="sk-labels">
            <AngleLabel x={labelLombar.x} y={labelLombar.y} value={angles.lombar} atRisk={risks.lombar} />
            <AngleLabel x={labelDorso.x} y={labelDorso.y} value={angles.dorso} atRisk={risks.dorso} />
            <AngleLabel x={labelPescoco.x} y={labelPescoco.y} value={angles.pescoco} atRisk={risks.pescoco} />
            <AngleLabel x={labelOmbro.x} y={labelOmbro.y} value={angles.ombroD} atRisk={risks.ombroD} />
            <AngleLabel x={labelMao.x} y={labelMao.y} value={angles.maoD} atRisk={risks.maoD} />
            <AngleLabel x={labelQuadril.x} y={labelQuadril.y} value={angles.quadril} atRisk={risks.quadril} />
            <AngleLabel x={labelJoelho.x} y={labelJoelho.y} value={angles.joelhoD} atRisk={risks.joelhoD} />
            <AngleLabel x={labelTornozelo.x} y={labelTornozelo.y} value={angles.tornozeloD} atRisk={risks.tornozeloD} />
            <AngleLabel x={labelCotovelo.x} y={labelCotovelo.y} value={angles.cotovelo} atRisk={risks.cotoveloD} />
          </g>
        )}
      </svg>

    </div>
  );
}

function hasPostureRiskVisual(risks: PostureRiskFlags): boolean {
  return (
    risks.lombar ||
    risks.dorso ||
    risks.pescoco ||
    risks.ombroD ||
    risks.ombroE ||
    risks.cotoveloD ||
    risks.cotoveloE ||
    risks.maoD ||
    risks.maoE ||
    risks.quadril ||
    risks.joelhoD ||
    risks.joelhoE ||
    risks.tornozeloD ||
    risks.tornozeloE
  );
}

function headScreenFromPoints(
  nose: PosePoint | undefined,
  leftEar: PosePoint | undefined,
  rightEar: PosePoint | undefined,
): PosePoint | null {
  const headLm = headCenterFromLandmarks(nose, leftEar, rightEar);
  if (!headLm || !nose) return null;
  if (isVisible(leftEar) && isVisible(rightEar)) {
    return {
      x: (nose.x + (leftEar!.x + rightEar!.x) / 2) / 2,
      y: (nose.y + (leftEar!.y + rightEar!.y) / 2) / 2,
      visibility: headLm.visibility,
    };
  }
  return isVisible(nose) ? nose : null;
}
