/**
 * Domain types. These mirror the canonical structures of the FSD
 * (A04 data dictionary, B01 result envelope, B02 run state machine,
 * A05 dataset lifecycle, A08 study lifecycle, A12 reviews).
 *
 * Internal identifiers stay English; every user-facing label is resolved
 * through `src/utils/dictionary.ts`.
 */

export type UUID = string;
/** RFC 3339 UTC timestamp */
export type Timestamp = string;
/** YYYY-MM-DD (Gregorian, canonical). Displayed as a Jalali date. */
export type IsoDate = string;

/* ------------------------------------------------------------------ roles */

export type RoleCode =
  | 'SYSTEM_ADMIN'
  | 'SECRETARIAT'
  | 'MUNICIPAL_EXPERT'
  | 'REGIONAL_USER'
  | 'CONSULTANT'
  | 'MODEL_SPECIALIST'
  | 'REVIEWER'
  | 'APPROVING_AUTHORITY'
  | 'AUDITOR'
  | 'EXECUTIVE_OBSERVER';

export type Classification =
  | 'unrestricted_internal'
  | 'restricted_municipal'
  | 'confidential'
  | 'highly_restricted';

export interface User {
  id: UUID;
  displayName: string;
  roles: RoleCode[];
  organization: string;
  regionIds: string[];
  /** Consultant grants are time bound (PRD 3.1) */
  grantValidTo?: IsoDate;
}

/* ------------------------------------------------------- measurement core */

export type MethodClass = 'deterministic' | 'model_based' | 'expert_judgment';

export type MethodSubtype =
  | 'deterministic_calculation'
  | 'rule_evaluation'
  | 'statistical_estimate'
  | 'specialist_model'
  | 'proxy_estimate'
  | 'expert_judgment'
  | 'external_supplied';

/** B01.2 — availability of an analytical result in the authorized projection */
export type Availability =
  | 'computed'
  | 'proxy'
  | 'not_available'
  | 'not_applicable'
  | 'suppressed';

/** B01.2 — reason codes required whenever a persisted value is null */
export type MissingReason =
  | 'MISSING_REQUIRED_INPUT'
  | 'OUTSIDE_MODEL_DOMAIN'
  | 'RULE_CONFLICT'
  | 'UNAPPROVED_METHOD'
  | 'DEPENDENCY_FAILED'
  | 'NOT_SUPPORTED'
  | 'MODEL_UNAVAILABLE'
  | 'ACCESS_RESTRICTED';

export type UncertaintyStatus = 'quantified' | 'qualitative' | 'not_quantified';

export interface Uncertainty {
  status: UncertaintyStatus;
  interpretation?: string;
  range?: { low: number; high: number };
  exclusions?: string[];
}

export interface Provenance {
  methodClass: MethodClass;
  methodSubtype: MethodSubtype;
  methodVersion: string;
  parameterRefs: { symbol: string; value: string; unit?: string; sourceLabel: string }[];
  inputRefs: { label: string; datasetId?: UUID; versionLabel: string }[];
  ruleRefs?: { code: string; title: string; versionLabel: string }[];
  modelRefs?: { modelId: UUID; name: string; versionLabel: string }[];
  evidenceIds?: UUID[];
  humanDecision?: { actor: string; action: string; at: Timestamp };
  generatedAt: Timestamp;
}

/** B01.2 — common result envelope (frontend projection) */
export interface AnalyticalResult {
  id: UUID;
  runId: UUID;
  moduleId: ModuleId;
  metricCode: string;
  /** Persian display label of the metric */
  metricTitle: string;
  value: number | null;
  unitCode: string;
  availability: Availability;
  missingReason?: MissingReason;
  geographicScope: string;
  temporalScope: string;
  coverage?: { describedPct: number; note?: string };
  quality?: 'high' | 'medium' | 'low' | 'unknown';
  uncertainty: Uncertainty;
  provenance: Provenance;
  classification: Classification;
  /** display precision for rounding at the presentation layer only */
  precision?: number;
  /** for KPI comparison: is an increase desirable? */
  desiredDirection?: 'increase' | 'decrease' | 'neutral';
}

/* ------------------------------------------------------------- study side */

export type StudyType = 'comprehensive' | 'detailed' | 'local_area' | 'thematic';

export type StudyStatus =
  | 'draft'
  | 'active'
  | 'in_review'
  | 'changes_requested'
  | 'approved'
  | 'archived';

export type ChapterStatus =
  | 'complete'
  | 'incomplete'
  | 'needs_data'
  | 'needs_review'
  | 'approved'
  | 'external_supplied'
  | 'not_started';

