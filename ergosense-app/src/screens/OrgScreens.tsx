/**
 * Estrutura Organizacional NR-01 — Empresa → Unidade → Setor → Função → Atividade → Posto
 */
import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import type { OrgEntityLevel } from '../types/org';

const LEVEL_LABEL: Record<OrgEntityLevel, string> = {
  unidade: 'Unidade',
  setor: 'Setor',
  funcao: 'Função',
  atividade: 'Atividade',
  posto: 'Posto de trabalho',
};

function ChainBadge({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <span style={{ fontSize: 10, color: 'var(--t2)', marginRight: 6 }}>
      {label}: <strong style={{ color: 'var(--t1)' }}>{value}</strong>
    </span>
  );
}

export function OrgStructureScreen() {
  const {
    go,
    orgTree,
    refreshOrgData,
    createOrgEntity,
    deleteOrgEntity,
    dbConnected,
    showToast,
    selectedCompany,
  } = useApp();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [formOpen, setFormOpen] = useState(false);
  const [formLevel, setFormLevel] = useState<OrgEntityLevel>('unidade');
  const [formParentId, setFormParentId] = useState('');
  const [formName, setFormName] = useState('');

  const stats = orgTree?.stats;
  const company = orgTree?.company;

  const flatPostos = useMemo(() => {
    const list: Array<{ id: string; label: string; sector: string }> = [];
    for (const u of orgTree?.units ?? []) {
      for (const s of u.sectors ?? []) {
        for (const f of s.functions ?? []) {
          for (const a of f.activities ?? []) {
            for (const p of a.workPosts ?? []) {
              list.push({
                id: p.id,
                label: `${u.name} › ${s.name} › ${f.name} › ${a.name} › ${p.name}`,
                sector: s.name,
              });
            }
          }
        }
      }
    }
    return list;
  }, [orgTree]);

  const toggle = (key: string) => setExpanded((e) => ({ ...e, [key]: !e[key] }));

  const openCreate = (level: OrgEntityLevel, parentId = '') => {
    setFormLevel(level);
    setFormParentId(parentId);
    setFormName('');
    setFormOpen(true);
  };

  const handleCreate = async () => {
    if (!formName.trim()) {
      showToast('Informe o nome', 'warn');
      return;
    }
    const ok = await createOrgEntity(formLevel, formParentId, formName.trim());
    if (ok) {
      setFormOpen(false);
      setFormName('');
    }
  };

  return (
    <div className="scroll">
      <div className="hl mb14">
        <div className="lbl" style={{ color: 'var(--cyan)' }}>ESTRUTURA ORGANIZACIONAL · NR-01</div>
        <p style={{ fontSize: 12, color: 'var(--t1)', margin: 0 }}>
          {selectedCompany?.name} — hierarquia obrigatória para Inventário, GRO e PGR
        </p>
      </div>

      {!dbConnected && (
        <div className="hl-r mb12">
          <span style={{ fontSize: 12 }}>Conecte-se ao PostgreSQL para gerenciar a estrutura real da empresa.</span>
        </div>
      )}

      <div className="sg" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        {[
          { v: stats?.units ?? 0, l: 'Unidades' },
          { v: stats?.sectors ?? 0, l: 'Setores' },
          { v: stats?.workPosts ?? 0, l: 'Postos' },
          { v: stats?.functions ?? 0, l: 'Funções' },
          { v: stats?.activities ?? 0, l: 'Atividades' },
          { v: stats?.collaborators ?? 0, l: 'Colaboradores' },
        ].map((k) => (
          <div key={k.l} className="sc">
            <div className="sv tc">{k.v}</div>
            <div className="sl">{k.l}</div>
          </div>
        ))}
      </div>

      {company && (
        <div className="card mt12">
          <div style={{ fontFamily: 'var(--fd)', fontSize: 11, letterSpacing: 1, color: 'var(--amber)', marginBottom: 6 }}>EMPRESA</div>
          <div style={{ fontWeight: 700 }}>{company.legalName}</div>
          {company.cnpj && <div style={{ fontSize: 11, color: 'var(--t2)' }}>CNPJ: {company.cnpj}</div>}
        </div>
      )}

      <div className="row gap8 mt12">
        <button className="btn bp btn-sm" onClick={() => openCreate('unidade')}>＋ Unidade</button>
        <button className="btn bs btn-sm" onClick={() => void refreshOrgData()}>Atualizar</button>
        <button className="btn bs btn-sm" onClick={() => go('sectors')}>Setores (análises)</button>
      </div>

      <div className="sec mt12"><span className="stl">Árvore organizacional</span></div>

      {(orgTree?.units ?? []).map((u) => (
        <div key={u.id} className="card mb8">
          <div className="row" style={{ justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => toggle(`u-${u.id}`)}>
            <div>
              <span style={{ marginRight: 6 }}>{expanded[`u-${u.id}`] ? '▼' : '▶'}</span>
              <strong>🏢 {u.name}</strong>
              <span style={{ fontSize: 10, color: 'var(--t2)', marginLeft: 8 }}>{u.type}</span>
            </div>
            <button type="button" className="btn bs btn-sm" onClick={(e) => { e.stopPropagation(); openCreate('setor', u.id); }}>＋ Setor</button>
          </div>
          {expanded[`u-${u.id}`] && u.sectors.map((s) => (
            <div key={s.id} style={{ marginLeft: 16, marginTop: 8, borderLeft: '2px solid rgba(0,212,255,.15)', paddingLeft: 10 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div onClick={() => toggle(`s-${s.id}`)} style={{ cursor: 'pointer' }}>
                  {expanded[`s-${s.id}`] ? '▼' : '▶'} 🏭 <strong>{s.name}</strong>
                </div>
                <button type="button" className="btn bs btn-sm" onClick={() => openCreate('funcao', s.id)}>＋ Função</button>
              </div>
              {expanded[`s-${s.id}`] && s.functions.map((f) => (
                <div key={f.id} style={{ marginLeft: 12, marginTop: 6 }}>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <div onClick={() => toggle(`f-${f.id}`)} style={{ cursor: 'pointer', fontSize: 13 }}>
                      {expanded[`f-${f.id}`] ? '▼' : '▶'} 👔 {f.name}
                    </div>
                    <button type="button" className="btn bs btn-sm" onClick={() => openCreate('atividade', f.id)}>＋ Atividade</button>
                  </div>
                  {expanded[`f-${f.id}`] && f.activities.map((a) => (
                    <div key={a.id} style={{ marginLeft: 12, marginTop: 4 }}>
                      <div className="row" style={{ justifyContent: 'space-between' }}>
                        <div onClick={() => toggle(`a-${a.id}`)} style={{ cursor: 'pointer', fontSize: 12 }}>
                          {expanded[`a-${a.id}`] ? '▼' : '▶'} ⚙️ {a.name}
                        </div>
                        <button type="button" className="btn bs btn-sm" onClick={() => openCreate('posto', a.id)}>＋ Posto</button>
                      </div>
                      {expanded[`a-${a.id}`] && a.workPosts.map((p) => (
                        <div key={p.id} style={{ marginLeft: 12, fontSize: 12, color: 'var(--t1)', marginTop: 4 }}>
                          🪑 {p.name}
                          <span style={{ color: 'var(--t2)', marginLeft: 8 }}>
                            {p.collaboratorsCount ?? 0} colab · {p.risksCount ?? 0} riscos
                          </span>
                          <button
                            type="button"
                            className="btn bs btn-sm"
                            style={{ marginLeft: 8, padding: '2px 6px' }}
                            onClick={() => void deleteOrgEntity('posto', p.id)}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}

      {flatPostos.length > 0 && (
        <>
          <div className="sec mt12"><span className="stl">Postos vinculáveis ao inventário</span></div>
          <div className="card">
            {flatPostos.slice(0, 8).map((p) => (
              <div key={p.id} style={{ fontSize: 11, marginBottom: 6, color: 'var(--t1)' }}>{p.label}</div>
            ))}
            {flatPostos.length > 8 && (
              <div style={{ fontSize: 10, color: 'var(--t2)' }}>+ {flatPostos.length - 8} postos</div>
            )}
          </div>
        </>
      )}

      {formOpen && (
        <div className="card mt12">
          <div className="lbl">Novo {LEVEL_LABEL[formLevel]}</div>
          <input className="inp" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Nome" />
          <div className="row gap8 mt8">
            <button className="btn bp btn-sm" onClick={() => void handleCreate()}>Salvar</button>
            <button className="btn bs btn-sm" onClick={() => setFormOpen(false)}>Cancelar</button>
          </div>
        </div>
      )}

      <div className="hl mt12 mb8">
        <ChainBadge label="Empresa" value={company?.legalName} />
        <ChainBadge label="Unidade" value={orgTree?.units[0]?.name} />
      </div>

      <button type="button" className="btn bs mt8" onClick={() => go('dashboard')}>🏠 Voltar</button>
    </div>
  );
}

export function SectorsOrgScreen() {
  const { go, orgTree, collaborators, analyses, dbConnected, refreshOrgData } = useApp();

  const sectorCards = useMemo(() => {
    const sectors: Array<{ name: string; collabs: number; analyses: number; alerts: number; avgScore: number }> = [];
    for (const u of orgTree?.units ?? []) {
      for (const s of u.sectors ?? []) {
        const sectorAnalyses = analyses.filter((a) => a.setor === s.name);
        const sectorCollabs = collaborators.filter((c) => c.setor === s.name);
        const avgScore = sectorAnalyses.length
          ? Math.round(sectorAnalyses.reduce((sum, a) => sum + a.score, 0) / sectorAnalyses.length)
          : 0;
        const alerts = sectorAnalyses.filter((a) => a.risk === 'critico' || a.risk === 'alto').length;
        sectors.push({
          name: s.name,
          collabs: sectorCollabs.length,
          analyses: sectorAnalyses.length,
          alerts,
          avgScore,
        });
      }
    }
    return sectors;
  }, [orgTree, collaborators, analyses]);

  return (
    <div className="scroll">
      <div className="sec" style={{ marginTop: 0 }}>
        <span className="stl">Setores · PostgreSQL</span>
        <button type="button" className="btn bp btn-sm btn-inline" onClick={() => go('org-structure')}>
          Estrutura completa
        </button>
      </div>
      {dbConnected && (
        <div style={{ fontSize: 11, color: 'var(--green)', marginBottom: 10 }}>● Dados reais da estrutura organizacional</div>
      )}
      {sectorCards.length === 0 ? (
        <div className="card">
          <p style={{ fontSize: 12, margin: 0 }}>Nenhum setor cadastrado. Acesse Estrutura Organizacional para criar unidades e setores.</p>
          <button className="btn bp btn-sm mt12" onClick={() => go('org-structure')}>Abrir estrutura</button>
        </div>
      ) : (
        sectorCards.map((s) => (
          <div key={s.name} className="card mb8">
            <div style={{ fontFamily: 'var(--fd)', fontSize: 16, fontWeight: 800 }}>{s.name}</div>
            <div style={{ fontSize: 12, color: 'var(--t1)', marginTop: 4 }}>
              {s.collabs} colaboradores · {s.analyses} análises · {s.alerts} alertas · score méd. {s.avgScore || '—'}
            </div>
            <button className="btn bp btn-sm mt8" onClick={() => go('new-analysis')}>📷 Iniciar Análise</button>
          </div>
        ))
      )}
      <button className="btn bs btn-sm mt8" onClick={() => void refreshOrgData()}>Atualizar</button>
    </div>
  );
}
