/**
 * Critérios de Avaliação de Riscos — NR-01 §1.5.4.4.2.2
 */
import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  CRITERIA_ACTION_LABELS,
  criteriaLevelColor,
  type CriteriaMatrixCell,
  type MatrixType,
} from '../types/riskCriteria';

function MatrixPreview({ matrix }: { matrix: CriteriaMatrixCell[] }) {
  const severities = useMemo(() => {
    const set = new Set(matrix.map((c) => c.severity));
    return [...set].sort((a, b) => a - b);
  }, [matrix]);
  const probabilities = useMemo(() => {
    const set = new Set(matrix.map((c) => c.probability));
    return [...set].sort((a, b) => b - a);
  }, [matrix]);

  const cellMap = useMemo(() => {
    const m = new Map<string, CriteriaMatrixCell>();
    for (const c of matrix) m.set(`${c.probability}-${c.severity}`, c);
    return m;
  }, [matrix]);

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr>
            <th style={{ padding: 6, textAlign: 'left' }}>P \\ S</th>
            {severities.map((s) => (
              <th key={s} style={{ padding: 6, textAlign: 'center' }}>S{s}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {probabilities.map((p) => (
            <tr key={p}>
              <td style={{ padding: 6, fontWeight: 600 }}>P{p}</td>
              {severities.map((s) => {
                const c = cellMap.get(`${p}-${s}`);
                if (!c) return <td key={s} />;
                return (
                  <td
                    key={s}
                    style={{
                      padding: 6,
                      textAlign: 'center',
                      background: `${criteriaLevelColor(c.level)}22`,
                      border: `1px solid ${criteriaLevelColor(c.level)}55`,
                      color: criteriaLevelColor(c.level),
                      fontWeight: 700,
                    }}
                    title={`${c.levelLabel ?? c.level} · ${c.acceptable ? 'Aceitável' : 'Inaceitável'}`}
                  >
                    {c.score}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CriteriaDashboardScreen() {
  const { go, activeCriteria, riskCriteriaMethodologies, refreshRiskCriteria, dbConnected } = useApp();
  const c = activeCriteria;

  return (
    <div className="scroll scroll--dashboard">
      <div className="hl-r" style={{ marginBottom: 14 }}>
        <div className="row gap8 mb8">
          <span style={{ fontSize: 18 }}>📐</span>
          <span className="lbl" style={{ color: 'var(--cyan)' }}>CRITÉRIOS DE AVALIAÇÃO DE RISCOS</span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--t1)', margin: 0 }}>
          NR-01 §1.5.4.4.2.2 · Probabilidade · Severidade · Criticidade · Aceitabilidade
        </p>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="row between mb8">
          <span className="stl">Metodologia vigente</span>
          {dbConnected && (
            <button type="button" className="btn bs btn-sm btn-inline" onClick={() => refreshRiskCriteria()}>
              Atualizar
            </button>
          )}
        </div>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{c?.name ?? '—'}</div>
        <div style={{ fontSize: 11, color: 'var(--t2)', marginTop: 4 }}>
          Versão {c?.versionNumber ?? '—'} · {c?.matrixType ?? '—'}
          {c?.activatedAt ? ` · vigente desde ${new Date(c.activatedAt).toLocaleDateString('pt-BR')}` : ''}
        </div>
      </div>

      <div className="sg" style={{ gridTemplateColumns: 'repeat(2,1fr)', marginBottom: 12 }}>
        <div className="sc" onClick={() => go('criterios-config')}>
          <div className="sv" style={{ color: 'var(--cyan)' }}>{riskCriteriaMethodologies.length}</div>
          <div className="sl">Metodologias</div>
        </div>
        <div className="sc" onClick={() => go('criterios-historico')}>
          <div className="sv" style={{ color: 'var(--amber)' }}>{c?.versionNumber ?? 1}</div>
          <div className="sl">Versão ativa</div>
        </div>
        <div className="sc" onClick={() => go('criterios-documentacao')}>
          <div className="sv" style={{ fontSize: 16 }}>📄</div>
          <div className="sl">Documentação NR-01</div>
        </div>
        <div className="sc" onClick={() => go('criterios-historico')}>
          <div className="sv" style={{ fontSize: 16 }}>📝</div>
          <div className="sl">Trilha auditoria</div>
        </div>
      </div>

      {c?.matrix && (
        <>
          <div className="sec"><span className="stl">Matriz vigente</span></div>
          <div className="card">
            <MatrixPreview matrix={c.matrix} />
          </div>
        </>
      )}

      <div className="sec mt12"><span className="stl">Escalas configuradas</span></div>
      <div className="card">
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Probabilidade</div>
        {(c?.config?.probability ?? []).map((p) => (
          <div key={p.value} className="bar-row" style={{ marginBottom: 4, fontSize: 11 }}>
            <span>{p.value} — {p.label}</span>
            <span className="t2">{p.description}</span>
          </div>
        ))}
        <div style={{ fontSize: 12, fontWeight: 700, margin: '12px 0 6px' }}>Severidade</div>
        {(c?.config?.severity ?? []).map((s) => (
          <div key={s.value} className="bar-row" style={{ marginBottom: 4, fontSize: 11 }}>
            <span>{s.value} — {s.label}</span>
            <span className="t2">{s.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CriteriaConfigScreen() {
  const {
    go,
    riskCriteriaMethodologies,
    activeCriteria,
    createRiskMethodology,
    activateCriteriaVersion,
    refreshRiskCriteria,
    showToast,
    dbConnected,
    selectedCompany,
  } = useApp();
  const [name, setName] = useState('');
  const [matrixType, setMatrixType] = useState<MatrixType>('PROB_SEV_5X5');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [versions, setVersions] = useState<import('../types/riskCriteria').CriteriaVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  const loadVersions = async (id: string) => {
    setLoadingVersions(true);
    setSelectedId(id);
    try {
      const { apiFetchCriteriaVersions } = await import('../api/client');
      const list = await apiFetchCriteriaVersions(id, selectedCompany.id);
      setVersions(list);
    } catch {
      showToast('Erro ao carregar versões', 'warn');
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) return showToast('Informe o nome da metodologia', 'warn');
    try {
      await createRiskMethodology({ name: name.trim(), matrixType, activate: false });
      setName('');
      showToast('Metodologia criada', 'success');
      await refreshRiskCriteria();
    } catch {
      showToast('Erro ao criar metodologia', 'warn');
    }
  };

  const handleActivate = async (methodologyId: string, versionId: string) => {
    try {
      await activateCriteriaVersion(methodologyId, versionId);
      showToast('Versão ativada — cálculos atualizados', 'success');
      await refreshRiskCriteria();
      if (selectedId) await loadVersions(selectedId);
    } catch {
      showToast('Erro ao ativar versão', 'warn');
    }
  };

  return (
    <div className="scroll">
      <div className="row between mb12">
        <button type="button" className="btn bs btn-sm btn-inline" onClick={() => go('criterios-dashboard')}>← Voltar</button>
        <span className="stl">Configuração</span>
      </div>

      {dbConnected && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="stl mb8">Nova metodologia</div>
          <input
            className="inp"
            placeholder="Nome da metodologia"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ marginBottom: 8 }}
          />
          <select
            className="inp"
            value={matrixType}
            onChange={(e) => setMatrixType(e.target.value as MatrixType)}
            style={{ marginBottom: 8 }}
          >
            <option value="PROB_SEV_5X5">Matriz 5×5 NR-01 (padrão)</option>
            <option value="PROB_SEV_3X3">Matriz 3×3 simplificada</option>
          </select>
          <button type="button" className="btn bp" onClick={handleCreate}>Criar metodologia</button>
        </div>
      )}

      <div className="sec"><span className="stl">Metodologias cadastradas</span></div>
      {riskCriteriaMethodologies.map((m) => (
        <div key={m.id} className="card" style={{ marginBottom: 8 }}>
          <div className="row between">
            <div>
              <div style={{ fontWeight: 700 }}>{m.name}{m.isDefault ? ' (padrão)' : ''}</div>
              <div style={{ fontSize: 11, color: 'var(--t2)' }}>
                {m.matrixType} · v{m.activeVersionNumber ?? '—'}
              </div>
            </div>
            <button type="button" className="btn bs btn-sm btn-inline" onClick={() => loadVersions(m.id)}>
              Versões
            </button>
          </div>
          {selectedId === m.id && (
            <div style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
              {loadingVersions ? (
                <div className="t2">Carregando…</div>
              ) : (
                versions.map((v) => (
                  <div key={v.id} className="row between" style={{ marginBottom: 6, fontSize: 12 }}>
                    <span>
                      v{v.versionNumber} · {v.status}
                      {v.notes ? ` — ${v.notes}` : ''}
                    </span>
                    {v.status !== 'ativa' && (
                      <button
                        type="button"
                        className="btn bs btn-sm btn-inline"
                        onClick={() => handleActivate(m.id, v.id)}
                      >
                        Ativar
                      </button>
                    )}
                    {v.status === 'ativa' && m.id === activeCriteria?.methodologyId && (
                      <span style={{ color: 'var(--green)', fontSize: 11 }}>Vigente</span>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function CriteriaHistoricoScreen() {
  const { go, criteriaAuditTrail, refreshRiskCriteria, riskCriteriaMethodologies } = useApp();

  return (
    <div className="scroll">
      <div className="row between mb12">
        <button type="button" className="btn bs btn-sm btn-inline" onClick={() => go('criterios-dashboard')}>← Voltar</button>
        <button type="button" className="btn bs btn-sm btn-inline" onClick={() => refreshRiskCriteria()}>Atualizar</button>
      </div>
      <div className="sec"><span className="stl">Histórico de versões e auditoria</span></div>
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Metodologias ({riskCriteriaMethodologies.length})</div>
        {riskCriteriaMethodologies.map((m) => (
          <div key={m.id} style={{ fontSize: 11, marginBottom: 4 }}>
            {m.name} · v{m.activeVersionNumber ?? '—'} · {m.matrixType}
          </div>
        ))}
      </div>
      {criteriaAuditTrail.map((entry) => (
        <div key={entry.id} className="card" style={{ marginBottom: 8, fontSize: 12 }}>
          <div className="row between">
            <span style={{ fontWeight: 700 }}>
              {CRITERIA_ACTION_LABELS[entry.action] ?? entry.action}
            </span>
            <span className="t2">{new Date(entry.createdAt).toLocaleString('pt-BR')}</span>
          </div>
          <div className="t2" style={{ marginTop: 4 }}>
            {entry.userName ?? 'Sistema'}
            {entry.ip ? ` · IP ${entry.ip}` : ''}
          </div>
        </div>
      ))}
      {!criteriaAuditTrail.length && <div className="t2 card">Nenhum registro de auditoria.</div>}
    </div>
  );
}

export function CriteriaDocumentacaoScreen() {
  const { go, criteriaDocumentation } = useApp();
  const doc = criteriaDocumentation;

  return (
    <div className="scroll">
      <div className="row between mb12">
        <button type="button" className="btn bs btn-sm btn-inline" onClick={() => go('criterios-dashboard')}>← Voltar</button>
      </div>
      <div className="sec"><span className="stl">Documentação automática NR-01</span></div>
      {!doc ? (
        <div className="card t2">Documentação não disponível.</div>
      ) : (
        <div className="card">
          <div style={{ fontSize: 11, color: 'var(--t2)', marginBottom: 8 }}>
            Gerado em {new Date(doc.generatedAt).toLocaleString('pt-BR')} · {doc.nr01Reference}
          </div>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              fontSize: 11,
              lineHeight: 1.5,
              fontFamily: 'inherit',
              margin: 0,
            }}
          >
            {doc.markdown}
          </pre>
        </div>
      )}
    </div>
  );
}