export interface StudyChapter {
  key: string;
  index: number;
  title: string;
  status: ChapterStatus;
  ownerName: string;
  requiredInputs: number;
  boundInputs: number;
  note?: string;
}

export interface Study {
  id: UUID;
  code: string;
  title: string;
  studyType: StudyType;
  status: StudyStatus;
  ownerName: string;
  regionId: string;
  regionTitle: string;
  templateVersionLabel: string;
  boundaryVersionLabel: string;
  referenceDate: IsoDate;
  planningHorizon: string;
  classification: Classification;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  revision: number;
  /** separate progress counters — A08.04 forbids one blended percentage */
  progress: {
    tasksCompleted: number;
    tasksTotal: number;
    dataReadinessPct: number;
    analysisReadinessPct: number;
    acceptedDeliverables: number;
  };
  chapters: StudyChapter[];
  participants: { name: string; role: RoleCode }[];
  blockers: string[];
}

/* ------------------------------------------------------------ dataset side */

export type DatasetVersionStatus =
  | 'draft'
  | 'validating'
  | 'quarantined'
  | 'ready'
  | 'published'
  | 'superseded'
  | 'withdrawn';

export interface QualityFinding {
  code: string;
  category:
    | 'missing_fields'
    | 'invalid_geometry'
    | 'duplicates'
    | 'referential_integrity'
    | 'out_of_range'
    | 'coverage'
    | 'semantic';
  title: string;
  severity: 'blocking' | 'warning' | 'info';
  affectedRows: number;
  detail: string;
}

export interface DatasetVersion {
  id: UUID;
  versionLabel: string;
  status: DatasetVersionStatus;
  rowCount: number;
  publishedAt?: Timestamp;
  sourceDate: IsoDate;
  qualityScore: 'high' | 'medium' | 'low' | 'unknown';
  findings: QualityFinding[];
  quarantineReason?: string;
  contentHash: string;
}

export interface Dataset {
  id: UUID;
  code: string;
  title: string;
  ownerOrg: string;
  stewardName: string;
  sourceType: 'connector' | 'upload' | 'external_report';
  dataKind: 'spatial' | 'tabular' | 'document';
  regionIds: string[];
  spatialCoverage: string;
  temporalCoverage: string;
  permittedUse: string;
  classification: Classification;
  updatedAt: Timestamp;
  currentVersionId: UUID;
  versions: DatasetVersion[];
}

/* --------------------------------------------------------------- rule side */

export type RuleStatus =
  | 'draft'
  | 'in_review'
  | 'approved'
  | 'published'
  | 'retired'
  | 'conflicted';

export interface UrbanRule {
  id: UUID;
  code: string;
  title: string;
  category: 'density' | 'coverage' | 'floors' | 'setback' | 'parking' | 'zoning';
  jurisdiction: string;
  sourceLabel: string;
  sourceLocator: string;
  effectiveFrom: IsoDate;
  effectiveTo?: IsoDate;
  versionLabel: string;
  status: RuleStatus;
  severity: 'blocking' | 'advisory';
  reviewerName?: string;
  approverName?: string;
  requiredInputs: string[];
  assertionSummary: string;
  interpretationNote?: string;
  conflictsWith?: string[];
  isSynthetic: boolean;
}

export type RuleOutcome = 'pass' | 'fail' | 'unknown' | 'not_applicable';

export interface RuleCheck {
  ruleCode: string;
  ruleTitle: string;
  outcome: RuleOutcome;
  conflictStatus?: 'unresolved';
  observed?: { value: number | null; unit: string };
  limit?: { value: number | null; unit: string };
  reason: string;
  sourceLabel: string;
  versionLabel: string;
}

/* ----------------------------------------------------------- scenario side */

export type ScenarioVersionState = 'draft' | 'validated' | 'frozen' | 'superseded';

export type InterpretationLabel =
  | 'observed_existing'
  | 'proposed_unverified'
  | 'proposed_compliant'
  | 'hypothetical_override';

export interface ScenarioOverrides {
  /** m² */
  footprintM2: number;
  floors: number;
  parkingSupplySpaces: number;
  /** allocated analytical capacity, not verified access */
  educationCapacitySeats: number;
  healthCapacityBeds: number;
  greenAreaM2: number;
}

export interface ScenarioAssumptions {
  parcelAreaM2: number;
  netResidentialEfficiency: number;
  meanDwellingAreaM2: number;
  occupancy: number;
  householdSize: number;
}

