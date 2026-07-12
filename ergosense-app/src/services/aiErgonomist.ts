/**
 * Módulo 11 — Agente Ergonomista IA (regras + NR-17 / ISO / Fundacentro)
 */
import type { ErgonomicMethodResult } from '../methods/types';
import { ERGONOMIC_CRITERIA_VERSION } from '../config/ergonomicCriteriaMaster';

export interface AiErgonomistReport {
  diagnostico: string;
  conclusaoTecnica: string;
  recomendacoes: string[];
  planoAcao: { prazo: string; acao: string; responsavel: string }[];
  normas: string[];
  criteriaVersion: string;
  revisaoHumanaObrigatoria: boolean;
}

export function generateAiErgonomistReport(
  methods: ErgonomicMethodResult[],
  context?: { setor?: string; atividade?: string; colaborador?: string },
): AiErgonomistReport {
  const critical = methods.filter((m) => m.classification === 'critico' || m.classification === 'alto');
  const names = critical.map((m) => m.methodName).join(', ') || 'nenhum método crítico';

  const diagnostico =
    critical.length > 0
      ? `Foram identificados riscos ergonômicos relevantes nos métodos: ${names}. ` +
        `Setor ${context?.setor ?? '—'}, atividade ${context?.atividade ?? '—'}.`
      : `Avaliação ergonômica global dentro de parâmetros aceitáveis para ${context?.atividade ?? 'a atividade'}.`;

  const conclusaoTecnica =
    critical.length >= 2
      ? 'Conclusão: exposição ocupacional requer intervenção conforme NR-17 (AEP/AET) e priorização de controles de engenharia e organizacionais.'
      : critical.length === 1
        ? 'Conclusão: risco moderado a alto em um eixo — monitorar e implementar medidas corretivas pontuais.'
        : 'Conclusão: condições observadas compatíveis com manutenção do posto e pausas programadas (NR-17).';

  const recomendacoes = [
    ...new Set(methods.flatMap((m) => m.recommendation)),
  ].slice(0, 8);

  const planoAcao = critical.length
    ? [
        { prazo: 'Imediato', acao: 'Corrigir postura crítica e distância da carga', responsavel: 'SESMT / Líder' },
        { prazo: '7 dias', acao: 'Revisar posto de trabalho e pausas', responsavel: 'Ergonomista' },
        { prazo: '30 dias', acao: 'Validar eficácia e registrar AET se necessário', responsavel: 'RH / SST' },
      ]
    : [
        { prazo: 'Contínuo', acao: 'Manter pausas e monitoramento trimestral', responsavel: 'Gestor' },
      ];

  return {
    diagnostico,
    conclusaoTecnica,
    recomendacoes,
    planoAcao,
    normas: ['NR-17', 'ISO 11226', 'ISO 11228', 'Fundacentro NHOs', 'NIOSH RNLE'],
    criteriaVersion: ERGONOMIC_CRITERIA_VERSION,
    revisaoHumanaObrigatoria: true,
  };
}
