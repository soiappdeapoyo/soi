# CLAUDE.md — SOI App Build Instructions

**Proyecto:** SOI — App de bienestar personal con IA agéntica
**Tagline:** "SOI. Diseña tu identidad. Vive tu propósito."

**Misión:** Ayudar al usuario a sentirse bien mediante agentes de IA que aprenden de él, lo acompañan con técnicas de Neville Goddard, Joe Dispenza, Napoleon Hill, Brian Tracy, Hal Elrod y Robin Sharma, y le construyen rutinas diarias que transforman su identidad.

**Público objetivo:** Hispanohablantes (LATAM + España + USA hispano), 25-45 años, mayoritariamente femenino, interesado en espiritualidad, manifestación, productividad y bienestar.

**Diferenciador central:** SOI no es un chatbot. Es un sistema de transformación personal que combina chat agéntico, rutinas estructuradas, memoria psicológica transversal y comunidad.

**Requisitos adicionales (v0.2):**
- **Autenticación con Google** (Supabase OAuth) + enlace mágico por correo.
- **Instrucciones de repos filtradas para chats** (system prompts por agente desde una plantilla común).
- **Comunidad con usuarios demo sembrados** (`supabase/seed.sql`).

---

## 🧭 Principio Central de SOI

> **Los pensamientos lideran las emociones. Las emociones lideran las acciones. Las acciones lideran los resultados.**

| Capa | Pregunta que responde | Cómo SOI la implementa |
|---|---|---|
| Pensamientos | ¿Qué crees sobre ti y sobre tu realidad? | Chat agéntico + afirmaciones + reestructuración cognitiva (Brian Tracy, Neville Goddard) |
| Emociones | ¿Cómo te hace sentir eso que piensas? | Meditaciones, SATS, protocolo Dispenza, diario emocional |
| Acciones | ¿Qué haces como consecuencia? | Rutinas diarias (Miracle Morning, 5AM Club, ritual de 5 min), micro-acciones del agente |
| Resultados | ¿Qué evidencia tangible obtienes? | Muro de Evidencias, testimonios, comunidad, PDF de progreso |

**Consecuencia arquitectónica:** la app interviene en el eslabón más débil. Piensa mal → afirmaciones. Siente mal → meditación. No actúa → rutinas. No ve resultados → muro de evidencias. Implementado en `ESLABON_TO_AGENT` (`src/config/agents.ts`), el router (`src/lib/ai/router.ts`) y `user_profiles.weakest_link`.

Todo agente, rutina, respuesta y notificación debe mapearse a uno de los 4 eslabones. Si no encaja, no pertenece a SOI.

---

## 📌 Reglas de Oro para Claude Code Opus

1. **No preguntes nada al usuario al iniciar la sesión.** Lee este documento, planifica y ejecuta. Solo detente ante un bloqueo técnico insalvable.
2. **Español primero.** Copy visible en español neutro latinoamericano. Identificadores de código en inglés.
3. **React + Next.js App Router.** Server Components por defecto; Client Components solo con interactividad real.
4. **Mobile-first.** Diseño base a 375px.
5. **Performance es UX.** Lighthouse ≥95 (YouTube con *facade*, TTS por import dinámico).
6. **Accesibilidad obligatoria.** Contraste AA, aria-label, navegación por teclado, `prefers-reduced-motion`.
7. **Nunca rompas la memoria del usuario.** Migraciones aditivas (`ADD COLUMN IF NOT EXISTS`). Las conversaciones se archivan, no se borran.
8. **Toda rutina cita su fuente.** No inventes técnicas.
9. **La base de datos es transversal.** `agent_knowledge` sirve a todos los agentes; ningún agente nuevo requiere migración.

---

## 🧠 Marco Teórico — Autores y Fuentes

