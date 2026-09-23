import re
import shutil

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update STUDY_TABS
old_study_tabs = """const STUDY_TABS = [
  ['overview','نمای کلی'],['chapter0','فصل صفر'],['chapters','فصل‌ها'],['tasks','وظایف'],['data','داده'],
  ['map','نقشه'],['rules','قوانین'],['indicators','شاخص‌ها'],['models','مدل‌ها'],['scenarios','سناریوها'],
  ['runs','اجراها'],['evidence','شواهد'],['reports','گزارش‌ها'],['review','بررسی'],['history','تاریخچه'],
];"""

new_study_tabs = """const STUDY_TABS = [
  ['overview','نمای کلی'],['chapter0','فصل صفر'],['baseline','وضع موجود'],['scenarios','سناریوها'],['precheck','پیش‌بررسی'],
  ['runs','اجرا'],['indicators','نتایج'],['comparison','مقایسه'],['evidence','شواهد'],['reports','گزارش‌ها'],['review','بررسی و تأیید نهایی'],['history','تاریخچه'],
];"""

if old_study_tabs in content:
    content = content.replace(old_study_tabs, new_study_tabs)
    print("Replaced STUDY_TABS successfully")
else:
    print("WARNING: old_study_tabs not matched exactly, looking with regex")
    content = re.sub(r"const STUDY_TABS\s*=\s*\[[^\]]+\];", new_study_tabs, content, count=1)

# 2. Update Rail
old_rail = """const Rail = (stage=-1,studyId)=>`<div class="rail">
  <span class="lbl">${ico.flag}چرخه اجرای تحلیلی مطالعه</span>
  ${WORKFLOW.map((w,i)=>{
    const cls = i<stage?'done':i===stage?'now':'';
    const h = studyId?`#/study/${studyId}/${['data','overview','chapter0','overview','scenarios','runs','runs','runs','runs','evidence','reports','review','review'][i]||'overview'}`:'#';
    return `<a class="step ${cls}" href="${h}"><span class="n">${i<stage?'✓':fa(i+1)}</span>${w}</a>`;
  }).join('')}</div>`;"""

new_rail = """const WORKFLOW_STEP_TABS = ['data','overview','chapter0','baseline','scenarios','precheck','runs','indicators','comparison','evidence','reports','review','review'];
const Rail = (stage=-1,studyId)=>`<div class="rail">
  <span class="lbl">${ico.flag}چرخه اجرای تحلیلی مطالعه</span>
  ${WORKFLOW.map((w,i)=>{
    const cls = i<stage?'done':i===stage?'now':'';
    const tabTarget = WORKFLOW_STEP_TABS[i] || 'overview';
    const h = studyId ? `#/study/${studyId}/${tabTarget}` : '#';
    return `<a class="step ${cls}" href="${h}"><span class="n">${i<stage?'✓':fa(i+1)}</span>${w}</a>`;
  }).join('')}</div>`;"""

if old_rail in content:
    content = content.replace(old_rail, new_rail)
    print("Replaced Rail successfully")
else:
    print("WARNING: old_rail not matched exactly, using regex")
    content = re.sub(r"const Rail\s*=\s*\(stage=-1,studyId\)=>`[\s\S]*?`\s*;\s*\}\)\.join\(''\)\}</div>`;", new_rail, content, count=1)

