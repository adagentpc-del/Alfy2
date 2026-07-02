/**
 * @alfy2/shared — the only legal cross-boundary surface.
 * Contracts here are mirrored by Pydantic models in workers/alfy_workers/contracts and must stay
 * in lockstep. Canonical sample payloads live in ./fixtures and are validated in both runtimes.
 */

export {
  EvidenceSchema,
  ActionSchema,
  SignalToActionSchema,
  type Evidence,
  type Action,
  type SignalToAction,
} from "./contracts/signal-to-action.js";

export { TaskBudgetSchema, TaskSchema, type TaskBudget, type Task } from "./contracts/task.js";

export { ModuleManifestSchema, type ModuleManifest } from "./contracts/module-manifest.js";

export {
  AgentRegistrationSchema,
  type AgentRegistration,
} from "./contracts/agent-registration.js";

export {
  MemoryKindSchema,
  MemoryRelationSchema,
  MemoryStatusSchema,
  MemoryRecordSchema,
  MemoryLinkSchema,
  CreateMemoryInputSchema,
  MemoryQuerySchema,
  type MemoryKind,
  type MemoryRelation,
  type MemoryStatus,
  type MemoryRecord,
  type MemoryLink,
  type CreateMemoryInput,
  type MemoryQuery,
} from "./contracts/memory.js";

export {
  DecisionCategorySchema,
  CategoryScoreSchema,
  EffortBucketSchema,
  PriorityLevelSchema,
  DecisionInputSchema,
  DecisionSchema,
  type DecisionCategory,
  type CategoryScore,
  type EffortBucket,
  type PriorityLevel,
  type DecisionInput,
  type Decision,
} from "./contracts/decision.js";

export {
  BriefingItemSchema,
  MeetingPrepSchema,
  CalendarBlockSchema,
  EnergyPlanSchema,
  DashboardSummarySchema,
  BriefingHorizonSchema,
  ChiefOfStaffBriefingSchema,
  type BriefingItem,
  type MeetingPrep,
  type CalendarBlock,
  type EnergyPlan,
  type DashboardSummary,
  type BriefingHorizon,
  type ChiefOfStaffBriefing,
} from "./contracts/chief-of-staff.js";

export {
  ToolSpecSchema,
  MemoryScopeSchema,
  AgentPermissionsSchema,
  SuccessMetricSchema,
  DashboardCardSchema,
  TaskQueueSpecSchema,
  GeneratedFileSchema,
  AgentRecommendationSchema,
  AgentBlueprintSchema,
  GeneratedAgentSchema,
  type ToolSpec,
  type MemoryScope,
  type AgentPermissions,
  type SuccessMetric,
  type DashboardCard,
  type TaskQueueSpec,
  type GeneratedFile,
  type AgentRecommendation,
  type AgentBlueprint,
  type GeneratedAgent,
} from "./contracts/agent-factory.js";

export {
  DepartmentKindSchema,
  DepartmentSpecSchema,
  BusinessTemplateSchema,
  BusinessDepartmentSchema,
  BusinessSchema,
  CreateBusinessInputSchema,
  type DepartmentKind,
  type DepartmentSpec,
  type BusinessTemplate,
  type BusinessDepartment,
  type Business,
  type CreateBusinessInput,
} from "./contracts/business.js";

export {
  PersonalModuleKindSchema,
  PersonalEntitySpecSchema,
  FieldRequestSchema,
  InfoRequestSchema,
  KnownEntitySchema,
  ResolveStatusSchema,
  ResolveResultSchema,
  RememberPersonalInputSchema,
  PreparePackSchema,
  type PersonalModuleKind,
  type PersonalEntitySpec,
  type FieldRequest,
  type InfoRequest,
  type KnownEntity,
  type ResolveStatus,
  type ResolveResult,
  type RememberPersonalInput,
  type PreparePack,
} from "./contracts/personal-os.js";

export {
  PricingModelSchema,
  CompetitorKindSchema,
  RiskSeveritySchema,
  IdeaVerdictSchema,
  IdeaStatusSchema,
  HttpMethodSchema,
  CompetitorSchema,
  PriceTierSchema,
  DbTableSchema,
  ApiEndpointSchema,
  AgentNeedSchema,
  LaunchPhaseSchema,
  RiskSchema,
  MarketResearchSchema,
  CompetitorAnalysisSchema,
  PricingPlanSchema,
  OfferSchema,
  PositioningSchema,
  MvpPlanSchema,
  DataModelSchema,
  ApiPlanSchema,
  RequiredAgentsSchema,
  MarketingPlanSchema,
  SeoPlanSchema,
  LaunchPlanSchema,
  MonetizationPlanSchema,
  RiskAssessmentSchema,
  RecommendationSchema,
  IdeaInputSchema,
  IdeaBlueprintSchema,
  type PricingModel,
  type CompetitorKind,
  type RiskSeverity,
  type IdeaVerdict,
  type IdeaStatus,
  type HttpMethod,
  type Competitor,
  type PriceTier,
  type DbTable,
  type ApiEndpoint,
  type AgentNeed,
  type LaunchPhase,
  type Risk,
  type MarketResearch,
  type CompetitorAnalysis,
  type PricingPlan,
  type Offer,
  type Positioning,
  type MvpPlan,
  type DataModel,
  type ApiPlan,
  type RequiredAgents,
  type MarketingPlan,
  type SeoPlan,
  type LaunchPlan,
  type MonetizationPlan,
  type RiskAssessment,
  type Recommendation,
  type IdeaInput,
  type IdeaBlueprint,
} from "./contracts/idea-builder.js";

export {
  BehaviorSignalSchema,
  PatternDirectionSchema,
  BehaviorObservationSchema,
  PatternSchema,
  BottleneckSchema,
  AutomationRecSchema,
  PatternAgentRecSchema,
  WorkflowRecSchema,
  StrengthSchema,
  RepeatingMistakeSchema,
  SuccessfulHabitSchema,
  ScheduleRecSchema,
  AnalysisWindowSchema,
  PatternReportSchema,
  type BehaviorSignal,
  type PatternDirection,
  type BehaviorObservation,
  type Pattern,
  type Bottleneck,
  type AutomationRec,
  type PatternAgentRec,
  type WorkflowRec,
  type Strength,
  type RepeatingMistake,
  type SuccessfulHabit,
  type ScheduleRec,
  type AnalysisWindow,
  type PatternReport,
} from "./contracts/pattern-engine.js";

export {
  PlanTierSchema,
  TenantStatusSchema,
  FounderTenantSchema,
  BillingStatusSchema,
  BillingAccountSchema,
  RoleSchema,
  PermissionSchema,
  GrantSchema,
  KnowledgeVisibilitySchema,
  KnowledgeDocSchema,
  type PlanTier,
  type TenantStatus,
  type FounderTenant,
  type BillingStatus,
  type BillingAccount,
  type Role,
  type Permission,
  type Grant,
  type KnowledgeVisibility,
  type KnowledgeDoc,
} from "./contracts/tenancy.js";

export {
  InboxItemTypeSchema,
  InboxCategorySchema,
  LinkedEntitySchema,
  SuggestedTaskSchema,
  InboxDropSchema,
  ProcessedInboxItemSchema,
  type InboxItemType,
  type InboxCategory,
  type LinkedEntity,
  type SuggestedTask,
  type InboxDrop,
  type ProcessedInboxItem,
} from "./contracts/executive-inbox.js";

export {
  TaskTypeSchema,
  CostTierSchema,
  ModelDescriptorSchema,
  RouteConstraintsSchema,
  ModelScoreSchema,
  RoutingDecisionSchema,
  type TaskType,
  type CostTier,
  type ModelDescriptor,
  type RouteConstraints,
  type ModelScore,
  type RoutingDecision,
} from "./contracts/model-router.js";

export {
  AuthMethodSchema,
  ConnectorHealthSchema,
  ConnectorDescriptorSchema,
  type AuthMethod,
  type ConnectorHealth,
  type ConnectorDescriptor,
} from "./contracts/connector-registry.js";

