---
type: "query"
date: "2026-08-17T19:50:33.728031+00:00"
question: "Crear un commit local auditable y probar un fresh Git checkout del historial canónico Prisma sin push ni mutación productiva"
contributor: "graphify"
outcome: "useful"
source_nodes: ["CanonicalBaselineKnowledgeNode", "LegacyMigrationArchiveKnowledgeNode", "CanonicalModelDecisionKnowledgeNode"]
---

# Q: Crear un commit local auditable y probar un fresh Git checkout del historial canónico Prisma sin push ni mutación productiva

## Answer

Expanded from graph vocabulary: migration, baseline, canonical, legacy, prisma, schema, policy, guard, incident, graphify, commit, checkout. Commit a9ac918192844bfcdc98f97ce6aab31eaa98f0c9 is self-contained. A detached Git worktree reproduced the exact baseline and legacy hashes, Prisma validation, typecheck, 39 migration-critical tests, empty replay with EMPTY diff, future canary, and clone metadata checksum. Production mutations and Git pushes were zero. Graphify AST exposed the canonical baseline, legacy archive, and ModelDecision nodes; semantic docs and SQL remained partial.

## Outcome

- Signal: useful

## Source Nodes

- CanonicalBaselineKnowledgeNode
- LegacyMigrationArchiveKnowledgeNode
- CanonicalModelDecisionKnowledgeNode