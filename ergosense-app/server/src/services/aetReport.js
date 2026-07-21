/**
 * Relatório normativo AET completo — NR-17
 */
import { AET_STAGE_LABELS } from './aetUtils.js';

export function buildAetNormativeReport(processo, extras = {}) {
  const metodos = processo.methods ?? {};
  const now = new Date().toISOString();
  const rt = extras.technicalResponsible ?? {};
  const integrations = extras.integrations ?? null;

  const sections = [
    {
      id: '1',
      title: 'Identificação e Caracterização',
      norma: 'NR-17 17.1',
      content: processo.characterization ?? {},
    },
    {
      id: '2',
      title: 'Mobiliário e Equipamentos do Posto',
      norma: 'NR-17 17.3.2',
      content: {
        mobiliario: extras.furniture ?? [],
        equipamentos: extras.equipment ?? [],
      },
    },
    {
      id: '3',
      title: 'Avaliação Postural — RULA · REBA · OWAS',
      norma: 'RULA McAtamney 1993 · REBA Hignett 2000 · OWAS Karhu 1977',
      content: {
        rula: metodos.rula ?? null,
        reba: metodos.reba ?? null,
        owas: metodos.owas ?? null,
      },
    },
    {
      id: '4',
      title: 'Movimentação Manual de Cargas — NIOSH RNLE',
      norma: 'NIOSH 1991 · RNLE revisada',
      content: metodos.niosh ?? null,
    },
    {
      id: '5',
      title: 'Vibração de Corpo Inteiro',
      norma: 'NR-15 Anexo 1 · ISO 2631-1',
      content: processo.wholeBodyVibration ?? {},
    },
    {
      id: '6',
      title: 'Vibração Mãos e Braços',
      norma: 'NHO-10 · ISO 5349-1',
      content: processo.handArmVibration ?? {},
    },
    {
      id: '7',
      title: 'Teleatendimento / Escritório',
      norma: 'NR-17 · Teleatendimento',
      content: processo.telework ?? {},
    },
    {
      id: '8',
      title: 'Organização do Trabalho',
      norma: 'NR-17 17.1.1.1',
      content: processo.workOrganization ?? {},
    },
    {
      id: '9',
      title: 'Plano de Ação Ergonômico',
      norma: 'NR-17 · PGR',
      content: processo.actionPlan ?? [],
    },
    {
      id: '10',
      title: 'Conclusões e Recomendações',
      norma: 'NR-17 · AET',
      content: buildConclusions(processo, metodos),
    },
  ];

  if (integrations) {
    sections.push({
      id: '11',
      title: 'Integração NR-01 — Inventário · GRO · PGR · Psicossocial',
      norma: 'NR-01 · GRO · PGR',
      content: {
        inventario: integrations.inventario ?? null,
        gro: integrations.gro ?? [],
        pgr: integrations.pgr ?? null,
        psicossocial: integrations.psicossocial ?? [],
        psicossocialCampanha: integrations.psicossocialCampanha ?? null,
      },
    });
  }

  return {
    version: extras.versionNumber ? `AET-CORP-${extras.versionNumber}` : '1.0',
    type: 'AET_NORMATIVO_CORPORATIVO',
    title: processo.title,
    processId: processo.id,
    versionNumber: extras.versionNumber ?? null,
    stage: processo.stage,
    stageLabel: AET_STAGE_LABELS[processo.stage],
    status: processo.status,
    sections,
    responsavelTecnico: {
      nome: rt.nome ?? processo.technicalResponsible ?? '',
      crea: rt.crea ?? processo.technicalResponsibleCrea ?? '',
      art: rt.art ?? processo.technicalResponsibleArt ?? '',
    },
    signatures: {
      preparedBy: processo.preparedBy,
      reviewedBy: processo.reviewedBy,
      ergonomistName: processo.ergonomistName,
      ergonomistRegistry: processo.ergonomistRegistry,
      signedAt: processo.signedAt,
    },
    documentHash: processo.documentHash ?? null,
    integrations: integrations ?? null,
    disclaimer:
      'Laudo técnico de Análise Ergonômica do Trabalho (AET) gerado pelo ErgoSense. ' +
      'Documento com validade após revisão e assinatura do ergonomista responsável (CREA/ABERG). ' +
      'Referências: NR-17, NR-15, NHO-10, ISO 2631-1, ISO 5349, NIOSH RNLE.',
    generatedAt: now,
  };
}

function buildConclusions(processo, metodos) {
  const riscos = [];
  if (metodos.rula?.score >= 5) riscos.push(`RULA score ${metodos.rula.score} — ação imediata`);
  if (metodos.reba?.score >= 8) riscos.push(`REBA score ${metodos.reba.score} — investigação`);
  if (metodos.owas?.owasClass >= 3) riscos.push(`OWAS classe ${metodos.owas.owasClass} — correção`);
  if (metodos.niosh?.liftingIndex > 1) riscos.push(`NIOSH LI ${metodos.niosh.liftingIndex} — acima do recomendado`);
  if (processo.wholeBodyVibration?.nivel === 'acima_limite') riscos.push('Vibração corpo inteiro acima do limite NR-15');
  if (processo.handArmVibration?.nivel === 'acima_limite') riscos.push('Vibração mãos-braços acima do limite NHO-10');
  if (processo.telework?.nivel === 'nao_conforme') riscos.push('Teleatendimento não conforme NR-17');
  if (processo.workOrganization?.nivel === 'nao_conforme') riscos.push('Organização do trabalho inadequada (17.1.1.1)');

  return {
    riscosIdentificados: riscos.length ? riscos : ['Nenhum risco crítico identificado nas avaliações registradas.'],
    conclusaoGeral:
      riscos.length >= 3
        ? 'Posto de trabalho com múltiplos fatores de risco ergonômico. Priorizar plano de ação integrado.'
        : riscos.length >= 1
          ? 'Posto com riscos pontuais. Implementar medidas do plano de ação e reavaliar em 90 dias.'
          : 'Condições ergonômicas aceitáveis nas avaliações realizadas. Manter monitoramento periódico.',
    proximaRevisao: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  };
}
