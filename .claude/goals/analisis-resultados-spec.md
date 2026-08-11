# Especificación completa — Módulo SaaS: Análisis de Resultados

## 1. Contexto general

Estamos construyendo o extendiendo un SaaS B2B para empresas que usan bots conversacionales en WhatsApp, webchat, redes sociales y otros canales.

El SaaS debe incluir un módulo llamado:

Análisis de Resultados

El objetivo del módulo es conectar plataformas de bots conversacionales, extraer datos, normalizarlos, calcular KPIs y visualizar resultados ejecutivos, operativos y de mejora continua.

Las primeras plataformas soportadas serán:

1. Cari AI
2. Botmaker

El diseño debe permitir agregar más proveedores en el futuro sin rehacer dashboards ni lógica de negocio.

La arquitectura debe ser multi-tenant, segura, auditable, escalable y preparada para datos históricos e incrementales.

## 2. Principio central de medición

No medir solamente volumen.

El módulo debe medir:

- Resolución real
- Automatización útil
- Experiencia del usuario
- Eficiencia operativa
- Calidad del bot
- Calidad de datos
- Campañas
- Servicios o transacciones
- Funnels
- ROI
- Ahorro operativo
- Rendimiento de agentes
- Rendimiento por canal
- Rendimiento por proveedor

Regla crítica:

Una conversación bot-only NO significa automáticamente que fue resuelta.

Debe existir una señal explícita o configurable de éxito para clasificarla como resuelta por bot.

## 3. Definición obligatoria de conversación resuelta por bot

Una conversación solo puede clasificarse como resolved_by = bot si cumple al menos una de estas condiciones:

1. Existe un evento explícito de éxito.
2. Existe un servicio o transacción completada.
3. Existe una variable de outcome exitoso.
4. Existe cierre positivo.
5. Existe confirmación del usuario.
6. Existe encuesta positiva asociada.
7. Existe una regla de negocio configurada por el tenant.
8. Existe mapeo explícito del proveedor a outcome exitoso.

Si no existe señal suficiente, clasificar como:

- unclassified
- abandoned
- transferred
- not_resolved
- error
- requires_review

Bot-only debe existir como métrica separada.

## 4. Arquitectura esperada

Usar arquitectura por adaptadores.

No acoplar dashboards directamente al formato de Cari AI o Botmaker.

Flujo:

External Provider
→ Provider Adapter
→ Raw Data Layer
→ Normalization Layer
→ Outcome Rules Engine
→ KPI Engine
→ Aggregation Layer
→ Internal Analytics API
→ Dashboards
→ Alerts / Exports / Audit

Crear interfaz común:

AnalyticsProviderAdapter

Métodos mínimos:

- testConnection()
- getProviderMetadata()
- getAvailableReports()
- syncConversations(startDate, endDate, options)
- syncMessages(startDate, endDate, options)
- syncAgents(startDate, endDate, options)
- syncServices(startDate, endDate, options)
- syncCampaigns(startDate, endDate, options)
- syncClients(startDate, endDate, options)
- syncFunnels(startDate, endDate, options)
- syncCustomReports(startDate, endDate, options)
- normalizeRawData(rawPayload, reportType)
- validateCredentials()
- getSyncStatus()
- mapProviderStatus()
- mapProviderOutcome()
- mapProviderChannel()
- mapProviderAgent()
- mapProviderTags()

Crear adaptadores iniciales:

- CariAiAnalyticsAdapter
- BotmakerAnalyticsAdapter

Los adaptadores deben devolver datos normalizados hacia el modelo interno.

## 5. Configuraciones globales del módulo

Crear pantalla o sección de configuración para:

### 5.1 Configuración general

- Nombre del módulo
- Activar/desactivar módulo por tenant
- Zona horaria del tenant
- Moneda principal
- Idioma
- Fecha inicial de análisis
- Rango por defecto del dashboard
- Periodo de comparación por defecto
- Hora de corte diario
- Retención de datos
- Retención de raw payloads
- Nivel de anonimización
- Modo demo con datos mock
- Modo producción
- Modo solo lectura
- Habilitar exportaciones
- Habilitar alertas
- Habilitar ROI
- Habilitar datos sensibles con permisos

