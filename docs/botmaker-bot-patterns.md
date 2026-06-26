# Botmaker — Mapa de Patrones por Bot

> **Alcance de este documento.** Mapa a **nivel de diseño** de los **25 bots reales** del workspace,
> aterrizado en dos fuentes verificables sin tocar la API en vivo:
> 1. El **inventario real de bots** (`MetaAnalyticsCache.botmaker_meta.botNames`, leído de la DB c-7).
> 2. Las **definiciones de flujo en código** (`FLOW_ORDERS` / `FIELD_PATTERNS` en `lib/botmaker.ts`).
>
> Los patrones **observados** (timing real, % de éxito por campo, tipos de respuesta, tráfico
> orgánico/pagado por bot) requieren una muestra de `/sessions` en vivo — ver §5 (script
> `_analyze_bots.mjs`, listo para correr cuando lo autorices). El cache de sesiones está vacío hoy.

---

## 1. Campos de datos que capturan los bots (`FIELD_PATTERNS`)

| key | Etiqueta | Señal de captura |
|---|---|---|
| `numero` | Número a cambiar/portar | "tu número", "10 dígitos", "número a portar/cambiar" |
| `nip` | NIP | "NIP" |
| `nombre` | Nombre completo | "nombre completo", "¿cómo te llamas?" |
| `nip`→`vigencia` | Vigencia del NIP | "vigencia" |
| `estado_nac` | Estado de nacimiento | "estado/entidad de nacimiento" |
| `fecha_nac` | Fecha de nacimiento | "fecha de nacimiento", "naciste" |
| `correo` | Correo | "correo", "email" |

Captura especial (no en `FIELD_PATTERNS`, detectable por nombre de bot): **OCR** (lectura de
documento/INE) y **Biométricos** (validación facial).

## 2. Orden de solicitud de datos por tipo de flujo (`FLOW_ORDERS`, metodología BAIT)

| Tipo de flujo | Orden de captura |
|---|---|
| **prepago** | número → NIP → nombre |
| **pospago_alineado** | número → nombre → NIP → vigencia → estado_nac → fecha_nac → correo |
| **pospago_simplificado** | número → nombre → NIP → estado_nac → fecha_nac → correo |
| **google_bait** | mezcla (resuelve a alineado/simplificado según fecha — `resolveFlowType`) |

Cierre/venta común a todos: mensaje del bot con **"felicidades"** o tipificación `venta/exitos` → cambio
de compañía completado → Intelix + CAPI (requiere `ctwa_clid`, ver `botmaker-analytics-flow-map.md`).

## 3. Dimensiones de patrón (taxonomía)

Cada bot se describe por la combinación de:
- **Línea telco:** Prepago · Pospago.
- **Variante de flujo:** Alineado · Simplificado · (prepago simple) · Con Dudas / Sin Dudas.
- **Captura especial:** OCR · Biométricos · (texto plano).
- **Atención:** 100% bot · **deriva a agente**.
- **Fuente de tráfico (por diseño):** Google (pagado) · Guerrilla (mkt de campo) · campaña (Parque Lira).
- **Entorno:** Producción · Prueba/Test.

## 4. Mapa de los 25 bots