# 3. Add StudyBaseline, StudyPrecheck, StudyComparison definitions before StudyMap
study_components_to_add = """
/* ---------- Study Baseline (وضع موجود) ---------- */
function StudyBaseline(id){
  const s = byId(id) || { id, name: 'مطالعه شهری', region: 'منطقه ۶' };
  const a = (STATE.studyAn && STATE.studyAn[id]) || { done: isStudyLocked(id) };
  const isDone = a.done || isStudyLocked(id);
  const sum = czSummary(id);

  const baselineDatasets = [
    { code: 'PARCELS-REG6', title: 'کاداستر و پلاک‌های ثبتی وضع موجود', ver: 'v4', owner: 'فاوا شهرداری تهران', date: '۱۴۰۴/۱۱/۲۰', count: '۳٬۴۲۰ پلاک', status: 'ready', fresh: 'به‌روز', desc: 'محدوده کالبدی، ابعاد و مشخصات هندسی پلاک‌ها' },
    { code: 'BLD-DENSITY-06', title: 'ممیزی کاربری و طبقات ابنیه وضع موجود', ver: 'v3', owner: 'معاونت شهرسازی منطقه', date: '۱۴۰۴/۱۲/۱۵', count: '۲٬۸۹۰ بلوک', status: 'ready', fresh: 'به‌روز', desc: 'تراکم کالبدی، سطح اشغال و سال ساخت' },
    { code: 'ROAD-NET-06', title: 'شبکه هندسی و ظرفیت معابر وضع موجود', ver: 'v3', owner: 'سازمان حمل‌ونقل و ترافیک', date: '۱۴۰۵/۰۱/۱۰', count: '۱۴۲ کیلومتر', status: 'ready', fresh: 'به‌روز', desc: 'عرض گذر، جهت حرکت، تقاطع‌ها و خطوط اتوبوس' },
    { code: 'POP-HH-06', title: 'جمعیت و بعد خانوار بلوک‌های آماری وضع موجود', ver: 'v4', owner: 'مرکز آمار و مطالعات تهران', date: '۱۴۰۵/۰۲/۱۸', count: '۱۸٬۴۵۰ نفر', status: 'ready', fresh: 'به‌روز', desc: 'تراکم جمعیتی، بعد خانوار ۳٫۱ و هرم سنی' },
    { code: 'LANDUSE-BASE', title: 'نقشه کاربری اراضی وضع موجود', ver: 'v2', owner: 'معاونت شهرسازی و معماری', date: '۱۴۰۵/۰۱/۲۵', count: '۲۸۰ هکتار', status: 'ready', fresh: 'به‌روز', desc: 'کاربری‌های مسکونی، تجاری، اداری، آموزشی و سبز' },
    { code: 'PARKING-SURVEY', title: 'آماربرداری پارکینگ حاشیه‌ای و عمومی', ver: 'v1', owner: 'شرکت کنترل ترافیک', date: '۱۴۰۵/۰۳/۰۴', count: '۱٬۲۴۰ جایگاه', status: 'ready', fresh: 'به‌روز', desc: 'تراز عرضه، تقاضای اوج و کسری ۱۸۵ جایگاه' }
  ];

  return `
  <div style="margin-top:14px">
    <div class="card" style="border:1px solid #10B981;background:#F0FDF4;padding:16px 20px;border-radius:var(--r-m);margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:14px">
        <div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span class="bdg b-ok plain" style="font-size:12px;font-weight:700;padding:4px 10px;background:#059669;color:#FFF">
              ✓ وضعیت: تثبیت‌شده و پین‌شده (Frozen Baseline)
            </span>
            <span class="code" style="font-size:11.5px">sha256:7f3b89a4e2c9...</span>
          </div>
          <h2 style="font-size:16px;color:#065F46;margin:0 0 6px 0">
            وضع موجود تثبیت‌شده مطالعه — ${esc(s.name)}
          </h2>
          <p style="font-size:12.5px;color:#064E3B;margin:0;line-height:1.6">
            داده‌های وضع موجود در پایان فصل صفر با امضای کارشناس مسئول پین شده‌اند و مبنای محاسبات شبیه‌سازی ۱۲ ماژول تحلیلی و مقایسه سناریوها می‌باشند. هرگونه تغییر در داده‌های خام خارج از مطالعه، به وضع موجود آسیب نمی‌زند.
          </p>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <a class="btn btn-sm btn-pri" href="#/study/${id}/precheck" style="background:#059669;border-color:#059669;font-weight:700">
            ${ico.check} پیش‌بررسی و آزمون مدل‌ها ←
          </a>
          <a class="btn btn-sm" href="#/study/${id}/chapter0">
            ${ico.doc} بازبینی فصل صفر
          </a>
        </div>
      </div>
    </div>

    <div class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:16px">
      <div class="kpi k-pri" style="cursor:default">
        <div class="v num">۲۴۰٪</div>
        <div class="l">تراکم ساختمانی موجود (FAR)</div>
        <div class="d">ضریب سطح زیربنای ناخالص</div>
      </div>
      <div class="kpi k-neu" style="cursor:default">
        <div class="v num">۶۰٪</div>
        <div class="l">سطح اشغال متوسط</div>
        <div class="d">درصد پوشش عرصه پلاک‌ها</div>
      </div>
      <div class="kpi k-neu" style="cursor:default">
        <div class="v num">۱۸٬۴۵۰</div>
        <div class="l">جمعیت ساکن وضع موجود</div>
        <div class="d">بر اساس سرشماری بلوک‌ها</div>
      </div>
      <div class="kpi k-warn" style="cursor:default">
        <div class="v num">۲۸٬۲۰۰</div>
        <div class="l">سفر سواره روزانه</div>
        <div class="d">تولید و جذب در محدوده</div>
      </div>
      <div class="kpi k-stop" style="cursor:default">
        <div class="v num">۱۸۵-</div>
        <div class="l">کسری پارکینگ موجود</div>
        <div class="d">کمبود شدید جایگاه خودرو</div>
      </div>
      <div class="kpi k-ok" style="cursor:default">
        <div class="v num">۳٫۸ م²</div>
        <div class="l">سرانه فضای سبز موجود</div>
        <div class="d">به ازای هر نفر سکونت</div>
      </div>
    </div>

    <div class="split" style="gap:16px;margin-bottom:16px">
      <div class="card" style="flex:3;padding:0;overflow:hidden;border:1px solid var(--line);background:#F8FAFB">
        <div class="card-h" style="padding:10px 14px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center">
          <span style="font-weight:700;font-size:12.5px;display:flex;align-items:center;gap:6px">
            ${ico.map} نقشه پهنه کالبدی و کاربری وضع موجود (${esc(s.region)})
          </span>
          <span class="bdg b-neu plain" style="font-size:11px">مقیاس ۱:۲۵۰۰ · UTM 39N</span>
        </div>
        <div style="padding:12px;background:#F1F5F9">
          <svg viewBox="0 0 700 380" width="100%" height="auto" style="display:block;border-radius:6px;background:#FFF;border:1px solid #CBD5E1">
            <rect x="0" y="140" width="700" height="24" fill="#E2E8F0"/>
            <line x1="0" y1="152" x2="700" y2="152" stroke="#94A3B8" stroke-width="1.5" stroke-dasharray="6 4"/>
            <text x="50" y="148" font-size="10" fill="#475569" font-family="Vazirmatn,Tahoma">شریان شرقی-غربی (خیابان مطهری)</text>

            <rect x="320" y="0" width="28" height="380" fill="#E2E8F0"/>
            <line x1="334" y1="0" x2="334" y2="380" stroke="#94A3B8" stroke-width="1.5" stroke-dasharray="6 4"/>
            <text x="328" y="24" font-size="10" fill="#475569" font-family="Vazirmatn,Tahoma" transform="rotate(90 328 24)">خیابان ولیعصر</text>

            <rect x="40" y="30" width="250" height="90" fill="#F8FAFC" stroke="#94A3B8" stroke-width="1.2"/>
            <rect x="50" y="40" width="60" height="70" fill="#EFF6FF" stroke="#3B82F6" stroke-width="0.8"/>
            <rect x="120" y="40" width="70" height="70" fill="#EFF6FF" stroke="#3B82F6" stroke-width="0.8"/>
            <rect x="200" y="40" width="80" height="70" fill="#EFF6FF" stroke="#3B82F6" stroke-width="0.8"/>
            <text x="130" y="80" font-size="11" fill="#1E40AF" font-family="Vazirmatn,Tahoma" font-weight="700">مسکونی متراکم (FAR: 240%)</text>

            <rect x="380" y="30" width="280" height="90" fill="#F8FAFC" stroke="#94A3B8" stroke-width="1.2"/>
            <rect x="390" y="40" width="80" height="70" fill="#FEF3C7" stroke="#D97706" stroke-width="0.8"/>
            <rect x="480" y="40" width="80" height="70" fill="#FEF3C7" stroke="#D97706" stroke-width="0.8"/>
            <rect x="570" y="40" width="80" height="70" fill="#FEF3C7" stroke="#D97706" stroke-width="0.8"/>
            <text x="470" y="80" font-size="11" fill="#92400E" font-family="Vazirmatn,Tahoma" font-weight="700">تجاری-اداری حاشیه معبر</text>

            <rect x="40" y="190" width="250" height="150" fill="#F8FAFC" stroke="#94A3B8" stroke-width="1.2"/>
            <rect x="50" y="200" width="110" height="130" fill="#DCFCE7" stroke="#16A34A" stroke-width="0.8"/>
            <text x="75" y="270" font-size="11" fill="#166534" font-family="Vazirmatn,Tahoma" font-weight="700">پارک محله‌ای</text>
            <rect x="170" y="200" width="110" height="130" fill="#EFF6FF" stroke="#3B82F6" stroke-width="0.8"/>
            <text x="185" y="270" font-size="11" fill="#1E40AF" font-family="Vazirmatn,Tahoma">بافت مسکونی</text>

            <rect x="380" y="190" width="280" height="150" fill="#F8FAFC" stroke="#94A3B8" stroke-width="1.2"/>
            <rect x="390" y="200" width="130" height="130" fill="#FEE2E2" stroke="#EF4444" stroke-width="1"/>
            <text x="410" y="260" font-size="11" fill="#991B1B" font-family="Vazirmatn,Tahoma" font-weight="700">گلوگاه ترافیکی و</text>
            <text x="410" y="278" font-size="11" fill="#991B1B" font-family="Vazirmatn,Tahoma" font-weight="700">کسری پارکینگ شدید</text>

            <rect x="530" y="200" width="120" height="130" fill="#EFF6FF" stroke="#3B82F6" stroke-width="0.8"/>
            <text x="555" y="270" font-size="11" fill="#1E40AF" font-family="Vazirmatn,Tahoma">مسکونی</text>

            <g transform="translate(16, 335)">
              <rect width="668" height="32" rx="4" fill="#FFFFFF" fill-opacity="0.9" stroke="#CBD5E1"/>
              <circle cx="20" cy="16" r="5" fill="#3B82F6"/>
              <text x="30" y="20" font-size="10.5" fill="#334155" font-family="Vazirmatn,Tahoma">مسکونی موجود</text>

              <circle cx="140" cy="16" r="5" fill="#D97706"/>
              <text x="150" y="20" font-size="10.5" fill="#334155" font-family="Vazirmatn,Tahoma">تجاری/خدماتی</text>

              <circle cx="260" cy="16" r="5" fill="#16A34A"/>
              <text x="270" y="20" font-size="10.5" fill="#334155" font-family="Vazirmatn,Tahoma">فضای سبز موجود</text>

              <circle cx="380" cy="16" r="5" fill="#EF4444"/>
              <text x="390" y="20" font-size="10.5" fill="#991B1B" font-family="Vazirmatn,Tahoma">نقاط بحرانی ترافیک و پارکینگ</text>
            </g>
          </svg>
        </div>
      </div>

      <div class="card" style="flex:2;padding:16px;border:1px solid var(--line);background:#FFF">
        <h3 style="font-size:13.5px;margin:0 0 10px 0;display:flex;align-items:center;gap:6px">
          ${ico.alert} مسائل و کاستی‌های احصاشده در وضع موجود
        </h3>
        <div style="font-size:12px;line-height:1.65;display:grid;gap:10px">
          <div style="padding:8px 10px;background:#FFF5F5;border-right:3px solid #EF4444;border-radius:4px">
            <b style="color:#991B1B">۱. کسری شدید پارکینگ و توقف غیرمجاز:</b>
            <div style="color:#7F1D1D;margin-top:2px">کمبود ۱۸۵ واحد پارکینگ سبب اشغال خط عبوری معابر درجه ۲ و کاهش سرعت جریان ترافیک شده است.</div>
          </div>
          <div style="padding:8px 10px;background:#FFFBEB;border-right:3px solid #F59E0B;border-radius:4px">
            <b style="color:#92400E">۲. عدم توازن خدمات و سرانه‌ها:</b>
            <div style="color:#78350F;margin-top:2px">سرانه آموزشی و درمانی به ازای جمعیت ساکن ۲۰٪ کمتر از استاندارد طرح جامع است.</div>
          </div>
          <div style="padding:8px 10px;background:#EFF6FF;border-right:3px solid #3B82F6;border-radius:4px">
            <b style="color:#1E40AF">۳. فرسودگی بخشی از بافت کالبدی:</b>
            <div style="color:#1E3A8A;margin-top:2px">حدود ۳۲٪ ابنیه دارای سن بالای ۳۰ سال و نیازمند نوسازی و تجمیع پلاک‌های ریزدانه هستند.</div>
          </div>
        </div>
      </div>
    </div>

    <div class="card" style="border:1px solid var(--line);background:#FFF">
      <div class="card-h" style="display:flex;justify-content:space-between;align-items:center">
        <h3>${ico.data} مجموعه‌های داده پین‌شده وضع موجود (Pinned Datasets)</h3>
        <span class="bdg b-ok plain">${fa(baselineDatasets.length)} مجموعه داده تثبیت‌شده</span>
      </div>
      <div class="tw">
        <table class="tbl">
          <thead>
            <tr>
              <th>عنوان مجموعه داده</th>
              <th>کد داده</th>
              <th>نسخه پین‌شده</th>
              <th>متولی داده</th>
              <th>حجم / شمارش</th>
              <th>تازگی</th>
              <th>کنترل کیفیت</th>
              <th>وضعیت</th>
            </tr>
          </thead>
          <tbody>
            ${baselineDatasets.map(d => `
              <tr>
                <td><b>${d.title}</b><div class="sub">${d.desc}</div></td>
                <td><span class="code">${d.code}</span></td>
                <td><span class="vbadge">${d.ver}</span></td>
                <td>${d.owner}</td>
                <td class="num">${d.count}</td>
                <td><span class="bdg b-ok">${d.fresh}</span></td>
                <td><span class="bdg b-ok plain">بدون خطا ✓</span></td>
                <td><span class="bdg b-ok">مصوب و پین‌شده</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  </div>`;
}

/* ---------- Study Precheck (پیش‌بررسی) ---------- */
function StudyPrecheck(id){
  const s = byId(id) || { id, name: 'مطالعه شهری' };
  const a = (STATE.studyAn && STATE.studyAn[id]) || { done: isStudyLocked(id) };
  const isDone = a.done || isStudyLocked(id);

  const checks = [
    { title: 'انطباق هندسی کاداستر با سامانه مختصات (CRS)', code: 'CHK-GEO-01', desc: 'بررسی صحت مختصات UTM Zone 39N (EPSG:32639) و عدم تداخل مرزهای ثبتی', pass: true, detail: '۳٬۴۲۰ پلاک با ۱۰۰٪ انطباق هندسی آزموده شدند.' },
    { title: 'سلامت توپولوژی شبکه معابر و گره‌های ترافیکی', code: 'CHK-NET-02', desc: 'عدم وجود عوارض معلق (Dangles)، صحت جهت حرکت خطوط و اتصالات تقاطع‌ها', pass: true, detail: '۱۴۲ کیلومتر معبر و ۶۸ تقاطع بدون گره ایزوله تأیید گردیدند.' },
    { title: 'انسجام زمانی داده‌های جمعیتی و کالبدی', code: 'CHK-TMP-03', desc: 'تطبیق بازه زمانی سرشماری نفوس و مسکن با آخرین ممیزی ابنیه (۱۴۰۴-۱۴۰۵)', pass: true, detail: 'همگام‌سازی بعد خانوار ۳٫۱ نفر با واحدهای مسکونی تثبیت شد.' },
    { title: 'اتصال پایگاه داده قواعد و ضوابط ملاک عمل', code: 'CHK-RUL-04', desc: 'بارگذاری بسته ضوابط تفصیلی منطقه ۶ مصوب کمیسیون ماده پنج (نسخه ملاک)', pass: true, detail: 'کلیه قواعد تراکمی و پهنه‌بندی برای موتور M01 آماده است.' },
    { title: 'آمادگی پارامترها و کالیبراسیون موتورهای M01-M12', code: 'CHK-MOD-05', desc: 'صحت‌سنجی ورودی‌های مدل گرانشی سفر (M04)، تراز پارکینگ (M05) و آفتاب (M09)', pass: true, detail: 'هر ۱۲ موتور شبیه‌سازی پیکربندی شده و آماده اجرا هستند.' },
    { title: 'آماده‌سازی تکرارپذیری محاسبات و امضای مبنا', code: 'CHK-REP-06', desc: 'تولید شناسه هش مبنا برای تضمین تکرارپذیری نتایج در سناریوهای مختلف', pass: true, detail: 'محیط اجرای ایزوله تکرارپذیر آماده گردید.' }
  ];

  return `
  <div style="margin-top:14px">
    <div class="card" style="border:1px solid #3B82F6;background:#EFF6FF;padding:16px 20px;border-radius:var(--r-m);margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:14px">
        <div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span class="bdg b-pri plain" style="font-size:12px;font-weight:700;padding:4px 10px;background:#2563EB;color:#FFF">
              ✓ پیش‌بررسی سیستم (Pre-Execution Integrity)
            </span>
            <span class="muted" style="font-size:12px">۶ آزمون یکپارچگی داده و مدل</span>
          </div>
          <h2 style="font-size:16px;color:#1E40AF;margin:0 0 6px 0">
            پیش‌بررسی و آزمون سازگاری پیش از اجرای شبیه‌سازی ۱۲ ماژول
          </h2>
          <p style="font-size:12.5px;color:#1E3A8A;margin:0;line-height:1.6">
            پیش از شروع محاسبات مدل‌های ۱۲گانه، سامانه تمامی ورودی‌های مکانی، آماری و مدل‌ها را آزمون می‌کند تا از صحت خروجی‌ها و عدم بروز خطا در حین شبیه‌سازی اطمینان حاصل شود.
          </p>
        </div>
        <div>
          ${isDone ? `
            <a class="btn btn-pri" href="#/study/${id}/runs" style="background:#059669;border-color:#059669;font-weight:700">
              ${ico.check} مشاهده نتایج شبیه‌سازی ۱۲ ماژول ←
            </a>
          ` : `
            <button class="btn btn-pri" onclick="startStudyAnalysis('${id}')" style="background:#2563EB;border-color:#2563EB;font-weight:700;padding:10px 18px">
              ${ico.run} شروع شبیه‌سازی ۱۲ ماژول مطالعه ←
            </button>
          `}
        </div>
      </div>
    </div>

    <div class="grid cols-2" style="gap:14px;margin-bottom:18px">
      ${checks.map(c => `
        <div class="card" style="padding:14px 16px;border:1px solid var(--line);background:#FFF;border-radius:var(--r-m)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <div style="display:flex;align-items:center;gap:8px">
              <span class="code" style="font-weight:700;background:#F1F5F9;color:#334155;padding:2px 8px;border-radius:4px">${c.code}</span>
              <b style="font-size:13px;color:var(--text)">${c.title}</b>
            </div>
            <span class="bdg b-ok plain" style="font-size:11px">تأیید شد ✓</span>
          </div>
          <p style="font-size:12px;color:var(--text-mut);margin:0 0 6px 0">${c.desc}</p>
          <div style="background:#F0FDF4;border:1px solid #BBF7D0;padding:6px 10px;border-radius:4px;color:#065F46;font-size:11.5px">
            <b>نتیجه آزمون:</b> ${c.detail}
          </div>
        </div>
      `).join('')}
    </div>
  </div>`;
}

/* ---------- Study Comparison (مقایسه سناریوها با وضع موجود) ---------- */
function StudyComparison(id){
  const s = byId(id) || { id, name: 'مطالعه شهری' };
  const a = (STATE.studyAn && STATE.studyAn[id]) || { done: isStudyLocked(id) };

  const comparisons = [
    { title: 'تراکم ساختمانی کل (FAR)', mod: 'M02', base: '۲۴۰٪', s1: '۳۲۰٪', s2: '۳۸۰٪', s3: '۲۴۰٪', delta: '+۳۳٪ (+۰٫۸)', dir: 'pos', eval: 'افزایش متوازن ظرفیت در سقف ضابطه' },
    { title: 'سطح اشغال متوسط عرصه', mod: 'M01', base: '۶۰٪', s1: '۵۵٪', s2: '۶۵٪', s3: '۵۰٪', delta: '-۵٪', dir: 'pos', eval: 'آزادسازی فضا برای معابر و حیاط' },
    { title: 'زیربنای ناخالص کل (GFA)', mod: 'M02', base: '۲۴۵٬۰۰۰ م²', s1: '۳۱۰٬۰۰۰ م²', s2: '۳۷۵٬۰۰۰ م²', s3: '۲۴۵٬۰۰۰ م²', delta: '+۶۵٬۰۰۰ م² (+۲۶٪)', dir: 'pos', eval: 'افزایش ارزش افزوده بافت' },
    { title: 'جمعیت‌پذیری در اشغال کامل', mod: 'M03', base: '۱۸٬۴۵۰ نفر', s1: '۲۱٬۶۰۰ نفر', s2: '۲۵٬۲۰۰ نفر', s3: '۱۸٬۴۵۰ نفر', delta: '+۳٬۱۵۰ نفر (+۱۷٪)', dir: 'neu', eval: 'در محدوده ظرفیت زیست‌محیطی' },
    { title: 'سفرهای سواره روزانه', mod: 'M04', base: '۲۸٬۲۰۰ سفر', s1: '۲۴٬۵۰۰ سفر', s2: '۱۹٬۸۰۰ سفر', s3: '۱۵٬۲۰۰ سفر', delta: '-۳٬۷۰۰ سفر (-۱۳٪)', dir: 'pos', eval: 'کاهش ترافیک عبوری مزاحم' },
    { title: 'تراز و کسری پارکینگ', mod: 'M05', base: '۱۸۵- (کسری)', s1: '۰ (تأمین ۱۰۰٪)', s2: '۵۰-', s3: '۸۰-', delta: '+۱۸۵ جایگاه', dir: 'pos', eval: 'رفع کامل کسری پارکینگ با احداث تجمیعی' },
    { title: 'سرانه فضای سبز عمومی', mod: 'M06', base: '۳٫۸ م²/نفر', s1: '۵٫۲ م²/نفر', s2: '۳٫۴ م²', s3: '۴٫۸ م²', delta: '+۱٫۴ م² (+۳۷٪)', dir: 'pos', eval: 'ارتقای کیفیت زندگی و فضای باز' },
    { title: 'پوشش حمل‌ونقل همگانی', mod: 'M07', base: '۶۸٪', s1: '۸۸٪', s2: '۸۸٪', s3: '۶۸٪', delta: '+۲۰٪', dir: 'pos', eval: 'دسترسی پیاده به ایستگاه مترو و BRT' },
    { title: 'آسایش اقلیمی و نورگیری', mod: 'M09', base: '۸۲٪', s1: '۹۶٪', s2: '۷۴٪', s3: '۹۵٪', delta: '+۱۴٪', dir: 'pos', eval: 'انطباق کامل با زوایای سایه‌اندازی' },
    { title: 'کاهش انتشار کربن و انرژی', mod: 'M10', base: 'مبنا (۱۰۰٪)', s1: '۸۲٪ (-۱۸٪)', s2: '۹۲٪', s3: '۸۸٪', delta: '-۱۸٪ مصرف انرژی', dir: 'pos', eval: 'رعایت مبحث ۱۹ و ساختمان پایدار' }
  ];

  return `
  <div style="margin-top:14px">
    <div class="notice n-ok" style="margin-bottom:14px">
      ${ico.check}
      <div>
        <b>ارزیابی و مقایسه جامع چندمعیاره سناریوها با وضع موجود</b>. نتایج شبیه‌سازی ۱۲ ماژول نشان می‌دهد سناریو ۱ (مداخله مصوب کالبدی به همراه پارکینگ تجمیعی) بالاترین مطلوبیت را میان گزینه‌ها به دست آورده است.
      </div>
    </div>

    <div class="card" style="border:1px solid var(--line);background:#FFF;margin-bottom:16px">
      <div class="card-h" style="display:flex;justify-content:space-between;align-items:center">
        <h3>جدول مقایسه اثرات سناریو ۱ در برابر وضع موجود (Baseline vs Scenario 1)</h3>
        <span class="bdg b-ok plain">خروجی رسمی شبیه‌سازی ۱۲ ماژول</span>
      </div>
      <div class="tw">
        <table class="tbl">
          <thead>
            <tr>
              <th>عنوان شاخص / موضوع</th>
              <th>ماژول</th>
              <th>وضع موجود (Baseline)</th>
              <th style="background:#F0FDF4;color:#065F46">سناریو ۱ (مصوب ⭐)</th>
              <th>سناریو ۲ (تراکم حداکثری)</th>
              <th>سناریو ۳ (حداقلی)</th>
              <th>تغییر نسبت به وضع موجود</th>
              <th>ارزیابی کیفی اثر</th>
            </tr>
          </thead>
          <tbody>
            ${comparisons.map(c => `
              <tr>
                <td><b>${c.title}</b></td>
                <td><span class="code">${c.mod}</span></td>
                <td class="num">${c.base}</td>
                <td class="num" style="background:#F0FDF4;font-weight:700;color:#047857">${c.s1}</td>
                <td class="num">${c.s2}</td>
                <td class="num">${c.s3}</td>
                <td class="num"><span class="bdg ${c.dir==='pos'?'b-ok':c.dir==='neg'?'b-stop':'b-neu'} plain">${c.delta}</span></td>
                <td><span class="bdg ${c.dir==='pos'?'b-ok':c.dir==='neg'?'b-stop':'b-neu'}">${c.eval}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  </div>`;
}
"""