### 5.2 Configuración de privacidad

- Hash de teléfono
- Hash de email
- Hash de identificación
- Enmascaramiento parcial
- Campo visible solo con permiso conversations.view_sensitive
- Redacción de mensajes sensibles
- Exclusión de PII en exportaciones
- Políticas de retención
- Registro de acceso a datos sensibles
- Control por rol
- Control por tenant
- Control por usuario

### 5.3 Configuración de roles

Roles sugeridos:

- Owner
- Admin
- Supervisor
- Analyst
- Agent
- Viewer

Permisos sugeridos:

- analytics.view
- analytics.configure
- analytics.export
- analytics.view_roi
- analytics.view_quality
- analytics.view_operations
- integrations.create
- integrations.update
- integrations.delete
- integrations.test
- integrations.sync
- conversations.view
- conversations.view_sensitive
- agents.view
- campaigns.view
- services.view
- funnels.view
- alerts.view
- alerts.manage
- audit.view
- data_quality.view
- kpi_targets.manage
- outcome_rules.manage

## 6. Configuración de integraciones

Crear vista:

/analisis-resultados/configuracion/integraciones

Debe permitir:

- Crear integración
- Editar integración
- Pausar integración
- Eliminar integración
- Probar conexión
- Ejecutar sync manual
- Ver último sync
- Ver historial de syncs
- Ver errores técnicos
- Ver reportes disponibles
- Configurar frecuencia
- Configurar backfill
- Configurar mapeos
- Configurar credenciales
- Configurar límites
- Configurar webhooks si aplica

Campos de integración:

- id
- tenant_id
- provider
- name
- status
- environment
- provider_account_id
- base_url
- auth_type
- encrypted_credentials
- credentials_last_rotated_at
- timezone
- sync_enabled
- sync_frequency
- sync_window
- backfill_start_date
- last_successful_sync_at
- last_failed_sync_at
- last_error_code
- last_error_message
- rate_limit_per_minute
- request_timeout_seconds
- retry_attempts
- retry_backoff_seconds
- raw_payload_retention_days
- pii_policy
- enabled_report_types
- provider_metadata
- created_at
- updated_at

Estados:

- active
- paused
- invalid_credentials
- error
- syncing
- disabled

Ambientes:

- sandbox
- production

Tipos de autenticación:

- bearer_token
- basic_auth
- api_key
- custom_header
- oauth
- credential_string
- multiple_credentials

Las credenciales nunca deben guardarse en texto plano.

## 7. Configuración específica Cari AI

Crear soporte para los grupos:

- ReportesPersonalizados
- ReportesAgentes
- ReportesConversaciones
- ReportesServicio
- ReportesClientes

Cada grupo puede tener credencial propia.

Configuraciones Cari AI:

- base_url
- doc_url
- credential_reportes_personalizados
- credential_reportes_agentes
- credential_reportes_conversaciones
- credential_reportes_servicio
- credential_reportes_clientes
- auth_mode por reporte
- headers por reporte
- query params por reporte
- date field por reporte
- pagination mode
- page size
- max pages per sync
- timeout
- retries
- report enabled/disabled
- mapping profile
- custom report IDs
- export format esperado
- JSON/CSV/XLSX parser
- delimiter si CSV
- timezone
- date format
- field aliases
- null handling
- error handling

No inventar endpoints no confirmados.

Cuando falte endpoint real, crear mock adapter y TODO claro:

TODO:
- Confirmar método HTTP
- Confirmar URL
- Confirmar headers
- Confirmar parámetros de fecha
- Confirmar paginación
- Confirmar formato de respuesta
- Confirmar campos obligatorios
- Confirmar códigos de error

## 8. Configuración específica Botmaker

Soportar:

