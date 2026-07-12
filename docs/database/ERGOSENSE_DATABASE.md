# ErgoSense — Modelagem de Banco de Dados SaaS (PostgreSQL)

Documentação da schema **v1.0** para o ErgoSense: avaliação ergonômica com IA, multitenancy, NR-17, laudos e eSocial.

**Script executável:** [`ergosense-saas-schema-v1.sql`](./ergosense-saas-schema-v1.sql)

---

## 1. Ordem correta de criação

| Fase | Objetos |
|------|---------|
| 1 | Extensões `pgcrypto`, `citext` |
| 2 | ENUMs de domínio |
| 3 | Função `fn_set_updated_at()` |
| 4 | `tenants` |
| 5 | `users`, `roles`, `permissions`, `role_permissions`, `user_roles` |
| 6 | `setores`, `funcoes`, `colaboradores`, `postos_trabalho`, `atividades` |
| 7 | `metodos_ergonomicos`, `parametros_metodos` (catálogo global) |
| 8 | `avaliacoes_ergonomicas`, `avaliacao_metodos` |
| 9 | Mídia e IA: `midias_avaliacao`, `pontos_corporais_detectados`, `medicoes_angulares`, `medicoes_distancia`, `objetos_detectados`, `cargas_avaliadas` |
| 10 | Resultados: `resultados_niosh`, `resultados_rula`, `resultados_reba`, `resultados_owas`, `resultados_rosa`, `resultados_kim`, `resultados_carga_mental` |
| 11 | `riscos_ambientais` |
| 12 | `questionarios`, `perguntas_questionario`, `respostas_questionario` |
| 13 | `laudos`, `recomendacoes`, `planos_acao` |
| 14 | `eventos_esocial`, `assinaturas_digitais`, `anexos` |
| 15 | `auditoria`, `historico_alteracoes`, `configuracoes_tenant`, `logs_processamento_ia`, `logs_sistema` |
| 16 | RLS (opcional em produção) |
| 17 | Seeds + views |

---

## 2. Diagrama textual das relações

```
tenants (1)
 ├── users (N)
 ├── roles (N) ── role_permissions ── permissions (global)
 ├── setores (N)
 │    ├── colaboradores (N) ── funcoes (N)
 │    └── postos_trabalho (N) ── atividades (N)
 ├── avaliacoes_ergonomicas (N)
 │    ├── colaborador, setor, funcao, posto, atividade, avaliador (users)
 │    ├── avaliacao_metodos (N) ── metodos_ergonomicos (global)
 │    ├── midias_avaliacao (N)
 │    │    ├── pontos_corporais_detectados (N)
 │    │    └── (liga medicoes, objetos)
 │    ├── medicoes_angulares (N)
 │    ├── medicoes_distancia (N)
 │    ├── objetos_detectados (N) ── cargas_avaliadas (N)
 │    ├── resultados_niosh / rula / reba / owas / rosa / kim / carga_mental
 │    ├── riscos_ambientais (N)  [RUIDO | CALOR | ILUMINACAO]
 │    ├── respostas_questionario (N)
 │    ├── recomendacoes (N) ── planos_acao (N)
 │    ├── laudos (N) ── assinaturas_digitais (N)
 │    ├── anexos (N)
 │    └── logs_processamento_ia (N)
 ├── eventos_esocial (N)
 ├── configuracoes_tenant (N)
 ├── auditoria (N)
 └── historico_alteracoes (N)

metodos_ergonomicos (global)
 └── parametros_metodos (N)

questionarios (tenant ou global)
 └── perguntas_questionario (N)
```

---

## 3. Explicação das tabelas

### Multitenancy e acesso

| Tabela | Função |
|--------|--------|
| **tenants** | Empresa cliente. `plano` (GRATUITO/PROFISSIONAL/ENTERPRISE), `limite_usuarios`, `status` (ATIVO/INATIVO/SUSPENSO/CANCELADO), soft delete. |
| **users** | Login por tenant. `senha_hash` (bcrypt/argon2 no app). `tipo_usuario` define capacidades base. |
| **roles** / **user_roles** / **permissions** | RBAC por empresa + catálogo global de permissões. |
| **configuracoes_tenant** | Chave-valor (logo, NR-17 estrito, retenção de mídia, etc.). |