### 1. Brian Tracy — Ritual de 5 minutos
*Goals!*, *Eat That Frog!*. El subconsciente no distingue entre lo real y lo imaginado.
1. Al despertar, siéntate con lápiz y papel. No toques el teléfono.
2. Di en voz alta: "Hoy va a ser el mejor día de todos."
3. Escribe esa frase en la parte superior de la página.
4. Escribe cómo se desarrollará tu día, específico y positivo.
5. Termina escribiendo y diciendo en voz alta: "Gracias."

Además: **10 metas** diarias en presente y **tarjetas 3x5** de afirmación.
**Mapeo SOI:** Pensamientos (metas escritas) → Emociones (visualización) → Acciones (una acción concreta) → Resultados (logro escrito).

### 2. Hal Elrod — Miracle Morning (S.A.V.E.R.S.)
| Práctica | Descripción |
|---|---|
| S — Silence | Meditación, respiración, oración |
| A — Affirmations | Declaraciones intencionales en presente |
| V — Visualization | Visualización del día y metas |
| E — Exercise | Ejercicio aeróbico |
| R — Reading | Leer 10 páginas diarias |
| S — Scribing | Diario, gratitud, reflexiones |

6 min por práctica (36 min) o 10 min (60 min).

### 3. Robin Sharma — Club de las 5 AM (20/20/20)
| Bloque | Actividad |
|---|---|
| 20 min — Moverse | Ejercicio intenso |
| 20 min — Reflexionar | Meditación, planificación, visualización |
| 20 min — Crecer | Lectura o aprendizaje |

### 4. Neville Goddard — Ley de Asunción
- **SATS:** relajación profunda antes de dormir; escena corta del deseo cumplido, repetida hasta dormir.
- **La Revisión:** reescribir mentalmente eventos pasados.
- **Dieta mental:** monitorear cada pensamiento y palabra.

### 5. Joe Dispenza — Reprogramación neuronal
- **Mañana** (10-15 min, antes del teléfono): mano al corazón + "Hoy es el día en que me libero de mi pasado..."
- **Tarde** (2-4 PM): 5 min de reconexión con movimiento.
- **Noche** (7-9 PM): 10-15 min de gratitud y revisión.

### 6. Napoleon Hill — *Think and Grow Rich* (1937)
Deseo, fe, autosugestión, decisión, persistencia.

---

## 🏗️ Stack Técnico

| Capa | Tecnología |
|---|---|
| UI | React 19 + Next.js 15 (App Router) |
| Lenguaje | TypeScript 5 estricto |
| Estilos | Tailwind CSS 4 + `@tailwindcss/typography` |
| Componentes | Propios estilo shadcn en `src/components/ui` (compatibles con `npx shadcn add`) |
| Iconos | lucide-react |
| Base de datos | Supabase (PostgreSQL + pgvector) |
| Auth | Supabase Auth (`@supabase/ssr`) — **Google OAuth** + magic link |
| LLM | Gemini `gemini-2.0-flash` → Groq `llama-3.3-70b-versatile` → DeepSeek `deepseek-chat` |
| Orquestación | Vercel AI SDK (`ai`, `@ai-sdk/react`) |
| Voz | VoiPi (Edge TTS + Browser TTS) con fallback `speechSynthesis` |
| Video | YouTube Data API v3 |
| Embeddings | Google `text-embedding-004` (768) |
| Pagos | Stripe (solo suscripción mensual/anual) |
| PDF | pdf-lib (servidor) |
| Push | web-push (VAPID) + Service Worker |
| Analytics | Vercel Analytics + PostHog (sin contenido de mensajes) |
| Tests | Vitest (unit) + Playwright + axe-core (e2e/a11y) |

---

## 🗄️ Base de Datos Transversal

Una tabla maestra `agent_knowledge` (estilo Notion/Monday): `category` = base, `metadata` JSONB = propiedades, `tags` = etiquetas, `status` = estado, `embedding` = búsqueda semántica, `parent_id/related_ids` = relaciones.

