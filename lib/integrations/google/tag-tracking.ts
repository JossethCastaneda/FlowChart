import prisma from "@/lib/prisma";
import { refreshAccessToken, GoogleCredentials } from "./oauth";

export interface GtmTag {
  tagId: string;
  name: string;
  type: string; // e.g. "gaawe" (GA4 Event), "html", etc.
  firingTriggerId?: string[];
  paused?: boolean;
}

export interface GtmTrigger {
  triggerId: string;
  name: string;
  type: string;
}

export interface GtmVariable {
  variableId: string;
  name: string;
  type: string;
}

export interface TagHealth {
  tagId: string;
  name: string;
  warnings: string[];
}

export interface TagTrackingReport {
  containerId: string;
  publishedVersion?: string;
  tags: GtmTag[];
  triggers: GtmTrigger[];
  variables: GtmVariable[];
  health: TagHealth[];
}

export async function getTagTrackingReport(workspaceId: string): Promise<TagTrackingReport> {
  const integration = await prisma.integration.findUnique({
    where: { workspaceId_provider: { workspaceId, provider: "google" } },
  });

  if (!integration || !integration.connected) {
    throw new Error("Google not connected");
  }

  const creds = integration.credentials as unknown as GoogleCredentials;
  const accountId = creds.resources?.tag_tracking?.accountId;
  const containerId = creds.resources?.tag_tracking?.containerId;

  if (!accountId || !containerId) {
    throw new Error("Módulo Seguimiento de Etiquetas no configurado (falta recurso GTM)");
  }

  const accessToken = await refreshAccessToken(workspaceId);
  if (!accessToken) {
    throw new Error("No se pudo obtener token de acceso");
  }

  const parent = `accounts/${accountId}/containers/${containerId}/workspaces`;
  
  // To get tags, triggers, variables we need a workspace. 
  // Let's get the default workspace for the container.
  const wsRes = await fetch(`https://tagmanager.googleapis.com/tagmanager/v2/${parent}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const wsData = await wsRes.json();
  if (!wsRes.ok || !wsData.workspace || wsData.workspace.length === 0) {
    throw new Error("No se pudo obtener el workspace de GTM");
  }
  
  const defaultWorkspaceId = wsData.workspace[0].workspaceId;
  const wsPath = `${parent}/${defaultWorkspaceId}`;

  // Fetch Tags
  const tagsRes = await fetch(`https://tagmanager.googleapis.com/tagmanager/v2/${wsPath}/tags`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const tagsData = await tagsRes.json();
  const tags: GtmTag[] = tagsData.tag || [];

  // Fetch Triggers
  const triggersRes = await fetch(`https://tagmanager.googleapis.com/tagmanager/v2/${wsPath}/triggers`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const triggersData = await triggersRes.json();
  const triggers: GtmTrigger[] = triggersData.trigger || [];

  // Fetch Variables
  const varsRes = await fetch(`https://tagmanager.googleapis.com/tagmanager/v2/${wsPath}/variables`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const varsData = await varsRes.json();
  const variables: GtmVariable[] = varsData.variable || [];

  // Analyze Health
  const health: TagHealth[] = [];
  
  for (const tag of tags) {
    const warnings: string[] = [];
    
    // 1. Tag sin disparador
    if (!tag.firingTriggerId || tag.firingTriggerId.length === 0) {
      warnings.push("Etiqueta sin disparador configurado (nunca se ejecutará).");
    }
    
    // 2. Tag sin GA4 (si es de tipo tracking custom y no usa GA4 config)
    // Esto es heurístico, pero para el caso del especialista:
    if (tag.type !== "gaawe" && tag.type !== "gaawc" && tag.name.toLowerCase().includes("ga4")) {
      warnings.push("Etiqueta nombrada GA4 pero usa un tipo incorrecto o custom HTML.");
    }

    if (warnings.length > 0) {
      health.push({ tagId: tag.tagId, name: tag.name, warnings });
    }
  }

  return {
    containerId,
    publishedVersion: "Latest", // Could fetch from /versions
    tags,
    triggers,
    variables,
    health,
  };
}

/** 
 * TODO: Implement "manage" capabilities for Tag Tracking
 * Examples: pauseTag, createTrigger, publishVersion
 */
export async function pauseTag(workspaceId: string, tagId: string) {
  throw new Error("Not implemented - TODO");
}

export async function publishContainer(workspaceId: string) {
  throw new Error("Not implemented - TODO");
}
