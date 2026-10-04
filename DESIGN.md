# SOI — Guía de diseño UI e interacción (estilo Emil Kowalski)

> Documento hermano de `CLAUDE.md`. Si algo choca, gana `CLAUDE.md`.

## Cómo usar esta guía (para Claude Code Opus)

Antes de escribir cualquier componente visual en SOI, lee esta guía completa. Aplica estas reglas a todo lo que el usuario toca: botones, tarjetas, drawers, diálogos, toasts, el reproductor de Moments, el paywall y el chat.

La filosofía: **la calidad está en los detalles que nadie nota conscientemente, pero que se sienten.** La interfaz de SOI debe sentirse calmada, precisa y táctil. SOI es una app de bienestar: el movimiento nunca debe alterar, apurar ni distraer a la persona.

Esta guía no reemplaza el "Principio SOI" ni las reglas de `CLAUDE.md`. Solo gobierna cómo se ve y se siente la UI.

---

## 0. Lenguaje visual (referencia: pantalla del Ritual de 5 minutos)

| Elemento | Regla | Implementación |
|---|---|---|
| Lienzo | Blanco; sidebar y bandejas en gris cálido | `bg-soi-canvas` · `bg-soi-sidebar` (`#F9F9F7`) · `bg-soi-tray` (`#F3F3F0`) |
| Texto | Casi negro + gris cálido AA | `text-soi-ink` (`#0B0B0B`) · `text-soi-muted` (`#52514E`, 8:1) · `text-soi-subtle` (`#898781`, solo decorativo) |
| Acento | Azul sereno para progreso/selección/foco | `soi-accent` (`#184F95`, texto) · `soi-accent-fill` (`#2A78D6`, foco) · `soi-accent-soft` (`#E2EEFA`) |
| Oro | Solo SOI+ y celebraciones de hitos | `soi-gold` |
| Logo | `SOI.` en tinta, sin color | — |
| Sidebar | Ítems de 14 px con íconos de 16 px y trazo 1.5; el activo es blanco con anillo de 1 px; secciones en 11 px atenuado | `components/layout/sidebar-content.tsx` |
| Chat | Sin bloques al inicio: saludo de SOI + compositor tipo tarjeta (radio 20 = botón 8 + p-2), acción de un toque (`PracticeCard`, radio 14) | `components/chat/*` |
| Radios | control 8 · bandeja de segmentos 14 · tarjeta 20 · bandeja 28 | tokens `--radius-*` |
| Barra inferior | 5 pestañas (Hoy · Impulso · SOI · Mi Vida · Yo), h-14 + área segura, velo `bg-white/90` + blur, línea superior de 1 px. Activo: tinta + trazo 2 + `aria-current`; inactivo: `soi-subtle`. **Cambiar de pestaña no anima** (alta frecuencia); solo press 0.97. SOI es una pastilla con la marca. Se oculta en el temporizador de rutina | `components/layout/bottom-nav.tsx` |
| Video en SOI | Facade → reproductor sin sugeridos; al terminar, la tarjeta de reflexión entra con `animate-enter` (evento raro, una vez) | `components/media/soi-player.tsx` |
| Tarjeta de Moment | Tipo + duración + **íconos de sus bloques** (la forma del flujo) + creador + ejecuciones. Sin métricas de vanidad | `components/moments/moment-flow-card.tsx` |
| Constructor | Biblioteca de acciones en cuadrícula, bloques editables inline, reordenar con flechas (sin arrastrar en v1), total de minutos siempre visible | `components/moments/moment-builder.tsx` |
| Principio SOI | Encabezado discreto + menú `⋯`; control segmentado Pensamientos/Emociones/Acciones/Resultados; chips con los agentes del eslabón | `layout/page-header.tsx` · `principio/principio-nav.tsx` |
| Tarjeta del ritual | Bandeja gris (p-2, 32 px) → tarjeta blanca (p-4, 24 px) → botones (8 px) | `rituals/ritual-timer.tsx` |
| Círculo | Relleno azul claro, anillo azul de 2.5 px, número grande tabular | idem |

---

## 1. Principios rectores