| Migración | Contenido |
|---|---|
| `0001_initial_schema.sql` | Tablas, índices, triggers |
| `0002_match_knowledge_rpc.sql` | `match_knowledge` (RAG) |
| `0003_rls_policies.sql` | RLS |
| `0004_billing_functions.sql` | `decrement_free_query`, `expire_trials` |
| `0005_streaks_community_push.sql` | Escudo de racha, `register_ritual_day`, `toggle_reaction`, país, avatar, push, autor/demo en posts, **permisos por columna en `user_profiles` (anti-bypass del paywall)**, endurecimiento de `decrement_free_query`/`expire_trials` |

**Uso de categorías:** `evidencia` (Muro), `ritual_diario` (ritual generado), `perfil_usuario` (onboarding, análisis), `conversacion` (memoria RAG), `accion` + tag `recordatorio` (scheduleReminder), `video_cache`, `aprendizaje_web`, `crisis_log`.

---

## 💳 Planes y Paywall

| Estado | Duración | Qué puede hacer | Cómo se activa |
|---|---|---|---|
| Trial | 7 días | Todo desbloqueado | Al registrarse |
| Free | Post-trial | Chat (pool de 20 consultas), onboarding, perfil, recomendación de rutinas | Al vencer el trial |
| SOI+ | Mientras pague | Todo ilimitado | Stripe |

**Bloqueado en Free:** ejecución de rutinas, TTS, Muro de Evidencias, PDF, comunidad, ritual diario, YouTube, análisis profundo.

**Regla dura:** las migraciones aplicadas no se editan; todo cambio va en una migración nueva.

**Implementación:** `src/lib/billing/access-rules.ts` (`evaluateAccess`, puro y testeado) + `check-access.ts` (`canAccess`, `getAccessMap`, `decrementFreeQuery`). Un trial vencido se trata como Free aunque el cron no haya corrido.

**UX:** al agotar las 20 consultas aparece el banner "Alcanzaste el límite del plan Free. Pasa a SOI+ para seguir." y el botón Enviar se desactiva — **excepto si el texto es una crisis**. Las secciones bloqueadas usan `<LockedFeature>`.

| Modalidad | Precio | Variable |
|---|---|---|
| SOI+ Mensual | $4.99 USD/mes | `STRIPE_PRICE_SOI_PLUS_MONTHLY` |
| SOI+ Anual | $29.99 USD/año (50% dto.) | `STRIPE_PRICE_SOI_PLUS_YEARLY` |

**Flujo Stripe:** `/planes` → `/api/stripe/checkout` → Checkout → `/checkout/success` → webhook `checkout.session.completed` → `plan='soi_plus'`. `customer.subscription.deleted` → `plan='free'`. Portal: `/api/stripe/portal`.

---

## 🔐 Autenticación (Google)

- `/login`: **Continuar con Google** (`signInWithOAuth`) + enlace mágico.
- `/auth/callback`: intercambia el código; sin onboarding → `/onboarding`, si no → `next` o `/chat`.
- `/auth/signout` (POST).
- `src/lib/supabase/middleware.ts` protege `PROTECTED_PREFIXES` y redirige a `/login?next=`.
- El trigger `handle_new_user` toma `full_name`/`name` y `avatar_url` de Google.

---

## 🤖 Agentes y "repos filtrados" de instrucciones

`src/lib/ai/prompts/`:
- `template.ts` — **plantilla base** (de `SOI.txt`): identidad del agente, principios (escucha activa, validación, sin promesas, sin sustituir terapia, crisis → recursos), conocimiento especializado, estilo (cálido, conciso, preguntas reflexivas).
- `agent-specs.ts` — **ficha por agente**: `knowledge` (única base permitida), `techniques`, `outOfScope` (temas que se derivan a otro agente), `extra`.
- `index.ts` — `buildSystemPrompt(agentId, ctx)` ensambla plantilla + **filtro de alcance** + perfil sanitizado + memoria RAG + herramientas según plan.

