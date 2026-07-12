/**
 * AI Engine — especialistas SST com prompts, ferramentas e templates próprios.
 */
import {
  NR01Expert,
  GroExpert,
  PgrExpert,
  AetExpert,
  ErgonomiaExpert,
  PsicossocialExpert,
  EsocialExpert,
  ComplianceExpert,
  AuditorSstExpert,
} from './specialists/index.js';
import { generateText } from '../AIProviderService.js';
import { assembleTenantContext } from '../aiExpertContext.js';
import { emitAiAudit } from '../enterpriseAudit.js';

const SPECIALISTS = {
  nr01: NR01Expert,
  gro: GroExpert,
  pgr: PgrExpert,
  aet: AetExpert,
  ergonomia: ErgonomiaExpert,
  psicossocial: PsicossocialExpert,
  esocial: EsocialExpert,
  compliance: ComplianceExpert,
  auditor: AuditorSstExpert,
};

export function listSpecialists() {
  return Object.entries(SPECIALISTS).map(([id, spec]) => ({
    id,
    name: spec.name,
    domain: spec.domain,
    tools: spec.tools.map((t) => t.name),
    templates: Object.keys(spec.templates ?? {}),
  }));
}

export async function runSpecialist({ specialistId, tenantId, userId, action, params = {}, req }) {
  const specialist = SPECIALISTS[specialistId];
  if (!specialist) {
    throw new Error(`Especialista desconhecido: ${specialistId}`);
  }

  const context = await assembleTenantContext(tenantId, specialist.contextModules ?? ['all']);
  const prompt = specialist.buildPrompt({ action, params, context });
  const systemPrompt = specialist.systemPrompt;

  const result = await generateText(prompt, {
    systemPrompt,
    temperature: specialist.temperature ?? 0.3,
  });

  emitAiAudit({
    action: `specialist:${specialistId}:${action}`,
    tenantId,
    userId,
    provider: result.provider,
    tokens: result.usage?.totalTokens,
    req,
  });

  return {
    specialist: specialistId,
    name: specialist.name,
    action,
    response: result.text,
    structured: specialist.parseResponse?.(result.text) ?? null,
    templates: specialist.templates?.[action] ?? null,
    toolsUsed: specialist.tools.filter((t) => t.actions?.includes(action)).map((t) => t.name),
    generatedAt: new Date().toISOString(),
  };
}

export { SPECIALISTS };
