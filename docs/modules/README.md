---
tags: [módulos, índice]
---

# Módulos — Índice

Los módulos son las secciones funcionales del dashboard de FlowChart.
La fuente de verdad es `lib/flowchart-kit/modules.ts`.

## Mapa generado

- [[../generated/modules-index|Módulos con rutas y metadatos (generado)]]

## Grupos

### Operación (día a día)
- **Resumen** — KPIs del workspace → `/dashboard/resumen`
- **Clientes** — Proyectos y cuentas → `/dashboard/proyectos`
- **Inbox** — Messenger + IG DM → `/dashboard/inbox`
- **Tareas** — Kanban con SLA → `/dashboard/ops`

### Contenido (ideación → publicación)
- **Briefs IA** — Generación de briefs con Gemini → `/dashboard/briefing`
- **Publicación** — Redacción, calendario, aprobaciones, biblioteca y grupos → `/dashboard/publisher`
- **Contenido** — Analytics de contenido orgánico → `/dashboard/contenido`

#### Pestañas de Publicación

Las 5 primeras son estado dentro de la misma página (deep-link vía `?tab=`);
Historial es una ruta propia.

| Pestaña | Ruta | Qué hace |
|---------|------|----------|
| Redactor | `/dashboard/publisher` (o `?tab=composer`) | Redacción, asignación de canales, formato, vista previa por dispositivo y checklist de validación |
| Calendario | `?tab=calendar` | Vista mensual, filtros por estado/canal, panel de detalle (Duplicar / Reprogramar / Abrir en Redactor) |
| Aprobaciones | `?tab=approvals` | Cola de revisión con Aprobar / Devolver (con motivo) |
| Biblioteca | `?tab=library` | Activos subidos (`MediaAsset`), filtros y etiquetas |
| Grupos | `?tab=groups` | Grupos de canales (`AssetGroup`) y publicación en bloque |
| Historial | `/dashboard/historial` | Publicaciones enviadas, métricas de Meta y exportación CSV |

> **Nota:** "Aprobaciones" y "Biblioteca" fueron módulos planeados con ruta
> propia; hoy son pestañas de Publicación y ya no existen en `FUTURE_MODULES`.

### Crecimiento (pauta y análisis)
- **Anuncios** — Ads Manager Meta → `/dashboard/ads-manager`
- **Centurion MMM** — Marketing Mix Modeling → `/dashboard/centurion`
- **Escucha** — Monitoreo de keywords → `/dashboard/listening`
- **En Vivo** — Streams tiempo real → `/dashboard/streams`
- **Crecimiento** — Análisis de crecimiento → `/dashboard/crecimiento`

### Sistema
- **Integraciones** — OAuth Meta, Google → `/dashboard/integrations`
- **Configuración** — Settings del workspace → `/dashboard/settings`
- **Reportes** — Reportes exportables → `/dashboard/reportes`
- **Aria** — Asistente IA → (módulo especial)

## Relacionado

- [[../generated/api-index|API Endpoints (generado)]]
- [[../Home|← Home]]