Para agregar un agente: entrada en `AGENTS` + ficha en `AGENT_SPECS` + enum del router. **Sin migración.**

**Router** (`router.ts`): crisis por regex primero; luego Gemini clasifica agente + eslabón. El agente elegido en el sidebar se respeta salvo crisis.

**Fallback** (`fallback.ts`): health check de 1 token con caché de 5 min (reemplazar por Upstash/KV en producción); cada mensaje guarda `provider`. `objectWithFallback` para salidas estructuradas.

---

## 🔧 Herramientas de la IA (`src/lib/ai/tools.ts`)
1. `youtubeSearch` — bloqueada en Free (devuelve `locked`).
2. `saveEvidence` — bloqueada en Free.
3. `updateProfile` — metas, bloqueos, emoción, arquetipo, eslabón.
4. `scheduleReminder` — `agent_knowledge` categoría `accion`, tag `recordatorio`.
5. `webSearch` — Tavily.

---

## ⏰ Rutinas y Ritual Diario

- `src/config/routines.ts` (5 rutinas con autor, fuente y eslabón). `routineForMinutes()` para el onboarding.
- `RitualTimer`: círculo SVG, paso grande, cita del autor en itálicas, pausa/saltar/salir, TTS, ánimo antes/después, celebración, CTA al Muro, candado en Free.
- **Ritual diario** (`/ritual`, `src/lib/ritual.ts`): 4 partes (afirmación → visualización → acción → señal), generado por fase.
- **Racha sin castigo** (`register_ritual_day`): 1 día sin practicar no rompe; 2 días consumen un escudo; hitos 7/21/40/90 regalan un escudo; la fase avanza con la racha (chispa → vacío → alineación → manifestación). Mensaje: "Ayer no te vimos, pero aquí seguimos. ¿Retomamos?"
- **Cron:** `/api/cron/daily-ritual` (`0 6 * * *`, solo SOI+, push) y `/api/cron/expire-trials`.

---

## 🎨 UI/UX
- Guía visual y de movimiento: **DESIGN.md** (obligatoria).
- Desktop ≥1024: sidebar 280px · Tablet 768-1023: sidebar de 72px con iconos · Mobile <768: drawer + header con logo.
- Sidebar: Nueva conversación · PRÁCTICAS (7 agentes) · MI ESPACIO (Ritual, Evidencias, Comunidad, Perfil) · Recientes · Racha + escudos · Ajustes · Avatar · "Pasar a SOI+" si no es SOI+.
- **Onboarding:** 8 espejos emocionales → minutos disponibles → validación, reformulación SOI, micro-acción de 24 h y rutina sugerida.

---

## 🔥 Crisis
`src/lib/ai/crisis.ts` + `src/config/crisis-resources.ts`. Se evalúa **antes** del paywall, nunca descuenta consultas, se registra en `crisis_log` y usa el país del perfil para mostrar las líneas de ayuda. En la comunidad, un post con señales de crisis se bloquea y se redirige al chat.

## 📔 Evidencias · 👥 Comunidad
- Evidencias: línea de tiempo, filtro por eslabón, hitos 10/50/100 con celebración, PDF (`/api/evidence/pdf`).
- Comunidad: feed paginado, 4 reacciones atómicas (`toggle_reaction`), anonimato, moderación (regex dura para links/ventas/crisis + Gemini). **Regla dura:** nada de ventas, links ni consejos médicos.
- **Seed demo:** 8 usuarios `*.demo@soi.app` (SOI+, `is_demo=true`) y 20 posts realistas en español.

---

## ✅ Checklist de Implementación (estado v0.2)

### Fase 1 — MVP
- [x] Next.js 15 + React 19 + Tailwind + componentes UI
- [x] Migraciones + RLS
- [x] Auth email + **Google OAuth**
- [x] Layout con sidebar SOI responsive
- [x] Onboarding 8 tarjetas
- [x] Router con eslabón SOI
- [x] Fallback triple
- [x] System prompts por plantilla filtrada (9 agentes + crisis)
- [x] Chat con streaming
- [x] Persistencia de conversaciones y mensajes
- [x] Trial 7 días + cron
- [ ] Deploy a Vercel (manual: conectar repo + variables)

