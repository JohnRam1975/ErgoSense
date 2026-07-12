/**
 * Configuração centralizada de IA — chaves exclusivamente via variáveis de ambiente.
 */
import dotenv from 'dotenv';

dotenv.config();

export const AI_PROVIDERS = ['openai', 'anthropic', 'google', 'deepseek', 'openrouter'];

const ENV_KEY_BY_PROVIDER = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  google: 'GOOGLE_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
};

const DEFAULT_MODEL_BY_PROVIDER = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-sonnet-4-6',
  google: 'gemini-1.5-flash',
  deepseek: 'deepseek-chat',
  openrouter: 'openai/gpt-4o-mini',
};

function readEnv(key) {
  const value = process.env[key];
  if (value === undefined || value === '') return undefined;
  return value.trim();
}

export function getOpenAIKey() {
  return readEnv('OPENAI_API_KEY');
}

export function getAnthropicKey() {
  return readEnv('ANTHROPIC_API_KEY');
}

export function getGoogleKey() {
  return readEnv('GOOGLE_API_KEY');
}

export function getDeepSeekKey() {
  return readEnv('DEEPSEEK_API_KEY');
}

export function getOpenRouterKey() {
  return readEnv('OPENROUTER_API_KEY');
}

export function getActiveProvider() {
  return (readEnv('AI_PROVIDER') ?? 'openai').toLowerCase();
}

export function getModelForProvider(provider = getActiveProvider()) {
  return readEnv('AI_MODEL') ?? DEFAULT_MODEL_BY_PROVIDER[provider] ?? DEFAULT_MODEL_BY_PROVIDER.openai;
}

export function getKeyForProvider(provider) {
  const envKey = ENV_KEY_BY_PROVIDER[provider];
  if (!envKey) return undefined;
  return readEnv(envKey);
}

export function getActiveProviderKey() {
  return getKeyForProvider(getActiveProvider());
}

export function isProviderConfigured(provider = getActiveProvider()) {
  if (!AI_PROVIDERS.includes(provider)) return false;
  return Boolean(getKeyForProvider(provider));
}

export function getAiStatus() {
  const provider = getActiveProvider();
  return {
    provider,
    configured: isProviderConfigured(provider),
  };
}

/**
 * Valida provedor e chave no boot. Registra mensagens amigáveis — nunca expõe chaves.
 */
export function validateAiConfig({ log = console.log } = {}) {
  const provider = getActiveProvider();

  if (!AI_PROVIDERS.includes(provider)) {
    log(`[AI] Provedor "${provider}" inválido. Opções: ${AI_PROVIDERS.join(', ')}.`);
    return { ok: false, provider, configured: false };
  }

  const envKey = ENV_KEY_BY_PROVIDER[provider];
  if (!getKeyForProvider(provider)) {
    log(`[AI] ${envKey} não configurada.`);
    return { ok: false, provider, configured: false };
  }

  log(`[AI] Provedor ativo: ${provider}.`);
  return { ok: true, provider, configured: true };
}
