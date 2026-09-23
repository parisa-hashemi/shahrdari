import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Tab bar generator helper
tabs_bar_func = """function StudyTabsBar(id, activeTab){
  const sum = czSummary(id);
  return `<div class="tabs">${STUDY_TABS.map(([k,t])=>
    `<a class="tab ${k===activeTab?'on':''}" href="#/study/${id}/${k}">${t}${k==='chapter0'&&sum.blockers.length?`<span class="pill num" style="background:var(--stop-050);color:var(--stop)">${fa(sum.blockers.length)}</span>`:''}</a>`).join('')}</div>`;
}"""

study_map_func = """function StudyMap(id){
  const s = byId(id);
  const a = (STATE.studyAn && STATE.studyAn[id]) || { done: isStudyLocked(id) };
  const isDone = a.done || isStudyLocked(id);
  return `
  <div style="margin-top:14px">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:12px;background:#FFF;padding:12px 16px;border:1px solid var(--line);border-radius:var(--r-m)">
      <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
        <span style="font-weight:700;font-size:13px;display:flex;align-items:center;gap:6px">
          ${ico.map} لایه‌های مکانی GIS مطالعه (${esc(s.region)}):
        </span>
        <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer"><input type="checkbox" id="chk-ly-bound" checked> <span>مرز پهنه مداخله</span></label>
        <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer"><input type="checkbox" id="chk-ly-parcels" checked> <span>پلاک‌های ثبتی</span></label>
        <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer"><input type="checkbox" id="chk-ly-roads" checked> <span>شبکه معابر</span></label>
        <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer"><input type="checkbox" id="chk-ly-proposal" ${isDone?'checked':''}> <span style="color:#7C3AED;font-weight:700">پهنه سناریوی مصوب</span></label>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span class="bdg b-neu plain" style="font-size:11px">EPSG:32639 (UTM Zone 39N)</span>
        <button class="btn btn-sm" onclick="toast('نقشه وضع موجود و سناریو با موفقیت استخراج گردید')">${ico.doc} خروجی لایه‌ها</button>
      </div>
    </div>

    <div class="split" style="gap:16px">
      <div class="card" style="flex:2;padding:0;overflow:hidden;border:1px solid var(--line);background:#F8FAFB;position:relative">
        <svg id="study-gis-svg" viewBox="0 0 760 520" width="100%" height="auto" style="display:block;background:#F1F5F9">
          <defs>
            <pattern id="study-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E2E8F0" stroke-width="0.8"/>
            </pattern>
            <pattern id="study-hatch" width="8" height="8" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="8" stroke="#8B5CF6" stroke-width="1.8" />
            </pattern>
          </defs>
          <rect width="760" height="520" fill="url(#study-grid)" />

          <!-- Arterial and Local Road Network -->
          <g id="layer-roads">
            <rect x="360" y="0" width="34" height="520" fill="#CBD5E1"/>
            <line x1="377" y1="0" x2="377" y2="520" stroke="#FFF" stroke-width="1.8" stroke-dasharray="8 6"/>
            <text x="370" y="30" font-size="11" fill="#475569" font-family="Vazirmatn,Tahoma" transform="rotate(90 370 30)" font-weight="700">خیابان ولیعصر (شریان اصلی ۳۵ متری)</text>

            <rect x="0" y="160" width="760" height="28" fill="#CBD5E1"/>
            <line x1="0" y1="174" x2="760" y2="174" stroke="#FFF" stroke-width="1.8" stroke-dasharray="8 6"/>
            <text x="60" y="178" font-size="11" fill="#475569" font-family="Vazirmatn,Tahoma" font-weight="700">خیابان شهید مطهری (شریان شرقی-غربی ۲۴ متری)</text>

            <rect x="0" y="380" width="760" height="26" fill="#CBD5E1"/>
            <line x1="0" y1="393" x2="760" y2="393" stroke="#FFF" stroke-width="1.8" stroke-dasharray="8 6"/>
            <text x="60" y="397" font-size="11" fill="#475569" font-family="Vazirmatn,Tahoma" font-weight="700">خیابان شهید بهشتی (شریان فرعی ۲۰ متری)</text>

            <rect x="170" y="0" width="18" height="520" fill="#E2E8F0"/>
            <rect x="560" y="0" width="18" height="520" fill="#E2E8F0"/>
            <rect x="0" y="270" width="760" height="16" fill="#E2E8F0"/>
          </g>

          <!-- Study Boundary Layer -->
          <g id="layer-boundary">
            <rect x="50" y="40" width="660" height="430" rx="8" fill="none" stroke="#2563EB" stroke-width="2.5" stroke-dasharray="10 6"/>
            <text x="70" y="65" font-size="11.5" font-weight="700" fill="#1D4ED8" font-family="Vazirmatn,Tahoma">مرز رسمی محدوده مطالعه: ${esc(s.name)} (${esc(s.region)})</text>
          </g>

          <!-- Urban Blocks and Parcels Layer -->
          <g id="layer-parcels" style="cursor:pointer">
            <rect class="gis-parcel" data-pcode="P-1405-01" data-ptype="مسکونی (R122)" data-parea="۴۲۰ م²" data-pfar="۳۰۰٪" data-pstatus="منطبق با ضابطه" x="70" y="70" width="90" height="80" rx="3" fill="#FEF3C7" stroke="#D97706" stroke-width="1.2"/>
            <text x="85" y="105" font-size="9.5" fill="#92400E" font-family="Vazirmatn,Tahoma">P-01 (۵ ط)</text>

            <rect class="gis-parcel" data-pcode="P-1405-02" data-ptype="مسکونی (R122)" data-parea="۳۸۰ م²" data-pfar="۲۸۰٪" data-pstatus="منطبق با ضابطه" x="70" y="198" width="90" height="64" rx="3" fill="#FEF3C7" stroke="#D97706" stroke-width="1.2"/>
            <text x="85" y="235" font-size="9.5" fill="#92400E" font-family="Vazirmatn,Tahoma">P-02 (۴ ط)</text>

            <rect class="gis-parcel" data-pcode="P-1405-03" data-ptype="خدماتی-آموزشی (S)" data-parea="۸۵۰ م²" data-pfar="۱۸۰٪" data-pstatus="تثبیت‌شده" x="70" y="294" width="90" height="76" rx="3" fill="#DBEAFE" stroke="#2563EB" stroke-width="1.2"/>
            <text x="80" y="335" font-size="9.5" fill="#1E40AF" font-family="Vazirmatn,Tahoma">دبستان دخترانه</text>

            <rect class="gis-parcel" data-pcode="P-1405-04" data-ptype="تجاری-اداری (M111)" data-parea="۶۴۰ م²" data-pfar="۳۶۰٪" data-pstatus="دارای مجوز" x="196" y="70" width="154" height="80" rx="3" fill="#FEE2E2" stroke="#DC2626" stroke-width="1.2"/>
            <text x="210" y="115" font-size="10.5" fill="#991B1B" font-family="Vazirmatn,Tahoma" font-weight="700">مجتمع تجاری P-04</text>

            <rect class="gis-parcel" data-pcode="P-1405-05" data-ptype="مختلط تجاری-مسکونی" data-parea="۵۸۰ م²" data-pfar="۳۲۰٪" data-pstatus="منطبق با ضابطه" x="196" y="198" width="154" height="64" rx="3" fill="#EDE9FE" stroke="#7C3AED" stroke-width="1.2"/>
            <text x="215" y="235" font-size="10" fill="#5B21B6" font-family="Vazirmatn,Tahoma">P-05 مختلط (۶ ط)</text>

            <rect class="gis-parcel" data-pcode="P-1405-06" data-ptype="فضای سبز عمومی (G111)" data-parea="۱٬۴۵۰ م²" data-pfar="۰٪" data-pstatus="مصوب و تثبیت‌شده" x="196" y="294" width="154" height="76" rx="6" fill="#D1FAE5" stroke="#059669" stroke-width="1.2"/>
            <circle cx="230" cy="330" r="14" fill="#10B981" opacity="0.6"/>
            <circle cx="270" cy="336" r="16" fill="#059669" opacity="0.5"/>
            <circle cx="310" cy="328" r="12" fill="#10B981" opacity="0.6"/>
            <text x="235" y="340" font-size="10" fill="#065F46" font-family="Vazirmatn,Tahoma" font-weight="700">بوستان محله‌ای لاله</text>

            <rect class="gis-parcel" data-pcode="P-1405-07" data-ptype="مسکونی با بافت متراکم" data-parea="۴۹۰ م²" data-pfar="۳۲۰٪" data-pstatus="منطبق با ضابطه" x="404" y="70" width="146" height="80" rx="3" fill="#FEF3C7" stroke="#D97706" stroke-width="1.2"/>
            <text x="430" y="115" font-size="10" fill="#92400E" font-family="Vazirmatn,Tahoma">P-07 مسکونی متراکم</text>

            <rect class="gis-parcel" data-pcode="P-1405-08" data-ptype="پهنه مداخله کالبدی مصوب" data-parea="۱٬۱۲۰ م²" data-pfar="۳۴۰٪" data-pstatus="سناریوی مداخله" x="404" y="198" width="146" height="64" rx="3" fill="#EDE9FE" stroke="#7C3AED" stroke-width="1.5"/>
            <text x="415" y="235" font-size="10" fill="#6D28D9" font-family="Vazirmatn,Tahoma" font-weight="700">⭐ هسته اصلی مداخله P-08</text>

            <rect class="gis-parcel" data-pcode="P-1405-09" data-ptype="پارکینگ طبقاتی عمومی تجمیعی" data-parea="۸۲۰ م²" data-pfar="۲۴۰٪" data-pstatus="مصوب رفع کسری" x="404" y="294" width="146" height="76" rx="3" fill="#DBEAFE" stroke="#2563EB" stroke-width="1.2"/>
            <text x="420" y="335" font-size="10" fill="#1D4ED8" font-family="Vazirmatn,Tahoma" font-weight="700">🅿️ پارکینگ تجمیعی ۴۲۰ واحد</text>

            <rect class="gis-parcel" data-pcode="P-1405-10" data-ptype="تجاری خدماتی (S)" data-parea="۷۵۰ م²" data-pfar="۳۵۰٪" data-pstatus="منطبق با ضابطه" x="586" y="70" width="114" height="80" rx="3" fill="#FEE2E2" stroke="#DC2626" stroke-width="1.2"/>
            <text x="600" y="115" font-size="10" fill="#991B1B" font-family="Vazirmatn,Tahoma">P-10 تجاری</text>

            <rect class="gis-parcel" data-pcode="P-1405-11" data-ptype="مسکونی با تراکم متوسط" data-parea="۶۸۰ م²" data-pfar="۲۴۰٪" data-pstatus="منطبق با ضابطه" x="586" y="198" width="114" height="64" rx="3" fill="#FEF3C7" stroke="#D97706" stroke-width="1.2"/>
            <text x="605" y="235" font-size="10" fill="#92400E" font-family="Vazirmatn,Tahoma">P-11 مسکونی</text>

            <rect class="gis-parcel" data-pcode="P-1405-12" data-ptype="پایانه اتوبوس و ایستگاه مترو" data-parea="۹۲۰ م²" data-pfar="۱۰۰٪" data-pstatus="تثبیت‌شده" x="586" y="294" width="114" height="76" rx="3" fill="#EDE9FE" stroke="#7C3AED" stroke-width="1.2"/>
            <text x="595" y="335" font-size="10" fill="#5B21B6" font-family="Vazirmatn,Tahoma" font-weight="700">🚇 ایستگاه مترو میدان جهاد</text>
          </g>

          <g id="layer-proposal" style="display:${isDone?'inline':'none'}">
            <rect x="396" y="190" width="162" height="188" rx="8" fill="url(#study-hatch)" fill-opacity="0.3" stroke="#7C3AED" stroke-width="2.5" stroke-dasharray="6 4"/>
            <rect x="400" y="166" width="154" height="22" rx="4" fill="#7C3AED"/>
            <text x="410" y="181" font-size="10" fill="#FFF" font-family="Vazirmatn,Tahoma" font-weight="700">محدوده تأثیر سناریوی مصوب ۱۲گانه</text>
          </g>

          <g transform="translate(690, 430)">
            <circle cx="20" cy="20" r="18" fill="#FFF" stroke="#94A3B8" stroke-width="1.2"/>
            <path d="M 20 6 L 25 20 L 20 17 L 15 20 Z" fill="#DC2626"/>
            <path d="M 20 34 L 25 20 L 20 17 L 15 20 Z" fill="#64748B"/>
            <text x="17" y="12" font-size="8" font-weight="700" fill="#DC2626" font-family="Tahoma">N</text>
          </g>
          <g transform="translate(70, 480)">
            <rect x="0" y="0" width="100" height="5" fill="#334155"/>
            <rect x="50" y="0" width="50" height="5" fill="#FFF" stroke="#334155" stroke-width="0.5"/>
            <text x="0" y="18" font-size="9" fill="#475569" font-family="Tahoma">0</text>
            <text x="45" y="18" font-size="9" fill="#475569" font-family="Tahoma">50m</text>
            <text x="90" y="18" font-size="9" fill="#475569" font-family="Tahoma">100m</text>
          </g>
        </svg>

        <div id="gis-parcel-inspector" style="position:absolute;bottom:14px;left:14px;right:14px;background:rgba(255,255,255,0.96);backdrop-filter:blur(8px);border:1px solid var(--line-strong);border-radius:var(--r-m);padding:12px 16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;box-shadow:0 4px 12px rgba(0,0,0,0.08)">
          <div>
            <div style="font-weight:700;font-size:13px;color:var(--text);display:flex;align-items:center;gap:8px">
              <span id="gis-inspector-code" class="code" style="font-size:12px;background:#EFF6FF;color:#1D4ED8;padding:2px 8px;border-radius:4px">P-1405-08</span>
              <span id="gis-inspector-type">هسته اصلی مداخله کالبدی (تجاری-مسکونی مختلط)</span>
              <span id="gis-inspector-badge" class="bdg b-ok plain">منطبق با ضوابط M01</span>
            </div>
            <div class="muted" style="font-size:11.5px;margin-top:4px">
              مساحت عرصه: <b id="gis-inspector-area">۱٬۱۲۰ متر مربع</b> · تراکم مصوب: <b id="gis-inspector-far">۳۴۰٪</b> · دسترسی شبکه: <span class="text-ok">مطلوب (شعاع ۵ دقیقه‌ای مترو)</span>
            </div>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-sm btn-pri" onclick="toast('اطلاعات تفصیلی پلاک در ماژول M01 استخراج شد')">تحلیل ضابطه پلاک</button>
          </div>
        </div>
      </div>

      <div style="flex:1;min-width:280px;display:flex;flex-direction:column;gap:12px">
        ${Card('راهنمای نقشه و کاربری اراضی', `
          <div class="card-b" style="display:grid;gap:8px;font-size:12px">
            <div style="display:flex;align-items:center;gap:10px">
              <span style="display:inline-block;width:20px;height:14px;background:#FEF3C7;border:1px solid #D97706;border-radius:2px"></span>
              <span>مسکونی (R122) — سطح اشغال ۶۰٪، حداکثر ۵ طبقه</span>
            </div>
            <div style="display:flex;align-items:center;gap:10px">
              <span style="display:inline-block;width:20px;height:14px;background:#FEE2E2;border:1px solid #DC2626;border-radius:2px"></span>
              <span>تجاری و اداری (M111 / S214) — تراکم تجاری مصوب</span>
            </div>
            <div style="display:flex;align-items:center;gap:10px">
              <span style="display:inline-block;width:20px;height:14px;background:#EDE9FE;border:1px solid #7C3AED;border-radius:2px"></span>
              <span>مختلط تجاری-مسکونی — پهنه TOD ایستگاهی</span>
            </div>
            <div style="display:flex;align-items:center;gap:10px">
              <span style="display:inline-block;width:20px;height:14px;background:#DBEAFE;border:1px solid #2563EB;border-radius:2px"></span>
              <span>خدماتی، آموزشی و پارکینگ عمومی تجمیعی</span>
            </div>
            <div style="display:flex;align-items:center;gap:10px">
              <span style="display:inline-block;width:20px;height:14px;background:#D1FAE5;border:1px solid #059669;border-radius:2px"></span>
              <span>فضای سبز و پارک محله‌ای (G111)</span>
            </div>
            <div style="display:flex;align-items:center;gap:10px">
              <span style="display:inline-block;width:20px;height:14px;background:#CBD5E1;border:1px solid #94A3B8;border-radius:2px"></span>
              <span>شبکه معابر اصلی و فرعی (Valiasr, Motahari, Beheshti)</span>
            </div>
          </div>
        `)}

        ${Card('وضعیت داده‌های مکانی وضع موجود', `
          <div class="card-b" style="font-size:12px;display:grid;gap:6px">
            <div class="ready-row" style="padding:6px 0">
              <span class="nm">لایه‌های برداری پلاک‌ها (Cadastre)</span>
              <span class="bdg b-ok plain">پین‌شده v2</span>
            </div>
            <div class="ready-row" style="padding:6px 0">
              <span class="nm">شبکه معابر و جریان ترافیک</span>
              <span class="bdg b-ok plain">پین‌شده v3</span>
            </div>
            <div class="ready-row" style="padding:6px 0">
              <span class="nm">آمار جمعیت و توزیع خانوار</span>
              <span class="bdg b-ok plain">پین‌شده v4 مصوب</span>
            </div>
            <div class="ready-row" style="padding:6px 0">
              <span class="nm">انطباق مدل رقومی زمین (DEM)</span>
              <span class="bdg b-ok plain">پین‌شده v1</span>
            </div>
          </div>
        `, { foot: 'کلیه لایه‌ها به تصویر تغییرناپذیر فصل صفر متصل‌اند.' })}
      </div>
    </div>
  </div>`;
}"""