- API
- Webhooks
- Reportes de sesiones
- Reportes de usuarios
- Reportes de agentes
- Reportes de funnels
- Reportes de campañas
- Variables
- Tags
- Intents
- Topics
- Estados de mensajes
- Handoffs
- Templates
- Notifications

Configuraciones Botmaker:

- access_token
- base_url
- bot_id
- channel IDs
- webhook secret
- sync sessions enabled
- sync messages enabled
- sync agents enabled
- sync campaigns enabled
- sync funnels enabled
- sync tags enabled
- sync variables enabled
- sync topics enabled
- sync intents enabled
- sync webhooks enabled
- variable mappings
- tag mappings
- intent mappings
- topic mappings
- outcome mappings
- funnel mappings
- campaign mappings
- date range config
- pagination config
- rate limits
- retry config
- webhook event deduplication
- message status mapping

## 9. Modelo de datos requerido

Todas las tablas deben tener:

- id
- tenant_id
- created_at
- updated_at

Cuando aplique:

- provider
- provider_account_id
- provider_external_id
- source_payload_id
- synced_at
- deleted_at

Tablas mínimas:

- tenants
- users
- roles
- permissions
- user_roles
- integrations
- integration_credentials
- integration_report_configs
- provider_field_mappings
- sync_jobs
- sync_job_logs
- raw_provider_events
- normalized_conversations
- normalized_messages
- normalized_customers
- normalized_agents
- normalized_queues
- normalized_skills
- normalized_tags
- normalized_services
- normalized_campaigns
- normalized_funnels
- normalized_funnel_steps
- normalized_bot_events
- normalized_handoffs
- normalized_surveys
- normalized_integration_errors
- outcome_rules
- kpi_definitions
- kpi_targets
- analytics_daily_metrics
- analytics_period_summaries
- analytics_alerts
- analytics_exports
- data_quality_issues
- audit_logs

## 10. Campos mínimos normalized_conversations

Incluir:

- id
- tenant_id
- provider
- provider_conversation_id
- provider_customer_id
- channel
- bot_id
- bot_name
- bot_version
- customer_id
- customer_name_hash
- customer_identifier_hash
- customer_phone_hash
- customer_email_hash
- conversation_started_at
- conversation_ended_at
- first_user_message_at
- first_bot_response_at
- first_agent_response_at
- assigned_to_agent_at
- closed_at
- status
- outcome
- outcome_reason
- resolved_by
- was_bot_only
- was_handoff
- handoff_reason
- queue_id
- queue_name
- skill_id
- skill_name
- agent_id
- agent_name
- total_user_messages
- total_bot_messages
- total_agent_messages
- total_system_messages
- total_messages
- total_fallbacks
- total_errors
- total_transfers
- csat_score
- nps_score
- ces_score
- sentiment
- tags
- services_used
- campaign_id
- external_case_id
- duration_seconds
- waiting_time_seconds
- first_response_time_seconds
- average_response_time_seconds
- handle_time_seconds
- abandoned
- abandonment_step
- requires_review
- raw_payload_reference
- synced_at

## 11. Campos mínimos normalized_messages

Incluir:

- id
- tenant_id
- provider
- provider_message_id
- provider_conversation_id
- conversation_id
- sender_type
- sender_id
- sender_name
- channel
- message_type
- message_text
- message_text_hash
- intent
- topic
- confidence
- is_fallback
- is_error
- is_template
- template_name
- campaign_id
- status
- sent_at
- delivered_at
- read_at
- replied_at
- metadata
- raw_payload_reference

sender_type:

- user
- bot
- agent
- system
- integration

## 12. Configuración de KPIs

Crear diccionario configurable de KPIs.

Campos:

- kpi_key
- name
- description
- formula
- numerator
- denominator
- source_tables
- provider_mapping
- dimensions
- frequency
- owner
- target_value
- warning_threshold
- critical_threshold
- direction
- visualization_type
- enabled
- tenant_override_allowed

direction:

- higher_is_better
- lower_is_better
- neutral

Frecuencias:

