/**
 * Graphify source for migration-critical relationships.
 *
 * These types are documentation only. They distinguish observed runtime paths
 * from preserved-but-unwired database entities and must never be used as proof
 * that an external side effect occurred.
 */

export interface AiRequestKnowledgeNode {
  runs: AiRunKnowledgeNode[];
  usage: AiUsageKnowledgeNode[];
  reservations: AiReservationLedgerKnowledgeNode[];
}

export interface AiRunKnowledgeNode {
  request: AiRequestKnowledgeNode;
  modelDecision: CanonicalModelDecisionKnowledgeNode;
  modelDecisionPersistence: ModelDecisionPersistenceGapNode | null;
}

export interface AiUsageKnowledgeNode {
  request: AiRequestKnowledgeNode | null;
  billableOutboxEvents: BillingUsageEventKnowledgeNode[];
  legacyEstimatedCostDestination: HumanDecisionRequiredNode;
}

export interface BillingUsageEventKnowledgeNode {
  usage: AiUsageKnowledgeNode;
  dispatcher: StripeMeterDispatcherKnowledgeNode;
}

export interface AiReservationLedgerKnowledgeNode {
  request: AiRequestKnowledgeNode;
  balance: WorkspaceAiBudgetBalanceKnowledgeNode;
}

export interface WorkspaceAiBudgetBalanceKnowledgeNode {
  reservations: AiReservationLedgerKnowledgeNode[];
}

export interface BillingRecoveryPolicyKnowledgeNode {
  cases: BillingRecoveryCaseKnowledgeNode[];
}

export interface AssetGroupKnowledgeNode {
  consumer: PublisherAssetGroupUiKnowledgeNode;
  api: MissingAssetGroupApiKnowledgeNode;
}

export interface MigrationPolicyKnowledgeNode {
  incident: IncidentRecoveryKnowledgeNode;
  baseline: IsolatedBaselineProofKnowledgeNode;
  activeBaseline: CanonicalBaselineKnowledgeNode;
  legacyArchive: LegacyMigrationArchiveKnowledgeNode;
  schema: PrismaSchemaKnowledgeNode;
  productionCutover: ProductionCutoverHumanGateNode;
}

export interface ModelDecisionPersistenceGapNode { readonly kind: "model-decision-persistence-gap" }
export interface BillingRecoveryCaseKnowledgeNode { readonly kind: "billing-recovery-case" }
export interface StripeMeterDispatcherKnowledgeNode { readonly kind: "stripe-meter-dispatcher" }
export interface PublisherAssetGroupUiKnowledgeNode { readonly kind: "publisher-asset-group-ui" }
export interface MissingAssetGroupApiKnowledgeNode { readonly kind: "missing-asset-group-api" }
export interface HumanDecisionRequiredNode { readonly kind: "human-decision-required" }
export interface IncidentRecoveryKnowledgeNode { readonly kind: "incident-recovery" }
export interface IsolatedBaselineProofKnowledgeNode { readonly kind: "isolated-baseline-proof" }
export interface ProductionCutoverHumanGateNode { readonly kind: "production-cutover-human-gate" }
export interface CanonicalBaselineKnowledgeNode { readonly kind: "canonical-baseline-20260817" }
export interface LegacyMigrationArchiveKnowledgeNode { readonly kind: "legacy-migrations-forensic-only" }
export interface PrismaSchemaKnowledgeNode { readonly kind: "prisma-canonical-schema" }
export interface CanonicalModelDecisionKnowledgeNode { readonly kind: "canonical-model-decision-entity" }

// Named relation functions make the edges navigable in Graphify's TypeScript
// AST graph. Nothing imports or executes this documentation-only module.
function aiRequestEntity(): void {}
function aiRunEntity(): void {}
function aiUsageEntity(): void {}
function aiReservationLedgerEntity(): void {}
function workspaceAiBudgetBalanceEntity(): void {}
function billingUsageEventEntity(): void {}
function stripeMeterDispatcherEntity(): void {}
function billingRecoveryPolicyEntity(): void {}
function billingRecoveryCaseEntity(): void {}
function assetGroupEntity(): void {}
function publisherAssetGroupUiEntity(): void {}
function missingAssetGroupApiGap(): void {}
function modelDecisionPersistenceGap(): void {}
function migrationPolicyEntity(): void {}
function incidentRecoveryEntity(): void {}
function isolatedBaselineProofEntity(): void {}
function productionCutoverHumanGateEntity(): void {}
function canonicalBaselineEntity(): void {}
function legacyMigrationArchiveEntity(): void {}
function prismaSchemaEntity(): void {}
function canonicalModelDecisionEntity(): void {}

