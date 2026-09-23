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
