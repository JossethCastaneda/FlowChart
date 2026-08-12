import prisma from "../prisma";
import { Prisma } from "@prisma/client";

export interface FiscalDocumentResult {
  success: boolean;
  documentId?: string;
  pdfUrl?: string;
  xmlUrl?: string;
  uuid?: string;
  error?: string;
}

/**
 * Base adapter for international fiscal compliance (Invoicing & Tax).
 */
export abstract class FiscalAdapter {
  abstract jurisdiction: string;

  /**
   * Issue a legally compliant fiscal document for a given Stripe Invoice.
   */
  abstract issueDocument(invoiceId: string, profile: any): Promise<FiscalDocumentResult>;

  /**
   * Cancel an existing fiscal document (e.g., when a refund is issued).
   */
  abstract cancelDocument(uuid: string): Promise<boolean>;
}

export class MexicoFiscalAdapter extends FiscalAdapter {
  jurisdiction = "MX";

  async issueDocument(invoiceId: string, profile: any): Promise<FiscalDocumentResult> {
    // 1. Validate Constancia de Situacion Fiscal data
    if (!profile.taxId || !profile.legalName || !profile.fiscalMetadata?.cfdiUse) {
      return { success: false, error: "Missing required Mexican fiscal data (RFC, Razon Social, Uso CFDI)" };
    }

    try {
      // In a real implementation, this would call a PAC (Proveedor Autorizado de Certificación)
      // or Stripe's native Mexican electronic invoicing integration.
      console.log(`[Fiscal:MX] Queuing CFDI 4.0 for invoice ${invoiceId} (RFC: ${profile.taxId})`);
      
      const doc = await prisma.fiscalDocument.create({
        data: {
          workspaceId: profile.workspaceId,
          invoiceId,
          status: "PENDING_PAC", // Do not mark ISSUED without a real PAC
          jurisdiction: "MX",
          metadata: {
            cfdiUse: profile.fiscalMetadata.cfdiUse,
            taxRegime: profile.fiscalMetadata.taxRegime,
            pendingReason: "Awaiting PAC integration"
          }
        }
      });

      return {
        success: true,
        documentId: doc.id
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async cancelDocument(uuid: string): Promise<boolean> {
    console.log(`[Fiscal:MX] Canceling CFDI 4.0 ${uuid}`);
    await prisma.fiscalDocument.update({
      where: { uuid },
      data: {
        status: "CANCELED",
        canceledAt: new Date()
      }
    });
    return true;
  }
}

export class FiscalRegistry {
  private adapters: Map<string, FiscalAdapter> = new Map();

  constructor() {
    this.register(new MexicoFiscalAdapter());
    // EUVatAdapter, USSalesTaxAdapter, etc., would be registered here.
  }

  register(adapter: FiscalAdapter) {
    this.adapters.set(adapter.jurisdiction, adapter);
  }

  getAdapter(jurisdiction: string): FiscalAdapter | undefined {
    return this.adapters.get(jurisdiction.toUpperCase());
  }

  /**
   * Determines jurisdiction based on Country Code and invokes the correct adapter
   */
  async processInvoice(invoiceId: string, workspaceId: string) {
    const profile = await prisma.billingProfile.findUnique({ where: { workspaceId } });
    if (!profile || !profile.country) {
      return { success: false, error: "No billing profile or country found" };
    }

    const adapter = this.getAdapter(profile.country);
    if (!adapter) {
      // If no local fiscal requirements, fallback to standard Stripe Invoice
      return { success: true, message: `No specific fiscal adapter required for ${profile.country}` };
    }

    return adapter.issueDocument(invoiceId, profile);
  }
}
