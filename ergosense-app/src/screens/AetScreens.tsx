/**
 * AET — Análise Ergonômica do Trabalho (NR-17)
 */
import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { calculateRula } from '../methods/rula';
import { calculateReba } from '../methods/reba';
import { calculateOwas } from '../methods/owas';
import { calculateNioshRnle } from '../methods/nioshRnle';
import type { JointAngles } from '../types';
import {
  AET_SIGNATURE_LABELS,
  AET_STAGE_LABELS,
  AET_STATUS_LABELS,
  EQUIPAMENTO_TIPOS,
  MOBILIARIO_TIPOS,
  ORGANIZACAO_ITENS,
  TELEATENDIMENTO_ITENS,
  aetActionLabel,
  type AetSignatureType,
  type AetStage,
} from '../types/aet';

function nivelColor(n: string) {
  if (n === 'acima_limite' || n === 'nao_conforme' || n === 'critico') return 'var(--red)';
  if (n === 'zona_acao' || n === 'parcial' || n === 'alto') return 'var(--amber)';
  return 'var(--green)';
}

export function AetDashboardScreen() {
  const { go, aetDashboard, aetProcesses } = useApp();
  const dash = aetDashboard;
  return (
    <div className="scroll scroll--dashboard">
      <div className="hl" style={{ marginBottom: 14 }}>
        <div className="lbl" style={{ color: 'var(--cyan)' }}>AET — ANÁLISE ERGONÔMICA DO TRABALHO</div>
        <p style={{ fontSize: 12, color: 'var(--t1)', margin: 0 }}>NR-17 · RULA · REBA · OWAS · NIOSH · Vibração · Teleatendimento</p>
      </div>
      <div className="sg" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
        <div className="sc" onClick={() => go('aet-workflow')}>
          <div className="sv" style={{ color: 'var(--cyan)' }}>{dash?.totalProcesses ?? aetProcesses.length}</div>
          <div className="sl">Processos AET</div>
        </div>
        <div className="sc" onClick={() => go('aet-workflow')}>
          <div className="sv" style={{ color: 'var(--green)' }}>{dash?.signed ?? 0}</div>
          <div className="sl">Assinados</div>
        </div>
        <div className="sc" onClick={() => go('aet-cadastros')}>
          <div className="sv" style={{ color: 'var(--amber)' }}>{dash?.furnitureCount ?? 0}</div>
          <div className="sl">Mobiliário</div>
        </div>
        <div className="sc" onClick={() => go('aet-cadastros')}>
          <div className="sv" style={{ color: 'var(--amber)' }}>{dash?.equipmentCount ?? 0}</div>
          <div className="sl">Equipamentos</div>
        </div>
      </div>
      <div className="sec mt12"><span className="stl">Módulos AET</span></div>
      {[
        { id: 'aet-workflow', ico: '🔄', label: 'Workflow AET', sub: 'Caracterização → Aprovação → Assinaturas' },
        { id: 'aet-cadastros', ico: '🪑', label: 'Cadastros', sub: 'Mobiliário · Equipamentos NR-17 17.3.2' },
        { id: 'aet-relatorio', ico: '📄', label: 'Relatórios normativos', sub: 'PDF corporativo · CREA · Rastreabilidade' },
      ].map((item) => (
        <button key={item.id} className="ac" onClick={() => go(item.id as never)}>
          <div className="av" style={{ background: 'var(--c10)', fontSize: 22 }}>{item.ico}</div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--t0)' }}>{item.label}</div>
            <div style={{ fontSize: 11, color: 'var(--t1)', marginTop: 2 }}>{item.sub}</div>
          </div>
          <span style={{ color: 'var(--cyan)' }}>›</span>
        </button>
      ))}
    </div>
  );
}

