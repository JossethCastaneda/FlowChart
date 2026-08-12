---
tags: [generado, entidades, prisma, dominio]
---

# Entidades del dominio (Prisma)

> ⚠️ **Archivo generado automáticamente** por `npm run docs:graph`.
> No lo edites manualmente — se sobreescribe en cada generación.
> Fuente: `scripts/docs-graph.mjs`

Total: **96 modelos** en el schema de Prisma.

## Core (Identidad y tenant)

| Modelo | Campos principales |
|--------|-------------------|
| **Account** | `userId`, `type`, `provider`, `providerAccountId`, `refresh_token` |
| **Session** | `sessionToken`, `userId`, `expires`, `user` |
| **User** | `name`, `email`, `emailVerified`, `image`, `password` |
| **VerificationToken** | `identifier`, `token`, `expires` |
| **Workspace** | `name`, `slug`, `plan`, `members`, `projects` |
| **WorkspaceSettings** | `workspaceId`, `areas`, `requireLeadReview` |
| **WorkspaceMember** | `workspaceId`, `userId`, `role`, `activityStatus`, `lastActiveAt` |
| **WorkspaceInvite** | `workspaceId`, `email`, `token`, `role`, `expires` |
| **Project** | `name`, `alias`, `client`, `vertical`, `fanpage` |
| **ProjectMember** | `projectId`, `userId`, `role`, `project`, `user` |
| **ProjectAlert** | `projectId`, `type`, `severity`, `title`, `message` |

## Operaciones

| Modelo | Campos principales |
|--------|-------------------|
| **Objective** | `workspaceId`, `areaId`, `title`, `description`, `quarter` |
| **KeyResult** | `objectiveId`, `title`, `targetValue`, `currentValue`, `unit` |
| **Task** | `title`, `description`, `assignee`, `assigneeId`, `priority` |
| **TaskComment** | `taskId`, `userId`, `userName`, `userImage`, `content` |
| **TaskActivity** | `taskId`, `userId`, `userName`, `action`, `field` |
| **Brief** | `workspaceId`, `projectId`, `title`, `content` |
| **Report** | `workspaceId`, `projectId`, `title`, `slug` |

## Integraciones Meta / WhatsApp

| Modelo | Campos principales |
|--------|-------------------|
| **MetaSource** | `externalId`, `kind`, `projectId`, `project` |
| **WaPhoneSource** | `phoneNumberId`, `workspaceId`, `projectId`, `workspace`, `project` |
| **Integration** | `workspaceId`, `provider`, `userId`, `name`, `credentials` |
| **MetaAdsCache** | `workspaceId`, `adAccountId`, `level`, `dateRange`, `data` |
| **MetaAnalyticsCache** | `workspaceId`, `endpoint`, `paramsKey`, `data`, `workspace` |
| **IntegrationAssetCache** | `integrationId`, `workspaceId`, `provider`, `assetType`, `externalId` |

## Otros

