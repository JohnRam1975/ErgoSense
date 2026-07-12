-- Cria banco e usuário ErgoSense (executar como postgres)
SELECT 'CREATE DATABASE ergosense ENCODING ''UTF8'' LC_COLLATE ''Portuguese_Brazil.1252'' LC_CTYPE ''Portuguese_Brazil.1252'''
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'ergosense')\gexec

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'ergosense') THEN
    CREATE ROLE ergosense LOGIN PASSWORD '@joaoC1975';
  ELSE
    ALTER ROLE ergosense WITH PASSWORD '@joaoC1975';
  END IF;
END
$$;

GRANT ALL PRIVILEGES ON DATABASE ergosense TO ergosense;
ALTER DATABASE ergosense OWNER TO ergosense;
