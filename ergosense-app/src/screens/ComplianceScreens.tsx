/**
 * Compliance Intelligence Engine — MTE · DOU · Fundacentro · eSocial
 */
import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import type { ComplianceDeteccao, ComplianceImpacto } from '../types/compliance';

const SEV_COLOR: Record<string, string> = {
  critico: 'var(--red)',
  alto: 'var(--amber)',
  atencao: 'var(--cyan)',
  medio: 'var(--t1)',
};

const STATUS_COLOR: Record<string, string> = {
  PENDENTE_VALIDACAO: 'var(--amber)',
  APROVADA: 'var(--green)',
  REJEITADA: 'var(--red)',
  VIGENTE: 'var(--green)',
  REVOGADA: 'var(--t2)',
};

const EVENT_LABEL: Record<string, string> = {
  NOVA_NORMA: 'Nova norma',
  REVISAO: 'Revisão',
  REVOGACAO: 'Revogação',
  RETIFICACAO: 'Retificação',
  ORIGINAL: 'Original',
};

function PolicyBanner() {
  return (
    <div className="hl-r mb12">
      <span style={{ fontSize: 12 }}>
        Validação humana obrigatória — o motor ErgoSense <strong>nunca</strong> atualiza regras automaticamente.
      </span>
    </div>
  );
}

