import { useCallback, useMemo, useRef, useState } from 'react';
import { ErgoBodyHeatmap } from '../components/ErgoBodyHeatmap';
import { ErgoVideoTimeline } from '../components/ErgoVideoTimeline';
import { AnalysisVideoPlayer } from '../components/AnalysisVideoPlayer';
import { SkeletonOverlay } from '../components/SkeletonOverlay';
import { VideoErgoExecutivePanel } from '../components/VideoErgoExecutivePanel';
import { useApp } from '../context/AppContext';
import { useCamera } from '../hooks/useCamera';
import { usePoseDetection } from '../hooks/usePoseDetection';
import { useVideoErgonomicAnalysis } from '../hooks/useVideoErgonomicAnalysis';
import { getMlStats } from '../services/mlFeedbackLoop';
import type { VideoFrameSample } from '../services/videoAnalysis';
import type { JointAngles } from '../types';
import type { VideoErgonomicReport } from '../types/videoErgo';
import { normalizeLoadParams } from '../utils/loadHandling';
import { EMPTY_JOINT_ANGLES } from '../utils/poseGeometry';
import { exportVideoErgoExcel, exportVideoErgoPdf, exportVideoErgoWord } from '../utils/exportVideoErgoReport';

type TabId = 'capture' | 'results' | 'reports';

