/**
 * Inventário de Riscos — NR-01 §1.5.7.3.2 / GRO
 */
import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import type { RiskLevel } from '../types';
import {
  EXPOSURE_FREQUENCY_OPTIONS,
  RISK_INVENTORY_TYPES,
  computeClientRiskLevel,
  riskTypeLabel,
  type RiskInventoryEvidence,
  type RiskInventoryItem,
  type RiskInventoryType,
} from '../types/riskInventory';

function nivelColor(n: RiskLevel) {
  return n === 'critico' ? 'var(--red)' : n === 'alto' ? 'var(--orange)' : n === 'medio' ? 'var(--amber)' : 'var(--green)';
}
function nivelBg(n: RiskLevel) {
  return n === 'critico' ? 'var(--r10)' : n === 'alto' ? 'var(--o10)' : n === 'medio' ? 'var(--a10)' : 'var(--g10)';
}
function nivelLabel(n: RiskLevel) {
  return n === 'critico' ? 'CRÍTICO' : n === 'alto' ? 'ALTO' : n === 'medio' ? 'MÉDIO' : 'BAIXO';
}
function matrizCor(score: number): { bg: string; text: string } {
  if (score >= 20) return { bg: 'var(--red)', text: '#fff' };
  if (score >= 12) return { bg: '#FCA5A5', text: '#501313' };
  if (score >= 6) return { bg: 'var(--a10)', text: 'var(--amber)' };
  return { bg: 'var(--g10)', text: 'var(--green)' };
}

function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        padding: '2px 8px',
        borderRadius: 4,
        color: nivelColor(level),
        background: nivelBg(level),
      }}
    >
      {nivelLabel(level)}
    </span>
  );
}

function LinkBadges({ item }: { item: RiskInventoryItem }) {
  const modules = item.links?.map((l) => l.module) ?? [];
  const tags = ['ANALISE', 'AET', 'GRO', 'PGR'].filter((m) => modules.includes(m as never) || (m === 'ANALISE' && item.analysisId) || (m === 'AET' && item.aetProcessId));
  if (!tags.length) return null;
  return (
    <div className="row gap4" style={{ flexWrap: 'wrap', marginTop: 4 }}>
      {tags.map((t) => (
        <span key={t} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'var(--c10)', color: 'var(--cyan)' }}>
          {t}
        </span>
      ))}
    </div>
  );
}

function EmptyState({ message, action }: { message: string; action?: () => void }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: 24 }}>
      <p style={{ fontSize: 13, color: 'var(--t2)', margin: '0 0 12px' }}>{message}</p>
      {action && (
        <button type="button" className="btn bp" onClick={action}>
          Cadastrar risco
        </button>
      )}
    </div>
  );
}

