import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Flag, Route } from 'lucide-react';
import { journey } from '@/app/journey';
import { useJourneyStore } from '@/stores/journeyStore';
import { useAuthStore } from '@/stores/authStore';
import { Badge, Card, PageHeader } from '@/components/ui/display';
import { Button } from '@/components/ui/Button';
import { Callout, Progress } from '@/components/ui/feedback';
import { DemoBadge } from '@/components/workflow';
import { formatNumber } from '@/utils/format';
import { roleLabels } from '@/utils/dictionary';
import { cn } from '@/utils/cn';

export default function JourneyPage() {
  const visited = useJourneyStore((s) => s.visited);
  const active = useJourneyStore((s) => s.active);
  const setActive = useJourneyStore((s) => s.setActive);
  const reset = useJourneyStore((s) => s.reset);
  const user = useAuthStore((s) => s.user);

  const pct = Math.round((visited.length / journey.length) * 100);
  const nextStep = journey.find((step) => !visited.includes(step.key)) ?? journey[0];

  return (
    <div>
      <PageHeader
        eyebrow="فضای کاری"
        title="مسیر پیشنهادی"
        description="یک مسیر کامل از پرسش تا تصمیم. هر قدم یک صفحه واقعی سامانه است؛ چیزی شبیه‌سازی نشده و همه اقدام‌ها واقعاً انجام می‌شوند."
        meta={
          <>
            <Badge tone="muted">نقش فعال: {roleLabels[user.roles[0]]}</Badge>
            <DemoBadge />
          </>
        }
        actions={
          <>
            <Button onClick={() => { reset(); setActive(true); }}>شروع دوباره</Button>
            <Link
              to={nextStep.to}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-primary-600 px-4 text-sm text-white hover:bg-primary-700"
            >
              <Route size={15} />
              ادامه از قدم {formatNumber(nextStep.index)}
            </Link>
          </>
        }
      />

      {/* the destination, stated before the steps — so the path has a point */}
      <section className="mb-5 grid gap-4 md:grid-cols-[1fr_260px]">
        <Card className="border-accent-border bg-accent-bg">
          <p className="flex items-center gap-1.5 text-2xs font-semibold text-accent">
            <Flag size={13} />
            مقصد این مسیر
          </p>
          <h2 className="mt-1.5 text-[15px] font-semibold">یک بسته تصمیم قابل دفاع</h2>
          <p className="mt-1.5 text-[13px] leading-7 text-muted">
            در پایان، سندی دارید که سه چیز را کنار هم می‌گذارد: تغییرهای کلیدی نسبت به وضع موجود،
            محدودیت‌هایی که نتیجه را مقید می‌کنند، و تحلیل‌هایی که اصلاً تولید نشده‌اند. این سند به نسخه
            مشخصی از داده و قوانین گره خورده و مسیر بررسی و تأییدش ثبت شده است.
          </p>
          <Link
            to="/decision-packages/dp-7001"
            className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-accent hover:underline"
          >
            دیدن یک نمونه آماده از خروجی پایانی
            <ArrowLeft size={14} />
          </Link>
        </Card>

        <Card>
          <p className="text-xs text-muted">زمان تقریبی</p>
          <p className="num mt-1 text-2xl font-semibold">۱۵ دقیقه</p>
          <p className="mt-1 text-2xs leading-6 text-muted">
            برای دیدن کل مسیر بدون عجله. می‌توانید هر جا متوقف شوید؛ پیشرفت نگه داشته می‌شود.
          </p>
        </Card>
      </section>

      <Card className="mb-5">
        <Progress value={pct} label={`${formatNumber(visited.length)} قدم از ${formatNumber(journey.length)} دیده شده`} />
        {!active && (
          <Callout tone="neutral" className="mt-3">
            نوار راهنما خاموش است.{' '}
            <button type="button" onClick={() => setActive(true)} className="text-primary-700 underline">
              روشن کردن دوباره
            </button>
          </Callout>
        )}
      </Card>

      <ol className="space-y-3">
        {journey.map((step) => {
          const done = visited.includes(step.key);
          return (
            <li key={step.key}>
              <Card
                className={cn(
                  'transition-colors',
                  done ? 'border-success/30' : step.index === nextStep.index ? 'border-accent-border bg-accent-bg' : '',
                )}
              >
                <div className="flex flex-wrap items-start gap-3">
                  <span
                    className={cn(
                      'num inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                      done
                        ? 'border-success bg-success text-white'
                        : step.index === nextStep.index
                          ? 'border-accent bg-accent text-white'
                          : 'border-border-strong text-muted',
                    )}
                    aria-hidden
                  >
                    {done ? <Check size={13} /> : formatNumber(step.index)}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-[14px] font-semibold">{step.title}</h2>
                      <Badge tone="muted">{step.personaHint}</Badge>
                      {done && <Badge tone="success">دیده شده</Badge>}
                    </div>
                    <p className="mt-1 text-[13px] leading-7">{step.task}</p>
                    <p className="mt-1 text-xs leading-6 text-muted">چرا این قدم هست: {step.why}</p>
                  </div>

                  <Link
                    to={step.to}
                    className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-border-strong bg-surface px-3.5 text-sm hover:bg-surface-2"
                  >
                    باز کردن
                    <ArrowLeft size={14} />
                  </Link>
                </div>
              </Card>
            </li>
          );
        })}
      </ol>

      {visited.length >= journey.length ? (
        <Card className="mt-5 border-success/40">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-2xs font-semibold text-success">
                <Check size={13} />
                مسیر کامل شد
              </p>
              <h2 className="mt-1 text-[15px] font-semibold">همه یازده قدم را دیدید</h2>
              <p className="mt-1 text-[13px] leading-7 text-muted">
                حالا می‌توانید همین کار را با داده و پرسش خودتان تکرار کنید: مطالعه‌ای بسازید، سناریو
                تعریف کنید و خروجی را تا تأیید ببرید.
              </p>
            </div>
            <Link
              to="/decision-packages"
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-primary-600 px-4 text-sm text-white hover:bg-primary-700"
            >
              رفتن به بسته‌های تصمیم
              <ArrowLeft size={15} />
            </Link>
          </div>
        </Card>
      ) : (
        <Callout tone="neutral" className="mt-5" title="اگر وقت کم دارید">
          قدم‌های ۶ تا ۹ هسته اصلی محصول‌اند: ساخت سناریو، خواندن نتایج، مقایسه با وضع موجود و ساخت بسته
          تصمیم. بقیه قدم‌ها زمینه‌ای‌اند و می‌توانید بعداً ببینید.
        </Callout>
      )}
    </div>
  );
}