export interface ScenarioVersion {
  id: UUID;
  versionLabel: string;
  state: ScenarioVersionState;
  interpretation: InterpretationLabel;
  overrides: ScenarioOverrides;
  assumptions: ScenarioAssumptions;
  createdAt: Timestamp;
  frozenAt?: Timestamp;
  inputManifestHash: string;
}

export interface Scenario {
  id: UUID;
  code: string;
  name: string;
  studyId: UUID;
  studyTitle: string;
  regionId: string;
  purpose: string;
  ownerName: string;
  isBaseline: boolean;
  baselineScenarioId?: UUID;
  areaLabel: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  currentVersionId: UUID;
  versions: ScenarioVersion[];
  rulePackVersionLabel: string;
  datasetPins: { label: string; versionLabel: string }[];
}

/* ---------------------------------------------------------------- run side */

export type RunState =
  | 'queued'
  | 'running'
  | 'cancelling'
  | 'succeeded'
  | 'partial'
  | 'failed'
  | 'cancelled'
  | 'timed_out';

export type RunStage =
  | 'queued'
  | 'preparing'
  | 'executing'
  | 'validating'
  | 'completed';

export interface RunNode {
  moduleId: ModuleId;
  state: 'pending' | 'running' | 'succeeded' | 'partial' | 'skipped' | 'blocked' | 'failed';
  reason?: MissingReason;
  message?: string;
}

export interface Run {
  id: UUID;
  code: string;
  scenarioId: UUID;
  scenarioName: string;
  scenarioVersionId: UUID;
  requestedModules: ModuleId[];
  state: RunState;
  stage: RunStage;
  progressPct: number;
  startedAt: Timestamp;
  finishedAt?: Timestamp;
  nodes: RunNode[];
  inputManifestHash: string;
  failureReason?: string;
  suggestedAction?: string;
  retryOf?: UUID;
}

/* ------------------------------------------------------------ module side */

export type ModuleId =
  | 'M01' | 'M02' | 'M03' | 'M04' | 'M05' | 'M06'
  | 'M07' | 'M08' | 'M09' | 'M10' | 'M11' | 'M12';

export interface AnalyticalModule {
  id: ModuleId;
  title: string;
  purpose: string;
  dependsOn: ModuleId[];
  requiresModel: boolean;
  availableInDemo: boolean;
  unavailableReason?: MissingReason;
}

/* ------------------------------------------------------------- model side */

export type ModelStatus =
  | 'available'
  | 'running'
  | 'unvalidated'
  | 'expired'
  | 'unavailable'
  | 'error';

export interface SpecialistModel {
  id: UUID;
  name: string;
  ownerOrg: string;
  purpose: string;
  versionLabel: string;
  methodClass: MethodClass;
  inputs: string[];
  outputs: string[];
  limitations: string[];
  licenseLabel: string;
  validityRange: string;
  validationStatus: 'validated' | 'pending' | 'not_validated';
  status: ModelStatus;
  lastRunAt?: Timestamp;
  linkedModules: ModuleId[];
}

/* ---------------------------------------------------------- evidence side */

export type EvidenceType =
  | 'document'
  | 'dataset_version'
  | 'rule_version'
  | 'model_report'
  | 'map_artifact'
  | 'external_study'
  | 'expert_note';

export interface Evidence {
  id: UUID;
  title: string;
  type: EvidenceType;
  sourceLabel: string;
  versionLabel: string;
  issuedAt: IsoDate;
  scope: string;
  classification: Classification;
  accessible: boolean;
  relation: 'supports' | 'limits' | 'contradicts' | 'describes';
  linkedSubject: { type: string; id: UUID; title: string };
}

/* --------------------------------------------------- review / approval side */

export type ReviewDecision = 'approve' | 'reject' | 'request_changes';

export type ApprovalState =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'changes_requested'
  | 'withdrawn';

export interface ReviewComment {
  id: UUID;
  author: string;
  role: RoleCode;
  at: Timestamp;
  anchor: string;
  text: string;
  requestedAction?: string;
  resolved: boolean;
}

export interface ReviewBundle {
  id: UUID;
  code: string;
  subjectType: 'study' | 'report' | 'dataset_version' | 'rule_pack' | 'scenario';
  subjectId: UUID;
  subjectTitle: string;
  bundleHash: string;
  submittedBy: string;
  submittedAt: Timestamp;
  stepKey: string;
  assignedTo: string;
  assignedRole: RoleCode;
  state: ApprovalState;
  dimension: 'arithmetic_data_quality' | 'scientific_fitness' | 'rule_interpretation' | 'decision_endorsement';
  comments: ReviewComment[];
  immutable: true;
  staleAgainstCurrent: boolean;
  decidedAt?: Timestamp;
  decisionReason?: string;
}

