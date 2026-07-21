/**
 * Migration — senha no cadastro de autônomo (hash na solicitação)
 */
import { pool } from '../src/db.js';

const SQL = `
ALTER TABLE tenant_requests
  ADD COLUMN IF NOT EXISTS senha_hash TEXT;
`;

async function main() {
  const client = await pool.connect();
  try {
    await client.query(SQL);
    console.log('migrate-autonomo-senha: OK');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
