# AI FinOps Architecture

## Overview
FlowChart uses a local `AiUsage` ledger (Neon/Postgres) to track all LLM model usage, durations, and credit costs. This ledger provides a localized, deterministic record for immediate entitlement checks via `WorkspaceEntitlement`.

`providerCostUsd` records proven provider cost and `customerChargeUsd` records
the approved customer ledger value. Historical `estimatedCostUsd` is neither of
those without explicit evidence and remains pending human semantic decision.

## Stripe Synchronization
Under Stage 8 Closure, all usage settled locally is placed into an Outbox (`BillingUsageEvent` with `status="PENDING"`). A background dispatcher flushes these to the Stripe Metering API to invoice customers at the end of their billing cycles.

## Entitlement Mapping
Entitlements (`monthlyAiBudget`) are strictly controlled by the subscription state from the Stripe Webhook:
- `active` / `trialing`: Full access.
- `past_due`: Reduced grace-period budget.
- `canceled` / `unpaid`: Zero access.
