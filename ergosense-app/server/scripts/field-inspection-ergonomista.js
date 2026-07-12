/**
 * Inspeção de campo simulada — Ergonomista Sênior
 * Executa fluxo real via API: reconhecimento → análise → NR-17 → GRO → AET
 *
 * Uso: node scripts/field-inspection-ergonomista.js
 */
const BASE = process.env.API_URL ?? `http://localhost:${process.env.PORT ?? 3001}`;
const EMAIL = process.env.TEST_EMAIL ?? 'lucas@vale.com.br';
const PASSWORD = process.env.TEST_PASSWORD ?? 'ergo1234';
const TENANT = process.env.TEST_TENANT ?? 'vale';

const findings = [];
const passes = [];

function ok(phase, msg) {
  passes.push({ phase, msg });
  console.log(`  ✅ [${phase}] ${msg}`);
}

function issue(phase, severity, msg, detail = '') {
  findings.push({ phase, severity, msg, detail });
  const icon = severity === 'critico' ? '🔴' : severity === 'alto' ? '🟠' : '🟡';
  console.log(`  ${icon} [${phase}] ${msg}${detail ? ` — ${detail}` : ''}`);
}

async function api(path, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

/** Postura típica de teleatendimento inadequado (inspeção em campo) */
const FIELD_ANGLES = {
  lombar: 28,
  dorso: 15,
  ombroD: 58,
  pescoco: 38,
  cotovelo: 95,
  maoD: 165,
  quadril: 92,
  joelhoD: 88,
  tornozeloD: 90,
  repeticao: 45,
};

const FIELD_WORKSTATION = {
  monitorDistanceCm: 42,
  monitorHeightCm: 95,
  seatHeightCm: 48,
  deskHeightCm: 72,
  lightingLux: 180,
  blueLightFilter: false,
};

function buildFieldNr17Report() {
  return {
    generatedAt: new Date().toISOString(),
    sessionDurationSecs: 185,
    sampleCount: 420,
    complianceScore: 42,
    overallStatus: 'nao_conforme',
    riskTimePct: 68,
    summary:
      'Posto de teleatendimento com protrusão cervical acentuada, ombros elevados e distância olhos-tela abaixo de 50 cm. ' +
      'Exposição prolongada a postura estática de risco (>45 min acumulados na sessão).',
    items: [
      {
        id: 'nr17-coluna',
        referencia: 'NR-17 Anexo II',
        titulo: 'Coluna vertebral',
        status: 'nao_conforme',
        detalhe: 'Flexão lombar média 28° — acima do limite recomendado para trabalho sentado prolongado.',
      },
      {
        id: 'nr17-pescoco',
        referencia: 'NR-17 Anexo II',
        titulo: 'Pescoço / cabeça',
        status: 'nao_conforme',
        detalhe: 'Inclinação anterior média 38° — risco de DORT cervical.',
      },
      {
        id: 'nr17-tela',
        referencia: 'NR-17 17.5.2',
        titulo: 'Distância olhos-tela',
        status: 'nao_conforme',
        detalhe: 'Distância medida 42 cm — abaixo da faixa 50–70 cm.',
      },
      {
        id: 'nr17-iluminacao',
        referencia: 'NR-17 17.5.3',
        titulo: 'Iluminação',
        status: 'atencao',
        detalhe: 'Lux estimado 180 — limite inferior para tarefas visuais prolongadas.',
      },
    ],
    regionsMostAffected: ['Pescoço', 'Ombros', 'Região lombar'],
    recommendations: [
      { titulo: 'Ajustar distância monitor', prioridade: 'alta', descricao: 'Posicionar tela a 55–65 cm dos olhos.' },
      { titulo: 'Suporte documental', prioridade: 'media', descricao: 'Utilizar suporte para evitar flexão cervical.' },
    ],
    ergoIndices: { internalConformityIndex: 42, posturalLoadIndex: 71, exposureIndex: 68 },
    samplingConfidence: { level: 'alta', label: 'Amostra suficiente', sampleCount: 420, durationSecs: 185 },
  };
}

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  INSPEÇÃO DE CAMPO — Ergonomista Sênior · ErgoSensePro');
  console.log(`  Tenant: ${TENANT} · ${new Date().toLocaleString('pt-BR')}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  // ── FASE 0: Chegada ao posto (conectividade) ──
  const health = await api('/api/health');
  if (health.status !== 200 || !health.json?.ok) {
    issue('Conectividade', 'critico', 'API indisponível', BASE);
    printReport();
    process.exit(2);
  }
  ok('Conectividade', `API online — DB ${health.json.database ?? 'ok'}`);

  const login = await api('/api/auth/login', {
    method: 'POST',
    body: { email: EMAIL, password: PASSWORD },
  });
  if (login.status !== 200 || !login.json?.accessToken) {
    issue('Acesso', 'critico', 'Login falhou', `status ${login.status}`);
    printReport();
    process.exit(1);
  }
  const token = login.json.accessToken;
  ok('Acesso', `Autenticado como ${login.json.user?.name} (${login.json.user?.role})`);

  const q = (path) => api(`${path}?tenantId=${TENANT}`, { token });

  // ── FASE 1: Reconhecimento do ambiente ──
  console.log('\n── FASE 1 · Reconhecimento do posto ──');

  const [sectors, collabs, org, groDash, aetDash] = await Promise.all([
    q('/api/sectors'),
    q('/api/collaborators'),
    q('/api/org/tree'),
    q('/api/gro/dashboard'),
    q('/api/aet/dashboard'),
  ]);

  if (sectors.status !== 200) issue('Reconhecimento', 'alto', 'Setores inacessíveis', `HTTP ${sectors.status}`);
  else ok('Reconhecimento', `${sectors.json.length} setores mapeados`);

  if (collabs.status !== 200 || !collabs.json?.length) {
    issue('Reconhecimento', 'critico', 'Sem colaboradores cadastrados — impossível iniciar AEP');
  } else {
    ok('Reconhecimento', `${collabs.json.length} colaboradores no tenant`);
  }

  if (org.status === 200) ok('Reconhecimento', 'Estrutura organizacional carregada');
  else issue('Reconhecimento', 'medio', 'Árvore organizacional indisponível', `HTTP ${org.status}`);

  const collab = collabs.json?.[0];
  if (!collab) {
    printReport();
    process.exit(1);
  }

  console.log(`\n  📋 Colaborador inspecionado: ${collab.name} · Mat. ${collab.matricula} · Setor ${collab.setor ?? '—'}`);

  // ── FASE 2: Avaliação ergonômica in loco ──
  console.log('\n── FASE 2 · Avaliação postural (teleatendimento) ──');

  const nr17Report = buildFieldNr17Report();
  const analysisPayload = {
    collaboratorId: collab.id,
    collaboratorName: collab.name,
    activity: 'Atendimento telefônico — pausa programada insuficiente',
    activityContext: 'teleatendimento',
    mode: 'complete',
    notes:
      'Inspeção de campo: operador com headset, dual monitor, cadeira sem apoio lombar regulado. ' +
      'Observação de 3 min de amostragem contínua.',
    date: new Date().toLocaleDateString('pt-BR'),
    time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    recordingSecs: 185,
    maxRiskStreakSecs: 142,
    totalRiskSecs: 126,
    sessionSampleCount: 420,
    score: 74,
    risk: 'alto',
    rula: 6,
    reba: 9,
    angles: FIELD_ANGLES,
    workstation: FIELD_WORKSTATION,
    nr17Report,
    synced: true,
  };

  const createAnalysis = await api(`/api/analyses?tenantId=${TENANT}`, {
    method: 'POST',
    token,
    body: analysisPayload,
  });

  if (createAnalysis.status !== 201) {
    issue('Análise', 'critico', 'Falha ao registrar análise de campo', createAnalysis.json?.error ?? `HTTP ${createAnalysis.status}`);
  } else {
    ok('Análise', `Análise registrada ID ${createAnalysis.json.id}`);
  }

  const analysisId = createAnalysis.json?.id;

  // Validar leitura e consistência
  if (analysisId) {
    const list = await q('/api/analyses');
    const saved = list.json?.find((a) => String(a.id) === String(analysisId));
    if (!saved) {
      issue('Análise', 'alto', 'Análise criada não aparece na listagem');
    } else {
      ok('Análise', `Score ${saved.score} · RULA ${saved.rula} · REBA ${saved.reba} · risco ${saved.risk}`);
      if (saved.nr17Report?.overallStatus === 'nao_conforme') {
        ok('NR-17', `Status global: NÃO CONFORME — coerente com postura observada`);
      } else {
        issue('NR-17', 'alto', 'Status NR-17 não reflete inconformidade registrada', saved.nr17Report?.overallStatus);
      }
      if (saved.rula >= 5) ok('RULA', `Score ${saved.rula} — ação ergonômica imediata (NR-17)`);
      else issue('RULA', 'medio', `RULA ${saved.rula} — esperado ≥5 para postura simulada`);
    }
  }

  // ── FASE 3: Integração GRO / inventário ──
  console.log('\n── FASE 3 · GRO e inventário de riscos ──');

  const [invSummary, groInd] = await Promise.all([q('/api/risk-inventory/summary'), q('/api/gro/indicators')]);

  if (groDash.status === 200) ok('GRO', `Dashboard GRO — ${groDash.json?.totalRisks ?? 0} riscos mapeados`);
  else issue('GRO', 'medio', 'Dashboard GRO indisponível', `HTTP ${groDash.status}`);

  if (invSummary.status === 200) ok('Inventário', `Resumo inventário carregado (${invSummary.json?.total ?? '?'} itens)`);
  else issue('Inventário', 'medio', 'Inventário indisponível', `HTTP ${invSummary.status}`);

  // ── FASE 4: AET (obrigatória se inconforme) ──
  console.log('\n── FASE 4 · AET — Análise Ergonômica do Trabalho ──');

  const aetTitle = `AET Campo — ${collab.name} — Teleatendimento ${new Date().toLocaleDateString('pt-BR')}`;
  const createAet = await api(`/api/aet/processos?tenantId=${TENANT}`, {
    method: 'POST',
    token,
    body: { title: aetTitle, collaboratorId: collab.id, analysisId: analysisId ?? undefined },
  });

  if (createAet.status !== 201) {
    issue('AET', 'alto', 'Não foi possível abrir processo AET', createAet.json?.error ?? `HTTP ${createAet.status}`);
  } else {
    ok('AET', `Processo AET #${createAet.json.id} criado — "${aetTitle}"`);
    const advance = await api(`/api/aet/processos/${createAet.json.id}/advance?tenantId=${TENANT}`, {
      method: 'POST',
      token,
      body: { tenantId: TENANT },
    });
    if (advance.status === 200) ok('AET', `Etapa avançada para ${advance.json.stage ?? advance.json.etapa_atual ?? '—'}`);
    else issue('AET', 'medio', 'Workflow AET não avançou etapa', `HTTP ${advance.status}`);
  }

  // ── FASE 5: Psicossocial (contexto organizacional) ──
  console.log('\n── FASE 5 · Fatores psicossociais (NR-01) ──');

  const psicoDash = await q('/api/psico/dashboard');
  if (psicoDash.status === 200) ok('Psicossocial', 'Dashboard psicossocial acessível');
  else issue('Psicossocial', 'medio', 'Módulo psicossocial indisponível', psicoDash.json?.error ?? `HTTP ${psicoDash.status}`);

  // ── FASE 6: IA Expert (se configurada) ──
  console.log('\n── FASE 6 · Parecer IA Expert ──');

  const aiStatus = await api('/api/system/ai-status', { token });
  if (aiStatus.status === 200 && aiStatus.json?.configured) {
    ok('IA', `Provedor ${aiStatus.json.provider} configurado`);
    if (analysisId) {
      const aiAnalyze = await api(`/api/ai/expert/analyze-ergonomics?tenantId=${TENANT}`, {
        method: 'POST',
        token,
        body: {
          prompt: `Inspeção de campo: ${collab.name}, teleatendimento, RULA ${analysisPayload.rula}, NR-17 não conforme.`,
          entityRefs: { analysisId: String(analysisId) },
          modules: ['analises', 'org', 'inventario'],
        },
      });
      if (aiAnalyze.status === 200) ok('IA', 'Parecer ergonômico IA gerado com sucesso');
      else issue('IA', 'medio', 'Falha no parecer IA', aiAnalyze.json?.error ?? `HTTP ${aiAnalyze.status}`);
    }
  } else {
    issue('IA', 'medio', 'IA Expert não configurada — parecer automatizado indisponível em campo');
  }

  // ── FASE 7: Relatórios ──
  console.log('\n── FASE 7 · Relatórios ──');

  const reports = await q('/api/reports');
  if (reports.status === 200) {
    const nr17Reports = reports.json?.filter((r) => r.type === 'NR17' || r.tipo === 'NR17') ?? [];
    ok('Relatórios', `${reports.json?.length ?? 0} relatórios · ${nr17Reports.length} NR-17`);
  } else issue('Relatórios', 'medio', 'Listagem de relatórios falhou', `HTTP ${reports.status}`);

  printReport();
  process.exit(findings.some((f) => f.severity === 'critico') ? 1 : 0);
}