study_scenarios_func = """function StudyScenarios(id){
  const s = byId(id);
  return `
  <div style="margin-top:14px">
    <div class="notice n-info" style="margin-bottom:14px">
      ${ico.spark}
      <div>
        <b>تدوین و مقایسه چندمعیاره سناریوهای مداخله کالبدی</b>. مقایسه جامع سناریوهای پیشنهادی در برابر وضع موجود تثبیت‌شده (Baseline) بر اساس خروجی ماژول‌های ۱۲گانه.
      </div>
    </div>

    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;margin-bottom:18px">
      <div class="card" style="border:1px solid var(--line);background:#FFF;border-radius:var(--r-m);padding:14px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span class="bdg b-neu plain" style="font-weight:700">سناریو ۰ (Baseline)</span>
          <span class="muted" style="font-size:11px">وضع موجود تثبیت‌شده</span>
        </div>
        <h3 style="font-size:14px;margin:0 0 8px 0;color:var(--text)">حفظ وضعیت فعلی بدون مداخله</h3>
        <p class="muted" style="font-size:12px;line-height:1.5;margin-bottom:10px">تداوم بار ترافیکی معابر پیرامونی، کسری ۱۸۵ جایگاه پارکینگ و کمبود سرانه خدمات آموزشی.</p>
        <div style="font-size:12px;display:grid;gap:4px">
          <div>تراکم ساختمانی (FAR): <b>۲۴۰٪</b></div>
          <div>جمعیت بالقوه: <b>۱۸٬۴۵۰ نفر</b></div>
          <div>سفر سواره روزانه: <b>۲۸٬۲۰۰ سفر</b></div>
          <div>کسری پارکینگ: <b class="text-stop">۱۸۵- جایگاه</b></div>
          <div>سرانه فضای سبز: <b>۳٫۸ م²/نفر</b></div>
        </div>
      </div>

      <div class="card" style="border:2px solid #059669;background:#F0FDF4;border-radius:var(--r-m);padding:14px;box-shadow:0 2px 8px rgba(5,150,105,0.08)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span class="bdg b-ok plain" style="font-weight:700;background:#059669;color:#FFF">⭐ سناریو ۱ (مصوب)</span>
          <span class="bdg b-ok plain" style="font-size:11px">گزینه برتر تحلیلی</span>
        </div>
        <h3 style="font-size:14px;margin:0 0 8px 0;color:#065F46">مداخله کالبدی مصوب با پارکینگ تجمیعی</h3>
        <p class="muted" style="font-size:12px;line-height:1.5;margin-bottom:10px">افزایش کنترل‌شده تراکم به همراه احداث پارکینگ تجمیعی و الحاق فضای سبز محله‌ای.</p>
        <div style="font-size:12px;display:grid;gap:4px">
          <div>تراکم ساختمانی (FAR): <b>۳۲۰٪</b> <span class="bdg b-ok plain" style="font-size:10px">+۳۳٪</span></div>
          <div>جمعیت بالقوه: <b>۲۱٬۶۰۰ نفر</b> <span class="bdg b-neu plain" style="font-size:10px">+۱۷٪</span></div>
          <div>سفر سواره روزانه: <b>۲۴٬۵۰۰ سفر</b> <span class="bdg b-ok plain" style="font-size:10px">-۱۳٪</span></div>
          <div>کسری پارکینگ: <b class="text-ok">۰ جایگاه (تأمین ۱۰۰٪)</b></div>
          <div>سرانه فضای سبز: <b class="text-ok">۵٫۲ م²/نفر (+۳۷٪)</b></div>
        </div>
      </div>

      <div class="card" style="border:1px solid var(--line);background:#FFF;border-radius:var(--r-m);padding:14px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span class="bdg b-run plain" style="font-weight:700">سناریو ۲ (توسعه TOD)</span>
          <span class="muted" style="font-size:11px">توسعه فشرده ایستگاهی</span>
        </div>
        <h3 style="font-size:14px;margin:0 0 8px 0;color:var(--text)">تمرکز کاربری مختلط پیرامون مترو</h3>
        <p class="muted" style="font-size:12px;line-height:1.5;margin-bottom:10px">افزایش حداکثری تراکم پیرامون ایستگاه مترو، کاهش سهم خودروی شخصی و پیاده‌مداری.</p>
        <div style="font-size:12px;display:grid;gap:4px">
          <div>تراکم ساختمانی (FAR): <b>۳۸۰٪</b> <span class="bdg b-warn plain" style="font-size:10px">+۵۸٪</span></div>
          <div>جمعیت بالقوه: <b>۲۵٬۲۰۰ نفر</b> <span class="bdg b-warn plain" style="font-size:10px">+۳۶٪</span></div>
          <div>سفر سواره روزانه: <b>۱۹٬۸۰۰ سفر</b> <span class="bdg b-ok plain" style="font-size:10px">-۳۰٪</span></div>
          <div>کسری پارکینگ: <b class="text-warn">۵۰- جایگاه (سقف TOD)</b></div>
          <div>سرانه فضای سبز: <b>۴٫۵ م²/نفر</b></div>
        </div>
      </div>

      <div class="card" style="border:1px solid var(--line);background:#FFF;border-radius:var(--r-m);padding:14px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span class="bdg b-neu plain" style="font-weight:700">سناریو ۳ (شبکه سبز)</span>
          <span class="muted" style="font-size:11px">آرام‌سازی و محیط‌زیست</span>
        </div>
        <h3 style="font-size:14px;margin:0 0 8px 0;color:var(--text)">تثبیت کالبدی و آرام‌سازی معابر</h3>
        <p class="muted" style="font-size:12px;line-height:1.5;margin-bottom:10px">تبدیل معابر فرعی به مسیرهای پیاده و دوچرخه و توسعه حداکثری پارک‌های خطی.</p>
        <div style="font-size:12px;display:grid;gap:4px">
          <div>تراکم ساختمانی (FAR): <b>۲۴۰٪</b> (تثبیت)</div>
          <div>جمعیت بالقوه: <b>۱۸٬۴۵۰ نفر</b></div>
          <div>سفر سواره روزانه: <b>۱۵٬۲۰۰ سفر</b> <span class="bdg b-ok plain" style="font-size:10px">-۴۶٪</span></div>
          <div>کسری پارکینگ: <b class="text-warn">۸۰- جایگاه</b></div>
          <div>سرانه فضای سبز: <b class="text-ok">۶٫۸ م²/نفر (+۷۹٪)</b></div>
        </div>
      </div>
    </div>

    ${Card('جدول مقایسه تفصیلی شاخص‌های سناریوها با وضع موجود', `
      <div class="tw">
        <table class="tbl">
          <thead>
            <tr>
              <th>شاخص تحلیلی</th>
              <th>ماژول محاسباتی</th>
              <th>وضع موجود (S0)</th>
              <th style="background:#ECFDF5;color:#065F46">سناریوی ۱ (مصوب)</th>
              <th>سناریوی ۲ (TOD)</th>
              <th>سناریوی ۳ (سبز)</th>
              <th>تغییر سناریو ۱ نسبت به وضع موجود</th>
              <th>ارزیابی اثر</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><b>ضریب سطح کل (FAR)</b><div class="sub">تراکم ناخالص کالبدی</div></td>
              <td><span class="code">M01</span></td>
              <td class="num">۲٫۴</td>
              <td class="num" style="background:#F0FDF4;font-weight:700">۳٫۲</td>
              <td class="num">۳٫۸</td>
              <td class="num">۲٫۴</td>
              <td class="num"><span class="bdg b-ok plain">+۳۳٪ (+۰٫۸)</span></td>
              <td><span class="bdg b-ok">منطبق با سقف ضابطه</span></td>
            </tr>
            <tr>
              <td><b>سطح اشغال متوسط</b><div class="sub">درصد پوشش عرصه</div></td>
              <td><span class="code">M01</span></td>
              <td class="num">۶۰٪</td>
              <td class="num" style="background:#F0FDF4;font-weight:700">۵۵٪</td>
              <td class="num">۶۵٪</td>
              <td class="num">۵۰٪</td>
              <td class="num"><span class="bdg b-ok plain">-۵٪ (آزادسازی معابر)</span></td>
              <td><span class="bdg b-ok">اثر مثبت کالبدی</span></td>
            </tr>
            <tr>
              <td><b>زیربنای ناخالص کل (GFA)</b><div class="sub">مساحت ساختمانی</div></td>
              <td><span class="code">M02</span></td>
              <td class="num">۲۴۵٬۰۰۰ م²</td>
              <td class="num" style="background:#F0FDF4;font-weight:700">۳۱۰٬۰۰۰ م²</td>
              <td class="num">۳۷۵٬۰۰۰ م²</td>
              <td class="num">۲۴۵٬۰۰۰ م²</td>
              <td class="num"><span class="bdg b-ok plain">+۶۵٬۰۰۰ م² (+۲۶٪)</span></td>
              <td><span class="bdg b-ok">افزایش ارزش افزوده</span></td>
            </tr>
            <tr>
              <td><b>جمعیت‌پذیری در اشغال کامل</b><div class="sub">جمعیت ساکن بالقوه</div></td>
              <td><span class="code">M03</span></td>
              <td class="num">۱۸٬۴۵۰ نفر</td>
              <td class="num" style="background:#F0FDF4;font-weight:700">۲۱٬۶۰۰ نفر</td>
              <td class="num">۲۵٬۲۰۰ نفر</td>
              <td class="num">۱۸٬۴۵۰ نفر</td>
              <td class="num"><span class="bdg b-neu plain">+۳٬۱۵۰ نفر (+۱۷٪)</span></td>
              <td><span class="bdg b-neu">در حد آستانه ظرفیت</span></td>
            </tr>
            <tr>
              <td><b>تولید سفر سواره روزانه</b><div class="sub">سفر خودرویی در روز</div></td>
              <td><span class="code">M04</span></td>
              <td class="num">۲۸٬۲۰۰ سفر</td>
              <td class="num" style="background:#F0FDF4;font-weight:700">۲۴٬۵۰۰ سفر</td>
              <td class="num">۱۹٬۸۰۰ سفر</td>
              <td class="num">۱۵٬۲۰۰ سفر</td>
              <td class="num"><span class="bdg b-ok plain">-۳٬۷۰۰ سفر (-۱۳٪)</span></td>
              <td><span class="bdg b-ok">کاهش بار ترافیکی</span></td>
            </tr>
            <tr>
              <td><b>تراز عرضه و کسری پارکینگ</b><div class="sub">تأمین جایگاه خودرو</div></td>
              <td><span class="code">M05</span></td>
              <td class="num text-stop">۱۸۵- (کسری)</td>
              <td class="num" style="background:#F0FDF4;font-weight:700;color:#047857">۰ (تأمین ۱۰۰٪)</td>
              <td class="num text-warn">۵۰-</td>
              <td class="num text-warn">۸۰-</td>
              <td class="num"><span class="bdg b-ok plain">+۱۸۵ جایگاه</span></td>
              <td><span class="bdg b-ok">برطرف‌شدن کامل کسری</span></td>
            </tr>
            <tr>
              <td><b>سرانه فضای سبز عمومی</b><div class="sub">متر مربع به ازای هر نفر</div></td>
              <td><span class="code">M06</span></td>
              <td class="num">۳٫۸ م²</td>
              <td class="num" style="background:#F0FDF4;font-weight:700;color:#047857">۵٫۲ م²</td>
              <td class="num">۴٫۵ م²</td>
              <td class="num">۶٫۸ م²</td>
              <td class="num"><span class="bdg b-ok plain">+۱٫۴ م² (+۳۷٪)</span></td>
              <td><span class="bdg b-ok">رسیدن به سرانه استاندارد</span></td>
            </tr>
            <tr>
              <td><b>سرانه خدمات آموزشی</b><div class="sub">دبستان و متوسطه</div></td>
              <td><span class="code">M06</span></td>
              <td class="num">۲٫۱ م²</td>
              <td class="num" style="background:#F0FDF4;font-weight:700">۳٫۴ م²</td>
              <td class="num">۲٫۹ م²</td>
              <td class="num">۲٫۱ م²</td>
              <td class="num"><span class="bdg b-ok plain">+۱٫۳ م² (+۶۲٪)</span></td>
              <td><span class="bdg b-ok">تأمین مرکز جدید</span></td>
            </tr>
            <tr>
              <td><b>پوشش شعاع ایستگاه‌های همگانی</b><div class="sub">پیمایش پیاده ۸۰۰ متری</div></td>
              <td><span class="code">M07</span></td>
              <td class="num">۶۴٪</td>
              <td class="num" style="background:#F0FDF4;font-weight:700">۸۸٪</td>
              <td class="num">۹۵٪</td>
              <td class="num">۶۴٪</td>
              <td class="num"><span class="bdg b-ok plain">+۲۴٪ افزایش پوشش</span></td>
              <td><span class="bdg b-ok">بهبود شبکه پیاده</span></td>
            </tr>
            <tr>
              <td><b>ضریب رواناب و هدایت آب سطحی</b><div class="sub">ضریب هیدرولوژیکی</div></td>
              <td><span class="code">M08</span></td>
              <td class="num">۰٫۷۸</td>
              <td class="num" style="background:#F0FDF4;font-weight:700">۰٫۶۸</td>
              <td class="num">۰٫۷۲</td>
              <td class="num">۰٫۵۵</td>
              <td class="num"><span class="bdg b-ok plain">-۰٫۱۰ بهبود نفوذ</span></td>
              <td><span class="bdg b-ok">کاهش خطر آب‌گرفتگی</span></td>
            </tr>
            <tr>
              <td><b>شدت مصرف انرژی ساختمانی</b><div class="sub">kWh / m² در سال</div></td>
              <td><span class="code">M10</span></td>
              <td class="num">۱۳۵</td>
              <td class="num" style="background:#F0FDF4;font-weight:700">۱۱۰</td>
              <td class="num">۱۱۵</td>
              <td class="num:">۱۲۵</td>
              <td class="num"><span class="bdg b-ok plain">-۲۵ kWh (-۱۸٪)</span></td>
              <td><span class="bdg b-ok">انطباق مبحث ۱۹</span></td>
            </tr>
            <tr>
              <td><b>شاخص زیست‌پذیری محله‌ای</b><div class="sub">ترکیب معیارها از ۱۰۰</div></td>
              <td><span class="code">M11</span></td>
              <td class="num">۷۰</td>
              <td class="num" style="background:#F0FDF4;font-weight:700;color:#047857">۸۴</td>
              <td class="num">۷۹</td>
              <td class="num">۸۲</td>
              <td class="num"><span class="bdg b-ok plain">+۱۴ امتیاز</span></td>
              <td><span class="bdg b-ok">رشد چشمگیر کیفیت زندگی</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    `, {
      foot: 'محاسبات بر اساس مدل‌های M01 تا M12 با تکیه بر داده‌های پین‌شده وضع موجود انجام شده است.'
    })}
  </div>`;
}"""

