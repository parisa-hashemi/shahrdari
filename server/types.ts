export type Role =
  | 'admin'
  | 'sec'
  | 'analyst'
  | 'consultant'
  | 'steward'
  | 'ruleman'
  | 'modeler'
  | 'reviewer'
  | 'approver'
  | 'exec'
  | 'auditor'
  | 'scientific'; // ROLE_SCIENTIFIC_CONTRIBUTOR

export type ProposalStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'INITIAL_REVIEW'
  | 'NEEDS_INFO'
  | 'ACCEPTED_FOR_ANALYSIS'
  | 'IN_ANALYSIS'
  | 'ANALYSIS_COMPLETED'
  | 'ARCHIVED';

export type ProfessionType =
  | 'دانشجو'
  | 'استاد دانشگاه'
  | 'پژوهشگر'
  | 'مهندس'
  | 'معمار'
  | 'شهرساز'
  | 'متخصص حمل‌ونقل'
  | 'متخصص محیط‌زیست'
  | 'متخصص اقتصادی'
  | 'متخصص اجتماعی/فرهنگی'
  | 'سایر متخصصان'
  | string;

export interface ScientificUser {
  id: string;
  phone: string;
  name: string;
  email?: string;
  role: 'scientific';
  org: string;
  title: string;
  created_at: string;
}

export interface University {
  id: string;
  name: string;
  type: 'university' | 'research_center' | 'scientific_institute' | 'consulting_firm' | 'professional_entity';
  city: string;
  field?: string;
}

export interface ScientificProfile {
  user_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  profession_type: ProfessionType;
  field_of_study: string;
  academic_degree?: 'کارشناسی' | 'کارشناسی ارشد' | 'دکتری' | 'پسادکتری' | 'هیئت علمی' | 'شاغل حرفه‌ای' | string;
  university_id: string;
  university_name: string;
  faculty_group?: string;
  student_id_or_license?: string;
  experience_years?: number;
  specialties: string[];
  is_completed: boolean;
  updated_at: string;
}

export interface ProposalArea {
  city_id: string;
  city_name: string;
  district_id: string; // e.g. 'منطقه ۶'
  neighborhood_id: string; // e.g. 'ناحیه ۲'
  neighborhood_name?: string; // e.g. 'امیرآباد'
  sub_area?: string;
  geometry: {
    type: 'Point' | 'Polygon' | 'MultiPolygon';
    coordinates: any;
    area_m2?: number;
    bounds?: [number, number, number, number];
  };
}

export interface ProposalAttachment {
  id: string;
  proposal_id: string;
  title: string;
  type: 'article' | 'research_report' | 'map' | 'image' | 'pdf' | 'word' | 'excel' | 'data' | 'link';
  url_or_filename: string;
  note?: string;
  size?: string;
  uploaded_at: string;
}

export interface ProposalStatusHistory {
  id: string;
  proposal_id: string;
  from_status: ProposalStatus | null;
  to_status: ProposalStatus;
  actor_id: string;
  actor_name: string;
  actor_role: string;
  timestamp: string;
  note?: string;
}

export interface ProposalReviewRequest {
  id: string;
  proposal_id: string;
  requested_by_id: string;
  requested_by_name: string;
  question: string;
  response?: string;
  created_at: string;
  answered_at?: string;
  is_resolved: boolean;
}

export interface ExpectedImpacts {
  positive: string[];
  negative: string[];
  risks: string[];
  limitations: string[];
  uncertainties: string[];
}

