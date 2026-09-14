import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { RuleStatus, UrbanRule } from '@/types/domain';
import { rulesApi } from '@/api/catalog';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { Badge, Ltr, PageHeader, StatusBadge, type Tone } from '@/components/ui/display';
import { Callout, LoadingState, ErrorState } from '@/components/ui/feedback';
import { SearchInput, Select } from '@/components/ui/inputs';
import { Button } from '@/components/ui/Button';
import { DemoBadge, usePermission } from '@/components/workflow';
import { ruleStatusLabels } from '@/utils/dictionary';
import { formatJalaliDate, formatNumber } from '@/utils/format';

export const RULE_TONE: Record<RuleStatus, { tone: Tone; kind: 'ok' | 'warn' | 'error' | 'pending' | 'blocked' }> = {
  draft: { tone: 'muted', kind: 'pending' },
  in_review: { tone: 'info', kind: 'pending' },
  approved: { tone: 'success', kind: 'ok' },
  published: { tone: 'success', kind: 'ok' },
  retired: { tone: 'muted', kind: 'blocked' },
  conflicted: { tone: 'danger', kind: 'error' },
};

const CATEGORY_LABELS: Record<UrbanRule['category'], string> = {
  density: 'تراکم',
  coverage: 'سطح اشغال',
  floors: 'طبقات',
  setback: 'عقب‌نشینی',
  parking: 'پارکینگ',
  zoning: 'پهنه‌بندی',
};

export default function RulesPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const status = params.get('status') ?? 'all';
  const author = usePermission('rule.author');

  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['rules'], queryFn: rulesApi.list });

  const rows = useMemo(
    () =>
      (data ?? []).filter((rule) => {
        if (search && !`${rule.title} ${rule.code} ${rule.sourceLabel}`.includes(search.trim())) return false;
        if (status !== 'all' && rule.status !== status) return false;
        if (category !== 'all' && rule.category !== category) return false;
        return true;
      }),
    [data, search, status, category],
  );

  if (isLoading) return <LoadingState rows={4} />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  const conflicted = (data ?? []).filter((r) => r.status === 'conflicted');

  const columns: Column<UrbanRule>[] = [
    {
      key: 'title',
      header: 'قانون',
      sortValue: (r) => r.title,
      cell: (r) => (
        <div className="min-w-0">
          <p className="font-medium">{r.title}</p>
          <Ltr className="text-2xs text-faint">{r.code}</Ltr>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'دسته',
      sortValue: (r) => r.category,
      cell: (r) => <Badge tone="muted">{CATEGORY_LABELS[r.category]}</Badge>,
    },
    {
      key: 'status',
      header: 'وضعیت',
      sortValue: (r) => r.status,
      cell: (r) => (
        <StatusBadge label={ruleStatusLabels[r.status]} tone={RULE_TONE[r.status].tone} kind={RULE_TONE[r.status].kind} />
      ),
    },
    {
      key: 'severity',
      header: 'شدت',
      cell: (r) => (
        <Badge tone={r.severity === 'blocking' ? 'danger' : 'info'}>
          {r.severity === 'blocking' ? 'مسدودکننده' : 'توصیه‌ای'}
        </Badge>
      ),
    },
    {
      key: 'source',
      header: 'مرجع',
      cell: (r) => (
        <span className="text-xs">
          {r.sourceLabel}
          <span className="block text-2xs text-muted">{r.sourceLocator}</span>
        </span>
      ),
      optional: true,
    },
    {
      key: 'effective',
      header: 'اعتبار از',
      sortValue: (r) => r.effectiveFrom,
      cell: (r) => <span className="text-xs text-muted">{formatJalaliDate(r.effectiveFrom)}</span>,
    },
    {
      key: 'version',
      header: 'نسخه',
      cell: (r) => <Ltr className="text-xs">{r.versionLabel}</Ltr>,
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="داده و مکان"
        title="مخزن قوانین"
        description="هر قانون مرجع، محدوده اعتبار، نسخه و وضعیت تأیید دارد. قانونی که تعارض حل‌نشده دارد، به‌جای نتیجه نادرست، خروجی «نامشخص» تولید می‌کند."
        breadcrumb={[{ label: 'خانه', to: '/dashboard' }, { label: 'قوانین' }]}
        meta={<DemoBadge />}
        actions={
          <Button variant="primary" disabledReason={author.reason} onClick={() => navigate('/rules')}>
            ثبت قانون جدید
          </Button>
        }
      />

      {conflicted.length > 0 && (
        <Callout tone="danger" title="تعارض حل‌نشده در قوانین" className="mb-4">
          {formatNumber(conflicted.length)} قانون با یکدیگر در تعارض‌اند. تا زمان حل تعارض توسط مرجع
          مربوط، بررسی انطباق برای این موارد نتیجه «نامشخص» می‌دهد و به‌عنوان «مجاز» یا «تخلف» گزارش
          نمی‌شود.{' '}
          <Link to="/rules?status=conflicted" className="underline">
            مشاهده موارد
          </Link>
        </Callout>
      )}

      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <SearchInput value={search} onChange={setSearch} label="جست‌وجوی قانون" placeholder="عنوان، کد یا مرجع…" />
        <Select
          aria-label="وضعیت"
          value={status}
          onChange={(event) =>
            setParams(event.target.value === 'all' ? {} : { status: event.target.value })
          }
          options={[
            { value: 'all', label: 'همه وضعیت‌ها' },
            ...(Object.keys(ruleStatusLabels) as RuleStatus[]).map((key) => ({
              value: key,
              label: ruleStatusLabels[key],
            })),
          ]}
        />
        <Select
          aria-label="دسته"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          options={[
            { value: 'all', label: 'همه دسته‌ها' },
            ...Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label })),
          ]}
        />
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(r) => r.id}
        onRowClick={(r) => navigate(`/rules/${r.id}`)}
        caption="فهرست قوانین"
        emptyTitle="قانونی با این فیلترها یافت نشد"
      />
    </div>
  );
}
