/* ============================================================
   STUDY CASE & DATA BLOCKERS ARCHITECTURE
   ============================================================ */

(function initStudyCaseModule() {

const el = (sel, root = document) => (window.el ? window.el(sel, root) : root.querySelector(sel));
const els = (sel, root = document) => (window.els ? window.els(sel, root) : [...root.querySelectorAll(sel)]);
const fa = s => (window.fa ? window.fa(s) : String(s).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]));
const esc = s => (window.esc ? window.esc(s) : String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])));

window.STUDY_CASE_SYSTEM = {
  activeCaseId: null,
  casesCache: {},
  filterStatus: 'all',
  searchQuery: '',
};

/* ------------------------------------------------------------
   1. API & STATE ACCESS HELPERS
   ------------------------------------------------------------ */

async function apiGetStudyCase(caseId) {
  try {
    const res = await fetch(`/api/study-cases/${caseId}`);
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (e) {
    console.warn('API get study case failed, fallback to local', e);
  }
  // Local fallback
  return getLocalStudyCase(caseId);
}

async function apiGetStudyCaseByProposal(proposalId) {
  try {
    const headers = {};
    if (window.STATE && window.STATE.user) {
      headers['x-user-name'] = window.STATE.user.name;
      headers['x-user-role'] = window.STATE.user.role;
    }
    const res = await fetch(`/api/study-cases/by-proposal/${proposalId}`, { headers });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (e) {
    console.warn('API get study case by proposal failed, fallback to local', e);
  }
  return getLocalStudyCaseByProposal(proposalId);
}

async function apiCreateDataRequest(caseId, requirementId, reason, priority = 'HIGH') {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (window.STATE && window.STATE.user) {
      headers['x-user-name'] = window.STATE.user.name;
      headers['x-user-role'] = window.STATE.user.role;
    }
    const res = await fetch(`/api/study-cases/${caseId}/requests`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ requirement_id: requirementId, reason, priority }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('API create request failed, fallback to local', e);
  }
  return localCreateDataRequest(caseId, requirementId, reason, priority);
}

async function apiFulfillDataRequest(requestId, datasetCode, datasetVersion, note = '') {
  let backendResult = null;
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (window.STATE && window.STATE.user) {
      headers['x-user-name'] = window.STATE.user.name;
      headers['x-user-role'] = window.STATE.user.role;
    }
    const res = await fetch(`/api/data-requests/${requestId}/fulfill`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        dataset_code: datasetCode,
        dataset_version: datasetVersion,
        note,
      }),
    });
    if (res.ok) {
      backendResult = await res.json();
    }
  } catch (e) {
    console.warn('API fulfill failed, fallback to local', e);
  }

  // Always sync local in-memory store and Chapter Zero
  const localRes = localFulfillDataRequest(requestId, datasetCode, datasetVersion, note);
  if (localRes.studyCase) {
    syncStudyCaseWithChapterZero(localRes.studyCase.id);
  }

  return backendResult || localRes;
}

async function apiRecheckBlocking(caseId) {
  try {
    const res = await fetch(`/api/study-cases/${caseId}/recheck`, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      localRecheckBlocking(caseId);
      syncStudyCaseWithChapterZero(caseId);
      return data;
    }
  } catch (e) {
    console.warn('API recheck failed', e);
  }
  const updated = localRecheckBlocking(caseId);
  syncStudyCaseWithChapterZero(caseId);
  return { success: true, studyCase: updated };
}

/* ------------------------------------------------------------
   2. LOCAL FALLBACK / SYNC REPOSITORY
   ------------------------------------------------------------ */

function initLocalStore() {
  if (!window.DB) window.DB = {};

  const defaultCases = [
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
      workflow_step: 3,
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
      owner_analyst: 'مهندس زهرا کاظمی',
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
    },
    {
      id: 'CASE-1405-00047',
      proposal_id: 'PR-1405-003',
      study_id: 'ST-1405-009',
      title: 'پرونده تحلیلی: ارزیابی اثر ترافیکی تجمیع پلاک‌های کارگر شمالی',
      region: 'منطقه ۶',
      district: 'ناحیه ۲',
      scope: 'محور کارگر — حدفاصل بلوار کشاورز تا نصرت',
      owner_analyst: 'مهندس زهرا کاظمی',
      status: 'READY_FOR_NEXT_STEP',
      workflow_step: 4,
      problem_statement: 'تغییر کاربری و تقاضای سفر ناشی از تجمیع پلاک‌های اداری و تجاری',
      objective: 'شبیه‌سازی بار ترافیکی و تعیین ظرفیت مجاز پارکینگ‌های تأمینی',
      blockers_count: 0,
      total_requirements: 3,
      satisfied_requirements: 3,
      baseline: {
        status: 'READY',
        pinned_datasets: {
          'REQ-1405-07': { dataset_code: 'ROAD-06', version: 12, approved_at: '۱۴۰۵/۰۶/۲۳' }
        }
      },
      scenario_id: 'SC-009-1',
      created_at: '۱۴۰۵/۰۶/۱۹',
      updated_at: '۱۴۰۵/۰۶/۲۳'
    },
    {
      id: 'CASE-1405-00048',
      proposal_id: 'PR-1405-000126',
      study_id: 'ST-1405-021',
      title: 'پرونده مطالعاتی: ظرفیت‌سنجی توسعه TOD ایستگاه میدان ولیعصر',
      region: 'منطقه ۶',
      district: 'ناحیه ۳',
      scope: 'شعاع ۸۰۰ متری ایستگاه مترو میدان ولیعصر',
      owner_analyst: 'مهندس زهرا کاظمی',
      status: 'READY_FOR_NEXT_STEP',
      workflow_step: 5,
      problem_statement: 'عدم بهره‌گیری بهینه از ظرفیت مدهای انبوه‌بر و اختلاط نامناسب کاربری‌ها',
      objective: 'توسعه مبتنی بر حمل‌ونقل همگانی و بازآفرینی فضاهای عمومی پیرامونی',
      blockers_count: 0,
      total_requirements: 4,
      satisfied_requirements: 4,
      baseline: {
        status: 'READY',
        pinned_datasets: {
          'REQ-1405-08': { dataset_code: 'TRANSIT-06', version: 4, approved_at: '۱۴۰۵/۰۶/۲۱' }
        }
      },
      scenario_id: 'SC-021-2',
      created_at: '۱۴۰۵/۰۶/۱۷',
      updated_at: '۱4۰۵/۰۶/۲۲'
    },
    {
      id: 'CASE-1405-00049',
      proposal_id: 'PR-1405-000127',
      study_id: 'ST-1405-002',
      title: 'پرونده مطالعاتی: مکان‌یابی مراکز خدمات محله‌ای و سرانه‌های هفت‌گانه منطقه ۱۵',
      region: 'منطقه ۱۵',
      district: 'ناحیه ۱',
      scope: 'محلات کم‌برخوردار ناحیه ۱ و ۲ منطقه ۱۵',
      owner_analyst: 'مهندس زهرا کاظمی',
      status: 'IN_ANALYSIS',
      workflow_step: 5,
      problem_statement: 'کمبود سرانه‌های خدماتی هفت‌گانه آموزشی، درمانی و فضای سبز در بافت فشرده',
      objective: 'تحلیل شعاع دسترسی پیاده و پهنه‌بندی زمین‌های قهوه‌ای جهت اختصاص خدمات',
      blockers_count: 0,
      total_requirements: 3,
      satisfied_requirements: 3,
      baseline: {
        status: 'READY',
        pinned_datasets: {}
      },
      scenario_id: 'SC-002-1',
      created_at: '۱۴۰۵/۰۶/۱۴',
      updated_at: '۱۴۰۵/۰۶/۲۳'
    },
    {
      id: 'CASE-1405-00050',
      proposal_id: 'PR-1405-000128',
      study_id: 'ST-1405-017',
      title: 'پرونده مطالعاتی: پایش سرانه خدمات و ارزیابی کمبودهای محله نارمک',
      region: 'منطقه ۸',
      district: 'ناحیه ۱',
      scope: 'محله نارمک — ۱۲ زیرمحله',
      owner_analyst: 'سارا نوروزی',
      status: 'BLOCKED',
      workflow_step: 3,
      problem_statement: 'عدم انطباق توزیع جمعیت با سرانه‌های استاندارد و فرسودگی تجهیزات شهری',
      objective: 'پایش و به‌روزرسانی اطلس سرانه‌های شهری منطقه ۸',
      blockers_count: 1,
      total_requirements: 3,
      satisfied_requirements: 2,
      baseline: { status: 'BLOCKED', pinned_datasets: {} },
      scenario_id: null,
      created_at: '۱۴۰۵/۰۶/۱۵',
      updated_at: '۱۴۰۵/۰۶/۲۲'
    },
    {
      id: 'CASE-1405-00051',
      proposal_id: 'PR-1405-000129',
      study_id: 'ST-1405-005',
      title: 'پرونده مطالعاتی: تاب‌آوری سیلاب و پهنه‌بندی مخاطرات حوضه دره فرحزاد',
      region: 'منطقه ۲',
      district: 'ناحیه ۳',
      scope: 'حوضه بالادست — ۴ زیرحوضه',
      owner_analyst: 'فرزانه مقدم',
      status: 'BLOCKED',
      workflow_step: 3,
      problem_statement: 'احتمال وقوع سیلاب و ساخت‌وساز غیرمجاز در بستر و حریم اکولوژیک مسیل',
      objective: 'تعیین حد بستر و شبیه‌سازی هیدرولوژیکی دوره‌های بازگشت ۵۰ و ۱۰۰ ساله',
      blockers_count: 1,
      total_requirements: 2,
      satisfied_requirements: 1,
      baseline: { status: 'BLOCKED', pinned_datasets: {} },
      scenario_id: null,
      created_at: '۱۴۰۵/۰۶/۱۰',
      updated_at: '۱۴۰۵/۰۶/۱۸'
    },
    {
      id: 'CASE-1405-00052',
      proposal_id: 'PR-1405-000130',
      study_id: 'ST-1404-031',
      title: 'پرونده مطالعاتی: بازنگری ضوابط ارتفاعی و تراکم ساختمانی محور شریعتی',
      region: 'منطقه ۳',
      district: 'ناحیه ۲',
      scope: 'محور شریعتی — حدفاصل میرداماد تا صدر',
      owner_analyst: 'امیرحسین طاهری',
      status: 'READY_FOR_NEXT_STEP',
      workflow_step: 4,
      problem_statement: 'تعارض میان ضوابط طرح تفصیلی و مصوبات کمیسیون ماده پنج در تراکم مجاز',
      objective: 'یکپارچه‌سازی ضوابط ارتفاعی با توجه به ظرفیت شبکه شریانی و سایه‌اندازی',
      blockers_count: 0,
      total_requirements: 3,
      satisfied_requirements: 3,
      baseline: { status: 'READY', pinned_datasets: {} },
      scenario_id: null,
      created_at: '۱۴۰۵/۰۶/۰۵',
      updated_at: '۱۴۰۵/۰۶/۲۰'
    }
  ];

  if (!window.DB.studyCases || window.DB.studyCases.length < 5) {
    window.DB.studyCases = defaultCases;
  } else {
    // Ensure all default cases exist
    defaultCases.forEach(dc => {
      const exists = window.DB.studyCases.find(x => x.id === dc.id);
      if (!exists) {
        window.DB.studyCases.push(dc);
      } else if (!exists.owner_analyst) {
        exists.owner_analyst = dc.owner_analyst;
      }
    });
  }

  // Ensure all studies in window.DB.studies have a linked studyCase
  if (window.DB.studies && window.DB.studies.length) {
    window.DB.studies.forEach(s => {
      const hasCase = window.DB.studyCases.some(c => c.study_id === s.id);
      if (!hasCase) {
        window.DB.studyCases.push({
          id: `CASE-${s.id.replace('ST-', '')}`,
          study_id: s.id,
          proposal_id: `PR-${s.id.replace('ST-', '')}`,
          title: `پرونده تحلیلی: ${s.name || s.t || s.id}`,
          region: s.region || 'منطقه ۶',
          district: s.sub || 'ناحیه ۱',
          scope: s.sub || s.scope || 'محدوده مصوب مطالعه',
          owner_analyst: s.owner || (window.ME ? window.ME() : 'مهندس زهرا کاظمی'),
          status: s.status === 'blocked' || s.status === 'waitdata' ? 'BLOCKED' : 'READY_FOR_NEXT_STEP',
          workflow_step: s.stage || 3,
          problem_statement: 'پایش و به‌روزرسانی وضع موجود و ارزیابی سناریوهای توسعه',
          objective: 'تکمیل داده‌های موردنیاز و اجرای مدل‌های تحلیلی',
          blockers_count: s.status === 'blocked' || s.status === 'waitdata' ? 1 : 0,
          total_requirements: 2,
          satisfied_requirements: s.status === 'blocked' || s.status === 'waitdata' ? 1 : 2,
          baseline: { status: s.status === 'blocked' || s.status === 'waitdata' ? 'BLOCKED' : 'READY', pinned_datasets: {} },
          scenario_id: null,
          created_at: s.created || '۱۴۰۵/۰۶/۰۱',
          updated_at: s.updated || '۱۴۰۵/۰۶/۲۳'
        });
      }
    });
  }

  if (!window.DB.studyRequirements) {
    window.DB.studyRequirements = [
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
      },
      {
        id: 'REQ-1405-07',
        study_case_id: 'CASE-1405-00047',
        name: 'شبکه معابر و بار ترافیکی کارگر شمالی',
        category: 'حمل‌ونقل و ترافیک',
        reason: 'برای ارزیابی اثر ترافیکی تجمیع پلاک‌ها',
        module_code: 'M04 Trip Generation',
        scope: 'منطقه ۶ — خیابان کارگر',
        time_period: 'وضع موجود',
        required: true,
        blocking: false,
        satisfied: true,
        status: 'SATISFIED',
        attached_dataset: 'ROAD-06',
        attached_version: 12
      },
      {
        id: 'REQ-1405-08',
        study_case_id: 'CASE-1405-00048',
        name: 'شبکه حمل‌ونقل و خطوط اتوبوسرانی و مترو میدان ولیعصر',
        category: 'حمل‌ونقل همگانی',
        reason: 'برای تحلیل دسترسی و شعاع پیاده ایستگاه TOD',
        module_code: 'M06 Transit Accessibility',
        scope: 'منطقه ۶ — میدان ولیعصر',
        time_period: 'وضع موجود',
        required: true,
        blocking: false,
        satisfied: true,
        status: 'SATISFIED',
        attached_dataset: 'TRANSIT-06',
        attached_version: 4
      }
    ];
  }

  if (!window.DB.studyDataRequests) {
    window.DB.studyDataRequests = [];
  }
}

