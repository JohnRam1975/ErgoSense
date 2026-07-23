# 10 — Fluxos de negócio (ponta a ponta)

## F1 — Empresa nova entra no SaaS

1. Solicitante → `request-access` → `POST /api/public/tenant-request`  
2. Admin Global → `admin-tenant-requests` → aprova  
3. Controle comercial → `grant-access` / plano  
4. Admin da empresa → `activate-account` (+ MFA)  
5. Login → `dashboard` do tenant  

## F2 — Análise ergonômica de campo

1. Login (Operador/Ergonomista) → `dashboard`  
2. Garante colaborador (`collabs` / `new-collab`) e estrutura (`org-structure` / setor)  
3. `new-analysis` → contexto + carga → `camera`  
4. Captura sessão → `result` → PDF NR-17 / compartilhar  
5. Registro em `history`; se offline, `sync` até `synced=true`  

## F3 — Ciclo NR-01 (risco → programa)

1. Configura critérios (`criterios-*`)  
2. Cadastra riscos (`inventario-*`) e matriz  
3. Opera ciclo GRO (`gro-workflow` + plano + indicadores)  
4. Gera versão PGR (`pgr-dashboard` → versões → aprovação/assinatura → PDF)  
5. Vínculos via hub de integração (análise/AET/inventário)  

## F4 — Psicossocial com campanha pública

1. Admin/Ergonomista cria campanha em `psicossocial-questionarios`  
2. Compartilha link `/form/:token`  
3. Respondentes anônimos enviam respostas  
4. Agrega fatores/matriz/plano; acompanha conformidade  

## F5 — Denúncia

1. Público ou autenticado registra (`denuncia-nova` ou API pública) → protocolo  
2. Responsável trata em `denuncia-detalhe` (evidências, status)  
3. Opcional: integração inventário/NR-01  

## F6 — AET + SST

1. Abre processo AET → avança etapas → métodos → laudo PDF  
2. Em paralelo: APR vinculada a inventário; EPI; inspeções; NC/CAPA; treinamentos  
3. Relatório SST PDF  

## F7 — Compliance regulatório

1. Scheduler/fontes varrem normas  
2. Detecções aparecem em alertas  
3. Humano valida em `compliance-validacao`  
4. Gera tarefas de adequação / relatórios de impacto  

## F8 — Suporte técnico ErgoSense

1. Admin Empresa → `support-access` → autoriza  
2. Admin Global entra no tenant (barra de modo suporte)  
3. Ações auditadas (`/api/support/audit`)  
4. Revogação encerra acesso  

## F9 — Admin Global opera carteira

1. `global-admin` → listas active/blocked/expired  
2. Detalhe tenant → block/suspend/reactivate  
3. `register-company` quando criação direta é necessária  

## F10 — Pacote V2 / vídeo

1. Após análise → `v2-methods` (multi-método + PDF)  
2. Ou `v2-video` (upload/live) → exports PDF/Excel/Word  
3. Ambientais / audit / dashboard executivo conforme necessidade
