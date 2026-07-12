/** Contexto de trabalho — define o foco da avaliação ergonômica (NR-17) */
export type ActivityContext =
  | 'escritorio'
  | 'mineracao'
  | 'industrial'
  | 'construcao_civil'
  | 'logistica'
  | 'almoxarifado'
  | 'oficina'
  | 'manutencao'
  | 'operacao_equipamentos'
  | 'laboratorio'
  | 'campo'
  | 'montagem_eletromecanica'
  | 'motorista'
  | 'servicos_gerais';

export interface ActivityProfile {
  id: ActivityContext;
  label: string;
  icon: string;
  description: string;
  activities: string[];
  /** Métricas de tela/monitor (posto administrativo) */
  assessVisualDisplay: boolean;
  /** Ênfase em postura sentada prolongada */
  sedentary: boolean;
  /** Ênfase em pé, deslocamento ou carga */
  fieldOrPhysical: boolean;
}

export const ACTIVITY_PROFILES: ActivityProfile[] = [
  {
    id: 'escritorio',
    label: 'Escritório / administrativo',
    icon: '🖥️',
    description: 'Trabalho sentado com computador, teleatendimento, reuniões e análise de documentos.',
    activities: [
      'Trabalho em computador',
      'Teleatendimento / call center',
      'Reuniões e videoconferência',
      'Digitação e documentação',
      'Leitura de documentos',
      'Design / CAD em estação sentada',
    ],
    assessVisualDisplay: true,
    sedentary: true,
    fieldOrPhysical: false,
  },
  {
    id: 'mineracao',
    label: 'Mineração',
    icon: '⛏️',
    description: 'Britagem, beneficiamento, perfuração, carregamento, operação de equipamentos pesados.',
    activities: [
      'Operação de britagem',
      'Beneficiamento de minério',
      'Operação de caminhão fora de estrada',
      'Perfuração e desmonte',
      'Carregamento e transporte',
      'Manutenção em área operacional',
      'Inspeção de correias e britadores',
    ],
    assessVisualDisplay: false,
    sedentary: false,
    fieldOrPhysical: true,
  },
  {
    id: 'logistica',
    label: 'Logística',
    icon: '📦',
    description: 'Armazenagem, separação, expedição, movimentação de materiais e operação de empilhadeiras.',
    activities: [
      'Separação e picking',
      'Expedição e conferência',
      'Operação de empilhadeira',
      'Carregamento de caminhões',
      'Movimentação de pallets',
      'Inventário e contagem',
    ],
    assessVisualDisplay: false,
    sedentary: false,
    fieldOrPhysical: true,
  },
  {
    id: 'almoxarifado',
    label: 'Almoxarifado',
    icon: '🏷️',
    description: 'Recebimento, armazenagem, separação de materiais e controle de estoque.',
    activities: [
      'Recebimento de materiais',
      'Armazenagem em prateleiras',
      'Separação para produção',
      'Inventário cíclico',
      'Movimentação manual de peças',
    ],
    assessVisualDisplay: false,
    sedentary: false,
    fieldOrPhysical: true,
  },
  {
    id: 'oficina',
    label: 'Oficina',
    icon: '🔩',
    description: 'Usinagem, torno, fresa, bancada e montagem mecânica em ambiente industrial.',
    activities: [
      'Operação de torno / fresa',
      'Montagem mecânica em bancada',
      'Retífica e acabamento',
      'Setup de ferramentas',
      'Soldagem de manutenção',
    ],
    assessVisualDisplay: false,
    sedentary: false,
    fieldOrPhysical: true,
  },
  {
    id: 'manutencao',
    label: 'Manutenção',
    icon: '🛠️',
    description: 'Manutenção preventiva, corretiva, preditiva e paradas programadas.',
    activities: [
      'Manutenção preventiva',
      'Manutenção corretiva emergencial',
      'Lubrificação e inspeção',
      'Substituição de componentes',
      'Manutenção eletromecânica',
      'Parada programada',
    ],
    assessVisualDisplay: false,
    sedentary: false,
    fieldOrPhysical: true,
  },
  {
    id: 'operacao_equipamentos',
    label: 'Operação de equipamentos',
    icon: '🚜',
    description: 'Operação de máquinas, tratores, escavadeiras, guindastes e equipamentos móveis.',
    activities: [
      'Operação de escavadeira',
      'Operação de guindaste',
      'Operação de tratores',
      'Operação de ponte rolante',
      'Operação de retroescavadeira',
      'Operação de equipamentos móveis',
    ],
    assessVisualDisplay: false,
    sedentary: true,
    fieldOrPhysical: true,
  },
  {
    id: 'laboratorio',
    label: 'Laboratório',
    icon: '🔬',
    description: 'Análises químicas, microscopia, preparo de amostras e trabalho em bancada.',
    activities: [
      'Análise química em bancada',
      'Microscopia e preparo de amostras',
      'Pipetagem e dosagem',
      'Trabalho com microscópio',
      'Documentação de resultados',
    ],
    assessVisualDisplay: false,
    sedentary: true,
    fieldOrPhysical: false,
  },
  {
    id: 'campo',
    label: 'Campo / operações externas',
    icon: '⛏️',
    description: 'Inspeção, manutenção em área operacional, britagem, logística de campo e atividades a céu aberto.',
    activities: [
      'Operação de britagem',
      'Inspeção de equipamentos',
      'Manutenção em campo',
      'Operação de empilhadeira / movimentação',
      'Sondagem e amostragem',
      'Operação de britador / peneira',
      'Limpeza e housekeeping industrial',
    ],
    assessVisualDisplay: false,
    sedentary: false,
    fieldOrPhysical: true,
  },
  {
    id: 'construcao_civil',
    label: 'Construção civil',
    icon: '🏗️',
    description: 'Fundações, estruturas, alvenaria, acabamento, andaimes e montagem em obra.',
    activities: [
      'Montagem de estruturas metálicas',
      'Concretagem e armação',
      'Trabalho em andaime / altura',
      'Alvenaria e acabamento',
      'Operação de betoneira / bomba',
      'Carpintaria e formas',
      'Demolição e preparação de solo',
    ],
    assessVisualDisplay: false,
    sedentary: false,
    fieldOrPhysical: true,
  },
  {
    id: 'montagem_eletromecanica',
    label: 'Montagem eletromecânica',
    icon: '⚡',
    description: 'Painéis, cabos, instrumentação, manutenção eletromecânica e montagem industrial.',
    activities: [
      'Montagem de painéis elétricos',
      'Lançamento e terminação de cabos',
      'Manutenção eletromecânica',
      'Calibração de instrumentos',
      'Soldagem eletromecânica',
      'Testes e comissionamento',
      'Manutenção de motores e acionamentos',
    ],
    assessVisualDisplay: false,
    sedentary: false,
    fieldOrPhysical: true,
  },
  {
    id: 'motorista',
    label: 'Motorista / operador de veículos',
    icon: '🚛',
    description: 'Caminhões, empilhadeiras, tratores, equipamentos móveis e transporte de carga.',
    activities: [
      'Condução de caminhão',
      'Operação de empilhadeira',
      'Operação de tratores / equipamentos móveis',
      'Transporte de materiais',
      'Operação de guindaste / munck',
      'Condução em mina / pedreira',
    ],
    assessVisualDisplay: false,
    sedentary: true,
    fieldOrPhysical: true,
  },
  {
    id: 'industrial',
    label: 'Industrial / produção',
    icon: '🏭',
    description: 'Linha de produção, operação de máquinas, controle de processo e embalagem.',
    activities: [
      'Operação de linha de produção',
      'Operação de torno / CNC (em pé)',
      'Controle de processo (sala HMI)',
      'Embalagem e expedição',
      'Operação de forno / alto forno',
      'Troca de ferramentas e setup',
    ],
    assessVisualDisplay: false,
    sedentary: false,
    fieldOrPhysical: true,
  },
  {
    id: 'servicos_gerais',
    label: 'Serviços gerais / outras',
    icon: '🔧',
    description: 'Soldagem, caldeiraria, limpeza industrial, segurança e demais atividades não listadas.',
    activities: [
      'Soldagem MIG / TIG',
      'Caldeiraria e corte',
      'Limpeza industrial',
      'Segurança do trabalho (patrulha)',
      'Almoxarifado e separação',
      'Outra atividade (descrever em observações)',
    ],
    assessVisualDisplay: false,
    sedentary: false,
    fieldOrPhysical: true,
  },
];

export function profileForContext(context: ActivityContext): ActivityProfile {
  return ACTIVITY_PROFILES.find((p) => p.id === context) ?? ACTIVITY_PROFILES[1];
}

export function activitiesForContext(context: ActivityContext): string[] {
  return profileForContext(context).activities;
}

export const ALL_ACTIVITIES: string[] = ACTIVITY_PROFILES.flatMap((p) => p.activities);

export function contextLabel(context: ActivityContext): string {
  return profileForContext(context).label;
}

export const DEFAULT_ACTIVITY_CONTEXT: ActivityContext = 'campo';
