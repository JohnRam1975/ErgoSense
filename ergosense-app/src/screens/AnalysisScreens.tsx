import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { SECTORS, TURNOS } from '../data/constants';
import { ACTIVITY_PROFILES, activitiesForContext, contextLabel, profileForContext, type ActivityContext } from '../data/activityProfiles';
import { ErgoSenseLogo } from '../components/ErgoSenseLogo';
import { AnalysisVideoPlayer } from '../components/AnalysisVideoPlayer';
import { NavHeader } from '../components/UI';
import { SkeletonOverlay } from '../components/SkeletonOverlay';
import { useCamera } from '../hooks/useCamera';
import { usePoseDetection } from '../hooks/usePoseDetection';
import { CameraAnalysisDock } from '../components/CameraAnalysisDock';
import { usePostureDuration } from '../hooks/usePostureDuration';
import { useErgonomicSession } from '../hooks/useErgonomicSession';
import { useWorkstationMonitor } from '../hooks/useWorkstationMonitor';
import { formatDateBR, formatTimeBR, riskBadgeClass, riskLabel, assessPostureRisks, postureRiskAlerts, generateRecommendations, ERGONOMIC_LIMITS } from '../utils/ergonomics';
import { buildNr17SessionReport, nr17StatusClass, nr17StatusLabel } from '../utils/nr17';
import { evaluateSamplingConfidence } from '../utils/samplingConfidence';
import { computeJointConfidence } from '../utils/poseConfidence';
import { ErgoIndicesPanel } from '../components/ErgoIndicesPanel';
import { LoadFactorsPanel } from '../components/LoadFactorsPanel';
import { captureCameraWithSkeleton } from '../utils/captureWithSkeleton';
import { EMPTY_JOINT_ANGLES } from '../utils/poseGeometry';
import { LoadAssessmentForm } from '../components/LoadAssessmentForm';
import { CameraFramingGuide } from '../components/CameraFramingGuide';
import { LoadRiskPanel } from '../components/LoadRiskPanel';
import { useLoadAssessment } from '../hooks/useLoadAssessment';
import { evaluateErgonomicSession } from '../utils/ergonomicRiskEngine';
import { normalizeLoadParams } from '../utils/loadHandling';
import { DEFAULT_LOAD_MANUAL_INPUT } from '../types/loadAssessment';
import { riskLevelLabelPt } from '../utils/ergonomicRiskEngine';
import { handlingModeLabel } from '../utils/loadHandling';
import { LoadEffortReportPanel } from '../components/LoadEffortReportPanel';
import { LOAD_DISTANCE_OPTIMAL_CM } from '../utils/loadHandling';
import { UpgradeBanner } from '../components/UpgradeBanner';
import { AiExpertAnalysisPanel } from '../components/AiExpertAnalysisPanel';
import { LoadMeasureDock } from '../components/LoadMeasureDock';
import { LoadObjectTapLayer } from '../components/LoadObjectTapLayer';
import type { ScreenPoint } from '../utils/measureLoadDistance';
import { useLoadDistanceTracker } from '../hooks/useLoadDistanceTracker';
import { trackLoadDistance, type LoadDistanceTrackResult } from '../utils/trackLoadDistance';

export function NewCollabScreen() {
  const { go, saveCollaborator, sectors, collaborators, selectedCompany, showToast } = useApp();
  const sectorOptions = useMemo(() => {
    const fromDb = sectors.length ? sectors : [];
    const fromCollabs = [...new Set(collaborators.map((c) => c.setor).filter(Boolean))];
    const merged = [...new Set([...fromDb, ...fromCollabs, ...SECTORS])];
    return merged.length ? merged : SECTORS;
  }, [sectors, collaborators]);

  const [form, setForm] = useState({
    name: '',
    matricula: '',
    cargo: '',
    setor: sectorOptions[0] ?? SECTORS[0],
    turno: TURNOS[0],
    birthDate: '',
    notes: '',
    consent: true,
  });

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <>
      <NavHeader back={() => go('collabs')} title="Novo Funcionário" home={() => go('dashboard')} />
      <div className="scroll">
        <div style={{ fontSize: 12, color: 'var(--t1)', marginBottom: 12 }}>
          Empresa: <strong style={{ color: 'var(--amber)' }}>{selectedCompany.name}</strong>
        </div>
        <label className="lbl">Nome completo *</label>
        <input className="inp" value={form.name} onChange={(e) => set('name', e.target.value)} autoComplete="name" />
        <label className="lbl">Matrícula *</label>
        <input className="inp" value={form.matricula} onChange={(e) => set('matricula', e.target.value)} />
        <label className="lbl">Cargo / Função</label>
        <input className="inp" value={form.cargo} onChange={(e) => set('cargo', e.target.value)} />
        <label className="lbl">Setor *</label>
        <select className="inp" value={form.setor} onChange={(e) => set('setor', e.target.value)}>
          {sectorOptions.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <label className="lbl">Turno</label>
        <select className="inp" value={form.turno} onChange={(e) => set('turno', e.target.value)}>
          {TURNOS.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <label className="lbl">Data de nascimento</label>
        <input className="inp" type="date" value={form.birthDate} onChange={(e) => set('birthDate', e.target.value)} />
        <label className="lbl">Observações</label>
        <input className="inp" placeholder="Restrições médicas, EPI especial..." value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        <div className="hl-c mt8">
          <div style={{ fontFamily: 'var(--fd)', fontSize: 11, fontWeight: 700, color: 'var(--cyan)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>
            🔒 CONSENTIMENTO LGPD
          </div>
          <div style={{ fontSize: 13, color: 'var(--t1)', lineHeight: 1.55, marginBottom: 12 }}>
            O colaborador autoriza coleta de dados biométricos para análise ergonômica (Lei 13.709/2018 — LGPD).
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => set('consent', !form.consent)}>
            <div
              style={{
                width: 24,
                height: 24,
                background: form.consent ? 'var(--g10)' : 'var(--bg3)',
                border: `1.5px solid ${form.consent ? 'var(--green)' : 'var(--b2)'}`,
                borderRadius: 7,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                color: 'var(--green)',
              }}
            >
              {form.consent ? '✓' : ''}
            </div>
            <span style={{ fontSize: 13, color: 'var(--t0)', fontWeight: 500 }}>Consentimento digital registrado</span>
          </div>
          <div style={{ fontSize: 10, color: 'var(--t2)', marginTop: 5, fontFamily: 'var(--fm)' }}>
            {formatDateBR()} {formatTimeBR()}
          </div>
        </div>
        <button
          className="btn bp mt12"
          onClick={() => {
            if (!form.name.trim() || !form.matricula.trim()) {
              showToast('Nome e matrícula são obrigatórios', 'warn');
              return;
            }
            saveCollaborator({ ...form, consentDate: `${formatDateBR()} ${formatTimeBR()}` });
          }}
        >
          Salvar Funcionário
        </button>
        <button className="btn bs" onClick={() => go('collabs')}>
          Cancelar
        </button>
        <button className="btn bs btn-sm" onClick={() => go('dashboard')}>
          🏠 Voltar ao Início
        </button>
      </div>
    </>
  );
}

export function SectorsScreen() {
  const { go, analyses, collaborators, showToast, showModal } = useApp();

  const sectorData = SECTORS.slice(0, 3).map((name, i) => {
    const sectorAnalyses = analyses.filter((a) => a.setor === name);
    const sectorCollabs = collaborators.filter((c) => c.setor === name);
    const avgScore = sectorAnalyses.length
      ? Math.round(sectorAnalyses.reduce((s, a) => s + a.score, 0) / sectorAnalyses.length)
      : [78, 54, 28][i];
    const alerts = sectorAnalyses.filter((a) => a.risk === 'critico' || a.risk === 'alto').length;
    const risks: Array<'critico' | 'medio' | 'baixo'> = ['critico', 'medio', 'baixo'];
    const cardClass = ['cr', 'ca', 'cg'][i];
    return { name, collabs: sectorCollabs.length || [28, 16, 22][i], analyses: sectorAnalyses.length || [14, 9, 11][i], alerts: alerts || [3, 1, 0][i], avgScore, risk: risks[i], cardClass };
  });

  return (
    <>
      <NavHeader
        back={() => go('dashboard')}
        title="Setores"
        action={{ icon: '＋', onClick: () => showModal('Novo Setor', 'Em breve: formulário para adicionar setor. Disponível na Etapa 3.', 'OK') }}
      />
      <div className="scroll">
        {sectorData.map((s) => (
          <div key={s.name} className={`card ${s.cardClass}`} style={{ cursor: 'pointer' }} onClick={() => showToast(`Setor ${s.name} selecionado`, 'info')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontFamily: 'var(--fd)', fontSize: 18, fontWeight: 800, color: 'var(--t0)', textTransform: 'uppercase' }}>{s.name}</div>
                <div style={{ fontSize: 12, color: 'var(--t1)', marginTop: 2 }}>{s.collabs} colaboradores</div>
              </div>
              <div className={`badge ${riskBadgeClass(s.risk)}`}>{riskLabel(s.risk)}</div>
            </div>
            <div className="sep" style={{ margin: '10px 0' }} />
            <div style={{ display: 'flex', gap: 22 }}>
              <div>
                <div style={{ fontFamily: 'var(--fd)', fontSize: 22, fontWeight: 800, color: s.risk === 'critico' ? 'var(--red)' : s.risk === 'medio' ? 'var(--amber)' : 'var(--green)' }}>{s.analyses}</div>
                <div style={{ fontSize: 9, color: 'var(--t1)', fontFamily: 'var(--fd)', letterSpacing: 1, textTransform: 'uppercase' }}>Análises</div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--fd)', fontSize: 22, fontWeight: 800, color: 'var(--amber)' }}>{s.alerts}</div>
                <div style={{ fontSize: 9, color: 'var(--t1)', fontFamily: 'var(--fd)', letterSpacing: 1, textTransform: 'uppercase' }}>Alertas</div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--fd)', fontSize: 22, fontWeight: 800, color: 'var(--t1)' }}>{s.avgScore}</div>
                <div style={{ fontSize: 9, color: 'var(--t1)', fontFamily: 'var(--fd)', letterSpacing: 1, textTransform: 'uppercase' }}>Score méd.</div>
              </div>
            </div>
            <button className="btn bp btn-sm mt12 mb0" onClick={(e) => { e.stopPropagation(); go('new-analysis'); }}>
              📷 Iniciar Análise
            </button>
          </div>
        ))}
        <button className="btn bs btn-sm mt4" onClick={() => go('dashboard')}>
          🏠 Voltar ao Início
        </button>
      </div>
    </>
  );
}

