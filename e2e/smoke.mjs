import { chromium } from 'playwright';
const B = process.env.BASE_URL ?? 'http://127.0.0.1:4173';
const routes = ['/login','/journey','/dashboard','/studies','/studies/std-1001','/datasets','/datasets/ds-parcels','/datasets/ingest','/datasets/quality','/datasets/quarantine','/datasets/compare','/datasets/connectors','/gis','/gis/compare','/rules','/scenarios','/scenarios/new','/scenarios/scn-s1','/scenarios/compare','/analysis','/analysis/M03','/models','/evidence','/reports','/reviews','/approvals','/decision-packages','/copilot','/settings','/regions'];
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(`PAGEERROR ${page.url()} :: ${e.message}`));
page.on('console', m => { if (m.type()==='error') errors.push(`CONSOLE ${page.url()} :: ${m.text().slice(0,200)}`); });
// sign in first
await page.goto(B+'/login', {waitUntil:'networkidle'});
await page.getByPlaceholder('09xxxxxxxxx').fill('09121234567');
await page.getByRole('button', {name:'دریافت کد تأیید'}).click();
await page.waitForTimeout(300);
const digits = ['۱','۲','۳','۴','۵','۶'];
for (let i = 0; i < 6; i += 1) await page.getByLabel(`رقم ${digits[i]} از کد تأیید`).fill(String(i + 1));
await page.waitForTimeout(400);
await page.getByRole('button', {name:'ورود به سامانه'}).click();
await page.waitForTimeout(800);
for (const r of routes) {
  await page.goto(B+r, {waitUntil:'networkidle'});
  await page.waitForTimeout(700);
  const h1 = await page.locator('h1').first().textContent().catch(()=>null);
  console.log(r, '=>', (h1||'(no h1)').trim().slice(0,50));
}
await browser.close();
console.log('--- ERRORS ---');
console.log(errors.length ? errors.slice(0,25).join('\n') : 'none');
