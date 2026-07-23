/**
 * PsicossocialScreens.tsx — dados persistidos (PostgreSQL / LGPD)
 */
import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  CBI_PERGUNTAS,
  CLIMA_DIMS,
  COPSOQ_DIMS,
  HSE_DIMS,
  LIKERT_5,
  calcularPreview,
  tipoFromAba,
  type QuestionarioResultado,
} from '../data/psicoQuestionnaires';
import { apiCreatePsicoCampanha, apiGetPsicoCampanhas, apiRegeneratePsicoCampanhaLink } from '../api/client';
import { CampanhaSharePanel } from '../components/CampanhaSharePanel';
import { ComingSoonPanel } from '../components/UI';
import type { PsicoActionPlan, PsicoCampanha, PsicoMteFactor, PsicoQuestionnaireType, PsicoRiskLevel } from '../types/psicossocial';
import { LGPD_CONSENT_TEXT, PSICO_QUESTIONNAIRE_LABELS } from '../types/psicossocial';
import { riskNivelLabelUpper } from '../utils/riskNivelLabel';

function nivelColor(n: PsicoRiskLevel) {
  return n === 'critico' ? 'var(--red)' : n === 'alto' ? 'var(--orange)' : n === 'medio' ? 'var(--amber)' : 'var(--green)';
}
function nivelBg(n: PsicoRiskLevel) {
  return n === 'critico' ? 'var(--r10)' : n === 'alto' ? 'var(--o10)' : n === 'medio' ? 'var(--a10)' : 'var(--g10)';
}
function nivelLabel(n: PsicoRiskLevel) {
  return riskNivelLabelUpper(n);
}
function statusLabel(s: PsicoActionPlan['status']) {
  return s === 'concluido' ? 'Concluído' : s === 'andamento' ? 'Em andamento' : s === 'atrasado' ? 'Atrasado' : 'Aberto';
}
function statusColor(s: PsicoActionPlan['status']) {
  return s === 'concluido' ? 'var(--green)' : s === 'andamento' ? 'var(--amber)' : s === 'atrasado' ? 'var(--red)' : 'var(--cyan)';
}
function matrizCor(score: number): { bg: string; text: string } {
  if (score >= 20) return { bg: 'var(--red)', text: '#fff' };
  if (score >= 12) return { bg: '#FCA5A5', text: '#501313' };
  if (score >= 6) return { bg: 'var(--a10)', text: 'var(--amber)' };
  return { bg: 'var(--g10)', text: 'var(--green)' };
}

