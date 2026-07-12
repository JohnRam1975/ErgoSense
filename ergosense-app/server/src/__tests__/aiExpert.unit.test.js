/**
 * Testes — ErgoSense AI Expert (orquestração, transparência, auditoria)
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { AI_DISCLAIMER, EXPERT_SYSTEM_PROMPT, NORMS_REFERENCED } from '../services/aiExpertConstants.js';
import { mapAiExpertAuditRow, logAiExpertAudit, listAiExpertAudit } from '../services/aiExpertAudit.js';
import { generateStructuredPdf } from '../services/aiExpertPdf.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUDIT_DIR = path.resolve(__dirname, '../../.data/ai-expert-audit');

test('AI Expert — disclaimer e normas definidos', () => {
  assert.match(AI_DISCLAIMER, /validação profissional/i);
  assert.match(EXPERT_SYSTEM_PROMPT, /NR-17/);
  assert.ok(NORMS_REFERENCED.length >= 5);
});

test('AI Expert — auditoria registra metadados sem chave de API', async () => {
  const tenantId = `test-${Date.now()}`;
  const entry = await logAiExpertAudit({
    tenantId,
    action: 'CONSULTA',
    user: { id: 1, name: 'Tester' },
    prompt: 'Analise riscos do setor X',
    dataSources: ['Inventário de riscos'],
    resultSummary: 'Resumo técnico simulado',
    metadata: { provider: 'openai' },
  });

  assert.ok(entry.id);
  assert.equal(entry.promptHash?.length, 16);
  assert.equal(entry.promptPreview?.includes('Analise riscos'), true);
  assert.equal(JSON.stringify(entry).includes('sk-'), false);

  const rows = await listAiExpertAudit(tenantId, 5);
  assert.equal(rows.length, 1);
  const mapped = mapAiExpertAuditRow(rows[0]);
  assert.equal(mapped.action, 'CONSULTA');

  await fs.unlink(path.join(AUDIT_DIR, `${tenantId}.jsonl`)).catch(() => {});
});

test('AI Expert — PDF estruturado é gerado', async () => {
  const buffer = await generateStructuredPdf({
    title: 'AET Teste',
    subtitle: 'ErgoSense AI Expert',
    disclaimer: AI_DISCLAIMER,
    sections: [{ title: 'Introdução', content: 'Texto de teste.' }],
  });
  assert.ok(Buffer.isBuffer(buffer));
  assert.match(buffer.toString('latin1', 0, 8), /^%PDF-/);
});

test('AI Expert — assembleTenantContext exportado', async () => {
  const mod = await import('../services/AIExpertService.js');
  assert.equal(typeof mod.assembleTenantContext, 'function');
  assert.equal(typeof mod.generateAET, 'function');
  assert.equal(typeof mod.runVirtualAudit, 'function');
});
