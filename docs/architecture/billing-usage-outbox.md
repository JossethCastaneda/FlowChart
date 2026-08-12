# Architecture Decision Record: Billing Usage Outbox Pattern

## Context
FlowChart bills AI consumption based on the `AiUsage` ledger. When AI requests complete, the `settle()` operation runs within a Neon/Postgres transaction to idempotently record the usage and costs.
We need to sync this usage to Stripe Billing Meters so that Stripe can invoice the customer at the end of their billing cycle.
If we attempt to make a Stripe API call (e.g., `stripe.billing.meterEvents.create()`) *inside* the Neon financial transaction, we risk:
1. Blocking the database connection during the network call.
2. Breaking idempotency if the network call fails but the database transaction was already committed, or vice-versa.
3. Increasing the latency of the user-facing AI request.

## Decision
We will use the **Transactional Outbox Pattern** for dispatching usage to Stripe.
1. The `settle()` transaction will insert a `BillingUsageEvent` record into the database with `status = "PENDING"`. This happens atomically alongside the `AiUsage` insert.
2. The `BillingUsageEvent` will include a `stripeMeterEventIdentifier`, which is a deterministic unique string derived from the `AiUsage` record (e.g., `meter_{AiUsage.idempotencyKey}`).
3. A background dispatcher (a Cron job, Vercel Workflow, or async worker) will periodically poll for `PENDING` events and send them to Stripe.
4. The dispatcher will update the status to `"SENT"` upon success, or `"FAILED"` with an incremented `attempts` counter upon failure.
5. Stripe guarantees its own idempotency based on the `identifier` passed to the meter event API. If the dispatcher retries a successful event due to a race condition, Stripe will safely ignore the duplicate.

## Status
Accepted.

## Consequences
- The local financial ledger (`AiUsage`) remains fully authoritative and untied to Stripe network latency.
- We will need a cron or queue processing architecture to dispatch these outbox events.
- Reconciliation will require monitoring the `BillingUsageEvent` table for stuck `PENDING` or `FAILED` events.
