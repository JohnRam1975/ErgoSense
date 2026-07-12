/**
 * Canal de Denúncia Corporativo — LGPD · NR-01 · Psicossocial · GRO · PGR
 */
import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  DENUNCIA_STATUS_LABELS,
  DENUNCIA_TYPE_OPTIONS,
  LGPD_DENUNCIA_CONSENT,
  denunciaSeverityColor,
  denunciaStatusColor,
  type DenunciaStatus,
  type DenunciaType,
} from '../types/denuncia';

function ProtocolBanner({ protocol, token }: { protocol?: string; token?: string }) {
  if (!protocol) return null;
  return (
    <div className="card" style={{ background: 'var(--g10)', border: '1px solid var(--green)', marginBottom: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)' }}>Protocolo: {protocol}</div>
      {token && (
        <div style={{ fontSize: 11, color: 'var(--t1)', marginTop: 4, wordBreak: 'break-all' }}>
          Token de acompanhamento (guarde em local seguro): <code>{token}</code>
        </div>
      )}
    </div>
  );
}

export function DenunciaDashboardScreen() {
  const { go, denunciaDashboard, denuncias, refreshDenuncias, dbConnected } = useApp();
  const d = denunciaDashboard;

  return (
    <div className="scroll scroll--dashboard">
      <div className="hl-r" style={{ marginBottom: 14 }}>
        <div className="row gap8 mb8">
          <span style={{ fontSize: 18 }}>📢</span>
          <span className="lbl" style={{ color: 'var(--red)' }}>CANAL DE DENÚNCIA CORPORATIVO</span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--t1)', margin: 0 }}>
          LGPD · denúncia anônima ou identificada · integração Psicossocial · Inventário · GRO · PGR
        </p>
      </div>

      <div className="sg" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
        <div className="sc" onClick={() => go('denuncia-lista')}>
          <div className="sv" style={{ color: 'var(--cyan)' }}>{d?.total ?? denuncias.length}</div>
          <div className="sl">Total registradas</div>
        </div>
        <div className="sc" onClick={() => go('denuncia-lista')}>
          <div className="sv" style={{ color: 'var(--amber)' }}>{d?.open ?? 0}</div>
          <div className="sl">Em aberto</div>
        </div>
        <div className="sc" onClick={() => go('denuncia-lista')}>
          <div className="sv" style={{ color: 'var(--red)' }}>{d?.critical ?? 0}</div>
          <div className="sl">Gravidade crítica</div>
        </div>
        <div className="sc">
          <div className="sv" style={{ color: 'var(--green)' }}>{d?.indicators?.taxaConclusao ?? 0}%</div>
          <div className="sl">Taxa conclusão</div>
        </div>
        <div className="sc">
          <div className="sv" style={{ color: 'var(--purple, var(--cyan))' }}>{d?.anonymous ?? 0}</div>
          <div className="sl">Anônimas</div>
        </div>
        <div className="sc">
          <div className="sv" style={{ color: 'var(--green)' }}>{d?.integratedInventory ?? 0}</div>
          <div className="sl">Integradas GRO/PGR</div>
        </div>
      </div>

      {d?.byType && (
        <>
          <div className="sec mt12"><span className="stl">Por tipo</span></div>
          <div className="card">
            {DENUNCIA_TYPE_OPTIONS.map((t) => (
              <div key={t.value} className="bar-row" style={{ marginBottom: 6 }}>
                <span>{t.icon} {t.label}</span>
                <span className="t2">{d.byType[t.value] ?? 0}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="row gap8 mt12">
        <button type="button" className="btn bp" style={{ flex: 1 }} onClick={() => go('denuncia-nova')}>+ Nova denúncia</button>
        <button type="button" className="btn bs" style={{ flex: 1 }} onClick={() => void refreshDenuncias()} disabled={!dbConnected}>Atualizar</button>
        <button type="button" className="btn bs" style={{ flex: 1 }} onClick={() => go('denuncia-lista')}>Investigações</button>
      </div>
    </div>
  );
}

export function DenunciaListScreen() {
  const { go, denuncias, openDenunciaDetail, dbConnected } = useApp();
  const [filter, setFilter] = useState<DenunciaStatus | ''>('');

  const filtered = useMemo(
    () => denuncias.filter((d) => !filter || d.status === filter),
    [denuncias, filter],
  );

  return (
    <div className="scroll">
      <div className="sec row" style={{ justifyContent: 'space-between' }}>
        <span className="stl">Denúncias registradas</span>
        <button type="button" className="btn bp" style={{ width: 'auto', padding: '6px 12px', fontSize: 11 }} onClick={() => go('denuncia-nova')}>+ Nova</button>
      </div>

      <select className="inp mb8" value={filter} onChange={(e) => setFilter(e.target.value as DenunciaStatus | '')}>
        <option value="">Todos os status</option>
        {(Object.keys(DENUNCIA_STATUS_LABELS) as DenunciaStatus[]).map((s) => (
          <option key={s} value={s}>{DENUNCIA_STATUS_LABELS[s]}</option>
        ))}
      </select>

      {!dbConnected ? (
        <div className="card"><p style={{ fontSize: 12, color: 'var(--t2)', margin: 0 }}>API offline</p></div>
      ) : filtered.length === 0 ? (
        <div className="card"><p style={{ fontSize: 12, color: 'var(--t2)', margin: 0 }}>Nenhuma denúncia registrada.</p></div>
      ) : (
        filtered.map((d) => (
          <div key={d.id} className="card list-row" style={{ cursor: 'pointer', marginBottom: 8 }} onClick={() => openDenunciaDetail(d.id)}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <strong style={{ fontSize: 13 }}>{d.protocol}</strong>
              <span style={{ fontSize: 10, color: denunciaStatusColor(d.status) }}>{DENUNCIA_STATUS_LABELS[d.status]}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--t2)' }}>
              {d.typeLabel} · {d.modality} · <span style={{ color: denunciaSeverityColor(d.severity) }}>{d.severity}</span>
            </div>
            {d.inventoryRiskId && (
              <div style={{ fontSize: 10, color: 'var(--green)', marginTop: 4 }}>Integrada Inventário/GRO #{d.inventoryRiskId}</div>
            )}
          </div>
        ))
      )}

      <button type="button" className="btn bs mt8" onClick={() => go('denuncia-dashboard')}>Voltar</button>
    </div>
  );
}

export function DenunciaFormScreen() {
  const { go, denunciaDraft, setDenunciaDraft, submitDenuncia, sectors, dbConnected, showToast } = useApp();
  const [lastProtocol, setLastProtocol] = useState<{ protocol: string; token?: string } | null>(null);

  const isAnon = denunciaDraft.modality === 'ANONIMA';

  const handleSubmit = async () => {
    if (!denunciaDraft.description.trim()) {
      showToast('Descreva a denúncia', 'warn');
      return;
    }
    if (!denunciaDraft.lgpdConsent) {
      showToast('Consentimento LGPD obrigatório', 'warn');
      return;
    }
    if (!isAnon && !denunciaDraft.reporterName.trim()) {
      showToast('Informe seu nome para denúncia identificada', 'warn');
      return;
    }
    const result = await submitDenuncia();
    if (result?.protocol) {
      setLastProtocol({ protocol: result.protocol, token: result.accessToken });
    }
  };

  const set = <K extends keyof typeof denunciaDraft>(k: K, v: (typeof denunciaDraft)[K]) => {
    setDenunciaDraft({ [k]: v });
  };

  return (
    <div className="scroll">
      <div className="sec"><span className="stl">Registrar denúncia</span></div>

      <ProtocolBanner protocol={lastProtocol?.protocol} token={lastProtocol?.token} />

      <div className="card">
        <label className="lbl">Tipo *</label>
        <select className="inp" value={denunciaDraft.type} onChange={(e) => set('type', e.target.value as DenunciaType)}>
          {DENUNCIA_TYPE_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
          ))}
        </select>

        <label className="lbl mt8">Modalidade *</label>
        <select className="inp" value={denunciaDraft.modality} onChange={(e) => set('modality', e.target.value as 'ANONIMA' | 'IDENTIFICADA')}>
          <option value="ANONIMA">Anônima — sem identificação pessoal</option>
          <option value="IDENTIFICADA">Identificada — dados para retorno</option>
        </select>

        <label className="lbl mt8">Setor (opcional)</label>
        <select className="inp" value={denunciaDraft.sectorName} onChange={(e) => set('sectorName', e.target.value)}>
          <option value="">— Não informado —</option>
          {sectors.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <label className="lbl mt8">Descrição dos fatos *</label>
        <textarea className="inp" rows={5} value={denunciaDraft.description} onChange={(e) => set('description', e.target.value)} placeholder="Descreva o ocorrido com o máximo de detalhes possível…" />

        <label className="lbl mt8">Local</label>
        <input className="inp" value={denunciaDraft.location} onChange={(e) => set('location', e.target.value)} />

        <label className="lbl mt8">Data do ocorrido</label>
        <input className="inp" type="date" value={denunciaDraft.occurrenceDate} onChange={(e) => set('occurrenceDate', e.target.value)} />

        {!isAnon && (
          <>
            <label className="lbl mt8">Seu nome *</label>
            <input className="inp" value={denunciaDraft.reporterName} onChange={(e) => set('reporterName', e.target.value)} />
            <label className="lbl mt8">E-mail</label>
            <input className="inp" type="email" value={denunciaDraft.reporterEmail} onChange={(e) => set('reporterEmail', e.target.value)} />
            <label className="lbl mt8">Telefone</label>
            <input className="inp" value={denunciaDraft.reporterPhone} onChange={(e) => set('reporterPhone', e.target.value)} />
          </>
        )}

        <label className="row gap8 mt12" style={{ alignItems: 'flex-start', fontSize: 11, cursor: 'pointer' }}>
          <input type="checkbox" checked={denunciaDraft.lgpdConsent} onChange={(e) => set('lgpdConsent', e.target.checked)} />
          <span>{LGPD_DENUNCIA_CONSENT}</span>
        </label>
      </div>

      <div className="row gap8 mt12">
        <button type="button" className="btn bp" style={{ flex: 1 }} onClick={() => void handleSubmit()} disabled={!dbConnected}>Enviar denúncia</button>
        <button type="button" className="btn bs" style={{ flex: 1 }} onClick={() => go('denuncia-dashboard')}>Cancelar</button>
      </div>
    </div>
  );
}

export function DenunciaDetailScreen() {
  const {
    denunciaDetail,
    updateDenunciaStatus,
    addDenunciaTreatment,
    addDenunciaEvidence,
    integrateDenuncia,
    concludeDenuncia,
    go,
    dbConnected,
  } = useApp();
  const [tratDesc, setTratDesc] = useState('');
  const [evDesc, setEvDesc] = useState('');
  const [conclusao, setConclusao] = useState('');

  const d = denunciaDetail;
  if (!d) {
    return (
      <div className="scroll">
        <div className="card"><p style={{ fontSize: 12, margin: 0 }}>Selecione uma denúncia na lista.</p></div>
        <button type="button" className="btn bs mt8" onClick={() => go('denuncia-lista')}>Voltar</button>
      </div>
    );
  }

  return (
    <div className="scroll">
      <div className="sec row" style={{ justifyContent: 'space-between' }}>
        <span className="stl">{d.protocol}</span>
        <span style={{ fontSize: 11, color: denunciaStatusColor(d.status) }}>{DENUNCIA_STATUS_LABELS[d.status]}</span>
      </div>

      <div className="card">
        <div style={{ fontSize: 12, marginBottom: 8 }}><strong>{d.typeLabel}</strong> · {d.modality} · {d.severity}</div>
        <p style={{ fontSize: 12, color: 'var(--t1)', margin: '0 0 8px' }}>{d.description}</p>
        {d.location && <div style={{ fontSize: 11, color: 'var(--t2)' }}>Local: {d.location}</div>}
        {(d.inventoryRiskId || d.psicoFactorId) && (
          <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 8 }}>
            Integração NR-01: Inventário #{d.inventoryRiskId ?? '—'} · Psico #{d.psicoFactorId ?? '—'} · GRO #{d.groActionPlanId ?? '—'}
          </div>
        )}
      </div>

      <div className="sec mt12"><span className="stl">Fluxo de investigação</span></div>
      <div className="card row gap8" style={{ flexWrap: 'wrap' }}>
        {(['EM_TRIAGEM', 'EM_INVESTIGACAO', 'EM_TRATATIVA'] as DenunciaStatus[]).map((s) => (
          <button key={s} type="button" className="btn bs" style={{ width: 'auto', margin: 0, fontSize: 10 }} disabled={!dbConnected} onClick={() => void updateDenunciaStatus(s)}>
            {DENUNCIA_STATUS_LABELS[s]}
          </button>
        ))}
        <button type="button" className="btn bp" style={{ width: 'auto', margin: 0, fontSize: 10 }} disabled={!dbConnected} onClick={() => void integrateDenuncia()}>
          Integrar GRO/PGR
        </button>
      </div>

      <div className="sec mt12"><span className="stl">Tratativas ({d.treatments?.length ?? 0})</span></div>
      <div className="card">
        {(d.treatments ?? []).map((t) => (
          <div key={t.id} style={{ fontSize: 11, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
            <strong>{t.type}</strong> — {t.description} · {t.status}
          </div>
        ))}
        <input className="inp mt8" value={tratDesc} onChange={(e) => setTratDesc(e.target.value)} placeholder="Nova tratativa / investigação" />
        <button type="button" className="btn bs mt4" disabled={!dbConnected} onClick={() => { void addDenunciaTreatment(tratDesc).then(() => setTratDesc('')); }}>+ Tratativa</button>
      </div>

      <div className="sec mt12"><span className="stl">Evidências ({d.evidences?.length ?? 0})</span></div>
      <div className="card">
        {(d.evidences ?? []).map((e) => (
          <div key={e.id} style={{ fontSize: 11, padding: '4px 0' }}>{e.description} {e.reference && `· ${e.reference}`}</div>
        ))}
        <input className="inp mt8" value={evDesc} onChange={(e) => setEvDesc(e.target.value)} placeholder="Registrar evidência" />
        <button type="button" className="btn bs mt4" disabled={!dbConnected} onClick={() => { void addDenunciaEvidence(evDesc).then(() => setEvDesc('')); }}>+ Evidência</button>
      </div>

      <div className="sec mt12"><span className="stl">Histórico</span></div>
      <div className="card">
        {(d.history ?? []).slice(0, 15).map((h) => (
          <div key={h.id} style={{ fontSize: 10, color: 'var(--t2)', padding: '3px 0' }}>
            {new Date(h.createdAt).toLocaleString('pt-BR')} — {h.action} · {h.userName}
          </div>
        ))}
      </div>

      <div className="sec mt12"><span className="stl">Encerramento</span></div>
      <div className="card">
        <textarea className="inp" rows={3} value={conclusao} onChange={(e) => setConclusao(e.target.value)} placeholder="Conclusão da investigação" />
        <button type="button" className="btn bp mt4" disabled={!dbConnected || !conclusao.trim()} onClick={() => void concludeDenuncia(conclusao)}>
          Concluir denúncia
        </button>
      </div>

      <button type="button" className="btn bs mt12" onClick={() => go('denuncia-lista')}>Voltar à lista</button>
    </div>
  );
}