export {
  RepoVerdictSchema,
  DimensionKindSchema,
  DimensionEvalSchema,
  FindingSeveritySchema,
  SecurityCategorySchema,
  SecurityFindingSchema,
  FileEntrySchema,
  RepoScanInputSchema,
  RoiLevelSchema,
  BusinessCaseSchema,
  RepoAssessmentSchema,
  AssetLibraryEntrySchema,
  type RepoVerdict,
  type DimensionKind,
  type DimensionEval,
  type FindingSeverity,
  type SecurityCategory,
  type SecurityFinding,
  type FileEntry,
  type RepoScanInput,
  type RoiLevel,
  type BusinessCase,
  type RepoAssessment,
  type AssetLibraryEntry,
} from "./contracts/github-intelligence.js";

export {
  AssetTypeSchema,
  AssetStatusSchema,
  ApprovalStateSchema,
  AssetVisibilitySchema,
  AssetRelationSchema,
  AssetRelationshipSchema,
  AssetUsageSchema,
  AssetSchema,
  CreateAssetInputSchema,
  AssetQuerySchema,
  AssetSearchHitSchema,
  type AssetType,
  type AssetStatus,
  type ApprovalState,
  type AssetVisibility,
  type AssetRelation,
  type AssetRelationship,
  type AssetUsage,
  type Asset,
  type CreateAssetInput,
  type AssetQuery,
  type AssetSearchHit,
} from "./contracts/assets.js";

export {
  SensitiveActionClassSchema,
  ActionEffectSchema,
  EnvironmentSchema,
  SecurityDecisionKindSchema,
  ActionRequestSchema,
  SecurityDecisionSchema,
  AuditOutcomeSchema,
  AuditEntrySchema,
  ApprovalStatusSchema,
  ApprovalRequestSchema,
  PermissionGroupSchema,
  SecretKindSchema,
  SecretStatusSchema,
  SecretRefSchema,
  SessionSchema,
  type SensitiveActionClass,
  type ActionEffect,
  type Environment,
  type SecurityDecisionKind,
  type ActionRequest,
  type SecurityDecision,
  type AuditOutcome,
  type AuditEntry,
  type ApprovalStatus,
  type ApprovalRequest,
  type PermissionGroup,
  type SecretKind,
  type SecretStatus,
  type SecretRef,
  type Session,
} from "./contracts/security.js";

export {
  GoalTypeSchema,
  GoalStatusSchema,
  PathKindSchema,
  LevelSchema,
  ResourceKindSchema,
  ConstraintSchema,
  ResourceSchema,
  OpportunitySchema,
  GoalPathSchema,
  RiskItemSchema,
  WeeklyPlanItemSchema,
  GoalAnalysisSchema,
  GoalPlanSchema,
  GoalSchema,
  CreateGoalInputSchema,
  GoalChangeSchema,
  type GoalType,
  type GoalStatus,
  type PathKind,
  type Level,
  type ResourceKind,
  type Constraint,
  type Resource,
  type Opportunity,
  type GoalPath,
  type RiskItem,
  type WeeklyPlanItem,
  type GoalAnalysis,
  type GoalPlan,
  type Goal,
  type CreateGoalInput,
  type GoalChange,
} from "./contracts/goal.js";

export {
  GrantTypeSchema,
  ReviewScheduleSchema,
  ApprovalLifecycleStatusSchema,
  ApprovalScopeSchema,
  ApprovalLimitsSchema,
  PersistentApprovalSchema,
  CreatePersistentApprovalInputSchema,
  type GrantType,
  type ReviewSchedule,
  type ApprovalLifecycleStatus,
  type ApprovalScope,
  type ApprovalLimits,
  type PersistentApproval,
  type CreatePersistentApprovalInput,
} from "./contracts/persistent-approval.js";

export {
  CampaignTypeSchema,
  CampaignStatusSchema,
  StopReasonSchema,
  VariantKeySchema,
  MetricDirectionSchema,
  VariantSchema,
  CampaignSuccessMetricSchema,
  VariantResultSchema,
  CampaignRecommendationSchema,
  CampaignReportSchema,
  StopConditionsSchema,
  OptimizationCadenceSchema,
  CampaignSchema,
  VariantDraftSchema,
  CreateCampaignInputSchema,
  VariantObservationSchema,
  CampaignMetricsInputSchema,
  AssessSignalsSchema,
  type CampaignType,
  type CampaignStatus,
  type StopReason,
  type VariantKey,
  type MetricDirection,
  type Variant,
  type CampaignSuccessMetric,
  type VariantResult,
  type CampaignRecommendation,
  type CampaignReport,
  type StopConditions,
  type OptimizationCadence,
  type Campaign,
  type VariantDraft,
  type CreateCampaignInput,
  type VariantObservation,
  type CampaignMetricsInput,
  type AssessSignals,
} from "./contracts/campaign.js";

export {
  EntityKindSchema,
  RelationshipKindSchema,
  OpportunityStatusSchema,
  EntityRefSchema,
  OpportunityScoreSchema,
  OpportunitySchema as OpportunityIntelSchema,
  AnalyzeInputSchema,
  ScoreWeightsSchema,
  type EntityKind,
  type RelationshipKind,
  type OpportunityStatus,
  type EntityRef,
  type OpportunityScore,
  type Opportunity as OpportunityIntel,
  type AnalyzeInput,
  type ScoreWeights,
} from "./contracts/opportunity.js";

export {
  ActionApprovalStatusSchema,
  ActionOutcomeSchema,
  ActionRiskLevelSchema,
  AgentActionRecordSchema,
  LogAgentActionInputSchema,
  AgentPerformanceSchema,
  RepeatedFailureSchema,
  ApprovalBottleneckSchema,
  ObservabilityDashboardSchema,
  ActionExplanationSchema,
  type ActionApprovalStatus,
  type ActionOutcome,
  type ActionRiskLevel,
  type AgentActionRecord,
  type LogAgentActionInput,
  type AgentPerformance,
  type RepeatedFailure,
  type ApprovalBottleneck,
  type ObservabilityDashboard,
  type ActionExplanation,
} from "./contracts/agent-observability.js";

export {
  SimulationKindSchema,
  CaseLabelSchema,
  SimLevelSchema,
  ScenarioCaseSchema,
  SimRiskSchema,
  SimulationInputSchema,
  SimulationResultSchema,
  type SimulationKind,
  type CaseLabel,
  type SimLevel,
  type ScenarioCase,
  type SimRisk,
  type SimulationInput,
  type SimulationResult,
} from "./contracts/simulation.js";

export {
  StandardKindSchema,
  StandardStatusSchema,
  ComplianceTargetKindSchema,
  ViolationSeveritySchema,
  ApprovedStandardSchema,
  CreateStandardInputSchema,
  ComplianceTargetSchema,
  ViolationSchema,
  ComplianceResultSchema,
  type StandardKind,
  type StandardStatus,
  type ComplianceTargetKind,
  type ViolationSeverity,
  type ApprovedStandard,
  type CreateStandardInput,
  type ComplianceTarget,
  type Violation,
  type ComplianceResult,
} from "./contracts/ai-coe.js";

export {
  WorkflowMetricsSchema,
  RoiRecommendationSchema,
  WorkflowRoiRecordSchema,
  TrackWorkflowInputSchema,
  type WorkflowMetrics,
  type RoiRecommendation,
  type WorkflowRoiRecord,
  type TrackWorkflowInput,
} from "./contracts/workflow-roi.js";

export {
  DomainKindSchema,
  KpiDirectionSchema,
  DomainKpiSchema,
  DomainWorkflowSchema,
  DomainEscalationRuleSchema,
  DomainModelSchema,
  CreateDomainInputSchema,
  type DomainKind,
  type KpiDirection,
  type DomainKpi,
  type DomainWorkflow,
  type DomainEscalationRule,
  type DomainModel,
  type CreateDomainInput,
} from "./contracts/domain-model.js";

