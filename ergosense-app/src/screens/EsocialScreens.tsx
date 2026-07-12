/**
 * eSocial — S-2210 · S-2220 · S-2240
 */
import { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { EsocialEventType } from '../types/esocial';

const STATUS_COLOR: Record<string, string> = {
  RASCUNHO: 'var(--t1)',
  VALIDADO: 'var(--cyan)',
  ASSINADO: 'var(--green)',
  PRONTO_ENVIO: 'var(--amber)',
  ENVIADO: 'var(--cyan)',
  ACEITO: 'var(--green)',
  REJEITADO: 'var(--red)',
};

function EventList({ tipo }: { tipo?: EsocialEventType }) {
  const {
    esocialEventos,
    validateEsocialEvent,
    signEsocialEvent,
    downloadEsocialXml,
    prepareEsocialEnvio,
    transmitEsocialEvent,
    resendEsocialEvent,
    consultEsocialStatus,
  } = useApp();
  const list = tipo ? esocialEventos.filter((e) => e.eventType === tipo) : esocialEventos;
  return (
    <>
      {list.map((e) => (
        <div key={e.id} className="card">
          <div className="row gap8 jb">
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{e.eventType} · {e.eventId.slice(0, 16)}…</div>
              <div style={{ fontSize: 11, color: 'var(--t1)' }}>
                {e.collaboratorName ?? '—'} · {new Date(e.createdAt).toLocaleDateString('pt-BR')}
                {e.processingStatus ? ` · ${e.processingStatus}` : ''}
              </div>
            </div>
            <span className="badge" style={{ color: STATUS_COLOR[e.status] ?? 'var(--t1)' }}>{e.status}</span>
          </div>
          {e.govbrProtocol && (
            <div style={{ fontSize: 10, color: 'var(--cyan)', marginTop: 4 }}>Protocolo: {e.govbrProtocol}</div>
          )}
          {!e.validationOk && e.validationErrors?.length > 0 && (
            <div style={{ fontSize: 10, color: 'var(--red)', marginTop: 6 }}>
              {e.validationErrors[0]?.message}
            </div>
          )}
          {e.govbrMessage && e.status === 'REJEITADO' && (
            <div style={{ fontSize: 10, color: 'var(--red)', marginTop: 4 }}>{e.govbrMessage}</div>
          )}
          <div className="row gap8 mt8" style={{ flexWrap: 'wrap' }}>
            <button className="btn bs sm" onClick={() => void validateEsocialEvent(e.id)}>Validar XSD</button>
            <button className="btn bs sm" disabled={!e.validationOk} onClick={() => void signEsocialEvent(e.id)}>Assinar ICP</button>
            <button className="btn bs sm" onClick={() => void downloadEsocialXml(e.id)}>XML</button>
            <button className="btn bs sm" disabled={e.status !== 'ASSINADO' && e.status !== 'PRONTO_ENVIO'} onClick={() => void transmitEsocialEvent(e.id)}>Enviar</button>
            <button className="btn bs sm" disabled={e.status !== 'REJEITADO' && (e.transmissionAttempts ?? 0) < 1} onClick={() => void resendEsocialEvent(e.id)}>Reenviar</button>
            <button className="btn bs sm" disabled={!e.govbrProtocol} onClick={() => void consultEsocialStatus(e.id)}>Status</button>
            <button className="btn bs sm" disabled={e.status !== 'ASSINADO'} onClick={() => void prepareEsocialEnvio(e.id)}>Preparar</button>
          </div>
          {(e.transmissionAttempts ?? 0) > 0 && (
            <div style={{ fontSize: 10, color: 'var(--t2)', marginTop: 6 }}>
              Tentativas: {e.transmissionAttempts}
            </div>
          )}
        </div>
      ))}
      {!list.length && <p style={{ fontSize: 12, color: 'var(--t2)' }}>Nenhum evento registrado.</p>}
    </>
  );
}

export function EsocialDashboardScreen() {
  const { go, esocialDashboard } = useApp();
  const d = esocialDashboard;
  return (
    <div className="scroll scroll--dashboard">
      <div className="hl mb14">
        <div className="lbl" style={{ color: 'var(--cyan)' }}>eSOCIAL — EVENTOS SST</div>
        <p style={{ fontSize: 12, color: 'var(--t1)', margin: 0 }}>S-2210 CAT · S-2220 Monitoramento · S-2240 Exposição · Layout S-1.3</p>
      </div>
      {!d?.configOk && (
        <div className="hl-r mb12"><span style={{ fontSize: 12 }}>⚠️ Configure CNPJ do empregador antes do envio</span></div>
      )}
      <div className="sg" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
        {[
          { v: d?.s2210 ?? 0, l: 'S-2210 CAT', s: 'esocial-s2210' },
          { v: d?.s2220 ?? 0, l: 'S-2220 Monit.', s: 'esocial-s2220' },
          { v: d?.s2240 ?? 0, l: 'S-2240 Exp.', s: 'esocial-s2240' },
          { v: d?.assinado ?? 0, l: 'Assinados', s: 'esocial-historico' },
        ].map((k) => (
          <div key={k.l} className="sc" onClick={() => go(k.s as never)}>
            <div className="sv" style={{ color: 'var(--cyan)' }}>{k.v}</div>
            <div className="sl">{k.l}</div>
          </div>
        ))}
      </div>
      <div className="sec mt12"><span className="stl">Módulos</span></div>
      {[
        { id: 'esocial-s2210', ico: '🏥', label: 'S-2210 — CAT', sub: 'Comunicação de Acidente de Trabalho' },
        { id: 'esocial-s2220', ico: '🩺', label: 'S-2220 — ASO', sub: 'Monitoramento da Saúde do Trabalhador' },
        { id: 'esocial-s2240', ico: '⚗️', label: 'S-2240 — Agentes', sub: 'Condições Ambientais · Ergonomia' },
        { id: 'esocial-historico', ico: '📝', label: 'Histórico', sub: 'Trilha de auditoria eSocial' },
        { id: 'esocial-config', ico: '🔐', label: 'Configuração gov.br', sub: 'CNPJ · Ambiente · Certificado ICP-Brasil' },
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
    </div>
  );
}

function EsocialEventForm({ eventType, title }: { eventType: EsocialEventType; title: string }) {
  const { collaborators, createEsocialEvent, analyses } = useApp();
  const [cpf, setCpf] = useState('');
  const [matricula, setMatricula] = useState('');
  const [collabId, setCollabId] = useState('');
  const [analysisId, setAnalysisId] = useState('');
  const [desc, setDesc] = useState('');

  const onCreate = () => {
    const collab = collaborators.find((c) => c.id === collabId);
    void createEsocialEvent({
      eventType,
      collaboratorId: collabId || undefined,
      analysisId: analysisId || undefined,
      payload: {
        cpfTrab: cpf || undefined,
        matricula: matricula || collab?.matricula,
        setor: collab?.setor,
        descricao: desc,
        atividade: collab?.cargo,
        agente: eventType === 'S-2240' ? (desc || 'Postura inadequada — ErgoSensePro') : undefined,
        dtAcid: eventType === 'S-2210' ? new Date().toISOString().slice(0, 10) : undefined,
        dtIniCondicao: eventType === 'S-2240' ? new Date().toISOString().slice(0, 10) : undefined,
        exames: eventType === 'S-2220' ? [{ dtExm: new Date().toISOString().slice(0, 10), procRealizado: '0295' }] : undefined,
      },
    });
    setDesc('');
  };

  return (
    <div className="scroll">
      <div className="hl mb12">
        <div className="lbl" style={{ color: 'var(--cyan)' }}>{title}</div>
      </div>
      <div className="card">
        <label className="lbl">Colaborador</label>
        <select className="inp" value={collabId} onChange={(e) => { setCollabId(e.target.value); const c = collaborators.find((x) => x.id === e.target.value); if (c) setMatricula(c.matricula); }}>
          <option value="">Selecionar…</option>
          {collaborators.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.matricula}</option>)}
        </select>
        <input className="inp" value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="CPF trabalhador (11 dígitos)" />
        <input className="inp" value={matricula} onChange={(e) => setMatricula(e.target.value)} placeholder="Matrícula eSocial" />
        <select className="inp" value={analysisId} onChange={(e) => setAnalysisId(e.target.value)}>
          <option value="">Vincular análise ergonômica (opcional)</option>
          {analyses.slice(0, 20).map((a) => <option key={a.id} value={a.id}>{a.activity} · {a.date}</option>)}
        </select>
        <textarea className="inp" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Descrição / agente nocivo / lesão" />
        <button className="btn bp" onClick={onCreate}>Criar evento + XML</button>
      </div>
      <EventList tipo={eventType} />
    </div>
  );
}

export function EsocialS2210Screen() {
  return <EsocialEventForm eventType="S-2210" title="S-2210 — Comunicação de Acidente de Trabalho (CAT)" />;
}

export function EsocialS2220Screen() {
  return <EsocialEventForm eventType="S-2220" title="S-2220 — Monitoramento da Saúde do Trabalhador" />;
}

export function EsocialS2240Screen() {
  return <EsocialEventForm eventType="S-2240" title="S-2240 — Condições Ambientais do Trabalho" />;
}

export function EsocialHistoricoScreen() {
  const { esocialHistory, esocialEventos } = useApp();
  return (
    <div className="scroll">
      <div className="sec"><span className="stl">Histórico eSocial</span></div>
      {esocialHistory.map((h) => (
        <div key={h.id} className="card">
          <div style={{ fontWeight: 600, fontSize: 13 }}>{h.action}</div>
          <div style={{ fontSize: 11, color: 'var(--t1)' }}>
            {h.userName ?? '—'} · {new Date(h.createdAt).toLocaleString('pt-BR')}
            {h.eventDbId ? ` · Evento #${h.eventDbId}` : ''}
          </div>
        </div>
      ))}
      {!esocialHistory.length && <p style={{ fontSize: 12, color: 'var(--t2)' }}>Sem registros.</p>}
      <div className="sec mt12"><span className="stl">Eventos ({esocialEventos.length})</span></div>
      <EventList />
    </div>
  );
}

export function EsocialConfigScreen() {
  const { esocialConfig, updateEsocialConfig, esocialDashboard } = useApp();
  const [nrInsc, setNrInsc] = useState(esocialConfig?.nrInsc ?? '');
  const [razao, setRazao] = useState(esocialConfig?.razaoSocial ?? '');
  const [ambiente, setAmbiente] = useState(esocialConfig?.ambiente ?? 2);
  const [govbr, setGovbr] = useState(esocialConfig?.govbrHabilitado ?? false);
  const [govbrModo, setGovbrModo] = useState<'MOCK' | 'HTTP'>(esocialConfig?.govbrModo ?? 'MOCK');
  const [pfxPath, setPfxPath] = useState(esocialConfig?.certificadoPfxPath ?? '');

  return (
    <div className="scroll">
      <div className="hl mb12">
        <div className="lbl" style={{ color: 'var(--cyan)' }}>INTEGRAÇÃO gov.br · S-1.3</div>
        <p style={{ fontSize: 12, color: 'var(--t1)', margin: 0 }}>
          Ambiente {ambiente === 1 ? 'Produção' : 'Produção Restrita'} · Certificado ICP-Brasil A1/A3 (PFX)
        </p>
      </div>
      <div className="card">
        <label className="lbl">CNPJ empregador (nrInsc)</label>
        <input className="inp" value={nrInsc} onChange={(e) => setNrInsc(e.target.value)} placeholder="00.000.000/0000-00" />
        <input className="inp" value={razao} onChange={(e) => setRazao(e.target.value)} placeholder="Razão social" />
        <label className="lbl">Ambiente eSocial</label>
        <select className="inp" value={ambiente} onChange={(e) => setAmbiente(Number(e.target.value))}>
          <option value={2}>2 — Produção Restrita (homologação)</option>
          <option value={1}>1 — Produção</option>
        </select>
        <label className="lbl">Modo gov.br</label>
        <select className="inp" value={govbrModo} onChange={(e) => setGovbrModo(e.target.value as 'MOCK' | 'HTTP')}>
          <option value="MOCK">MOCK — homologação interna (sem SOAP)</option>
          <option value="HTTP">HTTP — SOAP gov.br (requer mTLS + credenciais)</option>
        </select>
        <label className="lbl">Caminho certificado PFX (ICP-Brasil)</label>
        <input className="inp" value={pfxPath} onChange={(e) => setPfxPath(e.target.value)} placeholder="C:\certs\empresa.pfx" />
        <label className="row gap8" style={{ fontSize: 12, marginTop: 8 }}>
          <input type="checkbox" checked={govbr} onChange={(e) => setGovbr(e.target.checked)} />
          Habilitar transmissão gov.br
        </label>
        <button className="btn bp mt8" onClick={() => void updateEsocialConfig({
          nrInsc, razaoSocial: razao, ambiente, govbrHabilitado: govbr, govbrModo, certificadoPfxPath: pfxPath,
        })}>
          Salvar configuração
        </button>
      </div>
      <div className="card" style={{ fontSize: 11, color: 'var(--t1)' }}>
        <strong>Fluxo S-1.3:</strong> Criar → Validar XSD → Assinar ICP-Brasil → Enviar → Consultar status → Reenviar se rejeitado.
        <br />Modo: {govbrModo} · Transmissão: {esocialDashboard?.govbrHabilitado ? 'habilitada' : 'desabilitada (MOCK ainda funciona)'}.
      </div>
    </div>
  );
}
