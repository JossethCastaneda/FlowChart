---
type: "query"
date: "2026-08-11T17:59:20.793179+00:00"
question: "¿cómo llega una petición a la base de datos?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["projects/route.ts", "GET", "POST", "withAuth()", "getActiveWorkspaceId()", "validateBody()", "prisma.ts", "createPrismaClient()"]
---

# Q: ¿cómo llega una petición a la base de datos?

## Answer

Expanded from original query via graph vocab: [request, route, handler, api, server, fetch, query, prisma, database, client]. Flujo representativo confirmado: una petición entra por app/api/projects/route.ts, que contiene GET (L25) y POST (L89); la ruta importa withAuth (L4), getActiveWorkspaceId (L5), validateBody (L6), respuestas API (L9) y prisma.ts (L1). prisma.ts centraliza createPrismaClient (L37). El grafo confirma imports/estructura, pero no extrae las llamadas ORM internas como aristas.

## Outcome

- Signal: useful

## Source Nodes

- projects/route.ts
- GET
- POST
- withAuth()
- getActiveWorkspaceId()
- validateBody()
- prisma.ts
- createPrismaClient()