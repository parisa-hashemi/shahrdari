import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { AnalyticalResult, ModuleId } from '@/types/domain';
import { MODULES } from '@/api/analysis';
import { scenariosApi } from '@/api/scenarios';
import { modelsApi } from '@/api/catalog';
import { useScenarioResults } from '@/hooks/useAnalysis';
import {
  Badge,
  Card,
  CardHeader,
  DefinitionList,
  Ltr,
  PageHeader,
  StatusBadge,
} from '@/components/ui/display';
import { Select } from '@/components/ui/inputs';
import { Callout, EmptyState, LoadingState, UnavailableState } from '@/components/ui/feedback';
import { ResultCard } from '@/components/provenance/ResultCard';
import { ProvenanceDrawer } from '@/components/provenance/ProvenanceDrawer';
import { DemoBadge } from '@/components/workflow';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { missingReasonLabels, methodClassLabels, modelStatusLabels } from '@/utils/dictionary';
import { formatNumber } from '@/utils/format';

export default function ModulePage() {
  const { moduleId = 'M01' } = useParams();
  const [inspect, setInspect] = useState<AnalyticalResult | null>(null);
  const activeScenarioId = useWorkspaceStore((s) => s.activeScenarioId);
  const setActiveScenario = useWorkspaceStore((s) => s.setActiveScenario);

  const module = MODULES.find((m) => m.id === (moduleId as ModuleId));
  const { data: scenarios = [] } = useQuery({ queryKey: ['scenarios', 'all'], queryFn: () => scenariosApi.list() });
  const { data: models = [] } = useQuery({ queryKey: ['models'], queryFn: modelsApi.list });
  const results = useScenarioResults(activeScenarioId ?? undefined);

  if (!module) {
    return <EmptyState title="ماژول یافت نشد" description="شناسه ماژول معتبر نیست." />;
  }

  const moduleResults = results.byModule.get(module.id) ?? [];
  const linkedModels = models.filter((m) => m.linkedModules.includes(module.id));
  const dependencies = MODULES.filter((m) => module.dependsOn.includes(m.id));
  const dependents = MODULES.filter((m) => m.dependsOn.includes(module.id));

  return (
    <div>
      <PageHeader
        title={module.title}
        description={module.purpose}
        breadcrumb={[
          { label: 'خانه', to: '/dashboard' },
          { label: 'تحلیل‌ها', to: '/analysis' },
          { label: module.title },
        ]}
        meta={
          <>
            <Badge tone="primary">{module.id}</Badge>
            {module.availableInDemo ? (
              <StatusBadge label="قابل اجرا" tone="success" kind="ok" />
            ) : (
              <StatusBadge label="در این محیط نتیجه‌ای تولید نمی‌شود" tone="muted" kind="blocked" />
            )}
            <DemoBadge />
          </>
        }
        actions={
          <Select
            aria-label="سناریوی فعال"
            value={activeScenarioId ?? ''}
            onChange={(event) => setActiveScenario(event.target.value)}
            options={scenarios.map((s) => ({ value: s.id, label: s.name }))}
          />
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {results.isLoading ? (
            <LoadingState rows={3} />
          ) : moduleResults.length === 0 ? (
            <UnavailableState
              title="نتیجه‌ای برای این ماژول در سناریوی انتخابی وجود ندارد"
              description={
                module.unavailableReason
                  ? `${missingReasonLabels[module.unavailableReason]} این وضعیت با خطای اجرا تفاوت دارد؛ هیچ مقداری تولید نشده و هیچ مقداری صفر فرض نمی‌شود.`
                  : 'برای تولید نتیجه، تحلیل سناریو را اجرا کنید.'
              }
            />
          ) : (
            <>
              {moduleResults.some((r) => r.value === null) && (
                <Callout tone="warning" title="بخشی از شاخص‌های این ماژول تولید نشده است">
                  دلیل هر مورد روی همان کارت ثبت شده است. مقدار خالی معادل صفر نیست.
                </Callout>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                {moduleResults.map((result) => (
                  <ResultCard key={result.id} result={result} onInspect={setInspect} />
                ))}
              </div>
            </>
          )}

          <Card>
            <CardHeader title="روش تولید نتیجه" subtitle="روش و نسخه آن همراه هر نتیجه ثبت می‌شود" />
            {moduleResults[0] ? (
              <DefinitionList
                columns={2}
                items={[
                  { label: 'طبقه روش', value: methodClassLabels[moduleResults[0].provenance.methodClass] },
                  { label: 'نسخه روش', value: <Ltr>{moduleResults[0].provenance.methodVersion}</Ltr> },
                  { label: 'دامنه مکانی', value: moduleResults[0].geographicScope },
                  { label: 'دوره زمانی', value: moduleResults[0].temporalScope },
                ]}
              />
            ) : (
              <p className="text-[13px] text-muted">
                تا زمانی که نتیجه‌ای تولید نشود، نسخه روش برای این سناریو ثبت نمی‌شود.
              </p>
            )}
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader title="وابستگی‌ها" />
            <div className="space-y-3 text-[13px]">
              <div>
                <p className="mb-1 text-xs text-muted">پیش‌نیاز این ماژول</p>
                {dependencies.length === 0 ? (
                  <p className="text-muted">پیش‌نیازی ندارد.</p>
                ) : (
                  <ul className="space-y-1">
                    {dependencies.map((dep) => (
                      <li key={dep.id}>
                        <Link to={`/analysis/${dep.id}`} className="hover:text-primary-700">
                          <Badge tone="muted">{dep.id}</Badge> {dep.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="mb-1 text-xs text-muted">ماژول‌های وابسته به این ماژول</p>
                {dependents.length === 0 ? (
                  <p className="text-muted">ماژولی به آن وابسته نیست.</p>
                ) : (
                  <ul className="space-y-1">
                    {dependents.map((dep) => (
                      <li key={dep.id}>
                        <Link to={`/analysis/${dep.id}`} className="hover:text-primary-700">
                          <Badge tone="muted">{dep.id}</Badge> {dep.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="مدل‌های مرتبط" />
            {linkedModels.length === 0 ? (
              <p className="text-[13px] text-muted">این ماژول به مدل تخصصی نیاز ندارد.</p>
            ) : (
              <ul className="space-y-2">
                {linkedModels.map((model) => (
                  <li key={model.id} className="flex items-start justify-between gap-2">
                    <Link to={`/models/${model.id}`} className="text-[13px] hover:text-primary-700">
                      {model.name}
                    </Link>
                    <Badge tone={model.status === 'available' ? 'success' : 'warning'}>
                      {modelStatusLabels[model.status]}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="شمارش نتایج" />
            <DefinitionList
              columns={1}
              items={[
                { label: 'شاخص تولیدشده', value: <span className="num">{formatNumber(moduleResults.filter((r) => r.value !== null).length)}</span> },
                { label: 'شاخص تولیدنشده', value: <span className="num">{formatNumber(moduleResults.filter((r) => r.value === null).length)}</span> },
              ]}
            />
          </Card>
        </aside>
      </div>

      <ProvenanceDrawer result={inspect} open={Boolean(inspect)} onClose={() => setInspect(null)} />
    </div>
  );
}
