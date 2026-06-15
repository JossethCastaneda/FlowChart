import { encryptToken, decryptToken } from "@/lib/encryption";

export interface InstagramStatePayload {
  workspaceId: string;
  userId: string;
  timestamp: number;
}

export function createInstagramState(workspaceId: string, userId: string): string {
  const payload: InstagramStatePayload = {
    workspaceId,
    userId,
    timestamp: Date.now(),
  };
  return encryptToken(JSON.stringify(payload));
}

export function parseInstagramState(stateToken: string): InstagramStatePayload | null {
  try {
    const jsonStr = decryptToken(stateToken);
    const payload = JSON.parse(jsonStr) as InstagramStatePayload;
    
    // Check if the state is too old (e.g., 15 minutes)
    if (Date.now() - payload.timestamp > 15 * 60 * 1000) {
      console.warn("[INSTAGRAM STATE] State expired");
      return null;
    }
    
    return payload;
  } catch (err) {
    console.error("[INSTAGRAM STATE] Invalid state token:", err);
    return null;
  }
}
