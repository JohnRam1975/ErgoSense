# Análise de Integração — ErgoSensePro
**Data:** 08/06/2026 | **Versão:** 3.0

---

## 1. Objetivo

Integrar os módulos psicossociais/MTE desenvolvidos no protótipo `ergosense_platform_v2.html` ao sistema React/TypeScript existente `ergosense-app`, formando um produto único: **ErgoSensePro**.

---

## 2. Arquitetura do Projeto Existente

### Stack técnica
- **Frontend:** React 19 + TypeScript + Vite 8
- **Mobile:** Flutter + Riverpod (não modificado)
- **Backend:** Spring Boot 3.3 / Java 21 (não modificado)
- **Banco:** PostgreSQL + SQLite

### Padrão de roteamento
- Tela única (`index.html`) com roteamento via `AppContext.go(screenId)`
- `ScreenId` é um union type em `src/types/index.ts`
- `SCREENS` record em `App.tsx` mapeia `ScreenId → React.ComponentType`
- `BNAV_MAP` e `DRAWER_MAP` em `src/data/constants.ts` controlam navegação

### Design system (dark theme)
```css
--bg: #090c11      /* fundo principal */
--bg1: #0e131c     /* cards */
--bg2: #141b27     /* inputs/secundário */
--amber: #FFA800   /* accent primário */
--cyan: #00D4FF    /* accent secundário */
--green: #00E676   /* sucesso */
--red: #FF3D3D     /* perigo/crítico */
--t0: #F0F4FA      /* texto primário */
--t1: #8A96AA      /* texto secundário */
```
Fontes: Barlow Condensed (`--fd`), DM Sans (`--fb`), JetBrains Mono (`--fm`)

---

## 3. Estratégia de Integração

### Princípios aplicados
1. **Zero duplicação** — nenhuma funcionalidade existente reescrita
2. **Mesma identidade visual** — classes CSS existentes (`.card`, `.btn`, `.badge`, `.inp`, `.row`, `.gap8`, `.jb`, `.ac`, `.av`, `.sg`, `.sc`, `.sv`, `.sl`, `.pb`, `.pf`)
3. **Mesmo padrão de componente** — hooks `useApp()` para navegação e toasts
4. **Inline styles apenas para tokens CSS** — `var(--amber)`, `var(--bg1)`, etc.
5. **Dados demo no mesmo formato** que `DEFAULT_COLLABORATORS` e `DEFAULT_ANALYSES`

### Arquivos criados
| Arquivo | Linhas | Propósito |
|---------|--------|-----------|
| `src/screens/PsicossocialScreens.tsx` | ~450 | 7 telas psicossociais |

### Arquivos modificados
| Arquivo | Modificação |
|---------|-------------|
| `src/types/index.ts` | +7 IDs ao union type `ScreenId` |
| `src/data/constants.ts` | +7 entradas em `BNAV_MAP` e `DRAWER_MAP` |
| `src/App.tsx` | +7 imports + +7 entradas em `SCREENS` |
| `src/components/Navigation.tsx` | +8 itens no `MenuDrawer` (separador + 7 módulos) |

---

## 4. Decisões Técnicas

### Por que não criar um projeto separado
O usuário foi explícito: "Não criar um projeto novo". A integração preserva todo o estado global (`AppContext`), o sistema de autenticação, colaboradores, análises e configurações existentes.

### Por que dados demo locais (não no AppContext)
Os dados psicossociais são sensíveis (LGPD) e requerem anonimização antes de aparecerem no estado global. Em produção, virão de endpoints separados com controle de acesso.

### Por que inline styles com var()
Os arquivos de tela existentes (ex.: `V2Screens.tsx`, `MainScreens.tsx`) usam esse padrão. Consistência > pureza técnica.

### LGPD — restrições implementadas
- Nenhum dado individual identificável nas telas psicossociais
- Nota de anonimato visível em `PsicossocialQuestionariosScreen`
- Canal de denúncia sem IP/cookie (conforme requisito explícito do usuário)
- Mínimo 5 respondentes por grupo antes de exibir agregação (validação no componente)

---

## 5. Resultado do Build

```
✓ 312 modules transformed.
✓ built in 1.73s
0 TypeScript errors
0 test failures
```

Aviso de chunk size (`> 500 kB`) é esperado e pré-existente — não foi introduzido pela integração.

---

## 6. Próximos Passos Técnicos

Ver `roadmap-ajustes-futuros.md` para detalhamento completo.