### Estrutura organizacional

| Tabela | Função |
|--------|--------|
| **setores** | Departamentos. |
| **funcoes** | Cargos com CBO opcional. |
| **colaboradores** | Avaliados; `consentimento_lgpd` obrigatório para tratamento de dados biométricos/posturais. |
| **postos_trabalho** | Local físico/lógico do trabalho. |
| **atividades** | Tarefa no posto; `carga_manual`, `peso_padrao_kg`. |

### Avaliação e métodos

| Tabela | Função |
|--------|--------|
| **metodos_ergonomicos** | Catálogo global (30 métodos seed). Sem `tenant_id`. |
| **parametros_metodos** | Faixas de aceitabilidade (NIOSH LI, RULA 1–7, etc.). |
| **avaliacoes_ergonomicas** | Sessão principal; status, score, conclusão IA, sync mobile (`id_local_mobile`). |
| **avaliacao_metodos** | Resultado genérico + `dados_calculo_json` para métodos sem tabela dedicada (OCRA, QEC, etc.). |

### Visão computacional

| Tabela | Função |
|--------|--------|
| **midias_avaliacao** | Foto/vídeo; URL ou `storage_key` (S3). Não armazena base64 em produção. |
| **pontos_corporais_detectados** | Landmarks por frame/tempo. |
| **medicoes_angulares** | Ângulos derivados (lombar, ombro, etc.). |
| **medicoes_distancia** | Distância carga–tronco, alcance. |
| **objetos_detectados** | Bounding box YOLO. |
| **cargas_avaliadas** | Peso manual ou vinculado ao objeto; parâmetros NIOSH/KIM. |

### Resultados específicos

Tabelas normalizadas para consulta e laudo: **resultados_niosh**, **resultados_rula**, **resultados_reba**, **resultados_owas**, **resultados_rosa**, **resultados_kim**, **resultados_carga_mental**.

Demais métodos permanecem em **avaliacao_metodos.dados_calculo_json**.

### Ambiente, questionários, laudos

| Tabela | Função |
|--------|--------|
| **riscos_ambientais** | Ruído (NR-15), calor (NHO-06), iluminação (NHO-11). |
| **questionarios** / **perguntas** / **respostas** | NASA-TLX, QEC, bipolar, etc. |
| **laudos** | HTML + PDF; numeração por tenant. |
| **recomendacoes** / **planos_acao** | Plano de ação SST. |
| **eventos_esocial** | Payload JSON + status de envio. |
| **assinaturas_digitais** | Hash do PDF + registro profissional. |
| **anexos** | Evidências, AET, fotos extras. |

### Governança

| Tabela | Função |
|--------|--------|
| **auditoria** | Append-only: quem fez o quê (JSON antes/depois). |
| **historico_alteracoes** | Diff campo a campo. |
| **logs_processamento_ia** | Pipeline de visão (tempo, modelo, erro). |
| **logs_sistema** | Erros de API, jobs, integrações. |

---

## 4. Índices recomendados (já no script)

- `tenant_id` + filtros `deleted_at IS NULL` em entidades principais.
- `avaliacoes_ergonomicas(tenant_id, data_avaliacao DESC)`.
- `pontos_corporais_detectados(midia_id, frame_numero)` para replay de vídeo.
- `auditoria(tenant_id, created_at DESC)`.
- `logs_processamento_ia(tenant_id, avaliacao_id, created_at DESC)`.

**Particionamento futuro (enterprise):** particionar `pontos_corporais_detectados` e `medicoes_angulares` por `created_at` mensal quando volume > 50M linhas/tenant.

---

## 5. Views do dashboard (no script)

| View | Uso |
|------|-----|
| `vw_dashboard_tenant_resumo` | Usuários ativos vs limite, avaliações 30 dias, laudos emitidos. |
| `vw_avaliacoes_risco_por_setor` | Heatmap de risco por setor. |
| `vw_planos_acao_pendentes` | Kanban SST. |
| `vw_metodos_por_avaliacao` | Detalhe multi-método por sessão. |

---

## 6. Multitenancy na aplicação

1. **Toda query de negócio** inclui `WHERE tenant_id = $1`.
2. **JWT / sessão** carrega `tenant_id` do usuário autenticado.
3. **PostgreSQL RLS** (incluído no script para tabelas críticas):

