/**
 * PGR — Programa de Gerenciamento de Riscos (NR-01)
 */
import { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  PGR_SIGNATURE_LABELS,
  PGR_STATUS_LABELS,
  pgrActionLabel,
  statusColor,
  type PgrSignatureType,
} from '../types/pgr';

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString('pt-BR');
  } catch {
    return iso;
  }
}

export function PgrDashboardScreen() {
  const { go, pgrProgram, pgrVersions, dbConnected, generatePgrVersion, updatePgrProgram } = useApp();
  const active = pgrVersions.find((v) => v.id === pgrProgram?.activeVersionId);
  const draft = pgrVersions.filter((v) => v.status === 'RASCUNHO' || v.status === 'EM_REVISAO').length;

  return (
    <div className="scroll scroll--dashboard">
      <div className="hl-r" style={{ marginBottom: 14 }}>
        <div className="row gap8 mb8">
          <span style={{ fontSize: 18 }}>📑</span>
          <span className="lbl" style={{ color: 'var(--red)' }}>PGR — PROGRAMA DE GERENCIAMENTO DE RISCOS</span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--t1)', margin: 0 }}>
          Inventário e plano de ação gerados automaticamente a partir do PostgreSQL. Versionamento, aprovação e assinaturas persistidos.
        </p>
      </div>

      <div className="sg" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
        <div className="sc" onClick={() => go('pgr-versoes')}>
          <div className="sv" style={{ color: 'var(--cyan)' }}>{pgrVersions.length}</div>
          <div className="sl">Versões</div>
        </div>
        <div className="sc" onClick={() => go('pgr-versoes')}>
          <div className="sv" style={{ color: 'var(--green)' }}>{active?.number ?? '—'}</div>
          <div className="sl">Versão ativa</div>
        </div>
        <div className="sc" onClick={() => go('pgr-versoes')}>
          <div className="sv" style={{ color: 'var(--amber)' }}>{draft}</div>
          <div className="sl">Rascunhos / revisão</div>
        </div>
        <div className="sc" onClick={() => go('pgr-historico')}>
          <div className="sv" style={{ color: 'var(--orange)' }}>NR-01</div>
          <div className="sl">Trilha auditável</div>
        </div>
      </div>

      {pgrProgram && (
        <div className="card mt12">
          <div className="lbl">Responsáveis do programa</div>
          <input
            className="inp"
            value={pgrProgram.technicalResponsible}
            onChange={(e) => updatePgrProgram({ technicalResponsible: e.target.value })}
            placeholder="Responsável técnico (SESMT / Ergonomista)"
            disabled={!dbConnected}
          />
          <input
            className="inp mt8"
            value={pgrProgram.legalResponsible}
            onChange={(e) => updatePgrProgram({ legalResponsible: e.target.value })}
            placeholder="Representante legal / empregador"
            disabled={!dbConnected}
          />
        </div>
      )}

      <div className="row gap8 mt12 flex-wrap">
        <button type="button" className="btn bp" style={{ flex: 1 }} disabled={!dbConnected} onClick={() => void generatePgrVersion()}>
          Gerar nova versão
        </button>
        <button type="button" className="btn bs" style={{ flex: 1 }} onClick={() => go('pgr-versoes')}>
          Versões
        </button>
        <button type="button" className="btn bs" style={{ flex: 1 }} onClick={() => go('pgr-historico')}>
          Histórico
        </button>
      </div>
    </div>
  );
}