/* --------------------------------------------------- report / decision side */

export type ReportState =
  | 'draft'
  | 'generating'
  | 'ready_for_review'
  | 'approved'
  | 'published'
  | 'retired';

export interface ReportVersion {
  id: UUID;
  code: string;
  title: string;
  studyId: UUID;
  scenarioIds: UUID[];
  state: ReportState;
  versionLabel: string;
  generatedAt?: Timestamp;
  sections: { key: string; title: string; included: boolean; complete: boolean }[];
  incompleteEvidence: boolean;
  missingAnalyses: ModuleId[];
  language: 'fa' | 'en';
  classification: Classification;
}

export interface DecisionPackage {
  id: UUID;
  code: string;
  title: string;
  studyId: UUID;
  studyTitle: string;
  baselineScenarioId: UUID;
  proposedScenarioId: UUID;
  runId: UUID;
  createdAt: Timestamp;
  state: 'draft' | 'in_review' | 'approved' | 'published';
  summary: string;
  keyChanges: string[];
  limitations: string[];
  missingAnalyses: ModuleId[];
  reviewBundleIds: UUID[];
  approvals: { actor: string; role: RoleCode; at: Timestamp; scope: string }[];
  versionLabel: string;
}

/* ----------------------------------------------------------- region side */

export interface Region {
  id: string;
  code: string;
  title: string;
  populationObserved: number | null;
  areaKm2: number;
  boundaryVersionLabel: string;
  packVersionLabel: string;
  packState: 'draft' | 'validating' | 'published' | 'outdated';
  readiness: {
    datasetsRequired: number;
    datasetsPublished: number;
    rulesApproved: number;
    rulesRequired: number;
    modelsBound: number;
    modelsRequired: number;
  };
  activeStudies: number;
}

/* -------------------------------------------------------- notifications */

export type NotificationKind =
  | 'run_completed'
  | 'data_needs_review'
  | 'data_quarantined'
  | 'scenario_ready'
  | 'report_ready'
  | 'changes_requested'
  | 'approval_pending'
  | 'model_unavailable'
  | 'grant_expiring';

export interface AppNotification {
  id: UUID;
  kind: NotificationKind;
  title: string;
  body: string;
  at: Timestamp;
  read: boolean;
  link?: string;
  severity: 'info' | 'warning' | 'error' | 'success';
}

/* --------------------------------------------------------------- audit */

export interface AuditEntry {
  id: UUID;
  actor: string;
  role: RoleCode;
  action: string;
  subjectType: string;
  subjectTitle: string;
  at: Timestamp;
  fromVersion?: string;
  toVersion?: string;
  reason?: string;
  outcome: 'success' | 'rejected';
}

/* ---------------------------------------------------------------- GIS */

export interface MapLayer {
  id: string;
  title: string;
  kind: 'fill' | 'line' | 'point' | 'raster';
  datasetLabel: string;
  versionLabel: string;
  visible: boolean;
  opacity: number;
  legend: { label: string; color: string }[];
  classification: Classification;
  loadState: 'ready' | 'loading' | 'error' | 'unavailable';
}

export interface ParcelFeature {
  id: string;
  externalId: string;
  layerId: string;
  /** simple polygon in a local metric plane, metres, for the mock canvas */
  polygon: [number, number][];
  attributes: {
    zoneCode: string;
    useCode: string;
    parcelAreaM2: number;
    footprintM2: number;
    floors: number;
    gfaM2: number;
    heightM: number | null;
    parkingSpaces: number | null;
    dwellings: number | null;
  };
  datasetLabel: string;
  versionLabel: string;
  sourceLabel: string;
  temporalCoverage: string;
  qualityStatus: 'high' | 'medium' | 'low' | 'unknown';
  evidenceIds: UUID[];
}

/* ------------------------------------------------------------- copilot */

export interface CopilotCitation {
  label: string;
  sourceType: 'dataset' | 'rule' | 'result' | 'document' | 'model';
  versionLabel: string;
  accessible: boolean;
  href?: string;
}

export interface CopilotMessage {
  id: UUID;
  role: 'user' | 'assistant';
  text: string;
  at: Timestamp;
  citations?: CopilotCitation[];
  /** a proposed mutation always requires explicit confirmation (B16.3) */
  proposedAction?: {
    key: string;
    title: string;
    preview: string[];
    permitted: boolean;
    permissionNote?: string;
  };
  limitationNote?: string;
  pending?: boolean;
}
