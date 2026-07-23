# 01 · Usuarios y Jobs-to-be-Done

> Para quién diseñamos. Las personas son **provisionales**: derivadas del dominio (SaaS de
> agencia para marketing en Meta) y del propio producto, no de entrevistas formales todavía.
> Marcadas como 🔴 hasta validarse con investigación real. Aun así, son suficientes para
> alinear decisiones de diseño y evitar diseñar "para nadie".

---

## 1. El contexto de uso

Zefirus es **multi-tenant**: cada _workspace_ es una agencia (o marca) que gestiona **varias
cuentas de cliente** conectadas a Meta (y en roadmap, Google/TikTok). El día de trabajo típico
salta entre clientes, entre módulos y entre "revisar números" y "hacer algo con ellos".

Implicaciones de diseño transversales:
- **El selector de workspace/cliente es crítico** y siempre visible (evitar operar sobre el
  cliente equivocado — riesgo real de agencia).
- **Se trabaja en sesiones largas** frente a la pantalla → densidad, teclado, ⌘K, poco ruido.
- **Se comparte con el cliente final** → reportes white-label, aprobaciones, tono cuidado.

---

## 2. Personas

### 👤 Valeria — Community / Content Manager  🔴
**Rol:** ejecuta el contenido de 4–8 marcas. Vive en Publicación, Briefs IA, Inbox, Escucha.
**Meta:** publicar a tiempo en FB+IG, responder mensajes rápido, no equivocarse de cuenta.
**Frustraciones:** saltar entre 6 herramientas; perder DMs; rehacer briefs desde cero.
**Qué necesita de la UI:** calendario claro, cambio de cliente sin fricción, inbox unificado,
IA que le dé un primer borrador (Briefs/Nova). Rapidez > profundidad analítica.

### 👤 Marco — Media Buyer / Performance  🔴
**Rol:** gestiona pauta en Meta Ads de varias cuentas; responde por ROAS/CPA.
**Meta:** detectar campañas que se apagan (fatiga creativa), reasignar presupuesto, reportar.
**Frustraciones:** el Ads Manager nativo es lento y no cruza orgánico con pauta; exportar a mano.
**Qué necesita de la UI:** Anuncios (Impulso) con KPIs densos, reglas, fatiga, dayparting;
Centurion (MMM) y Aria (predictivo) para decidir mezcla; confianza de datos explícita.
Densidad y precisión > estética.

### 👤 Daniela — Directora de cuentas / Ops  🔴
**Rol:** coordina el equipo, responde ante el cliente, cuida SLAs y entregables.
**Meta:** que nada se caiga (tareas con SLA), aprobar antes de publicar, entregar reportes.
**Frustraciones:** falta de visibilidad del estado; aprobaciones por WhatsApp/mail sueltas.
**Qué necesita de la UI:** Resumen (Pulso), Tareas (Misiones, Kanban con SLA), Clientes,
Reportes white-label, Aprobaciones (roadmap). Visión de conjunto > detalle de cada dato.

### 👤 Sofía — Dueña de agencia / Admin  🔴
**Rol:** configura el workspace, conecta integraciones, gestiona roles y facturación.
**Meta:** onboarding rápido de un cliente nuevo, control de accesos, ROI de la herramienta.
**Qué necesita de la UI:** Integraciones, Configuración, Roles & permisos (roadmap),
Agentes (contratar IA). Poco tiempo en la app; cada visita debe ser eficiente y clara.

### 🤖 Orbi — copiloto de IA (usuario no humano, capa transversal)
No es persona pero **consume la misma información** que ellas. Orbi lee el registro de módulos
(nombre, esencia, voz) para hablar en contexto. Diseñar pensando en que la IA también "navega"
el producto: etiquetas claras, estados legibles, acciones nombradas sin ambigüedad.

---

## 3. Jobs-to-be-Done (JTBD)

Formato: _Cuando [situación], quiero [motivación], para [resultado esperado]._

| # | Job | Persona principal | Módulos que lo sirven |
|---|-----|-------------------|-----------------------|
| J1 | Cuando abro mi día, quiero ver el estado de todas mis cuentas de un vistazo, para saber a qué prestar atención primero. | Daniela | Resumen (Pulso) |
| J2 | Cuando programo contenido, quiero publicar a FB+IG a la vez con su primer comentario, para no repetir trabajo ni olvidar nada. | Valeria | Publicación (Lanzadera) |
| J3 | Cuando empiezo un contenido, quiero un primer borrador con IA, para no partir de una hoja en blanco. | Valeria | Briefs IA (Nova) |
| J4 | Cuando llega un mensaje del cliente/seguidor, quiero verlo y responderlo en un solo lugar, para no perder ninguno. | Valeria | Inbox (Señal) |
| J5 | Cuando una campaña se desgasta, quiero detectar la fatiga y actuar (reglas/presupuesto), para proteger el ROAS. | Marco | Anuncios (Impulso) |
| J6 | Cuando planifico inversión, quiero entender qué canal aporta más venta, para asignar el presupuesto con evidencia. | Marco | Centurion MMM · Aria |
| J7 | Cuando algo se menciona sobre la marca, quiero enterarme a tiempo, para responder o aprovechar. | Valeria/Daniela | Escucha (Radar) · En vivo |
| J8 | Cuando coordino al equipo, quiero saber qué está pendiente y su SLA, para que nada se caiga. | Daniela | Tareas (Misiones) |
| J9 | Cuando cierro el mes, quiero un reporte con la marca del cliente, para demostrar el valor entregado. | Daniela | Reportes (Bitácora) |
| J10 | Cuando sumo un cliente, quiero conectar sus cuentas rápido y sin duplicar, para operar el mismo día. | Sofía | Integraciones · Clientes |
| J11 | Cuando delego, quiero controlar quién ve/hace qué por cliente, para proteger accesos. | Sofía | Roles & permisos (roadmap) |
| J12 | Cuando decido qué IA usar, quiero comparar y "contratar" modelos, para potenciar el sistema. | Sofía/Marco | Agentes (Núcleo) |

Estos JTBD son la prueba de utilidad de cada módulo: **si un módulo no sirve un job, sobra;
si un job no tiene módulo, es un hueco de roadmap.** La categorización de
[02-arquitectura-informacion](02-arquitectura-informacion.md) está ordenada para seguir el
flujo natural de estos jobs.

---

## 4. Principios de diseño derivados de los usuarios

- **No hagas equivocar de cliente** → selector de workspace persistente y visible; el cliente
  activo se refleja en headers/breadcrumbs. (Sirve a todas las personas.)
- **Optimiza para la sesión larga** → teclado, ⌘K (CommandMenu), densidad, poco motion.
  (Valeria, Marco.)
- **Muestra el estado, no solo el dato** → SLAs, frescura, confianza. (Marco, Daniela.)
- **Habla como el marketer, piensa como el sistema** → etiquetas funcionales visibles;
  codenames/esencia para identidad y voz de Orbi. Ver [05-contenido-voz](05-contenido-voz.md).
