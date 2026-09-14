import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ClipboardCheck,
  Database,
  FolderKanban,
  Layers,
} from 'lucide-react';
import { studiesApi } from '@/api/studies';
import { datasetsApi, modelsApi, regionsApi } from '@/api/catalog';
import { reviewsApi, decisionsApi, auditApi } from '@/api/governance';
import { runsApi } from '@/api/runs';
import { scenariosApi } from '@/api/scenarios';
import { useAuthStore } from '@/stores/authStore';
import {
  Card,
  CardHeader,
  DefinitionList,
  PageHeader,
  StatCard,
  StatusBadge,
  Badge,
  Timeline,
  Ltr,
} from '@/components/ui/display';
import { Callout, LoadingState, Progress, EmptyState } from '@/components/ui/feedback';
import { DemoBadge, RunStateBadge } from '@/components/workflow';
import { formatJalaliDate, formatNumber, formatRelative } from '@/utils/format';
import { Route as RouteIcon } from 'lucide-react';
import { journey } from '@/app/journey';
import { useJourneyStore } from '@/stores/journeyStore';
import { roleLabels, studyStatusLabels, studyTypeLabels } from '@/utils/dictionary';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const journeyActive = useJourneyStore((s) => s.active);
  const visited = useJourneyStore((s) => s.visited);

  const studies = useQuery({ queryKey: ['studies', {}], queryFn: () => studiesApi.list() });
  const datasets = useQuery({ queryKey: ['datasets'], queryFn: datasetsApi.list });
  const models = useQuery({ queryKey: ['models'], queryFn: modelsApi.list });
  const reviews = useQuery({ queryKey: ['reviews'], queryFn: reviewsApi.list });
  const decisions = useQuery({ queryKey: ['decisions'], queryFn: decisionsApi.list });
  const audit = useQuery({ queryKey: ['audit'], queryFn: auditApi.list });
  const regions = useQuery({ queryKey: ['regions'], queryFn: regionsApi.list });
  const runs = useQuery({ queryKey: ['runs'], queryFn: runsApi.list, refetchInterval: 4000 });
  const scenarios = useQuery({ queryKey: ['scenarios', 'all'], queryFn: () => scenariosApi.list() });

  const loading =
    studies.isLoading || datasets.isLoading || reviews.isLoading || runs.isLoading;

  if (loading) {
    return (
      <div className="space-y-4">
        <LoadingState rows={2} />
      </div>
    );
  }

  const allStudies = studies.data ?? [];
  const activeStudies = allStudies.filter((s) => s.status === 'active');
  const inReview = allStudies.filter((s) => s.status === 'in_review');
  const quarantined = (datasets.data ?? []).flatMap((d) =>
    d.versions.filter((v) => v.status === 'quarantined').map((v) => ({ dataset: d, version: v })),
  );
  const awaitingPublication = (datasets.data ?? []).flatMap((d) =>
    d.versions.filter((v) => v.status === 'ready').map((v) => ({ dataset: d, version: v })),
  );
  const runningJobs = (runs.data ?? []).filter((r) => r.state === 'running' || r.state === 'queued');
  const availableModels = (models.data ?? []).filter((m) => m.status === 'available');
  const unavailableModels = (models.data ?? []).filter((m) => m.status !== 'available');
  const myReviews = (reviews.data ?? []).filter(
    (r) => r.assignedTo === user.displayName && r.state === 'pending',
  );
  const myStudies = allStudies.filter((s) => s.ownerName === user.displayName);
  const changesRequested = allStudies.filter((s) => s.status === 'changes_requested');
  const publishedDecisions = (decisions.data ?? []).filter((d) => d.state === 'published');

  return (
    <div>
      <PageHeader
        title={`سلام، ${user.displayName}`}
        description={`نقش فعال شما: ${roleLabels[user.roles[0]]} — ${user.organization}`}
        meta={<DemoBadge />}
        actions={
          <Link
            to="/scenarios/new"
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary-600 px-4 text-sm text-white hover:bg-primary-700"
          >
            ایجاد سناریو جدید
            <ArrowLeft size={15} />
          </Link>
        }
      />

      {journeyActive && (
        <section className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-accent-border bg-accent-bg p-4">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-2xs font-semibold text-accent">
              <RouteIcon size={13} />
              مسیر پیشنهادی
            </p>
            <p className="mt-1 text-[15px] font-semibold">از این‌جا شروع کنید</p>
            <p className="mt-1 max-w-2xl text-[13px] leading-7 text-muted">
              یک مسیر {formatNumber(journey.length)} قدمی از همین داشبورد تا تأیید نهایی یک بسته تصمیم.
              نوار بالای صفحه در هر گام می‌گوید کجای مسیر هستید و قدم بعد کدام است.
              {visited.length > 0 && (
                <> تاکنون {formatNumber(visited.length)} قدم را دیده‌اید.</>
              )}
            </p>
          </div>
          <Link
            to="/journey"
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md bg-accent px-4 text-sm text-white hover:opacity-90"
          >
            دیدن کل مسیر
            <ArrowLeft size={15} />
          </Link>
        </section>
      )}

      <Callout tone="neutral" className="mb-5">
        این محیط نمایشی است. داده‌ها، ضرایب و قوانین نمونه‌اند و مبنای رسمی شهرداری نیستند. تأیید در سامانه
        رویداد گردش‌کار سازمانی است و اعتبار قانونی یا مجوز ایجاد نمی‌کند.
      </Callout>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="مطالعات فعال"
          value={formatNumber(activeStudies.length)}
          unit="مطالعه"
          icon={<FolderKanban size={15} />}
          tone="primary"
          to="/studies"
          hint={`${formatNumber(allStudies.length)} مطالعه در دامنه دسترسی شما`}
        />
        <StatCard
          label="در انتظار بررسی"
          value={formatNumber(inReview.length + myReviews.length)}
          unit="مورد"
          icon={<ClipboardCheck size={15} />}
          tone="warning"
          to="/reviews"
          hint={`${formatNumber(myReviews.length)} مورد ارجاع‌شده به شما`}
        />
        <StatCard
          label="تحلیل‌های در حال اجرا"
          value={formatNumber(runningJobs.length)}
          unit="اجرا"
          icon={<Activity size={15} />}
          tone="info"
          to="/scenarios"
          hint="اجراها در پس‌زمینه ادامه می‌یابند"
        />
        <StatCard
          label="داده‌های قرنطینه‌شده"
          value={formatNumber(quarantined.length)}
          unit="نسخه"
          icon={<Database size={15} />}
          tone="danger"
          to="/datasets/quarantine"
          hint={`${formatNumber(awaitingPublication.length)} نسخه آماده اما منتشرنشده`}
        />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* کارهای من */}
          <Card>
            <CardHeader
              title="کارهای من"
              subtitle="مواردی که مستقیماً به شما ارجاع شده یا مالک آن هستید"
              action={
                <Link to="/reviews" className="text-xs text-primary-700 hover:underline">
                  همه موارد
                </Link>
              }
            />
            {myReviews.length === 0 && myStudies.length === 0 ? (
              <EmptyState
                title="کاری به شما ارجاع نشده است"
                description="در حال حاضر موردی در صف کاری شما نیست. می‌توانید مطالعات فعال یا کاتالوگ داده را مرور کنید."
              />
            ) : (
              <ul className="divide-y divide-border">
                {myReviews.map((review) => (
                  <li key={review.id} className="flex items-start justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <Link
                        to={`/reviews/${review.id}`}
                        className="text-[13px] font-medium hover:text-primary-700"
                      >
                        {review.subjectTitle}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted">
                        ارسال‌شده توسط {review.submittedBy} — {formatRelative(review.submittedAt)}
                      </p>
                    </div>
                    <StatusBadge label="در انتظار تصمیم شما" tone="warning" kind="pending" />
                  </li>
                ))}
                {myStudies.slice(0, 4).map((study) => (
                  <li key={study.id} className="flex items-start justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <Link
                        to={`/studies/${study.id}`}
                        className="text-[13px] font-medium hover:text-primary-700"
                      >
                        {study.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted">
                        {studyTypeLabels[study.studyType]} — آخرین تغییر {formatRelative(study.updatedAt)}
                      </p>
                    </div>
                    <Badge tone="muted">{studyStatusLabels[study.status]}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* موارد نیازمند اقدام */}
          <Card>
            <CardHeader title="موارد نیازمند اقدام" subtitle="خلأهایی که خروجی رسمی را مسدود می‌کنند" />
            <ul className="space-y-2.5">
              {quarantined.map(({ dataset, version }) => (
                <li key={version.id} className="flex items-start gap-2.5 rounded-lg border border-border bg-surface-2 p-3">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0 text-danger" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium">
                      <Link to={`/datasets/${dataset.id}`} className="hover:text-primary-700">
                        {dataset.title} — نسخه <Ltr>{version.versionLabel}</Ltr>
                      </Link>
                    </p>
                    <p className="mt-0.5 text-xs leading-6 text-muted">{version.quarantineReason}</p>
                  </div>
                </li>
              ))}
              {changesRequested.map((study) => (
                <li key={study.id} className="flex items-start gap-2.5 rounded-lg border border-border bg-surface-2 p-3">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0 text-warning" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium">
                      <Link to={`/studies/${study.id}`} className="hover:text-primary-700">
                        {study.title}
                      </Link>
                    </p>
                    <p className="mt-0.5 text-xs leading-6 text-muted">
                      {study.blockers[0] ?? 'درخواست اصلاح ثبت شده است.'}
                    </p>
                  </div>
                </li>
              ))}
              {unavailableModels.slice(0, 2).map((model) => (
                <li key={model.id} className="flex items-start gap-2.5 rounded-lg border border-border bg-surface-2 p-3">
                  <Layers size={15} className="mt-0.5 shrink-0 text-muted" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium">
                      <Link to={`/models/${model.id}`} className="hover:text-primary-700">
                        {model.name}
                      </Link>
                    </p>
                    <p className="mt-0.5 text-xs leading-6 text-muted">
                      مدل در حال حاضر در دسترس نیست؛ خروجی‌های وابسته تولید نمی‌شوند.
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          {/* سناریوهای اخیر و اجراها */}
          <Card>
            <CardHeader
              title="سناریوهای اخیر و وضعیت اجرا"
              action={
                <Link to="/scenarios" className="text-xs text-primary-700 hover:underline">
                  همه سناریوها
                </Link>
              }
            />
            <ul className="divide-y divide-border">
              {(scenarios.data ?? []).slice(0, 4).map((scenario) => {
                const run = (runs.data ?? []).find((r) => r.scenarioId === scenario.id);
                return (
                  <li key={scenario.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <Link
                        to={`/scenarios/${scenario.id}`}
                        className="text-[13px] font-medium hover:text-primary-700"
                      >
                        {scenario.name}
                      </Link>
                      <p className="mt-0.5 truncate text-xs text-muted">{scenario.studyTitle}</p>
                    </div>
                    {run ? <RunStateBadge state={run.state} /> : <Badge tone="muted">بدون اجرا</Badge>}
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="وضعیت آمادگی مناطق" subtitle="داده منتشرشده، قوانین تأییدشده و مدل‌های متصل" />
            <div className="space-y-4">
              {(regions.data ?? []).map((region) => {
                const dataPct = Math.round(
                  (region.readiness.datasetsPublished / region.readiness.datasetsRequired) * 100,
                );
                const rulePct = Math.round(
                  (region.readiness.rulesApproved / region.readiness.rulesRequired) * 100,
                );
                return (
                  <div key={region.id}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <Link to="/regions" className="text-[13px] font-medium hover:text-primary-700">
                        {region.title}
                      </Link>
                      <Badge tone={region.packState === 'published' ? 'success' : 'warning'}>
                        {region.packState === 'published' ? 'پکیج منتشرشده' : 'پکیج پیش‌نویس'}
                      </Badge>
                    </div>
                    <div className="space-y-1.5">
                      <Progress value={dataPct} label="داده منتشرشده" />
                      <Progress value={rulePct} label="قوانین تأییدشده" tone="warning" />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <CardHeader title="مدل‌ها" subtitle="در دسترس و غیردسترس" />
            <DefinitionList
              columns={1}
              items={[
                {
                  label: 'در دسترس',
                  value: (
                    <span className="num">{formatNumber(availableModels.length)} مدل</span>
                  ),
                },
                {
                  label: 'در دسترس نیست / تأییدنشده / منقضی',
                  value: <span className="num">{formatNumber(unavailableModels.length)} مدل</span>,
                },
              ]}
            />
            <Link
              to="/models"
              className="mt-3 inline-block text-xs text-primary-700 hover:underline"
            >
              مشاهده مخزن مدل‌ها
            </Link>
          </Card>

          <Card>
            <CardHeader title="آخرین تصمیم‌های منتشرشده" />
            {publishedDecisions.length === 0 ? (
              <p className="text-[13px] text-muted">تصمیم منتشرشده‌ای ثبت نشده است.</p>
            ) : (
              <ul className="space-y-2">
                {publishedDecisions.map((pkg) => (
                  <li key={pkg.id}>
                    <Link
                      to={`/decision-packages/${pkg.id}`}
                      className="text-[13px] font-medium hover:text-primary-700"
                    >
                      {pkg.title}
                    </Link>
                    <p className="text-xs text-muted">
                      نسخه <Ltr>{pkg.versionLabel}</Ltr> — {formatJalaliDate(pkg.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="فعالیت‌های اخیر" />
            <Timeline
              items={(audit.data ?? []).slice(0, 6).map((entry) => ({
                id: entry.id,
                title: `${entry.actor} — ${entry.action}`,
                meta: `${entry.subjectTitle} · ${formatRelative(entry.at)}`,
                tone: entry.outcome === 'rejected' ? 'danger' : 'success',
              }))}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
