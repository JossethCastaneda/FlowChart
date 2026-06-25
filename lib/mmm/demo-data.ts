/**
 * SODARE · MMM — Datos de demostración
 * Datos sintéticos realistas para 12 semanas, 4 canales.
 */

import type { ChannelConfig, WeeklyRow } from "./types";

export const DEFAULT_CHANNELS: ChannelConfig[] = [
  { id: "meta",   name: "Meta Ads",    color: "#1877F2", adstockDecay: 0.6, saturationAlpha: 0.8, saturationK: 8000,  enabled: true },
  { id: "google", name: "Google Ads",  color: "#34A853", adstockDecay: 0.4, saturationAlpha: 0.7, saturationK: 6000,  enabled: true },
  { id: "tiktok", name: "TikTok Ads",  color: "#69C9D0", adstockDecay: 0.3, saturationAlpha: 0.9, saturationK: 4000,  enabled: true },
  { id: "email",  name: "Email Mktg",  color: "#F59E0B", adstockDecay: 0.2, saturationAlpha: 0.6, saturationK: 1500,  enabled: true },
];

export const DEMO_ROWS: WeeklyRow[] = [
  { week: "2024-W01", label: "Sem 1",  spend: { meta: 4200, google: 3100, tiktok: 1800, email: 600  }, outcome: 38200 },
  { week: "2024-W02", label: "Sem 2",  spend: { meta: 5100, google: 2800, tiktok: 2100, email: 500  }, outcome: 43500 },
  { week: "2024-W03", label: "Sem 3",  spend: { meta: 6200, google: 3400, tiktok: 1600, email: 800  }, outcome: 51800 },
  { week: "2024-W04", label: "Sem 4",  spend: { meta: 5800, google: 4100, tiktok: 2400, email: 700  }, outcome: 56200 },
  { week: "2024-W05", label: "Sem 5",  spend: { meta: 7100, google: 3800, tiktok: 2800, email: 600  }, outcome: 62100 },
  { week: "2024-W06", label: "Sem 6",  spend: { meta: 8500, google: 4500, tiktok: 3100, email: 900  }, outcome: 71400 },
  { week: "2024-W07", label: "Sem 7",  spend: { meta: 7800, google: 5200, tiktok: 2600, email: 750  }, outcome: 68900 },
  { week: "2024-W08", label: "Sem 8",  spend: { meta: 9200, google: 4800, tiktok: 3400, email: 850  }, outcome: 79200 },
  { week: "2024-W09", label: "Sem 9",  spend: { meta: 8100, google: 5600, tiktok: 2900, email: 1100 }, outcome: 73600 },
  { week: "2024-W10", label: "Sem 10", spend: { meta: 10500, google: 5100, tiktok: 3800, email: 950 }, outcome: 88400 },
  { week: "2024-W11", label: "Sem 11", spend: { meta: 9800, google: 6200, tiktok: 4100, email: 1200 }, outcome: 85100 },
  { week: "2024-W12", label: "Sem 12", spend: { meta: 11200, google: 5800, tiktok: 3600, email: 1050 }, outcome: 92800 },
];
