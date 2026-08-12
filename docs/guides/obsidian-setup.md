---
tags: [guías, obsidian, setup]
---

# Cómo usar este vault de Obsidian

## 1. Instalar Obsidian Desktop

Obsidian es una aplicación de escritorio. No se instala como dependencia de npm.

1. Descarga Obsidian desde [obsidian.md/download](https://obsidian.md/download).
2. Instala la aplicación normalmente en tu sistema operativo.

## 2. Abrir el vault

1. Abre Obsidian Desktop.
2. En la pantalla de inicio, selecciona **"Open folder as vault"**.
3. Navega a la carpeta `docs/` dentro del repositorio:
   ```
   D:\Proyectos\FlowChart\docs\
   ```
4. Haz clic en **"Open"**.

> El vault se abre en `docs/`, no en la raíz del repositorio.
> Esto mantiene la documentación separada del código fuente.

## 3. Página de inicio

Una vez abierto el vault, abre `Home.md` para comenzar a navegar.

En Obsidian: `Ctrl+O` (o `Cmd+O` en Mac) → escribe `Home` → Enter.

## 4. Configuración compartida vs. personal

### Se versiona en Git (compartido con el equipo)

| Archivo | Contenido |
|---------|-----------|
| `.obsidian/core-plugins.json` | Plugins nativos habilitados |
| `.obsidian/graph.json` | Configuración visual del grafo |
| `.obsidian/app.json` | Configuración mínima de la app |
| `.obsidian/appearance.json` | Apariencia base |

### NO se versiona en Git (personal por máquina)

| Archivo | Motivo |
|---------|--------|
| `.obsidian/workspace.json` | Paneles abiertos, posición del grafo, zoom — varía por usuario |
| `.obsidian/workspace-mobile.json` | Estado en móvil |
| `.obsidian/cache/` | Caché local de indexación |

## 5. Navegar la documentación

### Vista de Grafo

`Ctrl+G` (o `Cmd+G`) abre la Vista de Grafo. Muestra todos los documentos como nodos y los `[[wikilinks]]` como aristas.

### Búsqueda global

`Ctrl+Shift+F` busca en todo el vault.

### Backlinks

El panel derecho muestra qué documentos apuntan al documento actual.

## 6. Regenerar el grafo de conocimiento

El directorio `docs/generated/` contiene archivos Markdown generados automáticamente desde el código fuente.

```bash
# Desde la raíz del repositorio:
npm run docs:graph
```

Este comando:
- Lee `lib/flowchart-kit/modules.ts` → genera el mapa de módulos.
- Lee `app/api/*/route.ts` → genera el índice de endpoints.
- Lee `prisma/schema.prisma` → genera el índice de entidades.
- Escribe los resultados en `docs/generated/`.
- Es **idempotente** — ejecutarlo varias veces produce el mismo resultado.

Para validar sin escribir archivos:

```bash
npm run docs:validate
```

## 7. Cómo contribuir sin romper enlaces

Los `[[wikilinks]]` de Obsidian son **sensibles al nombre del archivo** (no a la ruta completa).

### ✅ Hacer

- Crear documentos nuevos en la subcarpeta apropiada (`architecture/`, `decisions/`, `guides/`).
- Usar `[[nombre-del-archivo|Texto visible]]` para enlaces internos.
- Agregar frontmatter YAML con `tags` al crear documentos nuevos.
- Para ADRs: seguir el formato `ADR-NNN-descripcion-corta.md`.

### ❌ No hacer

- Renombrar archivos existentes sin actualizar todos los wikilinks que apuntan a ellos.
- Editar archivos en `docs/generated/` manualmente — se sobreescriben en la siguiente generación.
- Crear documentos con nombres que contengan caracteres especiales o espacios.

## 8. Solución de problemas comunes

### "Los wikilinks aparecen en rojo" (unresolved links)

El archivo destino no existe o el nombre no coincide exactamente.

```bash
npm run docs:validate
```

Muestra los wikilinks que no resuelven.

### "El grafo está vacío"

El vault apunta a la carpeta incorrecta. Verifica que abriste `docs/` y no la raíz del repo.

### "Los archivos generados están desactualizados"

```bash
npm run docs:graph
```

### "Obsidian no sincroniza entre máquinas"

`workspace.json` no se comparte en Git (es personal). Cada máquina tiene su propio estado de sesión. Los documentos y la configuración compartida sí se sincronizan via Git.

## Relacionado

- [[../Home|← Home]]
- [[README|← Guías]]