export function RiskInventoryDashboardScreen() {
  const { go, riskInventorySummary, riskInventory, dbConnected, openRiskForm, refreshRiskInventory } = useApp();
  const summary = riskInventorySummary;
  const loading = dbConnected && !summary && riskInventory.length === 0;

  const topRisks = useMemo(
    () => [...riskInventory].sort((a, b) => b.riskScore - a.riskScore).slice(0, 5),
    [riskInventory],
  );

  return (
    <div className="scroll scroll--dashboard">
      <div className="hl-r" style={{ marginBottom: 14 }}>
        <div className="row gap8 mb8">
          <span style={{ fontSize: 18 }}>📋</span>
          <span className="lbl" style={{ color: 'var(--red)' }}>INVENTÁRIO DE RISCOS — NR-01 §1.5.7.3.2</span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--t1)', lineHeight: 1.5, margin: 0 }}>
          Exposição, GHE, evidências e vínculos obrigatórios com Análise, AET, GRO e PGR.
        </p>
      </div>

      {!dbConnected && (
        <div className="card" style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 12, color: 'var(--amber)', margin: 0 }}>Conecte-se à API para carregar o inventário real do tenant.</p>
        </div>
      )}

      <div className="sg" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
        <div className="sc" onClick={() => go('inventario-lista')}>
          <div className="sv" style={{ color: 'var(--cyan)' }}>{summary?.total ?? riskInventory.length}</div>
          <div className="sl">Riscos mapeados</div>
        </div>
        <div className="sc" onClick={() => go('inventario-lista')}>
          <div className="sv" style={{ color: 'var(--green)' }}>{summary?.nr015732Complete ?? 0}</div>
          <div className="sl">NR-01 §1.5.7.3.2 completos</div>
        </div>
        <div className="sc" onClick={() => go('inventario-lista')}>
          <div className="sv" style={{ color: 'var(--red)' }}>
            {(summary?.byLevel.critico ?? 0) + (summary?.byLevel.alto ?? 0)}
          </div>
          <div className="sl">Alto / crítico</div>
        </div>
        <div className="sc" onClick={() => go('inventario-matriz')}>
          <div className="sv" style={{ color: 'var(--amber)' }}>{summary?.overdueReviews ?? 0}</div>
          <div className="sl">Revisões vencidas</div>
        </div>
      </div>

      <div className="sec mt12 row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="stl">Prioritários</span>
        <button type="button" className="btn bs" style={{ width: 'auto', padding: '6px 12px', fontSize: 11 }} onClick={() => void refreshRiskInventory()}>
          Atualizar
        </button>
      </div>

      {loading ? (
        <div className="card"><p style={{ fontSize: 12, color: 'var(--t2)', margin: 0 }}>Carregando inventário…</p></div>
      ) : topRisks.length === 0 ? (
        <EmptyState message="Nenhum risco cadastrado. Inicie o inventário conforme NR-01 §1.5.7." action={() => openRiskForm()} />
      ) : (
        topRisks.map((r) => (
          <div key={r.id} className="card list-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6, cursor: 'pointer' }} onClick={() => openRiskForm(r)}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <strong style={{ fontSize: 13 }}>{r.hazard}</strong>
              <RiskBadge level={r.riskLevel} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--t2)' }}>
              {riskTypeLabel(r.type)} · GHE: {r.homogeneousExposureGroup || '—'} · {r.exposedWorkersCount ?? 1} trab.
            </div>
            <LinkBadges item={r} />
          </div>
        ))
      )}

      <div className="row gap8 mt12" style={{ flexWrap: 'wrap' }}>
        <button type="button" className="btn bp" style={{ flex: 1 }} onClick={() => openRiskForm()}>+ Novo risco</button>
        <button type="button" className="btn bs" style={{ flex: 1 }} onClick={() => go('inventario-lista')}>Ver todos</button>
        <button type="button" className="btn bs" style={{ flex: 1 }} onClick={() => go('gro-dashboard')}>Ciclo GRO</button>
      </div>
    </div>
  );
}

