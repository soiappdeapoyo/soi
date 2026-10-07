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
| LLM | **Chat:** DeepSeek `deepseek-flash` → Gemini `gemini-3.8-flash` → Groq `openai/gpt-oss-120b` (`AI_CHAT_ORDER`). **Tareas estructuradas** (router, contenido de agentes, clasificación, moderación de texto): Gemini → Groq → DeepSeek (`AI_TASK_ORDER`). IDs por env en `src/lib/ai/models.ts` (`AI_MODEL_*`); solo entran a la cascada los proveedores con clave. Embeddings y moderación de imágenes: Gemini |
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
| `0025_legal_documents.sql` | `legal_documents`: términos y aviso de privacidad publicados desde `/panel` → Términos (Markdown; cada publicación es una versión nueva; sin acceso para clientes) |
| `0024_admin_panel.sql` | `app_settings` (tarifas, días de prueba, consultas gratis, minutos de voz, tokens por respuesta y por día; sin acceso para clientes) y `admin_audit`; `setting_int`; `trial_ends_at` por defecto y `consume_chat_query`/`refund_chat_query`/`expire_trials`/`start_free_plan_if_trial_expired` leen la configuración |
| `0023_soi_openers.sql` | `soi_openers`: el próximo saludo del chat preparado de antemano (texto, respuestas, gancho, parte del día, fecha, `source_at`) y los últimos ganchos/textos usados; solo lectura propia, escribe el servidor |
| `0022_creator_profile_v2.sql` | `creator_profiles.category` (≤40) y `highlights` (JSONB, máx. 8 destacados `{id, title, moment_ids[]}`), escribibles por el dueño |
| `0021_auto_covers.sql` | `cover_path` admite `auto/<proveedor>-<id>.webp` (portadas automáticas compartidas en `moment-assets/auto/`, escritas solo por el servidor) |
| `0020_battles.sql` | "Batallas": `enemy_events` (apariciones de enemigos interiores; las registra el servidor; la persona puede borrarlas) |
| `0019_identity.sql` | "Mi Nuevo Yo": `identities` (propuestas por SOI, confirmadas por la persona; RLS propia), `identity_links` (Moment `m:`/`s:` o evidencia del Muro `e:` → identidades + capacidades; solo servidor; se reinician al cambiar identidades), `identity_stories` (relato semanal de la IA) |
| `0018_timezone_auto.sql` | `user_profiles.timezone_auto` (por defecto la zona del dispositivo se sincroniza al abrir la app; si la persona elige una en Ajustes, se respeta) |
| `0017_guided_content.sql` | `library_items.kind` admite `meditation`, `affirmations`, `manifestation` (contenido generado por los agentes, guardado en `metadata`) |
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

**Napoleon Hill** (`napoleon_hill`, primero en PRÁCTICAS): mentor de propósito, logro y riqueza, capa de coaching superior. El router lo elige aunque no lo nombren ("no sé qué quiero hacer con mi vida", "no tengo disciplina", "quiero hacerme rico", "ayúdame a decidir"…). Knowledge pack parafraseado y compacto (`src/lib/ai/prompts/napoleon-hill.ts`: 13 principios con esencia, preguntas y Moment; ciclo Deseo → … → Resultado; modo COACH que diagnostica el eslabón roto) que **solo viaja cuando habla Hill** (ahorro de tokens). Memoria longitudinal (`src/lib/ai/hill-memory.ts`, en `agent_knowledge` perfil_usuario + tag `hill`, herramienta `updateHillPlan`): propósito principal, meta, fecha, por qué, qué dará a cambio, plan, obstáculo, miedo, conocimiento que falta, mastermind, etapa, compromisos. Autosugestión: `createGuidedContent` kind `autosuggestion`. El propósito aparece en Mi Vida → Mi sistema.

**Agentes generadores** (`src/lib/ai/content-agents.ts`): los agentes no solo conversan, **escriben contenido** con su ficha (`AGENT_SPECS`) y el contexto real de la persona (`personalContext`: metas, deseos, bloqueos, emoción dominante, temas, arquetipo y memoria RAG): **Calma** → meditación guiada completa (~60 % del tiempo hablado), **Voz Interior** → 5–8 afirmaciones en presente, **Asunción** → manifestación (deseo, asunción en presente, escena SATS del deseo cumplido, emoción y paso de hoy). Todo se guarda como recurso de la biblioteca (`saveGuided`) y se usa como acción (`blockConfigFor`, `src/lib/guided.ts`). `enrichGuidedBlocks` (`src/lib/moments/enrich.ts`) completa al crear un Moment desde el chat y la primera vez que se reproduce un Moment propio cualquier bloque que promete contenido y no lo tiene ("Medita", "Manifiesta" como temporizador vacío, meditación con guion corto, una sola afirmación, visualización sin escena). Rutas: `/api/guided`, `/mi-vida/recursos/[id]`, `/m/nuevo?recurso=`. En el chat, después de crear un Moment o contenido guiado SOI pregunta si le hace sentido (botones "Sí, me sirve" / "Hazme otro").

**Router** (`router.ts`): crisis por regex primero; luego clasifica agente + eslabón con `objectWithFallback` (cascada de proveedores). El agente elegido en el sidebar se respeta salvo crisis.

**Fallback** (`fallback.ts`): health check con caché de 5 min (reemplazar por Upstash/KV en producción); antes de responder lee la primera parte del stream y, si es un error, pasa al siguiente proveedor (tests con `MockLanguageModelV4` en `tests/unit/fallback.test.ts`). Log `[ai] proveedor X falló: …`; si no hay claves, el chat responde un 503 con un mensaje claro. Cada mensaje guarda `provider`. `objectWithFallback` usa `generateText` + `Output.object`. Cualquier fallo de un proveedor pasa al siguiente (nunca corta la cascada) y el proveedor sano va primero sin descartar a los demás. **Groq valida en su servidor:** se usa `strictJsonSchema: false` (en modo estricto exige que todo campo sea obligatorio) y las herramientas se envían sin mínimos ni máximos (`relaxTools`, `src/lib/ai/relax-schema.ts`), validando con el zod estricto en nuestro servidor; si el modelo se sale de rango recibe el error y corrige, en vez de cortar la respuesta. Llamadas con tiempo límite (router 12 s, health check 10 s) van sin reintentos para no terminar en "Delay was aborted". **Si el chat responde "No pudimos responder ahora", abrir `/api/ai/diagnostico` con sesión iniciada:** prueba cada proveedor y muestra el error exacto (sin claves) con una pista (clave inválida, cuota, límite por minuto, modelo retirado). También: logs `[ai]` y la tabla de deprecaciones del proveedor.

