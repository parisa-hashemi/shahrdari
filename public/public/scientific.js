/* ============================================================
   TUIP — Scientific Contributor Panel & Urban Analyst Queue
   Integrated role: ROLE_SCIENTIFIC_CONTRIBUTOR (id: 'scientific')
   ============================================================ */

(function initScientificModule() {
  // 1. Extend ROLES
  if (!ROLES.some(r => r.id === 'scientific')) {
    ROLES.push({
      id: 'scientific',
      t: 'نهاد علمی / ارائه‌دهنده پیشنهاد',
      home: 'داشبورد نهاد علمی',
      d: 'ثبت و پیگیری پیشنهادهای علمی، دانشگاهی و تخصصی؛ ارجاع به کارشناس تحلیل شهری برای ارزیابی و ایجاد سناریو'
    });
  }

  // 2. Extend USERS & load persisted registered scientific accounts
  const demoScientificUsers = [
    { id: 'دکتر فریبرز سمیعی', phone: '09123456789', role: 'scientific', org: 'دانشگاه تهران', title: 'استاد دانشکده شهرسازی' },
    { id: 'مهندس پروانه شمس', phone: '09121112233', role: 'scientific', org: 'دانشگاه شهید بهشتی', title: 'پژوهشگر محیط‌زیست شهری' }
  ];
  demoScientificUsers.forEach(u => {
    if (!USERS.some(x => x.phone === u.phone)) {
      USERS.push(u);
    }
  });

  // Load dynamically registered scientific users from localStorage
  try {
    const persisted = JSON.parse(localStorage.getItem('tuip.registered_scientific') || '[]');
    if (Array.isArray(persisted)) {
      persisted.forEach(u => {
        if (u && u.phone && !USERS.some(x => x.phone === u.phone)) {
          USERS.push(u);
        }
      });
    }
  } catch (e) {
    console.warn('Failed to load registered scientific users from storage', e);
  }

  // 3. Extend PERMISSIONS
  PERMS.scientific = [
    'VIEW_SCIENTIFIC_DASHBOARD',
    'CREATE_SCIENTIFIC_PROPOSAL',
    'VIEW_MY_PROPOSALS',
    'EDIT_MY_PROFILE',
    'VIEW_MAP',
    'VIEW_PROPOSAL'
  ];
  if (!PERMS.analyst.includes('VIEW_SCIENTIFIC_PROPOSALS')) {
    PERMS.analyst.push('VIEW_SCIENTIFIC_PROPOSALS', 'CREATE_SCENARIO_FROM_PROPOSAL', 'REQUEST_PROPOSAL_INFO');
  }
  if (!PERMS.admin.includes('VIEW_SCIENTIFIC_DASHBOARD')) {
    PERMS.admin.push('VIEW_SCIENTIFIC_DASHBOARD', 'VIEW_SCIENTIFIC_PROPOSALS', 'CREATE_SCENARIO_FROM_PROPOSAL');
  }

  // 4. Extend ROLE_NAV
  ROLE_NAV.scientific = [
    ['پیشنهاد و ایده علمی', [
      ['داشبورد نهاد علمی', 'home', '#/scientific'],
      ['ثبت ایده / پیشنهاد جدید', 'plus', '#/scientific/proposals/new'],
      ['پیشنهادهای من', 'spark', '#/scientific/proposals'],
      ['نیازمند تکمیل اطلاعات', 'alert', '#/scientific/proposals?filter=needs_info'],
      ['پیام‌ها و استعلام‌ها', 'doc', '#/scientific/messages']
    ]],
    ['پروفایل و راهنما', [
      ['پروفایل نهاد علمی', 'user', '#/scientific/profile'],
      ['راهنمای ثبت پیشنهاد', 'help', '#/scientific/help']
    ]]
  ];

  // Add scientific proposals link to Analyst's navigation
  if (ROLE_NAV.analyst && !ROLE_NAV.analyst[0][1].some(item => item[2] === '#/analyst/scientific-proposals')) {
    ROLE_NAV.analyst[0][1].splice(1, 0, ['پیشنهادهای نهادهای علمی', 'spark', '#/analyst/scientific-proposals']);
  }

  // 5. Global state for scientific panel
  window.SCI = {
    phone: '',
    profile: null,
    universities: [],
    areas: [],
    myProposals: [],
    allProposals: [],
    stats: { total: 0, underReview: 0, needsInfo: 0, accepted: 0, completed: 0 },
    wizard: {
      step: 0,
      submitting: false,
      confirmedId: null,
      data: {
        title: '',
        description: '',
        topic: 'حمل‌ونقل',
        proposal_type: 'حمل‌ونقل',
        region: 'منطقه ۶',
        district: 'ناحیه ۲',
        sub_area: '',
        mapMode: 'polygon',
        geometry: {
          type: 'Polygon',
          coordinates: [[51.3912, 35.7015], [51.3995, 35.7018], [51.3992, 35.6980], [51.3908, 35.6978]],
          area_m2: 384000
        },
        problem_statement: '',
        current_state: '',
        problem_significance: '',
        affected_groups: '',
        objective: '',
        expected_outcome: '',
        full_proposal_description: '',
        scientific_basis: '',
        expected_impacts: {
          positive: [],
          negative: [],
          risks: [],
          limitations: [],
          uncertainties: []
        },
        attachments: []
      }
    },
    analystFilters: {
      region: '',
      district: '',
      topic: '',
      type: '',
      status: '',
      university: '',
      profession: '',
      search: ''
    }
  };

  // Seed default universities if offline
  window.SCI.universities = [
    { id: 'UT', name: 'دانشگاه تهران', type: 'university', city: 'تهران' },
    { id: 'SUT', name: 'دانشگاه صنعتی شریف', type: 'university', city: 'تهران' },
    { id: 'SBU', name: 'دانشگاه شهید بهشتی', type: 'university', city: 'تهران' },
    { id: 'IUST', name: 'دانشگاه علم و صنعت ایران', type: 'university', city: 'تهران' },
    { id: 'TMU', name: 'دانشگاه تربیت مدرس', type: 'university', city: 'تهران' },
    { id: 'AUT', name: 'دانشگاه صنعتی امیرکبیر', type: 'university', city: 'تهران' },
    { id: 'KNTU', name: 'دانشگاه صنعتی خواجه نصیرالدین طوسی', type: 'university', city: 'تهران' },
    { id: 'ATU', name: 'دانشگاه علامه طباطبائی', type: 'university', city: 'تهران' },
    { id: 'AUI', name: 'دانشگاه هنر تهران', type: 'university', city: 'تهران' },
    { id: 'IAU-SRB', name: 'دانشگاه آزاد اسلامی — واحد علوم و تحقیقات', type: 'university', city: 'تهران' },
    { id: 'TUSRC', name: 'مرکز مطالعات و برنامه‌ریزی شهر تهران', type: 'research_center', city: 'تهران' },
    { id: 'ESRI', name: 'پژوهشکده علوم محیطی شهید بهشتی', type: 'research_center', city: 'تهران' },
    { id: 'NDRI', name: 'پژوهشکده سوانح طبیعی', type: 'research_center', city: 'تهران' },
    { id: 'MC-SHAR', name: 'مهندسان مشاور شارستان', type: 'consulting_firm', city: 'تهران' },
    { id: 'MC-BAFT', name: 'مهندسان مشاور بافت شهر', type: 'consulting_firm', city: 'تهران' },
    { id: 'ISUP', name: 'انجمن علمی برنامه‌ریزی شهری ایران', type: 'professional_entity', city: 'تهران' }
  ];

  // Seed default areas if offline
  window.SCI.areas = Array.from({ length: 22 }, (_, i) => {
    const regNum = i + 1;
    const regName = `منطقه ${regNum}`;
    const districtsCount = regNum === 4 || regNum === 5 ? 4 : regNum === 6 ? 3 : regNum === 1 ? 4 : 3;
    const districts = Array.from({ length: districtsCount }, (_, d) => {
      const distNum = d + 1;
      return {
        district_id: `ناحیه ${distNum}`,
        neighborhoods: [`محله ۱ ناحیه ${distNum}`, `محله ۲ ناحیه ${distNum}`]
      };
    });
    return { region_id: regName, region_number: regNum, districts };
  });

  // Check whether a phone is registered
  window.SCI.isPhoneRegistered = function(phone) {
    const clean = String(phone || '').trim().replace(/[^\d+]/g, '');
    if (!clean) return false;
    if (clean === '09123456789' || clean === '09121112233') return true;
    if (USERS.some(u => u.phone === clean && u.role === 'scientific')) return true;
    try {
      const persisted = JSON.parse(localStorage.getItem('tuip.registered_scientific') || '[]');
      if (persisted.some(u => u.phone === clean)) return true;
    } catch(e) {}
    return false;
  };

  // Register a new scientific contributor
  window.SCI.registerUser = async function(data) {
    const cleanPhone = String(data.phone || '').trim().replace(/[^\d+]/g, '');
    const fullName = `${(data.first_name || '').trim()} ${(data.last_name || '').trim()}`.trim() || 'پژوهشگر علمی';
    const uniName = data.university_name || 'دانشگاه تهران';
    const profType = data.profession_type || 'پژوهشگر دانشگاهی';
    const fieldStudy = data.field_of_study || 'برنامه‌ریزی شهری';

    const userObj = {
      id: fullName,
      phone: cleanPhone,
      name: fullName,
      role: 'scientific',
      org: uniName,
      title: `${profType} — ${fieldStudy}`
    };

    // 1. Add to in-memory USERS list
    const existingIndex = USERS.findIndex(u => u.phone === cleanPhone);
    if (existingIndex >= 0) {
      USERS[existingIndex] = userObj;
    } else {
      USERS.push(userObj);
    }

    // 2. Persist to localStorage
    try {
      const persisted = JSON.parse(localStorage.getItem('tuip.registered_scientific') || '[]');
      const filtered = persisted.filter(u => u.phone !== cleanPhone);
      filtered.push(userObj);
      localStorage.setItem('tuip.registered_scientific', JSON.stringify(filtered));
    } catch (e) {
      console.warn('LocalStorage save error', e);
    }

    // 3. Update window.SCI profile
    window.SCI.phone = cleanPhone;
    window.SCI.profile = {
      user_id: cleanPhone,
      first_name: data.first_name || '',
      last_name: data.last_name || '',
      phone: cleanPhone,
      email: data.email || '',
      profession_type: profType,
      field_of_study: fieldStudy,
      academic_degree: data.academic_degree || 'کارشناسی ارشد',
      university_id: data.university_id || 'UT',
      university_name: uniName,
      faculty_group: data.faculty_group || '',
      student_id_or_license: data.national_id ? `کد ملی: ${data.national_id}` : (data.student_id_or_license || ''),
      experience_years: Number(data.experience_years) || 2,
      specialties: Array.isArray(data.specialties) ? data.specialties : ['برنامه‌ریزی شهری', 'مطالعات کالبدی'],
      is_completed: true,
      updated_at: new Date().toLocaleDateString('fa-IR')
    };

    // 4. Send to backend REST API
    try {
      await fetch('/api/auth/register-scientific', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          first_name: data.first_name,
          last_name: data.last_name,
          national_id: data.national_id,
          email: data.email,
          university_id: data.university_id,
          university_name: uniName,
          faculty_group: data.faculty_group,
          profession_type: profType,
          field_of_study: fieldStudy,
          academic_degree: data.academic_degree,
          student_id_or_license: data.student_id_or_license,
          experience_years: data.experience_years,
          specialties: data.specialties
        })
      });
    } catch (err) {
      console.warn('Backend registration error (offline/cached mode active):', err);
    }

    return { success: true, user: userObj, profile: window.SCI.profile };
  };

  // Fetch from API in background if possible
  fetch('/api/scientific/universities')
    .then(r => r.json())
    .then(d => { if (d.universities) window.SCI.universities = d.universities; })
    .catch(() => {});

  fetch('/api/scientific/areas')
    .then(r => r.json())
    .then(d => { if (d.areas) window.SCI.areas = d.areas; })
    .catch(() => {});
})();

/* ---------- Helper to auto-assign analyst to proposal ---------- */
function assignAnalystToProposal(d) {
  const analysts = (typeof USERS !== 'undefined' ? USERS : []).filter(u => u.role === 'analyst');
  if (!analysts.length) {
    return {
      id: 'مهندس زهرا کاظمی',
      name: 'مهندس زهرا کاظمی',
      title: 'کارشناس ارشد برنامه‌ریزی شهری',
      org: 'معاونت شهرسازی و معماری',
      phone: '09120000003'
    };
  }

  // If region 6 district 1 or local, assign to امیرحسین طاهری (کارشناس منطقه ۶)
  if (d && d.region === 'منطقه ۶' && (d.district || '').includes('ناحیه ۱')) {
    const t = analysts.find(u => u.id === 'امیرحسین طاهری');
    if (t) return t;
  }

  // Load balancing across analysts
  const counts = {};
  analysts.forEach(a => { counts[a.id] = 0; });
  (DB.proposals || []).forEach(p => {
    if (p.assigned_analyst && counts[p.assigned_analyst] !== undefined) {
      counts[p.assigned_analyst]++;
    }
  });

  let picked = analysts[0];
  let minC = counts[picked.id] ?? 0;
  for (const a of analysts) {
    if ((counts[a.id] ?? 0) < minC) {
      minC = counts[a.id] ?? 0;
      picked = a;
    }
  }
  return picked;
}

