/**
 * Links públicos anônimos para campanhas psicossociais (token hash).
 */
import { pool } from '../src/db.js';

async function main() {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE psico_campanhas
        ADD COLUMN IF NOT EXISTS link_token_hash VARCHAR(64)
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_psico_campanhas_link_token
        ON psico_campanhas(link_token_hash)
        WHERE link_token_hash IS NOT NULL
    `);
    console.log('Migration psico-campanha-links: concluída');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