```sql
SET app.current_tenant_id = 'uuid-do-tenant';
-- queries automáticas filtradas
```

4. **Super admin** usa role sem RLS ou conexão dedicada com política `BYPASSRLS` apenas em painel interno.

5. **Plano GRATUITO:** enforce `limite_usuarios` no insert de `users`.

---

## 7. Segurança e LGPD

| Tema | Implementação |
|------|----------------|
| Dados sensíveis | CPF, biometria indireta (landmarks) — base legal e consentimento em `colaboradores`. |
| Minimização | Não persistir vídeo bruto após processamento (config `retencao_midia_dias`). |
| Pseudonimização | Exportações anonimizam `colaborador_id` em datasets de treino IA. |
| Direito ao esquecimento | Soft delete + job que anonimiza CPF/nome após `deleted_at` + prazo legal. |
| Senhas | Apenas `senha_hash`; nunca logar credenciais em `auditoria`. |
| Mídia | `hash_sha256` para integridade; URLs assinadas com expiração. |
| Laudos | `hash_documento` em assinatura; trilha em `auditoria`. |
| Retenção | `configuracoes_tenant`: `auditoria_retencao_anos`, `midia_retencao_dias`. |
| DPO | Registrar operações de exportação em `auditoria` com ação `EXPORT`. |

---

## 8. Migrations sugeridas para o backend (Node/Express)

Estrutura recomendada em `ergosense-app/server/scripts/migrations/`:

```
001_extensions_enums.sql      -- extensões + tipos
002_tenants_users_rbac.sql
003_organizacional.sql
004_metodos_catalogo.sql
005_avaliacoes_core.sql
006_midia_ia.sql
007_resultados_metodos.sql
008_laudos_acao.sql
009_esocial_auditoria.sql
010_views_rls.sql
011_seed_metodos.sql          -- idempotente
```

**Ferramentas:** [node-pg-migrate](https://github.com/salsita/node-pg-migrate) ou scripts numerados com tabela `schema_migrations`.

**Migração do schema legado** (`postgresql-schema-full.sql` com `tenant_id VARCHAR` e `BIGSERIAL`):

1. Criar `tenants` UUID e mapear `tenants.tenant_id` (slug) → novo `id`.
2. Adicionar coluna `uuid` em tabelas legadas ou ETL para novo schema.
3. Manter `analises` → `avaliacoes_ergonomicas`, `resultados_ia` → `avaliacao_metodos` + JSON.
4. Rodar em janela de manutenção com dual-write temporário.

Exemplo de middleware:

```javascript
// Após autenticar JWT
await pool.query(`SET LOCAL app.current_tenant_id = $1`, [user.tenantId]);
```

---

## 9. Como executar

```bash
createdb ergosense
psql -U postgres -d ergosense -f docs/database/ergosense-saas-schema-v1.sql
```

Verificar:

```sql
SELECT codigo, nome FROM metodos_ergonomicos ORDER BY categoria, codigo;
SELECT COUNT(*) FROM parametros_metodos;
```

---

## 10. Coexistência com o app atual

O servidor em `ergosense-app/server` usa hoje tabelas legadas (`tenants.tenant_id` VARCHAR, `analises`, `colaboradores` BIGSERIAL). Este schema **v1** é o alvo de produção SaaS; a migração deve ser planejada em fases sem downtime prolongado.

Campos do app mapeáveis:

| App atual | Schema v1 |
|-----------|-----------|
| `analises` | `avaliacoes_ergonomicas` |
| `resultados_ia` (JSONB) | `avaliacao_metodos` + tabelas `resultados_*` |
| `fotos_analise` | `midias_avaliacao` |
| `relatorios` | `laudos` |
| `load_result_json` | `cargas_avaliadas` + `resultados_niosh` |

---

## 11. Tabelas adicionais (além do pedido mínimo)

- **permissions** / **role_permissions** — perfis granulares.
- **historico_alteracoes** — histórico campo a campo (#34).
- **logs_sistema** — logs gerais (#32).
- Campos LGPD: `consentimento_lgpd`, `hash_sha256`, `storage_key`.

---

*ErgoSense · Schema v1.0 · PostgreSQL 14+*