function printReport() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  LAUDO DA INSPEÇÃO DE CAMPO');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`\n  Verificações OK: ${passes.length}`);
  console.log(`  Achados: ${findings.length}`);

  if (findings.length) {
    console.log('\n  ACHADOS DO ERGONOMISTA:');
    for (const f of findings) {
      console.log(`    [${f.severity.toUpperCase()}] ${f.msg}`);
      if (f.detail) console.log(`           ${f.detail}`);
    }
  }

  const crit = findings.filter((f) => f.severity === 'critico').length;
  const alto = findings.filter((f) => f.severity === 'alto').length;

  console.log('\n  VEREDITO OPERACIONAL:');
  if (crit > 0) {
    console.log('  🔴 Sistema com falhas críticas — inspeção incompleta. Corrigir antes de uso em campo.');
  } else if (alto > 0) {
    console.log('  🟠 Sistema utilizável com ressalvas — registrar AET e medidas corretivas.');
  } else if (findings.length === 0) {
    console.log('  🟢 Fluxo de inspeção completo — sistema apto para apoio à AET em campo.');
  } else {
    console.log('  🟡 Sistema operacional — observações menores registradas.');
  }

  console.log('\n  CENÁRIO SIMULADO: teleatendimento · postura não conforme · RULA 6 · AET aberta');
  console.log('═══════════════════════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
