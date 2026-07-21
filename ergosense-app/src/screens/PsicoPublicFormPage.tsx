/**
 * Formulário público anônimo — acesso via /form/:token (sem login).
 */
import { useEffect, useState } from 'react';
import { apiGetPublicPsicoForm, apiSubmitPublicPsicoForm } from '../api/client';
import { PsicoQuestionnaireFields } from '../components/PsicoQuestionnaireFields';
import { calcularPreview } from '../data/psicoQuestionnaires';
import type { PsicoPublicFormMeta, PsicoRiskLevel } from '../types/psicossocial';
import { PSICO_QUESTIONNAIRE_LABELS } from '../types/psicossocial';

function nivelLabel(n: PsicoRiskLevel) {
  return n === 'critico' ? 'CRÍTICO' : n === 'alto' ? 'ALTO' : n === 'medio' ? 'MÉDIO' : 'BAIXO';
}

type Props = { token: string };

export default function PsicoPublicFormPage({ token }: Props) {
  const [meta, setMeta] = useState<PsicoPublicFormMeta | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [respostas, setRespostas] = useState<Record<string, number>>({});
  const [consent, setConsent] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void apiGetPublicPsicoForm(token)
      .then((data) => {
        if (!cancelled) setMeta(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setLoadError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  function responder(key: string, val: number) {
    setRespostas((r) => ({ ...r, [key]: val }));
  }

  async function enviar() {
    if (!meta || !consent) return;
    setEnviando(true);
    setSubmitError(null);
    try {
      await apiSubmitPublicPsicoForm(token, { answers: respostas, consentimentoLgpd: true });
      setEnviado(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Erro ao enviar respostas');
    } finally {
      setEnviando(false);
    }
  }

  if (loadError) {
    return (
      <div className="public-form-page">
        <div className="public-form-shell">
          <h1>Formulário indisponível</h1>
          <p className="public-form-muted">{loadError}</p>
        </div>
      </div>
    );
  }

  if (!meta) {
    return (
      <div className="public-form-page">
        <div className="public-form-shell">
          <p className="public-form-muted">Carregando formulário…</p>
        </div>
      </div>
    );
  }

  if (enviado) {
    return (
      <div className="public-form-page">
        <div className="public-form-shell public-form-success">
          <div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>
          <h1>Obrigado pela participação</h1>
          <p className="public-form-muted">
            Suas respostas foram registradas de forma anônima e agregada, conforme a LGPD e a NR-01.
          </p>
          <p className="public-form-muted" style={{ marginTop: 16, fontSize: 11 }}>
            Você pode fechar esta página. Nenhum dado identificador foi associado à sua resposta.
          </p>
        </div>
      </div>
    );
  }

  const preview = Object.keys(respostas).length > 0 ? calcularPreview(meta.type, respostas) : null;
  const tipoLabel = PSICO_QUESTIONNAIRE_LABELS[meta.type];

  return (
    <div className="public-form-page">
      <header className="public-form-header">
        <div className="public-form-brand">ErgoSense</div>
        <div className="public-form-badge">Resposta anônima · LGPD</div>
      </header>

      <div className="public-form-shell scroll">
        <h1 style={{ fontSize: 18, marginBottom: 4 }}>{meta.title}</h1>
        <p className="public-form-muted" style={{ marginBottom: 16 }}>
          {meta.companyName}
          {meta.sectorName ? ` · ${meta.sectorName}` : ''} · {tipoLabel}
        </p>

        <div className="hl mb12" style={{ background: 'var(--bg2)' }}>
          <div className="lbl" style={{ color: 'var(--green)' }}>PRIVACIDADE</div>
          <p style={{ fontSize: 11, color: 'var(--t1)', marginTop: 8, lineHeight: 1.5 }}>
            Este formulário é <strong>100% anônimo</strong>. Suas respostas não serão vinculadas ao seu nome,
            e-mail ou matrícula. Os dados são usados apenas de forma agregada para gestão de riscos psicossociais.
          </p>
        </div>

        <div className="hl mb12" style={{ background: 'var(--bg2)' }}>
          <div className="lbl" style={{ color: 'var(--green)' }}>LGPD — CONSENTIMENTO OBRIGATÓRIO</div>
          <label
            style={{
              display: 'flex',
              gap: 8,
              fontSize: 11,
              color: 'var(--t1)',
              marginTop: 8,
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              style={{ accentColor: 'var(--green)' }}
            />
            {meta.consentText}
          </label>
        </div>

        <PsicoQuestionnaireFields type={meta.type} respostas={respostas} onAnswer={responder} />

        {preview && (
          <div className="hl mb12" style={{ background: 'var(--bg2)' }}>
            <div style={{ fontSize: 11, color: 'var(--t1)' }}>
              Preview local (não identifica você): score {preview.score} · {nivelLabel(preview.nivel)}
            </div>
          </div>
        )}

        {submitError && (
          <div className="hl mb12" style={{ background: 'var(--r10)', border: '1px solid var(--red)' }}>
            <p style={{ fontSize: 12, color: 'var(--red)' }}>{submitError}</p>
          </div>
        )}

        <button
          className="btn bp"
          style={{ marginBottom: 24 }}
          disabled={!consent || enviando}
          onClick={() => void enviar()}
        >
          {enviando ? 'Enviando…' : 'Enviar respostas (anônimo)'}
        </button>
      </div>
    </div>
  );
}