export {
  AgentIdentityStatusSchema,
  AgentActionTypeSchema,
  AgentCapabilitiesSchema,
  AgentIdentitySchema,
  IssueAgentIdentityInputSchema,
  AgentAccessRequestSchema,
  ZeroTrustDecisionKindSchema,
  ZeroTrustDecisionSchema,
  type AgentIdentityStatus,
  type AgentActionType,
  type AgentCapabilities,
  type AgentIdentity,
  type IssueAgentIdentityInput,
  type AgentAccessRequest,
  type ZeroTrustDecisionKind,
  type ZeroTrustDecision,
} from "./contracts/agent-identity.js";

export {
  FactKindSchema,
  FreshnessSchema,
  SourceRecordSchema,
  RecordTruthInputSchema,
  type FactKind,
  type Freshness,
  type SourceRecord,
  type RecordTruthInput,
} from "./contracts/source-of-truth.js";

export {
  TowerSeveritySchema,
  ReviewCadenceSchema,
  TowerCashSchema,
  TowerPipelineSchema,
  TowerGoalSchema,
  TowerCampaignSchema,
  TowerBlockedDealSchema,
  TowerRiskSchema,
  TowerAgentPerfSchema,
  TowerApprovalSchema,
  TowerBusinessHealthSchema,
  TowerOpportunitySchema,
  TowerWorkflowSchema,
  TowerReviewItemSchema,
  ControlTowerSnapshotSchema,
  ControlTowerInputSchema,
  type TowerSeverity,
  type ReviewCadence,
  type TowerCash,
  type TowerPipeline,
  type TowerGoal,
  type TowerCampaign,
  type TowerBlockedDeal,
  type TowerRisk,
  type TowerAgentPerf,
  type TowerApproval,
  type TowerBusinessHealth,
  type TowerOpportunity,
  type TowerWorkflow,
  type TowerReviewItem,
  type ControlTowerSnapshot,
  type ControlTowerInput,
} from "./contracts/control-tower.js";

export {
  PlaybookArtifactKindSchema,
  PlaybookArtifactSchema,
  PlaybookSchema,
  GeneratePlaybookInputSchema,
  type PlaybookArtifactKind,
  type PlaybookArtifact,
  type Playbook,
  type GeneratePlaybookInput,
} from "./contracts/playbook.js";

export {
  PortfolioRecommendationSchema,
  PortfolioMetricsSchema,
  BusinessAssessmentSchema,
  PortfolioReportSchema,
  PortfolioBusinessInputSchema,
  AnalyzePortfolioInputSchema,
  type PortfolioRecommendation,
  type PortfolioMetrics,
  type BusinessAssessment,
  type PortfolioReport,
  type PortfolioBusinessInput,
  type AnalyzePortfolioInput,
} from "./contracts/portfolio.js";

export {
  KnowledgeSourceTypeSchema,
  IngestedItemSchema,
  IngestInputSchema,
  type KnowledgeSourceType,
  type IngestedItem,
  type IngestInput,
} from "./contracts/knowledge-ingestion.js";

export {
  ActionDispositionSchema,
  KnowledgeActionSchema,
  ConvertIdeaInputSchema,
  type ActionDisposition,
  type KnowledgeAction,
  type ConvertIdeaInput,
} from "./contracts/knowledge-to-action.js";

export {
  ConversionSurfaceSchema,
  ConversionTestStatusSchema,
  VariantKeyConvSchema,
  CopySnippetSchema,
  OfferPerfSchema,
  ConversionTestSchema,
  ConversionProfileSchema,
  StartTestInputSchema,
  TestResultInputSchema,
  type ConversionSurface,
  type ConversionTestStatus,
  type VariantKeyConv,
  type CopySnippet,
  type OfferPerf,
  type ConversionTest,
  type ConversionProfile,
  type StartTestInput,
  type TestResultInput,
} from "./contracts/conversion.js";

export {
  FollowUpEntityKindSchema,
  FollowUpStatusSchema,
  FollowUpStopReasonSchema,
  SequenceStepSchema,
  FollowUpSchema,
  CreateFollowUpInputSchema,
  FollowUpSignalSchema,
  type FollowUpEntityKind,
  type FollowUpStatus,
  type FollowUpStopReason,
  type SequenceStep,
  type FollowUp,
  type CreateFollowUpInput,
  type FollowUpSignal,
} from "./contracts/follow-up.js";

export {
  RevenueOfferSchema,
  PipelineDealSchema,
  LeadSourceSchema,
  RevenueCampaignPerfSchema,
  CashOpportunitySchema,
  RevenueProfileInputSchema,
  RevenueIntelSchema,
  type RevenueOffer,
  type PipelineDeal,
  type LeadSource,
  type RevenueCampaignPerf,
  type CashOpportunity,
  type RevenueProfileInput,
  type RevenueIntel,
} from "./contracts/revenue.js";

export {
  SalesAssetKindSchema,
  GeneratedSalesAssetSchema,
  SalesAssetPackSchema,
  GenerateSalesAssetsInputSchema,
  type SalesAssetKind,
  type GeneratedSalesAsset,
  type SalesAssetPack,
  type GenerateSalesAssetsInput,
} from "./contracts/sales-asset.js";

export {
  QueueBucketSchema,
  QueueCategorySchema,
  QueueItemSchema,
  AddQueueItemInputSchema,
  type QueueBucket,
  type QueueCategory,
  type QueueItem,
  type AddQueueItemInput,
} from "./contracts/execution-queue.js";

export {
  DroppedKindSchema,
  DroppedStatusSchema,
  BallCandidateSchema,
  DroppedItemSchema,
  ScanInputSchema,
  type DroppedKind,
  type DroppedStatus,
  type BallCandidate,
  type DroppedItem,
  type ScanInput,
} from "./contracts/dont-drop-ball.js";

export {
  BusinessAssetKindSchema,
  AssetChecklistSchema,
  BuildChecklistInputSchema,
  type BusinessAssetKind,
  type AssetChecklist,
  type BuildChecklistInput,
} from "./contracts/asset-checklist.js";

export {
  MoneyFocusSchema,
  MoneyDeprioritySchema,
  MoneyClassificationSchema,
  MoneyFirstStateSchema,
  WorkItemSchema,
  ClassifiedItemSchema,
  type MoneyFocus,
  type MoneyDepriority,
  type MoneyClassification,
  type MoneyFirstState,
  type WorkItem,
  type ClassifiedItem,
} from "./contracts/money-first.js";

export {
  VaultInputKindSchema,
  VaultDropSchema,
  VaultExtractionSchema,
  VaultEntrySchema,
  type VaultInputKind,
  type VaultDrop,
  type VaultExtraction,
  type VaultEntry,
} from "./contracts/knowledge-vault.js";

export {
  LeadTemperatureSchema,
  FactoryOfferSchema,
  FactoryContactSchema,
  FactoryProposalSchema,
  FactoryFollowUpSchema,
  RevenueFactoryInputSchema,
  RevenueFactoryReportSchema,
  type LeadTemperature,
  type FactoryOffer,
  type FactoryContact,
  type FactoryProposal,
  type FactoryFollowUp,
  type RevenueFactoryInput,
  type RevenueFactoryReport,
} from "./contracts/revenue-factory.js";

export {
  WarRoomSurfaceSchema,
  FunnelMetricsSchema,
  RateCardSchema,
  WarRoomTestSchema,
  StartWarRoomTestInputSchema,
  RecordFunnelInputSchema,
  type WarRoomSurface,
  type FunnelMetrics,
  type RateCard,
  type WarRoomTest,
  type StartWarRoomTestInput,
  type RecordFunnelInput,
} from "./contracts/war-room.js";

export {
  DealStageSchema,
  DealSchema,
  CreateDealInputSchema,
  DealRankBySchema,
  RankedDealSchema,
  DealDeskViewSchema,
  type DealStage,
  type Deal,
  type CreateDealInput,
  type DealRankBy,
  type RankedDeal,
  type DealDeskView,
} from "./contracts/deal-desk.js";

