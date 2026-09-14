import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import type { Scenario } from '@/types/domain';
import { scenariosApi } from '@/api/scenarios';
import { runsApi } from '@/api/runs';
import { studiesApi } from '@/api/studies';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { Badge, Ltr, PageHeader } from '@/components/ui/display';
import { LoadingState, ErrorState, Callout } from '@/components/ui/feedback';
import { SearchInput, Select } from '@/components/ui/inputs';
import { Button } from '@/components/ui/Button';
import { DemoBadge, RunStateBadge, usePermission } from '@/components/workflow';
import { interpretationLabels, scenarioStateLabels } from '@/utils/dictionary';
import { formatJalaliDate } from '@/utils/format';

export default function ScenarioListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [studyId, setStudyId] = useState('all');
  const create = usePermission('scenario.create');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['scenarios', 'all'],
    queryFn: () => scenariosApi.list(),
  });
  const { data: runs = [] } = useQuery({ queryKey: ['runs'], queryFn: runsApi.list, refetchInterval: 4000 });
  const { data: studies = [] } = useQuery({ queryKey: ['studies', {}], queryFn: () => studiesApi.list() });

  const rows = useMemo(
    () =>
      (data ?? []).filter((scenario) => {
        if (search && !`${scenario.name} ${scenario.code} ${scenario.studyTitle}`.includes(search.trim())) {
          return false;
        }
        if (studyId !== 'all' && scenario.studyId !== studyId) return false;
        return true;
      }),
    [data, search, studyId],
  );

  if (isLoading) return <LoadingState rows={4} />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  const columns: Column<Scenario>[] = [
    {
      key: 'name',
      header: 'سناریو',
      sortValue: (s) => s.name,
      cell: (s) => (
        <div className="min-w-0">
          <p className="font-medium">{s.name}</p>
          <Ltr className="text-2xs text-faint">{s.code}</Ltr>
        </div>
      ),
    },
    {
      key: 'study',
      header: 'مطالعه',
      sortValue: (s) => s.studyTitle,
      cell: (s) => (
        <Link
          to={`/studies/${s.studyId}`}
          onClick={(event) => event.stopPropagation()}
          className="text-xs hover:text-primary-700"
        >
          {s.studyTitle}
        </Link>
      ),
    },
    {
      key: 'kind',
      header: 'نوع',
      cell: (s) => {
        const version = s.versions.find((v) => v.id === s.currentVersionId);
        return (
          <span className="flex flex-col items-start gap-1">
            <Badge tone={s.isBaseline ? 'success' : 'warning'}>
              {s.isBaseline ? 'مبنا (وضع موجود)' : 'پیشنهادی'}
            </Badge>
            {version && (
              <span className="text-2xs text-muted">{interpretationLabels[version.interpretation]}</span>
            )}
          </span>
        );
      },
    },
    {
      key: 'version',
      header: 'وضعیت نسخه',
      cell: (s) => {
        const version = s.versions.find((v) => v.id === s.currentVersionId);
        return version ? (
          <span className="flex items-center gap-1.5">
            <Badge tone={version.state === 'frozen' ? 'primary' : 'muted'}>
              {scenarioStateLabels[version.state]}
            </Badge>
            <Ltr className="text-2xs text-faint">{version.versionLabel}</Ltr>
          </span>
        ) : null;
      },
    },
    {
      key: 'run',
      header: 'آخرین اجرا',
      cell: (s) => {
        const run = runs.find((r) => r.scenarioId === s.id);
        return run ? <RunStateBadge state={run.state} /> : <Badge tone="muted">بدون اجرا</Badge>;
      },
    },
    {
      key: 'updated',
      header: 'آخرین تغییر',
      sortValue: (s) => s.updatedAt,
      cell: (s) => <span className="text-xs text-muted">{formatJalaliDate(s.updatedAt)}</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="تحلیل"
        title="سناریوها"
        description="سناریو یک وضع پیشنهادی نسخه‌دار است. هر اجرا به نسخه مشخصی از سناریو، داده و قوانین گره می‌خورد تا نتیجه بازتولیدپذیر بماند."
        breadcrumb={[{ label: 'خانه', to: '/dashboard' }, { label: 'سناریوها' }]}
        meta={<DemoBadge />}
        actions={
          <>
            <Link
              to="/scenarios/compare"
              className="inline-flex h-9 items-center rounded-md border border-border-strong px-3.5 text-sm hover:bg-surface-2"
            >
              مقایسه سناریوها
            </Link>
            <Button
              variant="primary"
              icon={<Plus size={15} />}
              disabledReason={create.reason}
              onClick={() => navigate('/scenarios/new')}
            >
              ایجاد سناریو
            </Button>
          </>
        }
      />

      <Callout tone="neutral" className="mb-4">
        مقادیر سناریو «پیشنهادی» هستند و با داده مشاهده‌شده جابه‌جا نمی‌شوند. برچسب تفسیر هر نسخه در همه
        خروجی‌ها همراه نتیجه حمل می‌شود.
      </Callout>

      <div className="mb-4 grid gap-2 sm:grid-cols-2">
        <SearchInput value={search} onChange={setSearch} label="جست‌وجوی سناریو" placeholder="نام یا کد سناریو…" />
        <Select
          aria-label="مطالعه"
          value={studyId}
          onChange={(event) => setStudyId(event.target.value)}
          options={[
            { value: 'all', label: 'همه مطالعات' },
            ...studies.map((s) => ({ value: s.id, label: s.title })),
          ]}
        />
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(s) => s.id}
        onRowClick={(s) => navigate(`/scenarios/${s.id}`)}
        caption="فهرست سناریوها"
        emptyTitle="سناریویی یافت نشد"
      />
    </div>
  );
}