// Seed initial academic proposals if missing in DB
(function seedInitialScientificProposals() {
  if (typeof DB === 'undefined' || !Array.isArray(DB.proposals)) return;
  const demoAcademic = [
    {
      id: 'PR-1405-000124',
      proposal_id: 'PR-1405-000124',
      t: 'بازتنظیم خطوط تغذیه‌کننده و توسعه آرام‌سازی ترافیک پیرامون دانشگاه تهران',
      title: 'بازتنظیم خطوط تغذیه‌کننده و توسعه آرام‌سازی ترافیک پیرامون دانشگاه تهران',
      type: 'حمل‌ونقل',
      src: 'academic',
      by: 'دکتر فریبرز سمیعی',
      owner: 'دکتر فریبرز سمیعی',
      assigned_analyst: 'مهندس زهرا کاظمی',
      assigned_analyst_name: 'مهندس زهرا کاظمی',
      assigned_analyst_title: 'کارشناس ارشد برنامه‌ریزی شهری',
      assigned_analyst_org: 'معاونت شهرسازی و معماری',
      assigned_at: '۱۴۰۵/۰۶/۱۸',
      date: '۱۴۰۵/۰۶/۱۸',
      upd: '۱۴۰۵/۰۶/۲۱',
      region: 'منطقه ۶',
      scope: 'ناحیه ۲ — محور کارگر و انقلاب',
      study: 'ST-1405-014',
      status: 'ready',
      scenario_id: 'SC-1405-PROP-124',
      level: 'high',
      ver: 'v1',
      q: 'آرام‌سازی سرعت و توسعه فضای پیاده پیرامون پردیس دانشگاه تهران',
      prob: 'عدم تناسب ظرفیت شریان با بار سفر و تقاضای عبوری و تداخل شدید سواره و پیاده',
      goal: 'آرام‌سازی سرعت، توسعه مسیرهای امن پیاده و بهبود خدمات اتوبوس برقی',
      change: 'تبدیل معابر پیرامونی به زون ۳۰، بازتنظیم ۵ خط مینی‌بوس تغذیه‌کننده و عریض‌سازی پیاده‌روها',
      base: 'وضع موجود فصل صفر مطالعه ST-1405-014',
      doms: ['حمل‌ونقل', 'کالبدی'],
      scientific_basis: 'مدل‌سازی تقاضای سفر دانشگاه تهران و داده‌های ترددشمار برخط',
      attachments: [{ id: 'ATT-101', title: 'گزارش ارزیابی ترافیکی پیاده‌راه‌سازی ۱۶ آذر (PDF)', type: 'research_report', url_or_filename: 'report_traffic.pdf', size: '4.8 MB' }]
    },
    {
      id: 'PR-1405-000125',
      proposal_id: 'PR-1405-000125',
      t: 'توسعه پارک‌های جاذب باران و زیرساخت سبز تاب‌آور در محله پونک',
      title: 'توسعه پارک‌های جاذب باران و زیرساخت سبز تاب‌آور در محله پونک',
      type: 'محیط‌زیست',
      src: 'academic',
      by: 'مهندس پروانه شمس',
      owner: 'مهندس پروانه شمس',
      assigned_analyst: 'امیرحسین طاهری',
      assigned_analyst_name: 'امیرحسین طاهری',
      assigned_analyst_title: 'کارشناس منطقه',
      assigned_analyst_org: 'شهرداری منطقه ۶',
      assigned_at: '۱۴۰۵/۰۶/۱۹',
      date: '۱۴۰۵/۰۶/۱۹',
      upd: '۱۴۰۵/۰۶/۲۲',
      region: 'منطقه ۵',
      scope: 'ناحیه ۲ — محله پونک و شیب شمالی',
      study: 'ST-1405-005',
      status: 'needevidence',
      level: 'mid',
      ver: 'v1',
      q: 'کاهش مخاطره سیلاب و تغذیه سفره آب زیرزمینی با سلول‌های بیورتنشن',
      prob: 'افزایش رواناب سطحی و عدم نفوذپذیری خاک در بالادست شیب‌ها',
      goal: 'کاهش ۵۰ درصدی رواناب و مهار سیلاب‌های فصلی',
      change: 'ایجاد ۳ پهنه پارک جاذب باران و لایه‌های ژئوتکستایل نفوذپذیر',
      base: 'مطالعه تاب‌آوری محیط‌زیستی حوضه آبریز',
      doms: ['محیط‌زیست', 'زیرساخت'],
      scientific_basis: 'مدل هیدرولوژیکی دانشگاه شهید بهشتی و سنجش از دور بارش‌های حدی',
      attachments: [{ id: 'ATT-102', title: 'نقشه پهنه‌های نفوذپذیر و مسیل‌ها (GeoJSON)', type: 'map', url_or_filename: 'rain_gardens.geojson', size: '1.2 MB' }]
    }
  ];

  demoAcademic.forEach(dp => {
    const existing = DB.proposals.find(p => p.id === dp.id);
    if (!existing) {
      DB.proposals.push(dp);
    } else {
      if (!existing.assigned_analyst) {
        existing.assigned_analyst = dp.assigned_analyst;
        existing.assigned_analyst_name = dp.assigned_analyst_name;
        existing.assigned_analyst_title = dp.assigned_analyst_title;
        existing.assigned_analyst_org = dp.assigned_analyst_org;
      }
    }
  });
})();

/* ---------- Status formatting helper ---------- */
function sciBadge(status) {
  const map = {
    DRAFT: { t: 'پیش‌نویس', c: 'b-neu' },
    SUBMITTED: { t: 'ارسال‌شده به کارشناس', c: 'b-run' },
    INITIAL_REVIEW: { t: 'در بررسی اولیه', c: 'b-run' },
    NEEDS_INFO: { t: 'نیازمند تکمیل اطلاعات', c: 'b-warn' },
    ACCEPTED_FOR_ANALYSIS: { t: 'پذیرفته‌شده برای تحلیل', c: 'b-ok' },
    IN_ANALYSIS: { t: 'در حال اجرای ماژول‌ها', c: 'b-run' },
    ANALYSIS_COMPLETED: { t: 'تحلیل تکمیل‌شده', c: 'b-ok' },
    ARCHIVED: { t: 'بایگانی‌شده', c: 'b-neu' }
  };
  const item = map[status] || { t: status || 'نامشخص', c: 'b-neu' };
  return `<span class="bdg ${item.c}">${item.t}</span>`;
}

/* ---------- Calculation of profile completion % ---------- */
function getProfileCompletion(p) {
  if (!p) return 0;
  let score = 0;
  if (p.first_name && p.last_name) score += 25;
  if (p.phone) score += 15;
  if (p.profession_type) score += 20;
  if (p.university_name) score += 20;
  if (p.field_of_study) score += 10;
  if (p.specialties && p.specialties.length > 0) score += 10;
  return Math.min(100, score);
}

/* ---------- 1. SCIENTIFIC DASHBOARD ---------- */
function ScientificDashboard() {
  const u = STATE.user || { name: 'پژوهشگر علمی', phone: '09123456789', org: 'دانشگاه تهران', title: 'استاد دانشگاه' };
  const prof = window.SCI.profile || {
    first_name: u.name.split(' ')[1] || 'فریبرز',
    last_name: u.name.split(' ')[2] || 'سمیعی',
    profession_type: u.title || 'استاد دانشگاه',
    university_name: u.org || 'دانشگاه تهران',
    field_of_study: 'برنامه‌ریزی شهری',
    phone: u.phone || '09123456789',
    specialties: ['برنامه‌ریزی شهری', 'حمل‌ونقل', 'GIS']
  };
  const completion = getProfileCompletion(prof);

  // Filter proposals submitted by this user or seeded academic proposals
  const proposals = (DB.proposals || []).filter(p =>
    p.src === 'academic' || p.by === u.name || p.owner === u.name || p.submitter_id === u.name
  );

  const total = proposals.length;
  const underReview = proposals.filter(p => p.status === 'intake' || p.status === 'SUBMITTED' || p.status === 'INITIAL_REVIEW').length;
  const needsInfo = proposals.filter(p => p.status === 'needevidence' || p.status === 'NEEDS_INFO').length;
  const accepted = proposals.filter(p => p.status === 'ready' || p.status === 'ACCEPTED_FOR_ANALYSIS' || p.status === 'analyzing').length;
  const analyzed = proposals.filter(p => p.status === 'partial' || p.status === 'decision' || p.status === 'ANALYSIS_COMPLETED').length;

  const needsInfoList = proposals.filter(p => p.status === 'needevidence' || p.status === 'NEEDS_INFO');

  return Shell(`${Crumb([{ t: 'میز کار نهاد علمی', h: '#/scientific' }])}
  <div class="phead">
    <div>
      <div class="eyebrow">سامانه هوشمند برنامه‌ریزی شهری تهران · درگاه نهاد علمی و دانشگاهی</div>
      <h1>داشبورد نهاد علمی و تخصصی</h1>
      <p class="sub">ثبت و ردیابی ایده‌ها و پیشنهادهای تخصصی شهری بر پایه شواهد علمی و پیوند آن با مطالعات رسمی شهر تهران</p>
    </div>
    <div class="acts">
      <a class="btn btn-pri" href="#/scientific/proposals/new">${ico.plus}ثبت ایده / پیشنهاد جدید</a>
    </div>
  </div>

  <!-- Profile summary banner -->
  <div class="card" style="margin-bottom:18px;border-inline-start:4px solid var(--brand);background:#FCFDFF">
    <div class="card-b" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px">
      <div style="display:flex;align-items:center;gap:14px">
        <span class="av lg" style="background:var(--brand);color:#fff;font-weight:700">${initials(u.name)}</span>
        <div>
          <div style="display:flex;align-items:center;gap:8px">
            <b style="font-size:16px">${esc(u.name)}</b>
            <span class="bdg b-ok">${esc(prof.profession_type || 'عضو هیئت علمی')}</span>
          </div>
          <div class="muted" style="font-size:12.5px;margin-top:2px">
            ${esc(prof.university_name || 'دانشگاه تهران')} · ${esc(prof.field_of_study || 'شهرسازی و محیط‌زیست')}
          </div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:16px">
        <div style="text-align:start">
          <div style="display:flex;justify-content:space-between;gap:12px;font-size:11.5px">
            <span class="muted">تکمیل پروفایل علمی</span>
            <b class="num" style="color:${completion >= 80 ? 'var(--ok)' : 'var(--warn)'}">${fa(completion)}٪</b>
          </div>
          <div class="prog ${completion >= 80 ? 'ok' : 'warn'}" style="width:140px;height:7px;margin-top:4px">
            <i style="width:${completion}%"></i>
          </div>
        </div>
        <a class="btn btn-sm" href="#/scientific/profile">${ico.user}مشاهده و ویرایش پروفایل</a>
      </div>
    </div>
  </div>

  <!-- Notice of scientific scope -->
  <div class="notice n-demo" style="margin-bottom:18px">
    ${ico.lock}
    <div>
      <b>اصل استقلال ارزیابی:</b> نهادهای علمی و تخصصی در این سامانه به عنوان پیشنهاددهنده ایده، مسئله و راه‌حل فعالیت می‌کنند و فاقد حق تصویب یا تصمیم‌گیری مستقیم اداری هستند. هر پیشنهاد پس از پذیرش، توسط کارشناس رسمی شهرداری به سناریو تبدیل شده و در ماژول‌های ۱۲گانه تحلیل اثر (M01 تا M12) آزمون می‌شود.
    </div>
  </div>

  <!-- Attention alert if analyst requested info -->
  ${needsInfo > 0 ? `
  <div class="notice n-warn" style="margin-bottom:18px">
    ${ico.alert}
    <div style="flex:1">
      <b>${fa(needsInfo)} پیشنهاد نیازمند تکمیل اطلاعات و پاسخ به استعلام کارشناس است.</b>
      <p style="margin:4px 0 0 0;font-size:12px">کارشناس تحلیل شهری برای پیشبرد بررسی مدارک تکمیلی یا شفاف‌سازی خواسته است. برای جلوگیری از مسدود شدن تحلیل، پاسخ خود را ثبت کنید.</p>
    </div>
    <a class="btn btn-sm btn-pri" href="#/scientific/proposals?filter=needs_info">مشاهده استعلام‌ها</a>
  </div>` : ''}

  <!-- Metric KPI Cards -->
  <div class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));margin-bottom:22px">
    <div class="kpi">
      <div class="v num">${fa(total)}</div>
      <div class="l">پیشنهادهای ثبت‌شده</div>
      <div class="d">مجموع ایده‌های تخصصی شما</div>
    </div>
    <div class="kpi">
      <div class="v num" style="color:var(--run)">${fa(underReview)}</div>
      <div class="l">در حال بررسی اولیه</div>
      <div class="d">در صف بررسی کارشناسان تحلیل</div>
    </div>
    <div class="kpi">
      <div class="v num" style="color:var(--warn)">${fa(needsInfo)}</div>
      <div class="l">نیازمند تکمیل اطلاعات</div>
      <div class="d">منتظر شواهد تکمیلی شما</div>
    </div>
    <div class="kpi">
      <div class="v num" style="color:var(--ok)">${fa(accepted)}</div>
      <div class="l">پذیرفته‌شده برای تحلیل</div>
      <div class="d">تأییدشده برای تبدیل به سناریو</div>
    </div>
    <div class="kpi">
      <div class="v num" style="color:var(--brand)">${fa(analyzed)}</div>
      <div class="l">تحلیل در سناریو</div>
      <div class="d">آزمون‌شده در ماژول‌های M01-M12</div>
    </div>
  </div>

  <!-- Proposals Table -->
  <section class="card">
    <div class="card-h" style="display:flex;justify-content:space-between;align-items:center">
      <h3>${ico.spark} آخرین پیشنهادهای علمی ثبت‌شده</h3>
      <div style="display:flex;gap:8px">
        <a class="btn btn-sm btn-ghost" href="#/scientific/proposals">مشاهده همه</a>
        <a class="btn btn-sm btn-pri" href="#/scientific/proposals/new">${ico.plus}ثبت پیشنهاد</a>
      </div>
    </div>
    <div class="card-b" style="padding:0">
      ${proposals.length ? `
      <div class="tw">
        <table class="tbl">
          <thead>
            <tr>
              <th>شناسه و عنوان پیشنهاد</th>
              <th>تحلیلگر ارجاع‌شده</th>
              <th>حوزه موضوعی</th>
              <th>محدوده جغرافیایی</th>
              <th>وضعیت کارشناسی</th>
              <th>تاریخ ثبت</th>
              <th>سناریوی مرتبط</th>
              <th>عملیات</th>
            </tr>
          </thead>
          <tbody>
            ${proposals.map(p => `
            <tr>
              <td>
                <a class="ttl link" href="#/scientific/proposal/${p.id}">${esc(p.t)}</a>
                <div class="sub"><span class="code">${p.id}</span> · منبع: ${p.by || 'نهاد علمی'}</div>
              </td>
              <td style="white-space:nowrap">
                <span class="bdg b-pri" style="font-size:11px">
                  ${ico.user} ${esc(p.assigned_analyst || (p.id === 'PR-1405-000124' ? 'مهندس زهرا کاظمی' : 'امیرحسین طاهری'))}
                </span>
              </td>
              <td style="white-space:nowrap">${esc(p.type || 'حمل‌ونقل')}</td>
              <td>${esc(p.region || 'منطقه ۶')}<div class="sub">${esc(p.scope || 'ناحیه ۲')}</div></td>
              <td>${p.status === 'needevidence' ? '<span class="bdg b-warn">نیازمند تکمیل اطلاعات</span>' :
                    p.status === 'ready' ? '<span class="bdg b-ok">آماده تحلیل</span>' :
                    p.status === 'analyzing' ? '<span class="bdg b-run">در حال اجرای مدل‌ها</span>' :
                    p.status === 'partial' ? '<span class="bdg b-warn">تحلیل ناقص</span>' :
                    p.status === 'decision' ? '<span class="bdg b-ok">آماده تصمیم</span>' :
                    '<span class="bdg b-neu">در انتظار بررسی اولیه</span>'}</td>
              <td class="num" style="white-space:nowrap">${p.date || '۱۴۰۵/۰۶/۱۸'}</td>
              <td>
                ${p.scenario_id ? `<a class="code link" href="#/runs">${p.scenario_id}</a>` :
                  p.study ? `<span class="code muted">${p.study}</span>` : '<span class="muted">—</span>'}
              </td>
              <td style="white-space:nowrap">
                <a class="btn btn-sm" href="#/scientific/proposal/${p.id}">مشاهده و پیگیری</a>
              </td>
            </tr>
            `).join('')}
          </tbody>
        </table>
      </div>` : `
      <div style="padding:32px;text-align:center">
        <div style="margin-bottom:12px;color:var(--text-3)">${ico.doc}</div>
        <b style="font-size:14px">هنوز پیشنهادی ثبت نشده است</b>
        <p class="muted" style="font-size:12.5px;max-width:440px;margin:6px auto 16px auto">
          ایده‌ها، پژوهش‌ها و پیشنهادهای شهری خود را در قالب ساختاریافته ثبت کنید تا در صف کارشناسان تحلیل شهری قرار گیرد.
        </p>
        <a class="btn btn-pri" href="#/scientific/proposals/new">${ico.plus}ثبت اولین پیشنهاد علمی</a>
      </div>`}
    </div>
  </section>

  <!-- Step-by-step workflow guide -->
  <section class="card" style="margin-top:20px">
    <div class="card-h">
      <h3>${ico.flag} چرخه رسیدگی به پیشنهاد نهاد علمی تا سناریو و پشتیبانی تصمیم</h3>
    </div>
    <div class="card-b">
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px">
        <div style="background:#F8FAFB;border:1px solid var(--line);border-radius:var(--r-m);padding:14px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span class="sstep now" style="padding:0;width:22px;height:22px;line-height:22px;text-align:center"><span class="n">${fa(1)}</span></span>
            <b>۱. ثبت پیشنهاد ساختاریافته</b>
          </div>
          <p class="muted" style="font-size:11.5px;margin:0">تبیین دقیق مسئله، محدوده روی نقشه، اهداف، مبنای علمی و تفکیک اثرات مثبت، منفی و ریسک‌ها.</p>
        </div>
        <div style="background:#F8FAFB;border:1px solid var(--line);border-radius:var(--r-m);padding:14px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span class="sstep" style="padding:0;width:22px;height:22px;line-height:22px;text-align:center"><span class="n">${fa(2)}</span></span>
            <b>۲. غربالگری و بررسی اولیه</b>
          </div>
          <p class="muted" style="font-size:11.5px;margin:0">کارشناس تحلیل شهری مدارک و داده‌های مکانی را با ضوابط طرح جامع و وضع موجود مقایسه می‌کند.</p>
        </div>
        <div style="background:#F8FAFB;border:1px solid var(--line);border-radius:var(--r-m);padding:14px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span class="sstep" style="padding:0;width:22px;height:22px;line-height:22px;text-align:center"><span class="n">${fa(3)}</span></span>
            <b>۳. تبدیل به سناریوی تحلیلی</b>
          </div>
          <p class="muted" style="font-size:11.5px;margin:0">ایجاد سناریوی رسمی با ارجاع پایدار <span class="code">scenario.proposal_id = proposal.id</span>.</p>
        </div>
        <div style="background:#F8FAFB;border:1px solid var(--line);border-radius:var(--r-m);padding:14px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span class="sstep" style="padding:0;width:22px;height:22px;line-height:22px;text-align:center"><span class="n">${fa(4)}</span></span>
            <b>۴. ارزیابی در ماژول‌های ۱۲گانه</b>
          </div>
          <p class="muted" style="font-size:11.5px;margin:0">شبیه‌سازی اثرات ترافیک، مسکن، خدمات، محیط‌زیست، سایه‌اندازی، پارکینگ و انرژی (M01-M12).</p>
        </div>
        <div style="background:#F8FAFB;border:1px solid var(--line);border-radius:var(--r-m);padding:14px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span class="sstep" style="padding:0;width:22px;height:22px;line-height:22px;text-align:center"><span class="n">${fa(5)}</span></span>
            <b>۵. گزارش شواهد و تصمیم</b>
          </div>
          <p class="muted" style="font-size:11.5px;margin:0">تولید بسته شواهد تطبیقی برای بازبینان و مراجع ذی‌صلاح شهرداری جهت تصمیم‌گیری نهایی.</p>
        </div>
      </div>
    </div>
  </section>
  `);
}