study_models_func = """function StudyModels(id){
  const s = byId(id);
  const a = (STATE.studyAn && STATE.studyAn[id]) || { done: isStudyLocked(id) };
  const isDone = a.done || isStudyLocked(id);

  const modules = [
    { code: 'M01', name: 'انطباق ضوابط و مقررات شهرسازی', method: 'Rule Engine (تطبیق قطعی)', input: 'لایه‌های پهنه‌بندی طرح تفصیلی، Cadastre v2', out: '۹۶٫۴٪ انطباق هندسی و کالبدی پلاک‌ها با طرح تفصیلی', st: 'done' },
    { code: 'M02', name: 'ظرفیت کالبدی و بار ساختمانی', method: 'Deterministic Formula', input: 'مساحت عرصه‌ها، ضریب سطح (FAR) مصوب', out: 'ظرفیت ناخالص ۳۱۰٬۰۰۰ متر مربع زیربنا با تراکم ۳۲۰٪', st: 'done' },
    { code: 'M03', name: 'ظرفیت و تعادل جمعیتی', method: 'Demographic Cohort', input: 'داده‌های سرشماری POP-HH-06 v4 مصوب', out: 'جمعیت‌پذیری در اشغال کامل: ۲۱٬۶۰۰ نفر (افزایش کنترل‌شده)', st: 'done' },
    { code: 'M04', name: 'تولید و جذب سفر شهری', method: 'Four-Step Gravity Model', input: 'شبکه معابر ROAD-06 v3، کاربری اراضی', out: '۲۴٬۵۰۰ سفر روزانه؛ کاهش ۱۳٪ سفرهای عبوری مزاحم', st: 'done' },
    { code: 'M05', name: 'تراز و تقاضای پارکینگ', method: 'Space Allocation', input: 'واحدهای مسکونی و تجاری، پارکینگ تجمیعی', out: 'تراز صفر؛ تأمین کامل ۴۲۰ جایگاه پارکینگ تجمیعی', st: 'done' },
    { code: 'M06', name: 'کفایت خدمات و سرانه‌های محله‌ای', method: 'Spatial Buffer', input: 'مراکز بهداشتی، آموزشی و فضای سبز', out: 'ارتقای سرانه فضای سبز به ۵٫۲ م²/نفر و سرانه آموزشی به ۳٫۴ م²', st: 'done' },
    { code: 'M07', name: 'دسترسی و پوشش حمل‌ونقل همگانی', method: 'Isochrone Catchment', input: 'ایستگاه‌های مترو خط ۳ و خطوط اتوبوسرانی', out: '۸۸٪ پوشش پیاده شعاع ۴۰۰ متری ایستگاه‌های حمل‌ونقل عمومی', st: 'done' },
    { code: 'M08', name: 'مخاطرات، شیب و رواناب سطحی', method: 'Rational Hydrology', input: 'مدل رقومی ارتفاع DEM، نقشه حریم مسیل‌ها', out: 'کاهش ضریب رواناب سطحی به ۰٫۶۸ و عدم تداخل با حریم مسیل', st: 'done' },
    { code: 'M09', name: 'سایه‌اندازی و آسایش اقلیمی', method: 'Solar 3D Ray-Tracing', input: 'ارتفاع ابنیه و عرض معابر پیرامونی', out: 'انطباق ۱۰۰٪ با ضوابط نورگیری و تهویه طبیعی', st: 'done' },
    { code: 'M10', name: 'انرژی، کربن و محیط‌زیست', method: 'Emissions Proxy', input: 'سطوح زیربنا و مصرف استاندارد مبحث ۱۹', out: 'کاهش ۱۸٪ انتشار گازهای گلخانه‌ای نسبت به وضع موجود', st: 'done' },
    { code: 'M11', name: 'ارزیابی چندمعیاره و شاخص‌های ترکیبی', method: 'AHP & TOPSIS', input: 'ماتریس جامع ۱۹ شاخص کلیدی', out: 'امتیاز کلی ارزیابی مداخله: ۸۴ از ۱۰۰ (توصیه به تصویب)', st: 'done' },
    { code: 'M12', name: 'بسته‌بندی شواهد و زنجیره اصالت', method: 'Cryptographic Ledger', input: 'امضای رقومی، نسخه‌های پین‌شده ورودی‌ها', out: 'ثبت شناسه تغییرناپذیر اصالت تحلیل با کد رهگیری رسمی', st: 'done' },
  ];

  return `
  <div style="margin-top:14px">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:14px">
      <div>
        <h2 style="font-size:16px;margin:0 0 4px 0">ماژول‌های تحلیلی ۱۲گانه مطالعه (${fa(modules.length)} ماژول)</h2>
        <span class="muted" style="font-size:12px">شبیه‌سازی کامل محاسبات بر مبنای داده‌های وضع موجود پین‌شده در فصل صفر</span>
      </div>
      <div style="display:flex;gap:8px">
        <span class="bdg b-ok plain" style="font-weight:700">وضعیت اجرای ماژول‌ها: ۱۲ از ۱۲ تکمیل‌شده</span>
        <button class="btn btn-sm" onclick="toast('لاگ محاسبات ماژول‌های ۱۲گانه دریافت شد')">${ico.doc} دریافت گزارش خام JSON</button>
      </div>
    </div>

    <div class="grid cols-2" style="gap:14px">
      ${modules.map(m => `
        <div class="card" style="padding:14px 16px;border:1px solid var(--line);background:#FFF;border-radius:var(--r-m)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <div style="display:flex;align-items:center;gap:8px">
              <span class="code" style="font-weight:700;background:#EFF6FF;color:#1D4ED8;padding:2px 8px;border-radius:4px">${m.code}</span>
              <b style="font-size:13.5px;color:var(--text)">${m.name}</b>
            </div>
            <span class="bdg b-ok plain" style="font-size:11px">تکمیل‌شده ✓</span>
          </div>
          <div style="font-size:12px;display:grid;gap:5px;line-height:1.5">
            <div><span class="muted">روش محاسباتی:</span> <b>${m.method}</b></div>
            <div><span class="muted">داده‌های ورودی:</span> <span>${m.input}</span></div>
            <div style="background:#F0FDF4;border:1px solid #BBF7D0;padding:6px 10px;border-radius:4px;color:#065F46;margin-top:4px">
              <b>خروجی کلیدی:</b> ${m.out}
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  </div>`;
}"""

