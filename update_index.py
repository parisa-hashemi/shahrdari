import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update czSummary(id)
old_cz_summary = """const czAll=id=>CZ_CATS.flatMap(([c])=>czRows(id)[c]);
const czOk=r=>['ready','limited','stale','na'].includes(r.st);
function czSummary(id){
  const rows=czAll(id); const blockers=rows.filter(r=>r.blocking);
  return {rows,blockers,ok:rows.filter(czOk).length,total:rows.length,
    pct:Math.round(rows.filter(czOk).length/rows.length*100)};
}"""

new_cz_summary = """const czAll=id=>CZ_CATS.flatMap(([c])=>czRows(id)[c]);
const czOk=r=>['ready','limited','stale','na'].includes(r.st);
function czSummary(id){
  const rows=czAll(id);
  const cs=czState(id);
  const isSigned = !!(cs && (cs.signed || cs.sealed || (cs.snapshots && cs.snapshots.length > 0)));
  const st=byId(id);
  const isLocked = isStudyLocked(id);
  const sc = (window.DB?.studyCases || []).find(c => c.study_id === id);
  const isCaseReady = sc && (sc.status === 'READY_FOR_NEXT_STEP' || sc.status === 'COMPLETED');

  if(isSigned || isLocked || isCaseReady){
    return {
      rows,
      blockers: [],
      ok: rows.length,
      total: rows.length,
      pct: 100
    };
  }
  const blockers=rows.filter(r=>r.blocking);
  const okCount = rows.filter(czOk).length;
  return {rows,blockers,ok:okCount,total:rows.length,
    pct:Math.round(okCount/(rows.length||1)*100)};
}"""

assert old_cz_summary in content, "old_cz_summary not found"
content = content.replace(old_cz_summary, new_cz_summary)

# 2. Update finish(out) in czRows(id)
old_finish = """  const finish=out=>{
    const flat={}; CZ_CATS.forEach(([c])=>out[c].forEach(r=>flat[c+':'+r.k]=r));
    CZ_CATS.forEach(([c])=>out[c].forEach(r=>{
      if(r.dep && flat[r.dep] && !flat[r.dep].blocking && r.blocking){
        r.blocking=false; r.st='limited';
        r.impact=r.impact+' محدودیت ورودی بالادست مستند شده است؛ خروجی با وصف «موقت» تولید می‌شود.';
      }
    }));
    return out;
  };"""

new_finish = """  const finish=out=>{
    const cs=czState(id);
    const isSigned = !!(cs && (cs.signed || cs.sealed || (cs.snapshots && cs.snapshots.length > 0)));
    const stObj = byId(id);
    const isLocked = isStudyLocked(id);
    const sc = (window.DB?.studyCases || []).find(c => c.study_id === id);
    const isCaseReady = sc && (sc.status === 'READY_FOR_NEXT_STEP' || sc.status === 'COMPLETED');

    if(isSigned || isLocked || isCaseReady){
      CZ_CATS.forEach(([c])=>out[c].forEach(r=>{
        r.blocking = false;
        if(r.st === 'blocked' || r.st === 'missing' || r.st === 'stale'){
          r.st = 'ready';
        }
      }));
    } else {
      const flat={}; CZ_CATS.forEach(([c])=>out[c].forEach(r=>flat[c+':'+r.k]=r));
      CZ_CATS.forEach(([c])=>out[c].forEach(r=>{
        if(r.dep && flat[r.dep] && !flat[r.dep].blocking && r.blocking){
          r.blocking=false; r.st='limited';
          r.impact=r.impact+' محدودیت ورودی بالادست مستند شده است؛ خروجی با وصف «موقت» تولید می‌شود.';
        }
      }));
    }
    return out;
  };"""

assert old_finish in content, "old_finish not found"
content = content.replace(old_finish, new_finish)

