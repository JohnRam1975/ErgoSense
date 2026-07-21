/**
 * eSocial — atualização futura (em breve).
 * Telas mantidas no roteador para não quebrar o menu; conteúdo = placeholder.
 */
import { ComingSoonPanel } from '../components/UI';

function EsocialComingSoon({ title }: { title: string }) {
  return (
    <div className="scroll pad">
      <ComingSoonPanel
        title={title}
        subtitle="Atualização futura — integração eSocial (S-2210 · S-2220 · S-2240 · gov.br / ICP-Brasil)."
        badge="Em breve"
      />
    </div>
  );
}

export function EsocialDashboardScreen() {
  return <EsocialComingSoon title="eSocial" />;
}

export function EsocialS2210Screen() {
  return <EsocialComingSoon title="eSocial S-2210 — CAT" />;
}

export function EsocialS2220Screen() {
  return <EsocialComingSoon title="eSocial S-2220 — ASO" />;
}

export function EsocialS2240Screen() {
  return <EsocialComingSoon title="eSocial S-2240 — Agentes" />;
}

export function EsocialHistoricoScreen() {
  return <EsocialComingSoon title="Histórico eSocial" />;
}

export function EsocialConfigScreen() {
  return <EsocialComingSoon title="Configuração eSocial" />;
}
