import { useSearchParams, Link } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { regionsApi, datasetsApi, rulesApi, modelsApi } from '@/api/catalog';
import { studiesApi } from '@/api/studies';
import {
  Badge,
  Card,
  CardHeader,
  DefinitionList,
  Ltr,
  PageHeader,
  StatusBadge,
  Tabs,
} from '@/components/ui/display';
import { Callout, LoadingState, Progress, EmptyState } from '@/components/ui/feedback';
import { DemoBadge } from '@/components/workflow';
import { formatNumber } from '@/utils/format';
import { studyStatusLabels } from '@/utils/dictionary';

export default function RegionsPage() {
  const [params, setParams] = useSearchParams();
  const view = params.get('view') ?? 'overview';

  const [regionsQ, datasetsQ, rulesQ, modelsQ, studiesQ] = useQueries({
    queries: [
      { queryKey: ['regions'], queryFn: regionsApi.list },
      { queryKey: ['datasets'], queryFn: datasetsApi.list },
      { queryKey: ['rules'], queryFn: rulesApi.list },
      { queryKey: ['models'], queryFn: modelsApi.list },
      { queryKey: ['studies', {}], queryFn: () => studiesApi.list() },
    ],
  });

  if (regionsQ.isLoading) return <LoadingState rows={3} />;
  const regions = regionsQ.data ?? [];

  return (
    <div>
      <PageHeader
        eyebrow="فضای کاری"
        title="مناطق شهری"
        description="هر منطقه یک «پکیج منطقه» دارد: مرز رسمی، اقلام داده منتشرشده، بسته قوانین تأییدشده و مدل‌های متصل. تحلیل تنها زمانی معتبر است که پکیج منطقه منتشر شده باشد."
        meta={<DemoBadge />}
      />

      <Tabs
        className="mb-4"
        value={view}
        onChange={(key) => setParams(key === 'overview' ? {} : { view: key })}
        items={[
          { key: 'overview', label: 'نمای کلی' },
          { key: 'pack', label: 'پکیج منطقه' },
          { key: 'readiness', label: 'وضعیت آمادگی' },
        ]}
      />

      {view === 'overview' && (
        <div className="grid gap-4 lg:grid-cols-3">
          {regions.map((region) => {
            const regionStudies = (studiesQ.data ?? []).filter((s) => s.regionId === region.id);
            return (
              <Card key={region.id}>
                <CardHeader
                  title={region.title}
                  subtitle={`مساحت ${formatNumber(region.areaKm2, { precision: 1 })} کیلومتر مربع`}
                  action={
                    <Badge tone={region.packState === 'published' ? 'success' : 'warning'}>
                      {region.packState === 'published'
                        ? 'پکیج منتشرشده'
                        : region.packState === 'outdated'
                          ? 'پکیج قدیمی'
                          : 'پکیج پیش‌نویس'}
                    </Badge>
                  }
                />
                <DefinitionList
                  columns={2}
                  items={[
                    { label: 'کد منطقه', value: <Ltr>{region.code}</Ltr> },
                    {
                      label: 'جمعیت ثبت‌شده',
                      value:
                        region.populationObserved === null ? (
                          <span className="text-muted">داده منتشرشده‌ای موجود نیست</span>
                        ) : (
                          <span className="num">{formatNumber(region.populationObserved)} نفر</span>
                        ),
                    },
                    { label: 'نسخه مرز', value: <Ltr>{region.boundaryVersionLabel}</Ltr> },
                    { label: 'نسخه پکیج', value: <Ltr>{region.packVersionLabel}</Ltr> },
                  ]}
                />
                <div className="mt-3 border-t border-border pt-3">
                  <p className="mb-1.5 text-xs text-muted">مطالعات مرتبط</p>
                  {regionStudies.length === 0 ? (
                    <p className="text-[13px] text-muted">مطالعه‌ای در این منطقه ثبت نشده است.</p>
                  ) : (
                    <ul className="space-y-1">
                      {regionStudies.slice(0, 3).map((study) => (
                        <li key={study.id} className="flex items-center justify-between gap-2">
                          <Link
                            to={`/studies/${study.id}`}
                            className="truncate text-[13px] hover:text-primary-700"
                          >
                            {study.title}
                          </Link>
                          <Badge tone="muted">{studyStatusLabels[study.status]}</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {view === 'pack' && (
        <div className="space-y-4">
          <Callout tone="neutral">
            پکیج منطقه مجموعه‌ای نسخه‌دار از مرز، داده، قوانین و مدل‌هاست. تغییر هر جزء، نسخه جدیدی از
            پکیج می‌سازد و تحلیل‌های قبلی به نسخه‌ای که با آن اجرا شده‌اند متصل می‌مانند.
          </Callout>
          {regions.map((region) => {
            const datasets = (datasetsQ.data ?? []).filter((d) => d.regionIds.includes(region.id));
            const publishedDatasets = datasets.filter((d) =>
              d.versions.some((v) => v.status === 'published'),
            );
            const rules = (rulesQ.data ?? []).filter((r) => r.jurisdiction.includes(region.title) || r.isSynthetic);
            const models = (modelsQ.data ?? []).filter((m) => m.status === 'available');
            return (
              <Card key={region.id}>
                <CardHeader
                  title={`پکیج ${region.title}`}
                  subtitle={`نسخه ${region.packVersionLabel}`}
                  action={
                    <StatusBadge
                      label={region.packState === 'published' ? 'منتشرشده' : 'پیش‌نویس'}
                      tone={region.packState === 'published' ? 'success' : 'warning'}
                      kind={region.packState === 'published' ? 'ok' : 'pending'}
                    />
                  }
                />
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-muted">اقلام داده منتشرشده</p>
                    <ul className="space-y-1 text-[13px]">
                      {publishedDatasets.length === 0 && (
                        <li className="text-muted">قلم داده منتشرشده‌ای وجود ندارد.</li>
                      )}
                      {publishedDatasets.map((dataset) => (
                        <li key={dataset.id}>
                          <Link to={`/datasets/${dataset.id}`} className="hover:text-primary-700">
                            {dataset.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-muted">قوانین بسته</p>
                    <ul className="space-y-1 text-[13px]">
                      {rules.slice(0, 5).map((rule) => (
                        <li key={rule.id} className="flex items-center justify-between gap-2">
                          <Link to={`/rules/${rule.id}`} className="truncate hover:text-primary-700">
                            {rule.title}
                          </Link>
                          <Ltr className="text-2xs text-faint">{rule.versionLabel}</Ltr>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-muted">مدل‌های متصل</p>
                    <ul className="space-y-1 text-[13px]">
                      {models.length === 0 && <li className="text-muted">مدلی متصل نیست.</li>}
                      {models.slice(0, 5).map((model) => (
                        <li key={model.id}>
                          <Link to={`/models/${model.id}`} className="hover:text-primary-700">
                            {model.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {view === 'readiness' && (
        <div className="space-y-4">
          {regions.length === 0 && <EmptyState title="منطقه‌ای در دامنه دسترسی شما نیست" />}
          {regions.map((region) => {
            const r = region.readiness;
            return (
              <Card key={region.id}>
                <CardHeader
                  title={region.title}
                  subtitle="آمادگی به تفکیک سنجه — بدون درصد تجمیعی گمراه‌کننده"
                />
                <div className="grid gap-4 md:grid-cols-3">
                  <Progress
                    value={Math.round((r.datasetsPublished / r.datasetsRequired) * 100)}
                    label={`داده منتشرشده (${formatNumber(r.datasetsPublished)} از ${formatNumber(r.datasetsRequired)})`}
                  />
                  <Progress
                    value={Math.round((r.rulesApproved / r.rulesRequired) * 100)}
                    tone="warning"
                    label={`قوانین تأییدشده (${formatNumber(r.rulesApproved)} از ${formatNumber(r.rulesRequired)})`}
                  />
                  <Progress
                    value={Math.round((r.modelsBound / r.modelsRequired) * 100)}
                    tone="success"
                    label={`مدل‌های متصل (${formatNumber(r.modelsBound)} از ${formatNumber(r.modelsRequired)})`}
                  />
                </div>
                <p className="mt-3 text-xs leading-6 text-muted">
                  تا زمانی که اقلام الزامی منتشر نشده‌اند، خروجی‌های وابسته با وضعیت «تولید نشده» و دلیل
                  مشخص نمایش داده می‌شوند؛ هیچ مقداری جایگزین یا صفر فرض نمی‌شود.
                </p>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
