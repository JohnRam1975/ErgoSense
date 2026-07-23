# 03 — Núcleo: análise ergonômica

O coração do produto: do dashboard à captura postural, carga, resultado NR-17 e histórico.

## Telas

| ScreenId | O que o usuário faz |
|----------|---------------------|
| `company` | Troca empresa/tenant; solicita novo acesso |
| `dashboard` | KPIs, alertas, análises recentes, FAB nova análise |
| `collabs` | Lista colaboradores; abre cadastro/edição |
| `new-collab` | CRUD colaborador (consentimento, antropometria, setor) |
| `sectors` | Setores auditados; atalho para análise |
| `new-analysis` | Monta rascunho: colaborador, setor, atividade, contexto, carga; modo câmera ou ângulos manuais; `complete` vs `offline` |
| `camera` | Pose em tempo real, skeleton, riscos, gravação, medição de carga, workstation; captura sessão |
| `result` | Score/risco, ângulos, NR-17, carga/esforço, recomendações; PDF; compartilhar; atalho métodos V2; painel AI Expert |
| `history` | Busca/filtra análises; abre resultado; exclui; respeita limites do plano |
| `reports` | Relatórios NR17 / por colaborador / por setor → PDF |
| `settings` | Perfil, qualidade de captura, motor IA, PWA, sync, empresa, suporte |
| `sync` | Fila pendente vs sincronizada; forçar sync |

Navegação inferior: Início · Análises · Equipe · Relatórios · Menu.

## Fluxo típico de análise

```
Dashboard → Nova análise → (opcional) Novo colaborador
         → Preenche contexto + carga
         → Câmera (ou ângulos manuais)
         → Captura / encerra sessão
         → Resultado → PDF / compartilhar / V2
         → Histórico (synced true/false)
```

## Captura e visão

- Pose client-side (MediaPipe / pipeline em `src/vision`).  
- Overlay de skeleton, framing guide, dock de análise.  
- Workstation: altura de tela, luz, filtro azul (métricas no posto).  
- Áudios/alertas de risco; compartilhamento Web Share / WhatsApp / e-mail.

## Manuseio de carga (embutido)

Não é `ScreenId` separado — vive em `new-analysis` / `camera` / `result`:

- Formulário de parâmetros (peso, frequência, modo de manuseio, etc.).  
- Medição de distância por visão / toque no objeto (`LoadMeasureDock`, tracker).  
- Painéis de risco e esforço; recomendações.  
- Persistência ligada à análise (`load assessment` / effort nas migrações).

## Persistência API (núcleo)

| Recurso | Endpoints |
|---------|-----------|
| Colaboradores | `GET/POST/PUT/DELETE /api/collaborators` |
| Análises | `GET/POST/DELETE /api/analyses` · `GET /api/analyses/:id/video` |
| Setores | `GET/POST /api/sectors` |
| Relatórios | `GET /api/reports` |
| Tenants do usuário | `GET /api/tenants` · `POST /api/tenants` (ADMIN_GLOBAL) |

Vídeo/mídia: storage em DB (base64) ou S3/MinIO conforme configuração.

## Modos `complete` vs `offline`

| Modo | Comportamento |
|------|----------------|
| `complete` | Usa API; sync imediato quando online |
| `offline` | Prioriza dispositivo (ex.: TFLite local); entra na fila `sync` |

Indicador online/offline no chrome da app; módulos degradam com toast se API cair.
