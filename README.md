# SOI. — Diseña tu identidad. Vive tu propósito.

App de bienestar personal con IA agéntica basada en una sola ley:
**Pensamientos → Emociones → Acciones → Resultados.**

> Instrucciones completas para Claude Code: [`CLAUDE.md`](./CLAUDE.md) · Plan de esta versión: [`PLAN.md`](./PLAN.md)

## Stack
Next.js 15 (App Router) · React 19 · TypeScript estricto · Tailwind 4 · Supabase (Postgres + pgvector + Auth Google) · Vercel AI SDK (Gemini → Groq → DeepSeek) · Stripe (suscripciones) · VoiPi (TTS) · PostHog · Vercel Analytics.

## Arranque rápido
```bash
cp .env.example .env.local          # completa las llaves
npm install
supabase start                      # local (o: supabase link --project-ref <ref>)
npm run db:reset                    # aplica migraciones 0001..0005 + seed demo
npm run dev
```
Usuarios demo (solo local/staging): `valeria.demo@soi.app` … `renata.demo@soi.app` · contraseña `SoiDemo2026!`.

## Google OAuth
1. Google Cloud Console → Credenciales → ID de cliente OAuth (Web).
2. URI de redirección autorizada: `https://<proyecto>.supabase.co/auth/v1/callback` (local: `http://127.0.0.1:54321/auth/v1/callback`).
3. Supabase → Authentication → Providers → Google: pega Client ID y Secret.
4. Supabase → Authentication → URL Configuration: agrega `https://<tu-dominio>/auth/callback`.

## Stripe
Crea dos precios recurrentes (mensual $4.99 / anual $29.99) y coloca sus IDs en
`STRIPE_PRICE_SOI_PLUS_MONTHLY` y `STRIPE_PRICE_SOI_PLUS_YEARLY`. Webhook → `/api/webhook/stripe` con
`checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`. Activa el Billing Portal.

## Estructura
```
supabase/migrations/        0001 esquema · 0002 RAG · 0003 RLS · 0004 billing · 0005 racha/comunidad/push
supabase/seed.sql           8 usuarios demo + 20 posts de comunidad
src/app/(app)/              chat, onboarding, rutinas, ritual, evidencias, comunidad, perfil, ajustes, planes
src/app/api/                chat, onboarding, ritual, routines, evidence(+pdf), community(+react), profile(+analyze),
                            stripe(checkout, portal), webhook/stripe, cron(expire-trials, daily-ritual), push
src/lib/ai/                 fallback, router, crisis, prompts/ (plantilla + fichas por agente), tools, rag, moderation
src/lib/billing/            access-rules (puro) + check-access (Supabase)
src/components/             layout, chat, rituals, ritual, onboarding, evidence, community, profile, settings, paywall, ui
tests/                      unit (vitest) · e2e (playwright + axe)
```

## Scripts
| Script | Uso |
|---|---|
| `npm run dev` | Desarrollo |
| `npm run typecheck` / `lint` | Calidad |
| `npm test` | Unit tests (crisis, accesos, prompts) |
| `npm run test:e2e` | Playwright + auditoría a11y |
| `npm run db:reset` | Migraciones + seed local |
| `npm run db:seed` | Seed demo contra `DATABASE_URL` |

## Seguridad
- La detección de crisis corre **antes** del paywall y nunca consume consultas.
- `plan`, `stripe_*` y `free_queries_*` nunca se aceptan desde el cliente (`/api/profile` usa lista blanca).
- `0005` revoca `UPDATE` general en `user_profiles` y solo concede columnas de perfil: el navegador no puede auto-asignarse SOI+.
- RLS en todas las tablas; service role solo en webhook y cron.
