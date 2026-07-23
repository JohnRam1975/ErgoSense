# 05 — AET, SST, eSocial e Compliance

---

## 5.1 AET (Análise Ergonômica do Trabalho) — NR-17

| ScreenId | Função |
|----------|--------|
| `aet-dashboard` | KPIs dos processos AET |
| `aet-workflow` | Criar/avançar processo NR-17 |
| `aet-detalhe` | Métodos (RULA/REBA/OWAS/NIOSH…), aprovação, assinaturas |
| `aet-cadastros` | Mobiliário, equipamentos, organização, teleatendimento |
| `aet-relatorio` | Laudo normativo PDF |

API `/api/aet`: processos e etapas (advance/retreat), vibração, teleatendimento, organização, métodos, relatório, mobiliário/equipamentos, responsável técnico, versões corporativas (snapshot, aprovação, assinatura, revisão, integrações).

Export FE: `exportAetPdf.ts`.

---

## 5.2 SST operacional

| ScreenId | Função |
|----------|--------|
| `sst-dashboard` | KPIs APR / EPI / NC / CAPA / inspeções / treinamentos |
| `sst-apr` | Análise Preliminar de Risco; vínculo inventário |
| `sst-epi-epc` | Cadastro EPI (CA) e EPC; entregas |
| `sst-inspecoes` | Programar/listar inspeções |
| `sst-auditorias` | Auditorias NR-01 / ISO 45001 |
| `sst-nc-capa` | Não conformidades e CAPA |
| `sst-treinamentos` | Capacitação SST |
| `sst-relatorios` | Relatório PDF SST |

API `/api/sst`: dashboard, relatórios, APR, EPI (+ entrega), EPC, inspeções, auditorias, NC, CAPA, treinamentos, histórico.

Export FE: `exportSstPdf.ts`.

---

## 5.3 eSocial

### UI (estado atual)

Todas as telas abaixo estão como **ComingSoon / Em breve** no frontend:

| ScreenId | Escopo previsto |
|----------|-----------------|
| `esocial-dashboard` | Visão geral |
| `esocial-s2210` | CAT |
| `esocial-s2220` | ASO / monitoração |
| `esocial-s2240` | Agentes nocivos |
| `esocial-historico` | Transmissões |
| `esocial-config` | Credenciais / ambiente |

Há ainda stub de export S-2240 no pacote V2.

### API (implementada no backend)

Prefixo `/api/esocial`: dashboard, config, eventos CRUD, validar, assinar, preparar-envio, XML, validações, enviar, reenviar, consultar-status, transmissoes, histórico.  
Serviços: XML, XSD, transmissão, Gov.br, assinatura ICP-Brasil.

---

## 5.4 Compliance Intelligence

Princípio de produto: **detectar e alertar; nunca auto-aplicar normas** sem humano.

| ScreenId | Função |
|----------|--------|
| `compliance-dashboard` | Visão do motor (MTE/DOU/Fundacentro…) |
| `compliance-normas` | Catálogo versionado |
| `compliance-alertas` | Novas normas / revisões |
| `compliance-validacao` | Aprovar/rejeitar detecções (obrigatório humano) |
| `compliance-relatorios` | Impacto legal |
| `compliance-fontes` | Fontes monitoradas / varredura |
| `compliance-adequacao` | Tarefas de adequação / impacto clientes |

API `/api/compliance`: dashboard, fontes, scan, normas/versões/compare, detecções (+ impactos, validar), alertas, histórico, validações, relatórios, agendamento, varreduras, tarefas.  
Scheduler de compliance sobe no bootstrap do worker 1 da API.