export {
  AgentEvalStageSchema,
  AgentTestCaseSchema,
  TestRunResultSchema,
  EvalScoresSchema,
  AgentEvaluationSchema,
  RegisterAgentEvalInputSchema,
  RunEvalInputSchema,
  type AgentEvalStage,
  type AgentTestCase,
  type TestRunResult,
  type EvalScores,
  type AgentEvaluation,
  type RegisterAgentEvalInput,
  type RunEvalInput,
} from "./contracts/agent-eval.js";

export {
  PlaneSchema,
  ControlConcernSchema,
  ExecutionConcernSchema,
  PlaneAssignmentSchema,
  ExecutionRequestSchema,
  PlaneDecisionSchema,
  type Plane,
  type ControlConcern,
  type ExecutionConcern,
  type PlaneAssignment,
  type ExecutionRequest,
  type PlaneDecision,
} from "./contracts/planes.js";

export {
  CostCategorySchema,
  CfoRecommendationSchema,
  CostBreakdownSchema,
  WorkflowCostInputSchema,
  WorkflowCostReportSchema,
  type CostCategory,
  type CfoRecommendation,
  type CostBreakdown,
  type WorkflowCostInput,
  type WorkflowCostReport,
} from "./contracts/cost-cfo.js";

export {
  BizDecisionKindSchema,
  DecisionOptionSchema,
  OptionOutcomeSchema,
  SimulateDecisionInputSchema,
  BusinessSimulationSchema,
  type BizDecisionKind,
  type DecisionOption,
  type OptionOutcome,
  type SimulateDecisionInput,
  type BusinessSimulation,
} from "./contracts/business-simulation.js";

export {
  CommercializationTierSchema,
  FeatureClassificationSchema,
  ClassifyFeatureInputSchema,
  type CommercializationTier,
  type FeatureClassification,
  type ClassifyFeatureInput,
} from "./contracts/commercialization.js";

export {
  IdeaDispositionKindSchema,
  IdeaSignalsSchema,
  IdeaDispositionSchema,
  BusinessNextActionsSchema,
  NextActionsInputSchema,
  OptimizationPrioritySchema,
  type IdeaDispositionKind,
  type IdeaSignals,
  type IdeaDisposition,
  type BusinessNextActions,
  type NextActionsInput,
  type OptimizationPriority,
} from "./contracts/founder-principle.js";

export {
  PrincipleIdSchema,
  ConstitutionPrincipleSchema,
  ConstitutionCheckInputSchema,
  PrincipleVerdictSchema,
  ConstitutionVerdictSchema,
  type PrincipleId,
  type ConstitutionPrinciple,
  type ConstitutionCheckInput,
  type PrincipleVerdict,
  type ConstitutionVerdict,
} from "./contracts/constitution.js";

export {
  HierarchyLevelSchema,
  InheritablePolicySchema,
  HierarchyNodeSchema,
  CreateHierarchyNodeInputSchema,
  ResolvedNodeSchema,
  type HierarchyLevel,
  type InheritablePolicy,
  type HierarchyNode,
  type CreateHierarchyNodeInput,
  type ResolvedNode,
} from "./contracts/hierarchy.js";

export {
  ReflectionPeriodSchema,
  ReflectionInputSchema,
  ReflectionReportSchema,
  type ReflectionPeriod,
  type ReflectionInput,
  type ReflectionReport,
} from "./contracts/reflection.js";

export {
  GraphNodeKindSchema,
  GraphNodeSchema,
  GraphEdgeSchema,
  GraphQuerySchema,
  GraphNeighborhoodSchema,
  GraphRecommendationSchema,
  type GraphNodeKind,
  type GraphNode,
  type GraphEdge,
  type GraphQuery,
  type GraphNeighborhood,
  type GraphRecommendation,
} from "./contracts/knowledge-graph.js";

export {
  ManualArtifactKindSchema,
  ManualArtifactSchema,
  GenerateManualInputSchema,
  OperatingManualSchema,
  type ManualArtifactKind,
  type ManualArtifact,
  type GenerateManualInput,
  type OperatingManual,
} from "./contracts/operating-manual.js";

export {
  TwinStateSchema,
  TwinSnapshotSchema,
  TwinScenarioKindSchema,
  TwinSimulationInputSchema,
  TwinSimulationResultSchema,
  type TwinState,
  type TwinSnapshot,
  type TwinScenarioKind,
  type TwinSimulationInput,
  type TwinSimulationResult,
} from "./contracts/digital-twin.js";

export {
  InstitutionalRecordKindSchema,
  InstitutionalRecordSchema,
  CaptureRecordInputSchema,
  type InstitutionalRecordKind,
  type InstitutionalRecord,
  type CaptureRecordInput,
} from "./contracts/institutional-memory.js";

export {
  MissionControlAlertSeveritySchema,
  MissionControlAlertCategorySchema,
  MissionControlAlertStatusSchema,
  MissionControlAlertSchema,
  MissionControlPrioritySchema,
  MissionControlSnapshotSchema,
  HealthReadingSchema,
  MissionControlReadingInputSchema,
  MissionControlReadingSnapshotSchema,
  type MissionControlAlertSeverity,
  type MissionControlAlertCategory,
  type MissionControlAlertStatus,
  type MissionControlAlert,
  type MissionControlPriority,
  type MissionControlSnapshot,
  type HealthReading,
  type MissionControlReadingInput,
  type MissionControlReadingSnapshot,
} from "./contracts/mission-control.js";

export {
  ImprovementActionSchema,
  ImprovementMetricsSchema,
  EvaluateWorkflowInputSchema,
  ImprovementRecommendationSchema,
  WorkflowEvaluationSchema,
  type ImprovementAction,
  type ImprovementMetrics,
  type EvaluateWorkflowInput,
  type ImprovementRecommendation,
  type WorkflowEvaluation,
} from "./contracts/continuous-improvement.js";

export {
  BUILDER_TRIGGER,
  BuilderStageSchema,
  BuilderStageOutputSchema,
  StartBuildInputSchema,
  VentureBlueprintSchema,
  type BuilderStage,
  type BuilderStageOutput,
  type StartBuildInput,
  type VentureBlueprint,
} from "./contracts/builder-mode.js";

export {
  FINANCE_FORBIDDEN_ACTIONS,
  BusinessFinanceInputSchema,
  PersonalFinanceInputSchema,
  FinanceCommandInputSchema,
  BusinessFinanceReportSchema,
  FinanceOverviewSchema,
  type BusinessFinanceInput,
  type PersonalFinanceInput,
  type FinanceCommandInput,
  type BusinessFinanceReport,
  type FinanceOverview,
} from "./contracts/finance-command.js";

export {
  TaxStrategyAreaSchema,
  RiskLevelSchema,
  ComplexitySchema,
  TaxAnalysisInputSchema,
  TaxRecommendationSchema,
  TaxAnalysisSchema,
  type TaxStrategyArea,
  type RiskLevel,
  type Complexity,
  type TaxAnalysisInput,
  type TaxRecommendation,
  type TaxAnalysis,
} from "./contracts/tax-strategy.js";

export {
  EntityStructureSchema,
  EntityAnalysisInputSchema,
  EntityOptionSchema,
  EntityAnalysisSchema,
  type EntityStructure,
  type EntityAnalysisInput,
  type EntityOption,
  type EntityAnalysis,
} from "./contracts/entity-structure.js";

export {
  WealthItemKindSchema,
  WealthScopeSchema,
  WealthDropSchema,
  WealthItemSchema,
  type WealthItemKind,
  type WealthScope,
  type WealthDrop,
  type WealthItem,
} from "./contracts/wealth-dump-box.js";

export {
  MoneyStrategyKindSchema,
  MoneyStrategySchema,
  MoneyGameInputSchema,
  MoneyGamePlanSchema,
  type MoneyStrategyKind,
  type MoneyStrategy,
  type MoneyGameInput,
  type MoneyGamePlan,
} from "./contracts/money-game.js";

