# ErgoSense Web MVP

Protótipo funcional **mobile-first** para validação de UX e fluxos — referência visual para o app Flutter de produção.

> **Produção:** [`../mobile/`](../mobile/) (Flutter + SQLite + TFLite)  
> **Backend:** [`../backend/`](../backend/) (Spring Boot + PostgreSQL)  
> **Arquitetura:** [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md)

## Papel no ecossistema

| Camada | Este projeto | Produção |
|--------|--------------|----------|
| UI/UX | ✅ 14 telas fieis ao HTML | Flutter widgets |
| Persistência | localStorage (demo) | SQLite offline |
| Sync | Simulado | WorkManager + API |
| IA | Ângulos simulados | TFLite + MediaPipe |
| Auth | Mock JWT | JWT + Secure Storage |

## Funcionalidades (MVP)

- 14 telas completas (Splash → Sync)
- Design fiel ao `index.html` original
- Câmera real (`getUserMedia`) + captura de foto
- Gravação via `MediaRecorder`
- Score, RULA, REBA calculados
- Filtros e busca funcionais
- Persistência localStorage
- Fila de sync simulada

## Executar

```bash
npm install
npm run dev
# http://localhost:5173
```

**Login demo:** `lucas@vale.com.br` / `ergo1234`

## Migração para Flutter

Este MVP valida:
- Fluxo de telas → módulos Flutter em `mobile/lib/modules/`
- Design tokens → `mobile/lib/theme/ergosense_theme.dart`
- Modelos de dados → SQLite schema em `docs/database/sqlite-schema.sql`
- Cálculos ergonômicos → `mobile/lib/ai/` e `src/utils/ergonomics.ts` (referência)

## Stack

React 19 + TypeScript + Vite 8 (apenas MVP — **não é stack de produção**)
