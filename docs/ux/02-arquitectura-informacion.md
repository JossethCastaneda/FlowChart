# 02 · Arquitectura de información

> **La categorización completa de Zefirus.** Fuente de verdad ejecutable:
> [`lib/zefirus-kit/modules.ts`](../../lib/zefirus-kit/modules.ts) (registro central de módulos).
> Este documento explica y justifica esa taxonomía; si difiere del registro, gana el registro.

---

## 1. Modelo de dos capas (etiqueta / esencia)

Cada módulo tiene **dos nombres**:

- **`label`** — lo que ve el marketer en el menú. Funcional, obvio, sin metáfora ("Inbox",
  "Anuncios", "Reportes"). Es lo que reduce la curva de aprendizaje.
- **`code`** (codename / _esencia_) — la identidad interna que define su color de acento,
  ícono, lema (`tagline`) y la voz de Orbi al hablar de él ("Señal", "Impulso", "Pulso").

**Por qué dos capas:** la etiqueta funcional hace el producto aprendible para un usuario
nuevo; la esencia le da personalidad, color y coherencia narrativa sin sacrificar claridad.
El usuario navega con la etiqueta; el sistema y Orbi razonan con la esencia.

> Regla: **en UI de navegación siempre se muestra la `label`.** El `code` aparece en
> superficies de identidad (header del módulo, Orbi, breadcrumbs enriquecidos), nunca como
> etiqueta de menú sola.

---

## 2. Los 4 grupos (taxonomía de primer nivel)

Los módulos se agrupan por **momento del flujo de trabajo**, no por tecnología. Este orden
es intencional y sigue el recorrido natural del usuario (ver JTBD en
[01-usuarios-jtbd](01-usuarios-jtbd.md)):

| Grupo | Significado | Pregunta que responde |
|-------|-------------|------------------------|
| **Operación** | El día a día: pulso, cuentas, mensajes, tareas + el núcleo de IA. | "¿Qué está pasando ahora y qué hago?" |
| **Contenido** | Idear → pedir arte → programar (en ese orden de flujo). | "¿Qué publico y cuándo?" |
| **Crecimiento** | Pauta, medición, predicción, escucha, reportes. | "¿Cómo crece y cuánto rinde?" |
| **Sistema** | Ajuste, no trabajo diario. Va al pie del sidebar, en gris. | "¿Cómo configuro todo esto?" |

---

## 3. Mapa completo de módulos

Estado: **✅ activo** (renderizado) · **🟡 planificado** (`FUTURE_MODULES`, no se renderiza aún).

### Grupo OPERACIÓN
| Módulo (label) | Esencia (code) | Ruta | Ícono | Lema | Estado |
|---|---|---|---|---|---|
| Agentes | Núcleo | `/dashboard/agentes` | sparkles | La IA que potencia tu sistema | ✅ |
| Resumen | Pulso | `/dashboard/resumen` | activity | El latido de tu operación | ✅ |
| Clientes | Cartera | `/dashboard/proyectos` | folder-kanban | Tus cuentas, en órbita | ✅ |
| Inbox | Señal | `/dashboard/inbox` | messages-square | Cada mensaje, un solo canal | ✅ |
| Tareas | Misiones | `/dashboard/ops` | target | Cada tarea, una misión | ✅ |

### Grupo CONTENIDO
| Módulo (label) | Esencia (code) | Ruta | Ícono | Lema | Estado |
|---|---|---|---|---|---|
| Briefs IA | Nova | `/dashboard/briefing` | sparkles | La parrilla nace aquí | ✅ |
| Publicación | Lanzadera | `/dashboard/publisher` | rocket | Programa y despega | ✅ |
| Aprobaciones | Visto bueno | `/dashboard/aprobaciones` | check-check | Revisión y firma antes de publicar | 🟡 F1 |
| Biblioteca | Bóveda | `/dashboard/publisher/biblioteca` | folder-open | Activos de marca centralizados | 🟡 F1 (tab de Publicación) |
| Link-in-bio | Portal | `/dashboard/portal` | link | Mini-landing con métricas de clic | 🟡 F2 |

### Grupo CRECIMIENTO
| Módulo (label) | Esencia (code) | Ruta | Ícono | Lema | Estado |
|---|---|---|---|---|---|
| Anuncios | Impulso | `/dashboard/ads-manager` | megaphone | Empuje para tus campañas | ✅ |
| Centurion MMM | Convergencia | `/dashboard/centurion` | pie-chart | Marketing Mix Modeling SaaS | ✅ |
| Escucha | Radar | `/dashboard/listening` | radar | Escucha todo el espectro | ✅ |
| En vivo | Órbita | `/dashboard/streams` | columns-3 | Tu feed, en tiempo real | ✅ |
| Aria IA | Oráculo | `/dashboard/crecimiento` | brain-circuit | Predice tu siguiente venta | ✅ |
| Reportes | Bitácora | `/dashboard/reportes` | file-text | Informes white-label para el cliente | ✅ |
| Datos | Telescopio | `/dashboard/datos` | database | Todas tus métricas, una fuente | 🟡 F2 |
| Competidores | Rivales | `/dashboard/listening/competidores` | swords | Benchmark contra otras marcas | 🟡 F2 (tab de Escucha) |