function syncStudyRequirementsFromChapterZero(studyId, caseId) {
  initLocalStore();
  let sc = window.DB.studyCases.find(c => c.id === caseId || c.study_id === studyId);
  if (!sc && studyId) {
    const stObj = (window.DB?.studies || []).find(s => s.id === studyId) || (window.byId ? window.byId(studyId) : null);
    const caseSeq = caseId || `CASE-${studyId.replace('ST-', '')}`;
    sc = {
      id: caseSeq,
      study_id: studyId,
      proposal_id: 'PR-1405-000124',
      title: 'پرونده تحلیلی: ' + (stObj ? (stObj.name || stObj.t) : studyId),
      region: stObj ? stObj.region : 'منطقه ۶',
      district: 'ناحیه ۲',
      scope: stObj ? (stObj.sub || stObj.scope) : 'محدوده مطالعه',
      owner_analyst: window.STATE?.user?.name || 'مهندس زهرا کاظمی',
      status: 'BLOCKED',
      workflow_step: 3,
      problem_statement: 'نیازمندی‌های داده وضع موجود در انتظار تأمین و رفع انسداد',
      objective: 'تکمیل داده‌های مسدودکننده و اجرای تحلیل ۱۲گانه',
      blockers_count: 0,
      total_requirements: 0,
      satisfied_requirements: 0,
      baseline: { status: 'BLOCKED', pinned_datasets: {} },
      scenario_id: null,
      created_at: '۱۴۰۵/۰۶/۲۲',
      updated_at: '۱۴۰۵/۰۶/۲۳'
    };
    window.DB.studyCases.push(sc);
  }
  if (!sc) return null;
  caseId = sc.id;

  const stId = studyId || sc.study_id;
  if (!stId || !window.czAll) return { studyCase: sc, requirements: [], blockers: [], requests: [] };

  const allRows = window.czAll(stId);
  if (!allRows || !allRows.length) return { studyCase: sc, requirements: [], blockers: [], requests: [] };

  allRows.forEach(r => {
    const reqId = `REQ-${caseId}-${r.k}`;
    let existingReq = window.DB.studyRequirements.find(item => item.id === reqId || (item.study_case_id === caseId && item.source_key === r.k));

    const activeReq = (window.DB.studyDataRequests || []).find(dr => 
      dr.data_requirement_id === reqId || 
      (dr.study_case_id === caseId && dr.source_key === r.k && (dr.status === 'REQUESTED' || dr.status === 'IN_PROGRESS'))
    );

    const catLabel = r.cat === 'data' ? 'داده‌های وضع موجود' :
                     r.cat === 'models' ? 'مدل‌های محاسباتی' :
                     r.cat === 'rules' ? 'ضوابط و مقررات' :
                     r.cat === 'indicators' ? 'شاخص‌های تحلیلی' : 'شواهد و وابستگی‌ها';

    const modLabel = (r.mods && r.mods.length) 
      ? r.mods.map(m => m + (window.MODULES && window.MODULES[m] ? ' (' + window.MODULES[m] + ')' : '')).join('، ')
      : (r.cat === 'models' ? r.k : 'M01-M12');

    const defaultReason = r.impact || `برای اجرای ماژول‌های تحلیلی ${modLabel} و تکمیل پرونده مطالعه`;
    const blockerReason = r.issue || r.impact || 'نسخه معتبر و تأییدشده‌ای برای محدوده و دوره زمانی موردنیاز در کاتالوگ وجود ندارد.';

    if (!existingReq) {
      existingReq = {
        id: reqId,
        study_case_id: caseId,
        study_id: stId,
        name: r.t,
        category: catLabel,
        reason: defaultReason,
        module_code: modLabel,
        scope: (r.cov && r.cov !== '—') ? r.cov : (sc.region || 'محدوده مطالعه'),
        time_period: (r.upd && r.upd !== '—') ? r.upd : 'وضع موجود مصوب',
        required: true,
        blocking: !!r.blocking,
        satisfied: !r.blocking,
        status: r.blocking ? (activeReq ? 'REQUESTED' : 'BLOCKED') : 'SATISFIED',
        blocker_reason: blockerReason,
        owner: r.owner || 'متولی داده (اداره کل آمار و فناوری اطلاعات)',
        dataset_code: r.ds || '',
        dataset_version: r.ver || '',
        source_cat: r.cat,
        source_key: r.k,
        dep: r.dep || '',
        active_request_id: activeReq ? activeReq.request_id : null
      };
      window.DB.studyRequirements.push(existingReq);
    } else {
      existingReq.study_id = stId;
      existingReq.name = r.t;
      existingReq.blocking = !!r.blocking;
      existingReq.satisfied = !r.blocking;
      if (!r.blocking) {
        existingReq.status = 'SATISFIED';
      } else if (activeReq) {
        existingReq.status = 'REQUESTED';
        existingReq.active_request_id = activeReq.request_id;
      } else {
        existingReq.status = 'BLOCKED';
      }
      existingReq.blocker_reason = blockerReason;
      existingReq.owner = r.owner || existingReq.owner;
      existingReq.source_cat = r.cat;
      existingReq.source_key = r.k;
      existingReq.dep = r.dep || '';
    }
  });

  const reqs = window.DB.studyRequirements.filter(r => r.study_case_id === caseId);
  const activeBlockers = reqs.filter(r => r.blocking && !r.satisfied);
  sc.total_requirements = reqs.length;
  sc.satisfied_requirements = reqs.filter(r => r.satisfied).length;
  sc.blockers_count = activeBlockers.length;
  sc.status = activeBlockers.length > 0 ? 'BLOCKED' : 'READY_FOR_NEXT_STEP';
  if (sc.baseline) {
    sc.baseline.status = activeBlockers.length > 0 ? 'BLOCKED' : 'READY';
  }

  const requests = window.DB.studyDataRequests.filter(r => r.study_case_id === caseId);
  return { studyCase: sc, requirements: reqs, blockers: activeBlockers, requests };
}

function getLocalStudyCase(caseId) {
  initLocalStore();
  const sc = window.DB.studyCases.find(c => c.id === caseId);
  if (!sc) return null;

  // Auto-sync if requirements are missing or if study_id is linked
  const hasExistingReqs = window.DB.studyRequirements.some(r => r.study_case_id === caseId);
  if ((!hasExistingReqs || sc.study_id) && window.czAll && sc.study_id) {
    syncStudyRequirementsFromChapterZero(sc.study_id, caseId);
  }

  const requirements = window.DB.studyRequirements.filter(r => r.study_case_id === caseId);
  const blockers = requirements.filter(r => r.blocking && !r.satisfied);
  const requests = window.DB.studyDataRequests.filter(r => r.study_case_id === caseId);
  return { studyCase: sc, requirements, blockers, requests };
}

function getLocalStudyCaseByProposal(proposalId) {
  initLocalStore();
  let sc = window.DB.studyCases.find(c => c.proposal_id === proposalId);
  if (!sc) {
    const prop = (window.DB.proposals || []).find(p => p.id === proposalId || p.proposal_id === proposalId);
    if (!prop) return null;
    const seq = window.DB.studyCases.length + 50;
    const caseId = `CASE-1405-${String(seq).padStart(5, '0')}`;
    sc = {
      id: caseId,
      proposal_id: proposalId,
      study_id: prop.study || prop.linked_study_id || 'ST-1405-014',
      title: `پرونده تحلیلی: ${prop.t || prop.title}`,
      region: prop.region || prop.district_id || 'منطقه ۶',
      district: prop.scope || prop.neighborhood_id || 'ناحیه ۲',
      scope: `${prop.region || 'منطقه ۶'} — ${prop.scope || 'ناحیه ۲'}`,
      owner_analyst: (window.STATE?.user?.name) || 'مهندس زهرا کاظمی',
      status: 'BLOCKED',
      workflow_step: 3,
      problem_statement: prop.prob || prop.problem_statement || '',
      objective: prop.goal || prop.objective || '',
      blockers_count: 2,
      total_requirements: 3,
      satisfied_requirements: 1,
      baseline: {
        status: 'BLOCKED',
        pinned_datasets: {
          [`REQ-${seq}-03`]: { dataset_code: 'PARCEL-06', version: 3, approved_at: '۱۴۰۵/۰۶/۲۰' }
        }
      },
      scenario_id: null,
      created_at: '۱۴۰۵/۰۶/۲۲',
      updated_at: '۱۴۰۵/۰۶/۲۳'
    };

    window.DB.studyCases.unshift(sc);
    window.DB.studyRequirements.push(
      {
        id: `REQ-${seq}-01`,
        study_case_id: caseId,
        name: `جمعیت پایه و تراکم جمعیتی محدوده ${sc.region}`,
        category: 'جمعیت و سرانه',
        reason: 'برای اجرای تحلیل ظرفیت جمعیتی (ماژول M03) و محاسبه سرانه‌های خدماتی',
        module_code: 'M03 Population Capacity',
        scope: sc.scope,
        time_period: 'سال مطالعه ۱۴۰۵',
        required: true,
        blocking: true,
        satisfied: false,
        status: 'BLOCKED',
        blocker_reason: 'نسخه معتبر و تأییدشده‌ای برای محدوده و دوره زمانی موردنیاز وجود ندارد.',
        active_request_id: null
      },
      {
        id: `REQ-${seq}-02`,
        study_case_id: caseId,
        name: `شبکه معابر و شبیه‌سازی بار ترافیک محدوده ${sc.region}`,
        category: 'حمل‌ونقل و ترافیک',
        reason: 'برای اجرای ماژول تولید سفر و تقاضای تردد (ماژول M04)',
        module_code: 'M04 Trip Generation',
        scope: sc.scope,
        time_period: 'ساعات اوج صبح و عصر ۱۴۰۵',
        required: true,
        blocking: true,
        satisfied: false,
        status: 'BLOCKED',
        blocker_reason: 'Dataset برای محدوده مطالعه وجود دارد، اما نسخه قابل استفاده و تأییدشده وجود ندارد.',
        active_request_id: null
      },
      {
        id: `REQ-${seq}-03`,
        study_case_id: caseId,
        name: `پارسل‌ها و کاربری اراضی وضع موجود ${sc.region}`,
        category: 'کالبدی و کاربری',
        reason: 'برای انطباق با ضوابط پهنه‌بندی طرح تفصیلی (ماژول M01)',
        module_code: 'M01 Rule / State Comparison',
        scope: sc.scope,
        time_period: 'وضع موجود مصوب',
        required: true,
        blocking: true,
        satisfied: true,
        status: 'SATISFIED',
        attached_dataset: 'PARCEL-06',
        attached_version: 3
      }
    );
  }

  return getLocalStudyCase(sc.id);
}

function localCreateDataRequest(caseId, requirementId, reason, priority = 'CRITICAL') {
  initLocalStore();
  const sc = window.DB.studyCases.find(c => c.id === caseId);
  const req = window.DB.studyRequirements.find(r => r.id === requirementId && r.study_case_id === caseId);
  if (!sc || !req) return { error: 'یافت نشد' };

  if (req.active_request_id) {
    const existing = window.DB.studyDataRequests.find(dr => dr.request_id === req.active_request_id && (dr.status === 'REQUESTED' || dr.status === 'IN_PROGRESS'));
    if (existing) return { success: true, request: existing, studyCase: sc };
  }

  const reqId = `DR-1405-${String(Math.floor(100 + Math.random() * 899)).padStart(5, '0')}`;
  const dataReq = {
    request_id: reqId,
    study_case_id: caseId,
    study_id: sc.study_id,
    data_requirement_id: requirementId,
    requirement_name: req.name,
    category: req.category,
    source_key: req.source_key,
    source_cat: req.source_cat,
    requested_by: window.STATE?.user?.name || 'مهندس زهرا کاظمی (تحلیلگر شهری)',
    assigned_to: req.owner || 'مهندس سارا نوروزی (متولی داده)',
    reason: reason || req.reason || `تأمین داده مسدودکننده برای ${req.name}`,
    priority,
    status: 'REQUESTED',
    created_at: '۱۴۰۵/۰۶/۲۳',
    updated_at: '۱۴۰۵/۰۶/۲۳'
  };

  req.active_request_id = reqId;
  req.status = 'REQUESTED';
  window.DB.studyDataRequests.unshift(dataReq);

  // Sync with Chapter Zero row if available
  if (sc.study_id && window.czState) {
    const cs = window.czState(sc.study_id);
    if (!cs.over) cs.over = {};
    const rowKey = `${req.source_cat || 'data'}:${req.source_key || req.id.split('-').pop()}`;
    if (!cs.over[rowKey]) cs.over[rowKey] = {};
    cs.over[rowKey].reqId = reqId;
  }

  // Also add to global dataRequests if available for steward view
  if (window.DB.dataRequests) {
    window.DB.dataRequests.unshift({
      id: reqId,
      studyId: sc.study_id,
      role: req.category,
      label: req.name,
      by: dataReq.requested_by,
      to: dataReq.assigned_to,
      tm: '۱۴۰۵/۰۶/۲۳',
      st: 'open',
      reason: dataReq.reason,
      priority: dataReq.priority,
      region: sc.region
    });
  }

  localRecheckBlocking(caseId);
  return { success: true, request: dataReq, studyCase: sc };
}