if 'function StudyBaseline(' not in content:
    content = content.replace("function StudyMap(id){", study_components_to_add + "\nfunction StudyMap(id){")
    print("Added StudyBaseline, StudyPrecheck, StudyComparison")

# 4. Update tabAliases and routing in StudyPage
old_tab_aliases = """  const rawTab = (tab || 'overview').toLowerCase();
  const tabAliases = {
    overview: 'overview',
    chapter0: 'chapter0',
    precheck: 'chapter0',
    chapters: 'reports',
    report: 'reports',
    reports: 'reports',
    tasks: 'tasks',
    data: 'data',
    baseline: 'data',
    map: 'map',
    rules: 'rules',
    indicators: 'indicators',
    results: 'indicators',
    models: 'models',
    scenarios: 'scenarios',
    scenario: 'scenarios',
    compare: 'scenarios',
    comparison: 'scenarios',
    runs: 'runs',
    run: 'runs',
    execution: 'runs',
    evidence: 'evidence',
    review: 'review',
    approval: 'review',
    decision: 'review',
    history: 'history'
  };"""

new_tab_aliases = """  const rawTab = (tab || 'overview').toLowerCase();
  const tabAliases = {
    overview: 'overview',
    chapter0: 'chapter0',
    precheck: 'precheck',
    'پیش‌بررسی': 'precheck',
    'پیش بررسی': 'precheck',
    chapters: 'reports',
    report: 'reports',
    reports: 'reports',
    'گزارش': 'reports',
    'گزارش‌ها': 'reports',
    tasks: 'tasks',
    data: 'baseline',
    baseline: 'baseline',
    'وضع موجود': 'baseline',
    map: 'map',
    'نقشه': 'map',
    rules: 'rules',
    indicators: 'indicators',
    results: 'indicators',
    'نتایج': 'indicators',
    'شاخص‌ها': 'indicators',
    models: 'models',
    scenarios: 'scenarios',
    scenario: 'scenarios',
    'سناریو': 'scenarios',
    'سناریوها': 'scenarios',
    compare: 'comparison',
    comparison: 'comparison',
    'مقایسه': 'comparison',
    runs: 'runs',
    run: 'runs',
    execution: 'runs',
    'اجرا': 'runs',
    'اجراها': 'runs',
    evidence: 'evidence',
    'شواهد': 'evidence',
    review: 'review',
    approval: 'review',
    'بررسی': 'review',
    'تایید نهایی': 'review',
    'تأیید نهایی': 'review',
    'بررسی و تایید نهایی': 'review',
    decision: 'review',
    history: 'history'
  };"""