### Fase 2 — Rutinas y Paywall
- [x] Embeddings + RAG
- [x] Perfil psicológico con weakest_link
- [x] 5 rutinas + RitualTimer + TTS
- [x] /rutinas y /rutinas/[id]
- [x] daily_routines
- [x] Racha sin castigo + Escudo
- [x] canAccess con feature flags
- [x] Paywall UI
- [x] Stripe Checkout + Portal + Webhook
- [x] YouTube tool (bloqueada en Free)
- [x] Muro de Evidencias
- [x] Detección de crisis siempre activa

### Fase 3 — Comunidad y Crecimiento
- [x] Feed + reacciones + moderación
- [x] **Usuarios demo sembrados**
- [x] PDF
- [x] Push (PWA) + manifest + SW
- [x] PostHog + Vercel Analytics
- [x] SEO + OG dinámica + sitemap/robots
- [x] Landing pública

### Fase 4 — Pulido
- [x] Tests unitarios (Vitest) y E2E + axe (Playwright)
- [ ] Lighthouse ≥95 (medir tras el deploy)
- [ ] A/B testing del onboarding (PostHog feature flags)
- [ ] Anti-sycophant refinado con evaluaciones
- [ ] Voz premium ElevenLabs
- [ ] Rate limiting (Upstash) en `/api/chat` y `/api/community`
- [ ] Envío real de `scheduleReminder` (cron que lea `metadata.remind_at`)

---

## 📚 Referencias
- **Brian Tracy:** *Goals!*, *Eat That Frog!*, *The Psychology of Achievement*
- **Hal Elrod:** *The Miracle Morning*
- **Robin Sharma:** *The 5AM Club*
- **Neville Goddard:** *Feeling is the Secret*, *The Power of Awareness*, *Out of This World*
- **Joe Dispenza:** *Breaking the Habit of Being Yourself*, *Becoming Supernatural*
- **Napoleon Hill:** *Think and Grow Rich* (1937), *The Law of Success*

---

## 🎯 Objetivo Final
SOI interviene en el eslabón roto: **Pensamientos → Emociones → Acciones → Resultados.**
El éxito se mide en rutinas completadas, evidencias registradas y usuarios que pasan de Free a SOI+ porque sienten que la app les cambió la vida. Construye con eso en mente.

---

## 🖌️ Diseño UI

**Antes de escribir cualquier componente visual, lee [`DESIGN.md`](./DESIGN.md)** (guía de UI e interacción estilo Emil Kowalski). Gobierna cómo se ve y se siente la UI; si algo choca con este documento, gana `CLAUDE.md`.

Resumen operativo:
- Tokens en `src/app/globals.css`: `--ease-out-strong`, `--ease-in-out-strong`, `--ease-drawer`, `--dur-press…--dur-slow`, colores `soi-ink / soi-muted / soi-accent / soi-accent-soft / soi-tray / soi-sidebar / soi-gold`, sombras `shadow-ring / shadow-soft / shadow-raised`.
- Utilidades: `press` (scale 0.97), `press-deep` (0.9), `tap-target` (44 px), `nums` (tabular), `skeleton`, `popover-motion`.
- `hover:` ya está limitado a `(hover: hover) and (pointer: fine)`.
- Solo `transform` y `opacity`; nada de `transition: all`, `ease`, `ease-in` ni `scale(0)`.
- Expresividad solo en el halo de respiración del `RitualTimer` y la celebración final.
- Toasts con `sonner`, drawers con `vaul`, diálogos con `components/ui/dialog.tsx`.
- Revisiones de UI en formato **Antes / Después / Por qué** (`UI-REVIEW.md`).

