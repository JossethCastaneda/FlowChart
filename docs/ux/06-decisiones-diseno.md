# 06 · Registro de decisiones de diseño (ADR-UX)

> El historial **justificado y auditable** de las decisiones de diseño de Zefirus. Formato
> inspirado en ADR (Architecture Decision Records) aplicado a UX/UI. Cada decisión: contexto,
> decisión, justificación, consecuencias. **Las decisiones no se borran**: se marcan como
> _Reemplazada_ y se enlaza a la que la sustituye.

Estados: **Aceptada** · **Reemplazada** · **Propuesta**.

---

## ADR-000 · Adoptar un sistema de diseño explícito
**Estado:** Aceptada · julio 2026
**Contexto:** Zefirus creció desde el código sin diseño formal; la UI era inconsistente y sin
justificación documentada.
**Decisión:** Establecer dos capas de documentación — visual/técnica (`design-system.md`) y
fundacional (`docs/ux/`) — con el **código como fuente de verdad ejecutable**.
**Justificación:** Sin un sistema explícito, cada módulo reinventa patrones; con 20+ módulos
eso es insostenible y no se puede vender como producto profesional internacional.
**Consecuencias:** Todo PR de UI se mide contra principios + checklist. Coste inicial de
documentar; beneficio de coherencia y onboarding (humano y de IA).

---

## ADR-001 · Retirar el tema "Imperial Command Center" (neón + Orbitron)
**Estado:** Aceptada · julio 2026
**Contexto:** El tema original (neón cian, fuente Orbitron, glows, tracking amplio, estética
sci-fi "1A Comando") resultó **ilegible y genérico**.
**Decisión:** Eliminarlo y adoptar un sistema **sobrio negro/azul/blanco** tipo Linear/Vercel.
**Justificación:** La legibilidad y la credibilidad ante un cliente son condición de uso de
una herramienta profesional; la decoración competía con los datos (P1).
**Consecuencias:** Prohibiciones duras (sin glow, sin fuentes display, sin color decorativo).
Deuda de migración: ~290 `fontFamily` y ~150 `boxShadow` inline pendientes (design-system.md §9).
Comentarios que citan "Brand Guide §03/§05" ahora apuntan a `design-system.md`.

---

## ADR-002 · Modelo de navegación de dos capas (etiqueta + esencia)
**Estado:** Aceptada · julio 2026
**Contexto:** Se quería personalidad de marca (codenames, color, mascota Orbi) sin sacrificar
que un usuario nuevo entienda el menú.
**Decisión:** Cada módulo tiene `label` funcional (visible en navegación) y `code`/esencia
(color, ícono, lema, voz). Registro único en `lib/zefirus-kit/modules.ts`.
**Justificación:** La etiqueta funcional hace el producto aprendible; la esencia da coherencia
narrativa y color. Separarlas evita el falso dilema "claro vs. con personalidad".
**Consecuencias:** El codename nunca es etiqueta de menú. Orbi y headers usan la esencia.
Toda la nav (sidebar, breadcrumbs, ⌘K) lee del mismo registro.

---

## ADR-003 · Taxonomía por momento del flujo, no por tecnología
**Estado:** Aceptada · julio 2026
**Contexto:** Los módulos podían agruparse por tecnología (orgánico/pauta/IA) o por el
recorrido del usuario.
**Decisión:** Cuatro grupos por **momento del flujo**: Operación · Contenido · Crecimiento ·
Sistema. Sistema va al pie del sidebar en gris.
**Justificación:** El usuario piensa en "qué estoy haciendo ahora", no en la arquitectura
interna. El orden sigue los JTBD ([01](01-usuarios-jtbd.md)).
**Consecuencias:** Añadir un módulo obliga a ubicarlo por su momento de flujo. Submódulos son
pestañas, no ítems, para mantener el sidebar corto.

---