export function RiskInventoryListScreen() {
  const { go, riskInventory, openRiskForm, deleteRiskInventory, dbConnected } = useApp();
  const [filterType, setFilterType] = useState<RiskInventoryType | ''>('');
  const [filterLevel, setFilterLevel] = useState<RiskLevel | ''>('');

  const filtered = useMemo(() => {
    return riskInventory.filter((r) => {
      if (filterType && r.type !== filterType) return false;
      if (filterLevel && r.riskLevel !== filterLevel) return false;
      return true;
    });
  }, [riskInventory, filterType, filterLevel]);

  return (
    <div className="scroll">
      <div className="sec row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="stl">Inventário de Riscos</span>
        <button type="button" className="btn bp" style={{ width: 'auto', padding: '6px 14px', fontSize: 11 }} onClick={() => openRiskForm()}>+ Novo</button>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="grid-2 gap8">
          <select className="inp" value={filterType} onChange={(e) => setFilterType(e.target.value as RiskInventoryType | '')}>
            <option value="">Todos os tipos</option>
            {RISK_INVENTORY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <select className="inp" value={filterLevel} onChange={(e) => setFilterLevel(e.target.value as RiskLevel | '')}>
            <option value="">Todos os níveis</option>
            <option value="critico">Crítico</option>
            <option value="alto">Alto</option>
            <option value="medio">Médio</option>
            <option value="baixo">Baixo</option>
          </select>
        </div>
      </div>

      {!dbConnected ? (
        <EmptyState message="API offline — inventário indisponível." />
      ) : filtered.length === 0 ? (
        <EmptyState message="Nenhum risco encontrado com os filtros selecionados." action={() => openRiskForm()} />
      ) : (
        filtered.map((r) => (
          <div key={r.id} className="card" style={{ marginBottom: 10 }}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--t2)' }}>
                {RISK_INVENTORY_TYPES.find((t) => t.value === r.type)?.icon} {riskTypeLabel(r.type)}
              </span>
              <RiskBadge level={r.riskLevel} />
            </div>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{r.hazard}</div>
            <div style={{ fontSize: 12, color: 'var(--t1)', marginBottom: 4 }}>
              <strong>Fonte:</strong> {r.generatingSource}
            </div>
            <div style={{ fontSize: 11, color: 'var(--t2)', marginBottom: 4 }}>
              Exposição: {r.exposureDuration || '—'} · {r.exposureFrequency || '—'} · {r.exposureIntensity || '—'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--t2)', marginBottom: 8 }}>
              GHE: {r.homogeneousExposureGroup || '—'} · {r.exposedWorkersCount} trab. · Score {r.riskScore}
            </div>
            <LinkBadges item={r} />
            <div className="row gap8 mt8">
              <button type="button" className="btn bs" style={{ flex: 1, marginBottom: 0 }} onClick={() => openRiskForm(r)}>Editar</button>
              <button type="button" className="btn br" style={{ flex: 1, marginBottom: 0 }} onClick={() => void deleteRiskInventory(r.id)}>Excluir</button>
            </div>
          </div>
        ))
      )}

      <button type="button" className="btn bs mt8" onClick={() => go('inventario-dashboard')}>Voltar ao dashboard</button>
    </div>
  );
}

