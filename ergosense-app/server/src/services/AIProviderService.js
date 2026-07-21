/**
 * Serviço central de IA — todo acesso a LLMs passa por aqui.
 * Chaves permanecem no servidor; nunca são logadas ou expostas em respostas.
 */
import {
  getActiveProvider,
  getActiveProviderKey,
  getModelForProvider,
  isProviderConfigured,
} from '../config/aiConfig.js';

const SYSTEM_PROMPT =
  'Você é um assistente especializado em ergonomia ocupacional, NR-17, NR-01 e saúde e segurança do trabalho no Brasil. ' +
  'Responda em português do Brasil, de forma técnica e objetiva.';

function assertConfigured() {
  if (!isProviderConfigured()) {
    const provider = getActiveProvider();
    throw new Error(`Serviço de IA indisponível: provedor "${provider}" sem chave configurada.`);
  }
}

async function readResponseText(res) {
  const body = await res.text();
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    parsed = null;
  }
  if (!res.ok) {
    const detail =
      parsed?.error?.message ??
      parsed?.error ??
      parsed?.message ??
      (body.slice(0, 200) || res.statusText);
    throw new Error(`Provedor de IA retornou erro ${res.status}: ${detail}`);
  }
  return parsed;
}

async function callOpenAiCompatible({ url, apiKey, model, prompt, systemPrompt, maxTokens, extraHeaders = {} }) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      max_tokens: maxTokens,
      temperature: 0.3,
    }),
  });
  const data = await readResponseText(res);
  return data?.choices?.[0]?.message?.content?.trim() ?? '';
}

async function callAnthropic({ apiKey, model, prompt, systemPrompt, maxTokens }) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await readResponseText(res);
  const block = data?.content?.find((c) => c.type === 'text');
  return block?.text?.trim() ?? '';
}

async function callGoogle({ apiKey, model, prompt, systemPrompt, maxTokens }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.3 },
    }),
  });
  const data = await readResponseText(res);
  return data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('').trim() ?? '';
}

async function invokeProvider(prompt, options = {}) {
  assertConfigured();
  const provider = getActiveProvider();
  const apiKey = getActiveProviderKey();
  const model = options.model ?? getModelForProvider(provider);
  const systemPrompt = options.systemPrompt ?? SYSTEM_PROMPT;
  const maxTokens = options.maxTokens ?? 2048;

  switch (provider) {
    case 'openai':
      return callOpenAiCompatible({
        url: 'https://api.openai.com/v1/chat/completions',
        apiKey,
        model,
        prompt,
        systemPrompt,
        maxTokens,
      });
    case 'deepseek':
      return callOpenAiCompatible({
        url: 'https://api.deepseek.com/v1/chat/completions',
        apiKey,
        model,
        prompt,
        systemPrompt,
        maxTokens,
      });
    case 'openrouter':
      return callOpenAiCompatible({
        url: 'https://openrouter.ai/api/v1/chat/completions',
        apiKey,
        model,
        prompt,
        systemPrompt,
        maxTokens,
        extraHeaders: {
          'HTTP-Referer': process.env.APP_PUBLIC_URL ?? 'http://localhost:5173',
          'X-Title': 'ErgoSense',
        },
      });
    case 'anthropic':
      return callAnthropic({ apiKey, model, prompt, systemPrompt, maxTokens });
    case 'google':
      return callGoogle({ apiKey, model, prompt, systemPrompt, maxTokens });
    default:
      throw new Error(`Provedor de IA não suportado: ${provider}`);
  }
}

function serializeContext(context) {
  if (context == null) return '';
  if (typeof context === 'string') return context;
  try {
    return JSON.stringify(context, null, 2);
  } catch {
    return String(context);
  }
}

/**
 * Gera texto livre a partir de um prompt.
 */
export async function generateText(prompt, options = {}) {
  if (!prompt?.trim()) throw new Error('Prompt obrigatório.');
  const text = await invokeProvider(prompt.trim(), options);
  return { provider: getActiveProvider(), text };
}

/**
 * Análise ergonômica estruturada (postura, vídeo, RULA/REBA, NR-17).
 */
export async function analyzeErgonomics(payload = {}) {
  const context = serializeContext(payload);
  const prompt =
    'Analise os dados ergonômicos abaixo. Identifique desvios posturais, riscos musculoesqueléticos, ' +
    'referências à NR-17 e prioridades de intervenção.\n\nDados:\n' +
    context;
  return generateText(prompt, { systemPrompt: SYSTEM_PROMPT, ...payload?.options });
}

/**
 * Recomendações práticas de ergonomia e controles administrativos/engenharia.
 */
export async function generateRecommendations(context = {}) {
  const data = serializeContext(context);
  const prompt =
    'Com base no contexto abaixo, elabore recomendações ergonômicas priorizadas (curto, médio e longo prazo). ' +
    'Inclua medidas de engenharia, administrativas e individuais quando aplicável.\n\nContexto:\n' +
    data;
  return generateText(prompt, { systemPrompt: SYSTEM_PROMPT, ...context?.options });
}

/**
 * Análise de riscos ocupacionais alinhada ao inventário NR-01 / matriz de risco.
 */
export async function generateRiskAnalysis(context = {}) {
  const data = serializeContext(context);
  const prompt =
    'Analise os riscos ocupacionais descritos abaixo. Classifique probabilidade e severidade quando possível, ' +
    'relacione com NR-01 e sugira medidas de controle na hierarquia de prevenção.\n\nContexto:\n' +
    data;
  return generateText(prompt, { systemPrompt: SYSTEM_PROMPT, ...context?.options });
}

export function getServiceStatus() {
  return {
    provider: getActiveProvider(),
    configured: isProviderConfigured(),
  };
}
