-- ErgoSense — seed mínimo (sem tenants demo industriais).
-- Admin global: criado em runtime por server/scripts/seed-global-admin.js
--   SEED_GLOBAL_ADMIN_EMAIL / SEED_GLOBAL_ADMIN_PASSWORD

INSERT INTO tenants (tenant_id, nome, industria, schema_name, icone, cor, ativo)
VALUES
  ('ergosense', 'ErgoSense Platform', 'Plataforma SaaS', 'ergosense_platform', '🌐', 'cyan', TRUE)
ON CONFLICT (tenant_id) DO NOTHING;
