/**
 * Migration — cadastro de autônomos (CPF + endereço completo)
 */
import { pool } from '../src/db.js';

const SQL = `
ALTER TABLE tenant_requests
  ALTER COLUMN cnpj DROP NOT NULL;

ALTER TABLE tenant_requests
  ADD COLUMN IF NOT EXISTS tipo_pessoa VARCHAR(16) NOT NULL DEFAULT 'EMPRESA',
  ADD COLUMN IF NOT EXISTS cpf VARCHAR(14),
  ADD COLUMN IF NOT EXISTS logradouro VARCHAR(255),
  ADD COLUMN IF NOT EXISTS numero VARCHAR(32),
  ADD COLUMN IF NOT EXISTS complemento VARCHAR(120),
  ADD COLUMN IF NOT EXISTS bairro VARCHAR(120);

CREATE INDEX IF NOT EXISTS idx_tenant_requests_cpf ON tenant_requests(cpf);
CREATE INDEX IF NOT EXISTS idx_tenant_requests_tipo ON tenant_requests(tipo_pessoa);

ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS cpf VARCHAR(14),
  ADD COLUMN IF NOT EXISTS logradouro VARCHAR(255),
  ADD COLUMN IF NOT EXISTS numero VARCHAR(32),
  ADD COLUMN IF NOT EXISTS complemento VARCHAR(120),
  ADD COLUMN IF NOT EXISTS bairro VARCHAR(120),
  ADD COLUMN IF NOT EXISTS cidade VARCHAR(120),
  ADD COLUMN IF NOT EXISTS estado VARCHAR(2),
  ADD COLUMN IF NOT EXISTS cep VARCHAR(16),
  ADD COLUMN IF NOT EXISTS telefone VARCHAR(32);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'empresas' AND column_name = 'cnpj' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE empresas ALTER COLUMN cnpj DROP NOT NULL;
  END IF;
END $$;
`;

async function main() {
  const client = await pool.connect();
  try {
    await client.query(SQL);
    console.log('migrate-autonomo-cadastro: OK');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