- realtime
- hourly
- daily
- weekly
- monthly

## 13. KPIs obligatorios

### Volumen

- Conversaciones totales
- Usuarios únicos
- Conversaciones por canal
- Conversaciones por plataforma
- Conversaciones por bot
- Nuevos vs recurrentes
- Mensajes totales
- Promedio de mensajes por conversación

### Automatización

- Contención real
- Bot-only
- Resolución por bot
- Escalamiento a agente
- Fallback rate
- Task completion
- Conversaciones sin clasificar
- Conversaciones no resueltas
- Conversaciones con error
- Conversaciones que requieren revisión

### Experiencia

- CSAT
- NPS
- CES
- Tasa de abandono
- Recontacto por mismo motivo
- Sentimiento
- Conversaciones negativas
- Conversaciones sin respuesta útil

### Operación

- FRT
- AQT
- ASA
- AHT
- ART
- Tiempo promedio de cierre
- Conversaciones por agente
- Conversaciones por cola
- Transferencias
- Timeouts
- Conversaciones pendientes
- Conversaciones en curso
- SLA cumplido
- SLA incumplido

### Campañas

- Enviadas
- Entregadas
- Leídas
- Respondidas
- Tasa de entrega
- Tasa de lectura
- Tasa de respuesta
- Conversión por campaña
- Errores de envío
- Costo por conversación iniciada

### Servicios

- Servicios iniciados
- Servicios completados
- Servicios fallidos
- Servicios por canal
- Servicios por bot
- Conversión por servicio
- Error rate por servicio
- Tiempo promedio para completar servicio

### Calidad del bot

- Intent recognition rate
- Confidence promedio
- Fallback rate
- No answer rate
- Multiple answer rate
- Handoffs por mala comprensión
- Top frases no entendidas
- Top intents con bajo CSAT
- Top flujos con abandono
- Top errores de integración

### ROI

- Conversaciones automatizadas exitosas
- Tiempo humano ahorrado
- Costo evitado
- Costo por conversación
- Costo por resolución automatizada
- Ingreso generado
- ROI estimado

## 14. Fórmulas críticas

contencion_real =
conversaciones_resueltas_por_bot / conversaciones_cerradas

bot_only =
conversaciones_sin_agente / conversaciones_totales

resolucion_por_bot =
conversaciones_con_outcome_exitoso_y_resolved_by_bot / conversaciones_elegibles

escalamiento =
conversaciones_con_handoff / conversaciones_totales

fallback_rate =
fallbacks / mensajes_de_usuario

task_completion =
servicios_completados / servicios_iniciados

csat =
respuestas_csat_positivas / total_respuestas_csat

nps =
porcentaje_promotores - porcentaje_detractores

abandono =
conversaciones_abandonadas / conversaciones_totales

frt =
first_response_at - first_user_message_at

aht =
closed_at - assigned_to_agent_at

horas_ahorradas =
conversaciones_resueltas_por_bot * AHT_humano_promedio / 3600

costo_evitado =
horas_ahorradas * costo_hora_agente

roi =
(costo_evitado + ingreso_incremental - costo_total_bot) / costo_total_bot

Manejar denominador cero sin romper UI.

## 15. Reglas de outcome configurables

Crear UI y backend para reglas por tenant.

Ejemplos:

- Si service.status = completed, outcome = resolved, resolved_by = bot.
- Si handoff = true y agent.closed = true, outcome = resolved, resolved_by = mixed o agent.
- Si fallback_count >= X, outcome = not_resolved.
- Si abandoned = true y no hay goal_completed, outcome = abandoned.
- Si csat_score <= X, requires_review = true.
- Si integration_error = true, outcome = error.
- Si tag contiene venta_exitosa, outcome = resolved.
- Si variable payment_status = paid, outcome = resolved.
- Si campaign replied pero no conversion, outcome = engaged.
- Si no hay actividad por X minutos, outcome = abandoned.

Campos de outcome_rules:

