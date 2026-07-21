function baseExpert({ name, domain, focus, norms, tools = [], templates = {}, contextModules = ['all'] }) {
  return {
    name,
    domain,
    contextModules,
    temperature: 0.25,
    systemPrompt: `Você é o especialista ${name} do ErgoSense.
Domínio: ${domain}.
Foco: ${focus}.
Normas de referência: ${norms.join(', ')}.
Responda em português brasileiro, com rigor técnico SST, citando normas quando aplicável.
Nunca substitua avaliação presencial ou parecer de profissional habilitado.`,
    tools,
    templates,
    buildPrompt({ action, params, context }) {
      return `${this.templates[action] ?? `Ação: ${action}`}

Parâmetros: ${JSON.stringify(params)}

Contexto operacional (JSON):
${JSON.stringify(context).slice(0, 100_000)}`;
    },
    parseResponse(text) {
      try {
        const fenced = text.match(/```json\s*([\s\S]*?)```/);
        if (fenced) return JSON.parse(fenced[1]);
      } catch {
        /* narrative only */
      }
      return { narrative: text };
    },
  };
}

export const NR01Expert = baseExpert({
  name: 'NR01 Expert',
  domain: 'NR-01 — Gerenciamento de Riscos Ocupacionais',
  focus: 'Inventário de riscos, GRO, PGR, hierarquia de controles, due diligence',
  norms: ['NR-01', 'NR-17', 'CLT art. 157'],
  tools: [
    { name: 'inventario_riscos', actions: ['analyze', 'gap'] },
    { name: 'hierarquia_controles', actions: ['recommend'] },
  ],
  templates: {
    analyze: 'Analise conformidade NR-01 com base no inventário e ciclo GRO.',
    gap: 'Identifique lacunas de conformidade NR-01 e priorize ações.',
    recommend: 'Recomende controles seguindo hierarquia NR-01.',
  },
});

export const GroExpert = baseExpert({
  name: 'GRO Expert',
  domain: 'Gerenciamento de Riscos Ocupacionais — Ciclo GRO',
  focus: 'Identificação, avaliação, controle, monitoramento e revisão',
  norms: ['NR-01', 'ISO 45001'],
  tools: [{ name: 'gro_ciclo', actions: ['stage_review', 'maturity'] }],
  templates: {
    stage_review: 'Avalie maturidade do estágio GRO atual e próximos passos.',
    maturity: 'Calcule score de maturidade GRO e plano de evolução.',
  },
  contextModules: ['gro', 'risk_inventory'],
});

export const PgrExpert = baseExpert({
  name: 'PGR Expert',
  domain: 'Programa de Gerenciamento de Riscos',
  focus: 'Estrutura PGR, revisões, comunicação e evidências',
  norms: ['NR-01', 'NR-09'],
  tools: [{ name: 'pgr_snapshot', actions: ['review', 'draft'] }],
  templates: {
    review: 'Revise PGR vigente e apontar não conformidades.',
    draft: 'Sugira estrutura de PGR alinhada ao inventário de riscos.',
  },
  contextModules: ['pgr', 'gro'],
});

export const AetExpert = baseExpert({
  name: 'AET Expert',
  domain: 'Análise Ergonômica do Trabalho',
  focus: 'Demanda cognitiva/física, postura, repetitividade, pausas, mobiliário',
  norms: ['NR-17', 'NR-01'],
  tools: [{ name: 'aet_assessment', actions: ['analyze', 'report'] }],
  templates: {
    analyze: 'Analise postos de trabalho e riscos ergonômicos.',
    report: 'Gere estrutura de relatório AET corporativo.',
  },
  contextModules: ['aet', 'org'],
});

export const ErgonomiaExpert = baseExpert({
  name: 'Ergonomia Expert',
  domain: 'Ergonomia física e cognitiva',
  focus: 'REBA, RULA, carga mental, layout, antropometria',
  norms: ['NR-17', 'ISO 6385'],
  tools: [{ name: 'ergo_scoring', actions: ['score', 'intervene'] }],
  templates: {
    score: 'Aplique metodologia ergonômica aos dados disponíveis.',
    intervene: 'Proponha intervenções ergonômicas priorizadas.',
  },
});

export const PsicossocialExpert = baseExpert({
  name: 'Psicossocial Expert',
  domain: 'Riscos psicossociais e COPSOQ',
  focus: 'Campanhas, scoring, fatores organizacionais, NR-01 psicossocial',
  norms: ['NR-01', 'NR-17 Anexo II', 'COPSOQ'],
  tools: [{ name: 'psico_scoring', actions: ['analyze', 'campaign'] }],
  templates: {
    analyze: 'Interprete resultados psicossociais e riscos críticos.',
    campaign: 'Sugira ações para campanha psicossocial ativa.',
  },
  contextModules: ['psico'],
});

export const EsocialExpert = baseExpert({
  name: 'eSocial Expert',
  domain: 'Transmissão e conformidade eSocial SST',
  focus: 'Eventos SST, XML, lotes, retornos, prazos',
  norms: ['eSocial MTE', 'NR-01'],
  tools: [{ name: 'esocial_xml', actions: ['validate', 'transmit'] }],
  templates: {
    validate: 'Valide conformidade dos eventos eSocial pendentes.',
    transmit: 'Oriente sequência de transmissão e tratamento de retornos.',
  },
  contextModules: ['esocial'],
});

export const ComplianceExpert = baseExpert({
  name: 'Compliance Expert',
  domain: 'Inteligência regulatória e monitoramento',
  focus: 'Diff normativo, impactos, alertas, cronograma',
  norms: ['NR-01', 'Portarias MTE'],
  tools: [{ name: 'compliance_monitor', actions: ['impact', 'alert'] }],
  templates: {
    impact: 'Avalie impacto de mudanças normativas no tenant.',
    alert: 'Priorize alertas de compliance abertos.',
  },
  contextModules: ['compliance'],
});

export const AuditorSstExpert = baseExpert({
  name: 'Auditor SST Expert',
  domain: 'Auditoria técnica e due diligence SST',
  focus: 'Evidências, trilhas, gaps, plano de ação auditável',
  norms: ['NR-01', 'ISO 45001', 'ISO 19011'],
  tools: [{ name: 'audit_trail', actions: ['audit', 'checklist'] }],
  templates: {
    audit: 'Execute auditoria SST com achados, severidade e recomendações.',
    checklist: 'Gere checklist de auditoria por módulo.',
  },
});
