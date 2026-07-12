ALTER TABLE resultados_ia
  ADD COLUMN IF NOT EXISTS load_effort_json JSONB;

COMMENT ON COLUMN resultados_ia.load_effort_json IS 'Índice peso×distância, recomendação e metadados da medição';
