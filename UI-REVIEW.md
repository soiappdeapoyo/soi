# UI-REVIEW — v0.3 · Rediseño visual y de movimiento

Aplicación de la referencia visual (pantalla *Ritual de 5 minutos*) y de `DESIGN.md`. Formato DESIGN.md §10.

## Sistema (globals.css y primitivos)

| Antes | Después | Por qué |
|---|---|---|
| Paleta crema + tinta `#1A1A2E` + oro como acento general | Lienzo blanco, sidebar `#FAFAF8`, tinta `#1C1C1E`, gris AA `#5F5F63`, acento azul `#1F4E8C` / `#E8EFF9`; oro solo SOI+ y hitos | Coincide con la referencia; calma visual y contraste AA |
| Sin tokens de movimiento | `--ease-out-strong`, `--ease-in-out-strong`, `--ease-drawer`, `--dur-press…--dur-slow` | Curvas propias en vez de `ease` nativo; duraciones coherentes |
| `transition` (lista amplia) en botones | `press`: `transform, background-color, box-shadow, opacity, color` · 120 ms · `ease-out-strong` | Anima solo lo necesario y se siente más ágil |
| Sin feedback al presionar | `:active { scale(0.97) }` en todo lo presionable (`press`), `0.9` en reacciones (`press-deep`) | La interfaz se siente física |
| `hover:` activo en táctil | `@custom-variant hover` → `(hover: hover) and (pointer: fine)` | Evita hover pegajoso en móvil |
| `border border-black/10` en tarjetas | `shadow-soft` (anillo 1 px + 3 capas) | Se adapta al fondo y da profundidad sutil |
| `rounded-full` en botones / `rounded-3xl` sin relación | Escala concéntrica 8 → 12/16 → 24 → 32 | Radios exterior = interior + padding |
| Íconos lucide a 2 de trazo | 1.5 global (`svg.lucide`) | Coincide con la referencia; más ligero |
| Números proporcionales | `nums` (tabular) en temporizador, racha, contadores, precios | Los números no bailan |
| Reduced motion eliminaba todo (incl. feedback) | Conserva `opacity`/color, quita movimiento; halo estático | No elimina el feedback, elimina el movimiento |
| Foco dorado | Anillo de acento azul; inputs con anillo 2 px en foco | Visible y coherente con el acento |

## Navegación

| Antes | Después | Por qué |
|---|---|---|
| Sidebar oscuro con íconos de colores y etiquetas en MAYÚSCULAS | Sidebar claro, íconos monocromos, "Prácticas" / "Mi espacio" en sentence case, ítem activo con `aria-current` | Referencia visual; jerarquía tranquila |
| "Nueva conversación" botón oro tipo píldora | Tarjeta blanca `shadow-soft`, radio 12 px | Referencia visual |
| Drawer móvil propio con `slidein .2s ease-out` | Vaul (`direction="left"`), `--ease-drawer` 350 ms, gesto con inercia, Radix Dialog (foco/Esc) | Gestos con velocidad y accesibilidad incluidas |
| — | `PageHeader` "Principio SOI" + menú `⋯` (`popover-motion`, origen top-right, 150/120 ms) | Popovers crecen desde su trigger |
| — | `PrincipioNav`: segmentado Pensamientos/Emociones/Acciones/Resultados + chips de agentes del eslabón | Hace visible el Principio SOI en la UI |

## RitualTimer

| Antes | Después | Por qué |
|---|---|---|
| Anillo dorado de progreso creciente, botones circulares de íconos | Círculo azul claro con anillo azul del tiempo restante; botones "Reanudar" / "Saltar paso" con texto | Referencia visual; acciones explícitas |
| Sin respiración | Halo 4 s inhalar / 6 s exhalar, `scale(1→1.12)` + opacity, pausa con el timer | Única animación expresiva de la app |
| Cambio de paso instantáneo | Sale −4 px/120 ms, entra desde 6 px/200 ms, sin cruzarse | Transición legible sin ruido |
| Play/Pause intercambiados de golpe | Cruce `opacity` + `scale(0.8→1)` + `blur(1px)`, 150 ms | Cambio de estado suave |
| 🎉 con `animate-bounce` infinito | Un anillo que se expande y desvanece (800 ms), luego CTA | Celebración de un solo momento |
| Bloqueado: CTA estático | Botón con candado abre `UpgradeSheet` (Vaul en móvil, Dialog en desktop) | El candado no rebota; explica en contexto |
| Anillo saltaba al cambiar de paso | `key={index}` reinicia el anillo sin transición inversa | Evita animar hacia atrás |

## Chat, onboarding, comunidad, ritual, paywall

| Antes | Después | Por qué |
|---|---|---|
| `scrollIntoView` siempre | Auto-scroll suave solo si estabas al final (umbral 64 px) | No roba la lectura |
| "SOI está escribiendo…" estático | Pulso de opacidad `animate-thinking` | Feedback calmado, sin rebote |
| Burbuja oscura del usuario / borde en asistente | Usuario en `soi-tray`, asistente sin burbuja; sin animación de entrada | Mensaje del usuario instantáneo; streaming sin animar tokens |
| Banner de paywall estático | `animate-banner-in` (−8 px + fade, 250 ms) | Entrada desde arriba, sin urgencia |
| Tarjetas del onboarding sin stagger, borde dorado | Stagger 40 ms (máx. 6), press 0.97, no elegidas a 0.5, anillo azul en la elegida | Guía la atención sin distraer |
| Respuesta de IA aparece de golpe | Fade + `translateY(6px)` con stagger 40 ms, una vez | Revela el contenido con suavidad |
| Reacciones sin feedback | `scale(0.9)` al presionar + pop a 1.15 (200 ms) | Confirmación táctil |
| Todas las tarjetas del feed animadas | Solo el primer lote hace fade; el scroll infinito no anima | Rendimiento y calma |
| Mensajes de estado inline ("✓") | Toasts Sonner, copy corto sin "!" | Patrón único de notificaciones |
| Confeti de emojis que cae | Anillo dorado de 800 ms (hito de evidencias) | Celebración sobria |
| Hito de racha sin feedback | Pulso `1 → 1.06 → 1` (300 ms) en el ícono | Un solo pulso; sin animación negativa |
| `animate-pulse` en skeleton | `skeleton` con shimmer de 2 s y bajo contraste, forma final | Sin saltos de layout |

## Pendiente / notas
- `vaul` decide el cierre por velocidad con su umbral interno (no configurable a 0.11 px/ms).
- `motion` (Framer Motion) no se agregó: hoy no hay gestos fuera del drawer. Si se agregan swipes de tarjetas, usar `motion` con `dynamic import`.
- Tooltips con delay de grupo (400 ms el primero, 0 ms los siguientes) aún no existen en la app; usar Radix Tooltip (`delayDuration=400`, `skipDelayDuration`) cuando se agreguen.
