export interface NormalizedBillingEvent {
  id: string;
  type: string;
  livemode: boolean;
  data: unknown;
}

export interface WebhookVerificationResult {
  success: boolean;
  event?: NormalizedBillingEvent;
  error?: string;
}

export interface BillingProvider {
  /**
   * Creates a customer representation in the underlying billing system.
   * @param workspaceId FlowChart workspace ID
   * @returns Provider-specific customer ID
   */
  createCustomer(workspaceId: string): Promise<string>;

  /**
   * provisions a subscription for the workspace
   */
  createSubscription(workspaceId: string, plan: string): Promise<void>;

  /**
   * Used for metered billing. Reports usage for overage calculation.
   * @param workspaceId FlowChart workspace ID
   * @param amount USD amount to charge
   * @param description What the charge is for
   */
  reportUsageCharge(workspaceId: string, amount: number, description: string): Promise<void>;

  /**
   * Used for metered billing (Phase C). Reports usage to modern Stripe Billing Meters.
   * @param workspaceId FlowChart workspace ID
   * @param idempotencyKey Unique key derived from AiUsage
   * @param meterName Stripe Meter name
   * @param quantity Amount of units consumed
   */
  sendMeterEvent(workspaceId: string, idempotencyKey: string, meterName: string, quantity: number): Promise<void>;

  /**
   * Creates a hosted checkout session URL.

   */
  createCheckout(workspaceId: string, stripeCustomerId: string, planOrPrice: string): Promise<string>;

  /**
   * Upgrades or downgrades an existing subscription.
   */
  changeSubscription(workspaceId: string, newPlan: string): Promise<void>;

  /**
   * Cancels a subscription at the end of the billing period.
   */
  cancelSubscription(workspaceId: string): Promise<void>;

  /**
   * Issues a financial refund to the customer.
   */
  createRefund(workspaceId: string, amount: number, reason: string): Promise<void>;

  /**
   * Verifies incoming webhooks from the billing provider.
   * Takes a raw Buffer to preserve bytes for signature verification.
   */
  verifyWebhook(payload: Buffer | string, signature: string): Promise<WebhookVerificationResult>;
}

export class MockBillingProvider implements BillingProvider {
  async createCustomer(workspaceId: string): Promise<string> {
    // For P1.5, we just mock the external API call
    return `mock_cus_${workspaceId}`;
  }

  async createSubscription(workspaceId: string, plan: string): Promise<void> {
    // Mock subscription creation
    console.log(`[MockBilling] Subscribed workspace ${workspaceId} to ${plan}`);
  }

  async reportUsageCharge(workspaceId: string, amount: number, description: string): Promise<void> {
    console.log(`[MockBilling] Reported usage charge of $${amount} to workspace ${workspaceId} for ${description}`);
  }

  async sendMeterEvent(workspaceId: string, idempotencyKey: string, meterName: string, quantity: number): Promise<void> {
    console.log(`[MockBilling] Sent meter event ${meterName} (${quantity}) for workspace ${workspaceId} with id ${idempotencyKey}`);
  }

  async createCheckout(workspaceId: string, plan: string): Promise<string> {
    console.log(`[MockBilling] Created checkout session for workspace ${workspaceId}, plan ${plan}`);
    return `https://mock-checkout.flowChart.dev/${workspaceId}/${plan}`;
  }

  async changeSubscription(workspaceId: string, newPlan: string): Promise<void> {
    console.log(`[MockBilling] Changed subscription for workspace ${workspaceId} to ${newPlan}`);
  }

  async cancelSubscription(workspaceId: string): Promise<void> {
    console.log(`[MockBilling] Canceled subscription for workspace ${workspaceId}`);
  }

  async createRefund(workspaceId: string, amount: number, reason: string): Promise<void> {
    console.log(`[MockBilling] Refunded $${amount} to workspace ${workspaceId} for ${reason}`);
  }

  async verifyWebhook(payload: Buffer | string, signature: string): Promise<WebhookVerificationResult> {
    console.log(`[MockBilling] Verified webhook with signature ${signature}`);
    return {
      success: true,
      event: {
        id: "mock_evt_123",
        type: "mock.event",
        livemode: false,
        data: {}
      }
    };
  }
}

