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
   * Creates a hosted checkout session URL.
   */
  createCheckout(workspaceId: string, plan: string): Promise<string>;

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
   */
  verifyWebhook(payload: any, signature: string): Promise<boolean>;
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

  async createCheckout(workspaceId: string, plan: string): Promise<string> {
    console.log(`[MockBilling] Created checkout session for workspace ${workspaceId}, plan ${plan}`);
    return `https://mock-checkout.zefirus.dev/${workspaceId}/${plan}`;
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

  async verifyWebhook(payload: any, signature: string): Promise<boolean> {
    console.log(`[MockBilling] Verified webhook with signature ${signature}`);
    return true;
  }
}