study_runs_func = """function StudyRuns(id){
  const s = byId(id);
  const a = (STATE.studyAn && STATE.studyAn[id]) || { runId: 'RUN-ST-5201', done: true };
  const runId = a.runId || 'RUN-ST-5201';

  return `
  <div style="margin-top:14px">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:14px">
      <div>
        <h2 style="font-size:16px;margin:0 0 4px 0">سوابق اجرا و تله‌متری ماژول‌ها</h2>
        <span class="muted" style="font-size:12px">تاریخچه اجرای شبیه‌سازی‌ها، مدت زمان و لاگ محاسباتی</span>
      </div>
      <button class="btn btn-sm btn-pri" onclick="toast('لاگ کامل اجرا به کنسول ارسال شد')">${ico.spark} مشاهده لاگ سیستمی</button>
    </div>

    ${Card('فهرست اجراهای مطالعه', `
      <div class="tw">
        <table class="tbl">
          <thead>
            <tr>
              <th>شناسه اجرا</th>
              <th>عنوان سناریو / ماژول‌ها</th>
              <th>کاربر مجری</th>
              <th>زمان اجرا</th>
              <th>مدت</th>
              <th>وضعیت</th>
              <th>اقدام</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><span class="code" style="font-weight:700">${runId}</span></td>
              <td><b>اجرای جامع ماژول‌های ۱۲گانه مطالعه</b><div class="sub">سناریوی مداخله مصوب کالبدی</div></td>
              <td>${s.owner || 'مهندس زهرا کاظمی'}</td>
              <td class="num">${s.updated || '۱۴۰۵/۰۶/۲۳'}</td>
              <td class="num">۱ دقیقه و ۲۴ ثانیه</td>
              <td><span class="bdg b-ok">تکمیل موفق</span></td>
              <td><button class="btn btn-sm" onclick="toast('جزئیات اجرا بارگذاری شد')">مشاهده تله‌متری</button></td>
            </tr>
            <tr>
              <td><span class="code">RUN-ST-5198</span></td>
              <td><b>پیش‌محاسبه ظرفیت کالبدی M01 و M02</b><div class="sub">آزمون اولیه داده‌های کاداستر</div></td>
              <td>${s.owner || 'مهندس زهرا کاظمی'}</td>
              <td class="num">۱۴۰۵/۰۶/۲۱</td>
              <td class="num">۴۲ ثانیه</td>
              <td><span class="bdg b-ok">تکمیل موفق</span></td>
              <td><button class="btn btn-sm" onclick="toast('جزئیات اجرا بارگذاری شد')">مشاهده تله‌متری</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    `)}

    <div class="card" style="margin-top:16px;padding:16px;background:#0F172A;color:#E2E8F0;border-radius:var(--r-m);font-family:monospace;font-size:12px;line-height:1.7;direction:ltr;text-align:left">
      <div style="color:#94A3B8;margin-bottom:8px;border-bottom:1px solid #334155;padding-bottom:4px;font-family:Vazirmatn,Tahoma;direction:rtl;text-align:right">
        📋 گزارش زنده تله‌متری شبیه‌سازی (${runId}):
      </div>
      <div>[11:45:01 UTC] Initializing execution engine for Study ID: ${s.id}</div>
      <div>[11:45:02 UTC] Loading pinned datasets: Cadastre (PARCEL-06 v2), Roads (ROAD-06 v3), Population (POP-HH-06 v4)</div>
      <div>[11:45:06 UTC] Executing M01 (Zoning Compliance Engine)... 100% matched</div>
      <div>[11:45:14 UTC] Executing M02 (Building Capacity)... GFA 310,000 sqm calculated</div>
      <div>[11:45:22 UTC] Executing M03 (Demographic Balance)... Converged at 21,600 inhabitants</div>
      <div>[11:45:31 UTC] Executing M04 (Trip Distribution Four-Step Model)... 24,500 daily trips generated</div>
      <div>[11:45:38 UTC] Executing M05 (Parking Space Allocation)... Zero gap reached with 420-space collective parking</div>
      <div>[11:45:47 UTC] Executing M06-M11 (Urban Services, Accessibility, Hydrology, Solar, Energy)... Complete</div>
      <div>[11:45:54 UTC] Executing M12 (Evidence Ledger & Hash Cryptographic Packaging)... Hash verified: a4c89f10e4</div>
      <div style="color:#4ADE80;font-weight:bold">[11:45:55 UTC] RUN COMPLETED SUCCESSFULLY. All 12 analytical models finalized.</div>
    </div>
  </div>`;
}"""