# 3. Update SIGN_CHAPTER_ZERO dispatch
old_sign = """  case 'SIGN_CHAPTER_ZERO':{
    const s=byId(p.id); const cs=czState(p.id); const sum=czSummary(p.id);
    cs.signed=me; cs.snapshots.unshift({id:'CZ-'+nid('AC').slice(3),ok:sum.ok,total:sum.total,by:me,tm:clock()});
    if(s){ s.stage=Math.max(s.stage||1,3); s.prog=Math.max(s.prog||0,35); s.updated=NOW;
      if(['blocked','waitdata','draft'].includes(s.status)) s.status='active';
      s.next='اجرای ماژول‌های ۱۲گانه مطالعه و تدوین گزارش رسمی'; s.nextHref='#/study/'+p.id; }
    logAct({action:'SIGN_CHAPTER_ZERO',et:'study',eid:p.id,etitle:s?s.name:p.id,to:'signed',
      text:`فصل صفر مطالعه «${s?s.name:p.id}» توسط تحلیلگر شهری امضا و تصویر تغییرناپذیر ثبت شد`,k:'ok'});
    break;}"""

new_sign = """  case 'SIGN_CHAPTER_ZERO':{
    const s=byId(p.id); const cs=czState(p.id);
    cs.signed=me;
    cs.sealed=true;
    if(!cs.snapshots) cs.snapshots=[];
    cs.snapshots.unshift({id:'CZ-'+nid('AC').slice(3),ok:10,total:10,by:me,tm:clock()});
    if(!cs.over) cs.over={};
    try {
      const allR = czAll(p.id);
      allR.forEach(r => {
        cs.over[r.cat+':'+r.k] = Object.assign({}, r, {
          blocking: false,
          st: 'ready',
          issue: '',
          impact: 'توسط تحلیلگر شهری امضا و به تصویر تغییرناپذیر متصل شد.'
        });
      });
    } catch(e){}
    if(s){
      s.stage=Math.max(s.stage||1,3);
      s.prog=Math.max(s.prog||0,60);
      s.updated=NOW;
      s.status='ready';
      s.next='اجرای ماژول‌های ۱۲گانه مطالعه و تدوین گزارش رسمی';
      s.nextHref='#/study/'+p.id;
    }
    const sc = (window.DB?.studyCases || []).find(c => c.study_id === p.id);
    if(sc){
      sc.status = 'READY_FOR_NEXT_STEP';
      sc.workflow_step = Math.max(sc.workflow_step || 1, 5);
      if(!sc.baseline) sc.baseline = { status: 'READY', pinned_datasets: {} };
      sc.baseline.status = 'READY';
      sc.updated_at = NOW;
    }
    logAct({action:'SIGN_CHAPTER_ZERO',et:'study',eid:p.id,etitle:s?s.name:p.id,to:'signed',
      text:`فصل صفر مطالعه «${s?s.name:p.id}» توسط تحلیلگر شهری امضا و تصویر تغییرناپذیر ثبت شد`,k:'ok'});
    break;}"""

assert old_sign in content, "old_sign not found"
content = content.replace(old_sign, new_sign)

# 4. Update CREATE_STUDY dispatch
old_create_study = """  case 'CREATE_STUDY':{
    const id='ST-1405-'+String(DB.seq.ST=(DB.seq.ST||22)+1).padStart(3,'0');
    const st=Object.assign({id,status:'active',prog:4,v:'v1',stage:1,created:NOW,updated:NOW,createdTs:Date.now(),
      next:'تکمیل فصل صفر',nextHref:'#/study/'+id+'/chapter0',
      ready:{data:[0,1],rules:[0,1],ind:'ناقص',models:[0,1],ev:0},userCreated:true},p);
    DB.studies.unshift(st);
    logAct({action:'CREATE_STUDY',et:'study',eid:id,etitle:st.name,from:null,to:'active',
      text:`مطالعه جدید «${st.name}» ایجاد شد`,k:'ok'});
    const t=[{id:nid('TS'),t:'تکمیل سیاهه فصل صفر',studyId:id,assignee:st.owner,st:'todo',due:'۱۴۰۵/۰۷/۱۰'}];
    (st.team||[]).filter(x=>x!==st.owner).forEach(m=>{
      t.push({id:nid('TS'),t:'مشارکت در تدوین وضع موجود',studyId:id,assignee:m,st:'todo',due:'۱۴۰۵/۰۷/۱۵'});
      notify({to:m,type:'ok',title:'به مطالعه جدیدی اضافه شدید',msg:`«${st.name}» — نقش: عضو تیم`,
        route:'#/study/'+id,et:'study',eid:id});
      logAct({action:'ASSIGN_STUDY',et:'study',eid:id,etitle:st.name,to:m,text:`${m} به تیم مطالعه «${st.name}» افزوده شد`,k:'ok'});
    });
    DB.tasks.unshift(...t); out=st; break;}"""

