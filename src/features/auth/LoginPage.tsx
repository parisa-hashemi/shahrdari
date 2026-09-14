import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  Check,
  FlaskConical,
  Pencil,
  Route,
  ShieldCheck,
  SquareStack,
  Workflow,
} from 'lucide-react';
import { demoPersonas, useAuthStore } from '@/stores/authStore';
import { useJourneyStore } from '@/stores/journeyStore';
import { journey } from '@/app/journey';
import { Badge } from '@/components/ui/display';
import { Button } from '@/components/ui/Button';
import { roleLabels, roleScopeNotes } from '@/utils/dictionary';
import { formatNumber, normalizeDigits, toPersianDigits } from '@/utils/format';
import { cn } from '@/utils/cn';

/**
 * Sign-in with a one-time code.
 *
 * The code is not verified against a server here — there is no server. The
 * demo code is shown on screen so nobody is stuck, but the flow itself is the
 * real one: identify, verify, then choose the role the session runs as.
 */

const DEMO_CODE = '123456';
const CODE_LENGTH = 6;
const RESEND_SECONDS = 90;

const PROMISES = [
  {
    icon: SquareStack,
    title: 'عدد بدون منشأ نداریم',
    body: 'هر نتیجه، روش و نسخه داده و قانون خودش را همراه دارد و قابل ردیابی است.',
  },
  {
    icon: ShieldCheck,
    title: 'نبودِ نتیجه، صفر نیست',
    body: 'وقتی ورودی لازم موجود نباشد، سامانه با دلیل مشخص اعلام می‌کند، نه با عدد جایگزین.',
  },
  {
    icon: Workflow,
    title: 'تأیید، رویداد گردش‌کار است',
    body: 'تأیید در سامانه به‌معنای اعتبار قانونی یا صدور مجوز نیست و این تمایز حفظ می‌شود.',
  },
];

const FEATURED = ['usr-expert', 'usr-reviewer', 'usr-authority', 'usr-secretariat'];

const isValidMobile = (value: string) => /^09\d{9}$/.test(normalizeDigits(value));

function StepDots({ current }: { current: number }) {
  const labels = ['شماره همراه', 'کد تأیید', 'انتخاب نقش'];
  return (
    <ol className="mb-6 flex items-center gap-2">
      {labels.map((label, index) => (
        <li key={label} className="flex items-center gap-2">
          <span
            className={cn(
              'num inline-flex h-6 w-6 items-center justify-center rounded-full border text-2xs font-semibold',
              index < current
                ? 'border-success bg-success text-white'
                : index === current
                  ? 'border-primary-600 bg-primary-600 text-white'
                  : 'border-border-strong text-faint',
            )}
          >
            {index < current ? <Check size={12} /> : toPersianDigits(index + 1)}
          </span>
          <span className={cn('text-xs', index === current ? 'font-medium' : 'text-muted')}>{label}</span>
          {index < labels.length - 1 && <span className="mx-1 h-px w-5 bg-border-strong" aria-hidden />}
        </li>
      ))}
    </ol>
  );
}