study_indicators_func = """function StudyIndicators(id){
  const s = byId(id);
  const indList = [
    { code: 'IN-01', name: 'تراکم ناخالص ساختمانی (FAR)', base: '۲٫۴', target: '۳٫۲', unit: 'نسبت', status: 'منطبق با سقف ضابطه', cls: 'b-ok', cat: 'کالبدی' },
    { code: 'IN-02', name: 'سطح اشغال متوسط عرصه', base: '۶۰٪', target: '۵۵٪', unit: 'درصد', status: 'کاهش ۵٪ اشغال و بازگشایی معبر', cls: 'b-ok', cat: 'کالبدی' },
    { code: 'IN-03', name: 'سرانه فضای سبز عمومی محله‌ای', base: '۳٫۸', target: '۵٫۲', unit: 'متر مربع / نفر', status: 'ارتقای ۳۷٪ و رسیدن به استاندارد', cls: 'b-ok', cat: 'خدمات' },
    { code: 'IN-04', name: 'سرانه خدمات آموزشی دبستان', base: '۲٫۱', target: '۳٫۴', unit: 'متر مربع / نفر', status: 'احداث مرکز آموزشی جدید', cls: 'b-ok', cat: 'خدمات' },
    { code: 'IN-05', name: 'بار سفر روزانه تولیدشده سواره', base: '۲۸٬۲۰۰', target: '۲۴٬۵۰۰', unit: 'سفر در روز', status: 'کاهش ۱۳٪ سفر با ارتقای پیاده‌مداری', cls: 'b-ok', cat: 'ترافیک' },
    { code: 'IN-06', name: 'شکاف و کسری پارکینگ محله', base: '۱۸۵- (کسری)', target: '۰ (تأمین ۱۰۰٪)', unit: 'واحد جایگاه', status: 'برطرف‌شدن قطعی کسری', cls: 'b-ok', cat: 'ترافیک' },
    { code: 'IN-07', name: 'پوشش شعاع ایستگاه‌های همگانی', base: '۶۴٪', target: '۸۸٪', unit: 'درصد جمعیت', status: 'دسترسی پیاده به ایستگاه مترو', cls: 'b-ok', cat: 'ترافیک' },
    { code: 'IN-08', name: 'زمان دسترسی شبکه امداد و نجات', base: '۳٫۲', target: '۱٫۸', unit: 'دقیقه', status: 'بهبود مسیرهای دسترسی اضطراری', cls: 'b-ok', cat: 'ترافیک' },
    { code: 'IN-09', name: 'ضریب رواناب سطحی محله', base: '۰٫۷۸', target: '۰٫۶۸', unit: 'ضریب نفوذ', status: 'افزایش نفوذپذیری آب باران', cls: 'b-ok', cat: 'محیط‌زیست' },
    { code: 'IN-10', name: 'شدت مصرف انرژی ابنیه', base: '۱۳۵', target: '۱۱۰', unit: 'kWh / m²', status: 'کاهش ۱۸٪ مصرف با اجرای مبحث ۱۹', cls: 'b-ok', cat: 'محیط‌زیست' },
    { code: 'IN-11', name: 'امتیاز جامع زیست‌پذیری محله', base: '۷۰', target: '۸۴', unit: 'از ۱۰۰', status: 'ارتقای چشمگیر کیفیت سکونت', cls: 'b-ok', cat: 'ترکیبی' },
    { code: 'IN-12', name: 'نرخ انطباق طرح با طرح تفصیلی', base: '۸۵٪', target: '۹۶٫۴٪', unit: 'درصد انطباق', status: 'تأییدیه کامل مقررات کمیسیون', cls: 'b-ok', cat: 'کالبدی' },
  ];

  return `
  <div style="margin-top:14px">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:14px">
      <div>
        <h2 style="font-size:16px;margin:0 0 4px 0">شاخص‌های عملکردی و شهری مطالعه (${fa(indList.length)} شاخص)</h2>
        <span class="muted" style="font-size:12px">مقایسه مقادیر وضع موجود (Baseline) با سناریوی مصوب</span>
      </div>
      <button class="btn btn-sm" onclick="toast('گزارش شاخص‌ها استخراج گردید')">${ico.doc} دریافت جدول اکسل</button>
    </div>

    <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">
      ${indList.map(ind => `
        <div class="card" style="padding:14px 16px;border:1px solid var(--line);background:#FFF;border-radius:var(--r-m)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <span class="code" style="font-size:11.5px;color:var(--text-3)">${ind.code} · ${ind.cat}</span>
            <span class="bdg ${ind.cls} plain" style="font-size:10.5px">${ind.status}</span>
          </div>
          <b style="font-size:13px;display:block;margin-bottom:8px;color:var(--text)">${ind.name}</b>
          <div style="display:flex;justify-content:space-between;align-items:center;background:#F8FAFC;padding:8px 12px;border-radius:6px;border:1px solid var(--line)">
            <div>
              <span class="muted" style="font-size:11px;display:block">وضع موجود:</span>
              <b style="font-size:13.5px">${ind.base}</b>
            </div>
            <span style="color:var(--text-3);font-size:14px">←</span>
            <div style="text-align:left">
              <span class="muted" style="font-size:11px;display:block">سناریوی مصوب:</span>
              <b style="font-size:14px;color:#047857">${ind.target}</b> <span style="font-size:11px;color:var(--text-3)">${ind.unit}</span>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  </div>`;
}"""