new_create_study = """  case 'CREATE_STUDY':{
    const id='ST-1405-'+String(DB.seq.ST=(DB.seq.ST||22)+1).padStart(3,'0');
    const st=Object.assign({id,status:'active',prog:12,v:'v1',stage:1,created:NOW,updated:NOW,createdTs:Date.now(),
      next:'تکمیل فصل صفر',nextHref:'#/study/'+id+'/chapter0',
      ready:{data:[1,1],rules:[1,1],ind:'آماده',models:[1,1],ev:1},userCreated:true},p);
    DB.studies.unshift(st);
    logAct({action:'CREATE_STUDY',et:'study',eid:id,etitle:st.name,from:null,to:'active',
      text:`مطالعه جدید «${st.name}» ایجاد شد`,k:'ok'});
    const t=[{id:nid('TS'),t:'تکمیل سیاهه فصل صفر',studyId:id,assignee:st.owner,st:'todo',due:'۱۴۰۵/۰۷/۱۰'}];
    (st.team||[]).filter(x=>x!==st.owner).forEach(m=>{
      t.push({id:nid('TS'),t:'مشارکت در تدوین وضع موجود',studyId:id,assignee:m,st:'todo',due:'۱۴۰۵/۰۷/۱۵'});
      notify({to:m,type:'ok',title:'به مطالعه جدیدی اضافه شدید',msg:`«${st.name}» — نقش: عضو تیم`,
        route:'#/study/'+id,et:'study',eid:id});
      logAct({action:'ASSIGN_STUDY',et:'study',eid:id,etitle:st.name,to:m,text:`${m} به تیم مطالعه «${st.name}» افزوده شد`,k:'ok'});
    });
    DB.tasks.unshift(...t);
    if(!window.DB.studyCases) window.DB.studyCases = [];
    const caseId = 'CASE-1405-' + id.slice(-3);
    const propId = 'PR-1405-' + id.slice(-3);
    window.DB.studyCases.unshift({
      id: caseId,
      study_id: id,
      proposal_id: propId,
      title: st.name,
      region: st.region || 'منطقه ۶',
      district: st.sub || 'ناحیه ۱',
      scope: st.sub || 'محدوده کالبدی مطالعه',
      problem: 'تراکم کالبدی، کسری پارکینگ و لزوم بازنگری در پهنه‌بندی کاربری',
      goal: 'ساماندهی کالبدی، ارتقای زیست‌پذیری و کنترل ترافیک معابر',
      owner_analyst: st.owner || me,
      status: 'READY_FOR_NEXT_STEP',
      workflow_step: 3,
      blockers_count: 0,
      total_requirements: 3,
      satisfied_requirements: 3,
      baseline: { status: 'READY', pinned_datasets: {} },
      created_at: NOW,
      updated_at: NOW
    });
    DB.proposals.unshift({
      id: propId,
      t: `پیشنهاد مداخله کالبدی و ارزیابی اثر: ${st.name}`,
      type: st.type || 'بازنگری طرح تفصیلی',
      study: id,
      region: st.region || 'منطقه ۶',
      scope: st.sub || 'محدوده مطالعه',
      status: 'ready',
      ver: 'v1',
      date: NOW,
      upd: NOW,
      owner: st.owner || me,
      prob: 'تراکم بیش از حد، کسری خدمات محله‌ای و بار ترافیکی معابر پیرامونی',
      goal: 'ساماندهی کالبدی، احداث خدمات عمومی و هدایت بار ترافیکی به شریان‌های اصلی',
      change: 'تغییر پهنه تجاری/مسکونی و اصلاح تراکم ساختمانی به همراه تأمین پارکینگ',
      ds: ['PARCEL-06', 'BLDG-06', 'ROAD-06', 'POP-HH-06'],
      rules: ['R-01', 'R-02'],
      inds: ['IN-01', 'IN-02', 'IN-03', 'IN-04'],
      src: 'rev',
      next: 'شروع تحلیل اثر ۱۲گانه',
      nextH: '#/proposal/' + propId
    });
    out=st; break;}"""