export {
  AlgorithmIdSchema,
  ScoringPhaseSchema,
  AlgorithmDescriptorSchema,
  ScoreRequestSchema,
  AlgorithmScoreSchema,
  type AlgorithmId,
  type ScoringPhase,
  type AlgorithmDescriptor,
  type ScoreRequest,
  type AlgorithmScore,
} from "./contracts/algorithm-overlay.js";

export {
  IntelClassificationSchema,
  ArticleScoresSchema,
  ArticleInputSchema,
  IntelligenceItemSchema,
  BriefingTimelineEntrySchema,
  LivingBriefingSchema,
  type IntelClassification,
  type ArticleScores,
  type ArticleInput,
  type IntelligenceItem,
  type BriefingTimelineEntry,
  type LivingBriefing,
} from "./contracts/intelligence-network.js";

export {
  FailureKindSchema,
  CaptureFailureInputSchema,
  FailureCaseSchema,
  TrendHorizonSchema,
  TrackTrendInputSchema,
  TrendSchema,
  type FailureKind,
  type CaptureFailureInput,
  type FailureCase,
  type TrendHorizon,
  type TrackTrendInput,
  type Trend,
} from "./contracts/failure-trends.js";

export {
  WhyThisMattersInputSchema,
  WhyThisMattersSchema,
  ContrarianInputSchema,
  ContrarianViewSchema,
  type WhyThisMattersInput,
  type WhyThisMatters,
  type ContrarianInput,
  type ContrarianView,
} from "./contracts/intel-lenses.js";

export {
  BriefingKindSchema,
  BriefingSectionSchema,
  BriefingInputSchema,
  BriefingSchema,
  type BriefingKind,
  type BriefingSection,
  type BriefingInput,
  type Briefing,
} from "./contracts/briefings.js";

export {
  PODCAST_NAME,
  EpisodeStageSchema,
  EpisodeIdeaInputSchema,
  EpisodePlanSchema,
  type EpisodeStage,
  type EpisodeIdeaInput,
  type EpisodePlan,
} from "./contracts/podcast-studio.js";

export {
  GuestStatusSchema,
  BookingDirectionSchema,
  GuestCandidateInputSchema,
  GuestRecordSchema,
  type GuestStatus,
  type BookingDirection,
  type GuestCandidateInput,
  type GuestRecord,
} from "./contracts/podcast-guests.js";

export {
  GeneratePrInputSchema,
  PrStrategySchema,
  type GeneratePrInput,
  type PrStrategy,
} from "./contracts/pr.js";

export {
  StorySourceSchema, StoryChannelSchema, StoryUrgencySchema, MineStoryInputSchema, StorySchema,
  type StorySource, type StoryChannel, type StoryUrgency, type MineStoryInput, type Story,
} from "./contracts/story-mining.js";

export {
  MediaInputKindSchema, MediaOutputKindSchema, MediaJobStatusSchema, IngestMediaInputSchema, MediaAssetSchema, MediaJobSchema,
  type MediaInputKind, type MediaOutputKind, type MediaJobStatus, type IngestMediaInput, type MediaAsset, type MediaJob,
} from "./contracts/media-os.js";

export {
  BrandKeySchema, BrandDnaSchema, UpsertBrandInputSchema,
  type BrandKey, type BrandDna, type UpsertBrandInput,
} from "./contracts/brand-dna.js";

export {
  ContentPieceKindSchema, CONTENT_MULTIPLIER, ContentPieceSchema, BuildPackageInputSchema, ContentPackageSchema,
  type ContentPieceKind, type ContentPiece, type BuildPackageInput, type ContentPackage,
} from "./contracts/content-factory.js";

export {
  ProductionAssetKindSchema, ProductionAssetSchema, ProductionPresetSchema, UpsertPresetInputSchema,
  type ProductionAssetKind, type ProductionAsset, type ProductionPreset, type UpsertPresetInput,
} from "./contracts/production-studio.js";

export {
  VisibilitySignalsSchema, VisibilityInputSchema, VisibilityReportSchema,
  type VisibilitySignals, type VisibilityInput, type VisibilityReport,
} from "./contracts/visibility.js";

export {
  PrTriggerSchema, PrOpportunityStatusSchema, DetectPrInputSchema, PrOpportunitySchema, AuthorityAssetKindSchema, AuthorityAssetSchema,
  type PrTrigger, type PrOpportunityStatus, type DetectPrInput, type PrOpportunity, type AuthorityAssetKind, type AuthorityAsset,
} from "./contracts/pr-authority.js";

export {
  AudienceSignalKindSchema, AudienceSignalSchema, AnalyzeAudienceInputSchema, AudienceProfileSchema,
  type AudienceSignalKind, type AudienceSignal, type AnalyzeAudienceInput, type AudienceProfile,
} from "./contracts/audience-intel.js";

export {
  FreedomLogInputSchema, FreedomActionKindSchema, FreedomRecommendationSchema, FreedomReportSchema,
  type FreedomLogInput, type FreedomActionKind, type FreedomRecommendation, type FreedomReport,
} from "./contracts/personal-freedom.js";

export {
  LegacyItemKindSchema, LegacyFormSchema, CaptureLegacyInputSchema, LegacyItemSchema,
  type LegacyItemKind, type LegacyForm, type CaptureLegacyInput, type LegacyItem,
} from "./contracts/legacy.js";

export {
  ReusableFormSchema, CompoundingMetricsSchema, EvaluateCompoundingInputSchema, AssetLineageSchema, CompoundingEvaluationSchema,
  type ReusableForm, type CompoundingMetrics, type EvaluateCompoundingInput, type AssetLineage, type CompoundingEvaluation,
} from "./contracts/compounding.js";

export {
  MultiplicationTargetSchema, SharedFormSchema, EvaluateMultiplicationInputSchema, MultiplicationEvaluationSchema,
  type MultiplicationTarget, type SharedForm, type EvaluateMultiplicationInput, type MultiplicationEvaluation,
} from "./contracts/multiplication.js";

export {
  LeverageInputsSchema, LeverageTierSchema, ScoreLeverageInputSchema, LeverageScoreSchema, LeverageComparisonSchema,
  type LeverageInputs, type LeverageTier, type ScoreLeverageInput, type LeverageScore, type LeverageComparison,
} from "./contracts/leverage.js";

export {
  LawIdSchema, ImmutableLawSchema, LawCheckInputSchema, LawVerdictSchema, LawComplianceSchema,
  type LawId, type ImmutableLaw, type LawCheckInput, type LawVerdict, type LawCompliance,
} from "./contracts/immutable-laws.js";

export {
  CapitalKindSchema, AllocationHorizonSchema, AllocationCandidateSchema, AllocateInputSchema, AllocationPlanSchema,
  type CapitalKind, type AllocationHorizon, type AllocationCandidate, type AllocateInput, type AllocationPlan,
} from "./contracts/capital-allocator.js";

export {
  CostOptionSchema, CompareOptionsInputSchema, EvaluatedOptionSchema, OpportunityComparisonSchema,
  type CostOption, type CompareOptionsInput, type EvaluatedOption, type OpportunityComparison,
} from "./contracts/opportunity-cost.js";

export {
  JournalReviewWindowSchema, RecordDecisionInputSchema, JournaledDecisionSchema, ReviewDecisionInputSchema,
  type JournalReviewWindow, type RecordDecisionInput, type JournaledDecision, type ReviewDecisionInput,
} from "./contracts/decision-journal.js";

export {
  TimelineEventKindSchema, AddTimelineEventInputSchema, TimelineEventSchema,
  type TimelineEventKind, type AddTimelineEventInput, type TimelineEvent,
} from "./contracts/memory-timeline.js";

export {
  ReviewerRoleSchema, ProposalSignalsSchema, ConveneBoardInputSchema, ReviewerVerdictSchema, BoardReviewSchema,
  type ReviewerRole, type ProposalSignals, type ConveneBoardInput, type ReviewerVerdict, type BoardReview,
} from "./contracts/review-board.js";

