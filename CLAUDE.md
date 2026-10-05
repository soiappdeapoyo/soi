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
| LLM | Gemini `gemini-3.8-flash` → Groq `openai/gpt-oss-120b` → DeepSeek `deepseek-v4-flash` (opcional). IDs por env en `src/lib/ai/models.ts` (`AI_MODEL_*`); solo entran a la cascada los proveedores con clave |
| Orquestación | Vercel AI SDK **v7** (`ai@7`, `@ai-sdk/react@4`): `UIMessage.parts`, `DefaultChatTransport`, `instructions`, `isStepCount`, `Output.object`. Guías en `node_modules/ai/docs/08-migration-guides` |
| Voz | **Voz guía neuronal: Gemini TTS** (`gemini-3.8-flash-tts`, env `AI_MODEL_TTS`) vía `/api/tts` → MP3 (`@breezystack/lamejs`) en caché (`voice-cache`, por texto + voz + estilo; lo generado sirve a todas las personas). Estilos (`src/config/voices.ts`): guide, calm, breath, energy, chat. Voces: Sulafat (cálida, por defecto), Vindemiatrix, Achernar, Enceladus, Algieba, Achird. Tope: 20 min de audio nuevo por persona y día (`tts_usage`). Respaldo: `speechSynthesis`. Solo trial/SOI+ (`tts`) |
| Video | YouTube Data API v3 |
| Embeddings | Google `gemini-embedding-2` truncado a 768 (`outputDimensionality`) |
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
| `0006_atomic_free_queries.sql` | `consume_chat_query` (comprueba y descuenta atómicamente), `refund_chat_query` (si fallan todos los proveedores), `purge_crisis_logs` (retención 90 días) |
| `0008_momentum_signals.sql` | Amplía `momentum_events.kind` con `video_watched` y `checkin` |
| `0016_day_plan.sql` | `day_plans` ("Mi día": items `{id, ref: m:<uuid>|s:<slug>, time?}` en orden, máx. 20; RLS propia) |
| `0015_voice_guide.sql` | Bucket privado `voice-cache` (MP3 de la voz guía) y `tts_usage` + `add_tts_seconds` (tope diario de audio generado) |
| `0014_moment_documents.sql` | `moment-assets` admite PDF (documentos de Moments: subidos por el creador o copiados al publicar desde su biblioteca privada) |
| `0013_covers_library.sql` | Portadas de Moments (`soi_blueprints.cover_path`: ruta de la app o de `moment-assets`, CHECK de forma, lectura por columna, escritura solo vía `/api/moments-flow/[id]/cover` tras moderar; trigger `moment_inherit_cover`: una versión guardada hereda la portada). Biblioteca: `library_items` (libro / pdf / ejercicio, RLS propia), `content_cache` (resúmenes y traducciones compartidos, solo servidor), bucket privado `library` (PDF ≤30 MB) |
| `0012_profile_bio_links.sql` | Perfil estilo Substack / Instagram: `user_profiles.bio` (≤200), `creator_profiles.links` (hasta 5 enlaces, solo creadores), `get_profile_card` (datos públicos + seguidores, siguiendo, publicaciones y Moments). Se escriben solo vía `/api/profile/public` (validación de URL, bio sin enlaces ni ventas, foto moderada) |
| `0011_direct_messages_post_edits.sql` | Mensajes directos 1 a 1: `dm_threads`, `dm_messages` (Realtime), `dm_reads`, `user_blocks`, `dm_reports`; `can_message` (consentimiento: la otra persona te sigue o ya te respondió; sin bloqueos), `mark_dm_read`, `dm_unread_threads`, `toggle_block`, `report_dm`, `delete_dm`. Edición de publicaciones: `soi_posts.edited_at` + `post_revisions` |
| `0010_social_feed_challenges_media.sql` | Impulso estilo Substack: `soi_posts` (texto, ≤4 imágenes, Moment adjunto, citas, restacks, comentarios en hilo), `post_likes`, `post_saves`, `post_reports` (3 ocultan), `follows`, `notifications`; publicaciones solo vía service role tras moderación; RPC `toggle_post_like/save`, `toggle_follow`, `report_post`, `feed_for_you` (interés con decaimiento), `feed_following`, `get_public_profiles`, `official_moment_stats`. Storage: `post-media` y `moment-assets` (públicos), `run-media` (privado), cada quien en su carpeta. Retos: `challenge_enrollments`, `moment_runs.challenge_day`. Moments compartidos en una publicación (`is_shared_moment`) se pueden ver y guardar como versión |
| `0009_executable_moments.sql` | Moments ejecutables sobre `soi_blueprints` (`kind`, `blocks`, `premium_blocks` sin lectura, `parent_id`/`parent_slug`, `version`, `executions_count`, `forks_count`, estado `private`), trigger `moment_normalize` (vista previa premium, `steps` y minutos derivados, no publicar forks de premium), `moment_runs`, `moment_versions`, RPC `get_moment_blocks`, `fork_moment`, `complete_moment_run` (cuenta 1 vez/persona/día, solo gratis o comprado), `save_moment_version`; `trending_blueprints` y `creator_stats` cuentan ejecuciones y versiones |
| `0007_moments_blueprints_momentum.sql` | `creator_profiles`, `soi_moments`, `soi_blueprints`, `blueprint_implementations`, `blueprint_purchases`, `moment_interactions`, `momentum_events`; RPC `toggle_moment_interaction`, `implement_blueprint`, `toggle_implementation_step`, `set_implementation_result`, `trending_blueprints`, `creator_stats`. Contadores y compras **solo vía RPC/webhook** (permisos por columna) |

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

