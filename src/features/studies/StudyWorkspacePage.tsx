import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import type { ChapterStatus, StudyChapter } from '@/types/domain';
import { studiesApi } from '@/api/studies';
import { datasetsApi, evidenceApi, rulesApi } from '@/api/catalog';
import { scenariosApi } from '@/api/scenarios';
import { runsApi } from '@/api/runs';
import { reviewsApi, reportsApi, auditApi } from '@/api/governance';
import { gisApi } from '@/api/gis';
import {
  Badge,
  Card,
  CardHeader,
  DefinitionList,
  Ltr,
  PageHeader,
  StatCard,
  StatusBadge,
  Tabs,
  Timeline,
  type Tone,
} from '@/components/ui/display';
import { Button } from '@/components/ui/Button';
import { Callout, EmptyState, LoadingState, Progress, ErrorState } from '@/components/ui/feedback';
import { ConfirmDialog } from '@/components/ui/overlays';
import { MapCanvas } from '@/components/maps/MapCanvas';
import { DemoBadge, RunStateBadge, usePermission } from '@/components/workflow';
import {
  chapterStatusLabels,
  classificationLabels,
  datasetStatusShort,
  evidenceTypeLabels,
  ruleStatusLabels,
  reportStateLabels,
  roleLabels,
  studyStatusLabels,
  studyTypeLabels,
} from '@/utils/dictionary';
import { formatJalaliDate, formatNumber, formatRelative, shortHash } from '@/utils/format';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';

const CHAPTER_TONE: Record<ChapterStatus, { tone: Tone; kind: 'ok' | 'warn' | 'pending' | 'blocked' | 'dot' | 'unknown' }> = {
  complete: { tone: 'success', kind: 'ok' },
  approved: { tone: 'success', kind: 'ok' },
  incomplete: { tone: 'warning', kind: 'warn' },
  needs_data: { tone: 'danger', kind: 'warn' },
  needs_review: { tone: 'warning', kind: 'pending' },
  external_supplied: { tone: 'info', kind: 'dot' },
  not_started: { tone: 'muted', kind: 'unknown' },
};

