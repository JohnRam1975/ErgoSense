/**
 * Ciclo GRO — NR-01 (Identificação → Revisão)
 */
import { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  GRO_CONTROL_LABELS,
  GRO_STAGE_LABELS,
  GRO_STAGES,
  groActionLabel,
  type GroReportType,
  type GroStage,
} from '../types/gro';

const STAGE_COLORS: Record<GroStage, string> = {
  IDENTIFICACAO: 'var(--cyan)',
  AVALIACAO: 'var(--amber)',
  CONTROLE: 'var(--orange)',
  MONITORAMENTO: 'var(--green)',
  REVISAO: 'var(--red)',
};

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('pt-BR');
  } catch {
    return iso;
  }
}

// ─── Dashboard GRO ───────────────────────────────────────────────
export function GroDashboardScreen() {
  const { go, groDashboard, dbConnected, refreshGroData } = useApp();
  const d = groDashboard;

  return (
    <div className="scroll scroll--dashboard">
      <div className="hl-r" style={{ marginBottom: 14 }}>
        <div className="row gap8 mb8">
          <span style={{ fontSize: 18 }}>⚖️</span>
          <span className="lbl" style={{ color: 'var(--red)' }}>CICLO GRO — NR-01</span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--t1)', margin: 0 }}>
          Gestão de Riscos Ocupacionais: Identificação → Avaliação → Controle → Monitoramento → Revisão.
          Maturidade do ciclo: <strong>{d?.maturityPct ?? 0}%</strong>
        </p>
      </div>

      <div className="sg" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
        <div className="sc" onClick={() => go('gro-workflow')}>
          <div className="sv" style={{ color: 'var(--cyan)' }}>{d?.totalRisks ?? 0}</div>
          <div className="sl">Riscos no ciclo</div>
        </div>
        <div className="sc" onClick={() => go('gro-plano')}>
          <div className="sv" style={{ color: 'var(--orange)' }}>{d?.actionPlan.open ?? 0}</div>
          <div className="sl">Ações abertas</div>
        </div>
        <div className="sc" onClick={() => go('gro-indicadores')}>
          <div className="sv" style={{ color: 'var(--green)' }}>{d?.indicators.total ?? 0}</div>
          <div className="sl">Indicadores</div>
        </div>
        <div className="sc" onClick={() => go('inventario-dashboard')}>
          <div className="sv" style={{ color: 'var(--red)' }}>{d?.overdueReviews ?? 0}</div>
          <div className="sl">Revisões vencidas</div>
        </div>
      </div>

      <div className="sec mt12"><span className="stl">Pipeline GRO</span></div>
      <div className="card">
        {(d?.byStage ?? GRO_STAGES.map((s) => ({ stage: s, label: GRO_STAGE_LABELS[s], count: 0 }))).map((s) => (
          <div key={s.stage} className="bar-row" style={{ marginBottom: 8 }}>
            <span style={{ color: STAGE_COLORS[s.stage as GroStage] }}>{s.label}</span>
            <span className="t2">{s.count}</span>
          </div>
        ))}
      </div>

      <div className="sec mt12"><span className="stl">Plano de ação</span></div>
      <div className="card">
        <div className="bar-row"><span>Total</span><span>{d?.actionPlan.total ?? 0}</span></div>
        <div className="bar-row"><span>Concluídas</span><span style={{ color: 'var(--green)' }}>{d?.actionPlan.completed ?? 0}</span></div>
        <div className="bar-row"><span>Atrasadas</span><span style={{ color: 'var(--red)' }}>{d?.actionPlan.overdue ?? 0}</span></div>
      </div>

      <div className="row gap8 mt12 flex-wrap">
        <button type="button" className="btn bp" style={{ flex: 1 }} onClick={() => go('gro-workflow')}>Workflow</button>
        <button type="button" className="btn bs" style={{ flex: 1 }} onClick={() => void refreshGroData()} disabled={!dbConnected}>Atualizar</button>
        <button type="button" className="btn bs" style={{ flex: 1 }} onClick={() => go('gro-relatorios')}>Relatórios</button>
      </div>
    </div>
  );
}