if old_tab_aliases in content:
    content = content.replace(old_tab_aliases, new_tab_aliases)
    print("Replaced tabAliases successfully")
else:
    print("WARNING: old_tab_aliases not matched, using regex")
    content = re.sub(r"const tabAliases\s*=\s*\{[\s\S]*?\};\s*const activeTab", new_tab_aliases + "\n  const activeTab", content, count=1)

# 5. Update StudyPage body dispatcher
old_tab_dispatcher = """  } else if(activeTab==='data'){
    body=StudyData(id);
  } else if(activeTab==='map'){
    body=StudyMap(id);
  } else if(activeTab==='scenarios'){
    body=StudyScenarios(id);
  } else if(activeTab==='models'){
    body=StudyModels(id);
  } else if(activeTab==='runs'){
    body=StudyRuns(id);
  } else if(activeTab==='indicators'){
    body=StudyIndicators(id);
  } else if(activeTab==='rules'){
    body=StudyRules(id);
  } else if(activeTab==='evidence'){
    body=StudyEvidence(id);
  } else if(activeTab==='reports'){
    body=StudyReports(id);
  } else if(activeTab==='review'){
    body=StudyReview(id);
  } else if(activeTab==='tasks'){
    body=StudyTasks(id);
  } else if(activeTab==='history'){
    body=StudyHistory(id);
  } else {
    body=StudyMap(id);
  }"""

