# Zefirus · Documentación UX/UI

> **Fuente de verdad de la capa fundacional de diseño.**
> Vigente desde julio 2026. Complementa —no reemplaza— a
> [`docs/design-system.md`](../design-system.md), que sigue siendo la fuente de verdad
> de la capa **visual/técnica** (tokens, componentes, reglas de implementación).

Zefirus no tuvo diseño formal previo: la interfaz creció desde el código. Esta carpeta
existe para **justificar** las decisiones de diseño hacia atrás, **estandarizarlas** hacia
adelante y darle a cualquier persona (diseño, producto, ingeniería, un contratista externo,
o una IA como Orbi/Claude) el contexto para trabajar el front-end sin inventar reglas nuevas.

---

## Cómo se relaciona todo

```
┌─────────────────────────────────────────────────────────────┐
│  CAPA FUNDACIONAL (esta carpeta, docs/ux/)                   │
│  El PORQUÉ y el QUÉ: principios, usuarios, IA, patrones      │
├─────────────────────────────────────────────────────────────┤
│  CAPA VISUAL/TÉCNICA (docs/design-system.md)                │
│  El CÓMO: tokens, primitivos, reglas de PR, Figma MCP       │
├─────────────────────────────────────────────────────────────┤
│  CÓDIGO (app/globals.css, components/ui/, lib/zefirus-kit/)  │
│  La IMPLEMENTACIÓN: la fuente de verdad ejecutable           │
└─────────────────────────────────────────────────────────────┘
```

Regla de oro: si un documento y el código se contradicen, **gana el código** y el documento
se corrige. La documentación describe el sistema, no lo sustituye.

---

## Índice

| # | Documento | Para qué |
|---|-----------|----------|
| 00 | [Fundamentos y principios](00-fundamentos.md) | La filosofía de diseño y la **justificación** de por qué Zefirus se ve y se comporta así. Empieza por aquí. |
| 01 | [Usuarios y Jobs-to-be-Done](01-usuarios-jtbd.md) | Para quién diseñamos: personas, contextos de uso, tareas reales. |
| 02 | [Arquitectura de información](02-arquitectura-informacion.md) | **La categorización completa** del producto: grupos, módulos, rutas, navegación, mapa del sitio. |
| 03 | [Patrones de interacción](03-patrones-interaccion.md) | Los patrones canónicos reutilizables: página tipo, estados, navegación, feedback, tablas, formularios. |
| 04 | [Accesibilidad](04-accesibilidad.md) | El estándar WCAG AA que todo PR debe cumplir. |
| 05 | [Contenido y voz](05-contenido-voz.md) | Cómo escribimos: microcopy, el modelo etiqueta/codename, la voz de Orbi, idioma. |
| 06 | [Registro de decisiones (ADR-UX)](06-decisiones-diseno.md) | El historial justificado de decisiones de diseño. El "porqué" auditable. |

---

## Estado de madurez

| Área | Estado | Nota |
|------|--------|------|
| Tokens y paleta | ✅ Definido | En `globals.css` + design-system.md |
| Librería de primitivos | 🟡 Parcial | Existe `components/ui/`, sin Storybook ni tests visuales |
| Principios de diseño | ✅ Definido (este set) | — |
| Arquitectura de información | ✅ Definido | Registro central en `lib/zefirus-kit/modules.ts` |
| Accesibilidad | 🟡 Parcial | AA como meta; auditoría pendiente |
| Investigación de usuario | 🔴 Pendiente | Personas provisionales basadas en el dominio, sin entrevistas |

Leyenda: ✅ definido y aplicado · 🟡 definido, adopción parcial · 🔴 pendiente.

---

## Gobernanza

- **Cambios a esta documentación** van por PR, igual que el código, y requieren que el
  cambio correspondiente en `globals.css` / `components/ui/` ya exista o vaya en el mismo PR.
- Toda decisión de diseño no trivial se registra en [06-decisiones-diseno.md](06-decisiones-diseno.md).
- El checklist de PR de UI vive en design-system.md §10 y es de cumplimiento obligatorio.
