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
  { provider: "OpenAI", component: "E1-GPT-5.6-Luna-input", unit: "1M_tokens", amount: 0.15, currency: "USD" },
  { provider: "OpenAI", component: "E1-GPT-5.6-Luna-cached-input", unit: "1M_tokens", amount: 0.075, currency: "USD" },
  { provider: "OpenAI", component: "E1-GPT-5.6-Luna-output", unit: "1M_tokens", amount: 0.60, currency: "USD" },
  
  { provider: "OpenAI", component: "E2-GPT-5.6-Terra-input", unit: "1M_tokens", amount: 2.50, currency: "USD" },
  { provider: "OpenAI", component: "E2-GPT-5.6-Terra-cached-input", unit: "1M_tokens", amount: 1.25, currency: "USD" },
  { provider: "OpenAI", component: "E2-GPT-5.6-Terra-output", unit: "1M_tokens", amount: 10.00, currency: "USD" },

  { provider: "OpenAI", component: "E3-GPT-5.6-Sol-input", unit: "1M_tokens", amount: 15.00, currency: "USD" },
  { provider: "OpenAI", component: "E3-GPT-5.6-Sol-cached-input", unit: "1M_tokens", amount: 7.50, currency: "USD" },
  { provider: "OpenAI", component: "E3-GPT-5.6-Sol-output", unit: "1M_tokens", amount: 60.00, currency: "USD" },
  { provider: "OpenAI", component: "E3-GPT-5.6-Sol-reasoning", unit: "1M_tokens", amount: 60.00, currency: "USD" },
  
  // ── ANTHROPIC ──
  { provider: "Anthropic", component: "E1-Claude-Haiku-4.5-input", unit: "1M_tokens", amount: 0.25, currency: "USD" },
  { provider: "Anthropic", component: "E1-Claude-Haiku-4.5-cache-writes", unit: "1M_tokens", amount: 0.3125, currency: "USD" },
  { provider: "Anthropic", component: "E1-Claude-Haiku-4.5-cached-input", unit: "1M_tokens", amount: 0.025, currency: "USD" },
  { provider: "Anthropic", component: "E1-Claude-Haiku-4.5-output", unit: "1M_tokens", amount: 1.25, currency: "USD" },

  { provider: "Anthropic", component: "E2-Claude-Sonnet-5-input", unit: "1M_tokens", amount: 3.00, currency: "USD" },
  { provider: "Anthropic", component: "E2-Claude-Sonnet-5-cache-writes", unit: "1M_tokens", amount: 3.75, currency: "USD" },
  { provider: "Anthropic", component: "E2-Claude-Sonnet-5-cached-input", unit: "1M_tokens", amount: 0.30, currency: "USD" },
  { provider: "Anthropic", component: "E2-Claude-Sonnet-5-output", unit: "1M_tokens", amount: 15.00, currency: "USD" },

  { provider: "Anthropic", component: "E3-Claude-Opus-4.8-input", unit: "1M_tokens", amount: 15.00, currency: "USD" },
  { provider: "Anthropic", component: "E3-Claude-Opus-4.8-cache-writes", unit: "1M_tokens", amount: 18.75, currency: "USD" },
  { provider: "Anthropic", component: "E3-Claude-Opus-4.8-cached-input", unit: "1M_tokens", amount: 1.50, currency: "USD" },
  { provider: "Anthropic", component: "E3-Claude-Opus-4.8-output", unit: "1M_tokens", amount: 75.00, currency: "USD" },

  // ── GOOGLE ──
  { provider: "Google", component: "E1-Gemini-3.5-Flash-Lite-input", unit: "1M_tokens", amount: 0.075, currency: "USD" },
  { provider: "Google", component: "E1-Gemini-3.5-Flash-Lite-cached-input", unit: "1M_tokens", amount: 0.0375, currency: "USD" },
  { provider: "Google", component: "E1-Gemini-3.5-Flash-Lite-output", unit: "1M_tokens", amount: 0.30, currency: "USD" },

  { provider: "Google", component: "E2-Gemini-3.6-Flash-input", unit: "1M_tokens", amount: 0.35, currency: "USD" },
  { provider: "Google", component: "E2-Gemini-3.6-Flash-cached-input", unit: "1M_tokens", amount: 0.175, currency: "USD" },
  { provider: "Google", component: "E2-Gemini-3.6-Flash-output", unit: "1M_tokens", amount: 1.05, currency: "USD" },

  { provider: "Google", component: "E3-Gemini-3.6-Flash-Reasoning-input", unit: "1M_tokens", amount: 2.00, currency: "USD" },
  { provider: "Google", component: "E3-Gemini-3.6-Flash-Reasoning-cached-input", unit: "1M_tokens", amount: 1.00, currency: "USD" },
  { provider: "Google", component: "E3-Gemini-3.6-Flash-Reasoning-output", unit: "1M_tokens", amount: 8.00, currency: "USD" },

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
  console.log("Seeding External Cost Rates...");
  for (const rate of rates) {
    await prisma.externalCostRate.create({
      data: {
        provider: rate.provider,
        component: rate.component,
        unit: rate.unit,
        amount: rate.amount,
        currency: rate.currency,
        notes: rate.notes
      }
    });
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
