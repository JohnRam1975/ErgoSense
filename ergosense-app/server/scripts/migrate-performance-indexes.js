/**
 * Índices compostos tenant_id — consultas frequentes e dashboards (PROMPT UNIVERSAL — Performance/DB).
 * Idempotente: CREATE INDEX IF NOT EXISTS.
 */
import { pool } from '../src/db.js';

const INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_usuarios_tenant ON usuarios(tenant_id) WHERE deleted_at IS NULL',
  'CREATE INDEX IF NOT EXISTS idx_setores_tenant ON setores(tenant_id) WHERE deleted_at IS NULL',
  'CREATE INDEX IF NOT EXISTS idx_colaboradores_tenant ON colaboradores(tenant_id) WHERE deleted_at IS NULL',
  'CREATE INDEX IF NOT EXISTS idx_colaboradores_tenant_setor ON colaboradores(tenant_id, setor_id) WHERE deleted_at IS NULL',
  'CREATE INDEX IF NOT EXISTS idx_analises_tenant_data ON analises(tenant_id, data_analise DESC)',
  'CREATE INDEX IF NOT EXISTS idx_resultados_ia_tenant ON resultados_ia(tenant_id)',
  'CREATE INDEX IF NOT EXISTS idx_fotos_analise_tenant ON fotos_analise(tenant_id)',
  'CREATE INDEX IF NOT EXISTS idx_videos_analise_tenant ON videos_analise(tenant_id)',
  'CREATE INDEX IF NOT EXISTS idx_security_audit_tenant ON security_audit_log(tenant_id, created_at DESC)',
];

async function main() {
  const client = await pool.connect();
  try {
    for (const sql of INDEXES) {
      try {
        await client.query(sql);
        console.log('OK:', sql.split(' ')[5]);
      } catch (err) {
        if (err.code === '42P01') {
          console.warn('SKIP (tabela inexistente):', sql.split(' ')[5]);
        } else {
          throw err;
        }
      }
    }
    console.log('Migration performance-indexes: concluída');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
