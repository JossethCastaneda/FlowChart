/**
 * Google BigQuery client.
 *
 * Auth options:
 * 1. Per-workspace OAuth via getValidAccessToken("google_bigquery")
 * 2. Service account via GOOGLE_SERVICE_ACCOUNT_JSON (base64-encoded)
 *
 * Endpoint: POST https://bigquery.googleapis.com/bigquery/v2/projects/{projectId}/queries
 * Docs: https://cloud.google.com/bigquery/docs/reference/rest/v2/jobs/query
 *
 * TODO: Implement full query runner with pagination and schema introspection.
 */

import { getValidAccessToken } from "./oauth";

/**
 * Get an access token for BigQuery — tries workspace OAuth first,
 * falls back to service account JWT if configured.
 */
async function getBigQueryToken(workspaceId: string): Promise<string> {
  // Try workspace-level OAuth first
  const oauthToken = await getValidAccessToken(workspaceId, "google_bigquery");
  if (oauthToken) return oauthToken;

  // TODO: Implement service account JWT auth
  // The service account JSON would be in GOOGLE_SERVICE_ACCOUNT_JSON (base64-encoded)
  // Decode → sign JWT → exchange for access token
  // Docs: https://cloud.google.com/iam/docs/create-short-lived-credentials-direct
  const saJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (saJson) {
    throw new Error("TODO: Implement service account JWT auth for BigQuery");
  }

  throw new Error("BigQuery not connected — no OAuth token or service account configured");
}

/**
 * Run a BigQuery SQL query.
 * TODO: Implement pagination for large result sets.
 */
export async function queryBigQuery(
  workspaceId: string,
  projectId: string,
  query: string,
  maxResults = 1000
): Promise<unknown> {
  const token = await getBigQueryToken(workspaceId);

  const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      useLegacySql: false,
      maxResults,
    }),
  });

  if (!res.ok) {
    const error = await res.text().catch(() => "unknown");
    throw new Error(`BigQuery API error: ${res.status} — ${error}`);
  }

  return res.json();
}
