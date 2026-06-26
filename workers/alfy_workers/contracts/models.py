"""Pydantic v2 mirrors of the canonical Zod contracts in `packages/shared`.

These models MUST stay in lockstep with the Zod schemas in
`packages/shared/src/contracts/` (signal-to-action.ts, task.ts, module-manifest.ts,
agent-registration.ts). The Zod schemas are canonical; if a shared fixture fails to
validate here, the bug is in this file, not the fixture. Contract tests in
`workers/tests/test_contracts.py` validate the shared fixtures against these models to
prove cross-runtime lockstep.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

# Mirrors the SEMVER regex used by module-manifest.ts and agent-registration.ts.
SEMVER_PATTERN = r"^\d+\.\d+\.\d+([-+].+)?$"


class Evidence(BaseModel):
    """Mirror of EvidenceSchema (signal-to-action.ts)."""

    model_config = ConfigDict(extra="forbid")

    source: str = Field(min_length=1)
    ref: str | None = None


class Action(BaseModel):
    """Mirror of ActionSchema (signal-to-action.ts)."""

    model_config = ConfigDict(extra="forbid")

    label: str = Field(min_length=1)
    reversible: bool
    payload: dict[str, Any] = Field(default_factory=dict)


class SignalToAction(BaseModel):
    """Mirror of SignalToActionSchema (signal-to-action.ts)."""

    model_config = ConfigDict(extra="forbid")

    what_changed: str = Field(min_length=1)
    why_it_matters: str = Field(min_length=1)
    next_actions: list[Action] = Field(default_factory=list)
    confidence: float = Field(ge=0, le=1)
    evidence: list[Evidence] = Field(default_factory=list)
    explanation: str = Field(min_length=1)


class TaskBudget(BaseModel):
    """Mirror of TaskBudgetSchema (task.ts)."""

    model_config = ConfigDict(extra="forbid")

    max_tokens: int = Field(ge=0)
    max_cost_usd: float = Field(ge=0)
    timeout_ms: int = Field(gt=0)


class Task(BaseModel):
    """Mirror of TaskSchema (task.ts)."""

    model_config = ConfigDict(extra="forbid")

    task_id: UUID
    tenant_id: UUID
    agent: str = Field(min_length=1)
    capability: str = Field(min_length=1)
    input: dict[str, Any] = Field(default_factory=dict)
    budget: TaskBudget
    trace_id: UUID


class ModuleManifest(BaseModel):
    """Mirror of ModuleManifestSchema (module-manifest.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: str = Field(pattern=r"^[a-z][a-z0-9_]*$")
    version: str = Field(pattern=SEMVER_PATTERN)
    status: Literal["scaffold", "active", "deprecated"] = "scaffold"
    description: str | None = None
    capabilities: list[str] = Field(default_factory=list)
    requires_agents: list[str] = Field(default_factory=list)
    irreversible_capabilities: list[str] = Field(default_factory=list)
    owner: str = Field(min_length=1)


class AgentRegistration(BaseModel):
    """Mirror of AgentRegistrationSchema (agent-registration.ts)."""

    model_config = ConfigDict(extra="forbid")

    key: str = Field(pattern=r"^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$")
    runtime: Literal["python", "typescript"]
    endpoint: str = Field(min_length=1)
    capabilities: list[str] = Field(default_factory=list)
    version: str = Field(pattern=SEMVER_PATTERN)


# --- Memory Engine contracts (mirror of packages/shared/src/contracts/memory.ts) ---

# Mirror of MemoryKindSchema. snake_case, stable identifiers.
MemoryKind = Literal[
    "business",
    "project",
    "person",
    "company",
    "meeting",
    "conversation",
    "task",
    "idea",
    "preference",
    "pattern",
    "vehicle",
    "home",
    "doctor",
    "contract",
    "subscription",
    "account",
    "health_event",
    "decision",
    "lesson",
    "pet",
    "trip",
    "goal",
]

# Mirror of MemoryRelationSchema. Typed edges in the memory graph.
MemoryRelation = Literal[
    "related_to",
    "about",
    "derived_from",
    "supersedes",
    "contradicts",
    "owns",
    "works_at",
    "attended",
    "member_of",
    "scheduled_for",
    "depends_on",
    "mentions",
    "located_at",
    "treats",
    "subscribes_to",
    "decided",
    "learned_from",
]

# Mirror of MemoryStatusSchema.
MemoryStatus = Literal["active", "archived", "superseded"]


class MemoryRecord(BaseModel):
    """Mirror of MemoryRecordSchema (memory.ts). A single atomic memory."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    kind: MemoryKind
    title: str = Field(min_length=1)
    body: str = ""
    attributes: dict[str, Any] = Field(default_factory=dict)
    importance: float = Field(ge=0, le=1)
    confidence: float = Field(ge=0, le=1)
    source: str = Field(min_length=1)
    source_ref: str | None = None
    keywords: list[str] = Field(default_factory=list)
    status: MemoryStatus = "active"
    use_count: int = Field(default=0, ge=0)
    last_used_at: datetime | None = None
    expires_at: datetime | None = None
    superseded_by: UUID | None = None
    created_at: datetime
    updated_at: datetime | None = None


class MemoryLink(BaseModel):
    """Mirror of MemoryLinkSchema (memory.ts). A typed relationship between two memories."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    from_memory_id: UUID
    to_memory_id: UUID
    relation: MemoryRelation
    weight: float = Field(default=1.0, ge=0, le=1)
    created_at: datetime


class CreateMemoryInput(BaseModel):
    """Mirror of CreateMemoryInputSchema (memory.ts). Input to create/remember a memory."""

    model_config = ConfigDict(extra="forbid")

    kind: MemoryKind
    title: str = Field(min_length=1)
    body: str = ""
    attributes: dict[str, Any] = Field(default_factory=dict)
    importance: float = Field(default=0.5, ge=0, le=1)
    confidence: float = Field(default=0.6, ge=0, le=1)
    source: str = Field(min_length=1)
    source_ref: str | None = None
    keywords: list[str] = Field(default_factory=list)
    expires_at: datetime | None = None


class MemoryQuery(BaseModel):
    """Mirror of MemoryQuerySchema (memory.ts). A recall query against the memory store."""

    model_config = ConfigDict(extra="forbid")

    text: str | None = None
    keywords: list[str] = Field(default_factory=list)
    kinds: list[MemoryKind] = Field(default_factory=list)
    min_importance: float = Field(default=0.0, ge=0, le=1)
    min_confidence: float = Field(default=0.0, ge=0, le=1)
    limit: int = Field(default=10, gt=0, le=200)
    include_archived: bool = False


# --- Decision Engine contracts (mirror of packages/shared/src/contracts/decision.ts) ---

# Mirror of DecisionCategorySchema. The category an input belongs to (multi-label).
DecisionCategory = Literal[
    "business",
    "personal",
    "health",
    "finance",
    "relationship",
    "idea",
    "learning",
    "risk",
    "opportunity",
]

# Mirror of EffortBucketSchema.
EffortBucket = Literal["trivial", "small", "medium", "large", "xlarge"]

# Mirror of PriorityLevelSchema.
PriorityLevel = Literal["low", "medium", "high", "critical"]


class CategoryScore(BaseModel):
    """Mirror of CategoryScoreSchema (decision.ts)."""

    model_config = ConfigDict(extra="forbid")

    category: DecisionCategory
    confidence: float = Field(ge=0, le=1)


class DecisionInput(BaseModel):
    """Mirror of DecisionInputSchema (decision.ts). Raw input to classify."""

    model_config = ConfigDict(extra="forbid")

    text: str = Field(min_length=1)
    source: str = Field(default="operator", min_length=1)
    context: dict[str, Any] = Field(default_factory=dict)


class Decision(BaseModel):
    """Mirror of DecisionSchema (decision.ts). The structured decision the engine returns."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    input_text: str = Field(min_length=1)
    source: str = Field(min_length=1)

    # Classification (multi-label, plus the dominant one).
    categories: list[CategoryScore] = Field(min_length=1)
    primary_category: DecisionCategory

    # Scored dimensions, all 0..1.
    urgency: float = Field(ge=0, le=1)
    importance: float = Field(ge=0, le=1)
    difficulty: float = Field(ge=0, le=1)
    revenue_impact: float = Field(ge=0, le=1)
    risk: float = Field(ge=0, le=1)

    # Effort.
    estimated_effort_minutes: int = Field(ge=0)
    effort_bucket: EffortBucket

    # Composite priority.
    priority_score: float = Field(ge=0, le=1)
    priority_level: PriorityLevel

    # Routing & action.
    required_approvals: list[str] = Field(default_factory=list)
    recommended_agents: list[str] = Field(default_factory=list)
    recommended_deadline: datetime | None = None
    automation_opportunities: list[str] = Field(default_factory=list)

    # Explainability — always present.
    reasons: list[str] = Field(default_factory=list)
    explanation: str = Field(min_length=1)

    created_at: datetime


# --- Chief of Staff contracts (mirror of packages/shared/src/contracts/chief-of-staff.ts) ---


class BriefingItem(BaseModel):
    """Mirror of BriefingItemSchema (chief-of-staff.ts). A single actionable line item."""

    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1)
    detail: str = ""
    priority_level: PriorityLevel
    score: float = Field(ge=0, le=1)
    category: DecisionCategory | None = None
    ref: str | None = None
    due: datetime | None = None
    required_approvals: list[str] = Field(default_factory=list)
    recommended_agents: list[str] = Field(default_factory=list)


class MeetingPrep(BaseModel):
    """Mirror of MeetingPrepSchema (chief-of-staff.ts). Prep package for one meeting."""

    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1)
    when: datetime | None = None
    attendees: list[str] = Field(default_factory=list)
    related_memory_ids: list[str] = Field(default_factory=list)
    prep_points: list[str] = Field(default_factory=list)
    recommended_agents: list[str] = Field(default_factory=list)


class CalendarBlock(BaseModel):
    """Mirror of CalendarBlockSchema (chief-of-staff.ts). A suggested calendar/time block."""

    model_config = ConfigDict(extra="forbid")

    label: str = Field(min_length=1)
    when: datetime | None = None
    recommendation: str = Field(min_length=1)


class EnergyPlan(BaseModel):
    """Mirror of EnergyPlanSchema (chief-of-staff.ts). Energy-aware sequencing of the day."""

    model_config = ConfigDict(extra="forbid")

    summary: str = Field(min_length=1)
    deep_work: list[BriefingItem] = Field(default_factory=list)
    quick_wins: list[BriefingItem] = Field(default_factory=list)
    recovery: list[str] = Field(default_factory=list)


class DashboardSummary(BaseModel):
    """Mirror of DashboardSummarySchema (chief-of-staff.ts). Glanceable summary metrics."""

    model_config = ConfigDict(extra="forbid")

    total_items: int = Field(ge=0)
    critical_count: int = Field(ge=0)
    high_count: int = Field(ge=0)
    medium_count: int = Field(ge=0)
    low_count: int = Field(ge=0)
    revenue_opportunities: int = Field(ge=0)
    open_risks: int = Field(ge=0)
    blocked_count: int = Field(ge=0)
    decisions_awaiting: int = Field(ge=0)
    top_focus: str
    markdown: str


# Mirror of BriefingHorizonSchema.
BriefingHorizon = Literal["today", "week"]


class ChiefOfStaffBriefing(BaseModel):
    """Mirror of ChiefOfStaffBriefingSchema (chief-of-staff.ts). The full executive briefing."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    generated_at: datetime
    horizon: BriefingHorizon = "today"

    daily_priorities: list[BriefingItem] = Field(default_factory=list)
    revenue_focus: list[BriefingItem] = Field(default_factory=list)
    calendar_preparation: list[CalendarBlock] = Field(default_factory=list)
    meeting_preparation: list[MeetingPrep] = Field(default_factory=list)
    follow_ups: list[BriefingItem] = Field(default_factory=list)
    risk_alerts: list[BriefingItem] = Field(default_factory=list)
    blocked_projects: list[BriefingItem] = Field(default_factory=list)
    personal_reminders: list[BriefingItem] = Field(default_factory=list)
    energy_optimization: EnergyPlan
    decision_queue: list[BriefingItem] = Field(default_factory=list)
    dashboard: DashboardSummary

    explanation: str = Field(min_length=1)
    notes: list[str] = Field(default_factory=list)


# --- Agent Factory contracts (mirror of packages/shared/src/contracts/agent-factory.ts) ---

# Mirror of AGENT_KEY: /^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*)+$/
AGENT_KEY_PATTERN = r"^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$"


class ToolSpec(BaseModel):
    """Mirror of ToolSpecSchema (agent-factory.ts). A declared tool the agent may use."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    description: str = ""


class MemoryScope(BaseModel):
    """Mirror of MemoryScopeSchema (agent-factory.ts). Least-privilege memory slice."""

    model_config = ConfigDict(extra="forbid")

    kinds: list[MemoryKind] = Field(default_factory=list)
    can_read: bool = True
    can_write: bool = False
    max_items: int = Field(default=50, gt=0)


class AgentPermissions(BaseModel):
    """Mirror of AgentPermissionsSchema (agent-factory.ts). The agent's permission envelope."""

    model_config = ConfigDict(extra="forbid")

    network: bool = False
    irreversible_actions: bool = False
    requires_approval_for: list[str] = Field(default_factory=list)


class SuccessMetric(BaseModel):
    """Mirror of SuccessMetricSchema (agent-factory.ts). A measurable success criterion."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    description: str = ""
    target: str = Field(min_length=1)


class DashboardCard(BaseModel):
    """Mirror of DashboardCardSchema (agent-factory.ts). The agent's operator dashboard card."""

    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1)
    subtitle: str = ""
    metric_keys: list[str] = Field(default_factory=list)
    status: Literal["proposed", "active", "paused"] = "proposed"


class TaskQueueSpec(BaseModel):
    """Mirror of TaskQueueSpecSchema (agent-factory.ts). Config for the agent's task queue."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    max_concurrency: int = Field(default=1, gt=0)
    retry_limit: int = Field(default=2, ge=0)


class GeneratedFile(BaseModel):
    """Mirror of GeneratedFileSchema (agent-factory.ts). A file the factory will write."""

    model_config = ConfigDict(extra="forbid")

    path: str = Field(min_length=1)
    content: str


class AgentRecommendation(BaseModel):
    """Mirror of AgentRecommendationSchema (agent-factory.ts). Pre-approval recommendation."""

    model_config = ConfigDict(extra="forbid")

    proposed_key: str = Field(min_length=1)
    primary_category: DecisionCategory
    rationale: str = Field(min_length=1)
    frequency: int = Field(gt=0)
    evidence_refs: list[str] = Field(default_factory=list)
    suggested_capabilities: list[str] = Field(default_factory=list)
    suggested_tools: list[ToolSpec] = Field(default_factory=list)
    confidence: float = Field(ge=0, le=1)


class AgentBlueprint(BaseModel):
    """Mirror of AgentBlueprintSchema (agent-factory.ts). The approved, complete spec."""

    model_config = ConfigDict(extra="forbid")

    key: str = Field(pattern=AGENT_KEY_PATTERN)
    runtime: Literal["python", "typescript"]
    version: str = Field(pattern=SEMVER_PATTERN)
    description: str = Field(min_length=1)
    capabilities: list[str] = Field(min_length=1)
    tools: list[ToolSpec] = Field(default_factory=list)
    memory_scope: MemoryScope
    permissions: AgentPermissions
    instructions: str = Field(min_length=1)
    success_metrics: list[SuccessMetric] = Field(default_factory=list)
    dashboard_card: DashboardCard
    task_queue: TaskQueueSpec
    approved: bool = False


class GeneratedAgent(BaseModel):
    """Mirror of GeneratedAgentSchema (agent-factory.ts). The materialized agent."""

    model_config = ConfigDict(extra="forbid")

    registration: AgentRegistration
    files: list[GeneratedFile] = Field(min_length=1)
    dashboard_card: DashboardCard
    task_queue: TaskQueueSpec
    success_metrics: list[SuccessMetric] = Field(default_factory=list)
    memory_scope: MemoryScope
    permissions: AgentPermissions
    doc_path: str = Field(min_length=1)
    test_path: str = Field(min_length=1)
    summary: str = Field(min_length=1)
    created_at: datetime


# --- Business Template contracts (mirror of packages/shared/src/contracts/business.ts) ---

# Mirror of SLUG: /^[a-z][a-z0-9-]*$/
SLUG_PATTERN = r"^[a-z][a-z0-9-]*$"

# Mirror of DepartmentKindSchema. The twelve departments every business gets.
DepartmentKind = Literal[
    "ceo",
    "operations",
    "sales",
    "marketing",
    "finance",
    "legal",
    "customer_success",
    "projects",
    "product",
    "analytics",
    "deployment",
    "automation",
    "pr",
]


class DepartmentSpec(BaseModel):
    """Mirror of DepartmentSpecSchema (business.ts). Framework def for one department."""

    model_config = ConfigDict(extra="forbid")

    kind: DepartmentKind
    name: str = Field(min_length=1)
    mission: str = Field(min_length=1)
    responsibilities: list[str] = Field(min_length=1)
    capabilities: list[str] = Field(min_length=1)
    default_agents: list[str] = Field(default_factory=list)
    memory_scope: MemoryScope
    kpis: list[SuccessMetric] = Field(default_factory=list)
    dashboard_card: DashboardCard


class BusinessTemplate(BaseModel):
    """Mirror of BusinessTemplateSchema (business.ts). The canonical business framework."""

    model_config = ConfigDict(extra="forbid")

    version: str = Field(pattern=SEMVER_PATTERN)
    departments: list[DepartmentSpec] = Field(min_length=1)


class BusinessDepartment(DepartmentSpec):
    """Mirror of BusinessDepartmentSchema (business.ts). A department inside a business."""

    model_config = ConfigDict(extra="forbid")

    business_id: UUID
    status: Literal["active", "paused"] = "active"


class Business(BaseModel):
    """Mirror of BusinessSchema (business.ts). A business instance — isolated data."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    name: str = Field(min_length=1)
    slug: str = Field(pattern=SLUG_PATTERN)
    data_namespace: str = Field(min_length=1)
    template_version: str = Field(pattern=SEMVER_PATTERN)
    status: Literal["active", "paused", "archived"] = "active"
    departments: list[BusinessDepartment] = Field(min_length=1)
    created_at: datetime


class CreateBusinessInput(BaseModel):
    """Mirror of CreateBusinessInputSchema (business.ts). Input to create a business."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    slug: str | None = Field(default=None, pattern=SLUG_PATTERN)
    template_version: str | None = Field(default=None, pattern=SEMVER_PATTERN)


# --- Personal OS contracts (mirror of packages/shared/src/contracts/personal-os.ts) ---

# Mirror of PersonalModuleKindSchema. The twelve life modules.
PersonalModuleKind = Literal[
    "vehicles",
    "travel",
    "appointments",
    "shopping",
    "pets",
    "home",
    "insurance",
    "bills",
    "maintenance",
    "health",
    "goals",
    "relationships",
]


class PersonalEntitySpec(BaseModel):
    """Mirror of PersonalEntitySpecSchema (personal-os.ts). Catalog def of an entity type."""

    model_config = ConfigDict(extra="forbid")

    module: PersonalModuleKind
    entity_type: str = Field(min_length=1)
    name: str = Field(min_length=1)
    memory_kind: MemoryKind
    required_fields: list[str] = Field(min_length=1)
    optional_fields: list[str] = Field(default_factory=list)


class FieldRequest(BaseModel):
    """Mirror of FieldRequestSchema (personal-os.ts). A single field the system needs."""

    model_config = ConfigDict(extra="forbid")

    field: str = Field(min_length=1)
    prompt: str = Field(min_length=1)
    required: bool


class InfoRequest(BaseModel):
    """Mirror of InfoRequestSchema (personal-os.ts). The "ask once" payload."""

    model_config = ConfigDict(extra="forbid")

    module: PersonalModuleKind
    entity_type: str = Field(min_length=1)
    identity: str = Field(min_length=1)
    missing_fields: list[FieldRequest] = Field(min_length=1)
    reason: str = Field(min_length=1)
    ask_once: bool = True


# --- Idea Builder contracts (mirror of packages/shared/src/contracts/idea-builder.ts) ---

# Mirror of PricingModelSchema.
PricingModel = Literal[
    "subscription",
    "one_time",
    "usage",
    "marketplace",
    "freemium",
    "tiered",
]

# Mirror of CompetitorKindSchema.
CompetitorKind = Literal["direct", "indirect", "substitute"]

# Mirror of RiskSeveritySchema.
RiskSeverity = Literal["low", "medium", "high"]

# Mirror of IdeaVerdictSchema.
IdeaVerdict = Literal["pursue", "pursue_with_changes", "park", "pass"]

# Mirror of IdeaStatusSchema.
IdeaStatus = Literal["awaiting_approval", "approved", "rejected"]

# Mirror of HttpMethodSchema.
HttpMethod = Literal["GET", "POST", "PUT", "PATCH", "DELETE"]


class Competitor(BaseModel):
    """Mirror of CompetitorSchema (idea-builder.ts)."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    kind: CompetitorKind
    notes: str = ""


class PriceTier(BaseModel):
    """Mirror of PriceTierSchema (idea-builder.ts)."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    price: str = Field(min_length=1)
    includes: list[str] = Field(default_factory=list)


class DbTable(BaseModel):
    """Mirror of DbTableSchema (idea-builder.ts)."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    purpose: str = Field(min_length=1)
    key_fields: list[str] = Field(min_length=1)


class ApiEndpoint(BaseModel):
    """Mirror of ApiEndpointSchema (idea-builder.ts)."""

    model_config = ConfigDict(extra="forbid")

    method: HttpMethod
    path: str = Field(min_length=1)
    purpose: str = Field(min_length=1)


class AgentNeed(BaseModel):
    """Mirror of AgentNeedSchema (idea-builder.ts)."""

    model_config = ConfigDict(extra="forbid")

    proposed_key: str = Field(min_length=1)
    purpose: str = Field(min_length=1)
    capabilities: list[str] = Field(default_factory=list)


class LaunchPhase(BaseModel):
    """Mirror of LaunchPhaseSchema (idea-builder.ts)."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    goal: str = Field(min_length=1)
    actions: list[str] = Field(min_length=1)


class Risk(BaseModel):
    """Mirror of RiskSchema (idea-builder.ts)."""

    model_config = ConfigDict(extra="forbid")

    risk: str = Field(min_length=1)
    severity: RiskSeverity
    mitigation: str = Field(min_length=1)


class MarketResearch(BaseModel):
    """Mirror of MarketResearchSchema (idea-builder.ts)."""

    model_config = ConfigDict(extra="forbid")

    summary: str = Field(min_length=1)
    target_segments: list[str] = Field(min_length=1)
    demand_signals: list[str] = Field(default_factory=list)
    open_questions: list[str] = Field(default_factory=list)
    tam_hypothesis: str = Field(min_length=1)


class CompetitorAnalysis(BaseModel):
    """Mirror of CompetitorAnalysisSchema (idea-builder.ts)."""

    model_config = ConfigDict(extra="forbid")

    competitors: list[Competitor] = Field(min_length=1)
    positioning_gap: str = Field(min_length=1)


class PricingPlan(BaseModel):
    """Mirror of PricingPlanSchema (idea-builder.ts)."""

    model_config = ConfigDict(extra="forbid")

    model: PricingModel
    tiers: list[PriceTier] = Field(min_length=1)
    rationale: str = Field(min_length=1)


class Offer(BaseModel):
    """Mirror of OfferSchema (idea-builder.ts)."""

    model_config = ConfigDict(extra="forbid")

    headline: str = Field(min_length=1)
    what_you_get: list[str] = Field(min_length=1)
    guarantee: str = ""
    primary_cta: str = Field(min_length=1)


class Positioning(BaseModel):
    """Mirror of PositioningSchema (idea-builder.ts)."""

    model_config = ConfigDict(extra="forbid")

    one_liner: str = Field(min_length=1)
    for_whom: str = Field(min_length=1)
    unlike: str = Field(min_length=1)
    because: str = Field(min_length=1)
    category: str = Field(min_length=1)


class MvpPlan(BaseModel):
    """Mirror of MvpPlanSchema (idea-builder.ts)."""

    model_config = ConfigDict(extra="forbid")

    goal: str = Field(min_length=1)
    must_have: list[str] = Field(min_length=1)
    explicitly_not: list[str] = Field(default_factory=list)
    success_metric: SuccessMetric


class DataModel(BaseModel):
    """Mirror of DataModelSchema (idea-builder.ts)."""

    model_config = ConfigDict(extra="forbid")

    tables: list[DbTable] = Field(min_length=1)


class ApiPlan(BaseModel):
    """Mirror of ApiPlanSchema (idea-builder.ts)."""

    model_config = ConfigDict(extra="forbid")

    endpoints: list[ApiEndpoint] = Field(min_length=1)
    integrations: list[str] = Field(default_factory=list)


class RequiredAgents(BaseModel):
    """Mirror of RequiredAgentsSchema (idea-builder.ts)."""

    model_config = ConfigDict(extra="forbid")

    agents: list[AgentNeed] = Field(default_factory=list)


class MarketingPlan(BaseModel):
    """Mirror of MarketingPlanSchema (idea-builder.ts)."""

    model_config = ConfigDict(extra="forbid")

    channels: list[str] = Field(min_length=1)
    content_pillars: list[str] = Field(default_factory=list)
    hooks: list[str] = Field(default_factory=list)


class SeoPlan(BaseModel):
    """Mirror of SeoPlanSchema (idea-builder.ts)."""

    model_config = ConfigDict(extra="forbid")

    primary_keywords: list[str] = Field(min_length=1)
    content_ideas: list[str] = Field(default_factory=list)
    notes: str = ""


class LaunchPlan(BaseModel):
    """Mirror of LaunchPlanSchema (idea-builder.ts)."""

    model_config = ConfigDict(extra="forbid")

    phases: list[LaunchPhase] = Field(min_length=1)


class MonetizationPlan(BaseModel):
    """Mirror of MonetizationPlanSchema (idea-builder.ts)."""

    model_config = ConfigDict(extra="forbid")

    primary: str = Field(min_length=1)
    secondary: list[str] = Field(default_factory=list)
    expansion: list[str] = Field(default_factory=list)


class RiskAssessment(BaseModel):
    """Mirror of RiskAssessmentSchema (idea-builder.ts)."""

    model_config = ConfigDict(extra="forbid")

    risks: list[Risk] = Field(min_length=1)
    overall: RiskSeverity


class Recommendation(BaseModel):
    """Mirror of RecommendationSchema (idea-builder.ts)."""

    model_config = ConfigDict(extra="forbid")

    verdict: IdeaVerdict
    confidence: float = Field(ge=0, le=1)
    rationale: str = Field(min_length=1)
    next_step: str = Field(min_length=1)


class IdeaInput(BaseModel):
    """Mirror of IdeaInputSchema (idea-builder.ts). The "I have an idea" trigger payload."""

    model_config = ConfigDict(extra="forbid")

    text: str = Field(min_length=1)


class IdeaBlueprint(BaseModel):
    """Mirror of IdeaBlueprintSchema (idea-builder.ts). The full fifteen-section workup."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    idea_text: str = Field(min_length=1)
    title: str = Field(min_length=1)
    category: DecisionCategory
    priority_score: float = Field(ge=0, le=1)

    market_research: MarketResearch
    competitors: CompetitorAnalysis
    pricing: PricingPlan
    offer: Offer
    positioning: Positioning
    mvp: MvpPlan
    database: DataModel
    api_needs: ApiPlan
    required_agents: RequiredAgents
    marketing: MarketingPlan
    seo: SeoPlan
    launch: LaunchPlan
    monetization: MonetizationPlan
    risks: RiskAssessment
    recommendation: Recommendation

    approved: bool = False
    status: IdeaStatus = "awaiting_approval"
    explanation: str = Field(min_length=1)
    created_at: datetime


class KnownEntity(BaseModel):
    """Mirror of KnownEntitySchema (personal-os.ts). A reused / prepared entity from memory."""

    model_config = ConfigDict(extra="forbid")

    memory_id: UUID
    module: PersonalModuleKind
    entity_type: str = Field(min_length=1)
    identity: str = Field(min_length=1)
    fields: dict[str, Any] = Field(default_factory=dict)
    present_fields: list[str] = Field(default_factory=list)
    missing_fields: list[str] = Field(default_factory=list)
    last_updated: datetime | None = None
    source: str = Field(min_length=1)


# Mirror of ResolveStatusSchema.
ResolveStatus = Literal["reused", "partial", "missing"]


class ResolveResult(BaseModel):
    """Mirror of ResolveResultSchema (personal-os.ts). Result of resolving an entity."""

    model_config = ConfigDict(extra="forbid")

    status: ResolveStatus
    entity: KnownEntity | None = None
    request: InfoRequest | None = None
    explanation: str = Field(min_length=1)


class RememberPersonalInput(BaseModel):
    """Mirror of RememberPersonalInputSchema (personal-os.ts). Input to remember an entity."""

    model_config = ConfigDict(extra="forbid")

    module: PersonalModuleKind
    entity_type: str = Field(min_length=1)
    identity: str = Field(min_length=1)
    fields: dict[str, Any] = Field(default_factory=dict)
    keywords: list[str] = Field(default_factory=list)


class PreparePack(BaseModel):
    """Mirror of PreparePackSchema (personal-os.ts). Everything known, assembled (auto-prepare)."""

    model_config = ConfigDict(extra="forbid")

    module: PersonalModuleKind
    entity_type: str = Field(min_length=1)
    identity: str = Field(min_length=1)
    ready: bool
    entity: KnownEntity | None = None
    present_fields: list[str] = Field(default_factory=list)
    missing_fields: list[str] = Field(default_factory=list)
    prepared: list[str] = Field(default_factory=list)
    explanation: str = Field(min_length=1)


# --- Pattern Engine contracts (mirror of packages/shared/src/contracts/pattern-engine.ts) ---

# Mirror of BehaviorSignalSchema. The behavioral dimensions the engine observes.
BehaviorSignal = Literal[
    "work_session",
    "avoidance",
    "performance",
    "energy",
    "focus",
    "stress",
    "health",
    "follow_up",
    "sales",
    "launch",
    "meeting",
    "calendar",
    "decision",
    "productivity",
]

# Mirror of PatternDirectionSchema.
PatternDirection = Literal["positive", "negative", "neutral"]


class BehaviorObservation(BaseModel):
    """Mirror of BehaviorObservationSchema (pattern-engine.ts). A single observed data point."""

    model_config = ConfigDict(extra="forbid")

    at: datetime
    signal: BehaviorSignal
    measure: float | None = Field(default=None, ge=0, le=1)
    label: str = ""
    context: dict[str, Any] = Field(default_factory=dict)


class Pattern(BaseModel):
    """Mirror of PatternSchema (pattern-engine.ts). A detected regularity in behavior."""

    model_config = ConfigDict(extra="forbid")

    signal: BehaviorSignal
    summary: str = Field(min_length=1)
    direction: PatternDirection
    strength: float = Field(ge=0, le=1)
    evidence_count: int = Field(ge=0)
    detail: str = Field(min_length=1)


class Bottleneck(BaseModel):
    """Mirror of BottleneckSchema (pattern-engine.ts). A friction point worth addressing."""

    model_config = ConfigDict(extra="forbid")

    area: str = Field(min_length=1)
    severity: RiskSeverity
    description: str = Field(min_length=1)
    impact: str = Field(min_length=1)
    evidence_count: int = Field(ge=0)


class AutomationRec(BaseModel):
    """Mirror of AutomationRecSchema (pattern-engine.ts). An explained automation recommendation."""

    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1)
    what: str = Field(min_length=1)
    explanation: str = Field(min_length=1)
    addresses: str = ""


class PatternAgentRec(BaseModel):
    """Mirror of PatternAgentRecSchema (pattern-engine.ts). An explained new-agent recommendation."""

    model_config = ConfigDict(extra="forbid")

    proposed_key: str = Field(min_length=1)
    purpose: str = Field(min_length=1)
    capabilities: list[str] = Field(default_factory=list)
    explanation: str = Field(min_length=1)
    addresses: str = ""


class WorkflowRec(BaseModel):
    """Mirror of WorkflowRecSchema (pattern-engine.ts). An explained workflow recommendation."""

    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1)
    change: str = Field(min_length=1)
    explanation: str = Field(min_length=1)
    addresses: str = ""


class Strength(BaseModel):
    """Mirror of StrengthSchema (pattern-engine.ts). A strength the engine identifies."""

    model_config = ConfigDict(extra="forbid")

    area: str = Field(min_length=1)
    summary: str = Field(min_length=1)
    explanation: str = Field(min_length=1)
    evidence_count: int = Field(ge=0)


class RepeatingMistake(BaseModel):
    """Mirror of RepeatingMistakeSchema (pattern-engine.ts). A recurring negative outcome."""

    model_config = ConfigDict(extra="forbid")

    area: str = Field(min_length=1)
    summary: str = Field(min_length=1)
    explanation: str = Field(min_length=1)
    occurrences: int = Field(ge=0)
    severity: RiskSeverity


class SuccessfulHabit(BaseModel):
    """Mirror of SuccessfulHabitSchema (pattern-engine.ts). A consistent positive behavior."""

    model_config = ConfigDict(extra="forbid")

    habit: str = Field(min_length=1)
    summary: str = Field(min_length=1)
    explanation: str = Field(min_length=1)
    consistency: float = Field(ge=0, le=1)


class ScheduleRec(BaseModel):
    """Mirror of ScheduleRecSchema (pattern-engine.ts). An explained schedule recommendation."""

    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1)
    change: str = Field(min_length=1)
    explanation: str = Field(min_length=1)
    addresses: str = ""


class AnalysisWindow(BaseModel):
    """Mirror of AnalysisWindowSchema (pattern-engine.ts). The window the report covers."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    from_: datetime | None = Field(default=None, alias="from")
    to: datetime | None = None
    observation_count: int = Field(ge=0)


class PatternReport(BaseModel):
    """Mirror of PatternReportSchema (pattern-engine.ts). The engine's advisory-only output."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    generated_at: datetime
    window: AnalysisWindow
    patterns: list[Pattern] = Field(default_factory=list)
    bottlenecks: list[Bottleneck] = Field(default_factory=list)
    strengths: list[Strength] = Field(default_factory=list)
    repeating_mistakes: list[RepeatingMistake] = Field(default_factory=list)
    successful_habits: list[SuccessfulHabit] = Field(default_factory=list)
    recommended_automations: list[AutomationRec] = Field(default_factory=list)
    recommended_agents: list[PatternAgentRec] = Field(default_factory=list)
    workflow_improvements: list[WorkflowRec] = Field(default_factory=list)
    schedule_recommendations: list[ScheduleRec] = Field(default_factory=list)
    summary: str = Field(min_length=1)
    advisory_only: bool = True


# --- Agent Observability contracts (mirror of packages/shared/src/contracts/agent-observability.ts) ---

# Mirror of ActionApprovalStatusSchema. The approval state of a recorded action.
ActionApprovalStatus = Literal[
    "not_required",
    "auto_approved",
    "approved",
    "pending",
    "rejected",
]

# Mirror of ActionOutcomeSchema. How an action turned out.
ActionOutcome = Literal["success", "partial", "failure", "skipped", "blocked"]

# Mirror of ActionRiskLevelSchema.
ActionRiskLevel = Literal["low", "medium", "high"]


class AgentActionRecord(BaseModel):
    """Mirror of AgentActionRecordSchema (agent-observability.ts). One immutable action record."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    agent_name: str = Field(min_length=1)
    task: str = Field(min_length=1)
    input: str = ""
    tools_used: list[str] = Field(default_factory=list)
    memory_used: list[str] = Field(default_factory=list)
    decision: str = ""
    rationale: str = ""
    approval_status: ActionApprovalStatus = "not_required"
    cost_usd: float = Field(default=0, ge=0)
    runtime_ms: int = Field(default=0, ge=0)
    outcome: ActionOutcome
    errors: list[str] = Field(default_factory=list)
    downstream_effects: list[str] = Field(default_factory=list)
    value_usd: float = 0
    risk_level: ActionRiskLevel = "low"
    at: datetime


class LogAgentActionInput(BaseModel):
    """Mirror of LogAgentActionInputSchema (agent-observability.ts). Input to log an action."""

    model_config = ConfigDict(extra="forbid")

    agent_name: str = Field(min_length=1)
    task: str = Field(min_length=1)
    input: str = ""
    tools_used: list[str] = Field(default_factory=list)
    memory_used: list[str] = Field(default_factory=list)
    decision: str = ""
    rationale: str = ""
    approval_status: ActionApprovalStatus = "not_required"
    cost_usd: float = Field(default=0, ge=0)
    runtime_ms: int = Field(default=0, ge=0)
    outcome: ActionOutcome
    errors: list[str] = Field(default_factory=list)
    downstream_effects: list[str] = Field(default_factory=list)
    value_usd: float = 0
    risk_level: ActionRiskLevel = "low"


class AgentPerformance(BaseModel):
    """Mirror of AgentPerformanceSchema (agent-observability.ts). Per-agent performance roll-up."""

    model_config = ConfigDict(extra="forbid")

    agent_name: str = Field(min_length=1)
    actions: int = Field(ge=0)
    successes: int = Field(ge=0)
    failures: int = Field(ge=0)
    success_rate: float = Field(ge=0, le=1)
    avg_runtime_ms: float = Field(ge=0)
    total_cost_usd: float = Field(ge=0)
    total_value_usd: float
    roi: float | None = None


class RepeatedFailure(BaseModel):
    """Mirror of RepeatedFailureSchema (agent-observability.ts). A recurring failure signature."""

    model_config = ConfigDict(extra="forbid")

    agent_name: str = Field(min_length=1)
    task: str = Field(min_length=1)
    count: int = Field(gt=0)
    last_error: str = ""


class ApprovalBottleneck(BaseModel):
    """Mirror of ApprovalBottleneckSchema (agent-observability.ts). An agent awaiting approvals."""

    model_config = ConfigDict(extra="forbid")

    agent_name: str = Field(min_length=1)
    pending_actions: int = Field(ge=0)
    rejected_actions: int = Field(ge=0)


class CostByAgent(BaseModel):
    """Mirror of the inline cost_by_agent object (agent-observability.ts)."""

    model_config = ConfigDict(extra="forbid")

    agent_name: str
    cost_usd: float = Field(ge=0)


class RoiByAgent(BaseModel):
    """Mirror of the inline roi_by_agent object (agent-observability.ts)."""

    model_config = ConfigDict(extra="forbid")

    agent_name: str
    roi: float | None = None


class ObservabilityDashboard(BaseModel):
    """Mirror of ObservabilityDashboardSchema (agent-observability.ts). The aggregate dashboard."""

    model_config = ConfigDict(extra="forbid")

    generated_at: datetime
    performance: list[AgentPerformance] = Field(default_factory=list)
    failed_actions: list[AgentActionRecord] = Field(default_factory=list)
    cost_by_agent: list[CostByAgent] = Field(default_factory=list)
    roi_by_agent: list[RoiByAgent] = Field(default_factory=list)
    risky_actions: list[AgentActionRecord] = Field(default_factory=list)
    approval_bottlenecks: list[ApprovalBottleneck] = Field(default_factory=list)
    repeated_failures: list[RepeatedFailure] = Field(default_factory=list)


class ActionExplanation(BaseModel):
    """Mirror of ActionExplanationSchema (agent-observability.ts). The four provenance answers."""

    model_config = ConfigDict(extra="forbid")

    action_id: UUID
    what_it_did: str = Field(min_length=1)
    why_it_did_that: str = Field(min_length=1)
    what_data_it_used: str = Field(min_length=1)
    what_changed_afterward: str = Field(min_length=1)


# --- Simulation Engine contracts (mirror of packages/shared/src/contracts/simulation.ts) ---

# Mirror of SimulationKindSchema. The kind of thing being simulated.
SimulationKind = Literal[
    "campaign_outcome",
    "revenue_path",
    "hiring_vs_automation",
    "pricing_change",
    "priority_shift",
    "cash_flow",
    "implementation_risk",
    "agent_failure",
]

# Mirror of CaseLabelSchema. Which scenario a case represents.
CaseLabel = Literal["best", "likely", "worst"]

# Mirror of SimLevelSchema.
SimLevel = Literal["low", "medium", "high"]


class ScenarioCase(BaseModel):
    """Mirror of ScenarioCaseSchema (simulation.ts). One projected scenario."""

    model_config = ConfigDict(extra="forbid")

    label: CaseLabel
    assumptions: list[str] = Field(default_factory=list)
    projection: dict[str, float] = Field(default_factory=dict)
    narrative: str = Field(min_length=1)
    probability: float = Field(ge=0, le=1)


class SimRisk(BaseModel):
    """Mirror of SimRiskSchema (simulation.ts). A risk surfaced by the simulation."""

    model_config = ConfigDict(extra="forbid")

    description: str = Field(min_length=1)
    likelihood: SimLevel
    impact: SimLevel
    mitigation: str = Field(min_length=1)


class SimulationInput(BaseModel):
    """Mirror of SimulationInputSchema (simulation.ts). Input to run a simulation."""

    model_config = ConfigDict(extra="forbid")

    kind: SimulationKind
    name: str = Field(min_length=1)
    horizon_days: int = Field(default=90, gt=0)
    parameters: dict[str, Any] = Field(default_factory=dict)


class SimulationResult(BaseModel):
    """Mirror of SimulationResultSchema (simulation.ts). The simulation output."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    kind: SimulationKind
    name: str = Field(min_length=1)
    horizon_days: int = Field(gt=0)
    best_case: ScenarioCase
    likely_case: ScenarioCase
    worst_case: ScenarioCase
    expected_value: float | None = None
    risks: list[SimRisk] = Field(default_factory=list)
    recommendation: str = Field(min_length=1)
    decision_needed: str = Field(min_length=1)
    created_at: datetime


# --- Tenancy / Founder Intelligence System contracts (mirror of packages/shared/src/contracts/tenancy.ts) ---

# Mirror of PlanTierSchema.
PlanTier = Literal["free", "solo", "team", "scale", "enterprise"]

# Mirror of TenantStatusSchema.
TenantStatus = Literal["active", "suspended", "cancelled"]

# Mirror of BillingStatusSchema.
BillingStatus = Literal["active", "trialing", "past_due", "cancelled"]

# Mirror of RoleSchema.
Role = Literal["owner", "admin", "member", "viewer"]

# Mirror of PermissionSchema. One scope per separated concern, plus the approval gate.
Permission = Literal[
    "memory.read",
    "memory.write",
    "businesses.manage",
    "agents.manage",
    "billing.manage",
    "permissions.manage",
    "dashboards.view",
    "automation.manage",
    "knowledge.read",
    "knowledge.write",
    "approve.irreversible",
]

# Mirror of KnowledgeVisibilitySchema.
KnowledgeVisibility = Literal["tenant", "business"]


class FounderTenant(BaseModel):
    """Mirror of FounderTenantSchema (tenancy.ts). An FIS account; its id IS the tenant_id."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    name: str = Field(min_length=1)
    slug: str = Field(pattern=SLUG_PATTERN)
    plan: PlanTier = "solo"
    status: TenantStatus = "active"
    created_at: datetime


class BillingAccount(BaseModel):
    """Mirror of BillingAccountSchema (tenancy.ts). Separated, tenant-scoped billing."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    plan: PlanTier
    status: BillingStatus = "trialing"
    seats: int = Field(default=1, gt=0)
    current_period_end: datetime | None = None
    usage_ai_calls: int = Field(default=0, ge=0)
    usage_cost_usd: float = Field(default=0, ge=0)
    created_at: datetime


class Grant(BaseModel):
    """Mirror of GrantSchema (tenancy.ts). A role grant for a principal within a tenant."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    principal: str = Field(min_length=1)
    role: Role
    created_at: datetime


class KnowledgeDoc(BaseModel):
    """Mirror of KnowledgeDocSchema (tenancy.ts). A tenant knowledge-base document."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    title: str = Field(min_length=1)
    body: str = ""
    tags: list[str] = Field(default_factory=list)
    visibility: KnowledgeVisibility = "tenant"
    business_id: UUID | None = None
    created_at: datetime


# --- Executive Inbox contracts (mirror of packages/shared/src/contracts/executive-inbox.ts) ---

# Mirror of InboxItemTypeSchema. What kind of thing was dropped in.
InboxItemType = Literal[
    "voice_note",
    "screenshot",
    "pdf",
    "video",
    "photo",
    "email",
    "calendar_invite",
    "github_link",
    "url",
    "text",
    "todo_list",
    "meeting_notes",
    "idea",
    "receipt",
    "contract",
    "invoice",
    "business_card",
    "unknown",
]

# Mirror of InboxCategorySchema. The category the item is filed under.
InboxCategory = Literal[
    "business",
    "personal",
    "finance",
    "health",
    "learning",
    "relationship",
    "legal",
    "asset",
    "technology",
    "opportunity",
    "risk",
    "task",
    "project",
    "idea",
]


class LinkedEntity(BaseModel):
    """Mirror of LinkedEntitySchema (executive-inbox.ts). A memory this item was linked to."""

    model_config = ConfigDict(extra="forbid")

    memory_id: UUID
    title: str = Field(min_length=1)
    kind: MemoryKind
    relevance: float = Field(ge=0, le=1)


class SuggestedTask(BaseModel):
    """Mirror of SuggestedTaskSchema (executive-inbox.ts). A task the inbox suggests creating."""

    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1)
    due: datetime | None = None
    priority_level: PriorityLevel


class InboxDrop(BaseModel):
    """Mirror of InboxDropSchema (executive-inbox.ts). What the operator drops in."""

    model_config = ConfigDict(extra="forbid")

    source: str = Field(min_length=1)
    kind: InboxItemType | None = None
    content: str = Field(min_length=1)
    attachments: list[str] = Field(default_factory=list)
    context: dict[str, Any] = Field(default_factory=dict)


class ProcessedInboxItem(BaseModel):
    """Mirror of ProcessedInboxItemSchema (executive-inbox.ts). The fully processed inbox item."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    created_at: datetime
    source: str = Field(min_length=1)

    item_type: InboxItemType
    category: InboxCategory
    confidence: float = Field(ge=0, le=1)

    suggested_business: str | None = None
    suggested_owner: str = Field(min_length=1)
    urgency: float = Field(ge=0, le=1)
    urgency_level: PriorityLevel
    next_action: str = Field(min_length=1)

    linked_entities: list[LinkedEntity] = Field(default_factory=list)
    suggested_tasks: list[SuggestedTask] = Field(default_factory=list)
    missing_info: list[FieldRequest] = Field(default_factory=list)
    recommended_agents: list[str] = Field(default_factory=list)
    saved_memory_id: UUID | None = None

    requires_approval: bool = False
    approval_reason: str = ""
    dashboard_updated: bool = True

    explanation: str = Field(min_length=1)
    summary: str = Field(min_length=1)


# --- Model Router contracts (mirror of packages/shared/src/contracts/model-router.ts) ---

# Mirror of TaskTypeSchema. The kinds of work the router selects a model for.
TaskType = Literal[
    "coding",
    "reasoning",
    "writing",
    "debugging",
    "planning",
    "research",
    "architecture",
    "summarization",
]

# Mirror of CostTierSchema.
CostTier = Literal["low", "medium", "high"]


class ModelDescriptor(BaseModel):
    """Mirror of ModelDescriptorSchema (model-router.ts). A model the router can choose."""

    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    provider: str = Field(min_length=1)
    local: bool = False
    available: bool = True
    cost_tier: CostTier = "medium"
    context_window: int | None = Field(default=None, gt=0)
    strengths: dict[TaskType, float] = Field(default_factory=dict)
    notes: str = ""


class RouteConstraints(BaseModel):
    """Mirror of RouteConstraintsSchema (model-router.ts). Optional routing constraints."""

    model_config = ConfigDict(extra="forbid")

    prefer_local: bool = False
    max_cost_tier: CostTier | None = None
    require_available: bool = True


class ModelScore(BaseModel):
    """Mirror of ModelScoreSchema (model-router.ts)."""

    model_config = ConfigDict(extra="forbid")

    model_id: str = Field(min_length=1)
    score: float = Field(ge=0, le=1)


class RoutingDecision(BaseModel):
    """Mirror of RoutingDecisionSchema (model-router.ts). The router's answer."""

    model_config = ConfigDict(extra="forbid")

    task: TaskType
    chosen_model_id: str = Field(min_length=1)
    ranked: list[ModelScore] = Field(min_length=1)
    fallbacks: list[str] = Field(default_factory=list)
    rationale: str = Field(min_length=1)


# --- Connector Registry contracts (mirror of packages/shared/src/contracts/connector-registry.ts) ---

# Mirror of AuthMethodSchema.
AuthMethod = Literal["oauth2", "api_key", "token", "none", "mcp"]

# Mirror of ConnectorHealthSchema.
ConnectorHealth = Literal["healthy", "degraded", "down", "unknown"]


class ConnectorDescriptor(BaseModel):
    """Mirror of ConnectorDescriptorSchema (connector-registry.ts). A registered connector."""

    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1)
    tenant_id: UUID
    name: str = Field(min_length=1)
    kind: str = Field(min_length=1)
    category: str = ""
    authentication: AuthMethod
    permissions: list[str] = Field(default_factory=list)
    risk_level: RiskSeverity
    allowed_actions: list[str] = Field(default_factory=list)
    businesses_using: list[str] = Field(default_factory=list)
    health_status: ConnectorHealth = "unknown"
    last_sync: datetime | None = None
    enabled: bool = True
    created_at: datetime


# --- GitHub Intelligence contracts (mirror of packages/shared/src/contracts/github-intelligence.ts) ---
#
# Repositories are NEVER trusted automatically and NOTHING is ever executed. Reuses EffortBucket,
# AgentNeed, and LaunchPhase (already mirrored above). The `executed` field is the literal `False`.

# Mirror of RepoVerdictSchema.
RepoVerdict = Literal["safe", "needs_review", "do_not_use"]

# Mirror of DimensionKindSchema. The ten evaluation dimensions.
DimensionKind = Literal[
    "project_purpose",
    "maturity",
    "architecture",
    "documentation",
    "dependencies",
    "security",
    "maintenance",
    "license",
    "community",
    "implementation_difficulty",
]

# Mirror of FindingSeveritySchema.
FindingSeverity = Literal["low", "medium", "high", "critical"]

# Mirror of SecurityCategorySchema.
SecurityCategory = Literal[
    "malicious_script",
    "credential_harvesting",
    "suspicious_dependency",
    "obfuscated_code",
    "network_abuse",
    "crypto_mining",
    "package_vulnerability",
    "unsafe_permissions",
]

# Mirror of RoiLevelSchema.
RoiLevel = Literal["low", "medium", "high"]


class DimensionEval(BaseModel):
    """Mirror of DimensionEvalSchema (github-intelligence.ts)."""

    model_config = ConfigDict(extra="forbid")

    dimension: DimensionKind
    score: float = Field(ge=0, le=1)
    summary: str = Field(min_length=1)


class SecurityFinding(BaseModel):
    """Mirror of SecurityFindingSchema (github-intelligence.ts)."""

    model_config = ConfigDict(extra="forbid")

    category: SecurityCategory
    severity: FindingSeverity
    evidence: str = Field(min_length=1)
    description: str = Field(min_length=1)


class FileEntry(BaseModel):
    """Mirror of FileEntrySchema (github-intelligence.ts). A file provided for static analysis."""

    model_config = ConfigDict(extra="forbid")

    path: str = Field(min_length=1)
    content: str = ""


class RepoScanInput(BaseModel):
    """Mirror of RepoScanInputSchema (github-intelligence.ts). Caller-provided scan input."""

    model_config = ConfigDict(extra="forbid")

    url: str = Field(min_length=1)
    name: str = Field(min_length=1)
    owner: str = ""
    description: str = ""
    readme: str = ""
    license: str | None = None
    languages: list[str] = Field(default_factory=list)
    dependencies: list[str] = Field(default_factory=list)
    files: list[FileEntry] = Field(default_factory=list)
    stars: int = Field(default=0, ge=0)
    forks: int = Field(default=0, ge=0)
    open_issues: int = Field(default=0, ge=0)
    contributors: int = Field(default=0, ge=0)
    last_commit: datetime | None = None


class BusinessCase(BaseModel):
    """Mirror of BusinessCaseSchema (github-intelligence.ts). Generated only when verdict is SAFE."""

    model_config = ConfigDict(extra="forbid")

    business_applications: list[str] = Field(min_length=1)
    which_businesses: list[str] = Field(default_factory=list)
    implementation_roadmap: list[LaunchPhase] = Field(min_length=1)
    required_agents: list[AgentNeed] = Field(default_factory=list)
    estimated_effort: EffortBucket
    estimated_effort_hours: int = Field(ge=0)
    estimated_roi: str = Field(min_length=1)
    roi_level: RoiLevel


class RepoAssessment(BaseModel):
    """Mirror of RepoAssessmentSchema (github-intelligence.ts). The full assessment."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    url: str = Field(min_length=1)
    name: str = Field(min_length=1)
    scanned_at: datetime
    verdict: RepoVerdict
    evaluation: list[DimensionEval] = Field(min_length=1)
    overall_quality: float = Field(ge=0, le=1)
    security_findings: list[SecurityFinding] = Field(default_factory=list)
    security_summary: str = Field(min_length=1)
    business_case: BusinessCase | None = None
    # ALWAYS false — the system never executes anything.
    executed: Literal[False]
    explanation: str = Field(min_length=1)


class AssetLibraryEntry(BaseModel):
    """Mirror of AssetLibraryEntrySchema (github-intelligence.ts). An approved, stored repo."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    repo_url: str = Field(min_length=1)
    name: str = Field(min_length=1)
    verdict: RepoVerdict
    assessment_id: UUID
    approved_by: str = Field(min_length=1)
    approved_at: datetime
    tags: list[str] = Field(default_factory=list)


# --- Global Asset Library contracts (mirror of packages/shared/src/contracts/assets.ts) ---
#
# Tenant-scoped, permission-aware catalog of every business asset. NOTE: this is distinct from
# AssetLibraryEntry (GitHub Intelligence) above — these are the Global Asset Library models.

# Mirror of AssetTypeSchema. The kinds of asset a business can have.
AssetType = Literal[
    "logo",
    "brand_guide",
    "domain",
    "social_media",
    "pitch_deck",
    "investor_deck",
    "sales_deck",
    "contract",
    "nda",
    "sop",
    "email_template",
    "landing_page",
    "automation",
    "github_repo",
    "api_key",
    "product_spec",
    "video",
    "photo",
    "training",
    "pricing",
    "vendor_list",
    "customer_list",
    "marketing_campaign",
]

# Mirror of AssetStatusSchema.
AssetStatus = Literal["draft", "active", "archived", "deprecated"]

# Mirror of ApprovalStateSchema.
ApprovalState = Literal["not_required", "pending", "approved", "rejected"]

# Mirror of AssetVisibilitySchema.
AssetVisibility = Literal["tenant", "business", "private"]

# Mirror of AssetRelationSchema.
AssetRelation = Literal[
    "derived_from",
    "version_of",
    "used_by",
    "references",
    "supersedes",
    "related_to",
]


class AssetRelationship(BaseModel):
    """Mirror of AssetRelationshipSchema (assets.ts)."""

    model_config = ConfigDict(extra="forbid")

    relation: AssetRelation
    target_asset_id: UUID


class AssetUsage(BaseModel):
    """Mirror of AssetUsageSchema (assets.ts). One entry in an asset's usage history."""

    model_config = ConfigDict(extra="forbid")

    at: datetime
    actor: str = Field(min_length=1)
    action: str = Field(min_length=1)


class Asset(BaseModel):
    """Mirror of AssetSchema (assets.ts). A catalogued asset."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    type: AssetType
    name: str = Field(min_length=1)
    description: str = ""
    owner: str = Field(min_length=1)
    business_id: str | None = None
    version: str = "1.0.0"
    status: AssetStatus = "active"
    approval: ApprovalState = "not_required"
    approved_by: str | None = None
    location: str = Field(min_length=1)
    sensitive: bool = False
    visibility: AssetVisibility = "business"
    tags: list[str] = Field(default_factory=list)
    relationships: list[AssetRelationship] = Field(default_factory=list)
    usage_history: list[AssetUsage] = Field(default_factory=list)
    keywords: list[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime | None = None


class CreateAssetInput(BaseModel):
    """Mirror of CreateAssetInputSchema (assets.ts). Input to create an asset."""

    model_config = ConfigDict(extra="forbid")

    type: AssetType
    name: str = Field(min_length=1)
    description: str = ""
    owner: str = Field(min_length=1)
    business_id: str | None = None
    version: str = "1.0.0"
    status: AssetStatus = "active"
    approval: ApprovalState = "not_required"
    location: str = Field(min_length=1)
    sensitive: bool = False
    visibility: AssetVisibility = "business"
    tags: list[str] = Field(default_factory=list)
    keywords: list[str] = Field(default_factory=list)


class AssetQuery(BaseModel):
    """Mirror of AssetQuerySchema (assets.ts). A global, permission-aware search query."""

    model_config = ConfigDict(extra="forbid")

    principal: str = Field(min_length=1)
    text: str | None = None
    types: list[AssetType] = Field(default_factory=list)
    business_id: str | None = None
    tags: list[str] = Field(default_factory=list)
    status: AssetStatus | None = None
    owner: str | None = None
    limit: int = Field(default=20, gt=0, le=200)


class AssetSearchHit(BaseModel):
    """Mirror of AssetSearchHitSchema (assets.ts). A single permitted search hit."""

    model_config = ConfigDict(extra="forbid")

    asset_id: UUID
    name: str = Field(min_length=1)
    type: AssetType
    business_id: str | None = None
    score: float = Field(ge=0, le=1)
    snippet: str = ""


# --- Enterprise Security contracts (mirror of packages/shared/src/contracts/security.ts) ---
#
# Least privilege; new agents default to read-only. Six action classes can NEVER happen without
# explicit approval. Every action creates an audit trail. The secret vault stores REFERENCES, never
# values (`value_stored` is the literal `False`). Reuses Role and Permission (mirrored above).

# Mirror of SensitiveActionClassSchema. The six classes that always require explicit approval.
SensitiveActionClass = Literal[
    "spend_money",
    "delete_data",
    "modify_production",
    "contact_external",
    "sign_contract",
    "install_package",
]

# Mirror of ActionEffectSchema.
ActionEffect = Literal["read", "write"]

# Mirror of EnvironmentSchema.
Environment = Literal["dev", "staging", "production"]

# Mirror of SecurityDecisionKindSchema.
SecurityDecisionKind = Literal["allow", "deny", "requires_approval"]

# Mirror of AuditOutcomeSchema.
AuditOutcome = Literal["evaluated", "executed", "blocked", "queued"]

# Mirror of ApprovalStatusSchema.
ApprovalStatus = Literal["pending", "approved", "rejected", "expired"]

# Mirror of SecretKindSchema.
SecretKind = Literal["api_key", "password", "token", "oauth", "certificate", "ssh_key"]

# Mirror of SecretStatusSchema.
SecretStatus = Literal["active", "rotating", "revoked"]


class ActionRequest(BaseModel):
    """Mirror of ActionRequestSchema (security.ts). A proposed action sent to the Security Gate."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    actor: str = Field(min_length=1)
    is_agent: bool = False
    action: str = Field(min_length=1)
    effect: ActionEffect = "read"
    action_class: SensitiveActionClass | None = None
    resource: str = ""
    target_env: Environment = "dev"
    amount_usd: float | None = Field(default=None, ge=0)
    metadata: dict[str, Any] = Field(default_factory=dict)


class SecurityDecision(BaseModel):
    """Mirror of SecurityDecisionSchema (security.ts). The Security Gate's verdict."""

    model_config = ConfigDict(extra="forbid")

    request_id: UUID
    tenant_id: UUID
    decision: SecurityDecisionKind
    reasons: list[str] = Field(min_length=1)
    required_approval: bool
    approval_id: UUID | None = None
    audit_id: UUID
    decided_at: datetime


class AuditEntry(BaseModel):
    """Mirror of AuditEntrySchema (security.ts). One immutable audit-trail entry."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    at: datetime
    actor: str = Field(min_length=1)
    is_agent: bool = False
    action: str = Field(min_length=1)
    action_class: SensitiveActionClass | None = None
    resource: str = ""
    target_env: Environment = "dev"
    decision: SecurityDecisionKind
    outcome: AuditOutcome = "evaluated"
    metadata: dict[str, Any] = Field(default_factory=dict)


class ApprovalRequest(BaseModel):
    """Mirror of ApprovalRequestSchema (security.ts). Approval workflow / queue entry."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    requested_by: str = Field(min_length=1)
    action: str = Field(min_length=1)
    action_class: SensitiveActionClass | None = None
    resource: str = ""
    reason: str = ""
    status: ApprovalStatus = "pending"
    required_role: Role = "owner"
    created_at: datetime
    resolved_at: datetime | None = None
    resolved_by: str | None = None
    audit_id: UUID


class PermissionGroup(BaseModel):
    """Mirror of PermissionGroupSchema (security.ts). A named bundle of permissions."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    name: str = Field(min_length=1)
    permissions: list[Permission] = Field(default_factory=list)
    members: list[str] = Field(default_factory=list)
    created_at: datetime


class SecretRef(BaseModel):
    """Mirror of SecretRefSchema (security.ts). A secret vault REFERENCE — value is never stored."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    name: str = Field(min_length=1)
    kind: SecretKind
    location: str = Field(min_length=1)
    owner: str = Field(min_length=1)
    status: SecretStatus = "active"
    rotation_period_days: int = Field(default=90, gt=0)
    last_rotated_at: datetime | None = None
    next_rotation_at: datetime | None = None
    # ALWAYS false — the vault never stores the secret value.
    value_stored: Literal[False]
    created_at: datetime


class Session(BaseModel):
    """Mirror of SessionSchema (security.ts). A principal session."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    principal: str = Field(min_length=1)
    created_at: datetime
    expires_at: datetime
    last_seen_at: datetime | None = None
    revoked: bool = False
    ip: str | None = None
    scopes: list[str] = Field(default_factory=list)


# --- Goal Engine (goal.ts) ---
# Mirror of GoalTypeSchema — the nine kinds of goal Alfy² pursues.
GoalType = Literal[
    "personal",
    "financial",
    "business",
    "health",
    "learning",
    "relationships",
    "launches",
    "sales",
    "cash_flow",
]

# Mirror of GoalStatusSchema — goal lifecycle.
GoalStatus = Literal[
    "draft",
    "active",
    "paused",
    "cancelled",
    "completed",
    "review_required",
]

# Mirror of PathKindSchema — the three candidate paths the engine always produces.
PathKind = Literal["fastest", "lowest_resistance", "highest_roi"]

# Mirror of LevelSchema — a low/medium/high rating.
Level = Literal["low", "medium", "high"]

# Mirror of ResourceKindSchema.
ResourceKind = Literal[
    "time",
    "money",
    "people",
    "tool",
    "knowledge",
    "relationship",
    "other",
]


class Constraint(BaseModel):
    """Mirror of ConstraintSchema (goal.ts)."""

    model_config = ConfigDict(extra="forbid")

    description: str = Field(min_length=1)
    severity: Level = "medium"


class Resource(BaseModel):
    """Mirror of ResourceSchema (goal.ts)."""

    model_config = ConfigDict(extra="forbid")

    description: str = Field(min_length=1)
    kind: ResourceKind = "other"


class Opportunity(BaseModel):
    """Mirror of OpportunitySchema (goal.ts)."""

    model_config = ConfigDict(extra="forbid")

    description: str = Field(min_length=1)
    leverage: Level = "medium"


class GoalPath(BaseModel):
    """Mirror of GoalPathSchema (goal.ts). A candidate path from current to desired state."""

    model_config = ConfigDict(extra="forbid")

    kind: PathKind
    summary: str = Field(min_length=1)
    steps: list[str] = Field(min_length=1)
    rationale: str = Field(min_length=1)
    estimated_days: int = Field(ge=0)
    risk_level: Level = "medium"


class RiskItem(BaseModel):
    """Mirror of RiskItemSchema (goal.ts). One identified risk to achieving the goal."""

    model_config = ConfigDict(extra="forbid")

    description: str = Field(min_length=1)
    likelihood: Level = "medium"
    impact: Level = "medium"
    mitigation: str = Field(min_length=1)


class WeeklyPlanItem(BaseModel):
    """Mirror of WeeklyPlanItemSchema (goal.ts). One week of the plan."""

    model_config = ConfigDict(extra="forbid")

    week: int = Field(gt=0)
    focus: str = Field(min_length=1)
    milestones: list[str] = Field(default_factory=list)
    outcome: str = ""


class GoalAnalysis(BaseModel):
    """Mirror of GoalAnalysisSchema (goal.ts). The full situation analysis for a goal."""

    model_config = ConfigDict(extra="forbid")

    current_state: str = Field(min_length=1)
    desired_state: str = Field(min_length=1)
    gap: str = Field(min_length=1)
    constraints: list[Constraint] = Field(default_factory=list)
    resources: list[Resource] = Field(default_factory=list)
    best_opportunities: list[Opportunity] = Field(default_factory=list)
    fastest_path: GoalPath
    lowest_resistance_path: GoalPath
    highest_roi_path: GoalPath
    recommended_path: PathKind
    explanation: str = Field(min_length=1)


class GoalPlan(BaseModel):
    """Mirror of GoalPlanSchema (goal.ts). The executable plan derived from the analysis."""

    model_config = ConfigDict(extra="forbid")

    weekly_plan: list[WeeklyPlanItem] = Field(default_factory=list)
    daily_priorities: list[str] = Field(default_factory=list)
    recommended_agents: list[str] = Field(default_factory=list)
    recommended_automations: list[str] = Field(default_factory=list)
    expected_completion: datetime
    risk_analysis: list[RiskItem] = Field(default_factory=list)
    risk_summary: str = Field(min_length=1)


class Goal(BaseModel):
    """Mirror of GoalSchema (goal.ts). A pursued goal."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    type: GoalType
    title: str = Field(min_length=1)
    description: str = ""
    status: GoalStatus = "draft"
    approved: bool = False
    business_id: UUID | None = None
    metric: str | None = None
    unit: str | None = None
    baseline_value: float | None = None
    current_value: float | None = None
    target_value: float | None = None
    deadline: datetime | None = None
    priority_level: PriorityLevel
    analysis: GoalAnalysis
    plan: GoalPlan
    version: int = Field(default=1, gt=0)
    created_at: datetime
    updated_at: datetime
    last_recalculated_at: datetime | None = None


class CreateGoalInput(BaseModel):
    """Mirror of CreateGoalInputSchema (goal.ts). Input to define a new goal."""

    model_config = ConfigDict(extra="forbid")

    type: GoalType
    title: str = Field(min_length=1)
    description: str = ""
    current_state: str = Field(min_length=1)
    desired_state: str = Field(min_length=1)
    business_id: UUID | None = None
    metric: str | None = None
    unit: str | None = None
    baseline_value: float | None = None
    current_value: float | None = None
    target_value: float | None = None
    deadline: datetime | None = None
    constraints: list[str] = Field(default_factory=list)
    resources: list[str] = Field(default_factory=list)


class GoalChange(BaseModel):
    """Mirror of GoalChangeSchema (goal.ts). A change that triggers automatic recalculation."""

    model_config = ConfigDict(extra="forbid")

    desired_state: str | None = None
    target_value: float | None = None
    current_value: float | None = None
    deadline: datetime | None = None
    add_constraints: list[str] = Field(default_factory=list)
    add_resources: list[str] = Field(default_factory=list)


# --- Persistent Approval contracts (mirror of packages/shared/src/contracts/persistent-approval.ts) ---
#
# Bounded standing grants the Security Gate consults before queuing a fresh approval. Reuses
# SensitiveActionClass and Environment (mirrored above). The Zod schemas are canonical.

# Mirror of GrantTypeSchema. The seven grant buttons.
GrantType = Literal[
    "remember_this",
    "always",
    "business",
    "until_goal",
    "duration",
    "review_monthly",
    "review_quarterly",
]

# Mirror of ReviewScheduleSchema. How often a standing grant returns to human review.
ReviewSchedule = Literal["none", "monthly", "quarterly", "on_expiry"]

# Mirror of ApprovalLifecycleStatusSchema. Lifecycle of a standing grant.
ApprovalLifecycleStatus = Literal["active", "in_review", "expired", "revoked"]


class ApprovalScope(BaseModel):
    """Mirror of ApprovalScopeSchema (persistent-approval.ts). What a grant covers."""

    model_config = ConfigDict(extra="forbid")

    action_class: SensitiveActionClass | None = None
    action_pattern: str | None = None
    business_id: UUID | None = None
    goal_id: UUID | None = None
    environments: list[Environment] = Field(default_factory=lambda: ["dev", "staging"])


class ApprovalLimits(BaseModel):
    """Mirror of ApprovalLimitsSchema (persistent-approval.ts). Quantitative ceilings."""

    model_config = ConfigDict(extra="forbid")

    max_uses: int | None = Field(default=None, gt=0)
    used_count: int = Field(default=0, ge=0)
    max_amount_usd: float | None = Field(default=None, ge=0)


class PersistentApproval(BaseModel):
    """Mirror of PersistentApprovalSchema (persistent-approval.ts). A standing grant."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    principal: str = Field(min_length=1)
    label: str = Field(min_length=1)
    grant_type: GrantType
    scope: ApprovalScope
    limits: ApprovalLimits
    success_metrics: list[str] = Field(default_factory=list)
    review_schedule: ReviewSchedule = "none"
    status: ApprovalLifecycleStatus = "active"
    expires_at: datetime | None = None
    next_review_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class CreatePersistentApprovalInput(BaseModel):
    """Mirror of CreatePersistentApprovalInputSchema (persistent-approval.ts). Grant input."""

    model_config = ConfigDict(extra="forbid")

    principal: str = Field(min_length=1)
    label: str = Field(min_length=1)
    grant_type: GrantType
    action_class: SensitiveActionClass | None = None
    action_pattern: str | None = None
    business_id: UUID | None = None
    goal_id: UUID | None = None
    environments: list[Environment] = Field(default_factory=lambda: ["dev", "staging"])
    max_uses: int | None = Field(default=None, gt=0)
    max_amount_usd: float | None = Field(default=None, ge=0)
    success_metrics: list[str] = Field(default_factory=list)
    duration_days: int = Field(default=30, gt=0)
    review_schedule: ReviewSchedule | None = None


# --- Campaign Intelligence contracts (mirror of packages/shared/src/contracts/campaign.ts) ---
#
# Runs A/B marketing campaigns across email, social, landing pages, funnels, outreach, and lead
# nurturing. Reuses Level (mirrored from goal.ts above). The Zod schemas are canonical.

# Mirror of CampaignTypeSchema. The six supported campaign types.
CampaignType = Literal[
    "email",
    "social",
    "landing_page",
    "funnel",
    "outreach",
    "lead_nurturing",
]

# Mirror of CampaignStatusSchema. Lifecycle.
CampaignStatus = Literal["draft", "active", "paused", "completed", "stopped"]

# Mirror of StopReasonSchema. Why a campaign left autopilot.
StopReason = Literal[
    "goal_reached",
    "performance_drop",
    "risk_increase",
    "approval_expired",
    "paused",
    "manual",
]

# Mirror of VariantKeySchema.
VariantKey = Literal["A", "B"]

# Mirror of MetricDirectionSchema.
MetricDirection = Literal["higher_better", "lower_better"]

# Mirror of OptimizationCadenceSchema.
OptimizationCadence = Literal["monthly", "none"]


class Variant(BaseModel):
    """Mirror of VariantSchema (campaign.ts). One A/B variant."""

    model_config = ConfigDict(extra="forbid")

    key: VariantKey
    name: str = Field(min_length=1)
    hypothesis: str = Field(min_length=1)
    content: str = ""
    traffic_weight: float = Field(default=0.5, ge=0, le=1)


class CampaignSuccessMetric(BaseModel):
    """Mirror of SuccessMetricSchema (campaign.ts). A success metric the campaign is judged against.

    Named CampaignSuccessMetric to avoid colliding with the agent-factory SuccessMetric above.
    """

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    target: float
    unit: str = ""
    direction: MetricDirection = "higher_better"
    primary: bool = False


class VariantResult(BaseModel):
    """Mirror of VariantResultSchema (campaign.ts). Observed performance for one variant."""

    model_config = ConfigDict(extra="forbid")

    variant_key: VariantKey
    impressions: int = Field(ge=0)
    conversions: int = Field(ge=0)
    conversion_rate: float = Field(ge=0, le=1)
    cost_usd: float = Field(default=0, ge=0)
    revenue_usd: float = Field(default=0, ge=0)


class CampaignRecommendation(BaseModel):
    """Mirror of RecommendationSchema (campaign.ts). An improvement recommendation.

    Named CampaignRecommendation to avoid colliding with the idea-builder Recommendation above.
    """

    model_config = ConfigDict(extra="forbid")

    description: str = Field(min_length=1)
    rationale: str = Field(min_length=1)
    expected_impact: Level = "medium"


class CampaignReport(BaseModel):
    """Mirror of CampaignReportSchema (campaign.ts). A generated A/B report."""

    model_config = ConfigDict(extra="forbid")

    generated_at: datetime
    period_label: str = ""
    variant_results: list[VariantResult] = Field(default_factory=list)
    winner: VariantKey | None = None
    lift: float | None = None
    summary: str = Field(min_length=1)
    recommendations: list[CampaignRecommendation] = Field(default_factory=list)


class StopConditions(BaseModel):
    """Mirror of StopConditionsSchema (campaign.ts). Thresholds that take a campaign off autopilot."""

    model_config = ConfigDict(extra="forbid")

    min_conversion_rate: float = Field(default=0, ge=0, le=1)
    max_risk: Level = "high"
    goal_id: UUID | None = None
    approval_id: UUID | None = None


class Campaign(BaseModel):
    """Mirror of CampaignSchema (campaign.ts). A campaign."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    type: CampaignType
    name: str = Field(min_length=1)
    objective: str = ""
    business_id: UUID | None = None
    goal_id: UUID | None = None
    approval_id: UUID | None = None
    status: CampaignStatus = "draft"
    stop_reason: StopReason | None = None
    variants: list[Variant] = Field(min_length=2)
    success_metrics: list[CampaignSuccessMetric] = Field(min_length=1)
    stop_conditions: StopConditions
    optimization_cadence: OptimizationCadence = "monthly"
    latest_report: CampaignReport | None = None
    version: int = Field(default=1, gt=0)
    created_at: datetime
    updated_at: datetime
    last_optimized_at: datetime | None = None


class VariantDraft(BaseModel):
    """Mirror of VariantDraftSchema (campaign.ts). A variant draft supplied at creation."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    hypothesis: str = Field(min_length=1)
    content: str = ""


class CreateCampaignInput(BaseModel):
    """Mirror of CreateCampaignInputSchema (campaign.ts). Input to create a campaign."""

    model_config = ConfigDict(extra="forbid")

    type: CampaignType
    name: str = Field(min_length=1)
    objective: str = ""
    business_id: UUID | None = None
    goal_id: UUID | None = None
    approval_id: UUID | None = None
    variant_a: VariantDraft | None = None
    variant_b: VariantDraft | None = None
    success_metrics: list[CampaignSuccessMetric] = Field(default_factory=list)
    min_conversion_rate: float = Field(default=0, ge=0, le=1)
    max_risk: Level = "high"


class VariantObservation(BaseModel):
    """Mirror of VariantObservationSchema (campaign.ts). Raw observed metrics for one variant."""

    model_config = ConfigDict(extra="forbid")

    variant_key: VariantKey
    impressions: int = Field(ge=0)
    conversions: int = Field(ge=0)
    cost_usd: float = Field(default=0, ge=0)
    revenue_usd: float = Field(default=0, ge=0)


class CampaignMetricsInput(BaseModel):
    """Mirror of CampaignMetricsInputSchema (campaign.ts). Observed metrics fed in for reporting."""

    model_config = ConfigDict(extra="forbid")

    period_label: str = ""
    results: list[VariantObservation] = Field(min_length=1)


class AssessSignals(BaseModel):
    """Mirror of AssessSignalsSchema (campaign.ts). Signals the autopilot uses to keep running."""

    model_config = ConfigDict(extra="forbid")

    goal_reached: bool = False
    risk_level: Level = "low"
    approval_active: bool = True
    metrics: CampaignMetricsInput | None = None


# --- Opportunity Intelligence contracts (mirror of packages/shared/src/contracts/opportunity.ts) ---
#
# NOTE: the OpportunitySchema in opportunity.ts is mirrored here as `OpportunityIntel` to avoid a
# name collision with the existing `Opportunity` model (mirror of goal.ts's OpportunitySchema,
# defined above and used by GoalAnalysis). The two schemas have entirely different shapes.

# Mirror of EntityKindSchema. The ten analyzable entity sources.
EntityKind = Literal[
    "contact",
    "business",
    "vendor",
    "investor",
    "client",
    "idea",
    "github_repo",
    "asset",
    "conversation",
    "market_trend",
]

# Mirror of RelationshipKindSchema. The kind of relationship/opportunity found between two entities.
RelationshipKind = Literal[
    "fit",
    "introduction",
    "solves",
    "investment",
    "partnership",
    "synergy",
    "trend_tailwind",
]

# Mirror of OpportunityStatusSchema.
OpportunityStatus = Literal["new", "surfaced", "accepted", "dismissed", "acted"]


class EntityRef(BaseModel):
    """Mirror of EntityRefSchema (opportunity.ts). A reference to an analyzable entity."""

    model_config = ConfigDict(extra="forbid")

    ref_id: str = Field(min_length=1)
    kind: EntityKind
    name: str = Field(min_length=1)
    business_id: UUID | None = None
    tags: list[str] = Field(default_factory=list)
    keywords: list[str] = Field(default_factory=list)
    attributes: dict[str, Any] = Field(default_factory=dict)


class OpportunityScore(BaseModel):
    """Mirror of OpportunityScoreSchema (opportunity.ts). Five ranking dimensions plus composite."""

    model_config = ConfigDict(extra="forbid")

    revenue: float = Field(ge=0, le=1)
    probability: float = Field(ge=0, le=1)
    effort: float = Field(ge=0, le=1)
    risk: float = Field(ge=0, le=1)
    strategic_value: float = Field(ge=0, le=1)
    composite: float = Field(ge=0, le=1)


class OpportunityIntel(BaseModel):
    """Mirror of OpportunitySchema (opportunity.ts). A surfaced opportunity connecting two entities.

    Named `OpportunityIntel` (not `Opportunity`) to avoid a collision with the goal.ts `Opportunity`.
    """

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    kind: RelationshipKind
    title: str = Field(min_length=1)
    source: EntityRef
    target: EntityRef
    rationale: str = Field(min_length=1)
    evidence: list[str] = Field(default_factory=list)
    scores: OpportunityScore
    recommended_action: str = Field(min_length=1)
    recommended_agents: list[str] = Field(default_factory=list)
    status: OpportunityStatus = "new"
    created_at: datetime
    updated_at: datetime


class AnalyzeInput(BaseModel):
    """Mirror of AnalyzeInputSchema (opportunity.ts). The corpus to analyze."""

    model_config = ConfigDict(extra="forbid")

    entities: list[EntityRef] = Field(min_length=2)


class ScoreWeights(BaseModel):
    """Mirror of ScoreWeightsSchema (opportunity.ts). Weights for the composite rank."""

    model_config = ConfigDict(extra="forbid")

    revenue: float = 0.3
    probability: float = 0.25
    strategic_value: float = 0.2
    effort: float = 0.15
    risk: float = 0.1


# --- AI Center of Excellence contracts (mirror of packages/shared/src/contracts/ai-coe.ts) ---

# Mirror of StandardKindSchema. The eleven kinds of standard the CoE governs.
StandardKind = Literal[
    "prompt",
    "agent_template",
    "workflow_template",
    "security_standard",
    "data_standard",
    "naming_convention",
    "testing_standard",
    "documentation_standard",
    "escalation_rule",
    "model_usage_rule",
    "cost_control",
]

# Mirror of StandardStatusSchema.
StandardStatus = Literal["draft", "approved", "deprecated"]

# Mirror of ComplianceTargetKindSchema. What a compliance check targets.
ComplianceTargetKind = Literal["agent", "workflow", "connector"]

# Mirror of ViolationSeveritySchema.
ViolationSeverity = Literal["info", "warning", "error"]


class ApprovedStandard(BaseModel):
    """Mirror of ApprovedStandardSchema (ai-coe.ts). One approved standard."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    kind: StandardKind
    name: str = Field(min_length=1)
    version: str = "1.0.0"
    status: StandardStatus = "draft"
    summary: str = ""
    body: str = ""
    rules: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class CreateStandardInput(BaseModel):
    """Mirror of CreateStandardInputSchema (ai-coe.ts). Input to create a standard."""

    model_config = ConfigDict(extra="forbid")

    kind: StandardKind
    name: str = Field(min_length=1)
    summary: str = ""
    body: str = ""
    rules: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)


class ComplianceTarget(BaseModel):
    """Mirror of ComplianceTargetSchema (ai-coe.ts). A thing being checked for compliance."""

    model_config = ConfigDict(extra="forbid")

    kind: ComplianceTargetKind
    name: str = Field(min_length=1)
    model: str | None = None
    has_tests: bool = False
    has_docs: bool = False
    est_cost_usd: float = Field(default=0, ge=0)
    requires_approval: bool = False
    irreversible: bool = False
    permissions: list[str] = Field(default_factory=list)
    attributes: dict[str, Any] = Field(default_factory=dict)


class Violation(BaseModel):
    """Mirror of ViolationSchema (ai-coe.ts). A single standards violation."""

    model_config = ConfigDict(extra="forbid")

    standard_kind: StandardKind
    rule: str = Field(min_length=1)
    severity: ViolationSeverity
    message: str = Field(min_length=1)


class ComplianceResult(BaseModel):
    """Mirror of ComplianceResultSchema (ai-coe.ts). The result of a compliance check."""

    model_config = ConfigDict(extra="forbid")

    target_kind: ComplianceTargetKind
    target_name: str = Field(min_length=1)
    passed: bool
    score: float = Field(ge=0, le=1)
    violations: list[Violation] = Field(default_factory=list)
    checked: list[StandardKind] = Field(default_factory=list)
    created_at: datetime


# --- Workflow ROI contracts (mirror of packages/shared/src/contracts/workflow-roi.ts) ---


class WorkflowMetrics(BaseModel):
    """Mirror of WorkflowMetricsSchema (workflow-roi.ts). Metrics tracked for an automation."""

    model_config = ConfigDict(extra="forbid")

    time_saved_hours: float = Field(default=0, ge=0)
    revenue_generated_usd: float = Field(default=0, ge=0)
    cost_reduced_usd: float = Field(default=0, ge=0)
    errors_reduced: int = Field(default=0, ge=0)
    risk_reduced: float = Field(default=0, ge=0, le=1)
    conversion_improvement: float = Field(default=0, ge=0, le=1)
    operating_cost_usd: float = Field(default=0, ge=0)
    model_tool_cost_usd: float = Field(default=0, ge=0)
    human_time_required_hours: float = Field(default=0, ge=0)


# Mirror of RoiRecommendationSchema. The recommended action for a workflow.
RoiRecommendation = Literal["scale", "pause", "improve", "delete"]


class WorkflowRoiRecord(BaseModel):
    """Mirror of WorkflowRoiRecordSchema (workflow-roi.ts). A computed ROI record."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    workflow_name: str = Field(min_length=1)
    metrics: WorkflowMetrics
    value_usd: float
    total_cost_usd: float = Field(ge=0)
    net_value_usd: float
    roi_score: float | None = None
    recommendation: RoiRecommendation
    rationale: str = Field(min_length=1)
    created_at: datetime
    updated_at: datetime


class TrackWorkflowInput(BaseModel):
    """Mirror of TrackWorkflowInputSchema (workflow-roi.ts). Input to track a workflow's ROI."""

    model_config = ConfigDict(extra="forbid")

    workflow_name: str = Field(min_length=1)
    metrics: WorkflowMetrics
    human_hourly_rate: float = Field(default=75, gt=0)


# --- Domain Operating Model contracts (mirror of packages/shared/src/contracts/domain-model.ts) ---

# Mirror of DomainKindSchema. The eleven operating domains.
DomainKind = Literal[
    "sales",
    "marketing",
    "finance",
    "operations",
    "legal_risk",
    "customer_success",
    "product",
    "recruiting",
    "personal_admin",
    "health",
    "asset_management",
]

# Mirror of KpiDirectionSchema.
KpiDirection = Literal["higher_better", "lower_better"]


class DomainKpi(BaseModel):
    """Mirror of DomainKpiSchema (domain-model.ts). A domain KPI."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    target: float
    unit: str = ""
    direction: KpiDirection = "higher_better"


class DomainWorkflow(BaseModel):
    """Mirror of DomainWorkflowSchema (domain-model.ts). A workflow within a domain."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    purpose: str = Field(min_length=1)
    trigger: str = ""
    steps: list[str] = Field(default_factory=list)


class DomainEscalationRule(BaseModel):
    """Mirror of DomainEscalationRuleSchema (domain-model.ts). An escalation rule within a domain."""

    model_config = ConfigDict(extra="forbid")

    condition: str = Field(min_length=1)
    action: str = Field(min_length=1)
    escalate_to: str = "owner"


class DomainModel(BaseModel):
    """Mirror of DomainModelSchema (domain-model.ts). A full operating model for one domain."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    domain: DomainKind
    name: str = Field(min_length=1)
    goals: list[str] = Field(default_factory=list)
    workflows: list[DomainWorkflow] = Field(default_factory=list)
    agents: list[str] = Field(default_factory=list)
    kpis: list[DomainKpi] = Field(default_factory=list)
    assets: list[str] = Field(default_factory=list)
    approvals: list[str] = Field(default_factory=list)
    dashboards: list[str] = Field(default_factory=list)
    escalation_rules: list[DomainEscalationRule] = Field(default_factory=list)
    template_version: str = "1.0.0"
    created_at: datetime
    updated_at: datetime


class CreateDomainInput(BaseModel):
    """Mirror of CreateDomainInputSchema (domain-model.ts). Input to create a domain model."""

    model_config = ConfigDict(extra="forbid")

    domain: DomainKind
    name: str | None = None
    template_version: str | None = None


# --- Agent Identity & Zero Trust contracts (mirror of packages/shared/src/contracts/agent-identity.ts) ---

# Mirror of AgentIdentityStatusSchema.
AgentIdentityStatus = Literal["active", "suspended", "revoked"]

# Mirror of AgentActionTypeSchema. The kinds of action an agent can request (zero trust).
AgentActionType = Literal[
    "read",
    "write",
    "spend",
    "external_comm",
    "modify_production",
    "delete",
    "use_tool",
]

# Mirror of ZeroTrustDecisionKindSchema.
ZeroTrustDecisionKind = Literal["allow", "deny", "needs_approval"]


class AgentCapabilities(BaseModel):
    """Mirror of AgentCapabilitiesSchema (agent-identity.ts). ALL default false — read-only."""

    model_config = ConfigDict(extra="forbid")

    can_write: bool = False
    can_spend: bool = False
    can_external_comm: bool = False
    can_modify_production: bool = False
    can_delete: bool = False


class AgentIdentity(BaseModel):
    """Mirror of AgentIdentitySchema (agent-identity.ts). A scoped, revocable agent identity."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    agent_key: str = Field(min_length=1)
    display_name: str = Field(min_length=1)
    role: str = "worker"
    scope: list[str] = Field(default_factory=list)
    capabilities: AgentCapabilities = Field(default_factory=AgentCapabilities)
    data_boundaries: list[str] = Field(default_factory=list)
    tool_access: list[str] = Field(default_factory=list)
    spending_limit_usd: float = Field(default=0, ge=0)
    external_comm_daily_limit: int = Field(default=0, ge=0)
    requires_approval_for: list[SensitiveActionClass] = Field(
        default_factory=lambda: [
            "spend_money",
            "delete_data",
            "modify_production",
            "contact_external",
            "sign_contract",
            "install_package",
        ]
    )
    status: AgentIdentityStatus = "active"
    created_at: datetime
    updated_at: datetime


class IssueAgentIdentityInput(BaseModel):
    """Mirror of IssueAgentIdentityInputSchema (agent-identity.ts). Input to issue an identity."""

    model_config = ConfigDict(extra="forbid")

    agent_key: str = Field(min_length=1)
    display_name: str = Field(min_length=1)
    role: str = "worker"
    scope: list[str] = Field(default_factory=list)


class AgentAccessRequest(BaseModel):
    """Mirror of AgentAccessRequestSchema (agent-identity.ts). A zero-trust access request."""

    model_config = ConfigDict(extra="forbid")

    agent_key: str = Field(min_length=1)
    action: AgentActionType
    tool: str | None = None
    data_namespace: str | None = None
    amount_usd: float | None = Field(default=None, ge=0)
    target_env: Environment = "dev"
    action_class: SensitiveActionClass | None = None


class ZeroTrustDecision(BaseModel):
    """Mirror of ZeroTrustDecisionSchema (agent-identity.ts). The verdict for one request."""

    model_config = ConfigDict(extra="forbid")

    agent_key: str = Field(min_length=1)
    action: AgentActionType
    decision: ZeroTrustDecisionKind
    reasons: list[str] = Field(min_length=1)
    created_at: datetime


# --- Source-of-Truth Management contracts (mirror of packages/shared/src/contracts/source-of-truth.ts) ---

# Mirror of FactKindSchema. The nine kinds of knowledge the engine distinguishes.
FactKind = Literal[
    "verified_fact",
    "assumption",
    "outdated",
    "user_preference",
    "inferred_pattern",
    "external_research",
    "document",
    "contact",
    "financial_data",
]

# Mirror of FreshnessSchema.
Freshness = Literal["fresh", "aging", "stale", "expired"]


class SourceRecord(BaseModel):
    """Mirror of SourceRecordSchema (source-of-truth.ts). A tracked piece of truth."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    kind: FactKind
    statement: str = Field(min_length=1)
    source: str = Field(min_length=1)
    confidence: float = Field(default=0.5, ge=0, le=1)
    owner: str = Field(min_length=1)
    last_verified_at: datetime | None = None
    freshness: Freshness = "fresh"
    update_trigger: str = ""
    memory_id: str | None = None
    tags: list[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class RecordTruthInput(BaseModel):
    """Mirror of RecordTruthInputSchema (source-of-truth.ts). Input to record a piece of truth."""

    model_config = ConfigDict(extra="forbid")

    kind: FactKind
    statement: str = Field(min_length=1)
    source: str = Field(min_length=1)
    confidence: float = Field(default=0.5, ge=0, le=1)
    owner: str = Field(min_length=1)
    last_verified_at: datetime | None = None
    update_trigger: str = ""
    memory_id: str | None = None
    tags: list[str] = Field(default_factory=list)


# --- Executive Control Tower contracts (mirror of packages/shared/src/contracts/control-tower.ts) ---

# Mirror of TowerSeveritySchema.
TowerSeverity = Literal["low", "medium", "high"]

# Mirror of ReviewCadenceSchema.
ReviewCadence = Literal["monthly", "quarterly"]


class TowerCash(BaseModel):
    """Mirror of TowerCashSchema (control-tower.ts)."""

    model_config = ConfigDict(extra="forbid")

    cash_on_hand_usd: float
    monthly_burn_usd: float = Field(ge=0)
    monthly_inflow_usd: float = Field(ge=0)
    runway_months: float | None = None


class TowerPipeline(BaseModel):
    """Mirror of TowerPipelineSchema (control-tower.ts)."""

    model_config = ConfigDict(extra="forbid")

    open_deals: int = Field(ge=0)
    weighted_value_usd: float = Field(ge=0)
    closing_30d_usd: float = Field(ge=0)


class TowerGoal(BaseModel):
    """Mirror of TowerGoalSchema (control-tower.ts)."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    status: str = Field(min_length=1)
    progress: float = Field(default=0, ge=0, le=1)
    priority_level: PriorityLevel


class TowerCampaign(BaseModel):
    """Mirror of TowerCampaignSchema (control-tower.ts)."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    status: str = Field(min_length=1)
    note: str = ""


class TowerBlockedDeal(BaseModel):
    """Mirror of TowerBlockedDealSchema (control-tower.ts)."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    reason: str = Field(min_length=1)
    value_usd: float = Field(default=0, ge=0)


class TowerRisk(BaseModel):
    """Mirror of TowerRiskSchema (control-tower.ts)."""

    model_config = ConfigDict(extra="forbid")

    description: str = Field(min_length=1)
    severity: TowerSeverity


class TowerAgentPerf(BaseModel):
    """Mirror of TowerAgentPerfSchema (control-tower.ts)."""

    model_config = ConfigDict(extra="forbid")

    agent_name: str = Field(min_length=1)
    success_rate: float = Field(ge=0, le=1)
    roi: float | None = None
    actions: int = Field(ge=0)


class TowerApproval(BaseModel):
    """Mirror of TowerApprovalSchema (control-tower.ts)."""

    model_config = ConfigDict(extra="forbid")

    action: str = Field(min_length=1)
    requested_by: str = Field(min_length=1)
    required_role: Role


class TowerBusinessHealth(BaseModel):
    """Mirror of TowerBusinessHealthSchema (control-tower.ts)."""

    model_config = ConfigDict(extra="forbid")

    business_name: str = Field(min_length=1)
    score: float = Field(ge=0, le=1)
    signal: str = ""


class TowerOpportunity(BaseModel):
    """Mirror of TowerOpportunitySchema (control-tower.ts)."""

    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1)
    composite: float = Field(ge=0, le=1)


class TowerWorkflow(BaseModel):
    """Mirror of TowerWorkflowSchema (control-tower.ts)."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    status: str = Field(min_length=1)


class TowerReviewItem(BaseModel):
    """Mirror of TowerReviewItemSchema (control-tower.ts)."""

    model_config = ConfigDict(extra="forbid")

    item: str = Field(min_length=1)
    cadence: ReviewCadence
    due: datetime | None = None


class ControlTowerSnapshot(BaseModel):
    """Mirror of ControlTowerSnapshotSchema (control-tower.ts). The assembled dashboard snapshot."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    generated_at: datetime
    cash_position: TowerCash
    revenue_pipeline: TowerPipeline
    goals: list[TowerGoal] = Field(default_factory=list)
    active_campaigns: list[TowerCampaign] = Field(default_factory=list)
    blocked_deals: list[TowerBlockedDeal] = Field(default_factory=list)
    risks: list[TowerRisk] = Field(default_factory=list)
    agent_performance: list[TowerAgentPerf] = Field(default_factory=list)
    approvals_needed: list[TowerApproval] = Field(default_factory=list)
    top_priorities: list[str] = Field(default_factory=list, max_length=3)
    business_health: list[TowerBusinessHealth] = Field(default_factory=list)
    opportunities: list[TowerOpportunity] = Field(default_factory=list)
    workflows_running: list[TowerWorkflow] = Field(default_factory=list)
    review_queue: list[TowerReviewItem] = Field(default_factory=list)


class ControlTowerCashInput(BaseModel):
    """Mirror of the inline cash object in ControlTowerInputSchema (control-tower.ts)."""

    model_config = ConfigDict(extra="forbid")

    cash_on_hand_usd: float
    monthly_burn_usd: float = Field(ge=0)
    monthly_inflow_usd: float = Field(ge=0)


class ControlTowerInput(BaseModel):
    """Mirror of ControlTowerInputSchema (control-tower.ts). Inputs assembled into a snapshot."""

    model_config = ConfigDict(extra="forbid")

    cash: ControlTowerCashInput
    pipeline: TowerPipeline
    goals: list[TowerGoal] = Field(default_factory=list)
    campaigns: list[TowerCampaign] = Field(default_factory=list)
    blocked_deals: list[TowerBlockedDeal] = Field(default_factory=list)
    risks: list[TowerRisk] = Field(default_factory=list)
    agent_performance: list[TowerAgentPerf] = Field(default_factory=list)
    approvals_needed: list[TowerApproval] = Field(default_factory=list)
    business_health: list[TowerBusinessHealth] = Field(default_factory=list)
    opportunities: list[TowerOpportunity] = Field(default_factory=list)
    workflows_running: list[TowerWorkflow] = Field(default_factory=list)
    review_queue: list[TowerReviewItem] = Field(default_factory=list)


# --- Enterprise Playbook Generator contracts (mirror of packages/shared/src/contracts/playbook.ts) ---

# Mirror of PlaybookArtifactKindSchema. The ten artifact kinds a playbook produces.
PlaybookArtifactKind = Literal[
    "sop",
    "workflow",
    "script",
    "checklist",
    "onboarding_doc",
    "training_doc",
    "role_scorecard",
    "kpi",
    "escalation_rule",
    "client_asset",
]


class PlaybookArtifact(BaseModel):
    """Mirror of PlaybookArtifactSchema (playbook.ts). One generated artifact."""

    model_config = ConfigDict(extra="forbid")

    kind: PlaybookArtifactKind
    title: str = Field(min_length=1)
    body: str = ""
    tags: list[str] = Field(default_factory=list)


class Playbook(BaseModel):
    """Mirror of PlaybookSchema (playbook.ts). A full playbook for one domain."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    domain: DomainKind
    business_id: UUID | None = None
    business_name: str = ""
    name: str = Field(min_length=1)
    artifacts: list[PlaybookArtifact] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class GeneratePlaybookInput(BaseModel):
    """Mirror of GeneratePlaybookInputSchema (playbook.ts). Input to generate a playbook."""

    model_config = ConfigDict(extra="forbid")

    domain: DomainKind
    business_name: str = ""
    business_id: UUID | None = None


# --- Strategic Portfolio Optimizer contracts (mirror of packages/shared/src/contracts/portfolio.ts) ---

# Mirror of PortfolioRecommendationSchema.
PortfolioRecommendation = Literal[
    "focus_now",
    "delegate",
    "automate",
    "pause",
    "kill",
    "package_for_sale",
]


class PortfolioMetrics(BaseModel):
    """Mirror of PortfolioMetricsSchema (portfolio.ts). The ten ranking dimensions, each 0..1."""

    model_config = ConfigDict(extra="forbid")

    revenue_potential: float = Field(ge=0, le=1)
    speed_to_cash: float = Field(ge=0, le=1)
    effort_required: float = Field(ge=0, le=1)
    stress_cost: float = Field(ge=0, le=1)
    strategic_value: float = Field(ge=0, le=1)
    current_traction: float = Field(ge=0, le=1)
    operational_drag: float = Field(ge=0, le=1)
    capital_required: float = Field(ge=0, le=1)
    team_dependency: float = Field(ge=0, le=1)
    monetization_path: float = Field(ge=0, le=1)


class BusinessAssessment(BaseModel):
    """Mirror of BusinessAssessmentSchema (portfolio.ts). One business's assessment."""

    model_config = ConfigDict(extra="forbid")

    business_name: str = Field(min_length=1)
    metrics: PortfolioMetrics
    score: float = Field(ge=0, le=1)
    recommendation: PortfolioRecommendation
    rationale: str = Field(min_length=1)


class PortfolioReport(BaseModel):
    """Mirror of PortfolioReportSchema (portfolio.ts). The portfolio analysis, ranked."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    generated_at: datetime
    assessments: list[BusinessAssessment] = Field(default_factory=list)
    summary: str = Field(min_length=1)


class PortfolioBusinessInput(BaseModel):
    """Mirror of PortfolioBusinessInputSchema (portfolio.ts). One business input."""

    model_config = ConfigDict(extra="forbid")

    business_name: str = Field(min_length=1)
    metrics: PortfolioMetrics


class AnalyzePortfolioInput(BaseModel):
    """Mirror of AnalyzePortfolioInputSchema (portfolio.ts). Input to analyze the portfolio."""

    model_config = ConfigDict(extra="forbid")

    businesses: list[PortfolioBusinessInput] = Field(min_length=1)


# --- Knowledge Ingestion Engine contracts (mirror of packages/shared/src/contracts/knowledge-ingestion.ts) ---

# Mirror of KnowledgeSourceTypeSchema. The eleven source types the engine ingests.
KnowledgeSourceType = Literal[
    "book",
    "pdf",
    "youtube_transcript",
    "podcast",
    "course",
    "article",
    "screenshot",
    "note",
    "video",
    "github_repo",
    "competitor_page",
]


class IngestedItem(BaseModel):
    """Mirror of IngestedItemSchema (knowledge-ingestion.ts). A fully processed knowledge item."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    source_type: KnowledgeSourceType
    title: str = Field(min_length=1)
    location: str = ""
    summary: str = ""
    frameworks: list[str] = Field(default_factory=list)
    tactics: list[str] = Field(default_factory=list)
    business_applications: list[str] = Field(default_factory=list)
    applies_to: list[str] = Field(default_factory=list)
    monetization_use_cases: list[str] = Field(default_factory=list)
    suggested_sops: list[str] = Field(default_factory=list)
    suggested_agents: list[str] = Field(default_factory=list)
    asset_id: str | None = None
    linked_goals: list[str] = Field(default_factory=list)
    linked_campaigns: list[str] = Field(default_factory=list)
    linked_businesses: list[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class IngestInput(BaseModel):
    """Mirror of IngestInputSchema (knowledge-ingestion.ts). Input to ingest an item."""

    model_config = ConfigDict(extra="forbid")

    source_type: KnowledgeSourceType
    title: str = Field(min_length=1)
    content: str = ""
    location: str = ""
    businesses: list[str] = Field(default_factory=list)
    goals: list[str] = Field(default_factory=list)
    campaigns: list[str] = Field(default_factory=list)


# --- Knowledge-to-Action Converter contracts (mirror of packages/shared/src/contracts/knowledge-to-action.ts) ---

# Mirror of ActionDispositionSchema. The four dispositions for a converted idea.
ActionDisposition = Literal["use_now", "save_for_later", "ignore", "convert_to_campaign"]


class KnowledgeAction(BaseModel):
    """Mirror of KnowledgeActionSchema (knowledge-to-action.ts). A converted idea."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    idea: str = Field(min_length=1)
    action_item: str = Field(min_length=1)
    business_use_case: str = ""
    implementation_plan: list[str] = Field(default_factory=list)
    revenue_hypothesis: str = ""
    required_assets: list[str] = Field(default_factory=list)
    required_agents: list[str] = Field(default_factory=list)
    test_plan: list[str] = Field(default_factory=list)
    owner: str = "owner"
    deadline: datetime | None = None
    dashboard_card: str = ""
    disposition: ActionDisposition
    operating_manual: str = ""
    created_at: datetime
    updated_at: datetime


class ConvertIdeaInput(BaseModel):
    """Mirror of ConvertIdeaInputSchema (knowledge-to-action.ts). Input to convert an idea."""

    model_config = ConfigDict(extra="forbid")

    idea: str = Field(min_length=1)
    owner: str = "owner"
    business: str | None = None
    value_signal: float = Field(default=0.5, ge=0, le=1)
    is_campaign_shaped: bool = False
    deadline: datetime | None = None


# --- Conversion Engine contracts (mirror of packages/shared/src/contracts/conversion.ts) ---

# Mirror of ConversionSurfaceSchema. The eleven conversion surfaces.
ConversionSurface = Literal[
    "landing_page",
    "offer",
    "hook",
    "cta",
    "email",
    "dm",
    "sales_call",
    "deck",
    "proposal",
    "follow_up",
    "checkout_flow",
]

# Mirror of ConversionTestStatusSchema.
ConversionTestStatus = Literal["active", "won", "lost", "inconclusive"]

# Mirror of VariantKeyConvSchema.
VariantKeyConv = Literal["A", "B"]


class CopySnippet(BaseModel):
    """Mirror of CopySnippetSchema (conversion.ts). A copy snippet with measured performance."""

    model_config = ConfigDict(extra="forbid")

    surface: ConversionSurface
    text: str = Field(min_length=1)
    conversion_rate: float = Field(default=0, ge=0, le=1)
    revenue_per_unit_usd: float = Field(default=0, ge=0)


class OfferPerf(BaseModel):
    """Mirror of OfferPerfSchema (conversion.ts). An offer's performance."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    conversion_rate: float = Field(default=0, ge=0, le=1)
    revenue_usd: float = Field(default=0, ge=0)


class ConversionTest(BaseModel):
    """Mirror of ConversionTestSchema (conversion.ts). An A/B test on a surface."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    surface: ConversionSurface
    hypothesis: str = Field(min_length=1)
    variant_a: str = Field(min_length=1)
    variant_b: str = Field(min_length=1)
    status: ConversionTestStatus = "active"
    winner: VariantKeyConv | None = None
    revenue_per_unit_a_usd: float = Field(default=0, ge=0)
    revenue_per_unit_b_usd: float = Field(default=0, ge=0)
    conversion_a: float = Field(default=0, ge=0, le=1)
    conversion_b: float = Field(default=0, ge=0, le=1)
    created_at: datetime


class ConversionProfile(BaseModel):
    """Mirror of ConversionProfileSchema (conversion.ts). A business's conversion profile."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    business_id: UUID | None = None
    business_name: str = Field(min_length=1)
    baseline_conversion: float = Field(default=0, ge=0, le=1)
    baseline_revenue_per_unit_usd: float = Field(default=0, ge=0)
    active_tests: list[ConversionTest] = Field(default_factory=list)
    winning_copy: list[CopySnippet] = Field(default_factory=list)
    losing_copy: list[CopySnippet] = Field(default_factory=list)
    objections: list[str] = Field(default_factory=list)
    best_offers: list[OfferPerf] = Field(default_factory=list)
    next_optimization: str = ""
    revenue_focused: bool = True
    created_at: datetime
    updated_at: datetime


class StartTestInput(BaseModel):
    """Mirror of StartTestInputSchema (conversion.ts). Input to start an A/B test."""

    model_config = ConfigDict(extra="forbid")

    surface: ConversionSurface
    hypothesis: str = Field(min_length=1)
    variant_a: str = Field(min_length=1)
    variant_b: str = Field(min_length=1)


class TestResultInput(BaseModel):
    """Mirror of TestResultInputSchema (conversion.ts). Input to record a test result."""

    model_config = ConfigDict(extra="forbid")

    conversion_a: float = Field(default=0, ge=0, le=1)
    conversion_b: float = Field(default=0, ge=0, le=1)
    revenue_per_unit_a_usd: float = Field(default=0, ge=0)
    revenue_per_unit_b_usd: float = Field(default=0, ge=0)


# --- Follow-Up Execution Engine contracts (mirror of packages/shared/src/contracts/follow-up.ts) ---

# Mirror of FollowUpEntityKindSchema. The nine kinds of thing followed up.
FollowUpEntityKind = Literal[
    "lead",
    "warm_contact",
    "deal",
    "vendor",
    "investor",
    "client",
    "partner",
    "unanswered_email",
    "stale_opportunity",
]

# Mirror of FollowUpStatusSchema.
FollowUpStatus = Literal[
    "pending_approval",
    "active",
    "paused",
    "completed",
    "stopped",
    "escalated",
]

# Mirror of FollowUpStopReasonSchema. Why a sequence left autopilot.
FollowUpStopReason = Literal[
    "response_received",
    "meeting_booked",
    "deal_closed",
    "goal_reached",
    "sequence_completed",
    "risk",
    "escalated",
    "paused",
    "manual",
]


class SequenceStep(BaseModel):
    """Mirror of SequenceStepSchema (follow-up.ts). One step of a follow-up sequence."""

    model_config = ConfigDict(extra="forbid")

    day_offset: int = Field(ge=0)
    channel: str = Field(min_length=1)
    template: str = Field(min_length=1)


class FollowUp(BaseModel):
    """Mirror of FollowUpSchema (follow-up.ts). A follow-up being executed."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    entity_kind: FollowUpEntityKind
    entity_name: str = Field(min_length=1)
    business_id: UUID | None = None
    goal_id: UUID | None = None
    sequence: list[SequenceStep] = Field(min_length=1)
    current_step: int = Field(default=0, ge=0)
    status: FollowUpStatus = "pending_approval"
    stop_reason: FollowUpStopReason | None = None
    no_response_policy: str = "escalate"
    reactivation: bool = False
    escalation_reason: str | None = None
    last_touch_at: datetime | None = None
    next_touch_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class CreateFollowUpInput(BaseModel):
    """Mirror of CreateFollowUpInputSchema (follow-up.ts). Input to start a follow-up."""

    model_config = ConfigDict(extra="forbid")

    entity_kind: FollowUpEntityKind
    entity_name: str = Field(min_length=1)
    business_id: UUID | None = None
    goal_id: UUID | None = None
    sequence: list[SequenceStep] = Field(default_factory=list)
    no_response_policy: str = "escalate"
    reactivation: bool = False


class FollowUpSignal(BaseModel):
    """Mirror of FollowUpSignalSchema (follow-up.ts). Signals that advance or stop a follow-up."""

    model_config = ConfigDict(extra="forbid")

    response_received: bool = False
    meeting_booked: bool = False
    deal_closed: bool = False
    goal_reached: bool = False
    risk: bool = False
    needs_human: bool = False
    escalation_reason: str = ""


# --- Revenue Command System contracts (mirror of packages/shared/src/contracts/revenue.ts) ---


class RevenueOffer(BaseModel):
    """Mirror of RevenueOfferSchema (revenue.ts)."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    price_usd: float = Field(ge=0)
    conversion_rate: float = Field(default=0, ge=0, le=1)


class PipelineDeal(BaseModel):
    """Mirror of PipelineDealSchema (revenue.ts)."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    value_usd: float = Field(ge=0)
    probability: float = Field(default=0.5, ge=0, le=1)
    days_to_close: int = Field(default=30, ge=0)
    idle_days: int = Field(default=0, ge=0)


class LeadSource(BaseModel):
    """Mirror of LeadSourceSchema (revenue.ts)."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    leads: int = Field(default=0, ge=0)
    conversion_rate: float = Field(default=0, ge=0, le=1)


class RevenueCampaignPerf(BaseModel):
    """Mirror of RevenueCampaignPerfSchema (revenue.ts)."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    roi: float | None = None
    status: str = "active"


class CashOpportunity(BaseModel):
    """Mirror of CashOpportunitySchema (revenue.ts)."""

    model_config = ConfigDict(extra="forbid")

    description: str = Field(min_length=1)
    value_usd: float = Field(ge=0)
    probability: float = Field(default=0.5, ge=0, le=1)
    days_to_cash: int = Field(default=14, ge=0)


class RevenueProfileInput(BaseModel):
    """Mirror of RevenueProfileInputSchema (revenue.ts). A business's revenue snapshot."""

    model_config = ConfigDict(extra="forbid")

    business_name: str = Field(min_length=1)
    business_id: UUID | None = None
    offers: list[RevenueOffer] = Field(default_factory=list)
    pipeline: list[PipelineDeal] = Field(default_factory=list)
    leads: list[LeadSource] = Field(default_factory=list)
    campaigns: list[RevenueCampaignPerf] = Field(default_factory=list)
    cash_opportunities: list[CashOpportunity] = Field(default_factory=list)
    open_follow_ups: int = Field(default=0, ge=0)
    revenue_goal_usd: float = Field(default=0, ge=0)
    stuck_after_days: int = Field(default=14, gt=0)


class RevenueIntel(BaseModel):
    """Mirror of RevenueIntelSchema (revenue.ts). The computed revenue intelligence."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    business_name: str = Field(min_length=1)
    generated_at: datetime
    fastest_path_to_cash: str = Field(min_length=1)
    easiest_offer_to_sell: str = Field(min_length=1)
    best_lead_source: str = Field(min_length=1)
    highest_roi_campaign: str = Field(min_length=1)
    stuck_deals: list[str] = Field(default_factory=list)
    next_money_action: str = Field(min_length=1)
    weighted_pipeline_usd: float = Field(ge=0)
    revenue_goal_usd: float = Field(ge=0)


# --- Sales Asset Generator contracts (mirror of packages/shared/src/contracts/sales-asset.ts) ---

# Mirror of SalesAssetKindSchema. The twelve sales asset kinds.
SalesAssetKind = Literal[
    "one_pager",
    "pitch_deck",
    "investor_deck",
    "sales_deck",
    "proposal",
    "email_sequence",
    "dm_script",
    "call_script",
    "objection_handling",
    "faq",
    "case_study_template",
    "onboarding_packet",
]


class GeneratedSalesAsset(BaseModel):
    """Mirror of GeneratedSalesAssetSchema (sales-asset.ts). One generated sales asset."""

    model_config = ConfigDict(extra="forbid")

    kind: SalesAssetKind
    title: str = Field(min_length=1)
    body: str = ""
    asset_id: str | None = None


class SalesAssetPack(BaseModel):
    """Mirror of SalesAssetPackSchema (sales-asset.ts). A full generated sales kit."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    business_id: UUID | None = None
    business_name: str = Field(min_length=1)
    assets: list[GeneratedSalesAsset] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class GenerateSalesAssetsInput(BaseModel):
    """Mirror of GenerateSalesAssetsInputSchema (sales-asset.ts). Input to generate a sales kit."""

    model_config = ConfigDict(extra="forbid")

    business_name: str = Field(min_length=1)
    business_id: UUID | None = None
    offer: str = ""
    audience: str = ""


# --- Execution Queue contracts (mirror of packages/shared/src/contracts/execution-queue.ts) ---

# Mirror of QueueBucketSchema. The eight queue buckets.
QueueBucket = Literal[
    "idea",
    "task",
    "approved_action",
    "blocked_action",
    "waiting_on_alyssa",
    "automated_workflow",
    "money_action",
    "risk_action",
]

# Mirror of QueueCategorySchema. The seven priority categories.
QueueCategory = Literal[
    "revenue",
    "risk",
    "deadline",
    "follow_up",
    "operations",
    "personal_admin",
    "nice_to_have",
]


class QueueItem(BaseModel):
    """Mirror of QueueItemSchema (execution-queue.ts). One item in the execution queue."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    bucket: QueueBucket
    category: QueueCategory
    title: str = Field(min_length=1)
    business_id: UUID | None = None
    value_usd: float = Field(default=0, ge=0)
    due: datetime | None = None
    actionable: bool = True
    done: bool = False
    created_at: datetime
    updated_at: datetime


class AddQueueItemInput(BaseModel):
    """Mirror of AddQueueItemInputSchema (execution-queue.ts). Input to add a queue item."""

    model_config = ConfigDict(extra="forbid")

    bucket: QueueBucket
    category: QueueCategory
    title: str = Field(min_length=1)
    business_id: UUID | None = None
    value_usd: float = Field(default=0, ge=0)
    due: datetime | None = None
    actionable: bool = True


# --- Don't Drop the Ball contracts (mirror of packages/shared/src/contracts/dont-drop-ball.ts) ---

# Mirror of DroppedKindSchema. The nine kinds of thing that get dropped.
DroppedKind = Literal[
    "forgotten_lead",
    "missed_follow_up",
    "unfinished_launch",
    "abandoned_idea",
    "stale_campaign",
    "unpaid_invoice",
    "unsigned_contract",
    "open_loop",
    "waiting_on_response",
]

# Mirror of DroppedStatusSchema.
DroppedStatus = Literal["open", "assigned", "closed", "dismissed"]


class BallCandidate(BaseModel):
    """Mirror of BallCandidateSchema (dont-drop-ball.ts). A candidate evaluated for staleness."""

    model_config = ConfigDict(extra="forbid")

    kind: DroppedKind
    title: str = Field(min_length=1)
    business_id: UUID | None = None
    business_name: str = ""
    last_activity_at: datetime
    value_usd: float = Field(default=0, ge=0)


class DroppedItem(BaseModel):
    """Mirror of DroppedItemSchema (dont-drop-ball.ts). A detected dropped item."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    kind: DroppedKind
    title: str = Field(min_length=1)
    business_id: UUID | None = None
    business_name: str = ""
    age_days: int = Field(ge=0)
    value_usd: float = Field(default=0, ge=0)
    status: DroppedStatus = "open"
    assigned_agent: str | None = None
    recommended_action: str = Field(min_length=1)
    detected_at: datetime
    updated_at: datetime


class ScanInput(BaseModel):
    """Mirror of ScanInputSchema (dont-drop-ball.ts). Input to the daily scan."""

    model_config = ConfigDict(extra="forbid")

    candidates: list[BallCandidate] = Field(default_factory=list)


# --- Business Asset Checklist contracts (mirror of packages/shared/src/contracts/asset-checklist.ts) ---

# Mirror of BusinessAssetKindSchema. The twenty-five tracked business asset kinds.
BusinessAssetKind = Literal[
    "logo",
    "domain",
    "email",
    "landing_page",
    "social_pages",
    "pitch_deck",
    "investor_deck",
    "sales_deck",
    "one_pager",
    "pricing",
    "offer",
    "crm",
    "email_templates",
    "sales_scripts",
    "onboarding_packet",
    "contracts",
    "nda",
    "terms",
    "privacy_policy",
    "sops",
    "analytics",
    "payment_links",
    "lead_list",
    "follow_up_sequence",
    "content_calendar",
]


class AssetChecklist(BaseModel):
    """Mirror of AssetChecklistSchema (asset-checklist.ts). A business's asset checklist."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    business_id: UUID | None = None
    business_name: str = Field(min_length=1)
    present: list[BusinessAssetKind] = Field(default_factory=list)
    missing: list[BusinessAssetKind] = Field(default_factory=list)
    completeness: float = Field(ge=0, le=1)
    recommended_next: BusinessAssetKind | None = None
    recommendation_reason: str = ""
    created_at: datetime
    updated_at: datetime


class BuildChecklistInput(BaseModel):
    """Mirror of BuildChecklistInputSchema (asset-checklist.ts). Input to build a checklist."""

    model_config = ConfigDict(extra="forbid")

    business_name: str = Field(min_length=1)
    business_id: UUID | None = None
    present: list[BusinessAssetKind] = Field(default_factory=list)


# --- Money-First Operating Mode contracts (mirror of packages/shared/src/contracts/money-first.ts) ---

# Mirror of MoneyFocusSchema. The nine money-aligned focuses that get prioritized.
MoneyFocus = Literal[
    "cash_collection",
    "sales",
    "follow_up",
    "booked_calls",
    "proposals",
    "invoices",
    "high_conversion_content",
    "warm_relationships",
    "low_friction_offers",
]

# Mirror of MoneyDeprioritySchema. The five things deprioritized in money-first mode.
MoneyDepriority = Literal[
    "perfection",
    "branding_polish",
    "unnecessary_features",
    "low_conversion_ideas",
    "research_without_action",
]

# Mirror of MoneyClassificationSchema. How an item is treated in money-first mode.
MoneyClassification = Literal["prioritize", "deprioritize", "neutral"]


class MoneyFirstState(BaseModel):
    """Mirror of MoneyFirstStateSchema (money-first.ts). The mode state for a tenant."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    active: bool = False
    activated_at: datetime | None = None
    updated_at: datetime


class WorkItem(BaseModel):
    """Mirror of WorkItemSchema (money-first.ts). A work item to be classified/reordered."""

    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1)
    category: str = ""


class ClassifiedItem(BaseModel):
    """Mirror of ClassifiedItemSchema (money-first.ts). The result of classifying a work item."""

    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1)
    classification: MoneyClassification
    matched: str = ""
    reason: str = Field(min_length=1)


# --- Knowledge Vault contracts (mirror of packages/shared/src/contracts/knowledge-vault.ts) ---

# Mirror of VaultInputKindSchema. The thirteen input kinds the Vault accepts.
VaultInputKind = Literal[
    "book",
    "pdf",
    "youtube_transcript",
    "podcast",
    "course",
    "screenshot",
    "website",
    "github_repo",
    "article",
    "competitor_page",
    "voice_note",
    "meeting_notes",
    "random_idea",
]


class VaultDrop(BaseModel):
    """Mirror of VaultDropSchema (knowledge-vault.ts). An item dropped into the Vault."""

    model_config = ConfigDict(extra="forbid")

    kind: VaultInputKind
    title: str = Field(min_length=1)
    content: str = ""
    business_ids: list[UUID] = Field(default_factory=list)
    businesses: list[str] = Field(default_factory=list)


class VaultExtraction(BaseModel):
    """Mirror of VaultExtractionSchema (knowledge-vault.ts). Extracted intelligence for one item."""

    model_config = ConfigDict(extra="forbid")

    key_ideas: list[str] = Field(default_factory=list)
    frameworks: list[str] = Field(default_factory=list)
    tactics: list[str] = Field(default_factory=list)
    quotes: list[str] = Field(default_factory=list)
    examples: list[str] = Field(default_factory=list)
    business_applications: list[str] = Field(default_factory=list)
    monetization_opportunities: list[str] = Field(default_factory=list)
    related_businesses: list[str] = Field(default_factory=list)
    related_agents: list[str] = Field(default_factory=list)
    related_assets: list[str] = Field(default_factory=list)
    action_items: list[str] = Field(default_factory=list)


class VaultEntry(BaseModel):
    """Mirror of VaultEntrySchema (knowledge-vault.ts). A stored, converted Vault entry."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    kind: VaultInputKind
    title: str = Field(min_length=1)
    summary: str = ""
    extraction: VaultExtraction
    asset_id: str = Field(min_length=1)
    converted_to_actions: int = Field(default=0, ge=0)
    linked_business_ids: list[UUID] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


# --- Revenue Factory contracts (mirror of packages/shared/src/contracts/revenue-factory.ts) ---

# Mirror of LeadTemperatureSchema.
LeadTemperature = Literal["warm", "cold"]


class FactoryOffer(BaseModel):
    """Mirror of FactoryOfferSchema (revenue-factory.ts). An offer the business sells."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    price_usd: float = Field(ge=0)
    conversion_rate: float = Field(default=0, ge=0, le=1)
    ease: float = Field(default=0.5, ge=0, le=1)


class FactoryContact(BaseModel):
    """Mirror of FactoryContactSchema (revenue-factory.ts). A buyer/lead/contact."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    temperature: LeadTemperature = "cold"
    affinity: float = Field(default=0, ge=0, le=1)
    potential_value_usd: float = Field(default=0, ge=0)
    is_referral_source: bool = False


class FactoryProposal(BaseModel):
    """Mirror of FactoryProposalSchema (revenue-factory.ts). An outstanding proposal."""

    model_config = ConfigDict(extra="forbid")

    contact_name: str = Field(min_length=1)
    offer_name: str = Field(min_length=1)
    value_usd: float = Field(ge=0)
    probability: float = Field(default=0.5, ge=0, le=1)
    age_days: int = Field(default=0, ge=0)


class FactoryFollowUp(BaseModel):
    """Mirror of FactoryFollowUpSchema (revenue-factory.ts). A pending follow-up with revenue."""

    model_config = ConfigDict(extra="forbid")

    contact_name: str = Field(min_length=1)
    value_usd: float = Field(default=0, ge=0)
    effort: float = Field(default=0.5, ge=0, le=1)


class RevenueFactoryInput(BaseModel):
    """Mirror of RevenueFactoryInputSchema (revenue-factory.ts). Per-business revenue snapshot."""

    model_config = ConfigDict(extra="forbid")

    business_id: UUID | None = None
    business_name: str = Field(min_length=1)
    offers: list[FactoryOffer] = Field(default_factory=list)
    contacts: list[FactoryContact] = Field(default_factory=list)
    proposals: list[FactoryProposal] = Field(default_factory=list)
    follow_ups: list[FactoryFollowUp] = Field(default_factory=list)
    booked_calls: int = Field(default=0, ge=0)
    revenue_generated_usd: float = Field(default=0, ge=0)


class RevenueFactoryReport(BaseModel):
    """Mirror of RevenueFactoryReportSchema (revenue-factory.ts). The daily money directive."""

    model_config = ConfigDict(extra="forbid")

    business_name: str = Field(min_length=1)
    fastest_path_to_cash: str = ""
    easiest_offer_to_sell: str | None = None
    best_warm_contact: str | None = None
    lowest_effort_revenue_action: str | None = None
    highest_value_follow_up: str | None = None
    offer_most_likely_to_convert: str | None = None
    todays_money_move: str = Field(min_length=1)
    warm_lead_count: int = Field(default=0, ge=0)
    cold_lead_count: int = Field(default=0, ge=0)
    referral_source_count: int = Field(default=0, ge=0)
    open_proposal_value_usd: float = Field(default=0, ge=0)
    generated_at: datetime


# --- Conversion War Room contracts (mirror of packages/shared/src/contracts/war-room.ts) ---

# Mirror of WarRoomSurfaceSchema. The nine surfaces the War Room optimizes.
WarRoomSurface = Literal[
    "cold_email",
    "social_post",
    "landing_page",
    "dm",
    "sales_script",
    "deck",
    "proposal",
    "checkout_flow",
    "follow_up_sequence",
]


class FunnelMetrics(BaseModel):
    """Mirror of FunnelMetricsSchema (war-room.ts). Full funnel metrics for one variant."""

    model_config = ConfigDict(extra="forbid")

    sent: int = Field(default=0, ge=0)
    opens: int = Field(default=0, ge=0)
    replies: int = Field(default=0, ge=0)
    clicks: int = Field(default=0, ge=0)
    booked_calls: int = Field(default=0, ge=0)
    qualified_leads: int = Field(default=0, ge=0)
    closes: int = Field(default=0, ge=0)
    negative_replies: int = Field(default=0, ge=0)
    revenue_usd: float = Field(default=0, ge=0)
    cash_collected_usd: float = Field(default=0, ge=0)
    time_to_conversion_days: float = Field(default=0, ge=0)


class RateCard(BaseModel):
    """Mirror of RateCardSchema (war-room.ts). A computed rate card derived from funnel metrics."""

    model_config = ConfigDict(extra="forbid")

    open_rate: float = Field(ge=0, le=1)
    reply_rate: float = Field(ge=0, le=1)
    click_rate: float = Field(ge=0, le=1)
    booked_call_rate: float = Field(ge=0, le=1)
    close_rate: float = Field(ge=0, le=1)
    negative_reply_rate: float = Field(ge=0, le=1)
    revenue_per_send_usd: float = Field(ge=0)


class WarRoomTest(BaseModel):
    """Mirror of WarRoomTestSchema (war-room.ts). One A/B test on a surface."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    business_id: UUID | None = None
    surface: WarRoomSurface
    label: str = Field(min_length=1)
    variant_a_label: str = "A"
    variant_b_label: str = "B"
    metrics_a: FunnelMetrics
    metrics_b: FunnelMetrics
    rates_a: RateCard | None = None
    rates_b: RateCard | None = None
    winner: Literal["a", "b"] | None = None
    recommendation: str = ""
    objections: list[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class StartWarRoomTestInput(BaseModel):
    """Mirror of StartWarRoomTestInputSchema (war-room.ts)."""

    model_config = ConfigDict(extra="forbid")

    surface: WarRoomSurface
    label: str = Field(min_length=1)
    business_id: UUID | None = None
    variant_a_label: str = "A"
    variant_b_label: str = "B"


class RecordFunnelInput(BaseModel):
    """Mirror of RecordFunnelInputSchema (war-room.ts)."""

    model_config = ConfigDict(extra="forbid")

    metrics_a: FunnelMetrics
    metrics_b: FunnelMetrics


# --- Deal Desk contracts (mirror of packages/shared/src/contracts/deal-desk.ts) ---

# Mirror of DealStageSchema.
DealStage = Literal[
    "new",
    "qualifying",
    "proposal",
    "negotiation",
    "verbal",
    "won",
    "lost",
]


class Deal(BaseModel):
    """Mirror of DealSchema (deal-desk.ts). A single opportunity tracked on the Deal Desk."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    buyer_contact: str = Field(min_length=1)
    business_id: UUID | None = None
    business_name: str = ""
    offer: str = Field(min_length=1)
    deal_size_usd: float = Field(default=0, ge=0)
    probability: float = Field(default=0.5, ge=0, le=1)
    stage: DealStage = "new"
    next_step: str = ""
    deadline: datetime | None = None
    objections: list[str] = Field(default_factory=list)
    missing_assets: list[str] = Field(default_factory=list)
    follow_up_status: str = "none"
    decision_maker: str = ""
    relationship_notes: str = ""
    risk: float = Field(default=0, ge=0, le=1)
    days_since_activity: int = Field(default=0, ge=0)
    projected_close_date: datetime | None = None
    effort: float = Field(default=0.5, ge=0, le=1)
    strategic_value: float = Field(default=0.5, ge=0, le=1)
    created_at: datetime
    updated_at: datetime


class CreateDealInput(BaseModel):
    """Mirror of CreateDealInputSchema (deal-desk.ts). Input to create a deal."""

    model_config = ConfigDict(extra="forbid")

    buyer_contact: str = Field(min_length=1)
    offer: str = Field(min_length=1)
    business_id: UUID | None = None
    business_name: str = ""
    deal_size_usd: float = Field(default=0, ge=0)
    probability: float = Field(default=0.5, ge=0, le=1)
    stage: DealStage = "new"
    next_step: str = ""
    deadline: datetime | None = None
    objections: list[str] = Field(default_factory=list)
    missing_assets: list[str] = Field(default_factory=list)
    follow_up_status: str = "none"
    decision_maker: str = ""
    relationship_notes: str = ""
    risk: float = Field(default=0, ge=0, le=1)
    days_since_activity: int = Field(default=0, ge=0)
    projected_close_date: datetime | None = None
    effort: float = Field(default=0.5, ge=0, le=1)
    strategic_value: float = Field(default=0.5, ge=0, le=1)


# Mirror of DealRankBySchema. How to rank the desk.
DealRankBy = Literal["probability", "revenue", "speed", "strategic_value", "effort"]


class RankedDeal(BaseModel):
    """Mirror of RankedDealSchema (deal-desk.ts). A ranked deal with its composite and reason."""

    model_config = ConfigDict(extra="forbid")

    deal: Deal
    expected_value_usd: float = Field(ge=0)
    composite_score: float
    reason: str = ""


class DealDeskView(BaseModel):
    """Mirror of DealDeskViewSchema (deal-desk.ts). The desk view."""

    model_config = ConfigDict(extra="forbid")

    ranked: list[RankedDeal] = Field(default_factory=list)
    next_money_move: str = Field(min_length=1)
    blocked_deals: list[Deal] = Field(default_factory=list)
    deals_likely_to_die: list[Deal] = Field(default_factory=list)
    weighted_pipeline_usd: float = Field(default=0, ge=0)
    generated_at: datetime


# --- Agent Evaluation Lab contracts (mirror of packages/shared/src/contracts/agent-eval.ts) ---

# Mirror of AgentEvalStageSchema. The promotion ladder.
AgentEvalStage = Literal[
    "draft",
    "testing",
    "limited_use",
    "approved",
    "production",
    "retired",
]


class AgentTestCase(BaseModel):
    """Mirror of AgentTestCaseSchema (agent-eval.ts). One test task with its expected output."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    input: str = ""
    expected_output: str = ""
    is_failure_case: bool = False
    risk_check: str = ""


class TestRunResult(BaseModel):
    """Mirror of TestRunResultSchema (agent-eval.ts). The observed result of running one test case."""

    model_config = ConfigDict(extra="forbid")

    case_name: str = Field(min_length=1)
    passed: bool
    risk_flagged: bool = False
    cost_usd: float = Field(default=0, ge=0)
    runtime_ms: float = Field(default=0, ge=0)
    usefulness: float = Field(default=0, ge=0, le=1)


class EvalScores(BaseModel):
    """Mirror of EvalScoresSchema (agent-eval.ts). The five scores, each 0..1."""

    model_config = ConfigDict(extra="forbid")

    accuracy: float = Field(ge=0, le=1)
    usefulness: float = Field(ge=0, le=1)
    cost: float = Field(ge=0, le=1)
    speed: float = Field(ge=0, le=1)
    reliability: float = Field(ge=0, le=1)


class AgentEvaluation(BaseModel):
    """Mirror of AgentEvaluationSchema (agent-eval.ts). An agent's evaluation record."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    agent_key: str = Field(min_length=1)
    stage: AgentEvalStage = "draft"
    test_cases: list[AgentTestCase] = Field(default_factory=list)
    scores: EvalScores | None = None
    passed: bool = False
    pass_threshold: float = Field(default=0.8, ge=0, le=1)
    broad_permissions_allowed: bool = False
    notes: str = ""
    created_at: datetime
    updated_at: datetime


class RegisterAgentEvalInput(BaseModel):
    """Mirror of RegisterAgentEvalInputSchema (agent-eval.ts)."""

    model_config = ConfigDict(extra="forbid")

    agent_key: str = Field(min_length=1)
    test_cases: list[AgentTestCase] = Field(min_length=1)
    pass_threshold: float = Field(default=0.8, ge=0, le=1)


class RunEvalInput(BaseModel):
    """Mirror of RunEvalInputSchema (agent-eval.ts)."""

    model_config = ConfigDict(extra="forbid")

    results: list[TestRunResult] = Field(min_length=1)


# --- Planes contracts (mirror of packages/shared/src/contracts/planes.ts) ---

# Mirror of PlaneSchema.
Plane = Literal["control", "execution"]

# Mirror of ControlConcernSchema. The ten Control Plane concerns.
ControlConcern = Literal[
    "policy",
    "identity",
    "permissions",
    "approvals",
    "routing",
    "evaluations",
    "observability",
    "audit_logs",
    "cost_controls",
    "risk_controls",
]

# Mirror of ExecutionConcernSchema. The eight Execution Plane concerns.
ExecutionConcern = Literal[
    "agents",
    "workflows",
    "automations",
    "connectors",
    "tools",
    "campaigns",
    "repo_actions",
    "content_generation",
]


class PlaneAssignment(BaseModel):
    """Mirror of PlaneAssignmentSchema (planes.ts). A capability tagged with its plane."""

    model_config = ConfigDict(extra="forbid")

    capability: str = Field(min_length=1)
    plane: Plane
    concern: str = Field(min_length=1)
    engine_module: str = ""


class ExecutionRequest(BaseModel):
    """Mirror of ExecutionRequestSchema (planes.ts). An execution-plane action requesting to run."""

    model_config = ConfigDict(extra="forbid")

    capability: str = Field(min_length=1)
    concern: ExecutionConcern
    identity_verified: bool = False
    policy_checked: bool = False
    permitted: bool = False
    approved: bool | None = None


class PlaneDecision(BaseModel):
    """Mirror of PlaneDecisionSchema (planes.ts). The Control Plane's verdict."""

    model_config = ConfigDict(extra="forbid")

    allowed: bool
    bypass_attempt: bool
    missing_gates: list[str] = Field(default_factory=list)
    reason: str = Field(min_length=1)


# --- Cost & Token CFO contracts (mirror of packages/shared/src/contracts/cost-cfo.ts) ---

# Mirror of CostCategorySchema. The six cost categories.
CostCategory = Literal[
    "model",
    "api",
    "automation",
    "tool_subscription",
    "compute",
    "storage",
]

# Mirror of CfoRecommendationSchema. The recommendations the CFO can make.
CfoRecommendation = Literal[
    "cheaper_model",
    "better_workflow",
    "pause_expensive_agent",
    "batch_processing",
    "local_model",
    "upgrade_when_roi_supports",
]


class CostBreakdown(BaseModel):
    """Mirror of CostBreakdownSchema (cost-cfo.ts). Per-category spend for a workflow."""

    model_config = ConfigDict(extra="forbid")

    model: float = Field(default=0, ge=0)
    api: float = Field(default=0, ge=0)
    automation: float = Field(default=0, ge=0)
    tool_subscription: float = Field(default=0, ge=0)
    compute: float = Field(default=0, ge=0)
    storage: float = Field(default=0, ge=0)


class WorkflowCostInput(BaseModel):
    """Mirror of WorkflowCostInputSchema (cost-cfo.ts). A workflow's costs and what it produced."""

    model_config = ConfigDict(extra="forbid")

    workflow_name: str = Field(min_length=1)
    business_id: UUID | None = None
    costs: CostBreakdown
    human_time_saved_hours: float = Field(default=0, ge=0)
    human_hourly_rate_usd: float = Field(default=75, ge=0)
    revenue_created_usd: float = Field(default=0, ge=0)
    tasks: int = Field(default=0, ge=0)
    leads: int = Field(default=0, ge=0)
    booked_calls: int = Field(default=0, ge=0)
    sales: int = Field(default=0, ge=0)


class WorkflowCostReport(BaseModel):
    """Mirror of WorkflowCostReportSchema (cost-cfo.ts). The CFO report for a workflow."""

    model_config = ConfigDict(extra="forbid")

    workflow_name: str = Field(min_length=1)
    total_cost_usd: float = Field(ge=0)
    value_usd: float = Field(ge=0)
    cost_per_task: float | None = Field(default=None, ge=0)
    cost_per_lead: float | None = Field(default=None, ge=0)
    cost_per_booked_call: float | None = Field(default=None, ge=0)
    cost_per_sale: float | None = Field(default=None, ge=0)
    roi: float | None = None
    break_even_revenue_usd: float = Field(ge=0)
    largest_cost_category: CostCategory | None = None
    recommendations: list[CfoRecommendation] = Field(default_factory=list)
    rationale: str = ""
    generated_at: datetime


# --- Business Simulation contracts (mirror of packages/shared/src/contracts/business-simulation.ts) ---

# Mirror of BizDecisionKindSchema. The six decision kinds.
BizDecisionKind = Literal[
    "focus_choice",
    "campaign_choice",
    "hire_vs_automate",
    "pricing_choice",
    "lead_focus",
    "build_vs_sell",
]


class DecisionOption(BaseModel):
    """Mirror of DecisionOptionSchema (business-simulation.ts). One option being weighed."""

    model_config = ConfigDict(extra="forbid")

    label: str = Field(min_length=1)
    projected_revenue_usd: float = Field(default=0, ge=0)
    probability: float = Field(default=0.5, ge=0, le=1)
    time_cost_days: float = Field(default=0, ge=0)
    stress_cost: float = Field(default=0, ge=0, le=1)
    risk: float = Field(default=0, ge=0, le=1)


class OptionOutcome(BaseModel):
    """Mirror of OptionOutcomeSchema (business-simulation.ts). An option's projected outcome."""

    model_config = ConfigDict(extra="forbid")

    label: str = Field(min_length=1)
    best_case_usd: float
    likely_case_usd: float
    worst_case_usd: float
    expected_value_usd: float
    risk: float = Field(ge=0, le=1)
    time_cost_days: float = Field(ge=0)
    stress_cost: float = Field(ge=0, le=1)
    score: float


class SimulateDecisionInput(BaseModel):
    """Mirror of SimulateDecisionInputSchema (business-simulation.ts)."""

    model_config = ConfigDict(extra="forbid")

    kind: BizDecisionKind
    question: str = ""
    option_a: DecisionOption
    option_b: DecisionOption


class BusinessSimulation(BaseModel):
    """Mirror of BusinessSimulationSchema (business-simulation.ts). The head-to-head result."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    kind: BizDecisionKind
    question: str = ""
    a: OptionOutcome
    b: OptionOutcome
    recommendation: str = Field(min_length=1)
    reason: str = Field(min_length=1)
    created_at: datetime


# --- Commercialization contracts (mirror of packages/shared/src/contracts/commercialization.ts) ---

# Mirror of CommercializationTierSchema. The five commercialization tiers.
CommercializationTier = Literal[
    "personal_only",
    "business_reusable",
    "founder_saas_feature",
    "agency_service",
    "enterprise_product",
]


class FeatureClassification(BaseModel):
    """Mirror of FeatureClassificationSchema (commercialization.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    feature_name: str = Field(min_length=1)
    tier: CommercializationTier
    saas_module_candidate: bool = False
    rationale: str = ""
    readiness: float = Field(default=0, ge=0, le=1)
    commercialized: bool = False
    created_at: datetime
    updated_at: datetime


class ClassifyFeatureInput(BaseModel):
    """Mirror of ClassifyFeatureInputSchema (commercialization.ts)."""

    model_config = ConfigDict(extra="forbid")

    feature_name: str = Field(min_length=1)
    tier: CommercializationTier
    saas_module_candidate: bool = False
    rationale: str = ""
    readiness: float = Field(default=0, ge=0, le=1)


# --- Founder Principle contracts (mirror of packages/shared/src/contracts/founder-principle.ts) ---

# Mirror of IdeaDispositionKindSchema. The eight dispositions every idea must resolve into.
IdeaDispositionKind = Literal[
    "task",
    "asset",
    "campaign",
    "offer",
    "agent",
    "workflow",
    "parked_idea",
    "killed_idea",
]


class IdeaSignals(BaseModel):
    """Mirror of IdeaSignalsSchema (founder-principle.ts). Signals used to route an idea."""

    model_config = ConfigDict(extra="forbid")

    value: float = Field(default=0.5, ge=0, le=1)
    revenue_linked: bool = False
    recurring: bool = False
    reusable: bool = False
    actionable_now: bool = False


class IdeaDisposition(BaseModel):
    """Mirror of IdeaDispositionSchema (founder-principle.ts). A routed idea."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    idea: str = Field(min_length=1)
    disposition: IdeaDispositionKind
    reason: str = Field(min_length=1)
    business_id: UUID | None = None
    created_at: datetime


class BusinessNextActions(BaseModel):
    """Mirror of BusinessNextActionsSchema (founder-principle.ts). The five next-actions."""

    model_config = ConfigDict(extra="forbid")

    business_name: str = Field(min_length=1)
    next_money_action: str = Field(min_length=1)
    next_risk_action: str = Field(min_length=1)
    next_follow_up_action: str = Field(min_length=1)
    next_asset_to_build: str = Field(min_length=1)
    next_conversion_improvement: str = Field(min_length=1)
    generated_at: datetime


class NextActionsInput(BaseModel):
    """Mirror of NextActionsInputSchema (founder-principle.ts). A per-business snapshot."""

    model_config = ConfigDict(extra="forbid")

    business_name: str = Field(min_length=1)
    money_candidate: str = ""
    risk_candidate: str = ""
    follow_up_candidate: str = ""
    asset_gap: str = ""
    conversion_candidate: str = ""


# Mirror of OptimizationPrioritySchema. The system's optimization priority, highest first.
OptimizationPriority = Literal[
    "cash",
    "conversion",
    "follow_up",
    "risk_control",
    "execution_speed",
    "founder_energy",
    "reusable_ip",
]


# --- constitution.ts mirror ---

# Mirror of PrincipleIdSchema. The ten constitutional principle ids, in order.
PrincipleId = Literal[
    "human_in_command",
    "think_aggressively",
    "act_conservatively",
    "execute_with_urgency",
    "finish_what_started",
    "protect_trust",
    "optimize_measurable_outcomes",
    "reuse_before_rebuilding",
    "explain_important_decisions",
    "continuously_improve",
]


class ConstitutionPrinciple(BaseModel):
    """Mirror of ConstitutionPrincipleSchema (constitution.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: PrincipleId
    number: int = Field(ge=1, le=10)
    title: str = Field(min_length=1)
    text: str = Field(min_length=1)


class ConstitutionCheckInput(BaseModel):
    """Mirror of ConstitutionCheckInputSchema (constitution.ts)."""

    model_config = ConfigDict(extra="forbid")

    description: str = Field(min_length=1)
    irreversible: bool = False
    approved: bool = False
    touches_trust: bool = False
    abandons_approved_work: bool = False
    documented_reason: str = ""
    has_explanation: bool = False
    improves_outcome: bool = False


class PrincipleVerdict(BaseModel):
    """Mirror of PrincipleVerdictSchema (constitution.ts)."""

    model_config = ConfigDict(extra="forbid")

    principle: PrincipleId
    upheld: bool
    note: str = Field(min_length=1)


class ConstitutionVerdict(BaseModel):
    """Mirror of ConstitutionVerdictSchema (constitution.ts)."""

    model_config = ConfigDict(extra="forbid")

    compliant: bool
    verdicts: list[PrincipleVerdict] = Field(default_factory=list)
    violations: list[PrincipleId] = Field(default_factory=list)
    requires_approval: bool
    summary: str = Field(min_length=1)


# --- hierarchy.ts mirror ---

# Mirror of HierarchyLevelSchema. The eight hierarchy levels, top to bottom.
HierarchyLevel = Literal[
    "enterprise",
    "company",
    "department",
    "team",
    "project",
    "asset",
    "task",
    "agent",
]


class InheritablePolicy(BaseModel):
    """Mirror of InheritablePolicySchema (hierarchy.ts)."""

    model_config = ConfigDict(extra="forbid")

    policies: list[str] = Field(default_factory=list)
    security_level: str = ""
    branding: str = ""
    permissions: list[str] = Field(default_factory=list)
    shared_assets: list[str] = Field(default_factory=list)
    vendors: list[str] = Field(default_factory=list)
    sops: list[str] = Field(default_factory=list)
    compliance: list[str] = Field(default_factory=list)


class HierarchyNode(BaseModel):
    """Mirror of HierarchyNodeSchema (hierarchy.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    level: HierarchyLevel
    name: str = Field(min_length=1)
    parent_id: UUID | None = None
    own: InheritablePolicy = Field(default_factory=InheritablePolicy)
    created_at: datetime
    updated_at: datetime


class CreateHierarchyNodeInput(BaseModel):
    """Mirror of CreateHierarchyNodeInputSchema (hierarchy.ts)."""

    model_config = ConfigDict(extra="forbid")

    level: HierarchyLevel
    name: str = Field(min_length=1)
    parent_id: UUID | None = None
    own: InheritablePolicy = Field(default_factory=InheritablePolicy)


class ResolvedNode(BaseModel):
    """Mirror of ResolvedNodeSchema (hierarchy.ts)."""

    model_config = ConfigDict(extra="forbid")

    node: HierarchyNode
    effective: InheritablePolicy
    ancestry: list[str] = Field(default_factory=list)


# --- reflection.ts mirror ---

# Mirror of ReflectionPeriodSchema.
ReflectionPeriod = Literal["weekly", "monthly", "quarterly", "yearly"]


class ReflectionInput(BaseModel):
    """Mirror of ReflectionInputSchema (reflection.ts)."""

    model_config = ConfigDict(extra="forbid")

    period: ReflectionPeriod
    period_label: str = ""
    revenue_created_usd: float = 0
    opportunities_missed: int = Field(default=0, ge=0)
    follow_up_failures: int = Field(default=0, ge=0)
    automation_performance: dict[str, float] = Field(default_factory=dict)
    agent_performance: dict[str, float] = Field(default_factory=dict)
    workflow_bottlenecks: list[str] = Field(default_factory=list)
    time_allocation: dict[str, float] = Field(default_factory=dict)
    energy_notes: list[str] = Field(default_factory=list)
    decision_quality: float = Field(default=0.5, ge=0, le=1)
    goals_progressed: int = Field(default=0, ge=0)
    goals_total: int = Field(default=0, ge=0)


class ReflectionReport(BaseModel):
    """Mirror of ReflectionReportSchema (reflection.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    period: ReflectionPeriod
    period_label: str = ""
    lessons_learned: list[str] = Field(default_factory=list)
    recommended_improvements: list[str] = Field(default_factory=list)
    workflows_to_automate: list[str] = Field(default_factory=list)
    workflows_to_retire: list[str] = Field(default_factory=list)
    new_agents_to_build: list[str] = Field(default_factory=list)
    risks_to_address: list[str] = Field(default_factory=list)
    next_period_priorities: list[str] = Field(default_factory=list)
    summary: str = Field(min_length=1)
    created_at: datetime


# --- knowledge-graph.ts mirror ---

# Mirror of GraphNodeKindSchema. The fifteen node kinds.
GraphNodeKind = Literal[
    "person",
    "business",
    "project",
    "task",
    "document",
    "asset",
    "meeting",
    "github_repo",
    "automation",
    "goal",
    "workflow",
    "agent",
    "vendor",
    "investor",
    "competitor",
]


class GraphNode(BaseModel):
    """Mirror of GraphNodeSchema (knowledge-graph.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    kind: GraphNodeKind
    name: str = Field(min_length=1)
    ref_id: str = ""
    tags: list[str] = Field(default_factory=list)
    created_at: datetime


class GraphEdge(BaseModel):
    """Mirror of GraphEdgeSchema (knowledge-graph.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    from_id: UUID
    to_id: UUID
    relationship: str = Field(min_length=1)
    weight: float = Field(default=0.5, ge=0, le=1)
    created_at: datetime


class GraphQuery(BaseModel):
    """Mirror of GraphQuerySchema (knowledge-graph.ts)."""

    model_config = ConfigDict(extra="forbid")

    kinds: list[GraphNodeKind] = Field(default_factory=list)
    terms: list[str] = Field(default_factory=list)


class GraphNeighborhood(BaseModel):
    """Mirror of GraphNeighborhoodSchema (knowledge-graph.ts)."""

    model_config = ConfigDict(extra="forbid")

    node: GraphNode
    edges: list[GraphEdge] = Field(default_factory=list)
    neighbors: list[GraphNode] = Field(default_factory=list)


class GraphRecommendation(BaseModel):
    """Mirror of GraphRecommendationSchema (knowledge-graph.ts)."""

    model_config = ConfigDict(extra="forbid")

    from_name: str = Field(min_length=1)
    to_name: str = Field(min_length=1)
    suggested_relationship: str = Field(min_length=1)
    reason: str = Field(min_length=1)
    score: float = Field(ge=0, le=1)


# --- operating-manual.ts mirror ---

# Mirror of ManualArtifactKindSchema. The eight manual artifacts.
ManualArtifactKind = Literal[
    "sop",
    "checklist",
    "playbook",
    "onboarding_guide",
    "training_document",
    "troubleshooting_guide",
    "kpis",
    "ownership_matrix",
]


class ManualArtifact(BaseModel):
    """Mirror of ManualArtifactSchema (operating-manual.ts)."""

    model_config = ConfigDict(extra="forbid")

    kind: ManualArtifactKind
    title: str = Field(min_length=1)
    asset_id: str = Field(min_length=1)
    outline: list[str] = Field(default_factory=list)


class GenerateManualInput(BaseModel):
    """Mirror of GenerateManualInputSchema (operating-manual.ts)."""

    model_config = ConfigDict(extra="forbid")

    workflow_name: str = Field(min_length=1)
    business_id: UUID | None = None
    purpose: str = ""
    steps: list[str] = Field(default_factory=list)
    owners: list[str] = Field(default_factory=list)
    kpis: list[str] = Field(default_factory=list)
    is_stable: bool = True


class OperatingManual(BaseModel):
    """Mirror of OperatingManualSchema (operating-manual.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    workflow_name: str = Field(min_length=1)
    business_id: UUID | None = None
    artifacts: list[ManualArtifact] = Field(default_factory=list)
    reusable_ip: bool = True
    created_at: datetime
    updated_at: datetime


# --- digital-twin.ts mirror ---


class TwinState(BaseModel):
    """Mirror of TwinStateSchema (digital-twin.ts)."""

    model_config = ConfigDict(extra="forbid")

    businesses: int = Field(default=0, ge=0)
    cash_usd: float = 0
    monthly_revenue_usd: float = Field(default=0, ge=0)
    monthly_burn_usd: float = Field(default=0, ge=0)
    assets: int = Field(default=0, ge=0)
    contacts: int = Field(default=0, ge=0)
    active_projects: int = Field(default=0, ge=0)
    active_agents: int = Field(default=0, ge=0)
    active_workflows: int = Field(default=0, ge=0)
    active_campaigns: int = Field(default=0, ge=0)
    active_goals: int = Field(default=0, ge=0)
    open_risks: int = Field(default=0, ge=0)


class TwinSnapshot(BaseModel):
    """Mirror of TwinSnapshotSchema (digital-twin.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    state: TwinState
    runway_months: float | None = None
    captured_at: datetime


# Mirror of TwinScenarioKindSchema. The supported what-if simulation kinds.
TwinScenarioKind = Literal["hire", "pause_business", "revenue_drop", "launch_offer"]


class TwinSimulationInput(BaseModel):
    """Mirror of TwinSimulationInputSchema (digital-twin.ts)."""

    model_config = ConfigDict(extra="forbid")

    kind: TwinScenarioKind
    hire_monthly_cost_usd: float = Field(default=0, ge=0)
    paused_revenue_usd: float = Field(default=0, ge=0)
    paused_burn_usd: float = Field(default=0, ge=0)
    revenue_drop_fraction: float = Field(default=0.3, ge=0, le=1)
    offer_monthly_revenue_usd: float = Field(default=0, ge=0)
    offer_monthly_cost_usd: float = Field(default=0, ge=0)


class TwinSimulationResult(BaseModel):
    """Mirror of TwinSimulationResultSchema (digital-twin.ts)."""

    model_config = ConfigDict(extra="forbid")

    kind: TwinScenarioKind
    projected_state: TwinState
    projected_runway_months: float | None = None
    revenue_delta_usd: float
    burn_delta_usd: float
    narrative: str = Field(min_length=1)
    recommendation: str = Field(min_length=1)


# --- institutional-memory.ts mirror ---

# Mirror of InstitutionalRecordKindSchema. The nine kinds of institutional record.
InstitutionalRecordKind = Literal[
    "decision_rationale",
    "rejected_idea",
    "failed_experiment",
    "successful_experiment",
    "negotiation_outcome",
    "lesson_learned",
    "vendor_experience",
    "client_preference",
    "implementation_history",
]


class InstitutionalRecord(BaseModel):
    """Mirror of InstitutionalRecordSchema (institutional-memory.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    kind: InstitutionalRecordKind
    title: str = Field(min_length=1)
    detail: str = ""
    what_we_knew: str = ""
    why_chosen: str = ""
    alternatives_rejected: list[str] = Field(default_factory=list)
    business_id: UUID | None = None
    tags: list[str] = Field(default_factory=list)
    created_at: datetime


class CaptureRecordInput(BaseModel):
    """Mirror of CaptureRecordInputSchema (institutional-memory.ts)."""

    model_config = ConfigDict(extra="forbid")

    kind: InstitutionalRecordKind
    title: str = Field(min_length=1)
    detail: str = ""
    what_we_knew: str = ""
    why_chosen: str = ""
    alternatives_rejected: list[str] = Field(default_factory=list)
    business_id: UUID | None = None
    tags: list[str] = Field(default_factory=list)


# --- mission-control.ts mirror ---

# §28 read-model (Release 1)

MissionControlAlertSeverity = Literal["info", "warn", "critical"]
MissionControlAlertCategory = Literal[
    "revenue", "cash", "risk", "agent", "approval", "health", "launch"
]
MissionControlAlertStatus = Literal["open", "acknowledged", "escalated", "resolved"]


class MissionControlAlert(BaseModel):
    """Mirror of MissionControlAlertSchema (mission-control.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    business_id: UUID | None = None
    severity: MissionControlAlertSeverity
    category: MissionControlAlertCategory
    title: str
    detail: str = ""
    source_ref: str = ""
    requires_approval: bool = False
    routed_to: str = "mission_control"
    status: MissionControlAlertStatus = "open"
    created_at: datetime
    updated_at: str | None = None


class MissionControlPriority(BaseModel):
    """Mirror of MissionControlPrioritySchema (mission-control.ts)."""

    model_config = ConfigDict(extra="forbid")

    rank: int = Field(ge=1, le=3)
    title: str
    why: str = ""
    category: MissionControlAlertCategory


class MissionControlSnapshot(BaseModel):
    """Mirror of MissionControlSnapshotSchema (mission-control.ts, §28 read-model)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    business_id: UUID | None = None
    as_of: datetime
    revenue_today: float = 0
    cash_position: float = 0
    cash_runway_days: float | None = None
    kpi_status: dict[str, Any] = Field(default_factory=dict)
    approval_queue: list[dict[str, Any]] = Field(default_factory=list)
    critical_alerts: list[MissionControlAlert] = Field(default_factory=list)
    blocked_tasks: list[dict[str, Any]] = Field(default_factory=list)
    active_builds: list[dict[str, Any]] = Field(default_factory=list)
    agent_activity: dict[str, Any] = Field(default_factory=dict)
    department_health: dict[str, Any] = Field(default_factory=dict)
    business_health: dict[str, Any] = Field(default_factory=dict)
    follow_ups_due: list[dict[str, Any]] = Field(default_factory=list)
    meetings: list[dict[str, Any]] = Field(default_factory=list)
    risk_alerts: list[MissionControlAlert] = Field(default_factory=list)
    founder_capacity: dict[str, Any] = Field(default_factory=dict)
    top_priorities: list[MissionControlPriority] = Field(default_factory=list)
    revenue_opportunities: list[dict[str, Any]] = Field(default_factory=list)
    launch_readiness: dict[str, Any] = Field(default_factory=dict)
    open_loops: list[dict[str, Any]] = Field(default_factory=list)
    created_at: datetime


# Earlier reading-snapshot placeholder (superseded by the §28 read-model above; kept in lockstep
# with the MissionControlReading* Zod exports so the original mission smoke + fixtures still validate).


class HealthReading(BaseModel):
    """Mirror of HealthReadingSchema (mission-control.ts)."""

    model_config = ConfigDict(extra="forbid")

    score: float = Field(ge=0, le=1)
    label: str = Field(min_length=1)


class MissionControlReadingInput(BaseModel):
    """Mirror of MissionControlReadingInputSchema (mission-control.ts)."""

    model_config = ConfigDict(extra="forbid")

    enterprise_health: float = Field(default=0.5, ge=0, le=1)
    company_health: dict[str, float] = Field(default_factory=dict)
    revenue_mtd_usd: float = 0
    weighted_pipeline_usd: float = Field(default=0, ge=0)
    cash_usd: float = 0
    monthly_burn_usd: float = Field(default=0, ge=0)
    active_goals: int = Field(default=0, ge=0)
    blocked_items: int = Field(default=0, ge=0)
    open_risks: int = Field(default=0, ge=0)
    approvals_waiting: int = Field(default=0, ge=0)
    top_opportunities: list[str] = Field(default_factory=list)
    agent_health: float = Field(default=1, ge=0, le=1)
    automation_health: float = Field(default=1, ge=0, le=1)
    system_health: float = Field(default=1, ge=0, le=1)
    ai_cost_mtd_usd: float = Field(default=0, ge=0)
    roi: float | None = None
    daily_priorities: list[str] = Field(default_factory=list)


class MissionControlReadingSnapshot(BaseModel):
    """Mirror of MissionControlReadingSnapshotSchema (mission-control.ts)."""

    model_config = ConfigDict(extra="forbid")

    tenant_id: UUID
    enterprise_health: HealthReading
    company_health: dict[str, HealthReading] = Field(default_factory=dict)
    revenue_mtd_usd: float
    weighted_pipeline_usd: float = Field(ge=0)
    cash_usd: float
    runway_months: float | None = None
    active_goals: int = Field(ge=0)
    blocked_items: int = Field(ge=0)
    open_risks: int = Field(ge=0)
    approvals_waiting: int = Field(ge=0)
    top_opportunities: list[str] = Field(default_factory=list)
    agent_health: HealthReading
    automation_health: HealthReading
    system_health: HealthReading
    ai_cost_mtd_usd: float = Field(ge=0)
    roi: float | None = None
    daily_priorities: list[str] = Field(default_factory=list)
    headline: str = Field(min_length=1)
    generated_at: datetime


# --- continuous-improvement.ts mirror ---

# Mirror of ImprovementActionSchema. The six improvement actions.
ImprovementAction = Literal[
    "simplify",
    "automate",
    "remove",
    "merge",
    "split",
    "delegate",
]


class ImprovementMetrics(BaseModel):
    """Mirror of ImprovementMetricsSchema (continuous-improvement.ts)."""

    model_config = ConfigDict(extra="forbid")

    speed: float = Field(default=0.5, ge=0, le=1)
    quality: float = Field(default=0.5, ge=0, le=1)
    cost_efficiency: float = Field(default=0.5, ge=0, le=1)
    conversion: float = Field(default=0.5, ge=0, le=1)
    reliability: float = Field(default=0.5, ge=0, le=1)
    user_ease: float = Field(default=0.5, ge=0, le=1)


class EvaluateWorkflowInput(BaseModel):
    """Mirror of EvaluateWorkflowInputSchema (continuous-improvement.ts)."""

    model_config = ConfigDict(extra="forbid")

    workflow_name: str = Field(min_length=1)
    business_id: UUID | None = None
    metrics: ImprovementMetrics
    manual_steps: int = Field(default=0, ge=0)
    overlaps_another: bool = False
    does_multiple_jobs: bool = False
    low_value: bool = False


class ImprovementRecommendation(BaseModel):
    """Mirror of ImprovementRecommendationSchema (continuous-improvement.ts)."""

    model_config = ConfigDict(extra="forbid")

    action: ImprovementAction
    rationale: str = Field(min_length=1)
    expected_impact: float = Field(ge=0, le=1)
    confidence: float = Field(ge=0, le=1)


class WorkflowEvaluation(BaseModel):
    """Mirror of WorkflowEvaluationSchema (continuous-improvement.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    workflow_name: str = Field(min_length=1)
    metrics: ImprovementMetrics
    health_score: float = Field(ge=0, le=1)
    recommendations: list[ImprovementRecommendation] = Field(default_factory=list)
    created_at: datetime


# --- builder-mode.ts mirror ---

# Mirror of BuilderStageSchema. The eighteen build stages, in order.
BuilderStage = Literal[
    "discovery",
    "market_validation",
    "offer_design",
    "pricing",
    "business_model",
    "brand",
    "product_architecture",
    "technical_architecture",
    "database",
    "agent_plan",
    "asset_checklist",
    "legal",
    "marketing_plan",
    "sales_plan",
    "automation_plan",
    "launch_plan",
    "kpis",
    "review_checkpoints",
]


class BuilderStageOutput(BaseModel):
    """Mirror of BuilderStageOutputSchema (builder-mode.ts)."""

    model_config = ConfigDict(extra="forbid")

    stage: BuilderStage
    title: str = Field(min_length=1)
    summary: str = Field(min_length=1)
    items: list[str] = Field(default_factory=list)
    open_questions: list[str] = Field(default_factory=list)


class StartBuildInput(BaseModel):
    """Mirror of StartBuildInputSchema (builder-mode.ts)."""

    model_config = ConfigDict(extra="forbid")

    idea: str = Field(min_length=1)
    business_name: str = ""
    target_market: str = ""


class VentureBlueprint(BaseModel):
    """Mirror of VentureBlueprintSchema (builder-mode.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    idea: str = Field(min_length=1)
    business_name: str = ""
    stages: list[BuilderStageOutput] = Field(default_factory=list)
    status: Literal["awaiting_approval", "approved"] = "awaiting_approval"
    created_at: datetime
    updated_at: datetime


# --- Finance Command Center contracts (mirror of packages/shared/src/contracts/finance-command.ts) ---


class BusinessFinanceInput(BaseModel):
    """Mirror of BusinessFinanceInputSchema (finance-command.ts)."""

    model_config = ConfigDict(extra="forbid")

    business_name: str = Field(min_length=1)
    monthly_revenue_usd: float = Field(default=0, ge=0)
    monthly_expenses_usd: float = Field(default=0, ge=0)
    cash_on_hand_usd: float = 0
    tax_rate: float = Field(default=0.25, ge=0, le=1)
    receivables_usd: float = Field(default=0, ge=0)
    payables_usd: float = Field(default=0, ge=0)


class PersonalFinanceInput(BaseModel):
    """Mirror of PersonalFinanceInputSchema (finance-command.ts)."""

    model_config = ConfigDict(extra="forbid")

    monthly_income_usd: float = Field(default=0, ge=0)
    monthly_expenses_usd: float = Field(default=0, ge=0)
    savings_usd: float = Field(default=0, ge=0)
    debt_usd: float = Field(default=0, ge=0)
    investments_usd: float = Field(default=0, ge=0)
    subscriptions_usd: float = Field(default=0, ge=0)
    goals: list[str] = Field(default_factory=list)


class FinanceCommandInput(BaseModel):
    """Mirror of FinanceCommandInputSchema (finance-command.ts)."""

    model_config = ConfigDict(extra="forbid")

    businesses: list[BusinessFinanceInput] = Field(default_factory=list)
    personal: PersonalFinanceInput = Field(default_factory=PersonalFinanceInput)


class BusinessFinanceReport(BaseModel):
    """Mirror of BusinessFinanceReportSchema (finance-command.ts)."""

    model_config = ConfigDict(extra="forbid")

    business_name: str = Field(min_length=1)
    monthly_revenue_usd: float
    monthly_expenses_usd: float
    monthly_profit_usd: float
    profit_margin: float
    tax_exposure_usd: float = Field(ge=0)
    cash_runway_months: float | None = None
    best_next_financial_action: str = Field(min_length=1)
    risks: list[str] = Field(default_factory=list)
    opportunities: list[str] = Field(default_factory=list)


class FinanceOverview(BaseModel):
    """Mirror of FinanceOverviewSchema (finance-command.ts)."""

    model_config = ConfigDict(extra="forbid")

    tenant_id: UUID
    total_monthly_revenue_usd: float
    total_monthly_expenses_usd: float
    net_cash_flow_usd: float
    total_tax_exposure_usd: float = Field(ge=0)
    businesses: list[BusinessFinanceReport] = Field(default_factory=list)
    personal_net_worth_usd: float
    personal_monthly_net_usd: float
    headline: str = Field(min_length=1)
    money_actions_require_approval: Literal[True] = True
    generated_at: datetime


# --- Tax Strategy Analyzer contracts (mirror of packages/shared/src/contracts/tax-strategy.ts) ---

# Mirror of TaxStrategyAreaSchema. The fifteen tax-strategy areas.
TaxStrategyArea = Literal[
    "entity_election",
    "holding_company",
    "subsidiary_structure",
    "owner_compensation",
    "deductible_expenses",
    "retirement_vehicles",
    "self_directed_ira",
    "trusts",
    "estate_planning",
    "asset_protection",
    "state_tax",
    "federal_tax",
    "international_offshore",
    "bookkeeping_gaps",
    "compliance_deadlines",
]

# Mirror of RiskLevelSchema (tax-strategy.ts). Reused by entity-structure and money-game.
RiskLevel = Literal["low", "medium", "high"]

# Mirror of ComplexitySchema (tax-strategy.ts). Reused by money-game.
Complexity = Literal["low", "medium", "high"]


class TaxAnalysisInput(BaseModel):
    """Mirror of TaxAnalysisInputSchema (tax-strategy.ts)."""

    model_config = ConfigDict(extra="forbid")

    subject: str = Field(min_length=1)
    is_business: bool = True
    annual_revenue_usd: float = Field(default=0, ge=0)
    annual_profit_usd: float = 0
    owner_count: int = Field(default=1, gt=0)
    has_payroll: bool = False
    state: str = ""
    focus_areas: list[TaxStrategyArea] = Field(default_factory=list)


class TaxRecommendation(BaseModel):
    """Mirror of TaxRecommendationSchema (tax-strategy.ts)."""

    model_config = ConfigDict(extra="forbid")

    area: TaxStrategyArea
    title: str = Field(min_length=1)
    why_it_may_apply: str = Field(min_length=1)
    estimated_benefit: str = ""
    risk_level: RiskLevel
    complexity: Complexity
    requires_professional_review: Literal[True] = True
    documents_needed: list[str] = Field(default_factory=list)
    next_step: str = Field(min_length=1)
    questions_for_advisor: list[str] = Field(default_factory=list)


class TaxAnalysis(BaseModel):
    """Mirror of TaxAnalysisSchema (tax-strategy.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    subject: str = Field(min_length=1)
    recommendations: list[TaxRecommendation] = Field(default_factory=list)
    disclaimer: str = Field(min_length=1)
    created_at: datetime


# --- Entity Structure Optimizer contracts (mirror of packages/shared/src/contracts/entity-structure.ts) ---

# Mirror of EntityStructureSchema.
EntityStructure = Literal[
    "sole_prop",
    "llc",
    "llc_s_corp",
    "c_corp",
    "holding_company",
    "subsidiary_under_holding",
]


class EntityAnalysisInput(BaseModel):
    """Mirror of EntityAnalysisInputSchema (entity-structure.ts)."""

    model_config = ConfigDict(extra="forbid")

    business_name: str = Field(min_length=1)
    current_structure: EntityStructure = "llc"
    annual_revenue_usd: float = Field(default=0, ge=0)
    annual_profit_usd: float = 0
    has_payroll: bool = False
    owner_count: int = Field(default=1, gt=0)
    plans_to_raise: bool = False
    exit_potential: bool = False
    high_liability: bool = False
    owns_ip: bool = False
    future_saas: bool = False
    state: str = ""


class EntityOption(BaseModel):
    """Mirror of EntityOptionSchema (entity-structure.ts)."""

    model_config = ConfigDict(extra="forbid")

    structure: EntityStructure
    pros: list[str] = Field(default_factory=list)
    cons: list[str] = Field(default_factory=list)
    tax_considerations: list[str] = Field(default_factory=list)
    legal_considerations: list[str] = Field(default_factory=list)


class EntityAnalysis(BaseModel):
    """Mirror of EntityAnalysisSchema (entity-structure.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    business_name: str = Field(min_length=1)
    current_structure: EntityStructure
    recommended_structure: EntityStructure
    why_recommended: str = Field(min_length=1)
    alternatives: list[EntityOption] = Field(default_factory=list)
    cpa_questions: list[str] = Field(default_factory=list)
    attorney_questions: list[str] = Field(default_factory=list)
    action_checklist: list[str] = Field(default_factory=list)
    risk_level: RiskLevel
    requires_professional_review: Literal[True] = True
    created_at: datetime


# --- Wealth Architecture Dump Box contracts (mirror of packages/shared/src/contracts/wealth-dump-box.ts) ---

# Mirror of WealthItemKindSchema.
WealthItemKind = Literal[
    "investment_idea",
    "tax_idea",
    "trust_idea",
    "ira_idea",
    "offshore_idea",
    "real_estate_idea",
    "savings_goal",
    "wealth_desire",
    "screenshot",
    "video",
    "book_note",
    "advisor_note",
    "financial_product",
    "business_income_plan",
]

# Mirror of WealthScopeSchema.
WealthScope = Literal["personal", "business", "both", "unclear"]


class WealthDrop(BaseModel):
    """Mirror of WealthDropSchema (wealth-dump-box.ts)."""

    model_config = ConfigDict(extra="forbid")

    kind: WealthItemKind
    title: str = Field(min_length=1)
    content: str = ""
    business_id: UUID | None = None


class WealthItem(BaseModel):
    """Mirror of WealthItemSchema (wealth-dump-box.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    kind: WealthItemKind
    title: str = Field(min_length=1)
    summary: str = ""
    scope: WealthScope
    legality_notes: str = ""
    upside: float = Field(default=0.5, ge=0, le=1)
    risk: float = Field(default=0.5, ge=0, le=1)
    linked_goals: list[str] = Field(default_factory=list)
    advisor_questions: list[str] = Field(default_factory=list)
    vault_asset_id: str = Field(min_length=1)
    next_action: str = Field(min_length=1)
    requires_professional_review: bool = True
    created_at: datetime


# --- Elite Money Game Engine contracts (mirror of packages/shared/src/contracts/money-game.ts) ---

# Mirror of MoneyStrategyKindSchema. The seventeen strategy kinds.
MoneyStrategyKind = Literal[
    "holding_company",
    "operating_company",
    "ip_ownership",
    "management_fees",
    "owner_compensation",
    "retirement_accounts",
    "self_directed_ira",
    "solo_401k",
    "trusts",
    "real_estate",
    "investment_accounts",
    "business_deductions",
    "charitable_structures",
    "insurance",
    "asset_protection",
    "estate_planning",
    "offshore_compliant",
]


class MoneyStrategy(BaseModel):
    """Mirror of MoneyStrategySchema (money-game.ts)."""

    model_config = ConfigDict(extra="forbid")

    kind: MoneyStrategyKind
    what_it_is: str = Field(min_length=1)
    when_it_applies: str = Field(min_length=1)
    when_it_does_not_apply: str = Field(min_length=1)
    benefits: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    compliance_requirements: list[str] = Field(default_factory=list)
    advisor_needed: str = Field(min_length=1)
    complexity: Complexity
    implementation_steps: list[str] = Field(default_factory=list)


class MoneyGameInput(BaseModel):
    """Mirror of MoneyGameInputSchema (money-game.ts)."""

    model_config = ConfigDict(extra="forbid")

    subject: str = Field(min_length=1)
    annual_profit_usd: float = 0
    owns_business: bool = True
    owns_ip: bool = False
    has_real_estate: bool = False
    focus: list[MoneyStrategyKind] = Field(default_factory=list)


class MoneyGamePlan(BaseModel):
    """Mirror of MoneyGamePlanSchema (money-game.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    subject: str = Field(min_length=1)
    strategies: list[MoneyStrategy] = Field(default_factory=list)
    protect_downside_first: Literal[True] = True
    legal_avoidance_only: Literal[True] = True
    risk_level: RiskLevel
    disclaimer: str = Field(min_length=1)
    created_at: datetime


# --- Algorithm Overlay System contracts (mirror of packages/shared/src/contracts/algorithm-overlay.ts) ---

# Mirror of AlgorithmIdSchema. The fifteen scoring algorithms.
AlgorithmId = Literal[
    "priority",
    "roi",
    "fastest_path_to_cash",
    "friction",
    "conversion_probability",
    "agent_need_detection",
    "opportunity_matching",
    "business_health",
    "goal_gap",
    "risk",
    "pattern_prediction",
    "energy_aware_scheduling",
    "knowledge_to_money",
    "portfolio_allocation",
    "ab_test_winner",
]

# Mirror of ScoringPhaseSchema.
ScoringPhase = Literal["rules_based", "weighted", "historical", "predictive"]


class AlgorithmDescriptor(BaseModel):
    """Mirror of AlgorithmDescriptorSchema (algorithm-overlay.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: AlgorithmId
    name: str = Field(min_length=1)
    purpose: str = Field(min_length=1)
    inputs: list[str] = Field(default_factory=list)
    output: str = Field(min_length=1)
    formula: str = Field(min_length=1)
    dashboard_use: str = ""
    agent_use: str = ""


class ScoreRequest(BaseModel):
    """Mirror of ScoreRequestSchema (algorithm-overlay.ts)."""

    model_config = ConfigDict(extra="forbid")

    algorithm: AlgorithmId
    subject: str = Field(min_length=1)
    signals: dict[str, float] = Field(default_factory=dict)
    override: float | None = Field(default=None, ge=0, le=1)


class AlgorithmScore(BaseModel):
    """Mirror of AlgorithmScoreSchema (algorithm-overlay.ts)."""

    model_config = ConfigDict(extra="forbid")

    algorithm: AlgorithmId
    subject: str = Field(min_length=1)
    phase: ScoringPhase
    score: float = Field(ge=0, le=1)
    confidence: float = Field(ge=0, le=1)
    why: str = Field(min_length=1)
    data_used: list[str] = Field(default_factory=list)
    data_missing: list[str] = Field(default_factory=list)
    recommended_action: str = Field(min_length=1)
    requires_approval: bool = False
    overridden: bool = False


# --- Executive Intelligence Network contracts (mirror of packages/shared/src/contracts/intelligence-network.ts) ---

# Mirror of IntelClassificationSchema.
IntelClassification = Literal[
    "ignore",
    "interesting",
    "monitor",
    "research",
    "immediate_action",
]


class ArticleScores(BaseModel):
    """Mirror of ArticleScoresSchema (intelligence-network.ts)."""

    model_config = ConfigDict(extra="forbid")

    importance: float = Field(ge=0, le=1)
    urgency: float = Field(ge=0, le=1)
    opportunity: float = Field(ge=0, le=1)
    risk: float = Field(ge=0, le=1)
    revenue_potential: float = Field(ge=0, le=1)
    innovation: float = Field(ge=0, le=1)
    implementation_difficulty: float = Field(ge=0, le=1)
    compliance_risk: float = Field(ge=0, le=1)
    strategic_value: float = Field(ge=0, le=1)
    long_term_impact: float = Field(ge=0, le=1)
    recommended_reading_minutes: float = Field(ge=0)


class ArticleInput(BaseModel):
    """Mirror of ArticleInputSchema (intelligence-network.ts)."""

    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1)
    body: str = ""
    source: str = ""
    url: str = ""
    businesses: list[str] = Field(default_factory=list)
    signals: dict[str, float] = Field(default_factory=dict)
    story_key: str = ""


class IntelligenceItem(BaseModel):
    """Mirror of IntelligenceItemSchema (intelligence-network.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    title: str = Field(min_length=1)
    executive_summary: str = Field(min_length=1)
    deep_dive: str = ""
    why_it_matters: str = Field(min_length=1)
    businesses_affected: list[str] = Field(default_factory=list)
    goals_affected: list[str] = Field(default_factory=list)
    agents_to_notify: list[str] = Field(default_factory=list)
    immediate_actions: list[str] = Field(default_factory=list)
    future_implications: list[str] = Field(default_factory=list)
    scores: ArticleScores
    classification: IntelClassification
    confidence: float = Field(ge=0, le=1)
    sources: list[str] = Field(default_factory=list)
    related_briefing_id: UUID | None = None
    follow_up_recommendations: list[str] = Field(default_factory=list)
    created_at: datetime


class BriefingTimelineEntry(BaseModel):
    """Mirror of BriefingTimelineEntrySchema (intelligence-network.ts)."""

    model_config = ConfigDict(extra="forbid")

    at: datetime
    headline: str = Field(min_length=1)
    note: str = ""


class LivingBriefing(BaseModel):
    """Mirror of LivingBriefingSchema (intelligence-network.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    story_key: str = Field(min_length=1)
    title: str = Field(min_length=1)
    current_state: str = Field(min_length=1)
    timeline: list[BriefingTimelineEntry] = Field(default_factory=list)
    businesses_affected: list[str] = Field(default_factory=list)
    updated_at: datetime
    created_at: datetime


# --- Failure Database + Future Trends Lab contracts (mirror of packages/shared/src/contracts/failure-trends.ts) ---

# Mirror of FailureKindSchema.
FailureKind = Literal[
    "fraud",
    "lawsuit",
    "ai_failure",
    "security_breach",
    "failed_startup",
    "scam",
    "regulatory_action",
    "bankruptcy",
    "ethical_failure",
]


class CaptureFailureInput(BaseModel):
    """Mirror of CaptureFailureInputSchema (failure-trends.ts)."""

    model_config = ConfigDict(extra="forbid")

    kind: FailureKind
    title: str = Field(min_length=1)
    what_happened: str = ""
    timeline: list[str] = Field(default_factory=list)
    why_it_failed: str = ""
    root_cause: str = ""
    warning_signs: list[str] = Field(default_factory=list)
    lessons_learned: list[str] = Field(default_factory=list)


class FailureCase(CaptureFailureInput):
    """Mirror of FailureCaseSchema (failure-trends.ts). Extends CaptureFailureInput."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    how_alfy2_avoids_it: list[str] = Field(default_factory=list)
    created_at: datetime


# Mirror of TrendHorizonSchema.
TrendHorizon = Literal["6_months", "1_year", "3_years", "5_years", "10_years"]


class TrackTrendInput(BaseModel):
    """Mirror of TrackTrendInputSchema (failure-trends.ts)."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    horizon: TrendHorizon
    description: str = ""
    likelihood: float = Field(default=0.5, ge=0, le=1)
    impact: float = Field(default=0.5, ge=0, le=1)
    industries_affected: list[str] = Field(default_factory=list)
    businesses_affected: list[str] = Field(default_factory=list)


class Trend(BaseModel):
    """Mirror of TrendSchema (failure-trends.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    name: str = Field(min_length=1)
    horizon: TrendHorizon
    description: str = ""
    likelihood: float = Field(ge=0, le=1)
    impact: float = Field(ge=0, le=1)
    industries_affected: list[str] = Field(default_factory=list)
    businesses_affected: list[str] = Field(default_factory=list)
    preparation_steps: list[str] = Field(default_factory=list)
    skills_needed: list[str] = Field(default_factory=list)
    technology_needed: list[str] = Field(default_factory=list)
    investment_opportunities: list[str] = Field(default_factory=list)
    potential_threats: list[str] = Field(default_factory=list)
    readiness_score: float = Field(ge=0, le=1)
    created_at: datetime


# --- Intelligence Lenses contracts (mirror of packages/shared/src/contracts/intel-lenses.ts) ---


class WhyThisMattersInput(BaseModel):
    """Mirror of WhyThisMattersInputSchema (intel-lenses.ts)."""

    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1)
    summary: str = ""
    businesses: list[str] = Field(default_factory=list)
    content: str = ""
    competitive: bool = False
    compliance_sensitive: bool = False
    product_relevant: bool = False


class WhyThisMatters(BaseModel):
    """Mirror of WhyThisMattersSchema (intel-lenses.ts)."""

    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1)
    businesses_affected: list[str] = Field(default_factory=list)
    needs_change: bool
    competitive_advantage: bool
    compliance_risk: bool
    product_opportunity: bool
    should_test: bool
    should_ignore: bool
    assets_agents_workflows_to_update: list[str] = Field(default_factory=list)
    add_to_strategy_review: Literal["none", "monthly", "quarterly"] = "none"
    decision: str = Field(min_length=1)


class ContrarianInput(BaseModel):
    """Mirror of ContrarianInputSchema (intel-lenses.ts)."""

    model_config = ConfigDict(extra="forbid")

    subject: str = Field(min_length=1)
    mainstream_view: str = Field(min_length=1)
    counter_evidence: list[str] = Field(default_factory=list)


class ContrarianView(BaseModel):
    """Mirror of ContrarianViewSchema (intel-lenses.ts)."""

    model_config = ConfigDict(extra="forbid")

    subject: str = Field(min_length=1)
    mainstream_view: str = Field(min_length=1)
    contrarian_view: str = Field(min_length=1)
    evidence_for_mainstream: list[str] = Field(default_factory=list)
    evidence_for_contrarian: list[str] = Field(default_factory=list)
    ignored_risks: list[str] = Field(default_factory=list)
    questionable_assumptions: list[str] = Field(default_factory=list)
    adoption_barriers: list[str] = Field(default_factory=list)
    compliance_concerns: list[str] = Field(default_factory=list)
    business_model_weaknesses: list[str] = Field(default_factory=list)
    execution_risks: list[str] = Field(default_factory=list)
    recommendation: str = Field(min_length=1)


# --- Briefing Engine contracts (mirror of packages/shared/src/contracts/briefings.ts) ---

# Mirror of BriefingKindSchema.
BriefingKind = Literal["morning", "lunch", "evening", "weekly"]


class BriefingSection(BaseModel):
    """Mirror of BriefingSectionSchema (briefings.ts)."""

    model_config = ConfigDict(extra="forbid")

    heading: str = Field(min_length=1)
    items: list[str] = Field(default_factory=list)


class BriefingInput(BaseModel):
    """Mirror of BriefingInputSchema (briefings.ts)."""

    model_config = ConfigDict(extra="forbid")

    kind: BriefingKind
    date_label: str = ""
    sections: dict[str, list[str]] = Field(default_factory=dict)
    reflections: list[str] = Field(default_factory=list)


class Briefing(BaseModel):
    """Mirror of BriefingSchema (briefings.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    kind: BriefingKind
    date_label: str = ""
    greeting: str = Field(min_length=1)
    sections: list[BriefingSection] = Field(default_factory=list)
    questions: list[str] = Field(default_factory=list)
    estimated_reading_minutes: float = Field(ge=0)
    saved_reflection_count: int = Field(default=0, ge=0)
    created_at: datetime


# --- Podcast Studio OS contracts (mirror of packages/shared/src/contracts/podcast-studio.ts) ---

# Mirror of EpisodeStageSchema.
EpisodeStage = Literal[
    "idea",
    "researched",
    "scheduled",
    "recorded",
    "produced",
    "published",
]


class EpisodeIdeaInput(BaseModel):
    """Mirror of EpisodeIdeaInputSchema (podcast-studio.ts)."""

    model_config = ConfigDict(extra="forbid")

    topic: str = Field(min_length=1)
    source: str = ""
    angle: str = ""
    related_businesses: list[str] = Field(default_factory=list)
    guest_name: str = ""


class EpisodePlan(BaseModel):
    """Mirror of EpisodePlanSchema (podcast-studio.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    stage: EpisodeStage = "idea"
    title: str = Field(min_length=1)
    hook: str = Field(min_length=1)
    premise: str = Field(min_length=1)
    why_now: str = Field(min_length=1)
    target_audience: str = ""
    key_story: str = ""
    talking_points: list[str] = Field(default_factory=list)
    guest_fit: str = ""
    business_tie_in: str = ""
    monetization_angle: str = ""
    clips_to_create: list[str] = Field(default_factory=list)
    cta: str = ""
    related_businesses: list[str] = Field(default_factory=list)
    assets_needed: list[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


# --- Podcast Guest Booking contracts (mirror of packages/shared/src/contracts/podcast-guests.ts) ---

# Mirror of GuestStatusSchema.
GuestStatus = Literal[
    "candidate",
    "approved_to_contact",
    "contacted",
    "replied",
    "scheduled",
    "recorded",
    "declined",
]

# Mirror of BookingDirectionSchema.
BookingDirection = Literal["inbound_guest", "outbound_appearance"]


class GuestCandidateInput(BaseModel):
    """Mirror of GuestCandidateInputSchema (podcast-guests.ts)."""

    model_config = ConfigDict(extra="forbid")

    direction: BookingDirection = "inbound_guest"
    name: str = Field(min_length=1)
    context: str = ""
    relevance: float = Field(default=0.5, ge=0, le=1)
    credibility: float = Field(default=0.5, ge=0, le=1)
    audience_fit: float = Field(default=0.5, ge=0, le=1)
    business_value: float = Field(default=0.5, ge=0, le=1)
    pitch_angle: str = ""


class GuestRecord(BaseModel):
    """Mirror of GuestRecordSchema (podcast-guests.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    direction: BookingDirection
    name: str = Field(min_length=1)
    context: str = ""
    relevance: float = Field(ge=0, le=1)
    credibility: float = Field(ge=0, le=1)
    audience_fit: float = Field(ge=0, le=1)
    business_value: float = Field(ge=0, le=1)
    rank_score: float = Field(ge=0, le=1)
    status: GuestStatus = "candidate"
    pitch_angle: str = ""
    draft_outreach: str = ""
    outreach_approved: bool = False
    booked_date: datetime | None = None
    episode_link: str = ""
    relationship_value: float = Field(default=0.5, ge=0, le=1)
    created_at: datetime
    updated_at: datetime


# --- PR Department contracts (mirror of packages/shared/src/contracts/pr.ts) ---


class GeneratePrInput(BaseModel):
    """Mirror of GeneratePrInputSchema (pr.ts)."""

    model_config = ConfigDict(extra="forbid")

    business_name: str = Field(min_length=1)
    business_id: UUID | None = None
    description: str = ""
    founder_name: str = "Alyssa DelTorre"
    industry: str = ""


class PrStrategy(BaseModel):
    """Mirror of PrStrategySchema (pr.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    business_name: str = Field(min_length=1)
    business_id: UUID | None = None
    media_angles: list[str] = Field(default_factory=list)
    target_publications: list[str] = Field(default_factory=list)
    podcast_targets: list[str] = Field(default_factory=list)
    founder_story_angle: str = Field(min_length=1)
    credibility_proof: list[str] = Field(default_factory=list)
    press_kit_checklist: list[str] = Field(default_factory=list)
    outreach_templates: list[str] = Field(default_factory=list)
    reputation_risks: list[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


# --- Story Mining Engine contracts (mirror of packages/shared/src/contracts/story-mining.ts) ---

# Mirror of StorySourceSchema. Where the raw experience came from.
StorySource = Literal[
    "business_activity",
    "intelligence_update",
    "failure",
    "win",
    "client_story",
    "meeting",
    "travel",
    "technology",
    "personal_lesson",
    "relationship",
    "news",
    "book",
]

# Mirror of StoryChannelSchema. The channels a story can serve.
StoryChannel = Literal[
    "podcast",
    "pr",
    "social",
    "newsletter",
    "sales",
    "investor_update",
    "talk",
    "case_study",
]

# Mirror of StoryUrgencySchema.
StoryUrgency = Literal["evergreen", "this_month", "this_week", "now"]


class MineStoryInput(BaseModel):
    """Mirror of MineStoryInputSchema (story-mining.ts)."""

    model_config = ConfigDict(extra="forbid")

    source: StorySource
    raw: str = Field(min_length=1)
    business_id: UUID | None = None
    businesses: list[str] = Field(default_factory=list)
    channels: list[StoryChannel] = Field(default_factory=list)


class Story(BaseModel):
    """Mirror of StorySchema (story-mining.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    source: StorySource
    hook: str = Field(min_length=1)
    conflict: str = ""
    lesson: str = ""
    emotion: str = ""
    transformation: str = ""
    why_it_matters: str = Field(min_length=1)
    audience: str = ""
    business_tie_in: str = ""
    cta: str = ""
    proof_needed: list[str] = Field(default_factory=list)
    best_channels: list[StoryChannel] = Field(default_factory=list)
    urgency: StoryUrgency = "evergreen"
    business_id: UUID | None = None
    created_at: datetime


# --- Media Operating System contracts (mirror of packages/shared/src/contracts/media-os.ts) ---

# Mirror of MediaInputKindSchema. Raw input kinds.
MediaInputKind = Literal[
    "raw_video",
    "podcast",
    "photo",
    "screenshot",
    "voice_note",
    "written_thought",
    "meeting_recording",
    "interview",
    "webinar",
    "presentation",
    "livestream",
]

# Mirror of MediaOutputKindSchema. Output asset kinds.
MediaOutputKind = Literal[
    "podcast_episode",
    "reel",
    "tiktok",
    "youtube_short",
    "youtube_video",
    "linkedin_post",
    "x_post",
    "instagram_carousel",
    "newsletter",
    "blog",
    "pr_story",
    "email",
]

# Mirror of MediaJobStatusSchema.
MediaJobStatus = Literal["queued", "processing", "awaiting_approval", "approved", "scheduled"]


class IngestMediaInput(BaseModel):
    """Mirror of IngestMediaInputSchema (media-os.ts)."""

    model_config = ConfigDict(extra="forbid")

    kind: MediaInputKind
    title: str = Field(min_length=1)
    source_ref: str = ""
    brand: str = ""
    business_id: UUID | None = None
    outputs: list[MediaOutputKind] = Field(default_factory=list)


class MediaAsset(BaseModel):
    """Mirror of MediaAssetSchema (media-os.ts)."""

    model_config = ConfigDict(extra="forbid")

    kind: MediaOutputKind
    title: str = Field(min_length=1)
    outline: list[str] = Field(default_factory=list)
    cta: str = ""
    asset_id: str = Field(min_length=1)


class MediaJob(BaseModel):
    """Mirror of MediaJobSchema (media-os.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    kind: MediaInputKind
    title: str = Field(min_length=1)
    brand: str = ""
    business_id: UUID | None = None
    status: MediaJobStatus = "queued"
    assets: list[MediaAsset] = Field(default_factory=list)
    requires_approval: Literal[True] = True
    created_at: datetime
    updated_at: datetime


# --- Brand DNA Engine contracts (mirror of packages/shared/src/contracts/brand-dna.ts) ---

# Mirror of BrandKeySchema.
BrandKey = Literal[
    "alyssa_personal",
    "decoded_podcast",
    "funsies_ai",
    "move_mi",
    "divini_partners",
    "divini_procure",
    "stratalogic",
    "founderos",
    "oralia",
]


class BrandDna(BaseModel):
    """Mirror of BrandDnaSchema (brand-dna.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    key: BrandKey
    name: str = Field(min_length=1)
    voice: str = ""
    tone: str = ""
    writing_style: str = ""
    humor_level: float = Field(default=0.3, ge=0, le=1)
    professionalism: float = Field(default=0.7, ge=0, le=1)
    target_audience: str = ""
    content_pillars: list[str] = Field(default_factory=list)
    visual_identity: str = ""
    cta_style: str = ""
    posting_cadence: str = ""
    hashtags: list[str] = Field(default_factory=list)
    forbidden_topics: list[str] = Field(default_factory=list)
    approved_terminology: list[str] = Field(default_factory=list)
    preferred_colors: list[str] = Field(default_factory=list)
    approved_intro: str = ""
    approved_outro: str = ""
    approved_music: str = ""
    approved_sponsor_blocks: list[str] = Field(default_factory=list)
    approved_templates: list[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class UpsertBrandInput(BaseModel):
    """Mirror of UpsertBrandInputSchema (brand-dna.ts)."""

    model_config = ConfigDict(extra="forbid")

    key: BrandKey
    name: str | None = None
    voice: str | None = None
    tone: str | None = None
    writing_style: str | None = None
    humor_level: float | None = Field(default=None, ge=0, le=1)
    professionalism: float | None = Field(default=None, ge=0, le=1)
    target_audience: str | None = None
    content_pillars: list[str] | None = None
    cta_style: str | None = None
    posting_cadence: str | None = None
    hashtags: list[str] | None = None
    forbidden_topics: list[str] | None = None
    approved_terminology: list[str] | None = None


# --- Content Factory contracts (mirror of packages/shared/src/contracts/content-factory.ts) ---

# Mirror of ContentPieceKindSchema.
ContentPieceKind = Literal[
    "youtube_long",
    "short",
    "reel",
    "x_post",
    "linkedin_post",
    "carousel",
    "newsletter",
    "blog",
    "podcast_clip",
    "website_article",
    "email",
    "sales_asset",
    "pr_angle",
    "speaker_story",
    "case_study",
]


class ContentPiece(BaseModel):
    """Mirror of ContentPieceSchema (content-factory.ts)."""

    model_config = ConfigDict(extra="forbid")

    kind: ContentPieceKind
    index: int = Field(ge=0)
    title: str = Field(min_length=1)
    asset_id: str = Field(min_length=1)


class BuildPackageInput(BaseModel):
    """Mirror of BuildPackageInputSchema (content-factory.ts)."""

    model_config = ConfigDict(extra="forbid")

    source_title: str = Field(min_length=1)
    source_ref: str = ""
    brand: str = ""
    business_id: UUID | None = None


class ContentPackage(BaseModel):
    """Mirror of ContentPackageSchema (content-factory.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    source_title: str = Field(min_length=1)
    source_ref: str = ""
    brand: str = ""
    business_id: UUID | None = None
    pieces: list[ContentPiece] = Field(default_factory=list)
    total_pieces: int = Field(ge=0)
    created_at: datetime


# --- Production Studio contracts (mirror of packages/shared/src/contracts/production-studio.ts) ---

# Mirror of ProductionAssetKindSchema.
ProductionAssetKind = Literal[
    "intro",
    "outro",
    "sponsor_ad",
    "music",
    "transition",
    "brand_animation",
    "logo",
    "watermark",
    "b_roll",
    "font",
    "graphic",
    "lower_third",
    "episode_template",
    "video_template",
    "thumbnail_template",
    "caption_style",
    "editing_rule",
]


class ProductionAsset(BaseModel):
    """Mirror of ProductionAssetSchema (production-studio.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    brand: BrandKey
    kind: ProductionAssetKind
    name: str = Field(min_length=1)
    asset_ref: str = ""
    created_at: datetime


class ProductionPreset(BaseModel):
    """Mirror of ProductionPresetSchema (production-studio.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    brand: BrandKey
    intro: str = ""
    outro: str = ""
    sponsor_placement: str = ""
    graphics_style: str = ""
    auto_steps: list[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class UpsertPresetInput(BaseModel):
    """Mirror of UpsertPresetInputSchema (production-studio.ts)."""

    model_config = ConfigDict(extra="forbid")

    brand: BrandKey
    intro: str = ""
    outro: str = ""
    sponsor_placement: str = ""
    graphics_style: str = ""
    auto_steps: list[str] = Field(default_factory=list)


# --- Visibility Engine contracts (mirror of packages/shared/src/contracts/visibility.ts) ---


class VisibilitySignals(BaseModel):
    """Mirror of VisibilitySignalsSchema (visibility.ts)."""

    model_config = ConfigDict(extra="forbid")

    posting_frequency_per_week: float = Field(default=0, ge=0)
    reach: float = Field(default=0, ge=0)
    engagement_rate: float = Field(default=0, ge=0, le=1)
    follower_growth: float = Field(default=0, ge=0, le=1)
    podcast_growth: float = Field(default=0, ge=0, le=1)
    email_growth: float = Field(default=0, ge=0, le=1)
    website_traffic: float = Field(default=0, ge=0)
    seo_score: float = Field(default=0, ge=0, le=1)
    mentions: int = Field(default=0, ge=0)
    backlinks: int = Field(default=0, ge=0)
    podcast_invitations: int = Field(default=0, ge=0)
    speaking_invitations: int = Field(default=0, ge=0)
    media_mentions: int = Field(default=0, ge=0)
    partnerships: int = Field(default=0, ge=0)


class VisibilityInput(BaseModel):
    """Mirror of VisibilityInputSchema (visibility.ts)."""

    model_config = ConfigDict(extra="forbid")

    business_name: str = Field(min_length=1)
    business_id: UUID | None = None
    signals: VisibilitySignals


class VisibilityReport(BaseModel):
    """Mirror of VisibilityReportSchema (visibility.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    business_name: str = Field(min_length=1)
    visibility_score: float = Field(ge=0, le=1)
    where_to_post: list[str] = Field(default_factory=list)
    what_to_post: list[str] = Field(default_factory=list)
    when_to_post: str = ""
    collaborators: list[str] = Field(default_factory=list)
    podcasts_to_appear_on: list[str] = Field(default_factory=list)
    conferences_to_speak_at: list[str] = Field(default_factory=list)
    awards_to_apply_for: list[str] = Field(default_factory=list)
    weakest_signals: list[str] = Field(default_factory=list)
    created_at: datetime


# --- PR & Authority Engine contracts (mirror of packages/shared/src/contracts/pr-authority.ts) ---

# Mirror of PrTriggerSchema. The triggers that create a PR opportunity.
PrTrigger = Literal[
    "company_launch",
    "major_partnership",
    "funding",
    "customer_win",
    "industry_trend",
    "technology_innovation",
]

# Mirror of PrOpportunityStatusSchema.
PrOpportunityStatus = Literal[
    "identified",
    "pitch_drafted",
    "approved",
    "sent",
    "won",
    "passed",
]


class DetectPrInput(BaseModel):
    """Mirror of DetectPrInputSchema (pr-authority.ts)."""

    model_config = ConfigDict(extra="forbid")

    trigger: PrTrigger
    headline: str = Field(min_length=1)
    business_name: str = ""
    business_id: UUID | None = None
    detail: str = ""


class PrOpportunity(BaseModel):
    """Mirror of PrOpportunitySchema (pr-authority.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    trigger: PrTrigger
    headline: str = Field(min_length=1)
    business_name: str = ""
    angle: str = Field(min_length=1)
    target_outlets: list[str] = Field(default_factory=list)
    drafted_pitch: str = Field(min_length=1)
    credibility_assets_needed: list[str] = Field(default_factory=list)
    status: PrOpportunityStatus = "identified"
    approved_to_send: bool = False
    created_at: datetime
    updated_at: datetime


# Mirror of AuthorityAssetKindSchema.
AuthorityAssetKind = Literal[
    "media_kit",
    "speaker_kit",
    "founder_bio",
    "company_bio",
    "press_release",
    "award_submission",
    "podcast_pitch",
    "conference_submission",
    "guest_article",
    "case_study",
    "thought_leadership",
    "credibility_asset",
]


class AuthorityAsset(BaseModel):
    """Mirror of AuthorityAssetSchema (pr-authority.ts)."""

    model_config = ConfigDict(extra="forbid")

    kind: AuthorityAssetKind
    title: str = Field(min_length=1)
    asset_id: str = Field(min_length=1)
    outline: list[str] = Field(default_factory=list)


# --- Audience Intelligence contracts (mirror of packages/shared/src/contracts/audience-intel.ts) ---

# Mirror of AudienceSignalKindSchema.
AudienceSignalKind = Literal[
    "question",
    "comment",
    "dm",
    "email",
    "sales_call",
    "customer_feedback",
    "podcast_feedback",
    "website_search",
    "support_ticket",
]


class AudienceSignal(BaseModel):
    """Mirror of AudienceSignalSchema (audience-intel.ts)."""

    model_config = ConfigDict(extra="forbid")

    kind: AudienceSignalKind
    text: str = Field(min_length=1)


class AnalyzeAudienceInput(BaseModel):
    """Mirror of AnalyzeAudienceInputSchema (audience-intel.ts)."""

    model_config = ConfigDict(extra="forbid")

    audience_name: str = Field(min_length=1)
    business_id: UUID | None = None
    signals: list[AudienceSignal] = Field(default_factory=list)


class AudienceProfile(BaseModel):
    """Mirror of AudienceProfileSchema (audience-intel.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    audience_name: str = Field(min_length=1)
    business_id: UUID | None = None
    biggest_fears: list[str] = Field(default_factory=list)
    biggest_goals: list[str] = Field(default_factory=list)
    language_used: list[str] = Field(default_factory=list)
    objections: list[str] = Field(default_factory=list)
    desires: list[str] = Field(default_factory=list)
    misconceptions: list[str] = Field(default_factory=list)
    favorite_content: list[str] = Field(default_factory=list)
    best_offers: list[str] = Field(default_factory=list)
    messaging_recommendation: str = Field(min_length=1)
    signal_count: int = Field(default=0, ge=0)
    updated_at: datetime
    created_at: datetime


# --- Personal Freedom Engine contracts (mirror of packages/shared/src/contracts/personal-freedom.ts) ---


class FreedomLogInput(BaseModel):
    """Mirror of FreedomLogInputSchema (personal-freedom.ts)."""

    model_config = ConfigDict(extra="forbid")

    week_label: str = ""
    hours_working: float = Field(default=0, ge=0)
    hours_creating: float = Field(default=0, ge=0)
    hours_editing: float = Field(default=0, ge=0)
    hours_approving: float = Field(default=0, ge=0)
    hours_outdoors: float = Field(default=0, ge=0)
    hours_exercise: float = Field(default=0, ge=0)
    hours_family: float = Field(default=0, ge=0)
    hours_friends: float = Field(default=0, ge=0)
    hours_travel: float = Field(default=0, ge=0)
    hours_learning: float = Field(default=0, ge=0)
    hours_creative: float = Field(default=0, ge=0)
    hours_rest: float = Field(default=0, ge=0)


# Mirror of FreedomActionKindSchema.
FreedomActionKind = Literal[
    "automate",
    "delegate",
    "create_agent",
    "improve_workflow",
    "batch_process",
]


class FreedomRecommendation(BaseModel):
    """Mirror of FreedomRecommendationSchema (personal-freedom.ts)."""

    model_config = ConfigDict(extra="forbid")

    action: FreedomActionKind
    target: str = Field(min_length=1)
    rationale: str = Field(min_length=1)
    estimated_hours_returned: float = Field(default=0, ge=0)
    preserves_performance: Literal[True] = True


class FreedomReport(BaseModel):
    """Mirror of FreedomReportSchema (personal-freedom.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    week_label: str = ""
    offloadable_hours: float = Field(ge=0)
    life_hours: float = Field(ge=0)
    freedom_score: float = Field(ge=0, le=1)
    recommendations: list[FreedomRecommendation] = Field(default_factory=list)
    created_at: datetime


# --- Legacy Engine contracts (mirror of packages/shared/src/contracts/legacy.ts) ---

# Mirror of LegacyItemKindSchema.
LegacyItemKind = Literal[
    "framework",
    "playbook",
    "operating_manual",
    "podcast_lesson",
    "book",
    "talk",
    "business_system",
    "decision_journal",
    "mistake",
    "success",
]

# Mirror of LegacyFormSchema. The forms a piece of repeatable knowledge can take.
LegacyForm = Literal[
    "sop",
    "founderos_feature",
    "course",
    "podcast_episode",
    "keynote",
    "book_chapter",
    "licensing_opportunity",
    "consulting_framework",
]


class CaptureLegacyInput(BaseModel):
    """Mirror of CaptureLegacyInputSchema (legacy.ts)."""

    model_config = ConfigDict(extra="forbid")

    kind: LegacyItemKind
    title: str = Field(min_length=1)
    detail: str = ""
    repeatability: float = Field(default=0.5, ge=0, le=1)
    strategic_value: float = Field(default=0.5, ge=0, le=1)


class LegacyItem(BaseModel):
    """Mirror of LegacyItemSchema (legacy.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    kind: LegacyItemKind
    title: str = Field(min_length=1)
    detail: str = ""
    repeatability: float = Field(ge=0, le=1)
    strategic_value: float = Field(ge=0, le=1)
    recommended_forms: list[LegacyForm] = Field(default_factory=list)
    legacy_score: float = Field(ge=0, le=1)
    created_at: datetime


# --- Compounding Engine contracts (mirror of packages/shared/src/contracts/compounding.ts) ---

# Mirror of ReusableFormSchema. The reusable forms a completed task can become.
ReusableForm = Literal[
    "sop",
    "template",
    "automation",
    "agent",
    "workflow",
    "checklist",
    "playbook",
    "training_doc",
    "knowledge_article",
    "podcast_topic",
    "youtube_video",
    "social_post",
    "newsletter",
    "blog",
    "sales_asset",
    "pr_opportunity",
    "founderos_feature",
    "course_lesson",
    "keynote",
    "consulting_framework",
    "licensing_opportunity",
]


class CompoundingMetrics(BaseModel):
    """Mirror of CompoundingMetricsSchema (compounding.ts)."""

    model_config = ConfigDict(extra="forbid")

    reuse_frequency: float = Field(default=0, ge=0, le=1)
    businesses_using: float = Field(default=0, ge=0, le=1)
    revenue_generated: float = Field(default=0, ge=0, le=1)
    time_saved: float = Field(default=0, ge=0, le=1)
    automation_potential: float = Field(default=0, ge=0, le=1)
    knowledge_value: float = Field(default=0, ge=0, le=1)
    strategic_importance: float = Field(default=0, ge=0, le=1)
    longevity: float = Field(default=0, ge=0, le=1)


class EvaluateCompoundingInput(BaseModel):
    """Mirror of EvaluateCompoundingInputSchema (compounding.ts)."""

    model_config = ConfigDict(extra="forbid")

    task_title: str = Field(min_length=1)
    task_summary: str = ""
    business_id: UUID | None = None
    metrics: CompoundingMetrics
    created_by: str = ""


class AssetLineage(BaseModel):
    """Mirror of AssetLineageSchema (compounding.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    asset_title: str = Field(min_length=1)
    created_by: str = ""
    created_assets: list[str] = Field(default_factory=list)
    businesses_using: list[str] = Field(default_factory=list)
    revenue_influenced_usd: float = Field(default=0, ge=0)
    agents_using: list[str] = Field(default_factory=list)
    workflows_using: list[str] = Field(default_factory=list)
    version: int = Field(default=1, gt=0)
    last_updated: datetime


class CompoundingEvaluation(BaseModel):
    """Mirror of CompoundingEvaluationSchema (compounding.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    task_title: str = Field(min_length=1)
    recommended_forms: list[ReusableForm] = Field(default_factory=list)
    metrics: CompoundingMetrics
    compounding_score: float = Field(ge=0, le=1)
    recommend_create_reusable: bool = False
    lineage_id: UUID | None = None
    created_at: datetime


# --- Multiplication Engine contracts (mirror of packages/shared/src/contracts/multiplication.ts) ---

# Mirror of MultiplicationTargetSchema. Who/what a solution could help.
MultiplicationTarget = Literal[
    "another_business",
    "another_department",
    "another_workflow",
    "another_agent",
    "future_alyssa",
    "future_founderos_users",
    "clients",
    "partners",
    "investors",
]

# Mirror of SharedFormSchema. The shared forms a solution can be converted into.
SharedForm = Literal[
    "shared_infrastructure",
    "shared_workflow",
    "shared_template",
    "shared_automation",
    "shared_agent",
    "shared_asset",
    "shared_knowledge",
    "founderos_feature",
]


class EvaluateMultiplicationInput(BaseModel):
    """Mirror of EvaluateMultiplicationInputSchema (multiplication.ts)."""

    model_config = ConfigDict(extra="forbid")

    solution_title: str = Field(min_length=1)
    solution_summary: str = ""
    business_id: UUID | None = None
    helps: list[MultiplicationTarget] = Field(default_factory=list)
    estimated_uses_per_target: float = Field(default=1, ge=0)


class MultiplicationEvaluation(BaseModel):
    """Mirror of MultiplicationEvaluationSchema (multiplication.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    solution_title: str = Field(min_length=1)
    helps: list[MultiplicationTarget] = Field(default_factory=list)
    recommended_shared_forms: list[SharedForm] = Field(default_factory=list)
    estimated_future_uses: int = Field(ge=0)
    multiplication_score: float = Field(ge=0, le=1)
    recommend_share: bool = False
    created_at: datetime


# --- Leverage Engine contracts (mirror of packages/shared/src/contracts/leverage.ts) ---


class LeverageInputs(BaseModel):
    """Mirror of LeverageInputsSchema (leverage.ts)."""

    model_config = ConfigDict(extra="forbid")

    revenue_impact: float = Field(default=0, ge=0, le=1)
    time_saved: float = Field(default=0, ge=0, le=1)
    stress_reduced: float = Field(default=0, ge=0, le=1)
    knowledge_created: float = Field(default=0, ge=0, le=1)
    automation_potential: float = Field(default=0, ge=0, le=1)
    businesses_helped: float = Field(default=0, ge=0, le=1)
    assets_created: float = Field(default=0, ge=0, le=1)
    people_helped: float = Field(default=0, ge=0, le=1)
    future_reuse: float = Field(default=0, ge=0, le=1)
    founderos_potential: float = Field(default=0, ge=0, le=1)
    brand_value: float = Field(default=0, ge=0, le=1)
    relationship_value: float = Field(default=0, ge=0, le=1)
    decision_quality: float = Field(default=0, ge=0, le=1)
    longevity: float = Field(default=0, ge=0, le=1)


# Mirror of LeverageTierSchema. The leverage tier.
LeverageTier = Literal["low", "medium", "high", "compounding", "generational"]


class ScoreLeverageInput(BaseModel):
    """Mirror of ScoreLeverageInputSchema (leverage.ts)."""

    model_config = ConfigDict(extra="forbid")

    option_label: str = Field(min_length=1)
    inputs: LeverageInputs


class LeverageScore(BaseModel):
    """Mirror of LeverageScoreSchema (leverage.ts)."""

    model_config = ConfigDict(extra="forbid")

    option_label: str = Field(min_length=1)
    score: float = Field(ge=0, le=1)
    tier: LeverageTier
    top_drivers: list[str] = Field(default_factory=list)
    why: str = Field(min_length=1)


class LeverageComparison(BaseModel):
    """Mirror of LeverageComparisonSchema (leverage.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    ranked: list[LeverageScore] = Field(default_factory=list)
    recommended_option: str = Field(min_length=1)
    note: str = ""
    created_at: datetime


# --- Immutable Laws contracts (mirror of packages/shared/src/contracts/immutable-laws.ts) ---

# Mirror of LawIdSchema.
LawId = Literal[
    "protect_the_human",
    "compound_everything",
    "allocate_capital_intelligently",
    "prefer_systems_over_heroics",
    "increase_founder_freedom",
]


class ImmutableLaw(BaseModel):
    """Mirror of ImmutableLawSchema (immutable-laws.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: LawId
    number: int = Field(ge=1, le=5)
    title: str = Field(min_length=1)
    text: str = Field(min_length=1)


class LawCheckInput(BaseModel):
    """Mirror of LawCheckInputSchema (immutable-laws.ts)."""

    model_config = ConfigDict(extra="forbid")

    recommendation: str = Field(min_length=1)
    harms_human: bool = False
    produces_reusable_ip: bool = False
    considers_capital_allocation: bool = False
    is_repeat_problem: bool = False
    builds_system: bool = False
    increases_freedom: bool = False


class LawVerdict(BaseModel):
    """Mirror of LawVerdictSchema (immutable-laws.ts)."""

    model_config = ConfigDict(extra="forbid")

    law: LawId
    satisfied: bool
    note: str = Field(min_length=1)


class LawCompliance(BaseModel):
    """Mirror of LawComplianceSchema (immutable-laws.ts)."""

    model_config = ConfigDict(extra="forbid")

    compliant: bool
    verdicts: list[LawVerdict]
    violations: list[LawId] = Field(default_factory=list)
    explanation: str = Field(min_length=1)


# --- Executive Capital Allocator contracts (mirror of packages/shared/src/contracts/capital-allocator.ts) ---

# Mirror of CapitalKindSchema.
CapitalKind = Literal[
    "time",
    "money",
    "energy",
    "attention",
    "relationships",
    "reputation",
    "knowledge",
    "technology",
    "assets",
    "employees",
    "agents",
    "automation_capacity",
]

# Mirror of AllocationHorizonSchema.
AllocationHorizon = Literal["daily", "weekly", "quarterly"]


class AllocationCandidate(BaseModel):
    """Mirror of AllocationCandidateSchema (capital-allocator.ts)."""

    model_config = ConfigDict(extra="forbid")

    label: str = Field(min_length=1)
    consumes: list[CapitalKind] = Field(default_factory=list)
    expected_return: float = Field(default=0, ge=0, le=1)
    leverage: float = Field(default=0, ge=0, le=1)
    compounding: float = Field(default=0, ge=0, le=1)
    strategic_value: float = Field(default=0, ge=0, le=1)
    founder_freedom: float = Field(default=0, ge=0, le=1)
    depletes: list[CapitalKind] = Field(default_factory=list)


class AllocateInput(BaseModel):
    """Mirror of AllocateInputSchema (capital-allocator.ts)."""

    model_config = ConfigDict(extra="forbid")

    horizon: AllocationHorizon
    candidates: list[AllocationCandidate] = Field(min_length=1)


class AllocationPlan(BaseModel):
    """Mirror of AllocationPlanSchema (capital-allocator.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    horizon: AllocationHorizon
    question: str = Field(min_length=1)
    highest_roi: str | None = None
    highest_leverage: str | None = None
    highest_compounding: str | None = None
    highest_strategic_value: str | None = None
    highest_founder_freedom: str | None = None
    recommendation: str = Field(min_length=1)
    tradeoffs: list[str] = Field(default_factory=list)
    stop_investing_in: list[str] = Field(default_factory=list)
    created_at: datetime


# --- Opportunity Cost Engine contracts (mirror of packages/shared/src/contracts/opportunity-cost.ts) ---


class CostOption(BaseModel):
    """Mirror of CostOptionSchema (opportunity-cost.ts)."""

    model_config = ConfigDict(extra="forbid")

    label: str = Field(min_length=1)
    expected_upside_usd: float = 0
    expected_downside_usd: float = 0
    capital_required_usd: float = Field(default=0, ge=0)
    time_required_days: float = Field(default=0, ge=0)
    stress_cost: float = Field(default=0, ge=0, le=1)
    complexity: float = Field(default=0, ge=0, le=1)
    risk: float = Field(default=0, ge=0, le=1)
    confidence: float = Field(default=0.5, ge=0, le=1)
    future_leverage: float = Field(default=0, ge=0, le=1)


class CompareOptionsInput(BaseModel):
    """Mirror of CompareOptionsInputSchema (opportunity-cost.ts)."""

    model_config = ConfigDict(extra="forbid")

    question: str = ""
    options: list[CostOption] = Field(min_length=2)


class EvaluatedOption(BaseModel):
    """Mirror of EvaluatedOptionSchema (opportunity-cost.ts)."""

    model_config = ConfigDict(extra="forbid")

    label: str = Field(min_length=1)
    expected_value_usd: float
    opportunity_cost_usd: float
    composite_score: float


class OpportunityComparison(BaseModel):
    """Mirror of OpportunityComparisonSchema (opportunity-cost.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    question: str = ""
    evaluated: list[EvaluatedOption] = Field(default_factory=list)
    best_financial: str = Field(min_length=1)
    best_strategic: str = Field(min_length=1)
    best_long_term: str = Field(min_length=1)
    best_low_risk: str = Field(min_length=1)
    fastest: str = Field(min_length=1)
    highest_leverage: str = Field(min_length=1)
    not_chosen: list[str] = Field(default_factory=list)
    recommendation: str = Field(min_length=1)
    created_at: datetime


# --- Executive Decision Journal contracts (mirror of packages/shared/src/contracts/decision-journal.ts) ---

# Mirror of JournalReviewWindowSchema.
JournalReviewWindow = Literal["30_day", "90_day", "1_year"]


class RecordDecisionInput(BaseModel):
    """Mirror of RecordDecisionInputSchema (decision-journal.ts)."""

    model_config = ConfigDict(extra="forbid")

    decision: str = Field(min_length=1)
    alternatives: list[str] = Field(default_factory=list)
    reasoning: str = ""
    data_available: list[str] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    expected_outcome: str = ""
    business_id: UUID | None = None
    category: str = ""


class JournaledDecision(BaseModel):
    """Mirror of JournaledDecisionSchema (decision-journal.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    decision: str = Field(min_length=1)
    alternatives: list[str] = Field(default_factory=list)
    reasoning: str = ""
    data_available: list[str] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    expected_outcome: str = ""
    category: str = ""
    business_id: UUID | None = None
    actual_outcome: str = ""
    lessons_learned: list[str] = Field(default_factory=list)
    reviews_due: dict[str, str] = Field(default_factory=dict)
    reviewed_windows: list[JournalReviewWindow] = Field(default_factory=list)
    decided_at: datetime
    updated_at: datetime


class ReviewDecisionInput(BaseModel):
    """Mirror of ReviewDecisionInputSchema (decision-journal.ts)."""

    model_config = ConfigDict(extra="forbid")

    window: JournalReviewWindow
    actual_outcome: str = Field(min_length=1)
    lessons_learned: list[str] = Field(default_factory=list)


# --- Enterprise Memory Timeline contracts (mirror of packages/shared/src/contracts/memory-timeline.ts) ---

# Mirror of TimelineEventKindSchema.
TimelineEventKind = Literal[
    "business_launch",
    "campaign",
    "product_release",
    "major_decision",
    "client",
    "partnership",
    "financial_milestone",
    "failure",
    "win",
    "hiring",
    "technology_adoption",
    "legal_event",
    "media_appearance",
]


class AddTimelineEventInput(BaseModel):
    """Mirror of AddTimelineEventInputSchema (memory-timeline.ts)."""

    model_config = ConfigDict(extra="forbid")

    kind: TimelineEventKind
    title: str = Field(min_length=1)
    occurred_at: datetime
    summary: str = ""
    business_id: UUID | None = None
    related_assets: list[str] = Field(default_factory=list)
    related_agents: list[str] = Field(default_factory=list)
    related_people: list[str] = Field(default_factory=list)
    related_businesses: list[str] = Field(default_factory=list)
    lessons_learned: list[str] = Field(default_factory=list)


class TimelineEvent(AddTimelineEventInput):
    """Mirror of TimelineEventSchema (memory-timeline.ts)."""

    id: UUID
    tenant_id: UUID
    created_at: datetime


# --- Executive Review Board contracts (mirror of packages/shared/src/contracts/review-board.ts) ---

# Mirror of ReviewerRoleSchema.
ReviewerRole = Literal["ceo", "cfo", "coo", "cto", "cmo", "clo", "cro", "cso", "cpo", "cco"]


class ProposalSignals(BaseModel):
    """Mirror of ProposalSignalsSchema (review-board.ts)."""

    model_config = ConfigDict(extra="forbid")

    revenue_upside: float = Field(default=0.5, ge=0, le=1)
    cost: float = Field(default=0.5, ge=0, le=1)
    risk: float = Field(default=0.5, ge=0, le=1)
    legal_exposure: float = Field(default=0.3, ge=0, le=1)
    security_exposure: float = Field(default=0.3, ge=0, le=1)
    operational_load: float = Field(default=0.5, ge=0, le=1)
    customer_impact: float = Field(default=0.5, ge=0, le=1)
    product_fit: float = Field(default=0.5, ge=0, le=1)
    technical_complexity: float = Field(default=0.5, ge=0, le=1)


class ConveneBoardInput(BaseModel):
    """Mirror of ConveneBoardInputSchema (review-board.ts)."""

    model_config = ConfigDict(extra="forbid")

    proposal: str = Field(min_length=1)
    business_id: UUID | None = None
    signals: ProposalSignals


class ReviewerVerdict(BaseModel):
    """Mirror of ReviewerVerdictSchema (review-board.ts)."""

    model_config = ConfigDict(extra="forbid")

    role: ReviewerRole
    stance: Literal["approve", "approve_with_conditions", "reject"]
    benefits: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    blind_spots: list[str] = Field(default_factory=list)
    dependencies: list[str] = Field(default_factory=list)
    costs: list[str] = Field(default_factory=list)
    operational_impact: str = ""


class BoardReview(BaseModel):
    """Mirror of BoardReviewSchema (review-board.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    proposal: str = Field(min_length=1)
    verdicts: list[ReviewerVerdict] = Field(default_factory=list)
    approvals: int = Field(ge=0)
    rejections: int = Field(ge=0)
    disagreements: list[str] = Field(default_factory=list)
    synthesis: str = Field(min_length=1)
    final_recommendation: str = Field(min_length=1)
    created_at: datetime


# --- Cognitive Offloading Engine contracts (mirror of cognitive-offload.ts) ---

OffloadInputKind = Literal[
    "conversation", "voice_note", "meeting_transcript", "email", "pdf", "image", "message", "uploaded_file",
]


class ProcessOffloadInput(BaseModel):
    """Mirror of ProcessOffloadInputSchema (cognitive-offload.ts)."""

    model_config = ConfigDict(extra="forbid")

    kind: OffloadInputKind
    content: str = Field(min_length=1)
    business_id: UUID | None = None
    businesses: list[str] = Field(default_factory=list)


class Understanding(BaseModel):
    """Mirror of UnderstandingSchema (cognitive-offload.ts)."""

    model_config = ConfigDict(extra="forbid")

    objectives: list[str] = Field(default_factory=list)
    decisions: list[str] = Field(default_factory=list)
    problems: list[str] = Field(default_factory=list)
    opportunities: list[str] = Field(default_factory=list)
    constraints: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    deadlines: list[str] = Field(default_factory=list)
    metrics: list[str] = Field(default_factory=list)
    context: str = ""
    emotional_state: str = ""
    urgency: Literal["low", "medium", "high", "now"] = "low"
    dependencies: list[str] = Field(default_factory=list)


OffloadDisposition = Literal[
    "automated", "scheduled", "assigned", "deferred", "archived", "reviewed", "escalated", "needs_alyssa",
]


class HandledItem(BaseModel):
    """Mirror of HandledItemSchema (cognitive-offload.ts)."""

    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1)
    disposition: OffloadDisposition
    alyssa_can_forget: bool
    reason: str = Field(min_length=1)


class OffloadRecord(BaseModel):
    """Mirror of OffloadRecordSchema (cognitive-offload.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    kind: OffloadInputKind
    understanding: Understanding
    connections: list[str] = Field(default_factory=list)
    built: list[str] = Field(default_factory=list)
    handled: list[HandledItem] = Field(default_factory=list)
    what_changed: str = ""
    why_it_matters: str = ""
    completed_automatically: list[str] = Field(default_factory=list)
    decisions_requiring_alyssa: list[str] = Field(default_factory=list)
    cognitive_load_removed: float = Field(ge=0, le=1)
    created_at: datetime


# --- Life Logistics Engine contracts (mirror of life-logistics.ts) ---

PrepCategory = Literal[
    "packing", "travel", "transportation", "hotel", "pet_care", "medication", "supplements", "clothing",
    "weather", "documents", "charging", "gifts", "business_materials", "presentation_materials",
    "networking", "reservations", "tickets", "follow_up", "recovery",
]


class DetectEventInput(BaseModel):
    """Mirror of DetectEventInputSchema (life-logistics.ts)."""

    model_config = ConfigDict(extra="forbid")

    description: str = Field(min_length=1)
    starts_at: datetime
    overnight: bool = False
    travel: bool = False
    networking: bool = False
    has_pet: bool = True
    business_id: UUID | None = None


class Checklist(BaseModel):
    """Mirror of ChecklistSchema (life-logistics.ts)."""

    model_config = ConfigDict(extra="forbid")

    category: PrepCategory
    items: list[str] = Field(default_factory=list)


class ScheduledReminder(BaseModel):
    """Mirror of ScheduledReminderSchema (life-logistics.ts)."""

    model_config = ConfigDict(extra="forbid")

    at: datetime
    label: str = Field(min_length=1)


class LogisticsCalendarBlock(BaseModel):
    """Mirror of LogisticsCalendarBlockSchema (life-logistics.ts)."""

    model_config = ConfigDict(extra="forbid")

    starts_at: datetime
    ends_at: datetime
    label: str = Field(min_length=1)


class LogisticsPlan(BaseModel):
    """Mirror of LogisticsPlanSchema (life-logistics.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    event: str = Field(min_length=1)
    starts_at: datetime
    checklists: list[Checklist] = Field(default_factory=list)
    calendar_blocks: list[LogisticsCalendarBlock] = Field(default_factory=list)
    reminders: list[ScheduledReminder] = Field(default_factory=list)
    follow_ups: list[str] = Field(default_factory=list)
    created_at: datetime


# --- Anti-Fragility Engine contracts (mirror of anti-fragility.ts) ---

FailureType = Literal[
    "missed_opportunity", "failed_launch", "security_incident", "rejected_proposal", "lost_sale",
    "customer_complaint", "agent_failure", "workflow_breakdown", "model_error",
]


class AnalyzeFailureInput(BaseModel):
    """Mirror of AnalyzeFailureInputSchema (anti-fragility.ts)."""

    model_config = ConfigDict(extra="forbid")

    type: FailureType
    title: str = Field(min_length=1)
    detail: str = ""
    recovery_days: float = Field(default=0, ge=0)
    preventable: bool = True
    business_id: UUID | None = None


class AntiFragilityCase(BaseModel):
    """Mirror of AntiFragilityCaseSchema (anti-fragility.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    type: FailureType
    title: str = Field(min_length=1)
    root_cause: str = ""
    preventable: bool
    reusable_lesson: str = ""
    new_safeguard: str = ""
    new_automation: str = ""
    new_agent: str = ""
    new_sop: str = ""
    system_redesign: str = ""
    recovery_days: float = Field(ge=0)
    learning_gained: float = Field(ge=0, le=1)
    future_risk_reduction: float = Field(ge=0, le=1)
    created_at: datetime


# --- Brain/Hands Separation contracts (mirror of brain-hands.ts) ---

Layer = Literal["brain", "policy", "orchestrator", "execution"]


class LayerAssignment(BaseModel):
    """Mirror of LayerAssignmentSchema (brain-hands.ts)."""

    model_config = ConfigDict(extra="forbid")

    capability: str = Field(min_length=1)
    layer: Layer
    engine_module: str = ""


class ExecFlowRequest(BaseModel):
    """Mirror of ExecFlowRequestSchema (brain-hands.ts)."""

    model_config = ConfigDict(extra="forbid")

    capability: str = Field(min_length=1)
    brain_recommended: bool = False
    policy_cleared: bool = False
    approved: bool | None = None
    orchestrator_routed: bool = False
    audited: bool = False


class FlowDecision(BaseModel):
    """Mirror of FlowDecisionSchema (brain-hands.ts)."""

    model_config = ConfigDict(extra="forbid")

    allowed: bool
    bypass_attempt: bool
    missing_layers: list[str] = Field(default_factory=list)
    reason: str = Field(min_length=1)


# --- Confidence-Weighted Agent Council contracts (mirror of agent-council.ts) ---

CouncilRole = Literal[
    "ceo", "cfo", "coo", "cto", "cmo", "legal_risk", "security", "customer", "investor", "contrarian",
]

CouncilDecisionKind = Literal[
    "entity_restructuring", "large_spending", "major_launch", "pricing_change", "fundraising",
    "hiring", "legal_compliance", "market_entry",
]


class CouncilSignals(BaseModel):
    """Mirror of CouncilSignalsSchema (agent-council.ts)."""

    model_config = ConfigDict(extra="forbid")

    revenue_upside: float = Field(default=0.5, ge=0, le=1)
    cost: float = Field(default=0.5, ge=0, le=1)
    risk: float = Field(default=0.5, ge=0, le=1)
    legal_exposure: float = Field(default=0.3, ge=0, le=1)
    security_exposure: float = Field(default=0.3, ge=0, le=1)
    operational_load: float = Field(default=0.5, ge=0, le=1)
    customer_impact: float = Field(default=0.5, ge=0, le=1)
    data_completeness: float = Field(default=0.5, ge=0, le=1)


class ConveneCouncilInput(BaseModel):
    """Mirror of ConveneCouncilInputSchema (agent-council.ts)."""

    model_config = ConfigDict(extra="forbid")

    kind: CouncilDecisionKind
    decision: str = Field(min_length=1)
    signals: CouncilSignals


class CouncilOpinion(BaseModel):
    """Mirror of CouncilOpinionSchema (agent-council.ts)."""

    model_config = ConfigDict(extra="forbid")

    role: CouncilRole
    recommendation: Literal["proceed", "proceed_with_conditions", "reject"]
    confidence: float = Field(ge=0, le=1)
    risks: list[str] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)
    missing_information: list[str] = Field(default_factory=list)
    expected_upside: str = ""
    expected_downside: str = ""


class CouncilVerdict(BaseModel):
    """Mirror of CouncilVerdictSchema (agent-council.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    kind: CouncilDecisionKind
    decision: str = Field(min_length=1)
    opinions: list[CouncilOpinion] = Field(default_factory=list)
    agreement: float = Field(ge=0, le=1)
    confidence_gap: float = Field(ge=0, le=1)
    unresolved_risks: list[str] = Field(default_factory=list)
    needs_more_data: bool
    recommendation: str = Field(min_length=1)
    created_at: datetime


# --- Billion-Dollar Operator Mode contracts (mirror of operator-mode.ts) ---


class OperatorReviewInput(BaseModel):
    """Mirror of OperatorReviewInputSchema (operator-mode.ts)."""

    model_config = ConfigDict(extra="forbid")

    recommendation: str = Field(min_length=1)
    scalability: float = Field(default=0.5, ge=0, le=1)
    compliance: float = Field(default=0.5, ge=0, le=1)
    reputation: float = Field(default=0.5, ge=0, le=1)
    financial_upside: float = Field(default=0.5, ge=0, le=1)
    downside_risk: float = Field(default=0.5, ge=0, le=1)
    delegation_potential: float = Field(default=0.5, ge=0, le=1)
    operational_complexity: float = Field(default=0.5, ge=0, le=1)
    cash_impact: float = Field(default=0.5, ge=0, le=1)
    customer_trust: float = Field(default=0.5, ge=0, le=1)
    legal_exposure: float = Field(default=0.3, ge=0, le=1)
    founder_freedom: float = Field(default=0.5, ge=0, le=1)
    long_term_enterprise_value: float = Field(default=0.5, ge=0, le=1)


class OperatorReview(BaseModel):
    """Mirror of OperatorReviewSchema (operator-mode.ts)."""

    model_config = ConfigDict(extra="forbid")

    recommendation: str = Field(min_length=1)
    hundred_m_fit: float = Field(ge=0, le=1)
    passes: bool
    weaknesses: list[str] = Field(default_factory=list)
    scalable_version: str = ""
    verdict: str = Field(min_length=1)


# --- Capital Allocation Board contracts (mirror of capital-board.ts) ---

CapitalDisposition = Literal[
    "invest", "test", "delay", "automate", "delegate", "kill", "sell", "package_founderos",
]


class BoardOptionInput(BaseModel):
    """Mirror of BoardOptionInputSchema (capital-board.ts)."""

    model_config = ConfigDict(extra="forbid")

    label: str = Field(min_length=1)
    expected_return: float = Field(default=0, ge=0, le=1)
    risk: float = Field(default=0.5, ge=0, le=1)
    payback_months: float = Field(default=0, ge=0)
    liquidity_impact: float = Field(default=0, ge=0, le=1)
    leverage: float = Field(default=0, ge=0, le=1)
    compounding: float = Field(default=0, ge=0, le=1)
    automatable: bool = False
    delegatable: bool = False
    packageable: bool = False


class AllocateBoardInput(BaseModel):
    """Mirror of AllocateBoardInputSchema (capital-board.ts)."""

    model_config = ConfigDict(extra="forbid")

    options: list[BoardOptionInput] = Field(min_length=1)


class BoardOptionVerdict(BaseModel):
    """Mirror of BoardOptionVerdictSchema (capital-board.ts)."""

    model_config = ConfigDict(extra="forbid")

    label: str = Field(min_length=1)
    composite_score: float
    opportunity_cost: float
    disposition: CapitalDisposition
    reason: str = Field(min_length=1)


class CapitalBoardDecision(BaseModel):
    """Mirror of CapitalBoardDecisionSchema (capital-board.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    verdicts: list[BoardOptionVerdict] = Field(default_factory=list)
    top_pick: str = Field(min_length=1)
    created_at: datetime


# --- Million-Dollar Sprint Engine contracts (mirror of million-sprint.ts) ---


class CashPathInput(BaseModel):
    """Mirror of CashPathInputSchema (million-sprint.ts)."""

    model_config = ConfigDict(extra="forbid")

    label: str = Field(min_length=1)
    deal_size_usd: float = Field(ge=0)
    probability: float = Field(default=0.5, ge=0, le=1)
    speed_days: float = Field(default=30, ge=0)
    effort: float = Field(default=0.5, ge=0, le=1)
    legal_risk: float = Field(default=0.2, ge=0, le=1)
    relationship_leverage: float = Field(default=0.5, ge=0, le=1)
    asset_readiness: float = Field(default=0.5, ge=0, le=1)
    founder_energy: float = Field(default=0.5, ge=0, le=1)
    assumptions: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)


class BuildSprintInput(BaseModel):
    """Mirror of BuildSprintInputSchema (million-sprint.ts)."""

    model_config = ConfigDict(extra="forbid")

    target_usd: float = Field(default=1_000_000, gt=0)
    paths: list[CashPathInput] = Field(min_length=1)


class RankedCashPath(BaseModel):
    """Mirror of RankedCashPathSchema (million-sprint.ts)."""

    model_config = ConfigDict(extra="forbid")

    label: str = Field(min_length=1)
    expected_cash_usd: float = Field(ge=0)
    velocity: float = Field(ge=0)
    score: float
    assumptions: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    required_actions: list[str] = Field(default_factory=list)


class SprintPlan(BaseModel):
    """Mirror of SprintPlanSchema (million-sprint.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    target_usd: float = Field(gt=0)
    ranked_paths: list[RankedCashPath] = Field(default_factory=list)
    expected_total_cash_usd: float = Field(ge=0)
    plan_7_day: list[str] = Field(default_factory=list)
    plan_30_day: list[str] = Field(default_factory=list)
    plan_90_day: list[str] = Field(default_factory=list)
    daily_money_actions: list[str] = Field(default_factory=list)
    realistic: bool
    created_at: datetime


# --- Revenue Truth System contracts (mirror of revenue-truth.ts) ---

RevenueStage = Literal[
    "idea", "lead", "warm_lead", "qualified", "proposal", "verbal_yes", "signed", "invoice_sent", "cash_collected",
]


class TruthDeal(BaseModel):
    """Mirror of TruthDealSchema (revenue-truth.ts)."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    stage: RevenueStage
    value_usd: float = Field(default=0, ge=0)
    probability: float = Field(default=0.5, ge=0, le=1)
    days_idle: int = Field(default=0, ge=0)


class RevenueTruthInput(BaseModel):
    """Mirror of RevenueTruthInputSchema (revenue-truth.ts)."""

    model_config = ConfigDict(extra="forbid")

    business_name: str = Field(min_length=1)
    business_id: UUID | None = None
    deals: list[TruthDeal] = Field(default_factory=list)
    stalled_after_days: int = Field(default=14, gt=0)


class RevenueTruthReport(BaseModel):
    """Mirror of RevenueTruthReportSchema (revenue-truth.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    business_name: str = Field(min_length=1)
    cash_collected_usd: float = Field(ge=0)
    signed_usd: float = Field(ge=0)
    invoices_sent_usd: float = Field(ge=0)
    qualified_pipeline_usd: float = Field(ge=0)
    booked_calls: int = Field(ge=0)
    probability_weighted_pipeline_usd: float = Field(ge=0)
    stalled_deals: list[str] = Field(default_factory=list)
    next_money_action: str = Field(min_length=1)
    created_at: datetime


# --- Executive Delegation System contracts (mirror of delegation.ts) ---

TaskOwner = Literal[
    "alyssa_only", "ai_agent", "human_contractor", "specialist", "attorney_cpa", "assistant",
    "automation", "defer", "delete",
]


class ClassifyTaskInput(BaseModel):
    """Mirror of ClassifyTaskInputSchema (delegation.ts)."""

    model_config = ConfigDict(extra="forbid")

    task: str = Field(min_length=1)
    founder_time_cost_hours: float = Field(default=0, ge=0)
    skill_requirement: float = Field(default=0.5, ge=0, le=1)
    risk: float = Field(default=0.3, ge=0, le=1)
    repeatability: float = Field(default=0.5, ge=0, le=1)
    delegation_readiness: float = Field(default=0.5, ge=0, le=1)
    sop_available: bool = False
    needs_alyssa_judgment: bool = False
    business_id: UUID | None = None


class DelegationDecision(BaseModel):
    """Mirror of DelegationDecisionSchema (delegation.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    task: str = Field(min_length=1)
    owner: TaskOwner
    reason: str = Field(min_length=1)
    hours_returned: float = Field(ge=0)
    created_at: datetime


# --- Enterprise Risk Register contracts (mirror of risk-register.ts) ---

RiskCategory = Literal[
    "legal", "tax", "security", "financial", "operational", "reputational", "compliance",
    "health_energy", "relationship", "technology", "vendor", "customer", "data_privacy",
]

RiskRegisterStatus = Literal["open", "mitigating", "monitored", "closed"]


class AddRiskInput(BaseModel):
    """Mirror of AddRiskInputSchema (risk-register.ts)."""

    model_config = ConfigDict(extra="forbid")

    category: RiskCategory
    title: str = Field(min_length=1)
    severity: float = Field(default=0.5, ge=0, le=1)
    likelihood: float = Field(default=0.5, ge=0, le=1)
    owner: str = ""
    mitigation: str = ""
    deadline: datetime | None = None
    escalation_trigger: str = ""
    affected_businesses: list[str] = Field(default_factory=list)


class EnterpriseRisk(BaseModel):
    """Mirror of EnterpriseRiskSchema (risk-register.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    category: RiskCategory
    title: str = Field(min_length=1)
    severity: float = Field(ge=0, le=1)
    likelihood: float = Field(ge=0, le=1)
    exposure: float = Field(ge=0, le=1)
    owner: str = ""
    mitigation: str = ""
    deadline: datetime | None = None
    escalation_trigger: str = ""
    affected_businesses: list[str] = Field(default_factory=list)
    status: RiskRegisterStatus = "open"
    created_at: datetime
    updated_at: datetime


# --- Board Packet Generator contracts (mirror of board-packet.ts) ---


class GenerateBoardPacketInput(BaseModel):
    """Mirror of GenerateBoardPacketInputSchema (board-packet.ts)."""

    model_config = ConfigDict(extra="forbid")

    period_label: str = Field(min_length=1)
    executive_summary: str = ""
    cash_usd: float = 0
    mrr_usd: float = Field(default=0, ge=0)
    weighted_pipeline_usd: float = Field(default=0, ge=0)
    kpis: dict[str, float] = Field(default_factory=dict)
    top_risks: list[str] = Field(default_factory=list)
    major_decisions: list[str] = Field(default_factory=list)
    hiring_needs: list[str] = Field(default_factory=list)
    product_progress: list[str] = Field(default_factory=list)
    sales_progress: list[str] = Field(default_factory=list)
    capital_allocation: list[str] = Field(default_factory=list)
    legal_compliance: list[str] = Field(default_factory=list)


class PacketSection(BaseModel):
    """Mirror of PacketSectionSchema (board-packet.ts)."""

    model_config = ConfigDict(extra="forbid")

    heading: str = Field(min_length=1)
    items: list[str] = Field(default_factory=list)


class BoardPacket(BaseModel):
    """Mirror of BoardPacketSchema (board-packet.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    period_label: str = Field(min_length=1)
    executive_summary: str = Field(min_length=1)
    sections: list[PacketSection] = Field(default_factory=list)
    next_30_60_90: list[str] = Field(default_factory=list)
    created_at: datetime


# --- Strategic Exit & Asset Value Engine contracts (mirror of strategic-exit.ts) ---

ExitPath = Literal[
    "cash_flow_business", "saas_product", "agency_service", "licensing_asset", "acquisition_target",
    "joint_venture", "sellable_micro_business", "investor_backed_company",
]


class AssessExitInput(BaseModel):
    """Mirror of AssessExitInputSchema (strategic-exit.ts)."""

    model_config = ConfigDict(extra="forbid")

    asset_name: str = Field(min_length=1)
    business_id: UUID | None = None
    annual_revenue_usd: float = Field(default=0, ge=0)
    recurring: float = Field(default=0, ge=0, le=1)
    defensibility: float = Field(default=0.5, ge=0, le=1)
    documentation: float = Field(default=0.3, ge=0, le=1)
    transferability: float = Field(default=0.5, ge=0, le=1)
    strategic_value: float = Field(default=0.5, ge=0, le=1)


class ExitAssessment(BaseModel):
    """Mirror of ExitAssessmentSchema (strategic-exit.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    asset_name: str = Field(min_length=1)
    recommended_paths: list[ExitPath] = Field(default_factory=list)
    potential_buyers: list[str] = Field(default_factory=list)
    valuation_logic: str = Field(min_length=1)
    revenue_multiple: float = Field(ge=0)
    estimated_value_usd: float = Field(ge=0)
    strategic_value: float = Field(ge=0, le=1)
    missing_proof: list[str] = Field(default_factory=list)
    missing_documentation: list[str] = Field(default_factory=list)
    steps_to_sellable: list[str] = Field(default_factory=list)
    sellability: float = Field(ge=0, le=1)
    created_at: datetime


# --- Founder Nervous System Protection contracts (mirror of nervous-system.ts) ---


class NervousSystemInput(BaseModel):
    """Mirror of NervousSystemInputSchema (nervous-system.ts)."""

    model_config = ConfigDict(extra="forbid")

    cognitive_load: float = Field(default=0.5, ge=0, le=1)
    emotional_load: float = Field(default=0.5, ge=0, le=1)
    meeting_density: float = Field(default=0.5, ge=0, le=1)
    decision_fatigue: float = Field(default=0.5, ge=0, le=1)
    repetitive_work: float = Field(default=0.5, ge=0, le=1)
    conflict_exposure: float = Field(default=0.3, ge=0, le=1)
    sleep_energy: float = Field(default=0.6, ge=0, le=1)
    unresolved_stress_loops: int = Field(default=0, ge=0)


NervousAction = Literal[
    "delegate", "delay", "batch", "automate", "cancel", "simplify", "escalate_to_agent", "convert_to_checklist",
]


class NervousRecommendation(BaseModel):
    """Mirror of NervousRecommendationSchema (nervous-system.ts)."""

    model_config = ConfigDict(extra="forbid")

    action: NervousAction
    target: str = Field(min_length=1)
    reason: str = Field(min_length=1)


class NervousSystemReport(BaseModel):
    """Mirror of NervousSystemReportSchema (nervous-system.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    load_index: float = Field(ge=0, le=1)
    status: Literal["ok", "elevated", "high", "critical"]
    recommendations: list[NervousRecommendation] = Field(default_factory=list)
    burnout_risk_flagged: bool
    created_at: datetime


# --- Outcome engines: Relaxation Outcome (mirror of outcome-engines.ts) ---

RelaxBucket = Literal[
    "must_do", "can_delegate", "can_automate", "can_ignore", "can_wait", "approval_only",
]


class RelaxItemInput(BaseModel):
    """Mirror of RelaxItemInputSchema (outcome-engines.ts)."""

    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1)
    requires_alyssa: float = Field(default=0.5, ge=0, le=1)
    automatable: bool = False
    delegatable: bool = False
    value: float = Field(default=0.5, ge=0, le=1)
    approval_only: bool = False


class RelaxPlanInput(BaseModel):
    """Mirror of RelaxPlanInputSchema (outcome-engines.ts)."""

    model_config = ConfigDict(extra="forbid")

    items: list[RelaxItemInput] = Field(default_factory=list)


class RelaxItem(BaseModel):
    """Mirror of RelaxItemSchema (outcome-engines.ts)."""

    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1)
    bucket: RelaxBucket


class RelaxationPlan(BaseModel):
    """Mirror of RelaxationPlanSchema (outcome-engines.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    items: list[RelaxItem] = Field(default_factory=list)
    must_do: list[str] = Field(default_factory=list)
    offload_ratio: float = Field(ge=0, le=1)
    created_at: datetime


# --- Outcome engines: True Progress (mirror of outcome-engines.ts) ---

ProgressKind = Literal[
    "real_progress", "fake_progress", "maintenance", "distraction",
    "risk_reduction", "revenue_creation", "leverage_creation", "freedom_creation",
]

ProgressAction = Literal[
    "keep", "delegate", "automate", "pause", "delete", "simplify", "convert_to_ip", "move_to_later", "assign_to_agent",
]


class AssessProgressInput(BaseModel):
    """Mirror of AssessProgressInputSchema (outcome-engines.ts)."""

    model_config = ConfigDict(extra="forbid")

    initiative: str = Field(min_length=1)
    makes_money: float = Field(default=0, ge=0, le=1)
    reduces_risk: float = Field(default=0, ge=0, le=1)
    saves_future_time: float = Field(default=0, ge=0, le=1)
    increases_freedom: float = Field(default=0, ge=0, le=1)
    creates_reusable_assets: float = Field(default=0, ge=0, le=1)
    moves_a_goal: float = Field(default=0, ge=0, le=1)
    activity_only: float = Field(default=0, ge=0, le=1)


class ProgressAssessment(BaseModel):
    """Mirror of ProgressAssessmentSchema (outcome-engines.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    initiative: str = Field(min_length=1)
    kind: ProgressKind
    outcome_score: float = Field(ge=0, le=1)
    recommended_action: ProgressAction
    reason: str = Field(min_length=1)
    created_at: datetime


# --- Capital Engine contracts (mirror of capital-engine.ts) ---

CapitalType = Literal[
    "financial", "knowledge", "relationship", "reputation", "operational",
    "technology", "automation", "intellectual_property", "health_energy", "freedom",
]


class CapitalDeltas(BaseModel):
    """Mirror of CapitalDeltasSchema (capital-engine.ts)."""

    model_config = ConfigDict(extra="forbid")

    financial: float = Field(default=0, ge=-1, le=1)
    knowledge: float = Field(default=0, ge=-1, le=1)
    relationship: float = Field(default=0, ge=-1, le=1)
    reputation: float = Field(default=0, ge=-1, le=1)
    operational: float = Field(default=0, ge=-1, le=1)
    technology: float = Field(default=0, ge=-1, le=1)
    automation: float = Field(default=0, ge=-1, le=1)
    intellectual_property: float = Field(default=0, ge=-1, le=1)
    health_energy: float = Field(default=0, ge=-1, le=1)
    freedom: float = Field(default=0, ge=-1, le=1)


class CapitalReportInput(BaseModel):
    """Mirror of CapitalReportInputSchema (capital-engine.ts)."""

    model_config = ConfigDict(extra="forbid")

    recommendation: str = Field(min_length=1)
    deltas: CapitalDeltas
    compounding: float = Field(default=0.5, ge=0, le=1)
    payoff_months: float = Field(default=0, ge=0)


class CapitalReport(BaseModel):
    """Mirror of CapitalReportSchema (capital-engine.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    recommendation: str = Field(min_length=1)
    deltas: CapitalDeltas
    increases: list[CapitalType] = Field(default_factory=list)
    decreases: list[CapitalType] = Field(default_factory=list)
    net_capital: float = Field(ge=-1, le=1)
    compounding: float = Field(ge=0, le=1)
    payoff_months: float = Field(ge=0)
    conversion_paths: list[str] = Field(default_factory=list)
    created_at: datetime


# --- Consequence Horizon Engine contracts (mirror of consequence-horizon.ts) ---

Horizon = Literal["immediate", "30_day", "90_day", "1_year", "5_year"]


class ProjectConsequencesInput(BaseModel):
    """Mirror of ProjectConsequencesInputSchema (consequence-horizon.ts)."""

    model_config = ConfigDict(extra="forbid")

    decision: str = Field(min_length=1)
    immediate_value: float = Field(default=0.5, ge=0, le=1)
    compounding: float = Field(default=0.5, ge=0, le=1)
    doors: list[str] = Field(default_factory=list)


class HorizonImpact(BaseModel):
    """Mirror of HorizonImpactSchema (consequence-horizon.ts)."""

    model_config = ConfigDict(extra="forbid")

    horizon: Horizon
    value: float = Field(ge=0, le=1)
    note: str = ""


class ConsequenceProjection(BaseModel):
    """Mirror of ConsequenceProjectionSchema (consequence-horizon.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    decision: str = Field(min_length=1)
    horizons: list[HorizonImpact] = Field(default_factory=list)
    doors_opened: list[str] = Field(default_factory=list)
    long_term_leverage: float = Field(ge=0, le=1)
    recommendation: str = Field(min_length=1)
    created_at: datetime


# --- The Alfy² Pyramid contracts (mirror of pyramid.ts) ---

PyramidLevel = Literal[
    "capture", "organize", "understand", "recommend", "execute", "compound", "multiply", "freedom",
]


class ClassifyPyramidInput(BaseModel):
    """Mirror of ClassifyPyramidInputSchema (pyramid.ts)."""

    model_config = ConfigDict(extra="forbid")

    feature: str = Field(min_length=1)
    captures: float = Field(default=0, ge=0, le=1)
    organizes: float = Field(default=0, ge=0, le=1)
    understands: float = Field(default=0, ge=0, le=1)
    recommends: float = Field(default=0, ge=0, le=1)
    executes: float = Field(default=0, ge=0, le=1)
    compounds: float = Field(default=0, ge=0, le=1)
    multiplies: float = Field(default=0, ge=0, le=1)
    creates_freedom: float = Field(default=0, ge=0, le=1)


class PyramidPlacement(BaseModel):
    """Mirror of PyramidPlacementSchema (pyramid.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    feature: str = Field(min_length=1)
    current_level: PyramidLevel
    next_level: PyramidLevel | None = None
    how_to_advance: str = Field(min_length=1)
    created_at: datetime


# --- Research & Development Department contracts (mirror of rnd.ts) ---

RndDomain = Literal[
    "ai_model", "github_repo", "research_paper", "patent", "startup", "competitor", "api", "hardware",
    "quantum", "security", "robotics", "healthcare", "construction", "real_estate", "finance",
    "regulation", "emerging_industry", "workflow", "automation",
]

RndDisposition = Literal[
    "learn", "test", "implement", "ignore", "watch", "invest", "build_on", "partner",
]


class EvaluateDiscoveryInput(BaseModel):
    """Mirror of EvaluateDiscoveryInputSchema (rnd.ts)."""

    model_config = ConfigDict(extra="forbid")

    domain: RndDomain
    title: str = Field(min_length=1)
    summary: str = ""
    relevance: float = Field(default=0.5, ge=0, le=1)
    upside: float = Field(default=0.5, ge=0, le=1)
    maturity: float = Field(default=0.5, ge=0, le=1)
    effort: float = Field(default=0.5, ge=0, le=1)
    risk: float = Field(default=0.3, ge=0, le=1)


class RndDiscovery(BaseModel):
    """Mirror of RndDiscoverySchema (rnd.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    domain: RndDomain
    title: str = Field(min_length=1)
    disposition: RndDisposition
    confidence: float = Field(ge=0, le=1)
    high_confidence: bool
    rationale: str = Field(min_length=1)
    next_step: str = Field(min_length=1)
    created_at: datetime


class InnovationReport(BaseModel):
    """Mirror of InnovationReportSchema (rnd.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    period_label: str = Field(min_length=1)
    evaluated_count: int = Field(ge=0)
    high_confidence_count: int = Field(ge=0)
    top_opportunities: list[RndDiscovery] = Field(default_factory=list)
    watch_list: list[str] = Field(default_factory=list)
    created_at: datetime


# --- Acquisition Engine contracts (mirror of acquisition.ts) ---

AcquisitionStrategy = Literal[
    "build", "buy", "partner", "license", "white_label", "acquire", "invest", "ignore",
]


class StrategySignals(BaseModel):
    """Mirror of StrategySignalsSchema (acquisition.ts)."""

    model_config = ConfigDict(extra="forbid")

    strategy: AcquisitionStrategy
    time: float = Field(default=0.5, ge=0, le=1)
    cost: float = Field(default=0.5, ge=0, le=1)
    revenue: float = Field(default=0.5, ge=0, le=1)
    risk: float = Field(default=0.5, ge=0, le=1)
    leverage: float = Field(default=0.5, ge=0, le=1)
    complexity: float = Field(default=0.5, ge=0, le=1)
    strategic_value: float = Field(default=0.5, ge=0, le=1)
    feasible: bool = True


class EvaluateAcquisitionInput(BaseModel):
    """Mirror of EvaluateAcquisitionInputSchema (acquisition.ts)."""

    model_config = ConfigDict(extra="forbid")

    opportunity: str = Field(min_length=1)
    options: list[StrategySignals] = Field(min_length=1)


class StrategyVerdict(BaseModel):
    """Mirror of StrategyVerdictSchema (acquisition.ts)."""

    model_config = ConfigDict(extra="forbid")

    strategy: AcquisitionStrategy
    score: float
    note: str = Field(min_length=1)


class AcquisitionEvaluation(BaseModel):
    """Mirror of AcquisitionEvaluationSchema (acquisition.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    opportunity: str = Field(min_length=1)
    verdicts: list[StrategyVerdict] = Field(default_factory=list)
    recommendation: AcquisitionStrategy
    reason: str = Field(min_length=1)
    created_at: datetime


# --- Executive Flight Deck contracts (mirror of flight-deck.ts) ---

FlightDeckSectionKind = Literal[
    "founder_freedom_index", "life_roi", "capital_dashboard", "revenue_engine", "cash_position", "deal_desk",
    "top_opportunities", "top_risks", "goals", "enterprise_health", "company_health", "agent_health",
    "automation_health", "approvals_waiting", "strategic_decisions", "calendar", "daily_intelligence",
    "reading_queue", "relationship_alerts", "next_highest_leverage_action",
]


class FlightDeckCandidate(BaseModel):
    """Mirror of FlightDeckCandidateSchema (flight-deck.ts)."""

    model_config = ConfigDict(extra="forbid")

    kind: FlightDeckSectionKind
    headline: str = Field(min_length=1)
    decision_impact: float = Field(default=0, ge=0, le=1)
    detail: str = ""


class BuildFlightDeckInput(BaseModel):
    """Mirror of BuildFlightDeckInputSchema (flight-deck.ts)."""

    model_config = ConfigDict(extra="forbid")

    candidates: list[FlightDeckCandidate] = Field(default_factory=list)
    display_threshold: float = Field(default=0.4, ge=0, le=1)


class FlightDeckSection(BaseModel):
    """Mirror of FlightDeckSectionSchema (flight-deck.ts)."""

    model_config = ConfigDict(extra="forbid")

    kind: FlightDeckSectionKind
    headline: str = Field(min_length=1)
    decision_impact: float = Field(ge=0, le=1)


class FlightDeck(BaseModel):
    """Mirror of FlightDeckSchema (flight-deck.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    displayed: list[FlightDeckSection] = Field(default_factory=list)
    suppressed_count: int = Field(ge=0)
    next_highest_leverage_action: str = Field(min_length=1)
    created_at: datetime


# --- Founder Freedom Index contracts (mirror of freedom-index.ts) ---

FreedomTrend = Literal["increasing", "flat", "decreasing"]


class FreedomIndexInput(BaseModel):
    """Mirror of FreedomIndexInputSchema (freedom-index.ts)."""

    model_config = ConfigDict(extra="forbid")

    period_label: str = Field(min_length=1)
    hours_delegated: float = Field(default=0, ge=0)
    hours_automated: float = Field(default=0, ge=0)
    hours_saved: float = Field(default=0, ge=0)
    decision_load: float = Field(default=0.5, ge=0, le=1)
    meetings_avoided: int = Field(default=0, ge=0)
    follow_ups_automated: int = Field(default=0, ge=0)
    content_automated: int = Field(default=0, ge=0)
    revenue_per_founder_hour: float = Field(default=0, ge=0)
    stress: float = Field(default=0.5, ge=0, le=1)
    recovery_time: float = Field(default=0.5, ge=0, le=1)
    family_time: float = Field(default=0.5, ge=0, le=1)
    creative_work: float = Field(default=0.5, ge=0, le=1)
    outdoor_time: float = Field(default=0.5, ge=0, le=1)
    previous_score: float | None = Field(default=None, ge=0, le=100)


class FreedomIndexReading(BaseModel):
    """Mirror of FreedomIndexReadingSchema (freedom-index.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    period_label: str = Field(min_length=1)
    score: float = Field(ge=0, le=100)
    trend: FreedomTrend
    biggest_bottleneck: str = Field(min_length=1)
    recommendation: str = Field(min_length=1)
    created_at: datetime


# --- Life ROI Engine contracts (mirror of life-roi.ts) ---


class LifeRoiInput(BaseModel):
    """Mirror of LifeRoiInputSchema (life-roi.ts)."""

    model_config = ConfigDict(extra="forbid")

    workflow: str = Field(min_length=1)
    hours_saved_per_week: float = Field(default=0, ge=0)
    decisions_eliminated: int = Field(default=0, ge=0)
    meetings_eliminated: int = Field(default=0, ge=0)
    emails_eliminated: int = Field(default=0, ge=0)
    stress_reduced: float = Field(default=0, ge=0, le=1)
    revenue_maintained_usd: float = Field(default=0, ge=0)
    annual_cost_usd: float = Field(default=0, ge=0)
    founder_hour_value_usd: float = Field(default=250, ge=0)


class LifeRoiAssessment(BaseModel):
    """Mirror of LifeRoiAssessmentSchema (life-roi.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    workflow: str = Field(min_length=1)
    hours_saved_per_year: float = Field(ge=0)
    workdays_returned: float = Field(ge=0)
    financial_roi: float
    decisions_eliminated: int = Field(ge=0)
    meetings_eliminated: int = Field(ge=0)
    emails_eliminated: int = Field(ge=0)
    freedom_gained: float = Field(ge=0, le=1)
    life_roi_score: float = Field(ge=0, le=1)
    summary: str = Field(min_length=1)
    created_at: datetime


# --- Never Again Engine contracts (mirror of never-again.ts) ---

FrustrationTrigger = Literal[
    "i_forgot", "happened_again", "annoying", "i_hate_this", "always_breaks", "wastes_time",
]


class CaptureFrustrationInput(BaseModel):
    """Mirror of CaptureFrustrationInputSchema (never-again.ts)."""

    model_config = ConfigDict(extra="forbid")

    trigger: FrustrationTrigger
    description: str = Field(min_length=1)
    occurrences: int = Field(default=1, gt=0)
    business_id: UUID | None = None


class NeverAgainSolution(BaseModel):
    """Mirror of NeverAgainSolutionSchema (never-again.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    trigger: FrustrationTrigger
    problem: str = Field(min_length=1)
    root_cause: str = Field(min_length=1)
    permanent_solution: str = Field(min_length=1)
    workflow: str = ""
    automation: str = ""
    agent: str = ""
    checklist: list[str] = Field(default_factory=list)
    sop: str = ""
    reminder: str = ""
    knowledge_update: str = ""
    policy: str = ""
    priority: float = Field(ge=0, le=1)
    created_at: datetime


# --- Enterprise Self-Improvement Engine contracts (mirror of self-improvement.ts) ---

SelfImprovementFindingKind = Literal[
    "slow", "duplicated", "fragile", "confusing", "simplify", "merge", "retire", "promote_to_infrastructure",
]


class SystemComponentInput(BaseModel):
    """Mirror of SystemComponentInputSchema (self-improvement.ts)."""

    model_config = ConfigDict(extra="forbid")

    component: str = Field(min_length=1)
    latency: float = Field(default=0.3, ge=0, le=1)
    duplication: float = Field(default=0, ge=0, le=1)
    fragility: float = Field(default=0.2, ge=0, le=1)
    confusion: float = Field(default=0.2, ge=0, le=1)
    usage: float = Field(default=0.5, ge=0, le=1)
    reuse_potential: float = Field(default=0.3, ge=0, le=1)


class EvaluateSystemInput(BaseModel):
    """Mirror of EvaluateSystemInputSchema (self-improvement.ts)."""

    model_config = ConfigDict(extra="forbid")

    period_label: str = Field(min_length=1)
    components: list[SystemComponentInput] = Field(default_factory=list)


class SelfImprovementFinding(BaseModel):
    """Mirror of SelfImprovementFindingSchema (self-improvement.ts)."""

    model_config = ConfigDict(extra="forbid")

    component: str = Field(min_length=1)
    kind: SelfImprovementFindingKind
    recommendation: str = Field(min_length=1)
    priority: float = Field(ge=0, le=1)


class SelfImprovementReport(BaseModel):
    """Mirror of SelfImprovementReportSchema (self-improvement.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    period_label: str = Field(min_length=1)
    findings: list[SelfImprovementFinding] = Field(default_factory=list)
    refactoring_plan: list[str] = Field(default_factory=list)
    tech_debt: list[str] = Field(default_factory=list)
    complexity_delta: float = Field(ge=-1, le=1)
    created_at: datetime


# --- Enterprise Operating Rhythm contracts (mirror of operating-rhythm.ts) ---

RhythmCadence = Literal["daily", "weekly", "monthly", "quarterly", "annual"]


class BuildRhythmInput(BaseModel):
    """Mirror of BuildRhythmInputSchema (operating-rhythm.ts)."""

    model_config = ConfigDict(extra="forbid")

    cadence: RhythmCadence
    date: datetime


class RhythmOutputs(BaseModel):
    """Mirror of RhythmOutputsSchema (operating-rhythm.ts)."""

    model_config = ConfigDict(extra="forbid")

    lessons: bool = True
    decisions: bool = True
    assets: bool = True
    sops: bool = True
    new_agents: bool = True
    archived_workflows: bool = True
    updated_goals: bool = True


class OperatingRhythmAgenda(BaseModel):
    """Mirror of OperatingRhythmAgendaSchema (operating-rhythm.ts)."""

    model_config = ConfigDict(extra="forbid")

    cadence: RhythmCadence
    date: datetime
    agenda: list[str] = Field(default_factory=list)
    generates: RhythmOutputs


# --- Executive Operating Manual contracts (mirror of exec-operating-manual.ts) ---

ExecManualDomain = Literal[
    "architecture", "agents", "algorithms", "departments", "policies", "connectors", "integrations",
    "workflows", "security", "approvals", "capital_allocation", "constitution", "operating_rhythm",
]


class ManualSourceInput(BaseModel):
    """Mirror of ManualSourceInputSchema (exec-operating-manual.ts)."""

    model_config = ConfigDict(extra="forbid")

    domain: ExecManualDomain
    summary: str = ""
    source_updated_at: datetime
    section_updated_at: datetime


class AssembleManualInput(BaseModel):
    """Mirror of AssembleManualInputSchema (exec-operating-manual.ts)."""

    model_config = ConfigDict(extra="forbid")

    sources: list[ManualSourceInput] = Field(default_factory=list)


class ExecManualSection(BaseModel):
    """Mirror of ExecManualSectionSchema (exec-operating-manual.ts)."""

    model_config = ConfigDict(extra="forbid")

    domain: ExecManualDomain
    summary: str = ""
    stale: bool


class ExecutiveOperatingManualDoc(BaseModel):
    """Mirror of ExecutiveOperatingManualDocSchema (exec-operating-manual.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    sections: list[ExecManualSection] = Field(default_factory=list)
    stale_domains: list[ExecManualDomain] = Field(default_factory=list)
    fully_current: bool
    created_at: datetime


# --- The Infinite Loop contracts (mirror of infinite-loop.ts) ---

LoopStage = Literal[
    "observe", "capture", "organize", "understand", "decide", "execute",
    "measure", "reflect", "improve", "compound", "multiply", "increase_freedom",
]


class PlaceInLoopInput(BaseModel):
    """Mirror of PlaceInLoopInputSchema (infinite-loop.ts)."""

    model_config = ConfigDict(extra="forbid")

    module: str = Field(min_length=1)
    observe: float = Field(default=0, ge=0, le=1)
    capture: float = Field(default=0, ge=0, le=1)
    organize: float = Field(default=0, ge=0, le=1)
    understand: float = Field(default=0, ge=0, le=1)
    decide: float = Field(default=0, ge=0, le=1)
    execute: float = Field(default=0, ge=0, le=1)
    measure: float = Field(default=0, ge=0, le=1)
    reflect: float = Field(default=0, ge=0, le=1)
    improve: float = Field(default=0, ge=0, le=1)
    compound: float = Field(default=0, ge=0, le=1)
    multiply: float = Field(default=0, ge=0, le=1)
    increase_freedom: float = Field(default=0, ge=0, le=1)


class LoopPlacement(BaseModel):
    """Mirror of LoopPlacementSchema (infinite-loop.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    module: str = Field(min_length=1)
    primary_stage: LoopStage
    feeds_stage: LoopStage
    in_loop: bool
    note: str = Field(min_length=1)
    created_at: datetime


# --- The Ultimate Design Rule contracts (mirror of ultimate-design-rule.ts) ---

DesignRuleCriterion = Literal[
    "increases_leverage", "reduces_friction", "compounds_knowledge",
    "protects_trust", "generates_measurable_value", "increases_founder_freedom",
]


class EvaluateFeatureInput(BaseModel):
    """Mirror of EvaluateFeatureInputSchema (ultimate-design-rule.ts)."""

    model_config = ConfigDict(extra="forbid")

    feature: str = Field(min_length=1)
    increases_leverage: float = Field(default=0, ge=0, le=1)
    reduces_friction: float = Field(default=0, ge=0, le=1)
    compounds_knowledge: float = Field(default=0, ge=0, le=1)
    protects_trust: float = Field(default=0, ge=0, le=1)
    generates_measurable_value: float = Field(default=0, ge=0, le=1)
    increases_founder_freedom: float = Field(default=0, ge=0, le=1)
    threshold: float = Field(default=0.5, ge=0, le=1)


class DesignRuleVerdict(BaseModel):
    """Mirror of DesignRuleVerdictSchema (ultimate-design-rule.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    feature: str = Field(min_length=1)
    satisfied: list[DesignRuleCriterion] = Field(default_factory=list)
    belongs: bool
    verdict: str = Field(min_length=1)
    created_at: datetime


# --- Identity OS contracts (mirror of identity-os.ts) ---

IdentityAnchorKind = Literal[
    "mission", "core_value", "long_term_vision", "personal_philosophy", "business_philosophy",
    "non_negotiable", "lifestyle_goal", "family_goal", "health_priority", "legacy_goal", "never_sacrifice",
]


class SetAnchorInput(BaseModel):
    """Mirror of SetAnchorInputSchema (identity-os.ts)."""

    model_config = ConfigDict(extra="forbid")

    kind: IdentityAnchorKind
    statement: str = Field(min_length=1)
    weight: float = Field(default=0.5, ge=0, le=1)


class IdentityAnchor(BaseModel):
    """Mirror of IdentityAnchorSchema (identity-os.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    kind: IdentityAnchorKind
    statement: str = Field(min_length=1)
    weight: float = Field(ge=0, le=1)
    created_at: datetime
    updated_at: datetime


class CheckAlignmentInput(BaseModel):
    """Mirror of CheckAlignmentInputSchema (identity-os.ts)."""

    model_config = ConfigDict(extra="forbid")

    recommendation: str = Field(min_length=1)
    alignment: float = Field(default=0.5, ge=0, le=1)
    freedom_effect: float = Field(default=0.5, ge=0, le=1)
    integrity: float = Field(default=0.5, ge=0, le=1)
    conflicts_non_negotiable: bool = False
    optimization_payoff: float = Field(default=0.5, ge=0, le=1)


class IdentityAlignmentVerdict(BaseModel):
    """Mirror of IdentityAlignmentVerdictSchema (identity-os.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    recommendation: str = Field(min_length=1)
    aligns: bool
    increases_freedom: bool
    preserves_integrity: bool
    future_alyssa_proud: bool
    should_say_no: bool
    identity_overrode_optimization: bool
    verdict: str = Field(min_length=1)
    created_at: datetime


# --- Philosophy Library contracts (mirror of philosophy-library.ts) ---


class AddPhilosophyInput(BaseModel):
    """Mirror of AddPhilosophyInputSchema (philosophy-library.ts)."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    purpose: str = ""
    explanation: str = ""
    visual_diagram: str = ""
    examples: list[str] = Field(default_factory=list)
    related_algorithms: list[str] = Field(default_factory=list)
    related_agents: list[str] = Field(default_factory=list)
    businesses_using: list[str] = Field(default_factory=list)
    core: bool = False


class Philosophy(BaseModel):
    """Mirror of PhilosophySchema (philosophy-library.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    name: str = Field(min_length=1)
    purpose: str = ""
    explanation: str = ""
    visual_diagram: str = ""
    examples: list[str] = Field(default_factory=list)
    related_algorithms: list[str] = Field(default_factory=list)
    related_agents: list[str] = Field(default_factory=list)
    businesses_using: list[str] = Field(default_factory=list)
    core: bool
    revision: int = Field(ge=0)
    created_at: datetime
    updated_at: datetime


class TodaysReminder(BaseModel):
    """Mirror of TodaysReminderSchema (philosophy-library.ts)."""

    model_config = ConfigDict(extra="forbid")

    date: datetime
    philosophy_id: UUID
    name: str = Field(min_length=1)
    purpose: str = ""


# --- Conversation Engine contracts (mirror of conversation.ts) ---

ConversationOutputKind = Literal[
    "task", "asset", "agent", "business", "workflow", "knowledge", "capital",
]


class ProcessConversationInput(BaseModel):
    """Mirror of ProcessConversationInputSchema (conversation.ts)."""

    model_config = ConfigDict(extra="forbid")

    utterance: str = Field(min_length=1)
    known_topics: list[str] = Field(default_factory=list)


class ConversationOutput(BaseModel):
    """Mirror of ConversationOutputSchema (conversation.ts)."""

    model_config = ConfigDict(extra="forbid")

    kind: ConversationOutputKind
    description: str = Field(min_length=1)


class ConversationExtraction(BaseModel):
    """Mirror of ConversationExtractionSchema (conversation.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    utterance: str = Field(min_length=1)
    clarifying_questions: list[str] = Field(default_factory=list)
    connections: list[str] = Field(default_factory=list)
    opportunities: list[str] = Field(default_factory=list)
    challenged_assumptions: list[str] = Field(default_factory=list)
    options: list[str] = Field(default_factory=list)
    patterns: list[str] = Field(default_factory=list)
    conclusion: str = ""
    outputs: list[ConversationOutput] = Field(default_factory=list)
    created_at: datetime


# --- Vision Builder contracts (mirror of vision-builder.ts) ---


class ExploreIdeaInput(BaseModel):
    """Mirror of ExploreIdeaInputSchema (vision-builder.ts)."""

    model_config = ConfigDict(extra="forbid")

    idea: str = Field(min_length=1)
    novelty: float = Field(default=0.5, ge=0, le=1)
    market_pull: float = Field(default=0.5, ge=0, le=1)
    founder_fit: float = Field(default=0.5, ge=0, le=1)
    complexity: float = Field(default=0.5, ge=0, le=1)


class VisionArtifact(BaseModel):
    """Mirror of VisionArtifactSchema (vision-builder.ts)."""

    model_config = ConfigDict(extra="forbid")

    kind: Literal[
        "architecture", "implementation_plan", "business_model", "marketing", "monetization",
        "assets", "agents", "workflows", "roadmap",
    ]
    outline: str = Field(min_length=1)


class VisionSession(BaseModel):
    """Mirror of VisionSessionSchema (vision-builder.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    idea: str = Field(min_length=1)
    exploration: list[str] = Field(default_factory=list)
    challenges: list[str] = Field(default_factory=list)
    strengthened: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    opportunities: list[str] = Field(default_factory=list)
    artifacts: list[VisionArtifact] = Field(default_factory=list)
    promise: float = Field(ge=0, le=1)
    awaiting_approval: Literal[True] = True
    created_at: datetime


# --- Voice Interface contracts (mirror of voice-interface.ts) ---

VoiceCategory = Literal["action", "navigation", "query", "capture", "unknown"]

VoiceIntent = Literal[
    "create", "save", "remember", "approve", "reject", "pause", "send_to_approval", "accept", "cancel",
    "scroll_up", "scroll_down", "go_back", "go_forward", "open_tab", "close_tab", "next_section",
    "previous_section", "expand", "collapse", "search", "open",
    "read_briefing", "read_this", "summarize", "explain_decision", "what_needs_me", "what_makes_money_fastest",
    "show", "build_with_me",
    "capture_idea", "voice_note",
    "unknown",
]


class InterpretVoiceInput(BaseModel):
    """Mirror of InterpretVoiceInputSchema (voice-interface.ts)."""

    model_config = ConfigDict(extra="forbid")

    utterance: str = Field(min_length=1)


class VoiceCommand(BaseModel):
    """Mirror of VoiceCommandSchema (voice-interface.ts)."""

    model_config = ConfigDict(extra="forbid")

    utterance: str = Field(min_length=1)
    intent: VoiceIntent
    category: VoiceCategory
    target: str | None = None
    requires_confirmation: bool
    spoken_response: str = Field(min_length=1)


# --- Build Packet contracts (mirror of build-packet.ts) ---

BuildPacketStatus = Literal["draft", "in_review", "approved", "sent", "archived"]


class UserStory(BaseModel):
    """Mirror of UserStorySchema (build-packet.ts)."""

    model_config = ConfigDict(extra="forbid")

    as_a: str = Field(min_length=1)
    i_want: str = Field(min_length=1)
    so_that: str = Field(min_length=1)
    acceptance: list[str] = Field(default_factory=list)


class BuildTriage(BaseModel):
    """Mirror of BuildTriageSchema (build-packet.ts)."""

    model_config = ConfigDict(extra="forbid")

    build_now: list[str] = Field(default_factory=list)
    needs_clarification: list[str] = Field(default_factory=list)
    should_wait: list[str] = Field(default_factory=list)
    requires_approval: list[str] = Field(default_factory=list)
    requires_security_review: list[str] = Field(default_factory=list)


class GenerateBuildPacketInput(BaseModel):
    """Mirror of GenerateBuildPacketInputSchema (build-packet.ts)."""

    model_config = ConfigDict(extra="forbid")

    source: str = Field(min_length=1)
    working_name: str = ""


class BuildPacket(BaseModel):
    """Mirror of BuildPacketSchema (build-packet.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    working_name: str = ""
    status: BuildPacketStatus = "draft"
    what_we_are_building: str = ""
    why_we_are_building_it: str = ""
    user_problem: str = ""
    business_value: str = ""
    executive_summary: str = ""
    prd: str = ""
    user_stories: list[UserStory] = Field(default_factory=list)
    technical_architecture: str = ""
    database_schema: str = ""
    supabase_table_plan: str = ""
    api_routes: list[str] = Field(default_factory=list)
    frontend_components: list[str] = Field(default_factory=list)
    agent_requirements: list[str] = Field(default_factory=list)
    security_requirements: list[str] = Field(default_factory=list)
    approval_rules: list[str] = Field(default_factory=list)
    implementation_sequence: list[str] = Field(default_factory=list)
    testing_plan: str = ""
    deployment_plan: str = ""
    coding_agent_build_prompt: str = ""
    required_screens: list[str] = Field(default_factory=list)
    required_backend: list[str] = Field(default_factory=list)
    required_database_tables: list[str] = Field(default_factory=list)
    required_integrations: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)
    acceptance_criteria: list[str] = Field(default_factory=list)
    launch_checklist: list[str] = Field(default_factory=list)
    triage: BuildTriage
    awaiting_approval: bool = True
    created_at: datetime
    updated_at: datetime


# --- Code Execution Handoff contracts (mirror of code-handoff.ts) ---


class GenerateHandoffInput(BaseModel):
    """Mirror of GenerateHandoffInputSchema (code-handoff.ts)."""

    model_config = ConfigDict(extra="forbid")

    build_packet_id: UUID
    packet_approved: bool


class FilePlanEntry(BaseModel):
    """Mirror of FilePlanEntrySchema (code-handoff.ts)."""

    model_config = ConfigDict(extra="forbid")

    path: str = Field(min_length=1)
    action: Literal["create", "modify", "delete"]
    purpose: str = ""


class CodeHandoff(BaseModel):
    """Mirror of CodeHandoffSchema (code-handoff.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    build_packet_id: UUID
    branch_plan: str = Field(min_length=1)
    file_plan: list[FilePlanEntry] = Field(default_factory=list)
    implementation_prompt: str = ""
    acceptance_criteria: list[str] = Field(default_factory=list)
    tests: list[str] = Field(default_factory=list)
    rollback_plan: str = ""
    security_checks: list[str] = Field(default_factory=list)
    database_migration_plan: str = ""
    supabase_configuration: str = ""
    deployment_checklist: list[str] = Field(default_factory=list)
    production_requires_approval: Literal[True] = True
    created_at: datetime


# --- Implementation Review contracts (mirror of implementation-review.ts) ---

ReviewDimension = Literal[
    "satisfied_requirements", "correct_files", "followed_architecture", "no_security_issues",
    "preserved_permissions", "updated_documentation", "included_tests", "no_regressions",
]
ImplementationVerdict = Literal["approve", "needs_revision", "reject"]


class ReviewCheck(BaseModel):
    """Mirror of ReviewCheckSchema (implementation-review.ts)."""

    model_config = ConfigDict(extra="forbid")

    dimension: ReviewDimension
    passed: bool
    note: str = ""


class ReviewImplementationInput(BaseModel):
    """Mirror of ReviewImplementationInputSchema (implementation-review.ts)."""

    model_config = ConfigDict(extra="forbid")

    build_packet_id: UUID | None = None
    handoff_id: UUID | None = None
    checks: list[ReviewCheck] = Field(default_factory=list)


class ImplementationReview(BaseModel):
    """Mirror of ImplementationReviewSchema (implementation-review.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    build_packet_id: UUID | None = None
    handoff_id: UUID | None = None
    checks: list[ReviewCheck] = Field(default_factory=list)
    verdict: ImplementationVerdict
    risks_found: list[str] = Field(default_factory=list)
    recommended_fixes: list[str] = Field(default_factory=list)
    created_at: datetime


# --- Ship Gate contracts (mirror of ship-gate.ts) ---

ShipCheckKind = Literal[
    "requirement", "security", "permission", "database", "test", "documentation", "rollback", "approval",
]
ShipVerdict = Literal["ready_to_ship", "needs_review", "do_not_ship"]


class ShipCheck(BaseModel):
    """Mirror of ShipCheckSchema (ship-gate.ts)."""

    model_config = ConfigDict(extra="forbid")

    kind: ShipCheckKind
    passed: bool
    detail: str = ""


class EvaluateShipInput(BaseModel):
    """Mirror of EvaluateShipInputSchema (ship-gate.ts)."""

    model_config = ConfigDict(extra="forbid")

    build_packet_id: UUID | None = None
    checks: list[ShipCheck] = Field(default_factory=list)
    alyssa_approved: bool = False


class ShipGateEvaluation(BaseModel):
    """Mirror of ShipGateEvaluationSchema (ship-gate.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    build_packet_id: UUID | None = None
    checks: list[ShipCheck] = Field(default_factory=list)
    verdict: ShipVerdict
    blocking: list[ShipCheckKind] = Field(default_factory=list)
    created_at: datetime


# --- Divini Standard contracts (mirror of divini-standard.ts) ---

DiviniCriterion = Literal[
    "trust", "security", "elegance", "simplicity", "scalability", "compounding_value", "founder_freedom",
    "customer_value", "ethical_alignment", "financial_sustainability", "technical_quality", "documentation",
    "reusability", "long_term_maintainability",
]
DiviniRecommendation = Literal["proceed", "redesign", "reject"]


class DiviniCriterionScore(BaseModel):
    """Mirror of DiviniCriterionScoreSchema (divini-standard.ts)."""

    model_config = ConfigDict(extra="forbid")

    criterion: DiviniCriterion
    score: float = Field(ge=0, le=1)
    note: str = ""


class EvaluateDiviniInput(BaseModel):
    """Mirror of EvaluateDiviniInputSchema (divini-standard.ts)."""

    model_config = ConfigDict(extra="forbid")

    subject: str = Field(min_length=1)
    subject_kind: str = "feature"
    criteria: list[DiviniCriterionScore] = Field(default_factory=list)


class DiviniEvaluation(BaseModel):
    """Mirror of DiviniEvaluationSchema (divini-standard.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    subject: str = Field(min_length=1)
    subject_kind: str = "feature"
    criteria: list[DiviniCriterionScore] = Field(default_factory=list)
    divini_score: float = Field(ge=0, le=1)
    recommendation: DiviniRecommendation
    billion_dollar_worthy: bool
    proud_in_ten_years: bool
    reason: str = Field(min_length=1)
    created_at: datetime


# --- Conversation-to-Code contracts (mirror of conversation-to-code.ts) ---

PipelineStage = Literal[
    "conversation", "structured_spec", "build_packet", "security_review", "code_agent_handoff",
    "implementation", "review", "testing", "approval", "deployment", "documentation", "compounding_asset",
]


class StartPipelineInput(BaseModel):
    """Mirror of StartPipelineInputSchema (conversation-to-code.ts)."""

    model_config = ConfigDict(extra="forbid")

    idea: str = Field(min_length=1)
    working_name: str = ""


class PipelineStageStatus(BaseModel):
    """Mirror of PipelineStageStatusSchema (conversation-to-code.ts)."""

    model_config = ConfigDict(extra="forbid")

    stage: PipelineStage
    status: Literal["pending", "in_progress", "complete", "blocked"] = "pending"
    note: str = ""


class ConversationToCodeRun(BaseModel):
    """Mirror of ConversationToCodeRunSchema (conversation-to-code.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    idea: str = Field(min_length=1)
    working_name: str = ""
    current_stage: PipelineStage = "conversation"
    stages: list[PipelineStageStatus] = Field(default_factory=list)
    build_packet_id: UUID | None = None
    feeds_compounding_engine: Literal[True] = True
    awaiting_approval: bool = True
    created_at: datetime
    updated_at: datetime


# --- Infrastructure Launch contracts (mirror of infra-launch.ts) ---

InfraProvider = Literal[
    "github", "supabase", "render", "resend", "stripe", "google_api", "openai_api", "anthropic_api",
    "dns", "storage", "webhooks", "cron", "workers", "logging", "monitoring", "analytics",
]
InfraComponentStatus = Literal["ready", "needs_secret", "needs_manual_step"]


class InfraComponent(BaseModel):
    """Mirror of InfraComponentSchema (infra-launch.ts)."""

    model_config = ConfigDict(extra="forbid")

    provider: InfraProvider
    status: InfraComponentStatus
    setup_instructions: list[str] = Field(default_factory=list)
    terminal_commands: list[str] = Field(default_factory=list)
    env_keys: list[str] = Field(default_factory=list)


class EnvVarPlan(BaseModel):
    """Mirror of EnvVarPlanSchema (infra-launch.ts)."""

    model_config = ConfigDict(extra="forbid")

    key: str = Field(min_length=1)
    source: str = ""
    optional: bool = False
    breaks_if_missing: str = ""


class ManualStep(BaseModel):
    """Mirror of ManualStepSchema (infra-launch.ts)."""

    model_config = ConfigDict(extra="forbid")

    description: str = Field(min_length=1)
    where: str = ""
    copy_paste_value: str | None = None
    risk_level: Literal["low", "medium", "high"] = "low"


class PrepareInfrastructureInput(BaseModel):
    """Mirror of PrepareInfrastructureInputSchema (infra-launch.ts)."""

    model_config = ConfigDict(extra="forbid")

    build_packet_id: UUID
    providers: list[InfraProvider] = Field(default_factory=list)
    present_env_keys: list[str] = Field(default_factory=list)


class InfrastructurePlan(BaseModel):
    """Mirror of InfrastructurePlanSchema (infra-launch.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    build_packet_id: UUID
    components: list[InfraComponent] = Field(default_factory=list)
    env_required: list[EnvVarPlan] = Field(default_factory=list)
    manual_steps: list[ManualStep] = Field(default_factory=list)
    launch_checklist: list[str] = Field(default_factory=list)
    prepared_pct: float = Field(default=0, ge=0, le=1)
    blocking_items: list[str] = Field(default_factory=list)
    never_blocks_on_secrets: Literal[True] = True
    created_at: datetime
    updated_at: datetime


# --- Press Live contracts (mirror of press-live.ts) ---

PreLaunchCheckKind = Literal[
    "branch_clean", "env_vars_present", "no_secrets_committed", "migrations_ready", "rls_enabled",
    "hosting_config_ready", "email_domain_ready", "webhooks_configured", "tests_pass", "health_checks_pass",
    "rollback_exists", "audit_logging_enabled",
]
PressLiveOutcome = Literal[
    "ready_to_launch", "blocked_by_secrets", "blocked_by_config", "blocked_by_test_failure", "live",
]


class PreLaunchCheck(BaseModel):
    """Mirror of PreLaunchCheckSchema (press-live.ts)."""

    model_config = ConfigDict(extra="forbid")

    kind: PreLaunchCheckKind
    passed: bool
    failure_kind: Literal["none", "secret", "config", "test"] = "none"
    missing_item: str = ""
    where_to_get: str = ""
    where_to_paste: str = ""


class RunPressLiveInput(BaseModel):
    """Mirror of RunPressLiveInputSchema (press-live.ts)."""

    model_config = ConfigDict(extra="forbid")

    build_packet_id: UUID | None = None
    checks: list[PreLaunchCheck] = Field(default_factory=list)
    alyssa_approved: bool = False


class PressLiveEvaluation(BaseModel):
    """Mirror of PressLiveEvaluationSchema (press-live.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    build_packet_id: UUID | None = None
    checks: list[PreLaunchCheck] = Field(default_factory=list)
    outcome: PressLiveOutcome
    blocking: list[PreLaunchCheck] = Field(default_factory=list)
    created_at: datetime


# --- Human Touch Queue contracts (mirror of human-touch-queue.ts) ---

HumanTouchCategory = Literal[
    "approve", "paste_secret", "login", "allow_permission", "verify_domain", "click_button",
    "run_terminal_command", "review_legal_money_security", "final_launch_approval",
]
HumanTouchStatus = Literal["pending", "done", "skipped"]


class QueueHumanTouchInput(BaseModel):
    """Mirror of QueueHumanTouchInputSchema (human-touch-queue.ts)."""

    model_config = ConfigDict(extra="forbid")

    category: HumanTouchCategory
    title: str = Field(min_length=1)
    why: str = ""
    steps: list[str] = Field(default_factory=list)
    copy_paste_value: str | None = None
    risk_level: Literal["low", "medium", "high"] = "low"
    build_ref: str | None = None


class HumanTouchItem(BaseModel):
    """Mirror of HumanTouchItemSchema (human-touch-queue.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    category: HumanTouchCategory
    title: str = Field(min_length=1)
    why: str = ""
    steps: list[str] = Field(default_factory=list)
    copy_paste_value: str | None = None
    risk_level: Literal["low", "medium", "high"] = "low"
    status: HumanTouchStatus = "pending"
    build_ref: str | None = None
    created_at: datetime
    updated_at: datetime


class HumanTouchSummary(BaseModel):
    """Mirror of HumanTouchSummarySchema (human-touch-queue.ts)."""

    model_config = ConfigDict(extra="forbid")

    ready_for_alyssa: list[str] = Field(default_factory=list)
    waiting_for_permission: list[str] = Field(default_factory=list)
    truly_blocked: list[str] = Field(default_factory=list)
    ready_to_launch: list[str] = Field(default_factory=list)
    can_continue_without_alyssa: int = Field(default=0, ge=0)
    summary: str = Field(min_length=1)


# --- Permission Memory contracts (mirror of permission-memory.ts) ---

AccessGrantStatus = Literal["active", "expired", "revoked"]
AccessReuseDecision = Literal["reuse", "verify_silently", "escalate", "request_new"]


class RememberAccessInput(BaseModel):
    """Mirror of RememberAccessInputSchema (permission-memory.ts)."""

    model_config = ConfigDict(extra="forbid")

    tool: str = Field(min_length=1)
    workspace: str = ""
    folder_path: str = ""
    account: str = ""
    scope: str = ""
    expires_at: datetime | None = None
    risk_level: Literal["low", "medium", "high"] = "low"
    renewal_trigger: str = ""


class AccessGrantMemory(BaseModel):
    """Mirror of AccessGrantMemorySchema (permission-memory.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    tool: str = Field(min_length=1)
    workspace: str = ""
    folder_path: str = ""
    account: str = ""
    scope: str = ""
    granted_at: datetime
    expires_at: datetime | None = None
    risk_level: Literal["low", "medium", "high"] = "low"
    renewal_trigger: str = ""
    last_verified_at: datetime | None = None
    status: AccessGrantStatus = "active"
    created_at: datetime
    updated_at: datetime


class AccessCheckResult(BaseModel):
    """Mirror of AccessCheckResultSchema (permission-memory.ts)."""

    model_config = ConfigDict(extra="forbid")

    tool: str = Field(min_length=1)
    decision: AccessReuseDecision
    can_proceed: bool
    reason: str = Field(min_length=1)


# --- Batch Once contracts (mirror of batch-once.ts) ---

SetupPattern = Literal[
    "api_keys", "secrets", "env_vars", "dns_records", "domain_verification", "github_setup", "supabase_setup",
    "render_setup", "resend_setup", "stripe_setup", "social_accounts", "brand_assets", "intro_outro_uploads",
    "email_template_approvals", "workflow_approvals",
]
BatchSetupStatus = Literal["queued", "in_progress", "verified", "reusable"]


class DetectSetupInput(BaseModel):
    """Mirror of DetectSetupInputSchema (batch-once.ts)."""

    model_config = ConfigDict(extra="forbid")

    pattern: SetupPattern
    tasks: list[str] = Field(default_factory=list)
    business_context: str = ""


class BatchedSetup(BaseModel):
    """Mirror of BatchedSetupSchema (batch-once.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    pattern: SetupPattern
    business_context: str = ""
    grouped_tasks: list[str] = Field(default_factory=list)
    one_time_checklist: list[str] = Field(default_factory=list)
    manual_explanation: str = ""
    copy_paste_values: list[str] = Field(default_factory=list)
    recorded_locations: list[str] = Field(default_factory=list)
    verified: bool = False
    sop_ref: str | None = None
    reusable: bool = False
    status: BatchSetupStatus = "queued"
    created_at: datetime
    updated_at: datetime


# --- Future Me contracts (mirror of future-me.ts) ---

FutureMeVerdict = Literal["future_alyssa_thanks_you", "mixed", "future_alyssa_regrets"]


class FutureSignals(BaseModel):
    """Mirror of FutureSignalsSchema (future-me.ts)."""

    model_config = ConfigDict(extra="forbid")

    future_thanks: float = Field(default=0.5, ge=0, le=1)
    reduces_future_stress: float = Field(default=0.5, ge=0, le=1)
    increases_future_opportunity: float = Field(default=0.5, ge=0, le=1)
    creates_technical_debt: float = Field(default=0.3, ge=0, le=1)
    creates_reusable_infrastructure: float = Field(default=0.5, ge=0, le=1)
    preserves_optionality: float = Field(default=0.5, ge=0, le=1)


class AssessFutureInput(BaseModel):
    """Mirror of AssessFutureInputSchema (future-me.ts)."""

    model_config = ConfigDict(extra="forbid")

    decision: str = Field(min_length=1)
    signals: FutureSignals


class FutureMeAssessment(BaseModel):
    """Mirror of FutureMeAssessmentSchema (future-me.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    decision: str = Field(min_length=1)
    signals: FutureSignals
    regret_risk: float = Field(ge=0, le=1)
    verdict: FutureMeVerdict
    better_path: str | None = None
    reason: str = Field(min_length=1)
    created_at: datetime


# --- Optionality contracts (mirror of optionality.ts) ---


class OptionalityPath(BaseModel):
    """Mirror of OptionalityPathSchema (optionality.ts)."""

    model_config = ConfigDict(extra="forbid")

    path: str = Field(min_length=1)
    expected_value: float = Field(default=0.5, ge=0, le=1)
    opportunities_created: int = Field(default=0, ge=0)
    opportunities_eliminated: int = Field(default=0, ge=0)
    flexibility: float = Field(default=0.5, ge=0, le=1)
    reusable_assets: float = Field(default=0.5, ge=0, le=1)
    strategic_options: float = Field(default=0.5, ge=0, le=1)
    lock_in: float = Field(default=0.3, ge=0, le=1)


class AssessOptionalityInput(BaseModel):
    """Mirror of AssessOptionalityInputSchema (optionality.ts)."""

    model_config = ConfigDict(extra="forbid")

    decision: str = Field(min_length=1)
    paths: list[OptionalityPath] = Field(min_length=1)


class OptionalityVerdict(BaseModel):
    """Mirror of OptionalityVerdictSchema (optionality.ts)."""

    model_config = ConfigDict(extra="forbid")

    path: str = Field(min_length=1)
    optionality_score: float
    note: str = Field(min_length=1)


class OptionalityAssessment(BaseModel):
    """Mirror of OptionalityAssessmentSchema (optionality.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    decision: str = Field(min_length=1)
    verdicts: list[OptionalityVerdict] = Field(default_factory=list)
    recommended_path: str = Field(min_length=1)
    reason: str = Field(min_length=1)
    created_at: datetime


# --- Executive Thought Partner contracts (mirror of executive-thought-partner.ts) ---

ThoughtStance = Literal["challenge", "support", "compare_options", "refine_execution"]


class ConsultThoughtPartnerInput(BaseModel):
    """Mirror of ConsultThoughtPartnerInputSchema (executive-thought-partner.ts)."""

    model_config = ConfigDict(extra="forbid")

    proposition: str = Field(min_length=1)
    context: str = ""
    decision_is_settled: bool = False
    new_material_evidence: bool = False
    options: list[str] = Field(default_factory=list)


class ThoughtPartnerResponse(BaseModel):
    """Mirror of ThoughtPartnerResponseSchema (executive-thought-partner.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    proposition: str = Field(min_length=1)
    stance: ThoughtStance
    challenged_assumptions: list[str] = Field(default_factory=list)
    blind_spots: list[str] = Field(default_factory=list)
    alternatives: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    tradeoffs: list[str] = Field(default_factory=list)
    uncertain: bool = False
    reasoning: str = Field(min_length=1)
    created_at: datetime


# --- Capability Monitor contracts (mirror of capability-monitor.ts) ---

CapabilityPriority = Literal["now", "soon", "watch", "ignore"]


class CapabilityImpact(BaseModel):
    """Mirror of CapabilityImpactSchema (capability-monitor.ts)."""

    model_config = ConfigDict(extra="forbid")

    replaces_workflow: float = Field(default=0, ge=0, le=1)
    simplifies_architecture: float = Field(default=0, ge=0, le=1)
    improves_founder_freedom: float = Field(default=0, ge=0, le=1)
    reduces_cost: float = Field(default=0, ge=0, le=1)
    improves_security: float = Field(default=0, ge=0, le=1)
    eliminates_third_party_tool: float = Field(default=0, ge=0, le=1)
    creates_product_opportunity: float = Field(default=0, ge=0, le=1)


class AssessCapabilityInput(BaseModel):
    """Mirror of AssessCapabilityInputSchema (capability-monitor.ts)."""

    model_config = ConfigDict(extra="forbid")

    capability: str = Field(min_length=1)
    source: str = ""
    impact: CapabilityImpact


class CapabilityReport(BaseModel):
    """Mirror of CapabilityReportSchema (capability-monitor.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    capability: str = Field(min_length=1)
    source: str = ""
    impact: CapabilityImpact
    business_impact: str = Field(min_length=1)
    suggested_implementation: str = ""
    migration_plan: list[str] = Field(default_factory=list)
    priority: CapabilityPriority
    created_at: datetime


# --- Tech Stack Evaluator contracts (mirror of tech-stack-evaluator.ts) ---

StackCategory = Literal[
    "ai_model", "coding_model", "voice_model", "image_model", "video_model", "search", "github", "supabase",
    "render", "resend", "stripe", "slack", "google_workspace", "apple_ecosystem", "microsoft_ecosystem",
    "security_tool", "open_source",
]
StackDisposition = Literal["upgrade", "replace", "wait", "experiment", "ignore"]


class StackSignals(BaseModel):
    """Mirror of StackSignalsSchema (tech-stack-evaluator.ts)."""

    model_config = ConfigDict(extra="forbid")

    measurable_benefit: float = Field(default=0, ge=0, le=1)
    current_pain: float = Field(default=0, ge=0, le=1)
    switching_cost: float = Field(default=0.3, ge=0, le=1)
    risk: float = Field(default=0.3, ge=0, le=1)
    maturity: float = Field(default=0.5, ge=0, le=1)


class EvaluateStackInput(BaseModel):
    """Mirror of EvaluateStackInputSchema (tech-stack-evaluator.ts)."""

    model_config = ConfigDict(extra="forbid")

    component: str = Field(min_length=1)
    category: StackCategory
    signals: StackSignals


class StackEvaluation(BaseModel):
    """Mirror of StackEvaluationSchema (tech-stack-evaluator.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    component: str = Field(min_length=1)
    category: StackCategory
    signals: StackSignals
    disposition: StackDisposition
    has_measurable_benefit: bool
    reason: str = Field(min_length=1)
    created_at: datetime


# --- Build Once, Reuse Everywhere contracts (mirror of build-once-reuse.ts) ---

ReuseTarget = Literal[
    "another_business", "another_department", "another_agent", "founderos", "future_clients", "future_products",
]
ReusePackageKind = Literal["component", "workflow", "agent", "schema", "prompt", "playbook"]


class AssessReuseInput(BaseModel):
    """Mirror of AssessReuseInputSchema (build-once-reuse.ts)."""

    model_config = ConfigDict(extra="forbid")

    module: str = Field(min_length=1)
    generality: float = Field(default=0.5, ge=0, le=1)
    targets: list[ReuseTarget] = Field(default_factory=list)


class ReuseAssessment(BaseModel):
    """Mirror of ReuseAssessmentSchema (build-once-reuse.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    module: str = Field(min_length=1)
    reusable: bool
    targets: list[ReuseTarget] = Field(default_factory=list)
    package_as: list[ReusePackageKind] = Field(default_factory=list)
    reason: str = Field(min_length=1)
    created_at: datetime


# --- Companion Voice Persona contracts (mirror of voice-persona.ts) ---

PersonaTone = Literal[
    "elegant", "calm", "warm", "intelligent", "concise", "executive", "emotionally_regulated",
    "reassuring", "not_childish", "not_robotic", "not_overly_cheerful",
]
PersonaDuty = Literal[
    "read_briefings", "ask_clarifying_questions", "summarize_options", "remind_priorities",
    "reduce_cognitive_load", "keep_grounded", "escalate_only_what_matters",
]


class ConfigureVoicePersonaInput(BaseModel):
    """Mirror of ConfigureVoicePersonaInputSchema (voice-persona.ts)."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    accent: str = "British (female)"
    tones: list[PersonaTone] = Field(default_factory=list)
    duties: list[PersonaDuty] = Field(default_factory=list)


class VoicePersona(BaseModel):
    """Mirror of VoicePersonaSchema (voice-persona.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    name: str = Field(min_length=1)
    accent: str = "British (female)"
    tones: list[PersonaTone] = Field(default_factory=list)
    duties: list[PersonaDuty] = Field(default_factory=list)
    is_voice_layer_only: Literal[True] = True
    created_at: datetime
    updated_at: datetime


# --- Personal Executive Model contracts (mirror of personal-executive-model.ts) ---

PemDimension = Literal[
    "decision_patterns", "communication_style", "opportunity_recognition", "risk_tolerance",
    "energy_patterns", "preferred_workflows", "approval_habits", "strategic_priorities",
    "recurring_bottlenecks", "values", "long_term_mission",
]
PemEvidenceSource = Literal["explicit_feedback", "observed_outcome", "recurring_behavior"]


class PemTrait(BaseModel):
    """Mirror of PemTraitSchema (personal-executive-model.ts)."""

    model_config = ConfigDict(extra="forbid")

    dimension: PemDimension
    statement: str = Field(min_length=1)
    confidence: float = Field(ge=0, le=1)
    source: PemEvidenceSource
    evidence_refs: list[str] = Field(default_factory=list)


class ObservePemInput(BaseModel):
    """Mirror of ObservePemInputSchema (personal-executive-model.ts)."""

    model_config = ConfigDict(extra="forbid")

    dimension: PemDimension
    statement: str = Field(min_length=1)
    source: PemEvidenceSource
    confidence: float = Field(default=0.5, ge=0, le=1)
    evidence_refs: list[str] = Field(default_factory=list)


class PemExplanation(BaseModel):
    """Mirror of PemExplanationSchema (personal-executive-model.ts)."""

    model_config = ConfigDict(extra="forbid")

    why_preferred: str = Field(min_length=1)
    informing_patterns: list[str] = Field(default_factory=list)
    confidence: float = Field(ge=0, le=1)
    evidence_missing: list[str] = Field(default_factory=list)


class PersonalExecutiveModel(BaseModel):
    """Mirror of PersonalExecutiveModelSchema (personal-executive-model.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    traits: list[PemTrait] = Field(default_factory=list)
    amplifies_not_imitates: Literal[True] = True
    created_at: datetime
    updated_at: datetime


# --- Meeting Prep contracts (mirror of meeting-prep.ts) ---


class MeetingTalkingPoint(BaseModel):
    """Mirror of MeetingTalkingPointSchema (meeting-prep.ts)."""

    model_config = ConfigDict(extra="forbid")

    point: str = Field(min_length=1)
    rationale: str = ""


class PrepareMeetingInput(BaseModel):
    """Mirror of PrepareMeetingInputSchema (meeting-prep.ts)."""

    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1)
    when: datetime | None = None
    attendees: list[str] = Field(default_factory=list)
    company: str | None = None
    objective: str = ""


class MeetingDossier(BaseModel):
    """Mirror of MeetingDossierSchema (meeting-prep.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    title: str = Field(min_length=1)
    when: datetime | None = None
    person_profile: str = ""
    company_profile: str = ""
    relationship_history: list[str] = Field(default_factory=list)
    conversation_history: list[str] = Field(default_factory=list)
    mutual_contacts: list[str] = Field(default_factory=list)
    relevant_news: list[str] = Field(default_factory=list)
    open_action_items: list[str] = Field(default_factory=list)
    negotiation_opportunities: list[str] = Field(default_factory=list)
    talking_points: list[MeetingTalkingPoint] = Field(default_factory=list)
    questions_to_ask: list[str] = Field(default_factory=list)
    potential_risks: list[str] = Field(default_factory=list)
    supporting_documents: list[str] = Field(default_factory=list)
    objective: str = ""
    desired_outcome: str = ""
    created_at: datetime


class CaptureRecapInput(BaseModel):
    """Mirror of CaptureRecapInputSchema (meeting-prep.ts)."""

    model_config = ConfigDict(extra="forbid")

    dossier_id: UUID | None = None
    title: str = Field(min_length=1)
    notes: str = ""


class MeetingRecap(BaseModel):
    """Mirror of MeetingRecapSchema (meeting-prep.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    dossier_id: UUID | None = None
    title: str = Field(min_length=1)
    summary: str = ""
    commitments: list[str] = Field(default_factory=list)
    follow_ups: list[str] = Field(default_factory=list)
    relationship_updates: list[str] = Field(default_factory=list)
    next_actions: list[str] = Field(default_factory=list)
    created_at: datetime


# --- Relationship Capital contracts (mirror of relationship-capital.ts) ---

RelationshipPartyKind = Literal[
    "family", "friend", "client", "investor", "vendor", "partner",
    "podcast_guest", "mentor", "employee", "advisor",
]
RelationshipMoveKind = Literal["reconnect", "introduce", "thank", "celebrate_win", "provide_value"]


class RelationshipPromise(BaseModel):
    """Mirror of RelationshipPromiseSchema (relationship-capital.ts)."""

    model_config = ConfigDict(extra="forbid")

    promise: str = Field(min_length=1)
    due: datetime | None = None
    kept: bool = False


class RelationshipOpportunity(BaseModel):
    """Mirror of RelationshipOpportunitySchema (relationship-capital.ts)."""

    model_config = ConfigDict(extra="forbid")

    move: RelationshipMoveKind
    reason: str = Field(min_length=1)
    priority: float = Field(default=0.5, ge=0, le=1)


class UpsertRelationshipInput(BaseModel):
    """Mirror of UpsertRelationshipInputSchema (relationship-capital.ts)."""

    model_config = ConfigDict(extra="forbid")

    person_id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    kind: RelationshipPartyKind
    preferred_communication: str = ""


class RelationshipCapitalRecord(BaseModel):
    """Mirror of RelationshipCapitalRecordSchema (relationship-capital.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    person_id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    kind: RelationshipPartyKind
    conversation_history: list[str] = Field(default_factory=list)
    follow_up_history: list[str] = Field(default_factory=list)
    important_dates: list[str] = Field(default_factory=list)
    shared_interests: list[str] = Field(default_factory=list)
    business_opportunities: list[str] = Field(default_factory=list)
    introductions: list[str] = Field(default_factory=list)
    promises_made: list[RelationshipPromise] = Field(default_factory=list)
    preferred_communication: str = ""
    health: float = Field(default=0.5, ge=0, le=1)
    strength: float = Field(default=0.5, ge=0, le=1)
    opportunities: list[RelationshipOpportunity] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


# --- Venture Studio contracts (mirror of venture-studio.ts) ---

VentureStudioStage = Literal[
    "discovery", "validation", "market", "business_model", "pricing", "brand", "technology",
    "architecture", "agents", "automation", "marketing", "sales", "finance", "legal", "launch",
    "kpis", "founderos_integration",
]
StageStatus = Literal["not_started", "in_progress", "complete"]


class VentureStageProgress(BaseModel):
    """Mirror of VentureStageProgressSchema (venture-studio.ts)."""

    model_config = ConfigDict(extra="forbid")

    stage: VentureStudioStage
    status: StageStatus = "not_started"
    artifact_summary: str = ""


class StartVentureInput(BaseModel):
    """Mirror of StartVentureInputSchema (venture-studio.ts)."""

    model_config = ConfigDict(extra="forbid")

    idea: str = Field(min_length=1)
    working_name: str = ""


class VentureStudioSession(BaseModel):
    """Mirror of VentureStudioSessionSchema (venture-studio.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    idea: str = Field(min_length=1)
    working_name: str = ""
    current_stage: VentureStudioStage = "discovery"
    stages: list[VentureStageProgress] = Field(default_factory=list)
    inherits_operating_standards: Literal[True] = True
    awaiting_launch_approval: bool = True
    created_at: datetime
    updated_at: datetime


# --- Alyssa Pattern Mirror contracts (mirror of alyssa-pattern-mirror.ts) ---

ThinkingPatternKind = Literal[
    "thinking_pattern", "business_pattern_recognition", "opportunity_detection_style",
    "language_preference", "decision_criterion", "intuition_signal", "bottleneck",
    "creative_breakthrough", "recurring_theme", "founder_instinct",
]


class ObserveThinkingInput(BaseModel):
    """Mirror of ObserveThinkingInputSchema (alyssa-pattern-mirror.ts)."""

    model_config = ConfigDict(extra="forbid")

    kind: ThinkingPatternKind
    observation: str = Field(min_length=1)
    occurrences: int = Field(default=1, ge=1)
    evidence_refs: list[str] = Field(default_factory=list)


class ThinkingPatternObservation(BaseModel):
    """Mirror of ThinkingPatternObservationSchema (alyssa-pattern-mirror.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    kind: ThinkingPatternKind
    observation: str = Field(min_length=1)
    occurrences: int = Field(default=1, ge=1)
    confidence: float = Field(default=0.5, ge=0, le=1)
    framework_candidate: bool = False
    amplification: Literal["personalize", "suggest_agent", "surface_opportunity", "build_framework"]
    evidence_refs: list[str] = Field(default_factory=list)
    created_at: datetime


# --- Teach My Framework contracts (mirror of teach-framework.ts) ---

FrameworkArtifactKind = Literal[
    "explanation", "step_by_step", "examples", "use_cases", "checklist", "worksheet",
    "training_module", "podcast_topic", "consulting_asset", "founderos_feature",
]


class FrameworkArtifact(BaseModel):
    """Mirror of FrameworkArtifactSchema (teach-framework.ts)."""

    model_config = ConfigDict(extra="forbid")

    kind: FrameworkArtifactKind
    content: str = Field(min_length=1)


class DetectFrameworkInput(BaseModel):
    """Mirror of DetectFrameworkInputSchema (teach-framework.ts)."""

    model_config = ConfigDict(extra="forbid")

    problem_type: str = Field(min_length=1)
    solution_count: int = Field(default=1, ge=1)
    recurrence_evidence: list[str] = Field(default_factory=list)


class TaughtFramework(BaseModel):
    """Mirror of TaughtFrameworkSchema (teach-framework.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    name: str = Field(min_length=1)
    problem_type: str = Field(min_length=1)
    explanation: str = Field(min_length=1)
    artifacts: list[FrameworkArtifact] = Field(default_factory=list)
    strength: float = Field(default=0.5, ge=0, le=1)
    created_at: datetime


# --- Life Dashboard contracts (mirror of life-dashboard.ts) ---


class LifeMetric(BaseModel):
    """Mirror of LifeMetricSchema (life-dashboard.ts)."""

    model_config = ConfigDict(extra="forbid")

    label: str = Field(min_length=1)
    value: str = Field(min_length=1)
    trend: Literal["up", "down", "flat", "unknown"] = "unknown"
    is_life: bool = True


class BuildLifeDashboardInput(BaseModel):
    """Mirror of BuildLifeDashboardInputSchema (life-dashboard.ts)."""

    model_config = ConfigDict(extra="forbid")

    freedom_index: float = Field(default=0, ge=0, le=100)
    life_roi: float = 0
    family_hours: float = Field(default=0, ge=0)
    travel_days: float = Field(default=0, ge=0)
    learning_hours: float = Field(default=0, ge=0)
    books_finished: int = Field(default=0, ge=0)
    exercise_sessions: int = Field(default=0, ge=0)
    sleep_quality: float = Field(default=0.5, ge=0, le=1)
    creative_hours: float = Field(default=0, ge=0)
    relationships_strong: int = Field(default=0, ge=0)
    stress: float = Field(default=0.5, ge=0, le=1)
    revenue_usd: float = Field(default=0, ge=0)
    assets_usd: float = Field(default=0, ge=0)
    capital_usd: float = Field(default=0, ge=0)
    personal_goals_on_track: int = Field(default=0, ge=0)
    business_goals_on_track: int = Field(default=0, ge=0)


class LifeDashboard(BaseModel):
    """Mirror of LifeDashboardSchema (life-dashboard.ts)."""

    model_config = ConfigDict(extra="forbid")

    metrics: list[LifeMetric] = Field(default_factory=list)
    message: Literal["The businesses exist to support life, not replace it."] = (
        "The businesses exist to support life, not replace it."
    )
    summary: str = Field(min_length=1)


# --- Supabase Architecture contracts (mirror of supabase-architecture.ts) ---

SoftDeleteStrategy = Literal["append_only", "soft_delete_column", "hard_delete_allowed"]


class ColumnPlan(BaseModel):
    """Mirror of ColumnPlanSchema (supabase-architecture.ts)."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    type: str = Field(min_length=1)
    nullable: bool = False
    note: str = ""


class TablePlan(BaseModel):
    """Mirror of TablePlanSchema (supabase-architecture.ts)."""

    model_config = ConfigDict(extra="forbid")

    table: str = Field(min_length=1)
    columns: list[ColumnPlan] = Field(default_factory=list)
    relationships: list[str] = Field(default_factory=list)
    indexes: list[str] = Field(default_factory=list)
    rls_rules: list[str] = Field(default_factory=list)
    has_tenant_id: Literal[True] = True
    has_audit_fields: bool = True
    soft_delete: SoftDeleteStrategy = "append_only"
    migration_file: str = ""
    seed_plan: str = ""


class PlanArchitectureInput(BaseModel):
    """Mirror of PlanArchitectureInputSchema (supabase-architecture.ts)."""

    model_config = ConfigDict(extra="forbid")

    module: str = Field(min_length=1)
    entities: list[str] = Field(default_factory=list)


class SupabaseArchitecturePlan(BaseModel):
    """Mirror of SupabaseArchitecturePlanSchema (supabase-architecture.ts)."""

    model_config = ConfigDict(extra="forbid")

    module: str = Field(min_length=1)
    tables: list[TablePlan] = Field(default_factory=list)
    migration_sequence: list[str] = Field(default_factory=list)
    founderos_multitenant_ready: Literal[True] = True
    notes: list[str] = Field(default_factory=list)


# --- Developer Command Center contracts (mirror of developer-command-center.ts) ---


class ActiveBuild(BaseModel):
    """Mirror of ActiveBuildSchema (developer-command-center.ts)."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    stage: str = Field(min_length=1)
    agent: str = ""
    branch: str = ""
    progress: float = Field(default=0, ge=0, le=1)
    blocked: bool = False


class BuildCommandCenterInput(BaseModel):
    """Mirror of BuildCommandCenterInputSchema (developer-command-center.ts)."""

    model_config = ConfigDict(extra="forbid")

    active_builds: list[ActiveBuild] = Field(default_factory=list)
    queued_packets: list[str] = Field(default_factory=list)
    open_prs: list[str] = Field(default_factory=list)
    failed_tests: list[str] = Field(default_factory=list)
    security_warnings: list[str] = Field(default_factory=list)
    pending_migrations: list[str] = Field(default_factory=list)
    approval_needs: list[str] = Field(default_factory=list)
    shipped_features: list[str] = Field(default_factory=list)


class DeveloperCommandCenter(BaseModel):
    """Mirror of DeveloperCommandCenterSchema (developer-command-center.ts)."""

    model_config = ConfigDict(extra="forbid")

    active_builds: list[ActiveBuild] = Field(default_factory=list)
    queued_packets: list[str] = Field(default_factory=list)
    open_prs: list[str] = Field(default_factory=list)
    failed_tests: list[str] = Field(default_factory=list)
    security_warnings: list[str] = Field(default_factory=list)
    pending_migrations: list[str] = Field(default_factory=list)
    approval_needs: list[str] = Field(default_factory=list)
    shipped_features: list[str] = Field(default_factory=list)
    active_count: int = Field(default=0, ge=0)
    blocked_count: int = Field(default=0, ge=0)
    needs_approval_count: int = Field(default=0, ge=0)
    summary: str = Field(min_length=1)


# --- Connections contracts (mirror of connections.ts) ---

ConnectionScope = Literal["master", "business", "personal"]
ConnectionStatus = Literal["not_connected", "pending_setup", "connected", "error", "expired", "revoked"]
ConnectorAuthKind = Literal["oauth2", "api_key", "webhook", "basic", "none"]
ConnectorRiskLevel = Literal["low", "medium", "high"]


class RegisterConnectorInput(BaseModel):
    """Mirror of RegisterConnectorInputSchema (connections.ts)."""

    model_config = ConfigDict(extra="forbid")

    provider: str = Field(min_length=1)
    display_name: str = Field(min_length=1)
    category: str = Field(min_length=1)
    auth_kind: ConnectorAuthKind
    required_secret_keys: list[str] = Field(default_factory=list)
    default_scopes: list[str] = Field(default_factory=list)
    risk_level: ConnectorRiskLevel = "low"
    docs_url: str = ""


class ConnectorDefinition(BaseModel):
    """Mirror of ConnectorDefinitionSchema (connections.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    provider: str = Field(min_length=1)
    display_name: str = Field(min_length=1)
    category: str = Field(min_length=1)
    auth_kind: ConnectorAuthKind
    required_secret_keys: list[str] = Field(default_factory=list)
    default_scopes: list[str] = Field(default_factory=list)
    risk_level: ConnectorRiskLevel = "low"
    docs_url: str = ""
    enabled: bool = True
    created_at: datetime
    updated_at: datetime


class ConnectInput(BaseModel):
    """Mirror of ConnectInputSchema (connections.ts)."""

    model_config = ConfigDict(extra="forbid")

    scope: ConnectionScope
    business_id: UUID | None = None
    provider: str = Field(min_length=1)
    label: str = ""
    granted_scopes: list[str] = Field(default_factory=list)


class Connection(BaseModel):
    """Mirror of ConnectionSchema (connections.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    scope: ConnectionScope
    business_id: UUID | None = None
    provider: str = Field(min_length=1)
    label: str = ""
    status: ConnectionStatus = "not_connected"
    granted_scopes: list[str] = Field(default_factory=list)
    secret_refs: list[str] = Field(default_factory=list)
    health: float = Field(default=0, ge=0, le=1)
    last_verified_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class ResolveConnectionInput(BaseModel):
    """Mirror of ResolveConnectionInputSchema (connections.ts)."""

    model_config = ConfigDict(extra="forbid")

    provider: str = Field(min_length=1)
    business_id: UUID | None = None


class ConnectionResolution(BaseModel):
    """Mirror of ConnectionResolutionSchema (connections.ts)."""

    model_config = ConfigDict(extra="forbid")

    provider: str = Field(min_length=1)
    resolved_from: Literal["business", "master", "personal", "none"]
    connection_id: UUID | None = None
    status: ConnectionStatus
    can_use: bool
    reason: str = Field(min_length=1)


# ===========================================================================
# Build From Brainstorm (mirror of build-from-brainstorm.ts)
# ===========================================================================

BrainstormInputSource = Literal[
    "voice", "text", "pasted_notes", "chatgpt_import", "claude_import",
    "doc_upload", "screenshot", "video_summary",
]
BrainstormInputKind = Literal[
    "final_decision", "possible_idea", "rejected_idea", "emotional_context",
    "clarification", "unresolved_question", "feature_request", "business_rule",
    "ui_ux_note", "technical_instruction", "compliance_risk_note", "prompt_logic",
    "algorithm_rule", "future_idea",
]
BrainstormThreadStatus = Literal[
    "open", "decisions_extracted", "strategy_mapped", "prompts_generated",
    "queued", "awaiting_approval", "building", "completed",
]
BrainstormDecisionCategory = Literal[
    "confirmed_decision", "unresolved_decision", "rejected_idea", "assumption",
    "dependency", "open_question", "business_goal", "system_requirement",
    "feature_requirement", "workflow_change", "content_update", "prompt_update",
    "schema_change", "automation_change", "agent_instruction", "qa_requirement",
]
DecisionStatus = Literal["confirmed", "needs_review", "rejected", "parked"]
BrainstormRisk = Literal["low", "medium", "high", "critical"]
StrategyLayer = Literal[
    "strategic", "product", "prompt", "workflow", "technical", "ui_ux", "compliance_risk",
]
PromptCategory = Literal[
    "product", "ui_ux", "frontend", "backend", "database_schema",
    "prompt_engineering", "automation", "qa_testing", "documentation", "compliance_review",
]
BuildAgentKind = Literal[
    "design_ui", "frontend", "backend", "schema", "prompt",
    "automation", "qa", "documentation", "compliance",
]
BuildTaskStatus = Literal[
    "draft", "needs_review", "approved", "queued", "running", "blocked",
    "failed", "needs_human_input", "completed", "qa_passed", "deployed", "rolled_back",
]
BuildTaskPriority = Literal["low", "medium", "high", "critical"]
TaskComplexity = Literal["trivial", "small", "medium", "large", "xl"]
QaVerdict = Literal["passed", "failed", "needs_review", "partial_pass"]
ApprovalAction = Literal["approve_all", "approve_selected", "revise_before_running", "cancel"]
QueueControl = Literal[
    "approve_all", "approve_selected", "reject_selected", "revise_task",
    "move_to_parking_lot", "run_approved", "pause_queue", "retry_failed", "rollback_task",
]


class BrainstormThread(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    business_id: UUID | None = None
    title: str = Field(min_length=1)
    status: BrainstormThreadStatus = "open"
    created_at: datetime
    updated_at: datetime | None = None


class BrainstormInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    thread_id: UUID
    source: BrainstormInputSource
    raw_text: str = Field(min_length=1)
    kind: BrainstormInputKind
    actionable: bool = False
    confidence: float = Field(default=0.5, ge=0, le=1)
    created_at: datetime


class IngestBrainstormInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    thread_id: UUID
    source: BrainstormInputSource = "text"
    raw_text: str = Field(min_length=1)
    kind: BrainstormInputKind | None = None


class DecisionCard(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    thread_id: UUID
    title: str = Field(min_length=1)
    category: BrainstormDecisionCategory
    source_input_ids: list[UUID] = Field(default_factory=list)
    confidence: float = Field(default=0.5, ge=0, le=1)
    status: DecisionStatus = "needs_review"
    why_it_matters: str = ""
    related_task_ids: list[UUID] = Field(default_factory=list)
    risk_level: BrainstormRisk = "low"
    approval_required: bool = False
    created_at: datetime
    updated_at: datetime | None = None


class StrategyLayerEntry(BaseModel):
    model_config = ConfigDict(extra="forbid")
    layer: StrategyLayer
    what_user_wants: list[str] = Field(default_factory=list)
    why_it_matters: list[str] = Field(default_factory=list)
    product_changes: list[str] = Field(default_factory=list)
    agents_needed: list[BuildAgentKind] = Field(default_factory=list)
    files_systems_affected: list[str] = Field(default_factory=list)
    dependencies: list[str] = Field(default_factory=list)
    needs_approval: bool = False
    do_not_build_yet: bool = False


class StrategyMap(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    thread_id: UUID
    layers: list[StrategyLayerEntry] = Field(default_factory=list)
    parked_decision_ids: list[UUID] = Field(default_factory=list)
    created_at: datetime


class BuildPromptCard(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    thread_id: UUID
    category: PromptCategory
    task_title: str = Field(min_length=1)
    objective: str = ""
    context: str = ""
    requirements: list[str] = Field(default_factory=list)
    affected_area: str = ""
    acceptance_criteria: list[str] = Field(default_factory=list)
    constraints: list[str] = Field(default_factory=list)
    dependencies: list[str] = Field(default_factory=list)
    test_steps: list[str] = Field(default_factory=list)
    rollback_notes: str = ""
    recommended_agent: BuildAgentKind
    decision_ids: list[UUID] = Field(default_factory=list)
    created_at: datetime


class BuildPromptPack(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    thread_id: UUID
    prompt_ids: list[UUID] = Field(default_factory=list)
    created_at: datetime


class BuildTask(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    thread_id: UUID
    prompt_id: UUID | None = None
    name: str = Field(min_length=1)
    status: BuildTaskStatus = "draft"
    priority: BuildTaskPriority = "medium"
    assigned_agent: BuildAgentKind
    estimated_complexity: TaskComplexity = "medium"
    dependencies: list[UUID] = Field(default_factory=list)
    approved: bool = False
    approved_at: datetime | None = None
    execution_log: list[str] = Field(default_factory=list)
    result: str = ""
    qa_state: QaVerdict | None = None
    rollback_available: bool = False
    created_at: datetime
    updated_at: datetime | None = None


class ApprovalSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    thread_id: UUID
    task_ids: list[UUID] = Field(default_factory=list)
    affected_files_modules: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    dependencies: list[str] = Field(default_factory=list)
    includes_database_changes: bool = False
    includes_ui_changes: bool = False
    includes_production_deploy: bool = False
    highest_risk: BrainstormRisk = "low"
    created_at: datetime


class ApproveQueueInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    thread_id: UUID
    action: ApprovalAction
    task_ids: list[UUID] = Field(default_factory=list)


class AgentRunLog(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    task_id: UUID
    agent: BuildAgentKind
    started_at: datetime
    finished_at: datetime | None = None
    files_touched: list[str] = Field(default_factory=list)
    changes_made: list[str] = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)
    blockers: list[str] = Field(default_factory=list)
    completion_result: Literal["completed", "failed", "needs_human_input", "blocked"]
    qa_result: QaVerdict | None = None
    changelog_entry_id: UUID | None = None


class QaCheck(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1)
    passed: bool
    detail: str = ""


class QaResult(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    task_id: UUID
    verdict: QaVerdict
    checks: list[QaCheck] = Field(default_factory=list)
    failure_reason: str | None = None
    recommended_fix: str | None = None
    retry_prompt: str | None = None
    human_review_required: bool = False
    created_at: datetime


class BrainstormChangelogEntry(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    thread_id: UUID
    created_at: datetime
    brainstorm_source: str = ""
    decisions_extracted: int = Field(default=0, ge=0)
    tasks_completed: list[str] = Field(default_factory=list)
    tasks_failed: list[str] = Field(default_factory=list)
    files_modules_changed: list[str] = Field(default_factory=list)
    qa_results_summary: str = ""
    deployment_status: Literal["none", "staged", "deployed", "rolled_back"] = "none"
    rollback_notes: str = ""
    next_recommended_actions: list[str] = Field(default_factory=list)


# ===========================================================================
# People Operations + Hiring Lifecycle (mirror of people-ops.ts)
# ===========================================================================

PeopleOpsWorkerKind = Literal["human", "ai_employee"]
RoleNeedTrigger = Literal[
    "repeating_work", "founder_bottleneck", "needs_human_judgment", "ai_can_handle",
    "delegation_opportunity", "capacity_gap", "skill_gap", "growth_demand",
]
RoleHandlerKind = Literal[
    "keep_with_founder", "delegate_to_human", "delegate_to_ai", "automate", "eliminate",
]
RoleLifecycleStage = Literal[
    "need_detected", "role_designed", "job_posted", "pipeline_open", "interviewing",
    "offer_extended", "onboarding", "access_setup", "training", "active",
    "performance_review", "offboarding", "closed",
]
RoleTimeCommitment = Literal[
    "full_time", "part_time", "contract", "fractional", "project_based", "always_on_ai",
]
CandidateInterviewStatus = Literal[
    "applied", "screening", "interviewing", "test_task", "reference_check", "offer",
    "hired", "rejected", "withdrawn",
]
CandidateSource = Literal[
    "referral", "job_board", "outreach", "inbound", "agency", "internal", "ai_marketplace",
]
OnboardingDocStatus = Literal[
    "not_started", "sent", "in_progress", "signed", "received", "verified", "waived",
]
OnboardingDocKind = Literal[
    "nda", "contractor_agreement", "w9", "payment_info", "role_description",
    "code_of_conduct", "access_policy", "sop_packet", "tool_access_checklist",
]
AccessSystem = Literal[
    "email", "slack", "google_drive", "project_mgmt", "github", "supabase",
    "platform", "password_vault",
]
PeopleOpsAccessGrantStatus = Literal[
    "requested", "approval_pending", "granted", "denied", "revoked",
]
AccessPermissionLevel = Literal["none", "read", "write", "admin", "owner"]
PeopleOpsSeverity = Literal["low", "medium", "high", "critical"]
PeopleOpsRating = Literal["excellent", "strong", "meets", "below", "at_risk"]
DelegationTaskStatus = Literal[
    "drafted", "assigned", "in_progress", "blocked", "submitted", "approved",
    "rejected", "completed",
]
OffboardingStepStatus = Literal["pending", "in_progress", "done", "skipped"]
OffboardingStepKind = Literal[
    "revoke_access", "rotate_credentials", "collect_files", "transfer_ownership",
    "archive_docs", "document_status", "final_payment", "confidentiality_reminder",
]


class RoleNeed(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    business_id: UUID | None = None
    description: str = Field(min_length=1)
    trigger: RoleNeedTrigger
    founder_work_absorbed: list[str] = Field(default_factory=list)
    recommended_handler: RoleHandlerKind = "delegate_to_human"
    worker_kind: PeopleOpsWorkerKind = "human"
    frequency_per_week: int = Field(default=0, ge=0)
    severity: PeopleOpsSeverity = "medium"
    role_recommended: bool = False
    notes: str = ""
    created_at: datetime
    updated_at: datetime | None = None


class DetectRoleNeedInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    business_id: UUID | None = None
    description: str = Field(min_length=1)
    trigger: RoleNeedTrigger | None = None
    frequency_per_week: int = Field(default=0, ge=0)
    worker_kind: PeopleOpsWorkerKind = "human"
    founder_work_absorbed: list[str] = Field(default_factory=list)


class RoleDesign(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    need_id: UUID | None = None
    worker_kind: PeopleOpsWorkerKind = "human"
    title: str = Field(min_length=1)
    mission: str = ""
    responsibilities: list[str] = Field(default_factory=list)
    outcomes: list[str] = Field(default_factory=list)
    required_skills: list[str] = Field(default_factory=list)
    tools_used: list[str] = Field(default_factory=list)
    business_or_project: str = ""
    time_commitment: RoleTimeCommitment = "contract"
    compensation_range: str = ""
    success_metrics: list[str] = Field(default_factory=list)
    access_required: list[AccessSystem] = Field(default_factory=list)
    stage: RoleLifecycleStage = "role_designed"
    standard_passed: bool = False
    created_at: datetime
    updated_at: datetime | None = None


class DesignRoleInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    need_id: UUID | None = None
    worker_kind: PeopleOpsWorkerKind = "human"
    title: str = Field(min_length=1)
    mission: str = ""
    responsibilities: list[str] = Field(default_factory=list)
    outcomes: list[str] = Field(default_factory=list)
    required_skills: list[str] = Field(default_factory=list)
    tools_used: list[str] = Field(default_factory=list)
    business_or_project: str = ""
    time_commitment: RoleTimeCommitment = "contract"
    compensation_range: str = ""
    success_metrics: list[str] = Field(default_factory=list)
    access_required: list[AccessSystem] = Field(default_factory=list)


class HiringStandardEvaluation(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    role_id: UUID
    removes_work_from_founder: bool = False
    creates_revenue_capacity: bool = False
    reduces_bottlenecks: bool = False
    clearly_scoped: bool = False
    success_measurable: bool = False
    has_sop: bool = False
    access_limited: bool = False
    ip_protected: bool = False
    confidentiality_protected: bool = False
    operates_without_handholding: bool = False
    passed: bool = False
    failed_criteria: list[str] = Field(default_factory=list)
    recommendation: str = ""
    created_at: datetime


class JobScreeningQuestion(BaseModel):
    model_config = ConfigDict(extra="forbid")
    question: str = Field(min_length=1)
    knockout: bool = False


class JobScorecardCriterion(BaseModel):
    model_config = ConfigDict(extra="forbid")
    criterion: str = Field(min_length=1)
    weight: float = Field(default=0.2, ge=0, le=1)


class JobPost(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    role_id: UUID
    job_description: str = ""
    contractor_post: str = ""
    referral_ask: str = ""
    candidate_outreach: str = ""
    screening_questions: list[JobScreeningQuestion] = Field(default_factory=list)
    scorecard: list[JobScorecardCriterion] = Field(default_factory=list)
    created_at: datetime


class Candidate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    role_id: UUID
    applicant: str = Field(min_length=1)
    source: CandidateSource = "inbound"
    resume_profile: str = ""
    skills: list[str] = Field(default_factory=list)
    fit_score: float = Field(default=0, ge=0, le=1)
    interview_status: CandidateInterviewStatus = "applied"
    notes: str = ""
    red_flags: list[str] = Field(default_factory=list)
    next_step: str = ""
    created_at: datetime
    updated_at: datetime | None = None


class AddCandidateInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    role_id: UUID
    applicant: str = Field(min_length=1)
    source: CandidateSource = "inbound"
    resume_profile: str = ""
    skills: list[str] = Field(default_factory=list)
    fit_score: float = Field(default=0, ge=0, le=1)


class InterviewScorecardItem(BaseModel):
    model_config = ConfigDict(extra="forbid")
    criterion: str = Field(min_length=1)
    rating: PeopleOpsRating = "meets"
    notes: str = ""


class InterviewProcess(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    role_id: UUID
    candidate_id: UUID
    questions: list[str] = Field(default_factory=list)
    test_task: str = ""
    evaluation_scorecard: list[InterviewScorecardItem] = Field(default_factory=list)
    culture_values_screen: list[str] = Field(default_factory=list)
    technical_skills_screen: list[str] = Field(default_factory=list)
    reference_check_checklist: list[str] = Field(default_factory=list)
    recommended: bool = False
    created_at: datetime
    updated_at: datetime | None = None


class OfferProcess(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    role_id: UUID
    candidate_id: UUID
    offer_letter: str = ""
    contractor_agreement_checklist: list[str] = Field(default_factory=list)
    compensation_terms: str = ""
    scope: str = ""
    start_date: str | None = None
    confidentiality_ip_clauses: list[str] = Field(default_factory=list)
    access_rules: list[str] = Field(default_factory=list)
    accepted: bool = False
    created_at: datetime
    updated_at: datetime | None = None


class OnboardingDocument(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    role_id: UUID
    candidate_id: UUID | None = None
    kind: OnboardingDocKind
    status: OnboardingDocStatus = "not_started"
    link: str = ""
    notes: str = ""
    created_at: datetime
    updated_at: datetime | None = None


class AccessGrant(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    role_id: UUID
    candidate_id: UUID | None = None
    system: AccessSystem
    permissions_level: AccessPermissionLevel = "read"
    approval_required: bool = True
    status: PeopleOpsAccessGrantStatus = "requested"
    granted_at: datetime | None = None
    revoked_at: datetime | None = None
    created_at: datetime
    updated_at: datetime | None = None


class TrainingPlan(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    role_id: UUID
    candidate_id: UUID | None = None
    onboarding_plan: list[str] = Field(default_factory=list)
    first_day_checklist: list[str] = Field(default_factory=list)
    first_week_checklist: list[str] = Field(default_factory=list)
    sops_to_review: list[str] = Field(default_factory=list)
    business_briefing: str = ""
    role_training: list[str] = Field(default_factory=list)
    sample_tasks: list[str] = Field(default_factory=list)
    quality_standards: list[str] = Field(default_factory=list)
    escalation_rules: list[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime | None = None


class NurtureCheckIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    role_id: UUID
    candidate_id: UUID | None = None
    check_ins: list[str] = Field(default_factory=list)
    performance: PeopleOpsRating = "meets"
    blockers: list[str] = Field(default_factory=list)
    workload: PeopleOpsRating = "meets"
    morale: PeopleOpsRating = "meets"
    training_needs: list[str] = Field(default_factory=list)
    feedback: str = ""
    promotion_eligibility: bool = False
    retention_risk: PeopleOpsSeverity = "low"
    created_at: datetime
    updated_at: datetime | None = None


class PerformanceReview(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    role_id: UUID
    candidate_id: UUID | None = None
    deliverables: PeopleOpsRating = "meets"
    timeliness: PeopleOpsRating = "meets"
    quality: PeopleOpsRating = "meets"
    communication: PeopleOpsRating = "meets"
    reliability: PeopleOpsRating = "meets"
    sop_adherence: PeopleOpsRating = "meets"
    improvement_notes: list[str] = Field(default_factory=list)
    access_risk: PeopleOpsSeverity = "low"
    compensation_review: str = ""
    overall: PeopleOpsRating = "meets"
    created_at: datetime
    updated_at: datetime | None = None


class DelegationTask(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    role_id: UUID
    candidate_id: UUID | None = None
    task: str = Field(min_length=1)
    context: str = ""
    sop: str = ""
    expected_output: str = ""
    deadline: str | None = None
    quality_checklist: list[str] = Field(default_factory=list)
    files_needed: list[str] = Field(default_factory=list)
    approval_path: list[str] = Field(default_factory=list)
    escalation_rule: str = ""
    status: DelegationTaskStatus = "drafted"
    created_at: datetime
    updated_at: datetime | None = None


class DelegateTaskInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    role_id: UUID
    candidate_id: UUID | None = None
    task: str = Field(min_length=1)
    context: str = ""
    sop: str = ""
    expected_output: str = ""
    deadline: str | None = None
    quality_checklist: list[str] = Field(default_factory=list)
    files_needed: list[str] = Field(default_factory=list)
    approval_path: list[str] = Field(default_factory=list)
    escalation_rule: str = ""


class OffboardingStep(BaseModel):
    model_config = ConfigDict(extra="forbid")
    kind: OffboardingStepKind
    status: OffboardingStepStatus = "pending"
    notes: str = ""


class OffboardingProcess(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    role_id: UUID
    candidate_id: UUID | None = None
    reason: str = ""
    steps: list[OffboardingStep] = Field(default_factory=list)
    access_revoked: bool = False
    completed: bool = False
    created_at: datetime
    updated_at: datetime | None = None


# ===========================================================================
# Department Operating System + AI Employee KPI (mirror of department-os.ts)
# ===========================================================================

DeptRiskLevel = Literal["low", "medium", "high", "critical"]
DeptReviewCadence = Literal["daily", "weekly", "monthly"]
AiEmployeeStatus = Literal[
    "active", "testing", "needs_improvement", "paused", "retired",
]
KpiOwnerKind = Literal["department", "ai_employee"]
DeptGovernanceViolationKind = Literal[
    "ai_employee_without_department", "department_without_operating_loop",
    "department_without_kpis", "kpi_without_business_outcome",
]


class Department(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    key: str = Field(min_length=1)
    name: str = Field(min_length=1)
    mission: str = ""
    operating_loop: list[str] = Field(default_factory=list)
    responsibilities: list[str] = Field(default_factory=list)
    inputs: list[str] = Field(default_factory=list)
    outputs: list[str] = Field(default_factory=list)
    kpis: list[str] = Field(default_factory=list)
    review_cadence: DeptReviewCadence = "weekly"
    approval_rules: list[str] = Field(default_factory=list)
    escalation_rules: list[str] = Field(default_factory=list)
    failure_signals: list[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime | None = None


class AiEmployee(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    department_key: str = Field(min_length=1)
    name: str = Field(min_length=1)
    mission: str = ""
    businesses_used_by: list[str] = Field(default_factory=list)
    allowed_actions: list[str] = Field(default_factory=list)
    requires_approval_for: list[str] = Field(default_factory=list)
    inputs: list[str] = Field(default_factory=list)
    outputs: list[str] = Field(default_factory=list)
    tools_integrations: list[str] = Field(default_factory=list)
    risk_level: DeptRiskLevel = "low"
    kpis: list[str] = Field(default_factory=list)
    metrics: dict[str, float] = Field(default_factory=dict)
    review_cadence: DeptReviewCadence = "weekly"
    status: AiEmployeeStatus = "active"
    created_at: datetime
    updated_at: datetime | None = None


class KpiRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    owner_kind: KpiOwnerKind
    owner_key: str = Field(min_length=1)
    kpi_name: str = Field(min_length=1)
    value: float
    period: str = Field(min_length=1)
    business_outcome: str = Field(min_length=1)
    created_at: datetime


class DeptGovernanceViolation(BaseModel):
    model_config = ConfigDict(extra="forbid")
    kind: DeptGovernanceViolationKind
    subject: str
    detail: str = ""


class DeptGovernanceReport(BaseModel):
    model_config = ConfigDict(extra="forbid")
    tenant_id: UUID
    ok: bool
    violations: list[DeptGovernanceViolation] = Field(default_factory=list)
    departments_checked: int = Field(default=0, ge=0)
    ai_employees_checked: int = Field(default=0, ge=0)
    kpis_checked: int = Field(default=0, ge=0)


# ===========================================================================
# AI Organization / Chain of Command (mirror of ai-org.ts)
# ===========================================================================

OrgLayer = Literal[
    "executive", "department_leader", "ai_employee", "specialist_agent",
]
RoleCardReviewCadence = Literal["daily", "weekly", "monthly", "per_task"]
PermissionScope = Literal[
    "observe_only", "research_only", "draft_only", "recommend_only",
    "create_internal_task", "prepare_external_asset", "execute_low_risk",
    "execute_with_approval", "admin_disabled",
]
RoleCardStatus = Literal["active", "testing", "paused", "retired"]
DelegationStatus = Literal[
    "issued", "accepted", "in_progress", "reported", "approved", "rejected", "escalated",
]
DelegationPriority = Literal["low", "medium", "high", "critical"]
AgentReportExecutionStatus = Literal["done", "partial", "blocked", "failed"]
AgentReportVerificationStatus = Literal["unverified", "self_checked", "verified"]
EscalationReason = Literal[
    "high_risk", "approval_required", "context_conflict", "source_conflict",
    "execution_failed", "low_confidence", "legal_medical_financial",
    "high_stakes_public", "cost_threshold", "live_system_change",
    "revenue_pricing_contract",
]
DepartmentReportCadence = Literal["daily", "weekly", "monthly"]
AiOrgViolationKind = Literal[
    "role_without_department", "non_executive_without_reports_to",
    "specialist_acted_without_packet",
]


class RoleCard(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    name: str = Field(min_length=1)
    department_key: str = Field(min_length=1)
    org_layer: OrgLayer
    is_leader: bool = False
    mission: str = ""
    businesses_used_by: list[str] = Field(default_factory=list)
    primary_responsibilities: list[str] = Field(default_factory=list)
    operating_loop: list[str] = Field(default_factory=list)
    allowed_actions: list[str] = Field(default_factory=list)
    requires_approval_for: list[str] = Field(default_factory=list)
    inputs: list[str] = Field(default_factory=list)
    outputs: list[str] = Field(default_factory=list)
    tools_integrations: list[str] = Field(default_factory=list)
    kpis: list[str] = Field(default_factory=list)
    failure_signals: list[str] = Field(default_factory=list)
    escalation_rules: list[str] = Field(default_factory=list)
    review_cadence: RoleCardReviewCadence = "weekly"
    permission_scope: PermissionScope = "recommend_only"
    reports_to: str | None = None
    status: RoleCardStatus = "active"
    created_at: datetime
    updated_at: datetime | None = None


class DelegationPacket(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    assigning_employee: str = Field(min_length=1)
    assigned_agent: str = Field(min_length=1)
    business: str = ""
    project: str = ""
    objective: str = Field(min_length=1)
    context_stack: list[str] = Field(default_factory=list)
    source_of_truth_refs: list[str] = Field(default_factory=list)
    required_output: str = ""
    allowed_tools: list[str] = Field(default_factory=list)
    prohibited_actions: list[str] = Field(default_factory=list)
    approval_required: bool = False
    deadline: str | None = None
    priority: DelegationPriority = "medium"
    success_criteria: list[str] = Field(default_factory=list)
    reporting_format: str = ""
    escalation_trigger: str = ""
    status: DelegationStatus = "issued"
    created_at: datetime


class AgentReport(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    packet_id: UUID
    agent: str = Field(min_length=1)
    task_completed: bool = False
    output_produced: str = ""
    sources_used: list[str] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)
    issues: list[str] = Field(default_factory=list)
    confidence: float = Field(default=0.5, ge=0, le=1)
    risks: list[str] = Field(default_factory=list)
    approval_needed: bool = False
    recommended_next_step: str = ""
    execution_status: AgentReportExecutionStatus = "done"
    verification_status: AgentReportVerificationStatus = "unverified"
    created_at: datetime


class EscalationEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    from_layer: OrgLayer
    to_layer: OrgLayer
    reason: EscalationReason
    detail: str = ""
    packet_id: UUID | None = None
    resolved: bool = False
    created_at: datetime


class AccountabilityRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    requesting_leader: str = ""
    responsible_employee: str = ""
    executing_agent: str = Field(min_length=1)
    approving_authority: str | None = None
    business: str = ""
    task: str = ""
    status: str = ""
    result: str = ""
    kpi_impact: str = ""
    audit_log: list[str] = Field(default_factory=list)
    created_at: datetime


class DepartmentReport(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    department_key: str = Field(min_length=1)
    cadence: DepartmentReportCadence
    completed_work: list[str] = Field(default_factory=list)
    pending_approvals: list[str] = Field(default_factory=list)
    blockers: list[str] = Field(default_factory=list)
    revenue_opportunities: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    next_actions: list[str] = Field(default_factory=list)
    kpis: dict[str, float] = Field(default_factory=dict)
    wins: list[str] = Field(default_factory=list)
    failures: list[str] = Field(default_factory=list)
    lessons_learned: list[str] = Field(default_factory=list)
    created_at: datetime


class AiOrgViolation(BaseModel):
    model_config = ConfigDict(extra="forbid")
    kind: AiOrgViolationKind
    subject: str
    detail: str = ""


class AiOrgChainReport(BaseModel):
    model_config = ConfigDict(extra="forbid")
    tenant_id: UUID
    ok: bool
    violations: list[AiOrgViolation] = Field(default_factory=list)
    roles_checked: int = Field(default=0, ge=0)


# ===========================================================================
# CRO / Revenue Command (mirror of revenue-command.ts)
# ===========================================================================

RevenueOpportunityKind = Literal[
    "fast_cash", "long_term", "stalled_deal", "unpaid_labor", "underpriced_offer",
    "weak_funnel", "missing_followup", "conversion_blocker", "partnership",
    "referral", "upsell",
]
RevenueEffort = Literal["low", "medium", "high"]
RevenueRisk = Literal["low", "medium", "high", "critical"]
RevenueStrategicValue = Literal["low", "medium", "high"]
RevenueRepeatability = Literal["one_time", "repeatable", "recurring"]
RevenueMargin = Literal["low", "medium", "high"]
RevenueOpportunityStatus = Literal[
    "pursue_now", "nurture", "automate", "delegate", "reprice", "pause", "kill",
]
MoneyActionStatus = Literal["todo", "in_progress", "blocked", "done"]
FunnelStage = Literal[
    "lead_capture", "nurture", "activation", "conversion", "upsell", "referral",
    "retention", "reactivation",
]
FunnelHealth = Literal["healthy", "leaking", "broken"]
BusinessRevenueKey = Literal[
    "move_mi", "divini_procure", "divini_partners", "stratalogic", "founder_os",
    "black_flag",
]
BusinessRevenueMissionStatus = Literal["active", "paused", "done"]
OfferReviewVerdict = Literal["send", "revise", "hold"]


class RevenueOpportunity(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    business: str = Field(min_length=1)
    kind: RevenueOpportunityKind
    title: str = Field(min_length=1)
    description: str = ""
    expected_revenue_usd: float = Field(default=0, ge=0)
    speed_to_cash_days: float = Field(default=0, ge=0)
    effort: RevenueEffort = "medium"
    risk: RevenueRisk = "low"
    confidence: float = Field(default=0.5, ge=0, le=1)
    founder_time_hours: float = Field(default=0, ge=0)
    strategic_value: RevenueStrategicValue = "medium"
    repeatability: RevenueRepeatability = "one_time"
    margin: RevenueMargin = "medium"
    probability_of_close: float = Field(default=0.5, ge=0, le=1)
    score: float = Field(default=0, ge=0, le=100)
    status: RevenueOpportunityStatus = "nurture"
    created_at: datetime
    updated_at: datetime | None = None


class RevenueOpportunityInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    business: str = Field(min_length=1)
    kind: RevenueOpportunityKind
    title: str = Field(min_length=1)
    description: str = ""
    expected_revenue_usd: float = Field(default=0, ge=0)
    speed_to_cash_days: float = Field(default=0, ge=0)
    effort: RevenueEffort = "medium"
    risk: RevenueRisk = "low"
    confidence: float = Field(default=0.5, ge=0, le=1)
    founder_time_hours: float = Field(default=0, ge=0)
    strategic_value: RevenueStrategicValue = "medium"
    repeatability: RevenueRepeatability = "one_time"
    margin: RevenueMargin = "medium"
    probability_of_close: float = Field(default=0.5, ge=0, le=1)


class RevenueOpportunityFilter(BaseModel):
    model_config = ConfigDict(extra="forbid")
    business: str | None = Field(default=None, min_length=1)
    kind: RevenueOpportunityKind | None = None
    status: RevenueOpportunityStatus | None = None


class MoneyAction(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    opportunity_id: UUID | None = None
    business: str = Field(min_length=1)
    action: str = Field(min_length=1)
    rationale: str = ""
    expected_revenue_usd: float = Field(default=0, ge=0)
    due: str | None = None
    assigned_agent: str | None = None
    approval_required: bool = False
    status: MoneyActionStatus = "todo"
    created_at: datetime
    updated_at: datetime | None = None


class MoneyActionInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    opportunity_id: UUID | None = None
    business: str = Field(min_length=1)
    action: str = Field(min_length=1)
    rationale: str = ""
    expected_revenue_usd: float = Field(default=0, ge=0)
    due: str | None = None
    assigned_agent: str | None = None
    approval_required: bool = False


class FunnelStageRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    business: str = Field(min_length=1)
    stage: FunnelStage
    health: FunnelHealth = "healthy"
    notes: str = ""
    recommended_action: str = ""
    created_at: datetime


class FunnelStageRecordInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    business: str = Field(min_length=1)
    stage: FunnelStage
    health: FunnelHealth = "healthy"
    notes: str = ""
    recommended_action: str = ""


class RevenueCommandCenter(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    date: str = Field(min_length=1)
    top_money_actions: list[str] = Field(default_factory=list)
    hottest_leads: list[str] = Field(default_factory=list)
    proposals_due: list[str] = Field(default_factory=list)
    followups_due: list[str] = Field(default_factory=list)
    payment_links_needed: list[str] = Field(default_factory=list)
    stalled_deals: list[str] = Field(default_factory=list)
    top_platform_users: list[str] = Field(default_factory=list)
    fastest_partnerships: list[str] = Field(default_factory=list)
    revenue_blockers: list[str] = Field(default_factory=list)
    cash_forecast_usd: float | None = None
    created_at: datetime


class BusinessRevenueMission(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    business: BusinessRevenueKey
    objectives: list[str] = Field(default_factory=list)
    tactics: list[str] = Field(default_factory=list)
    kpis: list[str] = Field(default_factory=list)
    status: BusinessRevenueMissionStatus = "active"
    created_at: datetime
    updated_at: datetime | None = None


class BusinessRevenueMissionInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    business: BusinessRevenueKey
    objectives: list[str] = Field(default_factory=list)
    tactics: list[str] = Field(default_factory=list)
    kpis: list[str] = Field(default_factory=list)
    status: BusinessRevenueMissionStatus = "active"


class OfferReview(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    business: str = Field(min_length=1)
    offer_name: str = Field(min_length=1)
    price_usd: float = Field(default=0, ge=0)
    flags: list[str] = Field(default_factory=list)
    recommended_price_usd: float | None = None
    verdict: OfferReviewVerdict = "send"
    notes: str = ""
    created_at: datetime


class OfferReviewInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    business: str = Field(min_length=1)
    offer_name: str = Field(min_length=1)
    price_usd: float = Field(default=0, ge=0)
    price_floor_usd: float = Field(default=0, ge=0)
    has_clear_scope: bool = True
    has_cta: bool = True
    has_deposit: bool = True
    has_payment_link: bool = True
    is_custom_work: bool = False
    is_consulting: bool = False
    is_paid: bool = True
    notes: str = ""


class RevenueKpiSnapshot(BaseModel):
    model_config = ConfigDict(extra="forbid")
    tenant_id: UUID
    leads: float = Field(default=0, ge=0)
    qualified_leads: float = Field(default=0, ge=0)
    booked_calls: float = Field(default=0, ge=0)
    proposals_sent: float = Field(default=0, ge=0)
    close_rate: float = Field(default=0, ge=0, le=1)
    avg_deal_size: float = Field(default=0, ge=0)
    revenue_generated: float = Field(default=0, ge=0)
    recurring_revenue: float = Field(default=0, ge=0)
    transaction_fees: float = Field(default=0, ge=0)
    referral_revenue: float = Field(default=0, ge=0)
    funding_raised: float = Field(default=0, ge=0)
    followups_completed: float = Field(default=0, ge=0)
    unpaid_labor_prevented: float = Field(default=0, ge=0)
    time_to_cash: float = Field(default=0, ge=0)


# ===========================================================================
# Swarm Lab (mirror of swarm-lab.ts) — R&D's bounded swarm
# ===========================================================================

SwarmMode = Literal[
    "idea_generation", "option_exploration", "research_scan", "red_team", "divergent_brainstorm",
]
SwarmRunStatus = Literal["draft", "running", "converged", "reported", "promoted", "archived"]
SwarmPermissionScope = Literal["draft_only", "recommend_only"]


class SwarmRun(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    business_id: UUID | None = None
    department_key: str = "research_development"
    packet_id: UUID | None = None
    objective: str = Field(min_length=1)
    mode: SwarmMode = "divergent_brainstorm"
    agent_count: int = Field(default=8, ge=1, le=50)
    permission_scope: SwarmPermissionScope = "draft_only"
    reports_to: str = "R&D Lead"
    status: SwarmRunStatus = "draft"
    created_at: datetime
    updated_at: datetime | None = None


class StartSwarmRunInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    objective: str = Field(min_length=1)
    mode: SwarmMode = "divergent_brainstorm"
    agent_count: int = Field(default=8, ge=1, le=50)
    business_id: UUID | None = None
    packet_id: UUID | None = None
    permission_scope: SwarmPermissionScope = "draft_only"


class SwarmCandidate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    run_id: UUID
    agent_label: str = Field(min_length=1)
    angle: str = ""
    content: str = ""
    novelty: float = Field(default=0.5, ge=0, le=1)
    feasibility: float = Field(default=0.5, ge=0, le=1)
    score: float = Field(default=0, ge=0, le=1)
    created_at: datetime


class SwarmCluster(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    run_id: UUID
    theme: str = ""
    candidate_ids: list[UUID] = Field(default_factory=list)
    pick: bool = False
    rank: int = Field(default=0, ge=0)
    rationale: str = ""
    created_at: datetime


class SwarmReport(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    run_id: UUID
    top_candidate_ids: list[UUID] = Field(default_factory=list)
    clusters_summary: str = ""
    recommended_next_step: str = ""
    escalated: bool = False
    created_at: datetime


# ===========================================================================
# Business Operating Profile + Context Stack (mirror of business-profile.ts)
# ===========================================================================

BusinessTier = Literal["tier_1", "tier_2", "tier_3"]
BusinessProfileStatus = Literal["active", "paused", "archived"]
BusinessContextLayer = Literal[
    "security_compliance", "global_rules", "founder_profile", "department_instructions",
    "role_instructions", "skill_playbook", "business_profile", "project_context",
    "relationship_history", "source_of_truth", "task_instructions",
]


class ProfileOffer(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1)
    price: str = ""
    terms: str = ""


class BusinessOperatingProfile(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    business_key: str = Field(min_length=1)
    tier: BusinessTier = "tier_1"
    identity: str = ""
    mission: str = ""
    revenue_model: str = ""
    offers: list[ProfileOffer] = Field(default_factory=list)
    pricing_notes: str = ""
    target_audiences: list[str] = Field(default_factory=list)
    brand_voice: str = ""
    approved_language: list[str] = Field(default_factory=list)
    banned_language: list[str] = Field(default_factory=list)
    growth_channels: list[str] = Field(default_factory=list)
    platform_connections: list[str] = Field(default_factory=list)
    source_of_truth_systems: list[str] = Field(default_factory=list)
    active_campaigns: list[str] = Field(default_factory=list)
    current_priorities: list[str] = Field(default_factory=list)
    compliance_risks: list[str] = Field(default_factory=list)
    compliance_caution: str = ""
    ai_skills_used: list[str] = Field(default_factory=list)
    kpis: list[str] = Field(default_factory=list)
    improvement_backlog: list[str] = Field(default_factory=list)
    status: BusinessProfileStatus = "active"
    created_at: datetime
    updated_at: datetime | None = None


class ContextStackEntry(BaseModel):
    model_config = ConfigDict(extra="forbid")
    layer: BusinessContextLayer
    content: list[str] = Field(default_factory=list)


class ContextStack(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    business_key: str = Field(min_length=1)
    task: str = Field(min_length=1)
    layers: list[ContextStackEntry] = Field(default_factory=list)
    brand_voice: str = ""
    banned_language: list[str] = Field(default_factory=list)
    compliance_caution: str = ""
    created_at: datetime


# ===========================================================================
# Executive Review Cadence + Master Docs (mirror of review-cadence.ts)
# ===========================================================================

ReviewLevel = Literal[
    "monthly_business", "monthly_portfolio", "quarterly_business",
    "quarterly_portfolio", "yearly_business", "yearly_portfolio",
]
ReviewMeetingMode = Literal["monthly_operator", "quarterly_ceo", "yearly_portfolio"]
ReviewStatus = Literal[
    "collecting", "drafted", "sent_for_review", "reviewed", "actioned", "archived",
]


class ReviewDepartmentReport(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    review_id: UUID
    department_key: str = Field(min_length=1)
    wins: list[str] = Field(default_factory=list)
    failures: list[str] = Field(default_factory=list)
    kpis: dict[str, float] = Field(default_factory=dict)
    risks: list[str] = Field(default_factory=list)
    blockers: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    decisions_needed: list[str] = Field(default_factory=list)
    created_at: datetime


class ReviewSection(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = Field(min_length=1)
    body: str = ""


class ReviewKpiTable(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1)
    rows: list[dict[str, Any]] = Field(default_factory=list)


class ApprovalChecklistItem(BaseModel):
    model_config = ConfigDict(extra="forbid")
    item: str = Field(min_length=1)
    checked: bool = False


class MasterReviewDoc(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    business_key: str | None = None
    level: ReviewLevel
    period: str = Field(min_length=1)
    meeting_mode: ReviewMeetingMode
    executive_summary: str = ""
    sections: list[ReviewSection] = Field(default_factory=list)
    kpi_tables: list[ReviewKpiTable] = Field(default_factory=list)
    decisions_needed: list[str] = Field(default_factory=list)
    recommended_actions: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    priorities: list[str] = Field(default_factory=list)
    data_sources: list[str] = Field(default_factory=list)
    approval_checklist: list[ApprovalChecklistItem] = Field(default_factory=list)
    follow_up_tasks: list[str] = Field(default_factory=list)
    agenda: list[str] = Field(default_factory=list)
    status: ReviewStatus = "collecting"
    created_at: datetime
    updated_at: datetime | None = None


class ReviewFeedback(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    review_id: UUID
    decisions: list[str] = Field(default_factory=list)
    updated_priorities: list[str] = Field(default_factory=list)
    new_tasks: list[str] = Field(default_factory=list)
    sop_changes: list[str] = Field(default_factory=list)
    paused_or_killed: list[str] = Field(default_factory=list)
    next_review_goals: list[str] = Field(default_factory=list)
    created_at: datetime


# ===========================================================================
# Expert Knowledge Council + Framework Library (mirror of expert-council.ts)
# ===========================================================================

ExpertLensKind = Literal[
    "offer_pricing", "marketing_attention", "sales_persuasion", "operations_scaling",
    "wealth_investing", "psychology_behavior", "product_growth", "leadership_culture",
    "negotiation_deals", "nonprofit_fundraising",
]
FrameworkTestStatus = Literal[
    "untested", "testing", "validated", "adapted", "rejected", "archived",
]


class ExpertFramework(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    expert: str = Field(min_length=1)
    discipline: ExpertLensKind
    source: str = ""
    principle: str = Field(min_length=1)
    framework_name: str = Field(min_length=1)
    best_use_case: str = ""
    bad_use_case: str = ""
    misuse_risk: str = ""
    adapted_for_alyssa: str = ""
    business_applications: list[str] = Field(default_factory=list)
    implementation_steps: list[str] = Field(default_factory=list)
    kpi: str = ""
    confidence: float = Field(default=0.5, ge=0, le=1)
    test_status: FrameworkTestStatus = "untested"
    created_at: datetime
    updated_at: datetime | None = None


class LensRecommendation(BaseModel):
    model_config = ConfigDict(extra="forbid")
    lens: ExpertLensKind
    recommendation: str = Field(min_length=1)


class LensApplication(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    objective: str = Field(min_length=1)
    business_key: str = ""
    selected_lenses: list[ExpertLensKind] = Field(default_factory=list)
    recommendations: list[LensRecommendation] = Field(default_factory=list)
    conflicts: list[str] = Field(default_factory=list)
    chosen_strategy: str = ""
    execution_steps: list[str] = Field(default_factory=list)
    kpis: list[str] = Field(default_factory=list)
    approval_needed: bool = False
    created_at: datetime


class PrincipleConversion(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    principle: str = Field(min_length=1)
    businesses: list[str] = Field(default_factory=list)
    departments: list[str] = Field(default_factory=list)
    agents: list[str] = Field(default_factory=list)
    templates_needed: list[str] = Field(default_factory=list)
    sops_needed: list[str] = Field(default_factory=list)
    campaign_use: str = ""
    product_use: str = ""
    kpi: str = ""
    recommended_test: str = ""
    created_at: datetime


class BoardLensView(BaseModel):
    model_config = ConfigDict(extra="forbid")
    lens_name: str = Field(min_length=1)
    recommendation: str = Field(min_length=1)


class AdvisoryBoardReview(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    decision: str = Field(min_length=1)
    lenses_run: list[BoardLensView] = Field(default_factory=list)
    tradeoffs: list[str] = Field(default_factory=list)
    decision_required: str = ""
    fastest_safe_next_step: str = ""
    created_at: datetime


# ===========================================================================
# Org Health / CODO (mirror of org-health.ts)
# ===========================================================================

WellnessRecommendation = Literal[
    "ok", "split_responsibilities", "add_specialist", "improve_automation",
    "improve_delegation", "simplify_sops", "pause", "retire",
]
FailureDiagnosis = Literal[
    "wrong_business_context", "wrong_audience", "wrong_skill", "missing_source_data",
    "unclear_instructions", "outdated_memory", "insufficient_examples", "weak_prompt",
    "wrong_model", "missing_approval_rule", "poor_handoff",
]
CorrectionUpdate = Literal[
    "instructions", "skill_playbook", "business_profile", "templates",
    "examples", "source_of_truth", "qa_checklist",
]


class AgentWellnessSnapshot(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    agent: str = Field(min_length=1)
    workload: int = Field(ge=0)
    waiting_tasks: int = Field(ge=0)
    avg_response_ms: float = Field(ge=0)
    approval_delay_ms: float = Field(ge=0)
    failure_rate: float = Field(ge=0, le=1)
    handoff_success: float = Field(ge=0, le=1)
    context_size: int = Field(ge=0)
    cost_per_run: float = Field(ge=0)
    token_efficiency: float = Field(ge=0, le=1)
    overloaded: bool
    recommendation: WellnessRecommendation
    created_at: datetime


class CommunicationAudit(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    from_agent: str = Field(min_length=1)
    to_agent: str = Field(min_length=1)
    packet_id: UUID | None = None
    clarity: float = Field(ge=0, le=1)
    completeness: float = Field(ge=0, le=1)
    context: float = Field(ge=0, le=1)
    resource_availability: float = Field(ge=0, le=1)
    ambiguity: float = Field(ge=0, le=1)
    handoff_quality: float = Field(ge=0, le=1)
    business_awareness: float = Field(ge=0, le=1)
    goal_awareness: float = Field(ge=0, le=1)
    kpi_awareness: float = Field(ge=0, le=1)
    approval_awareness: float = Field(ge=0, le=1)
    score: float = Field(ge=0, le=1)
    issues: list[str] = Field(default_factory=list)
    created_at: datetime


class AgentCorrection(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    agent: str = Field(min_length=1)
    failure_diagnosis: FailureDiagnosis
    updates_made: list[CorrectionUpdate] = Field(default_factory=list)
    notes: str = ""
    created_at: datetime


class OrgHealthReport(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    period: str = Field(min_length=1)
    org_health_score: float = Field(ge=0, le=100)
    bottlenecks: list[str] = Field(default_factory=list)
    overloaded_agents: list[str] = Field(default_factory=list)
    underutilized_agents: list[str] = Field(default_factory=list)
    approval_delays: list[str] = Field(default_factory=list)
    repeated_mistakes: list[str] = Field(default_factory=list)
    outdated_sops: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    created_at: datetime


class CeoCoachingReport(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    period: str = Field(min_length=1)
    too_much_time_on: list[str] = Field(default_factory=list)
    only_alyssa_can_do: list[str] = Field(default_factory=list)
    ai_should_own: list[str] = Field(default_factory=list)
    humans_should_own: list[str] = Field(default_factory=list)
    should_disappear: list[str] = Field(default_factory=list)
    decision_fatigue_points: list[str] = Field(default_factory=list)
    perfectionism_points: list[str] = Field(default_factory=list)
    missed_opportunities: list[str] = Field(default_factory=list)
    leverage_increased: list[str] = Field(default_factory=list)
    leverage_decreased: list[str] = Field(default_factory=list)
    founder_health_indicators: list[str] = Field(default_factory=list)
    recommended_focus_next_month: list[str] = Field(default_factory=list)
    created_at: datetime


# ===========================================================================
# Incentive Alignment + Referral Ecosystem (mirror of incentive-ecosystem.ts)
# ===========================================================================

EcosystemParticipantKind = Literal[
    "vendor", "venue", "developer", "investor", "sponsor", "donor", "customer",
    "partner", "employee", "contractor", "platform_user", "referral_source",
]
IncentiveType = Literal[
    "revenue_share", "referral_reward", "visibility", "preferred_placement",
    "early_access", "status_tier", "exclusive_resource", "discount", "done_for_you",
    "faster_response", "reporting_insights", "networking_intro", "content_feature",
    "case_study",
]
IncentiveVerdict = Literal["recommend", "revise", "reject"]
RevSharePayoutStatus = Literal["pending", "approved", "paid", "disputed"]
ReferralProgramStatus = Literal["active", "paused"]


class IncentiveEvaluation(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    business_key: str = Field(min_length=1)
    participant_kind: EcosystemParticipantKind
    incentive_type: IncentiveType
    what_they_want: str = ""
    what_they_give: str = ""
    what_they_receive: str = ""
    business_upside: float = Field(default=0, ge=0, le=1)
    participant_upside: float = Field(default=0, ge=0, le=1)
    cost_to_deliver: float = Field(default=0, ge=0, le=1)
    margin_impact: float = Field(default=0, ge=0, le=1)
    retention_impact: float = Field(default=0, ge=0, le=1)
    referral_likelihood: float = Field(default=0, ge=0, le=1)
    reputation_impact: float = Field(default=0, ge=0, le=1)
    abuse_risk: float = Field(default=0, ge=0, le=1)
    value_exchange_score: float = Field(default=0, ge=0, le=100)
    approval_required: bool = False
    verdict: IncentiveVerdict = "revise"
    notes: str = ""
    created_at: datetime


class EvaluateIncentiveInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    business_key: str = Field(min_length=1)
    participant_kind: EcosystemParticipantKind
    incentive_type: IncentiveType
    what_they_want: str = ""
    what_they_give: str = ""
    what_they_receive: str = ""
    business_upside: float = Field(default=0, ge=0, le=1)
    participant_upside: float = Field(default=0, ge=0, le=1)
    cost_to_deliver: float = Field(default=0, ge=0, le=1)
    margin_impact: float = Field(default=0, ge=0, le=1)
    retention_impact: float = Field(default=0, ge=0, le=1)
    referral_likelihood: float = Field(default=0, ge=0, le=1)
    reputation_impact: float = Field(default=0, ge=0, le=1)
    abuse_risk: float = Field(default=0, ge=0, le=1)
    involves_money: bool = False
    notes: str = ""


class ReferralProgram(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    business_key: str = Field(min_length=1)
    who_can_refer: str = ""
    who_they_refer: str = ""
    reward: str = ""
    tracking_method: str = ""
    payout_logic: str = ""
    eligibility: str = ""
    fraud_prevention: str = ""
    relationship_protection: str = ""
    follow_up_sequence: list[str] = Field(default_factory=list)
    status: ReferralProgramStatus = "active"
    created_at: datetime
    updated_at: datetime | None = None


class CreateReferralProgramInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    business_key: str = Field(min_length=1)
    who_can_refer: str = ""
    who_they_refer: str = ""
    reward: str = ""
    tracking_method: str = ""
    payout_logic: str = ""
    eligibility: str = ""
    fraud_prevention: str = ""
    relationship_protection: str = ""
    follow_up_sequence: list[str] = Field(default_factory=list)
    status: ReferralProgramStatus = "active"


class RevShareRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    business_key: str = Field(min_length=1)
    source_partner: str = ""
    referred_party: str = ""
    transaction_ref: str = ""
    fee_pct: float = 0
    payout_pct: float = 0
    payout_trigger: str = ""
    payout_status: RevSharePayoutStatus = "pending"
    agreement_status: str = ""
    created_at: datetime


class RecordRevShareInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    business_key: str = Field(min_length=1)
    source_partner: str = ""
    referred_party: str = ""
    transaction_ref: str = ""
    fee_pct: float = 0
    payout_pct: float = 0
    payout_trigger: str = ""
    agreement_status: str = ""


class EcosystemHealthScore(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    business_key: str = Field(min_length=1)
    value_created: float = Field(default=0, ge=0, le=1)
    incentive_fairness: float = Field(default=0, ge=0, le=1)
    referral_activity: float = Field(default=0, ge=0, le=1)
    repeat_participation: float = Field(default=0, ge=0, le=1)
    trust_signals: float = Field(default=0, ge=0, le=1)
    disputes: int = Field(default=0, ge=0)
    payout_timeliness: float = Field(default=0, ge=0, le=1)
    retention: float = Field(default=0, ge=0, le=1)
    satisfaction: float = Field(default=0, ge=0, le=1)
    score: float = Field(default=0, ge=0, le=100)
    created_at: datetime


class ScoreEcosystemHealthInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    value_created: float = Field(default=0, ge=0, le=1)
    incentive_fairness: float = Field(default=0, ge=0, le=1)
    referral_activity: float = Field(default=0, ge=0, le=1)
    repeat_participation: float = Field(default=0, ge=0, le=1)
    trust_signals: float = Field(default=0, ge=0, le=1)
    disputes: int = Field(default=0, ge=0)
    payout_timeliness: float = Field(default=0, ge=0, le=1)
    retention: float = Field(default=0, ge=0, le=1)
    satisfaction: float = Field(default=0, ge=0, le=1)


class WinWinWinReview(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    business_key: str = Field(min_length=1)
    proposal: str = ""
    alyssa_wins: bool = False
    participant_wins: bool = False
    end_customer_wins: bool = False
    builds_trust: bool = False
    encourages_repeat: bool = False
    creates_referrals: bool = False
    verdict: IncentiveVerdict = "revise"
    created_at: datetime


class WinWinWinReviewInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    business_key: str = Field(min_length=1)
    proposal: str = ""
    alyssa_wins: bool = False
    participant_wins: bool = False
    end_customer_wins: bool = False
    builds_trust: bool = False
    encourages_repeat: bool = False
    creates_referrals: bool = False


# ===========================================================================
# Knowledge Ops (mirror of knowledge-ops.ts)
# ===========================================================================

KnowledgeSourceKind = Literal[
    "youtube", "podcast", "blog", "book", "newsletter", "social",
    "course", "transcript", "interview",
]
SourcePipelineStatus = Literal[
    "added", "summarized", "extracted", "mapped", "tested", "archived",
]
KnowEffort = Literal["low", "medium", "high"]
KnowMagnitude = Literal["low", "medium", "high"]
CompanyStage = Literal[
    "idea", "validation", "first_revenue", "repeatable_revenue",
    "scaling", "mature", "enterprise", "acquisition_ready",
]
KnowBusinessModel = Literal[
    "saas", "marketplace", "local_service", "advisory", "nonprofit",
    "procurement", "event_platform", "health_wellness", "ai_software",
    "media_personal_brand", "subscription", "transaction_fee",
    "referral_model", "sponsorship_model",
]
KnowDiscipline = Literal[
    "sales", "marketing", "offers", "pricing", "funnels", "social_media",
    "finance", "investing", "operations", "hiring", "leadership",
    "psychology", "negotiation", "product", "growth", "fundraising",
    "customer_success", "brand", "pr", "ai_search",
]
ScenarioKind = Literal[
    "fastest_cash", "highest_margin", "lowest_effort",
    "best_long_term_asset", "best_brand", "highest_automation",
]
KnowExperimentStatus = Literal[
    "untested", "testing", "validated", "adapted", "rejected", "archived",
]


class KnowledgeSource(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    source_name: str = Field(min_length=1)
    expert: str = ""
    kind: KnowledgeSourceKind
    url_ref: str = ""
    date_added: str = ""
    summarized: bool = False
    principles_extracted: bool = False
    mapped_to_businesses: bool = False
    tested: bool = False
    status: SourcePipelineStatus = "added"
    created_at: datetime
    updated_at: datetime | None = None


class OperatorDigestItem(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    week: str = Field(min_length=1)
    source: str = ""
    principle: str = Field(min_length=1)
    why_it_matters: str = ""
    business_it_applies_to: str = ""
    recommended_test: str = ""
    effort: KnowEffort = "medium"
    upside: KnowMagnitude = "medium"
    risk: KnowMagnitude = "medium"
    surfaced: bool = False
    created_at: datetime


class AdaptationFilterResult(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    principle: str = Field(min_length=1)
    business_key: str = Field(min_length=1)
    fits_model: bool = False
    fits_brand: bool = False
    fits_energy: bool = False
    protects_trust: bool = False
    creates_leverage: bool = False
    risks_generic: bool = False
    too_manual: bool = False
    ai_automatable: bool = False
    cheaply_testable: bool = False
    passed: bool = False
    recommendation: str = ""
    created_at: datetime


class KnowledgeTaxonomyEntry(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    insight: str = Field(min_length=1)
    discipline: KnowDiscipline
    business_function: str = ""
    funnel_stage: str = ""
    company_stage: CompanyStage
    business_model: KnowBusinessModel
    audience_type: str = ""
    risk_level: KnowMagnitude = "medium"
    implementation_difficulty: KnowEffort = "medium"
    expected_roi: KnowMagnitude = "medium"
    confidence: float = Field(default=0.5, ge=0, le=1)
    source_quality: KnowMagnitude = "medium"
    freshness: str = ""
    created_at: datetime


class ScenarioOption(BaseModel):
    model_config = ConfigDict(extra="forbid")
    kind: ScenarioKind
    upside: str = ""
    effort: KnowEffort = "medium"
    risk: KnowMagnitude = "medium"
    timeline: str = ""
    required_agents: list[str] = Field(default_factory=list)
    kpis: list[str] = Field(default_factory=list)
    recommendation: str = ""


class KnowledgeScenario(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    strategy: str = Field(min_length=1)
    business_key: str = Field(min_length=1)
    scenarios: list[ScenarioOption] = Field(default_factory=list)
    created_at: datetime


class KnowledgeExperiment(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    hypothesis: str = Field(min_length=1)
    business_key: str = Field(min_length=1)
    audience: str = ""
    asset: str = ""
    channel: str = ""
    timeline: str = ""
    expected_result: str = ""
    kpi: str = ""
    success_threshold: str = ""
    failure_threshold: str = ""
    next_if_works: str = ""
    next_if_fails: str = ""
    status: KnowExperimentStatus = "untested"
    result_notes: str = ""
    created_at: datetime
    updated_at: datetime | None = None


# ===========================================================================
# Lifecycle + Growth Architecture (mirror of lifecycle-growth.ts)
# ===========================================================================

LifecycleStage = Literal[
    "attention", "interest", "trust", "conversion", "activation",
    "retention", "expansion", "advocacy",
]
StakeholderKind = Literal[
    "customer", "referral_partner", "vendor", "developer", "investor",
    "venue", "sponsor", "clinic", "consumer", "buyer", "donor",
    "volunteer", "user", "employee", "contractor",
]
GrowthLoopKind = Literal[
    "referral", "content", "marketplace", "review", "donor", "custom",
]
FirstImpressionTouchpoint = Literal[
    "job_post", "cold_email", "social_post", "landing_page", "website",
    "onboarding_email", "signup_flow", "proposal", "donation_page",
    "vendor_invite", "developer_invite", "dm_reply", "support_response",
]


class LifecycleStageSpec(BaseModel):
    model_config = ConfigDict(extra="forbid")
    stage: LifecycleStage
    audience_mindset: str = ""
    pain_point: str = ""
    message: str = ""
    asset: str = ""
    cta: str = ""
    channel: str = ""
    owner_agent: str = ""
    kpi: str = ""
    friction: str = ""
    follow_up: str = ""
    automation: str = ""
    failure_signal: str = ""


class LifecycleMap(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    business_key: str = Field(min_length=1)
    stakeholder: StakeholderKind
    stages: list[LifecycleStageSpec] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime | None = None


class GrowthLoopStep(BaseModel):
    model_config = ConfigDict(extra="forbid")
    trigger: str = ""
    participant: str = ""
    action: str = ""
    reward_value: str = ""
    metric: str = ""
    friction: str = ""
    automation: str = ""
    failure_point: str = ""


class GrowthLoop(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    business_key: str = Field(min_length=1)
    name: str = Field(min_length=1)
    kind: GrowthLoopKind
    steps: list[GrowthLoopStep] = Field(default_factory=list)
    improvement_plan: str = ""
    created_at: datetime
    updated_at: datetime | None = None


class TrustAssetAudit(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    business_key: str = Field(min_length=1)
    existing_assets: list[str] = Field(default_factory=list)
    missing_assets: list[str] = Field(default_factory=list)
    easiest_to_create: str = ""
    highest_value_proof: str = ""
    trust_blockers: list[str] = Field(default_factory=list)
    reputation_risks: list[str] = Field(default_factory=list)
    next_action: str = ""
    created_at: datetime


class FirstImpressionAudit(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    business_key: str = Field(min_length=1)
    touchpoint: FirstImpressionTouchpoint
    sets_expectations: bool = False
    reduces_anxiety: bool = False
    explains_value: bool = False
    attracts_right: bool = False
    repels_wrong: bool = False
    credible: bool = False
    creates_next_action: bool = False
    matches_brand: bool = False
    score: float = Field(ge=0, le=1)
    recommendations: list[str] = Field(default_factory=list)
    created_at: datetime


class WhiteGloveStage(BaseModel):
    model_config = ConfigDict(extra="forbid")
    stage_name: str = Field(min_length=1)
    objective: str = ""
    pain_addressed: str = ""
    communication: str = ""
    asset: str = ""
    owner: str = ""
    kpi: str = ""
    failure_signal: str = ""
    improvement: str = ""


class WhiteGloveJourney(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    business_key: str = Field(min_length=1)
    stakeholder: StakeholderKind
    stages: list[WhiteGloveStage] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime | None = None


# ===========================================================================
# Market Intelligence (mirror of market-intel.ts)
# ===========================================================================

VocSourceKind = Literal[
    "email", "comment", "dm", "review", "sales_call", "support_ticket",
    "forum", "competitor_review", "social_post", "survey", "interview",
    "lost_deal",
]


class VoiceOfCustomerInsight(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    business_key: str = Field(min_length=1)
    source: VocSourceKind
    pain_points: list[str] = Field(default_factory=list)
    customer_language: list[str] = Field(default_factory=list)
    objections: list[str] = Field(default_factory=list)
    desires: list[str] = Field(default_factory=list)
    trust_barriers: list[str] = Field(default_factory=list)
    feature_requests: list[str] = Field(default_factory=list)
    pricing_friction: list[str] = Field(default_factory=list)
    emotional_triggers: list[str] = Field(default_factory=list)
    competitor_complaints: list[str] = Field(default_factory=list)
    improves: list[str] = Field(default_factory=list)
    created_at: datetime


class MarketGap(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    market: str = Field(min_length=1)
    gap: str = Field(min_length=1)
    why_exists: str = ""
    who_feels_it: str = ""
    opportunity: str = ""
    mvp_solution: str = ""
    revenue_model: str = ""
    speed_to_market_plan: str = ""
    created_at: datetime


class AiVisibilitySignals(BaseModel):
    model_config = ConfigDict(extra="forbid")
    website_clarity: float = Field(ge=0, le=1)
    entity_consistency: float = Field(ge=0, le=1)
    name_consistency: float = Field(ge=0, le=1)
    category_clarity: float = Field(ge=0, le=1)
    schema_markup: float = Field(ge=0, le=1)
    faq_quality: float = Field(ge=0, le=1)
    comparison_content: float = Field(ge=0, le=1)
    authority_content: float = Field(ge=0, le=1)
    citations: float = Field(ge=0, le=1)
    reviews: float = Field(ge=0, le=1)
    social_proof: float = Field(ge=0, le=1)
    press: float = Field(ge=0, le=1)
    gbp: float = Field(ge=0, le=1)
    linkedin: float = Field(ge=0, le=1)
    contact_clarity: float = Field(ge=0, le=1)
    freshness: float = Field(ge=0, le=1)


class AiVisibilityScore(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    business_key: str = Field(min_length=1)
    signals: AiVisibilitySignals
    ai_visibility_score: float = Field(ge=0, le=100)
    search_visibility_score: float = Field(ge=0, le=100)
    reputation_score: float = Field(ge=0, le=100)
    missing_entity_signals: list[str] = Field(default_factory=list)
    missing_authority_signals: list[str] = Field(default_factory=list)
    missing_proof: list[str] = Field(default_factory=list)
    recommended_content: list[str] = Field(default_factory=list)
    recommended_citations: list[str] = Field(default_factory=list)
    created_at: datetime


# ===========================================================================
# Oversight (mirror of oversight.ts)
# ===========================================================================

OversightCadence = Literal["daily", "weekly", "monthly"]
RecursiveLayer = Literal[
    "business", "department", "agent", "campaign", "client_journey",
    "employee_journey", "vendor_journey", "donor_journey",
    "product_flow", "content_funnel",
]


class BlindSpot(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    scope: str = Field(min_length=1)
    blind_spot: str = Field(min_length=1)
    why_matters: str = Field(min_length=1)
    data_needed: str = Field(min_length=1)
    reporting_fix: str = Field(min_length=1)
    owner: str = Field(min_length=1)
    cadence: OversightCadence
    created_at: datetime


class RecursiveDiagnosis(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    layer: RecursiveLayer
    subject: str = Field(min_length=1)
    stakeholder: str = Field(min_length=1)
    objective: str = Field(min_length=1)
    first_impression: str = Field(min_length=1)
    trust_gap: str = Field(min_length=1)
    conversion_action: str = Field(min_length=1)
    support_loop: str = Field(min_length=1)
    kpi: str = Field(min_length=1)
    feedback_loop: str = Field(min_length=1)
    retention_loop: str = Field(min_length=1)
    root_failure_point: str = Field(min_length=1)
    created_at: datetime


class BillionDollarCheck(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    subject: str = Field(min_length=1)
    investor_grade: bool
    client_grade: bool
    legal_grade: bool
    operator_grade: bool
    scales_100x: bool
    protects_brand: bool
    protects_revenue: bool
    protects_trust: bool
    reduces_future_chaos: bool
    passed: bool
    revisions_needed: list[str] = Field(default_factory=list)
    created_at: datetime


# ===========================================================================
# API Approval Gate (mirror of api-approval.ts). Named with an Api* prefix to
# avoid colliding with the security.ts ApprovalRequest mirror above.
# ===========================================================================

ApiApprovalActionClass = Literal[
    "send_message",
    "publish_public",
    "move_money",
    "charge",
    "deploy",
    "delete_data",
    "send_contract",
    "change_pricing",
    "change_access",
    "change_standing_rule",
    "medical_legal_financial_claim",
    "internal_action",
    "other",
]
ApiApprovalRisk = Literal["low", "medium", "high", "critical"]
ApiApprovalRequestStatus = Literal["pending", "approved", "denied", "expired"]


class ApiApprovalRequest(BaseModel):
    """Mirror of ApprovalRequestSchema (api-approval.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    business_id: UUID | None = None
    action_class: ApiApprovalActionClass
    method: str
    route: str
    summary: str
    payload: dict[str, Any] = Field(default_factory=dict)
    risk: ApiApprovalRisk
    requires_approval: bool
    status: ApiApprovalRequestStatus = "pending"
    requested_by: str
    decided_by: str | None = None
    decision_reason: str = ""
    created_at: datetime
    decided_at: datetime | None = None


# ===========================================================================
# Advisory Decision Engine (mirror of decision-record.ts, §35). Named with a
# Decision* prefix; distinct from the Decision/DecisionInput mirrors (decision.ts)
# and the security ApprovalRequest mirror above.
# ===========================================================================

DecisionLens = Literal[
    "capital_allocation",
    "inversion_risk",
    "customer_obsession",
    "offer_acquisition",
    "operations_people",
    "leverage_wealth",
    "principles_truth",
    "message_clarity",
    "attention_distribution",
    "funnels",
    "behavioral_economics",
    "cash_discipline",
    "investor_discipline",
]
DecisionType = Literal[
    "pricing",
    "hire",
    "spend",
    "launch",
    "partnership",
    "capital",
    "pivot",
    "legal",
]
DecisionReversibility = Literal["one_way_door", "two_way_door"]
# Named DecisionRecordStatus (not DecisionStatus) to match the shared barrel, where
# DecisionStatus is already taken by the build-from-brainstorm contract.
DecisionRecordStatus = Literal["open", "approved", "rejected", "deferred"]


class DecisionLensReading(BaseModel):
    """Mirror of DecisionLensReadingSchema (decision-record.ts)."""

    model_config = ConfigDict(extra="forbid")

    lens: DecisionLens
    reading: str
    score: int = Field(ge=0, le=10)
    caution: str = ""


class DecisionRecord(BaseModel):
    """Mirror of DecisionRecordSchema (decision-record.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    business_id: UUID | None = None
    title: str
    summary: str = ""
    decision_type: DecisionType
    risks: list[str] = Field(default_factory=list)
    upside: str = ""
    downside: str = ""
    assumptions: list[str] = Field(default_factory=list)
    reversibility: DecisionReversibility
    required_data: list[str] = Field(default_factory=list)
    lens_analysis: list[DecisionLensReading] = Field(default_factory=list)
    recommendation: str = ""
    approval_required: bool = True
    status: DecisionRecordStatus = "open"
    created_at: datetime
    updated_at: str | None = None
    decided_at: str | None = None


# ---------------------------------------------------------------------------
# Founder Energy + Capacity Layer (§31) — mirror of founder-capacity.ts
# ---------------------------------------------------------------------------

FounderWorkMode = Literal["protect", "normal", "high_capacity", "recovery"]


class FounderCapacitySnapshot(BaseModel):
    """Mirror of FounderCapacitySnapshotSchema (founder-capacity.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    as_of: datetime
    energy: int | None = None
    sleep_hours: float | None = None
    stress: int | None = None
    focus: int | None = None
    meeting_load: int | None = None
    decision_fatigue: int | None = None
    context_switching: int | None = None
    emotional_load: int | None = None
    urgency: int | None = None
    build_intensity: int | None = None
    health_constraints: list[str] = Field(default_factory=list)
    capacity_score: int
    recommended_mode: FounderWorkMode
    do_not_interrupt: bool = False
    created_at: datetime


# ---------------------------------------------------------------------------
# Capital Allocation Engine (Profit-First) (§34) — mirror of capital-allocation.ts
#
# HARD RULE (Constitution / Part I §13): Alfie NEVER moves money. Every allocation is
# recommended=True, approved=False; the transfer is approved + executed by the founder.
# ---------------------------------------------------------------------------

CapitalBucket = Literal[
    "operating",
    "taxes",
    "owner_pay",
    "reserve",
    "growth",
    "tools",
    "contractors",
    "legal",
    "investment",
]

CapitalMode = Literal["profit_first", "growth", "emergency"]


class CapitalAccount(BaseModel):
    """Mirror of CapitalAccountSchema (capital-allocation.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    business_id: UUID
    bucket: CapitalBucket
    target_pct: float = Field(ge=0, le=1)
    balance: float = 0
    created_at: datetime
    updated_at: str | None = None


class CapitalAllocation(BaseModel):
    """Mirror of CapitalAllocationSchema (capital-allocation.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    business_id: UUID
    inflow_usd: float
    split: dict[str, float]
    mode: CapitalMode
    recommended: bool = True
    approved: bool = False
    created_at: datetime


class CapitalRunway(BaseModel):
    """Mirror of CapitalRunwaySchema (capital-allocation.ts)."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    tenant_id: UUID
    business_id: UUID
    as_of: datetime
    cash_usd: float
    monthly_burn_usd: float
    runway_days: int
    min_reserve_usd: float
    mode: CapitalMode
    created_at: datetime



# ---- Revenue Operating System (§33) — RevOps brief + fastest-path-to-cash --------------------
RevOpsFunnelStage = Literal[
    "traffic", "lead", "qualified", "meeting", "proposal", "close",
    "delivery", "upsell", "referral", "case_study", "retention",
]


class RevOpsMoneyAction(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    action: str
    business: str
    expected_revenue_usd: float
    due: str | None = None
    status: str


class RevOpsStalledDeal(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    title: str
    business: str
    days_stalled: int


class RevOpsTopOpportunity(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    title: str
    business: str
    expected_revenue_usd: float
    probability: float
    score: float


class RevOpsBrief(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    business: str | None = None
    as_of: datetime
    pipeline_value_usd: float = 0
    open_opportunities: int = 0
    money_actions_due: list[RevOpsMoneyAction] = Field(default_factory=list)
    stalled_deals: list[RevOpsStalledDeal] = Field(default_factory=list)
    top_opportunities: list[RevOpsTopOpportunity] = Field(default_factory=list)
    created_at: datetime


class FastestPathStep(BaseModel):
    model_config = ConfigDict(extra="forbid")
    opportunity_id: str
    title: str
    business: str
    expected_revenue_usd: float
    probability: float
    speed_to_cash_days: float
    action: str


class FastestPathPlan(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    tenant_id: UUID
    business: str | None = None
    target_usd: float
    steps: list[FastestPathStep] = Field(default_factory=list)
    projected_total_usd: float = 0
    projected_days: float = 0
    created_at: datetime


__all__ = [
    "RevOpsFunnelStage", "RevOpsMoneyAction", "RevOpsStalledDeal", "RevOpsTopOpportunity",
    "RevOpsBrief", "FastestPathStep", "FastestPathPlan",
    "Evidence",
    "Action",
    "SignalToAction",
    "TaskBudget",
    "Task",
    "ModuleManifest",
    "AgentRegistration",
    "MemoryKind",
    "MemoryRelation",
    "MemoryStatus",
    "MemoryRecord",
    "MemoryLink",
    "CreateMemoryInput",
    "MemoryQuery",
    "DecisionCategory",
    "EffortBucket",
    "PriorityLevel",
    "CategoryScore",
    "DecisionInput",
    "Decision",
    "BriefingItem",
    "MeetingPrep",
    "CalendarBlock",
    "EnergyPlan",
    "DashboardSummary",
    "BriefingHorizon",
    "ChiefOfStaffBriefing",
    "ToolSpec",
    "MemoryScope",
    "AgentPermissions",
    "SuccessMetric",
    "DashboardCard",
    "TaskQueueSpec",
    "GeneratedFile",
    "AgentRecommendation",
    "AgentBlueprint",
    "GeneratedAgent",
    "DepartmentKind",
    "DepartmentSpec",
    "BusinessTemplate",
    "BusinessDepartment",
    "Business",
    "CreateBusinessInput",
    "PersonalModuleKind",
    "PersonalEntitySpec",
    "FieldRequest",
    "InfoRequest",
    "KnownEntity",
    "ResolveStatus",
    "ResolveResult",
    "RememberPersonalInput",
    "PreparePack",
    "BehaviorSignal",
    "PatternDirection",
    "BehaviorObservation",
    "Pattern",
    "Bottleneck",
    "AutomationRec",
    "PatternAgentRec",
    "WorkflowRec",
    "Strength",
    "RepeatingMistake",
    "SuccessfulHabit",
    "ScheduleRec",
    "AnalysisWindow",
    "PatternReport",
    "ActionApprovalStatus",
    "ActionOutcome",
    "ActionRiskLevel",
    "AgentActionRecord",
    "LogAgentActionInput",
    "AgentPerformance",
    "RepeatedFailure",
    "ApprovalBottleneck",
    "CostByAgent",
    "RoiByAgent",
    "ObservabilityDashboard",
    "ActionExplanation",
    "SimulationKind",
    "CaseLabel",
    "SimLevel",
    "ScenarioCase",
    "SimRisk",
    "SimulationInput",
    "SimulationResult",
    "PlanTier",
    "TenantStatus",
    "BillingStatus",
    "Role",
    "Permission",
    "KnowledgeVisibility",
    "FounderTenant",
    "BillingAccount",
    "Grant",
    "KnowledgeDoc",
    "InboxItemType",
    "InboxCategory",
    "LinkedEntity",
    "SuggestedTask",
    "InboxDrop",
    "ProcessedInboxItem",
    "TaskType",
    "CostTier",
    "ModelDescriptor",
    "RouteConstraints",
    "ModelScore",
    "RoutingDecision",
    "AuthMethod",
    "ConnectorHealth",
    "ConnectorDescriptor",
    "RepoVerdict",
    "DimensionKind",
    "DimensionEval",
    "FindingSeverity",
    "SecurityCategory",
    "SecurityFinding",
    "FileEntry",
    "RepoScanInput",
    "RoiLevel",
    "BusinessCase",
    "RepoAssessment",
    "AssetLibraryEntry",
    "AssetType",
    "AssetStatus",
    "ApprovalState",
    "AssetVisibility",
    "AssetRelation",
    "AssetRelationship",
    "AssetUsage",
    "Asset",
    "CreateAssetInput",
    "AssetQuery",
    "AssetSearchHit",
    "SensitiveActionClass",
    "ActionEffect",
    "Environment",
    "SecurityDecisionKind",
    "AuditOutcome",
    "ApprovalStatus",
    "SecretKind",
    "SecretStatus",
    "ActionRequest",
    "SecurityDecision",
    "AuditEntry",
    "ApprovalRequest",
    "PermissionGroup",
    "SecretRef",
    "Session",
    "GoalType",
    "GoalStatus",
    "PathKind",
    "Level",
    "ResourceKind",
    "Constraint",
    "Resource",
    "Opportunity",
    "GoalPath",
    "RiskItem",
    "WeeklyPlanItem",
    "GoalAnalysis",
    "GoalPlan",
    "Goal",
    "CreateGoalInput",
    "GoalChange",
    "GrantType",
    "ReviewSchedule",
    "ApprovalLifecycleStatus",
    "ApprovalScope",
    "ApprovalLimits",
    "PersistentApproval",
    "CreatePersistentApprovalInput",
    "CampaignType",
    "CampaignStatus",
    "StopReason",
    "VariantKey",
    "MetricDirection",
    "OptimizationCadence",
    "Variant",
    "CampaignSuccessMetric",
    "VariantResult",
    "CampaignRecommendation",
    "CampaignReport",
    "StopConditions",
    "Campaign",
    "VariantDraft",
    "CreateCampaignInput",
    "VariantObservation",
    "CampaignMetricsInput",
    "AssessSignals",
    "EntityKind",
    "RelationshipKind",
    "OpportunityStatus",
    "EntityRef",
    "OpportunityScore",
    "OpportunityIntel",
    "AnalyzeInput",
    "ScoreWeights",
    "StandardKind",
    "StandardStatus",
    "ComplianceTargetKind",
    "ViolationSeverity",
    "ApprovedStandard",
    "CreateStandardInput",
    "ComplianceTarget",
    "Violation",
    "ComplianceResult",
    "WorkflowMetrics",
    "RoiRecommendation",
    "WorkflowRoiRecord",
    "TrackWorkflowInput",
    "DomainKind",
    "KpiDirection",
    "DomainKpi",
    "DomainWorkflow",
    "DomainEscalationRule",
    "DomainModel",
    "CreateDomainInput",
    "AgentIdentityStatus",
    "AgentActionType",
    "ZeroTrustDecisionKind",
    "AgentCapabilities",
    "AgentIdentity",
    "IssueAgentIdentityInput",
    "AgentAccessRequest",
    "ZeroTrustDecision",
    "FactKind",
    "Freshness",
    "SourceRecord",
    "RecordTruthInput",
    "TowerSeverity",
    "ReviewCadence",
    "TowerCash",
    "TowerPipeline",
    "TowerGoal",
    "TowerCampaign",
    "TowerBlockedDeal",
    "TowerRisk",
    "TowerAgentPerf",
    "TowerApproval",
    "TowerBusinessHealth",
    "TowerOpportunity",
    "TowerWorkflow",
    "TowerReviewItem",
    "ControlTowerSnapshot",
    "ControlTowerCashInput",
    "ControlTowerInput",
    "PlaybookArtifactKind",
    "PlaybookArtifact",
    "Playbook",
    "GeneratePlaybookInput",
    "PortfolioRecommendation",
    "PortfolioMetrics",
    "BusinessAssessment",
    "PortfolioReport",
    "PortfolioBusinessInput",
    "AnalyzePortfolioInput",
    "KnowledgeSourceType",
    "IngestedItem",
    "IngestInput",
    "ActionDisposition",
    "KnowledgeAction",
    "ConvertIdeaInput",
    "ConversionSurface",
    "ConversionTestStatus",
    "VariantKeyConv",
    "CopySnippet",
    "OfferPerf",
    "ConversionTest",
    "ConversionProfile",
    "StartTestInput",
    "TestResultInput",
    "FollowUpEntityKind",
    "FollowUpStatus",
    "FollowUpStopReason",
    "SequenceStep",
    "FollowUp",
    "CreateFollowUpInput",
    "FollowUpSignal",
    "RevenueOffer",
    "PipelineDeal",
    "LeadSource",
    "RevenueCampaignPerf",
    "CashOpportunity",
    "RevenueProfileInput",
    "RevenueIntel",
    "SalesAssetKind",
    "GeneratedSalesAsset",
    "SalesAssetPack",
    "GenerateSalesAssetsInput",
    "QueueBucket",
    "QueueCategory",
    "QueueItem",
    "AddQueueItemInput",
    "DroppedKind",
    "DroppedStatus",
    "BallCandidate",
    "DroppedItem",
    "ScanInput",
    "BusinessAssetKind",
    "AssetChecklist",
    "BuildChecklistInput",
    "MoneyFocus",
    "MoneyDepriority",
    "MoneyClassification",
    "MoneyFirstState",
    "WorkItem",
    "ClassifiedItem",
    "VaultInputKind",
    "VaultDrop",
    "VaultExtraction",
    "VaultEntry",
    "LeadTemperature",
    "FactoryOffer",
    "FactoryContact",
    "FactoryProposal",
    "FactoryFollowUp",
    "RevenueFactoryInput",
    "RevenueFactoryReport",
    "WarRoomSurface",
    "FunnelMetrics",
    "RateCard",
    "WarRoomTest",
    "StartWarRoomTestInput",
    "RecordFunnelInput",
    "DealStage",
    "Deal",
    "CreateDealInput",
    "DealRankBy",
    "RankedDeal",
    "DealDeskView",
    "AgentEvalStage",
    "AgentTestCase",
    "TestRunResult",
    "EvalScores",
    "AgentEvaluation",
    "RegisterAgentEvalInput",
    "RunEvalInput",
    "Plane",
    "ControlConcern",
    "ExecutionConcern",
    "PlaneAssignment",
    "ExecutionRequest",
    "PlaneDecision",
    "CostCategory",
    "CfoRecommendation",
    "CostBreakdown",
    "WorkflowCostInput",
    "WorkflowCostReport",
    "BizDecisionKind",
    "DecisionOption",
    "OptionOutcome",
    "SimulateDecisionInput",
    "BusinessSimulation",
    "CommercializationTier",
    "FeatureClassification",
    "ClassifyFeatureInput",
    "IdeaDispositionKind",
    "IdeaSignals",
    "IdeaDisposition",
    "BusinessNextActions",
    "NextActionsInput",
    "OptimizationPriority",
    "PrincipleId",
    "ConstitutionPrinciple",
    "ConstitutionCheckInput",
    "PrincipleVerdict",
    "ConstitutionVerdict",
    "HierarchyLevel",
    "InheritablePolicy",
    "HierarchyNode",
    "CreateHierarchyNodeInput",
    "ResolvedNode",
    "ReflectionPeriod",
    "ReflectionInput",
    "ReflectionReport",
    "GraphNodeKind",
    "GraphNode",
    "GraphEdge",
    "GraphQuery",
    "GraphNeighborhood",
    "GraphRecommendation",
    "ManualArtifactKind",
    "ManualArtifact",
    "GenerateManualInput",
    "OperatingManual",
    "TwinState",
    "TwinSnapshot",
    "TwinScenarioKind",
    "TwinSimulationInput",
    "TwinSimulationResult",
    "InstitutionalRecordKind",
    "InstitutionalRecord",
    "CaptureRecordInput",
    "MissionControlAlert",
    "MissionControlPriority",
    "MissionControlSnapshot",
    "HealthReading",
    "MissionControlReadingInput",
    "MissionControlReadingSnapshot",
    "ImprovementAction",
    "ImprovementMetrics",
    "EvaluateWorkflowInput",
    "ImprovementRecommendation",
    "WorkflowEvaluation",
    "BuilderStage",
    "BuilderStageOutput",
    "StartBuildInput",
    "VentureBlueprint",
    "BusinessFinanceInput",
    "PersonalFinanceInput",
    "FinanceCommandInput",
    "BusinessFinanceReport",
    "FinanceOverview",
    "TaxStrategyArea",
    "RiskLevel",
    "Complexity",
    "TaxAnalysisInput",
    "TaxRecommendation",
    "TaxAnalysis",
    "EntityStructure",
    "EntityAnalysisInput",
    "EntityOption",
    "EntityAnalysis",
    "WealthItemKind",
    "WealthScope",
    "WealthDrop",
    "WealthItem",
    "MoneyStrategyKind",
    "MoneyStrategy",
    "MoneyGameInput",
    "MoneyGamePlan",
    "AlgorithmId",
    "ScoringPhase",
    "AlgorithmDescriptor",
    "ScoreRequest",
    "AlgorithmScore",
    "IntelClassification",
    "ArticleScores",
    "ArticleInput",
    "IntelligenceItem",
    "BriefingTimelineEntry",
    "LivingBriefing",
    "FailureKind",
    "CaptureFailureInput",
    "FailureCase",
    "TrendHorizon",
    "TrackTrendInput",
    "Trend",
    "WhyThisMattersInput",
    "WhyThisMatters",
    "ContrarianInput",
    "ContrarianView",
    "BriefingKind",
    "BriefingSection",
    "BriefingInput",
    "Briefing",
    "EpisodeStage",
    "EpisodeIdeaInput",
    "EpisodePlan",
    "GuestStatus",
    "BookingDirection",
    "GuestCandidateInput",
    "GuestRecord",
    "GeneratePrInput",
    "PrStrategy",
    "StorySource",
    "StoryChannel",
    "StoryUrgency",
    "MineStoryInput",
    "Story",
    "MediaInputKind",
    "MediaOutputKind",
    "MediaJobStatus",
    "IngestMediaInput",
    "MediaAsset",
    "MediaJob",
    "BrandKey",
    "BrandDna",
    "UpsertBrandInput",
    "ContentPieceKind",
    "ContentPiece",
    "BuildPackageInput",
    "ContentPackage",
    "ProductionAssetKind",
    "ProductionAsset",
    "ProductionPreset",
    "UpsertPresetInput",
    "VisibilitySignals",
    "VisibilityInput",
    "VisibilityReport",
    "PrTrigger",
    "PrOpportunityStatus",
    "DetectPrInput",
    "PrOpportunity",
    "AuthorityAssetKind",
    "AuthorityAsset",
    "AudienceSignalKind",
    "AudienceSignal",
    "AnalyzeAudienceInput",
    "AudienceProfile",
    "FreedomLogInput",
    "FreedomActionKind",
    "FreedomRecommendation",
    "FreedomReport",
    "LegacyItemKind",
    "LegacyForm",
    "CaptureLegacyInput",
    "LegacyItem",
    "ReusableForm",
    "CompoundingMetrics",
    "EvaluateCompoundingInput",
    "AssetLineage",
    "CompoundingEvaluation",
    "MultiplicationTarget",
    "SharedForm",
    "EvaluateMultiplicationInput",
    "MultiplicationEvaluation",
    "LeverageInputs",
    "LeverageTier",
    "ScoreLeverageInput",
    "LeverageScore",
    "LeverageComparison",
    "LawId",
    "ImmutableLaw",
    "LawCheckInput",
    "LawVerdict",
    "LawCompliance",
    "CapitalKind",
    "AllocationHorizon",
    "AllocationCandidate",
    "AllocateInput",
    "AllocationPlan",
    "CostOption",
    "CompareOptionsInput",
    "EvaluatedOption",
    "OpportunityComparison",
    "JournalReviewWindow",
    "RecordDecisionInput",
    "JournaledDecision",
    "ReviewDecisionInput",
    "TimelineEventKind",
    "AddTimelineEventInput",
    "TimelineEvent",
    "ReviewerRole",
    "ProposalSignals",
    "ConveneBoardInput",
    "ReviewerVerdict",
    "BoardReview",
    "OffloadInputKind",
    "ProcessOffloadInput",
    "Understanding",
    "OffloadDisposition",
    "HandledItem",
    "OffloadRecord",
    "PrepCategory",
    "DetectEventInput",
    "Checklist",
    "ScheduledReminder",
    "LogisticsCalendarBlock",
    "LogisticsPlan",
    "FailureType",
    "AnalyzeFailureInput",
    "AntiFragilityCase",
    "Layer",
    "LayerAssignment",
    "ExecFlowRequest",
    "FlowDecision",
    "CouncilRole",
    "CouncilDecisionKind",
    "CouncilSignals",
    "ConveneCouncilInput",
    "CouncilOpinion",
    "CouncilVerdict",
    "OperatorReviewInput",
    "OperatorReview",
    "CapitalDisposition",
    "BoardOptionInput",
    "AllocateBoardInput",
    "BoardOptionVerdict",
    "CapitalBoardDecision",
    "CashPathInput",
    "BuildSprintInput",
    "RankedCashPath",
    "SprintPlan",
    "RevenueStage",
    "TruthDeal",
    "RevenueTruthInput",
    "RevenueTruthReport",
    "TaskOwner",
    "ClassifyTaskInput",
    "DelegationDecision",
    "RiskCategory",
    "RiskRegisterStatus",
    "AddRiskInput",
    "EnterpriseRisk",
    "GenerateBoardPacketInput",
    "PacketSection",
    "BoardPacket",
    "ExitPath",
    "AssessExitInput",
    "ExitAssessment",
    "NervousSystemInput",
    "NervousAction",
    "NervousRecommendation",
    "NervousSystemReport",
    "RelaxBucket",
    "RelaxItemInput",
    "RelaxPlanInput",
    "RelaxItem",
    "RelaxationPlan",
    "ProgressKind",
    "ProgressAction",
    "AssessProgressInput",
    "ProgressAssessment",
    "CapitalType",
    "CapitalDeltas",
    "CapitalReportInput",
    "CapitalReport",
    "Horizon",
    "ProjectConsequencesInput",
    "HorizonImpact",
    "ConsequenceProjection",
    "PyramidLevel",
    "ClassifyPyramidInput",
    "PyramidPlacement",
    "RndDomain",
    "RndDisposition",
    "EvaluateDiscoveryInput",
    "RndDiscovery",
    "InnovationReport",
    "AcquisitionStrategy",
    "StrategySignals",
    "EvaluateAcquisitionInput",
    "StrategyVerdict",
    "AcquisitionEvaluation",
    "FlightDeckSectionKind",
    "FlightDeckCandidate",
    "BuildFlightDeckInput",
    "FlightDeckSection",
    "FlightDeck",
    "FreedomTrend",
    "FreedomIndexInput",
    "FreedomIndexReading",
    "LifeRoiInput",
    "LifeRoiAssessment",
    "FrustrationTrigger",
    "CaptureFrustrationInput",
    "NeverAgainSolution",
    "SelfImprovementFindingKind",
    "SystemComponentInput",
    "EvaluateSystemInput",
    "SelfImprovementFinding",
    "SelfImprovementReport",
    "RhythmCadence",
    "BuildRhythmInput",
    "RhythmOutputs",
    "OperatingRhythmAgenda",
    "ExecManualDomain",
    "ManualSourceInput",
    "AssembleManualInput",
    "ExecManualSection",
    "ExecutiveOperatingManualDoc",
    "LoopStage",
    "PlaceInLoopInput",
    "LoopPlacement",
    "DesignRuleCriterion",
    "EvaluateFeatureInput",
    "DesignRuleVerdict",
    "IdentityAnchorKind",
    "SetAnchorInput",
    "IdentityAnchor",
    "CheckAlignmentInput",
    "IdentityAlignmentVerdict",
    "AddPhilosophyInput",
    "Philosophy",
    "TodaysReminder",
    "ConversationOutputKind",
    "ProcessConversationInput",
    "ConversationOutput",
    "ConversationExtraction",
    "ExploreIdeaInput",
    "VisionArtifact",
    "VisionSession",
    "VoiceCategory",
    "VoiceIntent",
    "InterpretVoiceInput",
    "VoiceCommand",
    # Build Packet
    "BuildPacketStatus",
    "UserStory",
    "BuildTriage",
    "GenerateBuildPacketInput",
    "BuildPacket",
    # Code Execution Handoff
    "GenerateHandoffInput",
    "FilePlanEntry",
    "CodeHandoff",
    # Implementation Review
    "ReviewDimension",
    "ImplementationVerdict",
    "ReviewCheck",
    "ReviewImplementationInput",
    "ImplementationReview",
    # Ship Gate
    "ShipCheckKind",
    "ShipVerdict",
    "ShipCheck",
    "EvaluateShipInput",
    "ShipGateEvaluation",
    # Divini Standard
    "DiviniCriterion",
    "DiviniRecommendation",
    "DiviniCriterionScore",
    "EvaluateDiviniInput",
    "DiviniEvaluation",
    # Conversation-to-Code
    "PipelineStage",
    "StartPipelineInput",
    "PipelineStageStatus",
    "ConversationToCodeRun",
    # Infrastructure Launch
    "InfraProvider",
    "InfraComponentStatus",
    "InfraComponent",
    "EnvVarPlan",
    "ManualStep",
    "PrepareInfrastructureInput",
    "InfrastructurePlan",
    # Press Live
    "PreLaunchCheckKind",
    "PressLiveOutcome",
    "PreLaunchCheck",
    "RunPressLiveInput",
    "PressLiveEvaluation",
    # Human Touch Queue
    "HumanTouchCategory",
    "HumanTouchStatus",
    "QueueHumanTouchInput",
    "HumanTouchItem",
    "HumanTouchSummary",
    # Permission Memory
    "AccessGrantStatus",
    "AccessReuseDecision",
    "RememberAccessInput",
    "AccessGrantMemory",
    "AccessCheckResult",
    # Batch Once
    "SetupPattern",
    "BatchSetupStatus",
    "DetectSetupInput",
    "BatchedSetup",
    # Future Me
    "FutureMeVerdict",
    "FutureSignals",
    "AssessFutureInput",
    "FutureMeAssessment",
    # Optionality
    "OptionalityPath",
    "AssessOptionalityInput",
    "OptionalityVerdict",
    "OptionalityAssessment",
    # Executive Thought Partner
    "ThoughtStance",
    "ConsultThoughtPartnerInput",
    "ThoughtPartnerResponse",
    # Capability Monitor
    "CapabilityPriority",
    "CapabilityImpact",
    "AssessCapabilityInput",
    "CapabilityReport",
    # Tech Stack Evaluator
    "StackCategory",
    "StackDisposition",
    "StackSignals",
    "EvaluateStackInput",
    "StackEvaluation",
    # Build Once, Reuse Everywhere
    "ReuseTarget",
    "ReusePackageKind",
    "AssessReuseInput",
    "ReuseAssessment",
    # Companion Voice Persona
    "PersonaTone",
    "PersonaDuty",
    "ConfigureVoicePersonaInput",
    "VoicePersona",
    # Personal Executive Model
    "PemDimension",
    "PemEvidenceSource",
    "PemTrait",
    "ObservePemInput",
    "PemExplanation",
    "PersonalExecutiveModel",
    # Meeting Prep
    "MeetingTalkingPoint",
    "PrepareMeetingInput",
    "MeetingDossier",
    "CaptureRecapInput",
    "MeetingRecap",
    # Relationship Capital
    "RelationshipPartyKind",
    "RelationshipMoveKind",
    "RelationshipPromise",
    "RelationshipOpportunity",
    "UpsertRelationshipInput",
    "RelationshipCapitalRecord",
    # Venture Studio
    "VentureStudioStage",
    "StageStatus",
    "VentureStageProgress",
    "StartVentureInput",
    "VentureStudioSession",
    # Alyssa Pattern Mirror
    "ThinkingPatternKind",
    "ObserveThinkingInput",
    "ThinkingPatternObservation",
    # Teach My Framework
    "FrameworkArtifactKind",
    "FrameworkArtifact",
    "DetectFrameworkInput",
    "TaughtFramework",
    # Life Dashboard
    "LifeMetric",
    "BuildLifeDashboardInput",
    "LifeDashboard",
    # Supabase Architecture
    "SoftDeleteStrategy",
    "ColumnPlan",
    "TablePlan",
    "PlanArchitectureInput",
    "SupabaseArchitecturePlan",
    # Developer Command Center
    "ActiveBuild",
    "BuildCommandCenterInput",
    "DeveloperCommandCenter",
    # Connections
    "ConnectionScope",
    "ConnectionStatus",
    "ConnectorAuthKind",
    "ConnectorRiskLevel",
    "RegisterConnectorInput",
    "ConnectorDefinition",
    "ConnectInput",
    "Connection",
    "ResolveConnectionInput",
    "ConnectionResolution",
    # Build From Brainstorm
    "BrainstormThread",
    "BrainstormInput",
    "IngestBrainstormInput",
    "DecisionCard",
    "StrategyLayerEntry",
    "StrategyMap",
    "BuildPromptCard",
    "BuildPromptPack",
    "BuildTask",
    "ApprovalSummary",
    "ApproveQueueInput",
    "AgentRunLog",
    "QaCheck",
    "QaResult",
    "BrainstormChangelogEntry",
    # People Operations + Hiring Lifecycle
    "PeopleOpsWorkerKind",
    "RoleNeedTrigger",
    "RoleHandlerKind",
    "RoleLifecycleStage",
    "RoleTimeCommitment",
    "CandidateInterviewStatus",
    "CandidateSource",
    "OnboardingDocStatus",
    "OnboardingDocKind",
    "AccessSystem",
    "PeopleOpsAccessGrantStatus",
    "AccessPermissionLevel",
    "PeopleOpsSeverity",
    "PeopleOpsRating",
    "DelegationTaskStatus",
    "OffboardingStepStatus",
    "OffboardingStepKind",
    "RoleNeed",
    "DetectRoleNeedInput",
    "RoleDesign",
    "DesignRoleInput",
    "HiringStandardEvaluation",
    "JobScreeningQuestion",
    "JobScorecardCriterion",
    "JobPost",
    "Candidate",
    "AddCandidateInput",
    "InterviewScorecardItem",
    "InterviewProcess",
    "OfferProcess",
    "OnboardingDocument",
    "AccessGrant",
    "TrainingPlan",
    "NurtureCheckIn",
    "PerformanceReview",
    "DelegationTask",
    "DelegateTaskInput",
    "OffboardingStep",
    "OffboardingProcess",
    # Department Operating System + AI Employee KPI
    "DeptRiskLevel",
    "DeptReviewCadence",
    "AiEmployeeStatus",
    "KpiOwnerKind",
    "DeptGovernanceViolationKind",
    "Department",
    "AiEmployee",
    "KpiRecord",
    "DeptGovernanceViolation",
    "DeptGovernanceReport",
    # AI Organization / Chain of Command
    "OrgLayer",
    "RoleCardReviewCadence",
    "PermissionScope",
    "RoleCardStatus",
    "DelegationStatus",
    "DelegationPriority",
    "AgentReportExecutionStatus",
    "AgentReportVerificationStatus",
    "EscalationReason",
    "DepartmentReportCadence",
    "AiOrgViolationKind",
    "RoleCard",
    "DelegationPacket",
    "AgentReport",
    "EscalationEvent",
    "AccountabilityRecord",
    "DepartmentReport",
    "AiOrgViolation",
    "AiOrgChainReport",
    # CRO / Revenue Command
    "RevenueOpportunityKind",
    "RevenueEffort",
    "RevenueRisk",
    "RevenueStrategicValue",
    "RevenueRepeatability",
    "RevenueMargin",
    "RevenueOpportunityStatus",
    "MoneyActionStatus",
    "FunnelStage",
    "FunnelHealth",
    "BusinessRevenueKey",
    "BusinessRevenueMissionStatus",
    "OfferReviewVerdict",
    "RevenueOpportunity",
    "RevenueOpportunityInput",
    "RevenueOpportunityFilter",
    "MoneyAction",
    "MoneyActionInput",
    "FunnelStageRecord",
    "FunnelStageRecordInput",
    "RevenueCommandCenter",
    "BusinessRevenueMission",
    "BusinessRevenueMissionInput",
    "OfferReview",
    "OfferReviewInput",
    "RevenueKpiSnapshot",
    # Swarm Lab
    "SwarmRun",
    "StartSwarmRunInput",
    "SwarmCandidate",
    "SwarmCluster",
    "SwarmReport",
    # Business Operating Profile + Context Stack
    "ProfileOffer",
    "BusinessOperatingProfile",
    "ContextStackEntry",
    "ContextStack",
    # Executive Review Cadence + Master Docs
    "ReviewLevel",
    "ReviewMeetingMode",
    "ReviewStatus",
    "ReviewDepartmentReport",
    "ReviewSection",
    "ReviewKpiTable",
    "ApprovalChecklistItem",
    "MasterReviewDoc",
    "ReviewFeedback",
    # Expert Knowledge Council + Framework Library
    "ExpertLensKind",
    "FrameworkTestStatus",
    "ExpertFramework",
    "LensRecommendation",
    "LensApplication",
    "PrincipleConversion",
    "BoardLensView",
    "AdvisoryBoardReview",
    # Org Health / CODO
    "WellnessRecommendation",
    "FailureDiagnosis",
    "CorrectionUpdate",
    "AgentWellnessSnapshot",
    "CommunicationAudit",
    "AgentCorrection",
    "OrgHealthReport",
    "CeoCoachingReport",
    # Incentive Alignment + Referral Ecosystem
    "EcosystemParticipantKind",
    "IncentiveType",
    "IncentiveVerdict",
    "RevSharePayoutStatus",
    "ReferralProgramStatus",
    "IncentiveEvaluation",
    "EvaluateIncentiveInput",
    "ReferralProgram",
    "CreateReferralProgramInput",
    "RevShareRecord",
    "RecordRevShareInput",
    "EcosystemHealthScore",
    "ScoreEcosystemHealthInput",
    "WinWinWinReview",
    "WinWinWinReviewInput",
    # Knowledge Ops
    "KnowledgeSourceKind",
    "SourcePipelineStatus",
    "KnowEffort",
    "KnowMagnitude",
    "CompanyStage",
    "KnowBusinessModel",
    "KnowDiscipline",
    "ScenarioKind",
    "KnowExperimentStatus",
    "KnowledgeSource",
    "OperatorDigestItem",
    "AdaptationFilterResult",
    "KnowledgeTaxonomyEntry",
    "ScenarioOption",
    "KnowledgeScenario",
    "KnowledgeExperiment",
    # Lifecycle + Growth Architecture
    "LifecycleStage",
    "StakeholderKind",
    "GrowthLoopKind",
    "FirstImpressionTouchpoint",
    "LifecycleStageSpec",
    "LifecycleMap",
    "GrowthLoopStep",
    "GrowthLoop",
    "TrustAssetAudit",
    "FirstImpressionAudit",
    "WhiteGloveStage",
    "WhiteGloveJourney",
    # Market Intelligence
    "VocSourceKind",
    "VoiceOfCustomerInsight",
    "MarketGap",
    "AiVisibilitySignals",
    "AiVisibilityScore",
    # Oversight
    "OversightCadence",
    "RecursiveLayer",
    "BlindSpot",
    "RecursiveDiagnosis",
    "BillionDollarCheck",
    # API Approval Gate
    "ApiApprovalActionClass",
    "ApiApprovalRisk",
    "ApiApprovalRequestStatus",
    "ApiApprovalRequest",
    # Founder Energy + Capacity Layer
    "FounderWorkMode",
    "FounderCapacitySnapshot",
    # Advisory Decision Engine
    "DecisionLens",
    "DecisionType",
    "DecisionReversibility",
    "DecisionRecordStatus",
    "DecisionLensReading",
    "DecisionRecord",
    # Capital Allocation Engine (Profit-First)
    "CapitalBucket",
    "CapitalMode",
    "CapitalAccount",
    "CapitalAllocation",
    "CapitalRunway",
]
