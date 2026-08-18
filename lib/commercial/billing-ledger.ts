import prisma from "../prisma";
import { Prisma } from "@prisma/client";

export type LedgerEntryType = "SUBSCRIPTION" | "MODULE" | "AI_BASE" | "AI_USAGE" | "CREDIT" | "TAX";

export interface CreateLedgerEntryParams {
  workspaceId: string;
  type: LedgerEntryType;
  source: string;
  sourceId?: string;
  quantity?: number;
  unit: string;
  unitAmount: Prisma.Decimal;
  currency?: string;
  periodStart?: Date;
  periodEnd?: Date;
}

export class BillingLedger {
  /**
   * Appends an entry to the commercial ledger.
   * Never mutates existing settled transactions.
   */
  async recordEntry(params: CreateLedgerEntryParams) {
    const qty = params.quantity ?? 1;
    const subtotal = params.unitAmount.mul(qty);

    return prisma.billingLedgerEntry.create({
      data: {
        workspaceId: params.workspaceId,
        type: params.type,
        source: params.source,
        sourceId: params.sourceId,
        quantity: qty,
        unit: params.unit,
        unitAmount: params.unitAmount,
        subtotal: subtotal,
        currency: params.currency || "USD",
        periodStart: params.periodStart,
        periodEnd: params.periodEnd
      }
    });
  }

  /**
   * Calculates current un-invoiced balance by summing ledger items
   * that haven't been attached to an invoice. (This would require an invoiceId on the entry, 
   * which we might add later, but for now we sum up based on time period or un-invoiced status).
   * 
   * Currently, we can just return the total usage for the month.
   */
  async getMonthlySubtotal(workspaceId: string, monthStart: Date, monthEnd: Date): Promise<Prisma.Decimal> {
    const entries = await prisma.billingLedgerEntry.findMany({
      where: {
        workspaceId,
        createdAt: {
          gte: monthStart,
          lte: monthEnd
        }
      }
    });

    return entries.reduce((acc, entry) => acc.add(entry.subtotal), new Prisma.Decimal(0));
  }
}