export function aiRequestCreatesAiRun(
  _request: AiRequestKnowledgeNode,
  _run: AiRunKnowledgeNode,
): void {
  void _request;
  void _run;
  aiRequestEntity();
  aiRunEntity();
}

export function aiRequestSettlesAiUsage(
  _request: AiRequestKnowledgeNode,
  _usage: AiUsageKnowledgeNode,
): void {
  void _request;
  void _usage;
  aiRequestEntity();
  aiUsageEntity();
}

export function aiRequestReservesBudget(
  _request: AiRequestKnowledgeNode,
  _reservation: AiReservationLedgerKnowledgeNode,
  _balance: WorkspaceAiBudgetBalanceKnowledgeNode,
): void {
  void _request;
  void _reservation;
  void _balance;
  aiRequestEntity();
  aiReservationLedgerEntity();
  workspaceAiBudgetBalanceEntity();
}

export function billableUsageEnqueuesStripeMeterEvent(
  _usage: AiUsageKnowledgeNode,
  _event: BillingUsageEventKnowledgeNode,
  _dispatcher: StripeMeterDispatcherKnowledgeNode,
): void {
  void _usage;
  void _event;
  void _dispatcher;
  aiUsageEntity();
  billingUsageEventEntity();
  stripeMeterDispatcherEntity();
}

export function billingPolicyCreatesRecoveryCase(
  _policy: BillingRecoveryPolicyKnowledgeNode,
  _case: BillingRecoveryCaseKnowledgeNode,
): void {
  void _policy;
  void _case;
  billingRecoveryPolicyEntity();
  billingRecoveryCaseEntity();
}

export function assetGroupHasMissingApi(
  _group: AssetGroupKnowledgeNode,
  _ui: PublisherAssetGroupUiKnowledgeNode,
  _missingApi: MissingAssetGroupApiKnowledgeNode,
): void {
  void _group;
  void _ui;
  void _missingApi;
  assetGroupEntity();
  publisherAssetGroupUiEntity();
  missingAssetGroupApiGap();
}

export function aiRunModelDecisionPersistenceIsPending(
  _run: AiRunKnowledgeNode,
  _decision: CanonicalModelDecisionKnowledgeNode,
  _gap: ModelDecisionPersistenceGapNode,
): void {
  void _run;
  void _decision;
  void _gap;
  aiRunEntity();
  canonicalModelDecisionEntity();
  modelDecisionPersistenceGap();
}

export function migrationPolicyProtectsIncidentRecovery(
  _policy: MigrationPolicyKnowledgeNode,
  _incident: IncidentRecoveryKnowledgeNode,
  _proof: IsolatedBaselineProofKnowledgeNode,
): void {
  void _policy;
  void _incident;
  void _proof;
  migrationPolicyEntity();
  incidentRecoveryEntity();
  isolatedBaselineProofEntity();
}

export function isolatedBaselineProofRequiresProductionHumanGate(
  _proof: IsolatedBaselineProofKnowledgeNode,
  _gate: ProductionCutoverHumanGateNode,
): void {
  void _proof;
  void _gate;
  isolatedBaselineProofEntity();
  productionCutoverHumanGateEntity();
}

export function canonicalBaselineReplacesLegacyReplayChain(
  _policy: MigrationPolicyKnowledgeNode,
  _baseline: CanonicalBaselineKnowledgeNode,
  _legacy: LegacyMigrationArchiveKnowledgeNode,
  _schema: PrismaSchemaKnowledgeNode,
  _incident: IncidentRecoveryKnowledgeNode,
): void {
  void _policy;
  void _baseline;
  void _legacy;
  void _schema;
  void _incident;
  migrationPolicyEntity();
  canonicalBaselineEntity();
  legacyMigrationArchiveEntity();
  prismaSchemaEntity();
  incidentRecoveryEntity();
}
