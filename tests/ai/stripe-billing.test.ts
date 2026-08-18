import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StripeBillingProvider } from '@/lib/ai/finops/stripe-billing-provider';
import { BillingOutboxDispatcher } from '@/lib/ai/finops/outbox-dispatcher';
import prisma from '@/lib/prisma';

// Mock Prisma
vi.mock('@/lib/prisma', () => {
  const mPrisma: any = {
    $transaction: vi.fn(async (cb) => cb(mPrisma)),
    $queryRaw: vi.fn().mockResolvedValue([{
      id: 'evt_1',
      workspaceId: 'ws_1',
      stripeMeterEventIdentifier: 'm_1',
      meterName: 'tokens',
      quantity: 100,
      attempts: 0
    }]),
    billingUsageEvent: {
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
    billingCustomer: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    workspaceMember: {
      findUnique: vi.fn(),
    }
  };
  return { default: mPrisma };
});

describe('Stripe Stage 8 Billing Matrix', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('fails safely when STRIPE_SECRET_KEY is missing in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('STRIPE_SECRET_KEY', '');
    
    expect(() => new StripeBillingProvider()).toThrowError("STRIPE_SECRET_KEY is required in production environment");
    
    vi.unstubAllEnvs();
  });

  it('allows mock provider init in development without keys', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('STRIPE_SECRET_KEY', '');
    
    const provider = new StripeBillingProvider();
    expect(provider).toBeDefined();
    
    vi.unstubAllEnvs();
  });

  describe('Outbox Dispatcher', () => {
    it('dispatches PENDING events and marks them SENT', async () => {
      const mockEvents = [
        { id: 'evt_1', workspaceId: 'ws_1', stripeMeterEventIdentifier: 'm_1', meterName: 'tokens', quantity: 100, attempts: 0 }
      ];
      (prisma.$queryRaw as any).mockResolvedValue(mockEvents);
      (prisma.billingCustomer.findUnique as any).mockResolvedValue({ stripeCustomerId: 'cus_123' });

      const dispatcher = new BillingOutboxDispatcher();
      // Mock the internal provider sendMeterEvent
      (dispatcher as any).provider.sendMeterEvent = vi.fn().mockResolvedValue(true);

      await dispatcher.flushOutbox();

      expect((dispatcher as any).provider.sendMeterEvent).toHaveBeenCalledWith('cus_123', 'm_1', 'tokens', 100);
      expect(prisma.billingUsageEvent.update).toHaveBeenCalledWith({
        where: { id: 'evt_1' },
        data: expect.objectContaining({ status: 'SENT' })
      });
    });

    it('marks events FAILED on Stripe error and increments attempts', async () => {
      const mockEvents = [
        { id: 'evt_1', workspaceId: 'ws_1', stripeMeterEventIdentifier: 'm_1', meterName: 'tokens', quantity: 100, attempts: 0 }
      ];
      (prisma.$queryRaw as any).mockResolvedValue(mockEvents);
      (prisma.billingCustomer.findUnique as any).mockResolvedValue({ stripeCustomerId: 'cus_123' });

      const dispatcher = new BillingOutboxDispatcher();
      (dispatcher as any).provider.sendMeterEvent = vi.fn().mockRejectedValue(new Error('Stripe API Timeout'));

      await dispatcher.flushOutbox();

      expect(prisma.billingUsageEvent.update).toHaveBeenCalledWith({
        where: { id: 'evt_1' },
        data: expect.objectContaining({ status: 'FAILED', lastError: 'Stripe API Timeout' })
      });
    });

    it('prevents concurrent dispatch of the same pending event', async () => {
      // Setup the scenario where the second dispatcher doesn't find the event 
      // because the first one's SQL query already claimed it.
      const mockEvent = { id: 'evt_1', workspaceId: 'ws_1', stripeMeterEventIdentifier: 'm_1', meterName: 'tokens', quantity: 100, attempts: 0 };
      
      // Dispatcher 1 finds it
      (prisma.$queryRaw as any).mockResolvedValueOnce([mockEvent]);
      // Dispatcher 2 finds nothing
      (prisma.$queryRaw as any).mockResolvedValueOnce([]);

      const dispatcher1 = new BillingOutboxDispatcher();
      const dispatcher2 = new BillingOutboxDispatcher();

      (dispatcher1 as any).provider.sendMeterEvent = vi.fn().mockResolvedValue(true);
      (dispatcher2 as any).provider.sendMeterEvent = vi.fn().mockResolvedValue(true);
      (prisma.billingCustomer.findUnique as any).mockResolvedValue({ stripeCustomerId: 'cus_123' });

      await Promise.all([
        dispatcher1.flushOutbox(),
        dispatcher2.flushOutbox()
      ]);

      // Assert only 1 sendMeterEvent was called
      expect((dispatcher1 as any).provider.sendMeterEvent).toHaveBeenCalledTimes(1);
      expect((dispatcher2 as any).provider.sendMeterEvent).toHaveBeenCalledTimes(0);
      
      // Assert the update was called for dispatcher 1
      expect(prisma.billingUsageEvent.update).toHaveBeenCalledWith({
        where: { id: 'evt_1' },
        data: expect.objectContaining({ status: 'SENT' })
      });
    });
  });
});