export {
  OffloadInputKindSchema, ProcessOffloadInputSchema, UnderstandingSchema, OffloadDispositionSchema, HandledItemSchema, OffloadRecordSchema,
  type OffloadInputKind, type ProcessOffloadInput, type Understanding, type OffloadDisposition, type HandledItem, type OffloadRecord,
} from "./contracts/cognitive-offload.js";

export {
  PrepCategorySchema, DetectEventInputSchema, ChecklistSchema, ScheduledReminderSchema, LogisticsCalendarBlockSchema, LogisticsPlanSchema,
  type PrepCategory, type DetectEventInput, type Checklist, type ScheduledReminder, type LogisticsCalendarBlock, type LogisticsPlan,
} from "./contracts/life-logistics.js";

export {
  FailureTypeSchema, AnalyzeFailureInputSchema, AntiFragilityCaseSchema,
  type FailureType, type AnalyzeFailureInput, type AntiFragilityCase,
} from "./contracts/anti-fragility.js";

export {
  LayerSchema, LayerAssignmentSchema, ExecFlowRequestSchema, FlowDecisionSchema,
  type Layer, type LayerAssignment, type ExecFlowRequest, type FlowDecision,
} from "./contracts/brain-hands.js";

export {
  CouncilRoleSchema, CouncilDecisionKindSchema, CouncilSignalsSchema, ConveneCouncilInputSchema, CouncilOpinionSchema, CouncilVerdictSchema,
  type CouncilRole, type CouncilDecisionKind, type CouncilSignals, type ConveneCouncilInput, type CouncilOpinion, type CouncilVerdict,
} from "./contracts/agent-council.js";

export {
  OperatorReviewInputSchema, OperatorReviewSchema,
  type OperatorReviewInput, type OperatorReview,
} from "./contracts/operator-mode.js";

export {
  CapitalDispositionSchema, BoardOptionInputSchema, AllocateBoardInputSchema, BoardOptionVerdictSchema, CapitalBoardDecisionSchema,
  type CapitalDisposition, type BoardOptionInput, type AllocateBoardInput, type BoardOptionVerdict, type CapitalBoardDecision,
} from "./contracts/capital-board.js";

export {
  CashPathInputSchema, BuildSprintInputSchema, RankedCashPathSchema, SprintPlanSchema,
  type CashPathInput, type BuildSprintInput, type RankedCashPath, type SprintPlan,
} from "./contracts/million-sprint.js";

export {
  RevenueStageSchema, TruthDealSchema, RevenueTruthInputSchema, RevenueTruthReportSchema,
  type RevenueStage, type TruthDeal, type RevenueTruthInput, type RevenueTruthReport,
} from "./contracts/revenue-truth.js";

export {
  TaskOwnerSchema, ClassifyTaskInputSchema, DelegationDecisionSchema,
  type TaskOwner, type ClassifyTaskInput, type DelegationDecision,
} from "./contracts/delegation.js";

export {
  RiskCategorySchema, RiskStatusSchema, AddRiskInputSchema, EnterpriseRiskSchema,
  type RiskCategory, type RiskStatus, type AddRiskInput, type EnterpriseRisk,
} from "./contracts/risk-register.js";

export {
  GenerateBoardPacketInputSchema, PacketSectionSchema, BoardPacketSchema,
  type GenerateBoardPacketInput, type PacketSection, type BoardPacket,
} from "./contracts/board-packet.js";

export {
  ExitPathSchema, AssessExitInputSchema, ExitAssessmentSchema,
  type ExitPath, type AssessExitInput, type ExitAssessment,
} from "./contracts/strategic-exit.js";

export {
  NervousSystemInputSchema, NervousActionSchema, NervousRecommendationSchema, NervousSystemReportSchema,
  type NervousSystemInput, type NervousAction, type NervousRecommendation, type NervousSystemReport,
} from "./contracts/nervous-system.js";

export {
  RelaxBucketSchema, RelaxItemInputSchema, RelaxPlanInputSchema, RelaxItemSchema, RelaxationPlanSchema,
  ProgressKindSchema, ProgressActionSchema, AssessProgressInputSchema, ProgressAssessmentSchema,
  type RelaxBucket, type RelaxItemInput, type RelaxPlanInput, type RelaxItem, type RelaxationPlan,
  type ProgressKind, type ProgressAction, type AssessProgressInput, type ProgressAssessment,
} from "./contracts/outcome-engines.js";

export {
  CapitalTypeSchema, CapitalDeltasSchema, CapitalReportInputSchema, CapitalReportSchema,
  type CapitalType, type CapitalDeltas, type CapitalReportInput, type CapitalReport,
} from "./contracts/capital-engine.js";

export {
  HorizonSchema, ProjectConsequencesInputSchema, HorizonImpactSchema, ConsequenceProjectionSchema,
  type Horizon, type ProjectConsequencesInput, type HorizonImpact, type ConsequenceProjection,
} from "./contracts/consequence-horizon.js";

export {
  PyramidLevelSchema, ClassifyPyramidInputSchema, PyramidPlacementSchema,
  type PyramidLevel, type ClassifyPyramidInput, type PyramidPlacement,
} from "./contracts/pyramid.js";

export {
  RndDomainSchema, RndDispositionSchema, EvaluateDiscoveryInputSchema, RndDiscoverySchema, InnovationReportSchema,
  type RndDomain, type RndDisposition, type EvaluateDiscoveryInput, type RndDiscovery, type InnovationReport,
} from "./contracts/rnd.js";

export {
  AcquisitionStrategySchema, StrategySignalsSchema, EvaluateAcquisitionInputSchema, StrategyVerdictSchema, AcquisitionEvaluationSchema,
  type AcquisitionStrategy, type StrategySignals, type EvaluateAcquisitionInput, type StrategyVerdict, type AcquisitionEvaluation,
} from "./contracts/acquisition.js";

export {
  FlightDeckSectionKindSchema, FlightDeckCandidateSchema, BuildFlightDeckInputSchema, FlightDeckSectionSchema, FlightDeckSchema,
  type FlightDeckSectionKind, type FlightDeckCandidate, type BuildFlightDeckInput, type FlightDeckSection, type FlightDeck,
} from "./contracts/flight-deck.js";

export {
  FreedomTrendSchema, FreedomIndexInputSchema, FreedomIndexReadingSchema,
  type FreedomTrend, type FreedomIndexInput, type FreedomIndexReading,
} from "./contracts/freedom-index.js";

export {
  LifeRoiInputSchema, LifeRoiAssessmentSchema,
  type LifeRoiInput, type LifeRoiAssessment,
} from "./contracts/life-roi.js";

export {
  FrustrationTriggerSchema, CaptureFrustrationInputSchema, NeverAgainSolutionSchema,
  type FrustrationTrigger, type CaptureFrustrationInput, type NeverAgainSolution,
} from "./contracts/never-again.js";

export {
  SelfImprovementFindingKindSchema, SystemComponentInputSchema, EvaluateSystemInputSchema, SelfImprovementFindingSchema, SelfImprovementReportSchema,
  type SelfImprovementFindingKind, type SystemComponentInput, type EvaluateSystemInput, type SelfImprovementFinding, type SelfImprovementReport,
} from "./contracts/self-improvement.js";

export {
  RhythmCadenceSchema, BuildRhythmInputSchema, RhythmOutputsSchema, OperatingRhythmAgendaSchema,
  type RhythmCadence, type BuildRhythmInput, type RhythmOutputs, type OperatingRhythmAgenda,
} from "./contracts/operating-rhythm.js";

export {
  ExecManualDomainSchema, ManualSourceInputSchema, AssembleManualInputSchema, ExecManualSectionSchema, ExecutiveOperatingManualDocSchema,
  type ExecManualDomain, type ManualSourceInput, type AssembleManualInput, type ExecManualSection, type ExecutiveOperatingManualDoc,
} from "./contracts/exec-operating-manual.js";

