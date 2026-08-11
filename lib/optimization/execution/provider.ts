import type { JsonValue } from "../contracts";
import { hashCanonicalJson } from "../canonical-json";

export type ProviderAction = {
  provider: string;
  accountId: string;
  entity: { type: "campaign"; id: string };
  field: "status";
};

export type RemoteActionState = {
  value: JsonValue;
  fingerprint: string;
  providerRequestId?: string;
};

export interface OptimizationExecutionProvider {
  read(workspaceId: string, action: ProviderAction): Promise<RemoteActionState>;
  apply(workspaceId: string, action: ProviderAction, value: JsonValue): Promise<RemoteActionState>;
}

export function remoteStateFingerprint(action: ProviderAction, value: JsonValue) {
  return hashCanonicalJson({
    provider: action.provider,
    accountId: normalizeAccountId(action.accountId),
    entity: action.entity,
    field: action.field,
    value,
  });
}

export function normalizeAccountId(value: string) {
  return value.replace(/^act_/, "").replace(/-/g, "");
}

export class ProviderExecutionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status = 502
  ) {
    super(message);
  }
}
