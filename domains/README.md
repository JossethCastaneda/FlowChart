# Arquitectura por Dominios (Domain-Driven Design) en FlowChart

Esta carpeta sirve como el hub arquitectónico de la aplicación, agrupando la lógica de negocio, tipos y componentes compartidos de cada módulo, de forma separada al enrutador (App Router).

## Reglas de la Arquitectura (Feature-Sliced Design)

1. **Aislamiento**: Cada dominio debe ser autónomo. Un dominio (ej. `operations`) no debe importar estado interno ni lógicas privadas de otro dominio (ej. `publisher`). Si necesitan comunicarse, deben hacerlo a través de interfaces públicas (APIs) o utilidades en `infrastructure`.
2. **Estructura Interna del Dominio**:
   - `/components`: UI específica del módulo.
   - `/services`: Lógica de comunicación con base de datos o APIs externas.
   - `/types.ts`: Tipados de TypeScript de las entidades del dominio.
   - `/utils.ts`: Helpers específicos.
3. **App Router como Entry Point**: Las carpetas `app/dashboard/*` y `app/api/*` seguirán existiendo pero **únicamente** como puentes de Next.js (Manejadores de rutas y peticiones). Todo el peso de la lógica debe residir en `domains/`.

## Dominios Identificados
- **identity**: Autenticación, Usuarios, Workspaces, Permisos.
- **operations**: Tareas, Proyectos, SLAs, Asignaciones.
- **publisher**: Creación de contenido, Briefs, Feeds de posteo.
- **interactions**: Inbox, Botmaker, DMs.
- **marketing**: Creación y medición de pauta publicitaria (Ads).
- **analytics**: Métricas, Social Listening, Reportería.
- **infrastructure**: Integraciones de terceros, Webhooks, Notificaciones.