**Conversar o accionar:** todo saludo ofrece las dos puertas ("Proponme algo" y "Solo quiero conversar"). Modo `talk` (eligió conversar o "solo quiero desahogarme"): sin propuestas hasta que pida algo. **Temas de acción** (`isActionTopic`: quiero lograr/empezar/cambiar, me cuesta empezar, procrastino, metas, hábitos, plan…) ya entendidos: `offer` (pide permiso explícito en esa respuesta) y, desde 4 mensajes, `prepare` (prepara el Moment sin más preguntas, "si no encaja, lo ajustamos"); nunca insiste si ya propuso uno en la conversación. Más formas de aceptar ("me encantaría", "sí, por favor") y de invitar ("¿diseñamos…?", "¿armamos…?").

**Ritmo: escuchar, entender, proponer** (`src/lib/ai/proposal-gate.ts`, reglas sin tokens): `listen` (primer mensaje sin pedido: valida y pregunta), `explore` (pidió o aceptó una propuesta pero SOI aún no lo conoce lo suficiente —`understood`: ≥ 2 mensajes propios y ~25 palabras, o uno concreto si ya hablaron del tema antes; los chips no cuentan— → "Quiero que sea para ti, no algo de manual" y 1–2 preguntas: qué pasa, cómo lo siente, qué quiere sentir al terminar, cuánto tiempo tiene; con salida "si prefieres algo rápido ya, dímelo", que se respeta), `invite` (refleja lo entendido con sus palabras y pide permiso), `propose` (con permiso y entendimiento: resume "Entiendo que…" y diseña algo único; `createMoment` exige `understanding` —situación, sentir, deseo, tiempo— que se usa en título y pasos y se guarda en la memoria, tag `contexto_moment`), `soothe` (ansiedad: una oferta mínima de 1–3 min de respiración, como invitación). En `listen` e `invite` la IA no tiene herramientas de propuesta (`PROPOSAL_TOOLS`: createMoment, offerMoment, createGuidedContent, youtubeSearch, suggestPractice), lo que además ahorra tokens. Medición en PostHog: `moment_proposed` (source chat/opener), `opener_declined`, `moment_started`/`moment_completed` con `from` (chat, hoy).

