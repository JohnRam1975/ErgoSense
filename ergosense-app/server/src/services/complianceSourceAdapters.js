/**
 * Adaptadores de fontes regulatórias — MTE · DOU · Fundacentro · eSocial
 * Arquitetura ports/adapters preparada para RSS/API real.
 */
export const SOURCE_CODES = ['MTE', 'DOU', 'FUNDACENTRO', 'ESOCIAL'];

const REGULATORY_CATALOG = [
  {
    fonte: 'MTE',
    tipo: 'REVISAO',
    codigo: 'NR-01',
    titulo: 'NR-01 — Disposições Gerais e Gerenciamento de Riscos Ocupacionais (revisão)',
    resumo: 'Atualização de requisitos do PGR, GRO e inventário de riscos.',
    textoCompleto:
      'NR-01 revisada: reforço do ciclo PGR/GRO, inventário de riscos obrigatório incluindo psicossociais, ' +
      'responsabilidades do empregador e do responsável técnico. Exige revisão programada do PGR.',
    url: 'https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao/seguranca-e-saude-no-trabalho/normas-regulamentadoras/normas-regulamentadoras-vigentes/nr-01',
    modulos: ['PGR', 'GRO', 'INVENTARIO'],
    impacto: 'alto',
    dataPublicacao: '2026-03-15',
  },
  {
    fonte: 'MTE',
    tipo: 'REVISAO',
    codigo: 'NR-17',
    titulo: 'NR-17 — Ergonomia (anexo operacional)',
    resumo: 'Revisão de requisitos de mobiliário, pausas e avaliação ergonômica.',
    textoCompleto:
      'NR-17: atualização dos requisitos de mobiliário (17.3.2), pausas em teleatendimento (17.6.3), ' +
      'organização do trabalho (17.1.1.1) e obrigatoriedade de AET documentada para postos críticos.',
    url: 'https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao/seguranca-e-saude-no-trabalho/normas-regulamentadoras/normas-regulamentadoras-vigentes/nr-17',
    modulos: ['NR17', 'AET'],
    impacto: 'alto',
    dataPublicacao: '2026-04-01',
  },
  {
    fonte: 'DOU',
    tipo: 'NOVA_NORMA',
    codigo: 'PORTARIA-MTE-2026-042',
    titulo: 'Portaria MTE nº 042/2026 — Diretrizes de fatores psicossociais no PGR',
    resumo: 'Inclusão obrigatória de riscos psicossociais no inventário NR-01.',
    textoCompleto:
      'Portaria publicada no DOU: fatores psicossociais MTE devem constar do inventário de riscos e do PGR, ' +
      'com plano de ação e indicadores de monitoramento. Vigência 90 dias após publicação.',
    url: 'https://www.in.gov.br/consulta',
    modulos: ['PSICOSSOCIAL', 'PGR', 'INVENTARIO'],
    impacto: 'critico',
    dataPublicacao: '2026-05-10',
    referenciaDou: 'DOU Seção 1 — 10/05/2026',
  },
  {
    fonte: 'FUNDACENTRO',
    tipo: 'REVISAO',
    codigo: 'FUND-NR17-GUIA',
    titulo: 'Fundacentro — Guia técnico de avaliação ergonômica',
    resumo: 'Atualização de metodologias RULA, REBA e OWAS para laudos AET.',
    textoCompleto:
      'Guia Fundacentro revisado: critérios de aplicação RULA/REBA/OWAS, amostragem mínima e ' +
      'integração com inventário de riscos ergonômicos NR-01.',
    url: 'https://www.gov.br/fundacentro/pt-br',
    modulos: ['AET', 'NR17'],
    impacto: 'medio',
    dataPublicacao: '2026-02-20',
  },
  {
    fonte: 'ESOCIAL',
    tipo: 'REVISAO',
    codigo: 'ESOCIAL-S-1.3',
    titulo: 'eSocial — Nota técnica layout S-1.3 (S-2210, S-2220, S-2240)',
    resumo: 'Alteração de campos obrigatórios em eventos SST.',
    textoCompleto:
      'Layout S-1.3: novos campos em S-2240 (agentes nocivos), validação XSD atualizada, ' +
      'exigência de certificado ICP-Brasil para transmissão em produção.',
    url: 'https://www.gov.br/esocial/pt-br',
    modulos: ['ESOCIAL', 'SST'],
    impacto: 'critico',
    dataPublicacao: '2026-06-01',
  },
  {
    fonte: 'MTE',
    tipo: 'REVOGACAO',
    codigo: 'NR-04-LEGADO',
    titulo: 'Revogação parcial — NR-04 dispositivos obsoletos',
    resumo: 'Dispositivos substituídos pela NR-01.',
    textoCompleto:
      'Revogação parcial de dispositivos da NR-04 absorvidos pela NR-01. Serviços especializados em engenharia ' +
      'de segurança devem migrar referências para o PGR integrado.',
    url: 'https://www.gov.br/trabalho-e-emprego/pt-br',
    modulos: ['COMPLIANCE', 'PGR'],
    impacto: 'medio',
    dataPublicacao: '2026-01-15',
  },
  {
    fonte: 'DOU',
    tipo: 'RETIFICACAO',
    codigo: 'NR-01',
    titulo: 'Retificação DOU — NR-01 prazo de adequação PGR',
    resumo: 'Correção de prazo de transição para adequação do PGR.',
    textoCompleto: 'Retificação: prazo de adequação do PGR estendido de 60 para 90 dias para empresas de médio porte.',
    url: 'https://www.in.gov.br/consulta',
    modulos: ['PGR'],
    impacto: 'medio',
    dataPublicacao: '2026-05-20',
    referenciaDou: 'DOU Retificação — 20/05/2026',
  },
];

export function getAdapterForSource(codigo) {
  const adapters = {
    MTE: fetchMteItems,
    DOU: fetchDouItems,
    FUNDACENTRO: fetchFundacentroItems,
    ESOCIAL: fetchEsocialItems,
  };
  return adapters[codigo] ?? null;
}

export async function fetchMteItems() {
  return REGULATORY_CATALOG.filter((i) => i.fonte === 'MTE');
}

export async function fetchDouItems() {
  return REGULATORY_CATALOG.filter((i) => i.fonte === 'DOU');
}

export async function fetchFundacentroItems() {
  return REGULATORY_CATALOG.filter((i) => i.fonte === 'FUNDACENTRO');
}

export async function fetchEsocialItems() {
  return REGULATORY_CATALOG.filter((i) => i.fonte === 'ESOCIAL');
}

export async function fetchAllSourceItems(activeSources) {
  const items = [];
  for (const cod of activeSources) {
    const adapter = getAdapterForSource(cod);
    if (adapter) items.push(...(await adapter()));
  }
  return items;
}

export { REGULATORY_CATALOG };