| Bot | Línea | Variante de flujo | Captura | Atención | Tráfico / campaña | Entorno | Orden esperado |
|---|---|---|---|---|---|---|---|
| Bait Pospago Alineado | Pospago | Alineado | texto | bot | — | prod | nº→nombre→NIP→vigencia→edo→fecha→correo |
| Bait Pospago Simplificado | Pospago | Simplificado | texto | bot | — | prod | nº→nombre→NIP→edo→fecha→correo |
| Bait Pospago OCR | Pospago | (pospago) | **OCR** | bot | — | prod | OCR + nº→nombre→NIP→… |
| Google Bait Pospago OCR | Pospago | (pospago) | **OCR** | bot | **Google (pagado)** | prod | OCR + pospago |
| Google Pospago Bait OCR | Pospago | (pospago) | **OCR** | bot | **Google (pagado)** | prod | OCR + pospago |
| Bait Pospago Google 2 | Pospago | (pospago) | texto | bot | **Google (pagado)** | prod (v2) | pospago |
| Bait Pospago Google 3 | Pospago | (pospago) | texto | bot | **Google (pagado)** | prod (v3) | pospago |
| Bot Mkt Guerrila Pospago | Pospago | (pospago) | texto | bot | **Guerrilla (mkt)** | prod | pospago |
| Pospago Cliente (test) | Pospago | (pospago) | texto | bot | — | **test** | pospago |
| BOT prueba menu pospago | Pospago | menú | texto | bot | — | **test** | menú→pospago |
| Bait Prepago Con Dudas | Prepago | **Con Dudas** | texto | bot | — | prod | nº→NIP→nombre (+ rama dudas) |
| Bait Prepago Sin Dudas | Prepago | **Sin Dudas** | texto | bot | — | prod | nº→NIP→nombre (directo) |
| Bait Prepago Parque Lira | Prepago | (prepago) | texto | bot | campaña Parque Lira | prod | nº→NIP→nombre |
| Bait Prepago Parque Lira (2) | Prepago | (prepago) | texto | bot | campaña Parque Lira | prod (v2) | nº→NIP→nombre |
| Bot Prepago Parque Lira | Prepago | (prepago) | texto | bot | campaña Parque Lira | prod | nº→NIP→nombre |
| BOT prepago parque lira 2 | Prepago | (prepago) | texto | bot | campaña Parque Lira | prod (v2) | nº→NIP→nombre |
| Bot Prepago Izquierda Agentes | Prepago | (prepago) | texto | **deriva a agente** | — | prod | nº→NIP→nombre → asesor |
| Bot Mkt Guerrilla Prepago | Prepago | (prepago) | texto | bot | **Guerrilla (mkt)** | prod | nº→NIP→nombre |
| Temm Prepago Alineado | Prepago | Alineado (híbrido) | texto | bot | — | prod | revisar (prepago con orden alineado) |
| Bot Bait Biometricos | — | (pospago?) | **Biométricos** | bot | — | prod | + validación biométrica |
| Prueba biometricos | — | — | **Biométricos** | bot | — | **test** | validación biométrica |
| Bait Migraciones | — | (variante migración) | texto | bot | — | prod | revisar orden propio |
| grupoconcentra | — | genérico | texto | ? | interno (agencia) | prod? | revisar |
| BOT prueba menu | — | menú | texto | bot | — | **test** | menú |
| PRUEBA_2 | — | — | — | — | — | **test** | — |

> Notas de inferencia: la clasificación viene del **nombre real** del bot + las reglas de `FLOW_ORDERS`.
> Las celdas "revisar" (Temm Prepago Alineado, Bait Migraciones, grupoconcentra) son nombres que mezclan
> señales y conviene confirmar su orden con la muestra observada (§5).

### Lectura de patrones agregados
- **~14 bots prod activos** en 2 líneas (Prepago / Pospago) con la misma base BAIT.
- **4 bots Google** = pista de **tráfico pagado** (campañas Google) → candidatos a CTWA/CAPI.
- **2 bots Guerrilla** = tráfico de **marketing de campo**.
- **5 bots "Parque Lira"** = una **campaña/sucursal** con múltiples versiones (A/B y v2).
- **3 bots OCR** + **2 Biométricos** = dos métodos de **captura/validación de identidad**.
- **1 bot "Izquierda Agentes"** = único con **derivación a asesor** explícita en el nombre.
- **~7 bots test/prueba** que deben **excluirse** de las métricas de producción.

## 5. Cómo obtener los patrones OBSERVADOS (timing, % éxito, tipos de respuesta, tráfico real)

El cache de sesiones (`MetaAnalyticsCache.botmaker_sessions_raw_v5`) está **vacío** (se truncó). Dos vías,
ninguna ejecutada aún por decisión del usuario:

1. **Poblar el cache sin que yo toque la API:** abre el dashboard `/dashboard/botmaker/analytics` con un
   rango de días pasados (se cachean los chunks > 24h). Luego puedo leer las sesiones reales desde la DB
   y completar este mapa con datos observados — **sin llamadas en vivo de mi parte**.
2. **Correr el analizador** `_analyze_bots.mjs` (en la raíz): hace un pull acotado de `/sessions` en vivo
   (knobs `ANALYZE_DAYS`, `ANALYZE_MAXPAGES`) y reescribe este archivo con, por bot: orden real de captura
   (campo → éxito 1er intento / reintento / falla / inactividad / **Δt**), variables de almacenamiento,
   tipificaciones, % venta/fallback/agente y % de tráfico pagado (referral/ctwa). Lo corres tú cuando
   quieras (`node _analyze_bots.mjs`), ya que prefieres controlar el acceso a la API.

Referencia del modelo de datos y señales: [`botmaker-analytics-flow-map.md`](./botmaker-analytics-flow-map.md).
