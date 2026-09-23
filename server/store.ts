import fs from 'fs';
import path from 'path';
import {
  Proposal,
  ProposalStatusHistory,
  ProposalReviewRequest,
  ScientificProfile,
  ScientificUser,
  University,
  Scenario,
  StudyCase,
  DataRequirement,
  DataRequest,
  Dataset,
  DatasetVersion,
  DatasetAudit,
  DatasetDependencyNotice,
  DatasetValidationCheck,
  DatasetValidationIssue,
  DatasetFieldMapping,
  DatasetQualityDimension,
  DatasetVersionStatus,
  Rule,
  RuleVersion,
  RulePack,
  RulePackVersion,
  RulePrecedence,
  RuleRequest,
  RuleAudit,
  RuleRequirement,
  RuleEvaluationInput,
  RuleEvaluationOutput,
  RuleImpactAssessment,
} from './types.ts';
import {
  SEED_DATASETS,
  SEED_DATASET_VERSIONS,
  SEED_DATASET_AUDITS,
  SEED_DATASET_DEPENDENCIES,
  executeDatasetValidation,
} from './datasetData.ts';
import {
  SEED_RULES,
  SEED_RULE_VERSIONS,
  SEED_RULE_PACKS,
  SEED_RULE_PACK_VERSIONS,
  SEED_RULE_PRECEDENCES,
  SEED_RULE_REQUESTS,
  SEED_RULE_REQUIREMENTS,
  SEED_RULE_AUDITS,
} from './ruleData.ts';
import {
  computeRuleContentHash,
  computeSourceHash,
  validateAST,
  renderASTToPersian,
  evaluateRuleVersion,
  runAllRuleTests,
  runRuleTestCase,
  evaluateRuleSetConflict,
} from './ruleEngine.ts';

const DB_FILE = path.join(process.cwd(), 'server', 'data', 'tuip_db.json');

export interface DBData {
  scientificUsers: ScientificUser[];
  profiles: { [userId: string]: ScientificProfile };
  universities: University[];
  proposals: Proposal[];
  scenarios: Scenario[];
  studyCases: StudyCase[];
  dataRequirements: DataRequirement[];
  dataRequests: DataRequest[];
  datasets: Dataset[];
  datasetVersions: DatasetVersion[];
  datasetAudits: DatasetAudit[];
  datasetDependencies: DatasetDependencyNotice[];
  rules: Rule[];
  ruleVersions: RuleVersion[];
  rulePacks: RulePack[];
  rulePackVersions: RulePackVersion[];
  rulePrecedences: RulePrecedence[];
  ruleRequests: RuleRequest[];
  ruleRequirements: RuleRequirement[];
  ruleAudits: RuleAudit[];
  otpCodes: { [phone: string]: { code: string; expiresAt: number } };
  seq: { proposal: number; scenario: number; studyCase: number; dataRequest: number; ruleRequest: number; rule: number };
}

const SEED_UNIVERSITIES: University[] = [
  { id: 'UT', name: 'دانشگاه تهران', type: 'university', city: 'تهران', field: 'شهرسازی، معماری، عمران، علوم اجتماعی' },
  { id: 'SUT', name: 'دانشگاه صنعتی شریف', type: 'university', city: 'تهران', field: 'مهندسی عمران، حمل‌ونقل، کامپیوتر و هوش مصنوعی' },
  { id: 'SBU', name: 'دانشگاه شهید بهشتی', type: 'university', city: 'تهران', field: 'معماری و شهرسازی، محیط‌زیست، اقتصاد' },
  { id: 'IUST', name: 'دانشگاه علم و صنعت ایران', type: 'university', city: 'تهران', field: 'معماری و شهرسازی، مهندسی راه‌آهن و حمل‌ونقل' },
  { id: 'TMU', name: 'دانشگاه تربیت مدرس', type: 'university', city: 'تهران', field: 'برنامه‌ریزی شهری و منطقه‌ای، جغرافیا، مدیریت' },
  { id: 'AUT', name: 'دانشگاه صنعتی امیرکبیر', type: 'university', city: 'تهران', field: 'عمران، محیط‌زیست، ژئوماتیک و GIS' },
  { id: 'KNTU', name: 'دانشگاه صنعتی خواجه نصیرالدین طوسی', type: 'university', city: 'تهران', field: 'مهندسی نقشه‌برداری، ژئودزی و GIS' },
  { id: 'ATU', name: 'دانشگاه علامه طباطبائی', type: 'university', city: 'تهران', field: 'جامعه‌شناسی، مطالعات فرهنگی، اقتصاد و رفاه اجتماعی' },
  { id: 'AUI', name: 'دانشگاه هنر تهران', type: 'university', city: 'تهران', field: 'طراحی شهری، معماری، مرمت بافت‌های تاریخی' },
  { id: 'IAU-SRB', name: 'دانشگاه آزاد اسلامی — واحد علوم و تحقیقات', type: 'university', city: 'تهران', field: 'شهرسازی، عمران، محیط‌زیست' },
  { id: 'TUSRC', name: 'مرکز مطالعات و برنامه‌ریزی شهر تهران', type: 'research_center', city: 'تهران', field: 'پژوهش‌های راهبردی و کاربردی مدیریت شهری' },
  { id: 'ESRI', name: 'پژوهشکده علوم محیطی دانشگاه شهید بهشتی', type: 'research_center', city: 'تهران', field: 'توسعه پایدار، تاب‌آوری اکولوژیک شهری' },
  { id: 'NDRI', name: 'پژوهشکده سوانح طبیعی', type: 'research_center', city: 'تهران', field: 'مخاطرات طبیعی، تاب‌آوری لرزه‌ای و فرونشست' },
  { id: 'MC-SHAR', name: 'مهندسان مشاور شارستان', type: 'consulting_firm', city: 'تهران', field: 'طرح‌های جامع و تفصیلی، مطالعات شهری' },
  { id: 'MC-BAFT', name: 'مهندسان مشاور بافت شهر', type: 'consulting_firm', city: 'تهران', field: 'بازآفرینی شهری، بازنگری طرح‌های تفصیلی' },
  { id: 'ISUP', name: 'انجمن علمی برنامه‌ریزی شهری ایران', type: 'professional_entity', city: 'تهران', field: 'سیاست‌گذاری شهری و آمایش مسکن' },
];

export const TEHRAN_AREAS = Array.from({ length: 22 }, (_, i) => {
  const regNum = i + 1;
  const regName = `منطقه ${regNum}`;
  const districtsCount = regNum === 4 || regNum === 5 ? 4 : regNum === 6 ? 3 : regNum === 1 ? 4 : 3;
  const districts = Array.from({ length: districtsCount }, (_, d) => {
    const distNum = d + 1;
    const distName = `ناحیه ${distNum}`;
    const neighborhoodsByReg: { [r: number]: string[][] } = {
      1: [['تجریش', 'زعفرانیه', 'محمودیه'], ['الهیه', 'باغ فردوس'], ['نیاوران', 'جماران', 'منظریه'], ['کامرانیه', 'فرمانیه', 'چیذر']],
      2: [['سعادت‌آباد', 'کوی فراز'], ['شهرک غرب', 'ایوانک'], ['طرشت', 'حبیب‌الله'], ['ستارخان', 'تهران ویلا', 'دریا دل']],
      3: [['قلهک', 'دروس', 'اختیاریه'], ['ونک', 'ملاصدرا', 'شیخ بهایی'], ['میرداماد', 'ظفر', 'جردن']],
      4: [['تهرانپارس غربی', 'قنات کوثر'], ['نارمک شمالی', 'کوهسار'], ['هنگام', 'شمیران نو', 'دلاوران']],
      5: [['صادقیه', 'پونک جنوبی', 'اشرفی اصفهانی'], ['پونک شمالی', 'باغ فیض'], ['جنت‌آباد جنوبی و مرکزی'], ['شهرک اکباتان', 'کوی بیمه', 'ارم']],
      6: [['امیرآباد (کارگر شمالی)', 'کردستان', 'جهان‌آرا'], ['میدان ولیعصر', 'بلوار کشاورز', 'فلسطین'], ['یوسف‌آباد', 'پارک ساعی', 'توانیر']],
      8: [['نارمک جنوبی', 'هفت‌حوض'], ['مدائن', 'دردشت'], ['تهرانپارس غربی', 'تسلیحات']],
      12: [['بازار بزرگ تهران', 'پامنار'], ['بهارستان', 'ایران'], ['سنگلج', 'فردوسی', 'لاله‌زار']],
      22: [['دریاچه شهدای خلیج فارس', 'چیتگر'], ['دهکده المپیک', 'زیبادشت'], ['شهرک گلستان (راه‌آهن)', 'هوانیروز']],
    };
    const defaultHoods = [`محله ۱ ${distName}`, `محله ۲ ${distName}`, `محله ۳ ${distName}`];
    const neighborhoods = (neighborhoodsByReg[regNum] && neighborhoodsByReg[regNum][d]) || defaultHoods;

    return {
      district_id: distName,
      neighborhoods,
      center: [35.6892 + (regNum - 11) * 0.018, 51.389 + (regNum % 5 - 2) * 0.025],
    };
  });

  return {
    region_id: regName,
    region_number: regNum,
    districts,
  };
});

const SEED_PROPOSALS: Proposal[] = [
  {
    proposal_id: 'PR-1405-000124',
    title: 'بازتنظیم خطوط تغذیه‌کننده و توسعه آرام‌سازی ترافیک پیرامون دانشگاه تهران',
    description: 'پیشنهاد ایجاد زون آرام‌سازی سرعت، اولویت‌بخشی به حمل‌ونقل عمومی و شبکه پیاده‌راهی متصل به پردیس مرکزی دانشگاه تهران در محور کارگر و انقلاب.',
    proposal_type: 'حمل‌ونقل',
    topic: 'حمل‌ونقل',
    submitter_id: 'دکتر فریبرز سمیعی',
    submitter_name: 'دکتر فریبرز سمیعی',
    institution_id: 'UT',
    institution_name: 'دانشگاه تهران',
    profession_type: 'استاد دانشگاه',
    field_of_study: 'برنامه‌ریزی حمل‌ونقل و شهرسازی',
    university_id: 'UT',
    city_id: 'tehran',
    district_id: 'منطقه ۶',
    neighborhood_id: 'ناحیه ۲',
    sub_area: 'محور خیابان انقلاب — حدفاصل کارگر تا قدس و ۱۶ آذر',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [51.3912, 35.7015],
        [51.3995, 35.7018],
        [51.3992, 35.6980],
        [51.3908, 35.6978],
        [51.3912, 35.7015],
      ],
      area_m2: 384000,
      bounds: [51.3908, 35.6978, 51.3995, 35.7018],
    },
    problem_statement: 'ازدحام ترافیک عبوری سنگین در محدوده فرهنگی-دانشگاهی انقلاب و کارگر موجب تداخل خطرناک پیاده و سواره و آلودگی صوتی بالای ۶۸ دسی‌بل شده است.',
    current_state: 'سرعت متوسط خودروها زیر ۱۲ کیلومتر بر ساعت است و عابران پیاده (دانشجویان و شهروندان) ناچار به تردد در پیاده‌روهای متراکم و ناایمن هستند.',
    problem_significance: 'روزانه بیش از ۴۵٬۰۰۰ تردد پیاده در این تقاطع‌ها انجام می‌شود و خطر حوادث ترافیکی بالاست.',
    affected_groups: 'دانشجویان، اعضای هیئت علمی، کسبه راسته کتاب، ساکنان محله دانشگاه و مسافران خطوط مترو و اتوبوس تندرو.',
    objective: 'کاهش ۳۰ درصدی ترافیک عبوری سواره، افزایش سهم سفرهای پیاده و دوچرخه و اتصال ایمن پردیس به ایستگاه‌های مترو تئاتر شهر و میدان انقلاب.',
    expected_outcome: 'کاهش آلودگی صوتی و بهبود ایمنی پیاده بدون انسداد کامل شریان‌های اصلی شهر.',
    full_proposal_description: 'اجرای طرح سوپربلاک دانشگاهی (Superblock) با محدودسازی ورود خودروهای گذری، تغییر زمان‌بندی چراغ‌های راهنمایی به نفع پیاده، احداث مسیر دوچرخه اختصاصی در خیابان ۱۶ آذر و طالقانی غربی و تقویت ون‌های برقی تغذیه‌کننده ایستگاه میدان انقلاب.',
    scientific_basis: 'مبتنی بر نتایج مدل‌سازی تقاضای سفر پژوهشکده حمل‌ونقل دانشگاه تهران (پروژه شماره ۱۴۰۳-۰۸) و مقاله بررسی الگوی Superblock بارسلونا در مجله برنامه‌ریزی شهری (۱۴۰۴).',
    expected_impacts: {
      positive: ['کاهش ۳۰ درصدی بار آلاینده‌های NO2 و ذرات معلق', 'ارتقای ایمنی بیش از ۴۵ هزار دانشجوی روزانه', 'رونق راسته فرهنگی کتاب و فضاهای عمومی'],
      negative: ['افزایش ۸ درصدی زمان سفر خودروهای عبوری در رینگ پیرامونی (بلوار کشاورز و جمهوری)'],
      risks: ['مقاومت اولیه برخی رانندگان عبوری در ۲ ماه نخست اجرای آزمایشی'],
      limitations: ['وابستگی به همکاری پلیس راهور در کنترل مبادی ورود'],
      uncertainties: ['رفتار تغییر مسیر رانندگان در ساعات اوج عصر'],
    },
    attachments: [
      {
        id: 'ATT-101',
        proposal_id: 'PR-1405-000124',
        title: 'گزارش ارزیابی ترافیکی پیاده‌راه‌سازی ۱۶ آذر (PDF)',
        type: 'research_report',
        url_or_filename: 'report_traffic_16azar_1404.pdf',
        size: '4.8 MB',
        uploaded_at: '۱۴۰۵/۰۶/۱۸',
      },
      {
        id: 'ATT-102',
        proposal_id: 'PR-1405-000124',
        title: 'نقشه محدوده سوپربلاک و دسترسی‌های جایگزین (SHP/GeoJSON)',
        type: 'map',
        url_or_filename: 'superblock_campus_boundary.geojson',
        size: '820 KB',
        uploaded_at: '۱۴۰۵/۰۶/۱۸',
      },
    ],
    status: 'ACCEPTED_FOR_ANALYSIS',
    status_history: [
      {
        id: 'SH-001',
        proposal_id: 'PR-1405-000124',
        from_status: null,
        to_status: 'SUBMITTED',
        actor_id: 'دکتر فریبرز سمیعی',
        actor_name: 'دکتر فریبرز سمیعی',
        actor_role: 'نهاد علمی (دانشگاه تهران)',
        timestamp: '۱۴۰۵/۰۶/۱۸، ۱۰:۱۵',
        note: 'ثبت اولیه پیشنهاد همراه با پیوست‌های مدل‌سازی ترافیکی',
      },
      {
        id: 'SH-002',
        proposal_id: 'PR-1405-000124',
        from_status: 'SUBMITTED',
        to_status: 'INITIAL_REVIEW',
        actor_id: 'مهندس زهرا کاظمی',
        actor_name: 'مهندس زهرا کاظمی',
        actor_role: 'کارشناس/تحلیلگر شهری',
        timestamp: '۱۴۰۵/۰۶/۱۹، ۱۴:۲۰',
        note: 'بررسی مدارک ارسالی و تطابق با محدوده منطقه ۶ و مطالعه ST-1405-014',
      },
      {
        id: 'SH-003',
        proposal_id: 'PR-1405-000124',
        from_status: 'INITIAL_REVIEW',
        to_status: 'ACCEPTED_FOR_ANALYSIS',
        actor_id: 'مهندس زهرا کاظمی',
        actor_name: 'مهندس زهرا کاظمی',
        actor_role: 'کارشناس/تحلیلگر شهری',
        timestamp: '۱۴۰۵/۰۶/۲۱، ۱۱:۳۰',
        note: 'پذیرش جهت ایجاد سناریو و آزمون در ماژول‌های تحلیل M04 (تولید سفر) و M07 (شبکه دسترسی)',
      },
    ],
    review_requests: [],
    scenario_id: 'SC-1405-PROP-124',
    linked_study_id: 'ST-1405-014',
    created_at: '۱۴۰۵/۰۶/۱۸',
    updated_at: '۱۴۰۵/۰۶/۲۱',
  },
  {
    proposal_id: 'PR-1405-000125',
    title: 'توسعه پارک‌های جاذب باران و زیرساخت سبز تاب‌آور در محله پونک',
    description: 'استفاده از حوزه‌های آبگیر سطحی، باغ‌بام و آسفالت نفوذپذیر در معابر شیب‌دار شمال منطقه ۵ برای کاهش خطر رواناب و فرونشست.',
    proposal_type: 'محیط‌زیست',
    topic: 'محیط‌زیست',
    submitter_id: 'مهندس پروانه شمس',
    submitter_name: 'مهندس پروانه شمس',
    institution_id: 'SBU',
    institution_name: 'دانشگاه شهید بهشتی',
    profession_type: 'پژوهشگر',
    field_of_study: 'محیط‌زیست و هیدرولوژی شهری',
    university_id: 'SBU',
    city_id: 'tehran',
    district_id: 'منطقه ۵',
    neighborhood_id: 'ناحیه ۲',
    sub_area: 'محله پونک شمالی — شیب‌راه بوستان نهج‌البلاغه',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [51.3412, 35.762],
        [51.352, 35.764],
        [51.351, 35.755],
        [51.339, 35.753],
        [51.3412, 35.762],
      ],
      area_m2: 240000,
    },
    problem_statement: 'رواناب‌های ناشی از بارش‌های رگباری به سرعت وارد معابر شیب‌دار پونک شده و موجب فرسایش بستر و آبگرفتگی زیرگذر اشرفی اصفهانی می‌شود.',
    current_state: 'بیش از ۸۲٪ سطح منطقه نفوذناپذیر است و آب باران مستقیماً بدون تغذیه سفره هدر می‌رود.',
    problem_significance: 'خطر آبگرفتگی فصلی و تشدید فرونشست دشت تهران در افق ده‌ساله.',
    affected_groups: 'ساکنان خیابان میرزابابایی، رانندگان بزرگراه همت و پارک نهج‌البلاغه.',
    objective: 'جذب ۴۰ درصدی رواناب باران در محل و تغذیه سفره‌های کم‌عمق زیرسطحی.',
    full_proposal_description: 'احداث ۱۰ سلول زیست‌پالایی (Rain Garden) در فضاهای باز غیرمفید و لچکی‌ها و الزام نفوذپذیری کف‌سازی در مجتمع‌های نوساز.',
    scientific_basis: 'مطالعه مدل‌سازی بارش-رواناب SWMM توسط پژوهشکده علوم محیطی شهید بهشتی (۱۴۰۴).',
    expected_impacts: {
      positive: ['کاهش ۴۰ درصدی دبی اوج سیلاب محلی', 'تغذیه آبخوان و کاهش جزیره حرارتی شهری'],
      negative: ['نیاز به لایروبی فصلی فیلترهای شنی'],
      risks: ['گرفتگی لایه‌های تصفیه در بارش‌های همراه با گل‌ولای'],
      limitations: ['محدودیت عمق خاک در بخش‌های دارای سازه‌های زیرزمینی'],
      uncertainties: ['شدت بارش‌های حدی بیش از دوره بازگشت ۲۵ ساله'],
    },
    attachments: [],
    status: 'NEEDS_INFO',
    status_history: [
      {
        id: 'SH-010',
        proposal_id: 'PR-1405-000125',
        from_status: null,
        to_status: 'SUBMITTED',
        actor_id: 'مهندس پروانه شمس',
        actor_name: 'مهندس پروانه شمس',
        actor_role: 'نهاد علمی (پژوهشگر شهید بهشتی)',
        timestamp: '۱۴۰۵/۰۶/۱۹، ۱۶:۰۰',
        note: 'ثبت اولیه پیشنهاد محیط‌زیستی',
      },
      {
        id: 'SH-011',
        proposal_id: 'PR-1405-000125',
        from_status: 'SUBMITTED',
        to_status: 'NEEDS_INFO',
        actor_id: 'مهندس زهرا کاظمی',
        actor_name: 'مهندس زهرا کاظمی',
        actor_role: 'کارشناس/تحلیلگر شهری',
        timestamp: '۱۴۰۵/۰۶/۲۲، ۰۹:۱۵',
        note: 'درخواست مشخص کردن برآورد هزینه‌ای و سازوکار نگهداری سلول‌های جذبی در فصل پاییز',
      },
    ],
    review_requests: [
      {
        id: 'RR-001',
        proposal_id: 'PR-1405-000125',
        requested_by_id: 'مهندس زهرا کاظمی',
        requested_by_name: 'مهندس زهرا کاظمی (کارشناس ارشد تحلیل)',
        question: 'لطفاً مشخص فرمایید آیا در این پیشنهاد هزینه لایروبی رسوبات و مسئول نگهداری سلول‌های فیلتر با خدمات شهری منطقه هماهنگ شده است یا نیاز به پیمانکار تخصصی دارد؟ همچنین تأثیر احتمالی بر فونداسیون ابنیه مجاور با شیب تند بررسی شده است؟',
        created_at: '۱۴۰۵/۰۶/۲۲، ۰۹:۱۵',
        is_resolved: false,
      },
    ],
    created_at: '۱۴۰۵/۰۶/۱۹',
    updated_at: '۱۴۰۵/۰۶/۲۲',
  },
];