function bindScientificDashboard() {
  bindRows();
}

/* ---------- 2. SCIENTIFIC PROFILE EDIT / VIEW ---------- */
function ScientificProfilePage() {
  const u = STATE.user || { name: 'دکتر فریبرز سمیعی', phone: '09123456789', org: 'دانشگاه تهران', title: 'استاد دانشگاه' };
  const prof = window.SCI.profile || {
    first_name: 'فریبرز',
    last_name: 'سمیعی',
    phone: u.phone || '09123456789',
    email: 'samiei@ut.ac.ir',
    profession_type: 'استاد دانشگاه',
    field_of_study: 'برنامه‌ریزی شهری و منطقه‌ای',
    academic_degree: 'دکتری',
    university_name: 'دانشگاه تهران',
    faculty_group: 'دانشکده شهرسازی — گروه برنامه‌ریزی شهری',
    student_id_or_license: 'نظام مهندسی: ۱۰-۳-۰۲۴۹',
    experience_years: 18,
    specialties: ['برنامه‌ریزی شهری', 'طراحی شهری', 'حمل‌ونقل', 'GIS و داده‌های مکانی'],
    is_completed: true
  };
  const completion = getProfileCompletion(prof);

  const professions = [
    'دانشجو', 'استاد دانشگاه', 'پژوهشگر', 'مهندس', 'معمار', 'شهرساز',
    'متخصص حمل‌ونقل', 'متخصص محیط‌زیست', 'متخصص اقتصادی', 'متخصص اجتماعی/فرهنگی', 'سایر متخصصان'
  ];

  const degrees = ['کارشناسی', 'کارشناسی ارشد', 'دکتری', 'پسادکتری', 'هیئت علمی', 'شاغل حرفه‌ای'];

  const allSpecialties = [
    'برنامه‌ریزی شهری', 'طراحی شهری', 'معماری', 'حمل‌ونقل', 'ترافیک', 'محیط‌زیست',
    'اقتصاد شهری', 'جامعه‌شناسی شهری', 'مطالعات اجتماعی', 'میراث فرهنگی',
    'زیرساخت و تأسیسات', 'GIS و داده‌های مکانی', 'انرژی', 'مسکن', 'خدمات شهری', 'سایر'
  ];

  return Shell(`${Crumb([{ t: 'میز کار نهاد علمی', h: '#/scientific' }, { t: 'پروفایل علمی و حرفه‌ای' }])}
  <div class="phead">
    <div>
      <div class="eyebrow">حساب کاربری نهاد علمی</div>
      <h1>مشخصات علمی و حرفه‌ای ارائه‌دهنده پیشنهاد</h1>
      <p class="sub">این اطلاعات برای راستی‌آزمایی علمی و اعتبارسنجی تخصص ارائه‌دهنده در ارزیابی کارشناسی ثبت می‌شود.</p>
    </div>
  </div>

  <div class="split">
    <!-- Form Card -->
    <section class="card" style="flex:2">
      <div class="card-h">
        <h3>${ico.user} اطلاعات هویتی، آکادمیک و تخصصی</h3>
      </div>
      <div class="card-b">
        <form id="sc-prof-form" onsubmit="return false">
          <div class="f-grid" style="grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
            <div class="f-row">
              <label class="f-lbl" for="pf-fn">نام *</label>
              <input class="f-in" id="pf-fn" value="${esc(prof.first_name || '')}" placeholder="مثال: فریبرز" required>
            </div>
            <div class="f-row">
              <label class="f-lbl" for="pf-ln">نام خانوادگی *</label>
              <input class="f-in" id="pf-ln" value="${esc(prof.last_name || '')}" placeholder="مثال: سمیعی" required>
            </div>
          </div>

          <div class="f-grid" style="grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
            <div class="f-row">
              <label class="f-lbl" for="pf-ph">شماره تلفن همراه</label>
              <input class="f-in" id="pf-ph" dir="ltr" value="${esc(prof.phone || u.phone || '')}" readonly style="background:#F1F4F8">
            </div>
            <div class="f-row">
              <label class="f-lbl" for="pf-em">پست الکترونیکی سازمانی / دانشگاهی</label>
              <input class="f-in" id="pf-em" type="email" dir="ltr" value="${esc(prof.email || '')}" placeholder="name@university.ac.ir">
            </div>
          </div>

          <div class="f-grid" style="grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
            <div class="f-row">
              <label class="f-lbl" for="pf-pt">نوع کاربر / جایگاه حرفه‌ای *</label>
              <select class="f-in" id="pf-pt">
                ${professions.map(p => `<option value="${p}" ${prof.profession_type === p ? 'selected' : ''}>${p}</option>`).join('')}
              </select>
            </div>
            <div class="f-row">
              <label class="f-lbl" for="pf-deg">مقطع تحصیلی / مرتبه علمی</label>
              <select class="f-in" id="pf-deg">
                ${degrees.map(d => `<option value="${d}" ${prof.academic_degree === d ? 'selected' : ''}>${d}</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="f-row" style="margin-bottom:14px">
            <label class="f-lbl" for="pf-uni">دانشگاه، پژوهشگاه یا مؤسسه متبوع *</label>
            <input class="f-in" id="pf-uni" list="uni-list" value="${esc(prof.university_name || '')}" placeholder="جستجو یا انتخاب دانشگاه..." required>
            <datalist id="uni-list">
              ${window.SCI.universities.map(u => `<option value="${u.name}">${u.type === 'university' ? 'دانشگاه' : 'مرکز پژوهشی'}</option>`).join('')}
            </datalist>
            <span class="sub" style="margin-top:3px">در صورتی که مؤسسه شما در فهرست نبود، نام کامل آن را به صورت دستی تایپ کنید.</span>
          </div>

          <div class="f-grid" style="grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
            <div class="f-row">
              <label class="f-lbl" for="pf-field">رشته تحصیلی / گرایش تخصصی *</label>
              <input class="f-in" id="pf-field" value="${esc(prof.field_of_study || '')}" placeholder="مثال: برنامه‌ریزی شهری، حمل‌ونقل و ترافیک" required>
            </div>
            <div class="f-row">
              <label class="f-lbl" for="pf-fac">دانشکده / گروه علمی / دپارتمان</label>
              <input class="f-in" id="pf-fac" value="${esc(prof.faculty_group || '')}" placeholder="مثال: دانشکده شهرسازی و معماری">
            </div>
          </div>

          <div class="f-grid" style="grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
            <div class="f-row">
              <label class="f-lbl" for="pf-lic">کد دانشجویی / شماره نظام مهندسی / شناسه عضویت</label>
              <input class="f-in" id="pf-lic" value="${esc(prof.student_id_or_license || '')}" placeholder="اختیاری جهت تطبیق هویت حرفه‌ای">
            </div>
            <div class="f-row">
              <label class="f-lbl" for="pf-exp">سابقه فعالیت علمی و پژوهشی (سال)</label>
              <input class="f-in" id="pf-exp" type="number" min="0" max="60" value="${esc(prof.experience_years || '5')}">
            </div>
          </div>

          <div class="f-row" style="margin-bottom:18px">
            <label class="f-lbl">حوزه‌های تخصصی و علایق پژوهشی (انتخاب تگ‌ها) *</label>
            <div class="chipset" id="pf-specialties" style="margin-top:6px;gap:6px">
              ${allSpecialties.map(s => {
                const checked = (prof.specialties || []).includes(s);
                return `<button type="button" class="chip ${checked ? 'on' : ''}" data-spec="${s}">${s}</button>`;
              }).join('')}
            </div>
          </div>

          <div style="display:flex;gap:10px;margin-top:20px;padding-top:14px;border-top:1px solid var(--line)">
            <button class="btn btn-pri" id="pf-save-btn" type="button">${ico.check}ذخیره و به‌روزرسانی پروفایل</button>
            <a class="btn btn-ghost" href="#/scientific">بازگشت به داشبورد</a>
          </div>
        </form>
      </div>
    </section>

    <!-- Side Guidance Card -->
    <aside style="flex:1">
      <div class="card" style="margin-bottom:16px">
        <div class="card-h"><h3>${ico.lock} اصالت و اعتبار علمی</h3></div>
        <div class="card-b">
          <div style="margin-bottom:12px">
            <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
              <span>درجه تکمیل پروفایل:</span>
              <b class="num">${fa(completion)}٪</b>
            </div>
            <div class="prog ${completion >= 80 ? 'ok' : 'warn'}"><i style="width:${completion}%"></i></div>
          </div>
          <p class="muted" style="font-size:12px;line-height:1.6">
            پیشنهادهایی که توسط اعضای هیئت علمی، پژوهشگران صاحب مقاله یا مهندسان دارای صلاحیت ثبت شوند در اولویت غربالگری و تخصیص سناریو قرار می‌گیرند.
          </p>
          <div class="notice n-demo" style="margin-top:10px;font-size:11.5px">
            اطلاعات هویتی شما صرفاً در فرآیند ارزیابی کارشناسی نمایش داده می‌شود و در دسترس عمومی قرار نمی‌گیرد.
          </div>
        </div>
      </div>
    </aside>
  </div>`);
}

function bindScientificProfile() {
  const selectedSpecs = new Set(window.SCI.profile?.specialties || ['برنامه‌ریزی شهری', 'حمل‌ونقل']);

  els('[data-spec]').forEach(btn => {
    btn.onclick = () => {
      const s = btn.dataset.spec;
      if (selectedSpecs.has(s)) {
        selectedSpecs.delete(s);
        btn.classList.remove('on');
      } else {
        selectedSpecs.add(s);
        btn.classList.add('on');
      }
    };
  });

  const saveBtn = el('#pf-save-btn');
  if (saveBtn) {
    saveBtn.onclick = () => {
      const fn = el('#pf-fn').value.trim();
      const ln = el('#pf-ln').value.trim();
      const uni = el('#pf-uni').value.trim();
      const field = el('#pf-field').value.trim();

      if (!fn || !ln || !uni || !field) {
        toast('لطفاً همه فیلدهای الزامی ستاره‌دار را تکمیل کنید', false);
        return;
      }

      const updated = {
        first_name: fn,
        last_name: ln,
        phone: el('#pf-ph').value.trim(),
        email: el('#pf-em').value.trim(),
        profession_type: el('#pf-pt').value,
        academic_degree: el('#pf-deg').value,
        university_name: uni,
        faculty_group: el('#pf-fac').value.trim(),
        field_of_study: field,
        student_id_or_license: el('#pf-lic').value.trim(),
        experience_years: parseInt(el('#pf-exp').value, 10) || 0,
        specialties: [...selectedSpecs],
        is_completed: true
      };

      window.SCI.profile = updated;
      if (STATE.user) {
        STATE.user.name = `${fn} ${ln}`;
        STATE.user.org = uni;
        STATE.user.title = updated.profession_type;
        save();
      }

      // Call API
      fetch('/api/scientific/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: updated.phone, ...updated })
      }).catch(() => {});

      toast('مشخصات علمی و حرفه‌ای شما با موفقیت به‌روزرسانی شد');
      setTimeout(() => { go('#/scientific'); }, 600);
    };
  }
}

/* ---------- 3. MULTI-STEP PROPOSAL REGISTRATION WIZARD ---------- */
function ScientificNewProposalWizard() {
  const w = window.SCI.wizard;
  const s = w.step;
  const d = w.data;

  const STEPS = [
    'اطلاعات اصلی',
    'مکان و نقشه',
    'شرح مسئله',
    'ایده، مبنای علمی و پیامدها',
    'مستندات و پیوست‌ها',
    'بازبینی نهایی'
  ];

  let body = '';

  // STEP 0: Main Info
  if (s === 0) {
    body = `
    <div class="f-row" style="margin-bottom:14px">
      <label class="f-lbl" for="pw-title">عنوان کامل ایده / پیشنهاد *</label>
      <input class="f-in" id="pw-title" value="${esc(d.title)}" placeholder="مثال: ساماندهی پهنه ایستگاهی و آرام‌سازی ترافیک پیرامون محور انقلاب" required>
      <span class="sub">عنوان باید واضح، دقیق و نشان‌دهنده نوع مداخله باشد.</span>
    </div>

    <div class="f-row" style="margin-bottom:14px">
      <label class="f-lbl" for="pw-desc">توضیح کوتاه و خلاصه اجرایی (حداکثر دو جمله) *</label>
      <textarea class="f-in" id="pw-desc" rows="2" placeholder="خلاصه هدف و نتیجه اصلی پیشنهاد را به زبان ساده بنویسید..." required>${esc(d.description)}</textarea>
    </div>

    <div class="f-grid" style="grid-template-columns:1fr 1fr;gap:14px">
      <div class="f-row">
        <label class="f-lbl" for="pw-topic">حوزه موضوعی اصلی *</label>
        <select class="f-in" id="pw-topic">
          ${['کالبدی', 'کاربری و عملکرد', 'حمل‌ونقل', 'محیط‌زیست', 'اجتماعی و فرهنگی', 'اقتصادی', 'زیرساخت', 'مسکن']
            .map(t => `<option value="${t}" ${d.topic === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </div>
      <div class="f-row">
        <label class="f-lbl" for="pw-type">نوع پیشنهاد *</label>
        <select class="f-in" id="pw-type">
          ${['حمل‌ونقل', 'توسعه خدمات شهری', 'تغییر کاربری', 'تغییر تراکم', 'افزایش/کاهش ارتفاع', 'پارکینگ', 'محیط‌زیست', 'فضای سبز', 'مسکن', 'زیرساخت', 'مسائل اجتماعی', 'اقتصادی', 'طراحی شهری', 'سایر']
            .map(t => `<option value="${t}" ${d.proposal_type === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </div>
    </div>`;
  }

  // STEP 1: Location & Map
  else if (s === 1) {
    body = `
    <div class="f-grid" style="grid-template-columns:1fr 1fr 1fr 1fr;gap:12px;margin-bottom:14px">
      <div class="f-row">
        <label class="f-lbl">استان</label>
        <input class="f-in" value="تهران" readonly style="background:#F1F4F8">
      </div>
      <div class="f-row">
        <label class="f-lbl">شهر</label>
        <input class="f-in" value="تهران" readonly style="background:#F1F4F8">
      </div>
      <div class="f-row">
        <label class="f-lbl" for="pw-region">منطقه شهرداری *</label>
        <select class="f-in" id="pw-region">
          ${Array.from({ length: 22 }, (_, i) => `منطقه ${i + 1}`).map(r => `<option value="${r}" ${d.region === r ? 'selected' : ''}>${r}</option>`).join('')}
        </select>
      </div>
      <div class="f-row">
        <label class="f-lbl" for="pw-dist">ناحیه *</label>
        <select class="f-in" id="pw-dist">
          ${['ناحیه ۱', 'ناحیه ۲', 'ناحیه ۳', 'ناحیه ۴'].map(n => `<option value="${n}" ${d.district === n ? 'selected' : ''}>${n}</option>`).join('')}
        </select>
      </div>
    </div>

    <div class="f-row" style="margin-bottom:14px">
      <label class="f-lbl" for="pw-subarea">محدوده، محله یا معبر دقیق‌تر</label>
      <input class="f-in" id="pw-subarea" value="${esc(d.sub_area)}" placeholder="مثال: محور خیابان کارگر شمالی حدفاصل نصرت تا بلوار کشاورز">
    </div>

    <div style="margin-bottom:10px;display:flex;align-items:center;justify-content:space-between">
      <label class="f-lbl">ترسیم و مشخص کردن محدوده روی نقشه رقومی تهران</label>
      <div class="chipset">
        <button type="button" class="chip ${d.mapMode === 'polygon' ? 'on' : ''}" data-mm="polygon">${ico.layers}ترسیم چندضلعی (Polygon)</button>
        <button type="button" class="chip ${d.mapMode === 'point' ? 'on' : ''}" data-mm="point">${ico.map}نقطه کانونی (Point)</button>
        <button type="button" class="chip ${d.mapMode === 'parcels' ? 'on' : ''}" data-mm="parcels">${ico.rules}انتخاب بلوک / قطعات</button>
      </div>
    </div>

    <!-- Interactive Canvas Map -->
    <div style="border:1px solid var(--line);border-radius:var(--r-m);overflow:hidden;background:#F8FAFB">
      <svg id="pw-map-svg" viewBox="0 0 600 320" width="100%" style="display:block;cursor:crosshair">
        <!-- Background Grid & Roads -->
        <rect width="600" height="320" fill="#0A1624"/>
        <g stroke="#18324E" stroke-width="1"><path d="M0 80h600M0 160h600M0 240h600M120 0v320M240 0v320M360 0v320M480 0v320"/></g>
        <g stroke="#2D5A88" stroke-width="6" opacity="0.7"><path d="M0 140h600M280 0v320"/></g>
        <g stroke="#5CA1D8" stroke-width="1.2" opacity="0.6"><path d="M0 140h600M280 0v320"/></g>

        <!-- City Blocks -->
        <rect x="70" y="30" width="160" height="85" fill="#13263B" stroke="#22405F" stroke-width="1" rx="4"/>
        <rect x="330" y="30" width="210" height="85" fill="#13263B" stroke="#22405F" stroke-width="1" rx="4"/>
        <rect x="70" y="180" width="160" height="110" fill="#13263B" stroke="#22405F" stroke-width="1" rx="4"/>
        <rect x="330" y="180" width="210" height="110" fill="#13263B" stroke="#22405F" stroke-width="1" rx="4"/>

        <!-- Drawn Proposal Zone -->
        <polygon points="190,70 390,75 385,220 185,215" fill="rgba(91,68,214,0.3)" stroke="#8878F0" stroke-width="2.5" stroke-dasharray="6 4"/>
        <circle cx="280" cy="140" r="6" fill="#E6B455"/>
        <circle cx="280" cy="140" r="16" fill="none" stroke="#E6B455" stroke-opacity="0.4"/>

        <text x="580" y="25" fill="#9FB4C8" font-size="11" font-family="Vazirmatn,Tahoma" text-anchor="end" direction="rtl">محدوده انتخابی: پهنه مرکزی منطقه ۶ — مساحت تقریبی: ۳۸۴٬۰۰۰ متر مربع</text>
        <text x="580" y="45" fill="#5B93C7" font-size="10" font-family="monospace" text-anchor="end">EPSG:32639 · 35.7018° N, 51.3945° E</text>
      </svg>
    </div>
    <div class="sub" style="margin-top:6px">
      * اگر ترسیم دقیق محدوده انجام نشود، پیشنهاد به کل ناحیه انتخابی پیوند می‌خورد.
    </div>`;
  }

  // STEP 2: Structured Problem Statement
  else if (s === 2) {
    body = `
    <div class="f-row" style="margin-bottom:14px">
      <label class="f-lbl" for="pw-prob">شرح مسئله (مسئله‌ای که این پیشنهاد قصد حل آن را دارد) *</label>
      <textarea class="f-in" id="pw-prob" rows="3" placeholder="مسئله وضع موجود را به صورت دقیق و عینی بیان کنید..." required>${esc(d.problem_statement)}</textarea>
    </div>

    <div class="f-grid" style="grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
      <div class="f-row">
        <label class="f-lbl" for="pw-curr">وضعیت فعلی در محدوده</label>
        <textarea class="f-in" id="pw-curr" rows="2" placeholder="شرح وضعیت کنونی کالبدی، ترافیکی یا جمعیتی...">${esc(d.current_state)}</textarea>
      </div>
      <div class="f-row">
        <label class="f-lbl" for="pw-signif">علت اهمیت و فوریت مسئله</label>
        <textarea class="f-in" id="pw-signif" rows="2" placeholder="چرا رسیدگی به این مسئله ضرورت دارد؟">${esc(d.problem_significance)}</textarea>
      </div>
    </div>

    <div class="f-row" style="margin-bottom:14px">
      <label class="f-lbl" for="pw-aff">گروه‌ها، اقشار یا نهادهای تحت تأثیر</label>
      <input class="f-in" id="pw-aff" value="${esc(d.affected_groups)}" placeholder="مثال: ساکنان محله، عابران پیاده، دانشجویان، کسبه راسته تجاری">
    </div>

    <div class="f-grid" style="grid-template-columns:1fr 1fr;gap:14px">
      <div class="f-row">
        <label class="f-lbl" for="pw-obj">هدف پیشنهادی مداخله *</label>
        <input class="f-in" id="pw-obj" value="${esc(d.objective)}" placeholder="مثال: کاهش ترافیک عبوری و توسعه شبکه آرام‌سازی پیاده" required>
      </div>
      <div class="f-row">
        <label class="f-lbl" for="pw-out">نتیجه یا پیامد مطلوب مورد انتظار</label>
        <input class="f-in" id="pw-out" value="${esc(d.expected_outcome)}" placeholder="مثال: کاهش ۳۰ درصدی آلودگی صوتی و بهبود ایمنی تردد">
      </div>
    </div>`;
  }

  // STEP 3: Full Idea, Scientific Basis & Impact Decomposition
  else if (s === 3) {
    body = `
    <div class="f-row" style="margin-bottom:14px">
      <label class="f-lbl" for="pw-full">شرح کامل ایده / پیشنهاد *</label>
      <textarea class="f-in" id="pw-full" rows="3" placeholder="مداخله کالبدی، ضابطه‌ای یا مدیریتی پیشنهادی را تشریح کنید..." required>${esc(d.full_proposal_description)}</textarea>
    </div>

    <div class="f-row" style="margin-bottom:16px">
      <label class="f-lbl" for="pw-basis">مبنای علمی و پژوهشی پیشنهاد (پژوهش، پایان‌نامه، مقاله یا مدل ارجاع‌شده) *</label>
      <textarea class="f-in" id="pw-basis" rows="2" placeholder="مطالعات دانشگاهی، مدل‌های شبیه‌سازی یا تجارب مستند پشتیبان این ایده را قید فرمایید..." required>${esc(d.scientific_basis)}</textarea>
      <span class="sub">این بخش جهت داوری کارشناسی بسیار حائز اهمیت است.</span>
    </div>

    <div class="notice n-demo" style="margin-bottom:14px">
      ${ico.spark}
      <div><b>دیدگاه ارائه‌دهنده:</b> تفکیک شفاف پیامدهای مثبت، منفی و ریسک‌ها نشان‌دهنده دقت علمی است. سیستم در مراحل بعد این پیش‌بینی‌ها را با مدل‌های تحلیلی رسمی راستی‌آزمایی می‌کند.</div>
    </div>

    <div class="f-grid" style="grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
      <div class="f-row">
        <label class="f-lbl" for="pw-imp-pos">اثرات مثبت احتمالی (با ویرگول جدا کنید)</label>
        <textarea class="f-in" id="pw-imp-pos" rows="2" placeholder="مثال: افزایش سهم پیاده‌روی، رونق کسب‌وکارهای محلی">${esc((d.expected_impacts.positive || []).join('، '))}</textarea>
      </div>
      <div class="f-row">
        <label class="f-lbl" for="pw-imp-neg">اثرات منفی یا فشارهای جانبی احتمالی</label>
        <textarea class="f-in" id="pw-imp-neg" rows="2" placeholder="مثال: انتقال ترافیک به رینگ پیرامونی">${esc((d.expected_impacts.negative || []).join('، '))}</textarea>
      </div>
    </div>

    <div class="f-grid" style="grid-template-columns:1fr 1fr 1fr;gap:12px">
      <div class="f-row">
        <label class="f-lbl" for="pw-imp-risk">ریسک‌ها</label>
        <input class="f-in" id="pw-imp-risk" value="${esc((d.expected_impacts.risks || []).join('، '))}" placeholder="ریسک‌های اجرایی یا اجتماعی">
      </div>
      <div class="f-row">
        <label class="f-lbl" for="pw-imp-lim">محدودیت‌ها</label>
        <input class="f-in" id="pw-imp-lim" value="${esc((d.expected_impacts.limitations || []).join('، '))}" placeholder="محدودیت‌های فنی یا قانونی">
      </div>
      <div class="f-row">
        <label class="f-lbl" for="pw-imp-unc">ابهامات</label>
        <input class="f-in" id="pw-imp-unc" value="${esc((d.expected_impacts.uncertainties || []).join('، '))}" placeholder="ابهام در داده یا رفتار کاربران">
      </div>
    </div>`;
  }

  // STEP 4: Attachments & References
  else if (s === 4) {
    body = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
      <div>
        <b style="font-size:13.5px">اسناد، نقشه‌ها و مدارک علمی پیوست</b>
        <p class="muted" style="font-size:12px;margin:2px 0 0 0">بارگذاری مقاله، گزارش پژوهشی، شیپ‌فایل GIS یا تصاویر مرتبط</p>
      </div>
      <button type="button" class="btn btn-sm btn-pri" id="pw-add-att-btn">${ico.plus}افزودن پیوست جدید</button>
    </div>

    <div id="pw-att-list" style="margin-bottom:18px">
      ${(d.attachments && d.attachments.length) ? d.attachments.map((att, i) => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border:1px solid var(--line);border-radius:var(--r-m);margin-bottom:8px;background:#fff">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="color:var(--brand)">${ico.doc}</span>
          <div>
            <b>${esc(att.title)}</b>
            <div class="muted" style="font-size:11px">${esc(att.type)} · ${esc(att.url_or_filename)} · ${esc(att.size || '1.2 MB')}</div>
          </div>
        </div>
        <button type="button" class="btn btn-sm btn-danger" data-del-att="${i}">${ico.block}حذف</button>
      </div>
      `).join('') : `
      <div style="padding:24px;text-align:center;border:1.5px dashed var(--line);border-radius:var(--r-m);background:#FAFCFD">
        <div style="color:var(--text-3);margin-bottom:6px">${ico.dl}</div>
        <p class="muted" style="font-size:12px;margin:0">هنوز فایلی پیوست نشده است. توصیه می‌شود حداقل یک گزارش یا فایل مبنا بارگذاری نمایید.</p>
      </div>`}
    </div>

    <!-- Quick add attachment form container -->
    <div id="pw-att-form-box" style="display:none;background:#F1F4F8;padding:14px;border-radius:var(--r-m);margin-bottom:16px">
      <b style="font-size:12.5px;display:block;margin-bottom:8px">مشخصات پیوست جدید</b>
      <div class="f-grid" style="grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
        <input class="f-in" id="pw-new-att-title" placeholder="عنوان سند (مثال: گزارش مدل‌سازی ترافیک)">
        <select class="f-in" id="pw-new-att-type">
          <option value="مقاله علمی">مقاله علمی</option>
          <option value="گزارش پژوهشی">گزارش پژوهشی</option>
          <option value="نقشه و GIS">نقشه و داده مکانی (GIS/CAD)</option>
          <option value="تصویر / طرح گرافیکی">تصویر / طرح مفهومی</option>
          <option value="فایل PDF/Word">سند مکتوب (PDF/Word)</option>
          <option value="داده / اکسل">پایگاه داده / اکسل آماری</option>
          <option value="لینک منبع">پیوند اینترنتی / منبع برخط</option>
        </select>
      </div>
      <div class="f-row" style="margin-bottom:10px">
        <input class="f-in" id="pw-new-att-file" placeholder="نام فایل پیوست یا پیوند URL (مثال: report_model_1404.pdf)">
      </div>
      <div style="display:flex;gap:8px">
        <button type="button" class="btn btn-sm btn-pri" id="pw-confirm-att-btn">ثبت پیوست</button>
        <button type="button" class="btn btn-sm btn-ghost" id="pw-cancel-att-btn">انصراف</button>
      </div>
    </div>`;
  }

  // STEP 5: Summary & Final Submission Preview
  else if (s === 5) {
    body = `
    <div class="notice n-demo" style="margin-bottom:16px">
      ${ico.flag}
      <div>
        <b>تأییدیه ارسال رسمی:</b> با کلیک روی «ثبت نهایی پیشنهاد»، پرونده با وضعیت <b>SUBMITTED (ارسال‌شده)</b> در سامانه ثبت شده و شناسه یکتای پیگیری دریافت می‌کند. پس از ثبت، پیشنهاد در صف کارشناسان تحلیل شهری قرار خواهد گرفت و هرگونه تغییر وضعیت در دفتر ممیزی (Audit Log) درج خواهد شد.
      </div>
    </div>

    <div class="card" style="border:1px solid var(--line);margin-bottom:16px">
      <div class="card-b">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;border-bottom:1px solid var(--line);padding-bottom:10px">
          <div>
            <span class="bdg b-run">${esc(d.proposal_type)}</span>
            <h2 style="margin:6px 0 2px 0;font-size:16px">${esc(d.title || 'پیشنهاد بدون عنوان')}</h2>
            <div class="muted" style="font-size:12px">${esc(d.region)} · ${esc(d.district)} ${d.sub_area ? `· ${esc(d.sub_area)}` : ''}</div>
          </div>
          <div class="sub">
            <b>ارائه‌دهنده:</b> ${esc(STATE.user?.name || 'نهاد علمی')}<br>
            <b>مؤسسه:</b> ${esc(STATE.user?.org || 'دانشگاه تهران')}
          </div>
        </div>

        <dl class="kv" style="grid-template-columns:140px 1fr;gap:10px 16px;font-size:12.5px">
          <dt class="muted">بیان مسئله</dt>
          <dd>${esc(d.problem_statement || '—')}</dd>

          <dt class="muted">هدف مداخله</dt>
          <dd><b>${esc(d.objective || '—')}</b></dd>

          <dt class="muted">شرح کامل ایده</dt>
          <dd>${esc(d.full_proposal_description || '—')}</dd>

          <dt class="muted">مبنای علمی</dt>
          <dd>${esc(d.scientific_basis || '—')}</dd>

          <dt class="muted">اثرات مثبت</dt>
          <dd style="color:var(--ok)">${(d.expected_impacts.positive || []).join(' · ') || '—'}</dd>

          <dt class="muted">اثرات منفی / ریسک</dt>
          <dd style="color:var(--stop)">${(d.expected_impacts.negative || []).concat(d.expected_impacts.risks || []).join(' · ') || '—'}</dd>

          <dt class="muted">پیوست‌ها</dt>
          <dd>${fa(d.attachments?.length || 0)} فایل مستند</dd>
        </dl>
      </div>
    </div>`;
  }

  // STEP 6: Confirmation Screen with Tracking Number
  else if (s === 6) {
    const trackId = w.confirmedId || 'PR-1405-000128';
    const analyst = w.assignedAnalyst || {
      id: 'مهندس زهرا کاظمی',
      title: 'کارشناس ارشد برنامه‌ریزی شهری',
      org: 'معاونت شهرسازی و معماری',
      phone: '09120000003'
    };
    return Shell(`${Crumb([{ t: 'میز کار نهاد علمی', h: '#/scientific' }, { t: 'ثبت نهایی پیشنهاد' }])}
    <div style="max-width:740px;margin:32px auto;text-align:center">
      <div style="width:60px;height:60px;background:rgba(20,121,90,0.12);color:var(--ok);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px auto">
        ${ico.check}
      </div>
      <h1 style="margin-bottom:8px">پیشنهاد علمی شما با موفقیت ثبت شد</h1>
      <p class="muted" style="font-size:13.5px;line-height:1.6;margin-bottom:20px">
        پیشنهاد شما در دبیرخانه تحلیلی سامانه ثبت گردید و پرونده به‌صورت خودکار جهت اقدام به تحلیلگر شهری ارجاع داده شد.
      </p>

      <div class="card" style="padding:16px 24px;background:#F8FAFC;margin-bottom:20px;display:inline-block;min-width:320px;border:1px solid var(--line)">
        <span class="muted" style="font-size:12px;display:block;margin-bottom:4px">شماره پرونده / پیگیری یکتا (Proposal ID):</span>
        <b class="code" style="font-size:20px;color:var(--brand)">${trackId}</b>
      </div>

      <!-- Prominent referral card as requested by the user: وقتی پرونده ثبت شد خودکار بگه پرونده شما به این تحلیلگر ارجاع داده شد -->
      <div class="card" style="text-align:right;background:#F0FDF4;border:1.5px solid #86EFAC;padding:22px;border-radius:var(--r-l);margin-bottom:24px;box-shadow:0 3px 14px rgba(22,101,52,0.08)">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
          <span style="width:40px;height:40px;border-radius:50%;background:#16A34A;color:#fff;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0">
            ${ico.user}
          </span>
          <div>
            <div style="font-size:12px;color:#15803D;font-weight:700">سامانه ارجاع خودکار TUIP</div>
            <b style="font-size:16px;color:#166534">پرونده شما خودکار به این تحلیلگر ارجاع داده شد:</b>
          </div>
        </div>

        <div style="background:#fff;border:1px solid #BBF7D0;border-radius:var(--r-m);padding:14px 18px;margin-bottom:14px">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
            <div style="display:flex;align-items:center;gap:12px">
              <span class="av" style="background:#0F766E;color:#fff;font-weight:700;font-size:14px">${initials(analyst.id)}</span>
              <div>
                <b style="font-size:15px;color:var(--text)">${analyst.id}</b>
                <div class="muted" style="font-size:12px;margin-top:2px">
                  ${analyst.title} · ${analyst.org}
                </div>
              </div>
            </div>
            <span class="bdg b-ok" style="font-size:12px;padding:5px 12px">
              ${ico.check} اختصاصی در کارتابل
            </span>
          </div>
        </div>

        <div style="font-size:13px;line-height:1.8;color:#166534">
          <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:6px">
            <span style="color:#16A34A;font-weight:bold">•</span>
            <div><b>اختصاصی‌سازی کارتابل:</b> این پیشنهاد اکنون منحصراً در پنل و کارتابل اختصاصی <b>«${analyst.id}»</b> فعال است و سایر تحلیلگران به آن دسترسی ندارند.</div>
          </div>
          <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:6px">
            <span style="color:#16A34A;font-weight:bold">•</span>
            <div><b>اعلان در زنگوله و صندوق پیام‌ها:</b> اعلان رسمی ارجاع در <b>زنگوله اعلان‌ها</b> و یک پیام اختصاصی با شناسه پرونده در <b>صندوق پیام‌های داخلی</b> این تحلیلگر ثبت شد.</div>
          </div>
          <div style="display:flex;align-items:flex-start;gap:8px">
            <span style="color:#16A34A;font-weight:bold">•</span>
            <div><b>گام بعدی کارشناسی:</b> تحلیلگر مذکور پس از بررسی شواهد، مستقیماً اقدام به تدوین سناریوی تحلیلی در ماژول‌های ۱۲گانه نموده یا در صورت نیاز استعلام تکمیلی ارسال خواهد کرد.</div>
          </div>
        </div>
      </div>

      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
        <a class="btn btn-pri" href="#/scientific/proposal/${trackId}">${ico.spark}مشاهده و پیگیری پیشنهاد</a>
        <a class="btn btn-ghost" href="#/scientific">بازگشت به داشبورد نهاد علمی</a>
      </div>
    </div>`);
  }

  return Shell(`${Crumb([{ t: 'میز کار نهاد علمی', h: '#/scientific' }, { t: 'ثبت ایده و پیشنهاد جدید' }])}
  <div class="phead">
    <div>
      <div class="eyebrow">فرم چندمرحله‌ای ثبت پیشنهاد تخصصی</div>
      <h1>ثبت ایده / پیشنهاد علمی و پژوهشی</h1>
      <p class="sub">اطلاعات را در ۶ گام ساختاریافته تکمیل کنید تا امکان بررسی و اتصال آن به سناریوهای تحلیلی فراهم شود.</p>
    </div>
  </div>

  <div class="stepper" style="margin-bottom:20px">
    ${STEPS.map((t, i) => `<span class="sstep ${i < s ? 'done' : i === s ? 'now' : ''}">
      <span class="n">${i < s ? '✓' : fa(i + 1)}</span>${t}
    </span>`).join('')}
  </div>

  <section class="card" style="max-width:960px">
    <div class="card-h">
      <h3>گام ${fa(s + 1)} از ${fa(STEPS.length)}: ${STEPS[s]}</h3>
    </div>
    <div class="card-b">
      ${body}
    </div>
    <div class="card-f" style="display:flex;gap:10px;align-items:center">
      <button class="btn" id="pw-back" ${s === 0 ? 'disabled' : ''}>${ico.chevL}گام قبل</button>
      <button class="btn btn-pri" id="pw-next">${s === 5 ? 'ثبت نهایی پیشنهاد' : 'گام بعد'}</button>
      <a class="btn btn-ghost" href="#/scientific" style="margin-inline-start:auto">انصراف</a>
    </div>
  </section>`);
}

function bindScientificNewProposal() {
  const w = window.SCI.wizard;
  const s = w.step;
  const d = w.data;

  // Step 0 bindings
  if (s === 0) {
    const t = el('#pw-title'); if (t) t.oninput = e => d.title = e.target.value;
    const ds = el('#pw-desc'); if (ds) ds.oninput = e => d.description = e.target.value;
    const top = el('#pw-topic'); if (top) top.onchange = e => d.topic = e.target.value;
    const pt = el('#pw-type'); if (pt) pt.onchange = e => d.proposal_type = e.target.value;
  }

  // Step 1 bindings
  if (s === 1) {
    const reg = el('#pw-region'); if (reg) reg.onchange = e => d.region = e.target.value;
    const dist = el('#pw-dist'); if (dist) dist.onchange = e => d.district = e.target.value;
    const sub = el('#pw-subarea'); if (sub) sub.oninput = e => d.sub_area = e.target.value;
    els('[data-mm]').forEach(btn => {
      btn.onclick = () => {
        d.mapMode = btn.dataset.mm;
        render();
      };
    });
  }

  // Step 2 bindings
  if (s === 2) {
    const pr = el('#pw-prob'); if (pr) pr.oninput = e => d.problem_statement = e.target.value;
    const cur = el('#pw-curr'); if (cur) cur.oninput = e => d.current_state = e.target.value;
    const sig = el('#pw-signif'); if (sig) sig.oninput = e => d.problem_significance = e.target.value;
    const aff = el('#pw-aff'); if (aff) aff.oninput = e => d.affected_groups = e.target.value;
    const obj = el('#pw-obj'); if (obj) obj.oninput = e => d.objective = e.target.value;
    const out = el('#pw-out'); if (out) out.oninput = e => d.expected_outcome = e.target.value;
  }

  // Step 3 bindings
  if (s === 3) {
    const full = el('#pw-full'); if (full) full.oninput = e => d.full_proposal_description = e.target.value;
    const bas = el('#pw-basis'); if (bas) bas.oninput = e => d.scientific_basis = e.target.value;
    const pos = el('#pw-imp-pos'); if (pos) pos.oninput = e => d.expected_impacts.positive = e.target.value.split(/[,،]+/).map(x => x.trim()).filter(Boolean);
    const neg = el('#pw-imp-neg'); if (neg) neg.oninput = e => d.expected_impacts.negative = e.target.value.split(/[,،]+/).map(x => x.trim()).filter(Boolean);
    const rsk = el('#pw-imp-risk'); if (rsk) rsk.oninput = e => d.expected_impacts.risks = e.target.value.split(/[,،]+/).map(x => x.trim()).filter(Boolean);
    const lim = el('#pw-imp-lim'); if (lim) lim.oninput = e => d.expected_impacts.limitations = e.target.value.split(/[,،]+/).map(x => x.trim()).filter(Boolean);
    const unc = el('#pw-imp-unc'); if (unc) unc.oninput = e => d.expected_impacts.uncertainties = e.target.value.split(/[,،]+/).map(x => x.trim()).filter(Boolean);
  }

  // Step 4 bindings (attachments)
  if (s === 4) {
    const addBtn = el('#pw-add-att-btn');
    const formBox = el('#pw-att-form-box');
    if (addBtn && formBox) {
      addBtn.onclick = () => formBox.style.display = 'block';
      el('#pw-cancel-att-btn').onclick = () => formBox.style.display = 'none';
      el('#pw-confirm-att-btn').onclick = () => {
        const title = el('#pw-new-att-title').value.trim();
        const type = el('#pw-new-att-type').value;
        const file = el('#pw-new-att-file').value.trim() || 'document.pdf';
        if (!title) { toast('لطفاً عنوان پیوست را وارد کنید', false); return; }
        d.attachments.push({ id: `ATT-${Date.now()}`, title, type, url_or_filename: file, size: '2.4 MB' });
        render();
      };
    }
    els('[data-del-att]').forEach(b => {
      b.onclick = () => {
        d.attachments.splice(parseInt(b.dataset.delAtt, 10), 1);
        render();
      };
    });
  }

  // Back button
  const back = el('#pw-back');
  if (back) {
    back.onclick = () => {
      if (w.step > 0) { w.step--; render(); }
    };
  }

  // Next / Submit button
  const next = el('#pw-next');
  if (next) {
    next.onclick = () => {
      // Validate step 0
      if (s === 0 && (!d.title || d.title.trim().length < 3)) {
        toast('لطفاً عنوان پیشنهاد را وارد کنید (حداقل ۳ حرف)', false);
        return;
      }
      // Validate step 2
      if (s === 2 && !d.problem_statement) {
        toast('لطفاً شرح مسئله را وارد کنید', false);
        return;
      }
      // Validate step 3
      if (s === 3 && (!d.full_proposal_description || !d.scientific_basis)) {
        toast('لطفاً شرح کامل ایده و مبنای علمی را تکمیل کنید', false);
        return;
      }

      // If at step 5 -> Submit
      if (s === 5) {
        const pId = `PR-1405-${String(Math.floor(100 + Math.random() * 899)).padStart(6, '0')}`;
        w.confirmedId = pId;

        // Auto-assign proposal to urban analyst
        const assignedAnalyst = assignAnalystToProposal(d);
        w.assignedAnalyst = assignedAnalyst;

        const newProp = {
          id: pId,
          proposal_id: pId,
          t: d.title,
          title: d.title,
          type: d.proposal_type,
          src: 'academic',
          by: STATE.user?.name || 'دکتر فریبرز سمیعی',
          owner: STATE.user?.name || 'دکتر فریبرز سمیعی',
          assigned_analyst: assignedAnalyst.id,
          assigned_analyst_name: assignedAnalyst.id,
          assigned_analyst_title: assignedAnalyst.title,
          assigned_analyst_org: assignedAnalyst.org,
          assigned_analyst_phone: assignedAnalyst.phone,
          assigned_at: '۱۴۰۵/۰۶/۲۳',
          date: '۱۴۰۵/۰۶/۲۳',
          upd: '۱۴۰۵/۰۶/۲۳',
          region: d.region,
          scope: `${d.district} — ${d.sub_area || 'پهنه منتخب'}`,
          study: 'ST-1405-014',
          status: 'submitted',
          level: 'mid',
          ver: 'v1',
          q: d.objective,
          prob: d.problem_statement,
          goal: d.objective,
          change: d.full_proposal_description,
          base: 'نسخه‌های پین‌شده فصل صفر مطالعه مرتبط',
          doms: [d.topic, 'کالبدی'],
          ass: ['بر پایه مفروضات مدل علمی دانشگاه'],
          ds: ['PARCEL-06', 'ROAD-06'],
          rules: ['سقف تراکم پهنه', 'ضوابط کاربری'],
          inds: ['شاخص دسترسی', 'تولید سفر'],
          scientific_basis: d.scientific_basis,
          attachments: d.attachments,
          expected_impacts: d.expected_impacts
        };

        // Add to local DB so existing pages see it immediately
        DB.proposals.unshift(newProp);

        // 1. Send notification to the designated analyst (Bell / زنگوله)
        if (!Array.isArray(DB.notifications)) DB.notifications = [];
        DB.notifications.unshift({
          id: `NT-${Date.now()}`,
          to: assignedAnalyst.id,
          title: 'ارجاع پیشنهاد جدید از نهاد علمی',
          msg: `پرونده پیشنهاد «${d.title}» (${pId}) به شما ارجاع داده شد. جهت بررسی و تدوین سناریو وارد کارتابل شوید.`,
          type: 'warn',
          route: '#/analyst/scientific-proposals',
          tm: 'همین الان',
          read: false
        });

        // 2. Send internal message to the designated analyst (Messages / پیام‌های داخلی)
        if (!Array.isArray(DB.messages)) DB.messages = [];
        DB.messages.unshift({
          id: `MS-${Date.now()}`,
          from: STATE.user?.name || 'نهاد علمی و دانشگاهی',
          to: assignedAnalyst.id,
          text: `پرونده پیشنهاد علمی جدید با عنوان «${d.title}» (شناسه یکتا: ${pId}) ثبت گردید و جهت ارزیابی شواهد، بررسی کارشناسی و ایجاد سناریو تحلیلی به شما ارجاع داده شد.`,
          tm: 'همین الان',
          eid: pId,
          route: '#/analyst/scientific-proposals',
          read: false
        });

        logAct({
          action: 'SUBMIT_SCIENTIFIC_PROPOSAL',
          et: 'proposal',
          eid: pId,
          etitle: d.title,
          to: 'submitted',
          text: `پیشنهاد علمی «${d.title}» ثبت و خودکار به کارشناس ${assignedAnalyst.id} ارجاع داده شد`,
          k: 'ok'
        });
        saveDB();

        // Call backend API in background
        fetch('/api/proposals', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-phone': STATE.user?.phone || '09123456789'
          },
          body: JSON.stringify({
            ...d,
            assigned_analyst: assignedAnalyst.id,
            assigned_analyst_name: assignedAnalyst.id,
            assigned_analyst_title: assignedAnalyst.title,
            assigned_analyst_org: assignedAnalyst.org
          })
        }).catch(() => {});

        w.step = 6;
        render();
        toast(`پرونده با موفقیت ثبت و به ${assignedAnalyst.id} ارجاع داده شد`);
        return;
      }

      w.step++;
      render();
    };
  }
}

/* ---------- 4. SCIENTIFIC PROPOSAL DETAIL VIEW ---------- */
function ScientificProposalDetailPage(id) {
  const p = (DB.proposals || []).find(x => x.id === id || x.proposal_id === id);
  if (!p) {
    return Shell(State('search', 'پیشنهاد یافت نشد', 'شناسه پیشنهاد در سامانه ثبت نشده است.', `<a class="btn btn-pri" href="#/scientific">بازگشت به داشبورد</a>`));
  }

  const isNeedsInfo = p.status === 'needevidence' || p.status === 'NEEDS_INFO';

  return Shell(`${Crumb([{ t: 'میز کار نهاد علمی', h: '#/scientific' }, { t: 'پیشنهادهای من', h: '#/scientific/proposals' }, { t: p.id }])}
  <div class="phead">
    <div>
      <div class="eyebrow"><span class="code">${p.id}</span> · نسخه ${p.ver || 'v1'} · نهاد علمی و دانشگاهی</div>
      <h1>${esc(p.t || p.title)}</h1>
      <p class="sub">${esc(p.region)} · ${esc(p.scope || '')} · منشأ: ${esc(p.by || 'نهاد علمی')}</p>
    </div>
    <div class="acts">
      ${sciBadge(p.status)}
    </div>
  </div>

  ${isNeedsInfo ? `
  <div class="card" style="border:1.5px solid var(--warn);background:#FFFCF5;margin-bottom:18px">
    <div class="card-h" style="background:rgba(230,180,85,0.15)">
      <h3 style="color:#7D530A">${ico.alert} استعلام و درخواست تکمیل اطلاعات از سوی کارشناس تحلیل شهری</h3>
    </div>
    <div class="card-b">
      <div style="font-size:13px;color:#593E0A;margin-bottom:12px;line-height:1.6">
        <b>پیام کارشناس (مهندس زهرا کاظمی):</b><br>
        «لطفاً مستندات تفصیلی برآورد بار ترافیکی و هماهنگی با خدمات شهری منطقه پیرامون هزینه نگهداری را تشریح فرموده و در صورت امکان گزارش شبیه‌سازی را پیوست نمایید.»
      </div>
      <div class="f-row" style="margin-bottom:10px">
        <label class="f-lbl">پاسخ و توضیحات تکمیلی شما:</label>
        <textarea class="f-in" id="sci-inquiry-resp" rows="3" placeholder="توضیحات تکمیلی و پاسخ به ابهامات کارشناس را درج فرمایید..."></textarea>
      </div>
      <div style="display:flex;gap:10px;align-items:center">
        <button class="btn btn-pri" id="sci-send-resp-btn">${ico.check}ارسال اطلاعات تکمیلی به کارشناس</button>
        <span class="muted" style="font-size:11.5px">با ارسال پاسخ، وضعیت پیشنهاد به «ارسال‌شده» تغییر یافته و کارشناسی از سر گرفته می‌شود.</span>
      </div>
    </div>
  </div>` : ''}

  <div class="split">
    <div style="flex:2">
      <!-- Problem & Concept -->
      <section class="card" style="margin-bottom:18px">
        <div class="card-h"><h3>${ico.doc} بیان مسئله و اهداف مداخله</h3></div>
        <div class="card-b">
          <dl class="kv" style="grid-template-columns:140px 1fr;gap:12px 16px">
            <dt class="muted">مسئله وضع موجود</dt>
            <dd>${esc(p.prob || 'عدم تعادل در توزیع تقاضای سفر و تداخل شدید پیاده و سواره در پهنه فرهنگی دانشگاهی')}</dd>

            <dt class="muted">هدف مداخله</dt>
            <dd><b>${esc(p.goal || p.q || 'آرام‌سازی سرعت و توسعه فضای امن پیاده')}</b></dd>

            <dt class="muted">شرح پیشنهاد</dt>
            <dd>${esc(p.change || 'محدودسازی ورود خودروهای گذری و اولویت‌بخشی به ناوگان همگانی و پاک')}</dd>

            <dt class="muted">مبنای علمی و پژوهشی</dt>
            <dd><span class="bdg b-neu">${esc(p.scientific_basis || 'مدل‌سازی تقاضای سفر دانشگاه تهران ۱۴۰۳ و الگوی سوپربلاک')}</span></dd>
          </dl>
        </div>
      </section>

      <!-- Expected impacts breakdown -->
      <section class="card" style="margin-bottom:18px">
        <div class="card-h"><h3>${ico.spark} پیش‌بینی پیامدها از دیدگاه نهاد علمی</h3></div>
        <div class="card-b">
          <div class="grid" style="grid-template-columns:1fr 1fr;gap:14px">
            <div style="padding:12px;background:#F6FBF8;border:1px solid #D1EAD9;border-radius:var(--r-m)">
              <b style="color:var(--ok);font-size:12.5px">اثرات مثبت مورد انتظار:</b>
              <ul style="margin:6px 0 0 16px;padding:0;font-size:12px;color:var(--text)">
                <li>کاهش ۳۰ درصدی ترافیک عبوری سواره</li>
                <li>ارتقای ایمنی بیش از ۴۵ هزار دانشجوی روزانه</li>
                <li>کاهش آلودگی صوتی و ذرات معلق</li>
              </ul>
            </div>
            <div style="padding:12px;background:#FCF7F7;border:1px solid #F3D3D3;border-radius:var(--r-m)">
              <b style="color:var(--stop);font-size:12.5px">اثرات منفی، ریسک‌ها و محدودیت‌ها:</b>
              <ul style="margin:6px 0 0 16px;padding:0;font-size:12px;color:var(--text)">
                <li>افزایش ۸ درصدی زمان سفر در رینگ پیرامونی</li>
                <li>وابستگی به همکاری پلیس راهور در مبادی ورودی</li>
                <li>رفتار تغییر مسیر رانندگان در ساعات اوج</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <!-- Attachments -->
      <section class="card">
        <div class="card-h"><h3>${ico.dl} مستندات و منابع پیوست</h3></div>
        <div class="card-b">
          <div class="tw">
            <table class="tbl">
              <thead><tr><th>عنوان منبع</th><th>نوع</th><th>نام فایل</th><th>حجم</th><th>دریافت</th></tr></thead>
              <tbody>
                <tr>
                  <td><b>گزارش ارزیابی ترافیکی سوپربلاک (PDF)</b></td>
                  <td><span class="bdg b-neu">گزارش پژوهشی</span></td>
                  <td class="code">traffic_evaluation_16azar.pdf</td>
                  <td class="num">۴٫۸ MB</td>
                  <td><button class="btn btn-sm" onclick="toast('دریافت فایل شبیه‌سازی...')">${ico.dl}دانلود</button></td>
                </tr>
                <tr>
                  <td><b>نقشه مرز پهنه و شبکه دسترسی جایگزین (GIS)</b></td>
                  <td><span class="bdg b-neu">داده مکانی</span></td>
                  <td class="code">superblock_boundary.geojson</td>
                  <td class="num">۸۲۰ KB</td>
                  <td><button class="btn btn-sm" onclick="toast('دریافت داده مکانی...')">${ico.dl}دانلود</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>

    <!-- Sidebar: Map & Audit Trail -->
    <aside style="flex:1">
      <!-- Assigned Analyst Card -->
      <div class="card" style="margin-bottom:18px;border-inline-start:4px solid var(--ok);background:#FBFDFB">
        <div class="card-h" style="background:rgba(20,121,90,0.06)">
          <h3 style="color:#166534">${ico.user} تحلیلگر مسئول پرونده</h3>
        </div>
        <div class="card-b">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
            <span class="av sm" style="background:#0F766E;color:#fff;font-weight:700">${initials(p.assigned_analyst || (p.id === 'PR-1405-000124' ? 'مهندس زهرا کاظمی' : 'امیرحسین طاهری'))}</span>
            <div>
              <b style="font-size:14px;color:var(--text)">${esc(p.assigned_analyst || (p.id === 'PR-1405-000124' ? 'مهندس زهرا کاظمی' : 'امیرحسین طاهری'))}</b>
              <div class="muted" style="font-size:11.5px">${esc(p.assigned_analyst_title || (p.id === 'PR-1405-000124' ? 'کارشناس ارشد برنامه‌ریزی شهری' : 'کارشناس منطقه'))} · ${esc(p.assigned_analyst_org || (p.id === 'PR-1405-000124' ? 'معاونت شهرسازی و معماری' : 'شهرداری منطقه ۶'))}</div>
            </div>
          </div>
          <div class="sub" style="font-size:12px;line-height:1.6;color:var(--text-2);margin-top:8px;border-top:1px dashed var(--line);padding-top:8px">
            این پرونده خودکار به کارتابل این تحلیلگر ارجاع شده و منحصراً در پنل ایشان جهت بررسی و تدوین سناریو قرار دارد.
          </div>
        </div>
      </div>

      <div class="card" style="margin-bottom:18px">
        <div class="card-h"><h3>${ico.map} موقعیت مکانی و پهنه</h3></div>
        <div class="card-b" style="padding:0">
          <svg viewBox="0 0 320 200" width="100%" style="background:#0F1D2C;display:block">
            <g stroke="#22405F" stroke-width="1"><path d="M0 50h320M0 100h320M0 150h320M80 0v200M160 0v200M240 0v200"/></g>
            <g stroke="#3D72A3" stroke-width="5"><path d="M0 100h320M160 0v200"/></g>
            <polygon points="100,50 220,55 215,150 95,145" fill="rgba(91,68,214,0.35)" stroke="#8878F0" stroke-width="2"/>
            <circle cx="160" cy="100" r="5" fill="#E6B455"/>
            <text x="310" y="20" fill="#9FB4C8" font-size="10" font-family="Vazirmatn" text-anchor="end">${esc(p.region)} · ${esc(p.scope || '')}</text>
          </svg>
          <div style="padding:10px 14px;font-size:11.5px" class="muted">
            مساحت تقریبی: ۳۸۴٬۰۰۰ متر مربع · مرجع هندسی: EPSG:32639
          </div>
        </div>
      </div>

      <!-- Audit History -->
      <div class="card">
        <div class="card-h"><h3>${ico.git} تاریخچه رویدادها (Audit Trail)</h3></div>
        <div class="card-b">
          <div class="timeline" style="font-size:12px">
            <div class="tl-i" style="padding-bottom:14px">
              <span class="tl-d ok"></span>
              <b>ثبت و ارسال پیشنهاد توسط نهاد علمی</b>
              <div class="muted" style="font-size:11px">${p.date || '۱۴۰۵/۰۶/۱۸'} · ${esc(p.by || 'دکتر سمیعی')}</div>
            </div>
            <div class="tl-i" style="padding-bottom:14px">
              <span class="tl-d run"></span>
              <b>بررسی مدارک در کارتابل تحلیلگر شهری</b>
              <div class="muted" style="font-size:11px">۱۴۰۵/۰۶/۱۹ · مهندس زهرا کاظمی</div>
            </div>
            ${p.scenario_id ? `
            <div class="tl-i">
              <span class="tl-d ok"></span>
              <b>تبدیل به سناریوی رسمی تحلیلی</b>
              <div class="muted" style="font-size:11px">شناسه: <span class="code">${p.scenario_id}</span></div>
            </div>` : ''}
          </div>
        </div>
      </div>
    </aside>
  </div>`);
}

function bindScientificProposalDetail(id) {
  const respBtn = el('#sci-send-resp-btn');
  if (respBtn) {
    respBtn.onclick = () => {
      const txt = el('#sci-inquiry-resp').value.trim();
      if (!txt) { toast('لطفاً متن پاسخ را درج فرمایید', false); return; }

      const p = (DB.proposals || []).find(x => x.id === id || x.proposal_id === id);
      if (p) {
        p.status = 'ready';
        p.next = 'بررسی کارشناسی پاسخ تکمیلی';
        logAct({
          action: 'RESPOND_INQUIRY',
          et: 'proposal',
          eid: id,
          etitle: p.t,
          to: 'ready',
          text: `نهاد علمی به استعلام کارشناس پاسخ داد: ${txt.slice(0, 60)}...`,
          k: 'ok'
        });
        saveDB();
        toast('اطلاعات تکمیلی برای کارشناس تحلیل شهری ارسال شد');
        render();
      }
    };
  }
}

/* ---------- 5. URBAN ANALYST: SCIENTIFIC PROPOSALS QUEUE ---------- */
function AnalystScientificProposalsPage() {
  const f = window.SCI.analystFilters;
  const curUser = STATE.user;
  const isAnalyst = curUser && curUser.role === 'analyst';
  const myName = ME();

  // All scientific proposals
  let all = (DB.proposals || []).filter(p => p.src === 'academic' || p.id === 'PR-1405-000124' || p.id === 'PR-1405-000125');

  // Filter exclusively for this analyst if logged in as analyst
  if (isAnalyst) {
    all = all.filter(p => {
      if (p.assigned_analyst) {
        return p.assigned_analyst === myName;
      }
      if (p.id === 'PR-1405-000124') return myName === 'مهندس زهرا کاظمی';
      if (p.id === 'PR-1405-000125') return myName === 'امیرحسین طاهری';
      return false;
    });
  }

  // Multi-criteria filter execution
  const filtered = all.filter(p => {
    if (f.region && p.region !== f.region) return false;
    if (f.district && !p.scope?.includes(f.district)) return false;
    if (f.topic && p.type !== f.topic) return false;
    if (f.type && p.type !== f.type) return false;
    if (f.status && p.status !== f.status) return false;
    if (f.search) {
      const q = f.search.toLowerCase();
      const match = (p.t || '').toLowerCase().includes(q) ||
                    (p.id || '').toLowerCase().includes(q) ||
                    (p.by || '').toLowerCase().includes(q) ||
                    (p.prob || '').toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return Shell(`${Crumb([{ t: 'میز کار تحلیلگر', h: '#/' }, { t: 'پیشنهادهای نهادهای علمی' }])}
  <div class="phead">
    <div>
      <div class="eyebrow">کارتابل تحلیلگر شهری · ارزیابی ورودی‌های علمی و دانشگاهی</div>
      <h1>پیشنهادهای نهادهای علمی و تخصصی</h1>
      <p class="sub">بررسی پیشنهادهای دانشگاهی، پالایش شواهد، درخواست استعلام تکمیلی و تبدیل پیشنهاد به سناریوی تحلیلی رسمی</p>
    </div>
  </div>

  ${isAnalyst ? `
  <!-- Dedicated Analyst Queue Banner -->
  <div class="notice n-ok" style="margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;border-right:4px solid var(--ok);background:#F0FDF4;padding:12px 16px">
    <div style="display:flex;align-items:center;gap:12px">
      <span class="av sm" style="background:#0F766E;color:#fff;font-weight:700">${initials(myName)}</span>
      <div>
        <b style="color:#166534">کارتابل ارجاعات اختصاصی: ${esc(myName)} (${esc(curUser?.title || 'کارشناس تحلیل')})</b>
        <div class="muted" style="font-size:12px;margin-top:2px">این صفحه منحصراً شامل پیشنهادهای علمی است که خودکار توسط سامانه به شما ارجاع داده شده‌اند.</div>
      </div>
    </div>
    <span class="bdg b-ok plain num" style="font-size:12px">${fa(filtered.length)} پیشنهاد در صف شما</span>
  </div>` : ''}

  <!-- Notice of workflow -->
  <div class="notice n-demo" style="margin-bottom:16px">
    ${ico.spark}
    <div>
      <b>جریان تبدیل پیشنهاد به سناریو:</b> پس از بررسی شواهد، با کلیک روی <b>«ایجاد سناریو از این پیشنهاد»</b>، یک سناریوی جدید متصل به مطالعه مربوطه ایجاد می‌شود (<span class="code">scenario.proposal_id = proposal.id</span>) و وارد ماژول‌های تحلیل اثر ۱۲گانه می‌گردد.
    </div>
  </div>

  <!-- Advanced Multi-Criteria Filter Bar -->
  <section class="card" style="margin-bottom:16px">
    <div class="filterbar" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center">
      <!-- Search -->
      <div class="fld" style="min-width:220px">
        ${ico.search}
        <input id="an-sci-q" placeholder="جستجو در عنوان، شناسه یا پژوهشگر..." value="${esc(f.search)}">
      </div>

      <!-- Region Filter -->
      <div class="fld">
        ${ico.filter}
        <select id="an-sci-reg">
          <option value="">همه مناطق (۲۲ گانه)</option>
          ${Array.from({ length: 22 }, (_, i) => `منطقه ${i + 1}`).map(r => `<option value="${r}" ${f.region === r ? 'selected' : ''}>${r}</option>`).join('')}
        </select>
      </div>

      <!-- District Filter -->
      <div class="fld">
        <select id="an-sci-dist">
          <option value="">همه ناحیه‌ها</option>
          <option value="ناحیه ۱" ${f.district === 'ناحیه ۱' ? 'selected' : ''}>ناحیه ۱</option>
          <option value="ناحیه ۲" ${f.district === 'ناحیه ۲' ? 'selected' : ''}>ناحیه ۲</option>
          <option value="ناحیه ۳" ${f.district === 'ناحیه ۳' ? 'selected' : ''}>ناحیه ۳</option>
          <option value="ناحیه ۴" ${f.district === 'ناحیه ۴' ? 'selected' : ''}>ناحیه ۴</option>
        </select>
      </div>

      <!-- Topic Filter -->
      <div class="fld">
        <select id="an-sci-topic">
          <option value="">همه موضوعات</option>
          ${['حمل‌ونقل', 'محیط‌زیست', 'کالبدی', 'کاربری و عملکرد', 'توسعه خدمات شهری', 'مسکن'].map(t => `<option value="${t}" ${f.topic === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </div>

      <!-- Status Filter -->
      <div class="fld">
        <select id="an-sci-st">
          <option value="">همه وضعیت‌ها</option>
          <option value="submitted" ${f.status === 'submitted' ? 'selected' : ''}>ارسال‌شده به کارشناس</option>
          <option value="needevidence" ${f.status === 'needevidence' ? 'selected' : ''}>نیازمند تکمیل اطلاعات</option>
          <option value="ready" ${f.status === 'ready' ? 'selected' : ''}>آماده تبدیل به سناریو</option>
          <option value="partial" ${f.status === 'partial' ? 'selected' : ''}>تحلیل‌شده در سناریو</option>
        </select>
      </div>

      <!-- Quick Preset: Region 5 / District 2 / Transport -->
      <button class="btn btn-sm" id="an-quick-filter-r5" style="white-space:nowrap;font-size:11.5px">
        ${ico.map} فیلتر نمونه: منطقه ۵ → ناحیه ۲
      </button>

      <button class="btn btn-sm" id="an-quick-filter-r6" style="white-space:nowrap;font-size:11.5px">
        ${ico.map} فیلتر نمونه: منطقه ۶ → ناحیه ۲ → حمل‌ونقل
      </button>

      <button class="btn btn-sm btn-ghost" id="an-reset-filters" style="margin-inline-start:auto">بازنشانی فیلترها</button>
    </div>
  </section>

  <!-- Proposals Table -->
  <section class="card">
    <div class="card-h" style="display:flex;justify-content:space-between;align-items:center">
      <h3>فهرست پیشنهادهای علمی (${fa(filtered.length)} مورد)</h3>
    </div>
    <div class="card-b" style="padding:0">
      ${filtered.length ? `
      <div class="tw">
        <table class="tbl">
          <thead>
            <tr>
              <th>شناسه و عنوان پیشنهاد</th>
              <th>تحلیلگر ارجاع‌شده</th>
              <th>موضوع / نوع</th>
              <th>محدوده جغرافیایی</th>
              <th>ارائه‌دهنده و مؤسسه علمی</th>
              <th>تاریخ ثبت</th>
              <th>وضعیت</th>
              <th>سناریوی تحلیلی متصل</th>
              <th>اقدام کارشناسی</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(p => `
            <tr>
              <td>
                <b class="ttl">${esc(p.t || p.title)}</b>
                <div class="sub"><span class="code">${p.id}</span> · نسخه ${p.ver || 'v1'}</div>
              </td>
              <td style="white-space:nowrap">
                <span class="bdg b-pri" style="font-size:11px">
                  ${ico.user} ${esc(p.assigned_analyst || (p.id === 'PR-1405-000124' ? 'مهندس زهرا کاظمی' : 'امیرحسین طاهری'))}
                </span>
              </td>
              <td style="white-space:nowrap"><span class="bdg b-neu">${esc(p.type || 'حمل‌ونقل')}</span></td>
              <td>${esc(p.region)}<div class="sub">${esc(p.scope || 'ناحیه ۲')}</div></td>
              <td>
                <b>${esc(p.by || 'پژوهشگر')}</b>
                <div class="muted" style="font-size:11px">نهاد علمی دانشگاهی</div>
              </td>
              <td class="num" style="white-space:nowrap">${p.date || '۱۴۰۵/۰۶/۱۸'}</td>
              <td>
                ${p.scenario_id ? '<span class="bdg b-ok">دارای سناریو</span>' :
                  p.status === 'needevidence' ? '<span class="bdg b-warn">نیازمند تکمیل</span>' :
                  '<span class="bdg b-run">آماده ایجاد سناریو</span>'}
              </td>
              <td>
                ${p.scenario_id ? `<a class="code link" href="#/runs">${p.scenario_id}</a>` : '<span class="muted">—</span>'}
              </td>
              <td style="white-space:nowrap;display:flex;gap:6px">
                <a class="btn btn-sm btn-pri" href="#/study-case/${(window.getLocalStudyCaseByProposal && window.getLocalStudyCaseByProposal(p.id)) ? window.getLocalStudyCaseByProposal(p.id).studyCase.id : 'CASE-1405-00045'}">
                  ${ico.doc} پرونده مطالعه (Study Case)
                </a>
                <button class="btn btn-sm btn-ghost" data-an-detail="${p.id}" title="مشاهده جزئیات">${ico.spark}</button>
              </td>
            </tr>
            `).join('')}
          </tbody>
        </table>
      </div>` : `
      <div style="padding:40px 20px;text-align:center">
        <div style="margin-bottom:12px;color:var(--text-3)">${ico.spark}</div>
        <b style="font-size:15px;color:var(--text)">در حال حاضر پیشنهادی در کارتابل ارجاعات شما نیست</b>
        <p class="muted" style="font-size:13px;max-width:480px;margin:8px auto 16px auto;line-height:1.6">
          پیشنهادهایی که نهادهای علمی و اساتید دانشگاهی ثبت کنند و خودکار به کارتابل شما ارجاع داده شوند در این بخش نمایش داده خواهند شد.
        </p>
        <button class="btn btn-sm" id="an-empty-reset">پاک کردن فیلترها</button>
      </div>`}
    </div>
  </section>`);
}

function bindAnalystScientificProposals() {
  const f = window.SCI.analystFilters;
  const rr = () => render();

  const q = el('#an-sci-q');
  if (q) {
    q.oninput = e => {
      f.search = e.target.value;
      rr();
      setTimeout(() => { const n = el('#an-sci-q'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 0);
    };
  }

  const reg = el('#an-sci-reg'); if (reg) reg.onchange = e => { f.region = e.target.value; rr(); };
  const dist = el('#an-sci-dist'); if (dist) dist.onchange = e => { f.district = e.target.value; rr(); };
  const top = el('#an-sci-topic'); if (top) top.onchange = e => { f.topic = e.target.value; rr(); };
  const st = el('#an-sci-st'); if (st) st.onchange = e => { f.status = e.target.value; rr(); };

  // Quick filter presets
  const qR5 = el('#an-quick-filter-r5');
  if (qR5) qR5.onclick = () => { Object.assign(f, { region: 'منطقه ۵', district: 'ناحیه ۲', topic: '', status: '', search: '' }); rr(); };

  const qR6 = el('#an-quick-filter-r6');
  if (qR6) qR6.onclick = () => { Object.assign(f, { region: 'منطقه ۶', district: 'ناحیه ۲', topic: 'حمل‌ونقل', status: '', search: '' }); rr(); };

  const rst = el('#an-reset-filters');
  if (rst) rst.onclick = () => { Object.assign(f, { region: '', district: '', topic: '', type: '', status: '', university: '', profession: '', search: '' }); rr(); };

  const empRst = el('#an-empty-reset');
  if (empRst) empRst.onclick = () => { Object.assign(f, { region: '', district: '', topic: '', type: '', status: '', university: '', profession: '', search: '' }); rr(); };

  // Detail & Scenario Modal
  els('[data-an-detail]').forEach(b => {
    b.onclick = () => {
      const pid = b.dataset.anDetail;
      const p = (DB.proposals || []).find(x => x.id === pid || x.proposal_id === pid);
      if (!p) return;

      openModal(`
      <div class="modal-h">
        <h2>${ico.spark} بررسی پرونده پیشنهاد علمی: <span class="code">${p.id}</span></h2>
        <button class="icon-btn" data-close>${ico.block}</button>
      </div>
      <div class="modal-b" style="max-height:75vh;overflow-y:auto">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;border-bottom:1px solid var(--line);padding-bottom:10px">
          <div>
            <b style="font-size:15px">${esc(p.t || p.title)}</b>
            <div class="muted" style="font-size:12px;margin-top:2px">
              ${esc(p.region)} · ${esc(p.scope || 'ناحیه ۲')} · موضوع: <b>${esc(p.type)}</b>
            </div>
          </div>
          <div>${sciBadge(p.status)}</div>
        </div>

        <dl class="kv" style="grid-template-columns:130px 1fr;gap:10px 16px;font-size:12.5px;margin-bottom:16px">
          <dt class="muted">ارائه‌دهنده</dt>
          <dd><b>${esc(p.by || 'پژوهشگر نهاد علمی')}</b> (${esc(p.org || 'دانشگاه تهران')})</dd>

          <dt class="muted">مسئله مطرح‌شده</dt>
          <dd>${esc(p.prob || 'عدم تناسب ظرفیت شریان با بار سفر و تقاضای عبوری')}</dd>

          <dt class="muted">هدف مداخله</dt>
          <dd>${esc(p.goal || p.q || 'آرام‌سازی سرعت و توسعه فضای پیاده')}</dd>

          <dt class="muted">مبنای علمی</dt>
          <dd><span class="bdg b-neu">${esc(p.scientific_basis || 'مدل‌سازی تقاضای سفر دانشگاه تهران')}</span></dd>

          <dt class="muted">مطالعه متناظر</dt>
          <dd><a class="link code" href="#/study/${p.study || 'ST-1405-014'}">${p.study || 'ST-1405-014'}</a> (مطالعه تفصیلی پهنه مرکزی)</dd>
        </dl>

        <div class="notice n-demo" style="margin-bottom:16px">
          ${ico.lock}
          <div><b>اتصال به چرخه تصمیم:</b> ایجاد سناریو باعث حفظ دائمی شناسه ارجاع <code>scenario.proposal_id = "${p.id}"</code> می‌شود و سناریوی تولیدی مستقیماً وارد مقایسه با وضع موجود (فصل صفر) و ماژول‌های تحلیل M01 تا M12 خواهد شد.</div>
        </div>

        <div style="background:#F8FAFB;border:1px solid var(--line);padding:14px;border-radius:var(--r-m)">
          <b style="font-size:12px;display:block;margin-bottom:6px">جریان کاری تحلیلگر و چرخه داده:</b>
          <p style="font-size:12px;color:var(--text-2);margin-bottom:12px;line-height:1.6">
            ابتدا پرونده مطالعه (Study Case) و وابستگی‌های داده بررسی می‌شوند. در صورت وجود داده مسدودکننده (Blocker)، تحلیل متوقف مانده و استعلام از متولی داده ثبت می‌گردد. پس از تأمین داده‌ها، سناریو و تحلیل ۱۲گانه فعال خواهد شد.
          </p>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <button class="btn btn-pri" id="an-do-open-case" style="flex:1;justify-content:center;background:#0F766E;border-color:#0F766E">
              ${ico.doc} ورود به پرونده مطالعه (Study Case)
            </button>
            <button class="btn" id="an-do-request-info" style="flex:1;justify-content:center">
              ${ico.alert} درخواست استعلام و تکمیل اطلاعات
            </button>
          </div>
        </div>
      </div>
      <div class="modal-f">
        <button class="btn btn-ghost" data-close style="margin-inline-start:auto">بستن پنجره</button>
      </div>`);

      // Action 1: Open Study Case
      const openCaseBtn = el('#an-do-open-case', modal);
      if (openCaseBtn) {
        openCaseBtn.onclick = () => {
          closeAll();
          const caseData = (window.getLocalStudyCaseByProposal && window.getLocalStudyCaseByProposal(p.id)) || null;
          const caseId = caseData ? caseData.studyCase.id : 'CASE-1405-00045';
          location.hash = `#/study-case/${caseId}`;
        };
      }

      // Action 2: Request Info
      const reqInfoBtn = el('#an-do-request-info', modal);
      if (reqInfoBtn) {
        reqInfoBtn.onclick = () => {
          closeAll();
          openModal(`
          <div class="modal-h">
            <h2>درخواست استعلام و تکمیل شواهد</h2>
            <button class="icon-btn" data-close>${ico.block}</button>
          </div>
          <div class="modal-b">
            <p class="muted" style="font-size:12px;margin-bottom:10px">
              سؤال یا مدارک مورد نیاز خود را درج کنید. پیشنهاد به وضعیت «نیازمند تکمیل اطلاعات» تغییر خواهد یافت و به ارائه‌دهنده اعلان ارسال می‌شود.
            </p>
            <div class="f-row">
              <label class="f-lbl">متن استعلام کارشناس:</label>
              <textarea class="f-in" id="an-inq-txt" rows="4" placeholder="مثال: لطفاً نقشه تفصیلی مقاطع عرضی و برآورد تقاضای پارکینگ را بارگذاری فرمایید..."></textarea>
            </div>
          </div>
          <div class="modal-f">
            <button class="btn btn-pri" id="an-send-inq-btn">${ico.check}ثبت و ارسال استعلام</button>
            <button class="btn btn-ghost" data-close style="margin-inline-start:auto">انصراف</button>
          </div>`);

          el('#an-send-inq-btn').onclick = () => {
            const question = el('#an-inq-txt').value.trim();
            if (!question) { toast('متن استعلام نمی‌تواند خالی باشد', false); return; }

            p.status = 'needevidence';
            logAct({
              action: 'REQUEST_PROPOSAL_INFO',
              et: 'proposal',
              eid: p.id,
              etitle: p.t,
              to: 'needevidence',
              text: `درخواست استعلام برای پیشنهاد علمی ${p.id}: ${question.slice(0, 60)}...`,
              k: 'warn'
            });

            // Call backend API
            fetch(`/api/analyst/proposals/${p.id}/request-info`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-user-id': ME(),
                'x-user-name': ME()
              },
              body: JSON.stringify({ question })
            }).catch(() => {});

            saveDB();
            closeAll();
            toast('استعلام ثبت شد و برای نهاد علمی ارسال گردید');
            render();
          };
        };
      }
    };
  });
}

/* ---------- 6. SCIENTIFIC MESSAGES PAGE ---------- */
function ScientificMessagesPage() {
  return Shell(`${Crumb([{ t: 'میز کار نهاد علمی', h: '#/scientific' }, { t: 'پیام‌ها و مکاتبات کارشناسی' }])}
  <div class="phead">
    <div>
      <div class="eyebrow">صندوق پیام و مکاتبات تخصصی</div>
      <h1>پیام‌ها و استعلام‌های کارشناسی</h1>
      <p class="sub">تعاملات مستقیم میان کارشناسان برنامه‌ریزی شهری شهرداری تهران و ارائه‌دهندگان علمی پیشنهادها</p>
    </div>
  </div>

  <section class="card">
    <div class="card-b" style="padding:0">
      <div class="task" style="padding:14px;border-bottom:1px solid var(--line)">
        <span class="ic ic-warn">${ico.alert}</span>
        <div class="bd">
          <b>استعلام کارشناسی برای پیشنهاد PR-1405-000125</b>
          <div class="m">از طرف: مهندس زهرا کاظمی (کارشناس ارشد تحلیل شهری) · دیروز ۱۰:۳۰</div>
          <p style="margin:6px 0 0 0;font-size:12.5px;color:var(--text)">
            «با سلام، لطفاً برآورد مالی هزینه لایروبی و مسئول نگهداری سلول‌های جذبی رواناب در فصل پاییز را مشخص فرمایید.»
          </p>
        </div>
        <div class="cta">
          <a class="btn btn-sm btn-pri" href="#/scientific/proposal/PR-1405-000125">پاسخ به استعلام</a>
        </div>
      </div>

      <div class="task" style="padding:14px">
        <span class="ic ic-ok">${ico.check}</span>
        <div class="bd">
          <b>اعلام وصول و پذیرش اولیه پیشنهاد PR-1405-000124</b>
          <div class="m">از طرف: دبیرخانه مطالعات توسعه شهری · ۳ روز قبل</div>
          <p style="margin:6px 0 0 0;font-size:12.5px;color:var(--text)">
            «پیشنهاد شما با موضوع بازتنظیم خطوط تغذیه‌کننده پیرامون دانشگاه تهران تأیید اولیه شد و جهت ایجاد سناریو در اختیار میز تحلیل شهری قرار گرفت.»
          </p>
        </div>
        <div class="cta">
          <a class="btn btn-sm" href="#/scientific/proposal/PR-1405-000124">مشاهده پرونده</a>
        </div>
      </div>
    </div>
  </section>`);
}

/* ---------- 7. SCIENTIFIC HELP & STANDARDS PAGE ---------- */
function ScientificHelpPage() {
  return Shell(`${Crumb([{ t: 'میز کار نهاد علمی', h: '#/scientific' }, { t: 'راهنمای ارائه پیشنهاد و استانداردها' }])}
  <div class="phead">
    <div>
      <div class="eyebrow">راهنمای مشارکت علمی و تخصصی</div>
      <h1>چارچوب پذیرش و ارزیابی پیشنهادهای علمی در سامانه TUIP</h1>
      <p class="sub">آشنایی با الزامات شواهد علمی، استانداردهای داده مکانی و فرآیند تبدیل ایده به سناریوهای تصمیم</p>
    </div>
  </div>

  <div class="grid" style="grid-template-columns:1fr 1fr;gap:20px">
    <section class="card">
      <div class="card-h"><h3>${ico.doc} معیارهای پذیرش پیشنهاد علمی</h3></div>
      <div class="card-b" style="font-size:12.5px;line-height:1.7">
        <ul style="margin:0;padding-inline-start:18px">
          <li><b>شواهد عینی و مدل علمی:</b> هر پیشنهاد باید بر پایه مطالعات دانشگاهی، مدل‌سازی یا تجارب معتبر باشد.</li>
          <li><b>تعیین محدوده مکانی مشخص:</b> پیشنهاد باید به منطقه و ناحیه مشخصی از تهران مرتبط بوده و ترجیحاً مرز هندسی آن روی نقشه ترسیم شود.</li>
          <li><b>تفکیک اثرات مثبت و منفی:</b> ارائه صادقانه پیامدهای جانبی، ریسک‌ها و محدودیت‌ها نشان‌دهنده استحکام علمی است.</li>
          <li><b>پرهیز از کلی‌گویی:</b> پیشنهادهای شعاری بدون تعیین شاخص‌های هدف رد خواهند شد.</li>
        </ul>
      </div>
    </section>

    <section class="card">
      <div class="card-h"><h3>${ico.spark} ماژول‌های تحلیل اثر ۱۲گانه (M01 - M12)</h3></div>
      <div class="card-b" style="font-size:12px;line-height:1.6">
        سناریوی مشتق‌شده از پیشنهاد شما در این ماژول‌ها شبیه‌سازی خواهد شد:
        <div class="grid" style="grid-template-columns:1fr 1fr;gap:6px;margin-top:10px">
          <div><b>M01:</b> مقایسه قوانین و وضع موجود</div>
          <div><b>M02:</b> ظرفیت ساختمانی و تراکم</div>
          <div><b>M03:</b> ظرفیت جمعیتی و سرانه‌ها</div>
          <div><b>M04:</b> تولید سفر و تقاضای تردد</div>
          <div><b>M05:</b> تقاضای پارکینگ و اشباع معابر</div>
          <div><b>M06:</b> تقاضای خدمات هفت‌گانه</div>
          <div><b>M07:</b> دسترسی و پوشش همگانی</div>
          <div><b>M08:</b> تقاضای آب، برق و زیرساخت</div>
          <div><b>M09:</b> سایه‌اندازی و آسایش اقلیمی</div>
          <div><b>M10:</b> انرژی و آلاینده‌های زیست‌محیطی</div>
          <div><b>M11:</b> مقایسه تطبیقی شاخص‌ها</div>
          <div><b>M12:</b> گزارش یکپارچه اثرات</div>
        </div>
      </div>
    </section>
  </div>`);
}

/* ---------- 8. SCIENTIFIC ROUTE DISPATCHER ---------- */
function handleScientificRoute(h) {
  if (h.startsWith('#/scientific/proposals/new')) {
    return { p: ScientificNewProposalWizard(), b: bindScientificNewProposal };
  }
  const propMatch = h.match(/^#\/scientific\/proposal\/([^/?]+)/);
  if (propMatch) {
    return { p: ScientificProposalDetailPage(propMatch[1]), b: () => bindScientificProposalDetail(propMatch[1]) };
  }
  if (h.startsWith('#/scientific/profile')) {
    return { p: ScientificProfilePage(), b: bindScientificProfile };
  }
  if (h.startsWith('#/scientific/messages')) {
    return { p: ScientificMessagesPage(), b: bindRows };
  }
  if (h.startsWith('#/scientific/help')) {
    return { p: ScientificHelpPage(), b: bindRows };
  }
  if (h.startsWith('#/scientific/proposals')) {
    // Render My Proposals page
    return { p: ScientificDashboard(), b: bindScientificDashboard };
  }
  return { p: ScientificDashboard(), b: bindScientificDashboard };
}