export function ComplianceDashboardScreen() {
  const { go, complianceDashboard, runComplianceScan, refreshComplianceData } = useApp();
  const d = complianceDashboard;

  return (
    <div className="scroll scroll--dashboard">
      <div className="hl mb14">
        <div className="lbl" style={{ color: 'var(--cyan)' }}>COMPLIANCE INTELLIGENCE ENGINE</div>
        <p style={{ fontSize: 12, color: 'var(--t1)', margin: 0 }}>
          MTE · DOU · Fundacentro · eSocial — monitoramento regulatório SST
        </p>
      </div>
      <PolicyBanner />
      <div className="sg" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
        {[
          { v: d?.pendingValidation ?? 0, l: 'Pendentes', s: 'compliance-validacao', c: 'var(--amber)' },
          { v: d?.unreadAlerts ?? 0, l: 'Alertas', s: 'compliance-alertas', c: 'var(--red)' },
          { v: d?.vigenteNorms ?? 0, l: 'Normas vigentes', s: 'compliance-normas', c: 'var(--green)' },
          { v: d?.criticalAlerts ?? 0, l: 'Críticos', s: 'compliance-alertas', c: 'var(--red)' },
          { v: d?.pendingTasks ?? 0, l: 'Tarefas', s: 'compliance-adequacao', c: 'var(--cyan)' },
        ].map((k) => (
          <div key={k.l} className="sc" onClick={() => go(k.s as never)}>
            <div className="sv" style={{ color: k.c }}>{k.v}</div>
            <div className="sl">{k.l}</div>
          </div>
        ))}
      </div>
      <div className="row gap8 mt12">
        <button className="btn bp" onClick={() => void runComplianceScan()}>Executar varredura</button>
        <button className="btn bs" onClick={() => void refreshComplianceData()}>Atualizar</button>
      </div>
      {d?.lastScan && (
        <p style={{ fontSize: 11, color: 'var(--t2)', marginTop: 8 }}>
          Última varredura: {new Date(d.lastScan).toLocaleString('pt-BR')}
        </p>
      )}
      <div className="sec mt12"><span className="stl">Módulos</span></div>
      {[
        { id: 'compliance-normas', ico: '📚', label: 'Catálogo de normas', sub: 'Histórico versionado · vigência' },
        { id: 'compliance-alertas', ico: '🔔', label: 'Alertas', sub: 'Novas normas · revisões · revogações' },
        { id: 'compliance-validacao', ico: '✅', label: 'Validação humana', sub: 'Aprovar detecções · sem auto-aplicação' },
        { id: 'compliance-adequacao', ico: '📋', label: 'Tarefas de adequação', sub: 'Impacto sistema · clientes' },
        { id: 'compliance-relatorios', ico: '📄', label: 'Relatórios', sub: 'Impacto legal · dossiê regulatório' },
        { id: 'compliance-fontes', ico: '🌐', label: 'Fontes monitoradas', sub: 'MTE · DOU · Fundacentro · eSocial' },
      ].map((item) => (
        <button key={item.id} className="ac" onClick={() => go(item.id as never)}>
          <div className="av" style={{ background: 'var(--g10)', fontSize: 22 }}>{item.ico}</div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--t0)' }}>{item.label}</div>
            <div style={{ fontSize: 11, color: 'var(--t1)' }}>{item.sub}</div>
          </div>
          <span style={{ color: 'var(--cyan)' }}>›</span>
        </button>
      ))}
      {d?.recentHistory && d.recentHistory.length > 0 && (
        <>
          <div className="sec mt12"><span className="stl">Atividade recente</span></div>
          {d.recentHistory.slice(0, 5).map((h) => (
            <div key={h.id} className="card">
              <div style={{ fontWeight: 600, fontSize: 12 }}>{h.action}</div>
              <div style={{ fontSize: 11, color: 'var(--t1)' }}>
                {h.userName ?? '—'} · {new Date(h.createdAt).toLocaleString('pt-BR')}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export function ComplianceNormasScreen() {
  const { complianceNormas, loadNormaVersoes, complianceNormaVersoes, compareNormVersions, complianceVersionCompare } = useApp();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedId) void loadNormaVersoes(selectedId);
  }, [selectedId, loadNormaVersoes]);

  return (
    <div className="scroll">
      <div className="hl mb12">
        <div className="lbl" style={{ color: 'var(--cyan)' }}>CATÁLOGO REGULATÓRIO</div>
        <p style={{ fontSize: 12, color: 'var(--t1)', margin: 0 }}>Histórico versionado — cada alteração exige validação humana</p>
      </div>
      {complianceNormas.map((n) => (
        <div key={n.id} className="card">
          <div className="row gap8 jb">
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{n.code} · {n.title}</div>
              <div style={{ fontSize: 11, color: 'var(--t1)' }}>
                {n.agency} · {n.source} · v{n.currentVersion?.number ?? '—'}
              </div>
            </div>
            <span className="badge" style={{ color: STATUS_COLOR[n.status] ?? 'var(--t1)' }}>{n.status}</span>
          </div>
          {n.impactedModules?.length > 0 && (
            <div style={{ fontSize: 10, color: 'var(--t2)', marginTop: 6 }}>
              Módulos: {n.impactedModules.join(' · ')}
            </div>
          )}
          <button className="btn bs sm mt8" onClick={() => setSelectedId(selectedId === n.id ? null : n.id)}>
            {selectedId === n.id ? 'Ocultar versões' : 'Ver versões'}
          </button>
          {selectedId === n.id && complianceNormaVersoes.length > 0 && (
            <div className="mt8" style={{ borderTop: '1px solid var(--b1)', paddingTop: 8 }}>
              {complianceNormaVersoes.map((v) => (
                <div key={v.id} style={{ fontSize: 11, marginBottom: 6 }}>
                  <strong>v{v.versionNumber}</strong> · {EVENT_LABEL[v.changeType] ?? v.changeType}
                  {v.validated ? ` · ✓ ${v.validatedBy}` : ''}
                  <div style={{ color: 'var(--t2)' }}>{v.summary}</div>
                </div>
              ))}
              {complianceNormaVersoes.length >= 2 && (
                <button
                  className="btn bs sm mt8"
                  onClick={() =>
                    void compareNormVersions(
                      n.id,
                      complianceNormaVersoes[1].id,
                      complianceNormaVersoes[0].id,
                    )
                  }
                >
                  Comparar últimas versões
                </button>
              )}
              {complianceVersionCompare && selectedId === n.id && (
                <div className="card mt8" style={{ fontSize: 11 }}>
                  <div style={{ fontWeight: 600 }}>{complianceVersionCompare.diff.summary}</div>
                  {complianceVersionCompare.diff.added.slice(0, 5).map((line) => (
                    <div key={line} style={{ color: 'var(--green)' }}>+ {line}</div>
                  ))}
                  {complianceVersionCompare.diff.removed.slice(0, 5).map((line) => (
                    <div key={line} style={{ color: 'var(--red)' }}>- {line}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
      {!complianceNormas.length && <p style={{ fontSize: 12, color: 'var(--t2)' }}>Execute uma varredura para inicializar o catálogo.</p>}
    </div>
  );
}

export function ComplianceAlertasScreen() {
  const { complianceAlertas, markComplianceAlertRead } = useApp();
  return (
    <div className="scroll">
      <div className="hl mb12">
        <div className="lbl" style={{ color: 'var(--cyan)' }}>ALERTAS REGULATÓRIOS</div>
      </div>
      <PolicyBanner />
      {complianceAlertas.map((a) => (
        <div key={a.id} className="card" style={{ opacity: a.read ? 0.65 : 1 }}>
          <div className="row gap8 jb">
            <div style={{ fontWeight: 600, fontSize: 13 }}>{a.title}</div>
            <span className="badge" style={{ color: SEV_COLOR[a.severity] ?? 'var(--t1)' }}>{a.severity}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--t1)', marginTop: 4 }}>{a.message}</div>
          <div style={{ fontSize: 10, color: 'var(--t2)', marginTop: 4 }}>
            {new Date(a.createdAt).toLocaleString('pt-BR')}
          </div>
          {!a.read && (
            <button className="btn bs sm mt8" onClick={() => void markComplianceAlertRead(a.id)}>Marcar como lida</button>
          )}
        </div>
      ))}
      {!complianceAlertas.length && <p style={{ fontSize: 12, color: 'var(--t2)' }}>Nenhum alerta registrado.</p>}
    </div>
  );
}

function ValidationCard({ det }: { det: ComplianceDeteccao }) {
  const { validateComplianceDetection, loadDetectionImpactos, complianceImpactos, complianceSystemImpacts, complianceClientImpacts } = useApp();
  const [justification, setJustification] = useState('');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (expanded) void loadDetectionImpactos(det.id);
  }, [expanded, det.id, loadDetectionImpactos]);

  return (
    <div className="card">
      <div className="row gap8 jb">
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>[{det.source}] {det.normCode}</div>
          <div style={{ fontSize: 12, marginTop: 2 }}>{det.title}</div>
        </div>
        <span className="badge" style={{ color: STATUS_COLOR[det.status] ?? 'var(--amber)' }}>{det.status}</span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--t1)', marginTop: 6 }}>
        {EVENT_LABEL[det.eventType] ?? det.eventType} · Impacto {det.impactLevel}
      </div>
      <div style={{ fontSize: 11, color: 'var(--t2)', marginTop: 4 }}>{det.summary}</div>
      <button className="btn bs sm mt8" onClick={() => setExpanded(!expanded)}>
        {expanded ? 'Ocultar impacto legal' : 'Ver impacto legal'}
      </button>
      {expanded && (
        <div className="mt8">
          {complianceImpactos.map((imp: ComplianceImpacto) => (
            <div key={imp.id} style={{ fontSize: 11, marginBottom: 8, padding: 8, background: 'var(--b0)', borderRadius: 6 }}>
              <strong>Legal · {imp.module}</strong> · risco {imp.legalRisk} · prazo {imp.deadlineDays}d
              <div>{imp.impactDescription}</div>
              <div style={{ color: 'var(--cyan)' }}>→ {imp.recommendedAction}</div>
            </div>
          ))}
          {complianceSystemImpacts.map((imp) => (
            <div key={imp.id} style={{ fontSize: 11, marginBottom: 8, padding: 8, background: 'var(--b0)', borderRadius: 6 }}>
              <strong>Sistema · {imp.module}</strong> · {imp.component}
              <div>{imp.description}</div>
              <div style={{ color: 'var(--t2)' }}>{imp.systemAction}</div>
            </div>
          ))}
          {complianceClientImpacts.map((imp) => (
            <div key={imp.id} style={{ fontSize: 11, marginBottom: 8, padding: 8, background: 'var(--b0)', borderRadius: 6 }}>
              <strong>Cliente · {imp.clientProfile}</strong> · urgência {imp.urgency}
              <div>{imp.description}</div>
            </div>
          ))}
        </div>
      )}
      {det.status === 'PENDENTE_VALIDACAO' && (
        <>
          <textarea
            className="inp mt8"
            rows={2}
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder="Justificativa da validação (obrigatória)"
          />
          <div className="row gap8 mt8">
            <button
              className="btn bp sm"
              onClick={() => void validateComplianceDetection(det.id, 'APROVAR', justification)}
            >
              Aprovar
            </button>
            <button
              className="btn bs sm"
              style={{ color: 'var(--red)' }}
              onClick={() => void validateComplianceDetection(det.id, 'REJEITAR', justification)}
            >
              Rejeitar
            </button>
            <button
              className="btn bs sm"
              style={{ color: 'var(--amber)' }}
              onClick={() => void validateComplianceDetection(det.id, 'SOLICITAR_REVISAO', justification)}
            >
              Solicitar revisão
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function ComplianceValidacaoScreen() {
  const { complianceDeteccoes, refreshComplianceData } = useApp();
  const pending = complianceDeteccoes.filter((d) => d.status === 'PENDENTE_VALIDACAO');
  const others = complianceDeteccoes.filter((d) => d.status !== 'PENDENTE_VALIDACAO');

  return (
    <div className="scroll">
      <div className="hl mb12">
        <div className="lbl" style={{ color: 'var(--cyan)' }}>VALIDAÇÃO HUMANA</div>
        <p style={{ fontSize: 12, color: 'var(--t1)', margin: 0 }}>
          Aprovação atualiza o catálogo versionado — regras do sistema permanecem inalteradas
        </p>
      </div>
      <PolicyBanner />
      <div className="row gap8 mb12">
        <button className="btn bs sm" onClick={() => void refreshComplianceData()}>Atualizar lista</button>
      </div>
      <div className="sec"><span className="stl">Pendentes ({pending.length})</span></div>
      {pending.map((d) => <ValidationCard key={d.id} det={d} />)}
      {!pending.length && <p style={{ fontSize: 12, color: 'var(--t2)' }}>Nenhuma detecção pendente.</p>}
      {others.length > 0 && (
        <>
          <div className="sec mt12"><span className="stl">Histórico de validações</span></div>
          {others.map((d) => <ValidationCard key={d.id} det={d} />)}
        </>
      )}
    </div>
  );
}

export function ComplianceRelatoriosScreen() {
  const { complianceReports, generateComplianceReport, downloadComplianceReport } = useApp();
  return (
    <div className="scroll">
      <div className="hl mb12">
        <div className="lbl" style={{ color: 'var(--cyan)' }}>RELATÓRIOS DE IMPACTO LEGAL</div>
        <p style={{ fontSize: 12, color: 'var(--t1)', margin: 0 }}>
          Dossiê regulatório — não substitui parecer jurídico
        </p>
      </div>
      <PolicyBanner />
      <button className="btn bp mb12" onClick={() => void generateComplianceReport()}>Gerar relatório completo</button>
      {complianceReports.map((r) => (
        <div key={r.id} className="card">
          <div style={{ fontWeight: 600, fontSize: 13 }}>{r.title}</div>
          <div style={{ fontSize: 11, color: 'var(--t1)' }}>
            {r.generatedBy ?? '—'} · {new Date(r.createdAt).toLocaleString('pt-BR')}
          </div>
          <button className="btn bs sm mt8" onClick={() => void downloadComplianceReport()}>Exportar JSON</button>
        </div>
      ))}
      {!complianceReports.length && <p style={{ fontSize: 12, color: 'var(--t2)' }}>Nenhum relatório gerado ainda.</p>}
    </div>
  );
}

export function ComplianceFontesScreen() {
  const { complianceFontes, runComplianceScan, updateComplianceFonte, complianceSchedule, updateComplianceSchedule } = useApp();

  return (
    <div className="scroll">
      <div className="hl mb12">
        <div className="lbl" style={{ color: 'var(--cyan)' }}>FONTES MONITORADAS</div>
        <p style={{ fontSize: 12, color: 'var(--t1)', margin: 0 }}>MTE · DOU · Fundacentro · eSocial · varredura diária agendável</p>
      </div>
      {complianceSchedule && (
        <div className="card mb12">
          <div className="lbl">Monitoramento automático</div>
          <div style={{ fontSize: 11, color: 'var(--t1)' }}>
            Intervalo: {complianceSchedule.intervalHours}h · Próxima: {complianceSchedule.nextRun ? new Date(complianceSchedule.nextRun).toLocaleString('pt-BR') : '—'}
          </div>
          <label className="row gap8 mt8" style={{ fontSize: 12 }}>
            <input
              type="checkbox"
              checked={complianceSchedule.active}
              onChange={(e) => void updateComplianceSchedule({ active: e.target.checked })}
            />
            Varredura automática ativa
          </label>
        </div>
      )}
      {complianceFontes.map((f) => (
        <div key={f.id} className="card">
          <div className="row gap8 jb">
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{f.code} — {f.name}</div>
              <div style={{ fontSize: 11, color: 'var(--t1)' }}>
                Intervalo: {f.intervalHours}h · Status: {f.lastStatus ?? '—'}
              </div>
            </div>
            <label className="row gap8" style={{ fontSize: 12 }}>
              <input
                type="checkbox"
                checked={f.active}
                onChange={(e) => void updateComplianceFonte(f.code, { active: e.target.checked })}
              />
              Ativa
            </label>
          </div>
          {f.lastScan && (
            <div style={{ fontSize: 10, color: 'var(--t2)', marginTop: 4 }}>
              Última varredura: {new Date(f.lastScan).toLocaleString('pt-BR')}
            </div>
          )}
          {f.monitorUrl && (
            <a href={f.monitorUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--cyan)' }}>
              Abrir portal oficial ↗
            </a>
          )}
        </div>
      ))}
      <button className="btn bp mt12" onClick={() => void runComplianceScan()}>Varredura em todas as fontes ativas</button>
    </div>
  );
}

export function ComplianceAdequacaoScreen() {
  const { complianceTasks, updateComplianceTask, complianceDashboard } = useApp();
  const pending = complianceTasks.filter((t) => t.status === 'PENDENTE' || t.status === 'EM_ANDAMENTO');

  return (
    <div className="scroll">
      <div className="hl mb12">
        <div className="lbl" style={{ color: 'var(--cyan)' }}>TAREFAS DE ADEQUAÇÃO</div>
        <p style={{ fontSize: 12, color: 'var(--t1)', margin: 0 }}>
          Geradas automaticamente — execução somente após validação humana
        </p>
      </div>
      <PolicyBanner />
      <p style={{ fontSize: 11, color: 'var(--t2)' }}>Pendentes: {complianceDashboard?.pendingTasks ?? pending.length}</p>
      {complianceTasks.map((t) => (
        <div key={t.id} className="card">
          <div className="row gap8 jb">
            <div style={{ fontWeight: 600, fontSize: 13 }}>{t.title}</div>
            <span className="badge">{t.status}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--t1)', marginTop: 4 }}>
            {t.module} · prioridade {t.priority} · prazo {t.deadline ?? '—'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--t2)', marginTop: 4 }}>{t.description}</div>
          {t.status !== 'CONCLUIDA' && (
            <div className="row gap8 mt8">
              <button className="btn bs sm" onClick={() => void updateComplianceTask(t.id, { status: 'EM_ANDAMENTO' })}>Iniciar</button>
              <button className="btn bp sm" onClick={() => void updateComplianceTask(t.id, { status: 'CONCLUIDA' })}>Concluir</button>
            </div>
          )}
        </div>
      ))}
      {!complianceTasks.length && <p style={{ fontSize: 12, color: 'var(--t2)' }}>Execute uma varredura para gerar tarefas.</p>}
    </div>
  );
}
