# 04 — Módulos NR-01

Base legal operacional: **NR-01** (GRO/PGR/inventário), **Guia MTE** (psicossocial), canal de denúncia com LGPD.

---

## 4.1 Psicossocial

### Telas

| ScreenId | Função |
|----------|--------|
| `psicossocial-dashboard` | KPIs de risco psico, atalhos, conformidade |
| `psicossocial-fatores` | Avaliar/listar **13 fatores** do Guia MTE |
| `psicossocial-questionarios` | Instrumentos + campanhas + link público |
| `psicossocial-matriz` | Matriz 5×5 probabilidade × severidade |
| `psicossocial-plano` | Plano de ação preventivo (status) |
| `psicossocial-conformidade` | Checklist NR-1 / ISO 45003 / Guia MTE |
| `psicossocial-ia` | **Em breve** (ComingSoon) |

### 13 fatores (Guia MTE)

1. Sobrecarga / excesso de demandas  
2. Assédio de qualquer natureza  
3. Baixo controle / falta de autonomia  
4. Más relações no local de trabalho  
5. Trabalho remoto / isolado  
6. Má gestão de mudanças organizacionais  
7. Baixa clareza de papel/função  
8. Baixas recompensas / reconhecimento  
9. Falta de suporte / apoio  
10. Baixa justiça organizacional  
11. Eventos violentos ou traumáticos  
12. Baixa demanda (subcarga)  
13. Trabalho em condições de difícil comunicação  

### Questionários

| Instrumento | Papel |
|-------------|--------|
| COPSOQ-III (curto) | Dimensões de clima/exigências |
| HSE Management Standards | Stub / fase futura |
| CBI (Burnout) | Inventário de burnout |

### Formulário público

Rota **`/form/:token`** → `PsicoPublicFormPage` **sem login**.  
Anonimato LGPD; resultados agregados com mínimo de respondentes.

API: prefixo `/api/psico` (dashboard, fatores, matriz, conformidade, campanhas, form público, respostas, plano, histórico, LGPD).

---

## 4.2 Canal de denúncia

| ScreenId | Função |
|----------|--------|
| `denuncia-dashboard` | KPIs do canal |
| `denuncia-nova` | Registrar denúncia (assédio, violência, etc.) + protocolo |
| `denuncia-lista` | Listar investigações |
| `denuncia-detalhe` | Tratar caso, evidências, status, conclusão |

Público: `POST /api/denuncias/public` · consulta status.  
Autenticado: CRUD, tratativas, evidências, integração NR-01.

---

## 4.3 Critérios de risco

| ScreenId | Função |
|----------|--------|
| `criterios-dashboard` | Visão critérios/matrizes |
| `criterios-config` | Metodologias e versões |
| `criterios-historico` | Histórico versionado / auditoria |
| `criterios-documentacao` | Documentação automática NR-01 |

API `/api/risk-criteria`: active, documentation, methodologies, evaluate, audit, presets.

---

## 4.4 Inventário de riscos

| ScreenId | Função |
|----------|--------|
| `inventario-dashboard` | KPIs inventário NR-01 / tipologias |
| `inventario-lista` | Listar/filtrar riscos |
| `inventario-form` | CRUD: tipo, posto, exposição, medidas, evidências, vínculos AET/análise |
| `inventario-matriz` | Heatmap P×S 5×5 |

API `/api/risk-inventory`: summary, CRUD, compliance, links.  
Hub de integração sincroniza inventário ↔ análise ↔ AET ↔ GRO ↔ PGR.

---

## 4.5 GRO (Gerenciamento de Riscos Ocupacionais)

| ScreenId | Função |
|----------|--------|
| `gro-dashboard` | Dashboard do ciclo |
| `gro-workflow` | Estágios Identificação → Revisão; avançar/reverter |
| `gro-plano` | Medidas de controle (action plans) |
| `gro-indicadores` | Leading / lagging |
| `gro-historico` | Trilha de auditoria |
| `gro-relatorios` | Dossiê / inventário / plano |

API `/api/gro`: dashboard, workflow, plans, indicators, history, reports.

---

## 4.6 PGR (Programa de Gerenciamento de Riscos)

| ScreenId | Função |
|----------|--------|
| `pgr-dashboard` | Programa; gerar versão |
| `pgr-versoes` | Listar versões |
| `pgr-detalhe` | Aprovar, assinar, exportar PDF |
| `pgr-historico` | Auditoria de revisões |

API `/api/pgr`: program, versions, submit-approval, approve, reject, sign, revision, history.  
Snapshot agrega inventário + planos + indicadores.
