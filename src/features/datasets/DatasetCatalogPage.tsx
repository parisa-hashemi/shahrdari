import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Upload } from 'lucide-react';
import type { Dataset, DatasetVersionStatus } from '@/types/domain';
import { datasetsApi, regionsApi } from '@/api/catalog';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { Badge, Ltr, PageHeader, StatusBadge, type Tone } from '@/components/ui/display';
import { Callout, LoadingState, ErrorState } from '@/components/ui/feedback';
import { SearchInput, Select } from '@/components/ui/inputs';
import { Button } from '@/components/ui/Button';
import { DemoBadge, usePermission } from '@/components/workflow';
import { classificationLabels, datasetStatusLabels } from '@/utils/dictionary';
import { formatJalaliDate, formatNumber } from '@/utils/format';

export const DATASET_TONE: Record<DatasetVersionStatus, { tone: Tone; kind: 'ok' | 'warn' | 'error' | 'pending' | 'blocked' | 'unknown' }> = {
  draft: { tone: 'muted', kind: 'pending' },
  validating: { tone: 'info', kind: 'pending' },
  quarantined: { tone: 'danger', kind: 'error' },
  ready: { tone: 'warning', kind: 'warn' },
  published: { tone: 'success', kind: 'ok' },
  superseded: { tone: 'muted', kind: 'unknown' },
  withdrawn: { tone: 'muted', kind: 'blocked' },
};

export function currentVersion(dataset: Dataset) {
  return dataset.versions.find((v) => v.id === dataset.currentVersionId) ?? dataset.versions[0];
}

export default function DatasetCatalogPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [kind, setKind] = useState('all');
  const [regionId, setRegionId] = useState('all');
  const upload = usePermission('dataset.upload');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['datasets'],
    queryFn: datasetsApi.list,
  });
  const { data: regions = [] } = useQuery({ queryKey: ['regions'], queryFn: regionsApi.list });

  const rows = useMemo(() => {
    return (data ?? []).filter((dataset) => {
      const version = currentVersion(dataset);
      if (search && !`${dataset.title} ${dataset.code} ${dataset.ownerOrg}`.includes(search.trim())) return false;
      if (status !== 'all' && version?.status !== status) return false;
      if (kind !== 'all' && dataset.dataKind !== kind) return false;
      if (regionId !== 'all' && !dataset.regionIds.includes(regionId)) return false;
      return true;
    });
  }, [data, search, status, kind, regionId]);

  if (isLoading) return <LoadingState rows={4} />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  const columns: Column<Dataset>[] = [
    {
      key: 'title',
      header: 'قلم داده',
      sortValue: (d) => d.title,
      cell: (d) => (
        <div className="min-w-0">
          <p className="font-medium">{d.title}</p>
          <Ltr className="text-2xs text-faint">{d.code}</Ltr>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'وضعیت نسخه جاری',
      sortValue: (d) => currentVersion(d)?.status ?? '',
      cell: (d) => {
        const version = currentVersion(d);
        const tone = DATASET_TONE[version.status];
        return (
          <span className="flex flex-col items-start gap-1">
            <StatusBadge label={datasetStatusLabels[version.status]} tone={tone.tone} kind={tone.kind} />
            <Ltr className="text-2xs text-faint">{version.versionLabel}</Ltr>
          </span>
        );
      },
    },
    {
      key: 'owner',
      header: 'متولی',
      sortValue: (d) => d.ownerOrg,
      cell: (d) => (
        <span className="text-xs">
          {d.ownerOrg}
          <span className="block text-2xs text-muted">{d.stewardName}</span>
        </span>
      ),
    },
    {
      key: 'coverage',
      header: 'پوشش',
      cell: (d) => (
        <span className="text-xs">
          {d.spatialCoverage}
          <span className="block text-2xs text-muted">{d.temporalCoverage}</span>
        </span>
      ),
      optional: true,
    },
    {
      key: 'rows',
      header: 'تعداد رکورد',
      align: 'end',
      sortValue: (d) => currentVersion(d)?.rowCount ?? 0,
      cell: (d) => <span className="num">{formatNumber(currentVersion(d)?.rowCount ?? 0)}</span>,
    },
    {
      key: 'classification',
      header: 'طبقه‌بندی',
      cell: (d) => <Badge tone="muted">{classificationLabels[d.classification]}</Badge>,
      optional: true,
    },
    {
      key: 'updated',
      header: 'آخرین تغییر',
      sortValue: (d) => d.updatedAt,
      cell: (d) => <span className="text-xs text-muted">{formatJalaliDate(d.updatedAt)}</span>,
    },
  ];

  const quarantined = (data ?? []).filter((d) => d.versions.some((v) => v.status === 'quarantined'));

  return (
    <div>
      <PageHeader
        eyebrow="داده و مکان"
        title="کاتالوگ داده"
        description="هر قلم داده متولی، دامنه پوشش، شرایط استفاده و تاریخچه نسخه دارد. تنها نسخه‌های «منتشرشده» در تحلیل قابل انتخاب‌اند."
        breadcrumb={[{ label: 'خانه', to: '/dashboard' }, { label: 'داده‌ها' }]}
        meta={<DemoBadge />}
        actions={
          <>
            <Link
              to="/datasets/compare"
              className="inline-flex h-9 items-center rounded-md border border-border-strong px-3.5 text-sm hover:bg-surface-2"
            >
              مقایسه نسخه‌ها
            </Link>
            <Button
              variant="primary"
              icon={<Upload size={15} />}
              disabledReason={upload.reason}
              onClick={() => navigate('/datasets/ingest')}
            >
              ورود داده جدید
            </Button>
          </>
        }
      />

      {quarantined.length > 0 && (
        <Callout tone="warning" title="نسخه قرنطینه‌شده وجود دارد" className="mb-4">
          {formatNumber(quarantined.length)} قلم داده دارای نسخه قرنطینه‌شده است. این نسخه‌ها در تحلیل قابل
          انتخاب نیستند و تا رفع ایراد، خروجی وابسته تولید نمی‌شود.{' '}
          <Link to="/datasets/quarantine" className="underline">
            مشاهده فهرست قرنطینه
          </Link>
        </Callout>
      )}

      <div className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <SearchInput value={search} onChange={setSearch} label="جست‌وجو در کاتالوگ" placeholder="عنوان، کد یا متولی…" />
        <Select
          aria-label="وضعیت نسخه"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={[
            { value: 'all', label: 'همه وضعیت‌ها' },
            ...(Object.keys(datasetStatusLabels) as DatasetVersionStatus[]).map((key) => ({
              value: key,
              label: datasetStatusLabels[key],
            })),
          ]}
        />
        <Select
          aria-label="نوع داده"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          options={[
            { value: 'all', label: 'همه انواع' },
            { value: 'spatial', label: 'مکانی' },
            { value: 'tabular', label: 'جدولی' },
            { value: 'document', label: 'سند' },
          ]}
        />
        <Select
          aria-label="منطقه"
          value={regionId}
          onChange={(e) => setRegionId(e.target.value)}
          options={[
            { value: 'all', label: 'همه مناطق' },
            ...regions.map((r) => ({ value: r.id, label: r.title })),
          ]}
        />
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(d) => d.id}
        onRowClick={(d) => navigate(`/datasets/${d.id}`)}
        caption="فهرست اقلام داده"
        emptyTitle="قلم داده‌ای با این فیلترها یافت نشد"
        emptyDescription="فیلترها را بازتر کنید یا عبارت جست‌وجو را تغییر دهید."
      />
    </div>
  );
}