new_tab_dispatcher = """  } else if(activeTab==='baseline' || activeTab==='data'){
    body=StudyBaseline(id);
  } else if(activeTab==='precheck'){
    body=StudyPrecheck(id);
  } else if(activeTab==='scenarios'){
    body=StudyScenarios(id);
  } else if(activeTab==='comparison'){
    body=StudyComparison(id);
  } else if(activeTab==='models'){
    body=StudyModels(id);
  } else if(activeTab==='runs'){
    body=StudyRuns(id);
  } else if(activeTab==='indicators'){
    body=StudyIndicators(id);
  } else if(activeTab==='rules'){
    body=StudyRules(id);
  } else if(activeTab==='evidence'){
    body=StudyEvidence(id);
  } else if(activeTab==='reports'){
    body=StudyReports(id);
  } else if(activeTab==='review'){
    body=StudyReview(id);
  } else if(activeTab==='tasks'){
    body=StudyTasks(id);
  } else if(activeTab==='history'){
    body=StudyHistory(id);
  } else if(activeTab==='map'){
    body=StudyMap(id);
  } else {
    body=StudyBaseline(id);
  }"""

if old_tab_dispatcher in content:
    content = content.replace(old_tab_dispatcher, new_tab_dispatcher)
    print("Replaced StudyPage body dispatcher")