/** Six single-character boxes, LTR, with paste and backspace handling. */
function CodeInput({
  value,
  onChange,
  invalid,
  onComplete,
}: {
  value: string;
  onChange: (next: string) => void;
  invalid: boolean;
  onComplete: (code: string) => void;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  const setChar = (index: number, char: string) => {
    const next = value.padEnd(CODE_LENGTH, ' ').split('');
    next[index] = char || ' ';
    const joined = next.join('').replace(/\s+$/, '');
    onChange(joined);
    if (char && index < CODE_LENGTH - 1) refs.current[index + 1]?.focus();
    const clean = joined.replace(/\s/g, '');
    if (clean.length === CODE_LENGTH) onComplete(clean);
  };

  return (
    <div dir="ltr" className="flex justify-center gap-2">
      {Array.from({ length: CODE_LENGTH }).map((_, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          aria-label={`رقم ${toPersianDigits(index + 1)} از کد تأیید`}
          maxLength={1}
          value={value[index]?.trim() ?? ''}
          onChange={(event) => {
            const char = normalizeDigits(event.target.value).replace(/\D/g, '').slice(-1);
            setChar(index, char);
          }}
          onPaste={(event) => {
            event.preventDefault();
            const pasted = normalizeDigits(event.clipboardData.getData('text'))
              .replace(/\D/g, '')
              .slice(0, CODE_LENGTH);
            if (!pasted) return;
            onChange(pasted);
            if (pasted.length === CODE_LENGTH) onComplete(pasted);
            refs.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Backspace' && !value[index]?.trim() && index > 0) {
              refs.current[index - 1]?.focus();
            }
          }}
          className={cn(
            'num h-12 w-11 rounded-lg border text-center text-lg font-semibold outline-none transition-colors',
            invalid
              ? 'border-danger bg-danger-bg'
              : 'border-border-strong bg-surface focus:border-primary-500 focus:ring-2 focus:ring-primary-100',
          )}
        />
      ))}
    </div>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const signIn = useAuthStore((s) => s.signIn);
  const setJourneyActive = useJourneyStore((s) => s.setActive);
  const resetJourney = useJourneyStore((s) => s.reset);

  const [step, setStep] = useState(0);
  const [mobile, setMobile] = useState('');
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState(false);
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const [selected, setSelected] = useState(demoPersonas[0]?.id ?? '');
  const [guided, setGuided] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const featured = useMemo(
    () => demoPersonas.filter((p) => FEATURED.includes(p.id)),
    [],
  );
  const visible = showAll ? demoPersonas : featured.length > 0 ? featured : demoPersonas.slice(0, 4);

  useEffect(() => {
    if (step !== 1 || seconds <= 0) return;
    const timer = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [step, seconds]);

  const sendCode = () => {
    setStep(1);
    setCode('');
    setCodeError(false);
    setSeconds(RESEND_SECONDS);
  };

  const verify = (submitted: string) => {
    if (submitted === DEMO_CODE) {
      setCodeError(false);
      setStep(2);
    } else {
      setCodeError(true);
    }
  };

  const enter = () => {
    signIn(selected);
    setJourneyActive(guided);
    resetJourney();
    navigate(guided ? '/journey' : '/dashboard');
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_420px]">
      <main className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-2xl">
          <div className="mb-6 flex items-center gap-2.5 lg:hidden">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white">
              <Building2 size={18} />
            </span>
            <span className="text-[15px] font-semibold">سامانه هوشمند برنامه‌ریزی شهری تهران</span>
          </div>

          <StepDots current={step} />

          {/* ---------------------------------------------------- step 1 */}
          {step === 0 && (
            <section>
              <h1 className="text-2xl font-semibold leading-9">ورود به سامانه</h1>
              <p className="mt-2 max-w-xl text-[13px] leading-7 text-muted">
                شماره همراه سازمانی خود را وارد کنید. کد تأیید یک‌بارمصرف برای همان شماره ارسال می‌شود.
              </p>

              <label className="mt-6 block max-w-sm">
                <span className="mb-1.5 block text-[13px] font-medium">شماره همراه</span>
                <input
                  dir="ltr"
                  inputMode="numeric"
                  autoComplete="tel"
                  value={mobile}
                  onChange={(event) => setMobile(normalizeDigits(event.target.value).replace(/\D/g, '').slice(0, 11))}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && isValidMobile(mobile)) sendCode();
                  }}
                  placeholder="09xxxxxxxxx"
                  className="num h-11 w-full rounded-lg border border-border-strong bg-surface px-3 text-center text-[15px] outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                />
                <span className="mt-1.5 block text-2xs text-muted">
                  در این محیط نمایشی پیامکی ارسال نمی‌شود؛ هر شماره معتبری کار می‌کند.
                </span>
              </label>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button
                  variant="primary"
                  size="lg"
                  disabledReason={
                    isValidMobile(mobile) ? null : 'شماره همراه یازده‌رقمی و با ۰۹ شروع شود.'
                  }
                  onClick={sendCode}
                >
                  دریافت کد تأیید
                </Button>
                <span className="flex items-center gap-1.5 text-xs text-muted">
                  <FlaskConical size={13} />
                  داده‌ها نمونه‌اند و مبنای رسمی شهرداری نیستند.
                </span>
              </div>
            </section>
          )}

          {/* ---------------------------------------------------- step 2 */}
          {step === 1 && (
            <section>
              <h1 className="text-2xl font-semibold leading-9">کد تأیید را وارد کنید</h1>
              <p className="mt-2 text-[13px] leading-7 text-muted">
                کد شش‌رقمی برای شماره{' '}
                <span className="num font-medium text-text">{toPersianDigits(mobile)}</span> ارسال شد.
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="ms-2 inline-flex items-center gap-1 text-primary-700 hover:underline"
                >
                  <Pencil size={12} />
                  ویرایش شماره
                </button>
              </p>

              <div className="mt-6 max-w-sm">
                <CodeInput
                  value={code}
                  onChange={(next) => {
                    setCode(next);
                    setCodeError(false);
                  }}
                  invalid={codeError}
                  onComplete={verify}
                />

                {codeError && (
                  <p className="mt-2.5 text-center text-xs text-danger">
                    کد واردشده درست نیست. دوباره تلاش کنید.
                  </p>
                )}

                <div className="mt-4 flex items-center justify-between gap-2">
                  {seconds > 0 ? (
                    <span className="num text-xs text-muted">
                      ارسال دوباره کد تا {toPersianDigits(String(Math.floor(seconds / 60)).padStart(2, '0'))}:
                      {toPersianDigits(String(seconds % 60).padStart(2, '0'))}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={sendCode}
                      className="text-xs text-primary-700 hover:underline"
                    >
                      ارسال دوباره کد
                    </button>
                  )}
                  <Button
                    variant="primary"
                    disabledReason={
                      code.replace(/\s/g, '').length === CODE_LENGTH ? null : 'کد شش‌رقمی را کامل کنید.'
                    }
                    onClick={() => verify(code.replace(/\s/g, ''))}
                  >
                    تأیید کد
                  </Button>
                </div>

                <div className="mt-5 rounded-lg border border-accent-border bg-accent-bg px-3.5 py-2.5">
                  <p className="text-2xs leading-6 text-muted">
                    محیط نمایشی — کد تأیید:{' '}
                    <span className="num text-sm font-semibold text-text">{toPersianDigits(DEMO_CODE)}</span>
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* ---------------------------------------------------- step 3 */}
          {step === 2 && (
            <section>
              <h1 className="text-2xl font-semibold leading-9">با کدام نقش وارد می‌شوید؟</h1>
              <p className="mt-2 max-w-xl text-[13px] leading-7 text-muted">
                نقش تعیین می‌کند چه چیزی می‌بینید و چه کاری می‌توانید انجام دهید. بعد از ورود هم می‌توانید
                از منوی بالای صفحه نقش را عوض کنید.
              </p>

              <fieldset className="mt-5">
                <legend className="sr-only">انتخاب نقش</legend>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {visible.map((persona) => {
                    const active = persona.id === selected;
                    return (
                      <button
                        key={persona.id}
                        type="button"
                        onClick={() => setSelected(persona.id)}
                        aria-pressed={active}
                        className={cn(
                          'flex items-start gap-3 rounded-xl border p-3.5 text-start transition-all',
                          active
                            ? 'border-primary-500 bg-primary-50 shadow-card ring-1 ring-primary-200'
                            : 'border-border bg-surface hover:border-border-strong hover:bg-surface-2',
                        )}
                      >
                        <span
                          className={cn(
                            'mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                            active ? 'border-primary-600 bg-primary-600 text-white' : 'border-border-strong',
                          )}
                          aria-hidden
                        >
                          {active && <Check size={12} />}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[13px] font-semibold">{persona.displayName}</span>
                          <span className="mt-0.5 block text-xs text-primary-700">
                            {roleLabels[persona.roles[0]]}
                          </span>
                          <span className="mt-1 block text-2xs leading-5 text-muted">
                            {roleScopeNotes[persona.roles[0]]}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                {!showAll && demoPersonas.length > visible.length && (
                  <button
                    type="button"
                    onClick={() => setShowAll(true)}
                    className="mt-2.5 text-xs text-primary-700 hover:underline"
                  >
                    نمایش همه نقش‌ها ({formatNumber(demoPersonas.length)} نقش)
                  </button>
                )}
              </fieldset>

              <label
                className={cn(
                  'mt-5 flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors',
                  guided ? 'border-accent-border bg-accent-bg' : 'border-border bg-surface',
                )}
              >
                <input
                  type="checkbox"
                  checked={guided}
                  onChange={(event) => setGuided(event.target.checked)}
                  className="mt-1 h-4 w-4 accent-[color:var(--c-accent)]"
                />
                <span>
                  <span className="flex items-center gap-2 text-[13px] font-semibold">
                    <Route size={15} className="text-accent" />
                    مسیر راهنما را روشن کن (پیشنهاد می‌شود)
                  </span>
                  <span className="mt-1 block text-xs leading-6 text-muted">
                    یک مسیر {formatNumber(journey.length)} قدمی از «کارهای من» تا «تأیید نهایی». بالای هر
                    صفحه می‌بینید کجای مسیر هستید و قدم بعدی چیست. هر زمان می‌توانید خاموشش کنید.
                  </span>
                </span>
              </label>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button variant="primary" size="lg" onClick={enter}>
                  ورود به سامانه
                </Button>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-text"
                >
                  <ArrowRight size={13} />
                  بازگشت
                </button>
              </div>
            </section>
          )}
        </div>
      </main>

      <aside className="order-first hidden flex-col justify-between bg-nav p-8 text-nav-text lg:order-none lg:flex">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500 text-white">
              <Building2 size={20} />
            </span>
            <div>
              <p className="text-[14px] font-semibold text-white">سامانه هوشمند</p>
              <p className="text-xs text-nav-muted">برنامه‌ریزی شهری تهران</p>
            </div>
          </div>

          <p className="mt-9 text-[15px] font-medium leading-8 text-white">
            از یک پرسش شهری تا تصمیمی که بتوان از آن دفاع کرد.
          </p>

          <ul className="mt-7 space-y-6">
            {PROMISES.map((promise) => {
              const Icon = promise.icon;
              return (
                <li key={promise.title} className="flex gap-3">
                  <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                    <Icon size={16} />
                  </span>
                  <span>
                    <span className="block text-[13px] font-semibold text-white">{promise.title}</span>
                    <span className="mt-1 block text-xs leading-6 text-nav-muted">{promise.body}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="rounded-xl bg-white/8 p-3.5">
          <Badge tone="warning">داده نمایشی</Badge>
          <p className="mt-2 text-xs leading-6 text-nav-muted">
            این نسخه با داده و ضرایب نمونه اجرا می‌شود. تأیید در سامانه رویداد گردش‌کار سازمانی است و
            اعتبار قانونی ایجاد نمی‌کند.
          </p>
        </div>
      </aside>
    </div>
  );
}