// ─── Workflow ────────────────────────────────────────────────────
export function GroWorkflowScreen() {
  const { groWorkflow, advanceGroWorkflow, completeGroReview, dbConnected, go } = useApp();
  const [expanded, setExpanded] = useState<GroStage>('IDENTIFICACAO');

  const stageData = groWorkflow?.stages ?? GRO_STAGES.map((s) => ({ stage: s, label: GRO_STAGE_LABELS[s], items: [] }));

  return (
    <div className="scroll">
      <div className="sec"><span className="stl">Workflow GRO por etapa</span></div>
      <p style={{ fontSize: 11, color: 'var(--t2)', margin: '0 0 12px' }}>
        Avance riscos conforme critérios NR-01. Dados persistidos no PostgreSQL.
      </p>

      {!dbConnected && (
        <div className="card"><p style={{ fontSize: 12, color: 'var(--amber)', margin: 0 }}>API offline</p></div>
      )}

      {stageData.map((col) => (
        <div key={col.stage} className="card" style={{ marginBottom: 10 }}>
          <button
            type="button"
            className="row"
            style={{ width: '100%', justifyContent: 'space-between', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}
            onClick={() => setExpanded(expanded === col.stage ? col.stage : col.stage)}
          >
            <strong style={{ color: STAGE_COLORS[col.stage] }}>{col.label}</strong>
            <span className="t2">{col.items.length}</span>
          </button>

          {(expanded === col.stage || col.items.length <= 3) && col.items.map((item) => (
            <div key={item.id} style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{item.hazard}</div>
              <div style={{ fontSize: 11, color: 'var(--t2)', marginBottom: 8 }}>
                Score {item.riskScore} · {item.sectorName ?? '—'} · Rev. {item.reviewDate ?? '—'}
              </div>
              <div className="row gap8">
                {col.stage !== 'REVISAO' && (
                  <button type="button" className="btn bp" style={{ flex: 1, marginBottom: 0, fontSize: 11 }} onClick={() => void advanceGroWorkflow(item.id)}>
                    Avançar →
                  </button>
                )}
                {col.stage === 'REVISAO' && (
                  <button type="button" className="btn bp" style={{ flex: 1, marginBottom: 0, fontSize: 11 }} onClick={() => void completeGroReview(item.id)}>
                    Concluir revisão
                  </button>
                )}
                <button type="button" className="btn bs" style={{ flex: 1, marginBottom: 0, fontSize: 11 }} onClick={() => go('inventario-lista')}>
                  Inventário
                </button>
              </div>
            </div>
          ))}

          {col.items.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--t2)', margin: '8px 0 0' }}>Nenhum risco nesta etapa.</p>
          )}
        </div>
      ))}

      <button type="button" className="btn bs mt8" onClick={() => go('gro-dashboard')}>Voltar</button>
    </div>
  );
}