else:
    print("WARNING: old_tab_dispatcher not matched, using regex")
    content = re.sub(r"\} else if\(activeTab==='data'\)\{[\s\S]*?body=StudyMap\(id\);\s*\}", new_tab_dispatcher, content, count=1)

# 6. Update anDone function
new_an_done = """function anDone(id){
  const a = anState(id);
  if(a && a.done) return true;
  const p = prop(id);
  if(p){
    if(p.status === 'partial' || p.status === 'decision' || p.status === 'inreview' || p.status === 'approved') {
      if(a) a.done = true;
      return true;
    }
    if(p.study){
      const stAn = (STATE.studyAn && STATE.studyAn[p.study]);
      if(stAn && stAn.done) {
        if(a) a.done = true;
        return true;
      }
      const stObj = byId(p.study);
      if(stObj && isStudyLocked(stObj)) {
        if(a) a.done = true;
        return true;
      }
      const sc = (window.DB?.studyCases || []).find(c => c.study_id === p.study || c.proposal_id === id);
      if(sc && (sc.status === 'COMPLETED' || sc.locked || sc.workflow_step >= 6)) {
        if(a) a.done = true;
        return true;
      }
    }
  }
  return false;
}
window.anDone = anDone;
"""

content = content.replace("const anDone=id=>anState(id).done;", new_an_done)
print("Updated anDone definition")

