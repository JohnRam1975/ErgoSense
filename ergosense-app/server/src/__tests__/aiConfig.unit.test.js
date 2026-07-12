/**
 * Testes — configuração e seleção de provedor de IA
 */
import test from 'node:test';
import assert from 'node:assert/strict';

const ORIGINAL_ENV = { ...process.env };

function restoreEnv() {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) delete process.env[key];
  }
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    process.env[key] = value;
  }
}

async function loadAiConfig() {
  const mod = await import(`../config/aiConfig.js?test=${Date.now()}-${Math.random()}`);
  return mod;
}

test('aiConfig — carrega chaves do ambiente', async () => {
  restoreEnv();
  process.env.OPENAI_API_KEY = 'sk-test-openai';
  process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
  process.env.GOOGLE_API_KEY = 'google-test';
  process.env.DEEPSEEK_API_KEY = 'ds-test';
  process.env.OPENROUTER_API_KEY = 'or-test';

  const { getOpenAIKey, getAnthropicKey, getGoogleKey, getDeepSeekKey, getOpenRouterKey } =
    await loadAiConfig();

  assert.equal(getOpenAIKey(), 'sk-test-openai');
  assert.equal(getAnthropicKey(), 'sk-ant-test');
  assert.equal(getGoogleKey(), 'google-test');
  assert.equal(getDeepSeekKey(), 'ds-test');
  assert.equal(getOpenRouterKey(), 'or-test');
});

test('aiConfig — seleciona provedor via AI_PROVIDER', async () => {
  restoreEnv();
  process.env.AI_PROVIDER = 'anthropic';
  process.env.ANTHROPIC_API_KEY = 'sk-ant-test';

  const { getActiveProvider, getActiveProviderKey, isProviderConfigured } = await loadAiConfig();

  assert.equal(getActiveProvider(), 'anthropic');
  assert.equal(getActiveProviderKey(), 'sk-ant-test');
  assert.equal(isProviderConfigured(), true);
  assert.equal(isProviderConfigured('openai'), false);
});

test('aiConfig — validateAiConfig registra erro amigável sem chave', async () => {
  restoreEnv();
  process.env.AI_PROVIDER = 'openai';
  delete process.env.OPENAI_API_KEY;

  const { validateAiConfig } = await loadAiConfig();
  const logs = [];
  const result = validateAiConfig({ log: (msg) => logs.push(msg) });

  assert.equal(result.ok, false);
  assert.equal(result.provider, 'openai');
  assert.equal(result.configured, false);
  assert.equal(logs.some((m) => m.includes('[AI] OPENAI_API_KEY não configurada.')), true);
});

test('aiConfig — validateAiConfig ok quando chave presente', async () => {
  restoreEnv();
  process.env.AI_PROVIDER = 'deepseek';
  process.env.DEEPSEEK_API_KEY = 'ds-secret';

  const { validateAiConfig, getAiStatus } = await loadAiConfig();
  const logs = [];
  const result = validateAiConfig({ log: (msg) => logs.push(msg) });

  assert.equal(result.ok, true);
  assert.equal(result.configured, true);
  assert.deepEqual(getAiStatus(), { provider: 'deepseek', configured: true });
  assert.equal(logs.some((m) => m.includes('[AI] Provedor ativo: deepseek.')), true);
});

test('aiConfig — provedor inválido', async () => {
  restoreEnv();
  process.env.AI_PROVIDER = 'invalid-provider';

  const { validateAiConfig, isProviderConfigured } = await loadAiConfig();
  const logs = [];
  const result = validateAiConfig({ log: (msg) => logs.push(msg) });

  assert.equal(result.ok, false);
  assert.equal(isProviderConfigured(), false);
  assert.equal(logs.some((m) => m.includes('inválido')), true);
});

test('AIProviderService — getServiceStatus nunca expõe chaves', async () => {
  restoreEnv();
  process.env.AI_PROVIDER = 'openrouter';
  process.env.OPENROUTER_API_KEY = 'or-secret-key';

  const { getServiceStatus } = await import('../services/AIProviderService.js');

  const status = getServiceStatus();
  assert.deepEqual(status, { provider: 'openrouter', configured: true });
  assert.equal(JSON.stringify(status).includes('or-secret-key'), false);
});

test('AIProviderService — generateText falha sem configuração', async () => {
  restoreEnv();
  process.env.AI_PROVIDER = 'google';
  delete process.env.GOOGLE_API_KEY;

  const { generateText } = await import('../services/AIProviderService.js');

  await assert.rejects(() => generateText('teste'), /Serviço de IA indisponível/);
});
