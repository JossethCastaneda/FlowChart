# Botmaker — Patrones por Bot (análisis observado)

> Muestra: últimos **7 días**, hasta 4 páginas/día. 3500 sesiones analizadas. Generado desde `/sessions` en vivo. Bot ↔ nombre vía `botmaker_meta`.

Bots con actividad en la muestra: **13** (de 25 definidos).

> **Notas y limitaciones de la muestra.**
> - **Muestra ~500 sesiones/día** (límite de página de `/sessions`; el volumen diario real puede ser mayor). Patrones representativos, no totales exactos.
> - **1330 sesiones (38%) sin `bot-change`** → no atribuibles a un bot con nombre (bucket "sin bot-change"). Atribución por evento `bot-change.currentBotId`.
> - **5 botId(s) de alto volumen sin nombre** (no están en `/intents`; probables sub-flujos o bots archivados): `T7TMM6ZTEI3HPZOSN182`, `3E387RXCFU2WQAYCIFQ8`, `8RPZYOZRT3A5CCVCDF30`, `W0QL1UUWUJP52U4NOEXD`, `JCMGIVBSZF2YMXXJJ3U5`.
> - **Tráfico pagado 0%**: no se halló señal `ctwa_clid`/`referral` en `/sessions`. Confirma la brecha de captura CTWA del flow-map (debe capturarse en el webhook de WhatsApp).
> - La **detección de captura por campo** depende del nombre de los nodos del bot; aquí se filtró a campos de datos telco reales (NIP, número, nombre, fecha/estado nac., correo…), separando los nodos de control.

## Resumen

| Bot | Sesiones | Venta% | Fallback% | Agente% | Tráfico pagado% | Msgs U/B/A |
|---|--:|--:|--:|--:|--:|---|
| (sin bot-change) | 1330 | 9.9 | 24.1 | 52.3 | 0 | 3688/5418/1909 |
| T7TMM6ZTEI3HPZOSN182 | 439 | 0 | 0 | 0.2 | 0 | 578/440/0 |
| Bot Prepago Parque Lira | 354 | 23.2 | 84.2 | 82.8 | 0 | 1746/2991/971 |
| Bait Pospago OCR | 339 | 10.3 | 0 | 13.3 | 0 | 1611/4520/150 |
| Google Pospago Bait OCR | 265 | 21.1 | 0 | 19.6 | 0 | 1512/3358/215 |
| 3E387RXCFU2WQAYCIFQ8 | 200 | 0 | 0 | 0 | 0 | 14/200/0 |
| 8RPZYOZRT3A5CCVCDF30 | 178 | 9 | 100 | 84.8 | 0 | 522/572/635 |
| W0QL1UUWUJP52U4NOEXD | 141 | 19.1 | 96.5 | 97.9 | 0 | 987/204/1631 |
| JCMGIVBSZF2YMXXJJ3U5 | 108 | 5.6 | 99.1 | 69.4 | 0 | 347/182/308 |
| Bait  Pospago Alineado | 105 | 16.2 | 0 | 82.9 | 0 | 556/1179/192 |
| Bait Prepago Con Dudas | 38 | 2.6 | 63.2 | 15.8 | 0 | 256/634/16 |
| Temm Prepago Alineado | 1 | 0 | 0 | 0 | 0 | 1/1/0 |
| Bait Prepago Parque Lira (2) | 1 | 100 | 0 | 0 | 0 | 0/6/0 |
| Google Bait Pospago OCR  | 1 | 0 | 0 | 0 | 0 | 1/3/0 |

---

## (sin bot-change)

- Sesiones: **1330** · Venta: 9.9% · Fallback: 24.1% · Agente: 52.3% · 1ª respuesta: 12s
- Canales: whatsapp (426), whatsapp (173), whatsapp (170), whatsapp (149), whatsapp (135), whatsapp (81), Cambia fácil (65), Centro de Portabilidad (52), whatsapp (46), grupocon (18), Cobertura Ideal (5), Cambia fácil (4), Navega Más (2), Centro de Portabilidad (2), whatsapp (1), Centro de Portabilidad (1)
- Tráfico pagado (referral/ctwa/var fuente): 0%

**Orden de captura de datos** (campo → éxito 1er intento / con reintento / falla / inactividad / Δt promedio):

| # | Campo | 1er int. | reintento | falla | inactiv. | Δt (s) |
|--:|---|--:|--:|--:|--:|--:|
| 1 | NIP | 0 | 0 | 21 | 42 | — |
| 2 | Fecha nacimiento | 0 | 0 | 4 | 4 | — |