# 7. Update ProposalRoute to ensure PropMap, PropComparison, PropEvidence, PropDecision always work
old_prop_route = """function ProposalRoute(id,tab){
  const p=prop(id);
  if(!p) return {p:Shell(State('search','پیشنهاد یافت نشد','شناسه پیشنهاد معتبر نیست.',`<a class="btn btn-pri" href="#/proposals">فهرست پیشنهادها</a>`))};
  let body,step;
  if(tab==='impact'){body=PropImpact(id);step=2;}
  else if(tab==='comparison'){body=PropComparison(id);step=4;}
  else if(tab==='map'){body=anDone(id)?PropMap(id):`<div style="margin-top:14px">${Card('',State('map','نقشه اثر در دسترس نیست','تا اجرای تحلیل، محدوده اثر هیچ حوزه‌ای تعیین نشده است. محدوده پیشنهاد به‌تنهایی محدوده اثر نیست.',`<a class="btn btn-pri" href="#/proposal/${id}">نمای کلی</a>`))}</div>`;step=2;}
  else if(tab==='findings'){body=PropFindings(id);step=3;}
  else if(tab==='evidence'){body=PropEvidence(id);step=4;}
  else if(tab==='decision'){body=PropDecision(id);step=5;}
  else {body=PropOverview(id);step=anDone(id)?2:1;}"""