**Implementación:** `src/lib/billing/access-rules.ts` (`evaluateAccess`, puro y testeado) + `check-access.ts` (`canAccess`, `getAccessMap`, `consumeChatQuery`, `refundChatQuery`). Un trial vencido se trata como Free aunque el cron no haya corrido.

**UX:** sin banners de plan en el chat (el estado del plan vive en el sidebar). Al agotar las 20 consultas aparece el banner "Alcanzaste el límite del plan Free. Pasa a SOI+ para seguir." y el botón Enviar se desactiva — **excepto si el texto es una crisis**. Las secciones bloqueadas usan `<LockedFeature>`.

| Modalidad | Precio | Variable |
|---|---|---|
| SOI+ Mensual | $4.99 USD/mes | `STRIPE_PRICE_SOI_PLUS_MONTHLY` |
| SOI+ Anual | $29.99 USD/año (50% dto.) | `STRIPE_PRICE_SOI_PLUS_YEARLY` |

**Flujo Stripe:** `/planes` → `/api/stripe/checkout` → Checkout → `/checkout/success` → webhook `checkout.session.completed` → `plan='soi_plus'`. `customer.subscription.deleted` → `plan='free'`. Portal: `/api/stripe/portal`.

---

## 🔐 Autenticación (Google)

- `/login`: **Continuar con Google** (`signInWithOAuth`) + enlace mágico.
- `/auth/callback`: intercambia el código → `next` o `/chat`. **Sin onboarding obligatorio**: el agente descubre el perfil conversando (bloque DESCUBRIMIENTO del prompt) y marca `onboarding_completed` con `updateProfile`. `/onboarding` (8 espejos) queda como opcional.
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

**Router** (`router.ts`): crisis por regex primero; luego clasifica agente + eslabón con `objectWithFallback` (cascada de proveedores). El agente elegido en el sidebar se respeta salvo crisis.

**Fallback** (`fallback.ts`): health check con caché de 5 min (reemplazar por Upstash/KV en producción); antes de responder lee la primera parte del stream y, si es un error, pasa al siguiente proveedor (tests con `MockLanguageModelV4` en `tests/unit/fallback.test.ts`). Log `[ai] proveedor X falló: …`; si no hay claves, el chat responde un 503 con un mensaje claro. Cada mensaje guarda `provider`. `objectWithFallback` usa `generateText` + `Output.object`. Cualquier fallo de un proveedor pasa al siguiente (nunca corta la cascada) y el proveedor sano va primero sin descartar a los demás. **Groq valida en su servidor:** se usa `strictJsonSchema: false` (en modo estricto exige que todo campo sea obligatorio) y las herramientas se envían sin mínimos ni máximos (`relaxTools`, `src/lib/ai/relax-schema.ts`), validando con el zod estricto en nuestro servidor; si el modelo se sale de rango recibe el error y corrige, en vez de cortar la respuesta. Llamadas con tiempo límite (router 12 s, health check 10 s) van sin reintentos para no terminar en "Delay was aborted". **Si el chat responde "No pudimos responder ahora", abrir `/api/ai/diagnostico` con sesión iniciada:** prueba cada proveedor y muestra el error exacto (sin claves) con una pista (clave inválida, cuota, límite por minuto, modelo retirado). También: logs `[ai]` y la tabla de deprecaciones del proveedor.