_Nodos de control/lógica del flujo: 11 · envía a **Intelix** (CRM) tras capturar._

**Tipificaciones de cierre**: Dejo_de_contestar (105), ya_es_bait (69), atención_a_clientes (57), No_contesta (56), Ya_es_bait (49), Atencion_al_cliente (36), Venta_exitosa (31), no_viable (28), Venta_Bot_Pospago (26), venta_cliente (26)

---

## T7TMM6ZTEI3HPZOSN182

- Sesiones: **439** · Venta: 0% · Fallback: 0% · Agente: 0.2% · 1ª respuesta: 0s
- Canales: Centro de Portabilidad (251), Cambia fácil (143), Navega Más (24), Cobertura Ideal (21)
- Tráfico pagado (referral/ctwa/var fuente): 0%

---

## Bot Prepago Parque Lira

- Sesiones: **354** · Venta: 23.2% · Fallback: 84.2% · Agente: 82.8% · 1ª respuesta: 3s
- Canales: whatsapp (328), Cambia fácil (26)
- Tráfico pagado (referral/ctwa/var fuente): 0%

**Orden de captura de datos** (campo → éxito 1er intento / con reintento / falla / inactividad / Δt promedio):

| # | Campo | 1er int. | reintento | falla | inactiv. | Δt (s) |
|--:|---|--:|--:|--:|--:|--:|
| 1 | NIP | 0 | 0 | 37 | 72 | — |

_Nodos de control/lógica del flujo: 9 · envía a **Intelix** (CRM) tras capturar._

**Tipificaciones de cierre**: saludos_y_envio_oferta (119), ya_es_bait (48), atención_a_clientes (30), propecto_a_venta (25), venta_cliente (24), no_viable (17), no_interesado (15), gestión_por_llamada (1), venta_referido (1)

---

## Bait Pospago OCR

- Sesiones: **339** · Venta: 10.3% · Fallback: 0% · Agente: 13.3% · 1ª respuesta: 0s
- Canales: whatsapp (337), Cobertura Ideal (1), Navega Más (1)
- Tráfico pagado (referral/ctwa/var fuente): 0%

**Orden de captura de datos** (campo → éxito 1er intento / con reintento / falla / inactividad / Δt promedio):

| # | Campo | 1er int. | reintento | falla | inactiv. | Δt (s) |
|--:|---|--:|--:|--:|--:|--:|
| 1 | NIP | 0 | 0 | 18 | 51 | — |
| 2 | Fecha nacimiento | 0 | 0 | 7 | 3 | — |

_Nodos de control/lógica del flujo: 7 · envía a **Intelix** (CRM) tras capturar._

**Tipificaciones de cierre**: No_contesta (31), Error_ICC (4), No_le_interesa_activar (4), Venta_Bot_Pospago (4), Activación (2)

---

## Google Pospago Bait OCR

- Sesiones: **265** · Venta: 21.1% · Fallback: 0% · Agente: 19.6% · 1ª respuesta: 0s
- Canales: whatsapp (265)
- Tráfico pagado (referral/ctwa/var fuente): 0%

**Orden de captura de datos** (campo → éxito 1er intento / con reintento / falla / inactividad / Δt promedio):

| # | Campo | 1er int. | reintento | falla | inactiv. | Δt (s) |
|--:|---|--:|--:|--:|--:|--:|
| 1 | NIP | 0 | 0 | 13 | 39 | — |
| 2 | Fecha nacimiento | 0 | 0 | 0 | 2 | — |

_Nodos de control/lógica del flujo: 8 · envía a **Intelix** (CRM) tras capturar._

**Tipificaciones de cierre**: No_contesta (25), Venta_Bot_Pospago (12), Error_ICC (9), No_le_interesa_activar (2), Activación (2)

---

## 3E387RXCFU2WQAYCIFQ8

- Sesiones: **200** · Venta: 0% · Fallback: 0% · Agente: 0% · 1ª respuesta: —s
- Canales: whatsapp (200)
- Tráfico pagado (referral/ctwa/var fuente): 0%

---

## 8RPZYOZRT3A5CCVCDF30

- Sesiones: **178** · Venta: 9% · Fallback: 100% · Agente: 84.8% · 1ª respuesta: 0s
- Canales: whatsapp (178)
- Tráfico pagado (referral/ctwa/var fuente): 0%