**Continuidad** (`src/lib/ai/continuity.ts`): si ya hablaron de algo parecido, SOI lo relaciona ("Hace unos días me contabas…") y construye sobre eso. Une dos vías: palabras en común con lo que la persona dijo (reglas, `src/lib/ai/similarity.ts`: raíces sin acentos ni palabras vacías, siempre funciona) y significado (embeddings con umbral 0,55); una por conversación, las 2 mejores, con fecha humana, sin la conversación en curso. Las conversaciones salieron de la memoria general (llegaban sin fecha y con umbral 0,7).
**Chat agéntico y sin fricción:** `/chat` no muestra bloques. La conversación en curso se recuerda durante la sesión de la app (`sessionStorage`); al abrir la app de nuevo o con "Nueva conversación" (`/chat?nueva=1`) empieza un chat nuevo. Al enviar en el teléfono se cierra el teclado. **Mientras SOI piensa** (`Thinking` + `src/lib/thinking-phrases.ts`, sin IA): frases pequeñas en cursiva que rotan cada 3 s — primero "Leyendo lo que me contaste…", luego propias de SOI según lo que escribió (ansiedad → respiración, postergar, logro, ánimo bajo), el agente y la hora; si usa una herramienta dice qué hace ("Diseñando tu Moment…"). **Velocidad:** el router corre en paralelo y con el orden rápido (`FAST_ORDER`: Groq primero, salida corta); sin "prueba de salud" previa (el proveedor que falla pasa al final 2 min); prompt con lo fijo primero y lo variable al final (caché de prefijo); `createMoment` no espera a los agentes (el contenido guiado se escribe al abrir el Moment). SOI abre con un saludo determinista e instantáneo (`src/lib/opener.ts` + `src/lib/opener-context.ts`) con arquitectura **detectar → recordar → sugerir → acompañar**: evidencia concreta ("Ayer cerraste el día con «SATS»", "Esta semana ya practicaste 3 días"), sugerencia según la hora con su porqué y recuerdos en palabras de la persona ("El jueves lo hiciste y escribiste: «…»"), y **no supone cómo llega**: lo pregunta ("¿con energía, neutral o con algo de carga?", respuestas de un toque); "quizá" solo con evidencia de ánimo bajo. **Saludo que conoce a la persona** (`src/lib/opener-hooks.ts` + `src/lib/opener-ai.ts`): SOI elige **un gancho** —lo que sabe y vale la pena hoy— por relevancia y sin repetir los últimos 3 (tema pendiente 100 > último "ahora no" 95 > regreso tras días 90 > lo de Mi día que sigue 85 > una reflexión suya 72 > el enemigo que aparece a esta hora 66 > un insight 60 > lo que le hizo bien a esta hora 58 > su identidad 55 > su meta 50 > su constancia 45 > cómo llega), y la **IA lo escribe** (`FAST_ORDER`, 1–2 frases, una pregunta, sus palabras, sin cifras ni propuestas; validado con `validOpener`; si no, la plantilla del gancho, que también varía) con respuestas de un toque propias. Se **prepara de antemano** (`prepareOpener` en `after` al abrir el chat; `takeOpener` lo usa si es de hoy, sin usar, posterior a la última conversación y, si depende de la hora, de esta parte del día): aparece al instante y cada chat nuevo trae otro. Lo mostrado por reglas también cuenta como reciente.
**Al abrir el chat** (`buildOpener`, `src/lib/opener.ts`): una sola pregunta. Prioridad: **lo pendiente** (`src/lib/opener-thread.ts`: la conversación de los últimos 3 días con algo que la persona contó —no un chip— y que no cerró; se retoma con sus palabras, "Ayer me contaste: «…». ¿Cómo siguió?"; si tenía señales de crisis, sin citar: "hablamos de algo importante para ti") > cómo llega. **Máximo 3 chips** (pendiente: Mejor / Sigue igual / Hoy es otra cosa; si no, los tres estados) y lo secundario como **enlaces discretos** ("Proponme algo", "Mi ritual de hoy"). **Primera vez** (perfil de < 2 días, sin descubrimiento y sin conversaciones ni Moments, con consultas sin error): qué es SOI en una frase y "¿qué te trae por aquí hoy?", sin chips. Campo: "Cuéntame lo que traes…" y **dictado** (`DictationButton`: reconocimiento de voz del navegador, gratis; el audio no pasa por SOI; oculto si no hay soporte); en el teléfono no se abre el teclado solo. **Peso:** Markdown y tarjetas del chat se cargan bajo demanda (el saludo es texto simple; se precargan en ocio): 334 → 265 KB al abrir. PostHog: `chat_opened` (tipo de saludo) y `chat_first_message` (chip, enlace, escrito o dictado, y cuánto tardó).
**Escuchar primero:** el saludo solo trae tarjeta con una señal fuerte (el día de un reto pendiente o lo planeado en Mi día que toca ahora, desde 15 min antes); si no, una frase, una pregunta y el chip "Proponme algo" (el ritual diario también es un chip, no una tarjeta). **"Ahora no"** en la tarjeta de la propuesta (`/api/opener/decline`): se guarda como conocimiento (`agent_knowledge` perfil_usuario + tag `ahora_no`, con Moment, tipo y parte del día; también llega a la IA por la memoria) y el saludo ofrece salidas de un toque (algo más corto, otra cosa, solo hablar). Reglas (`src/lib/declines.ts`): ese Moment no vuelve en 3 días (un reto o lo planeado en Mi día, solo ese día); dos "ahora no" al mismo tipo en la misma parte del día (14 días) → ese tipo deja de proponerse a esa hora. El siguiente saludo lo reconoce ("Ayer preferiste dejar «X» para otro momento; lo tomé en cuenta.") y propone otra cosa, o nada si no hay alternativa. Versión anterior: (1) un gesto de reconocimiento (`pickCelebration`, `src/lib/rewards.ts`: "Esta semana vas con todo", "Se nota que tus Moments te están haciendo bien"; o "Ayer no te vimos, pero aquí seguimos. ¿Retomamos?"), (2) lo que intuye de cómo llega (`anticipate`: check-in de hoy > ánimo con el que llega a sus Moments > emoción dominante y hora), (3) una invitación concreta con tarjeta y botón (reto con el día de hoy pendiente > el que más le ha ayudado, "La última vez te hizo bien" > recomendado por estado). Los números solo se ven en Mi Vida; la IA tampoco los menciona (Momentum Director). Debajo, respuestas rápidas (empezar, otros estados, proponme otra cosa, seguir la última conversación). El saludo se guarda como primer mensaje y llega al modelo como contexto del system prompt (el historial siempre empieza por el usuario).

---

## 🔧 Herramientas de la IA (`src/lib/ai/tools.ts`)
1. `youtubeSearch` — bloqueada en Free (devuelve `locked`). **Un solo video por respuesta** (`videoPolicy`, `src/lib/momentum.ts` + `VIDEO_RULE` en el prompt, y lo hacen cumplir las herramientas): ansiedad (REGULATE), energía alta o confusión → sin video (hacer, no mirar); energía baja (INSPIRE) → **video rápido** solo, y su reflexión se vuelve después un Moment; si pide un video → rápido; si quiere aprender o aplicar algo de un video → **video dentro del Moment**. Lo que llega segundo se descarta (youtubeSearch devuelve `skipped`, createMoment quita el bloque video).
2. `saveEvidence` — bloqueada en Free.
3. `updateProfile` — metas, bloqueos, emoción, arquetipo, eslabón.
4. `scheduleReminder` — `agent_knowledge` categoría `accion`, tag `recordatorio`.
5. `webSearch` — Tavily.
6. `suggestPractice` — botón dentro del mensaje para empezar una rutina, el ritual o registrar una evidencia (`PracticeCard`; candado en Free).
7a. `createGuidedContent` — meditación, afirmaciones o manifestación escritas por su agente (ver "Agentes generadores"); se guardan en la biblioteca y la tarjeta ofrece Escuchar / Usar en un Moment / ¿Te hace sentido?
7. `createMoment` — **la IA diseña SOI Moments, no tareas sueltas**: 2 a 8 bloques del catálogo, validados con `parseBlocks` (lo inválido se descarta; con menos de 2 válidos devuelve errores para que la IA corrija). Se guarda privado y en el chat aparece "Preparé un Moment de N minutos" + Comenzar (`MomentProposal`).
7b. `offerMoment` — **reutilizar antes de crear**: ofrece tal cual un Moment que la persona ya tiene (u oficial) con solo su id. Cada mensaje trae **su biblioteca completa** (`loadLibrary` + `libraryPrompt`, `src/lib/moments/reuse.ts`: todos sus Moments y los oficiales, hasta 14, ordenados por parecido con TODA la conversación + lo que le ayudó + lo reciente; con veces vivido, si le ayudó, la última vez y lo último que escribió). `createMoment` exige `libraryCheck` (cuál ajusta o por qué ninguno encaja). Si encaja con cambios, `createMoment` con `basedOn` lo guarda como **nueva versión del mismo** (`save_moment_version`; de un oficial, su copia). Freno del servidor: un Moment casi idéntico (mismo flujo y título parecido, `isNearDuplicate`) no se duplica: se ofrece el existente. La tarjeta dice "Uno que ya tienes" / "Ajusté tu Moment".
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
- Sidebar: Nueva conversación · las 5 pestañas · MI VIDA (Mi día, Mi Nuevo Yo, Batallas, Biblioteca: `MY_LIFE`) · HABLA CON (agentes, todos al chat) · CREAR (Crear un Moment, Estudio de creador: `CREATE_LINKS`) · Recientes · Racha + escudos · Ajustes · Avatar (→ `/yo`) · "Pasar a SOI+" si no es SOI+. `/comunidad` (feed antiguo) redirige a Impulso desde `next.config.ts`; Ritual diario y Muro de Evidencias se abren desde Yo.
- **Onboarding:** conversacional dentro del chat. Opcional: `/onboarding` con 8 espejos emocionales → minutos disponibles → validación, reformulación SOI, micro-acción de 24 h y rutina sugerida.