## ADR-004 · Estados de datos explícitos y honestos
**Estado:** Aceptada · julio 2026
**Contexto:** Los datos vienen de APIs externas (Meta/Google) que fallan, tardan o devuelven
baja confianza.
**Decisión:** Todo bloque de datos declara 4 estados (cargando/vacío/error/con-datos) + señales
de frescura y confianza cuando aplique. Nunca un `0` ambiguo.
**Justificación:** En una herramienta con dinero de por medio, fingir certeza es peor que
mostrar incertidumbre (P4). La honestidad de estado genera confianza en el producto.
**Consecuencias:** `Skeleton`, `EmptyState`, `ErrorBoundary` y toasts son obligatorios, no
opcionales. Coste de implementar cada estado; beneficio de credibilidad.

---

## ADR-005 · La IA sugiere, el humano aprueba
**Estado:** Aceptada · julio 2026
**Contexto:** Zefirus tiene IA fuerte (Agentes, Orbi, Aria, Briefs). Podía ejecutar acciones
automáticamente (publicar, pausar pauta, cambiar reglas).
**Decisión:** Toda acción de IA con consecuencia pasa por confirmación humana (`ConfirmModal`)
y muestra razonamiento + confianza. La IA no ejecuta en silencio.
**Justificación:** La responsabilidad es del humano; la IA opaca que actúa sola destruye la
confianza que el producto necesita (P7).
**Consecuencias:** Orbi es capa transversal, no módulo. Flujos de IA diseñan siempre el paso
de aprobación. Trade-off: menos "automágico", más control y auditabilidad.

---

## ADR-006 · Superficies sólidas; blur solo en overlays
**Estado:** Aceptada · julio 2026
**Contexto:** El "glassmorphism" con blur en todas las tarjetas degrada rendimiento y
legibilidad sobre fondos densos.
**Decisión:** `.glass-panel/-card/-v2` son **sólidas**; el `backdrop-blur` se reserva a
`.modal-overlay` y `.toast`. Elevación por color de superficie, no por glow.
**Justificación:** Rendimiento en vistas densas y legibilidad de datos (P1, P3).
**Consecuencias:** El nombre "glass" es histórico; no implica blur. Sombras solo negras.

---

## ADR-007 · Español primario con términos de dominio sin traducir
**Estado:** Aceptada · julio 2026
**Contexto:** Público primario hispanohablante; términos de marketing digital estandarizados
en inglés (ROAS, CPM, adset, workspace, brief).
**Decisión:** UI en español neutro; términos técnicos del dominio se mantienen en su forma
reconocida. i18n completa queda como roadmap.
**Justificación:** Traducir jerga estándar confunde al profesional; escribir en español el
resto reduce fricción para el usuario primario.
**Consecuencias:** Strings escritos pensando en futura extracción i18n. Deuda EN/ES en nombres
de carpetas (`projects`/`proyectos`) tolerada, no ampliada.

---

## ADR-008 · WCAG AA como requisito, no como extra
**Estado:** Aceptada · julio 2026
**Contexto:** Venta enterprise internacional suele exigir accesibilidad; además reduce fatiga
en sesiones largas.
**Decisión:** AA es el estándar mínimo de todo PR, verificado en los 3 temas; color nunca es
único portador de significado.
**Justificación:** Requisito comercial + usabilidad + inclusión ([04](04-accesibilidad.md)).
**Consecuencias:** Checklist de accesibilidad en PR. Pendiente: auditoría automatizada en CI.

---

## Plantilla para nuevas decisiones

```markdown
## ADR-00X · Título breve
**Estado:** Propuesta | Aceptada | Reemplazada · fecha
**Contexto:** Qué situación o problema fuerza la decisión.
**Decisión:** Qué se decide, en una o dos frases accionables.
**Justificación:** Por qué, enlazando al principio (P1–P7) que la respalda.
**Consecuencias:** Qué habilita, qué cierra, qué deuda o trade-off genera.
```

> Cómo registrar: al tomar una decisión de diseño no trivial, añade un ADR aquí en el mismo
> PR que la implementa. Enlaza el principio de [00-fundamentos](00-fundamentos.md) que la
> justifica. Si reemplaza a otra, marca la anterior como _Reemplazada_ y enlaza.