**Tipificaciones de cierre**: Dejo_de_contestar (77), Ya_es_bait (27), Venta (16), No_le_interesa (11), Atencion_al_cliente (10), Agenda (4), Gestión_por_llamada (2), Falta_NIP (2), Menor_de_edad (1)

---

## W0QL1UUWUJP52U4NOEXD

- Sesiones: **141** · Venta: 19.1% · Fallback: 96.5% · Agente: 97.9% · 1ª respuesta: 0s
- Canales: whatsapp (141)
- Tráfico pagado (referral/ctwa/var fuente): 0%

**Tipificaciones de cierre**: Venta_exitosa (27), Abandona_conversacion (17), Ya_es_cliente_movistar (16), Busca_atencion_al_cliente (3), Cliente_extrajero (1), No_le_interesa_ (1)

---

## JCMGIVBSZF2YMXXJJ3U5

- Sesiones: **108** · Venta: 5.6% · Fallback: 99.1% · Agente: 69.4% · 1ª respuesta: 0s
- Canales: whatsapp (108)
- Tráfico pagado (referral/ctwa/var fuente): 0%

**Tipificaciones de cierre**: Dejo_de_contestar (37), Ya_es_bait (16), Atencion_al_cliente (8), Venta (5), No_le_interesa (4), venta_cliente (1), Gestión_por_llamada (1), Agenda (1)

---

## Bait  Pospago Alineado

- Sesiones: **105** · Venta: 16.2% · Fallback: 0% · Agente: 82.9% · 1ª respuesta: 0s
- Canales: whatsapp (105)
- Tráfico pagado (referral/ctwa/var fuente): 0%

**Orden de captura de datos** (campo → éxito 1er intento / con reintento / falla / inactividad / Δt promedio):

| # | Campo | 1er int. | reintento | falla | inactiv. | Δt (s) |
|--:|---|--:|--:|--:|--:|--:|
| 1 | Fecha nacimiento | 0 | 0 | 1 | 0 | — |

_Nodos de control/lógica del flujo: 3._

**Tipificaciones de cierre**: Dejo_de_contestar (59), No_le_interesa (4), Venta (4), No_contesta (3), No_le_interesa_activar (2), Venta_Bot_Pospago (2), Ya_es_bait (1), Activación (1), Error_ICC (1)

---

## Bait Prepago Con Dudas

- Sesiones: **38** · Venta: 2.6% · Fallback: 63.2% · Agente: 15.8% · 1ª respuesta: 1s
- Canales: Centro de Portabilidad (36), Distribuidor Autorizado (1), instagram_media (1)
- Tráfico pagado (referral/ctwa/var fuente): 0%

**Orden de captura de datos** (campo → éxito 1er intento / con reintento / falla / inactividad / Δt promedio):

| # | Campo | 1er int. | reintento | falla | inactiv. | Δt (s) |
|--:|---|--:|--:|--:|--:|--:|
| 1 | NIP | 0 | 0 | 5 | 9 | — |

_Nodos de control/lógica del flujo: 6 · envía a **Intelix** (CRM) tras capturar._

**Tipificaciones de cierre**: No_contesta (4), Error_ICC (1), No_le_interesa_activar (1)

---

## Temm Prepago Alineado

- Sesiones: **1** · Venta: 0% · Fallback: 0% · Agente: 0% · 1ª respuesta: 0s
- Canales: whatsapp (1)
- Tráfico pagado (referral/ctwa/var fuente): 0%

---

## Bait Prepago Parque Lira (2)

- Sesiones: **1** · Venta: 100% · Fallback: 0% · Agente: 0% · 1ª respuesta: —s
- Canales: Test (1)
- Tráfico pagado (referral/ctwa/var fuente): 0%

---

## Google Bait Pospago OCR 

- Sesiones: **1** · Venta: 0% · Fallback: 0% · Agente: 0% · 1ª respuesta: 0s
- Canales: whatsapp (1)
- Tráfico pagado (referral/ctwa/var fuente): 0%

---

## Bots definidos SIN actividad en la muestra (17)

- BOT prueba menu pospago
- grupoconcentra
- Bait Pospago Simplificado
- Bot Mkt Guerrila Pospago
- Bot Bait Biometricos
- Prueba biometricos
- Bait Prepago Sin Dudas
- Pospago Cliente (test)
- BOT prepago parque lira 2
- Bot Prepago Izquierda Agentes
- Bait Pospago Google 2
- Bait Migraciones
- PRUEBA_2 
- Bait Pospago Google 3
- Bait Prepago Parque Lira
- BOT prueba menu
- Bot Mkt Guerrilla Prepago
