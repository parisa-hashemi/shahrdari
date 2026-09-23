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
} from './types';

const DB_FILE = path.join(process.cwd(), 'server', 'data', 'tuip_db.json');

export interface DBData {
  scientificUsers: ScientificUser[];
  profiles: { [userId: string]: ScientificProfile };
  universities: University[];
  proposals: Proposal[];
  scenarios: Scenario[];
  otpCodes: { [phone: string]: { code: string; expiresAt: number } };
  seq: { proposal: number; scenario: number };
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

class Store {
  private data: DBData;

  constructor() {
    this.data = this.load();
  }

  private load(): DBData {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
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
      otpCodes: {
        '09123456789': { code: '123456', expiresAt: Date.now() + 1000 * 60 * 60 * 24 },
        '09121112233': { code: '123456', expiresAt: Date.now() + 1000 * 60 * 60 * 24 },
      },
      seq: { proposal: 126, scenario: 125 },
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
  }): Proposal[] {
    return this.data.proposals.filter(p => {
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
}

export const store = new Store();