study_rules_func = """function StudyRules(id){
  const s = byId(id);
  const rules = [
    { id: 'RL-01', t: 'سقف تراکم ساختمانی پهنه مسکونی (R122)', art: 'ماده ۴ ضوابط طرح تفصیلی تهران', ceiling: 'حداکثر ۳۰۰٪', res: '۳۰۰٪', st: 'منطبق', cls: 'b-ok' },
    { id: 'RL-02', t: 'حداکثر سطح اشغال مجاز ابنیه مسکونی', art: 'ماده ۵ ضوابط کالبدی شهرداری', ceiling: '۶۰٪ مساحت عرصه', res: '۵۵٪', st: 'منطبق و دارای عقب‌نشینی', cls: 'b-ok' },
    { id: 'RL-03', t: 'رعایت بر اصلاحی و حریم معابر شریانی', art: 'طرح تفصیلی منطقه ۶ — خیابان ولیعصر', ceiling: 'حریم ۳۵ متری شریان اصلی', res: 'رعایت کامل عقب‌نشینی', st: 'منطبق', cls: 'b-ok' },
    { id: 'RL-04', t: 'تأمین ۱۰۰٪ پارکینگ موردنیاز در محل یا تجمیعی', art: 'بند ۳ مصوبه ۵۲۸ کمیسیون ماده ۵', ceiling: '۱ واحد به ازای هر واحد مسکونی', res: 'تأمین در پارکینگ تجمیعی', st: 'منطبق و برطرف‌کننده کسری', cls: 'b-ok' },
    { id: 'RL-05', t: 'حفظ حریم ایمنی خطوط انتقال نیرو و تأسیسات', art: 'آیین‌نامه ایمنی حریم خطوط شهری', ceiling: 'شعاع ۱۵ متری حریم کابل فشارقوی', res: 'فاصله ۲۵ متر از حریم', st: 'بدون تداخل', cls: 'b-ok' },
    { id: 'RL-06', t: 'پخ تقاطع و مثلث دید تقاطع‌ها در معابر فرعی', art: 'دستورالعمل مهندسی ترافیک', ceiling: 'پخ ۵ متری تقاطع‌ها', res: 'اعمال در طرح اجرایی', st: 'منطبق', cls: 'b-ok' },
  ];

  return `
  <div style="margin-top:14px">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:14px">
      <div>
        <h2 style="font-size:16px;margin:0 0 4px 0">ضوابط و مقررات شهرسازی ملاک‌عمل</h2>
        <span class="muted" style="font-size:12px">ارزیابی انطباق طرح و سناریوها با مقررات طرح جامع و تفصیلی تهران</span>
      </div>
      <span class="bdg b-ok plain" style="font-weight:700">۱۰۰٪ ضوابط انطباق دارند</span>
    </div>

    ${Card('ماتریس انطباق ضوابط طرح', `
      <div class="tw">
        <table class="tbl">
          <thead>
            <tr>
              <th>کد ضابطه</th>
              <th>عنوان ضابطه شهرسازی</th>
              <th>مستند قانونی / مرجع</th>
              <th>سقف یا حد آستانه ضابطه</th>
              <th>مقدار پیشنهادی طرح</th>
              <th>نتیجه تطبیق</th>
            </tr>
          </thead>
          <tbody>
            ${rules.map(r => `
              <tr>
                <td><span class="code">${r.id}</span></td>
                <td><b>${r.t}</b></td>
                <td class="muted">${r.art}</td>
                <td class="num">${r.ceiling}</td>
                <td class="num" style="font-weight:700">${r.res}</td>
                <td><span class="bdg ${r.cls}">${r.st}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `)}
  </div>`;
}"""

study_evidence_func = """function StudyEvidence(id){
  const s = byId(id);
  const a = (STATE.studyAn && STATE.studyAn[id]) || { runId: 'RUN-ST-5201', done: true };
  const runId = a.runId || 'RUN-ST-5201';

  const ledger = [
    { st: 'گزاره ۱: سقف تراکم ۳۲۰٪ با طرح تفصیلی منطبق است', ds: 'PARCEL-06 v2', rule: 'RL-01', mod: 'M01', hash: 'e3b0c44298fc1c149afbf4c8996fb924', aud: 'تأییدشده' },
    { st: 'گزاره ۲: ظرفیت کالبدی ناخالص ۳۱۰٬۰۰۰ متر مربع برآورد شد', ds: 'BLDG-06 v2', rule: 'RL-02', mod: 'M02', hash: '8f434346648f6b96df89dda901c5176b', aud: 'تأییدشده' },
    { st: 'گزاره ۳: جمعیت‌پذیری در اشغال کامل ۲۱٬۶۰۰ نفر همگرا گردید', ds: 'POP-HH-06 v4', rule: 'سرشماری رسمی', mod: 'M03', hash: '6ca13d52ca70c883e0f0bb101e425a89', aud: 'تأییدشده' },
    { st: 'گزاره ۴: تولید سفر روزانه ۲۴٬۵۰۰ سفر با مهار خودرویی محاسبه شد', ds: 'ROAD-06 v3', rule: 'HCM 2020', mod: 'M04', hash: '9b71d224bd62f3785d96d46ad3ea3d73', aud: 'تأییدشده' },
    { st: 'گزاره ۵: کسری ۱۸۵ جایگاه با احداث پارکینگ تجمیعی رفع شد', ds: 'PARKING-06 v2', rule: 'RL-04', mod: 'M05', hash: 'a591a6d40bf420404a011733cfb7b190', aud: 'تأییدشده' },
    { st: 'گزاره ۶: سرانه فضای سبز به ۵٫۲ متر مربع بر نفر ارتقا یافت', ds: 'GREEN-06 v2', rule: 'طرح جامع', mod: 'M06', hash: '4355a46b19d348dc2f57c046f8ef63d4', aud: 'تأییدشده' },
    { st: 'گزاره ۷: دسترسی به خطوط مترو و شبکه همگانی ۸۸٪ پوشش یافت', ds: 'TRANSIT-06 v1', rule: 'ضوابط TOD', mod: 'M07', hash: '2c26b46b68ffc68ff99b453c1d304134', aud: 'تأییدشده' },
    { st: 'گزاره ۸: عدم تداخل با حریم خطوط انتقال نیرو و مسیل تأیید شد', ds: 'TERRAIN-06 v1', rule: 'RL-05', mod: 'M08', hash: '098f6bcd4621d373cade4e832627b4f6', aud: 'تأییدشده' },
  ];

  return `
  <div style="margin-top:14px">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:14px">
      <div>
        <h2 style="font-size:16px;margin:0 0 4px 0">دفترکل شواهد و زنجیره اصالت تحلیلی (Evidence Ledger)</h2>
        <span class="muted" style="font-size:12px">ردیابی کامل گزاره‌ها از داده‌های ورودی پین‌شده تا مدل و نتیجه</span>
      </div>
      <span class="bdg b-ok plain" style="font-weight:700">🔒 تمامی شواهد دارای هش رمزنگاری معتبر هستند</span>
    </div>

    ${Card('دفتر شواهد معتبر مطالعه — شناسه اجرا: ' + runId, `
      <div class="tw">
        <table class="tbl">
          <thead>
            <tr>
              <th>گزاره تحلیلی</th>
              <th>مجموعه داده ورودی</th>
              <th>ضابطه مبنا</th>
              <th>ماژول محاسباتی</th>
              <th>کد هش دیجیتال (SHA-256)</th>
              <th>وضعیت داوری</th>
            </tr>
          </thead>
          <tbody>
            ${ledger.map(row => `
              <tr>
                <td><b>${row.st}</b></td>
                <td><span class="code">${row.ds}</span></td>
                <td><span class="muted">${row.rule}</span></td>
                <td><span class="code">${row.mod}</span></td>
                <td><span class="code" style="font-size:10.5px">${row.hash.slice(0, 16)}...</span></td>
                <td><span class="bdg b-ok">${row.aud}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `, { foot: 'هر گزاره به داده‌های پین‌شده فصل صفر متصل بوده و تغییرناپذیر است.' })}
  </div>`;
}"""

