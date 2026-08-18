# Architecture Decision Record: Stripe API Version Strategy

## Context
FlowChart uses the Stripe Node.js SDK for billing, usage meters, and subscription management. Stripe versions its APIs using dates (e.g., `2024-06-20`, `2026-07-29.dahlia`), and the Node.js SDK pins its internal typings to a specific API version.
Previously, the code explicitly passed `apiVersion: "2024-06-20"` into the Stripe constructor, leading to a TypeScript mismatch because the installed `stripe-node` version `22.5.0` expects the beta version `"2026-07-29.dahlia"`.

## Decision
1. **SDK Alignment**: We will explicitly rely on the API version that the installed `stripe-node` package is pinned against, rather than hardcoding a mismatched version string in the application code. If a specific behavior requires overriding the API version, it must be explicitly cast to `any` and documented. Otherwise, we will omit the `apiVersion` parameter to let the SDK use its default version, which guarantees that TypeScript types align with the runtime behavior.
2. **Webhook Versioning**: Our webhook endpoint `app/api/webhooks/stripe/route.ts` must use the raw payload and parse it with `constructEvent`. The Stripe Dashboard webhook configuration must be set to match the SDK's pinned version (e.g., `2026-07-29.dahlia` or the closest available GA version). In production, the Stripe dashboard explicitly controls the API version of the webhook payload sent to us. If there is a mismatch, the webhook processing will safely fail closed.

## Status
Accepted.

## Consequences
- Upgrading the `stripe` package requires reviewing the Stripe API changelog for breaking changes, as the SDK upgrade intrinsically upgrades our API version.
- Any manual overrides for older API behaviors are strictly forbidden unless documented as temporary workarounds for legacy data.