- id
- tenant_id
- name
- description
- priority
- enabled
- conditions_json
- actions_json
- applies_to_provider
- applies_to_bot
- applies_to_channel
- created_by
- updated_by
- created_at
- updated_at

Reglas deben ejecutarse en orden de prioridad.

Registrar qué regla clasificó cada conversación.

## 16. Dashboards requeridos

Crear navegación:

- Resumen
- Operación
- Conversaciones
- Agentes
- Campañas
- Servicios
- Funnels
- Calidad del bot
- ROI
- Integraciones
- Calidad de datos
- Auditoría

## 17. Filtros globales

Todos los dashboards deben aceptar:

- start_date
- end_date
- provider
- bot_id
- channel
- campaign_id
- service_id
- agent_id
- queue_id
- skill_id
- tag
- outcome
- resolved_by
- status
- timezone
- compare_to_previous_period

Tablas deben aceptar:

- page
- page_size
- sort_by
- sort_direction
- search

## 18. Dashboard Resumen

Ruta:

/analisis-resultados

Cards:

- Conversaciones totales
- Contención real
- Bot-only
- Resolución por bot
- Escalamiento
- CSAT
- FRT
- AHT
- Servicios completados
- ROI estimado

Gráficas:

- Evolución diaria de conversaciones
- Evolución de contención real
- Evolución de CSAT
- Conversaciones por canal
- Conversaciones por plataforma
- Top intents o servicios
- Funnel de conversión
- Bot vs agente
- Handoffs por motivo
- Fallbacks por intent

Debe incluir comparación Cari AI vs Botmaker.

## 19. Dashboard Operación

Ruta:

/analisis-resultados/operacion

Incluir:

- Conversaciones pendientes
- Conversaciones en curso
- Conversaciones cerradas
- Conversaciones abandonadas
- Colas con mayor espera
- Agentes activos
- Agentes inactivos
- FRT por cola
- AHT por agente
- ASA por cola
- SLA cumplido
- SLA incumplido
- Transferencias
- Timeouts
- Alertas operativas

## 20. Vista Conversaciones

Ruta:

/analisis-resultados/conversaciones

Tabla:

- Fecha
- Plataforma
- Canal
- Bot
- Cliente anonimizado
- Estado
- Outcome
- Resuelto por
- Bot-only
- Handoff
- Motivo handoff
- Agente
- Cola
- Duración
- FRT
- AHT
- CSAT
- Tags
- Servicios
- Campaña asociada

Detalle:

- Timeline
- Mensajes
- Eventos del bot
- Intents
- Variables relevantes
- Tags
- Fallbacks
- Transferencias
- Agente asignado
- Resultado final
- Regla de outcome aplicada
- Encuesta
- Errores de integración
- Raw payload si permiso admin

## 21. Vista Agentes

Ruta:

/analisis-resultados/agentes

Incluir:

- Ranking de agentes
- Conversaciones atendidas
- Conversaciones cerradas
- FRT
- AHT
- ASA
- CSAT
- Transferencias
- Timeouts
- Estados
- Tiempo conectado
- Tiempo en pausa
- Conversaciones por cola
- Conversaciones por skill

## 22. Vista Campañas

Ruta:

/analisis-resultados/campanas

Incluir:

- Nombre de campaña
- Template / HSM
- Plataforma
- Canal
- Enviadas
- Entregadas
- Leídas
- Respondidas
- Tasa de entrega
- Tasa de lectura
- Tasa de respuesta
- Conversaciones iniciadas
- Conversiones
- Errores
- Motivos de error
- ROI de campaña

## 23. Vista Servicios

Ruta:

/analisis-resultados/servicios

Incluir:

- Servicio
- Servicio padre
- Bot
- Canal
- Plataforma
- Iniciados
- Completados
- Fallidos
- Tasa de conversión
- Tiempo promedio de finalización
- Errores
- Conversaciones asociadas
- CSAT por servicio
- Escalamientos por servicio

## 24. Vista Funnels

Ruta:

/analisis-resultados/funnels

Permitir configurar funnels.