function localFulfillDataRequest(requestId, datasetCode, datasetVersion, note = '') {
  initLocalStore();
  const dr = window.DB.studyDataRequests.find(r => r.request_id === requestId);
  if (!dr) return { error: 'درخواست یافت نشد' };

  dr.status = 'FULFILLED';
  dr.dataset_code = datasetCode;
  dr.dataset_version = datasetVersion;
  dr.fulfilled_at = '۱۴۰۵/۰۶/۲۳';
  dr.note = note;

  const req = window.DB.studyRequirements.find(r => r.id === dr.data_requirement_id);
  if (req) {
    req.satisfied = true;
    req.status = 'SATISFIED';
    req.attached_dataset = datasetCode;
    req.attached_version = datasetVersion;
    req.blocker_reason = undefined;
  }

  const sc = window.DB.studyCases.find(c => c.id === dr.study_case_id);
  if (sc) {
    if (!sc.baseline) sc.baseline = { status: 'BLOCKED', pinned_datasets: {} };
    sc.baseline.pinned_datasets[dr.data_requirement_id] = {
      dataset_code: datasetCode,
      version: datasetVersion,
      approved_at: '۱۴۰۵/۰۶/۲۳'
    };
  }

  const updatedCase = localRecheckBlocking(dr.study_case_id);
  syncStudyCaseWithChapterZero(dr.study_case_id);
  return { success: true, request: dr, studyCase: updatedCase };
}

function syncStudyCaseWithChapterZero(caseId) {
  initLocalStore();
  const sc = window.DB?.studyCases?.find(c => c.id === caseId);
  if (!sc) return;
  const studyId = sc.study_id || 'ST-1405-014';

  const reqs = window.DB?.studyRequirements?.filter(r => r.study_case_id === caseId) || [];
  const blockers = reqs.filter(r => r.blocking && !r.satisfied);
  const isAllResolved = blockers.length === 0 || sc.status === 'READY_FOR_NEXT_STEP';

  if (window.czState) {
    const cs = window.czState(studyId);
    if (!cs.over) cs.over = {};

    reqs.forEach(req => {
      if (req.satisfied) {
        const catKey = req.source_cat && req.source_key ? `${req.source_cat}:${req.source_key}` : null;
        if (catKey) {
          cs.over[catKey] = {
            blocking: false,
            st: 'ready',
            ds: req.attached_dataset || req.dataset_code || (req.id.includes('terrain') ? 'TERRAIN-FZ' : 'DATA-RESOLVED'),
            ver: req.attached_version || req.dataset_version || 2,
            upd: '۱۴۰۵/۰۶/۲۳',
            cov: req.scope || '۱۰۰٪ محدوده',
            issue: '',
            impact: `داده ${req.name} با نسخه معتبر تأمین و به وضع موجود متصل گردید.`
          };
        }

        // Auto-unblock any dependent model in Chapter Zero
        if (window.czRows && studyId) {
          const cRows = window.czRows(studyId);
          if (cRows && cRows.models) {
            cRows.models.forEach(m => {
              if (m.dep === catKey || (req.source_key && m.dep === `data:${req.source_key}`) || (req.dep && m.k === req.dep.split(':').pop())) {
                cs.over[`models:${m.k}`] = {
                  blocking: false,
                  st: 'ready',
                  issue: '',
                  impact: `ورودی داده ${req.name} تأمین شد؛ ماژول ${m.k} آماده اجرای رسمی است.`
                };
              }
            });
          }
        }

        if (req.id.includes('01') || req.category?.includes('جمعیت') || req.module_code?.includes('M03')) {
          cs.over['data:population'] = {
            blocking: false,
            st: 'ready',
            ds: req.attached_dataset || 'POP-HH-06',
            ver: req.attached_version || 4,
            upd: '۱۴۰۵/۰۶/۲۳',
            cov: '۱۰۰٪ محدوده',
            issue: '',
            impact: 'داده جمعیت و خانوار نسخه ۴ مصوب و به وضع موجود متصل گردید.'
          };
          cs.over['models:M03'] = {
            blocking: false,
            st: 'ready',
            issue: '',
            impact: 'ورودی‌های جمعیتی تأمین شد؛ ماژول M03 آماده اجرای رسمی است.'
          };
        }
        if (req.id.includes('02') || req.category?.includes('حمل‌ونقل') || req.module_code?.includes('M04')) {
          cs.over['data:road'] = {
            blocking: false,
            st: 'ready',
            ds: req.attached_dataset || 'ROAD-06',
            ver: req.attached_version || 12,
            upd: '۱۴۰۵/۰۶/۲۳',
            cov: 'پوشش کامل',
            issue: '',
            impact: 'شبکه معابر و شبیه‌سازی ترافیک با نسخه معتبر تأیید شد.'
          };
          cs.over['data:od'] = {
            blocking: false,
            st: 'ready',
            ds: 'OD-SURVEY-02',
            ver: 3,
            upd: '۱۴۰۵/۰۶/۲۳',
            cov: '۵۶۰ ناحیه ترافیکی',
            issue: '',
            impact: 'ماتریس مبدأ-مقصد به‌روزرسانی شد.'
          };
          cs.over['models:M04'] = {
            blocking: false,
            st: 'ready',
            issue: '',
            impact: 'ورودی معابر تأمین شد و مدل M04 آماده اجراست.'
          };
        }
        if (req.id.includes('03') || req.module_code?.includes('M01')) {
          cs.over['data:parcels'] = {
            blocking: false,
            st: 'ready',
            ds: req.attached_dataset || 'PARCEL-06',
            ver: req.attached_version || 7,
            upd: '۱۴۰۵/۰۶/۲۳',
            cov: '۱۰۰٪ محدوده',
            issue: '',
            impact: 'پلاک‌ها و قطعات ثبتی هندسه کامل دارند.'
          };
        }
      }
    });

    if (isAllResolved) {
      cs.sealed = true;
      cs.signed = cs.signed || (window.STATE?.user?.name || 'مهندس زهرا کاظمی (تحلیلگر شهری)');
      if (!cs.snapshots || cs.snapshots.length === 0) {
        cs.snapshots = [{
          id: 'CZ-SNAP-01',
          ok: 10,
          total: 10,
          by: cs.signed,
          tm: '۱۴۰۵/۰۶/۲۳'
        }];
      }
      if (window.czAll) {
        try {
          const allR = window.czAll(studyId);
          allR.forEach(r => {
            cs.over[r.cat + ':' + r.k] = Object.assign({}, r, {
              blocking: false,
              st: 'ready',
              issue: '',
              impact: 'داده با نسخه معتبر تأمین و به وضع موجود متصل گردید.'
            });
          });
        } catch(e){}
      }
      cs.over['data:population'] = {
        blocking: false,
        st: 'ready',
        ds: 'POP-HH-06',
        ver: 4,
        upd: '۱۴۰۵/۰۶/۲۳',
        cov: '۱۰۰٪ محدوده',
        issue: '',
        impact: 'داده‌های جمعیتی مصوب و به وضع موجود متصل شدند.'
      };
      cs.over['models:M03'] = {
        blocking: false,
        st: 'ready',
        issue: '',
        impact: 'ورودی‌های جمعیتی تأمین شد؛ ماژول M03 آماده اجرای رسمی است.'
      };
    }
  }

  // Also update studies list in DB if present
  if (window.DB?.studies) {
    const stObj = window.DB.studies.find(s => s.id === studyId);
    if (stObj && isAllResolved) {
      stObj.status = 'ready';
      stObj.prog = 88;
      stObj.next = 'آماده اجرای سناریوها و ماژول‌های ۱۲گانه';
      stObj.nextHref = '#/proposal/' + sc.proposal_id;
    }
  }
}

function localRecheckBlocking(caseId) {
  initLocalStore();
  const sc = window.DB.studyCases.find(c => c.id === caseId);
  if (!sc) return null;

  const reqs = window.DB.studyRequirements.filter(r => r.study_case_id === caseId);
  const blockers = reqs.filter(r => r.blocking && !r.satisfied);

  sc.total_requirements = reqs.length;
  sc.satisfied_requirements = reqs.filter(r => r.satisfied).length;
  sc.blockers_count = blockers.length;

  if (blockers.length > 0) {
    sc.status = 'BLOCKED';
    if (!sc.baseline) sc.baseline = { status: 'BLOCKED', pinned_datasets: {} };
    sc.baseline.status = 'BLOCKED';
    sc.workflow_step = 3;
  } else {
    sc.status = 'READY_FOR_NEXT_STEP';
    if (!sc.baseline) sc.baseline = { status: 'READY', pinned_datasets: {} };
    sc.baseline.status = 'READY';
    sc.workflow_step = 4;
  }

  sc.updated_at = '۱۴۰۵/۰۶/۲۳';
  syncStudyCaseWithChapterZero(caseId);
  return sc;
}

/* ------------------------------------------------------------
   3. UI COMPONENTS: WORKFLOW STEPPER (9 STEPS)
   ------------------------------------------------------------ */

function renderWorkflowStepper(currentStep, caseStatus, studyId, proposalId) {
  const sid = studyId || 'ST-1405-014';
  const pid = proposalId || 'PR-1405-014';
  const steps = [
    { n: 1, id: 'proposal', label: '۱. پیشنهاد علمی', href: `#/proposal/${pid}` },
    { n: 2, id: 'study_def', label: '۲. تعریف مطالعه', href: `#/study/${sid}/overview` },
    { n: 3, id: 'requirements', label: '۳. نیازمندی داده', href: `#/study/${sid}/chapter0` },
    { n: 4, id: 'baseline', label: '۴. وضع موجود', href: `#/study/${sid}/baseline` },
    { n: 5, id: 'scenario', label: '۵. تدوین سناریو', href: `#/study/${sid}/scenarios` },
    { n: 6, id: 'analysis', label: '۶. شبیه‌سازی و تحلیل', href: `#/study/${sid}/models` },
    { n: 7, id: 'comparison', label: '۷. مقایسه و ارزیابی', href: `#/study/${sid}/comparison` },
    { n: 8, id: 'report', label: '۸. گزارش رسمی', href: `#/study/${sid}/reports` },
    { n: 9, id: 'review', label: '۹. بررسی نهایی', href: `#/study/${sid}/review` },
  ];

  return `
  <div class="card" style="margin-bottom:18px;padding:14px 18px;background:#FAFCFD;border:1px solid var(--line)">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <span style="font-weight:700;font-size:13px;color:var(--text)">
        ${window.ico?.spark || '⚡'} گردش کار تحلیلی پرونده مطالعه (Workflow)
      </span>
      <span class="bdg ${caseStatus === 'BLOCKED' ? 'b-stop' : caseStatus === 'READY_FOR_NEXT_STEP' || caseStatus === 'COMPLETED' ? 'b-ok' : 'b-run'} plain" style="font-size:11.5px">
        ${caseStatus === 'COMPLETED' ? 'تکمیل‌شده و مصوب' : caseStatus === 'BLOCKED' ? 'مسدود در مرحله وضع موجود' : caseStatus === 'READY_FOR_NEXT_STEP' ? 'آماده تدوین سناریو و تحلیل' : 'در حال انجام'}
      </span>
    </div>
    <div class="stepper" style="display:flex;gap:6px;overflow-x:auto;padding-bottom:4px">
      ${steps.map(s => {
        let stateCls = 'future';
        let badgeIcon = window.fa ? window.fa(s.n) : s.n;
        let hint = '';

        if (caseStatus === 'COMPLETED' || s.n < currentStep || (caseStatus === 'READY_FOR_NEXT_STEP' && s.n <= 4)) {
          stateCls = 'done';
          badgeIcon = '✓';
        } else if (s.n === currentStep) {
          if (caseStatus === 'BLOCKED' && s.n === 4) {
            stateCls = 'blocked';
            badgeIcon = '!';
            hint = 'مسدودکننده فعال';
          } else {
            stateCls = 'now';
          }
        } else if (caseStatus === 'READY_FOR_NEXT_STEP' && s.n === 5) {
          stateCls = 'now';
          hint = 'آماده اقدام';
        }

        const bg = stateCls === 'done' ? '#ECFDF5' : stateCls === 'blocked' ? '#FEF2F2' : stateCls === 'now' ? '#EFF6FF' : '#F3F4F6';
        const color = stateCls === 'done' ? '#047857' : stateCls === 'blocked' ? '#B91C1C' : stateCls === 'now' ? '#1D4ED8' : '#9CA3AF';
        const border = stateCls === 'done' ? '#A7F3D0' : stateCls === 'blocked' ? '#FECACA' : stateCls === 'now' ? '#BFDBFE' : '#E5E7EB';

        return `
        <a href="${s.href}" style="flex:1;min-width:110px;padding:8px 10px;background:${bg};border:1px solid ${border};border-radius:var(--r-m);display:flex;flex-direction:column;gap:4px;text-decoration:none;transition:transform 0.15s,box-shadow 0.15s" title="رفتن به ${s.label}">
          <div style="display:flex;align-items:center;gap:6px">
            <span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:${color};color:#fff;font-size:11px;font-weight:700">
              ${badgeIcon}
            </span>
            <span style="font-size:11.5px;font-weight:700;color:${color};white-space:nowrap">${s.label}</span>
          </div>
          ${hint ? `<span style="font-size:10px;color:${color};font-weight:600">${hint}</span>` : ''}
        </a>`;
      }).join('')}
    </div>
  </div>`;
}

/* ------------------------------------------------------------
   4. UI COMPONENTS: BLOCKED vs READY STATE CARDS
   ------------------------------------------------------------ */

