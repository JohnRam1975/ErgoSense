-- Gravação de vídeo da sessão ergonômica (MP4/WebM) — análise posterior

CREATE TABLE IF NOT EXISTS videos_analise (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  analise_id BIGINT NOT NULL REFERENCES analises(id) ON DELETE CASCADE,
  video_base64 TEXT NOT NULL,
  mime_type VARCHAR(64) NOT NULL DEFAULT 'video/mp4',
  formato VARCHAR(8) NOT NULL DEFAULT 'mp4',
  duracao_seg NUMERIC(10, 2),
  tamanho_bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_videos_analise_tenant
  ON videos_analise(tenant_id, analise_id DESC)
  WHERE deleted_at IS NULL;
