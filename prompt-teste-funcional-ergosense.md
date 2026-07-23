# Prompt de Teste Funcional — ErgoSense (E2E, uso real)

> Cole este prompt em uma sessão de QA (humano ou agente de IA com acesso ao ambiente de staging/homologação do ErgoSense) para conduzir uma bateria de testes funcionais ponta a ponta, simulando o uso real do sistema por cada persona, cobrindo 100% dos módulos documentados.

---

## 0. Contexto para quem for executar o teste

Você vai testar o **ErgoSense**, uma plataforma SaaS multi-tenant de ergonomia e SST (NR-01/NR-17), com:
- 5 papéis de login (RBAC): `ADMIN_GLOBAL`, `ADMIN_EMPRESA`, `ERGONOMISTA`, `SUPERVISOR`, `OPERADOR`
- 4 planos: `free`, `standard`, `professional`, `enterprise`, cada um com limites diferentes
- ~89 `ScreenId` + 1 rota pública (`/form/:token`)
- Módulos: Auth/Onboarding, Núcleo de análise ergonômica, V2 (executivo/vídeo/métodos), NR-01 (Psicossocial, Denúncia, Critérios, Inventário, GRO, PGR), AET, SST, eSocial (API only, UI em "Em breve"), Compliance, Admin Global, Organização, Suporte técnico (LGPD)
- Regra de produto crítica: **Compliance nunca aplica normas automaticamente** — toda detecção exige validação humana. eSocial tem API pronta mas UI em placeholder.

Objetivo: validar que cada jornada funciona de ponta a ponta como um usuário real faria — não apenas "o endpoint responde 200", mas "o fluxo de negócio se completa e os dados persistem corretamente entre módulos integrados".

---

## 1. Preparação do ambiente

Antes de iniciar, garanta/registre:

1. **Contas de teste**, uma por papel, em pelo menos 2 tenants diferentes (para validar isolamento):
   - `admin.global@teste`
   - `admin.empresa.a@teste` (tenant A, plano `professional`)
   - `ergonomista.a@teste` (tenant A)
   - `supervisor.a@teste` (tenant A)
   - `operador.a@teste` (tenant A)
   - `admin.empresa.b@teste` (tenant B, plano `free`, para testar limites)
2. MFA habilitado em pelo menos uma conta ADMIN_EMPRESA.
3. Estrutura organizacional mínima criada (Unidade → Setor → Função → Atividade → Posto) no tenant A.
4. Um link de campanha psicossocial pública e um token de denúncia pública disponíveis para teste anônimo.
5. Registrar ambiente (URL, versão, data/hora) e abrir uma planilha/documento de bugs com colunas: `Módulo | Tela/API | Papel usado | Passos | Esperado | Obtido | Severidade | Evidência`.

---

## 2. Como reportar cada teste

Para cada cenário abaixo, execute como o papel indicado e registre:
- ✅ **Passou** / ⚠️ **Passou com ressalva** / ❌ **Falhou** / 🚧 **Bloqueado (dependência)**
- Print ou vídeo da tela + payload/resposta da API relevante (rede)
- Se aplicável: o dado persistiu após reload/logout-login?
- Se aplicável: o dado apareceu corretamente em **outro módulo integrado** (ex.: inventário → AET → GRO → PGR)?

---

## 3. Suite de testes por fluxo de negócio (F1–F10)

### F1 — Onboarding de empresa nova (público → Admin Global → Admin Empresa)
1. Sem login, acesse `request-access`, preencha o formulário comercial → `POST /api/public/tenant-request`. Confirme mensagem de sucesso e protocolo.
2. Repita em `request-access-autonomo` para o fluxo de autônomo.
3. Login como `ADMIN_GLOBAL` → `admin-tenant-requests` → localize a solicitação → abra `admin-tenant-request-detail`.
4. Teste as 4 ações: **aprovar**, **rejeitar**, **pedir ajuste**, **bloquear** (em solicitações distintas, se possível).
5. Após aprovação, vá a `admin-access-control` e libere o acesso pós-pagamento (grant-access).
6. Verifique se a empresa aparece em `admin-tenants-active`.
7. Com o e-mail do solicitante, acesse `activate-account`, ative a conta e configure MFA (QR + código).
8. Faça login com a nova conta → deve cair em `dashboard` do tenant recém-criado.
9. **Caso negativo:** tente ativar a conta com token expirado/usado — deve falhar com mensagem clara.

