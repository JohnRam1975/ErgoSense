/**
 * Painel ErgoSense AI Expert — feedback visual + AET / IT quando inconforme NR-17.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  apiAiExpertAnalyzeErgonomics,
  apiAiExpertGenerateAet,
  apiAiExpertGenerateIt,
  apiGetAiStatus,
  type AiExpertResponse,
} from '../api/client';
import { downloadBase64File } from '../utils/downloadBase64File';
import type { Analysis } from '../types';
import { nr17StatusLabel } from '../utils/nr17';

type StepId = 'idle' | 'analyze' | 'aet' | 'it';
type StepState = 'pending' | 'running' | 'done' | 'error';

interface Props {
  tenantId: string;
  analysis: Analysis;
}

function extractText(res: AiExpertResponse): string {
  if (typeof res.analysis === 'object' && res.analysis && 'narrative' in res.analysis && res.analysis.narrative) {
    return String(res.analysis.narrative);
  }
  if (typeof res.analysis === 'string') return res.analysis;
  return JSON.stringify(res.analysis, null, 2);
}

export function AiExpertAnalysisPanel({ tenantId, analysis }: Props) {
  const nr17 = analysis.nr17Report;
  const isNonConform = nr17?.overallStatus === 'nao_conforme';
  const isAttention = nr17?.overallStatus === 'atencao';

  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const [aiProvider, setAiProvider] = useState('');
  const [activeStep, setActiveStep] = useState<StepId>('idle');
  const [stepState, setStepState] = useState<Record<StepId, StepState>>({
    idle: 'pending',
    analyze: 'pending',
    aet: 'pending',
    it: 'pending',
  });
  const [analysisResult, setAnalysisResult] = useState<AiExpertResponse | null>(null);
  const [aetResult, setAetResult] = useState<AiExpertResponse | null>(null);
  const [itResult, setItResult] = useState<AiExpertResponse | null>(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    apiGetAiStatus()
      .then((s) => {
        setAiConfigured(s.configured);
        setAiProvider(s.provider);
      })
      .catch(() => setAiConfigured(false));
  }, []);

  const entityRefs = useMemo((): Record<string, string> | undefined => {
    const raw = analysis.id.replace(/^a-/, '');
    const num = Number(raw);
    return Number.isFinite(num) && num > 0 ? { analysisId: String(num) } : undefined;
  }, [analysis.id]);

  const contextPrompt = useMemo(() => {
    const parts = [
      `Análise ${analysis.id}: ${analysis.collaboratorName}, setor ${analysis.setor}, atividade ${analysis.activity}.`,
      `Score ${analysis.score}, RULA ${analysis.rula}, REBA ${analysis.reba}.`,
      nr17 ? `Status NR-17: ${nr17StatusLabel(nr17.overallStatus)} — ${nr17.summary}` : '',
    ];
    return parts.filter(Boolean).join(' ');
  }, [analysis, nr17]);

  async function runAnalyze() {
    setError('');
    setActiveStep('analyze');
    setStepState((s) => ({ ...s, analyze: 'running' }));
    setPreview('🤖 IA conectada — coletando dados do tenant e analisando posturas, cargas e NR-17…');
    try {
      const res = await apiAiExpertAnalyzeErgonomics(tenantId, {
        prompt: contextPrompt,
        entityRefs,
        modules: ['analises', 'org', 'aet', 'inventario'],
      });
      setAnalysisResult(res);
      setPreview(`${res.disclaimer}\n\n${extractText(res).slice(0, 2500)}`);
      setStepState((s) => ({ ...s, analyze: 'done' }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha na análise IA';
      setError(msg);
      setStepState((s) => ({ ...s, analyze: 'error' }));
      setPreview('');
    }
  }

  async function runAet() {
    setError('');
    setActiveStep('aet');
    setStepState((s) => ({ ...s, aet: 'running' }));
    setPreview('📐 Gerando AET completa (introdução, diagnóstico, plano de ação)…');
    try {
      const res = await apiAiExpertGenerateAet(tenantId, {
        prompt: contextPrompt,
        entityRefs,
        modules: ['analises', 'aet', 'org', 'inventario', 'historico'],
      });
      setAetResult(res);
      setPreview(`${res.disclaimer}\n\nAET gerada. Baixe o PDF ou prossiga para a IT.`);
      if (res.pdf?.base64) {
        downloadBase64File(res.pdf.base64, res.pdf.filename, res.pdf.mimeType);
      }
      setStepState((s) => ({ ...s, aet: 'done' }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao gerar AET';
      setError(msg);
      setStepState((s) => ({ ...s, aet: 'error' }));
    }
  }

  async function runIt() {
    setError('');
    setActiveStep('it');
    setStepState((s) => ({ ...s, it: 'running' }));
    setPreview('📋 Gerando Instrução de Trabalho (IT) a partir da AET…');
    try {
      const aetSummary = aetResult ? extractText(aetResult).slice(0, 8000) : extractText(analysisResult ?? { analysis: {} } as AiExpertResponse);
      const res = await apiAiExpertGenerateIt(tenantId, {
        prompt: contextPrompt,
        entityRefs,
        aetSummary,
      });
      setItResult(res);
      setPreview(`${res.disclaimer}\n\n${extractText(res).slice(0, 2500)}`);
      if (res.pdf?.base64) {
        downloadBase64File(res.pdf.base64, res.pdf.filename, res.pdf.mimeType);
      }
      setStepState((s) => ({ ...s, it: 'done' }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao gerar IT';
      setError(msg);
      setStepState((s) => ({ ...s, it: 'error' }));
    }
  }

  function stepIcon(state: StepState) {
    if (state === 'running') return '⏳';
    if (state === 'done') return '✓';
    if (state === 'error') return '✗';
    return '○';
  }

  if (aiConfigured === false) {
    return (
      <div className="card" style={{ marginTop: 12, borderColor: 'var(--a35)' }}>
        <div className="lbl" style={{ color: 'var(--amber)' }}>ErgoSense AI Expert</div>
        <p style={{ fontSize: 12, color: 'var(--t1)', margin: '8px 0 0' }}>
          IA não configurada no servidor. Configure <code>AI_PROVIDER</code> e a chave no arquivo <code>server/.env</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="card nr17-ai-panel" style={{ marginTop: 12 }}>
      <div className="nr17-card-head" style={{ marginBottom: 10 }}>
        <div>
          <div className="nr17-card-kicker">ErgoSense AI Expert</div>
          <div className="nr17-card-title" style={{ fontSize: 14 }}>
            Análise assistida · AET · IT
          </div>
        </div>
        <span className="badge bm" style={{ fontSize: 9 }}>
          {aiConfigured ? `${aiProvider} · ativa` : '…'}
        </span>
      </div>

      <ul style={{ fontSize: 11, color: 'var(--t1)', margin: '0 0 12px', paddingLeft: 18, lineHeight: 1.7 }}>
        <li>{stepIcon(stepState.analyze)} Análise técnica com IA (dados reais do tenant)</li>
        <li>{stepIcon(stepState.aet)} AET — Análise Ergonômica do Trabalho (PDF)</li>
        <li>{stepIcon(stepState.it)} IT — Instrução de Trabalho (PDF)</li>
      </ul>

      {activeStep !== 'idle' && stepState[activeStep] === 'running' && (
        <div className="badge ba mb8" style={{ fontSize: 10 }}>Processando… aguarde (15–60 s)</div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        <button type="button" className="btn bp btn-sm" disabled={stepState.analyze === 'running'} onClick={() => void runAnalyze()}>
          {stepState.analyze === 'running' ? 'Analisando…' : '1. Analisar com IA'}
        </button>
        {(isNonConform || isAttention) && (
          <button
            type="button"
            className="btn bo btn-sm"
            disabled={stepState.aet === 'running'}
            onClick={() => void runAet()}
            title={isNonConform ? 'Obrigatório quando NR-17 não conforme' : 'Recomendado em atenção'}
          >
            {stepState.aet === 'running' ? 'Gerando AET…' : '2. Gerar AET (IA)'}
          </button>
        )}
        <button
          type="button"
          className="btn bs btn-sm"
          disabled={!aetResult || stepState.it === 'running'}
          onClick={() => void runIt()}
          title="Instrução de Trabalho derivada da AET"
        >
          {stepState.it === 'running' ? 'Gerando IT…' : '3. Gerar IT'}
        </button>
      </div>

      {isNonConform && (
        <p style={{ fontSize: 11, color: 'var(--red)', margin: '0 0 8px' }}>
          NR-17 não conforme — gere a AET e valide com ergonomista habilitado.
        </p>
      )}

      {error && <p style={{ fontSize: 11, color: 'var(--red)', marginBottom: 8 }}>{error}</p>}

      {preview && (
        <div
          style={{
            padding: 12,
            background: 'var(--bg2)',
            borderRadius: 10,
            fontSize: 11,
            color: 'var(--t1)',
            whiteSpace: 'pre-wrap',
            maxHeight: 280,
            overflow: 'auto',
          }}
        >
          {preview}
        </div>
      )}

      {itResult && (
        <p style={{ fontSize: 10, color: 'var(--green)', marginTop: 8, marginBottom: 0 }}>
          Fluxo concluído: Análise → AET → IT. Documentos sujeitos à validação profissional.
        </p>
      )}
    </div>
  );
}
