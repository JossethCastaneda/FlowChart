// ============================================================================
// Contrato común de adaptadores de proveedores de analítica conversacional.
// Los dashboards y el motor de KPIs NUNCA dependen del formato propietario de
// un proveedor: dependen de este modelo normalizado. Añadir un proveedor nuevo
// = implementar esta interfaz (ver AnalyticsAdapterFactory).
// ============================================================================

export interface SyncResult {
  success: boolean;
  recordsInserted: number;
  recordsFailed: number;
  error?: string;
  nextCursor?: string;
}

export type ProviderCredentials = Record<string, unknown>;

export interface ProviderMetadata {
  provider: string;
  displayName: string;
  authType: string;
  reportTypes: string[];
  docUrl?: string;
}

/** Conversación normalizada lista para upsert idempotente en NormalizedConversation. */
export interface NormalizedConversationInput {
  providerConversationId: string;
  channel: string;
  botId?: string | null;
  botName?: string | null;
  customerId?: string | null;
  customerIdentifierHash?: string | null;
  conversationStartedAt: Date;
  conversationEndedAt?: Date | null;
  firstBotResponseAt?: Date | null;
  firstAgentResponseAt?: Date | null;
  closedAt?: Date | null;
  status: string;
  outcome?: string | null;
  resolvedBy?: string | null;
  wasBotOnly?: boolean;
  wasHandoff?: boolean;
  agentId?: string | null;
  agentName?: string | null;
  queueName?: string | null;
  skillName?: string | null;
  totalUserMessages?: number;
  totalBotMessages?: number;
  totalAgentMessages?: number;
  totalFallbacks?: number;
  csatScore?: number | null;
  npsScore?: number | null;
  campaignId?: string | null;
  serviceId?: string | null;
  tags?: string[];
  durationSeconds?: number | null;
  waitingTimeSeconds?: number | null;
  firstResponseTimeSeconds?: number | null;
  handleTimeSeconds?: number | null;
  syncedAt?: Date;
}

/** Mensaje normalizado listo para upsert idempotente en NormalizedMessage. */
export interface NormalizedMessageInput {
  providerMessageId: string;
  conversationId: string;
  senderType: string;
  messageType: string;
  intent?: string | null;
  topic?: string | null;
  confidence?: number | null;
  isFallback?: boolean;
  isError?: boolean;
  isTemplate?: boolean;
  campaignId?: string | null;
  status?: string | null;
  sentAt: Date;
}

export type NormalizedRecord =
  | NormalizedConversationInput
  | NormalizedMessageInput
  | Record<string, unknown>;

export interface AnalyticsProviderAdapter {
  /** Identidad y capacidades del proveedor (no requiere red). */
  getProviderMetadata(): ProviderMetadata;

  /** Prueba la conexión con credenciales dadas SIN persistirlas. Lanza si fallan. */
  testConnection(credentials: ProviderCredentials): Promise<boolean>;

  /** Valida la forma de las credenciales sin tocar la red. */
  validateCredentials(credentials: ProviderCredentials): boolean;

  /** Reportes disponibles para este proveedor. */
  getAvailableReports(credentials: ProviderCredentials): Promise<string[]>;

  // Sincronización por tipo de reporte. Todas devuelven un SyncResult uniforme.
  syncConversations(workspaceId: string, startDate: Date, endDate: Date, cursor?: string): Promise<SyncResult>;
  syncMessages(workspaceId: string, startDate: Date, endDate: Date, cursor?: string): Promise<SyncResult>;
  syncAgents(workspaceId: string, startDate: Date, endDate: Date, cursor?: string): Promise<SyncResult>;
  syncServices(workspaceId: string, startDate: Date, endDate: Date, cursor?: string): Promise<SyncResult>;
  syncCampaigns(workspaceId: string, startDate: Date, endDate: Date, cursor?: string): Promise<SyncResult>;
  syncClients(workspaceId: string, startDate: Date, endDate: Date, cursor?: string): Promise<SyncResult>;
  syncFunnels(workspaceId: string, startDate: Date, endDate: Date, cursor?: string): Promise<SyncResult>;
  syncCustomReports(workspaceId: string, startDate: Date, endDate: Date, cursor?: string): Promise<SyncResult>;

  /** Procesa un evento webhook entrante (idempotente por external id). */
  processWebhookEvent(payload: unknown): Promise<void>;

  /** Normaliza un payload crudo del proveedor al modelo interno. */
  normalizeRawData(rawPayload: unknown, reportType: string): NormalizedRecord;

  // Mapeos del vocabulario del proveedor al canónico de Sodare.
  mapProviderChannel(raw: unknown): string;
  mapProviderStatus(raw: unknown): string;
  mapProviderOutcome(raw: unknown): string;
  mapProviderTags(raw: unknown): string[];
}
