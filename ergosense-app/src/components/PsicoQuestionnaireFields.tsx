/**
 * Campos de questionário psicossocial reutilizáveis (interno e link público).
 */
import {
  CBI_PERGUNTAS,
  CLIMA_DIMS,
  COPSOQ_DIMS,
  HSE_DIMS,
  LIKERT_5,
  abaFromTipo,
} from '../data/psicoQuestionnaires';
import type { PsicoQuestionnaireType } from '../types/psicossocial';

type Aba = ReturnType<typeof abaFromTipo>;

type Props = {
  type: PsicoQuestionnaireType;
  respostas: Record<string, number>;
  onAnswer: (key: string, val: number) => void;
};

export function PsicoQuestionnaireFields({ type, respostas, onAnswer }: Props) {
  const aba: Aba = abaFromTipo(type);

  if (aba === 'copsoq') {
    return (
      <>
        {COPSOQ_DIMS.map((dim) => (
          <div key={dim.id} className="card">
            <div
              className="card-t"
              style={{
                color: 'var(--amber)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                marginBottom: 10,
              }}
            >
              {dim.titulo}
            </div>
            {dim.perguntas.map((perg, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: 'var(--t0)', marginBottom: 8 }}>
                  {i + 1}. {perg}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {LIKERT_5.map((label, val) => (
                    <label
                      key={val}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 11,
                        color: 'var(--t1)',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="radio"
                        name={`${dim.id}-q${i}`}
                        checked={respostas[`${dim.id}-q${i}`] === val}
                        onChange={() => onAnswer(`${dim.id}-q${i}`, val)}
                        style={{ accentColor: 'var(--amber)' }}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </>
    );
  }

  if (aba === 'hse') {
    return (
      <>
        {HSE_DIMS.map((dim) => (
          <div key={dim.id} className="card">
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                color: dim.cor,
                marginBottom: 10,
              }}
            >
              {dim.titulo}
            </div>
            {dim.perguntas.map((perg, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: 'var(--t0)', marginBottom: 8 }}>
                  {i + 1}. {perg}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {LIKERT_5.map((label, val) => (
                    <label
                      key={val}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 11,
                        color: 'var(--t1)',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="radio"
                        checked={respostas[`${dim.id}-q${i}`] === val}
                        onChange={() => onAnswer(`${dim.id}-q${i}`, val)}
                        style={{ accentColor: 'var(--cyan)' }}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </>
    );
  }

  if (aba === 'cbi') {
    return (
      <div className="card">
        {CBI_PERGUNTAS.map((perg, i) => (
          <div key={i} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--t0)', marginBottom: 8 }}>
              {i + 1}. {perg}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {LIKERT_5.map((label, val) => (
                <label
                  key={val}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 11,
                    color: 'var(--t1)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    checked={respostas[`cbi-q${i}`] === val}
                    onChange={() => onAnswer(`cbi-q${i}`, val)}
                    style={{ accentColor: 'var(--red)' }}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {CLIMA_DIMS.map((dim) => (
        <div key={dim.id} className="card">
          <div
            className="card-t"
            style={{
              color: 'var(--cyan)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              marginBottom: 10,
            }}
          >
            {dim.titulo}
          </div>
          {dim.perguntas.map((perg, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--t0)', marginBottom: 8 }}>
                {i + 1}. {perg}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {LIKERT_5.map((label, val) => (
                  <label
                    key={val}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 11,
                      color: 'var(--t1)',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      checked={respostas[`${dim.id}-q${i}`] === val}
                      onChange={() => onAnswer(`${dim.id}-q${i}`, val)}
                      style={{ accentColor: 'var(--cyan)' }}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}