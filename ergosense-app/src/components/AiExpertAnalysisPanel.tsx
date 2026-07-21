/**
 * Painel ErgoSense AI Expert — atualização futura (em breve).
 */
import { ComingSoonPanel } from './UI';
import type { Analysis } from '../types';

interface Props {
  tenantId: string;
  analysis: Analysis;
}

export function AiExpertAnalysisPanel(_props: Props) {
  return (
    <ComingSoonPanel
      title="ErgoSense AI Expert"
      subtitle="Em breve: análise IA da postura, geração de AET/IT e recomendações automáticas. Esta função estará disponível em uma atualização futura."
      badge="Em breve"
    />
  );
}
