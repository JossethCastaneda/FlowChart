# Architecture Decision Record: Stripe Connect, Tax, and Terminal Strategy

## Context
As part of the Stripe billing integration (Stage 8), we must explicitly decide on the product architecture for complex Stripe products: Stripe Connect, Stripe Tax, and Stripe Terminal. These tools heavily impact the business's merchant-of-record status, legal liabilities, and physical infrastructure.

## Decisions

### 1. Stripe Connect
- **Problem**: Connect enables complex fund flows (marketplaces, multi-party payouts). Currently, the exact business model (e.g., whether FlowChart takes platform fees from agencies, or if agencies collect directly from clients) is undefined.
- **Decision**: Stripe Connect implementation is explicitly **BLOCKED BY PRODUCT DECISION**. We will only operate as a direct SaaS B2B/B2C platform (standard Stripe subscriptions) until a formal Connect Business Model is designed, specifying the merchant of record, dispute liability, and fund flow.

### 2. Stripe Tax
- **Problem**: Tax collection requires proper configuration of tax nexus, customer addresses, and tax IDs. 
- **Decision**: The backend architecture is prepared to pass tax IDs and enable automatic tax on Stripe Checkout. However, we will **NOT** automate live tax collection rules within the codebase without explicit legal/accounting directives. Stripe Tax will be controlled strictly through the Stripe Dashboard. Unresolved legal/accounting questions are offloaded to business operations.

### 3. Stripe Terminal
- **Problem**: Terminal processes physical in-person card payments.
- **Decision**: FlowChart is currently a digital workspace platform. There is no product requirement for physical card readers. Terminal implementation is **SKIPPED** and documented as out-of-scope for the current evolution stage.

## Status
Accepted.

## Consequences
- We save significant engineering overhead by not over-building unused Connect and Terminal features.
- Any future requirement to support agency payouts will require a new ADR to unblock Stripe Connect.