export function VideoErgonomicScreen() {
  const {
    analysisDraft,
    collaborators,
    selectedCompany,
    showToast,
    go,
    captureVideoAnalysis,
    currentAnalysis,
  } = useApp();

  const [tab, setTab] = useState<TabId>('capture');
  const [mode, setMode] = useState<'live' | 'upload'>('live');
  const [facing, setFacing] = useState<'user' | 'environment'>('environment');
  const [selectedCollabId, setSelectedCollabId] = useState(analysisDraft.collaboratorId || '');
  const [recording, setRecording] = useState(false);
  const [liveAngles, setLiveAngles] = useState<JointAngles>(EMPTY_JOINT_ANGLES);
  const liveSamplesRef = useRef<VideoFrameSample[]>([]);
  const startTimeRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const collab = collaborators.find((c) => c.id === selectedCollabId);

  const baseInput = useMemo(
    () => ({
      loadParams: normalizeLoadParams(analysisDraft.loadAssessment?.manual, analysisDraft.loadAssessment?.estimate),
      workstation: null,
      exposureSecs: 0,
    }),
    [analysisDraft],
  );

  const { progress, report, analyzeFromFile, analyzeFromFrames, cancel, reset } = useVideoErgonomicAnalysis({
    baseInput,
  });

  const displayReport: VideoErgonomicReport | null =
    report ?? currentAnalysis?.v2Report?.videoErgonomicReport ?? null;

  const onCameraError = useCallback((msg: string) => showToast(msg, 'warn'), [showToast]);

  const { setVideoNode, videoRef, status: cameraStatus, startRecording, stopRecording } = useCamera(
    facing,
    onCameraError,
  );

  const onAngles = useCallback((angles: JointAngles) => {
    setLiveAngles(angles);
    if (recording) {
      liveSamplesRef.current.push({
        timestampMs: Date.now() - startTimeRef.current,
        angles,
      });
    }
  }, [recording]);

  const poseEnabled = mode === 'live' && (cameraStatus === 'ready' || cameraStatus === 'recording');
  const { poseFrame, tracking } = usePoseDetection(videoRef, containerRef, {
    enabled: poseEnabled,
    mirrored: facing === 'user',
    onAngles,
  });

  const finishAnalysis = useCallback(
    (result: VideoErgonomicReport, source: 'live' | 'upload', videoBlob?: Blob | null) => {
      if (!collab) {
        showToast('Selecione um colaborador', 'warn');
        return;
      }
      captureVideoAnalysis(result, collab.id, source, videoBlob ?? null);
      setTab('results');
    },
    [captureVideoAnalysis, collab, showToast],
  );

  const startLive = () => {
    if (!collab) {
      showToast('Selecione um colaborador', 'warn');
      return;
    }
    liveSamplesRef.current = [];
    startTimeRef.current = Date.now();
    setRecording(true);
    startRecording();
    showToast('Análise em tempo real iniciada', 'info');
  };

  const stopLive = async () => {
    setRecording(false);
    const { videoBlob } = await stopRecording();
    const frames = [...liveSamplesRef.current];

    if (frames.length >= 3) {
      const result = analyzeFromFrames(frames, 'live');
      if (result) finishAnalysis(result, 'live', videoBlob);
      return;
    }

    if (videoBlob) {
      showToast('Processando gravação com MediaPipe...', 'info');
      const result = await analyzeFromFile(new File([videoBlob], 'recording.webm', { type: videoBlob.type }), 'live');
      if (result) finishAnalysis(result, 'live', videoBlob);
      return;
    }

    showToast('Poucos frames capturados — tente novamente', 'warn');
  };

  const handleUpload = async (file: File | null) => {
    if (!file || !collab) {
      if (!collab) showToast('Selecione um colaborador', 'warn');
      return;
    }
    const result = await analyzeFromFile(file, 'upload');
    if (result) {
      finishAnalysis(result, 'upload', file);
      showToast(`${result.frameCount} frames analisados`, 'success');
    }
  };

  const mlStats = getMlStats();
  const processing = ['extracting', 'loading_model', 'analyzing'].includes(progress.phase);

  return (
    <div className="scroll pad">
      <div className="hl">
        <h2 style={{ margin: 0 }}>Análise Ergonômica por Vídeo</h2>
        <p className="t2">MediaPipe Pose · RULA · REBA · OWAS · NR-17 · NIOSH</p>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-t">Colaborador</div>
        <select
          value={selectedCollabId}
          onChange={(e) => setSelectedCollabId(e.target.value)}
          style={{ width: '100%', padding: 8, borderRadius: 8 }}
        >
          <option value="">Selecione...</option>
          {collaborators.map((c) => (
            <option key={c.id} value={c.id}>{c.name} — {c.setor}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {(['capture', 'results', 'reports'] as TabId[]).map((t) => (
          <button key={t} type="button" className={`btn ${tab === t ? 'bp' : 'bs'}`} style={{ flex: 1, fontSize: 12 }} onClick={() => setTab(t)}>
            {t === 'capture' ? '📷 Captura' : t === 'results' ? '📊 Resultados' : '📄 Relatórios'}
          </button>
        ))}
      </div>

      {tab === 'capture' && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button type="button" className={`btn ${mode === 'live' ? 'bp' : 'bs'}`} onClick={() => setMode('live')}>Câmera ao vivo</button>
            <button type="button" className={`btn ${mode === 'upload' ? 'bp' : 'bs'}`} onClick={() => setMode('upload')}>Upload vídeo</button>
          </div>

          {mode === 'live' && (
            <>
              <div ref={containerRef} style={{ position: 'relative', aspectRatio: '4/3', background: '#111', borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
                <video
                  ref={setVideoNode}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transform: facing === 'user' ? 'scaleX(-1)' : undefined }}
                />
                <SkeletonOverlay
                  angles={liveAngles}
                  poseFrame={poseFrame}
                  hasLandmarks={!!poseFrame?.landmarks?.length}
                  anglesReady={tracking}
                  poseReady={tracking}
                  minimal
                />
                {recording && (
                  <div style={{ position: 'absolute', top: 8, left: 8, background: 'var(--red)', padding: '4px 8px', borderRadius: 4, fontSize: 11 }}>
                    ● AO VIVO · {Math.round(liveSamplesRef.current.length / 2)}s
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" className="btn bs" onClick={() => setFacing(facing === 'user' ? 'environment' : 'user')}>
                  {facing === 'user' ? '📱 Frontal' : '📷 Traseira'}
                </button>
                {!recording ? (
                  <button type="button" className="btn bp" onClick={startLive} disabled={cameraStatus !== 'ready'}>Iniciar análise</button>
                ) : (
                  <button type="button" className="btn bp" style={{ background: 'var(--red)' }} onClick={() => void stopLive()}>Finalizar e analisar</button>
                )}
              </div>
            </>
          )}

          {mode === 'upload' && (
            <div className="card">
              <div className="card-t">Upload de vídeo gravado</div>
              <p className="t2" style={{ fontSize: 12 }}>MP4, WebM, MOV — análise frame-a-frame com MediaPipe Pose</p>
              <input type="file" accept="video/*" onChange={(e) => void handleUpload(e.target.files?.[0] ?? null)} disabled={processing} />
            </div>
          )}

          {processing && (
            <div className="card" style={{ marginTop: 12 }}>
              <div className="card-t">{progress.message}</div>
              <div className="bar-track" style={{ marginTop: 8 }}>
                <div className="bar-fill" style={{ width: `${progress.progressPct}%` }} />
              </div>
              <button type="button" className="btn bs" style={{ marginTop: 8 }} onClick={cancel}>Cancelar</button>
            </div>
          )}
        </>
      )}

      {tab === 'results' && displayReport && (
        <>
          {(currentAnalysis?.hasVideoRecording || currentAnalysis?.localVideoUrl) && (
            <AnalysisVideoPlayer
              analysisId={currentAnalysis?.id ?? ''}
              tenantId={selectedCompany.id}
              hasVideoRecording={currentAnalysis?.hasVideoRecording}
              localVideoUrl={currentAnalysis?.localVideoUrl}
              videoFormat={currentAnalysis?.videoFormat}
              durationSecs={currentAnalysis?.recordingSecs ?? displayReport.durationSecs}
            />
          )}
          <VideoErgoExecutivePanel report={displayReport} />
          <div className="card" style={{ marginTop: 12 }}>
            <div className="card-t">Heatmap ergonômico corporal</div>
            <ErgoBodyHeatmap exposure={displayReport.exposureByRegion} />
          </div>
          <div className="card" style={{ marginTop: 12 }}>
            <div className="card-t">Análise temporal</div>
            {displayReport.exposureByRegion.filter((e) => e.exposurePct > 0).sort((a, b) => b.exposurePct - a.exposurePct).map((e) => (
              <div key={e.regionId} className="list-row">
                <span>{e.label}</span>
                <span>{e.exposurePct}% do tempo</span>
              </div>
            ))}
          </div>
          <div className="card" style={{ marginTop: 12 }}>
            <div className="card-t">Timeline inteligente</div>
            <ErgoVideoTimeline events={displayReport.timeline} />
          </div>
          {displayReport.loadLifts.length > 0 && (
            <div className="card" style={{ marginTop: 12 }}>
              <div className="card-t">Levantamentos (NIOSH)</div>
              {displayReport.loadLifts.slice(0, 5).map((l, i) => (
                <div key={i} className="list-row"><span>{l.timeLabel}</span><span className="t2">LI {l.nioshLi.toFixed(1)}</span></div>
              ))}
            </div>
          )}
          <div className="card" style={{ marginTop: 12 }}>
            <div className="card-t">Recomendações IA</div>
            {displayReport.recommendations.map((r, i) => (
              <div key={i} style={{ marginBottom: 10, fontSize: 12 }}>
                <strong>{r.problema}</strong>
                <div className="t2">{r.acaoCorretiva} · {r.prioridade}</div>
              </div>
            ))}
          </div>
          <p className="t2" style={{ fontSize: 11 }}>ML: {mlStats.totalFeedback} feedbacks · {mlStats.regionsCalibrated} regiões calibradas</p>
        </>
      )}

      {tab === 'results' && !displayReport && (
        <div className="card">
          <p>Execute uma captura ou upload para ver resultados.</p>
          <button type="button" className="btn bp" onClick={() => setTab('capture')}>Ir para captura</button>
        </div>
      )}

      {tab === 'reports' && currentAnalysis && displayReport && (
        <div className="card">
          <div className="card-t">Exportar relatório</div>
          <button type="button" className="btn bp" style={{ marginBottom: 8, width: '100%' }} onClick={() => { exportVideoErgoPdf(currentAnalysis, selectedCompany.name); showToast('PDF gerado', 'success'); }}>PDF</button>
          <button type="button" className="btn bs" style={{ marginBottom: 8, width: '100%' }} onClick={() => { exportVideoErgoExcel(currentAnalysis); showToast('Excel gerado', 'success'); }}>Excel (CSV)</button>
          <button type="button" className="btn bs" style={{ width: '100%' }} onClick={() => { exportVideoErgoWord(currentAnalysis, selectedCompany.name); showToast('Word gerado', 'success'); }}>Word (RTF)</button>
        </div>
      )}

      <button type="button" className="btn bs" style={{ marginTop: 16 }} onClick={() => { reset(); go('dashboard'); }}>Voltar</button>
    </div>
  );
}