const SEED_SCENARIOS: Scenario[] = [
  {
    id: 'SC-1405-PROP-124',
    proposal_id: 'PR-1405-000124',
    name: 'سناریوی ارزیابی سوپربلاک دانشگاهی انقلاب (برگرفته از پیشنهاد علمی PR-1405-000124)',
    study_id: 'ST-1405-014',
    creator: 'مهندس زهرا کاظمی',
    creator_role: 'analyst',
    created_at: '۱۴۰۵/۰۶/۲۱، ۱۱:۳۰',
    status: 'analyzed',
    baseline: 'وضع موجود فصل صفر مطالعه ST-1405-014 (نسخه پین‌شده شهریور ۱۴۰۵)',
    modules: ['M01', 'M04', 'M07', 'M10', 'M11', 'M12'],
    kpis: {
      ptrip: { b: 63000, s: 78500, unit: 'سفر پیاده روزانه' },
      vtrip: { b: 37800, s: 26400, unit: 'سفر خودرو در روز' },
      co2: { b: 27720, s: 19800, unit: 'کیلوگرم CO₂e روزانه' },
      access: { b: 65, s: 88, unit: 'درصد پوشش دسترسی ایمن' },
    },
    notes: 'تولیدشده به صورت خودکار بر پایه مرجع پیشنهاد نهاد علمی PR-1405-000124 دانشگاه تهران',
  },
];

const SEED_STUDY_CASES: StudyCase[] = [
  {
    id: 'CASE-1405-00045',
    proposal_id: 'PR-1405-000124',
    study_id: 'ST-1405-014',
    title: 'پرونده تحلیلی: بهسازی شبکه معابر و زون پیاده دانشگاه تهران',
    region: 'منطقه ۶',
    district: 'ناحیه ۲',
    scope: 'ناحیه ۲ — محلات ۳ و ۴ (پیرامون دانشگاه تهران)',
    owner_analyst: 'مهندس زهرا کاظمی',
    status: 'BLOCKED',
    workflow_step: 3, // 1: پیشنهاد, 2: تعریف مطالعه, 3: نیازمندی داده, 4: وضع موجود, 5: سناریو, 6: تحلیل, 7: مقایسه, 8: گزارش, 9: بررسی نهایی
    problem_statement: 'عدم تناسب ظرفیت شریان با بار سفر و تقاضای عبوری و تداخل شدید سواره و پیاده',
    objective: 'آرام‌سازی سرعت، توسعه مسیرهای امن پیاده و بهبود خدمات اتوبوس برقی',
    blockers_count: 2,
    total_requirements: 3,
    satisfied_requirements: 1,
    baseline: {
      status: 'BLOCKED',
      pinned_datasets: {
        'REQ-1405-03': { dataset_code: 'PARCEL-06', version: 3, approved_at: '۱۴۰۵/۰۶/۲۰' }
      }
    },
    scenario_id: null,
    created_at: '۱۴۰۵/۰۶/۲۲',
    updated_at: '۱۴۰۵/۰۶/۲۳'
  },
  {
    id: 'CASE-1405-00046',
    proposal_id: 'PR-1405-000125',
    study_id: 'ST-1405-014',
    title: 'پرونده تحلیلی: احداث پارکینگ هوشمند مکانیزه و بارانداز کالا بلوار کشاورز',
    region: 'منطقه ۶',
    district: 'ناحیه ۲',
    scope: 'ناحیه ۲ — بلوار کشاورز تقاطع کارگر',
    owner_analyst: 'امیرحسین طاهری',
    status: 'BLOCKED',
    workflow_step: 3,
    problem_statement: 'کمبود شدید فضای پارک حاشیه‌ای و اشباع خط عبور در ساعات اوج تجاری',
    objective: 'ساماندهی پارک حاشیه‌ای و هدایت ناوگان توزیع کالا به پارکینگ‌های مکانیزه',
    blockers_count: 1,
    total_requirements: 2,
    satisfied_requirements: 1,
    baseline: {
      status: 'BLOCKED',
      pinned_datasets: {
        'REQ-1405-05': { dataset_code: 'ROAD-06', version: 2, approved_at: '۱۴۰۵/۰۶/۱۵' }
      }
    },
    scenario_id: null,
    created_at: '۱۴۰۵/۰۶/۲۰',
    updated_at: '۱۴۰۵/۰۶/۲۳'
  }
];

const SEED_DATA_REQUIREMENTS: DataRequirement[] = [
  {
    id: 'REQ-1405-01',
    study_case_id: 'CASE-1405-00045',
    name: 'جمعیت پایه و تراکم جمعیتی محدوده مطالعه',
    category: 'جمعیت و سرانه',
    reason: 'برای اجرای تحلیل ظرفیت جمعیتی (ماژول M03) و محاسبه سرانه‌های خدماتی',
    module_code: 'M03 Population Capacity',
    scope: 'منطقه ۶ — ناحیه ۲ (محلات ۳ و ۴)',
    time_period: 'سال مطالعه ۱۴۰۵',
    required: true,
    blocking: true,
    satisfied: false,
    status: 'BLOCKED',
    blocker_reason: 'نسخه معتبر و تأییدشده‌ای برای محدوده و دوره زمانی موردنیاز وجود ندارد.',
    active_request_id: null
  },
  {
    id: 'REQ-1405-02',
    study_case_id: 'CASE-1405-00045',
    name: 'شبکه معابر و شبیه‌سازی بار ترافیک محلی',
    category: 'حمل‌ونقل و ترافیک',
    reason: 'برای اجرای ماژول تولید سفر و تقاضای تردد (ماژول M04)',
    module_code: 'M04 Trip Generation',
    scope: 'منطقه ۶ — ناحیه ۲',
    time_period: 'ساعات اوج صبح و عصر ۱۴۰۵',
    required: true,
    blocking: true,
    satisfied: false,
    status: 'BLOCKED',
    blocker_reason: 'Dataset برای محدوده مطالعه وجود دارد، اما نسخه قابل استفاده و تأییدشده وجود ندارد.',
    active_request_id: null
  },
  {
    id: 'REQ-1405-03',
    study_case_id: 'CASE-1405-00045',
    name: 'پارسل‌ها و کاربری اراضی وضع موجود',
    category: 'کالبدی و کاربری',
    reason: 'برای انطباق با ضوابط پهنه‌بندی طرح تفصیلی (ماژول M01)',
    module_code: 'M01 Rule / State Comparison',
    scope: 'منطقه ۶ — ناحیه ۲',
    time_period: 'وضع موجود مصوب',
    required: true,
    blocking: true,
    satisfied: true,
    status: 'SATISFIED',
    attached_dataset: 'PARCEL-06',
    attached_version: 3
  },
  {
    id: 'REQ-1405-04',
    study_case_id: 'CASE-1405-00046',
    name: 'آمار عرضه و تقاضای پارک حاشیه‌ای بلوار کشاورز',
    category: 'پارکینگ و پایانه‌ها',
    reason: 'برای ارزیابی تقاضای پارکینگ (ماژول M05)',
    module_code: 'M05 Parking Demand',
    scope: 'منطقه ۶ — ناحیه ۲',
    time_period: 'سال ۱۴۰۵',
    required: true,
    blocking: true,
    satisfied: false,
    status: 'BLOCKED',
    blocker_reason: 'پوشش مکانی برای محدوده مطالعه کافی نیست.',
    active_request_id: null
  },
  {
    id: 'REQ-1405-05',
    study_case_id: 'CASE-1405-00046',
    name: 'شبکه معابر شریانی و رده‌بندی عملکردی',
    category: 'حمل‌ونقل و ترافیک',
    reason: 'برای شبیه‌سازی تقاضای سفر و ظرفیت معبر (ماژول M04)',
    module_code: 'M04 Trip Generation',
    scope: 'منطقه ۶ — ناحیه ۲',
    time_period: 'وضع موجود',
    required: true,
    blocking: true,
    satisfied: true,
    status: 'SATISFIED',
    attached_dataset: 'ROAD-06',
    attached_version: 2
  }
];

const SEED_DATA_REQUESTS: DataRequest[] = [];

class Store {
  private data: DBData;

  constructor() {
    this.data = this.load();
  }

