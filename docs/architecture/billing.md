# FlowChart Billing Architecture

## Stripe Integration (Stage 8)
- **API Version**: Tied strictly to the installed `stripe-node` SDK version (e.g. `2026-07-29.dahlia`).
- **Idempotency**: All Stripe Webhook events and Meter usages are idempotently handled via unique IDs bound to Neon Transactions.
- **Outbox Pattern**: AI usages are placed in a `PENDING` outbox and asynchronously flushed to Stripe Billing Meters, preventing network latency or failure from rolling back local Ledger transactions.
- **Checkout & Portal**: Secure server-side routes map plans to Price IDs, preventing malicious client input.