### Grupo SISTEMA (pie del sidebar, acento gris)
| Módulo (label) | Esencia (code) | Ruta | Ícono | Lema | Estado |
|---|---|---|---|---|---|
| Integraciones | Enlaces | `/dashboard/integrations` | plug | Conecta tus cuentas | ✅ |
| Configuración | Consola | `/dashboard/settings` | settings | Tu cuenta y tu workspace | ✅ |
| Roles & permisos | Mando | `/dashboard/settings/roles` | shield | Acceso por rol y por cliente | 🟡 F3 (tab de Config.) |
| API & automatización | Puente | `/dashboard/settings/api` | webhook | Webhooks y conectores externos | 🟡 F3 (tab de Config.) |

---

## 4. Submódulos (pestañas internas, NO ítems de sidebar)

Los submódulos son **tabs dentro de la página del módulo**, no entradas de menú. Mantienen
el sidebar corto y agrupan variaciones de un mismo trabajo.

| Módulo | Pestañas |
|--------|----------|
| Clientes | Resumen · Configuración |
| Publicación | Calendario · Historial _(+ Biblioteca 🟡)_ |
| Centurion MMM | Resumen · Datos · Modelo · Simulador · Configuración |
| Aria IA | Insights · Data Hub · Predictive Studio · Scores |
| Integraciones | Facebook · Meta Ads · WhatsApp _(+ Google, GA4, GTM, TikTok en rutas)_ |
| Configuración | _(base)_ · Roles 🟡 · API 🟡 |

---

## 5. Reglas de la arquitectura

1. **El sidebar solo muestra módulos, agrupados por los 4 grupos.** Las variaciones de un
   módulo son pestañas, no ítems nuevos. (Un sidebar largo mata la orientación.)
2. **Nada de duplicados de navegación.** Consolidaciones ya decididas (ver notas en
   `modules.ts`):
   - "Métricas de bots" → pestaña de Chatbots, no ítem.
   - `/dashboard/gridia` → se unifica en Briefs IA (`/dashboard/briefing`).
   - `/dashboard/historial` → pestaña de Publicación.
   - `/dashboard/analisis-resultados` → pestaña de Anuncios.
3. **Sistema va al pie y en gris** (`var(--text-muted)`): es configuración, no trabajo diario;
   su jerarquía visual debe ser menor.
4. **Los módulos futuros ya tienen identidad reservada** (grupo, color, ícono, patrón,
   `RESERVED_ACCENTS`). Al construirlos NO se inventa nada: se sigue el sistema. `status:
   "planned"` los oculta hasta estar listos.
5. **Orbi es capa transversal, no módulo.** El copiloto de IA no ocupa lugar en la taxonomía;
   flota sobre todos los módulos. (Ver `orbi-states.md` cuando exista.)

---

## 6. Jerarquía de navegación (mapa del sitio)

```
/login  · /register  · /forgot-password · /reset-password        (auth, fuera del shell)
/dashboard                                                         (shell: sidebar + topbar + Orbi)
│
├─ OPERACIÓN
│   ├─ /dashboard/agentes            Agentes · Núcleo
│   ├─ /dashboard/resumen            Resumen · Pulso        ← landing por defecto
│   ├─ /dashboard/proyectos          Clientes · Cartera
│   │   └─ /[id]                      detalle de cliente
│   ├─ /dashboard/inbox              Inbox · Señal
│   └─ /dashboard/ops                Tareas · Misiones
│
├─ CONTENIDO
│   ├─ /dashboard/briefing           Briefs IA · Nova
│   └─ /dashboard/publisher          Publicación · Lanzadera
│       └─ /historial                (pestaña)
│
├─ CRECIMIENTO
│   ├─ /dashboard/ads-manager        Anuncios · Impulso
│   ├─ /dashboard/centurion          Centurion MMM · Convergencia
│   │   └─ /datos · /modelo · /simulador · /config
│   ├─ /dashboard/listening          Escucha · Radar
│   ├─ /dashboard/streams            En vivo · Órbita
│   ├─ /dashboard/crecimiento        Aria IA · Oráculo
│   │   └─ /data-hub · /studio · /scores
│   └─ /dashboard/reportes           Reportes · Bitácora
│
└─ SISTEMA  (pie, gris)
    ├─ /dashboard/integrations       Integraciones · Enlaces
    │   └─ /facebook · /meta-ads · /whatsapp · /google-ads · /google-analytics · /tag-manager · /tiktok
    └─ /dashboard/settings           Configuración · Consola
```

Navegación transversal (siempre disponible en el shell):
- **Selector de workspace/cliente** (WorkspaceSwitcher) — nunca operar sobre el cliente equivocado.
- **⌘K CommandMenu** — salto rápido a cualquier módulo/acción (limpiar rutas muertas, ver
  deuda en design-system.md §9).
- **NotificationBell** — alertas de SLA, sincronización, menciones.
- **Orbi** — copiloto contextual sobre cualquier módulo.
- **MobileBottomNav** — navegación primaria en < 768px.

---

## 7. Cómo extender la taxonomía

Al añadir un módulo o pestaña:
1. Decide su **grupo** por el momento del flujo que sirve (§2), no por su tecnología.
2. Regístralo en `lib/zefirus-kit/modules.ts` con `label`, `code`, `route`, `color`, `icon`,
   `tagline`, `group` (y `tabs` si aplica). Si es futuro: en `FUTURE_MODULES` con `status`,
   `phase` y, si es pestaña, `tabOf`.
3. Añade su ícono a `ICON_MAP` en `ClientMainWrapper.tsx` (si falta, cae al fallback).
4. Reserva su acento en `RESERVED_ACCENTS` si es futuro; usa un `--mod-*` token si es activo.
5. Verifica que **sirve un JTBD** ([01](01-usuarios-jtbd.md)). Si no sirve ninguno, no va.
