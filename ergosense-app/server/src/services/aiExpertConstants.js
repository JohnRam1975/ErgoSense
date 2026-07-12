/** ErgoSense AI Expert — constantes, disclaimer e metodologias */

export const AI_DISCLAIMER =
  'Análise Técnica Assistida por Inteligência Artificial sujeita à validação profissional. ' +
  'A IA não substitui profissional legalmente habilitado (ergonomista, engenheiro de segurança, médico do trabalho ou equivalente).';

export const EXPERT_DOMAINS = [
  'Ergonomia',
  'NR-17',
  'NR-01',
  'GRO',
  'PGR',
  'Psicossocial',
  'NIOSH',
  'RULA',
  'REBA',
  'OWAS',
  'ISO 11226',
  'Fundacentro',
  'Higiene Ocupacional',
];

export const NORMS_REFERENCED = [
  'NR-01 — Portaria MTE 1.419/2024',
  'NR-17 — Ergonomia',
  'Guia MTE 2025 — Fatores psicossociais',
  'NIOSH — Equação de levantamento manual',
  'RULA — Rapid Upper Limb Assessment',
  'REBA — Rapid Entire Body Assessment',
  'OWAS — Ovako Working Posture Analysing System',
  'ISO 11226 — Posturas estáticas',
  'Fundacentro — Metodologias de avaliação ergonômica',
];

export const CONTROL_HIERARCHY = [
  'eliminação',
  'substituição',
  'controles de engenharia',
  'controles administrativos',
  'EPI',
];

export const EXPERT_SYSTEM_PROMPT =
  'Você é o ErgoSense AI Expert — Especialista Virtual em SST, ergonomia e gestão de riscos ocupacionais no Brasil. ' +
  `Domínios: ${EXPERT_DOMAINS.join(', ')}. ` +
  'Regras obrigatórias:\n' +
  '1) Justifique TODAS as conclusões com evidências dos dados fornecidos e referências normativas.\n' +
  '2) NUNCA apresente apenas scores numéricos — sempre explique o significado técnico.\n' +
  '3) Proponha medidas de controle seguindo a hierarquia: eliminação → substituição → engenharia → administrativo → EPI.\n' +
  '4) Cada medida deve incluir: justificativa, prioridade (crítica/alta/média/baixa), impacto esperado e prazo sugerido.\n' +
  '5) Inclua seção de transparência: dados utilizados, metodologia, normas consideradas e limitações.\n' +
  '6) Repita que a análise é assistida por IA e requer validação profissional.\n' +
  'Responda em português do Brasil, linguagem técnica e estruturada. Prefira JSON válido quando solicitado.';

export const ANALYSIS_LIMITATIONS = [
  'Análise baseada exclusivamente nos dados disponíveis no ErgoSensePro no momento da consulta.',
  'Não inclui inspeção presencial no local de trabalho.',
  'Classificações de risco devem ser validadas por profissional habilitado.',
  'Questionários psicossociais agregados não substituem avaliação clínica individual.',
];
