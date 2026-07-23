/**
 * SST — APR · EPI · EPC · Inspeções · Auditorias · NC · CAPA · Treinamentos
 */
import { useState } from 'react';
import { useApp } from '../context/AppContext';

function sevColor(s: string) {
  return s === 'critico' ? 'var(--red)' : s === 'alto' ? 'var(--orange)' : s === 'medio' ? 'var(--amber)' : 'var(--green)';
}

export function SstDashboardScreen() {
  const { go, sstDashboard } = useApp();
  const d = sstDashboard;
  return (
    <div className="scroll scroll--dashboard">
      <div className="hl mb14">
        <div className="lbl" style={{ color: 'var(--green)' }}>SST — SEGURANÇA DO TRABALHO</div>
        <p style={{ fontSize: 12, color: 'var(--t1)', margin: 0 }}>Integrado ao Inventário NR-01 · PGR · GRO</p>
      </div>
      <div className="sg" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
        {[
          { v: d?.apr ?? 0, l: 'APR', c: 'var(--cyan)', s: 'sst-apr' },
          { v: d?.epi ?? 0, l: 'EPI (NR-6)', c: 'var(--amber)', s: 'sst-epi-epc' },
          { v: d?.ncAbertas ?? 0, l: 'NC abertas', c: 'var(--red)', s: 'sst-nc-capa' },
          { v: d?.capaAbertas ?? 0, l: 'CAPA abertas', c: 'var(--orange)', s: 'sst-nc-capa' },
          { v: d?.inspecoes ?? 0, l: 'Inspeções', c: 'var(--cyan)', s: 'sst-inspecoes' },
          { v: d?.treinamentos ?? 0, l: 'Treinamentos', c: 'var(--green)', s: 'sst-treinamentos' },
        ].map((k) => (
          <div key={k.l} className="sc" onClick={() => go(k.s as never)}>
            <div className="sv" style={{ color: k.c }}>{k.v}</div>
            <div className="sl">{k.l}</div>
          </div>
        ))}
      </div>
      {(d?.epiCaVencidos ?? 0) > 0 && (
        <div className="hl-r mt12"><span style={{ fontSize: 12 }}>⚠️ {d!.epiCaVencidos} EPI(s) com CA vencido</span></div>
      )}
      <div className="sec mt12"><span className="stl">Módulos</span></div>
      {[
        { id: 'sst-apr', ico: '📋', label: 'APR', sub: 'Análise Preliminar de Riscos' },
        { id: 'sst-epi-epc', ico: '🦺', label: 'EPI · EPC', sub: 'NR-6 · Proteção coletiva' },
        { id: 'sst-inspecoes', ico: '🔍', label: 'Inspeções', sub: 'Checklists · NC automática' },
        { id: 'sst-auditorias', ico: '📊', label: 'Auditorias', sub: 'NR-01 · ISO 45001' },
        { id: 'sst-nc-capa', ico: '⚠️', label: 'NC · CAPA', sub: 'Não conformidades · Ações' },
        { id: 'sst-treinamentos', ico: '🎓', label: 'Treinamentos', sub: 'Capacitação SST' },
        { id: 'sst-relatorios', ico: '📄', label: 'Relatórios', sub: 'PDF integrado PGR' },
        { id: 'inventario-dashboard', ico: '🔗', label: 'Inventário de Riscos', sub: 'Vínculo NR-01' },
        { id: 'pgr-dashboard', ico: '📑', label: 'PGR', sub: 'Snapshot com SST' },
      ].map((item) => (
        <button key={item.id} className="ac" onClick={() => go(item.id as never)}>
          <div className="av" style={{ background: 'var(--g10)', fontSize: 22 }}>{item.ico}</div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--t0)' }}>{item.label}</div>
            <div style={{ fontSize: 11, color: 'var(--t1)' }}>{item.sub}</div>
          </div>
          <span style={{ color: 'var(--green)' }}>›</span>
        </button>
      ))}
    </div>
  );
}

