-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "password" TEXT,
    "passwordChangedAt" TIMESTAMP(3),
    "whatsappPhone" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceSettings" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "areas" JSONB NOT NULL DEFAULT '[]',
    "requireLeadReview" BOOLEAN NOT NULL DEFAULT true,
    "branding" JSONB NOT NULL DEFAULT '{}',
    "extConfig" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceMember" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "activityStatus" TEXT NOT NULL DEFAULT 'disponible',
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "permissions" JSONB,

    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceInvite" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "expires" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invitedById" TEXT,

    CONSTRAINT "WorkspaceInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "alias" TEXT,
    "client" TEXT,
    "vertical" TEXT,
    "fanpage" TEXT[],
    "instagram" TEXT[],
    "whatsapp" TEXT[],
    "webchat" TEXT[],
    "website" TEXT,
    "persona" TEXT,
    "geo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Activo',
    "dateStart" TEXT,
    "dateEnd" TEXT,
    "workspaceId" TEXT NOT NULL,
    "publicToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "alertsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "alertEmails" TEXT[],
    "crmIntegrationId" TEXT,
    "crmType" TEXT,
    "botFlowType" TEXT,
    "crmIntegrationIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "googleSources" JSONB DEFAULT '{}',

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetaSource" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetaSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaPhoneSource" (
    "id" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaPhoneSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleSource" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMember" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',

    CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Capturista" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Capturista_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Channel" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "config" JSONB,

    CONSTRAINT "Channel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Objective" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "areaId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "quarter" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Objective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KeyResult" (
    "id" TEXT NOT NULL,
    "objectiveId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KeyResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assignee" TEXT,
    "assigneeId" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'P2',
    "status" TEXT NOT NULL DEFAULT 'Backlog',
    "startDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "estimate" DOUBLE PRECISION,
    "tags" TEXT[],
    "order" INTEGER NOT NULL DEFAULT 0,
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "projectId" TEXT,
    "parentId" TEXT,
    "createdBy" TEXT,
    "targetAreaId" TEXT,
    "requestType" TEXT,
    "requesterId" TEXT,
    "workspaceId" TEXT NOT NULL,
    "keyResultId" TEXT,
    "briefId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "approvalState" TEXT,
    "submittedAt" TIMESTAMP(3),
    "submittedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "rejectionNote" TEXT,
    "reworkCount" INTEGER NOT NULL DEFAULT 0,
    "lastProgressAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "holderId" TEXT,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskComment" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "userImage" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskActivity" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "field" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brief" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "content" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brief_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT,
    "projectId" TEXT,
    "url" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'ready',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetGroup" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT DEFAULT '#35D3D9',
    "type" TEXT NOT NULL DEFAULT 'publish',
    "assets" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DraftPost" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT,
    "authorId" TEXT,
    "baseContent" TEXT NOT NULL,
    "baseMediaUrls" TEXT[],
    "channelOverrides" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "scheduledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DraftPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transmission" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "accountName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "finalContent" TEXT NOT NULL,
    "finalMediaUrls" TEXT[],
    "externalPostId" TEXT,
    "externalUrl" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublishJob" (
    "id" TEXT NOT NULL,
    "transmissionId" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "nextAttemptAt" TIMESTAMP(3),
    "payload" JSONB,
    "result" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublishJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledPost" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT,
    "userId" TEXT,
    "channels" TEXT[],
    "content" TEXT NOT NULL,
    "contentByPlatform" JSONB,
    "firstComment" TEXT,
    "mediaUrls" TEXT[],
    "mediaUrl" TEXT,
    "type" TEXT NOT NULL DEFAULT 'post',
    "hashtags" TEXT[],
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "approvalStatus" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "error" TEXT,
    "externalIds" JSONB,
    "targets" JSONB,
    "qStashMessageId" TEXT,
    "pageName" TEXT,
    "pageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Integration" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "userId" TEXT DEFAULT 'workspace',
    "name" TEXT,
    "credentials" JSONB NOT NULL,
    "config" JSONB DEFAULT '{}',
    "connected" BOOLEAN NOT NULL DEFAULT false,
    "connectedAt" TIMESTAMP(3),
    "connectedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectAlert" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboxConversation" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "pageId" TEXT,
    "igId" TEXT,
    "contactName" TEXT,
    "contactAvatar" TEXT,
    "contactId" TEXT,
    "lastMessage" TEXT,
    "lastMessageAt" TIMESTAMP(3),
    "unread" BOOLEAN NOT NULL DEFAULT true,
    "priority" BOOLEAN NOT NULL DEFAULT false,
    "assignedTo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InboxConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "avatar" TEXT,
    "company" TEXT,
    "lifecycleStage" TEXT NOT NULL DEFAULT 'lead',
    "ownerId" TEXT,
    "tags" TEXT[],
    "customFields" JSONB NOT NULL DEFAULT '{}',
    "notes" TEXT,
    "lastContactedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactChannel" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "handle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboxMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "externalId" TEXT,
    "content" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "senderName" TEXT,
    "senderAvatar" TEXT,
    "attachments" JSONB,
    "reaction" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "replyToId" TEXT,
    "editedAt" TIMESTAMP(3),
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InboxMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedReply" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "shortcut" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboxNote" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InboxNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DmAutomationRule" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "platforms" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DmAutomationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackedKeyword" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackedKeyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListeningQuery" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListeningQuery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListeningMention" (
    "id" TEXT NOT NULL,
    "queryId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "author" TEXT,
    "authorAvatar" TEXT,
    "sentiment" TEXT,
    "url" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListeningMention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StreamBoard" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StreamBoard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StreamColumn" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "query" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StreamColumn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataDeletionRequest" (
    "id" TEXT NOT NULL,
    "confirmationCode" TEXT NOT NULL,
    "metaUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "DataDeletionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetaAdsCache" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '',
    "adAccountId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "dateRange" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetaAdsCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleAdsCache" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT '',
    "customerId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "dateRange" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleAdsCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetaAnalyticsCache" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "paramsKey" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetaAnalyticsCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncJob" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT,
    "clientId" TEXT,
    "channelConfigId" TEXT,
    "integrationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "recordsInserted" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "SyncJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RawProviderEvent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT,
    "clientId" TEXT,
    "channelConfigId" TEXT,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RawProviderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NormalizedConversation" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT,
    "clientId" TEXT,
    "channelConfigId" TEXT,
    "provider" TEXT NOT NULL,
    "providerConversationId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "botId" TEXT,
    "customerId" TEXT,
    "customerIdentifierHash" TEXT,
    "conversationStartedAt" TIMESTAMP(3) NOT NULL,
    "conversationEndedAt" TIMESTAMP(3),
    "firstBotResponseAt" TIMESTAMP(3),
    "firstAgentResponseAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "outcome" TEXT,
    "resolvedBy" TEXT,
    "wasBotOnly" BOOLEAN NOT NULL DEFAULT false,
    "wasHandoff" BOOLEAN NOT NULL DEFAULT false,
    "queueId" TEXT,
    "agentId" TEXT,
    "botName" TEXT,
    "agentName" TEXT,
    "queueName" TEXT,
    "skillName" TEXT,
    "totalUserMessages" INTEGER NOT NULL DEFAULT 0,
    "totalBotMessages" INTEGER NOT NULL DEFAULT 0,
    "totalAgentMessages" INTEGER NOT NULL DEFAULT 0,
    "totalFallbacks" INTEGER NOT NULL DEFAULT 0,
    "csatScore" DOUBLE PRECISION,
    "npsScore" DOUBLE PRECISION,
    "campaignId" TEXT,
    "serviceId" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "appliedRuleId" TEXT,
    "requiresReview" BOOLEAN NOT NULL DEFAULT false,
    "durationSeconds" INTEGER,
    "waitingTimeSeconds" INTEGER,
    "firstResponseTimeSeconds" INTEGER,
    "handleTimeSeconds" INTEGER,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NormalizedConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NormalizedMessage" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT,
    "clientId" TEXT,
    "channelConfigId" TEXT,
    "provider" TEXT NOT NULL,
    "providerMessageId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderType" TEXT NOT NULL,
    "messageType" TEXT NOT NULL,
    "messageTextHash" TEXT,
    "intent" TEXT,
    "topic" TEXT,
    "confidence" DOUBLE PRECISION,
    "isFallback" BOOLEAN NOT NULL DEFAULT false,
    "isError" BOOLEAN NOT NULL DEFAULT false,
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "templateName" TEXT,
    "campaignId" TEXT,
    "status" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NormalizedMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsOutcomeRule" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT,
    "clientId" TEXT,
    "channelConfigId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "conditions" JSONB NOT NULL,
    "outcome" TEXT NOT NULL,
    "resolvedBy" TEXT NOT NULL,
    "actions" JSONB,
    "appliesToProvider" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyticsOutcomeRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsKpiTarget" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT,
    "clientId" TEXT,
    "channelConfigId" TEXT,
    "kpiKey" TEXT NOT NULL,
    "period" TEXT,
    "targetValue" DOUBLE PRECISION,
    "warningThreshold" DOUBLE PRECISION,
    "criticalThreshold" DOUBLE PRECISION,
    "direction" TEXT NOT NULL DEFAULT 'higher_is_better',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyticsKpiTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsAuditLog" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT,
    "clientId" TEXT,
    "channelConfigId" TEXT,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsDailyMetric" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT,
    "clientId" TEXT,
    "channelConfigId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "provider" TEXT NOT NULL,
    "botId" TEXT,
    "channel" TEXT,
    "metricKey" TEXT NOT NULL,
    "metricValue" DOUBLE PRECISION NOT NULL,
    "numerator" DOUBLE PRECISION,
    "denominator" DOUBLE PRECISION,
    "dimensions" JSONB,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsDailyMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataQualityIssue" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT,
    "clientId" TEXT,
    "channelConfigId" TEXT,
    "provider" TEXT,
    "conversationId" TEXT,
    "issueType" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'warning',
    "details" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataQualityIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsFunnel" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "provider" TEXT,
    "channel" TEXT,
    "botId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyticsFunnel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsFunnelStep" (
    "id" TEXT NOT NULL,
    "funnelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "conditionType" TEXT NOT NULL,
    "conditionValue" TEXT NOT NULL,

    CONSTRAINT "AnalyticsFunnelStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsAlert" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metricValue" DOUBLE PRECISION,
    "thresholdValue" DOUBLE PRECISION,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationAssetCache" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrationAssetCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsSavedView" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsSavedView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BotmakerLeadRequest" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "customerId" TEXT,
    "botId" TEXT,
    "channelId" TEXT,
    "platform" TEXT,
    "workspaceId" TEXT NOT NULL,
    "sourceKind" TEXT NOT NULL DEFAULT 'unknown',
    "productType" TEXT NOT NULL DEFAULT 'unknown',
    "leadStatus" TEXT NOT NULL DEFAULT 'started',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "abandonedAt" TIMESTAMP(3),
    "lastStepAt" TIMESTAMP(3),
    "lastStepName" TEXT,
    "lastIntentName" TEXT,
    "lastFlowState" TEXT,
    "errorSource" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BotmakerLeadRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BotmakerLeadFieldSnapshot" (
    "id" TEXT NOT NULL,
    "leadRequestId" TEXT NOT NULL,
    "sessionId" TEXT,
    "customerId" TEXT,
    "canonicalField" TEXT NOT NULL,
    "sourceVariableName" TEXT,
    "rawValue" TEXT,
    "maskedValue" TEXT,
    "normalizedValue" TEXT,
    "isPresent" BOOLEAN NOT NULL DEFAULT false,
    "isValid" BOOLEAN NOT NULL DEFAULT false,
    "validationError" TEXT,
    "capturedAt" TIMESTAMP(3),
    "messageId" TEXT,
    "rawPayload" JSONB,

    CONSTRAINT "BotmakerLeadFieldSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BotmakerOcrExtraction" (
    "id" TEXT NOT NULL,
    "leadRequestId" TEXT NOT NULL,
    "sessionId" TEXT,
    "customerId" TEXT,
    "ocrImageUrl" TEXT,
    "detectedRawText" TEXT,
    "detectedNipRaw" TEXT,
    "extractedNip" TEXT,
    "extractedNipExpirationDate" TEXT,
    "extractionStatus" TEXT NOT NULL DEFAULT 'pending',
    "extractionError" TEXT,
    "codeActionName" TEXT,
    "executedAt" TIMESTAMP(3),
    "rawPayload" JSONB,

    CONSTRAINT "BotmakerOcrExtraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntelixSubmission" (
    "id" TEXT NOT NULL,
    "leadRequestId" TEXT NOT NULL,
    "sessionId" TEXT,
    "customerId" TEXT,
    "productType" TEXT NOT NULL DEFAULT 'unknown',
    "submittedAt" TIMESTAMP(3),
    "requestPayload" JSONB,
    "responsePayload" JSONB,
    "status" TEXT NOT NULL DEFAULT 'unknown',
    "crmAcceptanceCondition" TEXT,
    "intelixFolio" TEXT,
    "intelixErrorCode" TEXT,
    "intelixErrorMessage" TEXT,
    "latencyMs" INTEGER,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntelixSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZapierConversionEvent" (
    "id" TEXT NOT NULL,
    "leadRequestId" TEXT NOT NULL,
    "sessionId" TEXT,
    "customerId" TEXT,
    "platformTarget" TEXT NOT NULL DEFAULT 'unknown',
    "zapierStatus" TEXT,
    "zapierResponse" TEXT,
    "gaCid" TEXT,
    "gclid" TEXT,
    "fbclid" TEXT,
    "fbc" TEXT,
    "fbp" TEXT,
    "igPostId" TEXT,
    "fromName" TEXT,
    "sentAt" TIMESTAMP(3),
    "responseAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'unknown',
    "errorMessage" TEXT,
    "rawPayload" JSONB,
    "rawResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ZapierConversionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AriaDataset" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT,
    "clientName" TEXT,
    "verticalName" TEXT,
    "targetType" TEXT NOT NULL DEFAULT 'PROJECT',
    "name" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'uploaded',
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "rawFileUrl" TEXT,
    "delimiter" TEXT,
    "encoding" TEXT,
    "columnCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AriaDataset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AriaDatasetRow" (
    "id" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "rowIndex" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AriaDatasetRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AriaDatasetColumn" (
    "id" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dataType" TEXT NOT NULL,
    "nullCount" INTEGER NOT NULL DEFAULT 0,
    "isTarget" BOOLEAN NOT NULL DEFAULT false,
    "isFeature" BOOLEAN NOT NULL DEFAULT true,
    "distinctCount" INTEGER,
    "minValue" DOUBLE PRECISION,
    "maxValue" DOUBLE PRECISION,
    "meanValue" DOUBLE PRECISION,
    "sampleValues" JSONB,

    CONSTRAINT "AriaDatasetColumn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AriaModel" (
    "id" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'training',
    "accuracy" DOUBLE PRECISION,
    "precision" DOUBLE PRECISION,
    "recall" DOUBLE PRECISION,
    "auc" DOUBLE PRECISION,
    "baseRate" DOUBLE PRECISION,
    "params" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AriaModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AriaModelRun" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "metrics" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AriaModelRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AriaPrediction" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "probability" DOUBLE PRECISION NOT NULL,
    "priority" TEXT NOT NULL,
    "insights" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AriaPrediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CenturionModel" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "verticalName" TEXT,
    "engine" TEXT NOT NULL DEFAULT 'FastMMM',
    "config" JSONB NOT NULL,
    "metrics" JSONB,
    "lastIngestAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CenturionModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MmmWeeklySpend" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "week" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "spend" DOUBLE PRECISION NOT NULL,
    "outcome" DOUBLE PRECISION,
    "source" TEXT NOT NULL DEFAULT 'auto',
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MmmWeeklySpend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptimizationClient" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "environment" TEXT NOT NULL DEFAULT 'production',
    "defaultCurrency" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OptimizationClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptimizationClientProject" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OptimizationClientProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptimizationAdAccount" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalAccountId" TEXT NOT NULL,
    "displayName" TEXT,
    "currency" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "attributionWindow" TEXT NOT NULL,
    "authorized" BOOLEAN NOT NULL DEFAULT false,
    "configuration" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OptimizationAdAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptimizationObjective" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "primaryKpi" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "windowType" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3),
    "windowEnd" TIMESTAMP(3),
    "currency" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "hardConstraints" JSONB NOT NULL,
    "softPreferences" JSONB NOT NULL,
    "guardrails" JSONB NOT NULL,
    "riskTolerance" TEXT NOT NULL,
    "maxChangePctPerCycle" DOUBLE PRECISION NOT NULL,
    "approvalPolicy" JSONB NOT NULL,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OptimizationObjective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptimizationSnapshot" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "cutoffAt" TIMESTAMP(3) NOT NULL,
    "currency" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "authorizedAdAccounts" JSONB NOT NULL,
    "sources" JSONB NOT NULL,
    "freshness" JSONB NOT NULL,
    "normalizedMetrics" JSONB NOT NULL,
    "activeObjective" JSONB NOT NULL,
    "dataQuality" JSONB NOT NULL,
    "modelVersions" JSONB NOT NULL,
    "configuration" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OptimizationSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptimizationAnalysisResult" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "analysisType" TEXT NOT NULL,
    "observations" JSONB NOT NULL,
    "inferences" JSONB NOT NULL,
    "predictions" JSONB NOT NULL,
    "candidateRecommendations" JSONB NOT NULL,
    "evidence" JSONB NOT NULL,
    "confidence" JSONB NOT NULL,
    "limitations" JSONB NOT NULL,
    "model" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OptimizationAnalysisResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptimizationProposedAction" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "campaignId" TEXT,
    "entity" JSONB NOT NULL,
    "field" TEXT NOT NULL,
    "currentValue" JSONB NOT NULL,
    "proposedValue" JSONB NOT NULL,
    "unit" TEXT NOT NULL,
    "currency" TEXT,
    "expectedImpact" JSONB NOT NULL,
    "uncertaintyInterval" JSONB NOT NULL,
    "risk" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "rollbackCondition" JSONB NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "remoteStateFingerprint" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "requiredApproverRole" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'draft',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OptimizationProposedAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptimizationActionApproval" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "actionId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "approverRole" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "comment" TEXT,
    "actionFingerprint" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OptimizationActionApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptimizationActionExecution" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "actionId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "requestedByRole" TEXT NOT NULL,
    "actionFingerprint" TEXT NOT NULL,
    "expectedRemoteFingerprint" TEXT NOT NULL,
    "observedRemoteFingerprint" TEXT,
    "remoteBefore" JSONB,
    "remoteAfter" JSONB,
    "providerRequestId" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "OptimizationActionExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptimizationEvaluation" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "sourceSnapshotId" TEXT NOT NULL,
    "outcomeSnapshotId" TEXT NOT NULL,
    "analysisResultId" TEXT,
    "actionId" TEXT,
    "evaluationType" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "aggregation" TEXT NOT NULL,
    "scope" JSONB NOT NULL,
    "predictedValue" DOUBLE PRECISION NOT NULL,
    "actualValue" DOUBLE PRECISION,
    "baselineValue" DOUBLE PRECISION,
    "intervalLow" DOUBLE PRECISION,
    "intervalHigh" DOUBLE PRECISION,
    "intervalLevel" DOUBLE PRECISION,
    "predictionLocator" TEXT NOT NULL,
    "absoluteError" DOUBLE PRECISION,
    "percentageError" DOUBLE PRECISION,
    "withinInterval" BOOLEAN,
    "directionalCorrect" BOOLEAN,
    "sampleSize" INTEGER NOT NULL,
    "minimumSampleSize" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "causalClaimAllowed" BOOLEAN NOT NULL DEFAULT false,
    "guardrailResults" JSONB NOT NULL,
    "limitations" JSONB NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdById" TEXT,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OptimizationEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptimizationAuditEvent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "snapshotId" TEXT,
    "actionId" TEXT,
    "actorId" TEXT,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OptimizationAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "dateFrom" TIMESTAMP(3) NOT NULL,
    "dateTo" TIMESTAMP(3) NOT NULL,
    "data" JSONB NOT NULL,
    "settings" JSONB,
    "status" TEXT NOT NULL DEFAULT 'active',
    "expiresAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiRequest" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AiRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiRun" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "actualProviderModelId" TEXT NOT NULL,
    "promptVersion" TEXT,
    "workflowVersion" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "latencyMs" INTEGER,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "cachedTokens" INTEGER NOT NULL DEFAULT 0,
    "providerCost" DECIMAL(19,4),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "fallbackFromRunId" TEXT,
    "errorCode" TEXT,

    CONSTRAINT "AiRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelDecision" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "aiRunId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "candidates" TEXT[],
    "selectedMode" TEXT NOT NULL,
    "powerTier" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModelDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiUsage" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "requestId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "provider" TEXT,
    "tokensIn" INTEGER NOT NULL DEFAULT 0,
    "tokensOut" INTEGER NOT NULL DEFAULT 0,
    "providerCostUsd" DECIMAL(19,4),
    "customerChargeUsd" DECIMAL(19,4),
    "feature" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiModelPricing" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerModelId" TEXT NOT NULL,
    "inputPrice" DECIMAL(19,6) NOT NULL,
    "outputPrice" DECIMAL(19,6) NOT NULL,
    "cachedInputPrice" DECIMAL(19,6),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "sourceMetadata" TEXT,

    CONSTRAINT "AiModelPricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeaturePricing" (
    "id" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "pricingMode" TEXT NOT NULL,
    "fixedCost" DECIMAL(19,4),
    "creditsCost" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeaturePricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceEntitlement" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "saasPlan" TEXT NOT NULL DEFAULT 'FREE',
    "allowedFeatures" TEXT[],
    "monthlyAiBudget" DECIMAL(19,4),
    "autopilotEnabled" BOOLEAN NOT NULL DEFAULT false,
    "dailyAutopilotAiBudget" DECIMAL(19,4),
    "maxAiCostPerRun" DECIMAL(19,4),
    "availableCredits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceEntitlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "resetAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "BillingCustomer" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "stripeCustomerId" TEXT NOT NULL,

    CONSTRAINT "BillingCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingEvent" (
    "id" TEXT NOT NULL,
    "stripeEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "livemode" BOOLEAN NOT NULL,
    "processingStatus" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "BillingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingUsageEvent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "aiUsageId" TEXT NOT NULL,
    "stripeMeterEventIdentifier" TEXT NOT NULL,
    "meterName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "sentAt" TIMESTAMP(3),
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAttemptAt" TIMESTAMP(3),
    "nextAttemptAt" TIMESTAMP(3),

    CONSTRAINT "BillingUsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "stripeInvoiceId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "amountDue" INTEGER NOT NULL,
    "amountPaid" INTEGER NOT NULL,
    "hostedInvoiceUrl" TEXT,
    "billingPeriod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceAiBudgetBalance" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "customerAiAllowance" DECIMAL(19,4) NOT NULL DEFAULT 0.00,
    "customerBilledUsd" DECIMAL(19,4) NOT NULL DEFAULT 0.00,
    "customerReservedUsd" DECIMAL(19,4) NOT NULL DEFAULT 0.00,
    "internalProviderSpendLimit" DECIMAL(19,4) NOT NULL DEFAULT 0.00,
    "internalProviderCostUsd" DECIMAL(19,4) NOT NULL DEFAULT 0.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceAiBudgetBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiReservationLedger" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "reservedCostUsd" DECIMAL(19,4) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RESERVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" TIMESTAMP(3),

    CONSTRAINT "AiReservationLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalCostRate" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "component" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "amount" DECIMAL(19,6) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "sourceUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalCostRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanVersion" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "basePriceUsd" DECIMAL(19,4) NOT NULL,
    "annualPriceUsd" DECIMAL(19,4) NOT NULL,
    "includedSeats" INTEGER NOT NULL DEFAULT 1,
    "includedWs" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanPrice" (
    "id" TEXT NOT NULL,
    "planVersionId" TEXT NOT NULL,
    "stripePriceId" TEXT NOT NULL,
    "billingPeriod" TEXT NOT NULL,

    CONSTRAINT "PlanPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Module" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "implementationType" TEXT NOT NULL,
    "isPurchasable" BOOLEAN NOT NULL DEFAULT false,
    "isAddon" BOOLEAN NOT NULL DEFAULT false,
    "frontendRoute" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanModule" (
    "id" TEXT NOT NULL,
    "planVersionId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "inclusion" TEXT NOT NULL,
    "usageLimit" INTEGER,

    CONSTRAINT "PlanModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiPackage" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiPackageVersion" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "feeMode" TEXT NOT NULL DEFAULT 'INCLUDED_IN_PLAN',
    "baseFeeUsd" DECIMAL(19,4) NOT NULL,
    "includedUnits" INTEGER NOT NULL DEFAULT 0,
    "variableUnitPrice" DECIMAL(19,6) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiPackageVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingLedgerEntry" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit" TEXT NOT NULL,
    "unitAmount" DECIMAL(19,4) NOT NULL,
    "subtotal" DECIMAL(19,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingProfile" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "legalName" TEXT,
    "entityType" TEXT,
    "billingEmail" TEXT,
    "country" TEXT,
    "address" TEXT,
    "taxIdType" TEXT,
    "taxId" TEXT,
    "fiscalMetadata" JSONB,
    "notifyOwner" BOOLEAN NOT NULL DEFAULT true,
    "paymentFailedEmail" BOOLEAN NOT NULL DEFAULT true,
    "invoiceAvailableEmail" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingRecoveryPolicy" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "gracePeriodDays" INTEGER NOT NULL DEFAULT 3,
    "notificationSchedule" JSONB NOT NULL DEFAULT '[]',
    "aiRestrictionPointDays" INTEGER NOT NULL DEFAULT 3,
    "serviceRestrictionDays" INTEGER NOT NULL DEFAULT 7,
    "unpaidBehavior" TEXT NOT NULL DEFAULT 'suspend',
    "cancellationBehavior" TEXT NOT NULL DEFAULT 'revoke_access',
    "hardLimitUsd" DECIMAL(19,4) NOT NULL DEFAULT 0.00,
    "graceBudgetPercent" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingRecoveryPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FiscalDocument" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "status" TEXT NOT NULL,
    "uuid" TEXT,
    "xmlUrl" TEXT,
    "pdfUrl" TEXT,
    "issuedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "jurisdiction" TEXT NOT NULL DEFAULT 'MX',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FiscalDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingNotification" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "type" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "providerMsgId" TEXT,
    "lastError" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingRecoveryCase" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "gracePeriodEnd" TIMESTAMP(3),
    "restrictedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingRecoveryCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_TaskDependencies" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TaskDependencies_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceSettings_workspaceId_key" ON "WorkspaceSettings"("workspaceId");

-- CreateIndex
CREATE INDEX "WorkspaceMember_userId_idx" ON "WorkspaceMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMember_workspaceId_userId_key" ON "WorkspaceMember"("workspaceId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceInvite_token_key" ON "WorkspaceInvite"("token");

-- CreateIndex
CREATE INDEX "WorkspaceInvite_workspaceId_idx" ON "WorkspaceInvite"("workspaceId");

-- CreateIndex
CREATE INDEX "WorkspaceInvite_workspaceId_email_idx" ON "WorkspaceInvite"("workspaceId", "email");

-- CreateIndex
CREATE INDEX "WorkspaceInvite_workspaceId_acceptedAt_idx" ON "WorkspaceInvite"("workspaceId", "acceptedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Project_publicToken_key" ON "Project"("publicToken");

-- CreateIndex
CREATE UNIQUE INDEX "Project_workspaceId_id_key" ON "Project"("workspaceId", "id");

-- CreateIndex
CREATE INDEX "MetaSource_externalId_idx" ON "MetaSource"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "MetaSource_externalId_projectId_key" ON "MetaSource"("externalId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "WaPhoneSource_phoneNumberId_key" ON "WaPhoneSource"("phoneNumberId");

-- CreateIndex
CREATE INDEX "WaPhoneSource_phoneNumberId_idx" ON "WaPhoneSource"("phoneNumberId");

-- CreateIndex
CREATE INDEX "GoogleSource_externalId_idx" ON "GoogleSource"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleSource_externalId_projectId_key" ON "GoogleSource"("externalId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMember_projectId_userId_key" ON "ProjectMember"("projectId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Capturista_userId_key" ON "Capturista"("userId");

-- CreateIndex
CREATE INDEX "Objective_workspaceId_idx" ON "Objective"("workspaceId");

-- CreateIndex
CREATE INDEX "Objective_workspaceId_areaId_idx" ON "Objective"("workspaceId", "areaId");

-- CreateIndex
CREATE INDEX "KeyResult_objectiveId_idx" ON "KeyResult"("objectiveId");

-- CreateIndex
CREATE INDEX "Task_workspaceId_idx" ON "Task"("workspaceId");

-- CreateIndex
CREATE INDEX "Task_workspaceId_status_idx" ON "Task"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Task_parentId_idx" ON "Task"("parentId");

-- CreateIndex
CREATE INDEX "Task_briefId_idx" ON "Task"("briefId");

-- CreateIndex
CREATE INDEX "Task_workspaceId_approvalState_idx" ON "Task"("workspaceId", "approvalState");

-- CreateIndex
CREATE INDEX "Task_workspaceId_lastProgressAt_idx" ON "Task"("workspaceId", "lastProgressAt");

-- CreateIndex
CREATE INDEX "TaskComment_taskId_idx" ON "TaskComment"("taskId");

-- CreateIndex
CREATE INDEX "TaskActivity_taskId_idx" ON "TaskActivity"("taskId");

-- CreateIndex
CREATE INDEX "Brief_workspaceId_idx" ON "Brief"("workspaceId");

-- CreateIndex
CREATE INDEX "Brief_workspaceId_status_idx" ON "Brief"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "MediaAsset_workspaceId_idx" ON "MediaAsset"("workspaceId");

-- CreateIndex
CREATE INDEX "MediaAsset_workspaceId_projectId_idx" ON "MediaAsset"("workspaceId", "projectId");

-- CreateIndex
CREATE INDEX "AssetGroup_workspaceId_idx" ON "AssetGroup"("workspaceId");

-- CreateIndex
CREATE INDEX "DraftPost_workspaceId_status_idx" ON "DraftPost"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "DraftPost_scheduledAt_idx" ON "DraftPost"("scheduledAt");

-- CreateIndex
CREATE INDEX "Transmission_draftId_idx" ON "Transmission"("draftId");

-- CreateIndex
CREATE INDEX "Transmission_workspaceId_status_idx" ON "Transmission"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Transmission_scheduledAt_idx" ON "Transmission"("scheduledAt");

-- CreateIndex
CREATE INDEX "PublishJob_transmissionId_idx" ON "PublishJob"("transmissionId");

-- CreateIndex
CREATE INDEX "PublishJob_status_nextAttemptAt_idx" ON "PublishJob"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "AuditLog_workspaceId_action_idx" ON "AuditLog"("workspaceId", "action");

-- CreateIndex
CREATE INDEX "AuditLog_workspaceId_createdAt_idx" ON "AuditLog"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "ScheduledPost_workspaceId_idx" ON "ScheduledPost"("workspaceId");

-- CreateIndex
CREATE INDEX "ScheduledPost_workspaceId_status_idx" ON "ScheduledPost"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "ScheduledPost_scheduledAt_idx" ON "ScheduledPost"("scheduledAt");

-- CreateIndex
CREATE INDEX "ScheduledPost_qStashMessageId_idx" ON "ScheduledPost"("qStashMessageId");

-- CreateIndex
CREATE INDEX "Integration_workspaceId_userId_idx" ON "Integration"("workspaceId", "userId");

-- CreateIndex
CREATE INDEX "Integration_workspaceId_provider_idx" ON "Integration"("workspaceId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "Integration_workspaceId_provider_userId_key" ON "Integration"("workspaceId", "provider", "userId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE INDEX "ProjectAlert_projectId_idx" ON "ProjectAlert"("projectId");

-- CreateIndex
CREATE INDEX "ProjectAlert_createdAt_idx" ON "ProjectAlert"("createdAt");

-- CreateIndex
CREATE INDEX "InboxConversation_workspaceId_idx" ON "InboxConversation"("workspaceId");

-- CreateIndex
CREATE INDEX "InboxConversation_workspaceId_status_idx" ON "InboxConversation"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "InboxConversation_contactId_idx" ON "InboxConversation"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "InboxConversation_workspaceId_externalId_key" ON "InboxConversation"("workspaceId", "externalId");

-- CreateIndex
CREATE INDEX "Contact_workspaceId_idx" ON "Contact"("workspaceId");

-- CreateIndex
CREATE INDEX "Contact_workspaceId_lifecycleStage_idx" ON "Contact"("workspaceId", "lifecycleStage");

-- CreateIndex
CREATE INDEX "Contact_workspaceId_ownerId_idx" ON "Contact"("workspaceId", "ownerId");

-- CreateIndex
CREATE INDEX "ContactChannel_contactId_idx" ON "ContactChannel"("contactId");

-- CreateIndex
CREATE INDEX "ContactChannel_workspaceId_idx" ON "ContactChannel"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "ContactChannel_workspaceId_platform_externalId_key" ON "ContactChannel"("workspaceId", "platform", "externalId");

-- CreateIndex
CREATE INDEX "InboxMessage_conversationId_idx" ON "InboxMessage"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "InboxMessage_conversationId_externalId_key" ON "InboxMessage"("conversationId", "externalId");

-- CreateIndex
CREATE INDEX "SavedReply_workspaceId_idx" ON "SavedReply"("workspaceId");

-- CreateIndex
CREATE INDEX "InboxNote_conversationId_idx" ON "InboxNote"("conversationId");

-- CreateIndex
CREATE INDEX "DmAutomationRule_workspaceId_idx" ON "DmAutomationRule"("workspaceId");

-- CreateIndex
CREATE INDEX "DmAutomationRule_workspaceId_active_idx" ON "DmAutomationRule"("workspaceId", "active");

-- CreateIndex
CREATE INDEX "TrackedKeyword_workspaceId_idx" ON "TrackedKeyword"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "TrackedKeyword_workspaceId_query_key" ON "TrackedKeyword"("workspaceId", "query");

-- CreateIndex
CREATE INDEX "ListeningQuery_workspaceId_idx" ON "ListeningQuery"("workspaceId");

-- CreateIndex
CREATE INDEX "ListeningMention_queryId_idx" ON "ListeningMention"("queryId");

-- CreateIndex
CREATE INDEX "ListeningMention_publishedAt_idx" ON "ListeningMention"("publishedAt");

-- CreateIndex
CREATE INDEX "StreamBoard_workspaceId_idx" ON "StreamBoard"("workspaceId");

-- CreateIndex
CREATE INDEX "StreamColumn_boardId_idx" ON "StreamColumn"("boardId");

-- CreateIndex
CREATE UNIQUE INDEX "DataDeletionRequest_confirmationCode_key" ON "DataDeletionRequest"("confirmationCode");

-- CreateIndex
CREATE INDEX "DataDeletionRequest_metaUserId_idx" ON "DataDeletionRequest"("metaUserId");

-- CreateIndex
CREATE INDEX "DataDeletionRequest_status_idx" ON "DataDeletionRequest"("status");

-- CreateIndex
CREATE INDEX "MetaAdsCache_workspaceId_adAccountId_idx" ON "MetaAdsCache"("workspaceId", "adAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "MetaAdsCache_workspaceId_adAccountId_level_dateRange_key" ON "MetaAdsCache"("workspaceId", "adAccountId", "level", "dateRange");

-- CreateIndex
CREATE INDEX "GoogleAdsCache_workspaceId_idx" ON "GoogleAdsCache"("workspaceId");

-- CreateIndex
CREATE INDEX "GoogleAdsCache_customerId_idx" ON "GoogleAdsCache"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleAdsCache_workspaceId_customerId_level_dateRange_key" ON "GoogleAdsCache"("workspaceId", "customerId", "level", "dateRange");

-- CreateIndex
CREATE INDEX "MetaAnalyticsCache_workspaceId_idx" ON "MetaAnalyticsCache"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "MetaAnalyticsCache_workspaceId_endpoint_paramsKey_key" ON "MetaAnalyticsCache"("workspaceId", "endpoint", "paramsKey");

-- CreateIndex
CREATE INDEX "SyncJob_workspaceId_provider_idx" ON "SyncJob"("workspaceId", "provider");

-- CreateIndex
CREATE INDEX "SyncJob_workspaceId_projectId_idx" ON "SyncJob"("workspaceId", "projectId");

-- CreateIndex
CREATE INDEX "RawProviderEvent_workspaceId_provider_idx" ON "RawProviderEvent"("workspaceId", "provider");

-- CreateIndex
CREATE INDEX "RawProviderEvent_workspaceId_projectId_idx" ON "RawProviderEvent"("workspaceId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "NormalizedConversation_providerConversationId_key" ON "NormalizedConversation"("providerConversationId");

-- CreateIndex
CREATE INDEX "NormalizedConversation_workspaceId_conversationStartedAt_idx" ON "NormalizedConversation"("workspaceId", "conversationStartedAt");

-- CreateIndex
CREATE INDEX "NormalizedConversation_workspaceId_provider_providerConvers_idx" ON "NormalizedConversation"("workspaceId", "provider", "providerConversationId");

-- CreateIndex
CREATE INDEX "NormalizedConversation_workspaceId_agentId_idx" ON "NormalizedConversation"("workspaceId", "agentId");

-- CreateIndex
CREATE INDEX "NormalizedConversation_workspaceId_campaignId_idx" ON "NormalizedConversation"("workspaceId", "campaignId");

-- CreateIndex
CREATE INDEX "NormalizedConversation_workspaceId_projectId_idx" ON "NormalizedConversation"("workspaceId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "NormalizedMessage_providerMessageId_key" ON "NormalizedMessage"("providerMessageId");

-- CreateIndex
CREATE INDEX "NormalizedMessage_workspaceId_conversationId_idx" ON "NormalizedMessage"("workspaceId", "conversationId");

-- CreateIndex
CREATE INDEX "NormalizedMessage_workspaceId_projectId_idx" ON "NormalizedMessage"("workspaceId", "projectId");

-- CreateIndex
CREATE INDEX "AnalyticsOutcomeRule_workspaceId_priority_idx" ON "AnalyticsOutcomeRule"("workspaceId", "priority");

-- CreateIndex
CREATE INDEX "AnalyticsOutcomeRule_workspaceId_projectId_idx" ON "AnalyticsOutcomeRule"("workspaceId", "projectId");

-- CreateIndex
CREATE INDEX "AnalyticsKpiTarget_workspaceId_idx" ON "AnalyticsKpiTarget"("workspaceId");

-- CreateIndex
CREATE INDEX "AnalyticsKpiTarget_workspaceId_projectId_idx" ON "AnalyticsKpiTarget"("workspaceId", "projectId");

-- CreateIndex
CREATE INDEX "AnalyticsKpiTarget_period_idx" ON "AnalyticsKpiTarget"("period");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsKpiTarget_workspaceId_kpiKey_projectId_period_key" ON "AnalyticsKpiTarget"("workspaceId", "kpiKey", "projectId", "period");

-- CreateIndex
CREATE INDEX "AnalyticsAuditLog_workspaceId_createdAt_idx" ON "AnalyticsAuditLog"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsAuditLog_workspaceId_projectId_idx" ON "AnalyticsAuditLog"("workspaceId", "projectId");

-- CreateIndex
CREATE INDEX "AnalyticsDailyMetric_workspaceId_date_idx" ON "AnalyticsDailyMetric"("workspaceId", "date");

-- CreateIndex
CREATE INDEX "AnalyticsDailyMetric_workspaceId_projectId_idx" ON "AnalyticsDailyMetric"("workspaceId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsDailyMetric_workspaceId_projectId_date_provider_bo_key" ON "AnalyticsDailyMetric"("workspaceId", "projectId", "date", "provider", "botId", "channel", "metricKey");

-- CreateIndex
CREATE INDEX "DataQualityIssue_workspaceId_issueType_idx" ON "DataQualityIssue"("workspaceId", "issueType");

-- CreateIndex
CREATE INDEX "DataQualityIssue_workspaceId_projectId_idx" ON "DataQualityIssue"("workspaceId", "projectId");

-- CreateIndex
CREATE INDEX "AnalyticsFunnel_workspaceId_idx" ON "AnalyticsFunnel"("workspaceId");

-- CreateIndex
CREATE INDEX "AnalyticsFunnel_workspaceId_projectId_idx" ON "AnalyticsFunnel"("workspaceId", "projectId");

-- CreateIndex
CREATE INDEX "AnalyticsFunnelStep_funnelId_idx" ON "AnalyticsFunnelStep"("funnelId");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsFunnelStep_funnelId_orderIndex_key" ON "AnalyticsFunnelStep"("funnelId", "orderIndex");

-- CreateIndex
CREATE INDEX "AnalyticsAlert_workspaceId_type_idx" ON "AnalyticsAlert"("workspaceId", "type");

-- CreateIndex
CREATE INDEX "AnalyticsAlert_workspaceId_projectId_idx" ON "AnalyticsAlert"("workspaceId", "projectId");

-- CreateIndex
CREATE INDEX "AnalyticsAlert_workspaceId_resolved_idx" ON "AnalyticsAlert"("workspaceId", "resolved");

-- CreateIndex
CREATE INDEX "IntegrationAssetCache_workspaceId_assetType_idx" ON "IntegrationAssetCache"("workspaceId", "assetType");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationAssetCache_integrationId_assetType_externalId_key" ON "IntegrationAssetCache"("integrationId", "assetType", "externalId");

-- CreateIndex
CREATE INDEX "AnalyticsSavedView_workspaceId_projectId_idx" ON "AnalyticsSavedView"("workspaceId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "BotmakerLeadRequest_requestId_key" ON "BotmakerLeadRequest"("requestId");

-- CreateIndex
CREATE INDEX "BotmakerLeadRequest_workspaceId_leadStatus_idx" ON "BotmakerLeadRequest"("workspaceId", "leadStatus");

-- CreateIndex
CREATE INDEX "BotmakerLeadRequest_workspaceId_sessionId_idx" ON "BotmakerLeadRequest"("workspaceId", "sessionId");

-- CreateIndex
CREATE INDEX "BotmakerLeadRequest_workspaceId_customerId_idx" ON "BotmakerLeadRequest"("workspaceId", "customerId");

-- CreateIndex
CREATE INDEX "BotmakerLeadRequest_workspaceId_botId_idx" ON "BotmakerLeadRequest"("workspaceId", "botId");

-- CreateIndex
CREATE INDEX "BotmakerLeadRequest_workspaceId_channelId_idx" ON "BotmakerLeadRequest"("workspaceId", "channelId");

-- CreateIndex
CREATE INDEX "BotmakerLeadRequest_workspaceId_productType_idx" ON "BotmakerLeadRequest"("workspaceId", "productType");

-- CreateIndex
CREATE INDEX "BotmakerLeadRequest_workspaceId_createdAt_idx" ON "BotmakerLeadRequest"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "BotmakerLeadFieldSnapshot_leadRequestId_idx" ON "BotmakerLeadFieldSnapshot"("leadRequestId");

-- CreateIndex
CREATE INDEX "BotmakerLeadFieldSnapshot_leadRequestId_canonicalField_idx" ON "BotmakerLeadFieldSnapshot"("leadRequestId", "canonicalField");

-- CreateIndex
CREATE INDEX "BotmakerLeadFieldSnapshot_sessionId_idx" ON "BotmakerLeadFieldSnapshot"("sessionId");

-- CreateIndex
CREATE INDEX "BotmakerOcrExtraction_leadRequestId_idx" ON "BotmakerOcrExtraction"("leadRequestId");

-- CreateIndex
CREATE INDEX "BotmakerOcrExtraction_sessionId_idx" ON "BotmakerOcrExtraction"("sessionId");

-- CreateIndex
CREATE INDEX "BotmakerOcrExtraction_extractionStatus_idx" ON "BotmakerOcrExtraction"("extractionStatus");

-- CreateIndex
CREATE INDEX "IntelixSubmission_leadRequestId_idx" ON "IntelixSubmission"("leadRequestId");

-- CreateIndex
CREATE INDEX "IntelixSubmission_sessionId_idx" ON "IntelixSubmission"("sessionId");

-- CreateIndex
CREATE INDEX "IntelixSubmission_status_idx" ON "IntelixSubmission"("status");

-- CreateIndex
CREATE INDEX "IntelixSubmission_createdAt_idx" ON "IntelixSubmission"("createdAt");

-- CreateIndex
CREATE INDEX "ZapierConversionEvent_leadRequestId_idx" ON "ZapierConversionEvent"("leadRequestId");

-- CreateIndex
CREATE INDEX "ZapierConversionEvent_sessionId_idx" ON "ZapierConversionEvent"("sessionId");

-- CreateIndex
CREATE INDEX "ZapierConversionEvent_status_idx" ON "ZapierConversionEvent"("status");

-- CreateIndex
CREATE INDEX "ZapierConversionEvent_igPostId_idx" ON "ZapierConversionEvent"("igPostId");

-- CreateIndex
CREATE INDEX "ZapierConversionEvent_gaCid_idx" ON "ZapierConversionEvent"("gaCid");

-- CreateIndex
CREATE INDEX "AriaDataset_workspaceId_idx" ON "AriaDataset"("workspaceId");

-- CreateIndex
CREATE INDEX "AriaDataset_projectId_idx" ON "AriaDataset"("projectId");

-- CreateIndex
CREATE INDEX "AriaDataset_clientName_idx" ON "AriaDataset"("clientName");

-- CreateIndex
CREATE INDEX "AriaDataset_verticalName_idx" ON "AriaDataset"("verticalName");

-- CreateIndex
CREATE UNIQUE INDEX "AriaDataset_workspaceId_targetType_clientName_key" ON "AriaDataset"("workspaceId", "targetType", "clientName");

-- CreateIndex
CREATE UNIQUE INDEX "AriaDataset_workspaceId_targetType_verticalName_key" ON "AriaDataset"("workspaceId", "targetType", "verticalName");

-- CreateIndex
CREATE UNIQUE INDEX "AriaDataset_workspaceId_targetType_projectId_key" ON "AriaDataset"("workspaceId", "targetType", "projectId");

-- CreateIndex
CREATE INDEX "AriaDatasetRow_datasetId_idx" ON "AriaDatasetRow"("datasetId");

-- CreateIndex
CREATE UNIQUE INDEX "AriaDatasetRow_datasetId_rowIndex_key" ON "AriaDatasetRow"("datasetId", "rowIndex");

-- CreateIndex
CREATE INDEX "AriaDatasetColumn_datasetId_idx" ON "AriaDatasetColumn"("datasetId");

-- CreateIndex
CREATE INDEX "AriaModel_datasetId_idx" ON "AriaModel"("datasetId");

-- CreateIndex
CREATE INDEX "AriaModelRun_modelId_idx" ON "AriaModelRun"("modelId");

-- CreateIndex
CREATE INDEX "AriaPrediction_modelId_idx" ON "AriaPrediction"("modelId");

-- CreateIndex
CREATE UNIQUE INDEX "CenturionModel_workspaceId_clientName_key" ON "CenturionModel"("workspaceId", "clientName");

-- CreateIndex
CREATE INDEX "MmmWeeklySpend_workspaceId_clientName_idx" ON "MmmWeeklySpend"("workspaceId", "clientName");

-- CreateIndex
CREATE UNIQUE INDEX "MmmWeeklySpend_workspaceId_clientName_week_channel_key" ON "MmmWeeklySpend"("workspaceId", "clientName", "week", "channel");

-- CreateIndex
CREATE INDEX "OptimizationClient_workspaceId_environment_status_idx" ON "OptimizationClient"("workspaceId", "environment", "status");

-- CreateIndex
CREATE UNIQUE INDEX "OptimizationClient_workspaceId_key_key" ON "OptimizationClient"("workspaceId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "OptimizationClient_workspaceId_id_key" ON "OptimizationClient"("workspaceId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "OptimizationClientProject_projectId_key" ON "OptimizationClientProject"("projectId");

-- CreateIndex
CREATE INDEX "OptimizationClientProject_workspaceId_clientId_idx" ON "OptimizationClientProject"("workspaceId", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "OptimizationClientProject_workspaceId_clientId_projectId_key" ON "OptimizationClientProject"("workspaceId", "clientId", "projectId");

-- CreateIndex
CREATE INDEX "OptimizationAdAccount_workspaceId_clientId_authorized_idx" ON "OptimizationAdAccount"("workspaceId", "clientId", "authorized");

-- CreateIndex
CREATE UNIQUE INDEX "OptimizationAdAccount_clientId_provider_externalAccountId_key" ON "OptimizationAdAccount"("clientId", "provider", "externalAccountId");

-- CreateIndex
CREATE INDEX "OptimizationObjective_workspaceId_clientId_status_idx" ON "OptimizationObjective"("workspaceId", "clientId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "OptimizationObjective_clientId_version_key" ON "OptimizationObjective"("clientId", "version");

-- CreateIndex
CREATE INDEX "OptimizationSnapshot_workspaceId_clientId_cutoffAt_idx" ON "OptimizationSnapshot"("workspaceId", "clientId", "cutoffAt");

-- CreateIndex
CREATE UNIQUE INDEX "OptimizationSnapshot_workspaceId_clientId_contentHash_key" ON "OptimizationSnapshot"("workspaceId", "clientId", "contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "OptimizationSnapshot_workspaceId_clientId_id_key" ON "OptimizationSnapshot"("workspaceId", "clientId", "id");

-- CreateIndex
CREATE INDEX "OptimizationAnalysisResult_workspaceId_clientId_createdAt_idx" ON "OptimizationAnalysisResult"("workspaceId", "clientId", "createdAt");

-- CreateIndex
CREATE INDEX "OptimizationAnalysisResult_snapshotId_analysisType_idx" ON "OptimizationAnalysisResult"("snapshotId", "analysisType");

-- CreateIndex
CREATE UNIQUE INDEX "OptimizationProposedAction_idempotencyKey_key" ON "OptimizationProposedAction"("idempotencyKey");

-- CreateIndex
CREATE INDEX "OptimizationProposedAction_workspaceId_clientId_state_idx" ON "OptimizationProposedAction"("workspaceId", "clientId", "state");

-- CreateIndex
CREATE INDEX "OptimizationProposedAction_snapshotId_idx" ON "OptimizationProposedAction"("snapshotId");

-- CreateIndex
CREATE UNIQUE INDEX "OptimizationProposedAction_workspaceId_clientId_id_key" ON "OptimizationProposedAction"("workspaceId", "clientId", "id");

-- CreateIndex
CREATE INDEX "OptimizationActionApproval_workspaceId_clientId_actionId_cr_idx" ON "OptimizationActionApproval"("workspaceId", "clientId", "actionId", "createdAt");

-- CreateIndex
CREATE INDEX "OptimizationActionApproval_actionId_approverId_createdAt_idx" ON "OptimizationActionApproval"("actionId", "approverId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OptimizationActionExecution_idempotencyKey_key" ON "OptimizationActionExecution"("idempotencyKey");

-- CreateIndex
CREATE INDEX "OptimizationActionExecution_workspaceId_createdAt_idx" ON "OptimizationActionExecution"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "OptimizationActionExecution_workspaceId_clientId_actionId_c_idx" ON "OptimizationActionExecution"("workspaceId", "clientId", "actionId", "createdAt");

-- CreateIndex
CREATE INDEX "OptimizationActionExecution_actionId_operation_status_idx" ON "OptimizationActionExecution"("actionId", "operation", "status");

-- CreateIndex
CREATE UNIQUE INDEX "OptimizationEvaluation_idempotencyKey_key" ON "OptimizationEvaluation"("idempotencyKey");

-- CreateIndex
CREATE INDEX "OptimizationEvaluation_workspaceId_clientId_evaluatedAt_idx" ON "OptimizationEvaluation"("workspaceId", "clientId", "evaluatedAt");

-- CreateIndex
CREATE INDEX "OptimizationEvaluation_sourceSnapshotId_idx" ON "OptimizationEvaluation"("sourceSnapshotId");

-- CreateIndex
CREATE INDEX "OptimizationEvaluation_outcomeSnapshotId_idx" ON "OptimizationEvaluation"("outcomeSnapshotId");

-- CreateIndex
CREATE INDEX "OptimizationEvaluation_analysisResultId_idx" ON "OptimizationEvaluation"("analysisResultId");

-- CreateIndex
CREATE INDEX "OptimizationEvaluation_actionId_idx" ON "OptimizationEvaluation"("actionId");

-- CreateIndex
CREATE UNIQUE INDEX "OptimizationEvaluation_workspaceId_clientId_id_key" ON "OptimizationEvaluation"("workspaceId", "clientId", "id");

-- CreateIndex
CREATE INDEX "OptimizationAuditEvent_workspaceId_clientId_createdAt_idx" ON "OptimizationAuditEvent"("workspaceId", "clientId", "createdAt");

-- CreateIndex
CREATE INDEX "OptimizationAuditEvent_snapshotId_idx" ON "OptimizationAuditEvent"("snapshotId");

-- CreateIndex
CREATE INDEX "OptimizationAuditEvent_actionId_idx" ON "OptimizationAuditEvent"("actionId");

-- CreateIndex
CREATE UNIQUE INDEX "Report_slug_key" ON "Report"("slug");

-- CreateIndex
CREATE INDEX "Report_workspaceId_idx" ON "Report"("workspaceId");

-- CreateIndex
CREATE INDEX "Report_projectId_idx" ON "Report"("projectId");

-- CreateIndex
CREATE INDEX "Report_slug_idx" ON "Report"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "AiRequest_idempotencyKey_key" ON "AiRequest"("idempotencyKey");

-- CreateIndex
CREATE INDEX "AiRequest_workspaceId_idx" ON "AiRequest"("workspaceId");

-- CreateIndex
CREATE INDEX "AiRequest_status_idx" ON "AiRequest"("status");

-- CreateIndex
CREATE INDEX "AiRun_requestId_idx" ON "AiRun"("requestId");

-- CreateIndex
CREATE INDEX "AiRun_workspaceId_idx" ON "AiRun"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "ModelDecision_aiRunId_key" ON "ModelDecision"("aiRunId");

-- CreateIndex
CREATE INDEX "ModelDecision_workspaceId_idx" ON "ModelDecision"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "AiUsage_idempotencyKey_key" ON "AiUsage"("idempotencyKey");

-- CreateIndex
CREATE INDEX "AiUsage_workspaceId_idx" ON "AiUsage"("workspaceId");

-- CreateIndex
CREATE INDEX "AiUsage_createdAt_idx" ON "AiUsage"("createdAt");

-- CreateIndex
CREATE INDEX "AiUsage_requestId_idx" ON "AiUsage"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "AiModelPricing_provider_providerModelId_effectiveFrom_key" ON "AiModelPricing"("provider", "providerModelId", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "FeaturePricing_feature_key" ON "FeaturePricing"("feature");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceEntitlement_workspaceId_key" ON "WorkspaceEntitlement"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "BillingCustomer_workspaceId_key" ON "BillingCustomer"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "BillingCustomer_stripeCustomerId_key" ON "BillingCustomer"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_workspaceId_key" ON "Subscription"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "BillingEvent_stripeEventId_key" ON "BillingEvent"("stripeEventId");

-- CreateIndex
CREATE UNIQUE INDEX "BillingUsageEvent_aiUsageId_key" ON "BillingUsageEvent"("aiUsageId");

-- CreateIndex
CREATE UNIQUE INDEX "BillingUsageEvent_stripeMeterEventIdentifier_key" ON "BillingUsageEvent"("stripeMeterEventIdentifier");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_stripeInvoiceId_key" ON "Invoice"("stripeInvoiceId");

-- CreateIndex
CREATE INDEX "WorkspaceAiBudgetBalance_workspaceId_periodStart_periodEnd_idx" ON "WorkspaceAiBudgetBalance"("workspaceId", "periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceAiBudgetBalance_workspaceId_periodStart_periodEnd_key" ON "WorkspaceAiBudgetBalance"("workspaceId", "periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "AiReservationLedger_idempotencyKey_key" ON "AiReservationLedger"("idempotencyKey");

-- CreateIndex
CREATE INDEX "AiReservationLedger_workspaceId_status_idx" ON "AiReservationLedger"("workspaceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_key_key" ON "Plan"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Module_key_key" ON "Module"("key");

-- CreateIndex
CREATE UNIQUE INDEX "PlanModule_planVersionId_moduleId_key" ON "PlanModule"("planVersionId", "moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "AiPackage_key_key" ON "AiPackage"("key");

-- CreateIndex
CREATE UNIQUE INDEX "BillingProfile_workspaceId_key" ON "BillingProfile"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "FiscalDocument_uuid_key" ON "FiscalDocument"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "BillingNotification_idempotencyKey_key" ON "BillingNotification"("idempotencyKey");

-- CreateIndex
CREATE INDEX "_TaskDependencies_B_index" ON "_TaskDependencies"("B");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceSettings" ADD CONSTRAINT "WorkspaceSettings_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceInvite" ADD CONSTRAINT "WorkspaceInvite_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceInvite" ADD CONSTRAINT "WorkspaceInvite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaSource" ADD CONSTRAINT "MetaSource_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaPhoneSource" ADD CONSTRAINT "WaPhoneSource_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaPhoneSource" ADD CONSTRAINT "WaPhoneSource_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleSource" ADD CONSTRAINT "GoogleSource_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Capturista" ADD CONSTRAINT "Capturista_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Channel" ADD CONSTRAINT "Channel_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Objective" ADD CONSTRAINT "Objective_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeyResult" ADD CONSTRAINT "KeyResult_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "Objective"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_keyResultId_fkey" FOREIGN KEY ("keyResultId") REFERENCES "KeyResult"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "Brief"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskComment" ADD CONSTRAINT "TaskComment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskActivity" ADD CONSTRAINT "TaskActivity_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Brief" ADD CONSTRAINT "Brief_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Brief" ADD CONSTRAINT "Brief_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetGroup" ADD CONSTRAINT "AssetGroup_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftPost" ADD CONSTRAINT "DraftPost_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftPost" ADD CONSTRAINT "DraftPost_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftPost" ADD CONSTRAINT "DraftPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transmission" ADD CONSTRAINT "Transmission_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "DraftPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transmission" ADD CONSTRAINT "Transmission_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishJob" ADD CONSTRAINT "PublishJob_transmissionId_fkey" FOREIGN KEY ("transmissionId") REFERENCES "Transmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledPost" ADD CONSTRAINT "ScheduledPost_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Integration" ADD CONSTRAINT "Integration_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Integration" ADD CONSTRAINT "Integration_connectedBy_fkey" FOREIGN KEY ("connectedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAlert" ADD CONSTRAINT "ProjectAlert_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxConversation" ADD CONSTRAINT "InboxConversation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxConversation" ADD CONSTRAINT "InboxConversation_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactChannel" ADD CONSTRAINT "ContactChannel_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxMessage" ADD CONSTRAINT "InboxMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "InboxConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxNote" ADD CONSTRAINT "InboxNote_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "InboxConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackedKeyword" ADD CONSTRAINT "TrackedKeyword_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListeningMention" ADD CONSTRAINT "ListeningMention_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "ListeningQuery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreamBoard" ADD CONSTRAINT "StreamBoard_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreamColumn" ADD CONSTRAINT "StreamColumn_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "StreamBoard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaAnalyticsCache" ADD CONSTRAINT "MetaAnalyticsCache_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsFunnelStep" ADD CONSTRAINT "AnalyticsFunnelStep_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "AnalyticsFunnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BotmakerLeadFieldSnapshot" ADD CONSTRAINT "BotmakerLeadFieldSnapshot_leadRequestId_fkey" FOREIGN KEY ("leadRequestId") REFERENCES "BotmakerLeadRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BotmakerOcrExtraction" ADD CONSTRAINT "BotmakerOcrExtraction_leadRequestId_fkey" FOREIGN KEY ("leadRequestId") REFERENCES "BotmakerLeadRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntelixSubmission" ADD CONSTRAINT "IntelixSubmission_leadRequestId_fkey" FOREIGN KEY ("leadRequestId") REFERENCES "BotmakerLeadRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZapierConversionEvent" ADD CONSTRAINT "ZapierConversionEvent_leadRequestId_fkey" FOREIGN KEY ("leadRequestId") REFERENCES "BotmakerLeadRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AriaDataset" ADD CONSTRAINT "AriaDataset_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AriaDataset" ADD CONSTRAINT "AriaDataset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AriaDatasetRow" ADD CONSTRAINT "AriaDatasetRow_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "AriaDataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AriaDatasetColumn" ADD CONSTRAINT "AriaDatasetColumn_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "AriaDataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AriaModel" ADD CONSTRAINT "AriaModel_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "AriaDataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AriaModelRun" ADD CONSTRAINT "AriaModelRun_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "AriaModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AriaPrediction" ADD CONSTRAINT "AriaPrediction_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "AriaModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CenturionModel" ADD CONSTRAINT "CenturionModel_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MmmWeeklySpend" ADD CONSTRAINT "MmmWeeklySpend_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizationClient" ADD CONSTRAINT "OptimizationClient_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizationClientProject" ADD CONSTRAINT "OptimizationClientProject_workspaceId_clientId_fkey" FOREIGN KEY ("workspaceId", "clientId") REFERENCES "OptimizationClient"("workspaceId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizationClientProject" ADD CONSTRAINT "OptimizationClientProject_workspaceId_projectId_fkey" FOREIGN KEY ("workspaceId", "projectId") REFERENCES "Project"("workspaceId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizationAdAccount" ADD CONSTRAINT "OptimizationAdAccount_workspaceId_clientId_fkey" FOREIGN KEY ("workspaceId", "clientId") REFERENCES "OptimizationClient"("workspaceId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizationObjective" ADD CONSTRAINT "OptimizationObjective_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizationObjective" ADD CONSTRAINT "OptimizationObjective_workspaceId_clientId_fkey" FOREIGN KEY ("workspaceId", "clientId") REFERENCES "OptimizationClient"("workspaceId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizationSnapshot" ADD CONSTRAINT "OptimizationSnapshot_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizationSnapshot" ADD CONSTRAINT "OptimizationSnapshot_workspaceId_clientId_fkey" FOREIGN KEY ("workspaceId", "clientId") REFERENCES "OptimizationClient"("workspaceId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizationAnalysisResult" ADD CONSTRAINT "OptimizationAnalysisResult_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizationAnalysisResult" ADD CONSTRAINT "OptimizationAnalysisResult_workspaceId_clientId_fkey" FOREIGN KEY ("workspaceId", "clientId") REFERENCES "OptimizationClient"("workspaceId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizationAnalysisResult" ADD CONSTRAINT "OptimizationAnalysisResult_workspaceId_clientId_snapshotId_fkey" FOREIGN KEY ("workspaceId", "clientId", "snapshotId") REFERENCES "OptimizationSnapshot"("workspaceId", "clientId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizationProposedAction" ADD CONSTRAINT "OptimizationProposedAction_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizationProposedAction" ADD CONSTRAINT "OptimizationProposedAction_workspaceId_clientId_fkey" FOREIGN KEY ("workspaceId", "clientId") REFERENCES "OptimizationClient"("workspaceId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizationProposedAction" ADD CONSTRAINT "OptimizationProposedAction_workspaceId_clientId_snapshotId_fkey" FOREIGN KEY ("workspaceId", "clientId", "snapshotId") REFERENCES "OptimizationSnapshot"("workspaceId", "clientId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizationActionApproval" ADD CONSTRAINT "OptimizationActionApproval_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizationActionApproval" ADD CONSTRAINT "OptimizationActionApproval_workspaceId_clientId_fkey" FOREIGN KEY ("workspaceId", "clientId") REFERENCES "OptimizationClient"("workspaceId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizationActionApproval" ADD CONSTRAINT "OptimizationActionApproval_workspaceId_clientId_actionId_fkey" FOREIGN KEY ("workspaceId", "clientId", "actionId") REFERENCES "OptimizationProposedAction"("workspaceId", "clientId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizationActionExecution" ADD CONSTRAINT "OptimizationActionExecution_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizationActionExecution" ADD CONSTRAINT "OptimizationActionExecution_workspaceId_clientId_fkey" FOREIGN KEY ("workspaceId", "clientId") REFERENCES "OptimizationClient"("workspaceId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizationActionExecution" ADD CONSTRAINT "OptimizationActionExecution_workspaceId_clientId_actionId_fkey" FOREIGN KEY ("workspaceId", "clientId", "actionId") REFERENCES "OptimizationProposedAction"("workspaceId", "clientId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizationEvaluation" ADD CONSTRAINT "OptimizationEvaluation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizationEvaluation" ADD CONSTRAINT "OptimizationEvaluation_workspaceId_clientId_fkey" FOREIGN KEY ("workspaceId", "clientId") REFERENCES "OptimizationClient"("workspaceId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizationEvaluation" ADD CONSTRAINT "OptimizationEvaluation_workspaceId_clientId_sourceSnapshot_fkey" FOREIGN KEY ("workspaceId", "clientId", "sourceSnapshotId") REFERENCES "OptimizationSnapshot"("workspaceId", "clientId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizationEvaluation" ADD CONSTRAINT "OptimizationEvaluation_workspaceId_clientId_outcomeSnapsho_fkey" FOREIGN KEY ("workspaceId", "clientId", "outcomeSnapshotId") REFERENCES "OptimizationSnapshot"("workspaceId", "clientId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizationEvaluation" ADD CONSTRAINT "OptimizationEvaluation_analysisResultId_fkey" FOREIGN KEY ("analysisResultId") REFERENCES "OptimizationAnalysisResult"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizationEvaluation" ADD CONSTRAINT "OptimizationEvaluation_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "OptimizationProposedAction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizationAuditEvent" ADD CONSTRAINT "OptimizationAuditEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizationAuditEvent" ADD CONSTRAINT "OptimizationAuditEvent_workspaceId_clientId_fkey" FOREIGN KEY ("workspaceId", "clientId") REFERENCES "OptimizationClient"("workspaceId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizationAuditEvent" ADD CONSTRAINT "OptimizationAuditEvent_workspaceId_clientId_snapshotId_fkey" FOREIGN KEY ("workspaceId", "clientId", "snapshotId") REFERENCES "OptimizationSnapshot"("workspaceId", "clientId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizationAuditEvent" ADD CONSTRAINT "OptimizationAuditEvent_workspaceId_clientId_actionId_fkey" FOREIGN KEY ("workspaceId", "clientId", "actionId") REFERENCES "OptimizationProposedAction"("workspaceId", "clientId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiRequest" ADD CONSTRAINT "AiRequest_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiRun" ADD CONSTRAINT "AiRun_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "AiRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiRun" ADD CONSTRAINT "AiRun_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelDecision" ADD CONSTRAINT "ModelDecision_aiRunId_fkey" FOREIGN KEY ("aiRunId") REFERENCES "AiRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelDecision" ADD CONSTRAINT "ModelDecision_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsage" ADD CONSTRAINT "AiUsage_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsage" ADD CONSTRAINT "AiUsage_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "AiRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceEntitlement" ADD CONSTRAINT "WorkspaceEntitlement_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingCustomer" ADD CONSTRAINT "BillingCustomer_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceAiBudgetBalance" ADD CONSTRAINT "WorkspaceAiBudgetBalance_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiReservationLedger" ADD CONSTRAINT "AiReservationLedger_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanVersion" ADD CONSTRAINT "PlanVersion_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanPrice" ADD CONSTRAINT "PlanPrice_planVersionId_fkey" FOREIGN KEY ("planVersionId") REFERENCES "PlanVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanModule" ADD CONSTRAINT "PlanModule_planVersionId_fkey" FOREIGN KEY ("planVersionId") REFERENCES "PlanVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanModule" ADD CONSTRAINT "PlanModule_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiPackageVersion" ADD CONSTRAINT "AiPackageVersion_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "AiPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingLedgerEntry" ADD CONSTRAINT "BillingLedgerEntry_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingProfile" ADD CONSTRAINT "BillingProfile_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FiscalDocument" ADD CONSTRAINT "FiscalDocument_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingNotification" ADD CONSTRAINT "BillingNotification_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingRecoveryCase" ADD CONSTRAINT "BillingRecoveryCase_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TaskDependencies" ADD CONSTRAINT "_TaskDependencies_A_fkey" FOREIGN KEY ("A") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TaskDependencies" ADD CONSTRAINT "_TaskDependencies_B_fkey" FOREIGN KEY ("B") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