export function AetWorkflowScreen() {
  const { go, aetProcesses, createAetProcess, openAetProcess, dbConnected } = useApp();
  const [titulo, setTitulo] = useState('');
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (creating) return;
    setCreating(true);
    try {
      const ok = await createAetProcess(titulo);
      if (ok) {
        setTitulo('');
        go('aet-detalhe');
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="scroll">
      <div className="card">
        <label className="lbl">Novo processo AET</label>
        <input
          className="inp"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void handleCreate(); }}
          placeholder="Ex: AET — Operador de teleatendimento"
        />
        {!dbConnected && (
          <div style={{ fontSize: 11, color: 'var(--amber)', marginBottom: 8 }}>
            Backend offline — inicie o servidor na porta 3001 ou aguarde a conexão.
          </div>
        )}
        <button
          className="btn bp"
          disabled={creating || !titulo.trim()}
          onClick={() => { void handleCreate(); }}
        >
          {creating ? 'Criando…' : 'Iniciar AET'}
        </button>
      </div>
      <div className="sec"><span className="stl">Processos</span></div>
      {aetProcesses.length === 0 ? (
        <div className="card" style={{ fontSize: 12, color: 'var(--t2)' }}>Nenhum processo AET. Crie o primeiro acima.</div>
      ) : aetProcesses.map((p) => (
        <div key={p.id} className="card" style={{ cursor: 'pointer' }} onClick={() => { void openAetProcess(p.id); go('aet-detalhe'); }}>
          <div className="row gap8 jb">
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t0)' }}>{p.title}</div>
              <div style={{ fontSize: 11, color: 'var(--t1)' }}>{AET_STAGE_LABELS[p.stage]} · {p.status}</div>
            </div>
            <span className="badge" style={{ background: 'var(--c10)', color: 'var(--cyan)' }}>{p.stage}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ChecklistForm({ itens, values, onChange }: { itens: { key: string; label: string }[]; values: Record<string, number>; onChange: (k: string, v: number) => void }) {
  return (
    <>
      {itens.map((it) => (
        <div key={it.key} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--t0)', marginBottom: 6 }}>{it.label}</div>
          <div className="row gap8">
            {[0, 1, 2].map((v) => (
              <button key={v} type="button" className={`tag ${values[it.key] === v ? 'on' : ''}`} onClick={() => onChange(it.key, v)}>
                {v === 0 ? 'Não' : v === 1 ? 'Parcial' : 'Sim'}
              </button>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

export function AetDetalheScreen() {
  const {
    aetProcessDetail,
    aetVersionDetail,
    aetVersions,
    aetHistory,
    aetIntegrations,
    advanceAetStage,
    saveAetVibracaoCorpo,
    saveAetVibracaoMaos,
    saveAetTeleatendimento,
    saveAetOrganizacao,
    saveAetMetodos,
    generateAetReport,
    signAet,
    createAetVersion,
    refreshAetVersionSnapshot,
    generateAetVersionReport,
    submitAetApproval,
    approveAetVersion,
    rejectAetVersion,
    signAetVersion,
    startAetRevision,
    saveAetTechnicalResponsible,
    refreshAetVersion,
    downloadAetPdf,
    dbConnected,
    go,
    analyses,
  } = useApp();
  const p = aetProcessDetail;
  const v = aetVersionDetail;
  const [aba, setAba] = useState<AetStage | 'metodos' | 'corporativo'>('CARACTERIZACAO');
  const [vCorpo, setVCorpo] = useState({ aceleracaoMs2: 0.8, horasExposicao: 8 });
  const [vMaos, setVMaos] = useState({ aceleracaoMs2: 3, horasExposicao: 4 });
  const [tel, setTel] = useState<Record<string, number>>({});
  const [org, setOrg] = useState<Record<string, number>>({});
  const [sigNome, setSigNome] = useState('');
  const [sigReg, setSigReg] = useState('');
  const [rtNome, setRtNome] = useState('');
  const [rtCrea, setRtCrea] = useState('');
  const [rtArt, setRtArt] = useState('');
  const [approverName, setApproverName] = useState('');
  const [approverRole, setApproverRole] = useState('');
  const [sigType, setSigType] = useState<AetSignatureType>('RESPONSAVEL_TECNICO');
  const [sigCorpNome, setSigCorpNome] = useState('');
  const [sigCorpRole, setSigCorpRole] = useState('');
  const [sigDoc, setSigDoc] = useState('');

  if (!p) {
    return (
      <div className="scroll">
        <div className="card" style={{ fontSize: 12, color: 'var(--t2)' }}>Selecione um processo AET em Workflow.</div>
        <button className="btn bp" onClick={() => go('aet-workflow')}>Ir para Workflow</button>
      </div>
    );
  }

  const defaultAngles: JointAngles = {
    lombar: 25, dorso: 10, ombroD: 45, pescoco: 15, cotovelo: 90, maoD: 0, quadril: 90, joelhoD: 90, tornozeloD: 90, repeticao: 0,
  };

  function calcularMetodosLocal() {
    const rula = calculateRula(defaultAngles, true);
    const reba = calculateReba(defaultAngles, false);
    const owas = calculateOwas(defaultAngles, 15);
    const niosh = calculateNioshRnle({
      weightKg: 15,
      horizontalCm: 40,
      verticalOriginCm: 75,
      verticalDestCm: 105,
      asymmetryDeg: 0,
      frequencyPerMin: 1,
    });
    void saveAetMetodos({
      rula: { score: rula.score, classificationLabel: rula.classificationLabel, norma: 'RULA McAtamney 1993' },
      reba: { score: reba.score, classificationLabel: reba.classificationLabel, norma: 'REBA Hignett 2000' },
      owas: { owasClass: owas.score, classificationLabel: owas.classificationLabel, norma: 'OWAS Karhu 1977' },
      niosh: { rwl: niosh.outputs?.RWL as number, liftingIndex: niosh.outputs?.LI as number, norma: 'NIOSH RNLE 1991' },
    });
  }

  const stages = Object.keys(AET_STAGE_LABELS) as AetStage[];

  return (
    <div className="scroll">
      <div className="hl mb12">
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t0)' }}>{p.title}</div>
        <div style={{ fontSize: 11, color: 'var(--t1)' }}>{AET_STAGE_LABELS[p.stage]} · {p.status}</div>
        <div className="pb mt8"><div className="pf" style={{ width: `${((stages.indexOf(p.stage) + 1) / stages.length) * 100}%`, background: 'var(--cyan)' }} /></div>
      </div>

      <div className="row gap8 mb12" style={{ flexWrap: 'wrap' }}>
        {(['CARACTERIZACAO', 'METODOS_POSTURAIS', 'VIBRACAO', 'TELEATENDIMENTO', 'ORGANIZACAO', 'CONSOLIDACAO'] as const).map((s) => (
          <button key={s} className={`tag ${aba === s ? 'on' : ''}`} onClick={() => setAba(s)} style={aba === s ? { borderColor: 'var(--cyan)' } : {}}>
            {AET_STAGE_LABELS[s].split('·')[0].trim().slice(0, 12)}
          </button>
        ))}
        <button className={`tag ${aba === 'corporativo' ? 'on' : ''}`} onClick={() => setAba('corporativo')} style={aba === 'corporativo' ? { borderColor: 'var(--cyan)' } : {}}>
          Corporativo
        </button>
      </div>

      {aba === 'CARACTERIZACAO' && (
        <div className="card">
          <p style={{ fontSize: 12, color: 'var(--t1)' }}>Caracterize o posto, função e contexto da análise conforme NR-17 17.1.</p>
          {p.analysisId && <p style={{ fontSize: 11, color: 'var(--green)' }}>✓ Vinculado à análise IA #{p.analysisId}</p>}
          <button className="btn bp mt8" onClick={() => void advanceAetStage()}>Avançar etapa →</button>
        </div>
      )}

      {aba === 'METODOS_POSTURAIS' && (
        <div className="card">
          <div className="lbl" style={{ color: 'var(--cyan)' }}>RULA · REBA · OWAS · NIOSH</div>
          {p.methods?.rula && <p style={{ fontSize: 12 }}>RULA: {p.methods.rula.score} · REBA: {p.methods.reba?.score ?? '—'} · OWAS: {p.methods.owas?.owasClass ?? '—'} · NIOSH LI: {p.methods.niosh?.liftingIndex ?? '—'}</p>}
          <button className="btn bp" onClick={calcularMetodosLocal}>Calcular métodos (ângulos sessão)</button>
          <button className="btn btn-sm mt8" onClick={() => void saveAetMetodos({}, analyses[0]?.id)}>Importar da última análise IA</button>
        </div>
      )}

      {aba === 'VIBRACAO' && (
        <>
          <div className="card">
            <div className="lbl">Vibração corpo inteiro (NR-15 · ISO 2631-1)</div>
            <label className="lbl">Aceleração (m/s²)</label>
            <input className="inp" type="number" step="0.1" value={vCorpo.aceleracaoMs2} onChange={(e) => setVCorpo({ ...vCorpo, aceleracaoMs2: Number(e.target.value) })} />
            <label className="lbl">Horas/dia</label>
            <input className="inp" type="number" value={vCorpo.horasExposicao} onChange={(e) => setVCorpo({ ...vCorpo, horasExposicao: Number(e.target.value) })} />
            {p.wholeBodyVibration?.a8Equivalente != null && (
              <p style={{ fontSize: 12, color: nivelColor(p.wholeBodyVibration.nivel) }}>A(8): {p.wholeBodyVibration.a8Equivalente} — {p.wholeBodyVibration.nivel}</p>
            )}
            <button className="btn bp" onClick={() => void saveAetVibracaoCorpo(vCorpo)}>Salvar corpo inteiro</button>
          </div>
          <div className="card">
            <div className="lbl">Vibração mãos e braços (NHO-10 · ISO 5349)</div>
            <input className="inp" type="number" step="0.1" value={vMaos.aceleracaoMs2} onChange={(e) => setVMaos({ ...vMaos, aceleracaoMs2: Number(e.target.value) })} />
            <input className="inp" type="number" value={vMaos.horasExposicao} onChange={(e) => setVMaos({ ...vMaos, horasExposicao: Number(e.target.value) })} />
            {p.handArmVibration?.a8Equivalente != null && (
              <p style={{ fontSize: 12, color: nivelColor(p.handArmVibration.nivel) }}>A(8): {p.handArmVibration.a8Equivalente} — {p.handArmVibration.nivel}</p>
            )}
            <button className="btn bp" onClick={() => void saveAetVibracaoMaos(vMaos)}>Salvar mãos-braços</button>
          </div>
        </>
      )}

      {aba === 'TELEATENDIMENTO' && (
        <div className="card">
          <ChecklistForm itens={TELEATENDIMENTO_ITENS} values={tel} onChange={(k, v) => setTel({ ...tel, [k]: v })} />
          {p.telework?.scorePct != null && <p style={{ fontSize: 12, color: nivelColor(p.telework.nivel) }}>Score: {p.telework.scorePct}% — {p.telework.nivel}</p>}
          <button className="btn bp" onClick={() => void saveAetTeleatendimento(tel)}>Salvar teleatendimento</button>
        </div>
      )}

      {aba === 'ORGANIZACAO' && (
        <div className="card">
          <div className="lbl">Organização do trabalho — NR-17 17.1.1.1</div>
          <ChecklistForm itens={ORGANIZACAO_ITENS} values={org} onChange={(k, v) => setOrg({ ...org, [k]: v })} />
          {p.workOrganization?.scorePct != null && <p style={{ fontSize: 12, color: nivelColor(p.workOrganization.nivel) }}>Score: {p.workOrganization.scorePct}%</p>}
          <button className="btn bp" onClick={() => void saveAetOrganizacao(org)}>Salvar organização</button>
        </div>
      )}

      {aba === 'CONSOLIDACAO' && (
        <div className="card">
          <button className="btn bp mb8" onClick={() => void generateAetReport()}>Gerar relatório normativo (rápido)</button>
          <label className="lbl">Assinatura ergonomista (legado)</label>
          <input className="inp" value={sigNome} onChange={(e) => setSigNome(e.target.value)} placeholder="Nome completo" />
          <input className="inp" value={sigReg} onChange={(e) => setSigReg(e.target.value)} placeholder="Registro profissional" />
          <button className="btn bp" onClick={() => void signAet(sigNome, sigReg)}>Assinar AET (legado)</button>
          {p.signedAt && <p style={{ fontSize: 11, color: 'var(--green)', marginTop: 8 }}>✓ Assinado em {new Date(p.signedAt).toLocaleString('pt-BR')}</p>}
          <p style={{ fontSize: 11, color: 'var(--t2)', marginTop: 8 }}>Para fluxo corporativo completo, use a aba Corporativo.</p>
        </div>
      )}

      {aba === 'corporativo' && (
        <>
          <div className="card">
            <div className="lbl" style={{ color: 'var(--cyan)' }}>Responsável técnico (CREA)</div>
            <input className="inp" value={rtNome || p.technicalResponsible} onChange={(e) => setRtNome(e.target.value)} placeholder="Nome do engenheiro RT" />
            <input className="inp" value={rtCrea || p.technicalResponsibleCrea} onChange={(e) => setRtCrea(e.target.value)} placeholder="CREA-SP 123456/D" />
            <input className="inp" value={rtArt || p.technicalResponsibleArt} onChange={(e) => setRtArt(e.target.value)} placeholder="Nº ART" />
            <button
              className="btn bp mt8"
              onClick={() =>
                void saveAetTechnicalResponsible({
                  technicalResponsible: rtNome || p.technicalResponsible,
                  technicalResponsibleCrea: rtCrea || p.technicalResponsibleCrea,
                  technicalResponsibleArt: rtArt || p.technicalResponsibleArt,
                })
              }
            >
              Salvar RT
            </button>
          </div>

          <div className="card mt12">
            <div className="lbl">Versionamento documental</div>
            {!v ? (
              <button className="btn bp" disabled={!dbConnected} onClick={() => void createAetVersion()}>Criar versão corporativa</button>
            ) : (
              <>
                <p style={{ fontSize: 12, margin: '0 0 8px' }}>
                  {v.number} · {AET_STATUS_LABELS[v.status]}
                  {v.documentHash && <span style={{ fontSize: 10, color: 'var(--t2)' }}> · Hash: {v.documentHash.slice(0, 12)}…</span>}
                </p>
                <div className="row gap8 flex-wrap">
                  {(v.status === 'RASCUNHO' || v.status === 'EM_REVISAO') && (
                    <>
                      <button className="btn bs" disabled={!dbConnected} onClick={() => void refreshAetVersionSnapshot()}>Atualizar snapshot</button>
                      <button className="btn bp" disabled={!dbConnected} onClick={() => void generateAetVersionReport()}>Gerar relatório</button>
                    </>
                  )}
                  <button className="btn bp" onClick={() => downloadAetPdf()}>PDF corporativo</button>
                </div>
                {aetVersions.length > 1 && (
                  <div className="mt8">
                    {aetVersions.map((ver) => (
                      <button key={ver.id} type="button" className="tag" style={{ marginRight: 6, marginBottom: 6 }} onClick={() => void refreshAetVersion(ver.id)}>
                        {ver.number}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {v && (v.status === 'RASCUNHO' || v.status === 'EM_REVISAO') && (
            <div className="card mt12">
              <div className="lbl">Enviar para aprovação</div>
              <input className="inp" value={approverName} onChange={(e) => setApproverName(e.target.value)} placeholder="Nome do aprovador" />
              <input className="inp mt8" value={approverRole} onChange={(e) => setApproverRole(e.target.value)} placeholder="Cargo" />
              <button className="btn bp mt8" disabled={!dbConnected || !approverName.trim()} onClick={() => void submitAetApproval(approverName, approverRole)}>
                Submeter aprovação
              </button>
            </div>
          )}

          {v?.status === 'AGUARDANDO_APROVACAO' && (
            <div className="card mt12">
              <div className="lbl">Decisão</div>
              <div className="row gap8">
                <button className="btn bp" style={{ flex: 1 }} disabled={!dbConnected} onClick={() => void approveAetVersion()}>Aprovar</button>
                <button className="btn br" style={{ flex: 1 }} disabled={!dbConnected} onClick={() => void rejectAetVersion()}>Rejeitar</button>
              </div>
            </div>
          )}

          {v?.status === 'APROVADO' && (
            <div className="card mt12">
              <button className="btn bs" disabled={!dbConnected} onClick={() => void startAetRevision()}>Iniciar revisão (nova versão)</button>
            </div>
          )}

          {v && (
            <div className="card mt12">
              <div className="lbl">Assinaturas corporativas</div>
              <select className="inp" value={sigType} onChange={(e) => setSigType(e.target.value as AetSignatureType)}>
                {Object.entries(AET_SIGNATURE_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
              <input className="inp mt8" value={sigCorpNome} onChange={(e) => setSigCorpNome(e.target.value)} placeholder="Nome completo" />
              <input className="inp mt8" value={sigCorpRole} onChange={(e) => setSigCorpRole(e.target.value)} placeholder="Cargo" />
              <input className="inp mt8" value={sigDoc} onChange={(e) => setSigDoc(e.target.value)} placeholder="CREA / registro profissional" />
              <button className="btn bp mt8" disabled={!dbConnected || !sigCorpNome.trim()} onClick={() => void signAetVersion(sigType, sigCorpNome, sigCorpRole, sigDoc)}>
                Registrar assinatura
              </button>
              {v.signatures?.length > 0 && v.signatures.map((s) => (
                <div key={s.id} style={{ fontSize: 11, padding: '6px 0', borderTop: '1px solid var(--border)' }}>
                  <strong>{AET_SIGNATURE_LABELS[s.type]}</strong>: {s.name} · {s.document || '—'}
                </div>
              ))}
            </div>
          )}

          {aetIntegrations.length > 0 && (
            <div className="card mt12">
              <div className="lbl">Integrações NR-01</div>
              {aetIntegrations.slice(0, 8).map((i) => (
                <div key={i.id} style={{ fontSize: 11, padding: '4px 0' }}>[{i.module}] {i.reference}</div>
              ))}
            </div>
          )}

          {aetHistory.length > 0 && (
            <div className="card mt12">
              <div className="lbl">Histórico de rastreabilidade</div>
              {aetHistory.slice(0, 12).map((h) => (
                <div key={h.id} style={{ fontSize: 11, padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                  {aetActionLabel(h.action)} · {h.userName ?? '—'} · {new Date(h.createdAt).toLocaleString('pt-BR')}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <button className="btn bs mt12" onClick={() => go('aet-relatorio')}>Ver relatório PDF →</button>
    </div>
  );
}

export function AetCadastrosScreen() {
  const { aetFurniture, aetEquipment, saveAetFurniture, saveAetEquipment } = useApp();
  const [aba, setAba] = useState<'mob' | 'eq'>('mob');
  const [desc, setDesc] = useState('');
  const [tipo, setTipo] = useState('cadeira');
  const [ident, setIdent] = useState('');

  return (
    <div className="scroll">
      <div className="row gap8 mb12">
        <button className={`tag ${aba === 'mob' ? 'on' : ''}`} onClick={() => setAba('mob')}>Mobiliário</button>
        <button className={`tag ${aba === 'eq' ? 'on' : ''}`} onClick={() => setAba('eq')}>Equipamentos</button>
      </div>
      {aba === 'mob' ? (
        <>
          <div className="card">
            <select className="inp" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              {MOBILIARIO_TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input className="inp" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Descrição" />
            <button className="btn bp" onClick={() => { void saveAetFurniture({ type: tipo, description: desc }); setDesc(''); }}>Cadastrar mobiliário</button>
          </div>
          {aetFurniture.map((m) => (
            <div key={m.id} className="card">
              <div style={{ fontWeight: 600, fontSize: 13 }}>{m.type} — {m.description}</div>
              <div style={{ fontSize: 11, color: 'var(--t1)' }}>NR-17: {m.nr17Compliance}</div>
            </div>
          ))}
        </>
      ) : (
        <>
          <div className="card">
            <select className="inp" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              {EQUIPAMENTO_TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input className="inp" value={ident} onChange={(e) => setIdent(e.target.value)} placeholder="Identificação / patrimônio" />
            <button className="btn bp" onClick={() => { void saveAetEquipment({ type: tipo, identification: ident }); setIdent(''); }}>Cadastrar equipamento</button>
          </div>
          {aetEquipment.map((e) => (
            <div key={e.id} className="card">
              <div style={{ fontWeight: 600, fontSize: 13 }}>{e.type} — {e.identification}</div>
              <div style={{ fontSize: 11, color: 'var(--t1)' }}>{e.emitsVibration ? '⚡ Emite vibração' : 'Sem vibração'}</div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export function AetRelatorioScreen() {
  const { aetProcessDetail, aetReport, aetVersionDetail, generateAetReport, generateAetVersionReport, downloadAetPdf, go } = useApp();
  const p = aetProcessDetail;
  const report = aetReport ?? p?.report ?? aetVersionDetail?.report;

  if (!p) {
    return (
      <div className="scroll">
        <div className="card" style={{ fontSize: 12, color: 'var(--t2)' }}>Abra um processo AET para gerar o relatório.</div>
        <button className="btn bp" onClick={() => go('aet-workflow')}>Workflow AET</button>
      </div>
    );
  }

  return (
    <div className="scroll">
      <div className="hl mb12">
        <div className="lbl" style={{ color: 'var(--cyan)' }}>RELATÓRIO NORMATIVO AET</div>
        <p style={{ fontSize: 12, color: 'var(--t1)', margin: 0 }}>{p.title}</p>
      </div>
      {!report ? (
        <div className="row gap8 flex-wrap">
          <button className="btn bp" onClick={() => void generateAetReport()}>Gerar relatório (rápido)</button>
          {aetVersionDetail && (
            <button className="btn bs" onClick={() => void generateAetVersionReport()}>Gerar relatório corporativo</button>
          )}
        </div>
      ) : (
        <>
          {aetVersionDetail && (
            <div className="card mb8" style={{ fontSize: 11 }}>
              Versão {aetVersionDetail.number} · {AET_STATUS_LABELS[aetVersionDetail.status]}
              {aetVersionDetail.documentHash && <div style={{ color: 'var(--t2)', marginTop: 4 }}>Hash: {aetVersionDetail.documentHash}</div>}
            </div>
          )}
          {report.sections.map((s) => (
            <div key={s.id} className="card">
              <div style={{ fontSize: 10, color: 'var(--t2)' }}>{s.norma}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t0)' }}>{s.id}. {s.title}</div>
            </div>
          ))}
          <button className="btn bp mt12" onClick={() => downloadAetPdf()}>Exportar PDF normativo</button>
        </>
      )}
    </div>
  );
}
