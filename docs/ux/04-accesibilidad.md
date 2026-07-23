# 04 · Accesibilidad

> Estándar objetivo: **WCAG 2.2 nivel AA**. Estado actual: 🟡 meta declarada, auditoría
> formal pendiente. Este documento fija el mínimo que todo PR de UI debe cumplir y sirve de
> base para la auditoría.

---

## 1. Por qué AA (y por qué importa aquí)

Zefirus es una herramienta de trabajo B2B usada muchas horas al día por equipos internacionales.
La accesibilidad no es solo cumplimiento legal (ADA/EN 301 549 son requisito frecuente en
contratos enterprise): reduce fatiga visual en sesiones largas, hace el producto usable con
teclado (clave para usuarios expertos y para el modo denso), y es condición para vender a
clientes corporativos. **AA es un requisito comercial, no un extra.**

---

## 2. Color y contraste

- **Contraste mínimo:** texto normal ≥ 4.5:1, texto grande (≥ 18.66px bold o 24px) ≥ 3:1,
  componentes de UI y estados de foco ≥ 3:1.
- **En los 3 temas.** Cada par texto/fondo debe validarse en Ink, Claro y Azul medianoche.
  El tema Claro ya oscurece los semánticos precisamente para alcanzar AA — no revertirlo.
- **El color nunca es el único portador de significado** (P2 + WCAG 1.4.1): un estado se
  comunica con color **y** con ícono/texto/forma. Ej.: éxito = verde **+** `CheckCircle2` **+**
  etiqueta; error = rojo **+** `XCircle` **+** mensaje. Un `status-dot` de color solo, sin
  texto asociado, no es accesible.
- Validar tokens nuevos de `globals.css` con un checker antes de mergear.

---

## 3. Teclado

- **Todo lo operable con mouse es operable con teclado** (WCAG 2.1.1). Nada dependiente de hover.
- **Orden de foco lógico** siguiendo la jerarquía visual del patrón de página (§03).
- **Foco visible siempre** (WCAG 2.4.7): anillo azul de marca con contraste ≥ 3:1. Nunca
  `outline: none` sin reemplazo.
- **⌘K (CommandMenu)** es la ruta de teclado primaria: cualquier acción/navegación importante
  debe ser alcanzable desde ahí.
- Modales (`ConfirmModal`): foco atrapado dentro, `Esc` cierra, al cerrar el foco vuelve al
  disparador.
- Sin **trampas de foco** fuera de modales (WCAG 2.1.2).

---

## 4. Semántica y lectores de pantalla

- HTML semántico primero: `button` para acciones, `a` para navegación, `nav`/`main`/`header`
  landmarks. Nada de `div` clicable sin rol.
- **Iconos vía `SIcon`**: decorativos con `aria-hidden`; los que portan significado necesitan
  `aria-label`. Un botón solo-ícono **siempre** lleva `aria-label`.
- Imágenes con `alt` significativo; decorativas con `alt=""`.
- Estados dinámicos (toasts, cargas, resultados) anunciados con `aria-live`
  (`polite` para info, `assertive` para errores). Los toasts deben ser percibibles por AT.
- Formularios: cada campo con `label` asociado (`htmlFor`); errores enlazados con
  `aria-describedby`.
- Tablas de datos con `th`/`scope` correctos; no maquetar datos con `div` sueltos.

---

## 5. Movimiento y tiempo

- **`prefers-reduced-motion`**: la regla global ya lo respeta; toda animación nueva debe
  degradar a sin-movimiento (o casi). Ninguna información depende solo de la animación.
- Sin parpadeos > 3/s (WCAG 2.3.1).
- Nada que se auto-actualice de forma que impida leer (Streams/En vivo: permitir pausar o
  que el foco no se pierda al refrescar).
- Toasts efímeros: dar tiempo suficiente o permitir persistencia; los errores importantes no
  desaparecen solos sin registro (NotificationBell).

---

## 6. Texto y zoom

- Zoom hasta 200% sin pérdida de contenido/función (WCAG 1.4.4); layout ya es responsive.
- No fijar tamaños que impidan el escalado del navegador; respetar `rem`.
- Densidad ≠ ilegible: el modo denso mantiene tamaños mínimos legibles; `.t-label` (10px) es
  para etiquetas cortas en mayúsculas, no para texto de lectura.

---

## 7. Objetivos táctiles

- Objetivo táctil mínimo **24×24px** (WCAG 2.5.8 AA), preferible 44×44px en móvil.
- `MobileBottomNav` y controles de tabla en móvil deben cumplir el objetivo mínimo.

---

## 8. Checklist de accesibilidad para PR

- [ ] Contraste AA verificado en los **3 temas**.
- [ ] Estado no depende solo del color (hay ícono/texto).
- [ ] Operable 100% con teclado; foco visible; orden lógico.
- [ ] Botones solo-ícono con `aria-label`; iconos decorativos `aria-hidden`.
- [ ] Toasts/errores con `aria-live`.
- [ ] Campos con `label` y errores con `aria-describedby`.
- [ ] Respeta `prefers-reduced-motion`.
- [ ] Objetivos táctiles ≥ 24px.

> Pendiente de roadmap: auditoría con axe/Lighthouse en CI y pruebas con lector de pantalla
> (VoiceOver/NVDA) sobre el patrón de página canónico.
