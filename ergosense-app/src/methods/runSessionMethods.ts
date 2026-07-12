import { ERGONOMIC_CRITERIA_VERSION } from '../config/ergonomicCriteriaMaster';
import { evaluateAutoRules } from './autoRules';
import { kimFromLoad } from './kim';
import { nioshFromSession } from './nioshRnle';
import { calculateOwas } from './owas';
import { ocraFromAngles } from './ocra';
import { calculateQec } from './qec';
import { calculateReba } from './reba';
import { calculateRula } from './rula';
import { calculateRosa, rosaFromWorkstation } from './rosa';
import { calculateStrainIndex, calculateRevisedStrainIndex } from './strainIndex';
import { calculateTlvHal } from './tlvHal';
import { calculateNasaTlx } from './nasaTlx';
import { calculateSnook } from './snook';
import { evaluateEnvironmental } from '../services/environmental';
import { classifyPostureFromAngles } from '../vision/enhancedPose';
import { createDistanceMeasurement } from '../vision/distanceTypes';
import { generateAiErgonomistReport } from '../services/aiErgonomist';
import type { MethodSessionInput, V2SessionReport } from './types';
import type { ErgonomicMethodResult } from './types';

export function runSessionMethods(input: MethodSessionInput): V2SessionReport {
  const { angles, loadParams, workstation, anthropometry, environmental } = input;
  const sitting = classifyPostureFromAngles(angles).mode === 'sentado';
  const methods: ErgonomicMethodResult[] = [];

  methods.push(calculateRula(angles, sitting, loadParams));
  methods.push(calculateReba(angles, !sitting, loadParams));

  const niosh = nioshFromSession(loadParams, angles);
  if (niosh) methods.push(niosh);

  methods.push(calculateOwas(angles, loadParams?.weightKg ?? 0, sitting));

  if (loadParams?.weightKg) {
    const modes = ['levantar', 'segurar', 'carregar', 'empurrar', 'puxar'] as const;
    for (const mode of modes) {
      const k = kimFromLoad(
        mode,
        loadParams.weightKg,
        loadParams.distanceCm || 30,
        loadParams.frequency,
        angles.lombar + angles.ombroD / 10,
      );
      if (k) methods.push(k);
    }
  }

  methods.push(ocraFromAngles(angles.repeticao, angles.lombar, angles.ombroD));

  methods.push(
    calculateQec({
      backExposurePct: Math.min(100, angles.lombar * 2),
      shoulderExposurePct: Math.min(100, angles.ombroD / 1.2),
      wristExposurePct: Math.min(100, (angles.maoD - 120) * 2),
      neckExposurePct: Math.min(100, angles.pescoco * 2.5),
    }),
  );

  if (workstation) {
    methods.push(rosaFromWorkstation(workstation));
  } else if (input.rosa) {
    methods.push(calculateRosa(input.rosa));
  }

  methods.push(
    calculateStrainIndex({
      intensity: Math.min(10, angles.repeticao + 1),
      effortsPerMin: angles.repeticao * 3,
      durationHours: 2,
      posture: angles.ombroD > 90 ? 3 : 1.5,
      speed: 1.2,
      durationPerDayHours: 8,
    }),
  );

  methods.push(calculateRevisedStrainIndex(Math.round(angles.repeticao * 2 + angles.ombroD / 10)));

  methods.push(
    calculateTlvHal({
      forceKg: loadParams?.weightKg ? loadParams.weightKg / 5 : 2,
      halPerHour: angles.repeticao * 10,
      dutyCyclePct: 50,
    }),
  );

  const tlx = input.nasaTlx ?? {
    mental: 40,
    physical: Math.min(80, angles.lombar + angles.ombroD / 2),
    temporal: 35,
    performance: 70,
    effort: 45,
    frustration: 30,
  };
  methods.push(calculateNasaTlx(tlx));

  if (anthropometry || loadParams?.weightKg) {
    methods.push(
      calculateSnook({
        weightKg: loadParams?.weightKg ?? anthropometry?.weightKg ?? 10,
        distanceCm: loadParams?.distanceCm ?? 30,
        frequencyPerHour: 120,
        sex: anthropometry?.sex ?? input.sex ?? 'M',
      }),
    );
  }

  if (environmental) {
    methods.push(...evaluateEnvironmental(environmental));
  }

  const dist = loadParams?.distanceCm ?? input.distances?.[0]?.cm;
  methods.push(
    evaluateAutoRules(angles, {
      weightKg: loadParams?.weightKg,
      distanceCm: dist,
      staticMins: (input.exposureSecs ?? 0) / 60,
    }),
  );

  if (loadParams?.distanceCm) {
    void createDistanceMeasurement('carga', loadParams.distanceCm, 'hybrid');
  }

  const posture = input.posture ?? classifyPostureFromAngles(angles);
  const aiReport = generateAiErgonomistReport(methods, {
    setor: undefined,
    atividade: undefined,
  });

  return {
    version: '2.0.0',
    criteriaVersion: ERGONOMIC_CRITERIA_VERSION,
    computedAt: new Date().toISOString(),
    methods,
    posture,
    aiReport,
    videoSummary: input.videoFrameCount
      ? {
          frameCount: input.videoFrameCount,
          durationSecs: input.exposureSecs ?? 0,
          worstAngles: angles,
          repetitionEstimate: angles.repeticao,
          exposureRiskSecs: input.exposureSecs ?? 0,
          methods: methods.slice(0, 5),
          postureModes: { [posture.mode]: input.videoFrameCount },
        }
      : undefined,
  };
}