study_reports_func = """function StudyReports(id){
  const s = byId(id);
  const sc = (window.DB?.studyCases || []).find(c => c.study_id === id);
  const a = (STATE.studyAn && STATE.studyAn[id]) || { runId: 'RUN-ST-5201', done: true };
  const runId = a.runId || 'RUN-ST-5201';

  return `
  <div style="margin-top:14px">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:14px">
      <div>
        <h2 style="font-size:16px;margin:0 0 4px 0">گزارش رسمی تحلیلی ۵ فصلی مطالعه مصوب</h2>
        <span class="muted" style="font-size:12px">تدوین‌شده بر اساس شبیه‌سازی ۱۲ ماژول تحلیلی جهت ارائه به مراجع قانونی شهرسازی</span>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-pri" id="btn-print-study-report" style="font-weight:700">${ico.doc} چاپ و خروجی رسمی PDF</button>
      </div>
    </div>

    <!-- Printable Official Report Card -->
    <div class="card" style="padding:28px 36px;background:#FFF;border:1px solid var(--line);border-radius:var(--r-l);box-shadow:0 4px 16px rgba(0,0,0,0.06);line-height:1.8">
      <!-- Report Header -->
      <div style="text-align:center;border-bottom:2px solid var(--line-strong);padding-bottom:18px;margin-bottom:24px">
        <div style="font-size:13px;font-weight:700;color:var(--text-3);margin-bottom:4px">جمهوری اسلامی ایران — شهرداری تهران</div>
        <div style="font-size:12px;color:var(--text-3);margin-bottom:10px">معاونت شهرسازی و معماری — اداره‌کل تدوین ضوابط و نظارت بر طرح‌های توسعه شهری</div>
        <h1 style="font-size:20px;color:var(--text);margin:0 0 8px 0;font-weight:800">گزارش تحلیلی ارزیابی اثر و پیشنهاد مصوبه کمیسیون ماده ۵</h1>
        <div style="font-size:13.5px;color:var(--pri);font-weight:700">مطالعه: «${esc(s.name)}» (${esc(s.region)})</div>
        <div style="display:flex;justify-content:center;gap:20px;margin-top:12px;font-size:11.5px;color:var(--text-3)">
          <span>شناسه پرونده: <b class="code">${s.id}</b></span>
          <span>شماره اجرا: <b class="code">${runId}</b></span>
          <span>تاریخ تصویب نهایی: <b class="num">${s.updated || '۱۴۰۵/۰۶/۲۳'}</b></span>
          <span>وضعیت پرونده: <span class="bdg b-ok plain">🔒 نهایی و مصوب</span></span>
        </div>
      </div>

      <!-- Chapter 0 -->
      <div style="margin-bottom:24px">
        <h2 style="font-size:15px;color:var(--pri);border-bottom:1px solid var(--line);padding-bottom:6px;margin-bottom:10px;font-weight:800">
          فصل ۰: مبانی نظری، آمادگی داده‌ها و تثبیت وضع موجود (Baseline)
        </h2>
        <p style="font-size:12.5px;text-align:justify">
          بر اساس فرآیند ارزیابی داده‌های ورودی، کلیه نیازمندی‌های داده‌ای شامل کاداستر پلاک‌ها (نسخه ۲)، شبکه معابر شهری (نسخه ۳) و آمار جمعیتی مصوب مرکز آمار (نسخه ۴) تثبیت و با تصویر تغییرناپذیر فصل صفر ثبت گردید. دروازه داده با رفع کلیه موارد مسدودکننده تأیید شد و صحت داده‌های ورودی توسط متولی داده صحه‌سنجی گردید.
        </p>
      </div>

      <!-- Chapter 1 -->
      <div style="margin-bottom:24px">
        <h2 style="font-size:15px;color:var(--pri);border-bottom:1px solid var(--line);padding-bottom:6px;margin-bottom:10px;font-weight:800">
          فصل ۱: توصیف و آسیب‌شناسی وضع موجود محدوده
        </h2>
        <p style="font-size:12.5px;text-align:justify">
          محدوده مورد بررسی در ${esc(s.region)} با مساحت ناخالص حدود ۳۵ هکتار و جمعیت ساکن ۱۸٬۴۵۰ نفر در حال حاضر با معضلاتی نظیر کسری ۱۸۵ واحد پارکینگ محله‌ای، سرانه پایین فضای سبز (۳٫۸ متر مربع بر نفر) و ایجاد گره‌های ترافیکی در شریان‌های شهید مطهری و ولیعصر مواجه است. نرخ فعلی انطباق ضوابط ۸۵٪ ارزیابی شده که لزوم بازنگری کالبدی را تبیین می‌نماید.
        </p>
      </div>

      <!-- Chapter 2 -->
      <div style="margin-bottom:24px">
        <h2 style="font-size:15px;color:var(--pri);border-bottom:1px solid var(--line);padding-bottom:6px;margin-bottom:10px;font-weight:800">
          فصل ۲: ارزیابی ظرفیت‌ها و شبیه‌سازی ماژول‌های ۱۲گانه
        </h2>
        <p style="font-size:12.5px;text-align:justify">
          محاسبات شبیه‌سازی ماژول‌های دوازده‌گانه (M01 تا M12) نشان می‌دهد که اعمال ضریب سطح ۳۲۰٪ به همراه سطح اشغال ۵۵٪، ظرفیت ناخالص کالبدی را به ۳۱۰٬۰۰۰ متر مربع ارتقا داده و جمعیت بالقوه را در مرز تعادل ۲۱٬۶۰۰ نفر نگه می‌دارد. تولید سفر سواره با کاهش ۱۳٪ به ۲۴٬۵۰۰ سفر در روز می‌رسد و شکاف تأمین پارکینگ با احداث مجتمع پارکینگ عمومی تجمیعی ۴۲۰ واحدی به صفر می‌رسد.
        </p>
      </div>

      <!-- Chapter 3 -->
      <div style="margin-bottom:24px">
        <h2 style="font-size:15px;color:var(--pri);border-bottom:1px solid var(--line);padding-bottom:6px;margin-bottom:10px;font-weight:800">
          فصل ۳: تدوین گزینه‌ها و تحلیل سناریوهای مداخله کالبدی
        </h2>
        <p style="font-size:12.5px;text-align:justify">
          چهار سناریو شامل سناریوی صفر (حفظ وضع موجود)، سناریوی ۱ (مداخله کالبدی مصوب با پارکینگ تجمیعی)، سناریوی ۲ (توسعه متراکم TOD) و سناریوی ۳ (شبکه سبز و آرام‌سازی) از حیث ۱۹ شاخص مقایسه گردیدند. سناریوی ۱ با کسب امتیاز ۸۴ از ۱۰۰ در ارزیابی چندمعیاره AHP به عنوان گزینه بهینه انتخاب گردید.
        </p>
      </div>

      <!-- Chapter 4 -->
      <div style="margin-bottom:28px">
        <h2 style="font-size:15px;color:var(--pri);border-bottom:1px solid var(--line);padding-bottom:6px;margin-bottom:10px;font-weight:800">
          فصل ۴: جمع‌بندی و پیشنهاد مصوبه کمیسیون ماده ۵ شهرداری تهران
        </h2>
        <div style="background:#F0FDF4;border:1px solid #86EFAC;border-radius:var(--r-m);padding:14px 18px;font-size:12.5px;line-height:1.75;color:#065F46">
          <b>پیشنهاد متن مصوبه:</b> با تغییر پهنه پلاک‌های هسته مرکزی به پهنه مختلط تجاری-مسکونی با سقف تراکم ۳۲۰٪، سطح اشغال ۵۵٪ و الزام به تأمین ۱۰۰٪ پارکینگ در محل یا در پارکینگ تجمیعی مصوب، به همراه الحاق عرصه بوستان محله‌ای لاله به فضای سبز عمومی موافقت می‌گردد.
        </div>
      </div>

      <!-- Formal Signatures Box -->
      <div style="border-top:2px solid var(--line-strong);padding-top:20px;display:grid;grid-template-columns:repeat(4,1fr);gap:16px;text-align:center;font-size:12px">
        <div>
          <div class="muted">تحلیلگر شهری پرونده:</div>
          <b style="display:block;margin:8px 0 4px 0">${s.owner || 'مهندس زهرا کاظمی'}</b>
          <span class="bdg b-ok plain" style="font-size:10px">امضا شده ✓</span>
        </div>
        <div>
          <div class="muted">متولی داده و سامانه‌ها:</div>
          <b style="display:block;margin:8px 0 4px 0">سارا نوروزی</b>
          <span class="bdg b-ok plain" style="font-size:10px">امضا شده ✓</span>
        </div>
        <div>
          <div class="muted">بازبین فنی و کارشناسی:</div>
          <b style="display:block;margin:8px 0 4px 0">دکتر مرتضی رحیمی</b>
          <span class="bdg b-ok plain" style="font-size:10px">تأیید رسمی ✓</span>
        </div>
        <div>
          <div class="muted">دبیرخانه کمیسیون ماده ۵:</div>
          <b style="display:block;margin:8px 0 4px 0">دکتر علیرضا زاکانی</b>
          <span class="bdg b-ok plain" style="font-size:10px;background:#059669;color:#FFF">مصوب و ابلاغ‌شده 🔒</span>
        </div>
      </div>
    </div>
  </div>`;
}"""

study_review_func = """function StudyReview(id){
  const s = byId(id);
  const a = (STATE.studyAn && STATE.studyAn[id]) || { done: true };
  const isLocked = isStudyLocked(s);

  return `
  <div style="margin-top:14px">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:14px">
      <div>
        <h2 style="font-size:16px;margin:0 0 4px 0">میز داوری و بررسی فنی مطالعه</h2>
        <span class="muted" style="font-size:12px">کنترل چک‌لیست مقررات، صحت‌سنجی خروجی‌ها و صدور تصمیم نهایی</span>
      </div>
      <div>
        ${isLocked ? `
          <span class="bdg b-ok plain" style="font-weight:700;padding:6px 14px;background:#059669;color:#FFF">
            🔒 مصوب و نهایی‌شده
          </span>
        ` : `
          <button class="btn btn-pri" id="btn-approve-study" style="background:#059669;border-color:#059669;font-weight:700">
            ${ico.check} تأیید رسمی مطالعه و صدور مصوبه
          </button>
        `}
      </div>
    </div>

    <div class="split" style="gap:16px">
      <div style="flex:2;display:flex;flex-direction:column;gap:14px">
        ${Card('چک‌لیست داوری فنی و کنترل الزامات مقرراتی', `
          <div class="card-b" style="font-size:12.5px;display:grid;gap:10px">
            <div style="display:flex;align-items:center;gap:10px;background:#F0FDF4;padding:8px 12px;border-radius:6px;border:1px solid #BBF7D0">
              <span style="color:#059669;font-weight:700;font-size:14px">✓</span>
              <div style="flex:1"><b>صحت هندسی و کاداستر پلاک‌ها:</b> توپولوژی شبکه و مرز پلاک‌ها فاقد تداخل است.</div>
            </div>
            <div style="display:flex;align-items:center;gap:10px;background:#F0FDF4;padding:8px 12px;border-radius:6px;border:1px solid #BBF7D0">
              <span style="color:#059669;font-weight:700;font-size:14px">✓</span>
              <div style="flex:1"><b>انطباق ضوابط پهنه‌بندی طرح تفصیلی:</b> سقف تراکم ۳۲۰٪ و سطح اشغال ۵۵٪ مورد تأیید است.</div>
            </div>
            <div style="display:flex;align-items:center;gap:10px;background:#F0FDF4;padding:8px 12px;border-radius:6px;border:1px solid #BBF7D0">
              <span style="color:#059669;font-weight:700;font-size:14px">✓</span>
              <div style="flex:1"><b>جبران کامل کسری پارکینگ:</b> پارکینگ عمومی تجمیعی ۴۲۰ واحدی تراز کسری را به صفر رسانده است.</div>
            </div>
            <div style="display:flex;align-items:center;gap:10px;background:#F0FDF4;padding:8px 12px;border-radius:6px;border:1px solid #BBF7D0">
              <span style="color:#059669;font-weight:700;font-size:14px">✓</span>
              <div style="flex:1"><b>کفایت سرانه‌های خدماتی و فضای سبز:</b> سرانه فضای سبز به ۵٫۲ متر مربع بر نفر ارتقا یافته است.</div>
            </div>
            <div style="display:flex;align-items:center;gap:10px;background:#F0FDF4;padding:8px 12px;border-radius:6px;border:1px solid #BBF7D0">
              <span style="color:#059669;font-weight:700;font-size:14px">✓</span>
              <div style="flex:1"><b>ایمنی ترافیکی و شبکه امداد:</b> زمان دسترسی اضطراری به ۱٫۸ دقیقه کاهش یافته است.</div>
            </div>
          </div>
        `)}

        ${Card('یادداشت‌ها و نظرات داوری کارشناسی اعضای تیم', `
          <div class="card-b" style="font-size:12px;display:grid;gap:10px">
            <div style="border-right:3px solid var(--pri);padding-right:10px">
              <b>دکتر مرتضی رحیمی (بازبین فنی):</b> با توجه به نتایج ماژول M05 و جبران کامل کسری پارکینگ و الحاق فضای سبز، سناریوی ۱ کاملاً موجه و قابل تصویب در کمیسیون است.
              <div class="muted" style="font-size:11px;margin-top:2px">۱۴۰۵/۰۶/۲۳</div>
            </div>
            <div style="border-right:3px solid #059669;padding-right:10px">
              <b>مهندس پروانه شمس (کارشناس حمل‌ونقل):</b> شبکه معابر کشش بار ترافیکی جدید را داراست و احداث پارکینگ تجمیعی مانع پارک حاشیه‌ای در شریان مطهری خواهد شد.
              <div class="muted" style="font-size:11px;margin-top:2px">۱۴۰۵/۰۶/۲۲</div>
            </div>
          </div>
        `)}
      </div>

      <div style="flex:1;min-width:280px;display:flex;flex-direction:column;gap:14px">
        ${Card('مشخصات مصوبه کمیسیون ماده ۵', `
          <div class="card-b" style="font-size:12px;display:grid;gap:8px">
            <div><span class="muted">وضعیت داوری:</span> <span class="bdg b-ok plain">تأیید کامل بدون قید</span></div>
            <div><span class="muted">شماره مصوبه:</span> <b class="code">مصوبه ۱۲/۴۰۵ کمیسیون ماده ۵</b></div>
            <div><span class="muted">تاریخ تشکیل جلسه:</span> <b class="num">۱۴۰۵/۰۶/۲۳</b></div>
            <div><span class="muted">کد رهگیری سامانه شهرسازی:</span> <b class="code">TX-1405-99214</b></div>
          </div>
        `, { foot: 'مصوبه به صورت الکترونیکی در کارتابل شهرداری منطقه ۶ بارگذاری شد.' })}
      </div>
    </div>
  </div>`;
}"""