export interface Proposal {
  proposal_id: string; // e.g. 'PR-1405-000124'
  title: string;
  description: string; // Short summary
  proposal_type: string;
  topic: string;
  submitter_id: string;
  submitter_name: string;
  institution_id: string;
  institution_name: string;
  profession_type: string;
  field_of_study: string;
  university_id: string;
  city_id: string;
  district_id: string; // 'منطقه ۱' ... 'منطقه ۲۲'
  neighborhood_id: string; // 'ناحیه ۱' ...
  sub_area?: string;
  geometry: ProposalArea['geometry'];
  problem_statement: string;
  current_state?: string;
  problem_significance?: string;
  affected_groups?: string;
  objective: string;
  expected_outcome?: string;
  full_proposal_description: string;
  scientific_basis: string;
  expected_impacts: ExpectedImpacts;
  attachments: ProposalAttachment[];
  assigned_analyst?: string;
  assigned_analyst_name?: string;
  assigned_analyst_title?: string;
  assigned_analyst_org?: string;
  assigned_analyst_phone?: string;
  assigned_at?: string;
  status: ProposalStatus;
  status_history: ProposalStatusHistory[];
  review_requests: ProposalReviewRequest[];
  scenario_id?: string | null;
  linked_study_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Scenario {
  id: string;
  proposal_id: string;
  name: string;
  study_id: string;
  creator: string;
  creator_role: string;
  created_at: string;
  status: 'draft' | 'frozen' | 'analyzed';
  baseline: string;
  modules: string[];
  kpis: { [key: string]: { b: number | null; s: number | null; unit: string } };
  notes: string;
}

export type StudyCaseStatus = 'DRAFT' | 'BLOCKED' | 'READY_FOR_NEXT_STEP' | 'IN_ANALYSIS' | 'COMPLETED';
export type RequirementStatus = 'MISSING' | 'REQUESTED' | 'IN_REVIEW' | 'SATISFIED' | 'SATISFIED_WITH_LIMITATION' | 'BLOCKED';
export type DataRequestStatus = 'REQUESTED' | 'IN_PROGRESS' | 'FULFILLED' | 'REJECTED' | 'CANCELLED';

export type DatasetVersionStatus =
  | 'DRAFT'
  | 'UPLOADED'
  | 'PROFILING'
  | 'MAPPING'
  | 'VALIDATING'
  | 'NEEDS_CORRECTION'
  | 'QUARANTINED'
  | 'WAITING_REVISION'
  | 'VALIDATED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'READY_FOR_PUBLICATION'
  | 'PUBLISHED'
  | 'SUPERSEDED'
  | 'WITHDRAWN'
  | 'ARCHIVED';

export interface DatasetValidationCheck {
  code: string;
  name: string;
  status: 'PASS' | 'WARNING' | 'FAIL' | 'NOT_APPLICABLE';
  severity: 'INFO' | 'WARNING' | 'BLOCKING';
  bad_records_count: number;
  total_records: number;
  rate_pct: number;
  threshold?: string;
  message: string;
  impact?: string;
  remediation?: string;
}

export interface DatasetValidationIssue {
  id: string;
  dataset_code: string;
  version: number;
  type: string; // 'INVALID_CRS' | 'MISSING_REQUIRED_FIELD' | 'INVALID_GEOMETRY' | 'DUPLICATE_IDENTIFIER' | 'OUT_OF_RANGE' | 'RECORD_COUNT_MISMATCH'
  severity: 'INFO' | 'WARNING' | 'BLOCKING';
  description: string;
  affected_records_count: number;
  status: 'OPEN' | 'IN_CORRECTION' | 'RESOLVED' | 'WAIVED';
  created_at: string;
  resolution?: string;
}

export interface DatasetQualityDimension {
  dimension: 'completeness' | 'accuracy' | 'freshness' | 'coverage' | 'consistency' | 'validity';
  status: 'PASS' | 'PARTIAL' | 'WARNING' | 'FAIL' | 'NOT_ASSESSED';
  evidence: string;
  method: string;
  assessor: string;
  timestamp: string;
}

export interface DatasetFieldMapping {
  source_field: string;
  target_field: string;
  data_type: string;
  required: boolean;
  unit?: string;
  conversion?: string;
  is_identifier?: boolean;
}

export interface DatasetCountReconciliation {
  source_records: number;
  accepted_records: number;
  rejected_records: number;
  quarantined_records: number;
  is_balanced: boolean; // source_records === accepted_records + rejected_records + quarantined_records
}

export interface DatasetVersion {
  id: string; // e.g. 'ROAD-06-v12'
  dataset_code: string;
  version: number;
  status: DatasetVersionStatus;
  reason: string;
  source_metadata: {
    source_type: string; // 'municipal_cadastre' | 'traffic_survey' | 'census' | 'field_sampling' | 'sat_gis'
    source_owner: string;
    source_organization: string;
    source_url_or_system?: string;
    contact_info?: string;
    acquisition_date: string;
    acquisition_method: string;
    license_or_permitted_use: string;
    file_name?: string;
    file_size_bytes?: number;
    mime_type?: string;
    checksum?: string;
    uploader_name?: string;
    uploader_role?: string;
  };
  profile: {
    record_count: number;
    columns: { name: string; type: string; null_count: number; unique_count: number }[];
    sample_rows?: any[];
  };
  spatial: {
    is_spatial: boolean;
    geometry_type?: string; // 'Point' | 'LineString' | 'Polygon' | 'MultiPolygon' | 'Table'
    crs?: string; // e.g. 'EPSG:32639'
    bbox?: [number, number, number, number];
    invalid_geometry_count?: number;
    empty_geometry_count?: number;
    spatial_coverage_pct?: number;
    extent_description?: string;
    region_intersection?: string;
  };
  temporal: {
    start_date?: string;
    end_date?: string;
    reference_year?: string;
    observation_period?: string;
    update_cadence?: string;
    is_stale?: boolean;
    age_days?: number;
  };
  mappings: DatasetFieldMapping[];
  reconciliation: DatasetCountReconciliation;
  validation_checks: DatasetValidationCheck[];
  quality_assessment: DatasetQualityDimension[];
  issues: DatasetValidationIssue[];
  semantic_review: {
    status: 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'REJECTED';
    approved_by?: string;
    approved_at?: string;
    notes?: string;
  };
  publication: {
    published_at?: string;
    published_by?: string;
    publication_checksum?: string;
  };
  quarantine_reason?: string;
  quarantined_at?: string;
  quarantined_by?: string;
  is_immutable: boolean;
  created_at: string;
  updated_at: string;
}

export interface Dataset {
  code: string;
  name: string;
  title: string;
  category: string;
  role: string;
  owner: string;
  organization: string;
  classification: 'unrestricted_internal' | 'restricted_municipal' | 'confidential_planning';
  permitted_use: 'ANALYTICAL' | 'OFFICIAL_DECISION' | 'INTERNAL_ONLY' | 'RESEARCH';
  description: string;
  region: string; // e.g. 'منطقه ۶' | 'شهر تهران'
  current_published_version: number | null;
  status: 'PUBLISHED' | 'CANDIDATE' | 'VALIDATING' | 'NEEDS_CORRECTION' | 'QUARANTINED' | 'SUPERSEDED' | 'ARCHIVED';
  update_cadence: string;
  dependent_studies: string[];
  created_at: string;
  updated_at: string;
}

export interface DatasetAudit {
  id: string;
  actor: string;
  role: string;
  timestamp: string;
  action:
    | 'DATA_REQUEST_VIEWED'
    | 'DATA_REQUEST_STARTED'
    | 'DATASET_CREATED'
    | 'DATASET_UPLOADED'
    | 'DATASET_PROFILED'
    | 'DATASET_MAPPED'
    | 'DATASET_VALIDATED'
    | 'DATASET_QUARANTINED'
    | 'DATASET_CORRECTION_REQUESTED'
    | 'DATASET_APPROVAL_REQUESTED'
    | 'DATASET_APPROVED'
    | 'DATASET_VERSION_PUBLISHED'
    | 'DATASET_VERSION_SUPERSEDED'
    | 'DATA_REQUEST_FULFILLED'
    | 'DATA_REQUEST_REJECTED'
    | 'DATASET_VERSION_COMPARED'
    | 'DATASET_WITHDRAWN'
    | 'DATA_DEPENDENCY_MARKED_STALE';
  entity_type: 'DATASET' | 'DATASET_VERSION' | 'DATA_REQUEST' | 'STUDY_CASE';
  entity_id: string;
  before?: any;
  after?: any;
  reason?: string;
  correlation_id?: string;
}

export interface DatasetDependencyNotice {
  id: string;
  study_id: string;
  study_case_id?: string;
  dataset_code: string;
  pinned_version: number;
  latest_version: number;
  status: 'PINNED_STABLE' | 'STALE_WARNING' | 'WITHDRAWN_BLOCK';
  message: string;
  created_at: string;
}

export interface DataRequirement {
  id: string;
  study_case_id: string;
  name: string;
  category: string;
  reason: string;
  module_code: string;
  scope: string;
  time_period: string;
  required: boolean;
  blocking: boolean;
  satisfied: boolean;
  status: RequirementStatus;
  blocker_reason?: string;
  active_request_id?: string | null;
  attached_dataset?: string | null;
  attached_version?: number | null;
  limitation_note?: string;
}

export interface DataRequest {
  request_id: string;
  study_case_id: string;
  data_requirement_id: string;
  requirement_name: string;
  requested_by: string;
  assigned_to: string;
  reason: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: DataRequestStatus;
  dataset_code?: string;
  dataset_version?: number;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  started_at?: string;
  fulfilled_at?: string;
  note?: string;
}

export interface StudyCase {
  id: string;
  proposal_id: string;
  study_id: string;
  title: string;
  region: string;
  district: string;
  scope: string;
  owner_analyst: string;
  status: StudyCaseStatus;
  workflow_step: number; // 1 to 9
  problem_statement?: string;
  objective?: string;
  blockers_count: number;
  total_requirements: number;
  satisfied_requirements: number;
  baseline: {
    status: 'BLOCKED' | 'READY' | 'COMPLETED';
    pinned_datasets: { [req_id: string]: { dataset_code: string; version: number; approved_at: string } };
  };
  scenario_id?: string | null;
  created_at: string;
  updated_at: string;
}

/* ------------------------------------------------------------
   RULE STEWARD (متولی قاعده / ruleman) DOMAIN TYPES
   ------------------------------------------------------------ */

export type RuleCategory =
  | 'DENSITY'
  | 'SITE_COVERAGE'
  | 'STOREYS'
  | 'HEIGHT'
  | 'SETBACK'
  | 'PARKING'
  | 'LAND_USE'
  | 'ZONING'
  | 'ACCESS'
  | 'OTHER';

export type RuleSeverity = 'BLOCKING' | 'ADVISORY';

export type RuleStatus =
  | 'DRAFT'
  | 'SOURCE_VERIFICATION'
  | 'SCHEMA_VALID'
  | 'TESTING'
  | 'READY_FOR_REVIEW'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'READY_FOR_PUBLICATION'
  | 'PUBLISHED'
  | 'SUPERSEDED'
  | 'WITHDRAWN';

export type SourceVerificationStatus = 'VERIFIED' | 'SOURCE_INCOMPLETE' | 'UNVERIFIED' | 'SYNTHETIC_FIXTURE';

export interface RuleSource {
  document: string;
  version: string;
  issuer: string;
  document_date: string;
  page?: number | string;
  clause?: string;
  effective_from: string;
  effective_to?: string | null;
  source_uri?: string;
  evidence?: string;
  verification_status: SourceVerificationStatus;
}

export type ASTNodeType =
  | 'literal'
  | 'input_reference'
  | 'and'
  | 'or'
  | 'not'
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'greater_than_or_equal'
  | 'less_than'
  | 'less_than_or_equal'
  | 'in'
  | 'not_in'
  | 'add'
  | 'subtract'
  | 'multiply'
  | 'divide'
  | 'conditional'
  | 'within'
  | 'intersects'
  | 'contains'
  | 'distance_to_boundary';

export type DataType =
  | 'number'
  | 'integer'
  | 'boolean'
  | 'string'
  | 'date'
  | 'geometry'
  | 'enum'
  | 'set'
  | 'nullable';

export interface ASTNode {
  type: ASTNodeType;
  data_type: DataType;
  value?: any;
  input_name?: string;
  children?: ASTNode[];
  condition?: ASTNode;
  then_branch?: ASTNode;
  else_branch?: ASTNode;
  params?: { [key: string]: any };
}

export interface RuleInputUnit {
  unit_code: string;
  unit_name: string;
  dimension: 'length' | 'area' | 'count' | 'ratio' | 'none';
}

export interface RuleInput {
  name: string;
  label: string;
  data_type: DataType;
  unit?: string;
  required: boolean;
  description?: string;
  allowed_values?: (string | number)[];
}

export interface RuleException {
  id: string;
  authority: string;
  source: string;
  scope: string;
  effective_from: string;
  effective_to?: string | null;
  condition_description: string;
  condition_ast?: ASTNode;
  evidence?: string;
}

export interface RulePrecedence {
  id: string;
  target_rule_code: string;
  precedes_rule_code: string;
  authority: string;
  source: string;
  effective_from: string;
  effective_to?: string | null;
  rationale: string;
  status: 'APPROVED' | 'PROPOSED' | 'UNRESOLVED';
}

export interface RuleTestCase {
  id: string;
  name: string;
  test_type:
    | 'HAPPY_PATH'
    | 'BOUNDARY'
    | 'LOWER_BOUNDARY'
    | 'UPPER_BOUNDARY'
    | 'NULL_INPUT'
    | 'WRONG_TYPE'
    | 'WRONG_UNIT'
    | 'NOT_APPLICABLE'
    | 'CONFLICT'
    | 'EXCEPTION'
    | 'EFFECTIVE_DATE'
    | 'SPATIAL';
  inputs: { [key: string]: any };
  expected_applicability: 'applicable' | 'not_applicable' | 'unknown';
  expected_outcome: 'pass' | 'fail' | 'unknown' | 'not_applicable';
  expected_reason?: string;
}

export interface RuleTestRun {
  test_case_id: string;
  run_at: string;
  status: 'PASSED' | 'FAILED';
  actual_applicability: 'applicable' | 'not_applicable' | 'unknown';
  actual_outcome: 'pass' | 'fail' | 'unknown' | 'not_applicable';
  actual_reason?: string;
  error_message?: string;
}

export interface RuleVersion {
  version_id: string;
  rule_code: string;
  version_number: number;
  title: string;
  description: string;
  category: RuleCategory;
  jurisdiction: string;
  source: RuleSource;
  inputs: RuleInput[];
  applicability_ast: ASTNode;
  assertion_ast: ASTNode;
  human_readable: string;
  severity: RuleSeverity;
  interpretation_notes?: string;
  exceptions: RuleException[];
  precedences: RulePrecedence[];
  test_cases: RuleTestCase[];
  test_runs: RuleTestRun[];
  status: RuleStatus;
  content_hash: string;
  source_hash: string;
  approval_hash?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  created_by: string;
  effective_from: string;
  effective_to?: string | null;
  is_synthetic: boolean;
  withdrawal_reason?: string;
}

export interface Rule {
  code: string;
  title: string;
  category: RuleCategory;
  jurisdiction: string;
  current_published_version: number | null;
  latest_version: number;
  owner: string;
  created_at: string;
  updated_at: string;
  rule_pack_ids: string[];
  dependent_study_ids: string[];
}

export interface RulePackRule {
  rule_code: string;
  version_number: number;
  version_id: string;
  content_hash: string;
}

export interface RulePackVersion {
  pack_version_id: string;
  pack_id: string;
  version_number: number;
  version_tag: string;
  title: string;
  jurisdiction: string;
  rules: RulePackRule[];
  precedence_policy_id?: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'PUBLISHED' | 'SUPERSEDED' | 'ARCHIVED';
  content_hash: string;
  approved_by?: string;
  approved_at?: string;
  published_by?: string;
  published_at?: string;
  effective_from: string;
  effective_to?: string | null;
  notes?: string;
}

export interface RulePack {
  id: string;
  code: string;
  title: string;
  description: string;
  jurisdiction: string;
  current_published_version: number | null;
  latest_version: number;
  owner: string;
  dependent_study_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface RuleRequirement {
  id: string;
  study_case_id: string;
  rule_code: string;
  name: string;
  category: RuleCategory;
  reason: string;
  module_code: string;
  scope: string;
  required: boolean;
  blocking: boolean;
  satisfied: boolean;
  status: RequirementStatus;
  attached_rule_version?: number | null;
  attached_pack_id?: string | null;
  active_request_id?: string | null;
  blocker_reason?: string;
}

export interface RuleRequest {
  id: string;
  study_case_id: string;
  study_title: string;
  requirement_id: string;
  rule_code: string;
  title: string;
  reason: 'MISSING' | 'OUTDATED' | 'CONFLICTED' | 'UNRESOLVED';
  effective_date: string;
  region: string;
  impact: string;
  requested_by: string;
  assigned_to: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'REQUESTED' | 'IN_PROGRESS' | 'FULFILLED' | 'REJECTED';
  fulfilled_rule_version?: number;
  fulfilled_pack_id?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  started_at?: string;
  fulfilled_at?: string;
  note?: string;
}

export interface RuleAudit {
  id: string;
  actor: string;
  role: string;
  timestamp: string;
  action:
    | 'RULE_CREATED'
    | 'RULE_SOURCE_ADDED'
    | 'RULE_UPDATED'
    | 'RULE_VALIDATED'
    | 'RULE_TESTED'
    | 'RULE_SUBMITTED_FOR_REVIEW'
    | 'RULE_REVIEWED'
    | 'RULE_APPROVED'
    | 'RULE_REJECTED'
    | 'RULE_VERSION_CREATED'
    | 'RULE_CONFLICT_DETECTED'
    | 'RULE_CONFLICT_RESOLVED'
    | 'RULE_PACK_CREATED'
    | 'RULE_PACK_APPROVED'
    | 'RULE_PACK_PUBLISHED'
    | 'RULE_VERSION_SUPERSEDED'
    | 'RULE_WITHDRAWN'
    | 'RULE_REQUEST_CREATED'
    | 'RULE_REQUEST_FULFILLED'
    | 'RULE_IMPACT_ANALYZED';
  entity: 'RULE' | 'RULE_VERSION' | 'RULE_PACK' | 'RULE_PACK_VERSION' | 'RULE_REQUEST' | 'RULE_PRECEDENCE';
  entity_id: string;
  before?: any;
  after?: any;
  reason?: string;
  content_hash?: string;
  correlation_id?: string;
}

export interface RuleEvaluationInput {
  rule_pack_version?: string;
  rule_version?: string;
  context: {
    reference_date?: string;
    region?: string;
    study_id?: string;
    scenario_id?: string;
  };
  inputs: { [key: string]: any };
  units?: { [key: string]: string };
}

export interface RuleEvaluationOutput {
  rule_code: string;
  rule_version: number;
  applicability: 'applicable' | 'not_applicable' | 'unknown';
  outcome: 'pass' | 'fail' | 'unknown' | 'not_applicable';
  conflict_status: 'none' | 'resolved' | 'unresolved';
  input_values: { [key: string]: any };
  missing_inputs: string[];
  unit_checks: { input: string; required_unit?: string; provided_unit?: string; valid: boolean }[];
  explanation: string;
  source_reference: string;
  evaluation_timestamp: string;
}

export interface RuleImpactAssessment {
  rule_code: string;
  from_version: number;
  to_version: number;
  affected_studies: { study_id: string; title: string; region: string }[];
  affected_scenarios: { scenario_id: string; study_id: string; name: string }[];
  affected_rule_packs: { pack_id: string; title: string; current_version: number }[];
  affected_runs: string[];
  structural_diff: {
    source_changed: boolean;
    applicability_changed: boolean;
    assertion_changed: boolean;
    inputs_changed: boolean;
    units_changed: boolean;
    severity_changed: boolean;
    exceptions_changed: boolean;
    precedence_changed: boolean;
    effective_dates_changed: boolean;
    details: string[];
  };
}