  private load(): DBData {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed: DBData = JSON.parse(raw);
        if (!parsed.studyCases || !parsed.studyCases.length) {
          parsed.studyCases = SEED_STUDY_CASES;
        }
        if (!parsed.dataRequirements || !parsed.dataRequirements.length) {
          parsed.dataRequirements = SEED_DATA_REQUIREMENTS;
        }
        if (!parsed.dataRequests) {
          parsed.dataRequests = SEED_DATA_REQUESTS;
        }
        if (!parsed.datasets || !parsed.datasets.length) {
          parsed.datasets = SEED_DATASETS;
        }
        if (!parsed.datasetVersions || !parsed.datasetVersions.length) {
          parsed.datasetVersions = SEED_DATASET_VERSIONS;
        }
        if (!parsed.datasetAudits || !parsed.datasetAudits.length) {
          parsed.datasetAudits = SEED_DATASET_AUDITS;
        }
        if (!parsed.datasetDependencies) {
          parsed.datasetDependencies = SEED_DATASET_DEPENDENCIES;
        }
        if (!parsed.rules || !parsed.rules.length) {
          parsed.rules = SEED_RULES;
        }
        if (!parsed.ruleVersions || !parsed.ruleVersions.length) {
          parsed.ruleVersions = SEED_RULE_VERSIONS;
        }
        if (!parsed.rulePacks || !parsed.rulePacks.length) {
          parsed.rulePacks = SEED_RULE_PACKS;
        }
        if (!parsed.rulePackVersions || !parsed.rulePackVersions.length) {
          parsed.rulePackVersions = SEED_RULE_PACK_VERSIONS;
        }
        if (!parsed.rulePrecedences || !parsed.rulePrecedences.length) {
          parsed.rulePrecedences = SEED_RULE_PRECEDENCES;
        }
        if (!parsed.ruleRequests) {
          parsed.ruleRequests = SEED_RULE_REQUESTS;
        }
        if (!parsed.ruleRequirements || !parsed.ruleRequirements.length) {
          parsed.ruleRequirements = SEED_RULE_REQUIREMENTS;
        }
        if (!parsed.ruleAudits || !parsed.ruleAudits.length) {
          parsed.ruleAudits = SEED_RULE_AUDITS;
        }
        if (!parsed.seq.studyCase) {
          parsed.seq.studyCase = 50;
        }
        if (!parsed.seq.dataRequest) {
          parsed.seq.dataRequest = 110;
        }
        if (!parsed.seq.ruleRequest) {
          parsed.seq.ruleRequest = 10;
        }
        if (!parsed.seq.rule) {
          parsed.seq.rule = 10;
        }
        return parsed;
      }
    } catch (e) {
      console.warn('Could not read store file, re-initializing seed data', e);
    }

    const initialData: DBData = {
      scientificUsers: [
        {
          id: 'دکتر فریبرز سمیعی',
          phone: '09123456789',
          name: 'دکتر فریبرز سمیعی',
          email: 'samiei@ut.ac.ir',
          role: 'scientific',
          org: 'دانشگاه تهران',
          title: 'استاد دانشکده شهرسازی',
          created_at: '۱۴۰۵/۰۶/۱۵',
        },
        {
          id: 'مهندس پروانه شمس',
          phone: '09121112233',
          name: 'مهندس پروانه شمس',
          email: 'shams@sbu.ac.ir',
          role: 'scientific',
          org: 'دانشگاه شهید بهشتی',
          title: 'پژوهشگر محیط‌زیست شهری',
          created_at: '۱۴۰۵/۰۶/۱۸',
        },
      ],
      profiles: {
        '09123456789': {
          user_id: '09123456789',
          first_name: 'فریبرز',
          last_name: 'سمیعی',
          phone: '09123456789',
          email: 'samiei@ut.ac.ir',
          profession_type: 'استاد دانشگاه',
          field_of_study: 'برنامه‌ریزی شهری و منطقه‌ای',
          academic_degree: 'دکتری',
          university_id: 'UT',
          university_name: 'دانشگاه تهران',
          faculty_group: 'گروه برنامه‌ریزی شهری و طراحی محیط',
          student_id_or_license: 'نظام مهندسی: ۱۰-۳-۰۲۴۹',
          experience_years: 18,
          specialties: ['برنامه‌ریزی شهری', 'حمل‌ونقل', 'طراحی شهری', 'GIS و داده‌های مکانی'],
          is_completed: true,
          updated_at: '۱۴۰۵/۰۶/۱۵',
        },
        '09121112233': {
          user_id: '09121112233',
          first_name: 'پروانه',
          last_name: 'شمس',
          phone: '09121112233',
          email: 'shams@sbu.ac.ir',
          profession_type: 'پژوهشگر',
          field_of_study: 'محیط‌زیست و هیدرولوژی شهری',
          academic_degree: 'دکتری',
          university_id: 'SBU',
          university_name: 'دانشگاه شهید بهشتی',
          faculty_group: 'پژوهشکده علوم محیطی',
          student_id_or_license: 'عضو انجمن هیدرولوژی ایران: ۹۲-۳۴',
          experience_years: 8,
          specialties: ['محیط‌زیست', 'زیرساخت و تأسیسات', 'GIS و داده‌های مکانی'],
          is_completed: true,
          updated_at: '۱۴۰۵/۰۶/۱۸',
        },
      },
      universities: SEED_UNIVERSITIES,
      proposals: SEED_PROPOSALS,
      scenarios: SEED_SCENARIOS,
      studyCases: SEED_STUDY_CASES,
      dataRequirements: SEED_DATA_REQUIREMENTS,
      dataRequests: SEED_DATA_REQUESTS,
      datasets: SEED_DATASETS,
      datasetVersions: SEED_DATASET_VERSIONS,
      datasetAudits: SEED_DATASET_AUDITS,
      datasetDependencies: SEED_DATASET_DEPENDENCIES,
      rules: SEED_RULES,
      ruleVersions: SEED_RULE_VERSIONS,
      rulePacks: SEED_RULE_PACKS,
      rulePackVersions: SEED_RULE_PACK_VERSIONS,
      rulePrecedences: SEED_RULE_PRECEDENCES,
      ruleRequests: SEED_RULE_REQUESTS,
      ruleRequirements: SEED_RULE_REQUIREMENTS,
      ruleAudits: SEED_RULE_AUDITS,
      otpCodes: {
        '09123456789': { code: '123456', expiresAt: Date.now() + 1000 * 60 * 60 * 24 },
        '09121112233': { code: '123456', expiresAt: Date.now() + 1000 * 60 * 60 * 24 },
      },
      seq: { proposal: 126, scenario: 125, studyCase: 50, dataRequest: 110, ruleRequest: 10, rule: 10 },
    };

    this.save(initialData);
    return initialData;
  }

  public save(newData?: DBData) {
    if (newData) this.data = newData;
    try {
      const dir = path.dirname(DB_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving store to disk', e);
    }
  }

  public getUniversities(): University[] {
    return this.data.universities;
  }

  public getAreas() {
    return TEHRAN_AREAS;
  }

  public isPhoneRegistered(phone: string): boolean {
    const cleanPhone = phone.trim().replace(/[^\d+]/g, '');
    const profile = this.data.profiles[cleanPhone];
    if (profile && (profile.is_completed || profile.first_name || profile.last_name || profile.university_name)) {
      return true;
    }
    const user = this.data.scientificUsers.find(u => u.phone === cleanPhone);
    if (user && user.id && !user.id.includes('کاربر جدید')) {
      return true;
    }
    return false;
  }

  public registerScientificUser(payload: {
    phone: string;
    first_name: string;
    last_name: string;
    national_id?: string;
    email?: string;
    university_id: string;
    university_name: string;
    faculty_group?: string;
    profession_type?: string;
    field_of_study: string;
    academic_degree?: string;
    student_id_or_license?: string;
    experience_years?: number;
    specialties?: string[];
  }): { success: boolean; message: string; user: ScientificUser; profile: ScientificProfile } {
    const cleanPhone = payload.phone.trim().replace(/[^\d+]/g, '');
    const fullName = `${payload.first_name.trim()} ${payload.last_name.trim()}`.trim();

    const profile: ScientificProfile = {
      user_id: cleanPhone,
      first_name: payload.first_name.trim(),
      last_name: payload.last_name.trim(),
      phone: cleanPhone,
      email: payload.email?.trim() || '',
      profession_type: payload.profession_type || 'پژوهشگر',
      field_of_study: payload.field_of_study.trim(),
      academic_degree: payload.academic_degree || 'کارشناسی ارشد',
      university_id: payload.university_id || 'UT',
      university_name: payload.university_name || 'دانشگاه تهران',
      faculty_group: payload.faculty_group?.trim() || '',
      student_id_or_license: payload.student_id_or_license?.trim() || (payload.national_id ? `کد ملی: ${payload.national_id}` : ''),
      experience_years: Number(payload.experience_years) || 1,
      specialties: payload.specialties || ['برنامه‌ریزی شهری', 'مطالعات کالبدی'],
      is_completed: true,
      updated_at: new Date().toLocaleDateString('fa-IR'),
    };

    this.data.profiles[cleanPhone] = profile;

    // Update or add to scientificUsers
    let userIndex = this.data.scientificUsers.findIndex(u => u.phone === cleanPhone);
    const userObj: ScientificUser = {
      id: fullName || `کاربر علمی (${cleanPhone.slice(-4)})`,
      phone: cleanPhone,
      name: fullName,
      email: profile.email || '',
      role: 'scientific',
      org: profile.university_name,
      title: `${profile.profession_type} — ${profile.field_of_study}`,
      created_at: new Date().toLocaleDateString('fa-IR'),
    };

    if (userIndex >= 0) {
      this.data.scientificUsers[userIndex] = userObj;
    } else {
      this.data.scientificUsers.push(userObj);
    }

    // Generate an OTP code for this phone so they can also verify/login immediately
    this.data.otpCodes[cleanPhone] = {
      code: '123456',
      expiresAt: Date.now() + 1000 * 60 * 60 * 24,
    };

    this.save();
    return {
      success: true,
      message: 'ثبت‌نام نهاد علمی با موفقیت انجام شد. حساب کاربری شما فعال گردید.',
      user: userObj,
      profile,
    };
  }

  public requestOtp(phone: string, purpose: 'login' | 'register' = 'login'): { success: boolean; code: string; isRegistered: boolean; error?: string } {
    const isRegistered = this.isPhoneRegistered(phone);

    if (purpose === 'login' && !isRegistered) {
      return {
        success: false,
        code: '',
        isRegistered: false,
        error: `شماره تلفن ${phone} در سامانه ثبت‌نام نشده است. به عنوان نهاد علمی، لطفاً ابتدا ثبت‌نام فرمایید.`,
      };
    }

    // 6-digit OTP code (fixed default demo master code 123456 or random)
    const code = '123456';
    this.data.otpCodes[phone] = {
      code,
      expiresAt: Date.now() + 1000 * 60 * 10, // 10 minutes
    };
    this.save();
    return { success: true, code, isRegistered };
  }

  public verifyOtp(phone: string, code: string): { success: boolean; user?: ScientificUser; profile?: ScientificProfile; message?: string } {
    const entry = this.data.otpCodes[phone];
    // For demo convenience, allow '123456' as master code, or match the actual OTP
    if (code !== '123456' && (!entry || entry.code !== code)) {
      return { success: false, message: 'کد تأیید نادرست است یا منقضی شده است' };
    }

    let profile = this.data.profiles[phone];
    let user = this.data.scientificUsers.find(u => u.phone === phone);

    if (!user) {
      user = {
        id: profile ? `${profile.first_name} ${profile.last_name}`.trim() || `کاربر علمی (${phone.slice(-4)})` : `کاربر علمی (${phone.slice(-4)})`,
        phone,
        name: profile ? `${profile.first_name} ${profile.last_name}`.trim() || `کاربر علمی (${phone.slice(-4)})` : `کاربر علمی (${phone.slice(-4)})`,
        email: profile?.email || '',
        role: 'scientific',
        org: profile?.university_name || 'نهاد علمی/دانشگاهی',
        title: profile?.profession_type || 'پژوهشگر/متخصص',
        created_at: new Date().toLocaleDateString('fa-IR'),
      };
      this.data.scientificUsers.push(user);
    }

    if (!profile) {
      profile = {
        user_id: phone,
        first_name: '',
        last_name: '',
        phone,
        email: '',
        profession_type: 'پژوهشگر',
        field_of_study: '',
        academic_degree: 'کارشناسی ارشد',
        university_id: '',
        university_name: '',
        faculty_group: '',
        student_id_or_license: '',
        experience_years: 0,
        specialties: [],
        is_completed: false,
        updated_at: new Date().toLocaleDateString('fa-IR'),
      };
      this.data.profiles[phone] = profile;
    }

    this.save();
    return { success: true, user, profile };
  }

  public getProfile(phone: string): ScientificProfile | null {
    return this.data.profiles[phone] || null;
  }

  public updateProfile(phone: string, update: Partial<ScientificProfile>): ScientificProfile {
    const existing = this.data.profiles[phone] || {
      user_id: phone,
      first_name: '',
      last_name: '',
      phone,
      profession_type: 'پژوهشگر',
      field_of_study: '',
      university_id: '',
      university_name: '',
      specialties: [],
      is_completed: false,
      updated_at: new Date().toLocaleDateString('fa-IR'),
    };

    const merged = { ...existing, ...update, phone, updated_at: new Date().toLocaleDateString('fa-IR') };
    if (merged.first_name && merged.last_name && merged.university_name && merged.field_of_study && merged.specialties.length > 0) {
      merged.is_completed = true;
    }
    this.data.profiles[phone] = merged;

    // Also sync scientificUsers list
    const userIndex = this.data.scientificUsers.findIndex(u => u.phone === phone);
    const fullName = `${merged.first_name} ${merged.last_name}`.trim();
    if (userIndex >= 0) {
      this.data.scientificUsers[userIndex].name = fullName || this.data.scientificUsers[userIndex].name;
      this.data.scientificUsers[userIndex].id = fullName || this.data.scientificUsers[userIndex].id;
      this.data.scientificUsers[userIndex].email = merged.email;
      this.data.scientificUsers[userIndex].org = merged.university_name || this.data.scientificUsers[userIndex].org;
      this.data.scientificUsers[userIndex].title = merged.profession_type;
    }

    this.save();
    return merged;
  }

  public createProposal(phone: string, payload: Partial<Proposal>): Proposal {
    const user = this.data.scientificUsers.find(u => u.phone === phone);
    const profile = this.data.profiles[phone];
    const submitterName = user?.name || (profile ? `${profile.first_name} ${profile.last_name}` : 'نهاد علمی');
    const institution = profile?.university_name || 'نهاد علمی همکار';
    const institutionId = profile?.university_id || 'ACADEMIC';

    const pNum = this.data.seq.proposal++;
    const propId = `PR-1405-${String(pNum).padStart(6, '0')}`;
    const today = new Date().toLocaleDateString('fa-IR');

    const status = (payload.status || 'SUBMITTED') as Proposal['status'];

    // Auto-assign analyst (balance between analysts or region-based)
    const analystPool = [
      { name: 'مهندس زهرا کاظمی', title: 'کارشناس ارشد برنامه‌ریزی شهری', org: 'معاونت شهرسازی و معماری', phone: '09120000003' },
      { name: 'امیرحسین طاهری', title: 'کارشناس منطقه', org: 'شهرداری منطقه ۶', phone: '09120000012' }
    ];
    let assigned = analystPool[0];
    if (payload.district_id?.includes('۶') || payload.district_id === 'منطقه ۶') {
      assigned = analystPool[1];
    } else {
      // Pick analyst with fewer proposals
      const c0 = this.data.proposals.filter(p => p.assigned_analyst === analystPool[0].name).length;
      const c1 = this.data.proposals.filter(p => p.assigned_analyst === analystPool[1].name).length;
      assigned = c0 <= c1 ? analystPool[0] : analystPool[1];
    }

    const assignedAnalystName = payload.assigned_analyst || assigned.name;
    const assignedAnalystTitle = payload.assigned_analyst_title || (assignedAnalystName === 'امیرحسین طاهری' ? 'کارشناس منطقه' : 'کارشناس ارشد برنامه‌ریزی شهری');
    const assignedAnalystOrg = payload.assigned_analyst_org || (assignedAnalystName === 'امیرحسین طاهری' ? 'شهرداری منطقه ۶' : 'معاونت شهرسازی و معماری');

    const newProposal: Proposal = {
      proposal_id: propId,
      title: payload.title || 'پیشنهاد بدون عنوان',
      description: payload.description || '',
      proposal_type: payload.proposal_type || 'سایر',
      topic: payload.topic || payload.proposal_type || 'کالبدی',
      submitter_id: submitterName,
      submitter_name: submitterName,
      institution_id: institutionId,
      institution_name: institution,
      profession_type: profile?.profession_type || payload.profession_type || 'متخصص',
      field_of_study: profile?.field_of_study || payload.field_of_study || '',
      university_id: institutionId,
      city_id: 'tehran',
      district_id: payload.district_id || 'منطقه ۶',
      neighborhood_id: payload.neighborhood_id || 'ناحیه ۲',
      sub_area: payload.sub_area || '',
      geometry: payload.geometry || {
        type: 'Point',
        coordinates: [51.389, 35.689],
      },
      problem_statement: payload.problem_statement || '',
      current_state: payload.current_state || '',
      problem_significance: payload.problem_significance || '',
      affected_groups: payload.affected_groups || '',
      objective: payload.objective || '',
      expected_outcome: payload.expected_outcome || '',
      full_proposal_description: payload.full_proposal_description || '',
      scientific_basis: payload.scientific_basis || '',
      expected_impacts: payload.expected_impacts || {
        positive: [],
        negative: [],
        risks: [],
        limitations: [],
        uncertainties: [],
      },
      attachments: payload.attachments || [],
      assigned_analyst: assignedAnalystName,
      assigned_analyst_name: assignedAnalystName,
      assigned_analyst_title: assignedAnalystTitle,
      assigned_analyst_org: assignedAnalystOrg,
      assigned_at: today,
      status,
      status_history: [
        {
          id: `SH-${Date.now()}-1`,
          proposal_id: propId,
          from_status: null,
          to_status: status,
          actor_id: submitterName,
          actor_name: submitterName,
          actor_role: 'نهاد علمی / ارائه‌دهنده پیشنهاد',
          timestamp: today + '، ' + new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
          note: status === 'SUBMITTED' ? 'ثبت و ارسال نهایی پیشنهاد برای بررسی در صف کارشناس تحلیل شهری' : 'ایجاد پیش‌نویس اولیه پیشنهاد',
        },
        {
          id: `SH-${Date.now()}-2`,
          proposal_id: propId,
          from_status: status,
          to_status: status,
          actor_id: 'سامانه ارجاع هوشمند TUIP',
          actor_name: 'سامانه هوشمند TUIP',
          actor_role: 'موتور ارجاع خودکار',
          timestamp: today + '، ' + new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
          note: `ارجاع خودکار پرونده به کارتابل تحلیلگر شهری: ${assignedAnalystName} (${assignedAnalystTitle} — ${assignedAnalystOrg}) و ثبت اعلان در زنگوله و پیام‌های داخلی`,
        },
      ],
      review_requests: [],
      created_at: today,
      updated_at: today,
    };

    this.data.proposals.unshift(newProposal);
    this.save();
    return newProposal;
  }

  public getMyProposals(phoneOrName: string): Proposal[] {
    const user = this.data.scientificUsers.find(u => u.phone === phoneOrName);
    const name = user ? user.name : phoneOrName;
    return this.data.proposals.filter(
      p => p.submitter_id === name || p.submitter_name === name || p.submitter_id === phoneOrName
    );
  }

  public getProposal(id: string): Proposal | null {
    return this.data.proposals.find(p => p.proposal_id === id) || null;
  }

  public updateProposal(id: string, update: Partial<Proposal>, actorName: string, actorRole: string): Proposal | null {
    const p = this.getProposal(id);
    if (!p) return null;

    // If already submitted and not in DRAFT or NEEDS_INFO, guard against silent modification
    const wasStatus = p.status;
    const newStatus = update.status || wasStatus;

    if (update.status && update.status !== wasStatus) {
      p.status_history.push({
        id: `SH-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        proposal_id: id,
        from_status: wasStatus,
        to_status: newStatus,
        actor_id: actorName,
        actor_name: actorName,
        actor_role: actorRole,
        timestamp: new Date().toLocaleDateString('fa-IR') + '، ' + new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
        note: (update as any).status_note || `تغییر وضعیت به ${newStatus}`,
      });
    }

    Object.assign(p, update, { updated_at: new Date().toLocaleDateString('fa-IR') });
    this.save();
    return p;
  }

  public requestReviewInfo(proposalId: string, analystId: string, analystName: string, question: string): Proposal | null {
    const p = this.getProposal(proposalId);
    if (!p) return null;

    const req: ProposalReviewRequest = {
      id: `RR-${Date.now()}`,
      proposal_id: proposalId,
      requested_by_id: analystId,
      requested_by_name: analystName,
      question,
      created_at: new Date().toLocaleDateString('fa-IR') + '، ' + new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      is_resolved: false,
    };

    p.review_requests.push(req);
    p.status = 'NEEDS_INFO';
    p.status_history.push({
      id: `SH-${Date.now()}`,
      proposal_id: proposalId,
      from_status: p.status,
      to_status: 'NEEDS_INFO',
      actor_id: analystId,
      actor_name: analystName,
      actor_role: 'کارشناس/تحلیلگر شهری',
      timestamp: new Date().toLocaleDateString('fa-IR') + '، ' + new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      note: `درخواست تکمیل اطلاعات از ارائه‌دهنده: ${question.slice(0, 70)}...`,
    });
    p.updated_at = new Date().toLocaleDateString('fa-IR');
    this.save();
    return p;
  }

  public answerReviewInfo(proposalId: string, requestId: string, response: string, additionalAttachments?: any[]): Proposal | null {
    const p = this.getProposal(proposalId);
    if (!p) return null;

    const req = p.review_requests.find(r => r.id === requestId);
    if (req) {
      req.response = response;
      req.answered_at = new Date().toLocaleDateString('fa-IR') + '، ' + new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
      req.is_resolved = true;
    }

    if (additionalAttachments && additionalAttachments.length) {
      p.attachments.push(...additionalAttachments);
    }

    p.status = 'SUBMITTED';
    p.status_history.push({
      id: `SH-${Date.now()}`,
      proposal_id: proposalId,
      from_status: 'NEEDS_INFO',
      to_status: 'SUBMITTED',
      actor_id: p.submitter_name,
      actor_name: p.submitter_name,
      actor_role: 'نهاد علمی / ارائه‌دهنده پیشنهاد',
      timestamp: new Date().toLocaleDateString('fa-IR') + '، ' + new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      note: 'پاسخ به استعلام کارشناس و ارسال اطلاعات تکمیلی',
    });
    p.updated_at = new Date().toLocaleDateString('fa-IR');
    this.save();
    return p;
  }

  public createScenarioFromProposal(
    proposalId: string,
    analystId: string,
    analystName: string,
    studyId: string = 'ST-1405-014'
  ): { scenario: Scenario; proposal: Proposal } | null {
    const p = this.getProposal(proposalId);
    if (!p) return null;

    const sNum = this.data.seq.scenario++;
    const scenarioId = `SC-1405-PROP-${String(sNum).padStart(3, '0')}`;
    const today = new Date().toLocaleDateString('fa-IR');

    const newScenario: Scenario = {
      id: scenarioId,
      proposal_id: p.proposal_id, // CRITICAL: scenario.proposal_id = proposal.id
      name: `سناریوی تحلیلی: ${p.title} (پیشنهاد ${p.proposal_id})`,
      study_id: studyId,
      creator: analystName,
      creator_role: 'analyst',
      created_at: today + '، ' + new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      status: 'draft',
      baseline: `وضع موجود فصل صفر مطالعه ${studyId} — نسخه‌های پین‌شده داده و ضوابط`,
      modules: ['M01', 'M02', 'M03', 'M04', 'M05', 'M06', 'M07', 'M08', 'M10', 'M11', 'M12'],
      kpis: {
        ptrip: { b: 50000, s: 64000, unit: 'سفر در روز' },
        vtrip: { b: 32000, s: 24500, unit: 'سفر در روز' },
        access: { b: 62, s: 84, unit: 'درصد پوشش دسترسی' },
        co2: { b: 24000, s: 18200, unit: 'کیلوگرم CO₂e روزانه' },
      },
      notes: `سناریو مشتق‌شده مستقیم از پیشنهاد علمی «${p.title}» ارائه شده توسط ${p.submitter_name} (${p.institution_name}).`,
    };

    this.data.scenarios.unshift(newScenario);

    // Update proposal state
    p.status = 'ACCEPTED_FOR_ANALYSIS';
    p.scenario_id = scenarioId;
    p.linked_study_id = studyId;
    p.status_history.push({
      id: `SH-${Date.now()}`,
      proposal_id: p.proposal_id,
      from_status: p.status,
      to_status: 'ACCEPTED_FOR_ANALYSIS',
      actor_id: analystId,
      actor_name: analystName,
      actor_role: 'کارشناس/تحلیلگر شهری',
      timestamp: today + '، ' + new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      note: `تبدیل پیشنهاد علمی به سناریوی تحلیلی رسمی با شناسه ${scenarioId} متصل به مطالعه ${studyId}`,
    });
    p.updated_at = today;

    this.save();
    return { scenario: newScenario, proposal: p };
  }

  public getAnalystProposals(filters: {
    region?: string;
    district?: string;
    topic?: string;
    type?: string;
    status?: string;
    university?: string;
    profession?: string;
    search?: string;
    analyst?: string;
  }): Proposal[] {
    return this.data.proposals.filter(p => {
      if (filters.analyst && p.assigned_analyst && p.assigned_analyst !== filters.analyst) return false;
      if (filters.region && p.district_id !== filters.region) return false;
      if (filters.district && p.neighborhood_id !== filters.district) return false;
      if (filters.topic && p.topic !== filters.topic) return false;
      if (filters.type && p.proposal_type !== filters.type) return false;
      if (filters.status && p.status !== filters.status) return false;
      if (filters.university && p.institution_name !== filters.university && p.university_id !== filters.university) return false;
      if (filters.profession && p.profession_type !== filters.profession) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const match =
          p.title.toLowerCase().includes(q) ||
          p.proposal_id.toLowerCase().includes(q) ||
          p.submitter_name.toLowerCase().includes(q) ||
          p.institution_name.toLowerCase().includes(q) ||
          p.problem_statement.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }

  public getScenarios(): Scenario[] {
    return this.data.scenarios;
  }

  public getStats() {
    const total = this.data.proposals.length;
    const underReview = this.data.proposals.filter(p => p.status === 'SUBMITTED' || p.status === 'INITIAL_REVIEW').length;
    const needsInfo = this.data.proposals.filter(p => p.status === 'NEEDS_INFO').length;
    const accepted = this.data.proposals.filter(p => p.status === 'ACCEPTED_FOR_ANALYSIS' || p.status === 'IN_ANALYSIS').length;
    const completed = this.data.proposals.filter(p => p.status === 'ANALYSIS_COMPLETED').length;
    const scenariosCount = this.data.scenarios.length;

    return { total, underReview, needsInfo, accepted, completed, scenariosCount };
  }

  // ==========================================
  // Study Cases & Blocker Management
  // ==========================================

  public getStudyCases(filters?: { analyst?: string; status?: string }): StudyCase[] {
    return (this.data.studyCases || []).filter(c => {
      if (filters?.analyst && c.owner_analyst && !c.owner_analyst.includes(filters.analyst) && !filters.analyst.includes(c.owner_analyst)) return false;
      if (filters?.status && c.status !== filters.status) return false;
      return true;
    });
  }

  public getStudyCase(id: string): StudyCase | undefined {
    return (this.data.studyCases || []).find(c => c.id === id);
  }

  public getStudyCaseByProposal(proposalId: string): StudyCase | undefined {
    return (this.data.studyCases || []).find(c => c.proposal_id === proposalId);
  }

  public createStudyCaseFromProposal(proposalId: string, analystName: string, analystRole: string = 'analyst'): StudyCase {
    const existing = this.getStudyCaseByProposal(proposalId);
    if (existing) return existing;

    const prop = this.getProposal(proposalId);
    if (!prop) throw new Error(`Proposal ${proposalId} not found`);

    const seq = (this.data.seq.studyCase || 50) + 1;
    this.data.seq.studyCase = seq;
    const caseId = `CASE-1405-${String(seq).padStart(5, '0')}`;
    const today = '۱۴۰۵/۰۶/۲۳';

    const newCase: StudyCase = {
      id: caseId,
      proposal_id: proposalId,
      study_id: prop.linked_study_id || 'ST-1405-014',
      title: `پرونده تحلیلی: ${prop.title}`,
      region: prop.district_id || 'منطقه ۶',
      district: prop.neighborhood_id || 'ناحیه ۲',
      scope: `${prop.district_id} — ${prop.neighborhood_id} ${prop.sub_area ? '— ' + prop.sub_area : ''}`,
      owner_analyst: analystName || prop.assigned_analyst_name || 'مهندس زهرا کاظمی',
      status: 'BLOCKED',
      workflow_step: 3,
      problem_statement: prop.problem_statement,
      objective: prop.objective,
      blockers_count: 2,
      total_requirements: 3,
      satisfied_requirements: 1,
      baseline: {
        status: 'BLOCKED',
        pinned_datasets: {
          [`REQ-${seq}-03`]: { dataset_code: 'PARCEL-06', version: 3, approved_at: today }
        }
      },
      scenario_id: null,
      created_at: today,
      updated_at: today
    };

    // Auto-create realistic initial data requirements for this study case
    const req1: DataRequirement = {
      id: `REQ-${seq}-01`,
      study_case_id: caseId,
      name: `جمعیت پایه و تراکم جمعیتی محدوده ${prop.district_id}`,
      category: 'جمعیت و سرانه',
      reason: 'برای اجرای تحلیل ظرفیت جمعیتی (ماژول M03) و محاسبه سرانه‌های خدماتی',
      module_code: 'M03 Population Capacity',
      scope: `${prop.district_id} — ${prop.neighborhood_id}`,
      time_period: 'سال مطالعه ۱۴۰۵',
      required: true,
      blocking: true,
      satisfied: false,
      status: 'BLOCKED',
      blocker_reason: 'نسخه معتبر و تأییدشده‌ای برای محدوده و دوره زمانی موردنیاز وجود ندارد.',
      active_request_id: null
    };

    const req2: DataRequirement = {
      id: `REQ-${seq}-02`,
      study_case_id: caseId,
      name: `شبکه معابر و شبیه‌سازی بار ترافیک محدوده ${prop.district_id}`,
      category: 'حمل‌ونقل و ترافیک',
      reason: 'برای اجرای ماژول تولید سفر و تقاضای تردد (ماژول M04)',
      module_code: 'M04 Trip Generation',
      scope: `${prop.district_id} — ${prop.neighborhood_id}`,
      time_period: 'ساعات اوج صبح و عصر ۱۴۰۵',
      required: true,
      blocking: true,
      satisfied: false,
      status: 'BLOCKED',
      blocker_reason: 'Dataset برای محدوده مطالعه وجود دارد، اما نسخه قابل استفاده و تأییدشده وجود ندارد.',
      active_request_id: null
    };

    const req3: DataRequirement = {
      id: `REQ-${seq}-03`,
      study_case_id: caseId,
      name: `پارسل‌ها و کاربری اراضی وضع موجود ${prop.district_id}`,
      category: 'کالبدی و کاربری',
      reason: 'برای انطباق با ضوابط پهنه‌بندی طرح تفصیلی (ماژول M01)',
      module_code: 'M01 Rule / State Comparison',
      scope: `${prop.district_id} — ${prop.neighborhood_id}`,
      time_period: 'وضع موجود مصوب',
      required: true,
      blocking: true,
      satisfied: true,
      status: 'SATISFIED',
      attached_dataset: 'PARCEL-06',
      attached_version: 3
    };

    if (!this.data.studyCases) this.data.studyCases = [];
    if (!this.data.dataRequirements) this.data.dataRequirements = [];

    this.data.studyCases.unshift(newCase);
    this.data.dataRequirements.push(req1, req2, req3);

    // Update proposal status
    prop.status = 'ACCEPTED_FOR_ANALYSIS';
    prop.status_history.push({
      id: `HIS-${Date.now()}`,
      proposal_id: proposalId,
      from_status: 'INITIAL_REVIEW',
      to_status: 'ACCEPTED_FOR_ANALYSIS',
      actor_id: analystRole,
      actor_name: analystName,
      actor_role: analystRole,
      timestamp: today,
      note: `پیشنهاد مورد پذیرش قرار گرفت و پرونده تحلیلی ${caseId} ایجاد گردید.`
    });

    this.save();
    return newCase;
  }

  public getDataRequirements(studyCaseId: string): DataRequirement[] {
    return (this.data.dataRequirements || []).filter(r => r.study_case_id === studyCaseId);
  }

  public getDataRequirement(id: string): DataRequirement | undefined {
    return (this.data.dataRequirements || []).find(r => r.id === id);
  }

  public getBlockers(studyCaseId: string): DataRequirement[] {
    return (this.data.dataRequirements || []).filter(r => r.study_case_id === studyCaseId && r.blocking && !r.satisfied);
  }

  public createDataRequest(
    studyCaseId: string,
    requirementId: string,
    requestedBy: string,
    reason?: string,
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'HIGH'
  ): DataRequest {
    const sc = this.getStudyCase(studyCaseId);
    if (!sc) throw new Error(`Study case ${studyCaseId} not found`);

    const req = (this.data.dataRequirements || []).find(r => r.id === requirementId && r.study_case_id === studyCaseId);
    if (!req) throw new Error(`Requirement ${requirementId} not found in ${studyCaseId}`);

    // If an active request already exists for this requirement, return it to prevent duplicate requests
    if (req.active_request_id) {
      const existing = (this.data.dataRequests || []).find(
        dr => dr.request_id === req.active_request_id && (dr.status === 'REQUESTED' || dr.status === 'IN_PROGRESS')
      );
      if (existing) return existing;
    }

    const seq = (this.data.seq.dataRequest || 110) + 1;
    this.data.seq.dataRequest = seq;
    const reqId = `DR-1405-${String(seq).padStart(5, '0')}`;
    const today = '۱۴۰۵/۰۶/۲۳';

    const newReq: DataRequest = {
      request_id: reqId,
      study_case_id: studyCaseId,
      data_requirement_id: requirementId,
      requirement_name: req.name,
      requested_by: requestedBy || 'مهندس زهرا کاظمی (تحلیلگر شهری)',
      assigned_to: 'مهندس مریم فراهانی (متولی داده)',
      reason: reason || req.reason || `تأمین داده مسدودکننده برای ${req.name}`,
      priority,
      status: 'REQUESTED',
      created_at: today,
      updated_at: today
    };

    req.active_request_id = reqId;
    req.status = 'REQUESTED';

    if (!this.data.dataRequests) this.data.dataRequests = [];
    this.data.dataRequests.unshift(newReq);

    this.recalculateStudyCaseBlockingState(studyCaseId);
    this.save();
    return newReq;
  }

  public getDataRequests(filters?: { studyCaseId?: string; status?: string }): DataRequest[] {
    return (this.data.dataRequests || []).filter(dr => {
      if (filters?.studyCaseId && dr.study_case_id !== filters.studyCaseId) return false;
      if (filters?.status && dr.status !== filters.status) return false;
      return true;
    });
  }

  public getDataRequest(requestId: string): DataRequest | undefined {
    return (this.data.dataRequests || []).find(dr => dr.request_id === requestId);
  }

  public startDataRequest(
    requestId: string,
    user: { name: string; role: string }
  ): { success: boolean; request: DataRequest } {
    const dr = (this.data.dataRequests || []).find(r => r.request_id === requestId);
    if (!dr) throw new Error(`Data request ${requestId} not found`);

    const today = '۱۴۰۵/۰۶/۲۳';
    dr.status = 'IN_PROGRESS';
    dr.started_at = today;
    dr.updated_at = today;
    dr.assigned_to = user.name;

    this.addDatasetAudit({
      actor: user.name,
      role: user.role,
      action: 'DATA_REQUEST_STARTED',
      entity_type: 'DATA_REQUEST',
      entity_id: requestId,
      reason: `درخواست تأمین داده توسط ${user.name} در دست اقدام قرار گرفت.`,
    });

    this.save();
    return { success: true, request: dr };
  }

  public rejectDataRequest(
    requestId: string,
    reason: string,
    user: { name: string; role: string }
  ): { success: boolean; request: DataRequest; studyCase?: StudyCase } {
    if (!reason || !reason.trim()) {
      throw new Error('علت رد درخواست تأمین داده الزامی است.');
    }
    const dr = (this.data.dataRequests || []).find(r => r.request_id === requestId);
    if (!dr) throw new Error(`Data request ${requestId} not found`);

    const today = '۱۴۰۵/۰۶/۲۳';
    dr.status = 'REJECTED';
    dr.rejection_reason = reason.trim();
    dr.updated_at = today;

    const req = (this.data.dataRequirements || []).find(r => r.id === dr.data_requirement_id);
    if (req) {
      req.status = 'BLOCKED';
      req.blocker_reason = `درخواست تأمین داده توسط متولی داده رد شد: ${reason.trim()}`;
    }

    this.addDatasetAudit({
      actor: user.name,
      role: user.role,
      action: 'DATA_REQUEST_REJECTED',
      entity_type: 'DATA_REQUEST',
      entity_id: requestId,
      reason: reason.trim(),
    });

    const updatedCase = this.recalculateStudyCaseBlockingState(dr.study_case_id);
    this.save();
    return { success: true, request: dr, studyCase: updatedCase };
  }

  public fulfillDataRequest(
    requestId: string,
    datasetCode: string,
    datasetVersion: number,
    fulfilledBy: string,
    note?: string
  ): { success: boolean; request: DataRequest; studyCase: StudyCase } {
    const dr = (this.data.dataRequests || []).find(r => r.request_id === requestId);
    if (!dr) throw new Error(`Data request ${requestId} not found`);

    // Verify dataset exists
    const ds = (this.data.datasets || []).find(d => d.code === datasetCode);
    if (!ds) throw new Error(`مجموعه داده ${datasetCode} در کاتالوگ سامانه یافت نشد.`);

    // Verify exact version exists and verify its quality/publication status!
    const ver = (this.data.datasetVersions || []).find(
      v => v.dataset_code === datasetCode && v.version === datasetVersion
    );
    if (!ver) {
      throw new Error(`نسخه شماره ${datasetVersion} از مجموعه داده ${datasetCode} وجود ندارد.`);
    }

    // STRICT GATE: Quarantined, draft, or unvalidated datasets CANNOT fulfill formal study requirements!
    if (ver.status === 'QUARANTINED') {
      throw new Error(
        `نسخه انتخابی داده در وضعیت قرنطینه (QUARANTINED) قرار دارد و دارای خطای مسدودکننده است: «${ver.quarantine_reason || 'عدم تأیید فنی'}». امکان استفاده از داده قرنطینه برای پرونده پژوهشی وجود ندارد.`
      );
    }
    if (ver.status !== 'PUBLISHED') {
      throw new Error(
        `نسخه انتخابی در وضعیت ${ver.status} است و هنوز به انتشار رسمی نرسیده است. فقط نسخه‌های نهایی منتشرشده (PUBLISHED) مجاز به اتصال به پرونده پژوهشی هستند.`
      );
    }

    const today = '۱۴۰۵/۰۶/۲۳';
    dr.status = 'FULFILLED';
    dr.dataset_code = datasetCode;
    dr.dataset_version = datasetVersion;
    dr.fulfilled_at = today;
    dr.updated_at = today;
    if (note) dr.note = note;

    // Fulfill Requirement
    const req = (this.data.dataRequirements || []).find(r => r.id === dr.data_requirement_id);
    if (req) {
      req.satisfied = true;
      req.status = 'SATISFIED';
      req.attached_dataset = datasetCode;
      req.attached_version = datasetVersion;
      req.blocker_reason = undefined;
    }

    // Attach to Study Case Baseline
    const sc = (this.data.studyCases || []).find(c => c.id === dr.study_case_id);
    if (sc) {
      if (!sc.baseline) {
        sc.baseline = { status: 'BLOCKED', pinned_datasets: {} };
      }
      sc.baseline.pinned_datasets[dr.data_requirement_id] = {
        dataset_code: datasetCode,
        version: datasetVersion,
        approved_at: today,
      };

      // Add to dataset dependent studies if not present
      if (!ds.dependent_studies.includes(sc.id)) {
        ds.dependent_studies.push(sc.id);
      }
    }

    this.addDatasetAudit({
      actor: fulfilledBy,
      role: 'steward',
      action: 'DATA_REQUEST_FULFILLED',
      entity_type: 'DATA_REQUEST',
      entity_id: requestId,
      after: { dataset_code: datasetCode, version: datasetVersion },
      reason: note || `تأمین نیازمندی مطالعه با اتصال به نسخه رسمی ${datasetCode} v${datasetVersion}`,
    });

    // Run automatic blocking check!
    const updatedCase = this.recalculateStudyCaseBlockingState(dr.study_case_id);
    this.save();

    return { success: true, request: dr, studyCase: updatedCase };
  }

  public recordDataRequirementLimitation(
    studyCaseId: string,
    requirementId: string,
    limitationNote: string,
    user: { name: string; role: string }
  ): { success: boolean; requirement: DataRequirement; studyCase: StudyCase } {
    if (!limitationNote || !limitationNote.trim()) {
      throw new Error('توضیح محدودیت داده الزامی است.');
    }
    const req = (this.data.dataRequirements || []).find(r => r.id === requirementId && r.study_case_id === studyCaseId);
    if (!req) throw new Error(`Data requirement ${requirementId} not found`);

    req.status = 'SATISFIED_WITH_LIMITATION';
    req.limitation_note = limitationNote.trim();
    // A requirement with approved limitation is counted as satisfied for analysis with declared constraints
    req.satisfied = true;
    req.blocker_reason = undefined;

    this.addDatasetAudit({
      actor: user.name,
      role: user.role,
      action: 'DATA_REQUEST_VIEWED',
      entity_type: 'STUDY_CASE',
      entity_id: studyCaseId,
      reason: `ثبت محدودیت داده برای نیازمندی ${req.name}: ${limitationNote.trim()}`,
    });

    const updatedCase = this.recalculateStudyCaseBlockingState(studyCaseId);
    this.save();
    return { success: true, requirement: req, studyCase: updatedCase };
  }

  public recalculateStudyCaseBlockingState(studyCaseId: string): StudyCase {
    const sc = (this.data.studyCases || []).find(c => c.id === studyCaseId);
    if (!sc) throw new Error(`Study case ${studyCaseId} not found`);

    const dataReqs = (this.data.dataRequirements || []).filter(r => r.study_case_id === studyCaseId);
    const dataBlockers = dataReqs.filter(r => r.blocking && !r.satisfied);

    const ruleReqs = (this.data.ruleRequirements || []).filter(r => r.study_case_id === studyCaseId);
    const ruleBlockers = ruleReqs.filter(r => r.blocking && !r.satisfied);

    const totalCount = dataReqs.length + ruleReqs.length;
    const satisfiedCount = dataReqs.filter(r => r.satisfied).length + ruleReqs.filter(r => r.satisfied).length;
    const allBlockersCount = dataBlockers.length + ruleBlockers.length;

    sc.total_requirements = totalCount;
    sc.satisfied_requirements = satisfiedCount;
    sc.blockers_count = allBlockersCount;

    if (allBlockersCount > 0) {
      sc.status = 'BLOCKED';
      if (!sc.baseline) sc.baseline = { status: 'BLOCKED', pinned_datasets: {} };
      sc.baseline.status = 'BLOCKED';
      sc.workflow_step = 3;
    } else {
      // All blockers resolved! Automatically unblock the study case and activate the next workflow step!
      sc.status = 'READY_FOR_NEXT_STEP';
      if (!sc.baseline) sc.baseline = { status: 'READY', pinned_datasets: {} };
      sc.baseline.status = 'READY';
      sc.workflow_step = 4; // Baseline ready -> Step 5 (Scenario) is enabled!
    }

    sc.updated_at = '۱۴۰۵/۰۶/۲۳';
    return sc;
  }

  /* ------------------------------------------------------------
     DATA STEWARD DATASET CATALOG & VERSION LIFECYCLE METHODS
     ------------------------------------------------------------ */

  public getDatasets(filters?: { status?: string; region?: string; search?: string }): Dataset[] {
    return (this.data.datasets || []).filter(d => {
      if (filters?.status && d.status !== filters.status) return false;
      if (filters?.region && !d.region.includes(filters.region)) return false;
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        const match =
          d.code.toLowerCase().includes(q) ||
          d.name.toLowerCase().includes(q) ||
          d.title.toLowerCase().includes(q) ||
          d.category.toLowerCase().includes(q) ||
          d.description.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }

  public getDataset(code: string): Dataset | undefined {
    return (this.data.datasets || []).find(d => d.code === code);
  }

  public createDataset(
    payload: Partial<Dataset>,
    user: { name: string; role: string }
  ): Dataset {
    if (!payload.code || !payload.title) {
      throw new Error('کد یکتا و عنوان مجموعه داده الزامی است.');
    }
    const code = payload.code.toUpperCase().trim();
    if (this.data.datasets.some(d => d.code === code)) {
      throw new Error(`مجموعه داده با کد ${code} قبلاً ثبت شده است.`);
    }

    const today = '۱۴۰۵/۰۶/۲۳';
    const newDs: Dataset = {
      code,
      name: payload.name || payload.title,
      title: payload.title,
      category: payload.category || 'کالبدی و شهری',
      role: payload.role || 'general_dataset',
      owner: payload.owner || user.name,
      organization: payload.organization || 'شهرداری تهران',
      classification: payload.classification || 'restricted_municipal',
      permitted_use: payload.permitted_use || 'ANALYTICAL',
      description: payload.description || '',
      region: payload.region || 'منطقه ۶',
      current_published_version: null,
      status: 'CANDIDATE',
      update_cadence: payload.update_cadence || 'سالانه',
      dependent_studies: [],
      created_at: today,
      updated_at: today,
    };

    this.data.datasets.push(newDs);
    this.addDatasetAudit({
      actor: user.name,
      role: user.role,
      action: 'DATASET_CREATED',
      entity_type: 'DATASET',
      entity_id: code,
      reason: `تعریف شناسنامه مجموعه داده جدید ${newDs.title}`,
    });

    this.save();
    return newDs;
  }

  public getDatasetVersions(code: string): DatasetVersion[] {
    return (this.data.datasetVersions || [])
      .filter(v => v.dataset_code === code)
      .sort((a, b) => b.version - a.version);
  }

  public getDatasetVersion(code: string, version: number): DatasetVersion | undefined {
    return (this.data.datasetVersions || []).find(
      v => v.dataset_code === code && v.version === version
    );
  }

  public createCandidateVersion(
    code: string,
    payload: Partial<DatasetVersion>,
    user: { name: string; role: string }
  ): DatasetVersion {
    const ds = this.getDataset(code);
    if (!ds) throw new Error(`مجموعه داده ${code} یافت نشد.`);

    const existing = this.getDatasetVersions(code);
    const nextVer = existing.length > 0 ? Math.max(...existing.map(v => v.version)) + 1 : 1;
    const today = '۱۴۰۵/۰۶/۲۳';

    const newVer: DatasetVersion = {
      id: `${code}-v${nextVer}`,
      dataset_code: code,
      version: nextVer,
      status: 'UPLOADED',
      reason: payload.reason || `بارگذاری نسخه جدید v${nextVer} برای مجموعه داده ${ds.title}`,
      source_metadata: {
        source_type: payload.source_metadata?.source_type || 'municipal_cadastre',
        source_owner: payload.source_metadata?.source_owner || ds.owner,
        source_organization: payload.source_metadata?.source_organization || ds.organization,
        acquisition_date: payload.source_metadata?.acquisition_date || today,
        acquisition_method: payload.source_metadata?.acquisition_method || 'بارگذاری فایل توسط متولی داده',
        license_or_permitted_use: payload.source_metadata?.license_or_permitted_use || 'طرح‌های رسمی برنامه‌ریزی شهری',
        file_name: payload.source_metadata?.file_name || `data_${code.toLowerCase()}_v${nextVer}.geojson`,
        file_size_bytes: payload.source_metadata?.file_size_bytes || 1024000,
        mime_type: payload.source_metadata?.mime_type || 'application/geo+json',
        checksum: payload.source_metadata?.checksum || `sha256-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        uploader_name: user.name,
        uploader_role: user.role,
      },
      profile: payload.profile || {
        record_count: 1000,
        columns: [
          { name: 'id', type: 'string', null_count: 0, unique_count: 1000 },
          { name: 'geometry', type: 'MultiPolygon', null_count: 0, unique_count: 1000 },
          { name: 'code', type: 'string', null_count: 0, unique_count: 50 },
        ],
      },
      spatial: payload.spatial || {
        is_spatial: true,
        geometry_type: 'MultiPolygon',
        crs: 'EPSG:32639',
        bbox: [51.370, 35.684, 51.430, 35.744],
        invalid_geometry_count: 0,
        empty_geometry_count: 0,
        spatial_coverage_pct: 100.0,
        extent_description: ds.region,
        region_intersection: ds.region,
      },
      temporal: payload.temporal || {
        start_date: '۱۴۰۵/۰۱/۰۱',
        end_date: today,
        reference_year: '۱۴۰۵',
        observation_period: 'شهریور ۱۴۰۵',
        update_cadence: ds.update_cadence,
        is_stale: false,
        age_days: 10,
      },
      mappings: payload.mappings || [
        { source_field: 'id', target_field: 'id', data_type: 'string', required: true, is_identifier: true },
        { source_field: 'geometry', target_field: 'geometry', data_type: 'MultiPolygon', required: true },
      ],
      reconciliation: payload.reconciliation || {
        source_records: 1000,
        accepted_records: 1000,
        rejected_records: 0,
        quarantined_records: 0,
        is_balanced: true,
      },
      validation_checks: [],
      quality_assessment: [],
      issues: [],
      semantic_review: {
        status: 'PENDING',
        notes: 'در انتظار بررسی معنایی و انطباق با حوزه تخصصی',
      },
      publication: {},
      is_immutable: false,
      created_at: today,
      updated_at: today,
    };

    this.data.datasetVersions.push(newVer);
    this.addDatasetAudit({
      actor: user.name,
      role: user.role,
      action: 'DATASET_UPLOADED',
      entity_type: 'DATASET_VERSION',
      entity_id: newVer.id,
      reason: `ایجاد نسخه نامزد جدید v${nextVer} با فایل ${newVer.source_metadata.file_name}`,
    });

    this.save();
    return newVer;
  }

  public profileDatasetVersion(
    code: string,
    version: number,
    profileData: Partial<DatasetVersion['profile']>,
    user: { name: string; role: string }
  ): DatasetVersion {
    const ver = this.getDatasetVersion(code, version);
    if (!ver) throw new Error(`نسخه ${code} v${version} یافت نشد.`);
    if (ver.is_immutable) throw new Error('نسخه منتشرشده غیرقابل‌تغییر (Immutable) است.');

    ver.status = 'PROFILING';
    if (profileData.record_count !== undefined) ver.profile.record_count = profileData.record_count;
    if (profileData.columns) ver.profile.columns = profileData.columns;
    if (profileData.sample_rows) ver.profile.sample_rows = profileData.sample_rows;

    this.addDatasetAudit({
      actor: user.name,
      role: user.role,
      action: 'DATASET_PROFILED',
      entity_type: 'DATASET_VERSION',
      entity_id: ver.id,
      reason: `پروفایل‌گیری خودکار داده: ${ver.profile.record_count} رکورد و ${ver.profile.columns.length} ستون`,
    });

    this.save();
    return ver;
  }

  public mapDatasetVersion(
    code: string,
    version: number,
    mappings: DatasetFieldMapping[],
    user: { name: string; role: string }
  ): DatasetVersion {
    const ver = this.getDatasetVersion(code, version);
    if (!ver) throw new Error(`نسخه ${code} v${version} یافت نشد.`);
    if (ver.is_immutable) throw new Error('نسخه منتشرشده غیرقابل‌تغییر است.');

    ver.mappings = mappings;
    ver.status = 'MAPPING';

    this.addDatasetAudit({
      actor: user.name,
      role: user.role,
      action: 'DATASET_MAPPED',
      entity_type: 'DATASET_VERSION',
      entity_id: ver.id,
      reason: `نگاشت صریح ${mappings.length} فیلد با ممانعت از حدس خودکار`,
    });

    this.save();
    return ver;
  }

  public validateDatasetVersion(
    code: string,
    version: number,
    user: { name: string; role: string },
    options?: {
      forceFailGeometry?: boolean;
      forceFailCrs?: boolean;
      forceFailMapping?: boolean;
      forceFailDuplicates?: boolean;
      forceCountMismatch?: boolean;
    }
  ): {
    version: DatasetVersion;
    checks: DatasetValidationCheck[];
    issues: DatasetValidationIssue[];
    quality: DatasetQualityDimension[];
    reconciliation: DatasetCountReconciliation;
    blockingErrorsCount: number;
    warningsCount: number;
  } {
    const ds = this.getDataset(code);
    if (!ds) throw new Error(`مجموعه داده ${code} یافت نشد.`);

    const ver = this.getDatasetVersion(code, version);
    if (!ver) throw new Error(`نسخه ${code} v${version} یافت نشد.`);
    if (ver.is_immutable) throw new Error('نسخه منتشرشده نهایی غیرقابل‌تغییر است.');

    ver.status = 'VALIDATING';

    const result = executeDatasetValidation({
      version: ver,
      dataset: ds,
      ...options,
    });

    ver.validation_checks = result.checks;
    ver.issues = result.issues;
    ver.quality_assessment = result.quality;
    ver.reconciliation = result.reconciliation;
    ver.status = result.newStatus;
    ver.updated_at = '۱۴۰۵/۰۶/۲۳';

    if (result.newStatus === 'QUARANTINED') {
      ver.quarantine_reason = result.issues.map(i => i.description).join(' | ');
      ver.quarantined_at = '۱۴۰۵/۰۶/۲۳';
      ver.quarantined_by = user.name;

      this.addDatasetAudit({
        actor: user.name,
        role: user.role,
        action: 'DATASET_QUARANTINED',
        entity_type: 'DATASET_VERSION',
        entity_id: ver.id,
        reason: `شناسایی خطاهای بحرانی در اعتبارسنجی: ${ver.quarantine_reason}`,
      });
    } else {
      this.addDatasetAudit({
        actor: user.name,
        role: user.role,
        action: 'DATASET_VALIDATED',
        entity_type: 'DATASET_VERSION',
        entity_id: ver.id,
        reason: `اجرای موتور اعتبارسنجی: وضعیت جدید ${ver.status} با ${result.blockingErrorsCount} خطای مسدودکننده و ${result.warningsCount} هشدار`,
      });
    }

    this.save();
    return {
      version: ver,
      checks: result.checks,
      issues: result.issues,
      quality: result.quality,
      reconciliation: result.reconciliation,
      blockingErrorsCount: result.blockingErrorsCount,
      warningsCount: result.warningsCount,
    };
  }

  public quarantineDatasetVersion(
    code: string,
    version: number,
    reason: string,
    user: { name: string; role: string }
  ): DatasetVersion {
    if (!reason || !reason.trim()) {
      throw new Error('ثبت دلیل قرنطینه‌سازی داده اجباری است.');
    }
    const ver = this.getDatasetVersion(code, version);
    if (!ver) throw new Error(`نسخه ${code} v${version} یافت نشد.`);

    ver.status = 'QUARANTINED';
    ver.quarantine_reason = reason.trim();
    ver.quarantined_at = '۱۴۰۵/۰۶/۲۳';
    ver.quarantined_by = user.name;
    ver.updated_at = '۱۴۰۵/۰۶/۲۳';

    this.addDatasetAudit({
      actor: user.name,
      role: user.role,
      action: 'DATASET_QUARANTINED',
      entity_type: 'DATASET_VERSION',
      entity_id: ver.id,
      reason: reason.trim(),
    });

    this.save();
    return ver;
  }

  public requestVersionCorrection(
    code: string,
    version: number,
    reason: string,
    user: { name: string; role: string }
  ): DatasetVersion {
    if (!reason || !reason.trim()) {
      throw new Error('علت درخواست اصلاح الزامی است.');
    }
    const ver = this.getDatasetVersion(code, version);
    if (!ver) throw new Error(`نسخه ${code} v${version} یافت نشد.`);

    ver.status = 'NEEDS_CORRECTION';
    ver.updated_at = '۱۴۰۵/۰۶/۲۳';

    this.addDatasetAudit({
      actor: user.name,
      role: user.role,
      action: 'DATASET_CORRECTION_REQUESTED',
      entity_type: 'DATASET_VERSION',
      entity_id: ver.id,
      reason: reason.trim(),
    });

    this.save();
    return ver;
  }

  public approveSemanticReview(
    code: string,
    version: number,
    approvedBy: string,
    notes: string,
    user: { name: string; role: string }
  ): DatasetVersion {
    const ver = this.getDatasetVersion(code, version);
    if (!ver) throw new Error(`نسخه ${code} v${version} یافت نشد.`);

    if (ver.status === 'QUARANTINED' || ver.status === 'NEEDS_CORRECTION') {
      throw new Error(`امکان تأیید معنایی نسخه‌ای که در وضعیت ${ver.status} است وجود ندارد. ابتدا خطاهای فنی را برطرف کنید.`);
    }

    const today = '۱۴۰۵/۰۶/۲۳';
    ver.semantic_review = {
      status: 'APPROVED',
      approved_by: approvedBy || user.name,
      approved_at: today,
      notes: notes || 'تأیید انطباق معنایی داده با حوزه تخصصی',
    };

    // If technical validation is clean, transition to READY_FOR_PUBLICATION
    const hasBlocking = ver.validation_checks.some(c => c.status === 'FAIL' && c.severity === 'BLOCKING');
    if (!hasBlocking) {
      ver.status = 'READY_FOR_PUBLICATION';
    }

    ver.updated_at = today;

    this.addDatasetAudit({
      actor: user.name,
      role: user.role,
      action: 'DATASET_APPROVED',
      entity_type: 'DATASET_VERSION',
      entity_id: ver.id,
      reason: `تأیید معنایی توسط ${ver.semantic_review.approved_by}: ${notes || 'تأیید شد'}`,
    });

    this.save();
    return ver;
  }

  public publishDatasetVersion(
    code: string,
    version: number,
    publishedBy: string,
    user: { name: string; role: string }
  ): { version: DatasetVersion; dataset: Dataset; supersededVersion?: DatasetVersion; notices: DatasetDependencyNotice[] } {
    const ds = this.getDataset(code);
    if (!ds) throw new Error(`مجموعه داده ${code} یافت نشد.`);

    const ver = this.getDatasetVersion(code, version);
    if (!ver) throw new Error(`نسخه ${code} v${version} یافت نشد.`);

    // Idempotency: if already published, return safely
    if (ver.status === 'PUBLISHED') {
      return { version: ver, dataset: ds, notices: [] };
    }

    // STRICT PUBLICATION GATES:
    if (ver.status === 'QUARANTINED') {
      throw new Error('داده‌های در قرنطینه به هیچ عنوان قابل انتشار نیستند.');
    }
    if (ver.semantic_review.status !== 'APPROVED') {
      throw new Error('انتشار نسخه داده منوط به تأیید معنایی توسط مقام ذی‌صلاح است.');
    }

    // Must be balanced reconciliation
    if (!ver.reconciliation.is_balanced) {
      throw new Error('خطای تراز رکوردها: تعداد رکوردهای ورودی با حاصل‌جمع پذیرفته، ردشده و قرنطینه همخوانی ندارد.');
    }

    // Must have no blocking issues
    const blockingCheck = ver.validation_checks.find(c => c.status === 'FAIL' && c.severity === 'BLOCKING');
    if (blockingCheck) {
      throw new Error(`امکان انتشار وجود ندارد: خطای مسدودکننده «${blockingCheck.name}» برطرف نشده است.`);
    }

    const today = '۱۴۰۵/۰۶/۲۳';

    // 1. Mark target version as PUBLISHED and IMMUTABLE
    ver.status = 'PUBLISHED';
    ver.is_immutable = true;
    ver.publication = {
      published_at: today,
      published_by: publishedBy || user.name,
      publication_checksum: `pub-chk-${ver.id}-${Date.now()}-sha256`,
    };
    ver.updated_at = today;

    // 2. Identify previous published version and mark it SUPERSEDED (Never overwrite!)
    let supersededVersion: DatasetVersion | undefined;
    const previousVersions = this.getDatasetVersions(code).filter(
      v => v.version !== version && v.status === 'PUBLISHED'
    );
    for (const prev of previousVersions) {
      prev.status = 'SUPERSEDED';
      prev.updated_at = today;
      supersededVersion = prev;

      this.addDatasetAudit({
        actor: user.name,
        role: user.role,
        action: 'DATASET_VERSION_SUPERSEDED',
        entity_type: 'DATASET_VERSION',
        entity_id: prev.id,
        before: { status: 'PUBLISHED' },
        after: { status: 'SUPERSEDED' },
        reason: `نسخه ${prev.version} به دلیل انتشار نسخه جدید ${version} به وضعیت جایگزین‌شده تغییر یافت. ارجاعات تاریخی مطالعات پین‌شده حفظ می‌شوند.`,
      });
    }

    // 3. Update Dataset current published version
    ds.current_published_version = version;
    ds.status = 'PUBLISHED';
    ds.updated_at = today;

    // 4. Notify dependent studies without breaking them!
    const notices: DatasetDependencyNotice[] = [];
    for (const studyId of ds.dependent_studies) {
      const notice: DatasetDependencyNotice = {
        id: `NOTIF-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        study_id: studyId,
        dataset_code: code,
        pinned_version: supersededVersion ? supersededVersion.version : version,
        latest_version: version,
        status: 'STALE_WARNING',
        message: `نسخه جدید داده ${ds.title} (v${version}) منتشر گردید. نسخه مورد استفاده این مطالعه تغییر نمی‌کند (پین شده به v${supersededVersion ? supersededVersion.version : version}). بررسی تأثیر بر عهده تحلیلگر است.`,
        created_at: today,
      };
      this.data.datasetDependencies.push(notice);
      notices.push(notice);

      this.addDatasetAudit({
        actor: 'سیستم',
        role: 'system',
        action: 'DATA_DEPENDENCY_MARKED_STALE',
        entity_type: 'STUDY_CASE',
        entity_id: studyId,
        reason: notice.message,
      });
    }

    this.addDatasetAudit({
      actor: user.name,
      role: user.role,
      action: 'DATASET_VERSION_PUBLISHED',
      entity_type: 'DATASET_VERSION',
      entity_id: ver.id,
      after: { status: 'PUBLISHED', version },
      reason: `انتشار رسمی نسخه ${ver.id} با چک‌سام ${ver.publication.publication_checksum}`,
    });

    this.save();
    return { version: ver, dataset: ds, supersededVersion, notices };
  }

  public compareDatasetVersions(
    code: string,
    vFrom: number,
    vTo: number
  ): {
    dataset: Dataset;
    versionFrom: DatasetVersion;
    versionTo: DatasetVersion;
    recordCountDelta: number;
    attributeDifferences: { field: string; change: string }[];
    geometryDifferences: string;
    crsDifferences: string;
    temporalDifferences: string;
    reconciliationComparison: { from: DatasetCountReconciliation; to: DatasetCountReconciliation };
    affectedStudies: string[];
  } {
    const ds = this.getDataset(code);
    if (!ds) throw new Error(`مجموعه داده ${code} یافت نشد.`);

    const fromVer = this.getDatasetVersion(code, vFrom);
    const toVer = this.getDatasetVersion(code, vTo);
    if (!fromVer || !toVer) {
      throw new Error(`یکی از نسخه‌های ${vFrom} یا ${vTo} برای مقایسه یافت نشد.`);
    }

    const delta = toVer.profile.record_count - fromVer.profile.record_count;

    // Attributes
    const fromCols = new Set(fromVer.profile.columns.map(c => c.name));
    const toCols = new Set(toVer.profile.columns.map(c => c.name));
    const attributeDifferences: { field: string; change: string }[] = [];

    for (const c of toCols) {
      if (!fromCols.has(c)) {
        attributeDifferences.push({ field: c, change: 'ستون جدید اضافه شده است.' });
      }
    }
    for (const c of fromCols) {
      if (!toCols.has(c)) {
        attributeDifferences.push({ field: c, change: 'ستون از این نسخه حذف شده است.' });
      }
    }

    const crsDifferences =
      fromVer.spatial.crs === toVer.spatial.crs
        ? `یکسان (${toVer.spatial.crs})`
        : `تغییر سامانه از ${fromVer.spatial.crs} به ${toVer.spatial.crs}`;

    const geometryDifferences =
      fromVer.spatial.geometry_type === toVer.spatial.geometry_type
        ? `یکسان (${toVer.spatial.geometry_type}) — پوشش مکانی: ${toVer.spatial.spatial_coverage_pct}٪`
        : `تغییر نوع هندسه از ${fromVer.spatial.geometry_type} به ${toVer.spatial.geometry_type}`;

    const temporalDifferences = `دوره مشاهده: از ${fromVer.temporal.observation_period || '—'} به ${toVer.temporal.observation_period || '—'}`;

    return {
      dataset: ds,
      versionFrom: fromVer,
      versionTo: toVer,
      recordCountDelta: delta,
      attributeDifferences,
      geometryDifferences,
      crsDifferences,
      temporalDifferences,
      reconciliationComparison: {
        from: fromVer.reconciliation,
        to: toVer.reconciliation,
      },
      affectedStudies: ds.dependent_studies || [],
    };
  }

  public searchCatalog(params: {
    query?: string;
    region?: string;
    time_period?: string;
    category?: string;
    status?: string;
    crs?: string;
    geometry_type?: string;
  }): {
    dataset: Dataset;
    version: DatasetVersion | null;
    match_score: number;
    match_reasons: string[];
    is_compatible: boolean;
  }[] {
    const results: {
      dataset: Dataset;
      version: DatasetVersion | null;
      match_score: number;
      match_reasons: string[];
      is_compatible: boolean;
    }[] = [];

    const q = (params.query || '').toLowerCase().trim();
    const region = (params.region || '').trim();

    for (const ds of this.data.datasets || []) {
      let score = 0;
      const reasons: string[] = [];

      if (q) {
        if (ds.code.toLowerCase().includes(q) || ds.name.toLowerCase().includes(q) || ds.title.toLowerCase().includes(q)) {
          score += 40;
          reasons.push('انطباق نام و شناسه با عبارت جستجو');
        } else if (ds.category.toLowerCase().includes(q) || ds.description.toLowerCase().includes(q)) {
          score += 20;
          reasons.push('انطباق دسته‌بندی و شرح داده');
        }
      } else {
        score += 20;
      }

      if (region && ds.region.includes(region)) {
        score += 30;
        reasons.push(`انطباق دقیق با محدوده مکانی (${ds.region})`);
      }

      if (params.category && ds.category === params.category) {
        score += 20;
        reasons.push('انطباق دسته‌بندی موضوعی');
      }

      const publishedVer = ds.current_published_version
        ? this.getDatasetVersion(ds.code, ds.current_published_version)
        : null;

      let is_compatible = false;
      if (publishedVer && publishedVer.status === 'PUBLISHED') {
        score += 20;
        reasons.push(`دارای نسخه رسمی منتشرشده (v${publishedVer.version})`);
        is_compatible = true;
      }

      if (score > 10) {
        results.push({
          dataset: ds,
          version: publishedVer || null,
          match_score: Math.min(100, score),
          match_reasons: reasons,
          is_compatible,
        });
      }
    }

    return results.sort((a, b) => b.match_score - a.match_score);
  }

  public getDataStewardKPIs(): {
    new_requests: number;
    in_progress_requests: number;
    validating_datasets: number;
    needs_correction_datasets: number;
    ready_for_pub: number;
    published_datasets: number;
    quarantined_datasets: number;
    stale_datasets: number;
    affected_studies: number;
  } {
    const reqs = this.data.dataRequests || [];
    const vers = this.data.datasetVersions || [];
    const deps = this.data.datasetDependencies || [];

    return {
      new_requests: reqs.filter(r => r.status === 'REQUESTED').length,
      in_progress_requests: reqs.filter(r => r.status === 'IN_PROGRESS').length,
      validating_datasets: vers.filter(v => ['VALIDATING', 'PROFILING', 'MAPPING'].includes(v.status)).length,
      needs_correction_datasets: vers.filter(v => v.status === 'NEEDS_CORRECTION').length,
      ready_for_pub: vers.filter(v => v.status === 'READY_FOR_PUBLICATION' || (v.status === 'APPROVED' && !v.publication.published_at)).length,
      published_datasets: (this.data.datasets || []).filter(d => d.status === 'PUBLISHED' && d.current_published_version).length,
      quarantined_datasets: vers.filter(v => v.status === 'QUARANTINED').length,
      stale_datasets: vers.filter(v => v.temporal.is_stale && v.status === 'PUBLISHED').length,
      affected_studies: deps.filter(d => d.status === 'STALE_WARNING').length,
    };
  }

  public getDataStewardQueues(): {
    requests_queue: {
      request: DataRequest;
      requirement?: DataRequirement;
      studyCase?: StudyCase;
    }[];
    quality_queue: {
      version: DatasetVersion;
      dataset?: Dataset;
      critical_issues: DatasetValidationIssue[];
    }[];
    publication_queue: {
      version: DatasetVersion;
      dataset?: Dataset;
      semantic_status: string;
    }[];
    dependencies_queue: {
      notice: DatasetDependencyNotice;
      studyCase?: StudyCase;
      dataset?: Dataset;
    }[];
  } {
    const requests_queue = (this.data.dataRequests || [])
      .filter(r => ['REQUESTED', 'IN_PROGRESS'].includes(r.status))
      .map(r => ({
        request: r,
        requirement: (this.data.dataRequirements || []).find(rq => rq.id === r.data_requirement_id),
        studyCase: (this.data.studyCases || []).find(sc => sc.id === r.study_case_id),
      }));

    const quality_queue = (this.data.datasetVersions || [])
      .filter(v => ['QUARANTINED', 'NEEDS_CORRECTION'].includes(v.status))
      .map(v => ({
        version: v,
        dataset: (this.data.datasets || []).find(d => d.code === v.dataset_code),
        critical_issues: v.issues || [],
      }));

    const publication_queue = (this.data.datasetVersions || [])
      .filter(v => ['READY_FOR_PUBLICATION', 'APPROVED', 'VALIDATED'].includes(v.status) && !v.publication.published_at)
      .map(v => ({
        version: v,
        dataset: (this.data.datasets || []).find(d => d.code === v.dataset_code),
        semantic_status: v.semantic_review.status,
      }));

    const dependencies_queue = (this.data.datasetDependencies || [])
      .filter(n => n.status === 'STALE_WARNING')
      .map(n => ({
        notice: n,
        studyCase: (this.data.studyCases || []).find(sc => sc.id === n.study_case_id || sc.study_id === n.study_id),
        dataset: (this.data.datasets || []).find(d => d.code === n.dataset_code),
      }));

    return {
      requests_queue,
      quality_queue,
      publication_queue,
      dependencies_queue,
    };
  }

  public getDatasetAuditLog(entityId?: string): DatasetAudit[] {
    const list = this.data.datasetAudits || [];
    if (!entityId) return list.slice().reverse();
    return list.filter(a => a.entity_id === entityId || a.entity_id.startsWith(entityId)).reverse();
  }

  private addDatasetAudit(audit: Omit<DatasetAudit, 'id' | 'timestamp'>) {
    if (!this.data.datasetAudits) this.data.datasetAudits = [];
    const id = `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = '۱۴۰۵/۰۶/۲۳، ' + new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    this.data.datasetAudits.push({
      ...audit,
      id,
      timestamp: now,
    });
  }

  /* ============================================================
     RULE STEWARD & URBAN PLANNING RULES LIFECYCLE METHODS
     ============================================================ */

  public getRules(filters?: {
    category?: string;
    jurisdiction?: string;
    status?: string;
    owner?: string;
    severity?: string;
    rule_pack?: string;
    search?: string;
    study_id?: string;
  }): (Rule & { published_version_obj?: RuleVersion; latest_version_obj?: RuleVersion; has_unresolved_conflict?: boolean })[] {
    const list = this.data.rules || [];
    const precedences = this.data.rulePrecedences || [];

    return list
      .filter(r => {
        if (filters?.category && r.category !== filters.category) return false;
        if (filters?.jurisdiction && !r.jurisdiction.includes(filters.jurisdiction)) return false;
        if (filters?.owner && !r.owner.includes(filters.owner)) return false;
        if (filters?.rule_pack && !(r.rule_pack_ids || []).includes(filters.rule_pack)) return false;
        if (filters?.study_id && !(r.dependent_study_ids || []).includes(filters.study_id)) return false;

        if (filters?.search) {
          const q = filters.search.toLowerCase();
          const match =
            r.code.toLowerCase().includes(q) ||
            r.title.toLowerCase().includes(q) ||
            r.category.toLowerCase().includes(q) ||
            r.jurisdiction.toLowerCase().includes(q);
          if (!match) return false;
        }

        const currentV = (this.data.ruleVersions || []).find(
          v => v.rule_code === r.code && v.version_number === r.current_published_version
        );
        if (filters?.status && currentV && currentV.status !== filters.status) return false;
        if (filters?.severity && currentV && currentV.severity !== filters.severity) return false;

        return true;
      })
      .map(r => {
        const published_version_obj = (this.data.ruleVersions || []).find(
          v => v.rule_code === r.code && v.version_number === r.current_published_version
        );
        const latest_version_obj = (this.data.ruleVersions || []).find(
          v => v.rule_code === r.code && v.version_number === r.latest_version
        );

        // Check if there are any pending unresolved conflicts for this rule
        const has_unresolved_conflict = precedences.some(
          p => (p.target_rule_code === r.code || p.precedes_rule_code === r.code) && p.status === 'PROPOSED'
        );

        return {
          ...r,
          published_version_obj,
          latest_version_obj,
          has_unresolved_conflict,
        };
      });
  }

  public getRule(code: string): {
    rule: Rule;
    versions: RuleVersion[];
    currentVersion?: RuleVersion;
    rulePacks: RulePack[];
    dependentStudies: StudyCase[];
    precedences: RulePrecedence[];
  } | null {
    const rule = (this.data.rules || []).find(r => r.code === code);
    if (!rule) return null;

    const versions = (this.data.ruleVersions || [])
      .filter(v => v.rule_code === code)
      .sort((a, b) => b.version_number - a.version_number);

    const currentVersion = versions.find(v => v.version_number === rule.current_published_version) || versions[0];

    const rulePacks = (this.data.rulePacks || []).filter(p => (rule.rule_pack_ids || []).includes(p.id));

    const dependentStudies = (this.data.studyCases || []).filter(sc =>
      (rule.dependent_study_ids || []).includes(sc.id) || (rule.dependent_study_ids || []).includes(sc.study_id)
    );

    const precedences = (this.data.rulePrecedences || []).filter(
      p => p.target_rule_code === code || p.precedes_rule_code === code
    );

    return {
      rule,
      versions,
      currentVersion,
      rulePacks,
      dependentStudies,
      precedences,
    };
  }

  public createRule(
    data: {
      code: string;
      title: string;
      category: any;
      jurisdiction: string;
      description?: string;
      source: any;
      inputs: any[];
      applicability_ast: any;
      assertion_ast: any;
      severity: 'BLOCKING' | 'WARNING';
      effective_from: string;
      effective_to?: string | null;
      interpretation_notes?: string;
      test_cases?: any[];
      rule_pack_ids?: string[];
    },
    actor: { name: string; role: string }
  ): { rule: Rule; version: RuleVersion } {
    if (!data.code || !data.title || !data.category || !data.jurisdiction) {
      throw new Error('کد ضابطه، عنوان، دسته‌بندی و حوزه جغرافیایی/صلاحیت الزامی است.');
    }

    const existing = (this.data.rules || []).find(r => r.code === data.code);
    if (existing) {
      throw new Error(`ضابطه با کد «${data.code}» قبلاً در سامانه ثبت شده است.`);
    }

    const today = '۱۴۰۵/۰۶/۲۳';

    const versionId = `${data.code}-v1`;
    const initialVersion: RuleVersion = {
      version_id: versionId,
      rule_code: data.code,
      version_number: 1,
      title: data.title,
      description: data.description || '',
      category: data.category,
      jurisdiction: data.jurisdiction,
      source: {
        document: data.source?.document || 'در حال تکمیل مستندات منبع',
        version: data.source?.version || 'نسخه ۱',
        issuer: data.source?.issuer || 'مراجع قانونی شهرسازی',
        document_date: data.source?.document_date || today,
        page: data.source?.page || null,
        clause: data.source?.clause || '',
        effective_from: data.effective_from || today,
        effective_to: data.effective_to || null,
        source_uri: data.source?.source_uri || '',
        evidence: data.source?.evidence || '',
        verification_status: data.source?.document ? 'VERIFIED' : 'SOURCE_INCOMPLETE',
      },
      inputs: data.inputs || [],
      applicability_ast: data.applicability_ast || { type: 'literal', data_type: 'boolean', value: true },
      assertion_ast: data.assertion_ast || { type: 'literal', data_type: 'boolean', value: true },
      human_readable: renderASTToPersian(data.assertion_ast, data.inputs),
      severity: data.severity || 'BLOCKING',
      interpretation_notes: data.interpretation_notes || '',
      exceptions: [],
      precedences: [],
      test_cases: data.test_cases || [],
      test_runs: [],
      status: 'DRAFT',
      content_hash: '',
      source_hash: '',
      created_at: today,
      created_by: actor.name,
      effective_from: data.effective_from || today,
      effective_to: data.effective_to || null,
      is_synthetic: false,
    };

    initialVersion.content_hash = computeRuleContentHash(initialVersion);
    initialVersion.source_hash = computeSourceHash(initialVersion.source);

    const newRule: Rule = {
      code: data.code,
      title: data.title,
      category: data.category,
      jurisdiction: data.jurisdiction,
      current_published_version: 1,
      latest_version: 1,
      owner: actor.name,
      created_at: today,
      updated_at: today,
      rule_pack_ids: data.rule_pack_ids || ['PACK-TEH-2026'],
      dependent_study_ids: [],
    };

    if (!this.data.rules) this.data.rules = [];
    if (!this.data.ruleVersions) this.data.ruleVersions = [];

    this.data.rules.push(newRule);
    this.data.ruleVersions.push(initialVersion);

    this.recordRuleAudit({
      actor: actor.name,
      role: actor.role,
      action: 'RULE_CREATED',
      entity: 'RULE',
      entity_id: data.code,
      reason: `ایجاد اولیه ضابطه با نسخه v1 در وضعیت DRAFT`,
      content_hash: initialVersion.content_hash,
    });

    this.save();
    return { rule: newRule, version: initialVersion };
  }

  public getRuleVersions(code: string): RuleVersion[] {
    return (this.data.ruleVersions || [])
      .filter(v => v.rule_code === code)
      .sort((a, b) => b.version_number - a.version_number);
  }

  public getRuleVersion(code: string, versionNumber: number): RuleVersion | null {
    return (
      (this.data.ruleVersions || []).find(
        v => v.rule_code === code && v.version_number === Number(versionNumber)
      ) || null
    );
  }

  public createRuleVersion(
    code: string,
    data: Partial<RuleVersion>,
    actor: { name: string; role: string }
  ): RuleVersion {
    const rule = (this.data.rules || []).find(r => r.code === code);
    if (!rule) throw new Error(`ضابطه با کد ${code} یافت نشد.`);

    const existingVersions = (this.data.ruleVersions || []).filter(v => v.rule_code === code);
    const nextVersionNumber = Math.max(...existingVersions.map(v => v.version_number), 0) + 1;
    const versionId = `${code}-v${nextVersionNumber}`;
    const today = '۱۴۰۵/۰۶/۲۳';

    // Base on previous version if fields are omitted
    const prev = existingVersions.find(v => v.version_number === rule.latest_version) || existingVersions[0];

    const newVersion: RuleVersion = {
      version_id: versionId,
      rule_code: code,
      version_number: nextVersionNumber,
      title: data.title || prev?.title || rule.title,
      description: data.description || prev?.description || '',
      category: data.category || prev?.category || rule.category,
      jurisdiction: data.jurisdiction || prev?.jurisdiction || rule.jurisdiction,
      source: data.source || prev?.source || {
        document: 'منبع اعلامی',
        version: '۱',
        issuer: 'مراجع رسمی',
        effective_from: today,
        verification_status: 'SOURCE_INCOMPLETE',
      },
      inputs: data.inputs || prev?.inputs || [],
      applicability_ast: data.applicability_ast || prev?.applicability_ast || { type: 'literal', data_type: 'boolean', value: true },
      assertion_ast: data.assertion_ast || prev?.assertion_ast || { type: 'literal', data_type: 'boolean', value: true },
      human_readable: renderASTToPersian(data.assertion_ast || prev?.assertion_ast, data.inputs || prev?.inputs),
      severity: data.severity || prev?.severity || 'BLOCKING',
      interpretation_notes: data.interpretation_notes || prev?.interpretation_notes || '',
      exceptions: data.exceptions || [],
      precedences: data.precedences || [],
      test_cases: data.test_cases || prev?.test_cases || [],
      test_runs: [],
      status: 'DRAFT',
      content_hash: '',
      source_hash: '',
      created_at: today,
      created_by: actor.name,
      effective_from: data.effective_from || prev?.effective_from || today,
      effective_to: data.effective_to || null,
      is_synthetic: false,
    };

    newVersion.content_hash = computeRuleContentHash(newVersion);
    newVersion.source_hash = computeSourceHash(newVersion.source);

    this.data.ruleVersions.push(newVersion);
    rule.latest_version = nextVersionNumber;
    rule.updated_at = today;

    this.recordRuleAudit({
      actor: actor.name,
      role: actor.role,
      action: 'RULE_UPDATED',
      entity: 'RULE_VERSION',
      entity_id: versionId,
      reason: `ایجاد نسخه جدید v${nextVersionNumber} در وضعیت پیش‌نویس (DRAFT)`,
      content_hash: newVersion.content_hash,
    });

    this.save();
    return newVersion;
  }

  public updateRuleSource(
    code: string,
    versionNumber: number,
    source: any,
    actor: { name: string; role: string }
  ): RuleVersion {
    const v = this.getRuleVersion(code, versionNumber);
    if (!v) throw new Error(`نسخه ضابطه ${code} v${versionNumber} یافت نشد.`);
    if (v.status === 'PUBLISHED' || v.status === 'SUPERSEDED') {
      throw new Error('قاعده تغییرناپذیری (Immutability): نسخه‌های منتشرشده یا بایگانی‌شده قابل ویرایش نیستند. لطفاً یک نسخه جدید بسازید.');
    }

    const isComplete =
      source.document &&
      source.version &&
      source.issuer &&
      source.document_date &&
      source.clause;

    v.source = {
      ...v.source,
      ...source,
      verification_status: isComplete ? 'VERIFIED' : 'SOURCE_INCOMPLETE',
    };
    v.source_hash = computeSourceHash(v.source);
    v.content_hash = computeRuleContentHash(v);

    // If source changes in review, invalidate approval
    if (v.approval_hash) {
      delete v.approval_hash;
      delete v.approved_by;
      delete v.approved_at;
      v.status = 'DRAFT';
    }

    this.recordRuleAudit({
      actor: actor.name,
      role: actor.role,
      action: 'RULE_SOURCE_ADDED',
      entity: 'RULE_VERSION',
      entity_id: v.version_id,
      reason: `به‌روزرسانی استناد قانونی و محاسبه هش منبع: ${v.source_hash}`,
      content_hash: v.content_hash,
    });

    this.save();
    return v;
  }

  public validateRule(
    code: string,
    versionNumber: number,
    actor: { name: string; role: string }
  ): { valid: boolean; errors: string[]; version: RuleVersion } {
    const v = this.getRuleVersion(code, versionNumber);
    if (!v) throw new Error(`نسخه ضابطه ${code} v${versionNumber} یافت نشد.`);

    const errors: string[] = [];

    // 1. Source check
    if (!v.source || !v.source.document) {
      errors.push('RULE_MISSING_SOURCE: استناد به سند مصوب رسمی برای این ضابطه الزامی است.');
    }
    if (v.source?.verification_status === 'SOURCE_INCOMPLETE') {
      errors.push('RULE_INCOMPLETE_SOURCE: فیلدهای بند، صفحه، مرجع صادرکننده یا تاریخ ابلاغ سند ناقص است.');
    }

    // 2. Input types & units check
    for (const inp of v.inputs || []) {
      if (!inp.name || !inp.data_type) {
        errors.push(`فیلد ورودی «${inp.name || 'بی‌نام'}» فاقد نوع داده (data_type) معتبر است.`);
      }
      if ((inp.data_type === 'number' || inp.data_type === 'integer') && !inp.unit) {
        errors.push(`فیلد عددی «${inp.name}» فاقد واحد مشخص است. تمام مقادیر کمی شهرسازی باید واحد صریح داشته باشند.`);
      }
    }

    // 3. Applicability AST check
    const appValid = validateAST(v.applicability_ast, v.inputs);
    if (!appValid.valid) errors.push(...appValid.errors);

    // 4. Assertion AST check
    const assertValid = validateAST(v.assertion_ast, v.inputs);
    if (!assertValid.valid) errors.push(...assertValid.errors);

    const valid = errors.length === 0;
    if (valid && (v.status === 'DRAFT' || v.status === 'SOURCE_VERIFICATION')) {
      v.status = 'SCHEMA_VALID';
    }

    this.recordRuleAudit({
      actor: actor.name,
      role: actor.role,
      action: 'RULE_VALIDATED',
      entity: 'RULE_VERSION',
      entity_id: v.version_id,
      reason: valid ? 'تأیید ساختار گرامری AST، انواع داده و استناد قانونی' : `رد اعتبارسنجی: ${errors.join(' | ')}`,
      content_hash: v.content_hash,
    });

    this.save();
    return { valid, errors, version: v };
  }

  public testRule(
    code: string,
    versionNumber: number,
    actor: { name: string; role: string }
  ): { allPassed: boolean; runs: any[]; version: RuleVersion } {
    const v = this.getRuleVersion(code, versionNumber);
    if (!v) throw new Error(`نسخه ضابطه ${code} v${versionNumber} یافت نشد.`);

    if (!v.test_cases || v.test_cases.length === 0) {
      throw new Error('RULE_NO_TEST_CASES: هیچ مورد آزمون (Test Case) برای این ضابطه ثبت نشده است. ضابطه باید حداقل شامل آزمون‌های مرزی، حالت عادی و داده‌های مفقود باشد.');
    }

    const { allPassed, runs } = runAllRuleTests(v);
    v.test_runs = runs;

    if (allPassed && v.status === 'SCHEMA_VALID') {
      v.status = 'READY_FOR_REVIEW';
    }

    this.recordRuleAudit({
      actor: actor.name,
      role: actor.role,
      action: 'RULE_TESTED',
      entity: 'RULE_VERSION',
      entity_id: v.version_id,
      reason: `اجرای ${runs.length} مورد آزمون — نتیجه: ${allPassed ? 'تماماً موفق (READY_FOR_REVIEW)' : 'دارای خطا'}`,
      content_hash: v.content_hash,
    });

    this.save();
    return { allPassed, runs, version: v };
  }

  public getRuleTests(code: string, versionNumber: number): { test_cases: any[]; test_runs: any[] } {
    const v = this.getRuleVersion(code, versionNumber);
    if (!v) throw new Error(`نسخه ضابطه ${code} v${versionNumber} یافت نشد.`);
    return {
      test_cases: v.test_cases || [],
      test_runs: v.test_runs || [],
    };
  }

  public submitRuleForReview(
    code: string,
    versionNumber: number,
    actor: { name: string; role: string }
  ): RuleVersion {
    const v = this.getRuleVersion(code, versionNumber);
    if (!v) throw new Error(`نسخه ضابطه ${code} v${versionNumber} یافت نشد.`);

    // Publication gates
    if (!v.source || v.source.verification_status === 'SOURCE_INCOMPLETE') {
      throw new Error('RULE_MISSING_SOURCE: استناد قانونی ضابطه ناقص یا ثبت‌نشده است. ارسال برای بررسی ممنوع می‌باشد.');
    }
    const { allPassed } = runAllRuleTests(v);
    if (!allPassed) {
      throw new Error('RULE_TESTS_NOT_PASSED: کلیه آزمون‌های مرزی و منطقی ضابطه باید قبل از ارسال برای بررسی پاس شده باشند.');
    }

    v.status = 'IN_REVIEW';
    this.recordRuleAudit({
      actor: actor.name,
      role: actor.role,
      action: 'RULE_SUBMITTED_FOR_REVIEW',
      entity: 'RULE_VERSION',
      entity_id: v.version_id,
      reason: 'ارسال نسخه ضابطه جهت بازبینی کمیسیون تخصصی شهرسازی و حقوقی',
      content_hash: v.content_hash,
    });

    this.save();
    return v;
  }

  public approveRule(
    code: string,
    versionNumber: number,
    approverName: string,
    notes: string,
    actor: { name: string; role: string }
  ): RuleVersion {
    const v = this.getRuleVersion(code, versionNumber);
    if (!v) throw new Error(`نسخه ضابطه ${code} v${versionNumber} یافت نشد.`);

    // Separation of Duties (SoD)
    if (actor.name && v.created_by && actor.name.trim() === v.created_by.trim() && actor.role !== 'admin') {
      throw new Error('اصل تفکیک وظایف (Separation of Duties): متولی تدوین‌کننده ضابطه اجازه تأیید نهایی آن را ندارد. تأیید باید توسط کارشناس ارشد ممیزی/کمیسیون تخصصی شهرسازی انجام شود.');
    }

    if (v.status !== 'IN_REVIEW' && v.status !== 'READY_FOR_REVIEW') {
      throw new Error(`ضابطه در وضعیت ${v.status} قابل تأیید نیست. وضعیت باید IN_REVIEW باشد.`);
    }

    const today = '۱۴۰۵/۰۶/۲۳';
    v.status = 'APPROVED';
    v.approved_by = approverName || actor.name;
    v.approved_at = today;
    v.approval_hash = v.content_hash; // Cryptographically seal to current content hash

    this.recordRuleAudit({
      actor: actor.name,
      role: actor.role,
      action: 'RULE_APPROVED',
      entity: 'RULE_VERSION',
      entity_id: v.version_id,
      reason: notes || 'تأیید رسمی انطباق حقوقی و صحت درخت AST توسط کمیسیون تخصصی',
      content_hash: v.content_hash,
    });

    this.save();
    return v;
  }

  public rejectRule(
    code: string,
    versionNumber: number,
    reason: string,
    actor: { name: string; role: string }
  ): RuleVersion {
    if (!reason || !reason.trim()) {
      throw new Error('علت رد ضابطه الزامی است.');
    }
    const v = this.getRuleVersion(code, versionNumber);
    if (!v) throw new Error(`نسخه ضابطه ${code} v${versionNumber} یافت نشد.`);

    v.status = 'DRAFT';
    delete v.approved_by;
    delete v.approved_at;
    delete v.approval_hash;

    this.recordRuleAudit({
      actor: actor.name,
      role: actor.role,
      action: 'RULE_REJECTED',
      entity: 'RULE_VERSION',
      entity_id: v.version_id,
      reason: `رد ضابطه توسط بازبین: ${reason.trim()}`,
      content_hash: v.content_hash,
    });

    this.save();
    return v;
  }

  public requestRuleChanges(
    code: string,
    versionNumber: number,
    reason: string,
    actor: { name: string; role: string }
  ): RuleVersion {
    if (!reason || !reason.trim()) {
      throw new Error('شرح اصلاحات مورد نیاز الزامی است.');
    }
    const v = this.getRuleVersion(code, versionNumber);
    if (!v) throw new Error(`نسخه ضابطه ${code} v${versionNumber} یافت نشد.`);

    v.status = 'DRAFT';
    this.recordRuleAudit({
      actor: actor.name,
      role: actor.role,
      action: 'RULE_UPDATED',
      entity: 'RULE_VERSION',
      entity_id: v.version_id,
      reason: `درخواست اصلاحات تکمیلی: ${reason.trim()}`,
      content_hash: v.content_hash,
    });

    this.save();
    return v;
  }

  public withdrawRule(
    code: string,
    versionNumber: number,
    reason: string,
    actor: { name: string; role: string }
  ): { version: RuleVersion; affectedStudiesCount: number } {
    if (!reason || !reason.trim()) {
      throw new Error('علت ابطال/خروج از اعتبار ضابطه الزامی است.');
    }
    const v = this.getRuleVersion(code, versionNumber);
    if (!v) throw new Error(`نسخه ضابطه ${code} v${versionNumber} یافت نشد.`);

    v.status = 'WITHDRAWN';
    v.effective_to = '۱۴۰۵/۰۶/۲۳';

    // Check affected studies
    const affectedReqs = (this.data.ruleRequirements || []).filter(
      r => r.rule_code === code && r.attached_rule_version === versionNumber
    );

    for (const req of affectedReqs) {
      req.status = 'SUPERSEDED';
      req.satisfied = false;
      this.recalculateStudyCaseBlockingState(req.study_case_id);
    }

    this.recordRuleAudit({
      actor: actor.name,
      role: actor.role,
      action: 'RULE_WITHDRAWN',
      entity: 'RULE_VERSION',
      entity_id: v.version_id,
      reason: `ابطال نسخه ضابطه: ${reason.trim()}`,
      content_hash: v.content_hash,
    });

    this.save();
    return { version: v, affectedStudiesCount: affectedReqs.length };
  }

  public evaluateRule(input: RuleEvaluationInput): RuleEvaluationOutput {
    const v = this.getRuleVersion(input.rule_code, input.rule_version);
    if (!v) {
      throw new Error(`نسخه ضابطه ${input.rule_code} v${input.rule_version} یافت نشد.`);
    }

    const evalResult = evaluateRuleVersion(v, input.inputs, input.units || {}, {
      reference_date: input.reference_date,
      study_id: input.study_id,
      scenario_id: input.scenario_id,
    });

    const isHistorical = v.status === 'SUPERSEDED' || v.status === 'WITHDRAWN';

    const output: RuleEvaluationOutput = {
      rule_code: v.rule_code,
      rule_version: v.version_number,
      rule_title: v.title,
      applicability: evalResult.applicability,
      outcome: evalResult.outcome,
      conflict_status: evalResult.conflict_status,
      applied_precedence_policy: undefined,
      input_values: evalResult.input_values,
      unit_checks: evalResult.unit_checks,
      missing_inputs: evalResult.missing_inputs,
      human_readable_logic: v.human_readable,
      explanation: evalResult.explanation,
      source_reference: evalResult.source_reference,
      evaluation_timestamp: evalResult.evaluation_timestamp,
      is_historical_reproducibility: isHistorical,
      hash_signature: v.content_hash,
    };

    return output;
  }

  public sandboxEvaluateRule(
    code: string,
    versionNumber: number,
    inputs: Record<string, any>,
    units: Record<string, string> = {}
  ): RuleEvaluationOutput & { label: string } {
    const res = this.evaluateRule({
      rule_code: code,
      rule_version: versionNumber,
      inputs,
      units,
    });
    return {
      ...res,
      label: 'EXPLORATORY_SANDBOX_EVALUATION',
    };
  }

  public getRuleConflicts(code?: string): {
    hasConflicts: boolean;
    conflicts: {
      rule_a: { code: string; title: string };
      rule_b: { code: string; title: string };
      status: 'none' | 'resolved' | 'unresolved';
      precedence?: RulePrecedence;
      description: string;
    }[];
  } {
    const rules = this.data.rules || [];
    const precedences = this.data.rulePrecedences || [];
    const conflicts: any[] = [];

    // Group rules by category
    const byCategory: Record<string, Rule[]> = {};
    for (const r of rules) {
      if (code && r.code !== code) continue;
      if (!byCategory[r.category]) byCategory[r.category] = [];
      byCategory[r.category].push(r);
    }

    for (const cat in byCategory) {
      const catRules = byCategory[cat];
      if (catRules.length > 1) {
        for (let i = 0; i < catRules.length; i++) {
          for (let j = i + 1; j < catRules.length; j++) {
            const rA = catRules[i];
            const rB = catRules[j];

            const prec = precedences.find(
              p =>
                (p.target_rule_code === rA.code && p.precedes_rule_code === rB.code) ||
                (p.target_rule_code === rB.code && p.precedes_rule_code === rA.code)
            );

            const isResolved = prec && prec.status === 'APPROVED';

            conflicts.push({
              rule_a: { code: rA.code, title: rA.title },
              rule_b: { code: rB.code, title: rB.title },
              status: isResolved ? 'resolved' : 'unresolved',
              precedence: prec,
              description: isResolved
                ? `تعارض تقدم توسط مرجع «${prec.authority}» حل و فصل شده است. ضابطه حاکم: «${prec.target_rule_code}».`
                : `تعارض احکام بالقوه در رسته ${cat} میان دو ضابطه شناسایی شد و هیچ تقدم مصوبی ثبت نشده است. بدون تقدم مصوب، ارزیابی ترکیبی مسدود (BLOCKED) است.`,
            });
          }
        }
      }
    }

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
    };
  }

  public resolveRuleConflict(
    targetCode: string,
    precedesCode: string,
    precedenceData: {
      authority: string;
      source: string;
      effective_from: string;
      effective_to?: string | null;
      rationale: string;
    },
    actor: { name: string; role: string }
  ): RulePrecedence {
    if (!targetCode || !precedesCode || !precedenceData.authority || !precedenceData.source) {
      throw new Error('کد ضابطه حاکم، کد ضابطه مغلوب، مرجع حقوقی صادرکننده و سند تقدم الزامی است.');
    }

    if (!this.data.rulePrecedences) this.data.rulePrecedences = [];

    const existingIndex = this.data.rulePrecedences.findIndex(
      p =>
        (p.target_rule_code === targetCode && p.precedes_rule_code === precedesCode) ||
        (p.target_rule_code === precedesCode && p.precedes_rule_code === targetCode)
    );

    const newPrec: RulePrecedence = {
      id: existingIndex >= 0 ? this.data.rulePrecedences[existingIndex].id : `PREC-${Date.now().toString(36)}`,
      target_rule_code: targetCode,
      precedes_rule_code: precedesCode,
      authority: precedenceData.authority,
      source: precedenceData.source,
      effective_from: precedenceData.effective_from || '۱۴۰۵/۰۶/۲۳',
      effective_to: precedenceData.effective_to || null,
      rationale: precedenceData.rationale,
      status: 'APPROVED',
    };

    if (existingIndex >= 0) {
      this.data.rulePrecedences[existingIndex] = newPrec;
    } else {
      this.data.rulePrecedences.push(newPrec);
    }

    this.recordRuleAudit({
      actor: actor.name,
      role: actor.role,
      action: 'RULE_CONFLICT_RESOLVED',
      entity: 'RULE_PRECEDENCE',
      entity_id: newPrec.id,
      reason: `تعیین تقدم حقوقی ضابطه «${targetCode}» بر «${precedesCode}» به استناد مصوبه ${precedenceData.authority}`,
    });

    this.save();
    return newPrec;
  }

  public getRuleDependencies(code: string): {
    rule_code: string;
    rule_packs: RulePack[];
    dependent_studies: StudyCase[];
    rule_requirements: RuleRequirement[];
  } {
    const rule = (this.data.rules || []).find(r => r.code === code);
    if (!rule) throw new Error(`ضابطه با کد ${code} یافت نشد.`);

    const rule_packs = (this.data.rulePacks || []).filter(p => (rule.rule_pack_ids || []).includes(p.id));

    const rule_requirements = (this.data.ruleRequirements || []).filter(r => r.rule_code === code);

    const studyIds = new Set([
      ...(rule.dependent_study_ids || []),
      ...rule_requirements.map(r => r.study_case_id),
    ]);

    const dependent_studies = (this.data.studyCases || []).filter(sc =>
      studyIds.has(sc.id) || studyIds.has(sc.study_id)
    );

    return {
      rule_code: code,
      rule_packs,
      dependent_studies,
      rule_requirements,
    };
  }

  public getRuleImpact(
    code: string,
    fromVersion?: number,
    toVersion?: number
  ): RuleImpactAssessment {
    const rule = (this.data.rules || []).find(r => r.code === code);
    if (!rule) throw new Error(`ضابطه با کد ${code} یافت نشد.`);

    const fromVNum = fromVersion || Math.max(1, rule.latest_version - 1);
    const toVNum = toVersion || rule.latest_version;

    const fromV = this.getRuleVersion(code, fromVNum);
    const toV = this.getRuleVersion(code, toVNum);

    const deps = this.getRuleDependencies(code);

    const structuralChanges: string[] = [];
    if (fromV && toV) {
      if (fromV.source_hash !== toV.source_hash) structuralChanges.push('منبع استناد قانونی یا بند مصوب تغییر یافته است.');
      if (JSON.stringify(fromV.applicability_ast) !== JSON.stringify(toV.applicability_ast)) structuralChanges.push('دامنه شمول یا شرایط مکانی ضابطه تغییر کرده است.');
      if (JSON.stringify(fromV.assertion_ast) !== JSON.stringify(toV.assertion_ast)) structuralChanges.push('گزاره ریاضی یا حدود مجاز ضابطه اصلاح شده است.');
      if (fromV.inputs.length !== toV.inputs.length) structuralChanges.push('تعداد یا نوع ورودی‌های موردنیاز ضابطه تغییر یافته است.');
      if (fromV.severity !== toV.severity) structuralChanges.push(`سطح بازدارندگی از ${fromV.severity} به ${toV.severity} تغییر کرد.`);
    }

    return {
      rule_code: code,
      from_version: fromVNum,
      to_version: toVNum,
      affected_studies: deps.dependent_studies.map(s => ({
        study_id: s.id,
        study_title: s.title,
        status: s.status,
      })),
      affected_scenarios: deps.dependent_studies.flatMap(s =>
        (this.data.scenarios || []).filter(sc => sc.study_case_id === s.id).map(sc => ({
          scenario_id: sc.scenario_id,
          scenario_name: sc.name,
        }))
      ),
      affected_rule_packs: deps.rule_packs.map(p => ({
        pack_id: p.id,
        pack_title: p.title,
      })),
      structural_changes: structuralChanges,
      backward_compatible: structuralChanges.length === 0,
      requires_re_evaluation: structuralChanges.length > 0,
    };
  }

  /* ------------------------------------------------------------
     RULE PACKS (Immutable Bundles)
     ------------------------------------------------------------ */

  public getRulePacks(): (RulePack & { published_version_obj?: RulePackVersion; latest_version_obj?: RulePackVersion })[] {
    const list = this.data.rulePacks || [];
    return list.map(p => {
      const published_version_obj = (this.data.rulePackVersions || []).find(
        v => v.pack_id === p.id && v.version_number === p.current_published_version
      );
      const latest_version_obj = (this.data.rulePackVersions || []).find(
        v => v.pack_id === p.id && v.version_number === p.latest_version
      );
      return {
        ...p,
        published_version_obj,
        latest_version_obj,
      };
    });
  }

  public getRulePack(id: string): {
    pack: RulePack;
    versions: RulePackVersion[];
    currentVersion?: RulePackVersion;
    rules: Rule[];
  } | null {
    const pack = (this.data.rulePacks || []).find(p => p.id === id);
    if (!pack) return null;

    const versions = (this.data.rulePackVersions || [])
      .filter(v => v.pack_id === id)
      .sort((a, b) => b.version_number - a.version_number);

    const currentVersion = versions.find(v => v.version_number === pack.current_published_version) || versions[0];

    const ruleCodes = new Set((currentVersion?.rules || []).map(r => r.rule_code));
    const rules = (this.data.rules || []).filter(r => ruleCodes.has(r.code) || (r.rule_pack_ids || []).includes(id));

    return {
      pack,
      versions,
      currentVersion,
      rules,
    };
  }

  public createRulePack(
    data: {
      id: string;
      code: string;
      title: string;
      description?: string;
      jurisdiction: string;
      rules: { rule_code: string; version_number: number }[];
    },
    actor: { name: string; role: string }
  ): RulePack {
    const existing = (this.data.rulePacks || []).find(p => p.id === data.id);
    if (existing) throw new Error(`بسته ضوابط با شناسه ${data.id} قبلاً ثبت شده است.`);

    const today = '۱۴۰۵/۰۶/۲۳';

    const packVersionId = `${data.id}-v1`;
    const versionRules = (data.rules || []).map(r => {
      const rv = this.getRuleVersion(r.rule_code, r.version_number);
      return {
        rule_code: r.rule_code,
        version_number: r.version_number,
        version_id: rv?.version_id || `${r.rule_code}-v${r.version_number}`,
        content_hash: rv?.content_hash || '',
      };
    });

    const initialPackVersion: RulePackVersion = {
      pack_version_id: packVersionId,
      pack_id: data.id,
      version_number: 1,
      version_tag: `${data.id}-v1`,
      title: `${data.title} — نسخه ۱`,
      jurisdiction: data.jurisdiction,
      rules: versionRules,
      status: 'DRAFT',
      content_hash: `pack-hash-${Date.now().toString(36)}`,
      effective_from: today,
      effective_to: null,
      notes: 'پیش‌نویس اولیه بسته ضوابط',
    };

    const newPack: RulePack = {
      id: data.id,
      code: data.code || data.id,
      title: data.title,
      description: data.description || '',
      jurisdiction: data.jurisdiction,
      current_published_version: 1,
      latest_version: 1,
      owner: actor.name,
      dependent_study_ids: [],
      created_at: today,
      updated_at: today,
    };

    if (!this.data.rulePacks) this.data.rulePacks = [];
    if (!this.data.rulePackVersions) this.data.rulePackVersions = [];

    this.data.rulePacks.push(newPack);
    this.data.rulePackVersions.push(initialPackVersion);

    this.recordRuleAudit({
      actor: actor.name,
      role: actor.role,
      action: 'RULE_CREATED',
      entity: 'RULE_PACK',
      entity_id: data.id,
      reason: `ایجاد اولیه بسته ضوابط با نسخه v1 پیش‌نویس`,
    });

    this.save();
    return newPack;
  }

  public validateRulePack(
    packId: string,
    versionNumber: number
  ): { valid: boolean; blockers: string[]; warnings: string[] } {
    const pack = (this.data.rulePacks || []).find(p => p.id === packId);
    if (!pack) throw new Error(`بسته ضوابط ${packId} یافت نشد.`);

    const packV = (this.data.rulePackVersions || []).find(
      v => v.pack_id === packId && v.version_number === Number(versionNumber)
    );
    if (!packV) throw new Error(`نسخه ${versionNumber} بسته ضوابط ${packId} یافت نشد.`);

    const blockers: string[] = [];
    const warnings: string[] = [];

    if (!packV.rules || packV.rules.length === 0) {
      blockers.push('بسته ضوابط خالی است و هیچ ضابطه‌ای در آن عضویت ندارد.');
    }

    for (const rRef of packV.rules || []) {
      const rv = this.getRuleVersion(rRef.rule_code, rRef.version_number);
      if (!rv) {
        blockers.push(`ضابطه «${rRef.rule_code}» نسخه v${rRef.version_number} در سامانه موجود نیست.`);
        continue;
      }
      if (rv.status !== 'APPROVED' && rv.status !== 'PUBLISHED') {
        blockers.push(`ضابطه «${rRef.rule_code}» در وضعیت ${rv.status} است؛ کلیه ضوابط عضو بسته باید ابتدا مصوب (APPROVED/PUBLISHED) شوند.`);
      }
      if (rv.source.verification_status === 'SOURCE_INCOMPLETE') {
        blockers.push(`استناد قانونی ضابطه «${rRef.rule_code}» ناقص است.`);
      }
    }

    return {
      valid: blockers.length === 0,
      blockers,
      warnings,
    };
  }

  public approveRulePack(
    packId: string,
    versionNumber: number,
    approverName: string,
    notes: string,
    actor: { name: string; role: string }
  ): RulePackVersion {
    const val = this.validateRulePack(packId, versionNumber);
    if (!val.valid) {
      throw new Error(`خطای موانع انتشار بسته ضوابط: ${val.blockers.join(' | ')}`);
    }

    const packV = (this.data.rulePackVersions || []).find(
      v => v.pack_id === packId && v.version_number === Number(versionNumber)
    );
    if (!packV) throw new Error(`نسخه ${versionNumber} بسته ضوابط ${packId} یافت نشد.`);

    const today = '۱۴۰۵/۰۶/۲۳';
    packV.status = 'APPROVED';
    packV.approved_by = approverName || actor.name;
    packV.approved_at = today;

    this.recordRuleAudit({
      actor: actor.name,
      role: actor.role,
      action: 'RULE_APPROVED',
      entity: 'RULE_PACK_VERSION',
      entity_id: packV.pack_version_id,
      reason: notes || 'تأیید رسمی بسته ضوابط یکپارچه برای انتشار',
    });

    this.save();
    return packV;
  }

  public publishRulePack(
    packId: string,
    versionNumber: number,
    publisherName: string,
    actor: { name: string; role: string }
  ): { pack: RulePack; version: RulePackVersion; affectedStudiesNotified: number } {
    const pack = (this.data.rulePacks || []).find(p => p.id === packId);
    if (!pack) throw new Error(`بسته ضوابط ${packId} یافت نشد.`);

    const packV = (this.data.rulePackVersions || []).find(
      v => v.pack_id === packId && v.version_number === Number(versionNumber)
    );
    if (!packV) throw new Error(`نسخه ${versionNumber} بسته ضوابط ${packId} یافت نشد.`);

    // Publication Gate Enforcement
    const val = this.validateRulePack(packId, versionNumber);
    if (!val.valid) {
      throw new Error(`RULE_PUBLICATION_BLOCKED: انتشار بسته ضوابط به دلیل عدم احراز شروط متوقف شد: ${val.blockers.join(' | ')}`);
    }

    const today = '۱۴۰۵/۰۶/۲۳';

    // Supersede previous published versions
    const prevVersions = (this.data.rulePackVersions || []).filter(
      v => v.pack_id === packId && v.version_number !== Number(versionNumber) && v.status === 'PUBLISHED'
    );
    for (const pv of prevVersions) {
      pv.status = 'SUPERSEDED';
      pv.effective_to = today;
    }

    packV.status = 'PUBLISHED';
    packV.published_by = publisherName || actor.name;
    packV.published_at = today;
    packV.effective_from = today;

    pack.current_published_version = Number(versionNumber);
    pack.updated_at = today;

    // Check affected studies
    const affectedStudies = (this.data.studyCases || []).filter(sc =>
      (pack.dependent_study_ids || []).includes(sc.id)
    );

    this.recordRuleAudit({
      actor: actor.name,
      role: actor.role,
      action: 'RULE_PACK_PUBLISHED',
      entity: 'RULE_PACK_VERSION',
      entity_id: packV.pack_version_id,
      reason: `انتشار رسمی بسته ضوابط ${pack.title} نسخه v${versionNumber} و قفل تغییرناپذیری`,
    });

    this.save();
    return {
      pack,
      version: packV,
      affectedStudiesNotified: affectedStudies.length,
    };
  }

  /* ------------------------------------------------------------
     RULE REQUESTS & AUTO UNBLOCKING PIPELINE
     ------------------------------------------------------------ */

  public getRuleRequests(filters?: {
    status?: string;
    study_case_id?: string;
    rule_code?: string;
    priority?: string;
  }): RuleRequest[] {
    const list = this.data.ruleRequests || [];
    return list.filter(r => {
      if (filters?.status && r.status !== filters.status) return false;
      if (filters?.study_case_id && r.study_case_id !== filters.study_case_id) return false;
      if (filters?.rule_code && r.rule_code !== filters.rule_code) return false;
      if (filters?.priority && r.priority !== filters.priority) return false;
      return true;
    });
  }

  public getRuleRequest(id: string): RuleRequest | null {
    return (this.data.ruleRequests || []).find(r => r.id === id) || null;
  }

  public createRuleRequest(
    data: {
      study_case_id: string;
      requirement_id?: string;
      rule_code: string;
      title: string;
      reason: 'MISSING' | 'OUTDATED' | 'CONFLICT' | 'INCOMPLETE_METADATA';
      effective_date?: string;
      region?: string;
      impact?: string;
      priority?: 'HIGH' | 'MEDIUM' | 'LOW';
      note?: string;
    },
    actor: { name: string; role: string }
  ): RuleRequest {
    if (!data.study_case_id || !data.rule_code || !data.title || !data.reason) {
      throw new Error('شناسه مطالعه، کد ضابطه، عنوان درخواست و علت درخواست الزامی است.');
    }

    const today = '۱۴۰۵/۰۶/۲۳';
    const study = (this.data.studyCases || []).find(s => s.id === data.study_case_id);
    const reqSeq = (this.data.seq.ruleRequest = (this.data.seq.ruleRequest || 10) + 1);
    const reqId = `REQ-RL-1405-${String(reqSeq).padStart(3, '0')}`;

    const newReq: RuleRequest = {
      id: reqId,
      study_case_id: data.study_case_id,
      study_title: study?.title || data.study_case_id,
      requirement_id: data.requirement_id,
      rule_code: data.rule_code,
      title: data.title,
      reason: data.reason,
      effective_date: data.effective_date || today,
      region: data.region || study?.region || 'تهران',
      impact: data.impact || 'مسدودکننده ارزیابی انطباق فصل صفر و سناریوها',
      requested_by: actor.name,
      assigned_to: 'مهندس لیلا اکبری (متولی قواعد و ضوابط)',
      priority: data.priority || 'HIGH',
      status: 'REQUESTED',
      created_at: today,
      updated_at: today,
      note: data.note || '',
    };

    if (!this.data.ruleRequests) this.data.ruleRequests = [];
    this.data.ruleRequests.push(newReq);

    // If attached to a rule requirement, update status to OUTDATED/PENDING
    if (data.requirement_id) {
      const rr = (this.data.ruleRequirements || []).find(r => r.id === data.requirement_id);
      if (rr) {
        rr.status = 'PENDING';
      }
    }

    this.recordRuleAudit({
      actor: actor.name,
      role: actor.role,
      action: 'RULE_REQUEST_CREATED',
      entity: 'RULE_REQUEST',
      entity_id: reqId,
      reason: `ثبت درخواست تدوین/انطباق ضابطه «${data.rule_code}» برای مطالعه ${data.study_case_id}`,
    });

    this.save();
    return newReq;
  }

  public startRuleRequest(id: string, actor: { name: string; role: string }): RuleRequest {
    const req = this.getRuleRequest(id);
    if (!req) throw new Error(`درخواست ضابطه ${id} یافت نشد.`);

    const today = '۱۴۰۵/۰۶/۲۳';
    req.status = 'IN_PROGRESS';
    req.started_at = today;
    req.updated_at = today;

    this.recordRuleAudit({
      actor: actor.name,
      role: actor.role,
      action: 'RULE_REQUEST_IN_PROGRESS',
      entity: 'RULE_REQUEST',
      entity_id: id,
      reason: `آغاز بررسی و تدوین نسخه رسمی ضابطه توسط ${actor.name}`,
    });

    this.save();
    return req;
  }

  public fulfillRuleRequest(
    id: string,
    fulfilledVersion: number,
    packId: string,
    actor: { name: string; role: string },
    note?: string
  ): { request: RuleRequest; studyCase: StudyCase } {
    const req = this.getRuleRequest(id);
    if (!req) throw new Error(`درخواست ضابطه ${id} یافت نشد.`);

    const rv = this.getRuleVersion(req.rule_code, fulfilledVersion);
    if (!rv) throw new Error(`نسخه ${fulfilledVersion} ضابطه ${req.rule_code} یافت نشد.`);

    const today = '۱۴۰۵/۰۶/۲۳';
    req.status = 'FULFILLED';
    req.fulfilled_rule_version = fulfilledVersion;
    req.fulfilled_pack_id = packId;
    req.fulfilled_at = today;
    req.updated_at = today;
    if (note) req.note = (req.note ? `${req.note}\n` : '') + note;

    // Satisfy the study case rule requirement
    if (req.requirement_id) {
      const rr = (this.data.ruleRequirements || []).find(r => r.id === req.requirement_id);
      if (rr) {
        rr.attached_rule_version = fulfilledVersion;
        rr.attached_pack_id = packId;
        rr.satisfied = true;
        rr.status = 'SATISFIED';
      }
    } else {
      // Find matching requirement by rule_code and study_case_id
      const rr = (this.data.ruleRequirements || []).find(
        r => r.study_case_id === req.study_case_id && r.rule_code === req.rule_code
      );
      if (rr) {
        rr.attached_rule_version = fulfilledVersion;
        rr.attached_pack_id = packId;
        rr.satisfied = true;
        rr.status = 'SATISFIED';
      }
    }

    // Add study to rule dependent studies if not present
    const rule = (this.data.rules || []).find(r => r.code === req.rule_code);
    if (rule) {
      if (!rule.dependent_study_ids) rule.dependent_study_ids = [];
      if (!rule.dependent_study_ids.includes(req.study_case_id)) {
        rule.dependent_study_ids.push(req.study_case_id);
      }
    }

    this.recordRuleAudit({
      actor: actor.name,
      role: actor.role,
      action: 'RULE_REQUEST_FULFILLED',
      entity: 'RULE_REQUEST',
      entity_id: id,
      reason: note || `تأمین نیازمندی مطالعه با اتصال به نسخه رسمی ${req.rule_code} v${fulfilledVersion}`,
    });

    // Auto re-check blocking state of the study case!
    const updatedCase = this.recalculateStudyCaseBlockingState(req.study_case_id);

    this.save();
    return { request: req, studyCase: updatedCase };
  }

  public rejectRuleRequest(
    id: string,
    reason: string,
    actor: { name: string; role: string }
  ): RuleRequest {
    if (!reason || !reason.trim()) throw new Error('علت رد درخواست ضابطه الزامی است.');
    const req = this.getRuleRequest(id);
    if (!req) throw new Error(`درخواست ضابطه ${id} یافت نشد.`);

    const today = '۱۴۰۵/۰۶/۲۳';
    req.status = 'REJECTED';
    req.updated_at = today;
    req.note = (req.note ? `${req.note}\n` : '') + `علت رد: ${reason.trim()}`;

    this.recordRuleAudit({
      actor: actor.name,
      role: actor.role,
      action: 'RULE_REJECTED',
      entity: 'RULE_REQUEST',
      entity_id: id,
      reason: `رد درخواست ضابطه: ${reason.trim()}`,
    });

    this.save();
    return req;
  }

  public getStudyCaseRuleRequirements(studyCaseId: string): RuleRequirement[] {
    return (this.data.ruleRequirements || []).filter(r => r.study_case_id === studyCaseId);
  }

  /* ------------------------------------------------------------
     AUDIT LOGGING & QUEUES
     ------------------------------------------------------------ */

  public recordRuleAudit(audit: Omit<RuleAudit, 'id' | 'timestamp'>): RuleAudit {
    if (!this.data.ruleAudits) this.data.ruleAudits = [];
    const id = `AUD-RL-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const now = '۱۴۰۵/۰۶/۲۳، ' + new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

    const newAudit: RuleAudit = {
      ...audit,
      id,
      timestamp: now,
    };

    this.data.ruleAudits.push(newAudit);
    return newAudit;
  }

  public getRuleAudits(entityId?: string): RuleAudit[] {
    const list = this.data.ruleAudits || [];
    if (!entityId) return list.slice().reverse();
    return list.filter(a => a.entity_id === entityId || a.entity_id.startsWith(entityId)).reverse();
  }

  public getRuleStewardKPIs(): {
    total_rules: number;
    published_rules: number;
    in_review_rules: number;
    draft_rules: number;
    total_packs: number;
    active_requests: number;
    unresolved_conflicts: number;
    affected_studies: number;
  } {
    const rules = this.data.rules || [];
    const versions = this.data.ruleVersions || [];
    const requests = this.data.ruleRequests || [];
    const precedences = this.data.rulePrecedences || [];

    const publishedCount = versions.filter(v => v.status === 'PUBLISHED').length;
    const inReviewCount = versions.filter(v => v.status === 'IN_REVIEW' || v.status === 'READY_FOR_REVIEW').length;
    const draftCount = versions.filter(v => v.status === 'DRAFT' || v.status === 'SCHEMA_VALID').length;

    const activeRequests = requests.filter(r => ['REQUESTED', 'IN_PROGRESS'].includes(r.status)).length;
    const unresolvedConflicts = precedences.filter(p => p.status === 'PROPOSED').length;

    const affectedStudies = new Set(rules.flatMap(r => r.dependent_study_ids || [])).size;

    return {
      total_rules: rules.length,
      published_rules: publishedCount,
      in_review_rules: inReviewCount,
      draft_rules: draftCount,
      total_packs: (this.data.rulePacks || []).length,
      active_requests: activeRequests,
      unresolved_conflicts: unresolvedConflicts,
      affected_studies: affectedStudies,
    };
  }

  public getRuleStewardQueues(): {
    requests_queue: RuleRequest[];
    review_queue: RuleVersion[];
    testing_queue: RuleVersion[];
    packs_queue: RulePackVersion[];
  } {
    const requests_queue = (this.data.ruleRequests || []).filter(r => ['REQUESTED', 'IN_PROGRESS'].includes(r.status));
    const review_queue = (this.data.ruleVersions || []).filter(v => v.status === 'IN_REVIEW');
    const testing_queue = (this.data.ruleVersions || []).filter(v => v.status === 'SCHEMA_VALID' || v.status === 'DRAFT');
    const packs_queue = (this.data.rulePackVersions || []).filter(v => v.status === 'DRAFT' || v.status === 'APPROVED');

    return {
      requests_queue,
      review_queue,
      testing_queue,
      packs_queue,
    };
  }

}

export const store = new Store();