export function NewAnalysisScreen() {
  const { go, collaborators, analysisDraft, setAnalysisDraft, analysisMode, setAnalysisMode, showToast, sectors, selectedCompany } =
    useApp();

  const prevCtxRef = useRef(analysisDraft.activityContext);
  useEffect(() => {
    if (prevCtxRef.current === analysisDraft.activityContext) return;
    prevCtxRef.current = analysisDraft.activityContext;
    if (profileForContext(analysisDraft.activityContext).fieldOrPhysical) {
      setAnalysisDraft({ loadAssessment: { manual: { enabled: true } } });
    }
  }, [analysisDraft.activityContext, setAnalysisDraft]);

  const sectorOptions = useMemo(() => {
    const fromDb = sectors.length ? sectors : [];
    const fromCollabs = [...new Set(collaborators.map((c) => c.setor).filter(Boolean))];
    return [...new Set([...fromDb, ...fromCollabs, ...SECTORS])];
  }, [sectors, collaborators]);

  const canStart = collaborators.length > 0;

  return (
    <>
      <NavHeader back={() => go('dashboard')} title="Nova Análise" home={() => go('dashboard')} />
      <div className="scroll scroll--form">
        <div style={{ background: 'var(--a10)', border: '1px solid var(--a35)', borderRadius: 14, padding: '12px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>🏢</span>
          <div>
            <div style={{ fontFamily: 'var(--fd)', fontSize: 14, fontWeight: 700, color: 'var(--amber)', letterSpacing: '.5px', textTransform: 'uppercase' }}>
              {selectedCompany.name} · {analysisDraft.setor}
            </div>
            <div style={{ fontSize: 11, color: 'var(--t1)' }}>
              {formatDateBR()} · {formatTimeBR()}
            </div>
          </div>
        </div>
        {!canStart ? (
          <div className="hl-r" style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 13, color: 'var(--t0)', margin: '0 0 12px' }}>
              Cadastre pelo menos um funcionário antes de iniciar a avaliação ergonômica.
            </p>
            <button type="button" className="btn bp" onClick={() => go('new-collab')}>
              Cadastrar funcionário
            </button>
          </div>
        ) : (
          <>
        <label className="lbl">Funcionário *</label>
        <select
          className="inp"
          value={analysisDraft.collaboratorId}
          onChange={(e) => {
            const c = collaborators.find((x) => x.id === e.target.value);
            setAnalysisDraft({ collaboratorId: e.target.value, setor: c?.setor ?? analysisDraft.setor });
          }}
        >
          {collaborators.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} — Mat. {c.matricula}
            </option>
          ))}
        </select>
        <label className="lbl">Setor *</label>
        <select className="inp" value={analysisDraft.setor} onChange={(e) => setAnalysisDraft({ setor: e.target.value })}>
          {sectorOptions.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <label className="lbl">Ambiente / tipo de trabalho *</label>
        <select
          className="inp"
          value={analysisDraft.activityContext}
          onChange={(e) => {
            const ctx = e.target.value as ActivityContext;
            const acts = activitiesForContext(ctx);
            setAnalysisDraft({ activityContext: ctx, activity: acts[0] ?? analysisDraft.activity });
          }}
        >
          {ACTIVITY_PROFILES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.icon} {p.label}
            </option>
          ))}
        </select>
        <div style={{ fontSize: 11, color: 'var(--t2)', margin: '-6px 0 12px', lineHeight: 1.45 }}>
          {profileForContext(analysisDraft.activityContext).description}
        </div>
        <label className="lbl">Atividade específica *</label>
        <select className="inp" value={analysisDraft.activity} onChange={(e) => setAnalysisDraft({ activity: e.target.value })}>
          {activitiesForContext(analysisDraft.activityContext).map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
        <label className="lbl">Observações</label>
        <input className="inp" placeholder="Condições especiais, EPI em uso..." value={analysisDraft.notes} onChange={(e) => setAnalysisDraft({ notes: e.target.value })} />
        <LoadAssessmentForm
          manual={analysisDraft.loadAssessment?.manual ?? DEFAULT_LOAD_MANUAL_INPUT}
          activityContext={analysisDraft.activityContext}
          onChange={(patch) =>
            setAnalysisDraft({ loadAssessment: { manual: patch } })
          }
        />
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--b1)', borderRadius: 14, padding: 14, marginBottom: 14 }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: 'var(--t1)', textTransform: 'uppercase', marginBottom: 11 }}>
            Modo de Análise
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 11, padding: 12, background: analysisMode === 'complete' ? 'var(--a10)' : 'var(--bg1)', border: `1px solid ${analysisMode === 'complete' ? 'var(--a35)' : 'var(--b1)'}`, borderRadius: 11, cursor: 'pointer' }}
              onClick={() => { setAnalysisMode('complete'); showToast('Modo: Análise Completa (Servidor)', 'info'); }}
            >
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: analysisMode === 'complete' ? 'var(--amber)' : 'var(--bg3)', border: analysisMode === 'complete' ? 'none' : '1.5px solid var(--b2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0, color: '#09090d', fontWeight: 800 }}>
                {analysisMode === 'complete' ? '✓' : ''}
              </div>
              <div>
                <div style={{ fontFamily: 'var(--fd)', fontSize: 14, fontWeight: 700, color: analysisMode === 'complete' ? 'var(--amber)' : 'var(--t1)', textTransform: 'uppercase' }}>Análise Completa</div>
                <div style={{ fontSize: 11, color: 'var(--t1)' }}>Câmera + MediaPipe Servidor</div>
              </div>
            </div>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 11, padding: 12, background: analysisMode === 'offline' ? 'var(--a10)' : 'var(--bg1)', border: `1px solid ${analysisMode === 'offline' ? 'var(--a35)' : 'var(--b1)'}`, borderRadius: 11, cursor: 'pointer' }}
              onClick={() => { setAnalysisMode('offline'); showToast('Modo: Análise Offline (Local TFLite)', 'info'); }}
            >
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: analysisMode === 'offline' ? 'var(--amber)' : 'var(--bg3)', border: analysisMode === 'offline' ? 'none' : '1.5px solid var(--b2)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#09090d', fontWeight: 800 }}>
                {analysisMode === 'offline' ? '✓' : ''}
              </div>
              <div>
                <div style={{ fontFamily: 'var(--fd)', fontSize: 14, fontWeight: 700, color: analysisMode === 'offline' ? 'var(--amber)' : 'var(--t1)', textTransform: 'uppercase' }}>Análise Offline</div>
                <div style={{ fontSize: 11, color: 'var(--t2)' }}>TFLite local · sem internet</div>
              </div>
            </div>
          </div>
        </div>
          </>
        )}
        <button className="btn bp" onClick={() => go('camera')} disabled={!canStart}>
          📷 Iniciar Leitura com Câmera
        </button>
        <div style={{ fontSize: 11, color: 'var(--t2)', textAlign: 'center', marginTop: 8, marginBottom: 8, lineHeight: 1.5 }}>
          {canStart
            ? 'Escritório, campo, obra, montagem, motoristas e demais atividades · PDF NR-17'
            : 'Cadastre um funcionário acima para habilitar a captura com câmera.'}
        </div>
        <button className="btn bs" onClick={() => go('dashboard')}>
          Voltar ao Início
        </button>
      </div>
    </>
  );
}