1. **Anima con propósito.** Una animación debe explicar un cambio de estado, dar feedback a una acción o guiar la atención. Si solo decora, elimínala.
2. **La frecuencia manda.** Cuanto más seguido se usa algo, menos debe animarse. El input del chat, el cambio entre secciones del sidebar y los atajos de teclado: instantáneos o casi. La celebración al completar una rutina, el primer paso del onboarding y el ritual diario: pueden tener más carácter.
3. **Rápido se siente mejor.** Una interfaz que responde en 150 ms parece más ágil que una de 400 ms, aunque haga lo mismo.
4. **Las interfaces deben sentirse físicas.** Los elementos presionables se hunden un poco, los que aparecen tienen un origen lógico, los que se arrastran tienen inercia.
5. **Restraint.** Gasta la expresividad en un solo lugar por pantalla (en SOI: el círculo de respiración del ritual y la celebración final). Todo lo demás, silencioso.

---

## 2. Easing y duración

### Reglas de easing

- **Entradas y salidas iniciadas por el usuario: `ease-out` fuerte.** Empieza rápido y frena suave.
- **Movimiento de elementos que ya están en pantalla (mover, redimensionar): `ease-in-out` fuerte.**
- **Nunca uses `ease-in` en UI.** Arranca lento y hace que la interfaz se sienta pesada.
- **No uses los easings nativos de CSS (`ease`, `ease-out`) tal cual.** Son débiles. Usa curvas propias.

### Tokens en `globals.css` (Tailwind 4)

```css
@theme {
  --ease-out-strong: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out-strong: cubic-bezier(0.77, 0, 0.175, 1);
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);

  --dur-press: 120ms;
  --dur-fast: 150ms;
  --dur-base: 200ms;
  --dur-enter: 250ms;
  --dur-slow: 350ms;
}
```

Uso en clases: `ease-out-strong`, `ease-in-out-strong`, `duration-(--dur-fast)`.

### Duraciones

| Elemento | Duración |
|---|---|
| Feedback de botón (press) | 100–160 ms |
| Tooltip, hover, cambio de color | 120–150 ms |
| Dropdown, popover, select | 150–200 ms |
| Toast, banner | 200–250 ms |
| Diálogo, drawer, sheet | 250–350 ms |
| Celebración, ritual, onboarding | hasta 500 ms |

**Límite duro: la UI funcional nunca supera 300 ms** (drawers y sheets son la excepción, hasta 350 ms). La animación de salida es más corta que la de entrada (aprox. 75%).

---

## 3. Reglas de movimiento

1. **Solo anima `transform` y `opacity`.** No animes `height`, `width`, `padding`, `margin`, `top` ni `left`. Para reveals usa `clip-path`.
2. **Nunca escales desde 0.** Entra desde `scale(0.95)` con `opacity: 0`.
3. **Nunca uses `transition: all`.** Lista las propiedades: `transition-property: transform, opacity, background-color`.
4. **Transiciones CSS sobre keyframes para UI interactiva.** Las transiciones son interrumpibles. Usa keyframes solo para animaciones que corren solas (respiración, spinner, celebración).
5. **Springs para gestos.** Para arrastrar (drawer, swipe de tarjetas), usa springs o inercia real. Deben respetar la velocidad del gesto.
6. **Origen consciente (`transform-origin`).** Popovers, dropdowns y tooltips crecen desde el elemento que los abrió. Con Radix usa `var(--radix-popover-content-transform-origin)`. **Los diálogos modales no:** se quedan centrados.
7. **Stagger sutil.** Al mostrar listas, retrasa 30–60 ms por elemento. Máximo 6 elementos con stagger; el resto entra junto.
8. **Blur para disimular.** Si una transición entre dos estados se ve rara, agrega `filter: blur(2px)` durante el cambio. Úsalo poco.
9. **Timing asimétrico.** Acciones que requieren decisión (mantener presionado para confirmar) son lentas al presionar y rápidas al soltar.

---

## 4. Patrones de componentes

### Botones

```css
.btn {
  transition-property: transform, background-color, box-shadow;
  transition-duration: var(--dur-press);
  transition-timing-function: var(--ease-out-strong);
}
.btn:active { transform: scale(0.97); }
```