export function PgrVersionsScreen() {
  const { go, pgrVersions, openPgrVersion, dbConnected, generatePgrVersion } = useApp();

  return (
    <div className="scroll">
      <div className="sec row" style={{ justifyContent: 'space-between' }}>
        <span className="stl">Controle de versões</span>
        <button type="button" className="btn bp" style={{ width: 'auto', padding: '6px 12px', fontSize: 11 }} disabled={!dbConnected} onClick={() => void generatePgrVersion()}>
          + Nova versão
        </button>
      </div>

      {pgrVersions.length === 0 ? (
        <div className="card">
          <p style={{ fontSize: 12, color: 'var(--t2)', margin: '0 0 12px' }}>
            Nenhuma versão. Gere a primeira — o sistema compõe inventário e plano de ação automaticamente.
          </p>
          <button type="button" className="btn bp" disabled={!dbConnected} onClick={() => void generatePgrVersion()}>
            Gerar PGR v1.0
          </button>
        </div>
      ) : (
        pgrVersions.map((v) => (
          <div key={v.id} className="card" style={{ marginBottom: 10, cursor: 'pointer' }} onClick={() => openPgrVersion(v.id)}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <strong>v{v.number}</strong>
              <span style={{ fontSize: 10, fontWeight: 700, color: statusColor(v.status) }}>
                {PGR_STATUS_LABELS[v.status]}
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 4 }}>
              {v.reviewReason || '—'} · Elaborado {v.preparedAt ?? '—'}
            </div>
            {v.snapshot?.resumo && (
              <div style={{ fontSize: 11, marginTop: 6 }}>
                {v.snapshot.resumo.totalRiscos} riscos · {v.snapshot.resumo.totalAcoes} ações · {v.snapshot.resumo.totalIndicadores} indicadores
              </div>
            )}
          </div>
        ))
      )}

      <button type="button" className="btn bs mt8" onClick={() => go('pgr-dashboard')}>Voltar</button>
    </div>
  );
}