// ─── Plano de ação ─────────────────────────────────────────────
export function GroActionPlanScreen() {
  const {
    groActionPlans,
    groActionPlanDraft,
    setGroActionPlanDraft,
    saveGroActionPlan,
    deleteGroActionPlan,
    riskInventory,
    dbConnected,
    openGroActionPlanForm,
    go,
  } = useApp();

  return (
    <div className="scroll">
      <div className="sec row" style={{ justifyContent: 'space-between' }}>
        <span className="stl">Plano de Ação GRO</span>
        <button type="button" className="btn bp" style={{ width: 'auto', padding: '6px 12px', fontSize: 11 }} onClick={() => openGroActionPlanForm()}>
          + Nova ação
        </button>
      </div>

      {groActionPlanDraft !== null && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="lbl">{groActionPlanDraft.id ? 'Editar ação' : 'Nova ação'}</div>
          <select className="inp" value={groActionPlanDraft.riskId} onChange={(e) => setGroActionPlanDraft({ ...groActionPlanDraft, riskId: e.target.value })}>
            <option value="">— Risco vinculado —</option>
            {riskInventory.map((r) => (
              <option key={r.id} value={r.id}>{r.hazard}</option>
            ))}
          </select>
          <textarea className="inp mt8" rows={2} value={groActionPlanDraft.description} onChange={(e) => setGroActionPlanDraft({ ...groActionPlanDraft, description: e.target.value })} placeholder="Descrição da ação" />
          <select className="inp mt8" value={groActionPlanDraft.controlType} onChange={(e) => setGroActionPlanDraft({ ...groActionPlanDraft, controlType: e.target.value as typeof groActionPlanDraft.controlType })}>
            {Object.entries(GRO_CONTROL_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <input className="inp mt8" value={groActionPlanDraft.responsible} onChange={(e) => setGroActionPlanDraft({ ...groActionPlanDraft, responsible: e.target.value })} placeholder="Responsável" />
          <input className="inp mt8" type="date" value={groActionPlanDraft.dueDate} onChange={(e) => setGroActionPlanDraft({ ...groActionPlanDraft, dueDate: e.target.value })} />
          <select className="inp mt8" value={groActionPlanDraft.status} onChange={(e) => setGroActionPlanDraft({ ...groActionPlanDraft, status: e.target.value as typeof groActionPlanDraft.status })}>
            <option value="aberto">Aberto</option>
            <option value="andamento">Em andamento</option>
            <option value="concluido">Concluído</option>
            <option value="atrasado">Atrasado</option>
            <option value="cancelado">Cancelado</option>
          </select>
          <div className="row gap8 mt8">
            <button type="button" className="btn bp" style={{ flex: 1 }} onClick={() => void saveGroActionPlan()} disabled={!dbConnected}>Salvar</button>
            <button type="button" className="btn bs" style={{ flex: 1 }} onClick={() => setGroActionPlanDraft(null)}>Cancelar</button>
          </div>
        </div>
      )}

      {groActionPlans.length === 0 ? (
        <div className="card"><p style={{ fontSize: 12, color: 'var(--t2)', margin: 0 }}>Nenhuma ação cadastrada.</p></div>
      ) : (
        groActionPlans.map((a) => (
          <div key={a.id} className="card" style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--t2)' }}>{a.riskHazard ?? 'Risco'}</div>
            <div style={{ fontWeight: 700, margin: '4px 0' }}>{a.description}</div>
            <div style={{ fontSize: 12 }}>{GRO_CONTROL_LABELS[a.controlType]} · {a.responsible || '—'} · Prazo {a.dueDate ?? '—'}</div>
            <div style={{ fontSize: 11, marginTop: 4, color: a.status === 'concluido' ? 'var(--green)' : a.status === 'atrasado' ? 'var(--red)' : 'var(--amber)' }}>
              {a.status.toUpperCase()}
            </div>
            <div className="row gap8 mt8">
              <button type="button" className="btn bs" style={{ flex: 1, marginBottom: 0 }} onClick={() => openGroActionPlanForm(a)}>Editar</button>
              <button type="button" className="btn br" style={{ flex: 1, marginBottom: 0 }} onClick={() => deleteGroActionPlan(a.id)}>Excluir</button>
            </div>
          </div>
        ))
      )}

      <button type="button" className="btn bs mt8" onClick={() => go('gro-dashboard')}>Voltar</button>
    </div>
  );
}

