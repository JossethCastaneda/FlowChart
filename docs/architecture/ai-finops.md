# AI FinOps & Entitlements (Phase P1.5)

## Overview
Phase P1.5 introduces the FinOps and Entitlement layer to FlowChart, ensuring AI workloads are appropriately metered, gated by budget constraints, and accurately mapped to financial costs before and after execution.

## Core Models

### `WorkspaceEntitlement`
Defines the capabilities a workspace is allowed to access and their financial limits.
- `allowedFeatures`: Array of strings, e.g., `["optimization_planner", "agent_reporting"]`.
- `monthlyAiBudget`: Total monthly budget in USD.
- `availableCredits`: Used for credit-based features.

### `AiModelPricing`
Stores versioned pricing for API providers (e.g., OpenAI, Anthropic).
- Maps `provider` and `providerModelId` to `inputPrice` and `outputPrice`.
- Support for `cachedInputPrice` for Anthropic/Gemini cached prompt capabilities.

### `AiRequest` & `AiRun`
Replaces the in-memory telemetry from P1.
- `AiRequest` represents a single logical action (e.g., "optimize campaign X").
- `AiRun` represents a specific LLM invocation. Groups fallbacks under the same `AiRequest`.

## Reservation Lifecycle

To prevent concurrent invocations from exceeding a workspace's budget in serverless environments, we use a Reservation Pattern:

1. **Reserve (`reserve`)**: Checks `checkEntitlement()`. If allowed, creates an `AiRequest` record in `RUNNING` state.
2. **Execute**: The Orchestrator interacts with the AI Provider.
3. **Settle (`settle`)**: Updates `AiRequest` to `SUCCEEDED` and writes `AiUsage` records mapping to the exact cost calculated via `calculateProviderCost()`.
4. **Release (`release`)**: If execution fails completely, the request is marked `FAILED` and any reserved credits are theoretically released.

## Billing Abstraction
The `BillingProvider` interface allows swapping the actual payment gateway (e.g., Stripe, LemonSqueezy) without modifying the AI logic.

```typescript
export interface BillingProvider {
  createCustomer(workspaceId: string): Promise<string>;
  createSubscription(workspaceId: string, plan: string): Promise<void>;
  reportUsageCharge(workspaceId: string, amount: number, description: string): Promise<void>;
}
```
