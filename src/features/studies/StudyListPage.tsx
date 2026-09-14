import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import type { Study, StudyStatus, StudyType } from '@/types/domain';
import { studiesApi } from '@/api/studies';
import { regionsApi } from '@/api/catalog';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { PageHeader, Badge, StatusBadge, Ltr, type Tone } from '@/components/ui/display';
import { SearchInput, Select } from '@/components/ui/inputs';
import { Button } from '@/components/ui/Button';
import { SkeletonTable, ErrorState, Progress } from '@/components/ui/feedback';
import { usePermission } from '@/components/workflow';
import { studyStatusLabels, studyTypeLabels } from '@/utils/dictionary';
import { formatJalaliDate, formatNumber } from '@/utils/format';
import { useAuthStore } from '@/stores/authStore';

const STATUS_TONE: Record<StudyStatus, { tone: Tone; kind: 'ok' | 'warn' | 'pending' | 'blocked' | 'dot' }> = {
  draft: { tone: 'muted', kind: 'dot' },
  active: { tone: 'primary', kind: 'dot' },
  in_review: { tone: 'warning', kind: 'pending' },
  changes_requested: { tone: 'danger', kind: 'warn' },
  approved: { tone: 'success', kind: 'ok' },
  archived: { tone: 'muted', kind: 'blocked' },
};

export default function StudyListPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const activeRegionId = useAuthStore((s) => s.activeRegionId);
  const createPermission = usePermission('study.create');

  const type = (params.get('type') ?? '') as StudyType | '';
  const status = (params.get('status') ?? '') as StudyStatus | '';

  const studies = useQuery({ queryKey: ['studies', {}], queryFn: () => studiesApi.list() });
  const regions = useQuery({ queryKey: ['regions'], queryFn: regionsApi.list });

  const rows = useMemo(() => {
    let list = studies.data ?? [];
    if (type) list = list.filter((s) => s.studyType === type);
    if (status) list = list.filter((s) => s.status === status);
    if (activeRegionId !== 'all') list = list.filter((s) => s.regionId === activeRegionId);
    if (search.trim()) {
      const q = search.trim();
      list = list.filter(
        (s) => s.title.includes(q) || s.code.includes(q) || s.ownerName.includes(q),
      );
    }
    return list;
  }, [studies.data, type, status, activeRegionId, search]);

  const columns: Column<Study>[] = [
    {
      key: 'title',
      header: 'عنوان مطالعه',
      width: '32%',
      sortValue: (row) => row.title,
      cell: (row) => (
        <div className="min-w-0">
          <span className="block font-medium">{row.title}</span>
          <span className="block text-2xs text-muted">
            <Ltr>{row.code}</Ltr> · {row.regionTitle}
          </span>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'نوع',
      sortValue: (row) => row.studyType,
      cell: (row) => <Badge tone="muted">{studyTypeLabels[row.studyType]}</Badge>,
    },
    {
      key: 'status',
      header: 'وضعیت',
      sortValue: (row) => row.status,
      cell: (row) => (
        <StatusBadge
          label={studyStatusLabels[row.status]}
          tone={STATUS_TONE[row.status].tone}
          kind={STATUS_TONE[row.status].kind}
        />
      ),
    },
    {
      key: 'owner',
      header: 'مسئول',
      sortValue: (row) => row.ownerName,
      cell: (row) => row.ownerName,
    },
    {
      key: 'data',
      header: 'آمادگی داده',
      align: 'start',
      width: '13%',
      sortValue: (row) => row.progress.dataReadinessPct,
      cell: (row) => <Progress value={row.progress.dataReadinessPct} showValue />,
    },
    {
      key: 'analysis',
      header: 'آمادگی تحلیل',
      width: '13%',
      sortValue: (row) => row.progress.analysisReadinessPct,
      cell: (row) => (
        <Progress value={row.progress.analysisReadinessPct} tone="warning" showValue />
      ),
    },
    {
      key: 'tasks',
      header: 'کارها',
      optional: true,
      sortValue: (row) => row.progress.tasksCompleted,
      cell: (row) => (
        <span className="num text-xs text-muted">
          {formatNumber(row.progress.tasksCompleted)} از {formatNumber(row.progress.tasksTotal)}
        </span>
      ),
    },
    {
      key: 'updated',
      header: 'آخرین تغییر',
      sortValue: (row) => row.updatedAt,
      cell: (row) => <span className="text-xs text-muted">{formatJalaliDate(row.updatedAt)}</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="مطالعات"
        description="فهرست مطالعات در دامنه دسترسی شما. آمادگی داده و آمادگی تحلیل جداگانه گزارش می‌شوند و در یک درصد واحد ادغام نمی‌شوند."
        breadcrumb={[{ label: 'خانه', to: '/dashboard' }, { label: 'مطالعات' }]}
        actions={
          <Button
            variant="primary"
            icon={<Plus size={15} />}
            disabledReason={createPermission.reason}
            onClick={() => navigate('/studies/new')}
          >
            مطالعه جدید
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="جست‌وجو در عنوان، کد یا مسئول…"
          className="w-full sm:w-72"
        />
        <Select
          aria-label="نوع مطالعه"
          value={type}
          onChange={(event) => {
            const next = new URLSearchParams(params);
            if (event.target.value) next.set('type', event.target.value);
            else next.delete('type');
            setParams(next);
          }}
          options={[
            { value: '', label: 'همه انواع' },
            ...(Object.keys(studyTypeLabels) as StudyType[]).map((key) => ({
              value: key,
              label: studyTypeLabels[key],
            })),
          ]}
          className="w-44"
        />
        <Select
          aria-label="وضعیت"
          value={status}
          onChange={(event) => {
            const next = new URLSearchParams(params);
            if (event.target.value) next.set('status', event.target.value);
            else next.delete('status');
            setParams(next);
          }}
          options={[
            { value: '', label: 'همه وضعیت‌ها' },
            ...(Object.keys(studyStatusLabels) as StudyStatus[]).map((key) => ({
              value: key,
              label: studyStatusLabels[key],
            })),
          ]}
          className="w-48"
        />
        {regions.data && (
          <span className="text-xs text-muted">
            {activeRegionId === 'all'
              ? 'نمایش همه مناطق مجاز'
              : `فیلتر منطقه فعال: ${regions.data.find((r) => r.id === activeRegionId)?.title ?? ''}`}
          </span>
        )}
      </div>

      {studies.isLoading ? (
        <SkeletonTable rows={6} cols={6} />
      ) : studies.isError ? (
        <ErrorState onRetry={() => studies.refetch()} />
      ) : (
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(row) => row.id}
          onRowClick={(row) => navigate(`/studies/${row.id}`)}
          caption="فهرست مطالعات"
          emptyTitle="مطالعه‌ای با این فیلترها یافت نشد"
          emptyDescription="می‌توانید فیلترها را بازنشانی کنید یا مطالعه جدیدی ایجاد کنید."
          emptyAction={
            <Link
              to="/studies"
              className="inline-flex h-9 items-center rounded-md border border-border-strong px-4 text-sm hover:bg-surface-2"
            >
              بازنشانی فیلترها
            </Link>
          }
        />
      )}
    </div>
  );
}