Campos funnel:

- name
- description
- provider
- bot
- channel
- steps
- conversion goal
- active

Cada step:

- name
- event_type
- condition
- order
- required
- provider_mapping

Mostrar:

- Usuarios por paso
- Conversaciones por paso
- Tasa de conversión por paso
- Drop-off
- Tiempo promedio entre pasos
- Canal
- Plataforma
- Bot
- Comparativo entre periodos

## 25. Vista Calidad del bot

Ruta:

/analisis-resultados/calidad-bot

Incluir:

- Fallback rate
- Frases no entendidas
- Intents con menor precisión
- Intents con mayor escalamiento
- Intents con menor CSAT
- Preguntas frecuentes sin respuesta
- Respuestas múltiples
- Conversaciones para revisión
- Errores de integración
- Recomendaciones automáticas

Recomendaciones posibles:

- Crear nuevo intent
- Mejorar entrenamiento
- Ajustar prompt
- Agregar respuesta a base de conocimiento
- Ajustar handoff
- Corregir flujo
- Revisar integración
- Revisar template
- Revisar reglas de outcome

## 26. Vista ROI

Ruta:

/analisis-resultados/roi

Configuraciones:

- costo_hora_agente
- AHT_humano_promedio
- costo_mensual_plataforma
- costo_mensual_operacion_bot
- costo_mensual_desarrollo
- costo_por_mensaje
- ingreso_promedio_por_conversion
- conversion_value_source
- moneda
- periodo

Mostrar:

- Conversaciones automatizadas exitosas
- Horas ahorradas
- Costo evitado
- Costo total bot
- Ingreso incremental
- ROI
- Payback estimado
- Costo por conversación
- Costo por resolución automatizada
- Comparación por plataforma
- Comparación por bot
- Comparación por canal

## 27. Calidad de datos

Crear panel:

/analisis-resultados/calidad-datos

Validaciones:

- Conversaciones sin fecha de inicio
- Conversaciones sin ID externo
- Mensajes sin conversación asociada
- Agentes desconocidos
- Canales desconocidos
- Estados no mapeados
- Outcomes no clasificados
- Duplicados
- Registros sin tenant_id
- Valores negativos de duración
- FRT mayor que duración total
- AHT mayor que duración total
- Conversaciones cerradas sin outcome
- Servicios completados sin conversación
- Datos PII sin anonimizar
- Payloads no parseables

Crear tabla data_quality_issues.

## 28. Sincronización

Crear jobs:

- Sync manual
- Sync programado
- Sync incremental
- Backfill histórico
- Retry de sync fallido

sync_jobs:

- tenant_id
- integration_id
- provider
- report_type
- start_date
- end_date
- status
- records_requested
- records_received
- records_inserted
- records_updated
- records_failed
- started_at
- finished_at
- duration_seconds
- error_message
- error_code
- retry_count
- watermark_before
- watermark_after

Estados:

- pending
- running
- completed
- completed_with_warnings
- failed
- cancelled

Usar watermark:

- last_successful_sync_at
- last_provider_cursor
- last_record_timestamp

Upserts idempotentes.

No duplicar conversaciones ni mensajes.

## 29. Raw data

Guardar raw payloads.

Objetivo:

- Auditoría
- Debugging
- Remapeo futuro
- Validación de métricas

Dashboards no deben consultar raw directamente.

raw_provider_events:

- id
- tenant_id
- integration_id
- provider
- report_type
- provider_external_id
- payload
- payload_hash
- received_at
- processed_at
- processing_status
- processing_error

## 30. Alertas

Crear sistema de alertas configurables.

Ejemplos:

- Fallback rate mayor a X
- CSAT menor a X
- FRT mayor a X
- AHT mayor a X
- Cola con espera mayor a X
- Campaña con error rate mayor a X
- Sync fallido
- API sin conexión
- Caída brusca de volumen
- Aumento anormal de handoffs
- Servicio crítico con errores
- Data quality issue crítico

analytics_alerts:

- tenant_id
- metric
- condition
- threshold
- severity
- status
- created_at
- resolved_at

Severidad:

- info
- warning
- critical

## 31. Exportaciones

Permitir:

- CSV
- XLSX
- JSON

Exportaciones:

- Conversaciones
- KPIs
- Agentes
- Campañas
- Servicios
- Fallbacks
- Funnels
- ROI
- Calidad de datos

Toda exportación debe generar audit_log.

## 32. API interna requerida

Crear o adaptar endpoints:

GET /api/analytics/overview
GET /api/analytics/operations
GET /api/analytics/conversations
GET /api/analytics/conversations/:id
GET /api/analytics/agents
GET /api/analytics/campaigns
GET /api/analytics/services
GET /api/analytics/funnels
GET /api/analytics/bot-quality
GET /api/analytics/roi
GET /api/analytics/alerts
GET /api/analytics/data-quality
GET /api/analytics/audit-logs
GET /api/analytics/export

POST /api/integrations
GET /api/integrations
GET /api/integrations/:id
PATCH /api/integrations/:id
DELETE /api/integrations/:id
POST /api/integrations/:id/test
POST /api/integrations/:id/sync
GET /api/integrations/:id/sync-jobs

POST /api/analytics/outcome-rules
GET /api/analytics/outcome-rules
PATCH /api/analytics/outcome-rules/:id
DELETE /api/analytics/outcome-rules/:id

POST /api/analytics/kpi-targets
GET /api/analytics/kpi-targets
PATCH /api/analytics/kpi-targets/:id

Validar:

- tenant_id
- autenticación
- autorización
- permisos
- filtros
- paginación
- rate limiting
- sanitización

## 33. Agregados diarios

Crear analytics_daily_metrics:

- tenant_id
- date
- provider
- bot_id
- channel
- metric_key
- metric_value
- numerator
- denominator
- dimensions
- calculated_at

Dashboards deben consultar agregados cuando sea posible.

Para datos recientes, combinar agregados + datos del día.

## 34. UI/UX

Idioma principal: español.

Componentes:

- KPI cards
- Line charts
- Bar charts
- Donut charts
- Funnel chart
- Date range picker
- Global filters
- Advanced filters
- Comparison selector
- Provider selector
- Bot selector
- Empty states
- Loading states
- Error states
- Tooltips
- Badges
- Semáforos
- Detail drawer
- Config modals
- Export button
- Sync status indicator
- Data freshness indicator

Cada KPI debe tener tooltip:

- Definición
- Fórmula
- Fuente
- Última actualización
- Meta
- Semáforo

## 35. Semáforos configurables

Ejemplos default:

Contención real:
- verde >= 70
- amarillo 50-69
- rojo < 50

Fallback rate:
- verde <= 10
- amarillo 10-20
- rojo > 20

CSAT:
- verde >= 4.2
- amarillo 3.8-4.19
- rojo < 3.8

FRT:
- verde <= 30s
- amarillo 31-120s
- rojo > 120s

Deben ser configurables por tenant.

## 36. Seguridad

Implementar:

- Multi-tenancy estricto
- tenant_id obligatorio
- Row-level security si aplica
- Cifrado de credenciales
- No credenciales en frontend
- No credenciales en logs
- Hash de identificadores sensibles
- Enmascaramiento de PII
- RBAC
- Audit logs
- Exportación controlada
- Retención configurable
- Validación de inputs
- Rate limiting
- CSRF si aplica
- Protección contra injection
- Secret manager o cifrado fuerte

## 37. Tests mínimos

Crear tests unitarios para:

- Contención real
- Bot-only
- Resolución por bot
- Escalamiento
- Fallback rate
- CSAT
- NPS
- FRT
- AQT
- ASA
- AHT
- Task completion
- Tasa de entrega
- Tasa de lectura
- Tasa de respuesta
- ROI
- Outcome rules
- Data quality validations
- Provider mappings
- Upsert idempotente

Tests de integración mock:

Cari AI:
- testConnection por cada reporte
- sync rango 1 día
- sync rango 7 días
- sync sin datos
- credencial inválida
- respuesta incompleta
- paginación
- rate limit simulado
- normalización

Botmaker:
- testConnection
- sync sesiones
- sync mensajes
- sync agentes
- sync campañas
- sync funnels
- sync tags
- sync variables
- webhook recibido
- evento duplicado
- evento fuera de orden
- normalización

## 38. Datos mock

Crear datos mock si no existen:

- 2 tenants
- 2 providers: Cari AI y Botmaker
- 4 bots
- 5 canales
- 10 agentes
- 5 colas
- 8 servicios
- 6 campañas
- 1,000 conversaciones
- 8,000 mensajes
- tags variados
- casos resueltos
- casos abandonados
- casos transferidos
- errores de integración
- fallbacks
- CSAT
- NPS
- servicios completados
- campañas entregadas/leídas/respondidas

Los mocks deben permitir visualizar todos los dashboards.

## 39. Criterios de aceptación

El módulo estará aceptado cuando:

1. Existe navegación del módulo Análisis de Resultados.
2. Existe dashboard resumen.
3. Existe dashboard operación.
4. Existen vistas conversaciones, agentes, campañas, servicios, funnels, calidad bot, ROI, integraciones, calidad de datos y auditoría.
5. Hay modelo de datos normalizado.
6. Hay adaptadores Cari AI y Botmaker.
7. Hay interfaz AnalyticsProviderAdapter.
8. Hay configuración segura de integraciones.
9. No se guardan credenciales en texto plano.
10. Hay testConnection.
11. Hay sync manual.
12. Hay estructura para sync programado.
13. Hay raw payloads.
14. Hay normalización.
15. Hay reglas de outcome configurables.
16. Bot-only y resuelto por bot son métricas separadas.
17. Hay KPIs obligatorios.
18. Hay agregados diarios.
19. Hay filtros globales.
20. Hay exportaciones.
21. Hay alertas.
22. Hay audit logs.
23. Hay validaciones de calidad de datos.
24. Hay datos mock.
25. Hay tests de KPIs.
26. Hay tests de outcome rules.
27. Hay manejo de errores.
28. Hay estados loading, empty y error.
29. Hay protección multi-tenant.
30. Build, lint y tests pasan, o queda reporte claro si el proyecto no tiene alguno de esos comandos.

## 40. Restricciones

No inventar endpoints reales de proveedores.

No hardcodear credenciales.

No usar datos personales reales.

No mezclar tenants.

No calcular KPIs desde raw payloads en frontend.

No hacer dashboards dependientes del proveedor.

No confundir bot-only con resuelto por bot.

No ocultar errores de sincronización.

No mostrar datos sensibles sin permisos.

No romper funcionalidad existente.

No hacer refactor masivo innecesario.

Mantener estilo, stack y convenciones existentes del repo.

## 41. Entregables esperados

Implementar por fases si el repo es grande:

Fase 1:
- Estructura del módulo
- Modelo de datos
- Mocks
- Dashboard resumen

Fase 2:
- Configuración de integraciones
- Adaptadores base
- testConnection mock

Fase 3:
- Sync Cari AI preparado
- TODOs donde falten endpoints

Fase 4:
- Sync Botmaker preparado
- Webhooks si aplica

Fase 5:
- KPI engine
- Outcome rules
- Aggregates

Fase 6:
- Dashboards avanzados

Fase 7:
- Alertas
- Exportaciones
- Auditoría
- Calidad de datos

Fase 8:
- Tests
- Hardening
- Documentación

Crear reporte final en:

docs/ANALISIS_RESULTADOS_IMPLEMENTATION_REPORT.md

El reporte debe incluir:

- Qué se implementó
- Archivos creados/modificados
- Decisiones técnicas
- Configuraciones disponibles
- Variables de entorno necesarias
- TODOs pendientes
- Comandos ejecutados
- Resultados de tests
- Cómo probar manualmente
