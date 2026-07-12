/**
 * Coluna storage_key para vídeos em S3/MinIO
 */
import { pool } from '../src/db.js';

const SQL = `
ALTER TABLE videos_analise ADD COLUMN IF NOT EXISTS storage_key VARCHAR(512);
CREATE INDEX IF NOT EXISTS idx_videos_analise_storage ON videos_analise(storage_key) WHERE storage_key IS NOT NULL;
`;

async function main() {
  const client = await pool.connect();
  try {
    await client.query(SQL);
    console.log('Migration storage-external: OK');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