export function CameraScreen() {
  const {
    go,
    captureAnalysis,
    showModal,
    settings,
    liveAngles,
    setLiveAngles,
    setLiveWorkstation,
    showToast,
    analysisDraft,
    setAnalysisDraft,
  } = useApp();
  const activityContext = analysisDraft.activityContext;
  const loadManual = analysisDraft.loadAssessment?.manual ?? DEFAULT_LOAD_MANUAL_INPUT;
  const loadEnabled = loadManual.enabled;
  const fieldOrPhysical = profileForContext(activityContext).fieldOrPhysical;

  const [recSecs, setRecSecs] = useState(0);
  const [sessionActive, setSessionActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('user');
  const [capturing, setCapturing] = useState(false);
  const [tapMode, setTapMode] = useState(true);
  const [measureMarkers, setMeasureMarkers] = useState<{
    trunk: { x: number; y: number } | null;
    load: { x: number; y: number } | null;
  }>({ trunk: null, load: null });
  const [camLayout, setCamLayout] = useState({ w: 0, h: 0, vw: 0, vh: 0 });
  const camWrapRef = useRef<HTMLDivElement>(null);
  const lastDistRef = useRef(0);
  const lastDistanceToastRef = useRef(0);
  const lastEstimatePersistRef = useRef(0);
  const durationToastRef = useRef<'ok' | 'atencao' | 'critico'>('ok');
  const finishSessionRef = useRef<() => Promise<void>>(async () => {});

  const onCameraError = useCallback((msg: string) => showToast(msg, 'warn'), [showToast]);
  const {
    setVideoNode,
    videoRef,
    status,
    error,
    startRecording,
    stopRecording,
    hasPreview,
  } = useCamera(facingMode, onCameraError);

  const onPoseAngles = useCallback(
    (angles: typeof liveAngles) => setLiveAngles(angles),
    [setLiveAngles],
  );

  const poseEnabled = status !== 'error' && hasPreview;
  const { status: poseStatus, poseFrame, error: poseError, tracking: poseTracking } = usePoseDetection(
    videoRef,
    camWrapRef,
    {
      enabled: poseEnabled,
      mirrored: true,
      onAngles: onPoseAngles,
    },
  );

  const wasAnalyzingRef = useRef(false);
  const anglesLive = poseTracking && poseStatus === 'ready';
  const evaluateRisk = sessionActive && anglesLive;

  const workstation = useWorkstationMonitor(
    videoRef,
    sessionActive,
    poseFrame?.landmarks ?? null,
    liveAngles,
  );

  const sessionSampling = sessionActive;
  const loadEstimate = useLoadAssessment(
    loadEnabled && hasPreview,
    poseFrame?.landmarks ?? null,
    videoRef.current?.videoWidth ?? 0,
    videoRef.current?.videoHeight ?? 0,
  );

  useEffect(() => {
    const wrap = camWrapRef.current;
    const video = videoRef.current;
    if (!wrap) return;
    const sync = () => {
      setCamLayout({
        w: wrap.clientWidth,
        h: wrap.clientHeight,
        vw: video?.videoWidth ?? 0,
        vh: video?.videoHeight ?? 0,
      });
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(wrap);
    video?.addEventListener('loadedmetadata', sync);
    return () => {
      ro.disconnect();
      video?.removeEventListener('loadedmetadata', sync);
    };
  }, [hasPreview, videoRef]);

  useEffect(() => {
    if (!fieldOrPhysical || loadManual.enabled) return;
    setAnalysisDraft({ loadAssessment: { manual: { enabled: true } } });
  }, [fieldOrPhysical, loadManual.enabled, setAnalysisDraft]);

  useEffect(() => {
    if (!loadEstimate) return;
    const patch: { estimate: typeof loadEstimate; manual?: { measuredDistanceCm: number } } = {
      estimate: loadEstimate,
    };
    if (
      loadEnabled &&
      loadEstimate.distanceCm > 0 &&
      (loadEstimate.confidence ?? 0) >= 0.2 &&
      Math.abs(loadEstimate.distanceCm - lastEstimatePersistRef.current) > 0
    ) {
      const cm = loadEstimate.distanceCm;
      lastEstimatePersistRef.current = cm;
      lastDistRef.current = Math.max(lastDistRef.current, cm);
      patch.manual = { measuredDistanceCm: cm };
    }
    setAnalysisDraft({ loadAssessment: patch });
  }, [loadEstimate, loadEnabled, setAnalysisDraft]);

  const liveLoadParams = useMemo(
    () =>
      loadEnabled
        ? normalizeLoadParams(loadManual, loadEstimate ?? analysisDraft.loadAssessment.estimate, recSecs)
        : null,
    [loadEnabled, loadManual, loadEstimate, analysisDraft.loadAssessment?.estimate, recSecs],
  );

  const liveLoadEval = useMemo(() => {
    if (!liveLoadParams || !anglesLive) return null;
    return evaluateErgonomicSession({
      angles: liveAngles,
      workstation,
      activityContext,
      loadParams: liveLoadParams,
    });
  }, [liveLoadParams, anglesLive, liveAngles, workstation, activityContext]);

  const { reset: resetSession, aggregate: aggregateSession } = useErgonomicSession(
    sessionSampling,
    liveAngles,
    workstation,
    anglesLive,
  );

  useEffect(() => {
    if (sessionActive && !wasAnalyzingRef.current) {
      setLiveAngles(EMPTY_JOINT_ANGLES);
      setRecSecs(0);
      resetSession();
    }
    wasAnalyzingRef.current = sessionActive;
  }, [sessionActive, setLiveAngles, resetSession]);

  useEffect(() => {
    if (sessionActive) setLiveWorkstation(workstation);
  }, [workstation, sessionActive, setLiveWorkstation]);

  useEffect(() => {
    if (poseStatus === 'error' && poseError) {
      showToast(`Rastreamento: ${poseError}`, 'warn');
    }
  }, [poseStatus, poseError, showToast]);

  const risks = assessPostureRisks(liveAngles, workstation, activityContext);
  const riskAlerts = postureRiskAlerts(liveAngles, workstation, activityContext);
  const { duration: postureDuration, maxStreakSecs, totalRiskSecs } = usePostureDuration(
    risks,
    sessionSampling,
    false,
  );

  useEffect(() => {
    if (!sessionSampling) return;
    const id = setInterval(() => setRecSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [sessionSampling]);

  const finishSession = useCallback(async (opts?: { manualStop?: boolean }) => {
    if (capturing) return;
    setCapturing(true);
    try {
      const aggregated = aggregateSession();
      const finalAngles = aggregated.sampleCount > 0 ? aggregated.angles : liveAngles;
      const finalWs = aggregated.workstation ?? workstation;
      const duration = Math.max(recSecs, 1);
      const sampling = evaluateSamplingConfidence(duration, aggregated.sampleCount);

      if (sampling.blocksFormalReport && !opts?.manualStop) {
        showToast('Amostragem insuficiente (< 30 s). Continue a captura.', 'warn');
        setCapturing(false);
        return;
      }
      if (sampling.blocksFormalReport && opts?.manualStop) {
        showToast('Amostragem < 30 s — resultado apenas informativo.', 'warn');
      }

      const poseConf = computeJointConfidence(poseFrame?.landmarks);
      if (poseConf.requiresRecapture) {
        showToast(`Confiança IA baixa (${poseConf.overall}%). Resultado com ressalva.`, 'warn');
      }

      if (
        !opts?.manualStop &&
        aggregated.sampleCount === 0 &&
        !anglesLive &&
        recSecs < 5
      ) {
        showToast('Aguarde alguns segundos com o corpo visível na câmera.', 'warn');
        setCapturing(false);
        return;
      }

      let image: string | undefined;
      if (camWrapRef.current && settings.skeletonOverlay) {
        const composite = await captureCameraWithSkeleton(camWrapRef.current);
        if (composite) image = composite;
      }

      setSessionActive(false);

      const { image: rawImage, videoBlob } = await stopRecording();
      if (!image) image = rawImage ?? undefined;

      const loadParamsEnd = loadEnabled
        ? normalizeLoadParams(loadManual, loadEstimate ?? analysisDraft.loadAssessment.estimate, duration)
        : null;
      const loadResultEnd = loadParamsEnd
        ? evaluateErgonomicSession({
            angles: finalAngles,
            workstation: finalWs,
            activityContext,
            loadParams: loadParamsEnd,
          }).loadResult
        : null;

      const effortEnd = loadManual.effortResult ?? undefined;
      const evalEnd = evaluateErgonomicSession({
        angles: finalAngles,
        workstation: finalWs,
        activityContext,
        loadParams: loadParamsEnd,
      });
      const nr17Report = buildNr17SessionReport({
        angles: finalAngles,
        workstation: finalWs,
        sessionDurationSecs: duration,
        sampleCount: Math.max(aggregated.sampleCount, recSecs > 0 ? 1 : 0),
        maxRiskStreakSecs: maxStreakSecs,
        totalRiskSecs,
        activityContext,
        activity: analysisDraft.activity,
        loadResult: loadResultEnd ?? evalEnd.loadResult,
        loadEffort: effortEnd ?? null,
        rula: evalEnd.rula,
        reba: evalEnd.reba,
      });

      const capturedDist =
        lastDistRef.current ||
        loadManual.measuredDistanceCm ||
        loadManual.effortResult?.distanceCm ||
        (loadEstimate ?? analysisDraft.loadAssessment?.estimate)?.distanceCm ||
        0;

      captureAnalysis(finalAngles, finalWs, image, duration, {
        maxRiskStreakSecs: maxStreakSecs,
        totalRiskSecs,
      }, {
        nr17Report,
        sessionSampleCount: aggregated.sampleCount,
        autoGenerateReport: true,
        measuredDistanceCm: capturedDist > 0 ? capturedDist : undefined,
      }, videoBlob ?? null);
    } catch (err) {
      console.error('finishSession', err);
      showToast('Erro ao finalizar a sessão', 'warn');
      setCapturing(false);
    }
  }, [
    capturing,
    aggregateSession,
    liveAngles,
    workstation,
    recSecs,
    stopRecording,
    anglesLive,
    maxStreakSecs,
    totalRiskSecs,
    captureAnalysis,
    analysisDraft.activity,
    analysisDraft.loadAssessment.estimate,
    activityContext,
    loadEnabled,
    loadEstimate,
    loadManual,
    showToast,
    settings.skeletonOverlay,
    poseFrame?.landmarks,
  ]);

  finishSessionRef.current = finishSession;

  useEffect(() => {
    if (!sessionActive) {
      durationToastRef.current = 'ok';
      return;
    }
    if (postureDuration.level === 'critico' && durationToastRef.current !== 'critico') {
      durationToastRef.current = 'critico';
      showToast(`Postura de risco há ${Math.floor(postureDuration.streakSecs / 60)}+ min — corrija agora!`, 'warn');
    } else if (postureDuration.level === 'atencao' && durationToastRef.current === 'ok') {
      durationToastRef.current = 'atencao';
      showToast('Postura de risco prolongada — ajuste em breve', 'warn');
    }
    if (postureDuration.level === 'ok') durationToastRef.current = 'ok';
  }, [postureDuration.level, postureDuration.streakSecs, sessionActive, showToast]);

  const handleToggleSession = () => {
    if (capturing || status === 'loading') return;

    if (!sessionActive) {
      if (loadEnabled && loadManual.weightKg <= 0) {
        showToast('Informe o peso da carga antes de iniciar', 'warn');
        return;
      }
      if (status === 'ready') {
        startRecording();
        setSessionActive(true);
        showToast('Leitura iniciada — toque novamente para encerrar e gerar o relatório', 'info');
      }
      return;
    }

    if (recSecs < 3) {
      showToast('Aguarde pelo menos 3 segundos de leitura.', 'info');
      return;
    }
    void finishSession({ manualStop: true });
  };

  const elapsedM = String(Math.floor(recSecs / 60)).padStart(2, '0');
  const elapsedS = String(recSecs % 60).padStart(2, '0');
  const isRecording = sessionActive;

  const applyDistanceTrack = useCallback(
    (track: LoadDistanceTrackResult | null, tap?: ScreenPoint | null) => {
      if (!track) return;
      setMeasureMarkers({ trunk: track.trunk, load: track.load });
      const prev = lastDistRef.current;
      const distanceChanged = Math.abs(track.distanceCm - prev) > 1;
      if (distanceChanged || tap) {
        lastDistRef.current = track.distanceCm;
        setAnalysisDraft({
          loadAssessment: {
            manual: {
              measuredDistanceCm: track.distanceCm,
              ...(tap ? { loadObjectTap: tap } : {}),
              ...(distanceChanged ? { effortResult: undefined } : {}),
            },
          },
        });
      }
      if (prev <= 0 && track.distanceCm > 0) {
        const now = Date.now();
        if (now - lastDistanceToastRef.current > 4000) {
          lastDistanceToastRef.current = now;
          showToast(`Distância capturada: ${track.distanceCm} cm. Informe o peso e toque Calcular.`, 'success');
        }
      }
    },
    [setAnalysisDraft, showToast],
  );

  useLoadDistanceTracker(
    {
      enabled: loadEnabled && hasPreview && !capturing && poseStatus === 'ready',
      landmarks: poseFrame?.landmarks ?? null,
      containerWidth: camLayout.w,
      containerHeight: camLayout.h,
      videoWidth: camLayout.vw,
      videoHeight: camLayout.vh,
      loadObjectTap: loadManual.loadObjectTap ?? null,
      calibration:
        loadManual.calibrationRealCm && loadManual.calibrationPx
          ? { realCm: loadManual.calibrationRealCm, pxSize: loadManual.calibrationPx }
          : null,
      estimate: loadEstimate ?? analysisDraft.loadAssessment.estimate ?? null,
      mirrored: true,
    },
    applyDistanceTrack,
  );

  const distanceMeasuring =
    loadEnabled &&
    hasPreview &&
    poseStatus === 'ready' &&
    (loadManual.measuredDistanceCm ?? 0) <= 0;

  return (
    <>
      <div className="cam-top-bar">
        <ErgoSenseLogo size="xs" showText className="cam-top-logo" />
        <div className="cam-top-rec">
          <span className={`cam-top-dot${isRecording ? ' cam-top-dot--live' : ''}`} />
          <span className="cam-top-rec-txt">
            {status === 'loading'
              ? 'Iniciando...'
              : capturing
                ? 'Gerando relatório NR-17...'
              : isRecording
                ? `NR-17 · ${elapsedM}:${elapsedS} · gravando`
                : 'Toque ⏺ para iniciar · toque ⏹ para encerrar'}
          </span>
        </div>
        <div className="cam-top-spacer" />
      </div>
      <div className="cam-video-wrap" ref={camWrapRef}>
        {status !== 'error' ? (
          <>
            <video ref={setVideoNode} className="cam-video" playsInline muted autoPlay />
            {status === 'loading' && (
              <div className="cam-loading">
                <div style={{ fontFamily: 'var(--fd)', fontSize: 13, fontWeight: 700, color: 'var(--amber)', letterSpacing: 1, textTransform: 'uppercase' }}>
                  Acessando câmera...
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="cam-fallback cam-error">
            <span style={{ fontSize: 48 }}>📷</span>
            <span style={{ fontFamily: 'var(--fd)', fontSize: 14, fontWeight: 700, color: 'var(--t1)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1 }}>
              Câmera indisponível
            </span>
            <span style={{ fontSize: 12, color: 'var(--t2)', textAlign: 'center', maxWidth: 300, lineHeight: 1.5 }}>
              {error || 'Permita o acesso à câmera e recarregue a página.'}
            </span>
            <button type="button" className="btn bp btn-sm btn-max220 mt8" onClick={() => window.location.reload()}>
              Tentar novamente
            </button>
          </div>
        )}
        {status !== 'error' && (
          <>
            <CameraFramingGuide visible={hasPreview && !capturing} loadMode={loadEnabled} />
            {loadEnabled && !capturing && (
              <LoadObjectTapLayer
                tapActive={tapMode}
                tracking={distanceMeasuring}
                distanceCm={loadManual.measuredDistanceCm ?? 0}
                trunk={measureMarkers.trunk}
                load={measureMarkers.load}
                onTap={(pt) => {
                  setAnalysisDraft({
                    loadAssessment: { manual: { loadObjectTap: pt, effortResult: undefined } },
                  });
                  setMeasureMarkers((m) => ({ ...m, load: pt }));
                  if (poseFrame?.landmarks && camLayout.w > 0) {
                    const track = trackLoadDistance(poseFrame.landmarks, {
                      containerWidth: camLayout.w,
                      containerHeight: camLayout.h,
                      videoWidth: camLayout.vw,
                      videoHeight: camLayout.vh,
                      loadObjectTap: pt,
                      calibration:
                        loadManual.calibrationRealCm && loadManual.calibrationPx
                          ? { realCm: loadManual.calibrationRealCm, pxSize: loadManual.calibrationPx }
                          : null,
                      mirrored: true,
                      estimate: loadEstimate ?? analysisDraft.loadAssessment.estimate ?? null,
                    });
                    applyDistanceTrack(track, pt);
                  }
                  if (!(loadManual.measuredDistanceCm ?? 0)) {
                    showToast('Objeto marcado. A câmera está rastreando a distância…', 'info');
                  }
                }}
              />
            )}
            <SkeletonOverlay
              angles={liveAngles}
              workstation={workstation}
              poseFrame={poseFrame}
              show={settings.skeletonOverlay && hasPreview}
              poseReady={poseStatus === 'ready'}
              hasLandmarks={!!poseFrame?.screen?.length}
              anglesReady={anglesLive}
              showAngleLabels={false}
              evaluateRisk={evaluateRisk}
              activityContext={activityContext}
              minimal
            />
            {loadEnabled && hasPreview && (
              <LoadRiskPanel
                weightKg={loadManual.weightKg}
                estimate={loadEstimate ?? analysisDraft.loadAssessment.estimate ?? null}
                liveRisk={liveLoadEval?.risk}
                liveScore={liveLoadEval?.combinedScore}
              />
            )}
          </>
        )}
        {loadEnabled && hasPreview && (
          <LoadMeasureDock
            manual={loadManual}
            measuredDistanceCm={loadManual.measuredDistanceCm ?? 0}
            measuring={distanceMeasuring}
            tapMode={tapMode}
            onToggleTapMode={() => setTapMode((t) => !t)}
            onChange={(patch) => setAnalysisDraft({ loadAssessment: { manual: patch } })}
            onCalculated={() =>
              showToast('Cálculo concluído. Finalize a sessão para gravar no relatório.', 'success')
            }
          />
        )}
        {hasPreview && (
          <>
            {sessionActive && (
              <CameraAnalysisDock
                risks={risks}
                duration={postureDuration}
                alerts={riskAlerts}
                recLabel={isRecording ? `${elapsedM}:${elapsedS} decorridos` : ''}
                evaluateRisk={evaluateRisk}
              />
            )}
            <div className="cam-controls">
              <button type="button" className="cam-btn" onClick={() => showModal('Cancelar Análise', 'Deseja cancelar a análise em andamento?', 'Cancelar Análise', () => go('new-analysis'))}>
                ✕
              </button>
              <div className="cam-controls-center">
                <button
                  type="button"
                  className={isRecording ? 'shutter shutter--recording shutter--stop' : 'shutter shutter--idle'}
                  onClick={handleToggleSession}
                  disabled={capturing || status === 'loading'}
                  title={isRecording ? 'Encerrar leitura e gerar relatório' : 'Iniciar leitura ergonômica'}
                >
                  {capturing ? '⏳' : isRecording ? '⏹' : '⏺'}
                </button>
              </div>
              <button
                type="button"
                className="cam-btn"
                onClick={() => {
                  setFacingMode((f) => (f === 'environment' ? 'user' : 'environment'));
                  showToast('Câmera alternada', 'info');
                }}
              >
                🔄
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

export function ResultScreen() {
  const {
    go,
    currentAnalysis,
    exportCurrentAnalysisPdf,
    applyLoadEffortToCurrentAnalysis,
    showModal,
    showToast,
    resultDetailsRevealed,
    revealResultDetails,
    deleteAnalysis,
    canExportPdf,
    planTier,
    selectedCompany,
  } = useApp();

  const formatDur = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m} min ${s} s` : `${s} s`;
  };

  if (!currentAnalysis) {
    return (
      <>
        <NavHeader back={() => go('history')} title="Resultado" />
        <div className="scroll" style={{ paddingTop: 40, textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--fd)', fontSize: 14, color: 'var(--t1)', marginBottom: 16 }}>
            Nenhuma análise selecionada. Capture uma nova análise ou abra uma do histórico.
          </p>
          <button type="button" className="btn bp" onClick={() => go('history')}>
            Ver histórico
          </button>
        </div>
      </>
    );
  }

  const a = currentAnalysis;
  const angles = a.angles ?? EMPTY_JOINT_ANGLES;
  const lr = a.loadResult;
  const lp = a.loadParams;
  const le = a.loadEffort ?? a.loadAssessment?.effort;
  const nr17 = a.nr17Report;
  const dashOffset = 345 - (a.score / 100) * 345;
  const ws = a.workstation;
  const ctx = a.activityContext ?? 'campo';
  const profile = profileForContext(ctx);
  const resultRisks = assessPostureRisks(angles, ws, ctx);
  const recommendations = nr17?.recommendations ?? generateRecommendations(angles, ws, a.maxRiskStreakSecs, ctx);

  const angleRows = [
    { name: 'Inclinação Lombar', val: angles.lombar, atRisk: resultRisks.lombar, max: ERGONOMIC_LIMITS.lombar.critical },
    { name: 'Dorso (Tórax)', val: angles.dorso, atRisk: resultRisks.dorso, max: ERGONOMIC_LIMITS.dorso.critical },
    { name: 'Quadril', val: angles.quadril, atRisk: resultRisks.quadril, max: 120 },
    { name: 'Joelho', val: angles.joelhoD, atRisk: resultRisks.joelhoD, max: ERGONOMIC_LIMITS.joelho.max },
    { name: 'Tornozelo', val: angles.tornozeloD, atRisk: resultRisks.tornozeloD, max: ERGONOMIC_LIMITS.tornozelo.max },
    { name: 'Pescoço', val: angles.pescoco, atRisk: resultRisks.pescoco, max: ERGONOMIC_LIMITS.pescoco.critical },
    { name: 'Ombro Direito', val: angles.ombroD, atRisk: resultRisks.ombroD, max: ERGONOMIC_LIMITS.ombro.critical },
    { name: 'Mão / Punho', val: angles.maoD, atRisk: resultRisks.maoD, max: ERGONOMIC_LIMITS.mao.critical },
  ];

  return (
    <>
      <NavHeader
        back={() => go('history')}
        title="Resultado"
        action={{
          icon: '📤',
          title: 'Compartilhar',
          onClick: () =>
            showModal('Compartilhar Resultado', 'Compartilhar o resultado desta análise via e-mail ou WhatsApp?', 'Compartilhar', () =>
              showToast('Resultado compartilhado!', 'success'),
            ),
        }}
      />
      <div className="scroll">
        {!resultDetailsRevealed && (
          <div className="card result-reveal-card">
            <p className="result-reveal-hint">A análise ergonômica está oculta. Exiba quando for revisar o resultado.</p>
            <button type="button" className="btn bp" onClick={revealResultDetails}>
              Exibir análise ergonômica
            </button>
          </div>
        )}
        {resultDetailsRevealed && (
          <>
        {(currentAnalysis?.hasVideoRecording || currentAnalysis?.localVideoUrl) && (
          <AnalysisVideoPlayer
            analysisId={currentAnalysis.id}
            tenantId={selectedCompany.id}
            hasVideoRecording={currentAnalysis.hasVideoRecording}
            localVideoUrl={currentAnalysis.localVideoUrl}
            videoFormat={currentAnalysis.videoFormat}
            durationSecs={currentAnalysis.recordingSecs}
          />
        )}
        {currentAnalysis?.captureImage && (
          <div className="capture-preview">
            <img src={currentAnalysis.captureImage} alt="Captura com esqueleto ergonômico" />
            <div className="capture-badge">
              Esqueleto NR-17
              {currentAnalysis.recordingSecs !== undefined && currentAnalysis.recordingSecs > 0 && (
                <> · {String(Math.floor(currentAnalysis.recordingSecs / 60)).padStart(2, '0')}:{String(currentAnalysis.recordingSecs % 60).padStart(2, '0')}</>
              )}
            </div>
          </div>
        )}
        {!nr17 && (
          <div className="card result-export-card">
            {canExportPdf ? (
              <button type="button" className="btn bp btn-sm btn-inline" onClick={exportCurrentAnalysisPdf}>
                Exportar PDF
              </button>
            ) : (
              <UpgradeBanner message="Exportação PDF completa no plano Profissional. Modo gratuito: visualize o resultado na tela." />
            )}
          </div>
        )}
        {nr17 && (
          <div className={`card nr17-card nr17-card--${nr17.overallStatus}`}>
            <div className="nr17-card-head">
              <div>
                <div className="nr17-card-kicker">Laudo ergonômico</div>
                <div className="nr17-card-title">Índices ErgoSense · Apoio AEP/AET</div>
              </div>
              <span className={`nr17-badge ${nr17StatusClass(nr17.overallStatus)}`}>
                {nr17StatusLabel(nr17.overallStatus)}
              </span>
            </div>
            <ErgoIndicesPanel indices={nr17.ergoIndices} sampling={nr17.samplingConfidence} />
            <div className="report-doc">
              <p className="nr17-summary report-justify">{nr17.summary}</p>
              <div className="nr17-meta report-justify">
                Sessão {Math.floor(nr17.sessionDurationSecs / 60)} min · {nr17.sampleCount} amostras · {nr17.riskTimePct}% em risco
              </div>
              <LoadEffortReportPanel
                analysis={a}
                onApply={(effort, weightKg, distanceCm) =>
                  applyLoadEffortToCurrentAnalysis(effort, weightKg, distanceCm)
                }
              />
              <div className="nr17-items">
                {nr17.items.map((item) => (
                  <div key={item.id} className={`nr17-item ${nr17StatusClass(item.status)}`}>
                    <div className="nr17-item-top">
                      <span className="nr17-item-ref">{item.referencia}</span>
                      <span className={`nr17-item-status ${nr17StatusClass(item.status)}`}>{nr17StatusLabel(item.status)}</span>
                    </div>
                    <div className="nr17-item-title report-justify">
                      {item.titulo} — {nr17StatusLabel(item.status)}
                    </div>
                    <div className="nr17-item-detail report-justify">{item.detalhe}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="nr17-export">
              {canExportPdf ? (
                <button type="button" className="btn bp btn-sm btn-inline" onClick={exportCurrentAnalysisPdf}>
                  Exportar PDF
                </button>
              ) : (
                <UpgradeBanner />
              )}
            </div>
            <AiExpertAnalysisPanel tenantId={selectedCompany.id} analysis={a} />
          </div>
        )}
        {le && resultDetailsRevealed && !nr17 && (
          <div className={`card load-result-card load-result-card--${le.risk}`}>
            <div className="load-result-head">
              <span>⚖️</span>
              <div>
                <div className="load-result-title">Índice peso × distância</div>
                <div className={`badge ${riskBadgeClass(le.risk)}`}>{riskLevelLabelPt(le.risk)}</div>
              </div>
            </div>
            <div className="load-result-grid">
              <div><span>Peso</span><strong>{le.weightKg} kg</strong></div>
              <div><span>Distância da carga ao corpo</span><strong>{le.distanceCm} cm ({le.distanceM} m)</strong></div>
              <div><span>Índice</span><strong>{le.indiceEsforco}</strong></div>
            </div>
            <p className="load-measure-rec">{le.recomendacao}</p>
            {a.loadManual?.objectDescription && (
              <p className="load-result-ref">Objeto: {a.loadManual.objectDescription}</p>
            )}
          </div>
        )}
        {resultDetailsRevealed && !nr17 && (
          <LoadEffortReportPanel
            analysis={a}
            onApply={(effort, weightKg, distanceCm) =>
              applyLoadEffortToCurrentAnalysis(effort, weightKg, distanceCm)
            }
          />
        )}
        {lr && lp && resultDetailsRevealed && (
          <div className="card load-result-card">
            <div className="load-result-head">
              <span>📦</span>
              <div>
                <div className="load-result-title">Movimentação manual de cargas</div>
                <div className={`badge ${riskBadgeClass(lr.risk)}`}>{riskLevelLabelPt(lr.risk)} · {lr.score}/100</div>
              </div>
            </div>
            <div className="load-result-grid">
              <div><span>Peso informado</span><strong>{lp.weightKg} kg</strong></div>
              <div><span>Distância ao tronco</span><strong>{lr.distanceCmUsed} cm</strong></div>
              <div><span>Limite NIOSH</span><strong>{lr.pesoLimiteKg} kg</strong></div>
              <div><span>Utilização</span><strong>{lr.utilizacaoPct}%</strong></div>
              <div><span>Exposição</span><strong>{formatDur(lp.exposureSecs)}</strong></div>
              <div><span>Manuseio</span><strong>{handlingModeLabel(lp.handlingMode)}</strong></div>
            </div>
            {lr.factorsFound.length > 0 && <LoadFactorsPanel loadResult={lr} />}
            <p className="load-result-ref">Referência distância segura: ≤{LOAD_DISTANCE_OPTIMAL_CM} cm · Plano: {planTier}</p>
          </div>
        )}
        <div className="hl-r" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="rw" style={{ marginBottom: 13 }}>
            <svg width="128" height="128" viewBox="0 0 128 128">
              <circle cx="64" cy="64" r="55" fill="none" stroke="rgba(255,255,255,.05)" strokeWidth="8" />
              <circle cx="64" cy="64" r="55" fill="none" stroke="#FF3D3D" strokeWidth="8" strokeDasharray="345 345" strokeDashoffset={dashOffset} strokeLinecap="round" transform="rotate(-90 64 64)" />
            </svg>
            <div className="rc">
              <div className={`rn ${a.risk === 'critico' ? 'tr' : a.risk === 'alto' ? 'to' : a.risk === 'medio' ? 'ta' : 'tg'}`}>{a.score}</div>
              <div className="rs">Score</div>
            </div>
          </div>
          <div className={`badge ${riskBadgeClass(a.risk)}`} style={{ fontSize: 12, padding: '6px 16px' }}>
            ⚠️ Risco {riskLabel(a.risk)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--t1)', marginTop: 9, textAlign: 'center' }}>
            {a.collaboratorName} · {contextLabel(ctx)} · {a.activity}
          </div>
          <div style={{ fontSize: 10, color: 'var(--t2)', marginTop: 4, textAlign: 'center' }}>
            {a.date} · {a.time}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div style={{ background: 'var(--bg1)', border: '1px solid rgba(255,61,61,.18)', borderRadius: 14, padding: 14, textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--fd)', fontSize: 10, fontWeight: 700, letterSpacing: 2, color: 'var(--t1)', textTransform: 'uppercase', marginBottom: 7 }}>RULA</div>
            <div style={{ fontFamily: 'var(--fd)', fontSize: 40, fontWeight: 800, color: 'var(--red)', lineHeight: 1 }}>{a.rula}</div>
            <div style={{ fontSize: 9, color: 'var(--red)', fontFamily: 'var(--fd)', letterSpacing: '.5px', textTransform: 'uppercase', marginTop: 2 }}>Ação imediata</div>
          </div>
          <div style={{ background: 'var(--bg1)', border: '1px solid rgba(255,107,53,.18)', borderRadius: 14, padding: 14, textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--fd)', fontSize: 10, fontWeight: 700, letterSpacing: 2, color: 'var(--t1)', textTransform: 'uppercase', marginBottom: 7 }}>REBA</div>
            <div style={{ fontFamily: 'var(--fd)', fontSize: 40, fontWeight: 800, color: 'var(--orange)', lineHeight: 1 }}>{a.reba}</div>
            <div style={{ fontSize: 9, color: 'var(--orange)', fontFamily: 'var(--fd)', letterSpacing: '.5px', textTransform: 'uppercase', marginTop: 2 }}>Alto risco</div>
          </div>
        </div>
        {a.v2Report && resultDetailsRevealed && (
          <div className="card v2-methods-card" style={{ marginBottom: 12 }}>
            <div className="card-t">ErgoSense V2 — {a.v2Report.methods.length} métodos</div>
            <p style={{ fontSize: 12, color: 'var(--t1)', marginBottom: 10 }}>
              NIOSH, OWAS, KIM, OCRA, QEC, ROSA, NASA TLX, Snook, TLV HAL e mais — validados por critérios mestres{' '}
              {a.v2Report.criteriaVersion}.
            </p>
            {a.v2Report.aiReport && (
              <p style={{ fontSize: 11, color: 'var(--t2)', marginBottom: 8 }}>{a.v2Report.aiReport.diagnostico}</p>
            )}
            <button type="button" className="btn bp btn-sm" onClick={() => go('v2-methods')}>
              Ver laudo multi-método →
            </button>
          </div>
        )}
        <div className="card">
          <div style={{ fontFamily: 'var(--fd)', fontSize: 10, fontWeight: 700, letterSpacing: 2.5, color: 'var(--t1)', textTransform: 'uppercase', marginBottom: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 2, background: 'var(--amber)', display: 'inline-block' }} />
            ÂNGULOS ARTICULARES
          </div>
          {angleRows.map(({ name, val, atRisk, max }) => {
            const pct = Math.min(100, Math.round((val / max) * 100));
            return (
              <div key={name} className="ar" style={atRisk ? { borderLeft: '3px solid var(--red)', paddingLeft: 10 } : undefined}>
                <div className="ah">
                  <span className="an" style={atRisk ? { color: 'var(--red)' } : undefined}>{name}</span>
                  <span className={`av2 ${atRisk ? 'tr' : 'tg'}`}>
                    {val}°{atRisk ? ' ⚠️' : ''}
                  </span>
                </div>
                <div className="pb">
                  <div className="pf" style={{ width: `${pct}%`, background: atRisk ? 'var(--red)' : 'var(--green)' }} />
                </div>
              </div>
            );
          })}
        </div>
        {ws && (
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ fontFamily: 'var(--fd)', fontSize: 10, fontWeight: 700, letterSpacing: 2.5, color: 'var(--t1)', textTransform: 'uppercase', marginBottom: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 2, background: 'var(--cyan)', display: 'inline-block' }} />
              {profile.assessVisualDisplay ? 'POSTO · TELA · AMBIENTE' : 'AMBIENTE · POSTO DE TRABALHO'}
            </div>
            <div className="ws-grid ws-grid--result">
              {profile.assessVisualDisplay && (
                <>
                  <div className={resultRisks.telaDistancia ? 'ws-metric ws-metric--risk' : 'ws-metric'}>
                    <div className="ws-metric-lbl">Distância tela</div>
                    <div className="ws-metric-val">{ws.telaDistanciaCm} cm</div>
                  </div>
                  <div className={resultRisks.telaAltura ? 'ws-metric ws-metric--risk' : 'ws-metric'}>
                    <div className="ws-metric-lbl">Altura monitor</div>
                    <div className="ws-metric-val">{ws.telaAltura === 'ideal' ? 'OK' : ws.telaAltura === 'baixa' ? 'Baixa' : 'Alta'}</div>
                  </div>
                </>
              )}
              <div className={resultRisks.luz ? 'ws-metric ws-metric--risk' : 'ws-metric'}>
                <div className="ws-metric-lbl">Iluminação</div>
                <div className="ws-metric-val">{ws.lux} lux</div>
              </div>
              {profile.assessVisualDisplay && (
                <div className={resultRisks.filtroAzul ? 'ws-metric ws-metric--risk' : 'ws-metric'}>
                  <div className="ws-metric-lbl">Filtro azul</div>
                  <div className="ws-metric-val">{ws.indiceAzul}% · {ws.filtroTela === 'sem_filtro' ? 'Sem filtro' : ws.filtroTela === 'adequado' ? 'OK' : 'Parcial'}</div>
                </div>
              )}
            </div>
            {!profile.assessVisualDisplay && (
              <div style={{ fontSize: 11, color: 'var(--t2)', marginTop: 10, lineHeight: 1.45 }}>
                Avaliação focada em postura corporal para {profile.label.toLowerCase()}. Métricas de monitor não se aplicam a esta atividade.
              </div>
            )}
          </div>
        )}
        {(a.maxRiskStreakSecs ?? 0) > 0 && (
          <div className="card" style={{ marginBottom: 12, borderLeft: '3px solid var(--red)' }}>
            <div style={{ fontFamily: 'var(--fd)', fontSize: 10, fontWeight: 700, letterSpacing: 2, color: 'var(--red)', textTransform: 'uppercase', marginBottom: 8 }}>
              ⏱️ Tempo em postura de risco
            </div>
            <div style={{ fontSize: 14, color: 'var(--t0)', marginBottom: 4 }}>
              Máximo contínuo: <strong style={{ color: 'var(--red)' }}>{formatDur(a.maxRiskStreakSecs ?? 0)}</strong>
              {' · '}Total na sessão: {formatDur(a.totalRiskSecs ?? 0)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--t1)' }}>
              NR-17: evite manter a mesma postura estática por mais de 3–5 minutos sem pausa.
            </div>
          </div>
        )}
        <div className="card cc">
          <div style={{ fontFamily: 'var(--fd)', fontSize: 10, fontWeight: 700, letterSpacing: 2.5, color: 'var(--t1)', textTransform: 'uppercase', marginBottom: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 2, background: 'var(--cyan)', display: 'inline-block' }} />
            CORREÇÕES SUGERIDAS
          </div>
          {recommendations.map((rec, i) => (
            <div
              key={rec.id}
              style={{
                display: 'flex',
                gap: 11,
                padding: '10px 0',
                borderBottom: i < recommendations.length - 1 ? '1px solid var(--b0)' : 'none',
                borderLeft: rec.priority === 'alta' ? '3px solid var(--red)' : undefined,
                paddingLeft: rec.priority === 'alta' ? 10 : 0,
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  background: rec.priority === 'alta' ? 'var(--r10)' : 'var(--a10)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 15,
                  flexShrink: 0,
                }}
              >
                {rec.icon}
              </div>
              <div>
                <div style={{ fontSize: 13, color: rec.priority === 'alta' ? 'var(--red)' : 'var(--t0)', fontWeight: 600, marginBottom: 2 }}>
                  {rec.title}
                </div>
                <div style={{ fontSize: 11, color: 'var(--t1)', lineHeight: 1.45 }}>{rec.detail}</div>
              </div>
            </div>
          ))}
        </div>
        <button className="btn bp" onClick={() => go('new-analysis')}>
          Nova Análise
        </button>
        <div className="result-delete-wrap">
          <button type="button" className="history-delete-btn history-delete-btn--text" onClick={() => deleteAnalysis(a.id)}>
            Excluir análise
          </button>
        </div>
          </>
        )}
      </div>
    </>
  );
}
