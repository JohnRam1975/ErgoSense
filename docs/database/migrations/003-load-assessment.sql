-- Avaliação ergonômica com movimentação manual de cargas (peso, distância, estimativa visual)

ALTER TABLE resultados_ia
  ADD COLUMN IF NOT EXISTS load_params_json JSONB,
  ADD COLUMN IF NOT EXISTS load_result_json JSONB,
  ADD COLUMN IF NOT EXISTS load_estimate_json JSONB,
  ADD COLUMN IF NOT EXISTS load_manual_json JSONB;

COMMENT ON COLUMN resultados_ia.load_params_json IS 'Parâmetros normalizados do motor de carga (NIOSH simplificado)';
COMMENT ON COLUMN resultados_ia.load_result_json IS 'Resultado do motor biomecânico de carga';
COMMENT ON COLUMN resultados_ia.load_estimate_json IS 'Última estimativa visual distância/altura (MediaPipe)';
COMMENT ON COLUMN resultados_ia.load_manual_json IS 'Entrada manual do avaliador (peso, RPM, pega, torção, etc.)';

CREATE INDEX IF NOT EXISTS idx_resultados_ia_load_risk
  ON resultados_ia (risk_level)
  WHERE load_result_json IS NOT NULL;