export function PgrVersionDetailScreen() {
  const {
    pgrVersionDetail,
    dbConnected,
    go,
    refreshPgrVersion,
    submitPgrApproval,
    approvePgrVersion,
    rejectPgrVersion,
    signPgrVersion,
    startPgrRevision,
    downloadPgrPdf,
  } = useApp();

  const [approverName, setApproverName] = useState('');
  const [approverRole, setApproverRole] = useState('');
  const [sigType, setSigType] = useState<PgrSignatureType>('RESPONSAVEL_TECNICO');
  const [sigName, setSigName] = useState('');
  const [sigRole, setSigRole] = useState('');

  const v = pgrVersionDetail;
  if (!v) {
    return (
      <div className="scroll">
        <div className="card"><p style={{ margin: 0, fontSize: 12 }}>Selecione uma versão na lista.</p></div>
        <button type="button" className="btn bs mt8" onClick={() => go('pgr-versoes')}>Versões</button>
      </div>
    );
  }

  const snap = v.snapshot;
  const canEdit = v.status === 'RASCUNHO' || v.status === 'EM_REVISAO';
  const pendingApproval = v.status === 'AGUARDANDO_APROVACAO';

  return (
    <div className="scroll">
      <div className="sec">
        <span className="stl">PGR v{v.number}</span>
        <span style={{ marginLeft: 8, fontSize: 11, color: statusColor(v.status) }}>{PGR_STATUS_LABELS[v.status]}</span>
      </div>

      <div className="card">
        <div className="bar-row"><span>Riscos no inventário</span><span>{snap?.resumo?.totalRiscos ?? 0}</span></div>
        <div className="bar-row"><span>Ações no plano</span><span>{snap?.resumo?.totalAcoes ?? 0}</span></div>
        <div className="bar-row"><span>Indicadores</span><span>{snap?.resumo?.totalIndicadores ?? 0}</span></div>
        <div className="bar-row"><span>Próxima revisão</span><span>{v.nextReviewAt ?? '—'}</span></div>
      </div>

      <div className="row gap8 mt8 flex-wrap">
        {canEdit && (
          <button type="button" className="btn bs" style={{ flex: 1 }} disabled={!dbConnected} onClick={() => void refreshPgrVersion(v.id)}>
            Atualizar snapshot
          </button>
        )}
        <button type="button" className="btn bp" style={{ flex: 1 }} onClick={() => downloadPgrPdf()}>
          Baixar PDF
        </button>
      </div>

      {canEdit && (
        <div className="card mt12">
          <div className="lbl">Enviar para aprovação</div>
          <input className="inp" value={approverName} onChange={(e) => setApproverName(e.target.value)} placeholder="Nome do aprovador" />
          <input className="inp mt8" value={approverRole} onChange={(e) => setApproverRole(e.target.value)} placeholder="Cargo" />
          <button
            type="button"
            className="btn bp mt8"
            disabled={!dbConnected || !approverName.trim()}
            onClick={() => void submitPgrApproval(v.id, approverName, approverRole)}
          >
            Submeter aprovação
          </button>
        </div>
      )}

      {pendingApproval && (
        <div className="card mt12">
          <div className="lbl">Decisão de aprovação</div>
          <div className="row gap8">
            <button type="button" className="btn bp" style={{ flex: 1 }} disabled={!dbConnected} onClick={() => void approvePgrVersion(v.id)}>
              Aprovar
            </button>
            <button type="button" className="btn br" style={{ flex: 1 }} disabled={!dbConnected} onClick={() => void rejectPgrVersion(v.id)}>
              Rejeitar
            </button>
          </div>
        </div>
      )}

      {v.status === 'APROVADO' && (
        <div className="card mt12">
          <button type="button" className="btn bs" disabled={!dbConnected} onClick={() => void startPgrRevision(v.id)}>
            Iniciar revisão (nova versão)
          </button>
        </div>
      )}

      <div className="card mt12">
        <div className="lbl">Registrar assinatura</div>
        <select className="inp" value={sigType} onChange={(e) => setSigType(e.target.value as PgrSignatureType)}>
          {Object.entries(PGR_SIGNATURE_LABELS).map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>
        <input className="inp mt8" value={sigName} onChange={(e) => setSigName(e.target.value)} placeholder="Nome completo" />
        <input className="inp mt8" value={sigRole} onChange={(e) => setSigRole(e.target.value)} placeholder="Cargo" />
        <button
          type="button"
          className="btn bp mt8"
          disabled={!dbConnected || !sigName.trim()}
          onClick={() => void signPgrVersion(v.id, sigType, sigName, sigRole)}
        >
          Assinar
        </button>
      </div>

      {v.signatures?.length > 0 && (
        <div className="card mt12">
          <div className="lbl">Assinaturas registradas</div>
          {v.signatures.map((s) => (
            <div key={s.id} style={{ fontSize: 12, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <strong>{PGR_SIGNATURE_LABELS[s.type]}</strong>: {s.name} — {s.role || '—'} · {fmt(s.signedAt)}
            </div>
          ))}
        </div>
      )}

      {snap?.inventarioRiscos?.length > 0 && (
        <div className="card mt12">
          <div className="lbl">Inventário (snapshot)</div>
          {snap.inventarioRiscos.slice(0, 8).map((r) => (
            <div key={r.id} style={{ fontSize: 11, padding: '4px 0' }}>
              [{r.tipo}] {r.perigo} — {r.nivel}
            </div>
          ))}
          {snap.inventarioRiscos.length > 8 && (
            <p style={{ fontSize: 11, color: 'var(--t2)', margin: '8px 0 0' }}>+ {snap.inventarioRiscos.length - 8} no PDF completo</p>
          )}
        </div>
      )}

      <button type="button" className="btn bs mt12" onClick={() => go('pgr-versoes')}>Voltar às versões</button>
    </div>
  );
}

export function PgrHistoryScreen() {
  const { pgrHistory, go, refreshPgrData, dbConnected } = useApp();

  return (
    <div className="scroll">
      <div className="sec row" style={{ justifyContent: 'space-between' }}>
        <span className="stl">Histórico PGR</span>
        <button type="button" className="btn bs" style={{ width: 'auto', padding: '6px 12px', fontSize: 11 }} disabled={!dbConnected} onClick={() => void refreshPgrData()}>
          Atualizar
        </button>
      </div>

      {pgrHistory.length === 0 ? (
        <div className="card"><p style={{ fontSize: 12, color: 'var(--t2)', margin: 0 }}>Nenhum evento registrado.</p></div>
      ) : (
        pgrHistory.map((h) => (
          <div key={h.id} className="card" style={{ marginBottom: 8 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <strong style={{ fontSize: 13 }}>{pgrActionLabel(h.action)}</strong>
              <span style={{ fontSize: 10, color: 'var(--t2)' }}>{fmt(h.createdAt)}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--t2)' }}>
              {h.versionNumber ? `v${h.versionNumber} · ` : ''}{h.userName ?? 'Sistema'}
            </div>
          </div>
        ))
      )}

      <button type="button" className="btn bs mt8" onClick={() => go('pgr-dashboard')}>Voltar</button>
    </div>
  );
}