export {
  LoopStageSchema, PlaceInLoopInputSchema, LoopPlacementSchema,
  type LoopStage, type PlaceInLoopInput, type LoopPlacement,
} from "./contracts/infinite-loop.js";

export {
  DesignRuleCriterionSchema, EvaluateFeatureInputSchema, DesignRuleVerdictSchema,
  type DesignRuleCriterion, type EvaluateFeatureInput, type DesignRuleVerdict,
} from "./contracts/ultimate-design-rule.js";

export {
  IdentityAnchorKindSchema, SetAnchorInputSchema, IdentityAnchorSchema, CheckAlignmentInputSchema, IdentityAlignmentVerdictSchema,
  type IdentityAnchorKind, type SetAnchorInput, type IdentityAnchor, type CheckAlignmentInput, type IdentityAlignmentVerdict,
} from "./contracts/identity-os.js";

export {
  AddPhilosophyInputSchema, PhilosophySchema, TodaysReminderSchema,
  type AddPhilosophyInput, type Philosophy, type TodaysReminder,
} from "./contracts/philosophy-library.js";

export {
  ConversationOutputKindSchema, ConversationInputCategorySchema, ProcessConversationInputSchema, ConversationOutputSchema, ConversationExtractionSchema,
  type ConversationOutputKind, type ConversationInputCategory, type ProcessConversationInput, type ConversationOutput, type ConversationExtraction,
} from "./contracts/conversation.js";

export {
  ExploreIdeaInputSchema, VisionArtifactSchema, VisionSessionSchema,
  type ExploreIdeaInput, type VisionArtifact, type VisionSession,
} from "./contracts/vision-builder.js";

export {
  VoiceCategorySchema, VoiceIntentSchema, InterpretVoiceInputSchema, VoiceCommandSchema,
  type VoiceCategory, type VoiceIntent, type InterpretVoiceInput, type VoiceCommand,
} from "./contracts/voice-interface.js";

export {
  PersonaToneSchema, PersonaDutySchema, ConfigureVoicePersonaInputSchema, VoicePersonaSchema,
  type PersonaTone, type PersonaDuty, type ConfigureVoicePersonaInput, type VoicePersona,
} from "./contracts/voice-persona.js";

export {
  PemDimensionSchema, PemEvidenceSourceSchema, PemTraitSchema, ObservePemInputSchema, PemExplanationSchema, PersonalExecutiveModelSchema,
  type PemDimension, type PemEvidenceSource, type PemTrait, type ObservePemInput, type PemExplanation, type PersonalExecutiveModel,
} from "./contracts/personal-executive-model.js";

export {
  MeetingTalkingPointSchema, PrepareMeetingInputSchema, MeetingDossierSchema, CaptureRecapInputSchema, MeetingRecapSchema,
  type MeetingTalkingPoint, type PrepareMeetingInput, type MeetingDossier, type CaptureRecapInput, type MeetingRecap,
} from "./contracts/meeting-prep.js";

export {
  RelationshipPartyKindSchema, RelationshipPromiseSchema, RelationshipMoveKindSchema, RelationshipOpportunitySchema, UpsertRelationshipInputSchema, RelationshipCapitalRecordSchema,
  type RelationshipPartyKind, type RelationshipPromise, type RelationshipMoveKind, type RelationshipOpportunity, type UpsertRelationshipInput, type RelationshipCapitalRecord,
} from "./contracts/relationship-capital.js";

export {
  VentureStudioStageSchema, StageStatusSchema, VentureStageProgressSchema, StartVentureInputSchema, VentureStudioSessionSchema,
  type VentureStudioStage, type StageStatus, type VentureStageProgress, type StartVentureInput, type VentureStudioSession,
} from "./contracts/venture-studio.js";

export {
  ThinkingPatternKindSchema, ObserveThinkingInputSchema, ThinkingPatternObservationSchema,
  type ThinkingPatternKind, type ObserveThinkingInput, type ThinkingPatternObservation,
} from "./contracts/alyssa-pattern-mirror.js";

export {
  FrameworkArtifactKindSchema, FrameworkArtifactSchema, DetectFrameworkInputSchema, TaughtFrameworkSchema,
  type FrameworkArtifactKind, type FrameworkArtifact, type DetectFrameworkInput, type TaughtFramework,
} from "./contracts/teach-framework.js";

export {
  LifeMetricSchema, BuildLifeDashboardInputSchema, LifeDashboardSchema,
  type LifeMetric, type BuildLifeDashboardInput, type LifeDashboard,
} from "./contracts/life-dashboard.js";

export {
  BuildPacketStatusSchema, UserStorySchema, BuildTriageSchema, GenerateBuildPacketInputSchema, BuildPacketSchema,
  type BuildPacketStatus, type UserStory, type BuildTriage, type GenerateBuildPacketInput, type BuildPacket,
} from "./contracts/build-packet.js";

export {
  GenerateHandoffInputSchema, FilePlanEntrySchema, CodeHandoffSchema,
  type GenerateHandoffInput, type FilePlanEntry, type CodeHandoff,
} from "./contracts/code-handoff.js";

export {
  ReviewDimensionSchema, ReviewCheckSchema, ImplementationVerdictSchema, ReviewImplementationInputSchema, ImplementationReviewSchema,
  type ReviewDimension, type ReviewCheck, type ImplementationVerdict, type ReviewImplementationInput, type ImplementationReview,
} from "./contracts/implementation-review.js";

export {
  ShipCheckKindSchema, ShipCheckSchema, ShipVerdictSchema, EvaluateShipInputSchema, ShipGateEvaluationSchema,
  type ShipCheckKind, type ShipCheck, type ShipVerdict, type EvaluateShipInput, type ShipGateEvaluation,
} from "./contracts/ship-gate.js";

export {
  ColumnPlanSchema, SoftDeleteStrategySchema, TablePlanSchema, PlanArchitectureInputSchema, SupabaseArchitecturePlanSchema,
  type ColumnPlan, type SoftDeleteStrategy, type TablePlan, type PlanArchitectureInput, type SupabaseArchitecturePlan,
} from "./contracts/supabase-architecture.js";

export {
  ActiveBuildSchema, BuildCommandCenterInputSchema, DeveloperCommandCenterSchema,
  type ActiveBuild, type BuildCommandCenterInput, type DeveloperCommandCenter,
} from "./contracts/developer-command-center.js";

export {
  PipelineStageSchema, StartPipelineInputSchema, PipelineStageStatusSchema, ConversationToCodeRunSchema,
  type PipelineStage, type StartPipelineInput, type PipelineStageStatus, type ConversationToCodeRun,
} from "./contracts/conversation-to-code.js";

export {
  DiviniCriterionSchema, DiviniCriterionScoreSchema, DiviniRecommendationSchema, EvaluateDiviniInputSchema, DiviniEvaluationSchema,
  type DiviniCriterion, type DiviniCriterionScore, type DiviniRecommendation, type EvaluateDiviniInput, type DiviniEvaluation,
} from "./contracts/divini-standard.js";

export {
  InfraProviderSchema, InfraComponentStatusSchema, InfraComponentSchema, EnvVarPlanSchema, ManualStepSchema, PrepareInfrastructureInputSchema, InfrastructurePlanSchema,
  type InfraProvider, type InfraComponentStatus, type InfraComponent, type EnvVarPlan, type ManualStep, type PrepareInfrastructureInput, type InfrastructurePlan,
} from "./contracts/infra-launch.js";

export {
  PreLaunchCheckKindSchema, PreLaunchCheckSchema, PressLiveOutcomeSchema, RunPressLiveInputSchema, PressLiveEvaluationSchema,
  type PreLaunchCheckKind, type PreLaunchCheck, type PressLiveOutcome, type RunPressLiveInput, type PressLiveEvaluation,
} from "./contracts/press-live.js";

