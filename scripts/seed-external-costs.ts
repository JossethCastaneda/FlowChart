import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const rates = [
  // ── OPENAI ──
  { provider: "OpenAI", component: "GPT-5.6-input", unit: "1M_tokens", amount: 2.50, currency: "USD" },
  { provider: "OpenAI", component: "GPT-5.6-output", unit: "1M_tokens", amount: 10.00, currency: "USD" },

  // ── ANTHROPIC ──
  { provider: "Anthropic", component: "Claude-3.5-Sonnet-input", unit: "1M_tokens", amount: 3.00, currency: "USD" },
  { provider: "Anthropic", component: "Claude-3.5-Sonnet-output", unit: "1M_tokens", amount: 15.00, currency: "USD" },

  // ── GOOGLE ──
  { provider: "Google", component: "Gemini-1.5-Pro-input", unit: "1M_tokens", amount: 3.50, currency: "USD" },
  { provider: "Google", component: "Gemini-1.5-Pro-output", unit: "1M_tokens", amount: 10.50, currency: "USD" },
  { provider: "Google", component: "Gemini-1.5-Flash-input", unit: "1M_tokens", amount: 0.35, currency: "USD" },
  { provider: "Google", component: "Gemini-1.5-Flash-output", unit: "1M_tokens", amount: 1.05, currency: "USD" },

  // ── VERCEL ──
  { provider: "Vercel", component: "pro-seat", unit: "month", amount: 20.00, currency: "USD" },

  // ── NEON ──
  { provider: "Neon", component: "compute", unit: "CU-hour", amount: 0.106, currency: "USD" },
  { provider: "Neon", component: "storage", unit: "GB-month", amount: 0.35, currency: "USD" },

  // ── STRIPE MEXICO ──
  { provider: "Stripe", component: "card_processing_percentage", unit: "percentage", amount: 3.6, currency: "MXN", notes: "+ 3.00 MXN fixed" },
  { provider: "Stripe", component: "card_processing_fixed", unit: "charge", amount: 3.00, currency: "MXN" },
  { provider: "Stripe", component: "billing_starter", unit: "percentage", amount: 0.4, currency: "USD", notes: "Invoice fee" },
  { provider: "Stripe", component: "tax", unit: "percentage", amount: 0.5, currency: "USD", notes: "Stripe Tax automation per transaction" },
];

async function seedRates() {
  console.log("Seeding External Cost Rates (Idempotent)...");
  for (const rate of rates) {
    const existing = await prisma.externalCostRate.findFirst({
      where: {
        provider: rate.provider,
        component: rate.component,
        unit: rate.unit,
      }
    });

    if (existing) {
      await prisma.externalCostRate.update({
        where: { id: existing.id },
        data: {
          amount: rate.amount,
          currency: rate.currency,
          notes: rate.notes,
          effectiveFrom: (rate as any).effectiveFrom,
          effectiveTo: (rate as any).effectiveTo
        }
      });
    } else {
      await prisma.externalCostRate.create({
        data: {
          provider: rate.provider,
          component: rate.component,
          unit: rate.unit,
          amount: rate.amount,
          currency: rate.currency,
          notes: rate.notes,
          effectiveFrom: (rate as any).effectiveFrom,
          effectiveTo: (rate as any).effectiveTo
        }
      });
    }
  }
  console.log("Done.");
}

seedRates()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