export function SstAprScreen() {
  const { sstApr, createSstApr, riskInventory } = useApp();
  const [titulo, setTitulo] = useState('');
  const [atividade, setAtividade] = useState('');
  return (
    <div className="scroll">
      <div className="card">
        <label className="lbl">Nova APR</label>
        <input className="inp" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título da APR" />
        <input className="inp" value={atividade} onChange={(e) => setAtividade(e.target.value)} placeholder="Atividade analisada" />
        <button className="btn bp" onClick={() => void createSstApr({ title: titulo, activity: atividade })}>Registrar APR</button>
      </div>
      {sstApr.map((a) => (
        <div key={a.id} className="card">
          <div style={{ fontWeight: 600, fontSize: 13 }}>{a.title}</div>
          <div style={{ fontSize: 11, color: 'var(--t1)' }}>{a.activity} · {a.status}</div>
          {a.riskId && <div style={{ fontSize: 10, color: 'var(--green)' }}>✓ Inventário #{a.riskId}</div>}
        </div>
      ))}
      {riskInventory.length > 0 && <p style={{ fontSize: 11, color: 'var(--t2)' }}>Vincule APRs a riscos do inventário na edição (API PUT).</p>}
    </div>
  );
}

export function SstEpiEpcScreen() {
  const { sstEpi, sstEpc, createSstEpi, createSstEpc } = useApp();
  const [aba, setAba] = useState<'epi' | 'epc'>('epi');
  const [desc, setDesc] = useState('');
  return (
    <div className="scroll">
      <div className="row gap8 mb12">
        <button className={`tag ${aba === 'epi' ? 'on' : ''}`} onClick={() => setAba('epi')}>EPI (NR-6)</button>
        <button className={`tag ${aba === 'epc' ? 'on' : ''}`} onClick={() => setAba('epc')}>EPC</button>
      </div>
      <div className="card">
        <input className="inp" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Descrição" />
        <button className="btn bp" onClick={() => {
          if (aba === 'epi') void createSstEpi({ description: desc, type: 'Proteção individual' });
          else void createSstEpc({ description: desc, type: 'Proteção coletiva' });
          setDesc('');
        }}>Cadastrar</button>
      </div>
      {aba === 'epi' ? sstEpi.map((e) => (
        <div key={e.id} className="card">
          <div style={{ fontWeight: 600, fontSize: 13 }}>{e.description}</div>
          <div style={{ fontSize: 11, color: 'var(--t1)' }}>CA: {e.ca || '—'} · Validade: {e.caExpiry ?? '—'}</div>
        </div>
      )) : sstEpc.map((e) => (
        <div key={e.id} className="card">
          <div style={{ fontWeight: 600, fontSize: 13 }}>{e.description}</div>
          <div style={{ fontSize: 11, color: 'var(--t1)' }}>{e.location} · {e.compliance}</div>
        </div>
      ))}
    </div>
  );
}

export function SstInspecoesScreen() {
  const { sstInspecoes, createSstInspecao } = useApp();
  const [titulo, setTitulo] = useState('');
  return (
    <div className="scroll">
      <div className="card">
        <input className="inp" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título da inspeção" />
        <button className="btn bp" onClick={() => { void createSstInspecao(titulo); setTitulo(''); }}>Programar inspeção</button>
      </div>
      {sstInspecoes.map((i) => (
        <div key={i.id} className="card">
          <div className="row gap8 jb">
            <div style={{ fontWeight: 600, fontSize: 13 }}>{i.title}</div>
            <span className="badge" style={{ color: i.result === 'nao_conforme' ? 'var(--red)' : 'var(--green)' }}>{i.status}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--t1)' }}>Programada: {i.scheduledDate ?? '—'} · Resultado: {i.result ?? 'pendente'}</div>
        </div>
      ))}
    </div>
  );
}

export function SstAuditoriasScreen() {
  const { sstAuditorias, createSstAuditoria } = useApp();
  const [titulo, setTitulo] = useState('');
  return (
    <div className="scroll">
      <div className="card">
        <input className="inp" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título da auditoria" />
        <button className="btn bp" onClick={() => { void createSstAuditoria(titulo); setTitulo(''); }}>Planejar auditoria</button>
      </div>
      {sstAuditorias.map((a) => (
        <div key={a.id} className="card">
          <div style={{ fontWeight: 600, fontSize: 13 }}>{a.title}</div>
          <div style={{ fontSize: 11, color: 'var(--t1)' }}>{a.standard} · {a.status}</div>
        </div>
      ))}
    </div>
  );
}