### F2 — Análise ergonômica de campo (Operador/Ergonomista)
1. Login como `OPERADOR` → `dashboard`.
2. Confirme que **não** vê opções administrativas (RBAC).
3. Vá a `collabs` → `new-collab`: cadastre um colaborador com consentimento e antropometria. Teste também a matrícula especial `ESP-SELF` (autoavaliação).
4. Confirme setor em `sectors` (crie se necessário).
5. `new-analysis`: monte um rascunho completo — colaborador, setor, atividade, contexto, **carga** (peso, frequência, modo de manuseio).
6. Teste os dois modos:
   - **complete**: com API online, capture via `camera` (skeleton, riscos em tempo real, workstation) e finalize.
   - **offline**: desligue a rede (ou simule), capture, confirme que a análise entra na fila `sync` com `synced: false`.
7. Em `result`: confira score, ângulos, classificação NR-17, painel de carga/esforço, recomendações. Gere o PDF NR-17 e compartilhe (Web Share/WhatsApp/e-mail).
8. Reconecte a rede, vá a `sync`, force sincronização, confirme `synced: true`.
9. `history`: busque, filtre e abra a análise; teste exclusão.
10. `reports`: gere relatório por colaborador e por setor.
11. **Teste de limite de plano:** com conta do tenant `free`, exceda 10 análises/mês e confira o bloqueio; tente exportar PDF completo (deve ser negado) e histórico além de 5 itens (deve truncar).

### F3 — Ciclo NR-01 completo (risco → programa)
1. `ERGONOMISTA`: configure critérios em `criterios-config` (metodologias/versões) e confira `criterios-historico` e `criterios-documentacao`.
2. `inventario-form`: cadastre riscos dos 6 tipos, com exposição, medidas de controle, evidências e vínculo com AET/análise.
3. `inventario-matriz`: confirme o heatmap P×S refletindo os riscos cadastrados.
4. `gro-workflow`: avance o ciclo por todos os estágios (Identificação → Revisão), teste também **reverter** estágio.
5. `gro-plano`: crie plano de ação vinculado; `gro-indicadores`: confirme leading/lagging; `gro-historico`: confirme trilha de auditoria.
6. `pgr-dashboard`: gere uma versão do programa consolidando inventário+planos+indicadores.
7. `pgr-detalhe`: submeta para aprovação → aprove → assine → exporte PDF.
8. Confirme em `pgr-historico` a trilha de revisões.
9. **Teste de integração:** edite um risco no inventário e confirme que uma nova versão do PGR reflete a mudança (ou aponta divergência).

### F4 — Psicossocial com campanha pública
1. `ERGONOMISTA`/`ADMIN_EMPRESA`: em `psicossocial-questionarios`, crie uma campanha (COPSOQ-III ou CBI) e gere o link `/form/:token`.
2. **Sem login**, em outra aba/navegador anônimo, acesse o link e responda ao formulário. Confirme que não pede autenticação e que é anônimo (LGPD).
3. Responda com múltiplos "respondentes" simulados (mínimo necessário para agregação).
4. Volte autenticado: `psicossocial-fatores` — confirme os **13 fatores** do Guia MTE calculados.
5. `psicossocial-matriz`: confira matriz 5×5 probabilidade×severidade.
6. `psicossocial-plano`: crie plano de ação preventivo e mude seu status.
7. `psicossocial-conformidade`: confira checklist NR-1/ISO 45003/Guia MTE.
8. Confirme que `psicossocial-ia` mostra **"Em breve"** (não deve quebrar nem simular funcionalidade).
9. **Teste negativo LGPD:** tente identificar um respondente individual — não deve ser possível; resultados devem vir agregados com mínimo de respondentes.

### F5 — Canal de denúncia
1. **Sem login**, registre uma denúncia via API pública (ou tela pública se existir) → confirme protocolo gerado.
2. Consulte o status da denúncia pelo protocolo, sem login.
3. Autenticado (`SUPERVISOR` ou `ERGONOMISTA`), acesse `denuncia-lista` → `denuncia-detalhe`: trate o caso, anexe evidências, mude status, registre conclusão.
4. Teste a integração opcional com inventário/NR-01.
5. **RBAC:** confirme que `OPERADOR` só pode **submeter** denúncia, não tratar; `SUPERVISOR` pode responder/tratar.