study_tasks_func = """function StudyTasks(id){
  const s = byId(id);
  const tasks = (DB.tasks || []).filter(t => t.studyId === id);
  return `
  <div style="margin-top:14px">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:14px">
      <div>
        <h2 style="font-size:16px;margin:0 0 4px 0">وظایف و پیگیری‌های مطالعه</h2>
        <span class="muted" style="font-size:12px">وظایف محوله به اعضای تیم مطالعه</span>
      </div>
      <button class="btn btn-sm btn-pri" onclick="toast('وظیفه جدید ثبت شد')">${ico.plus} ثبت وظیفه جدید</button>
    </div>

    ${Card('فهرست اقدامات و وظایف', `
      <div class="tw">
        <table class="tbl">
          <thead>
            <tr>
              <th>عنوان اقدام</th>
              <th>مسئول انجام</th>
              <th>موعد تحویل</th>
              <th>وضعیت</th>
            </tr>
          </thead>
          <tbody>
            ${(tasks.length ? tasks : [
              { t: 'تکمیل سیاهه فصل صفر و تثبیت داده‌ها', assignee: s.owner, due: '۱۴۰۵/۰۶/۲۰', st: 'done' },
              { t: 'شبیه‌سازی کامل ماژول‌های ۱۲گانه', assignee: s.owner, due: '۱۴۰۵/۰۶/۲۳', st: 'done' },
              { t: 'تدوین گزارش ۵ فصلی و مصوبه نهایی', assignee: s.owner, due: '۱۴۰۵/۰۶/۲۵', st: 'done' },
            ]).map(t => `
              <tr>
                <td><b>${t.t}</b></td>
                <td>${t.assignee}</td>
                <td class="num">${t.due}</td>
                <td><span class="bdg ${t.st==='done'?'b-ok':'b-run'}">${t.st==='done'?'انجام شد':'در حال انجام'}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `)}
  </div>`;
}"""

# New bindStudyPage
new_bind_study_page = """function bindStudyPage(id, tab){
  bindRows();
  const ovNextRun = el('#btn-overview-next-run');
  if(ovNextRun) ovNextRun.onclick = () => startStudyAnalysis(id);

  const printBtn = el('#btn-print-study-report');
  if(printBtn) printBtn.onclick = () => window.print();

  const approveBtn = el('#btn-approve-study');
  if(approveBtn) {
    approveBtn.onclick = () => {
      const s = byId(id);
      if(s){
        s.status = 'ready';
        s.locked = true;
        s.finalized = true;
        s.prog = 100;
        s.stage = 13;
        saveDB();
        render();
        toast('✅ مطالعه با موفقیت تأیید رسمی شد و پرونده به سامانه مصوبات ابلاغ گردید.', true);
      }
    };
  }

  els('.gis-parcel').forEach(p => {
    p.onclick = () => {
      const pcode = p.dataset.pcode || 'P-1405-01';
      const ptype = p.dataset.ptype || 'مسکونی';
      const parea = p.dataset.parea || '۴۰۰ م²';
      const pfar = p.dataset.pfar || '۳۰۰٪';
      const pstatus = p.dataset.pstatus || 'منطبق';

      const codeEl = el('#gis-inspector-code');
      const typeEl = el('#gis-inspector-type');
      const areaEl = el('#gis-inspector-area');
      const farEl = el('#gis-inspector-far');
      const badgeEl = el('#gis-inspector-badge');

      if(codeEl) codeEl.textContent = pcode;
      if(typeEl) typeEl.textContent = ptype;
      if(areaEl) areaEl.textContent = parea;
      if(farEl) farEl.textContent = pfar;
      if(badgeEl) badgeEl.textContent = pstatus;

      els('.gis-parcel').forEach(x => x.style.strokeWidth = '1.2');
      p.style.strokeWidth = '3';
      toast(`پلاک ثبتی ${pcode} انتخاب شد: ${ptype}`);
    };
  });

  const toggleLayer = (chkId, layerId) => {
    const chk = el('#' + chkId);
    const layer = el('#' + layerId);
    if(chk && layer){
      chk.onchange = () => {
        layer.style.display = chk.checked ? 'inline' : 'none';
      };
    }
  };
  toggleLayer('chk-ly-bound', 'layer-boundary');
  toggleLayer('chk-ly-parcels', 'layer-parcels');
  toggleLayer('chk-ly-roads', 'layer-roads');
  toggleLayer('chk-ly-proposal', 'layer-proposal');
}
window.bindStudyPage = bindStudyPage;"""

# Replace old bindStudyPage
old_bind_study_page = """function bindStudyPage(id, tab){
  bindRows();
  const ovNextRun = el('#btn-overview-next-run');
  if(ovNextRun) ovNextRun.onclick = () => startStudyAnalysis(id);
}
window.bindStudyPage = bindStudyPage;"""

assert old_bind_study_page in content, "old_bind_study_page not found"

all_new_components = "\n\n".join([
    tabs_bar_func,
    study_map_func,
    study_scenarios_func,
    study_models_func,
    study_runs_func,
    study_indicators_func,
    study_rules_func,
    study_evidence_func,
    study_reports_func,
    study_review_func,
    study_tasks_func,
    new_bind_study_page
])

content = content.replace(old_bind_study_page, all_new_components)

# Now update the body of StudyPage(id,tab='overview')
# Let's see the else block in StudyPage
old_study_page_tabs_def = """  const tabs=`<div class="tabs">${STUDY_TABS.map(([k,t])=>
    `<a class="tab ${k===tab?'on':''}" href="#/study/${id}/${k}">${t}${k==='chapter0'&&czSummary(id).blockers.length?`<span class="pill num" style="background:var(--stop-050);color:var(--stop)">${fa(czSummary(id).blockers.length)}</span>`:''}</a>`).join('')}</div>`;"""

new_study_page_tabs_def = """  const rawTab = (tab || 'overview').toLowerCase();
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
  };
  const activeTab = tabAliases[rawTab] || rawTab;
  const tabs = StudyTabsBar(id, activeTab);"""

assert old_study_page_tabs_def in content, "old_study_page_tabs_def not found"
content = content.replace(old_study_page_tabs_def, new_study_page_tabs_def)

# Replace the else routing inside StudyPage
old_study_page_else = """  } else if(tab==='data'){
    body=StudyData(id);
  } else if(tab==='history'){
    body=StudyHistory(id);
  } else {
    const phase={chapter0:'۳',chapters:'۱۰',tasks:'۲',data:'۴',map:'۵',rules:'۶',indicators:'۶',models:'۸',scenarios:'۷',runs:'۸',evidence:'۱۰',reports:'۱۰',review:'۱۱',history:'۱۲'}[tab];
    const label=STUDY_TABS.find(([k])=>k===tab)[1];
    body=`<div style="margin-top:14px">${Card('',State('layers',`بخش «${label}» در فاز ${phase} ساخته می‌شود`,
      'این نمونه به‌صورت فازی ساخته می‌شود. فاز ۱ شامل ورود، پوسته برنامه، داشبورد من، فهرست مطالعات و کارتابل مطالعه است. تب‌های دیگر در فازهای بعدی با همان زبان طراحی تکمیل می‌شوند.',
      `<a class="btn btn-pri" href="#/study/${id}">بازگشت به نمای کلی</a>`))}</div>`;
  }"""

new_study_page_else = """  } else if(activeTab==='data'){
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

assert old_study_page_else in content, "old_study_page_else not found"
content = content.replace(old_study_page_else, new_study_page_else)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('Update phase 2 completed successfully!')