En SOI esto es la utilidad **`press`** (y `press-deep` = `scale(0.9)` para reacciones).

- Todo elemento presionable (botones, tarjetas de emoción del onboarding, ítems del sidebar) tiene `:active { scale(0.97) }`.
- El hover solo existe donde hay hover real: `@media (hover: hover) and (pointer: fine)`. En SOI el variant `hover:` de Tailwind ya está redefinido así en `globals.css`.
- Área táctil mínima de 44 px. Si el elemento visual es más pequeño, extiende el área con un pseudo-elemento `::after` (`inset: -8px`) → utilidad **`tap-target`**.

### Popovers, dropdowns, tooltips

- Entrada: `opacity 0 → 1` + `scale(0.95) → 1`, 150–200 ms, `ease-out-strong`, con origen desde el trigger → utilidad **`popover-motion`** + `data-state="open|closed"` + `--origin`.
- Tooltips: el primero tiene un delay de ~400 ms; los siguientes, mientras el usuario sigue en la zona, aparecen **sin delay y sin animación**.
- Salida más rápida que la entrada.

### Drawer y sheet (sidebar móvil, Vaul)

- Curva `--ease-drawer`, 300–350 ms (sobrescrito sobre `[data-vaul-drawer]`).
- Cierre por gesto con inercia: decide por **velocidad**, no solo por distancia.
- Fondo con overlay que hace fade.

### Toasts (Sonner)

- Usa Sonner, no reinventes toasts. `<Toaster />` vive en `app/layout.tsx`; usa `toast('…')`.
- Copy corto, sin signos de exclamación en mensajes de sistema.

### Diálogos

- Centrados, `scale(0.96) → 1` + fade, 200–250 ms. El overlay solo hace fade → `components/ui/dialog.tsx`.
- Enfoque atrapado, `Esc` cierra, devuelve el foco al trigger.

### Chat

- El mensaje del usuario aparece al instante (sin animación de entrada).
- El streaming del asistente no anima cada token. El indicador "pensando" es un pulso suave de opacidad (`animate-thinking`), no un rebote.
- Auto-scroll suave solo si el usuario ya estaba al final.

### Skeletons y estados de carga

- Skeletons que respetan la forma final del contenido (utilidad **`skeleton`**).
- Shimmer lento (≥1.6 s) y de bajo contraste. Nada de spinners giratorios grandes.

---

## 5. Aplicación específica en SOI

### Reproductor de Moments (antes RitualTimer)

> El RitualTimer se generalizó en `components/moments/moment-player.tsx`: una acción a la vez, barra de tiempo lineal, halo de respiración solo en respiración y meditación, misma transición de paso, una sola celebración. Las reglas de abajo siguen vigentes.

- Círculo SVG con `stroke-dashoffset` y transición **lineal** (tiempo real).
- **Círculo de respiración**: halo detrás del círculo, ~4 s inhalar / ~6 s exhalar, `scale(1 → 1.12)` + `opacity` (`animate-breathe`). Se pausa con el temporizador (`animation-play-state`).
- Cambio de paso: sale con `opacity` + `translateY(-4px)` (120 ms) y el nuevo entra desde `translateY(6px)` (200 ms). No cruzar ambos a la vez.
- Botones de pausa/saltar/salir: mismos press states que el resto.
- Al completar: un anillo que se expande y desvanece (800 ms, `animate-celebrate`), luego el CTA "Guardar en Muro de Evidencias". No repetir en bucle.

### Onboarding (8 tarjetas)
- Stagger de 40 ms. Press `scale(0.97)`; las demás bajan a `opacity: 0.5` y la elegida se resalta.
- La respuesta de la IA aparece con fade + `translateY(6px)`, una sola vez.

### Paywall y candados
- El candado no rebota ni sacude. Tocar una función bloqueada abre `UpgradeSheet` (drawer en móvil, dialog en desktop).
- Banner de "límite alcanzado": `translateY(-8px)` + fade, 250 ms (`animate-banner-in`).
- Nada de urgencia falsa.

