/**
 * Google Analytics 4 (Data API) client.
 *
 * Auth: per-workspace OAuth via getValidAccessToken("google_analytics")
 * Endpoint: POST https://analyticsdata.googleapis.com/v1beta/properties/{propertyId}:runReport
 * Docs: https://developers.google.com/analytics/devguides/reporting/data/v1
 *
 * TODO: Implement full report builder. Currently a wired skeleton with example query.
 */

import { getValidAccessToken } from "./oauth";

export interface GA4ReportParams {
  propertyId: string;
  dateRanges: Array<{ startDate: string; endDate: string }>;
  dimensions?: Array<{ name: string }>;
  metrics: Array<{ name: string }>;
}

/**
 * Run a GA4 Data API report.
 * TODO: Fully implement and normalize response.
 */
export async function runGA4Report(
  workspaceId: string,
  params: GA4ReportParams
): Promise<unknown> {
  const token = await getValidAccessToken(workspaceId, "google_analytics");
  if (!token) throw new Error("Google Analytics not connected for this workspace");

  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${params.propertyId}:runReport`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      dateRanges: params.dateRanges,
      dimensions: params.dimensions || [],
      metrics: params.metrics,
    }),
  });

  if (!res.ok) {
    const error = await res.text().catch(() => "unknown");
    throw new Error(`GA4 Data API error: ${res.status} — ${error}`);
  }

  return res.json();
}

/**
 * Example: Get sessions + pageviews for the last 7 days.
 * TODO: Replace with configurable report builder.
 */
export async function getGA4SessionsSummary(
  workspaceId: string,
  propertyId: string
): Promise<unknown> {
  return runGA4Report(workspaceId, {
    propertyId,
    dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
    metrics: [
      { name: "sessions" },
      { name: "screenPageViews" },
      { name: "activeUsers" },
      { name: "averageSessionDuration" },
    ],
    dimensions: [{ name: "date" }],
  });
}