// ─── Indicadores ───────────────────────────────────────────────
export function GroIndicatorsScreen() {
  const {
    groIndicators,
    groIndicatorDraft,
    setGroIndicatorDraft,
    saveGroIndicator,
    deleteGroIndicator,
    riskInventory,
    dbConnected,
    openGroIndicatorForm,
    go,
  } = useApp();

  return (
    <div className="scroll">
      <div className="sec row" style={{ justifyContent: 'space-between' }}>
        <span className="stl">Indicadores GRO</span>
        <button type="button" className="btn bp" style={{ width: 'auto', padding: '6px 12px', fontSize: 11 }} onClick={() => openGroIndicatorForm()}>
          + Indicador
        </button>
      </div>

      {groIndicatorDraft !== null && (
        <div className="card" style={{ marginBottom: 12 }}>
          <input className="inp" value={groIndicatorDraft.name} onChange={(e) => setGroIndicatorDraft({ ...groIndicatorDraft, name: e.target.value })} placeholder="Nome do indicador" />
          <select className="inp mt8" value={groIndicatorDraft.riskId} onChange={(e) => setGroIndicatorDraft({ ...groIndicatorDraft, riskId: e.target.value })}>
            <option value="">— Risco (opcional) —</option>
            {riskInventory.map((r) => (
              <option key={r.id} value={r.id}>{r.hazard}</option>
            ))}
          </select>
          <select className="inp mt8" value={groIndicatorDraft.type} onChange={(e) => setGroIndicatorDraft({ ...groIndicatorDraft, type: e.target.value as 'LEADING' | 'LAGGING' })}>
            <option value="LEADING">Leading (proativo)</option>
            <option value="LAGGING">Lagging (resultado)</option>
          </select>
          <div className="grid-2 gap8 mt8">
            <input className="inp" value={groIndicatorDraft.target} onChange={(e) => setGroIndicatorDraft({ ...groIndicatorDraft, target: e.target.value })} placeholder="Meta" />
            <input className="inp" value={groIndicatorDraft.currentValue} onChange={(e) => setGroIndicatorDraft({ ...groIndicatorDraft, currentValue: e.target.value })} placeholder="Valor atual" />
          </div>
          <input className="inp mt8" value={groIndicatorDraft.unit} onChange={(e) => setGroIndicatorDraft({ ...groIndicatorDraft, unit: e.target.value })} placeholder="Unidade (%, dias, ocorrências…)" />
          <div className="grid-2 gap8 mt8">
            <input className="inp" type="date" value={groIndicatorDraft.lastMeasurement} onChange={(e) => setGroIndicatorDraft({ ...groIndicatorDraft, lastMeasurement: e.target.value })} />
            <input className="inp" type="date" value={groIndicatorDraft.nextMeasurement} onChange={(e) => setGroIndicatorDraft({ ...groIndicatorDraft, nextMeasurement: e.target.value })} />
          </div>
          <div className="row gap8 mt8">
            <button type="button" className="btn bp" style={{ flex: 1 }} onClick={() => void saveGroIndicator()} disabled={!dbConnected}>Salvar</button>
            <button type="button" className="btn bs" style={{ flex: 1 }} onClick={() => setGroIndicatorDraft(null)}>Cancelar</button>
          </div>
        </div>
      )}

      {groIndicators.length === 0 ? (
        <div className="card"><p style={{ fontSize: 12, color: 'var(--t2)', margin: 0 }}>Nenhum indicador cadastrado.</p></div>
      ) : (
        groIndicators.map((i) => (
          <div key={i.id} className="card" style={{ marginBottom: 10 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <strong>{i.name}</strong>
              {i.onTarget != null && (
                <span style={{ fontSize: 10, color: i.onTarget ? 'var(--green)' : 'var(--red)' }}>
                  {i.onTarget ? 'NO META' : 'FORA DA META'}
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--t2)' }}>
              {i.type} · Meta {i.target ?? '—'} {i.unit} · Atual {i.currentValue ?? '—'}
            </div>
            <div className="row gap8 mt8">
              <button type="button" className="btn bs" style={{ flex: 1, marginBottom: 0 }} onClick={() => openGroIndicatorForm(i)}>Editar</button>
              <button type="button" className="btn br" style={{ flex: 1, marginBottom: 0 }} onClick={() => deleteGroIndicator(i.id)}>Excluir</button>
            </div>
          </div>
        ))
      )}

      <button type="button" className="btn bs mt8" onClick={() => go('gro-dashboard')}>Voltar</button>
    </div>
  );
}

// ─── Histórico ─────────────────────────────────────────────────
export function GroHistoryScreen() {
  const { groHistory, go, refreshGroData, dbConnected } = useApp();

  return (
    <div className="scroll">
      <div className="sec row" style={{ justifyContent: 'space-between' }}>
        <span className="stl">Histórico GRO (auditoria)</span>
        <button type="button" className="btn bs" style={{ width: 'auto', padding: '6px 12px', fontSize: 11 }} onClick={() => void refreshGroData()} disabled={!dbConnected}>
          Atualizar
        </button>
      </div>

      {groHistory.length === 0 ? (
        <div className="card"><p style={{ fontSize: 12, color: 'var(--t2)', margin: 0 }}>Nenhum evento registrado.</p></div>
      ) : (
        groHistory.map((h) => (
          <div key={h.id} className="card list-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4, marginBottom: 8 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <strong style={{ fontSize: 13 }}>{groActionLabel(h.action)}</strong>
              <span style={{ fontSize: 10, color: 'var(--t2)' }}>{fmtDate(h.createdAt)}</span>
            </div>
            {h.riskHazard && <div style={{ fontSize: 12 }}>{h.riskHazard}</div>}
            <div style={{ fontSize: 11, color: 'var(--t2)' }}>
              {h.userName ?? 'Sistema'}{h.stage ? ` · ${GRO_STAGE_LABELS[h.stage]}` : ''}
            </div>
          </div>
        ))
      )}

      <button type="button" className="btn bs mt8" onClick={() => go('gro-dashboard')}>Voltar</button>
    </div>
  );
}

// ─── Relatórios ────────────────────────────────────────────────
export function GroReportsScreen() {
  const { groReports, generateGroReport, selectedCompany, dbConnected, go, showToast } = useApp();
  const [viewId, setViewId] = useState<string | null>(null);
  const [viewContent, setViewContent] = useState<Record<string, unknown> | null>(null);

  const types: Array<{ type: GroReportType; label: string }> = [
    { type: 'DOSSIE_GRO', label: 'Dossiê GRO completo' },
    { type: 'CICLO_COMPLETO', label: 'Ciclo GRO' },
    { type: 'INVENTARIO', label: 'Inventário' },
    { type: 'PLANO_ACAO', label: 'Plano de ação' },
    { type: 'INDICADORES', label: 'Indicadores' },
  ];

  const handleView = async (id: string) => {
    try {
      const { apiGetGroReport } = await import('../api/client');
      const report = await apiGetGroReport(selectedCompany?.id ?? '', id);
      setViewId(id);
      setViewContent(report.content);
    } catch {
      showToast('Erro ao carregar relatório', 'warn');
    }
  };

  return (
    <div className="scroll">
      <div className="sec"><span className="stl">Relatórios GRO</span></div>
      <p style={{ fontSize: 11, color: 'var(--t2)', margin: '0 0 12px' }}>
        Relatórios gerados e persistidos no PostgreSQL para fiscalização e auditoria.
      </p>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="lbl">Gerar novo relatório</div>
        {types.map((t) => (
          <button
            key={t.type}
            type="button"
            className="btn bs"
            style={{ marginBottom: 6 }}
            disabled={!dbConnected}
            onClick={() => void generateGroReport(t.type)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="sec"><span className="stl">Histórico de relatórios</span></div>
      {groReports.length === 0 ? (
        <div className="card"><p style={{ fontSize: 12, color: 'var(--t2)', margin: 0 }}>Nenhum relatório gerado.</p></div>
      ) : (
        groReports.map((r) => (
          <div key={r.id} className="card list-row" style={{ marginBottom: 8, cursor: 'pointer' }} onClick={() => void handleView(r.id)}>
            <div>
              <strong style={{ fontSize: 13 }}>{r.title}</strong>
              <div style={{ fontSize: 11, color: 'var(--t2)' }}>{r.type} · {fmtDate(r.createdAt)} · {r.generatedBy}</div>
            </div>
          </div>
        ))
      )}

      {viewContent && (
        <div className="card mt12">
          <div className="lbl">Conteúdo do relatório #{viewId}</div>
          <pre style={{ fontSize: 10, overflow: 'auto', maxHeight: 320, whiteSpace: 'pre-wrap', color: 'var(--t1)' }}>
            {JSON.stringify(viewContent, null, 2)}
          </pre>
          <button type="button" className="btn bs mt8" onClick={() => { setViewId(null); setViewContent(null); }}>Fechar</button>
        </div>
      )}

      <button type="button" className="btn bs mt8" onClick={() => go('gro-dashboard')}>Voltar</button>
    </div>
  );
}