function renderStudyCaseStateCard(sc, blockers) {
  const isLocked = sc.status === 'COMPLETED' || sc.locked || sc.finalized;
  if (isLocked) {
    return `
    <div class="card" style="border:2px solid #059669;background:#F0FDF4;border-radius:var(--r-l);padding:20px;margin-bottom:20px;box-shadow:0 2px 8px rgba(5,150,105,0.1)">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px">
        <div style="flex:1;min-width:280px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <span class="bdg b-ok plain" style="font-size:13px;font-weight:700;padding:4px 12px;background:#059669;color:#FFFFFF">
              🔒 وضعیت پرونده: نهایی و مصوب (COMPLETED & LOCKED)
            </span>
            <span class="muted" style="font-size:12px">پایان مراحل و قفل تغییرات</span>
          </div>
          <h2 style="font-size:17px;font-weight:800;color:#065F46;margin:0 0 8px 0">
            تمامی مراحل و شبیه‌سازی ۱۲ ماژول مطالعه با موفقیت به پایان رسید
          </h2>
          <p style="font-size:13px;color:#064E3B;line-height:1.65;margin:0 0 14px 0">
            پرونده این مطالعه و نتایج آن به‌صورت قطعی ذخیره شده است. جهت حفظ استناد قانونی و یکپارچگی محاسبات شهری، هیچ تغییری در داده‌ها یا مدل مجاز نیست.
          </p>

          <div style="display:flex;flex-wrap:wrap;gap:18px;padding:10px 14px;background:#FFFFFF;border:1px solid #A7F3D0;border-radius:var(--r-m);font-size:12.5px">
            <div>شناسه سناریوی مصوب: <b class="code">${sc.scenario_id || 'SC-FINAL'}</b></div>
            <div style="color:#047857">وضعیت: <b>تکمیل قطعی ۱۲ ماژول</b></div>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:10px;min-width:240px">
          <a class="btn btn-pri" href="#/study/${sc.study_id}/reports" style="background:#059669;border-color:#059669;padding:12px 18px;font-size:13px;font-weight:700;justify-content:center">
            ${window.ico?.doc || '📄'} مشاهده گزارش رسمی مصوب
          </a>
        </div>
      </div>
    </div>`;
  }

  const isBlocked = sc.status === 'BLOCKED' || (blockers && blockers.length > 0);

  if (isBlocked) {
    return `
    <div class="card" style="border:2px solid #EF4444;background:#FFF5F5;border-radius:var(--r-l);padding:20px;margin-bottom:20px;box-shadow:0 2px 8px rgba(239,68,68,0.1)">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px">
        <div style="flex:1;min-width:280px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <span class="bdg b-stop plain" style="font-size:13px;font-weight:700;padding:4px 12px;background:#FEE2E2;color:#991B1B;border:1px solid #F87171">
              ${window.ico?.block || '⛔'} وضعیت پرونده: مسدود (BLOCKED)
            </span>
            <span class="muted" style="font-size:12px">مرحله ۴: وضع موجود / فصل صفر</span>
          </div>
          <h2 style="font-size:17px;font-weight:800;color:#991B1B;margin:0 0 8px 0">
            توقف جریان تحلیل به‌علت وجود داده‌های مسدودکننده (Blocking Data)
          </h2>
          <p style="font-size:13px;color:#7F1D1D;line-height:1.65;margin:0 0 14px 0">
            سیستم امکان شروع اجرای سناریو و تحلیل‌های M01 تا M12 را قبل از تأمین و تأیید تمام داده‌های مسدودکننده نمی‌دهد. تحلیل روی وضع موجود ناقص، نتایج اشتباه و غیرقابل استناد تولید می‌کند.
          </p>

          <div style="display:flex;flex-wrap:wrap;gap:18px;padding:10px 14px;background:#FFFFFF;border:1px solid #FECACA;border-radius:var(--r-m);font-size:12.5px">
            <div>کل نیازمندی‌های داده: <b class="num">${window.fa ? window.fa(sc.total_requirements) : sc.total_requirements}</b> مورد</div>
            <div style="color:#047857">تأمین و تثبیت‌شده: <b class="num">${window.fa ? window.fa(sc.satisfied_requirements) : sc.satisfied_requirements}</b> مورد</div>
            <div style="color:#DC2626"><b>داده‌های مسدودکننده (Blockers):</b> <b class="num">${window.fa ? window.fa(blockers.length) : blockers.length}</b> مورد</div>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:10px;align-items:stretch;min-width:240px">
          <button class="btn btn-pri" id="btn-open-blockers-drawer" style="background:#DC2626;border-color:#DC2626;padding:12px 18px;font-size:13px;font-weight:700;justify-content:center">
            ${window.ico?.alert || '⚠'} مشاهده داده‌های مسدودکننده (${window.fa ? window.fa(blockers.length) : blockers.length} مورد)
          </button>
          <button class="btn btn-ghost" id="btn-recheck-blocking" style="font-size:12px;justify-content:center">
            ${window.ico?.run || '🔄'} ارزیابی مجدد وابستگی‌ها (Recheck)
          </button>
          <div class="muted" style="font-size:11px;text-align:center;line-height:1.4">
            تحلیلگر می‌تواند برای هر داده مسدودکننده، مستقیم از مسئول داده استعلام ثبت کند.
          </div>
        </div>
      </div>
    </div>`;
  }

  // READY FOR NEXT STEP
  return `
  <div class="card" style="border:2px solid #10B981;background:#F0FDF4;border-radius:var(--r-l);padding:20px;margin-bottom:20px;box-shadow:0 2px 8px rgba(16,185,129,0.1)">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px">
      <div style="flex:1;min-width:280px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <span class="bdg b-ok plain" style="font-size:13px;font-weight:700;padding:4px 12px;background:#D1FAE5;color:#065F46;border:1px solid #34D399">
            ${window.ico?.check || '✓'} وضعیت پرونده: آماده برای اقدام بعدی (READY)
          </span>
          <span class="muted" style="font-size:12px">وضع موجود تثبیت گردید</span>
        </div>
        <h2 style="font-size:17px;font-weight:800;color:#065F46;margin:0 0 8px 0">
          تمامی داده‌های مسدودکننده تأمین و تأیید شدند — دروازه آمادگی باز است
        </h2>
        <p style="font-size:13px;color:#064E3B;line-height:1.65;margin:0 0 14px 0">
          نسخه‌های معتبر و تأییدشده داده‌های مکانی، جمعیتی و شبکه‌ای به وضع موجود این مطالعه پین شدند. اکنون مرحله تدوین سناریو و اجرای ماژول‌های تحلیل ۱۲گانه فعال است.
        </p>

        <div style="display:flex;flex-wrap:wrap;gap:18px;padding:10px 14px;background:#FFFFFF;border:1px solid #A7F3D0;border-radius:var(--r-m);font-size:12.5px">
          <div>کل نیازمندی‌ها: <b class="num">${window.fa ? window.fa(sc.total_requirements) : sc.total_requirements}</b> مورد</div>
          <div style="color:#047857">تأییدشده و پین‌شده: <b class="num">${window.fa ? window.fa(sc.satisfied_requirements) : sc.satisfied_requirements}</b> مورد</div>
          <div style="color:#047857">مسدودکننده: <b class="num">۰</b> مورد</div>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:10px;min-width:240px">
        <button class="btn btn-pri" id="btn-act-create-scenario" style="background:#059669;border-color:#059669;padding:12px 18px;font-size:13px;font-weight:700;justify-content:center">
          ${window.ico?.spark || '⚡'} تدوین و اجرای سناریوی تحلیلی
        </button>
        <button class="btn" id="btn-view-pinned-datasets" style="justify-content:center;font-size:12px">
          ${window.ico?.data || '🗄'} مشاهده نسخه‌های پین‌شده وضع موجود
        </button>
      </div>
    </div>
  </div>`;
}

/* ------------------------------------------------------------
   5. UI COMPONENTS: BLOCKERS DRAWER / MODAL
   ------------------------------------------------------------ */

