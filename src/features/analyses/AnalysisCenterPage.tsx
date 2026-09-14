import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { MODULES } from '@/api/analysis';
import { scenariosApi } from '@/api/scenarios';
import { useScenarioResults } from '@/hooks/useAnalysis';
import { Badge, Card, CardHeader, PageHeader, StatusBadge } from '@/components/ui/display';
import { Select } from '@/components/ui/inputs';
import { Callout, LoadingState } from '@/components/ui/feedback';
import { DemoBadge } from '@/components/workflow';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { missingReasonLabels } from '@/utils/dictionary';
import { formatNumber } from '@/utils/format';

export default function AnalysisCenterPage() {
  const activeScenarioId = useWorkspaceStore((s) => s.activeScenarioId);
  const setActiveScenario = useWorkspaceStore((s) => s.setActiveScenario);
  const { data: scenarios = [], isLoading } = useQuery({
    queryKey: ['scenarios', 'all'],
    queryFn: () => scenariosApi.list(),
  });
  const results = useScenarioResults(activeScenarioId ?? undefined);

  if (isLoading) return <LoadingState rows={4} />;

  const produced = MODULES.filter((m) => (results.byModule.get(m.id) ?? []).some((r) => r.value !== null));
  const blocked = MODULES.filter((m) => !m.availableInDemo);

  return (
    <div>
      <PageHeader
        eyebrow="تحلیل"
        title="مرکز تحلیل"
        description="دوازده ماژول تحلیلی سامانه. هر ماژول ورودی مشخص، روش نسخه‌دار و خروجی قابل ردیابی دارد؛ نبود ورودی به‌جای مقدار جایگزین، «تولید نشده» گزارش می‌شود."
        breadcrumb={[{ label: 'خانه', to: '/dashboard' }, { label: 'تحلیل‌ها' }]}
        meta={<DemoBadge />}
        actions={
          <Select
            aria-label="سناریوی فعال"
            value={activeScenarioId ?? ''}
            onChange={(event) => setActiveScenario(event.target.value)}
            options={scenarios.map((s) => ({ value: s.id, label: s.name }))}
          />
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-xs text-muted">ماژول‌های دارای نتیجه</p>
          <p className="num mt-1 text-2xl font-semibold">{formatNumber(produced.length)}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted">ماژول‌های بدون نتیجه در این محیط</p>
          <p className="num mt-1 text-2xl font-semibold">{formatNumber(blocked.length)}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted">کل شاخص‌های تولیدشده</p>
          <p className="num mt-1 text-2xl font-semibold">
            {formatNumber(results.results.filter((r) => r.value !== null).length)}
          </p>
        </Card>
      </div>

      {blocked.length > 0 && (
        <Callout tone="neutral" className="mb-4" title="چرا برخی ماژول‌ها نتیجه ندارند">
          ماژول‌های {blocked.map((m) => m.id).join('، ')} به ورودی‌هایی نیاز دارند که نسخه منتشرشده‌ای از آن‌ها
          در دسترس نیست. سامانه به‌جای برآورد جایگزین، نبود نتیجه را با دلیل ثبت می‌کند.
        </Callout>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {MODULES.map((module) => {
          const moduleResults = results.byModule.get(module.id) ?? [];
          const values = moduleResults.filter((r) => r.value !== null);
          return (
            <Card key={module.id}>
              <CardHeader
                title={
                  <span className="flex items-center gap-2">
                    <Badge tone="muted">{module.id}</Badge>
                    {module.title}
                  </span>
                }
                action={
                  module.availableInDemo ? (
                    <StatusBadge label="فعال" tone="success" kind="ok" />
                  ) : (
                    <StatusBadge label="بدون نتیجه" tone="muted" kind="blocked" />
                  )
                }
              />
              <p className="text-[13px] leading-7 text-muted">{module.purpose}</p>

              <dl className="mt-3 space-y-1 text-2xs text-muted">
                <div className="flex justify-between gap-2">
                  <dt>پیش‌نیازها</dt>
                  <dd>{module.dependsOn.length ? module.dependsOn.join('، ') : 'ندارد'}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>مدل تخصصی</dt>
                  <dd>{module.requiresModel ? 'نیاز دارد' : 'نیاز ندارد'}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>شاخص تولیدشده</dt>
                  <dd className="num">{formatNumber(values.length)}</dd>
                </div>
              </dl>

              {!module.availableInDemo && module.unavailableReason && (
                <p className="mt-2 text-2xs leading-5 text-muted">
                  دلیل: {missingReasonLabels[module.unavailableReason]}
                </p>
              )}

              <Link
                to={`/analysis/${module.id}`}
                className="mt-3 inline-flex items-center gap-1.5 text-xs text-primary-700 hover:underline"
              >
                مشاهده نتایج و روش
                <ArrowLeft size={13} />
              </Link>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