### F6 — AET + SST
1. `aet-workflow`: crie um processo NR-17, avance por todas as etapas (advance/retreat).
2. `aet-detalhe`: aplique métodos (RULA/REBA/OWAS/NIOSH), colete aprovações e assinaturas.
3. `aet-cadastros`: cadastre mobiliário, equipamentos, organização e teleatendimento.
4. `aet-relatorio`: gere o laudo NR-17 em PDF.
5. Em paralelo: `sst-apr` vinculada ao inventário de riscos; `sst-epi-epc` (cadastro EPI com CA, entrega, EPC); `sst-inspecoes` (programar/listar); `sst-auditorias`; `sst-nc-capa` (abrir não conformidade → CAPA → encerrar); `sst-treinamentos`.
6. `sst-relatorios`: gere PDF consolidado.
7. **Teste de integração:** confirme que o mesmo risco do inventário aparece referenciado tanto na AET quanto na APR do SST.

### F7 — Compliance regulatório (validação humana obrigatória)
1. `compliance-fontes`: dispare uma varredura manual (scan) das fontes monitoradas (MTE/DOU/Fundacentro).
2. `compliance-alertas`: confirme que novas normas/revisões aparecem como alerta, **não aplicadas automaticamente**.
3. `compliance-validacao`: **aprove** uma detecção e **rejeite** outra — confirme que cada ação exige usuário humano autenticado (não há botão de "aplicar automaticamente").
4. `compliance-adequacao`: confirme geração de tarefas de adequação a partir da detecção aprovada.
5. `compliance-relatorios`: gere relatório de impacto legal.
6. **Teste crítico de produto:** tente encontrar qualquer caminho em que uma norma seja aplicada sem clique humano — isso é uma falha grave se existir.

### F8 — Suporte técnico ErgoSense (LGPD)
1. `ADMIN_EMPRESA` (não Global): acesse `support-access`, **autorize** acesso técnico.
2. Login como `ADMIN_GLOBAL`, confirme que a barra `SupportModeBar` aparece ao entrar no tenant autorizado.
3. Realize uma ação qualquer no tenant como suporte e confirme registro em `GET /api/support/audit`.
4. Volte como `ADMIN_EMPRESA` e **revogue** o acesso.
5. **Teste negativo crítico:** como `ADMIN_GLOBAL`, tente acessar dados de um tenant **sem autorização vigente** — deve ser bloqueado.

### F9 — Admin Global operando a carteira de tenants
1. `global-admin`: confira listagem geral e atalhos.
2. Percorra `admin-tenants-active`, `admin-tenants-blocked`, `admin-tenants-expired`.
3. Em `admin-tenant-detail`, edite metadados (CNPJ, status) e confirme persistência.
4. Teste as transições de estado: bloquear → suspender → desativar → reativar um tenant de teste (não usar tenant com dados reais).
5. `register-company`: crie uma empresa diretamente (bypass do fluxo comercial) — exclusivo de `ADMIN_GLOBAL`.
6. **RBAC:** confirme que `ADMIN_EMPRESA` não enxerga nenhuma dessas telas.

### F10 — Pacote V2 (executivo, métodos, vídeo)
1. Após uma análise concluída (F2), abra `v2-methods`: confirme pacote multi-método (RULA, REBA, NIOSH, OWAS, KIM, OCRA, QEC, ROSA, Strain Index, TLV-HAL, NASA-TLX, Snook) e exporte PDF V2.
2. `v2-video`: envie um vídeo (upload) e teste também modo live, se disponível; confira timeline, heatmap e exports (PDF/Excel/Word via `exportVideoErgoReport`).
3. `v2-environmental`: registre dados de ruído/IBUTG/lux e confirme que a tela deixa claro o caráter de **simulação/apoio** (NR-15/NHO), não medição oficial.
4. `v2-audit`: confirme logs locais de rastreabilidade das ações acima.
5. `v2-dashboard`: confirme KPIs (IERE/IECI), ranking de setores, heatmap e tendência refletindo os dados gerados.
6. Confirme que `v2-roadmap` é somente informativo (não deve permitir interação como se fosse funcional).

---

## 4. Testes transversais (aplicam-se a todo o sistema)

### 4.1 RBAC — matriz de permissões
Para cada papel (`ADMIN_GLOBAL`, `ADMIN_EMPRESA`, `ERGONOMISTA`, `SUPERVISOR`, `OPERADOR`), tente acessar recursos fora da matriz documentada (ex.: `OPERADOR` tentando `DELETE /api/analyses/:id` de outro usuário, ou acessando `/api/admin/*`). Confirme 403 consistente na API **e** ausência do item de menu na UI.