---

## ✨ SOI Moments (la unidad central)
> Un SOI Moment es un flujo inteligente, editable y reutilizable de acciones que busca producir un cambio específico en el estado emocional, mental o conductual. Tiene intención, inicio, final, objetivo y resultado esperado. Chat → Moment → ejecución → resultados → aprendizaje → mejor versión.

- **Mapeo de tablas (no se renombran, Regla #7):** `soi_blueprints` = Moments ejecutables · `soi_moments` = Ideas. En TS: `MomentFlow` (`src/lib/moments/types.ts`) e `Idea`.
- **Biblioteca de acciones** (`src/config/actions.ts`): 31 acciones. **Biblioteca como acciones:** `book` (empieza vacío con el buscador de Open Library; en el constructor se puede generar el resumen; modo ideas clave con resumen cacheado o leer N páginas), `document` (PDF: `itemId` de la biblioteca privada — solo su dueño lo abre — o `assetPath` en moment-assets; al publicar, `publishDocuments` copia los de la biblioteca), `exercise` (free-exercise-db: animación, series, repeticiones o segundos, descanso; `exerciseSeconds`). La IA los pide por nombre (`query` en inglés para ejercicios, título para libros) y `resolveLibraryBlocks` (`src/lib/moments/library-blocks.ts`) los resuelve; solo puede usar PDFs de la biblioteca de la persona (`ownsDocuments`), que recibe en el prompt (`PromptContext.library`). Las 28 anteriores: — núcleo (`breathing`, `meditation`, `timer`, `writing`, `visualization`, `checklist`, `video`, `walk`, `gratitude`, `reading`, `reflection`, `affirmation`, `goal`, `emotion_log`, `rest`, `celebration`) y v2 (`canvas`, `mind_map`, `quiz`, `music`, `audio` grabado o cargado, `photo`, `agenda` con .ics, `pomodoro`, `contract`, `weekly_review`, `tracking`, `stretching`) — + estructurales `next_step` y `moment` (composición). Runners en `block-runners.tsx` y `block-runners-v2.tsx`; los medios del usuario van a `run-media` (privado, URL firmada). Al completar: agenda → recordatorio, contrato y revisión semanal → memoria (prioridades → acciones pendientes), seguimiento → métrica, mapa mental → idea. Cada una con esquema zod de `config`; `parseBlocks()` valida todo bloque (constructor, chat y mejoras). Un bloque cita su `source` cuando usa la técnica de un autor.
- **Acciones nuevas:** `reframe` (reencuadre de un pensamiento, Aaron Beck: pensamiento → evidencia → uno más justo; trae SU pensamiento), `body_scan` (escaneo corporal, Jon Kabat-Zinn: zona por zona con voz), `letter` (carta a su yo futuro, a alguien o para soltar). **Respiración con patrones** (`BREATH_PATTERNS`: calma 4-6, caja 4-4-4-4, 4-7-8 de Andrew Weil, coherencia 5-5) y fases Inhala · Sostén · Exhala · Pausa (`breathPhase`; el halo crece y se suelta al ritmo de cada fase).
- **Diseño de Moments por la IA:** arco Llegar (respiración con el patrón adecuado o escaneo) → Núcleo (técnica según su eslabón) → Integrar (una pregunta) → Llevarlo a la vida (próximo paso concreto o celebración), con sus palabras y su tiempo. **Pulido del servidor** (`polishMoment`, `src/lib/moments/polish.ts`): con ansiedad empieza regulando, siempre cierra, y si dijo cuánto tiempo tiene no se pasa de ~25 %. La **portada** usa la hora del chat (de noche, escenas nocturnas; de mañana, luz de inicio) y el tema de la conversación.
- **Tipos:** `daily`, `recovery`, `growth`, `learning`, `challenge`, `community` (`MOMENT_KINDS`).
- **Retos** (`kind = challenge`, `src/lib/moments/challenge.ts`): bloques con `day` (o sin día = cada día), `duration_days`; entrar al reproductor inscribe; se juega solo el día que toca y avanza un día por día de calendario, sin castigo si faltas.
- **Oficiales:** las 5 rutinas como Moments (`/m/<slug>`), en código, nunca en la tabla. Para modificarlos se guarda una copia (`parent_slug`). Sus ejecuciones se muestran con `official_moment_stats` (solo totales).
- **Composición:** un bloque `moment` reutiliza otro Moment; `flattenBlocks()` lo expande (profundidad 2, sin ciclos).
- **Rutas:** `/m/[id]` (detalle; uuid o slug) · `/m/[id]/play` (reproductor, oculta la barra inferior) · `/m/nuevo` (constructor; `?editar=`, `?idea=`). Redirecciones desde `/blueprints/*`, `/rutinas/*`, `/momentos/*`, `/creadores/blueprint`.
- **Ejecución** (`moment-player.tsx` + `block-runners.tsx`): ánimo antes → una acción a la vez (los bloques temporizados avanzan solos) → ánimo después y "Me ayudó / No del todo" → celebración. El texto es opcional: "¿Quieres hablar sobre esto?" ofrece **Escribirlo aquí** (abre el cuadro) o **Hablar con SOI** (guarda y abre `/chat?nueva=1&run=<id>`: el saludo `momentRunOpener` ya sabe qué Moment viviste y cómo te fue, con respuestas de un toque). Al completar (`/api/moment-runs/[id]/complete`): momentum `moment_completed`, racha, metas de bloques `goal` al perfil, `next_step` como acción pendiente y el aprendizaje a la memoria.
- **Mejor versión:** `/api/moments-flow/[id]/improve` propone la v2 (`proposeImprovement` con IA; respaldo `improveByRules`); la persona acepta (`/versions` → `save_moment_version`, con historial) o descarta. Si el Moment no es suyo (u oficial), se crea su copia: **el original nunca cambia**.
- **Portada:** opcional (constructor → `moment-assets`; en Safari se comprime a JPEG porque no codifica WebP). Moderación (`reviewCover`, `src/lib/moments/cover.ts`; la imagen se reduce a 768 px antes de revisarla): en un Moment **privado** la portada se guarda aunque la revisión no responda y solo se rechaza si la moderación la marca; al **publicar** o **compartir en Impulso** se revisa en estricto (sin revisión no se publica). Tarjeta `MomentFlowCard` con variantes `list` (portada arriba), `feature` (Impulso, estilo artículo de Substack: título y resumen sobre la foto) y `tile` (Mi Vida). En el detalle la portada va de fondo detrás del mismo texto. Los oficiales usan `public/moments/<slug>.webp`. Sin precio en la tarjeta: si es de pago, se avisa al tocar Comenzar o Guardar mi versión.
- **Portada automática** (`src/lib/moments/auto-cover.ts`): todo Moment nuevo (chat, constructor, Batallas) recibe una foto aesthetic relacionada, después de responder (`after`). Un agente elige la escena en inglés (2–4 palabras, sin personas ni texto; respaldo `coverQueryByRules` por título, acción dominante y tipo); busca en Pexels si hay `PEXELS_API_KEY`, si no en **Openverse sin clave, solo CC0/dominio público** (StockSnap primero). Se reduce a 640×360 WebP calidad 55 (~5–15 KB) y se guarda **una sola vez** en `moment-assets/auto/`: los Moments que usan la misma foto comparten el archivo, que nunca se borra al cambiar la portada. Solo escribe si `cover_path` sigue vacío (nunca pisa la de la persona); se cambia en el constructor. Las copias de oficiales usan la portada del oficial (archivo de la app, 0 KB).
- **Guía visual de estiramientos:** cada paso de `stretching` se relaciona con un estiramiento de free-exercise-db por zona del cuerpo (`stretchFor`); si no hay animación, un Short de YouTube (`searchYouTube(..., { short: true })`, caché global en `content_cache`), mudo y en bucle (`GuideVideo`). Igual para un `exercise` sin animación.
- **Voz guía:** el reproductor lee el bloque completo (`blockSpeech`, `src/lib/moments/speech.ts`) con el estilo de cada acción (calm: respiración, meditación, visualización, afirmación, estiramiento; energy: ejercicio, pomodoro, caminar; guide: el resto) y **acompaña el tiempo**: "Inhala… / Exhala…" en cada fase de la respiración, recordatorio a mitad de meditaciones largas, cierre a 10 s, cada estiramiento, cambios del pomodoro y series del ejercicio. Prepara el audio del paso siguiente. `src/lib/voice/tts.ts` (fragmentos: el primero corto) + `player.ts` (un solo `<audio>`, desbloqueado con el toque en Comenzar/Escuchar por iOS).
- **Lo que escribe dentro de un Moment se usa** (`src/lib/moments/outputs.ts`): al completar, reflexión, escritura, gratitud y registro de emociones pasan a la memoria con su contexto (Moment, paso, ánimo antes → después; tags `moment_output` + tipo; `metadata.said`). Lo usan el chat (memoria), el saludo (gancho `written`: "El martes, en «X», escribiste: «…». ¿Cómo te fue con eso?"), la biblioteca del chat (`bestWritten`: reflexión > escritura > emociones > gratitud) y Mi Nuevo Yo (cuenta como reflexión: evidencia doble).
- **El chat también aprende** (`src/lib/ai/understanding.ts`): cada 3 mensajes suyos, después de responder, lo que SOI entendió (situación, siente, le ayuda, no le ayuda, quiere) se guarda en `perfil_usuario` + tag `entendimiento`, reemplazando el resumen anterior de esa conversación. Nunca en crisis.
- **Portada en Hoy y en el chat:** la tarjeta "A continuación" (y "SOI te propone") de Hoy lleva la portada de fondo con degradado; la lista de Mi día, miniaturas con el estado encima. En el chat, miniatura en la tarjeta del Moment propuesto (la conversación manda) y portada 16:7 en la propuesta del saludo.
- **Portada en el reproductor:** encabezado tipo artículo en la pantalla de inicio (foto, título y objetivo sobre degradado) y fondo suave que se desvanece en la celebración; nunca durante los pasos (ahí manda la respiración o la acción).
- **Premium:** el público ve vista previa (títulos y minutos); el contenido completo solo vía `get_moment_blocks` (dueño o comprador). Un fork de premium no se puede publicar.
- **Acceso:** ejecutar requiere `routine_execution` (Free bloqueado); un premium requiere compra en cualquier plan. Navegar Impulso y crear Moments es libre; publicar exige perfil de creador.

## 🪞 Mi Nuevo Yo (identidad construida con evidencia)
No se acumulan Moments completados (eso es otro historial de actividades): se acumula **evidencia de identidad**.
Jerarquía: **Visión** (propósito de Hill + metas) → **Identidades** → **Capacidades** → **SOI Moments** → **Evidencias**.
- **Identidades** (`identities`): SOI propone 3–5 (`proposeIdentities`, `src/lib/identity/propose.ts`: metas, propósito de Hill, bloqueos, Moments vividos; respaldo por palabras de sus metas) y la persona confirma, edita o escribe la suya (máx. 7 activas).
- **Capacidades** (`src/config/capacities.ts`): Claridad, Disciplina, Constancia, Enfoque, Calma, Confianza, Liderazgo, Comunicación, Creatividad, Gratitud, Salud, Mentalidad de riqueza, Aprendizaje.
- **Vínculos** (`classifyLinks`, `src/lib/identity/classify.ts`): cada Moment o evidencia del Muro se conecta una vez con identidades y capacidades (una llamada de IA para todo lo pendiente; respaldo `capacitiesByRules` por tipo de Moment y acciones).
- **Evidencia** (`loadIdentityView`, `src/lib/identity/view.ts`; no se duplica, sale de `moment_runs` y `agent_knowledge`): Moment vivido (1), reflexión escrita (2), logro del Muro (2), regreso tras 2+ días (1). **Nivel** con barra y número de evidencias (`levelFor`: 3, 5, 7… por nivel; nunca 100 %).
- **La evidencia observada** (`observe`): últimos 30 días vs. los 30 anteriores; solo mejoras reales (terminas más, reflexionas más, practicas más días, vuelves antes).
- **Tu historia**: línea de tiempo con datos reales + relato semanal escrito por la IA (`/api/identities/story`, uno por semana, solo con los datos dados).
- **Al terminar un Moment** (`identityGains`): "Acabas de fortalecer quién eres" con las identidades (nivel, ¡subiste de nivel!) y capacidades entrenadas.
- Rutas: `/mi-vida?tab=nuevo-yo`, `/mi-vida/yo/[id]` (la historia de una identidad: lo que la construyó), `/api/identities` (+ `[id]`, `propose`, `story`).

## ⚔️ Batallas (enemigos interiores)
SOI no lucha contra la persona: lucha **junto a ella** contra sus enemigos interiores (patrones universales, no diagnósticos), integrando Hill, Tracy, Elrod, ACT, TCC, James Clear, Carol Dweck, Cal Newport, Kristin Neff y Covey bajo una misma narrativa.
- **13 enemigos** (`src/config/enemies.ts`): El Saboteador, El Crítico, La Duda, El Miedo, La Procrastinación, La Distracción, La Comparación, El Perfeccionista, La Escasez, El Conformista, El Impulsivo, La Víctima, El Autosabotaje. Cada uno: lo que susurra, cómo gana terreno, lo que lo vence (tácticas), **aliados** = Capacidades de Mi Nuevo Yo (se agregaron Coraje, Paciencia y Persistencia) y un **Moment para combatirlo** con contenido real y fuente (`/api/battles/moment` lo crea una vez: «Contra La Duda: Claridad antes de decidir»).
- **Detección** (la IA registra sola): herramienta `registerEnemy` en el chat (el prompt de todos los agentes lista los enemigos y pide nombrarlos como algo externo — "Parece que El Perfeccionista intentó tomar el control" — nunca como defecto) + respaldo sin IA por frases típicas (`detectEnemies`). Sin duplicar el mismo enemigo en 6 h. La persona puede borrar un registro o marcar "Apareció hoy".
- **Victorias** (`pairVictories`, `src/lib/battles.ts`): una aparición se vence si en los 3 días siguientes se vive un Moment que entrena a sus aliados o su Moment "Contra…". **Intensidad reciente** (sube con apariciones, baja con victorias, decae con los días: Fuerte / Presente / Débil). **Patrón** por momento del día ("Últimamente aparece por las tardes. Antes aparecía por la mañana.").
- **Vista simple** (Mi Nuevo Yo y Batallas): primero la recompensa ("Esta semana sumaste N evidencias" / "Les ganaste N veces"), luego UNA cosa con UN botón (tu identidad principal → Sumar una evidencia; el enemigo más activo → Enfrentarlo); lo detallado va en "Ver todo" (`<details>`).
- **Pestaña Batallas**: filosofía ("No eres tus pensamientos…"), "En los últimos 30 días has derrotado…" y el enemigo más frecuente, mapa de la Fortaleza Interior (aliados vs. enemigos), **jefes por meta** (enemigos que más aparecen alrededor de cada meta) y los 13 enemigos (`/mi-vida/batallas/[enemy]`: fortalezas, debilidades, "SOI recomienda", historial con sus palabras).
- Al terminar un Moment: "Le ganaste a La Duda".

## 🧭 Momentum Director (capa transversal de IA)
No es un agente más: es un bloque del system prompt que se suma a **cualquier** agente (nunca en crisis). `src/lib/momentum.ts` (puro, testeado) + `momentum-server.ts`.
- **Momentum Score** (0–100, 7 días): regreso diario 25 · acciones (incl. Moments completados) 20 · racha 15 · metas/evidencias 15 · reflexión 10 · Moments propios 10 · inspiración 5. Lo pendiente se nombra "por retomar" (sin castigo).
- **Estado → intervención:** `anxiety → REGULATE` (respiración → meditación → diario → aclarar) · `confusion → CLARIFY` (una prioridad, un paso) · `high_energy → EXECUTE` (Moment de crecimiento) · `low_energy → INSPIRE` (Moment con video + reflexión). La IA propone cuando hay permiso (ver **Ritmo**); la regulación tiene prioridad.
- **Eventos** (`momentum_events`): `return`, `action_completed`, `ritual_completed`, `routine_completed`, `evidence_saved`, `reflection`, `goal_set`, `blueprint_implemented`, `blueprint_step`, `blueprint_completed`.
- **Creator Intelligence** (`src/lib/ai/creator-method.ts`): si la persona vive Moments de creadores (su versión guardada o implementaciones previas), el método, principios y límites del creador entran al prompt como datos ("el método de X aplicado a mi vida").
- El Muro de Evidencias muestra evolución (Momentum + cadena ideas → acciones → sistemas → evidencias), no historial.

### Ciclo inspiración → reflexión → acción
- **Video dentro de SOI** (`components/media/soi-player.tsx`): IFrame API de YouTube (`youtube-nocookie`, `rel=0`), sin salir de la app. Al terminar (`ENDED` o "Terminé") registra `video_watched` y SOI reaparece con **una** pregunta (`REFLECTION_QUESTION`).
- La respuesta va a `/api/reflections`: Moment privado (fuente: el video) + insight en la memoria + momentum `reflection`. En el chat también se envía "Mi reflexión de «…»" y el agente la convierte en un Moment de 3 minutos.
- **Hoy** (`/hoy`) = **lista de reproducción** de Mi día: "Reproducir mi día" (un toque habilita la voz en iOS con `PlayLink`) abre el siguiente Moment ya en marcha (`/m/[id]/play?lista=hoy&auto=1`, `playHref`/`playQueue` en `src/lib/day-plan.ts`); al terminar, "A continuación" pasa solo al siguiente en 8 s (se puede quedar; sin cuenta regresiva con movimiento reducido) y al final "Viviste todo tu día". Sin plan: una sola propuesta según `decideToday()` (REGULATE suma un minuto de respiración) + "Arma tu día". Debajo: check-in de un toque y los pasos por retomar plegados.

## 🧭 Navegación: 5 pestañas
| Pestaña | Ruta | Qué ocurre |
|---|---|---|
| Hoy | `/hoy` (inicio tras el login) | Tu día como lista de reproducción (o lo que SOI propone ahora) |
| Impulso | `/impulso` | **Estilo Substack Home**: Para ti / Siguiendo, compositor (texto + ≤4 imágenes + Moment como componente), franja "Moments para ti", me gusta, comentarios en hilo (`/p/[id]`), restack y cita, guardar (`/impulso/guardados`), compartir, reportar, seguir (perfiles `/u/[id]`), actividad (`/actividad`). Descubrir Moments: `/impulso/explorar`. **Mensajes directos** (`/mensajes`, `/mensajes/[id]`, botón en perfiles): 1 a 1, en tiempo real, compartir publicaciones y Moments, borrar, reportar y bloquear; solo con consentimiento; filtros sin IA (enlaces y ventas), límite de 20 mensajes/min y 20 conversaciones nuevas/día; con señales de crisis el mensaje se entrega y quien escribe ve recursos. **Edición**: publicaciones propias editables (se vuelve a moderar, queda "· editado" y la versión anterior en `post_revisions`). "Cargar más" en lugar de scroll infinito. Leer es libre; publicar e interactuar requiere `community` |
| SOI | `/chat` | Conversación agéntica |
| Mi Vida | `/mi-vida` | Pestañas `?tab=`: **Mi día** (por defecto: `src/lib/day-plan.ts` + `day-planner.tsx`; los Moments que quieres vivir hoy en orden, con hora opcional; ✓ lo hecho hoy según la medianoche local; "Ahora" = `nextPending`; sugerencias por parte del día) · **Moments** ("Continúa donde quedaste", filtros, mosaico, alerta de Moments sin vivir, eliminar con Deshacer, tarjeta Tu semana) · **Mi Nuevo Yo** (ver abajo) · **Batallas** (ver abajo) · **Biblioteca** (meditaciones/afirmaciones/manifestaciones escritas por los agentes, libros con Open Library, PDFs, ejercicio). Las Ideas se siguen guardando (y SOI las usa en su memoria) pero no se muestran en Mi Vida |
| Yo | `/yo` | Perfil estilo Substack: la vista principal es tu perfil público (foto, nombre, @usuario, bio, enlaces, seguidores, "Editar perfil", "Ver como los demás"). Pestañas `?tab=`: Publicaciones y Moments (públicas); Evolución, Logros (`src/lib/achievements.ts`), Identidad, Guardados y Cuenta (privadas, con candado). `/u/[id]` usa la misma cabecera con las pestañas públicas; tu propio `/u/[id]` redirige a `/yo` |

`PRIMARY_TABS` en `src/config/navigation.ts` (con prefijos `match`). Móvil: `BottomNav` + header con menú para lo secundario. Escritorio y tablet: las mismas 5 al inicio del sidebar. `/momentos` redirige a `/impulso` (la biblioteca va a `/mi-vida#biblioteca`).

## 🌱 SOI Moments, Evolution Feed y Creator Economy
- **Idea** (tabla `soi_moments`, rutas `/ideas`) = insight guardado (inspiración → reflexión). Privada por defecto; compartir requiere `community`. Una Idea se convierte en Moment desde `/m/nuevo?idea=`.
- **Moment** (tabla `soi_blueprints`, ver sección siguiente) = flujo ejecutable. `free` o `premium` (pago único, `CREATOR_REVENUE_SHARE` = 80% en `src/config/creators.ts`).
- **Guardar mi versión** (fork) es la forma de adoptar un Moment: copia privada editable; premium requiere compra.
- **Feed** `/momentos`: Para ti (prioriza el eslabón débil) · Tendencias (implementaciones de 7 días, no vistas) · Biblioteca (en práctica, mis momentos, guardados). Paginado con "Ver más", sin feed infinito. Interacciones: Resonancia, Guardar, Implementar.
- **Cuenta de creador = un solo perfil (como Instagram):** activarla (`/creadores`) suma a tu mismo perfil (`/yo`, `/u/[id]`) la **categoría** bajo el nombre ("Coach de hábitos"), la insignia de **verificado** (solo SOI, service role), sus cifras (Moments · veces vividos · seguidores), los **destacados** (círculos bajo la bio que filtran por tema, `Highlights`) y pestañas **Moments / Retos / Publicaciones** en **cuadrícula** de 3 columnas con portadas (`MomentGrid`). Nombre, foto y bio son los del perfil. `src/lib/creators/profile.ts` (`loadCreatorLayer`, `parseHighlights`). `/c/[handle]` es la versión para visitantes sin sesión (con sesión redirige a `/u/[id]`); enlaza a `/b/[id]`.
- **Panel profesional** (`/creadores` con cuenta): veces vividos, personas, completitud, Transformation Score (alcance + completitud + retención + resultados; no seguidores), ganancias (ledger `blueprint_purchases`, `payout_status`), editor de destacados (`/api/creators/highlights`, solo Moments propios publicados), publicados y borradores en cuadrícula, categoría y método.
- **Sin IA en toda la cuenta de creador** (todo es conocimiento propio: textos, imágenes, links de YouTube, PDF y audios): el chat no tiene `createMoment` ni `createGuidedContent` (`CONTENT_TOOLS`) y conversa sin generar; `/api/guided`, `/api/library/books/summary` y `/api/moments-flow/[id]/improve` responden 403 (`blockAIForCreators`); sin portada automática, sin `enrichGuidedBlocks`, sin "Mejorar mi Moment"; el constructor oculta los agentes y el resumen de libros (un libro se lee por páginas: `creatorBlocks` en el servidor). La IA **sí acompaña** a quien vive sus Moments con su método y límites (Creator Intelligence), sin cambiar su contenido.
- **Medios propios en el constructor:** bloque **Imagen** (`image`: `moment-assets/<uid>/images/…`, comprimida en el navegador, con texto; solo imágenes propias y, al publicar, moderación estricta con `checkBlockImages`) y **link de YouTube** en el bloque Video (`youtubeId`; a los creadores no se les ofrece la búsqueda). Audio y PDF ya existían.
- **Moderación de creadores** (`moderatePost(..., 'creator')`): presentarse, su método, experiencia y precio dentro de SOI están permitidos; se bloquea sacar a la gente de SOI (WhatsApp, teléfono, "escríbeme", enlaces), promesas de curación y lo de siempre.
- **Ventas:** solo a través del precio del Moment dentro de SOI. Los textos siguen sin links ni autopromoción.
- **Stripe:** `/api/blueprints/[id]/checkout` (mode `payment`, `metadata.kind = 'blueprint'`). El webhook separa compras de Moments de suscripciones.
- **Pendiente:** pagos a creadores (Stripe Connect), programas con sesiones grupales, office hours y mentoría 1:1, verificación de creadores (`is_verified` solo con service role).

## 🛠️ Panel de administración (`/panel`)
- Sin enlaces desde la app ni la landing, `noindex` y fuera de robots.txt. **Acceso:** sesión + correo en `ADMIN_EMAILS` (variable de entorno, separados por coma; `src/lib/admin/auth.ts`). Para cualquier otra persona, páginas y API responden 404.
- **Resumen** (sin cuentas demo): cuentas por plan, nuevas, activas, mensajes y tokens, Moments completados, señales de crisis.
- **Ajustes** (`src/lib/settings.ts`, tabla `app_settings`, caché de 60 s, rangos validados): precio mostrado e **ID de precio de Stripe** de cada plan (vacío = variable de entorno), días de prueba (nuevos registros), consultas gratis, minutos de voz por día, tokens máximos por respuesta y tokens por día (Free y SOI+/prueba; al llegar, el chat responde 429 y devuelve la consulta; la crisis nunca se bloquea).
- **Usuarios** (búsqueda por correo o nombre) e **inspección de cuenta**: plan y uso (tokens, proveedores), perfil e identidades, conversaciones (lectura completa), Moments vividos con lo que escribió, Moments creados, memoria de SOI, batallas y señales de crisis (plegadas). Acciones: extender prueba, reponer consultas, SOI+ de cortesía (sin Stripe), pasar a Free.
- **Términos** (`/panel/terminos`, `src/lib/legal.ts`): subir los términos y el aviso de privacidad (.docx con `mammoth` → Markdown, .md o .txt), revisarlos (editar / vista previa) y publicarlos; `/terminos` y `/privacidad` muestran la última versión (`revalidatePath` al publicar) y, sin ninguna, la plantilla base.
- **Auditoría** (`admin_audit`): abrir una cuenta, leer una conversación, cambiar ajustes o un plan queda registrado con quién y cuándo (y el antes/después).

## ⚡ Rendimiento
- **Nada de IA en el camino de una pantalla:** la clasificación de identidad tiene presupuesto (`classifyLinks(..., { budgetMs: 2500 })`, proveedor rápido); si no alcanza, la pantalla sale con reglas y la IA termina en segundo plano (`after`) y guarda para la próxima visita.
- **Una vez por petición** (React `cache`): `getSessionUser` (una sola validación con Supabase Auth entre layout y página), `getProfile`, `loadIdentityView` (identidades y batallas al terminar un Moment la comparten).
- **Al terminar un Moment** los guardados en memoria (con embedding) se escriben después de responder (`after`); la celebración no los espera.
- **Chat:** el contexto (memoria, Momentum, continuidad, Moments parecidos) arranca en paralelo con el router; el mensaje del usuario y el eslabón se guardan sin bloquear el inicio de la respuesta; `embedText` reutiliza el mismo texto durante 60 s.
- Medir en local: `next build && next start` con un proxy que añade latencia a Supabase y cuenta consultas por pantalla.

## 🕰️ Fechas y hora
Los días se cuentan en la zona horaria del perfil (`profile.timezone`), nunca en UTC: `todayISO`, `dateInTz`, `startOfTodayISO`, `hourInTz` (`src/lib/utils.ts`). En México el domingo después de las 18:00 ya es lunes en UTC. **Zona automática** (`TimezoneSync` en el layout: la del dispositivo) o elegida en Ajustes entre las de su país (`src/config/timezones.ts`). **El chat conoce la hora local** (`timeContextPrompt`, `src/lib/time-of-day.ts`): mañana → rituales matutinos, intención, afirmaciones y manifestación (nada de descompresión salvo carga expresada); tarde → foco o reconexión; noche → bajar el ritmo, gratitud, SATS.

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