export function RiskInventoryFormScreen() {
  const {
    go,
    riskInventoryDraft,
    setRiskInventoryDraft,
    saveRiskInventory,
    sectors,
    collaborators,
    orgTree,
    analyses,
    aetProcesses,
    dbConnected,
    showToast,
  } = useApp();

  const [evDesc, setEvDesc] = useState('');
  const [evRef, setEvRef] = useState('');

  const workPostOptions = useMemo(() => {
    const list: Array<{ id: string; label: string }> = [];
    for (const u of orgTree?.units ?? []) {
      for (const s of u.sectors ?? []) {
        for (const f of s.functions ?? []) {
          for (const a of f.activities ?? []) {
            for (const p of a.workPosts ?? []) {
              list.push({ id: p.id, label: `${s.name} › ${f.name} › ${a.name} › ${p.name}` });
            }
          }
        }
      }
    }
    return list;
  }, [orgTree]);

  const score = riskInventoryDraft.probability * riskInventoryDraft.severity;
  const level = computeClientRiskLevel(riskInventoryDraft.probability, riskInventoryDraft.severity);
  const isEdit = !!riskInventoryDraft.id;
  const isErgo = riskInventoryDraft.type === 'ERGONOMICO';

  const handleSave = () => {
    const d = riskInventoryDraft;
    if (!d.generatingSource.trim() || !d.hazard.trim() || !d.consequence.trim()) {
      showToast('Preencha fonte, perigo e consequência', 'warn');
      return;
    }
    if (!d.exposureDuration.trim() || !d.exposureFrequency.trim() || !d.exposureIntensity.trim()) {
      showToast('Preencha duração, frequência e intensidade da exposição (NR-01 §1.5.7.3.2 g)', 'warn');
      return;
    }
    if (!d.homogeneousExposureGroup.trim() || d.exposedWorkersCount < 1) {
      showToast('Informe GHE e número de trabalhadores expostos', 'warn');
      return;
    }
    if (!d.evidences.length) {
      showToast('Registre ao menos uma evidência', 'warn');
      return;
    }
    if (isErgo && !d.analysisId && !d.aetProcessId) {
      showToast('Risco ergonômico exige vínculo com Análise ou AET', 'warn');
      return;
    }
    if (dbConnected && !d.workPostId && !d.sectorName) {
      showToast('Selecione posto de trabalho ou setor', 'warn');
      return;
    }
    void saveRiskInventory();
  };

  const set = <K extends keyof typeof riskInventoryDraft>(key: K, value: (typeof riskInventoryDraft)[K]) => {
    setRiskInventoryDraft({ [key]: value });
  };

  const addEvidence = () => {
    if (!evDesc.trim() && !evRef.trim()) {
      showToast('Descreva a evidência ou informe referência', 'warn');
      return;
    }
    const next: RiskInventoryEvidence = {
      type: 'DOCUMENTO',
      description: evDesc.trim(),
      reference: evRef.trim(),
      createdAt: new Date().toISOString(),
    };
    set('evidences', [...riskInventoryDraft.evidences, next]);
    setEvDesc('');
    setEvRef('');
  };

  const removeEvidence = (idx: number) => {
    set(
      'evidences',
      riskInventoryDraft.evidences.filter((_, i) => i !== idx),
    );
  };

  return (
    <div className="scroll">
      <div className="sec">
        <span className="stl">{isEdit ? 'Editar risco' : 'Novo risco'} — NR-01 §1.5.7.3.2</span>
      </div>

      {!dbConnected && (
        <div className="card" style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 12, color: 'var(--amber)', margin: 0 }}>Salvar requer conexão com a API.</p>
        </div>
      )}

      <div className="card" style={{ marginBottom: 12, background: nivelBg(level) }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12 }}>Nível calculado (Prob × Sev = {score})</span>
          <RiskBadge level={level} />
        </div>
      </div>

      <div className="card">
        <label className="lbl">Tipo de risco (NR-01)</label>
        <select className="inp" value={riskInventoryDraft.type} onChange={(e) => set('type', e.target.value as RiskInventoryType)}>
          {RISK_INVENTORY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
          ))}
        </select>

        <label className="lbl mt8">Setor</label>
        <select className="inp" value={riskInventoryDraft.sectorName} onChange={(e) => set('sectorName', e.target.value)}>
          <option value="">— Selecione —</option>
          {sectors.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <label className="lbl mt8">Posto de trabalho (NR-01) *</label>
        <select className="inp" value={riskInventoryDraft.workPostId} onChange={(e) => set('workPostId', e.target.value)}>
          <option value="">— Selecione o posto —</option>
          {workPostOptions.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>

        <label className="lbl mt8">Colaborador exposto (opcional)</label>
        <select className="inp" value={riskInventoryDraft.collaboratorId} onChange={(e) => set('collaboratorId', e.target.value)}>
          <option value="">— Nenhum —</option>
          {collaborators.map((c) => (
            <option key={c.id} value={c.id}>{c.name} — {c.setor}</option>
          ))}
        </select>

        <label className="lbl mt8">Fonte geradora *</label>
        <textarea className="inp" rows={2} value={riskInventoryDraft.generatingSource} onChange={(e) => set('generatingSource', e.target.value)} placeholder="Máquina, layout, metas, equipamento…" />

        <label className="lbl mt8">Perigo *</label>
        <textarea className="inp" rows={2} value={riskInventoryDraft.hazard} onChange={(e) => set('hazard', e.target.value)} />

        <label className="lbl mt8">Consequência *</label>
        <textarea className="inp" rows={2} value={riskInventoryDraft.consequence} onChange={(e) => set('consequence', e.target.value)} />

        <div className="grid-2 gap8 mt8">
          <div>
            <label className="lbl">Probabilidade (1–5)</label>
            <input className="inp" type="number" min={1} max={5} value={riskInventoryDraft.probability} onChange={(e) => set('probability', Math.min(5, Math.max(1, Number(e.target.value) || 1)))} />
          </div>
          <div>
            <label className="lbl">Severidade (1–5)</label>
            <input className="inp" type="number" min={1} max={5} value={riskInventoryDraft.severity} onChange={(e) => set('severity', Math.min(5, Math.max(1, Number(e.target.value) || 1)))} />
          </div>
        </div>
      </div>

      <div className="sec mt12"><span className="stl">Caracterização da exposição (§1.5.7.3.2 g)</span></div>
      <div className="card">
        <label className="lbl">Duração da exposição *</label>
        <input className="inp" value={riskInventoryDraft.exposureDuration} onChange={(e) => set('exposureDuration', e.target.value)} placeholder="Ex.: 8 h/dia, turno integral" />

        <label className="lbl mt8">Frequência da exposição *</label>
        <select className="inp" value={riskInventoryDraft.exposureFrequency} onChange={(e) => set('exposureFrequency', e.target.value)}>
          {EXPOSURE_FREQUENCY_OPTIONS.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>

        <label className="lbl mt8">Intensidade da exposição *</label>
        <input className="inp" value={riskInventoryDraft.exposureIntensity} onChange={(e) => set('exposureIntensity', e.target.value)} placeholder="Ex.: 87 dB(A), RULA 6, carga 15 kg" />

        <div className="grid-2 gap8 mt8">
          <div>
            <label className="lbl">Nº trabalhadores expostos *</label>
            <input className="inp" type="number" min={1} value={riskInventoryDraft.exposedWorkersCount} onChange={(e) => set('exposedWorkersCount', Math.max(1, Number(e.target.value) || 1))} />
          </div>
          <div>
            <label className="lbl">Grupo homogêneo (GHE) *</label>
            <input className="inp" value={riskInventoryDraft.homogeneousExposureGroup} onChange={(e) => set('homogeneousExposureGroup', e.target.value)} placeholder="Ex.: Operadores linha 1" />
          </div>
        </div>
      </div>

      <div className="sec mt12"><span className="stl">Medidas e evidências</span></div>
      <div className="card">
        <label className="lbl">Medidas existentes (implementadas)</label>
        <textarea className="inp" rows={2} value={riskInventoryDraft.existingMeasures} onChange={(e) => set('existingMeasures', e.target.value)} placeholder="Controles já aplicados no posto…" />

        <label className="lbl mt8">Medidas de controle (plano / propostas)</label>
        <textarea className="inp" rows={2} value={riskInventoryDraft.controlMeasures} onChange={(e) => set('controlMeasures', e.target.value)} />

        <label className="lbl mt8">Evidências *</label>
        {riskInventoryDraft.evidences.map((ev, i) => (
          <div key={i} className="row gap8 mb4" style={{ alignItems: 'center' }}>
            <span style={{ fontSize: 11, flex: 1 }}>{ev.description || ev.reference}</span>
            <button type="button" className="btn br" style={{ width: 'auto', padding: '4px 8px', margin: 0 }} onClick={() => removeEvidence(i)}>×</button>
          </div>
        ))}
        <input className="inp mt4" value={evDesc} onChange={(e) => setEvDesc(e.target.value)} placeholder="Descrição da evidência" />
        <input className="inp mt4" value={evRef} onChange={(e) => setEvRef(e.target.value)} placeholder="Referência (laudo, foto, AET nº…)" />
        <button type="button" className="btn bs mt4" onClick={addEvidence}>+ Adicionar evidência</button>
      </div>

      <div className="sec mt12"><span className="stl">Vínculos obrigatórios (Inventário ↔ Análise ↔ AET ↔ GRO ↔ PGR)</span></div>
      <div className="card">
        <p style={{ fontSize: 11, color: 'var(--t2)', margin: '0 0 8px' }}>
          GRO e PGR são sincronizados automaticamente ao salvar. {isErgo ? 'Riscos ergonômicos exigem Análise ou AET.' : ''}
        </p>

        <label className="lbl">Análise ergonômica {isErgo ? '(obrigatório se sem AET)' : ''}</label>
        <select className="inp" value={riskInventoryDraft.analysisId} onChange={(e) => set('analysisId', e.target.value)}>
          <option value="">— Nenhuma —</option>
          {analyses.map((a) => (
            <option key={a.id} value={a.id}>{a.activity ?? a.collaboratorName} — {a.date}</option>
          ))}
        </select>

        <label className="lbl mt8">Processo AET {isErgo ? '(obrigatório se sem Análise)' : ''}</label>
        <select className="inp" value={riskInventoryDraft.aetProcessId} onChange={(e) => set('aetProcessId', e.target.value)}>
          <option value="">— Nenhum —</option>
          {aetProcesses.map((p) => (
            <option key={p.id} value={p.id}>{p.title} — {p.status}</option>
          ))}
        </select>

        <label className="lbl mt8">Responsável</label>
        <input className="inp" value={riskInventoryDraft.responsible} onChange={(e) => set('responsible', e.target.value)} />

        <div className="grid-2 gap8 mt8">
          <div>
            <label className="lbl">Data de revisão</label>
            <input className="inp" type="date" value={riskInventoryDraft.reviewDate} onChange={(e) => set('reviewDate', e.target.value)} />
          </div>
          <div>
            <label className="lbl">Status</label>
            <select className="inp" value={riskInventoryDraft.status} onChange={(e) => set('status', e.target.value as typeof riskInventoryDraft.status)}>
              <option value="ativo">Ativo</option>
              <option value="revisao">Em revisão</option>
              <option value="arquivado">Arquivado</option>
            </select>
          </div>
        </div>
      </div>

      <div className="row gap8 mt12">
        <button type="button" className="btn bp" style={{ flex: 1 }} onClick={handleSave} disabled={!dbConnected}>Salvar</button>
        <button type="button" className="btn bs" style={{ flex: 1 }} onClick={() => go('inventario-lista')}>Cancelar</button>
      </div>
    </div>
  );
}

export function RiskInventoryMatrixScreen() {
  const { go, riskInventory } = useApp();
  const [drill, setDrill] = useState<{ sev: number; prob: number } | null>(null);

  const matrixMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of riskInventory) {
      const key = `${r.severity}-${r.probability}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [riskInventory]);

  const drillRisks = drill
    ? riskInventory.filter((r) => r.severity === drill.sev && r.probability === drill.prob)
    : [];

  return (
    <div className="scroll">
      <div className="sec"><span className="stl">Matriz Probabilidade × Severidade</span></div>
      <div className="card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr>
              <th style={{ padding: 4 }}>Sev ↓ / Prob →</th>
              {[1, 2, 3, 4, 5].map((p) => (
                <th key={p} style={{ padding: 4, textAlign: 'center' }}>{p}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[5, 4, 3, 2, 1].map((sev) => (
              <tr key={sev}>
                <td style={{ padding: 4, fontWeight: 700 }}>{sev}</td>
                {[1, 2, 3, 4, 5].map((prob) => {
                  const score = sev * prob;
                  const count = matrixMap.get(`${sev}-${prob}`) ?? 0;
                  const { bg, text } = matrizCor(score);
                  const active = drill?.sev === sev && drill?.prob === prob;
                  return (
                    <td key={prob} style={{ padding: 2 }}>
                      <button
                        type="button"
                        onClick={() => setDrill({ sev, prob })}
                        style={{
                          width: '100%',
                          minWidth: 36,
                          padding: '8px 4px',
                          border: active ? '2px solid var(--cyan)' : '1px solid var(--border)',
                          borderRadius: 6,
                          background: bg,
                          color: text,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {score}
                        {count > 0 && <div style={{ fontSize: 9, opacity: 0.9 }}>({count})</div>}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {drill && (
        <div className="card mt12">
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
            Quadrante Sev {drill.sev} × Prob {drill.prob} — {drillRisks.length} risco(s)
          </div>
          {drillRisks.map((r: RiskInventoryItem) => (
            <div key={r.id} style={{ fontSize: 12, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <strong>{r.hazard}</strong> — GHE: {r.homogeneousExposureGroup || '—'}
            </div>
          ))}
        </div>
      )}

      <button type="button" className="btn bs mt12" onClick={() => go('inventario-dashboard')}>Voltar</button>
    </div>
  );
}