### 4.2 Isolamento multi-tenant
Logado no tenant A, tente acessar/adivinhar IDs de recursos do tenant B (colaboradores, análises, inventário) diretamente pela API. Deve retornar 403/404, nunca vazar dados.

### 4.3 Planos SaaS (limites)
Repita as ações-chave em contas `free`, `standard`, `professional`, `enterprise` e confirme:
- Histórico visível: 5 / 50 / ilimitado / ilimitado
- PDF completo: bloqueado no free
- Filtros avançados de histórico: bloqueados no free
- Análises/mês: 10 no free, ilimitado nos demais
- Comparar no dashboard: só em professional/enterprise

### 4.4 Autenticação e sessão
- Login com senha errada, e-mail inexistente, conta bloqueada (403) e inexistente (404).
- Fluxo completo de "esqueci senha" (token TTL ~1h, uso único, revogação de sessões após reset).
- Login com MFA habilitado: fluxo correto de `mfaRequired` → TOTP → sucesso; TOTP errado → falha clara.
- Refresh de token expirado, logout efetivo (token não deve mais funcionar após logout).
- Sessão espelhada em `localStorage` — validar que reload mantém sessão e que logout limpa esse estado.

### 4.5 PWA e offline
- Instale o PWA (banner de instalação) e confirme status "App instalado" em `settings`.
- Force modo offline em pleno uso: crie análise, confirme fila de sync, reconecte, force sync manual.
- Derrube a API propositalmente (ou simule) e confirme que módulos degradam com toast informativo, sem crash.

### 4.6 Exportações
Para cada exportador (`exportNr17Pdf`, `exportSummaryReportPdf`, `exportV2Pdf`, `exportVideoErgoReport`, `exportAetPdf`, `exportPgrPdf`, `exportSstPdf`), gere ao menos um PDF e confirme abertura íntegra e dados coerentes com a tela de origem. Teste `shareAnalysis` nos 3 canais (Web Share, WhatsApp, e-mail).

### 4.7 Telas "Em breve" / roadmap
Confirme que os seguintes itens mostram placeholder claro e **não** simulam funcionalidade real: `psicossocial-ia`, painel AI Expert em `result`, as 6 telas de `esocial-*`, `v2-roadmap`.

### 4.8 eSocial (API sem UI)
Como este módulo só tem API, teste via chamadas diretas (Postman/Swagger em `/api/docs`): criar evento S-2210/S-2220/S-2240, validar, assinar, preparar envio, gerar XML, consultar status, transmissões e histórico. Documente que a UI correspondente ainda não existe — isso é esperado, não é bug.

### 4.9 AI Expert (API funcional, UI parcial)
Via API, teste `analyze-ergonomics`, `control-measures`, `recommendations`, `risk-analysis`, `virtual-audit` e confirme `GET /api/system/ai-status`. Registre se a UI (`result`) realmente esconde isso atrás de "Em breve" mesmo com a API ativa — se a API funciona mas a UI trava, é inconsistência de produto a ser reportada (não necessariamente bug técnico, mas gap documentado).

### 4.10 Organização (NR-01)
Em `org-structure`, crie a árvore completa Unidade → Setor → Função → Atividade → Posto e confirme que esses nós aparecem corretamente como opções em inventário, AET e nova análise.

---

## 5. Critérios de aceite gerais

Marque o teste como **aprovado** somente se:
- O fluxo completa sem erro visível ao usuário final.
- Os dados persistem após logout/login e refresh de página.
- A integração entre módulos (ex.: inventário → AET → GRO → PGR; análise → V2; risco → SST) reflete os mesmos dados, sem duplicidade ou divergência.
- RBAC e isolamento de tenant nunca são violados, mesmo via chamada direta à API.
- Limites de plano são respeitados exatamente como na tabela do documento `01-atores-papeis-planos.md`.
- Nenhuma norma de compliance é aplicada sem validação humana.
- Placeholders ("Em breve"/roadmap) não enganam o usuário fingindo ser funcionais.

## 6. Saída esperada deste teste

Ao final, produza:
1. Planilha/relatório de bugs (severidade Crítica/Alta/Média/Baixa).
2. Lista de telas/APIs **não cobertas** por este roteiro (gap de teste).
3. Resumo executivo: % de fluxos F1–F10 aprovados sem ressalva, principais riscos de produção.