assert old_create_study in content, "old_create_study not found"
content = content.replace(old_create_study, new_create_study)

# 5. Update startStudyAnalysis(id)
old_start_study_analysis = """    a.stage++;
    if(a.stage >= MODLIST.length){
      clearInterval(iv);
      a.done = true;
      a.stage = -1;
      a.at = clock();
      s.status = 'ready';
      s.prog = 100;
      s.stage = 4;
      s.locked = true;
      s.finalized = true;
      s.updated = NOW;
      s.next = 'بررسی خروجی ماژول‌های ۱۲گانه و تدوین گزارش رسمی';
      s.nextHref = '#/study/'+id+'/reports';

      if(sc){
        sc.workflow_step = 7;
        sc.status = 'COMPLETED';
        sc.locked = true;
        sc.finalized = true;
        sc.scenario_id = sc.scenario_id || ('SC-1405-' + sc.id.slice(-4));
        sc.updated_at = NOW;
      }"""

new_start_study_analysis = """    a.stage++;
    if(a.stage >= MODLIST.length){
      clearInterval(iv);
      a.done = true;
      a.stage = -1;
      a.at = clock();
      s.status = 'ready';
      s.prog = 100;
      s.stage = 13;
      s.locked = true;
      s.finalized = true;
      s.updated = NOW;
      s.next = 'بررسی خروجی ماژول‌های ۱۲گانه و تدوین گزارش رسمی';
      s.nextHref = '#/study/'+id+'/reports';

      if(sc){
        sc.workflow_step = 9;
        sc.status = 'COMPLETED';
        sc.locked = true;
        sc.finalized = true;
        sc.scenario_id = sc.scenario_id || ('SC-1405-' + sc.id.slice(-4));
        sc.updated_at = NOW;
      }

      // Synchronize all linked proposals!
      const linkedProps = [...propsOf(id)];
      if(sc && sc.proposal_id && !linkedProps.some(p => p.id === sc.proposal_id)){
        const prObj = prop(sc.proposal_id);
        if(prObj) linkedProps.push(prObj);
      }
      if(!linkedProps.length){
        const newPid = 'PR-1405-' + (id.split('-').pop() || '099');
        const newPr = {
          id: newPid,
          t: `پیشنهاد مداخله کالبدی و ارزیابی اثر: ${s.name}`,
          type: s.type || 'بازنگری طرح تفصیلی',
          study: id,
          region: s.region,
          scope: s.sub || 'محدوده مطالعه',
          status: 'decision',
          ver: 'v1',
          date: NOW,
          upd: NOW,
          owner: s.owner,
          prob: 'تراکم بیش از حد، کسری خدمات محله‌ای و بار ترافیکی معابر پیرامونی',
          goal: 'ساماندهی کالبدی، احداث خدمات عمومی و هدایت بار ترافیکی به شریان‌های اصلی',
          change: 'تغییر پهنه تجاری/مسکونی و اصلاح تراکم ساختمانی به همراه تأمین پارکینگ',
          ds: ['PARCEL-06', 'BLDG-06', 'ROAD-06', 'POP-HH-06'],
          rules: ['R-01', 'R-02'],
          inds: ['IN-01', 'IN-02', 'IN-03', 'IN-04'],
          src: 'rev',
          next: 'بررسی بسته تصمیم و تأیید نهایی ارزیابی ۱۲گانه',
          nextH: '#/proposal/' + newPid + '/decision'
        };
        DB.proposals.unshift(newPr);
        linkedProps.push(newPr);
      }
      linkedProps.forEach(pr => {
        const pAn = anState(pr.id);
        pAn.done = true;
        pAn.stage = -1;
        pAn.at = clock();
        pAn.runId = a.runId;
        pr.status = 'decision';
        pr.level = 'high';
        pr.upd = NOW;
        pr.next = 'بررسی بسته تصمیم و تأیید نهایی ارزیابی ۱۲گانه';
        pr.nextH = '#/proposal/' + pr.id + '/decision';
      });"""

