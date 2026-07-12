-- ErgoSense no PostgreSQL Docker (porta 5433 — mesmo servidor do warehouse)
-- Executar: psql -U postgres -h localhost -p 5433 -f scripts/postgres/02-init-ergosense-docker.sql

SELECT 'CREATE DATABASE ergosense OWNER postgres ENCODING ''UTF8'''
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'ergosense')\gexec

GRANT ALL PRIVILEGES ON DATABASE ergosense TO postgres;

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'ergosense') THEN
    CREATE ROLE ergosense LOGIN PASSWORD '!Mamao@melancia#vaca1975Come%peixe';
  END IF;
END
$$;

GRANT CONNECT ON DATABASE ergosense TO ergosense;
GRANT ALL ON SCHEMA public TO ergosense;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ergosense;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ergosense;