function ChapterRow({ chapter }: { chapter: StudyChapter }) {
  const tone = CHAPTER_TONE[chapter.status];
  const pct = chapter.requiredInputs === 0 ? 100 : Math.round((chapter.boundInputs / chapter.requiredInputs) * 100);
  return (
    <li className="flex flex-wrap items-center gap-3 border-b border-border py-3 last:border-0">
      <span className="num inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-3 text-xs text-muted">
        {formatNumber(chapter.index)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium">{chapter.title}</p>
        <p className="text-xs text-muted">
          مسئول: {chapter.ownerName}
          {chapter.note && <span> — {chapter.note}</span>}
        </p>
      </div>
      <div className="w-40">
        <Progress
          value={pct}
          label={`ورودی‌های متصل ${formatNumber(chapter.boundInputs)}/${formatNumber(chapter.requiredInputs)}`}
          showValue={false}
          tone={pct === 100 ? 'success' : 'warning'}
        />
      </div>
      <StatusBadge label={chapterStatusLabels[chapter.status]} tone={tone.tone} kind={tone.kind} />
    </li>
  );
}

export default function StudyWorkspacePage() {
  const { studyId = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('overview');
  const [submitOpen, setSubmitOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const pushToast = useUiStore((s) => s.pushToast);
  const setActiveStudy = useWorkspaceStore((s) => s.setActiveStudy);
  const submitPermission = usePermission('study.submit');

  const study = useQuery({ queryKey: ['study', studyId], queryFn: () => studiesApi.get(studyId) });
  const datasets = useQuery({ queryKey: ['datasets'], queryFn: datasetsApi.list });
  const rules = useQuery({ queryKey: ['rules'], queryFn: rulesApi.list });
  const evidence = useQuery({ queryKey: ['evidence'], queryFn: evidenceApi.list });
  const scenarios = useQuery({
    queryKey: ['scenarios', studyId],
    queryFn: () => scenariosApi.list(studyId),
  });
  const runs = useQuery({ queryKey: ['runs'], queryFn: runsApi.list, refetchInterval: 5000 });
  const reviews = useQuery({ queryKey: ['reviews'], queryFn: reviewsApi.list });
  const reports = useQuery({ queryKey: ['reports'], queryFn: reportsApi.list });
  const audit = useQuery({ queryKey: ['audit'], queryFn: auditApi.list });
  const layers = useQuery({ queryKey: ['layers'], queryFn: gisApi.layers });
  const parcels = useQuery({ queryKey: ['parcels'], queryFn: () => gisApi.features() });

  useEffect(() => {
    if (studyId) setActiveStudy(studyId);
  }, [studyId, setActiveStudy]);

  const submit = useMutation({
    mutationFn: () => studiesApi.transition(studyId, 'in_review', user.displayName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study', studyId] });
      queryClient.invalidateQueries({ queryKey: ['studies'] });
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      pushToast({
        title: 'مطالعه برای بررسی ارسال شد',
        description: 'بسته بررسی ثابت ایجاد شد و تغییرات بعدی روی نسخه جاری اعمال می‌شود.',
        variant: 'success',
      });
    },
    onError: (error: Error) =>
      pushToast({ title: 'ارسال انجام نشد', description: error.message, variant: 'error' }),
  });

  if (study.isLoading) return <LoadingState rows={3} />;
  if (study.isError) return <ErrorState onRetry={() => study.refetch()} />;
  if (!study.data) {
    return (
      <EmptyState
        title="مطالعه یافت نشد"
        description="ممکن است حذف یا بایگانی شده باشد، یا در دامنه دسترسی شما نباشد."
        action={
          <Link to="/studies" className="text-[13px] text-primary-700 hover:underline">
            بازگشت به فهرست مطالعات
          </Link>
        }
      />
    );
  }

  const s = study.data;
  const studyScenarios = scenarios.data ?? [];
  const studyRuns = (runs.data ?? []).filter((r) =>
    studyScenarios.some((sc) => sc.id === r.scenarioId),
  );
  const studyReviews = (reviews.data ?? []).filter((r) => r.subjectId === s.id);
  const studyReports = (reports.data ?? []).filter((r) => r.studyId === s.id);
  const chapterZero = s.chapters.find((c) => c.index === 0);
  const canSubmit = s.status === 'active' || s.status === 'draft' || s.status === 'changes_requested';

  return (
    <div>
      <PageHeader
        title={s.title}
        description={s.blockers.length > 0 ? s.blockers[0] : undefined}
        breadcrumb={[
          { label: 'خانه', to: '/dashboard' },
          { label: 'مطالعات', to: '/studies' },
          { label: s.title },
        ]}
        meta={
          <>
            <Badge tone="muted">
              <Ltr>{s.code}</Ltr>
            </Badge>
            <Badge tone="muted">{studyTypeLabels[s.studyType]}</Badge>
            <StatusBadge label={studyStatusLabels[s.status]} tone="primary" kind="dot" />
            <Badge tone="muted">{s.regionTitle}</Badge>
            <Badge tone="warning">{classificationLabels[s.classification]}</Badge>
            <DemoBadge />
          </>
        }
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => navigate(`/scenarios?study=${s.id}`)}
              iconEnd={<ArrowLeft size={15} />}
            >
              سناریوها
            </Button>
            <Button
              variant="primary"
              disabledReason={
                submitPermission.reason ?? (canSubmit ? null : 'وضعیت فعلی مطالعه اجازه ارسال برای بررسی نمی‌دهد.')
              }
              onClick={() => setSubmitOpen(true)}
            >
              ارسال برای بررسی
            </Button>
          </>
        }
      />

      <Tabs
        className="mb-4"
        value={tab}
        onChange={setTab}
        items={[
          { key: 'overview', label: 'نمای کلی' },
          { key: 'structure', label: 'ساختار مطالعه', badge: formatNumber(s.chapters.length) },
          { key: 'data', label: 'داده‌ها', badge: formatNumber((datasets.data ?? []).length) },
          { key: 'map', label: 'نقشه' },
          { key: 'rules', label: 'قوانین', badge: formatNumber((rules.data ?? []).length) },
          { key: 'scenarios', label: 'سناریوها', badge: formatNumber(studyScenarios.length) },
          { key: 'analyses', label: 'تحلیل‌ها', badge: formatNumber(studyRuns.length) },
          { key: 'evidence', label: 'شواهد', badge: formatNumber((evidence.data ?? []).length) },
          { key: 'report', label: 'گزارش', badge: formatNumber(studyReports.length) },
          { key: 'review', label: 'بررسی و تأیید', badge: formatNumber(studyReviews.length) },
          { key: 'history', label: 'تاریخچه' },
        ]}
      />

      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="کارهای انجام‌شده"
              value={`${formatNumber(s.progress.tasksCompleted)}/${formatNumber(s.progress.tasksTotal)}`}
              hint="شمارش کار، نه درصد پیشرفت ترکیبی"
            />
            <StatCard
              label="آمادگی داده"
              value={`${formatNumber(s.progress.dataReadinessPct)}٪`}
              tone="primary"
              hint="سهم ورودی‌های الزامی که به نسخه منتشرشده متصل‌اند"
            />
            <StatCard
              label="آمادگی تحلیل"
              value={`${formatNumber(s.progress.analysisReadinessPct)}٪`}
              tone="warning"
              hint="سهم ماژول‌های قابل اجرا با ورودی‌های موجود"
            />
            <StatCard
              label="تحویل‌های پذیرفته‌شده"
              value={formatNumber(s.progress.acceptedDeliverables)}
              tone="success"
            />
          </div>

          {s.blockers.length > 0 && (
            <Callout tone="warning" title="موانع خروجی رسمی">
              <ul className="list-disc space-y-1 ps-5">
                {s.blockers.map((blocker) => (
                  <li key={blocker}>{blocker}</li>
                ))}
              </ul>
            </Callout>
          )}

          <Card>
            <CardHeader title="چارچوب مطالعه" subtitle="نسخه‌های تثبیت‌شده در زمان ایجاد" />
            <DefinitionList
              columns={3}
              items={[
                { label: 'مسئول مطالعه', value: s.ownerName },
                { label: 'منطقه', value: s.regionTitle },
                { label: 'تاریخ مرجع', value: formatJalaliDate(s.referenceDate) },
                { label: 'افق برنامه‌ریزی', value: s.planningHorizon },
                { label: 'نسخه قالب', value: <Ltr>{s.templateVersionLabel}</Ltr> },
                { label: 'نسخه محدوده', value: <Ltr>{s.boundaryVersionLabel}</Ltr> },
                { label: 'بازنگری جاری', value: <span className="num">{formatNumber(s.revision)}</span> },
                { label: 'ایجاد', value: formatJalaliDate(s.createdAt, true) },
                { label: 'آخرین تغییر', value: formatRelative(s.updatedAt) },
              ]}
            />
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="مشارکت‌کنندگان" />
              <ul className="divide-y divide-border">
                {s.participants.map((p) => (
                  <li key={`${p.name}-${p.role}`} className="flex items-center justify-between py-2 text-[13px]">
                    <span>{p.name}</span>
                    <Badge tone="muted">{roleLabels[p.role]}</Badge>
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <CardHeader title="فصل صفر — چارچوب و دامنه" subtitle="پیش‌شرط انسجام مطالعه" />
              {chapterZero ? (
                <div className="space-y-2 text-[13px] leading-7">
                  <p className="text-muted">{chapterZero.note ?? 'تعریف دامنه، مفروضات و محدودیت‌های مطالعه.'}</p>
                  <StatusBadge
                    label={chapterStatusLabels[chapterZero.status]}
                    tone={CHAPTER_TONE[chapterZero.status].tone}
                    kind={CHAPTER_TONE[chapterZero.status].kind}
                  />
                </div>
              ) : (
                <p className="text-[13px] text-muted">فصل صفر برای این مطالعه ثبت نشده است.</p>
              )}
            </Card>
          </div>
        </div>
      )}

      {tab === 'structure' && (
        <Card>
          <CardHeader
            title="ساختار فصول"
            subtitle="وضعیت هر فصل جداگانه گزارش می‌شود؛ «نیازمند داده» با «ناقص» تفاوت دارد."
          />
          <ul>
            {s.chapters.map((chapter) => (
              <ChapterRow key={chapter.key} chapter={chapter} />
            ))}
          </ul>
        </Card>
      )}

      {tab === 'data' && (
        <Card>
          <CardHeader
            title="داده‌های مرتبط"
            subtitle="تنها نسخه‌های منتشرشده قابل انتخاب برای تحلیل هستند."
            action={
              <Link to="/datasets" className="text-xs text-primary-700 hover:underline">
                کاتالوگ کامل داده
              </Link>
            }
          />
          <ul className="divide-y divide-border">
            {(datasets.data ?? []).map((dataset) => {
              const current = dataset.versions.find((v) => v.id === dataset.currentVersionId);
              return (
                <li key={dataset.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <Link to={`/datasets/${dataset.id}`} className="text-[13px] font-medium hover:text-primary-700">
                      {dataset.title}
                    </Link>
                    <p className="text-xs text-muted">
                      متولی: {dataset.stewardName} · {dataset.temporalCoverage}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {current && (
                      <>
                        <Badge tone="muted">
                          نسخه <Ltr>{current.versionLabel}</Ltr>
                        </Badge>
                        <Badge
                          tone={
                            current.status === 'published'
                              ? 'success'
                              : current.status === 'quarantined'
                                ? 'danger'
                                : 'warning'
                          }
                        >
                          {datasetStatusShort[current.status]}
                        </Badge>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {tab === 'map' && (
        <Card>
          <CardHeader
            title="محدوده مطالعه"
            subtitle="نمای اجمالی. برای انتخاب عارضه و مشاهده ویژگی‌ها از میز کار GIS استفاده کنید."
            action={
              <Link to="/gis" className="inline-flex items-center gap-1 text-xs text-primary-700 hover:underline">
                میز کار GIS
                <ExternalLink size={12} />
              </Link>
            }
          />
          <MapCanvas
            parcels={parcels.data ?? []}
            layers={layers.data ?? []}
            height={420}
            showControls={false}
          />
        </Card>
      )}

      {tab === 'rules' && (
        <Card>
          <CardHeader
            title="قوانین قابل اعمال"
            subtitle="قوانین دارای تعارض حل‌نشده، نتیجه را «نامشخص» می‌کنند، نه «مغایر»."
            action={
              <Link to="/rules" className="text-xs text-primary-700 hover:underline">
                مخزن قوانین
              </Link>
            }
          />
          <ul className="divide-y divide-border">
            {(rules.data ?? []).map((rule) => (
              <li key={rule.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <Link to={`/rules/${rule.id}`} className="text-[13px] font-medium hover:text-primary-700">
                    {rule.title}
                  </Link>
                  <p className="text-xs text-muted">
                    <Ltr>{rule.code}</Ltr> · {rule.sourceLabel} · نسخه <Ltr>{rule.versionLabel}</Ltr>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {rule.isSynthetic && <Badge tone="warning">قانون نمونه</Badge>}
                  <Badge tone={rule.status === 'published' ? 'success' : rule.status === 'conflicted' ? 'danger' : 'muted'}>
                    {ruleStatusLabels[rule.status]}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {tab === 'scenarios' && (
        <Card>
          <CardHeader
            title="سناریوهای مطالعه"
            action={
              <Link to="/scenarios/new" className="text-xs text-primary-700 hover:underline">
                ایجاد سناریو
              </Link>
            }
          />
          {studyScenarios.length === 0 ? (
            <EmptyState
              title="سناریویی ثبت نشده است"
              description="برای تحلیل مقایسه‌ای، ابتدا سناریوی پایه و سپس سناریوی پیشنهادی را تعریف کنید."
            />
          ) : (
            <ul className="divide-y divide-border">
              {studyScenarios.map((scenario) => (
                <li key={scenario.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <Link
                      to={`/scenarios/${scenario.id}`}
                      className="text-[13px] font-medium hover:text-primary-700"
                    >
                      {scenario.name}
                    </Link>
                    <p className="text-xs text-muted">{scenario.purpose}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {scenario.isBaseline && <Badge tone="primary">پایه</Badge>}
                    <Badge tone="muted">
                      <Ltr>{scenario.code}</Ltr>
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === 'analyses' && (
        <Card>
          <CardHeader
            title="اجراهای تحلیل"
            action={
              <Link to="/analysis" className="text-xs text-primary-700 hover:underline">
                مرکز تحلیل
              </Link>
            }
          />
          {studyRuns.length === 0 ? (
            <EmptyState
              title="اجرایی ثبت نشده است"
              description="پس از تثبیت سناریو، می‌توانید ماژول‌های تحلیلی را اجرا کنید."
            />
          ) : (
            <ul className="divide-y divide-border">
              {studyRuns.map((run) => (
                <li key={run.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <Link
                      to={`/scenarios/${run.scenarioId}`}
                      className="text-[13px] font-medium hover:text-primary-700"
                    >
                      {run.scenarioName}
                    </Link>
                    <p className="num text-xs text-muted">
                      <Ltr>{run.code}</Ltr> · {formatJalaliDate(run.startedAt, true)} ·{' '}
                      {formatNumber(run.requestedModules.length)} ماژول
                    </p>
                  </div>
                  <RunStateBadge state={run.state} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === 'evidence' && (
        <Card>
          <CardHeader
            title="شواهد پیوست‌شده"
            subtitle="هر شاهد نوع، منبع، نسخه، دامنه و نسبت آن با ادعا را نشان می‌دهد."
            action={
              <Link to="/evidence" className="text-xs text-primary-700 hover:underline">
                همه شواهد
              </Link>
            }
          />
          <ul className="divide-y divide-border">
            {(evidence.data ?? []).map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium">{item.title}</p>
                  <p className="text-xs text-muted">
                    {item.sourceLabel} · نسخه <Ltr>{item.versionLabel}</Ltr> · {item.scope}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="muted">{evidenceTypeLabels[item.type]}</Badge>
                  {!item.accessible && <Badge tone="warning">دسترسی محدود</Badge>}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {tab === 'report' && (
        <Card>
          <CardHeader
            title="گزارش‌های مطالعه"
            action={
              <Link to="/reports" className="text-xs text-primary-700 hover:underline">
                مرکز گزارش‌ها
              </Link>
            }
          />
          {studyReports.length === 0 ? (
            <EmptyState
              title="گزارشی تولید نشده است"
              description="گزارش تنها از نتایج ثبت‌شده یک اجرا ساخته می‌شود؛ بخش‌های فاقد نتیجه به‌صراحت علامت‌گذاری می‌شوند."
            />
          ) : (
            <ul className="divide-y divide-border">
              {studyReports.map((report) => (
                <li key={report.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium">{report.title}</p>
                    <p className="text-xs text-muted">
                      <Ltr>{report.code}</Ltr> · نسخه <Ltr>{report.versionLabel}</Ltr>
                      {report.missingAnalyses.length > 0 &&
                        ` · ${formatNumber(report.missingAnalyses.length)} تحلیل تولیدنشده`}
                    </p>
                  </div>
                  <Badge tone={report.state === 'published' ? 'success' : 'muted'}>
                    {reportStateLabels[report.state]}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === 'review' && (
        <Card>
          <CardHeader
            title="بسته‌های بررسی"
            subtitle="هر بسته بررسی پس از ارسال تغییرناپذیر است و اگر نسخه جاری تغییر کند، «کهنه» علامت می‌خورد."
          />
          {studyReviews.length === 0 ? (
            <EmptyState
              title="بسته بررسی وجود ندارد"
              description="با ارسال مطالعه برای بررسی، بسته‌ای ثابت از وضعیت فعلی ساخته می‌شود."
            />
          ) : (
            <ul className="divide-y divide-border">
              {studyReviews.map((review) => (
                <li key={review.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <Link to={`/reviews/${review.id}`} className="text-[13px] font-medium hover:text-primary-700">
                      {review.subjectTitle}
                    </Link>
                    <p className="text-xs text-muted">
                      ارسال {formatRelative(review.submittedAt)} · اثر انگشت{' '}
                      <Ltr>{shortHash(review.bundleHash)}</Ltr>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {review.staleAgainstCurrent && <Badge tone="warning">کهنه نسبت به نسخه جاری</Badge>}
                    <Badge tone={review.state === 'approved' ? 'success' : 'muted'}>
                      {review.state === 'pending' ? 'در انتظار تصمیم' : review.state}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === 'history' && (
        <Card>
          <CardHeader title="تاریخچه و ردپای ممیزی" subtitle="هر تغییر با عامل، زمان، نسخه و دلیل ثبت می‌شود." />
          <Timeline
            items={(audit.data ?? []).map((entry) => ({
              id: entry.id,
              title: `${entry.action} — ${entry.subjectTitle}`,
              meta: `${entry.actor} (${roleLabels[entry.role]}) · ${formatJalaliDate(entry.at, true)}`,
              body: (
                <>
                  {entry.fromVersion && entry.toVersion && (
                    <span className="me-2">
                      از <Ltr>{entry.fromVersion}</Ltr> به <Ltr>{entry.toVersion}</Ltr>
                    </span>
                  )}
                  {entry.reason}
                </>
              ),
              tone: entry.outcome === 'rejected' ? 'danger' : 'success',
            }))}
          />
        </Card>
      )}

      <ConfirmDialog
        open={submitOpen}
        onCancel={() => setSubmitOpen(false)}
        onConfirm={() => {
          submit.mutate();
          setSubmitOpen(false);
        }}
        title="ارسال مطالعه برای بررسی"
        confirmLabel="ارسال برای بررسی"
        description={
          <div className="space-y-2">
            <p>با ارسال، بسته بررسی ثابتی از وضعیت فعلی ساخته می‌شود. این اقدام:</p>
            <ul className="list-disc space-y-1 ps-5">
              <li>مطالعه را به وضعیت «در حال بررسی» می‌برد.</li>
              <li>نسخه‌های داده، قوانین و نتایج مرجع را تثبیت می‌کند.</li>
              <li>به‌معنای تأیید قانونی یا صدور مجوز نیست.</li>
            </ul>
          </div>
        }
      />
    </div>
  );
}