new_prop_route = """function ProposalRoute(id,tab){
  const p=prop(id);
  if(!p) return {p:Shell(State('search','پیشنهاد یافت نشد','شناسه پیشنهاد معتبر نیست.',`<a class="btn btn-pri" href="#/proposals">فهرست پیشنهادها</a>`))};
  const isAnDone = anDone(id);
  let body,step;
  if(tab==='impact'){body=PropImpact(id);step=2;}
  else if(tab==='comparison'){body=PropComparison(id);step=4;}
  else if(tab==='map'){body=PropMap(id);step=2;}
  else if(tab==='findings'){body=PropFindings(id);step=3;}
  else if(tab==='evidence'){body=PropEvidence(id);step=4;}
  else if(tab==='decision'){body=PropDecision(id);step=5;}
  else {body=PropOverview(id);step=isAnDone?2:1;}"""

if old_prop_route in content:
    content = content.replace(old_prop_route, new_prop_route)
    print("Replaced ProposalRoute successfully")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Saved index.html successfully")

# Also update studyCase.js
with open('studyCase.js', 'r', encoding='utf-8') as f:
    sc_content = f.read()

sc_content = sc_content.replace("{ n: 4, id: 'baseline', label: '۴. وضع موجود', href: `#/study/${sid}/data` }", "{ n: 4, id: 'baseline', label: '۴. وضع موجود', href: `#/study/${sid}/baseline` }")
sc_content = sc_content.replace("{ n: 7, id: 'comparison', label: '۷. مقایسه و ارزیابی', href: `#/study/${sid}/scenarios` }", "{ n: 7, id: 'comparison', label: '۷. مقایسه و ارزیابی', href: `#/study/${sid}/comparison` }")

with open('studyCase.js', 'w', encoding='utf-8') as f:
    f.write(sc_content)

shutil.copy('studyCase.js', 'public/studyCase.js')
shutil.copy('studyCase.js', 'dist/studyCase.js')
print("Updated studyCase.js and copied to public/ and dist/")
