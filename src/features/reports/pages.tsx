import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileDown } from 'lucide-react';
import type { ReportVersion } from '@/types/domain';
import { reportsApi, decisionsApi, reviewsApi } from '@/api/governance';
import { scenariosApi } from '@/api/scenarios';
import { useScenarioResults, buildComparison } from '@/hooks/useAnalysis';
import {
  Badge,
  Card,
  CardHeader,
  DefinitionList,
  DeltaPill,
  Ltr,
  PageHeader,
  StatusBadge,
  Timeline,
  type Tone,
} from '@/components/ui/display';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/overlays';
import { Callout, EmptyState, LoadingState } from '@/components/ui/feedback';
import { ResultValue } from '@/components/provenance/ResultCard';
import { ApprovalScopeNotice, DemoBadge, usePermission } from '@/components/workflow';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { moduleTitles, reportStateLabels } from '@/utils/dictionary';
import { formatJalaliDate, formatNumber } from '@/utils/format';

const REPORT_TONE: Record<ReportVersion['state'], { tone: Tone; kind: 'ok' | 'warn' | 'pending' | 'blocked' }> = {
  draft: { tone: 'muted', kind: 'pending' },
  generating: { tone: 'info', kind: 'pending' },
  ready_for_review: { tone: 'warning', kind: 'warn' },
  approved: { tone: 'success', kind: 'ok' },
  published: { tone: 'success', kind: 'ok' },
  retired: { tone: 'muted', kind: 'blocked' },
};

/* ------------------------------------------------------------------ reports */