function openBlockersDrawer(caseId, blockers, studyCase, allRequests = []) {
  const isSteward = window.STATE?.user?.role === 'steward' || window.STATE?.user?.role === 'admin';

  const modalHtml = `
  <div class="modal-h" style="border-bottom:1px solid #FCA5A5;background:#FEF2F2">
    <div>
      <div style="font-size:11px;color:#991B1B;font-weight:700">بررسی و رفع موانع پرونده مطالعه</div>
      <h2 style="color:#991B1B;font-size:16px;margin:2px 0 0 0">
        ${window.ico?.alert || '⚠'} داده‌های مسدودکننده (${window.fa ? window.fa(blockers.length) : blockers.length} مورد)
      </h2>
    </div>
    <button class="icon-btn" data-close>${window.ico?.block || '✕'}</button>
  </div>

  <div class="modal-b" style="max-height:75vh;overflow-y:auto;padding:16px">
    <div class="notice n-stop" style="margin-bottom:14px">
      ${window.ico?.block || '⛔'}
      <div>
        <b>دستورالعمل رفع حالت مسدود:</b> برای هر داده مسدودکننده، تحلیلگر شهری می‌تواند مستقیماً نسخه معتبر و تأییدشده را متصل یا بارگذاری کند (بدون نیاز به گردش کار دبیرخانه). پس از تأمین آخرین داده، مطالعه و پرونده بلافاصله از حالت مسدود خارج شده و اجرای ماژول‌های ۱۲گانه فعال خواهد شد.
      </div>
    </div>

    <div style="display:flex;flex-direction:column;gap:12px">
      ${blockers.map(b => {
        const activeReq = allRequests.find(r => r.data_requirement_id === b.id && (r.status === 'REQUESTED' || r.status === 'IN_PROGRESS'));
        const fulfilledReq = allRequests.find(r => r.data_requirement_id === b.id && r.status === 'FULFILLED');

        return `
        <div style="border:1px solid #FECACA;background:#FFF;border-radius:var(--r-m);padding:14px;box-shadow:0 1px 3px rgba(0,0,0,0.05)">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;margin-bottom:8px">
            <div>
              <div style="display:flex;align-items:center;gap:8px">
                <span class="bdg b-stop plain" style="font-size:11px">مسدودکننده الزامی</span>
                <b style="font-size:14px;color:#111827">${window.esc ? window.esc(b.name) : b.name}</b>
              </div>
              <div class="muted" style="font-size:11.5px;margin-top:2px">
                دسته: <b>${b.category}</b> · محدوده: <b>${b.scope}</b> · دوره: <b>${b.time_period}</b>
              </div>
            </div>
            <div>
              <span class="bdg b-pri" style="font-size:11px">${b.module_code}</span>
            </div>
          </div>

          <!-- Exact Blocker Reason -->
          <div style="background:#FFF1F2;border-right:3px solid #E11D48;padding:8px 12px;border-radius:4px;margin-bottom:10px">
            <span style="font-size:11px;font-weight:700;color:#9F1239;display:block">علت دقیق مسدودکننده بودن:</span>
            <span style="font-size:12.5px;color:#881337">${window.esc ? window.esc(b.blocker_reason || 'نسخه معتبر و تأییدشده‌ای برای محدوده و دوره زمانی موردنیاز وجود ندارد.') : b.blocker_reason}</span>
          </div>

          <div style="font-size:12px;color:var(--text-2);margin-bottom:10px">
            <b>دلیل نیاز در مطالعه:</b> ${window.esc ? window.esc(b.reason) : b.reason}
          </div>

          <!-- Request Status & Action buttons -->
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;padding-top:10px;border-top:1px dashed var(--line)">
            <div>
              ${activeReq ? `
                <div style="display:flex;align-items:center;gap:6px">
                  <span class="bdg ${(window.DREQ_ST?.open?.c) || 'b-warn'}" style="font-size:11px">
                    درخواست فعال: <code>${activeReq.request_id}</code>
                  </span>
                  <span class="muted" style="font-size:11.5px">در کارتابل متولی داده (${activeReq.status === 'FULFILLED' ? 'تأمین شد' : activeReq.status === 'REJECTED' ? 'رد شد' : (window.DREQ_ST?.open?.t || 'در انتظار پاسخ')})</span>
                </div>
              ` : `
                <span class="muted" style="font-size:11.5px">هنوز درخواستی برای این داده ثبت نشده است.</span>
              `}
            </div>

            <div style="display:flex;gap:8px">
              ${!activeReq ? `
                <button class="btn btn-sm btn-pri" data-req-action="${b.id}" style="background:#DC2626;border-color:#DC2626">
                  ${window.ico?.plus || '+'} ثبت درخواست داده از مسئول داده
                </button>
              ` : ''}

              <!-- Dual-Path Fulfillment Action (Accessible for analyst / steward) -->
              <button class="btn btn-sm" data-fulfill-action="${b.id}" style="background:#059669;border-color:#059669;color:#FFF;font-weight:600" title="تأمین مستقیم داده توسط تحلیلگر شهری جهت رفع انسداد">
                ${window.ico?.check || '✓'} تأمین داده و رفع انسداد (تحلیلگر شهری)
              </button>
            </div>
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>

  <div class="modal-f" style="display:flex;justify-content:space-between">
    <span class="muted" style="font-size:11.5px">
      تأمین هر داده باعث اجرای خودکار اعتبارسنجی و بررسی وضعیت انسداد پرونده می‌شود.
    </span>
    <button class="btn btn-ghost" data-close>بستن</button>
  </div>`;

  window.openModal(modalHtml);

  // Bind Request Buttons
  els('[data-req-action]').forEach(btn => {
    btn.onclick = () => {
      const reqId = btn.dataset.reqAction;
      const targetReq = blockers.find(b => b.id === reqId);
      if (targetReq) {
        openCreateDataRequestModal(caseId, targetReq, () => {
          window.closeAll();
          if (studyCase && studyCase.study_id && window.openStudyBlockersDrawer) {
            window.openStudyBlockersDrawer(studyCase.study_id);
          } else {
            renderStudyCaseDetail(caseId);
          }
          if (window.render) window.render();
        });
      }
    };
  });

  // Bind Fulfill Buttons
  els('[data-fulfill-action]').forEach(btn => {
    btn.onclick = () => {
      const reqId = btn.dataset.fulfillAction;
      const targetReq = blockers.find(b => b.id === reqId);
      if (targetReq) {
        openStewardFulfillModal(caseId, targetReq, allRequests, () => {
          window.closeAll();
          if (studyCase && studyCase.study_id && window.openStudyBlockersDrawer) {
            const scData = window.getLocalStudyCase(caseId);
            if (scData && scData.blockers.length > 0) {
              window.openStudyBlockersDrawer(studyCase.study_id);
            }
          } else {
            renderStudyCaseDetail(caseId);
          }
          if (window.render) window.render();
        });
      }
    };
  });
}

/* ------------------------------------------------------------
   6. MODAL: CREATE DATA REQUEST (AUTO-FILLED FOR CASE)
   ------------------------------------------------------------ */

function openCreateDataRequestModal(caseId, requirement, onSuccess) {
  const sc = window.DB?.studyCases?.find(c => c.id === caseId);
  const autoReason = `جهت تکمیل پرونده تحلیلی ${caseId} (${sc ? sc.title : 'مطالعه شهری'}) و اجرای رسمی ماژول‌های (${requirement.module_code})، نیاز فوری به تأمین داده «${requirement.name}» در محدوده ${requirement.scope} و دوره ${requirement.time_period} می‌باشد.
اشکال جاری: ${requirement.blocker_reason || 'نسخه معتبر در کاتالوگ وجود ندارد.'}
اثر بر مطالعه: ${requirement.reason || 'توقف روند محاسبات و تحلیل‌های ۱۲گانه'}
خواهشمند است نسخه معتبر و مصوب برای این پرونده در کارتابل متولی داده بارگذاری و متصل گردد.`;

  const modalHtml = `
  <div class="modal-h" style="background:#EFF6FF;border-bottom:1px solid #BFDBFE">
    <div>
      <div style="font-size:11px;color:#1E40AF;font-weight:700">گردش کار تأمین داده · ثبت در کارتابل متولی داده</div>
      <h2 style="color:#1E40AF;font-size:16px;margin:2px 0 0 0">
        ${window.ico?.data || '🗄'} ثبت رسمی درخواست داده برای پرونده ${caseId}
      </h2>
    </div>
    <button class="icon-btn" data-close>${window.ico?.block || '✕'}</button>
  </div>

  <div class="modal-b" style="max-height:75vh;overflow-y:auto;padding:16px">
    <div class="notice n-demo" style="margin-bottom:14px">
      ${window.ico?.spark || '⚡'}
      <div>
        <b>ورود خودکار جزئیات داده:</b> مشخصات و دلایل نیاز این داده مسدودکننده به صورت خودکار از شناسنامه مطالعه استخراج و برای ثبت به متولی داده آماده شده است.
      </div>
    </div>

    <!-- Case info snippet -->
    <div style="background:#F8FAFC;border:1px solid var(--line);border-radius:var(--r-m);padding:10px 14px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;font-size:12px">
      <div>
        <span class="muted">پرونده مطالعه مرتبط:</span>
        <b style="color:var(--text-1);margin-right:4px">${sc ? sc.title : caseId}</b>
      </div>
      <div>
        <span class="bdg b-pri plain" style="font-size:11px">${sc ? sc.region : 'محدوده مطالعه'}</span>
      </div>
    </div>

    <!-- Auto-populated Data Details -->
    <dl class="kv" style="grid-template-columns:130px 1fr;gap:10px 14px;margin-bottom:14px;font-size:12.5px;background:#FFF;border:1px solid var(--line);border-radius:var(--r-m);padding:12px 14px">
      <dt class="muted">داده موردنیاز</dt>
      <dd><b style="font-size:13.5px;color:#111827">${window.esc ? window.esc(requirement.name) : requirement.name}</b></dd>

      <dt class="muted">متولی مسئول داده</dt>
      <dd><span class="bdg b-ok plain" style="font-size:12px;font-weight:600">${window.esc ? window.esc(requirement.owner || 'متولی داده') : requirement.owner}</span></dd>

      <dt class="muted">ماژول وابسته</dt>
      <dd><span class="bdg b-pri">${requirement.module_code}</span></dd>

      <dt class="muted">محدوده مکانی</dt>
      <dd><b>${requirement.scope}</b></dd>

      <dt class="muted">دوره زمانی مرجع</dt>
      <dd><b>${requirement.time_period}</b></dd>
    </dl>

    <!-- Blocker reason alert -->
    <div style="background:#FFF1F2;border:1px solid #FECACA;border-radius:var(--r-s);padding:10px 12px;margin-bottom:14px;font-size:12px;color:#9F1239">
      <span style="font-weight:700;display:block;margin-bottom:3px">اشکال مسدودکننده در کاتالوگ داده:</span>
      <div>${window.esc ? window.esc(requirement.blocker_reason || 'نسخه معتبر در کاتالوگ وجود ندارد.') : requirement.blocker_reason}</div>
    </div>

    <div class="f-row" style="margin-bottom:12px">
      <label class="f-lbl" for="dr-priority">اولویت درخواست داده *</label>
      <select class="f-in" id="dr-priority" style="font-weight:600">
        <option value="CRITICAL" selected>فوری و بحرانی (مسدودکننده روند پرونده مطالعه)</option>
        <option value="HIGH">بالا (اولویت اول تحلیل)</option>
        <option value="MEDIUM">عادی</option>
      </select>
    </div>

    <div class="f-row" style="margin-bottom:14px">
      <label class="f-lbl" for="dr-reason">متن شرح نیاز و مشخصات فنی ارسالی برای متولی داده *</label>
      <textarea class="f-in" id="dr-reason" rows="4" style="line-height:1.6;font-size:12.5px">${autoReason}</textarea>
      <span class="muted" style="font-size:11px;margin-top:4px;display:block">
        متن فوق به طور هوشمند و متناسب با نیازمندی‌های این پرونده تنظیم شده است و مستقیماً در کارتابل متولی قرار خواهد گرفت.
      </span>
    </div>
  </div>

  <div class="modal-f" style="display:flex;justify-content:space-between;align-items:center">
    <button class="btn btn-ghost" data-close>انصراف</button>
    <button class="btn btn-pri" id="btn-submit-data-req" style="background:#1D4ED8;border-color:#1D4ED8;padding:10px 20px;font-weight:700">
      ${window.ico?.check || '✓'} ثبت رسمی درخواست داده برای این پرونده
    </button>
  </div>`;

  window.openModal(modalHtml);

  const submitBtn = el('#btn-submit-data-req');
  if (submitBtn) {
    submitBtn.onclick = async () => {
      const priority = el('#dr-priority').value;
      const reason = el('#dr-reason').value;

      submitBtn.disabled = true;
      submitBtn.innerText = 'در حال ثبت...';

      const res = await apiCreateDataRequest(caseId, requirement.id, reason, priority);
      if (res && res.success) {
        if (window.toast) window.toast(`درخواست تأمین داده (${res.request.request_id}) با موفقیت برای متولی داده ارسال گردید.`);
        if (onSuccess) onSuccess();
      } else {
        if (window.toast) window.toast('خطا در ثبت درخواست داده', false);
        submitBtn.disabled = false;
        submitBtn.innerText = 'تلاش مجدد';
      }
    };
  }
}

/* ------------------------------------------------------------
   7. MODAL: DATA STEWARD DUAL-PATH FULFILLMENT
   ------------------------------------------------------------ */

function openStewardFulfillModal(caseId, requirement, allRequests, onDone) {
  // Find or create request
  let targetReq = allRequests.find(r => r.data_requirement_id === requirement.id);
  const reqId = targetReq ? targetReq.request_id : `DR-TEMP-${Date.now().toString().slice(-4)}`;

  const modalHtml = `
  <div class="modal-h" style="background:#F0FDF4;border-bottom:1px solid #A7F3D0">
    <div>
      <div style="font-size:11px;color:#065F46;font-weight:700">میز کار متولی داده · تأمین داده مسدودکننده</div>
      <h2 style="color:#065F46;font-size:16px;margin:2px 0 0 0">
        ${window.ico?.data || '🗄'} تأمین داده برای: ${window.esc ? window.esc(requirement.name) : requirement.name}
      </h2>
    </div>
    <button class="icon-btn" data-close>${window.ico?.block || '✕'}</button>
  </div>

  <div class="modal-b" style="max-height:75vh;overflow-y:auto;padding:16px">
    <div style="display:flex;gap:10px;margin-bottom:14px;border-bottom:1px solid var(--line);padding-bottom:10px">
      <button class="btn btn-sm btn-pri" id="tab-path1" style="flex:1;justify-content:center">
        مسیر ۱: انتخاب از Dataset و Version موجود
      </button>
      <button class="btn btn-sm" id="tab-path2" style="flex:1;justify-content:center">
        مسیر ۲: ثبت و بارگذاری Dataset جدید (اعتبارسنجی + تأیید)
      </button>
    </div>

    <!-- PATH 1 CONTAINER -->
    <div id="path1-content">
      <div class="notice n-demo" style="margin-bottom:12px">
        ${window.ico?.spark || '⚡'}
        <div>انتخاب Dataset موجود و اتصال نسخه معتبر، اعتبارسنجی‌شده و تأییدشده به این نیازمندی:</div>
      </div>

      <div class="f-row" style="margin-bottom:12px">
        <label class="f-lbl" for="p1-dataset">انتخاب مجموعه داده (Dataset) *</label>
        <select class="f-in" id="p1-dataset">
          <option value="POP-HH-06">POP-HH-06 — جمعیت و خانوار منطقه ۶ (اداره آمار و اطلاعات)</option>
          <option value="ROAD-06">ROAD-06 — شبکه معابر و ترددشمار منطقه ۶ (سازمان حمل‌ونقل و ترافیک)</option>
          <option value="PARCEL-06">PARCEL-06 — پلاک‌های ثبتی و کاداستر منطقه ۶ (اداره املاک)</option>
          <option value="PARK-06">PARK-06 — تقاضای پارک حاشیه‌ای و توزیع بار (معاونت حمل‌ونقل)</option>
        </select>
      </div>

      <div class="f-row" style="margin-bottom:12px">
        <label class="f-lbl" for="p1-version">انتخاب نسخه داده (Version) *</label>
        <select class="f-in" id="p1-version">
          <option value="4" selected>نسخه ۴ (v4 — مصوب شهریور ۱۴۰۵ · پوشش ۱۰۰٪ · EPSG:32639 · تأییدشده)</option>
          <option value="3">نسخه ۳ (v3 — برآورد ۱۴۰۴ · اعتبارسنجی‌شده)</option>
          <option value="2">نسخه ۲ (v2 — سرشماری ۱۳۹۵ · قدیمی)</option>
        </select>
      </div>

      <div class="f-row" style="margin-bottom:12px">
        <label class="f-lbl" for="p1-note">یادداشت متولی داده</label>
        <input class="f-in" id="p1-note" value="نسخه مصوب سال پایه با پوشش کامل محدوده مطالعه تأیید و متصل گردید.">
      </div>
    </div>

    <!-- PATH 2 CONTAINER -->
    <div id="path2-content" style="display:none">
      <div class="notice n-ok" style="margin-bottom:12px">
        ${window.ico?.check || '✓'}
        <div>جریان بارگذاری داده جدید: آپلود فایل → اعتبارسنجی (Validation) → تأیید رسمی (Approval) → صدور نسخه معتبر → اتصال به پرونده</div>
      </div>

      <div class="f-row" style="margin-bottom:12px">
        <label class="f-lbl" for="p2-name">عنوان مجموعه داده جدید *</label>
        <input class="f-in" id="p2-name" value="${window.esc ? window.esc(requirement.name) : requirement.name} — نسخه تفصیلی">
      </div>

      <div class="f-grid" style="grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
        <div>
          <label class="f-lbl" for="p2-role">نقش داده *</label>
          <input class="f-in" id="p2-role" value="${requirement.category}" readonly>
        </div>
        <div>
          <label class="f-lbl" for="p2-crs">سامانه مختصات (CRS) *</label>
          <input class="f-in" id="p2-crs" value="EPSG:32639 (UTM Zone 39N)">
        </div>
      </div>

      <div class="f-row" style="margin-bottom:12px">
        <label class="f-lbl">بارگذاری بسته داده (GeoJSON / CSV / Shapefile) *</label>
        <div style="border:2px dashed var(--line-strong);border-radius:var(--r-m);padding:14px;text-align:center;background:#F9FAFB">
          ${window.ico?.upload || '📤'}
          <div style="font-size:12px;font-weight:600;margin-top:4px">فایل survey_data_validated_1405.geojson انتخاب شد (۴٫۲ مگابایت)</div>
          <div class="muted" style="font-size:11px">تعداد رکوردها: ۲,۴۵۰ رکورد · بدون خطا</div>
        </div>
      </div>

      <!-- Real Validation & Approval Checkbox -->
      <div style="background:#F0FDF4;border:1px solid #86EFAC;border-radius:var(--r-m);padding:10px 12px;margin-bottom:12px">
        <label style="display:flex;align-items:center;gap:8px;font-size:12px;font-weight:600;cursor:pointer">
          <input type="checkbox" id="p2-chk-val" checked disabled>
          <span>اعتبارسنجی ساختار مکانی، فیلدهای الزامی و عدم همپوشانی (VALIDATED: PASS)</span>
        </label>
        <label style="display:flex;align-items:center;gap:8px;font-size:12px;font-weight:600;margin-top:6px;cursor:pointer">
          <input type="checkbox" id="p2-chk-app" checked>
          <span>تأییدیه رسمی متولی داده و اجازه استفاده در تحلیل (APPROVED)</span>
        </label>
      </div>
    </div>
  </div>

  <div class="modal-f" style="display:flex;justify-content:space-between">
    <button class="btn btn-ghost" data-close>انصراف</button>
    <button class="btn btn-pri" id="btn-do-fulfill" style="background:#059669;border-color:#059669">
      ${window.ico?.check || '✓'} تأمین داده و رفع Blocker در پرونده مطالعه
    </button>
  </div>`;

  window.openModal(modalHtml);

  // Tab switching
  let currentPath = 1;
  const tab1 = el('#tab-path1');
  const tab2 = el('#tab-path2');
  const path1El = el('#path1-content');
  const path2El = el('#path2-content');

  if (tab1 && tab2) {
    tab1.onclick = () => {
      currentPath = 1;
      tab1.className = 'btn btn-sm btn-pri';
      tab2.className = 'btn btn-sm';
      path1El.style.display = 'block';
      path2El.style.display = 'none';
    };
    tab2.onclick = () => {
      currentPath = 2;
      tab2.className = 'btn btn-sm btn-pri';
      tab1.className = 'btn btn-sm';
      path2El.style.display = 'block';
      path1El.style.display = 'none';
    };
  }

  // Fulfill Action
  const fulfillBtn = el('#btn-do-fulfill');
  if (fulfillBtn) {
    fulfillBtn.onclick = async () => {
      fulfillBtn.disabled = true;
      fulfillBtn.innerText = 'در حال اعمال اعتبارسنجی و تأمین داده...';

      let dsCode = 'POP-HH-06';
      let dsVer = 4;
      let note = '';

      if (currentPath === 1) {
        dsCode = el('#p1-dataset').value;
        dsVer = Number(el('#p1-version').value) || 4;
        note = el('#p1-note').value;
      } else {
        dsCode = (requirement.category.slice(0, 4).toUpperCase()) + '-NEW-1405';
        dsVer = 1;
        note = 'داده جدید با موفقیت اعتبارسنجی و تأیید شد و نسخه معتبر صادر گردید.';
      }

      // If active request wasn't saved in backend, create it first
      if (!targetReq) {
        await apiCreateDataRequest(caseId, requirement.id, requirement.reason || 'تأمین داده مسدودکننده');
        const latest = await apiGetStudyCase(caseId);
        targetReq = latest?.requests?.find(r => r.data_requirement_id === requirement.id);
      }

      const effectiveReqId = targetReq ? targetReq.request_id : reqId;
      const result = await apiFulfillDataRequest(effectiveReqId, dsCode, dsVer, note);

      if (result && result.success) {
        const isUnblocked = result.studyCase.status === 'READY_FOR_NEXT_STEP' || result.unblocked;
        if (isUnblocked) {
          if (window.toast) window.toast('🎉 تمامی داده‌های مسدودکننده تأمین شدند! پرونده مطالعه آماده شد و مراحل تحلیل فعال گردید.');
        } else {
          if (window.toast) window.toast(`داده «${requirement.name}» با موفقیت تأمین شد. ${result.studyCase.blockers_count} مسدودکننده دیگر باقی مانده است.`);
        }
        if (onDone) onDone();
      } else {
        if (window.toast) window.toast('خطا در تأمین داده', false);
        fulfillBtn.disabled = false;
        fulfillBtn.innerText = 'تلاش مجدد';
      }
    };
  }
}

/* ------------------------------------------------------------
   8. STUDY CASE PAGE: FULL COMPONENT & SECTIONS
   ------------------------------------------------------------ */

function StudyCaseDetailPage(caseId) {
  initLocalStore();
  const data = getLocalStudyCase(caseId);
  if (!data || !data.studyCase) {
    return window.Shell ? window.Shell(window.State ? window.State('search', 'پرونده مطالعه یافت نشد', 'شناسه پرونده در سامانه معتبر نیست.', `<a class="btn btn-pri" href="#/study-cases">فهرست پرونده‌های مطالعه</a>`) : 'پرونده مطالعه یافت نشد') : '<div>پرونده مطالعه یافت نشد</div>';
  }

  const sc = data.studyCase;
  const requirements = data.requirements || [];
  const blockers = data.blockers || [];
  const requests = data.requests || [];
  const isBlocked = sc.status === 'BLOCKED' || blockers.length > 0;

  const crumb = window.Crumb ? window.Crumb([
    { t: 'میز کار تحلیلگر', h: '#/' },
    { t: 'پرونده‌های مطالعه', h: '#/study-cases' },
    { t: sc.id }
  ]) : '';

  return window.Shell(`
  ${crumb}
  <!-- Header -->
  <div class="phead" style="margin-bottom:14px">
    <div>
      <div class="eyebrow">
        پرونده مطالعه شهری · <span class="code">${sc.id}</span> · پیشنهاد مرتبط: <a class="code link" href="#/proposal/${sc.proposal_id}">${sc.proposal_id}</a>
      </div>
      <h1 style="margin:4px 0">${window.esc ? window.esc(sc.title) : sc.title}</h1>
      <p class="sub">
        ${sc.region} · ${sc.district} · مسئول تحلیل: <b>${sc.owner_analyst}</b> · وضعیت: ${sc.status === 'BLOCKED' ? '<span class="bdg b-stop plain">مسدود (BLOCKED)</span>' : '<span class="bdg b-ok plain">آماده اقدام (READY)</span>'}
      </p>
    </div>
    <div class="acts">
      <a class="btn" href="#/proposal/${sc.proposal_id}">
        ${window.ico?.doc || '📄'} مشاهده پیشنهاد اولیه
      </a>
      <button class="btn btn-ghost" id="btn-refresh-case">
        ${window.ico?.run || '🔄'} به‌روزرسانی وضعیت
      </button>
    </div>
  </div>

  <!-- Stepper 1-9 -->
  ${renderWorkflowStepper(sc.workflow_step || 3, sc.status, sc.study_id, sc.proposal_id)}

  <!-- Primary State Card: Blocked or Ready -->
  ${renderStudyCaseStateCard(sc, blockers)}

  <!-- Study Case Sections -->
  <div class="split" style="gap:16px;margin-bottom:18px">
    <!-- Section 1: Study Definition -->
    ${window.Card('تعریف و محدوده مداخله مطالعه', `
      <div class="card-b" style="font-size:12.5px;line-height:1.65">
        <dl class="kv" style="grid-template-columns:120px 1fr;gap:10px 14px;margin-bottom:12px">
          <dt class="muted">محدوده کالبدی</dt>
          <dd>${sc.scope}</dd>

          <dt class="muted">مسئله وضع موجود</dt>
          <dd>${window.esc ? window.esc(sc.problem_statement || 'عدم تناسب ظرفیت شریان با بار سفر و تقاضای عبوری و تداخل شدید سواره و پیاده') : ''}</dd>

          <dt class="muted">هدف مداخله</dt>
          <dd>${window.esc ? window.esc(sc.objective || 'آرام‌سازی سرعت، توسعه مسیرهای امن پیاده و بهبود خدمات اتوبوس برقی') : ''}</dd>

          <dt class="muted">کارشناس مسئول</dt>
          <dd><b>${sc.owner_analyst}</b> (کارشناس تحلیل شهری شهرداری تهران)</dd>
        </dl>
      </div>
    `)}

    <!-- Section 2: Linked Baseline Status -->
    ${window.Card('وضع موجود و داده‌های پین‌شده (Baseline)', `
      <div class="card-b" style="font-size:12.5px;line-height:1.65">
        ${isBlocked ? `
          <div class="notice n-stop" style="margin-bottom:10px">
            ${window.ico?.block || '⛔'}
            <div>وضع موجود مطالعه قفل است. تا زمان تأمین و اعتبارسنجی تمام داده‌های مسدودکننده، تصویر رسمی وضع موجود (فصل صفر) صادر نمی‌شود.</div>
          </div>
        ` : `
          <div class="notice n-ok" style="margin-bottom:10px">
            ${window.ico?.check || '✓'}
            <div>وضع موجود تثبیت شده و تمام ورودی‌های الزامی دارای نسخه معتبر و امضاشده می‌باشند.</div>
          </div>
        `}
        <div style="font-size:12px;margin-top:8px">
          <b>نسخه‌های پین‌شده وضع موجود:</b>
          <div style="margin-top:6px;display:flex;flex-direction:column;gap:6px">
            ${requirements.filter(r => r.satisfied).map(r => `
              <div style="display:flex;justify-content:space-between;align-items:center;background:#F8FAFB;border:1px solid var(--line);border-radius:4px;padding:6px 10px">
                <span>${r.name}</span>
                <span class="code" style="font-size:11.5px">${r.attached_dataset || 'DATA-DEF'} <span class="vbadge">v${window.fa ? window.fa(r.attached_version || 1) : 1}</span></span>
              </div>
            `).join('') || '<div class="muted">هنوز داده‌ای پین نشده است.</div>'}
          </div>
        </div>
      </div>
    `)}
  </div>

  <!-- Section 3: Data Requirements & Requests Table -->
  <section class="card" style="margin-bottom:18px">
    <div class="card-h" style="display:flex;justify-content:space-between;align-items:center">
      <h3>${window.ico?.data || '🗄'} سیاهه نیازمندی‌های داده پرونده (Data Requirements)</h3>
      <span class="bdg b-neu plain num" style="font-size:11.5px">
        ${window.fa ? window.fa(requirements.length) : requirements.length} نیازمندی مصوب
      </span>
    </div>

    <div class="tw">
      <table class="tbl">
        <thead>
          <tr>
            <th>عنوان نیازمندی داده</th>
            <th>دسته موضوعی</th>
            <th>ماژول وابسته</th>
            <th>محدوده و دوره</th>
            <th>مسدودکننده؟</th>
            <th>وضعیت</th>
            <th>نسخه داده</th>
            <th>اقدام</th>
          </tr>
        </thead>
        <tbody>
          ${requirements.map(r => {
            const hasReq = requests.find(dr => dr.data_requirement_id === r.id);
            const isBlk = r.blocking && !r.satisfied;

            return `
            <tr style="background:${isBlk ? '#FFFBFB' : '#FFF'}">
              <td>
                <b>${window.esc ? window.esc(r.name) : r.name}</b>
                ${isBlk ? `<div style="font-size:11px;color:#DC2626;margin-top:2px">${window.esc ? window.esc(r.blocker_reason || '') : ''}</div>` : ''}
              </td>
              <td>${r.category}</td>
              <td><span class="bdg b-pri" style="font-size:11px">${r.module_code}</span></td>
              <td style="font-size:12px">${r.scope} · ${r.time_period}</td>
              <td>
                ${r.blocking ? '<span class="bdg b-stop plain">مسدودکننده</span>' : '<span class="muted">اختیاری</span>'}
              </td>
              <td>
                ${r.satisfied ? '<span class="bdg b-ok">تأمین و تأییدشده</span>' :
                  r.status === 'REQUESTED' ? `<span class="bdg ${(window.DREQ_ST?.open?.c) || 'b-warn'}">${(window.DREQ_ST?.open?.t) || 'در انتظار پاسخ'}</span>` :
                  '<span class="bdg b-stop">مسدود (تأمین‌نشده)</span>'}
              </td>
              <td>
                ${r.attached_dataset ? `<span class="code">${r.attached_dataset}</span> <span class="vbadge">v${window.fa ? window.fa(r.attached_version || 1) : 1}</span>` : '<span class="muted">—</span>'}
              </td>
              <td>
                ${isBlk ? `
                  <button class="btn btn-sm btn-pri" data-req-row-action="${r.id}" style="background:#DC2626;border-color:#DC2626;padding:4px 10px;font-size:11.5px">
                    ${hasReq ? 'پیگیری استعلام' : 'درخواست داده'}
                  </button>
                ` : `
                  <span class="muted" style="font-size:12px">آماده</span>
                `}
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  </section>

  <!-- Section 4: Data Requests Tracking Desk -->
  ${requests.length ? `
  <section class="card" style="margin-bottom:18px">
    <div class="card-h">
      <h3>${window.ico?.flag || '🚩'} رهگیری درخواست‌های استعلام داده (Data Requests)</h3>
    </div>
    <div class="card-b" style="padding:0">
      <div class="tw">
        <table class="tbl">
          <thead>
            <tr>
              <th>شناسه درخواست</th>
              <th>داده موردنیاز</th>
              <th>درخواست‌کننده</th>
              <th>مسئول ارجاع</th>
              <th>اولویت</th>
              <th>وضعیت</th>
              <th>تاریخ ثبت</th>
            </tr>
          </thead>
          <tbody>
            ${requests.map(dr => `
              <tr>
                <td><span class="code">${dr.request_id}</span></td>
                <td><b>${window.esc ? window.esc(dr.requirement_name) : dr.requirement_name}</b></td>
                <td>${dr.requested_by}</td>
                <td>${dr.assigned_to}</td>
                <td>
                  <span class="bdg ${dr.priority === 'CRITICAL' ? 'b-stop' : 'b-warn'} plain">
                    ${dr.priority === 'CRITICAL' ? 'بحرانی (مسدودکننده)' : 'بالا'}
                  </span>
                </td>
                <td>
                  <span class="bdg ${dr.status === 'FULFILLED' ? 'b-ok' : dr.status === 'REJECTED' ? 'b-stop' : ((window.DREQ_ST?.open?.c) || 'b-warn')}">
                    ${dr.status === 'FULFILLED' ? 'تأمین شد' : dr.status === 'REJECTED' ? 'رد شد' : ((window.DREQ_ST?.open?.t) || 'در انتظار پاسخ')}
                  </span>
                </td>
                <td class="num">${dr.created_at}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  </section>
  ` : ''}

  <!-- Section 5: Scenario & Analysis Controls -->
  <section class="card" style="margin-bottom:24px;border:1px solid ${isBlocked ? 'var(--line)' : 'var(--ok)'}">
    <div class="card-h">
      <h3>${window.ico?.spark || '⚡'} شبیه‌سازی و اجرای سناریوی تحلیلی (Modules M01 - M12)</h3>
    </div>
    <div class="card-b">
      ${isBlocked ? `
        <div class="notice n-stop" style="margin-bottom:14px">
          ${window.ico?.block || '⛔'}
          <div>
            <b>اجرای تحلیل غیرفعال است:</b> اجرای تحلیل تا زمان تأمین و تأیید تمام داده‌های مسدودکننده امکان‌پذیر نیست. با کلیک روی «مشاهده داده‌های مسدودکننده» و تأمین موارد، دکمه‌های زیر خودکار فعال خواهند شد.
          </div>
        </div>

        <div style="display:flex;gap:12px;opacity:0.5;pointer-events:none">
          <button class="btn btn-pri" disabled title="اجرای تحلیل تا رفع موانع امکان‌پذیر نیست">
            ${window.ico?.run || '▶'} شروع تحلیل اثر ۱۲گانه
          </button>
          <button class="btn" disabled>
            ${window.ico?.spark || '⚡'} تدوین سناریوی جدید
          </button>
        </div>
      ` : `
        <div class="notice n-ok" style="margin-bottom:14px">
          ${window.ico?.check || '✓'}
          <div>
            <b>تمامی پیش‌نیازها آماده است:</b> داده‌های وضع موجود پین گردیده‌اند و مطالعه آماده اجرای شبیه‌سازی‌های ۱۲گانه (M01 تا M12) است.
          </div>
        </div>

        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <button class="btn btn-pri" id="btn-run-unblocked-analysis" style="background:#059669;border-color:#059669;padding:10px 20px;font-weight:700">
            ${window.ico?.run || '▶'} اجرای کامل تحلیل اثر ۱۲گانه (M01 - M12)
          </button>
          <a class="btn" href="#/proposal/${sc.proposal_id}">
            ${window.ico?.doc || '📄'} مشاهده نتایج در کارتابل پیشنهاد
          </a>
        </div>
      `}
    </div>
  </section>
  `);
}

function bindStudyCaseDetail(caseId) {
  const data = getLocalStudyCase(caseId);
  if (!data || !data.studyCase) return;

  const sc = data.studyCase;
  const blockers = data.blockers || [];
  const requests = data.requests || [];
  const requirements = data.requirements || [];

  // Bind Events
  const openBlockersBtn = el('#btn-view-blockers');
  if (openBlockersBtn) {
    openBlockersBtn.onclick = () => openBlockersDrawer(caseId, blockers, sc, requests);
  }

  const openBlockersBtn2 = el('#btn-open-blockers-drawer');
  if (openBlockersBtn2) {
    openBlockersBtn2.onclick = () => openBlockersDrawer(caseId, blockers, sc, requests);
  }

  const recheckBtn = el('#btn-recheck-blocking');
  if (recheckBtn) {
    recheckBtn.onclick = async () => {
      recheckBtn.disabled = true;
      recheckBtn.innerText = 'در حال ارزیابی...';
      await apiRecheckBlocking(caseId);
      if (window.toast) window.toast('وضعیت وابستگی‌ها ارزیابی مجدد شد.');
      if (window.render) window.render();
    };
  }

  const refreshBtn = el('#btn-refresh-case');
  if (refreshBtn) {
    refreshBtn.onclick = () => {
      if (window.toast) window.toast('در حال به‌روزرسانی پرونده...');
      if (window.render) window.render();
    };
  }

  const createScenarioBtn = el('#btn-act-create-scenario');
  if (createScenarioBtn) {
    createScenarioBtn.onclick = () => {
      syncStudyCaseWithChapterZero(sc.id);
      if (window.toast) window.toast('در حال راه‌اندازی و اجرای ماژول‌های ۱۲گانه...', true);
      if (window.startAnalysis && sc.proposal_id) {
        window.startAnalysis(sc.proposal_id);
      } else if (sc.proposal_id) {
        location.hash = `#/proposal/${sc.proposal_id}`;
      } else {
        location.hash = `#/scenarios`;
      }
    };
  }

  const runAnalysisBtn = el('#btn-run-unblocked-analysis');
  if (runAnalysisBtn) {
    runAnalysisBtn.onclick = () => {
      syncStudyCaseWithChapterZero(sc.id);
      if (window.toast) window.toast('در حال راه‌اندازی و اجرای ماژول‌های ۱۲گانه...', true);
      if (window.startAnalysis && sc.proposal_id) {
        window.startAnalysis(sc.proposal_id);
      } else if (sc.proposal_id) {
        location.hash = `#/proposal/${sc.proposal_id}`;
      } else {
        location.hash = `#/runs`;
      }
    };
  }

  // Row buttons
  els('[data-req-row-action]').forEach(btn => {
    btn.onclick = () => {
      const rId = btn.dataset.reqRowAction;
      const targetReq = requirements.find(r => r.id === rId);
      if (targetReq) {
        openBlockersDrawer(caseId, blockers, sc, requests);
      }
    };
  });
}

async function renderStudyCaseDetail(caseId) {
  const container = el('#app');
  if (!container) return;
  try { await apiGetStudyCase(caseId); } catch (e) {}
  container.innerHTML = StudyCaseDetailPage(caseId);
  bindStudyCaseDetail(caseId);
}

/* ------------------------------------------------------------
   9. NEW STUDY CASE MODAL
   ------------------------------------------------------------ */

function openNewStudyCaseModal() {
  const studies = window.DB?.studies || [];
  const myName = window.ME ? window.ME() : 'مهندس زهرا کاظمی';

  const html = `
  <div style="font-size:13px;line-height:1.6">
    <p class="sub" style="margin-bottom:14px">
      پرونده مطالعه ساختار تحلیلی اصلی پیوند میان پیشنهادهای شهری، سیاهه داده‌های وضع موجود و ارزیابی سناریوهاست.
    </p>

    <div style="display:flex;flex-direction:column;gap:12px">
      <div>
        <label class="lbl"><b>عنوان پرونده تحلیلی *</b></label>
        <input type="text" id="new-case-title" class="inp" style="width:100%" placeholder="مثال: پرونده تحلیلی ساماندهی تقاطع‌های پهنه مرکزی" />
      </div>

      <div class="split" style="gap:12px">
        <div>
          <label class="lbl"><b>مطالعه مادر متناظر</b></label>
          <select id="new-case-study" class="inp" style="width:100%">
            ${studies.map(s => `<option value="${s.id}">${s.id} — ${s.name || s.t}</option>`).join('')}
            <option value="">مطالعه مستقل (بدون مطالعه مادر)</option>
          </select>
        </div>
        <div>
          <label class="lbl"><b>منطقه شهرداری</b></label>
          <select id="new-case-region" class="inp" style="width:100%">
            <option value="منطقه ۶">منطقه ۶</option>
            <option value="منطقه ۲">منطقه ۲</option>
            <option value="منطقه ۱۵">منطقه ۱۵</option>
            <option value="منطقه ۸">منطقه ۸</option>
            <option value="منطقه ۳">منطقه ۳</option>
            <option value="منطقه ۱۲">منطقه ۱۲</option>
            <option value="تمام مناطق">تمام مناطق تهران</option>
          </select>
        </div>
      </div>

      <div>
        <label class="lbl"><b>محدوده کالبدی مداخله</b></label>
        <input type="text" id="new-case-scope" class="inp" style="width:100%" placeholder="مثال: ناحیه ۲ — محلات ۳ و ۴ پیرامون بلوار کشاورز" />
      </div>

      <div>
        <label class="lbl"><b>مسئله وضع موجود</b></label>
        <textarea id="new-case-problem" class="inp" style="width:100%;height:60px" placeholder="شرح اجمالی مسئله ترافیکی، کالبدی یا جمعیتی وضع موجود..."></textarea>
      </div>

      <div>
        <label class="lbl"><b>هدف و خروجی مورد انتظار</b></label>
        <input type="text" id="new-case-objective" class="inp" style="width:100%" placeholder="مثال: آرام‌سازی سرعت و کاهش بار ترافیک عبوری" />
      </div>

      <div>
        <label class="lbl"><b>کارشناس تحلیلگر مسئول</b></label>
        <input type="text" id="new-case-owner" class="inp" style="width:100%;background:#F3F4F6" value="${myName}" readonly />
      </div>
    </div>
  </div>
  `;

  if (window.openModal) {
    window.openModal('ثبت پرونده جدید مطالعه تحلیلی', html, {
      confirmText: 'ثبت و افتتاح پرونده',
      onConfirm: () => {
        const titleInp = el('#new-case-title');
        const title = titleInp ? titleInp.value.trim() : '';
        if (!title) {
          if (window.toast) window.toast('لطفاً عنوان پرونده را وارد کنید.', false);
          return;
        }

        const studyId = el('#new-case-study') ? el('#new-case-study').value : '';
        const region = el('#new-case-region') ? el('#new-case-region').value : 'منطقه ۶';
        const scope = el('#new-case-scope') ? el('#new-case-scope').value.trim() : 'محدوده مطالعه';
        const problem = el('#new-case-problem') ? el('#new-case-problem').value.trim() : 'مسئله وضع موجود';
        const objective = el('#new-case-objective') ? el('#new-case-objective').value.trim() : 'ارزیابی سناریو و تحلیل ۱۲گانه';

        const newId = `CASE-1405-000${String(53 + (window.DB?.studyCases?.length || 0)).padStart(2, '0')}`;
        const propId = `PR-1405-000${String(130 + (window.DB?.studyCases?.length || 0)).padStart(3, '0')}`;

        const newCase = {
          id: newId,
          proposal_id: propId,
          study_id: studyId,
          title,
          region,
          district: 'ناحیه ۲',
          scope: scope || region,
          owner_analyst: myName,
          status: 'READY_FOR_NEXT_STEP',
          workflow_step: 3,
          problem_statement: problem,
          objective,
          blockers_count: 0,
          total_requirements: 2,
          satisfied_requirements: 2,
          baseline: { status: 'READY', pinned_datasets: {} },
          scenario_id: null,
          created_at: '۱۴۰۵/۰۶/۲۳',
          updated_at: '۱۴۰۵/۰۶/۲۳'
        };

        if (!window.DB.studyCases) window.DB.studyCases = [];
        window.DB.studyCases.unshift(newCase);

        if (!window.DB.studyRequirements) window.DB.studyRequirements = [];
        window.DB.studyRequirements.push({
          id: `REQ-${newId}-01`,
          study_case_id: newId,
          name: 'شبکه معابر و شریانی محدوده',
          category: 'حمل‌ونقل و معابر',
          reason: 'برای تحلیل جریان تردد',
          module_code: 'M04 Trip Generation',
          scope,
          time_period: 'وضع موجود مصوب',
          required: true,
          blocking: false,
          satisfied: true,
          status: 'SATISFIED',
          attached_dataset: 'ROAD-06',
          attached_version: 12
        });

        if (window.saveDB) window.saveDB();
        if (window.logAct) window.logAct({ action: 'REGISTER_CASE', et: 'case', eid: newId, etitle: title, text: `پرونده مطالعه جدید «${title}» ثبت شد` });
        if (window.toast) window.toast(`پرونده مطالعه ${newId} با موفقیت ثبت شد.`);
        if (window.closeAll) window.closeAll();
        location.hash = `#/study-case/${newId}`;
      }
    });
  }
}

/* ------------------------------------------------------------
   10. STUDY CASES LIST PAGE (`#/study-cases`)
   ------------------------------------------------------------ */

function StudyCasesListPage() {
  initLocalStore();
  let cases = window.DB.studyCases || [];

  const curUser = window.STATE?.user;
  const myName = window.ME ? window.ME() : 'مهندس زهرا کاظمی';

  // State filters
  const state = window.STUDY_CASE_SYSTEM || (window.STUDY_CASE_SYSTEM = {});
  if (!state.activeTab) state.activeTab = 'my';
  const activeTab = state.activeTab;
  const searchQuery = (state.searchQuery || '').trim().toLowerCase();
  const regionFilter = state.regionFilter || '';

  // KPI Calculations
  const totalCount = cases.length;
  const myCasesCount = cases.filter(c => !c.owner_analyst || c.owner_analyst.includes(myName) || myName.includes(c.owner_analyst)).length;
  const blockedCount = cases.filter(c => c.status === 'BLOCKED' || (c.blockers_count > 0)).length;
  const readyCount = cases.filter(c => c.status === 'READY_FOR_NEXT_STEP' || (c.blockers_count === 0 && c.status !== 'BLOCKED')).length;
  const inAnalysisCount = cases.filter(c => c.status === 'IN_ANALYSIS' || c.status === 'COMPLETED').length;

  // Tab Filtering
  let filteredCases = [...cases];
  if (activeTab === 'my') {
    filteredCases = filteredCases.filter(c => !c.owner_analyst || c.owner_analyst.includes(myName) || myName.includes(c.owner_analyst));
  } else if (activeTab === 'blocked') {
    filteredCases = filteredCases.filter(c => c.status === 'BLOCKED' || (c.blockers_count > 0));
  } else if (activeTab === 'ready') {
    filteredCases = filteredCases.filter(c => c.status === 'READY_FOR_NEXT_STEP' || (c.blockers_count === 0 && c.status !== 'BLOCKED'));
  } else if (activeTab === 'analysis') {
    filteredCases = filteredCases.filter(c => c.status === 'IN_ANALYSIS' || c.status === 'COMPLETED');
  }

  // Region Filter
  if (regionFilter) {
    filteredCases = filteredCases.filter(c => c.region === regionFilter || (c.region || '').includes(regionFilter));
  }

  // Search Query
  if (searchQuery) {
    filteredCases = filteredCases.filter(c =>
      (c.title && c.title.toLowerCase().includes(searchQuery)) ||
      (c.id && c.id.toLowerCase().includes(searchQuery)) ||
      (c.study_id && c.study_id.toLowerCase().includes(searchQuery)) ||
      (c.proposal_id && c.proposal_id.toLowerCase().includes(searchQuery)) ||
      (c.region && c.region.toLowerCase().includes(searchQuery)) ||
      (c.district && c.district.toLowerCase().includes(searchQuery)) ||
      (c.scope && c.scope.toLowerCase().includes(searchQuery)) ||
      (c.owner_analyst && c.owner_analyst.toLowerCase().includes(searchQuery))
    );
  }

  const regions = [...new Set(cases.map(c => c.region).filter(Boolean))];

  return window.Shell(`
  ${window.Crumb ? window.Crumb([{ t: 'میز کار تحلیلگر', h: '#/' }, { t: 'پرونده‌های مطالعه' }]) : ''}
  <div class="phead">
    <div>
      <div class="eyebrow">کارتابل تحلیلگر شهری · معاونت شهرسازی و معماری شهرداری تهران</div>
      <h1>پرونده‌های مطالعه (Study Cases)</h1>
      <p class="sub">
        مدیریت پرونده‌های فعال تحلیلی، وضعیت داده‌های مسدودکننده (Blockers)، تدوین سناریو و مقایسه با وضع موجود تثبیت‌شده
      </p>
    </div>
    <div class="acts">
      <button class="btn btn-pri" id="btn-open-new-case-modal">
        ${window.ico?.plus || '➕'} ثبت پرونده جدید مطالعه
      </button>
      <button class="btn btn-ghost" id="btn-refresh-study-cases">
        ${window.ico?.run || '🔄'} به‌روزرسانی
      </button>
    </div>
  </div>

  <!-- KPI summary cards -->
  <div class="kpis" style="grid-template-columns:repeat(5,1fr);margin-bottom:16px">
    <div class="kpi k-pri ${activeTab === 'all' ? 'active-kpi' : ''}" style="cursor:pointer" data-tab-switch="all">
      <div class="v num">${window.fa ? window.fa(totalCount) : totalCount}</div>
      <div class="l">کل پرونده‌های مطالعه</div>
      <div class="d">سامانه تحلیل شهری</div>
    </div>
    <div class="kpi k-pri ${activeTab === 'my' ? 'active-kpi' : ''}" style="cursor:pointer;border-top:3px solid var(--pri)" data-tab-switch="my">
      <div class="v num">${window.fa ? window.fa(myCasesCount) : myCasesCount}</div>
      <div class="l">پرونده‌های من</div>
      <div class="d">${myName}</div>
    </div>
    <div class="kpi k-stop ${activeTab === 'blocked' ? 'active-kpi' : ''}" style="cursor:pointer" data-tab-switch="blocked">
      <div class="v num">${window.fa ? window.fa(blockedCount) : blockedCount}</div>
      <div class="l">مسدود (دارای Blocker)</div>
      <div class="d">نیازمند تأمین داده</div>
    </div>
    <div class="kpi k-ok ${activeTab === 'ready' ? 'active-kpi' : ''}" style="cursor:pointer" data-tab-switch="ready">
      <div class="v num">${window.fa ? window.fa(readyCount) : readyCount}</div>
      <div class="l">آماده تحلیل (Ready)</div>
      <div class="d">بدون داده مسدودکننده</div>
    </div>
    <div class="kpi k-run ${activeTab === 'analysis' ? 'active-kpi' : ''}" style="cursor:pointer" data-tab-switch="analysis">
      <div class="v num">${window.fa ? window.fa(inAnalysisCount) : inAnalysisCount}</div>
      <div class="l">در حال مدل‌سازی و سناریو</div>
      <div class="d">گام‌های پیشرفته</div>
    </div>
  </div>

  <!-- Filter tabs bar -->
  <div class="tabs" style="margin-bottom:14px">
    <button class="tab-btn ${activeTab === 'my' ? 'active' : ''}" data-tab="my">
      ${window.ico?.user || '👤'} پرونده‌های من (${window.fa ? window.fa(myCasesCount) : myCasesCount})
    </button>
    <button class="tab-btn ${activeTab === 'all' ? 'active' : ''}" data-tab="all">
      همه پرونده‌ها (${window.fa ? window.fa(totalCount) : totalCount})
    </button>
    <button class="tab-btn ${activeTab === 'blocked' ? 'active' : ''}" data-tab="blocked">
      ${window.ico?.block || '⛔'} مسدودکننده فعال (${window.fa ? window.fa(blockedCount) : blockedCount})
    </button>
    <button class="tab-btn ${activeTab === 'ready' ? 'active' : ''}" data-tab="ready">
      ${window.ico?.check || '✓'} آماده سناریو و تحلیل (${window.fa ? window.fa(readyCount) : readyCount})
    </button>
    <button class="tab-btn ${activeTab === 'analysis' ? 'active' : ''}" data-tab="analysis">
      ${window.ico?.run || '⚡'} در حال تحلیل (${window.fa ? window.fa(inAnalysisCount) : inAnalysisCount})
    </button>
  </div>

  <!-- Filter & search bar -->
  <div class="card" style="margin-bottom:16px;padding:12px 16px">
    <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
      <div style="flex:1;min-width:240px;position:relative">
        <input type="text" id="study-case-search" class="inp" style="width:100%;padding-right:32px" placeholder="جستجو در عنوان پرونده، شناسه (CASE-)، کد مطالعه (ST-)، منطقه یا مسئول..." value="${window.esc ? window.esc(searchQuery) : searchQuery}" />
        <span style="position:absolute;right:10px;top:50%;transform:translateY(-50%);color:var(--muted);pointer-events:none">🔍</span>
      </div>
      <div style="width:180px">
        <select id="study-case-region-filter" class="inp" style="width:100%">
          <option value="">همه مناطق شهرداری</option>
          ${regions.map(r => `<option value="${r}" ${regionFilter === r ? 'selected' : ''}>${r}</option>`).join('')}
        </select>
      </div>
      ${(searchQuery || regionFilter) ? `
        <button class="btn btn-ghost btn-sm" id="btn-reset-filters" style="color:var(--stop)">
          ✕ پاک کردن فیلترها
        </button>
      ` : ''}
      <div style="margin-right:auto;font-size:12px;color:var(--muted)">
        نمایش <b class="num" style="color:var(--text)">${window.fa ? window.fa(filteredCases.length) : filteredCases.length}</b> پرونده
      </div>
    </div>
  </div>

  <!-- Cases Table Card -->
  <section class="card">
    <div class="card-h" style="display:flex;justify-content:space-between;align-items:center">
      <h3>فهرست پرونده‌های مطالعه شهری</h3>
      <span class="bdg b-neu plain" style="font-size:11.5px">
        ${activeTab === 'my' ? 'نمایش پرونده‌های تخصیص‌یافته به شما' : 'فهرست کل پرونده‌ها'}
      </span>
    </div>
    <div class="tw">
      <table class="tbl">
        <thead>
          <tr>
            <th>عنوان پرونده تحلیلی</th>
            <th>شناسه پرونده</th>
            <th>مطالعه مادر متناظر</th>
            <th>پیشنهاد مرتبط</th>
            <th>محدوده و منطقه</th>
            <th>کارشناس مسئول</th>
            <th>وضعیت انسداد داده</th>
            <th>گردش کار</th>
            <th>اقدام</th>
          </tr>
        </thead>
        <tbody>
          ${filteredCases.length ? filteredCases.map(c => {
            const isBlk = c.status === 'BLOCKED' || (c.blockers_count > 0);
            const isMe = c.owner_analyst && (c.owner_analyst.includes(myName) || myName.includes(c.owner_analyst));

            return `
            <tr style="background:${isBlk ? '#FFFDFD' : '#FFF'}">
              <td>
                <div style="display:flex;align-items:center;gap:6px">
                  ${isBlk ? '<span style="color:#DC2626" title="دارای مانع مسدودکننده">⛔</span>' : '<span style="color:#059669" title="آماده">✓</span>'}
                  <b><a class="link" href="#/study-case/${c.id}">${window.esc ? window.esc(c.title) : c.title}</a></b>
                </div>
                <div class="sub" style="margin-top:3px">${c.region} · ${c.district} · ${c.scope || ''}</div>
              </td>
              <td><span class="code">${c.id}</span></td>
              <td>
                ${c.study_id ? `<a class="code link" href="#/study/${c.study_id}">${c.study_id}</a>` : '<span class="muted">—</span>'}
              </td>
              <td>
                ${c.proposal_id ? `<a class="code link" href="#/proposal/${c.proposal_id}">${c.proposal_id}</a>` : '<span class="muted">—</span>'}
              </td>
              <td style="font-size:12px;white-space:nowrap">${c.region}</td>
              <td style="white-space:nowrap">
                <span class="bdg ${isMe ? 'b-pri' : 'b-neu'} plain" style="font-size:11.5px">
                  ${c.owner_analyst || 'تعیین‌نشده'}
                </span>
              </td>
              <td>
                ${isBlk ? `
                  <span class="bdg b-stop" style="font-size:11.5px">
                    ${window.fa ? window.fa(c.blockers_count || 1) : (c.blockers_count || 1)} مورد مسدودکننده
                  </span>
                ` : `
                  <span class="bdg b-ok" style="font-size:11.5px">داده‌ها آماده</span>
                `}
                <div style="font-size:10.5px;color:var(--muted);margin-top:2px">
                  ${window.fa ? window.fa(c.satisfied_requirements || 0) : 0} از ${window.fa ? window.fa(c.total_requirements || 0) : 0} قلم داده
                </div>
              </td>
              <td>
                <span class="bdg b-neu plain" style="font-size:11px">
                  گام ${window.fa ? window.fa(c.workflow_step || 3) : (c.workflow_step || 3)} از ۹
                </span>
              </td>
              <td>
                <div style="display:flex;gap:6px">
                  <a class="btn btn-sm ${isBlk ? 'btn-pri' : ''}" href="#/study-case/${c.id}" style="${isBlk ? 'background:#DC2626;border-color:#DC2626' : ''}">
                    ${isBlk ? 'مشاهده و رفع موانع' : 'ورود به پرونده'}
                  </a>
                  ${!isBlk ? `
                    <button class="btn btn-sm btn-ghost" data-quick-scenario="${c.id}" title="ایجاد سناریو">
                      ${window.ico?.spark || '⚡'}
                    </button>
                  ` : ''}
                </div>
              </td>
            </tr>`;
          }).join('') : `
            <tr>
              <td colspan="9" style="text-align:center;padding:36px">
                <div style="font-size:24px;margin-bottom:8px">🔍</div>
                <b>هیچ پرونده‌ای با این مشخصات یافت نشد.</b>
                <p class="sub" style="margin-top:4px">می‌توانید فیلترها را تغییر دهید یا پرونده جدیدی ثبت کنید.</p>
                <button class="btn btn-sm btn-pri" id="btn-clear-search-empty" style="margin-top:10px">
                  مشاهده همه پرونده‌ها
                </button>
              </td>
            </tr>
          `}
        </tbody>
      </table>
    </div>
  </section>
  `);
}

function bindStudyCasesList() {
  if (window.bindRows) window.bindRows();

  const state = window.STUDY_CASE_SYSTEM || (window.STUDY_CASE_SYSTEM = {});

  // Tab switching
  els('[data-tab]').forEach(btn => {
    btn.onclick = () => {
      state.activeTab = btn.dataset.tab;
      if (window.render) window.render();
    };
  });

  els('[data-tab-switch]').forEach(btn => {
    btn.onclick = () => {
      state.activeTab = btn.dataset.tabSwitch;
      if (window.render) window.render();
    };
  });

  // Search input
  const searchInp = el('#study-case-search');
  if (searchInp) {
    searchInp.oninput = () => {
      state.searchQuery = searchInp.value;
      const pos = searchInp.selectionStart;
      if (window.render) {
        window.render();
        const nextInp = el('#study-case-search');
        if (nextInp) {
          nextInp.focus();
          try { nextInp.setSelectionRange(pos, pos); } catch (e) {}
        }
      }
    };
  }

  // Region filter
  const regionSelect = el('#study-case-region-filter');
  if (regionSelect) {
    regionSelect.onchange = () => {
      state.regionFilter = regionSelect.value;
      if (window.render) window.render();
    };
  }

  // Reset filters
  const resetBtn = el('#btn-reset-filters');
  if (resetBtn) {
    resetBtn.onclick = () => {
      state.searchQuery = '';
      state.regionFilter = '';
      if (window.render) window.render();
    };
  }

  const clearEmptyBtn = el('#btn-clear-search-empty');
  if (clearEmptyBtn) {
    clearEmptyBtn.onclick = () => {
      state.activeTab = 'all';
      state.searchQuery = '';
      state.regionFilter = '';
      if (window.render) window.render();
    };
  }

  // New Case Modal button
  const newCaseBtn = el('#btn-open-new-case-modal');
  if (newCaseBtn) {
    newCaseBtn.onclick = () => openNewStudyCaseModal();
  }

  // Refresh button
  const refreshBtn = el('#btn-refresh-study-cases');
  if (refreshBtn) {
    refreshBtn.onclick = () => {
      if (window.toast) window.toast('در حال به‌روزرسانی پرونده‌های مطالعه...');
      if (window.render) window.render();
    };
  }

  // Quick scenario buttons
  els('[data-quick-scenario]').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const caseId = btn.dataset.quickScenario;
      const c = (window.DB?.studyCases || []).find(x => x.id === caseId);
      if (c && c.proposal_id) {
        if (window.startAnalysis) {
          window.startAnalysis(c.proposal_id);
        } else {
          location.hash = `#/proposal/${c.proposal_id}`;
        }
      } else {
        location.hash = `#/study-case/${caseId}`;
      }
    };
  });
}