export function SstNcCapaScreen() {
  const { sstNc, sstCapa, createSstNc, createSstCapa } = useApp();
  const [aba, setAba] = useState<'nc' | 'capa'>('nc');
  const [desc, setDesc] = useState('');
  const [ncId, setNcId] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (aba === 'nc') {
        const ok = await createSstNc({ description: desc });
        if (ok) setDesc('');
      } else {
        const ok = await createSstCapa({ description: desc, ncId: ncId || undefined, syncGro: true });
        if (ok) {
          setDesc('');
          setNcId('');
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="scroll">
      <div className="row gap8 mb12">
        <button className={`tag ${aba === 'nc' ? 'on' : ''}`} onClick={() => setAba('nc')}>Não Conformidades</button>
        <button className={`tag ${aba === 'capa' ? 'on' : ''}`} onClick={() => setAba('capa')}>CAPA</button>
      </div>
      <div className="card">
        <textarea className="inp" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={aba === 'nc' ? 'Descrição da NC' : 'Ação CAPA'} />
        {aba === 'capa' && (
          <select className="inp" value={ncId} onChange={(e) => setNcId(e.target.value)}>
            <option value="">NC vinculada (opcional)</option>
            {sstNc.filter((n) => n.status !== 'fechada').map((n) => <option key={n.id} value={n.id}>{n.title}</option>)}
          </select>
        )}
        <button className="btn bp" disabled={busy} onClick={() => void handleSubmit()}>
          {busy ? 'Salvando…' : aba === 'nc' ? 'Registrar NC' : 'Criar CAPA (+ GRO)'}
        </button>
      </div>
      {aba === 'nc' ? sstNc.map((n) => (
        <div key={n.id} className="card" style={{ borderLeft: `3px solid ${sevColor(n.severity)}` }}>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{n.title}</div>
          <div style={{ fontSize: 11, color: 'var(--t1)' }}>{n.description.slice(0, 80)}… · {n.status}</div>
        </div>
      )) : sstCapa.map((c) => (
        <div key={c.id} className="card">
          <div style={{ fontWeight: 600, fontSize: 13 }}>{c.type} — {c.description.slice(0, 60)}</div>
          <div style={{ fontSize: 11, color: 'var(--t1)' }}>{c.status}{c.groPlanId ? ` · GRO #${c.groPlanId}` : ''}</div>
        </div>
      ))}
    </div>
  );
}

export function SstTreinamentosScreen() {
  const { sstTreinamentos, createSstTreinamento } = useApp();
  const [titulo, setTitulo] = useState('');
  return (
    <div className="scroll">
      <div className="card">
        <input className="inp" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título do treinamento" />
        <button className="btn bp" onClick={() => { void createSstTreinamento(titulo); setTitulo(''); }}>Programar treinamento</button>
      </div>
      {sstTreinamentos.map((t) => (
        <div key={t.id} className="card">
          <div style={{ fontWeight: 600, fontSize: 13 }}>{t.title}</div>
          <div style={{ fontSize: 11, color: 'var(--t1)' }}>{t.scheduledDate ?? '—'} · {t.status} · {t.participants} participantes</div>
        </div>
      ))}
    </div>
  );
}

export function SstRelatoriosScreen() {
  const { sstReport, generateSstReport, downloadSstPdf, go } = useApp();
  return (
    <div className="scroll">
      <div className="hl mb12">
        <div className="lbl" style={{ color: 'var(--green)' }}>RELATÓRIO SST INTEGRADO</div>
        <p style={{ fontSize: 12, color: 'var(--t1)', margin: 0 }}>Incluído automaticamente no snapshot PGR (seção SST).</p>
      </div>
      <button className="btn bp mb8" onClick={() => void generateSstReport()}>Gerar relatório</button>
      {sstReport && (
        <>
          <div className="card">
            <div style={{ fontSize: 13, fontWeight: 600 }}>{sstReport.title}</div>
            <div style={{ fontSize: 11, color: 'var(--t1)', marginTop: 6 }}>
              NC abertas: {sstReport.dashboard.ncAbertas} · CAPA: {sstReport.dashboard.capaAbertas}<br />
              Riscos vinculados: {sstReport.integracao.risksLinked} · CAPA→GRO: {sstReport.integracao.capaGroLinked}
            </div>
          </div>
          <button className="btn bp" onClick={() => downloadSstPdf()}>Exportar PDF</button>
        </>
      )}
      <button className="btn bs mt12" onClick={() => go('pgr-dashboard')}>Ir para PGR →</button>
    </div>
  );
}