export function ReportsPage() {
  const exportPerm = usePermission('report.export');
  const { data, isLoading } = useQuery({ queryKey: ['reports'], queryFn: reportsApi.list });
  const pushToast = useUiStore((s) => s.pushToast);

  if (isLoading) return <LoadingState rows={4} />;
  const reports = data ?? [];

  return (
    <div>
      <PageHeader
        eyebrow="حاکمیت و خروجی"
        title="گزارش‌ها"
        description="گزارش از همان نتایج ثبت‌شده ساخته می‌شود. اگر بخشی از تحلیل‌ها تولید نشده باشد، گزارش با علامت «ناقص» صادر می‌شود و خلأها فهرست می‌شوند."
        breadcrumb={[{ label: 'خانه', to: '/dashboard' }, { label: 'گزارش‌ها' }]}
        meta={<DemoBadge />}
      />

      {reports.length === 0 ? (
        <EmptyState
          title="گزارشی ثبت نشده است"
          description="از صفحه سناریو می‌توانید پیش‌نویس گزارش بسازید."
        />
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const tone = REPORT_TONE[report.state];
            const includedSections = report.sections.filter((s) => s.included);
            const incompleteSections = includedSections.filter((s) => !s.complete);
            return (
              <Card key={report.id}>
                <CardHeader
                  title={report.title}
                  subtitle={
                    <span>
                      نسخه <Ltr>{report.versionLabel}</Ltr>
                      {report.generatedAt && <> — {formatJalaliDate(report.generatedAt, true)}</>}
                    </span>
                  }
                  action={<StatusBadge label={reportStateLabels[report.state]} tone={tone.tone} kind={tone.kind} />}
                />

                {(report.incompleteEvidence || report.missingAnalyses.length > 0) && (
                  <Callout tone="warning" title="این گزارش کامل نیست" className="mb-3">
                    {report.missingAnalyses.length > 0 && (
                      <p>
                        تحلیل‌های تولیدنشده:{' '}
                        {report.missingAnalyses.map((id) => `${id} — ${moduleTitles[id]}`).join('، ')}
                      </p>
                    )}
                    {report.incompleteEvidence && <p>برخی نتایج، سند پشتیبان ثبت‌شده ندارند.</p>}
                  </Callout>
                )}

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-muted">بخش‌های گزارش</p>
                    <ul className="space-y-1 text-[13px]">
                      {report.sections.map((section) => (
                        <li key={section.key} className="flex items-center justify-between gap-2">
                          <span className={section.included ? '' : 'text-faint line-through'}>
                            {section.title}
                          </span>
                          {section.included && (
                            <Badge tone={section.complete ? 'success' : 'warning'}>
                              {section.complete ? 'کامل' : 'ناقص'}
                            </Badge>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <DefinitionList
                      columns={1}
                      items={[
                        { label: 'زبان گزارش', value: report.language === 'fa' ? 'فارسی' : 'انگلیسی' },
                        { label: 'تعداد بخش فعال', value: <span className="num">{formatNumber(includedSections.length)}</span> },
                        { label: 'بخش ناقص', value: <span className="num">{formatNumber(incompleteSections.length)}</span> },
                      ]}
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        icon={<FileDown size={14} />}
                        disabledReason={exportPerm.reason}
                        onClick={() =>
                          pushToast({
                            title: 'خروجی در محیط نمایشی تولید نمی‌شود',
                            description: 'در محیط عملیاتی، فایل با همان نسخه و مهر زمانی ثبت‌شده صادر می‌شود.',
                            variant: 'info',
                          })
                        }
                      >
                        خروجی PDF
                      </Button>
                      <Button
                        size="sm"
                        disabledReason={exportPerm.reason}
                        onClick={() =>
                          pushToast({
                            title: 'خروجی در محیط نمایشی تولید نمی‌شود',
                            variant: 'info',
                          })
                        }
                      >
                        خروجی Word
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------- decision packages */

export function DecisionPackagesPage() {
  const { data, isLoading } = useQuery({ queryKey: ['decisions'], queryFn: decisionsApi.list });

  if (isLoading) return <LoadingState rows={3} />;
  const packages = data ?? [];

  return (
    <div>
      <PageHeader
        eyebrow="حاکمیت و خروجی"
        title="بسته‌های تصمیم"
        description="بسته تصمیم، خلاصه‌ای قابل دفاع از یک انتخاب است: تغییرهای کلیدی، محدودیت‌ها، خلأها و مسیر تأیید. تأیید آن رویداد گردش‌کار سازمانی است."
        breadcrumb={[{ label: 'خانه', to: '/dashboard' }, { label: 'بسته‌های تصمیم' }]}
        meta={<DemoBadge />}
      />

      {packages.length === 0 ? (
        <EmptyState title="بسته تصمیمی ثبت نشده است" description="از صفحه سناریو می‌توانید بسته تصمیم بسازید." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {packages.map((pkg) => (
            <Card key={pkg.id}>
              <CardHeader
                title={
                  <Link to={`/decision-packages/${pkg.id}`} className="hover:text-primary-700">
                    {pkg.title}
                  </Link>
                }
                subtitle={pkg.studyTitle}
                action={
                  <Badge
                    tone={
                      pkg.state === 'published'
                        ? 'success'
                        : pkg.state === 'approved'
                          ? 'primary'
                          : pkg.state === 'in_review'
                            ? 'warning'
                            : 'muted'
                    }
                  >
                    {pkg.state === 'published'
                      ? 'منتشرشده'
                      : pkg.state === 'approved'
                        ? 'تأییدشده'
                        : pkg.state === 'in_review'
                          ? 'در حال بررسی'
                          : 'پیش‌نویس'}
                  </Badge>
                }
              />
              <p className="text-[13px] leading-7 text-muted">{pkg.summary}</p>
              <p className="mt-2 text-2xs text-faint">
                نسخه <Ltr>{pkg.versionLabel}</Ltr>
                <span className="mx-2">·</span>
                {formatJalaliDate(pkg.createdAt)}
                {pkg.missingAnalyses.length > 0 && (
                  <>
                    <span className="mx-2">·</span>
                    <span className="text-warning">
                      {formatNumber(pkg.missingAnalyses.length)} تحلیل تولیدنشده
                    </span>
                  </>
                )}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function DecisionPackageDetailPage() {
  const { packageId = '' } = useParams();
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const user = useAuthStore((s) => s.user);
  const pushToast = useUiStore((s) => s.pushToast);
  const queryClient = useQueryClient();
  const publishPerm = usePermission('decision.publish');

  const { data, isLoading } = useQuery({
    queryKey: ['decision', packageId],
    queryFn: () => decisionsApi.get(packageId),
  });
  const { data: reviews = [] } = useQuery({ queryKey: ['reviews'], queryFn: reviewsApi.list });
  const { data: scenarios = [] } = useQuery({ queryKey: ['scenarios', 'all'], queryFn: () => scenariosApi.list() });

  const baseline = useScenarioResults(data?.baselineScenarioId);
  const proposed = useScenarioResults(data?.proposedScenarioId);

  const submit = useMutation({
    mutationFn: () => decisionsApi.submit(packageId, user.displayName),
    onSuccess: () => {
      queryClient.invalidateQueries();
      pushToast({ title: 'بسته تصمیم برای بررسی ارسال شد', variant: 'success' });
    },
  });

  if (isLoading) return <LoadingState rows={4} />;
  if (!data) return <EmptyState title="بسته تصمیم یافت نشد" />;

  const comparison = buildComparison(baseline.byMetric, proposed.byMetric).filter((row) => row.comparable);
  const linkedReviews = reviews.filter((r) => data.reviewBundleIds.includes(r.id));
  const baselineName = scenarios.find((s) => s.id === data.baselineScenarioId)?.name ?? '—';
  const proposedName = scenarios.find((s) => s.id === data.proposedScenarioId)?.name ?? '—';

  return (
    <div>
      <PageHeader
        title={data.title}
        description={data.summary}
        breadcrumb={[
          { label: 'خانه', to: '/dashboard' },
          { label: 'بسته‌های تصمیم', to: '/decision-packages' },
          { label: data.title },
        ]}
        meta={
          <>
            <Ltr className="text-xs text-muted">{data.code}</Ltr>
            <Badge tone="muted">
              نسخه <Ltr>{data.versionLabel}</Ltr>
            </Badge>
            <DemoBadge />
          </>
        }
        actions={
          <Button
            variant="primary"
            disabledReason={data.state === 'draft' ? null : 'این بسته پیش‌تر ارسال شده است.'}
            loading={submit.isPending}
            onClick={() => setConfirmSubmit(true)}
          >
            ارسال برای تأیید
          </Button>
        }
      />

      <div className="mb-4">
        <ApprovalScopeNotice />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader
              title="تغییرهای کلیدی"
              subtitle={`${proposedName} در مقایسه با ${baselineName}`}
            />
            {comparison.length === 0 ? (
              <p className="text-[13px] text-muted">شاخص قابل مقایسه‌ای در دو سو موجود نیست.</p>
            ) : (
              <ul className="space-y-2">
                {comparison.map((row) => (
                  <li key={row.code} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-2.5">
                    <span className="text-[13px] font-medium">{row.title}</span>
                    <span className="flex items-center gap-2">
                      <ResultValue result={row.baseline} />
                      <span className="text-faint">←</span>
                      <ResultValue result={row.scenario} />
                      <DeltaPill delta={row.delta} percent={row.deltaPercent} direction={row.direction} precision={row.precision} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="محدودیت‌ها و خلأها" subtitle="آنچه این بسته پاسخ نمی‌دهد، صریح اعلام می‌شود" />
            <ul className="space-y-1.5 text-[13px] leading-7">
              {data.limitations.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-2.5 inline-block h-1 w-1 shrink-0 rounded-full bg-border-strong" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
            {data.missingAnalyses.length > 0 && (
              <Callout tone="warning" className="mt-3" title="تحلیل‌های تولیدنشده">
                {data.missingAnalyses.map((id) => `${id} — ${moduleTitles[id]}`).join('، ')}
              </Callout>
            )}
          </Card>

          <Card>
            <CardHeader title="تغییرهای ثبت‌شده" />
            {data.keyChanges.length === 0 ? (
              <p className="text-[13px] text-muted">موردی ثبت نشده است.</p>
            ) : (
              <ul className="list-disc space-y-1 ps-5 text-[13px] leading-7">
                {data.keyChanges.map((change) => (
                  <li key={change}>{change}</li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="مسیر تأیید" />
            {data.approvals.length === 0 ? (
              <p className="text-[13px] text-muted">هنوز تأییدی ثبت نشده است.</p>
            ) : (
              <Timeline
                items={data.approvals.map((approval, index) => ({
                  id: `${approval.actor}-${index}`,
                  title: approval.actor,
                  meta: `${approval.scope} · ${formatJalaliDate(approval.at, true)}`,
                  tone: 'success',
                }))}
              />
            )}
          </Card>

          <Card>
            <CardHeader title="بسته‌های بررسی مرتبط" />
            {linkedReviews.length === 0 ? (
              <p className="text-[13px] text-muted">بسته بررسی مرتبطی ثبت نشده است.</p>
            ) : (
              <ul className="space-y-2">
                {linkedReviews.map((review) => (
                  <li key={review.id}>
                    <Link to={`/reviews/${review.id}`} className="text-[13px] hover:text-primary-700">
                      {review.subjectTitle}
                    </Link>
                    <p className="text-2xs text-muted">
                      <Ltr>{review.code}</Ltr> — {review.assignedTo}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="ارجاع به اجرا" />
            <DefinitionList
              columns={1}
              items={[
                { label: 'شناسه اجرا', value: <Ltr>{data.runId}</Ltr> },
                { label: 'سناریوی مبنا', value: baselineName },
                { label: 'سناریوی پیشنهادی', value: proposedName },
              ]}
            />
            <Link
              to={`/scenarios/${data.proposedScenarioId}`}
              className="mt-3 inline-block text-xs text-primary-700 hover:underline"
            >
              مشاهده نتایج تحلیلی
            </Link>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmSubmit}
        title="ارسال بسته تصمیم برای تأیید"
        confirmLabel="ارسال"
        busy={submit.isPending}
        onCancel={() => setConfirmSubmit(false)}
        onConfirm={() => {
          submit.mutate();
          setConfirmSubmit(false);
        }}
        description={
          <div className="space-y-2">
            <p>با ارسال، نسخه‌ای ثابت از این بسته ساخته می‌شود و برای مرجع تأیید ارسال می‌گردد.</p>
            <p className="text-muted">
              تأیید در سامانه رویداد گردش‌کار است و به‌معنای اعتبار قانونی یا صدور مجوز نیست.
            </p>
            {!publishPerm.allowed && (
              <p className="text-muted">توجه: انتشار نهایی این بسته با نقش فعلی شما انجام نمی‌شود.</p>
            )}
          </div>
        }
      />
    </div>
  );
}
