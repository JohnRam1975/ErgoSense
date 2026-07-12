/** Métricas do posto de trabalho (NR-17 / ergonomia visual) */
export interface WorkstationMetrics {
  /** Distância estimada olhos–tela (cm) */
  telaDistanciaCm: number;
  /** Altura do topo da tela em relação aos olhos */
  telaAltura: 'ideal' | 'baixa' | 'alta';
  /** Iluminação estimada (lux aproximado) */
  lux: number;
  nivelLuz: 'baixo' | 'adequado' | 'alto';
  /** Dominância de luz azul na região da tela (0–100) */
  indiceAzul: number;
  /** Filtro / modo noturno aparente */
  filtroTela: 'adequado' | 'parcial' | 'sem_filtro';
}

export const DEFAULT_WORKSTATION: WorkstationMetrics = {
  telaDistanciaCm: 60,
  telaAltura: 'ideal',
  lux: 400,
  nivelLuz: 'adequado',
  indiceAzul: 35,
  filtroTela: 'parcial',
};