/* ------------------------------------------------------------
   11. ROUTE DISPATCHER EXPOSURE
   ------------------------------------------------------------ */

function handleStudyCaseRoute(h) {
  initLocalStore();
  const match = h.match(/^#\/study-case\/([^/?]+)/);
  if (match) {
    const caseId = match[1];
    return {
      p: StudyCaseDetailPage(caseId),
      b: () => bindStudyCaseDetail(caseId)
    };
  }
  return { p: StudyCasesListPage(), b: bindStudyCasesList };
}

window.handleStudyCaseRoute = handleStudyCaseRoute;
window._studyCaseRouteHandler = handleStudyCaseRoute;
window.StudyCasesListPage = StudyCasesListPage;
window.bindStudyCasesList = bindStudyCasesList;
window.openNewStudyCaseModal = openNewStudyCaseModal;
window.renderStudyCaseDetail = renderStudyCaseDetail;
window.renderWorkflowStepper = renderWorkflowStepper;
window.renderStudyCaseStateCard = renderStudyCaseStateCard;
window.getLocalStudyCase = getLocalStudyCase;
window.getLocalStudyCaseByProposal = getLocalStudyCaseByProposal;
window.localCreateDataRequest = localCreateDataRequest;
window.localFulfillDataRequest = localFulfillDataRequest;
window.localRecheckBlocking = localRecheckBlocking;
window.syncStudyCaseWithChapterZero = syncStudyCaseWithChapterZero;
window.syncStudyRequirementsFromChapterZero = syncStudyRequirementsFromChapterZero;
window.apiGetStudyCase = apiGetStudyCase;
window.apiGetStudyCaseByProposal = apiGetStudyCaseByProposal;
window.apiCreateDataRequest = apiCreateDataRequest;
window.apiFulfillDataRequest = apiFulfillDataRequest;
window.apiRecheckBlocking = apiRecheckBlocking;
window.openBlockersDrawer = openBlockersDrawer;
window.openCreateDataRequestModal = openCreateDataRequestModal;
window.openStewardFulfillModal = openStewardFulfillModal;

// Auto re-render if current route is study-cases
if (window.render && location.hash && (location.hash.startsWith('#/study-case') || location.hash === '#/study-cases')) {
  setTimeout(() => window.render(), 10);
}

})();