**Chat agéntico y sin fricción:** `/chat` no muestra bloques: SOI abre con un saludo determinista e instantáneo (`src/lib/opener.ts` + `src/lib/opener-context.ts`) **breve (saludo + 2–3 frases) y humano, sin cifras ni puntajes**: (1) un gesto de reconocimiento (`pickCelebration`, `src/lib/rewards.ts`: "Esta semana vas con todo", "Se nota que tus Moments te están haciendo bien"; o "Ayer no te vimos, pero aquí seguimos. ¿Retomamos?"), (2) lo que intuye de cómo llega (`anticipate`: check-in de hoy > ánimo con el que llega a sus Moments > emoción dominante y hora), (3) una invitación concreta con tarjeta y botón (reto con el día de hoy pendiente > el que más le ha ayudado, "La última vez te hizo bien" > recomendado por estado). Los números solo se ven en Mi Vida; la IA tampoco los menciona (Momentum Director). Debajo, respuestas rápidas (empezar, otros estados, proponme otra cosa, seguir la última conversación). El saludo se guarda como primer mensaje y llega al modelo como contexto del system prompt (el historial siempre empieza por el usuario).

---

## 🔧 Herramientas de la IA (`src/lib/ai/tools.ts`)
1. `youtubeSearch` — bloqueada en Free (devuelve `locked`).
2. `saveEvidence` — bloqueada en Free.
3. `updateProfile` — metas, bloqueos, emoción, arquetipo, eslabón.
4. `scheduleReminder` — `agent_knowledge` categoría `accion`, tag `recordatorio`.
5. `webSearch` — Tavily.
6. `suggestPractice` — botón dentro del mensaje para empezar una rutina, el ritual o registrar una evidencia (`PracticeCard`; candado en Free).
7. `createMoment` — **la IA diseña SOI Moments, no tareas sueltas**: 2 a 8 bloques del catálogo, validados con `parseBlocks` (lo inválido se descarta; con menos de 2 válidos devuelve errores para que la IA corrija). Se guarda privado y en el chat aparece "Preparé un Moment de N minutos" + Comenzar (`MomentProposal`).
8. `captureIdea` — guarda una Idea privada (`soi_moments`) + el insight en la memoria transversal (`pensamiento`, tag `insight`, `metadata.moment_id`).

Las Action Cards ya no se crean desde el chat: existen como bloque `next_step` de un Moment (al completar se vuelven acción pendiente en Hoy) y para el historial anterior.

---

## ⏰ Rutinas y Ritual Diario

- `src/config/routines.ts` (5 rutinas con autor, fuente y eslabón) sigue siendo la fuente de verdad del contenido; `src/config/official-moments.ts` las convierte en **Moments oficiales** (slug = id de la rutina). `routineForMinutes()` para el onboarding.
- El antiguo `RitualTimer` se generalizó en el reproductor de Moments (`src/components/moments/moment-player.tsx`); `/rutinas` redirige a Impulso (Diarios) y `/rutinas/[id]` a `/m/[id]/play`.
- **Ritual diario** (`/ritual`, `src/lib/ritual.ts`): 4 partes (afirmación → visualización → acción → señal), generado por fase.
- **Racha sin castigo** (`register_ritual_day`): 1 día sin practicar no rompe; 2 días consumen un escudo; hitos 7/21/40/90 regalan un escudo; la fase avanza con la racha (chispa → vacío → alineación → manifestación). Mensaje: "Ayer no te vimos, pero aquí seguimos. ¿Retomamos?"
- **Cron:** `/api/cron/daily-ritual` (`0 6 * * *`, solo SOI+, push) y `/api/cron/expire-trials`.

---

## 🎨 UI/UX
- Guía visual y de movimiento: **DESIGN.md** (obligatoria).
- Desktop ≥1024: sidebar 280px · Tablet 768-1023: sidebar de 72px con iconos · Mobile <768: barra inferior de 5 pestañas + header con logo y menú (drawer a la derecha).
- Sidebar: Nueva conversación · PRÁCTICAS (7 agentes) · MI ESPACIO (Momentos, Ritual, Evidencias, Comunidad, Estudio de creador, Perfil) · Recientes · Racha + escudos · Ajustes · Avatar · "Pasar a SOI+" si no es SOI+.
- **Onboarding:** conversacional dentro del chat. Opcional: `/onboarding` con 8 espejos emocionales → minutos disponibles → validación, reformulación SOI, micro-acción de 24 h y rutina sugerida.

