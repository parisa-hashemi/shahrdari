import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AnalyticalResult } from '@/types/domain';
import { scenariosApi } from '@/api/scenarios';
import { runsApi } from '@/api/runs';
import { reportsApi, decisionsApi } from '@/api/governance';
import { MODULES } from '@/api/analysis';
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
  Tabs,
} from '@/components/ui/display';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/overlays';
import { Callout, EmptyState, LoadingState, ErrorState } from '@/components/ui/feedback';
import { ResultCard, ResultValue } from '@/components/provenance/ResultCard';
import { ProvenanceDrawer } from '@/components/provenance/ProvenanceDrawer';
import { RunMonitor, DemoBadge, usePermission } from '@/components/workflow';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import {
  interpretationLabels,
  ruleOutcomeLabels,
  scenarioStateLabels,
} from '@/utils/dictionary';
import { formatJalaliDate, formatNumber } from '@/utils/format';

export default function ScenarioDetailPage() {
  const { scenarioId = '' } = useParams();
  const [tab, setTab] = useState('results');
  const [inspect, setInspect] = useState<AnalyticalResult | null>(null);
  const [confirmRun, setConfirmRun] = useState(false);
  const user = useAuthStore((s) => s.user);
  const pushToast = useUiStore((s) => s.pushToast);
  const baselineId = useWorkspaceStore((s) => s.baselineScenarioId);
  const queryClient = useQueryClient();
  const runPerm = usePermission('run.execute');
  const cancelPerm = usePermission('run.cancel');
  const reportPerm = usePermission('report.draft');
  const freezePerm = usePermission('scenario.freeze');

  const scenarioQuery = useQuery({
    queryKey: ['scenario', scenarioId],
    queryFn: () => scenariosApi.get(scenarioId),
  });
  const ruleChecksQuery = useQuery({
    queryKey: ['rule-checks', scenarioId],
    queryFn: () => scenariosApi.ruleChecks(scenarioId),
  });
  const runQuery = useQuery({
    queryKey: ['run', 'latest', scenarioId],
    queryFn: () => runsApi.latestForScenario(scenarioId),
    refetchInterval: (query) => {
      const state = query.state.data?.state;
      return state === 'queued' || state === 'running' || state === 'cancelling' ? 1500 : false;
    },
  });
  const scenarioResults = useScenarioResults(scenarioId);
  const baselineResults = useScenarioResults(baselineId === scenarioId ? undefined : baselineId);

  const execute = useMutation({
    mutationFn: () => scenariosApi.execute(scenarioId, MODULES.map((m) => m.id), user.displayName),
    onSuccess: () => {
      queryClient.invalidateQueries();
      pushToast({ title: 'اجرای تحلیل آغاز شد', variant: 'info' });
    },
  });
  const cancel = useMutation({
    mutationFn: (runId: string) => runsApi.cancel(runId),
    onSuccess: () => {
      queryClient.invalidateQueries();
      pushToast({ title: 'درخواست لغو ثبت شد', variant: 'warning' });
    },
    onError: () =>
      pushToast({
        title: 'لغو ممکن نیست',
        description: 'این اجرا به وضعیت پایانی رسیده است.',
        variant: 'error',
      }),
  });
  const freeze = useMutation({
    mutationFn: () => scenariosApi.freeze(scenarioId, user.displayName),
    onSuccess: () => {
      queryClient.invalidateQueries();
      pushToast({ title: 'نسخه سناریو قفل شد', variant: 'success' });
    },
  });
  const createReport = useMutation({
    mutationFn: () =>
      reportsApi.create({
        title: `گزارش ${scenarioQuery.data?.name ?? ''}`,
        studyId: scenarioQuery.data?.studyId ?? '',
        scenarioIds: [scenarioId],
        missing: (runQuery.data?.nodes ?? [])
          .filter((n) => n.state === 'blocked' || n.state === 'failed')
          .map((n) => n.moduleId),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      pushToast({ title: 'پیش‌نویس گزارش ساخته شد', description: 'در بخش گزارش‌ها قابل ویرایش است.', variant: 'success' });
    },
  });
  const createPackage = useMutation({
    mutationFn: () =>
      decisionsApi.create({
        title: `بسته تصمیم ${scenarioQuery.data?.name ?? ''}`,
        studyId: scenarioQuery.data?.studyId ?? '',
        baselineScenarioId: baselineId,
        proposedScenarioId: scenarioId,
        runId: runQuery.data?.id ?? '',
        summary: `مقایسه «${scenarioQuery.data?.name ?? ''}» با سناریوی مبنا بر پایه نتایج اجرای ثبت‌شده.`,
        keyChanges: comparison
          .filter((row) => row.comparable && row.delta !== null && row.delta !== 0)
          .slice(0, 5)
          .map((row) => `${row.title}: تغییر نسبت به مبنا ثبت شده است.`),
        limitations: [
          'مقادیر سناریو پیشنهادی‌اند و مشاهده میدانی محسوب نمی‌شوند.',
          'ضرایب و قوانین این محیط نمونه‌اند و مبنای رسمی نیستند.',
        ],
        missing: (runQuery.data?.nodes ?? [])
          .filter((n) => n.state === 'blocked' || n.state === 'failed')
          .map((n) => n.moduleId),
      }),
    onSuccess: (pkg) => {
      queryClient.invalidateQueries();
      pushToast({ title: 'بسته تصمیم ساخته شد', variant: 'success' });
      window.location.assign(`/decision-packages/${pkg.id}`);
    },
  });

  if (scenarioQuery.isLoading) return <LoadingState rows={4} />;
  if (scenarioQuery.isError) return <ErrorState onRetry={() => scenarioQuery.refetch()} />;
  const scenario = scenarioQuery.data;
  if (!scenario) return <EmptyState title="سناریو یافت نشد" />;

  const version = scenario.versions.find((v) => v.id === scenario.currentVersionId) ?? scenario.versions[0];
  const run = runQuery.data;
  const comparison = buildComparison(baselineResults.byMetric, scenarioResults.byMetric);
  const missingResults = scenarioResults.results.filter((r) => r.value === null);

  return (
    <div>
      <PageHeader
        title={scenario.name}
        description={scenario.purpose}
        breadcrumb={[
          { label: 'خانه', to: '/dashboard' },
          { label: 'سناریوها', to: '/scenarios' },
          { label: scenario.name },
        ]}
        meta={
          <>
            <Ltr className="text-xs text-muted">{scenario.code}</Ltr>
            <Badge tone={scenario.isBaseline ? 'success' : 'warning'}>
              {scenario.isBaseline ? 'مبنا (وضع موجود)' : interpretationLabels[version.interpretation]}
            </Badge>
            <Badge tone="muted">
              نسخه <Ltr>{version.versionLabel}</Ltr> — {scenarioStateLabels[version.state]}
            </Badge>
            <DemoBadge />
          </>
        }
        actions={
          <>
            <Button
              disabledReason={
                version.state === 'frozen' ? 'این نسخه قبلاً قفل شده است.' : freezePerm.reason
              }
              loading={freeze.isPending}
              onClick={() => freeze.mutate()}
            >
              قفل‌کردن نسخه
            </Button>
            <Button
              variant="primary"
              disabledReason={runPerm.reason}
              loading={execute.isPending}
              onClick={() => setConfirmRun(true)}
            >
              اجرای تحلیل
            </Button>
          </>
        }
      />

      {run && (
        <div className="mb-4">
          <RunMonitor
            run={run}
            onCancel={cancelPerm.allowed ? () => cancel.mutate(run.id) : undefined}
            onRetry={runPerm.allowed ? () => execute.mutate() : undefined}
          />
        </div>
      )}

      <Tabs
        className="mb-4"
        value={tab}
        onChange={setTab}
        items={[
          { key: 'results', label: 'نتایج تحلیلی', badge: formatNumber(scenarioResults.results.length) },
          { key: 'rules', label: 'انطباق با قوانین' },
          { key: 'compare', label: 'مقایسه با مبنا' },
          { key: 'inputs', label: 'ورودی‌ها و نسخه‌ها' },
        ]}
      />

      {tab === 'results' && (
        <div className="space-y-4">
          {missingResults.length > 0 && (
            <Callout tone="warning" title="بخشی از نتایج تولید نشده است">
              {formatNumber(missingResults.length)} شاخص با دلیل مشخص تولید نشده است. این مقادیر صفر نیستند
              و در گزارش نیز به‌همین شکل حمل می‌شوند.
            </Callout>
          )}
          {scenarioResults.isLoading ? (
            <LoadingState rows={3} />
          ) : scenarioResults.results.length === 0 ? (
            <EmptyState
              title="نتیجه‌ای برای این سناریو موجود نیست"
              description="برای تولید نتایج، تحلیل را اجرا کنید."
              action={
                <Button variant="primary" disabledReason={runPerm.reason} onClick={() => setConfirmRun(true)}>
                  اجرای تحلیل
                </Button>
              }
            />
          ) : (
            MODULES.filter((module) => scenarioResults.byModule.has(module.id)).map((module) => (
              <section key={module.id}>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge tone="muted">{module.id}</Badge>
                  <h2 className="text-[14px] font-semibold">{module.title}</h2>
                  <Link to={`/analysis/${module.id}`} className="text-xs text-primary-700 hover:underline">
                    جزئیات ماژول
                  </Link>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {(scenarioResults.byModule.get(module.id) ?? []).map((result) => (
                    <ResultCard key={result.id} result={result} onInspect={setInspect} />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      )}

      {tab === 'rules' && (
        <Card>
          <CardHeader
            title="نتیجه بررسی انطباق"
            subtitle="نتیجه «نامشخص» یعنی ارزیابی ممکن نبوده است؛ به‌معنای «مجاز» نیست"
          />
          {ruleChecksQuery.isLoading ? (
            <LoadingState rows={2} />
          ) : (
            <ul className="space-y-2">
              {(ruleChecksQuery.data ?? []).map((check) => (
                <li key={check.ruleCode} className="rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[13px] font-medium">
                      {check.ruleTitle} <Ltr className="text-2xs text-faint">{check.ruleCode}</Ltr>
                    </span>
                    <StatusBadge
                      label={ruleOutcomeLabels[check.outcome]}
                      tone={
                        check.outcome === 'pass'
                          ? 'success'
                          : check.outcome === 'fail'
                            ? 'danger'
                            : check.outcome === 'unknown'
                              ? 'warning'
                              : 'muted'
                      }
                      kind={
                        check.outcome === 'pass'
                          ? 'ok'
                          : check.outcome === 'fail'
                            ? 'error'
                            : check.outcome === 'unknown'
                              ? 'unknown'
                              : 'blocked'
                      }
                    />
                  </div>
                  <p className="mt-1 text-xs leading-6 text-muted">{check.reason}</p>
                  <p className="mt-1 text-2xs text-faint">
                    مرجع: {check.sourceLabel}
                    <span className="mx-2">·</span>
                    نسخه: <Ltr>{check.versionLabel}</Ltr>
                    {check.conflictStatus === 'unresolved' && (
                      <>
                        <span className="mx-2">·</span>
                        <span className="text-warning">تعارض حل‌نشده</span>
                      </>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === 'compare' && (
        <Card padded={false}>
          <div className="border-b border-border p-4">
            <CardHeader
              title="مقایسه با سناریوی مبنا"
              subtitle="تنها شاخص‌هایی مقایسه می‌شوند که در هر دو سو تولید شده و واحد یکسان دارند"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-[13px]">
              <thead className="bg-surface-2 text-xs text-muted">
                <tr>
                  <th className="px-3 py-2.5 text-start">شاخص</th>
                  <th className="px-3 py-2.5 text-start">مبنا</th>
                  <th className="px-3 py-2.5 text-start">سناریو</th>
                  <th className="px-3 py-2.5 text-start">تغییر</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((row) => (
                  <tr key={row.code} className="border-b border-border last:border-0">
                    <td className="px-3 py-2.5">
                      <span className="font-medium">{row.title}</span>
                      <Ltr className="block text-2xs text-faint">{row.code}</Ltr>
                    </td>
                    <td className="px-3 py-2.5">
                      <ResultValue result={row.baseline} />
                    </td>
                    <td className="px-3 py-2.5">
                      <ResultValue result={row.scenario} />
                    </td>
                    <td className="px-3 py-2.5">
                      <DeltaPill
                        delta={row.delta}
                        percent={row.deltaPercent}
                        direction={row.direction}
                        precision={row.precision}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-border p-4">
            <p className="text-2xs leading-6 text-muted">
              جایی که یک سو نتیجه ندارد، تغییر محاسبه نمی‌شود و «قابل مقایسه نیست» نمایش داده می‌شود.
              اختلاف صفر با نبود نتیجه یکی نیست.
            </p>
          </div>
        </Card>
      )}

      {tab === 'inputs' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="پارامترهای نسخه" />
            <DefinitionList
              columns={2}
              items={[
                { label: 'سطح اشغال', value: <span className="num">{formatNumber(version.overrides.footprintM2)} m²</span> },
                { label: 'طبقات', value: <span className="num">{formatNumber(version.overrides.floors)}</span> },
                { label: 'عرضه پارکینگ', value: <span className="num">{formatNumber(version.overrides.parkingSupplySpaces)}</span> },
                { label: 'ظرفیت آموزشی', value: <span className="num">{formatNumber(version.overrides.educationCapacitySeats)}</span> },
                { label: 'ظرفیت درمانی', value: <span className="num">{formatNumber(version.overrides.healthCapacityBeds, { precision: 2 })}</span> },
                { label: 'فضای سبز', value: <span className="num">{formatNumber(version.overrides.greenAreaM2)} m²</span> },
              ]}
            />
          </Card>
          <Card>
            <CardHeader title="نسخه‌های تثبیت‌شده" />
            <DefinitionList
              columns={1}
              items={[
                { label: 'بسته قوانین', value: <Ltr>{scenario.rulePackVersionLabel}</Ltr> },
                {
                  label: 'اقلام داده',
                  value: (
                    <ul className="space-y-1">
                      {scenario.datasetPins.map((pin) => (
                        <li key={pin.label} className="flex items-center justify-between gap-2">
                          <span>{pin.label}</span>
                          <Badge tone="primary">
                            <Ltr>{pin.versionLabel}</Ltr>
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  ),
                },
                { label: 'اثر انگشت ورودی', value: <Ltr>{version.inputManifestHash}</Ltr> },
                {
                  label: 'زمان قفل نسخه',
                  value: version.frozenAt ? formatJalaliDate(version.frozenAt, true) : 'قفل نشده است',
                },
              ]}
            />
          </Card>
        </div>
      )}

      <Card className="mt-4">
        <CardHeader title="اقدام‌های بعدی" subtitle="خروجی‌های رسمی از همین نتایج ساخته می‌شوند" />
        <div className="flex flex-wrap gap-2">
          <Button
            disabledReason={reportPerm.reason}
            loading={createReport.isPending}
            onClick={() => createReport.mutate()}
          >
            ساخت پیش‌نویس گزارش
          </Button>
          <Button
            variant="primary"
            disabledReason={
              reportPerm.reason ?? (run && run.state !== 'queued' && run.state !== 'running' ? null : 'ابتدا اجرای تحلیل باید کامل شود.')
            }
            loading={createPackage.isPending}
            onClick={() => createPackage.mutate()}
          >
            ساخت بسته تصمیم
          </Button>
          <Link
            to="/scenarios/compare"
            className="inline-flex h-9 items-center rounded-md border border-border-strong px-3.5 text-sm hover:bg-surface-2"
          >
            مقایسه چند سناریو
          </Link>
        </div>
      </Card>

      <ProvenanceDrawer result={inspect} open={Boolean(inspect)} onClose={() => setInspect(null)} />

      <ConfirmDialog
        open={confirmRun}
        title="اجرای تحلیل"
        confirmLabel="شروع اجرا"
        busy={execute.isPending}
        onCancel={() => setConfirmRun(false)}
        onConfirm={() => {
          execute.mutate();
          setConfirmRun(false);
        }}
        description={
          <div className="space-y-2">
            <p>با شروع اجرا:</p>
            <ul className="list-disc space-y-1 ps-5">
              <li>نسخه فعلی سناریو قفل می‌شود.</li>
              <li>نسخه‌های داده و بسته قوانین تثبیت می‌شوند.</li>
              <li>ماژول‌هایی که ورودی لازم ندارند، نتیجه تولید نمی‌کنند و دلیل آن ثبت می‌شود.</li>
            </ul>
          </div>
        }
      />
    </div>
  );
}
