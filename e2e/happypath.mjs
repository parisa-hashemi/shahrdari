import { chromium } from 'playwright';
const B = process.env.BASE_URL ?? 'http://127.0.0.1:4173';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport:{width:1440,height:900} });
const errs=[]; page.on('pageerror',e=>errs.push(e.message));
page.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,150));});
const log = (...a)=>console.log('•',...a);

await page.goto(B+'/login',{waitUntil:'networkidle'});
await page.getByPlaceholder('09xxxxxxxxx').fill('09121234567');
await page.getByRole('button',{name:'دریافت کد تأیید'}).click();
await page.waitForTimeout(400);
await page.getByLabel('رقم ۱ از کد تأیید').fill('1');
for (const [i,d] of [['۲','2'],['۳','3'],['۴','4'],['۵','5'],['۶','6']]) {
  await page.getByLabel(`رقم ${i} از کد تأیید`).fill(d);
}
await page.waitForTimeout(400);
await page.getByRole('button',{name:'ورود به سامانه'}).click();
await page.waitForURL('**/journey'); log('OTP login → journey OK');

await page.goto(B+'/scenarios/new',{waitUntil:'networkidle'});
await page.getByPlaceholder('مثلاً: افزایش تراکم محور شمالی').fill('سناریو آزمایشی مسیر');
for (let i=0;i<5;i++){ await page.getByRole('button',{name:'مرحله بعد'}).click(); await page.waitForTimeout(300); }
log('wizard reached review step:', await page.locator('text=مرور نهایی').count()>0);
await page.getByRole('button',{name:'ثبت سناریو و اجرای تحلیل'}).click();
await page.waitForURL(u=>/\/scenarios\/scn-/.test(u.toString()),{timeout:20000});
log('scenario created, url =', page.url().split('/').pop());
await page.waitForTimeout(9000);
const state = await page.locator('text=تکمیل جزئی').count();
log('run finished as partial:', state>0);
const missing = await page.locator('text=مقدار موجود نیست').count();
log('missing-value cards rendered:', missing);
await page.getByRole('button',{name:'منشأ و پشتوانه نتیجه'}).first().click();
await page.waitForTimeout(600);
log('provenance drawer opened:', await page.locator('text=روش و نسخه روش').count()>0);
await page.keyboard.press('Escape');
await page.getByRole('button',{name:'ساخت بسته تصمیم'}).click();
await page.waitForTimeout(2000);
log('decision package url:', page.url());
await browser.close();
console.log('ERRORS:', errs.length?errs.slice(0,10).join(' | '):'none');