### Racha sin castigo
- Al cumplir un hito (7, 21, 40, 90 días), un solo pulso `1 → 1.06 → 1`, 300 ms (`animate-milestone`). Al perder un día, no hay animación negativa.

### Muro de Evidencias y comunidad
- Las tarjetas entran con fade rápido; no se anima cada tarjeta al hacer scroll infinito.
- Reacciones: `scale(0.9)` al presionar y "pop" a `1.15` al confirmar, 200 ms (`animate-pop`).

---

## 6. Detalles de acabado

- **Radios concéntricos.** `radio_exterior = radio_interior + padding`. Escala SOI: control 8 px · segmento 12 px (bandeja p-1 → 16 px) · tarjeta 24 px (p-4 con controles de 8 px) · bandeja 32 px (p-2 con tarjeta de 24 px).
- **Sombras en vez de bordes duros.** `shadow-ring`, `shadow-soft` (anillo 1 px + 3 capas), `shadow-raised`.
- **Tipografía.** `antialiased`; `text-wrap: balance` en títulos y `pretty` en párrafos; `tabular-nums` (utilidad `nums`) en temporizadores, rachas y contadores.
- **Imágenes.** Outline interno de 1 px (global en `globals.css`; `data-bare` para excluir).
- **Foco visible** con el anillo de acento. Nunca `outline: none` sin reemplazo.
- **Cursor.** `cursor: pointer` solo en elementos clicables; sin `user-select` accidental en botones.
- **Sin layout shift.** Reserva espacio; los contadores usan ancho fijo.
- **Iconos.** `lucide-react` a 1.5 de trazo (global), tamaños 16/20/24. Play ↔ pausa se cruzan con `opacity` + `scale(0.8 → 1)` + blur leve, ~150 ms.

---

## 7. Accesibilidad y movimiento reducido

Respeta `prefers-reduced-motion`. **No elimines el feedback, elimina el movimiento:** conserva `opacity` y color, quita `translate`, `scale` y el halo de respiración (queda estático).

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-property: opacity, background-color, color !important;
    transition-duration: 0.01ms !important;
  }
}
```

- El contraste AA de `CLAUDE.md` sigue vigente en todos los estados.
- Nada en la interfaz transmite información solo con movimiento o color.

---

## 8. Stack y herramientas

| Necesidad | Herramienta |
|---|---|
| Transiciones simples | CSS + tokens de este documento |
| Gestos, springs, layout animations | `motion` (Framer Motion) solo en Client Components, con `dynamic import` |
| Toasts | `sonner` |
| Drawers móviles | `vaul` |
| Popovers, tooltips, dialogs | Radix (vía shadcn) con `transform-origin` correcto; hoy: `ui/dialog.tsx` + `popover-motion` |

---

## 9. Checklist antes de dar un componente por terminado

- [ ] ¿Cada animación tiene un propósito claro (feedback, estado, guía)?
- [ ] ¿Solo animo `transform` y `opacity`?
- [ ] ¿Usé una curva de los tokens y no `ease` ni `ease-in`?
- [ ] ¿La duración funcional es ≤ 300 ms?
- [ ] ¿Ningún elemento entra desde `scale(0)`?
- [ ] ¿Los elementos presionables tienen `:active` con `scale(0.97)`?
- [ ] ¿El hover está protegido con `(hover: hover)`?
- [ ] ¿Los popovers usan el origen del trigger y los modales están centrados?
- [ ] ¿Los números dinámicos usan `tabular-nums`?
- [ ] ¿Los radios son concéntricos?
- [ ] ¿Funciona con `prefers-reduced-motion`?
- [ ] ¿Se ve bien en 375 px y el área táctil es ≥ 44 px?
- [ ] ¿La animación se siente calmada, coherente con una app de bienestar?

## 10. Formato de revisión de UI

Cuando revises o corrijas UI existente, presenta los cambios en una tabla **Antes / Después / Por qué** (ver `UI-REVIEW.md`).

## Referencias

- Emil Kowalski: *Animations on the Web* (animations.dev) y su blog emilkowal.ski.
- Librerías de Emil: Sonner (toasts), Vaul (drawer).
- Radix UI, `motion` (Framer Motion) y las guías de movimiento de Material y Apple HIG como contraste.