| Modelo | Campos principales |
|--------|-------------------|
| **GoogleSource** | `externalId`, `kind`, `projectId`, `project` |
| **Capturista** | `userId`, `user` |
| **Channel** | `projectId`, `name`, `type`, `config`, `project` |
| **MediaAsset** | `workspaceId`, `userId`, `projectId`, `url`, `fileName` |
| **DraftPost** | `workspaceId`, `projectId`, `authorId`, `baseContent`, `baseMediaUrls` |
| **Transmission** | `draftId`, `workspaceId`, `channel`, `accountId`, `accountName` |
| **PublishJob** | `transmissionId`, `step`, `status`, `attempts`, `maxAttempts` |
| **AuditLog** | `workspaceId`, `userId`, `action`, `resourceType`, `resourceId` |
| **ScheduledPost** | `workspaceId`, `projectId`, `userId`, `channels`, `content` |
| **Notification** | `userId`, `type`, `title`, `message`, `link` |
| **InboxConversation** | `workspaceId`, `platform`, `externalId`, `pageId`, `igId` |
| **Contact** | `workspaceId`, `name`, `email`, `phone`, `avatar` |
| **ContactChannel** | `contactId`, `workspaceId`, `platform`, `externalId`, `handle` |
| **InboxMessage** | `conversationId`, `externalId`, `content`, `sender`, `senderName` |
| **SavedReply** | `workspaceId`, `title`, `content`, `shortcut` |
| **InboxNote** | `conversationId`, `userId`, `content`, `conversation` |
| **DmAutomationRule** | `workspaceId`, `name`, `trigger`, `response`, `platforms` |
| **TrackedKeyword** | `workspaceId`, `query`, `type`, `active`, `workspace` |
| **ListeningQuery** | `workspaceId`, `query`, `type`, `active`, `mentions` |
| **ListeningMention** | `queryId`, `platform`, `content`, `author`, `authorAvatar` |
| **StreamBoard** | `workspaceId`, `name`, `workspace`, `columns` |
| **StreamColumn** | `boardId`, `type`, `platform`, `query`, `position` |
| **DataDeletionRequest** | `confirmationCode`, `metaUserId`, `status`, `requestedAt`, `completedAt` |
| **GoogleAdsCache** | `workspaceId`, `customerId`, `level`, `dateRange`, `data` |
| **SyncJob** | `workspaceId`, `projectId`, `clientId`, `channelConfigId`, `integrationId` |
| **RawProviderEvent** | `workspaceId`, `projectId`, `clientId`, `channelConfigId`, `provider` |
| **NormalizedConversation** | `workspaceId`, `projectId`, `clientId`, `channelConfigId`, `provider` |
| **NormalizedMessage** | `workspaceId`, `projectId`, `clientId`, `channelConfigId`, `provider` |
| **AnalyticsOutcomeRule** | `workspaceId`, `projectId`, `clientId`, `channelConfigId`, `name` |
| **AnalyticsKpiTarget** | `workspaceId`, `projectId`, `clientId`, `channelConfigId`, `kpiKey` |
| **AnalyticsAuditLog** | `workspaceId`, `projectId`, `clientId`, `channelConfigId`, `userId` |
| **AnalyticsDailyMetric** | `workspaceId`, `projectId`, `clientId`, `channelConfigId`, `date` |
| **DataQualityIssue** | `workspaceId`, `projectId`, `clientId`, `channelConfigId`, `provider` |
| **AnalyticsFunnel** | `workspaceId`, `projectId`, `name`, `description`, `provider` |
| **AnalyticsFunnelStep** | `funnelId`, `name`, `orderIndex`, `conditionType`, `conditionValue` |
| **AnalyticsAlert** | `workspaceId`, `projectId`, `type`, `severity`, `title` |
| **AnalyticsSavedView** | `workspaceId`, `projectId`, `userId`, `name`, `filters` |
| **BotmakerLeadRequest** | `requestId`, `sessionId`, `customerId`, `botId`, `channelId` |
| **BotmakerLeadFieldSnapshot** | `leadRequestId`, `sessionId`, `customerId`, `canonicalField`, `sourceVariableName` |
| **BotmakerOcrExtraction** | `leadRequestId`, `sessionId`, `customerId`, `ocrImageUrl`, `detectedRawText` |
| **IntelixSubmission** | `leadRequestId`, `sessionId`, `customerId`, `productType`, `submittedAt` |
| **ZapierConversionEvent** | `leadRequestId`, `sessionId`, `customerId`, `platformTarget`, `zapierStatus` |
| **AriaDataset** | `workspaceId`, `projectId`, `clientName`, `verticalName`, `targetType` |
| **AriaDatasetRow** | `datasetId`, `rowIndex`, `data`, `dataset` |
| **AriaDatasetColumn** | `datasetId`, `name`, `dataType`, `nullCount`, `isTarget` |
| **AriaModel** | `datasetId`, `name`, `algorithm`, `status`, `accuracy` |
| **AriaModelRun** | `modelId`, `status`, `metrics`, `model` |
| **AriaPrediction** | `modelId`, `recordId`, `score`, `probability`, `priority` |
| **CenturionModel** | `workspaceId`, `clientName`, `verticalName`, `engine`, `config` |
| **MmmWeeklySpend** | `workspaceId`, `clientName`, `week`, `channel`, `spend` |
| **OptimizationClient** | `workspaceId`, `key`, `displayName`, `status`, `environment` |
| **OptimizationClientProject** | `workspaceId`, `clientId`, `projectId`, `client`, `project` |
| **OptimizationAdAccount** | `workspaceId`, `clientId`, `provider`, `externalAccountId`, `displayName` |
| **OptimizationObjective** | `workspaceId`, `clientId`, `version`, `status`, `primaryKpi` |
| **OptimizationSnapshot** | `workspaceId`, `clientId`, `schemaVersion`, `contentHash`, `periodStart` |
| **OptimizationAnalysisResult** | `workspaceId`, `clientId`, `snapshotId`, `analysisType`, `observations` |
| **OptimizationProposedAction** | `workspaceId`, `clientId`, `snapshotId`, `provider`, `accountId` |
| **OptimizationActionApproval** | `workspaceId`, `clientId`, `actionId`, `approverId`, `approverRole` |
| **OptimizationActionExecution** | `workspaceId`, `clientId`, `actionId`, `operation`, `status` |
| **OptimizationEvaluation** | `workspaceId`, `clientId`, `sourceSnapshotId`, `outcomeSnapshotId`, `analysisResultId` |
| **OptimizationAuditEvent** | `workspaceId`, `clientId`, `snapshotId`, `actionId`, `actorId` |
| **AiRequest** | `workspaceId`, `idempotencyKey`, `feature`, `status`, `completedAt` |
| **AiRun** | `requestId`, `workspaceId`, `provider`, `model`, `actualProviderModelId` |
| **AiUsage** | `workspaceId`, `requestId`, `idempotencyKey`, `route`, `model` |
| **AiModelPricing** | `provider`, `providerModelId`, `inputPrice`, `outputPrice`, `cachedInputPrice` |
| **FeaturePricing** | `feature`, `pricingMode`, `fixedCost`, `creditsCost`, `currency` |
| **WorkspaceEntitlement** | `workspaceId`, `saasPlan`, `allowedFeatures`, `monthlyAiBudget`, `dailyAutopilotAiBudget` |
| **RateLimit** | `key`, `count`, `resetAt` |
| **BillingCustomer** | `workspaceId`, `stripeCustomerId`, `workspace` |
| **Subscription** | `workspaceId`, `stripeSubscriptionId`, `status`, `plan`, `currentPeriodEnd` |
| **BillingEvent** | `stripeEventId`, `eventType`, `livemode`, `processingStatus`, `error` |
| **BillingUsageEvent** | `workspaceId`, `aiUsageId`, `stripeMeterEventIdentifier`, `meterName`, `quantity` |

## Relacionado

- [[../architecture/multi-tenant|Modelo Multi-Tenant]]
- [[../Home|← Home]]
