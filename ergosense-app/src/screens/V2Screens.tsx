import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { buildExecutiveDashboard } from '../services/executiveDashboard';
import { getAuditLogs } from '../services/auditLog';
import { evaluateEnvironmental, type EnvironmentalInput } from '../services/environmental';
import { FUTURE_MODULES } from '../services/futureRoadmap';
import { createEsocialExport, downloadEsocialXml } from '../services/esocialExport';
import { exportV2MethodsPdf } from '../utils/exportV2Pdf';
import type { Analysis } from '../types';
import { VideoErgonomicScreen } from './VideoErgonomicScreen';

function currentAnalysis(analyses: Analysis[], id: string | null): Analysis | undefined {
  return analyses.find((a) => a.id === id);
}

export function V2ExecutiveDashboardScreen() {
  const { analyses, go } = useApp();
  const data = useMemo(() => buildExecutiveDashboard(analyses), [analyses]);

  return (
    <div className="scroll pad">
      <div className="hl">
        <h2 style={{ margin: 0 }}>Dashboard Executivo V2</h2>
        <p className="t2">Indicadores NR-17 · BI corporativo</p>
      </div>
      <div className="grid-2" style={{ gap: 10 }}>
        <div className="card kpi-card">
          <div className="kpi-val">{data.kpis.totalAvaliacoes}</div>
          <div className="kpi-lbl">Total avaliações</div>
        </div>
        <div className="card kpi-card">
          <div className="kpi-val" style={{ color: 'var(--red)' }}>{data.kpis.riscoCritico + data.kpis.riscoAlto}</div>
          <div className="kpi-lbl">Risco alto/crítico</div>
        </div>
        <div className="card kpi-card">
          <div className="kpi-val">{data.avgIere || '—'}</div>
          <div className="kpi-lbl">IERE médio</div>
        </div>
        <div className="card kpi-card">
          <div className="kpi-val">{data.avgIeci || '—'}</div>
          <div className="kpi-lbl">IECI médio</div>
        </div>
      </div>
      <div className="card" style={{ marginTop: 12 }}>
        <div className="card-t">Inteligência corporativa</div>
        <div className="list-row"><span>Tendência de risco</span><span className="t2">{data.intelligence.injuryTrend}</span></div>
        <div className="list-row"><span>Prob. lesão (estimativa)</span><span className="t2">{data.intelligence.avgInjuryProbability}%</span></div>
        <div className="list-row"><span>Ações pendentes AEP</span><span className="t2">{data.intelligence.pendingActions}</span></div>
      </div>
      <div className="card" style={{ marginTop: 12 }}>
        <div className="card-t">Distribuição de risco</div>
        {data.riskDistribution.map((r) => (
          <div key={r.label} className="bar-row">
            <span>{r.label}</span>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${Math.min(100, r.value * 20)}%` }} />
            </div>
            <span>{r.value}</span>
          </div>
        ))}
      </div>
      <div className="card" style={{ marginTop: 12 }}>
        <div className="card-t">Ranking setores</div>
        {data.rankingSetores.slice(0, 5).map((r) => (
          <div key={r.name} className="list-row">
            <span>{r.name}</span>
            <span className="t2">{r.count} · score médio {r.avgScore}</span>
          </div>
        ))}
      </div>
      <div className="card" style={{ marginTop: 12 }}>
        <div className="card-t">Heatmap setor × atividade</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {data.heatmap.slice(0, 12).map((h, i) => (
            <span
              key={i}
              style={{
                fontSize: 10,
                padding: '4px 6px',
                borderRadius: 4,
                background: h.score > 70 ? 'var(--r10)' : h.score > 50 ? 'var(--o10)' : 'var(--g10)',
              }}
            >
              {h.setor.slice(0, 8)} / {h.score}
            </span>
          ))}
        </div>
      </div>
      <button type="button" className="btn bs" style={{ marginTop: 16 }} onClick={() => go('dashboard')}>
        Voltar
      </button>
    </div>
  );
}

export function V2MethodsScreen() {
  const { analyses, currentAnalysisId, selectedCompany, selectedCompanyId, showToast, go } = useApp();
  const a = currentAnalysis(analyses, currentAnalysisId);

  if (!a?.v2Report) {
    return (
      <div className="scroll pad">
        <p>Execute uma nova análise para gerar o pacote V2 completo.</p>
        <button type="button" className="btn bp" onClick={() => go('history')}>
          Ver análises
        </button>
      </div>
    );
  }

  return (
    <div className="scroll pad">
      <h2>Métodos ergonômicos V2</h2>
      <p className="t2">{a.v2Report.methods.length} métodos · {a.v2Report.criteriaVersion}</p>
      {a.v2Report.methods.map((m) => (
        <div key={m.methodId} className="card" style={{ marginBottom: 8 }}>
          <div className="card-t">{m.methodName}</div>
          <div>
            Score: <strong>{m.score}</strong> — {m.classificationLabel}
          </div>
          <div className="t2" style={{ fontSize: 11 }}>{m.normReference}</div>
          {m.recommendation[0] && <div style={{ fontSize: 12, marginTop: 4 }}>{m.recommendation[0]}</div>}
        </div>
      ))}
      {a.v2Report.aiReport && (
        <div className="card">
          <div className="card-t">Agente Ergonomista IA</div>
          <p style={{ fontSize: 12 }}>{a.v2Report.aiReport.diagnostico}</p>
          <p style={{ fontSize: 12 }}>{a.v2Report.aiReport.conclusaoTecnica}</p>
        </div>
      )}
      <button
        type="button"
        className="btn bp"
        onClick={() => {
          exportV2MethodsPdf(a, selectedCompany.name);
          showToast('PDF V2 gerado', 'success');
        }}
      >
        Exportar PDF V2
      </button>
      <button
        type="button"
        className="btn bs"
        style={{ marginTop: 8 }}
        onClick={() => {
          const ex = createEsocialExport('S-2240', {
            tenantId: selectedCompanyId,
            analysisId: a.id,
            setor: a.setor,
            agente: `Risco ${a.risk} — análise ergonômica`,
          });
          downloadEsocialXml(ex);
          showToast('XML eSocial S-2240', 'success');
        }}
      >
        Exportar eSocial S-2240
      </button>
    </div>
  );
}

export function V2VideoAnalysisScreen() {
  return <VideoErgonomicScreen />;
}

export function V2EnvironmentalScreen() {
  const { showToast } = useApp();
  const [env, setEnv] = useState<EnvironmentalInput>({
    noiseDbA: 82,
    noiseHours: 8,
    ibutgCelsius: 26,
    workIntensity: 'moderado',
    lux: 450,
    environment: 'escritorio',
  });
  const results = evaluateEnvironmental(env);

  return (
    <div className="scroll pad">
      <h2>Riscos ambientais</h2>
      <label className="lbl">Ruído dB(A)</label>
      <input className="inp" type="number" value={env.noiseDbA} onChange={(e) => setEnv({ ...env, noiseDbA: Number(e.target.value) })} />
      <label className="lbl">IBUTG °C</label>
      <input className="inp" type="number" value={env.ibutgCelsius} onChange={(e) => setEnv({ ...env, ibutgCelsius: Number(e.target.value) })} />
      <label className="lbl">Lux</label>
      <input className="inp" type="number" value={env.lux} onChange={(e) => setEnv({ ...env, lux: Number(e.target.value) })} />
      <button type="button" className="btn bp" onClick={() => showToast(`${results.length} medições avaliadas`, 'success')}>
        Calcular NR-15 / NHO-06 / NHO-11
      </button>
      {results.map((r) => (
        <div key={r.methodId} className="card" style={{ marginTop: 8 }}>
          <div className="card-t">{r.methodName}</div>
          <div>{r.classificationLabel}</div>
        </div>
      ))}
    </div>
  );
}

export function V2RoadmapScreen() {
  return (
    <div className="scroll pad">
      <h2>Roadmap futuro</h2>
      {FUTURE_MODULES.map((m) => (
        <div key={m.id} className="list-row card" style={{ marginBottom: 8 }}>
          <span>{m.title}</span>
          <span className="badge bm">{m.status}</span>
        </div>
      ))}
    </div>
  );
}

export function V2AuditScreen() {
  const { selectedCompanyId, session } = useApp();
  const logs = getAuditLogs(selectedCompanyId, 50);

  return (
    <div className="scroll pad">
      <h2>Auditoria</h2>
      <p className="t2">Usuário: {session?.email}</p>
      {logs.length === 0 && <p>Nenhum registro local ainda.</p>}
      {logs.map((e) => (
        <div key={e.id} className="card" style={{ marginBottom: 6, fontSize: 11 }}>
          <div>{e.action} · {e.entity}</div>
          <div className="t2">{e.timestamp}</div>
          {e.field && <div>{e.field}: {e.previousValue} → {e.newValue}</div>}
        </div>
      ))}
    </div>
  );
}
