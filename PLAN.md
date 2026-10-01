# PLAN.md — Claude Code (Plan Mode) · SOI v0.2

## 1. Diagnóstico del repo recibido (v0.1)
| Área | Estado v0.1 | Brecha vs `SOI.txt` |
|---|---|---|
| Migraciones 0001-0004 | ✅ | Falta racha con escudo, país, push, autor en posts, reacciones atómicas |
| Auth | ❌ solo cliente SSR | Falta **Google OAuth**, email (magic link), callback, logout, protección de rutas |
| System prompts | Texto plano en un archivo | Falta **plantilla filtrada por agente** (repo de instrucciones) según `SOI.txt` |
| Comunidad | Solo tablas | Falta feed, reacciones, moderación, anonimato y **usuarios demo sembrados** |
| Layout/Sidebar | ❌ | Falta app shell responsive (desktop 280px, tablet colapsable, drawer móvil) |
| Onboarding 8 tarjetas | ❌ | Falta |
| Chat UI + streaming | Solo API | Falta UI, persistencia de conversación, paywall banner, TTS, YouTube embebido |
| Herramientas IA | ❌ | youtubeSearch, saveEvidence, updateProfile, scheduleReminder, webSearch |
| RAG | Solo RPC | Falta embeddings + inyección de memoria |
| Racha / Ritual diario | ❌ | Falta racha sin castigo, escudo, ritual 4 partes, cron + push |
| Evidencias / PDF | ❌ | Falta muro, hitos, exportación PDF |
| Perfil / Ajustes / Planes | ❌ | Falta |
| SEO/PWA/Analytics/Tests | ❌ | Falta OG, manifest, sitemap, PostHog, Playwright, Vitest |

## 2. Decisiones
1. **Route group `(app)`** con layout autenticado → URLs limpias (`/chat`, `/rutinas`, …).
2. **Acceso centralizado**: `evaluateAccess()` puro (testeable) + `canAccess()` con Supabase. Trial vencido se trata como Free aunque el cron no haya corrido.
3. **Prompts como repo filtrado**: `src/lib/ai/prompts/` → plantilla base (SOI.txt) + ficha por agente (`knowledge`, `techniques`, `allowedTopics`, `forbidden`). `buildSystemPrompt()` ensambla y filtra.
4. **Crisis antes que todo**: regex determinista → nunca consume consultas, nunca se bloquea.
5. **Migraciones aditivas** (`0005`) — solo `ALTER … ADD COLUMN IF NOT EXISTS`; nunca se pierde memoria.
6. **Seed demo**: `supabase/seed.sql` crea 8 usuarias/os demo (`is_demo`) + 20 posts + reacciones.
7. **Componentes UI propios** (estilo shadcn) en `src/components/ui` para que el repo compile sin pasos extra.
8. **PDF en servidor** con `pdf-lib` (sin dependencias nativas).

## 3. Orden de ejecución
1. Config raíz → 2. Migraciones + seed → 3. `lib/` (supabase, billing, ai, rag, streak) → 4. API routes → 5. UI shell + páginas → 6. SEO/PWA/analytics → 7. Tests → 8. Verificación de sintaxis TS/TSX.

## 4. Criterios de aceptación
- `npm i && npm run typecheck && npm run build` sin errores con `.env.local` completo.
- Usuario nuevo: login Google → onboarding → chat → rutina → evidencia → comunidad.
- Free sin consultas: input desactivado + banner; mensaje de crisis igual responde con recursos.
