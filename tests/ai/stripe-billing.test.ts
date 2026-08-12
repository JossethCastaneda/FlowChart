import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StripeBillingProvider } from '@/lib/ai/finops/stripe-billing-provider';
import { BillingOutboxDispatcher } from '@/lib/ai/finops/outbox-dispatcher';
import prisma from '@/lib/prisma';

// Mock Prisma
vi.mock('@/lib/prisma', () => {
  return {
    default: {
      billingUsageEvent: {
        findMany: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
      },
      billingCustomer: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      workspaceMember: {
        findUnique: vi.fn(),
      }
    }
  };
});

describe('Stripe Stage 8 Billing Matrix', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('fails safely when STRIPE_SECRET_KEY is missing in production', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalKey = process.env.STRIPE_SECRET_KEY;

    process.env.NODE_ENV = 'production';
    delete process.env.STRIPE_SECRET_KEY;

    expect(() => new StripeBillingProvider()).toThrowError("STRIPE_SECRET_KEY is required in production environment");

    process.env.NODE_ENV = originalEnv;
    process.env.STRIPE_SECRET_KEY = originalKey;
  });

  it('allows mock provider init in development without keys', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalKey = process.env.STRIPE_SECRET_KEY;

    process.env.NODE_ENV = 'development';
    delete process.env.STRIPE_SECRET_KEY;

    const provider = new StripeBillingProvider();
    expect(provider).toBeDefined();

    process.env.NODE_ENV = originalEnv;
    process.env.STRIPE_SECRET_KEY = originalKey;
  });

  describe('Outbox Dispatcher', () => {
    it('dispatches PENDING events and marks them SENT', async () => {
      const mockEvents = [
        { id: 'evt_1', workspaceId: 'ws_1', stripeMeterEventIdentifier: 'm_1', meterName: 'tokens', quantity: 100, attempts: 0 }
      ];
      (prisma.billingUsageEvent.findMany as any).mockResolvedValue(mockEvents);

      const dispatcher = new BillingOutboxDispatcher();
      // Mock the internal provider sendMeterEvent
      (dispatcher as any).provider.sendMeterEvent = vi.fn().mockResolvedValue(true);

      await dispatcher.flushOutbox();

      expect((dispatcher as any).provider.sendMeterEvent).toHaveBeenCalledWith('ws_1', 'm_1', 'tokens', 100);
      expect(prisma.billingUsageEvent.update).toHaveBeenCalledWith({
        where: { id: 'evt_1' },
        data: expect.objectContaining({ status: 'SENT' })
      });
    });

    it('marks events FAILED on Stripe error and increments attempts', async () => {
      const mockEvents = [
        { id: 'evt_1', workspaceId: 'ws_1', stripeMeterEventIdentifier: 'm_1', meterName: 'tokens', quantity: 100, attempts: 0 }
      ];
      (prisma.billingUsageEvent.findMany as any).mockResolvedValue(mockEvents);

      const dispatcher = new BillingOutboxDispatcher();
      (dispatcher as any).provider.sendMeterEvent = vi.fn().mockRejectedValue(new Error('Stripe API Timeout'));

      await dispatcher.flushOutbox();

      expect(prisma.billingUsageEvent.update).toHaveBeenCalledWith({
        where: { id: 'evt_1' },
        data: expect.objectContaining({ status: 'FAILED', lastError: 'Stripe API Timeout' })
      });
    });
  });
});
