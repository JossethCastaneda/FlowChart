import { AnalyticsProviderAdapter } from "./AnalyticsProviderAdapter";
import { CariAiAnalyticsAdapter } from "./CariAiAnalyticsAdapter";
import { BotmakerAnalyticsAdapter } from "./BotmakerAnalyticsAdapter";

export class AnalyticsAdapterFactory {
  static getAdapter(provider: string): AnalyticsProviderAdapter {
    switch (provider) {
      case "cari_ai":
        return new CariAiAnalyticsAdapter();
      case "botmaker":
        return new BotmakerAnalyticsAdapter();
      default:
        throw new Error(`Provider no soportado: ${provider}`);
    }
  }
}
