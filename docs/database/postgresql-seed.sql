-- Dados iniciais ErgoSense (demo)
-- Senha demo: ergo1234

INSERT INTO tenants (tenant_id, nome, industria, schema_name, icone, cor, ativo)
VALUES
  ('ergosense', 'ErgoSense Platform', 'Plataforma SaaS', 'ergosense_platform', '🌐', 'cyan', TRUE),
  ('vale', 'Vale S.A.', 'Mineração', 'vale_sa', '⚙️', 'amber', TRUE),
  ('gerdau', 'Gerdau Aços', 'Siderurgia', NULL, '🏭', 'cyan', TRUE),
  ('porto', 'Porto do Açu', 'Portuário', NULL, '🚢', 'green', TRUE),
  ('usiminas', 'Usiminas', 'Siderurgia', NULL, '🏗️', 'neutral', TRUE)
ON CONFLICT (tenant_id) DO NOTHING;

INSERT INTO usuarios (tenant_id, email, senha_hash, nome, perfil, cargo, localizacao, ativo)
VALUES (
  'vale',
  'lucas@vale.com.br',
  crypt('ergo1234', gen_salt('bf')),
  'Lucas Andrade',
  'ERGONOMISTA',
  'Ergonomista Sênior',
  'Carajás',
  TRUE
)
ON CONFLICT (tenant_id, email) DO UPDATE SET
  senha_hash = EXCLUDED.senha_hash,
  nome = EXCLUDED.nome,
  updated_at = NOW();

INSERT INTO setores (tenant_id, nome) VALUES
  ('vale', 'Beneficiamento'),
  ('vale', 'Manutenção'),
  ('vale', 'Logística'),
  ('vale', 'Elétrica'),
  ('vale', 'Soldagem')
ON CONFLICT (tenant_id, nome) DO NOTHING;

INSERT INTO colaboradores (tenant_id, setor_id, nome, matricula, cargo, turno, consentimento_lgpd, consentimento_data, risk_level, icone, icone_bg)
SELECT 'vale', s.id, c.nome, c.matricula, c.cargo, c.turno, TRUE, NOW(), c.risk_level, c.icone, c.icone_bg
FROM (VALUES
  ('Carlos Ferreira', '00142', 'Operador de Britagem', 'Beneficiamento', 'Manhã 06h–14h', 'critico', '🦺', 'var(--r10)'),
  ('Ana Paula Silva', '00098', 'Técnica de Manutenção', 'Manutenção', 'Tarde 14h–22h', 'medio', '⚙️', 'var(--a10)'),
  ('Roberto Nascimento', '00215', 'Operador de Empilhadeira', 'Logística', 'Manhã 06h–14h', 'baixo', '👷', 'var(--g10)'),
  ('Marcos Oliveira', '00334', 'Eletricista', 'Elétrica', 'Noite 22h–06h', 'baixo', '👨‍🔧', 'var(--c10)'),
  ('Fernanda Costa', '00287', 'Soldadora', 'Soldagem', 'Tarde 14h–22h', 'alto', '🔧', 'var(--o10)')
) AS c(nome, matricula, cargo, setor_nome, turno, risk_level, icone, icone_bg)
JOIN setores s ON s.tenant_id = 'vale' AND s.nome = c.setor_nome
ON CONFLICT (tenant_id, matricula) DO NOTHING;

-- Admin global da plataforma (senha: admin1234)
INSERT INTO usuarios (tenant_id, email, senha_hash, nome, perfil, cargo, localizacao, ativo)
VALUES (
  'ergosense',
  'admin@ergosense.com.br',
  crypt('admin1234', gen_salt('bf')),
  'Administrador Global',
  'ADMIN_GLOBAL',
  'Admin Global',
  'Brasil',
  TRUE
)
ON CONFLICT (tenant_id, email) DO UPDATE SET
  senha_hash = EXCLUDED.senha_hash,
  perfil = EXCLUDED.perfil,
  updated_at = NOW();

-- Admin da empresa Vale (senha: admin1234) — autoriza suporte da plataforma
INSERT INTO usuarios (tenant_id, email, senha_hash, nome, perfil, cargo, localizacao, ativo)
VALUES (
  'vale',
  'admin@vale.com.br',
  crypt('admin1234', gen_salt('bf')),
  'João Silva',
  'ADMIN_EMPRESA',
  'Administrador',
  'Carajás',
  TRUE
)
ON CONFLICT (tenant_id, email) DO UPDATE SET
  senha_hash = EXCLUDED.senha_hash,
  perfil = EXCLUDED.perfil,
  updated_at = NOW();
