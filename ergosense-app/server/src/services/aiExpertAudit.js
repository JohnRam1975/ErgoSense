/**
 * Trilha de auditoria do AI Expert — persistência em JSONL (sem expor chaves de IA).
 */
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUDIT_DIR = path.resolve(__dirname, '../../.data/ai-expert-audit');

function auditFile(tenantId) {
  return path.join(AUDIT_DIR, `${tenantId}.jsonl`);
}

function hashText(text) {
  if (!text) return null;
  return crypto.createHash('sha256').update(String(text)).digest('hex').slice(0, 16);
}

async function ensureAuditDir() {
  await fs.mkdir(AUDIT_DIR, { recursive: true });
}

export async function logAiExpertAudit({
  tenantId,
  action,
  user = null,
  prompt = null,
  dataSources = [],
  resultSummary = null,
  metadata = null,
}) {
  await ensureAuditDir();
  const entry = {
    id: crypto.randomUUID(),
    tenantId,
    action,
    userId: user?.id ? String(user.id) : null,
    userName: user?.name || user?.email || null,
    promptHash: hashText(prompt),
    promptPreview: prompt ? String(prompt).slice(0, 500) : null,
    dataSources,
    resultSummary: resultSummary ? String(resultSummary).slice(0, 2000) : null,
    metadata: metadata ?? null,
    createdAt: new Date().toISOString(),
  };
  await fs.appendFile(auditFile(tenantId), `${JSON.stringify(entry)}\n`, 'utf8');
  return entry;
}

export async function listAiExpertAudit(tenantId, limit = 50) {
  await ensureAuditDir();
  const file = auditFile(tenantId);
  try {
    const raw = await fs.readFile(file, 'utf8');
    const lines = raw.trim().split('\n').filter(Boolean);
    return lines
      .slice(-limit)
      .reverse()
      .map((line) => JSON.parse(line));
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

export function mapAiExpertAuditRow(row) {
  return {
    id: row.id,
    tenantId: row.tenantId,
    action: row.action,
    userId: row.userId,
    userName: row.userName,
    promptHash: row.promptHash,
    promptPreview: row.promptPreview,
    dataSources: row.dataSources ?? [],
    resultSummary: row.resultSummary,
    metadata: row.metadata,
    createdAt: row.createdAt,
  };
}