function ResultadoPanel({ res, titulo, accentColor }: { res: QuestionarioResultado; titulo: string; accentColor: string }) {
  return (
    <div className="hl" style={{ background: nivelBg(res.nivel), border: `1px solid ${nivelColor(res.nivel)}55`, marginTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ fontSize: 36, fontWeight: 800, color: nivelColor(res.nivel), fontFamily: 'var(--fd)' }}>{res.score}</div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: nivelColor(res.nivel) }}>{nivelLabel(res.nivel)}</div>
          <div style={{ fontSize: 11, color: 'var(--t1)' }}>Score global {titulo}</div>
        </div>
      </div>
      {res.dimensoes.map((d) => (
        <div key={d.nome} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--t1)', width: 190, flexShrink: 0 }}>{d.nome}</span>
          <div style={{ flex: 1, height: 5, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${d.score}%`, background: d.score >= 70 ? 'var(--green)' : d.score >= 50 ? accentColor : 'var(--red)', borderRadius: 3 }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--t0)', width: 30, textAlign: 'right' }}>{d.score}</span>
        </div>
      ))}
    </div>
  );
}

export function PsicossocialDashboardScreen() {
  const { go, psicoDashboard, psicoFatores, psicoActionPlans, psicoHistory, psicoTrends, markPsicoAlertRead } = useApp();
  const dash = psicoDashboard;
  const avaliados = dash?.factorsAssessed ?? psicoFatores.filter((f) => f.avaliado).length;
  const conformidade = dash?.conformityPct ?? 0;
  const criticos = dash?.criticalCount ?? 0;
  const abertas = dash?.actionPlan.open ?? psicoActionPlans.filter((a) => a.status !== 'concluido').length;
  const prioritarios = dash?.highPriorityFactors?.length
    ? dash.highPriorityFactors
    : psicoFatores.filter((f) => f.avaliado && (f.nivel === 'critico' || f.nivel === 'alto')).slice(0, 4);

  return (
    <div className="scroll scroll--dashboard">
      <div className="hl-r" style={{ marginBottom: 14 }}>
        <div className="row gap8 mb8">
          <span style={{ fontSize: 18 }}>⚠️</span>
          <span className="lbl" style={{ color: 'var(--red)' }}>PORTARIA MTE 1.419/2024 — VIGENTE DESDE 26/05/2025</span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--t1)', lineHeight: 1.5, margin: 0 }}>
          Fatores psicossociais obrigatórios no GRO. Conformidade:{' '}
          <strong style={{ color: 'var(--amber)' }}>{conformidade}%</strong> — {13 - avaliados} fatores pendentes.
          {dash?.lgpd?.consentRequired && ' · Coleta anonimizada (LGPD).'}
        </p>
      </div>

      <div className="sg" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
        <div className="sc" onClick={() => go('psicossocial-fatores')}>
          <div className="sv" style={{ color: 'var(--amber)' }}>{avaliados}/13</div>
          <div className="sl">Fatores avaliados</div>
          <div className="pb"><div className="pf" style={{ width: `${(avaliados / 13) * 100}%`, background: 'var(--amber)' }} /></div>
        </div>
        <div className="sc" onClick={() => go('psicossocial-fatores')}>
          <div className="sv" style={{ color: 'var(--red)' }}>{criticos}</div>
          <div className="sl">Riscos críticos</div>
          <div className="pb"><div className="pf" style={{ width: `${avaliados ? (criticos / avaliados) * 100 : 0}%`, background: 'var(--red)' }} /></div>
        </div>
        <div className="sc" onClick={() => go('psicossocial-conformidade')}>
          <div className="sv" style={{ color: conformidade >= 80 ? 'var(--green)' : 'var(--amber)' }}>{conformidade}%</div>
          <div className="sl">Conformidade MTE</div>
          <div className="pb"><div className="pf" style={{ width: `${conformidade}%`, background: conformidade >= 80 ? 'var(--green)' : 'var(--amber)' }} /></div>
        </div>
        <div className="sc" onClick={() => go('psicossocial-plano')}>
          <div className="sv" style={{ color: 'var(--cyan)' }}>{abertas}</div>
          <div className="sl">Ações abertas</div>
          <div className="pb"><div className="pf" style={{ width: `${psicoActionPlans.length ? ((dash?.actionPlan.completed ?? 0) / psicoActionPlans.length) * 100 : 0}%`, background: 'var(--green)' }} /></div>
        </div>
      </div>

      {(dash?.alerts?.length ?? 0) > 0 && (
        <>
          <div className="sec"><span className="stl">Alertas</span></div>
          {dash!.alerts.slice(0, 5).map((a) => (
            <div key={a.id} className="card" style={{ borderLeft: `3px solid ${nivelColor(a.severity === 'info' ? 'baixo' : a.severity)}` }}>
              <div className="row gap8 jb">
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t0)' }}>{a.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--t1)', marginTop: 4 }}>{a.message}</div>
                </div>
                {!a.read && (
                  <button className="btn btn-sm" onClick={() => void markPsicoAlertRead(a.id)}>Marcar lido</button>
                )}
              </div>
            </div>
          ))}
        </>
      )}

      {psicoTrends.length > 0 && (
        <>
          <div className="sec mt12"><span className="stl">Tendências (12 meses)</span></div>
          <div className="card">
            {psicoTrends.slice(-8).map((t, i) => (
              <div key={`${t.type}-${t.period}-${i}`} className="row gap8 jb" style={{ padding: '6px 0', borderBottom: '1px solid var(--b0)' }}>
                <span style={{ fontSize: 11, color: 'var(--t1)' }}>{PSICO_QUESTIONNAIRE_LABELS[t.type]} · {t.period.slice(0, 7)}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--amber)' }}>{t.avgScore ?? '—'} <span style={{ fontWeight: 400, color: 'var(--t2)' }}>(n={t.sampleSize})</span></span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="sec mt12"><span className="stl">Riscos prioritários</span></div>
      {prioritarios.length === 0 ? (
        <div className="card" style={{ fontSize: 12, color: 'var(--t2)' }}>Nenhum fator crítico/alto registrado. Avalie os 13 fatores MTE.</div>
      ) : prioritarios.map((f) => (
        <div key={f.codigo} className="card" onClick={() => go('psicossocial-fatores')} style={{ cursor: 'pointer' }}>
          <div className="row gap8 jb">
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t0)', marginBottom: 4 }}>{f.nome}</div>
              <div style={{ fontSize: 11, color: 'var(--t1)' }}>{f.setor}</div>
            </div>
            <span className="badge" style={{ background: nivelBg(f.nivel), color: nivelColor(f.nivel) }}>{nivelLabel(f.nivel)}</span>
          </div>
          <div className="pb mt8"><div className="pf" style={{ width: `${f.score}%`, background: nivelColor(f.nivel) }} /></div>
        </div>
      ))}

      {psicoHistory.length > 0 && (
        <>
          <div className="sec mt12"><span className="stl">Histórico recente</span></div>
          {psicoHistory.slice(0, 5).map((h) => (
            <div key={h.id} className="card" style={{ padding: '10px 12px' }}>
              <div style={{ fontSize: 11, color: 'var(--t2)' }}>{new Date(h.createdAt).toLocaleString('pt-BR')}</div>
              <div style={{ fontSize: 12, color: 'var(--t0)', marginTop: 2 }}>{h.action.replace(/_/g, ' ')}</div>
            </div>
          ))}
        </>
      )}

      <div className="sec mt12"><span className="stl">Módulos</span></div>
      {[
        { id: 'psicossocial-fatores', ico: '🧠', label: '13 Fatores Guia MTE', sub: 'Avaliação por setor' },
        { id: 'psicossocial-questionarios', ico: '📝', label: 'Questionários', sub: 'COPSOQ · HSE · Burnout · Clima' },
        { id: 'psicossocial-matriz', ico: '🎯', label: 'Matriz de Riscos', sub: 'Heatmap 5×5' },
        { id: 'psicossocial-plano', ico: '✅', label: 'Plano de Ação', sub: `${psicoActionPlans.length} ações` },
        { id: 'psicossocial-conformidade', ico: '⚖️', label: 'Conformidade Legal', sub: 'NR-1 · Portaria 1.419/2024' },
        { id: 'psicossocial-ia', ico: '🤖', label: 'IA ErgoSense', sub: 'Em breve · atualização futura' },
      ].map((item) => (
        <button key={item.id} className="ac" onClick={() => go(item.id as never)}>
          <div className="av" style={{ background: 'var(--a10)', fontSize: 22 }}>{item.ico}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--t0)' }}>{item.label}</div>
            <div style={{ fontSize: 11, color: 'var(--t1)', marginTop: 2 }}>{item.sub}</div>
          </div>
          <span style={{ color: 'var(--amber)', fontSize: 16 }}>›</span>
        </button>
      ))}
    </div>
  );
}

function FatorAvaliacaoModal({
  fator,
  onClose,
  onSave,
}: {
  fator: PsicoMteFactor;
  onClose: () => void;
  onSave: (prob: number, sev: number) => void;
}) {
  const [prob, setProb] = useState(fator.probabilidade ?? 3);
  const [sev, setSev] = useState(fator.severidade ?? 3);
  return (
    <div className="card" style={{ marginBottom: 12, border: '1px solid var(--amber)' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t0)', marginBottom: 10 }}>{fator.nome}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <label className="lbl">Probabilidade (1–5)</label>
          <input className="inp" type="number" min={1} max={5} value={prob} onChange={(e) => setProb(Number(e.target.value))} />
        </div>
        <div>
          <label className="lbl">Severidade (1–5)</label>
          <input className="inp" type="number" min={1} max={5} value={sev} onChange={(e) => setSev(Number(e.target.value))} />
        </div>
      </div>
      <div className="row gap8 mt8">
        <button className="btn bp" onClick={() => onSave(prob, sev)}>Salvar avaliação</button>
        <button className="btn btn-sm" onClick={onClose}>Cancelar</button>
      </div>
    </div>
  );
}

export function PsicossocialFatoresScreen() {
  const { go, psicoFatores, savePsicoFator } = useApp();
  const [filtro, setFiltro] = useState<'todos' | 'avaliados' | 'pendentes'>('todos');
  const [editando, setEditando] = useState<string | null>(null);

  const visíveis = psicoFatores.filter((f) =>
    filtro === 'todos' ? true : filtro === 'avaliados' ? f.avaliado : !f.avaliado,
  );
  const avaliadosCount = psicoFatores.filter((x) => x.avaliado).length;

  return (
    <div className="scroll">
      <div className="row gap8 mb12" style={{ flexWrap: 'wrap' }}>
        {(['todos', 'avaliados', 'pendentes'] as const).map((f) => (
          <button key={f} className={`tag ${filtro === f ? 'on' : ''}`} onClick={() => setFiltro(f)}
            style={filtro === f ? { background: 'var(--a10)', color: 'var(--amber)', border: '1px solid var(--amber)' } : {}}>
            {f === 'todos' ? 'Todos (13)' : f === 'avaliados' ? `Avaliados (${avaliadosCount})` : `Pendentes (${13 - avaliadosCount})`}
          </button>
        ))}
      </div>

      {editando && psicoFatores.find((f) => f.codigo === editando) && (
        <FatorAvaliacaoModal
          fator={psicoFatores.find((f) => f.codigo === editando)!}
          onClose={() => setEditando(null)}
          onSave={(prob, sev) => {
            void savePsicoFator(editando, { probabilidade: prob, severidade: sev }).then(() => setEditando(null));
          }}
        />
      )}

      {visíveis.map((f) => (
        <div key={f.codigo} className="card" style={{ borderLeft: `3px solid ${f.avaliado ? nivelColor(f.nivel) : 'var(--b2)'}` }}>
          <div className="row gap8 jb mb8">
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t0)' }}>{f.codigo} · {f.nome}</div>
              <div style={{ fontSize: 11, color: 'var(--t1)', marginTop: 2 }}>
                {f.avaliado ? `Setor: ${f.setor} · Sev ${f.severidade} × Prob ${f.probabilidade}` : 'Não avaliado'}
              </div>
            </div>
            {f.avaliado ? (
              <span className="badge" style={{ background: nivelBg(f.nivel), color: nivelColor(f.nivel) }}>{nivelLabel(f.nivel)}</span>
            ) : (
              <span className="badge" style={{ background: 'var(--bg3)', color: 'var(--t2)' }}>PENDENTE</span>
            )}
          </div>
          {f.avaliado && (
            <>
              <div className="pb"><div className="pf" style={{ width: `${f.score}%`, background: nivelColor(f.nivel) }} /></div>
              <div style={{ fontSize: 10, color: 'var(--t2)', marginTop: 4 }}>Score: {f.score}/100</div>
            </>
          )}
          <button className="btn btn-sm" style={{ background: 'var(--a10)', color: 'var(--amber)', border: '1px solid var(--a35)', marginTop: 8 }}
            onClick={() => setEditando(f.codigo)}>
            {f.avaliado ? 'Reavaliar' : 'Iniciar avaliação →'}
          </button>
        </div>
      ))}

      <button className="btn bs mt12" onClick={() => go('psicossocial-questionarios')}>Ir para questionários →</button>
    </div>
  );
}

function PsicoCampanhasPanel() {
  const { selectedCompany, showToast } = useApp();
  const [campanhas, setCampanhas] = useState<PsicoCampanha[]>([]);
  const [loading, setLoading] = useState(true);
  const [criando, setCriando] = useState(false);
  const [novoTipo, setNovoTipo] = useState<PsicoQuestionnaireType>('COPSOQ_III');
  const [novoTitulo, setNovoTitulo] = useState('');
  const [ultimoLink, setUltimoLink] = useState<{ id: string; link: string; title: string } | null>(null);
  const [expanded, setExpanded] = useState(true);

  const tenantId = selectedCompany?.id;

  const carregar = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const list = await apiGetPsicoCampanhas(tenantId);
      setCampanhas(list);
    } catch {
      showToast('Erro ao carregar campanhas', 'warn');
    } finally {
      setLoading(false);
    }
  }, [showToast, tenantId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function criarCampanha() {
    if (!tenantId) return;
    setCriando(true);
    try {
      const created = await apiCreatePsicoCampanha(tenantId, {
        type: novoTipo,
        title: novoTitulo.trim() || PSICO_QUESTIONNAIRE_LABELS[novoTipo],
        anonymous: true,
      });
      setUltimoLink({
        id: created.id,
        link: created.publicLink,
        title: created.title,
      });
      setNovoTitulo('');
      showToast('Campanha criada — copie o link abaixo', 'success');
      await carregar();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao criar campanha', 'warn');
    } finally {
      setCriando(false);
    }
  }

  function abrirCompartilhamento(c: PsicoCampanha) {
    void regenerarLink(c.id, c.title);
  }
  async function regenerarLink(id: string, title: string) {
    if (!tenantId) return;
    try {
      const res = await apiRegeneratePsicoCampanhaLink(tenantId, id);
      setUltimoLink({ id, link: res.publicLink, title });
      showToast('Novo link gerado — compartilhe abaixo', 'success');
      await carregar();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao gerar link', 'warn');
    }
  }

  if (!tenantId) return null;

  return (
    <div className="card mb12" style={{ borderColor: 'rgba(34,197,94,.35)' }}>
      <div
        className="row"
        style={{ justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        onClick={() => setExpanded((e) => !e)}
      >
        <div>
          <div className="card-t" style={{ color: 'var(--green)', marginBottom: 4 }}>Links para colaboradores</div>
          <div style={{ fontSize: 11, color: 'var(--t1)' }}>
            Gere formulários anônimos e envie o link por e-mail, WhatsApp ou QR Code
          </div>
        </div>
        <span style={{ color: 'var(--t2)', fontSize: 18 }}>{expanded ? '▾' : '▸'}</span>
      </div>

      {expanded && (
        <>
          <div className="row gap8 mt12" style={{ flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <label style={{ flex: 1, minWidth: 140 }}>
              <div className="lbl">Questionário</div>
              <select
                className="inp"
                value={novoTipo}
                onChange={(e) => setNovoTipo(e.target.value as PsicoQuestionnaireType)}
              >
                {(Object.keys(PSICO_QUESTIONNAIRE_LABELS) as PsicoQuestionnaireType[]).map((t) => (
                  <option key={t} value={t}>{PSICO_QUESTIONNAIRE_LABELS[t]}</option>
                ))}
              </select>
            </label>
            <label style={{ flex: 2, minWidth: 180 }}>
              <div className="lbl">Título da campanha</div>
              <input
                className="inp"
                placeholder="Ex.: Pesquisa de clima — Q2 2026"
                value={novoTitulo}
                onChange={(e) => setNovoTitulo(e.target.value)}
              />
            </label>
            <button className="btn bp btn-sm" disabled={criando} onClick={() => void criarCampanha()}>
              {criando ? 'Gerando…' : '+ Gerar link'}
            </button>
          </div>

          {ultimoLink && (
            <CampanhaSharePanel
              link={ultimoLink.link}
              title={ultimoLink.title}
              warning="Link gerado — guarde ou compartilhe agora (não será exibido novamente ao sair)"
              onCopySuccess={(msg) => showToast(msg, 'success')}
              onCopyError={(msg) => showToast(msg, 'warn')}
            />
          )}

          <div className="mt12">
            <div className="lbl mb8">Campanhas ativas ({loading ? '…' : campanhas.length})</div>
            {loading ? (
              <p style={{ fontSize: 11, color: 'var(--t2)' }}>Carregando…</p>
            ) : campanhas.length === 0 ? (
              <p style={{ fontSize: 11, color: 'var(--t2)' }}>Nenhuma campanha ainda. Clique em &quot;Gerar link&quot; acima.</p>
            ) : (
              campanhas.map((c) => (
                <div key={c.id} className="list-row" style={{ alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{c.title}</div>
                    <div style={{ fontSize: 10, color: 'var(--t2)', marginTop: 2 }}>
                      {PSICO_QUESTIONNAIRE_LABELS[c.type]} · {c.responses} resposta(s)
                      {c.active ? '' : ' · inativa'}
                    </div>
                  </div>
                  {c.hasPublicLink && (
                    <button className="btn bs btn-sm btn-inline" onClick={() => abrirCompartilhamento(c)}>
                      Gerar link
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function PsicossocialQuestionariosScreen() {
  const { submitPsicoQuestionnaire } = useApp();
  const [aba, setAba] = useState<'copsoq' | 'hse' | 'cbi' | 'clima'>('copsoq');
  const [respostas, setRespostas] = useState<Record<string, number>>({});
  const [resultado, setResultado] = useState<QuestionarioResultado | null>(null);
  const [consent, setConsent] = useState(false);
  const [enviando, setEnviando] = useState(false);

  function mudarAba(a: typeof aba) {
    setAba(a);
    setResultado(null);
    setRespostas({});
    setConsent(false);
  }

  function responder(key: string, val: number) {
    setRespostas((r) => ({ ...r, [key]: val }));
  }

  async function calcularESalvar() {
    const tipo = tipoFromAba(aba);
    const preview = calcularPreview(tipo, respostas);
    setResultado(preview);
    if (!consent) return;
    setEnviando(true);
    await submitPsicoQuestionnaire(tipo, respostas, true);
    setEnviando(false);
  }

  const tituloMap = { copsoq: 'COPSOQ-III', hse: 'HSE Std.', cbi: 'CBI', clima: 'Clima Organizacional' };
  const accentMap = { copsoq: 'var(--amber)', hse: 'var(--cyan)', cbi: 'var(--red)', clima: 'var(--cyan)' };

  return (
    <div className="scroll">
      <PsicoCampanhasPanel />

      <div className="hl mb12" style={{ background: 'var(--bg2)' }}>
        <div className="lbl">Resposta interna (equipe SST)</div>
        <p style={{ fontSize: 11, color: 'var(--t2)', marginTop: 4 }}>
          Use os questionários abaixo quando estiver logado. Para colaboradores, prefira gerar um link anônimo acima.
        </p>
      </div>

      <div className="row gap8 mb12" style={{ flexWrap: 'wrap' }}>
        {(['copsoq', 'hse', 'cbi', 'clima'] as const).map((a) => (
          <button key={a} className={`tag ${aba === a ? 'on' : ''}`} onClick={() => mudarAba(a)}
            style={aba === a ? { background: 'var(--a10)', color: 'var(--amber)', border: '1px solid var(--amber)' } : {}}>
            {a === 'copsoq' ? 'COPSOQ-III' : a === 'hse' ? 'HSE Std.' : a === 'cbi' ? 'Burnout (CBI)' : 'Clima Org.'}
          </button>
        ))}
      </div>

      <div className="hl mb12" style={{ background: 'var(--bg2)' }}>
        <div className="lbl" style={{ color: 'var(--green)' }}>LGPD — CONSENTIMENTO OBRIGATÓRIO</div>
        <label style={{ display: 'flex', gap: 8, fontSize: 11, color: 'var(--t1)', marginTop: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ accentColor: 'var(--green)' }} />
          {LGPD_CONSENT_TEXT}
        </label>
      </div>

      {aba === 'copsoq' && COPSOQ_DIMS.map((dim) => (
        <div key={dim.id} className="card">
          <div className="card-t" style={{ color: 'var(--amber)', fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>{dim.titulo}</div>
          {dim.perguntas.map((perg, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--t0)', marginBottom: 8 }}>{i + 1}. {perg}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {LIKERT_5.map((label, val) => (
                  <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--t1)', cursor: 'pointer' }}>
                    <input type="radio" name={`${dim.id}-q${i}`} checked={respostas[`${dim.id}-q${i}`] === val}
                      onChange={() => responder(`${dim.id}-q${i}`, val)} style={{ accentColor: 'var(--amber)' }} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}

      {aba === 'hse' && HSE_DIMS.map((dim) => (
        <div key={dim.id} className="card">
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: dim.cor, marginBottom: 10 }}>{dim.titulo}</div>
          {dim.perguntas.map((perg, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--t0)', marginBottom: 8 }}>{i + 1}. {perg}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {LIKERT_5.map((label, val) => (
                  <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--t1)', cursor: 'pointer' }}>
                    <input type="radio" checked={respostas[`${dim.id}-q${i}`] === val}
                      onChange={() => responder(`${dim.id}-q${i}`, val)} style={{ accentColor: 'var(--cyan)' }} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}

      {aba === 'cbi' && (
        <div className="card">
          {CBI_PERGUNTAS.map((perg, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--t0)', marginBottom: 8 }}>{i + 1}. {perg}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {LIKERT_5.map((label, val) => (
                  <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--t1)', cursor: 'pointer' }}>
                    <input type="radio" checked={respostas[`cbi-q${i}`] === val}
                      onChange={() => responder(`cbi-q${i}`, val)} style={{ accentColor: 'var(--red)' }} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {aba === 'clima' && CLIMA_DIMS.map((dim) => (
        <div key={dim.id} className="card">
          <div className="card-t" style={{ color: 'var(--cyan)', fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>{dim.titulo}</div>
          {dim.perguntas.map((perg, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--t0)', marginBottom: 8 }}>{i + 1}. {perg}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {LIKERT_5.map((label, val) => (
                  <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--t1)', cursor: 'pointer' }}>
                    <input type="radio" checked={respostas[`${dim.id}-q${i}`] === val}
                      onChange={() => responder(`${dim.id}-q${i}`, val)} style={{ accentColor: 'var(--cyan)' }} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}

      <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
        <button className="btn bp" style={{ flex: 1, marginBottom: 0 }} disabled={enviando}
          onClick={() => void calcularESalvar()}>
          {consent ? (enviando ? 'Salvando…' : 'Calcular e registrar (anonimizado)') : 'Calcular preview'}
        </button>
        <button className="btn bs btn-inline btn-sm" onClick={() => { setRespostas({}); setResultado(null); }}>Limpar</button>
      </div>
      {resultado && <ResultadoPanel res={resultado} titulo={tituloMap[aba]} accentColor={accentMap[aba]} />}
    </div>
  );
}

export function PsicossocialMatrizScreen() {
  const { psicoMatriz } = useApp();
  const [drilldown, setDrilldown] = useState<{ sev: number; prob: number } | null>(null);
  const PROB_LABELS = ['1 M.baixa', '2 Baixa', '3 Média', '4 Alta', '5 M.alta'];
  const SEV_LABELS = ['1 M.baixo', '2 Baixo', '3 Médio', '4 Alto', '5 M.alto'];

  const riscoNaCelula = (sev: number, prob: number) =>
    psicoMatriz.filter((r) => r.sev === sev && r.prob === prob);

  const drillRiscos = drilldown ? riscoNaCelula(drilldown.sev, drilldown.prob) : [];

  return (
    <div className="scroll">
      <div className="hl" style={{ marginBottom: 14 }}>
        <div className="lbl" style={{ color: 'var(--amber)' }}>HEATMAP PROBABILIDADE × SEVERIDADE — NR-1 1.5.4.4.2.2</div>
        <p style={{ fontSize: 11, color: 'var(--t1)', margin: 0 }}>
          {psicoMatriz.length ? `${psicoMatriz.length} risco(s) mapeado(s) a partir das avaliações MTE.` : 'Avalie fatores MTE para popular a matriz.'}
        </p>
      </div>

      <div style={{ overflowX: 'auto', marginBottom: 16 }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: 4 }}>
          <thead>
            <tr>
              <th style={{ width: 70 }} />
              {SEV_LABELS.map((l, i) => (
                <th key={i} style={{ fontSize: 9, color: 'var(--t2)', padding: '0 4px 6px', textAlign: 'center', fontFamily: 'var(--fd)' }}>{l}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[5, 4, 3, 2, 1].map((prob) => (
              <tr key={prob}>
                <td style={{ fontSize: 9, color: 'var(--t2)', textAlign: 'right', paddingRight: 6, fontFamily: 'var(--fd)' }}>{PROB_LABELS[prob - 1]}</td>
                {[1, 2, 3, 4, 5].map((sev) => {
                  const score = sev * prob;
                  const c = matrizCor(score);
                  const riscos = riscoNaCelula(sev, prob);
                  const active = drilldown?.sev === sev && drilldown?.prob === prob;
                  return (
                    <td key={sev} onClick={() => setDrilldown(active ? null : { sev, prob })}
                      style={{ background: c.bg, color: c.text, padding: '10px 8px', textAlign: 'center', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600, opacity: active ? 0.7 : 1, minWidth: 44 }}>
                      {score}{riscos.length > 0 && <span style={{ fontSize: 9 }}> ●{riscos.length > 1 ? riscos.length : ''}</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {drilldown && (
        <div className="card" style={{ border: `1px solid ${matrizCor(drilldown.sev * drilldown.prob).bg}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t0)', marginBottom: 10 }}>
            Sev {drilldown.sev} × Prob {drilldown.prob} = {drilldown.sev * drilldown.prob} · {drillRiscos.length} risco(s)
          </div>
          {drillRiscos.map((r) => (
            <div key={r.codigo} className="row gap8 jb" style={{ padding: '8px 0', borderBottom: '1px solid var(--b0)' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t0)' }}>{r.nome}</div>
                <div style={{ fontSize: 10, color: 'var(--t1)' }}>{r.setor}</div>
              </div>
              <span className="badge" style={{ background: nivelBg(r.nivel), color: nivelColor(r.nivel) }}>{nivelLabel(r.nivel)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="sec mt12"><span className="stl">Todos os riscos mapeados</span></div>
      {psicoMatriz.length === 0 ? (
        <div className="card" style={{ fontSize: 12, color: 'var(--t2)' }}>Nenhum risco na matriz.</div>
      ) : psicoMatriz.map((r) => (
        <div key={r.codigo} className="card" style={{ borderLeft: `3px solid ${nivelColor(r.nivel)}` }}>
          <div className="row gap8 jb">
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t0)' }}>{r.nome}</div>
              <div style={{ fontSize: 11, color: 'var(--t1)', marginTop: 2 }}>{r.setor} · Sev {r.sev} × Prob {r.prob}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: nivelColor(r.nivel), fontFamily: 'var(--fd)' }}>{r.score}</div>
              <span className="badge" style={{ background: nivelBg(r.nivel), color: nivelColor(r.nivel), fontSize: 9 }}>{nivelLabel(r.nivel)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function PsicossocialPlanoScreen() {
  const { psicoActionPlans, savePsicoActionPlan, updatePsicoActionStatus } = useApp();
  const [novaDesc, setNovaDesc] = useState('');
  const [novaResp, setNovaResp] = useState('');
  const [novaPrazo, setNovaPrazo] = useState('');
  const [novaPrior, setNovaPrior] = useState<PsicoRiskLevel>('medio');

  const concluidas = psicoActionPlans.filter((a) => a.status === 'concluido').length;
  const total = psicoActionPlans.length || 1;

  function addAcao() {
    if (!novaDesc.trim()) return;
    void savePsicoActionPlan({
      description: novaDesc,
      responsible: novaResp || 'A definir',
      dueDate: novaPrazo || null,
      priority: novaPrior,
    });
    setNovaDesc('');
    setNovaResp('');
    setNovaPrazo('');
  }

  function toggleStatus(a: PsicoActionPlan) {
    const next = a.status === 'aberto' ? 'andamento' : a.status === 'andamento' ? 'concluido' : 'aberto';
    void updatePsicoActionStatus(a.id, next);
  }

  return (
    <div className="scroll">
      <div className="hl" style={{ marginBottom: 14 }}>
        <div className="row gap8 jb mb8">
          <span className="lbl" style={{ color: 'var(--green)' }}>PROGRESSO DO PLANO</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--green)', fontFamily: 'var(--fd)' }}>{concluidas}/{psicoActionPlans.length}</span>
        </div>
        <div className="pb"><div className="pf" style={{ width: `${(concluidas / total) * 100}%`, background: 'var(--green)' }} /></div>
      </div>

      {psicoActionPlans.map((a) => (
        <div key={a.id} className="card" style={{ borderLeft: `3px solid ${nivelColor(a.priority)}` }}>
          <div className="row gap8 jb mb8">
            <span className="badge" style={{ background: nivelBg(a.priority), color: nivelColor(a.priority) }}>{nivelLabel(a.priority)}</span>
            <span style={{ fontSize: 10, color: statusColor(a.status), fontWeight: 600 }}>{statusLabel(a.status)}</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t0)', marginBottom: 4 }}>{a.description}</div>
          <div style={{ fontSize: 11, color: 'var(--t1)', marginBottom: 10 }}>
            <span>👤 {a.responsible}</span>
            <span style={{ marginLeft: 12 }}>📅 {a.dueDate ?? '—'}</span>
          </div>
          <button className="btn btn-sm" style={{ width: '100%' }} onClick={() => toggleStatus(a)}>
            {a.status === 'concluido' ? '✓ Concluído — reabrir' : a.status === 'andamento' ? '→ Concluir' : '○ Iniciar'}
          </button>
        </div>
      ))}

      <div className="sec mt16"><span className="stl">Nova ação</span></div>
      <div className="card">
        <label className="lbl">Descrição</label>
        <input className="inp" value={novaDesc} onChange={(e) => setNovaDesc(e.target.value)} placeholder="Ex: Treinamento anti-assédio" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <label className="lbl">Responsável</label>
            <input className="inp" value={novaResp} onChange={(e) => setNovaResp(e.target.value)} />
          </div>
          <div>
            <label className="lbl">Prazo</label>
            <input className="inp" type="date" value={novaPrazo} onChange={(e) => setNovaPrazo(e.target.value)} />
          </div>
        </div>
        <label className="lbl">Prioridade</label>
        <select className="inp" value={novaPrior} onChange={(e) => setNovaPrior(e.target.value as PsicoRiskLevel)}>
          <option value="critico">Crítico</option>
          <option value="alto">Alto</option>
          <option value="medio">Médio</option>
          <option value="baixo">Baixo</option>
        </select>
        <button className="btn bp" onClick={addAcao}>Registrar ação</button>
      </div>
    </div>
  );
}

function reqColor(s: 'atendido' | 'parcial' | 'pendente') {
  return s === 'atendido' ? 'var(--green)' : s === 'parcial' ? 'var(--amber)' : 'var(--red)';
}
function reqBg(s: 'atendido' | 'parcial' | 'pendente') {
  return s === 'atendido' ? 'var(--g10)' : s === 'parcial' ? 'var(--a10)' : 'var(--r10)';
}
function reqLabel(s: 'atendido' | 'parcial' | 'pendente') {
  return s === 'atendido' ? 'ATENDIDO' : s === 'parcial' ? 'PARCIAL' : 'PENDENTE';
}

export function PsicossocialConformidadeScreen() {
  const { psicoConformity } = useApp();
  const reqs = psicoConformity?.requirements ?? [];
  const conformidade = psicoConformity?.conformidade ?? 0;
  const stats = psicoConformity?.stats;

  return (
    <div className="scroll">
      <div className="hl" style={{ marginBottom: 14 }}>
        <div className="row gap8 jb mb8">
          <div>
            <div className="lbl" style={{ color: 'var(--amber)' }}>CONFORMIDADE — PORTARIA MTE 1.419/2024</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--amber)', fontFamily: 'var(--fd)' }}>{conformidade}%</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--t1)' }}>Meta ErgoSense</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--green)', fontFamily: 'var(--fd)' }}>95%</div>
          </div>
        </div>
        <div className="pb"><div className="pf" style={{ width: `${conformidade}%`, background: 'var(--amber)' }} /></div>
        {stats && (
          <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--green)' }}>✓ {stats.atendidos} Atendidos</span>
            <span style={{ fontSize: 11, color: 'var(--amber)' }}>◑ {stats.parciais} Parciais</span>
            <span style={{ fontSize: 11, color: 'var(--red)' }}>✗ {stats.pendentes} Pendentes</span>
          </div>
        )}
      </div>

      {reqs.length === 0 ? (
        <div className="card" style={{ fontSize: 12, color: 'var(--t2)' }}>Carregue dados do tenant para calcular conformidade.</div>
      ) : reqs.map((req) => (
        <div key={req.id} className="card" style={{ borderLeft: `3px solid ${reqColor(req.status)}` }}>
          <div className="row gap8 jb mb4">
            <span style={{ fontSize: 10, fontFamily: 'var(--fm)', color: 'var(--t2)' }}>{req.norma}</span>
            <span className="badge" style={{ background: reqBg(req.status), color: reqColor(req.status), fontSize: 9 }}>{reqLabel(req.status)}</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--t0)' }}>{req.requisito}</div>
        </div>
      ))}
    </div>
  );
}

export function PsicossocialIaScreen() {
  return (
    <div className="scroll pad">
      <ComingSoonPanel
        title="IA Psicossocial"
        subtitle="Em breve: agente de IA com análise de fatores MTE, questionários e recomendações. Disponível em atualização futura."
        badge="Em breve"
      />
    </div>
  );
}