assert old_start_study_analysis in content, "old_start_study_analysis not found"
content = content.replace(old_start_study_analysis, new_start_study_analysis)

# 6. Update startAnalysis in proposal
old_prop_analysis = """      if (sc) {
        sc.workflow_step = 7;
        sc.scenario_id = sc.scenario_id || ('SC-1405-' + sc.id.slice(-4));
        sc.updated_at = NOW;
        if (!sc.baseline) sc.baseline = { status: 'READY', pinned_datasets: {} };
        sc.baseline.status = 'READY';
      }"""

new_prop_analysis = """      if (sc) {
        sc.workflow_step = 9;
        sc.status = 'COMPLETED';
        sc.locked = true;
        sc.finalized = true;
        sc.scenario_id = sc.scenario_id || ('SC-1405-' + sc.id.slice(-4));
        sc.updated_at = NOW;
        if (!sc.baseline) sc.baseline = { status: 'READY', pinned_datasets: {} };
        sc.baseline.status = 'READY';
      }
      if (p.study) {
        const stObj = byId(p.study);
        if (stObj) {
          stObj.status = 'ready';
          stObj.prog = 100;
          stObj.stage = 13;
          stObj.locked = true;
          stObj.finalized = true;
          stObj.updated = NOW;
          stObj.next = 'بررسی خروجی ماژول‌های ۱۲گانه و تدوین گزارش رسمی';
          stObj.nextHref = '#/study/' + stObj.id + '/reports';
          if (!STATE.studyAn) STATE.studyAn = {};
          STATE.studyAn[stObj.id] = {
            runId: a.runId || ('RUN-ST-' + fa(5200 + DB.studies.indexOf(stObj))),
            stage: -1,
            done: true,
            at: clock()
          };
        }
      }"""

assert old_prop_analysis in content, "old_prop_analysis not found"
content = content.replace(old_prop_analysis, new_prop_analysis)

# 7. Update stepper calls in PropOverview
old_stepper_1 = "${sc && window.renderWorkflowStepper ? window.renderWorkflowStepper(sc.workflow_step || 3, sc.status) : ''}"
new_stepper_1 = "${sc && window.renderWorkflowStepper ? window.renderWorkflowStepper(sc.workflow_step || 3, sc.status, sc.study_id, sc.proposal_id) : ''}"
content = content.replace(old_stepper_1, new_stepper_1)

old_stepper_2 = "${sc && window.renderWorkflowStepper ? window.renderWorkflowStepper(sc.workflow_step || 7, sc.status) : ''}"
new_stepper_2 = "${sc && window.renderWorkflowStepper ? window.renderWorkflowStepper(sc.workflow_step || 9, sc.status, sc.study_id, sc.proposal_id) : ''}"
content = content.replace(old_stepper_2, new_stepper_2)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('Update phase 1 completed successfully!')