export {
  HumanTouchCategorySchema, HumanTouchStatusSchema, QueueHumanTouchInputSchema, HumanTouchItemSchema, HumanTouchSummarySchema,
  type HumanTouchCategory, type HumanTouchStatus, type QueueHumanTouchInput, type HumanTouchItem, type HumanTouchSummary,
} from "./contracts/human-touch-queue.js";

export {
  AccessGrantStatusSchema, AccessReuseDecisionSchema, RememberAccessInputSchema, AccessGrantMemorySchema, AccessCheckResultSchema,
  type AccessGrantStatus, type AccessReuseDecision, type RememberAccessInput, type AccessGrantMemory, type AccessCheckResult,
} from "./contracts/permission-memory.js";

export {
  SetupPatternSchema, BatchSetupStatusSchema, DetectSetupInputSchema, BatchedSetupSchema,
  type SetupPattern, type BatchSetupStatus, type DetectSetupInput, type BatchedSetup,
} from "./contracts/batch-once.js";

export {
  FutureSignalsSchema, FutureMeVerdictSchema, AssessFutureInputSchema, FutureMeAssessmentSchema,
  type FutureSignals, type FutureMeVerdict, type AssessFutureInput, type FutureMeAssessment,
} from "./contracts/future-me.js";

export {
  OptionalityPathSchema, AssessOptionalityInputSchema, OptionalityVerdictSchema, OptionalityAssessmentSchema,
  type OptionalityPath, type AssessOptionalityInput, type OptionalityVerdict, type OptionalityAssessment,
} from "./contracts/optionality.js";

export {
  ThoughtStanceSchema, ConsultThoughtPartnerInputSchema, ThoughtPartnerResponseSchema,
  type ThoughtStance, type ConsultThoughtPartnerInput, type ThoughtPartnerResponse,
} from "./contracts/executive-thought-partner.js";

export {
  CapabilityImpactSchema, CapabilityPrioritySchema, AssessCapabilityInputSchema, CapabilityReportSchema,
  type CapabilityImpact, type CapabilityPriority, type AssessCapabilityInput, type CapabilityReport,
} from "./contracts/capability-monitor.js";

export {
  StackCategorySchema, StackDispositionSchema, StackSignalsSchema, EvaluateStackInputSchema, StackEvaluationSchema,
  type StackCategory, type StackDisposition, type StackSignals, type EvaluateStackInput, type StackEvaluation,
} from "./contracts/tech-stack-evaluator.js";

export {
  ReuseTargetSchema, ReusePackageKindSchema, AssessReuseInputSchema, ReuseAssessmentSchema,
  type ReuseTarget, type ReusePackageKind, type AssessReuseInput, type ReuseAssessment,
} from "./contracts/build-once-reuse.js";

export {
  ConnectionScopeSchema, ConnectionStatusSchema, ConnectorAuthKindSchema, ConnectorRiskLevelSchema,
  RegisterConnectorInputSchema, ConnectorDefinitionSchema, ConnectInputSchema, ConnectionSchema,
  ResolveConnectionInputSchema, ConnectionResolutionSchema,
  type ConnectionScope, type ConnectionStatus, type ConnectorAuthKind, type ConnectorRiskLevel,
  type RegisterConnectorInput, type ConnectorDefinition, type ConnectInput, type Connection,
  type ResolveConnectionInput, type ConnectionResolution,
} from "./contracts/connections.js";

export {
  BrainstormInputSourceSchema, BrainstormInputKindSchema, BrainstormThreadStatusSchema,
  BrainstormDecisionCategorySchema, DecisionStatusSchema, BrainstormRiskSchema, StrategyLayerSchema,
  PromptCategorySchema, BuildAgentKindSchema, BuildTaskStatusSchema, BuildTaskPrioritySchema,
  TaskComplexitySchema, QaVerdictSchema, ApprovalActionSchema, QueueControlSchema,
  BrainstormThreadSchema, BrainstormInputSchema, IngestBrainstormInputSchema, DecisionCardSchema,
  StrategyLayerEntrySchema, StrategyMapSchema, BuildPromptCardSchema, BuildPromptPackSchema,
  BuildTaskSchema, ApprovalSummarySchema, ApproveQueueInputSchema, AgentRunLogSchema, QaCheckSchema,
  QaResultSchema, BrainstormChangelogEntrySchema,
  type BrainstormInputSource, type BrainstormInputKind, type BrainstormThreadStatus,
  type BrainstormDecisionCategory, type DecisionStatus, type BrainstormRisk, type StrategyLayer,
  type PromptCategory, type BuildAgentKind, type BuildTaskStatus, type BuildTaskPriority,
  type TaskComplexity, type QaVerdict, type ApprovalAction, type QueueControl,
  type BrainstormThread, type BrainstormInput, type IngestBrainstormInput, type DecisionCard,
  type StrategyLayerEntry, type StrategyMap, type BuildPromptCard, type BuildPromptPack,
  type BuildTask, type ApprovalSummary, type ApproveQueueInput, type AgentRunLog, type QaCheck,
  type QaResult, type BrainstormChangelogEntry,
} from "./contracts/build-from-brainstorm.js";

// People Operations + Hiring Lifecycle, and Department OS + AI Employee KPI/scorecards.
// (All exports uniquely prefixed by their contracts; verified collision-free.)
export * from "./contracts/people-ops.js";
export * from "./contracts/department-os.js";

// AI Organization / Chain of Command, and CRO / Revenue Command. (Uniquely prefixed; collision-free.)
export * from "./contracts/ai-org.js";
export * from "./contracts/revenue-command.js";

// Swarm Lab — R&D's bounded swarm.
export * from "./contracts/swarm-lab.js";

// Business Operating Profiles + Context Stack (business-aware execution).
export * from "./contracts/business-profile.js";

// Executive Review Cadence, Expert Council, Org Health (CODO), Incentive Ecosystem. (Uniquely prefixed.)
export * from "./contracts/review-cadence.js";
export * from "./contracts/expert-council.js";
export * from "./contracts/org-health.js";
export * from "./contracts/incentive-ecosystem.js";

// Knowledge Ops, Lifecycle+Growth, Market Intel, Oversight. (Uniquely prefixed; collision-free.)
export * from "./contracts/knowledge-ops.js";
export * from "./contracts/lifecycle-growth.js";
export * from "./contracts/market-intel.js";
export * from "./contracts/oversight.js";

// API Approval Gate (the central, persisted gate the API enforces).
// Re-exported under Api*-prefixed aliases to avoid colliding with security.ts's ApprovalRequest*.
export {
  ApprovalActionClassSchema as ApiApprovalActionClassSchema,
  ApprovalRiskSchema as ApiApprovalRiskSchema,
  ApprovalRequestStatusSchema as ApiApprovalRequestStatusSchema,
  ApprovalRequestSchema as ApiApprovalRequestSchema,
  type ApprovalActionClass as ApiApprovalActionClass,
  type ApprovalRisk as ApiApprovalRisk,
  type ApprovalRequestStatus as ApiApprovalRequestStatus,
  type ApprovalRequest as ApiApprovalRequest,
} from "./contracts/api-approval.js";

// Founder Energy + Capacity Layer (§31) — uniquely prefixed; no barrel collisions.
export * from "./contracts/founder-capacity.js";

// Revenue Operating System (§33) — RevOps brief + fastest-path-to-cash.
export * from "./contracts/revops.js";

// Decision Engine (§35) — decision record + 13 principle lenses. (Status enum named
// DecisionRecordStatus to avoid collision with build-from-brainstorm's DecisionStatus.)
export * from "./contracts/decision-record.js";

// Capital Allocation (§34) — Profit-First buckets + runway.
export * from "./contracts/capital-allocation.js";

// GTM Factory (docs/GTM_FACTORY_SPEC.md) — offer → approval-gated launch plan.
export * from "./contracts/gtm-factory.js";

// AI adapter (live model layer) — provider-agnostic completion, always metered.
export * from "./contracts/ai-adapter.js";

// Web module state + vault snapshots (server-side custody for the command-center module layer)
export * from "./contracts/module-state.js";