---

## ✨ SOI Moments (la unidad central)
> Un SOI Moment es un flujo inteligente, editable y reutilizable de acciones que busca producir un cambio específico en el estado emocional, mental o conductual. Tiene intención, inicio, final, objetivo y resultado esperado. Chat → Moment → ejecución → resultados → aprendizaje → mejor versión.

- **Mapeo de tablas (no se renombran, Regla #7):** `soi_blueprints` = Moments ejecutables · `soi_moments` = Ideas. En TS: `MomentFlow` (`src/lib/moments/types.ts`) e `Idea`.
- **Biblioteca de acciones** (`src/config/actions.ts`): 31 acciones. **Biblioteca como acciones:** `book` (empieza vacío con el buscador de Open Library; en el constructor se puede generar el resumen; modo ideas clave con resumen cacheado o leer N páginas), `document` (PDF: `itemId` de la biblioteca privada — solo su dueño lo abre — o `assetPath` en moment-assets; al publicar, `publishDocuments` copia los de la biblioteca), `exercise` (free-exercise-db: animación, series, repeticiones o segundos, descanso; `exerciseSeconds`). La IA los pide por nombre (`query` en inglés para ejercicios, título para libros) y `resolveLibraryBlocks` (`src/lib/moments/library-blocks.ts`) los resuelve; solo puede usar PDFs de la biblioteca de la persona (`ownsDocuments`), que recibe en el prompt (`PromptContext.library`). Las 28 anteriores: — núcleo (`breathing`, `meditation`, `timer`, `writing`, `visualization`, `checklist`, `video`, `walk`, `gratitude`, `reading`, `reflection`, `affirmation`, `goal`, `emotion_log`, `rest`, `celebration`) y v2 (`canvas`, `mind_map`, `quiz`, `music`, `audio` grabado o cargado, `photo`, `agenda` con .ics, `pomodoro`, `contract`, `weekly_review`, `tracking`, `stretching`) — + estructurales `next_step` y `moment` (composición). Runners en `block-runners.tsx` y `block-runners-v2.tsx`; los medios del usuario van a `run-media` (privado, URL firmada). Al completar: agenda → recordatorio, contrato y revisión semanal → memoria (prioridades → acciones pendientes), seguimiento → métrica, mapa mental → idea. Cada una con esquema zod de `config`; `parseBlocks()` valida todo bloque (constructor, chat y mejoras). Un bloque cita su `source` cuando usa la técnica de un autor.
- **Tipos:** `daily`, `recovery`, `growth`, `learning`, `challenge`, `community` (`MOMENT_KINDS`).
- **Retos** (`kind = challenge`, `src/lib/moments/challenge.ts`): bloques con `day` (o sin día = cada día), `duration_days`; entrar al reproductor inscribe; se juega solo el día que toca y avanza un día por día de calendario, sin castigo si faltas.
- **Oficiales:** las 5 rutinas como Moments (`/m/<slug>`), en código, nunca en la tabla. Para modificarlos se guarda una copia (`parent_slug`). Sus ejecuciones se muestran con `official_moment_stats` (solo totales).
- **Composición:** un bloque `moment` reutiliza otro Moment; `flattenBlocks()` lo expande (profundidad 2, sin ciclos).
- **Rutas:** `/m/[id]` (detalle; uuid o slug) · `/m/[id]/play` (reproductor, oculta la barra inferior) · `/m/nuevo` (constructor; `?editar=`, `?idea=`). Redirecciones desde `/blueprints/*`, `/rutinas/*`, `/momentos/*`, `/creadores/blueprint`.
- **Ejecución** (`moment-player.tsx` + `block-runners.tsx`): ánimo antes → una acción a la vez (los bloques temporizados avanzan solos) → ánimo después, "¿te ayudó?" y "¿qué funcionó?" → celebración. Al completar (`/api/moment-runs/[id]/complete`): momentum `moment_completed`, racha, metas de bloques `goal` al perfil, `next_step` como acción pendiente y el aprendizaje a la memoria.
- **Mejor versión:** `/api/moments-flow/[id]/improve` propone la v2 (`proposeImprovement` con IA; respaldo `improveByRules`); la persona acepta (`/versions` → `save_moment_version`, con historial) o descarta. Si el Moment no es suyo (u oficial), se crea su copia: **el original nunca cambia**.
- **Portada:** opcional (constructor → `moment-assets`, moderada). Tarjeta `MomentFlowCard` con variantes `list` (portada arriba), `feature` (Impulso, estilo artículo de Substack: título y resumen sobre la foto) y `tile` (Mi Vida). En el detalle la portada va de fondo detrás del mismo texto. Los oficiales usan `public/moments/<slug>.webp`. Sin precio en la tarjeta: si es de pago, se avisa al tocar Comenzar o Guardar mi versión.
- **Guía visual de estiramientos:** cada paso de `stretching` se relaciona con un estiramiento de free-exercise-db por zona del cuerpo (`stretchFor`); si no hay animación, un Short de YouTube (`searchYouTube(..., { short: true })`, caché global en `content_cache`), mudo y en bucle (`GuideVideo`). Igual para un `exercise` sin animación.
- **Voz guía:** el reproductor lee el bloque completo (`blockSpeech`, `src/lib/moments/speech.ts`) con el estilo de cada acción (calm: respiración, meditación, visualización, afirmación, estiramiento; energy: ejercicio, pomodoro, caminar; guide: el resto) y **acompaña el tiempo**: "Inhala… / Exhala…" en cada fase de la respiración, recordatorio a mitad de meditaciones largas, cierre a 10 s, cada estiramiento, cambios del pomodoro y series del ejercicio. Prepara el audio del paso siguiente. `src/lib/voice/tts.ts` (fragmentos: el primero corto) + `player.ts` (un solo `<audio>`, desbloqueado con el toque en Comenzar/Escuchar por iOS).
- **Premium:** el público ve vista previa (títulos y minutos); el contenido completo solo vía `get_moment_blocks` (dueño o comprador). Un fork de premium no se puede publicar.
- **Acceso:** ejecutar requiere `routine_execution` (Free bloqueado); un premium requiere compra en cualquier plan. Navegar Impulso y crear Moments es libre; publicar exige perfil de creador.

## 🧭 Momentum Director (capa transversal de IA)
No es un agente más: es un bloque del system prompt que se suma a **cualquier** agente (nunca en crisis). `src/lib/momentum.ts` (puro, testeado) + `momentum-server.ts`.
- **Momentum Score** (0–100, 7 días): regreso diario 25 · acciones (incl. Moments completados) 20 · racha 15 · metas/evidencias 15 · reflexión 10 · Moments propios 10 · inspiración 5. Lo pendiente se nombra "por retomar" (sin castigo).
- **Estado → intervención:** `anxiety → REGULATE` (respiración → meditación → diario → aclarar) · `confusion → CLARIFY` (una prioridad, un paso) · `high_energy → EXECUTE` (Moment de crecimiento) · `low_energy → INSPIRE` (Moment con video + reflexión). En todos los casos la IA responde diseñando un Moment. La regulación tiene prioridad.
- **Eventos** (`momentum_events`): `return`, `action_completed`, `ritual_completed`, `routine_completed`, `evidence_saved`, `reflection`, `goal_set`, `blueprint_implemented`, `blueprint_step`, `blueprint_completed`.
- **Creator Intelligence** (`src/lib/ai/creator-method.ts`): si la persona vive Moments de creadores (su versión guardada o implementaciones previas), el método, principios y límites del creador entran al prompt como datos ("el método de X aplicado a mi vida").
- El Muro de Evidencias muestra evolución (Momentum + cadena ideas → acciones → sistemas → evidencias), no historial.

### Ciclo inspiración → reflexión → acción
- **Video dentro de SOI** (`components/media/soi-player.tsx`): IFrame API de YouTube (`youtube-nocookie`, `rel=0`), sin salir de la app. Al terminar (`ENDED` o "Terminé") registra `video_watched` y SOI reaparece con **una** pregunta (`REFLECTION_QUESTION`).
- La respuesta va a `/api/reflections`: Moment privado (fuente: el video) + insight en la memoria + momentum `reflection`. En el chat también se envía "Mi reflexión de «…»" y el agente la convierte en un Moment de 3 minutos.
- **Hoy** (`/hoy`, `decideToday()` en `src/lib/momentum.ts`, datos en `src/lib/today.ts`): check-in de un toque (`/api/momentum/checkin`) y una tarjeta principal. Prioridad: REGULATE > REFLECT > CLARIFY > CONTINUE/EXECUTE > INSPIRE. El check-in de hoy también guía al Director en el chat (la ansiedad que aparece en el mensaje manda).
- Video recomendado por estado (`src/lib/social/recommend-video.ts`): solo autores del marco SOI; caché `video_cache` de 7 días; bloqueado en Free.

## 🧭 Navegación: 5 pestañas
| Pestaña | Ruta | Qué ocurre |
|---|---|---|
| Hoy | `/hoy` (inicio tras el login) | La IA decide qué necesitas ahora |
| Impulso | `/impulso` | **Estilo Substack Home**: Para ti / Siguiendo, compositor (texto + ≤4 imágenes + Moment como componente), franja "Moments para ti", me gusta, comentarios en hilo (`/p/[id]`), restack y cita, guardar (`/impulso/guardados`), compartir, reportar, seguir (perfiles `/u/[id]`), actividad (`/actividad`). Descubrir Moments: `/impulso/explorar`. **Mensajes directos** (`/mensajes`, `/mensajes/[id]`, botón en perfiles): 1 a 1, en tiempo real, compartir publicaciones y Moments, borrar, reportar y bloquear; solo con consentimiento; filtros sin IA (enlaces y ventas), límite de 20 mensajes/min y 20 conversaciones nuevas/día; con señales de crisis el mensaje se entrega y quien escribe ve recursos. **Edición**: publicaciones propias editables (se vuelve a moderar, queda "· editado" y la versión anterior en `post_revisions`). "Cargar más" en lugar de scroll infinito. Leer es libre; publicar e interactuar requiere `community` |
| SOI | `/chat` | Conversación agéntica |
| Mi Vida | `/mi-vida` | Todo lo guardado, para volver fácil. Pestañas `?tab=`: **Mi día** (por defecto: `src/lib/day-plan.ts` + `day-planner.tsx`; los Moments que quieres vivir hoy en orden, arrastrables, con hora opcional; ✓ lo hecho hoy según la medianoche local; "Ahora" = `nextPending`; sugerencias por parte del día con `PART_SUGGEST`: mañana Tracy/Elrod/Sharma/Dispenza, tarde crecer o reconectar, noche SATS y recuperación; el saludo del chat propone primero lo siguiente de Mi día) · **Moments** ("Continúa donde quedaste" con últimos ejecutados y retos activos; filtros Todos/Míos/Guardados/Comprados/Retos; mosaico portada + título — `src/lib/moments/mine.ts`) · **Biblioteca** (Libros con portadas de Open Library, estado de lectura y resumen IA cacheado — `/mi-vida/libros/[id]`; PDFs propios — `/mi-vida/documentos/[id]`; Ejercicio: calistenia, gimnasio y estiramiento de free-exercise-db con animación de 2 fotos e instrucciones traducidas — `/mi-vida/ejercicios`) · **Ideas** · **Mi sistema**. En Moments: tarjeta **Tu semana** (días con Moment, racha, alza de ánimo, días al próximo hito; sin castigo), **alerta** si hay muchos Moments sin vivir (≥ 6 propios y ≥ 4 sin ejecutar en 3 semanas, o ≥ 8): "Elige uno por mí" (el más corto) u "Ordenar mi colección" (`?ordenar=1` preselecciona los que no usas), y **eliminar** uno o varios (`/api/moments-flow/bulk`: se archivan, el historial se conserva, con Deshacer) (metas, hábitos = Moments 3+/mes, creencias, progreso; `src/lib/life-graph.ts`) |
| Yo | `/yo` | Perfil estilo Substack: la vista principal es tu perfil público (foto, nombre, @usuario, bio, enlaces, seguidores, "Editar perfil", "Ver como los demás"). Pestañas `?tab=`: Publicaciones y Moments (públicas); Evolución, Logros (`src/lib/achievements.ts`), Identidad, Guardados y Cuenta (privadas, con candado). `/u/[id]` usa la misma cabecera con las pestañas públicas; tu propio `/u/[id]` redirige a `/yo` |

`PRIMARY_TABS` en `src/config/navigation.ts` (con prefijos `match`). Móvil: `BottomNav` + header con menú para lo secundario. Escritorio y tablet: las mismas 5 al inicio del sidebar. `/momentos` redirige a `/impulso` (la biblioteca va a `/mi-vida#biblioteca`).

## 🌱 SOI Moments, Evolution Feed y Creator Economy
- **Idea** (tabla `soi_moments`, rutas `/ideas`) = insight guardado (inspiración → reflexión). Privada por defecto; compartir requiere `community`. Una Idea se convierte en Moment desde `/m/nuevo?idea=`.
- **Moment** (tabla `soi_blueprints`, ver sección siguiente) = flujo ejecutable. `free` o `premium` (pago único, `CREATOR_REVENUE_SHARE` = 80% en `src/config/creators.ts`).
- **Guardar mi versión** (fork) es la forma de adoptar un Moment: copia privada editable; premium requiere compra.
- **Feed** `/momentos`: Para ti (prioriza el eslabón débil) · Tendencias (implementaciones de 7 días, no vistas) · Biblioteca (en práctica, mis momentos, guardados). Paginado con "Ver más", sin feed infinito. Interacciones: Resonancia, Guardar, Implementar.
- **Creadores** `/creadores`: perfil con método, Transformation Score (alcance + completitud + retención + resultados; no seguidores), ganancias (ledger `blueprint_purchases`, `payout_status`). Públicas: `/c/[handle]` y `/b/[id]` (embudo desde redes).
- **Ventas:** solo a través del precio del Moment dentro de SOI. Los textos siguen sin links ni autopromoción.
- **Stripe:** `/api/blueprints/[id]/checkout` (mode `payment`, `metadata.kind = 'blueprint'`). El webhook separa compras de Moments de suscripciones.
- **Pendiente:** pagos a creadores (Stripe Connect), programas con sesiones grupales, office hours y mentoría 1:1, verificación de creadores (`is_verified` solo con service role).

## 🕰️ Fechas
Los días se cuentan en la zona horaria del perfil (`profile.timezone`), nunca en UTC: `todayISO`, `dateInTz`, `startOfTodayISO`, `hourInTz` (`src/lib/utils.ts`). En México el domingo después de las 18:00 ya es lunes en UTC.

## 🔥 Crisis
`src/lib/ai/crisis.ts` (texto normalizado, ideación/carga percibida/autolesión/inglés, excluye coloquialismos; `detectDistress` para señales suaves que se confirman con el clasificador antes del paywall; si el clasificador falla se asume crisis) + `src/config/crisis-resources.ts`. Se evalúa **antes** del paywall, nunca descuenta consultas, se registra en `crisis_log` y usa el país del perfil para mostrar las líneas de ayuda. En la comunidad, un post con señales de crisis se bloquea y se redirige al chat.

## 📔 Evidencias · 👥 Comunidad
- Evidencias: línea de tiempo, filtro por eslabón, hitos 10/50/100 con celebración, PDF (`/api/evidence/pdf`).
- Comunidad: feed paginado, 4 reacciones atómicas (`toggle_reaction`), anonimato, moderación (regex dura para links/ventas/crisis + Gemini). **Regla dura:** nada de ventas, links ni consejos médicos.
- **Seed demo:** 8 usuarios `*.demo@soi.app` (SOI+, `is_demo=true`) y 20 posts realistas en español. Fotos de perfil reales, biografías, enlaces de creador y publicaciones de Impulso con fotos (`supabase/demo/profiles_v2.sql`; imágenes en `public/demo/`, licencia Unsplash, créditos en `public/demo/CREDITS.md`). Las rutas de imagen que empiezan con `/` se sirven desde la app; el resto, desde Storage.
- **Demo en producción:** `supabase/demo/seed_production.sql` (contraseñas aleatorias, sin Moments premium, no se puede cargar dos veces). Se elimina con `supabase/demo/cleanup_demo.sql`, que se detiene si hay compras de Moments demo. `supabase/demo/moments_v2.sql` da bloques ejecutables a los Moments demo. `supabase/seed.sql` (contraseña `SoiDemo2026!`) es **solo para desarrollo local**.

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
- [x] 5 rutinas → Moments oficiales + reproductor de Moments + TTS
- [x] /m/[id], /m/[id]/play y /m/nuevo (las rutas /rutinas redirigen)
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
- Expresividad solo en el halo de respiración (respiración/meditación en el reproductor de Moments y en Hoy) y la celebración final.
- Toasts con `sonner`, drawers con `vaul`, diálogos con `components/ui/dialog.tsx`.
- Revisiones de UI en formato **Antes / Después / Por qué** (`UI-REVIEW.md`).

