# 00 · Fundamentos y principios de diseño

> El **porqué** de Zefirus. Este documento justifica cómo se ve y se comporta el producto.
> Cada principio tiene una regla accionable y una justificación; cuando un diseño esté en
> duda, se resuelve a favor del principio, no del gusto individual.

---

## 1. Contexto: qué estamos diseñando

Zefirus es una **herramienta de trabajo profesional**, no una app de consumo. La usan
equipos de agencia durante horas al día para tomar decisiones con dinero real de clientes
(pauta en Meta, contenido, atención al cliente). Eso define todo lo demás:

- La densidad de información es alta y **deseada**: el usuario experto quiere ver muchos
  datos a la vez, no un dato por pantalla.
- La velocidad y la previsibilidad importan más que la sorpresa o el deleite.
- Un error de la interfaz puede costar dinero o reputación del cliente → la interfaz debe
  ser **honesta** sobre estados, confianza de datos y acciones destructivas.

Referencias de categoría: **Linear, Vercel, Stripe Dashboard, Height, Figma**. No:
dashboards "sci-fi", plantillas de admin genéricas, o consumer apps gamificadas.

---

## 2. Los 7 principios

### P1 · Claridad sobre decoración
La jerarquía se construye con **tipografía, espaciado y una sola familia de acentos azules**,
no con efectos. Prohibido: glows, gradientes arcoíris, sombras de color, fuentes display sci-fi.

- **Regla:** si un elemento necesita un efecto para destacar, primero prueba peso, tamaño,
  espaciado o color semántico. El efecto es el último recurso, casi nunca el correcto.
- **Por qué:** el ruido visual compite con los datos, que son lo importante. La sobriedad
  también envejece mejor y da credibilidad ante un cliente internacional.

### P2 · El color significa algo
El azul es acción/marca. Los semánticos (verde/ámbar/rojo/violeta) son **estado**, nunca
decoración. Cada módulo tiene un acento de "esencia" para orientación, no para pintar UI.

- **Regla:** antes de usar un color pregúntate "¿qué comunica?". Si la respuesta es "se ve
  bonito", no lo uses. Verde = éxito/positivo, ámbar = advertencia, rojo = peligro/negativo,
  violeta = info/IA.
- **Por qué:** cuando el color es semántico, el usuario lee la pantalla de un vistazo. Si el
  color es decorativo, deja de significar nada y el usuario deja de confiar en él.

### P3 · Densidad honesta
Mostramos mucha información, pero organizada por **jerarquía visual estricta**: KPIs arriba,
tendencias en medio, detalle en tablas abajo. Densidad no es desorden.

- **Regla:** toda pantalla sigue el patrón canónico (ver [03-patrones](03-patrones-interaccion.md)):
  `PageHeader` → grid de KPIs → gráficas → tablas/detalle. La densidad se gana con retícula,
  no rellenando huecos.
- **Por qué:** el usuario experto penaliza tener que hacer clic o scroll para datos que
  podrían caber juntos; el usuario novato penaliza el caos. La retícula sirve a ambos.

### P4 · La interfaz es honesta sobre los datos
Los datos vienen de APIs externas (Meta, Google) que fallan, tardan o devuelven datos de baja
confianza. La UI **nunca finge** que todo está bien.

- **Regla:** todo dato tiene sus estados explícitos — cargando (`Skeleton`), vacío
  (`EmptyState`), error (`ErrorBoundary`/toast), y cuando aplique, **confianza/frescura**
  del dato (última sincronización, calidad de bot, fiabilidad de audiencia). Nunca un `0`
  o un espacio en blanco ambiguo en lugar de "sin datos" o "error".
- **Por qué:** en una herramienta con dinero de por medio, un dato incierto presentado como
  cierto es peor que no mostrarlo. La honestidad de estado es una feature, no un adorno.

### P5 · Consistencia por defecto, novedad justificada
Existe un registro central de módulos (`lib/zefirus-kit/modules.ts`) y una librería de
primitivos (`components/ui/`). Lo nuevo se construye **componiendo lo existente**.

- **Regla:** antes de crear un componente, tabla, badge o patrón nuevo, verifica que no
  exista ya. Un módulo nuevo hereda grupo, color de esencia, ícono y voz del registro —
  no se inventa identidad.
- **Por qué:** la consistencia es lo que hace que 20+ módulos se sientan un solo producto.
  Cada excepción no justificada es deuda que alguien pagará.

### P6 · Adaptable a la persona y al tema
Zefirus tiene 3 temas (Ink oscuro, Claro, Azul medianoche) y una base multi-tenant (varias
agencias, cada una con varios clientes). Nada se hardcodea.

- **Regla:** todo color vía `var(--token)`; todo estilo debe verse bien en los 3 temas;
  todo dato se piensa por-workspace. Ver [04-accesibilidad](04-accesibilidad.md) para el
  contraste en cada tema.
- **Por qué:** el usuario elige su tema y su cliente; la interfaz se adapta a él, no al revés.

### P7 · La IA es un copiloto, no el piloto
Zefirus tiene una capa de IA fuerte (módulo Agentes, mascota/copiloto **Orbi**, Aria/predictivo,
Briefs IA). La IA **asiste y explica**; el humano decide y aprueba.

- **Regla:** toda acción de IA con consecuencia (publicar, gastar, cambiar reglas) pasa por
  confirmación humana (`ConfirmModal`). La IA muestra su razonamiento y su nivel de confianza;
  no ejecuta en silencio. Orbi sugiere, no impone.
- **Por qué:** en una herramienta profesional, la responsabilidad es del humano. La IA que
  actúa sin transparencia destruye la confianza que el producto necesita para existir.

---

## 3. Anti-patrones (lo que Zefirus explícitamente NO es)

| ❌ No hacemos | ✅ Hacemos en su lugar |
|---|---|
| Glows de neón, estética "command center" sci-fi | Sobriedad tipo Linear/Vercel |
| Emojis como iconos de UI | Lucide (funcionales) + AppIcons (marcas) |
| Color decorativo arcoíris | Azul de marca + semánticos con significado |
| "Un dato por pantalla", mucho aire vacío | Densidad honesta con retícula |
| Ocultar errores/latencia para "verse pulido" | Estados explícitos de carga/vacío/error/confianza |
| Reinventar componentes por módulo | Componer primitivos de `components/ui/` |
| IA que ejecuta sola acciones costosas | IA que sugiere + confirmación humana |
| Hardcodear un color/fuente | Tokens (`var(--…)`) y `next/font` |

---

## 4. Cómo usar estos principios

- **Al diseñar**: cada decisión debe poder mapearse a un principio (P1–P7). Si no puedes
  justificarla con uno, probablemente no deberías tomarla.
- **En revisión de PR**: los principios son criterio de aprobación, no solo el checklist
  técnico. "Se ve bien" no es argumento; "cumple P1 porque…" sí.
- **Al registrar una decisión**: enlaza al principio en [06-decisiones-diseno.md](06-decisiones-diseno.md).

> **Justificación general del rediseño (2026):** Zefirus venía de un tema "Imperial Command
> Center / 1A Comando" (neón cian + Orbitron) que se eliminó por **ilegible y genérico**.
> El sistema actual —negro/azul/blanco, sobrio, denso y honesto— es la respuesta directa a
> ese fracaso: prioriza que un profesional lea datos rápido y confíe en ellos, que es la
> única razón por la que abriría la herramienta.
