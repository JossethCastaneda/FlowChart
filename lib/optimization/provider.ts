import type { CanonicalMetric } from "./contracts";

export type AdsProviderName = "meta" | "google" | "tiktok";
export type AdsEntityLevel = "account" | "campaign" | "group" | "ad";

export interface ProviderRequestContext {
  tenantId: string;
  clientId: string;
  authorizedAccountId: string;
  correlationId: string;
  cutoffAt: string;
}
export interface ProviderPage<T> {
  items: T[];
  nextCursor?: string;
  requestId?: string;
  rateLimit?: {
    remaining?: number;
    resetAt?: string;
    retryAfterSeconds?: number;
  };
}

export interface ProviderEntity {
  provider: AdsProviderName;
  accountId: string;
  id: string;
  parentId?: string;
  name: string;
  status: string;
  currency?: string;
  timezone?: string;
  remoteUpdatedAt?: string;
  remoteStateFingerprint: string;
}

export interface ProviderCreative extends ProviderEntity {
  format?: string;
  assetRefs: string[];
  destinationUrl?: string;
}

export interface ProviderMetricQuery {
  from: string;
  to: string;
  level: AdsEntityLevel;
  entityIds?: string[];
  attributionWindow: string;
  cursor?: string;
}

export interface ProviderMetricBatch {
  metrics: CanonicalMetric[];
  nextCursor?: string;
  source: {
    provider: AdsProviderName;
    sourceId: string;
    accountId: string;
    syncedAt: string;
    watermark?: string;
    requestId?: string;
  };
  warnings: ProviderWarning[];
}

export interface ProviderWarning {
  code: string;
  message: string;
  retryable: boolean;
  retryAfterSeconds?: number;
}

export interface ProviderCapabilities {
  provider: AdsProviderName;
  levels: AdsEntityLevel[];
  supportsRevenue: boolean;
  supportedAttributionWindows: string[];
  supportsCreatives: boolean;
  readOnly: true;
}

/**
 * Phase 1 deliberately exposes read operations only. Mutation contracts belong
 * to the controlled executor introduced in Phase 4, not to analytical code.
 */
export interface AdsProviderReader {
  readonly provider: AdsProviderName;
  describeCapabilities(): ProviderCapabilities;
  listAccounts(context: Omit<ProviderRequestContext, "authorizedAccountId">, cursor?: string): Promise<ProviderPage<ProviderEntity>>;
  listCampaigns(context: ProviderRequestContext, cursor?: string): Promise<ProviderPage<ProviderEntity>>;
  listGroups(context: ProviderRequestContext, campaignId?: string, cursor?: string): Promise<ProviderPage<ProviderEntity>>;
  listAds(context: ProviderRequestContext, groupId?: string, cursor?: string): Promise<ProviderPage<ProviderEntity>>;
  listCreatives(context: ProviderRequestContext, cursor?: string): Promise<ProviderPage<ProviderCreative>>;
  getMetrics(context: ProviderRequestContext, query: ProviderMetricQuery): Promise<ProviderMetricBatch>;
}
