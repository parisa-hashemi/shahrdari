import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { Evidence } from '@/types/domain';
import { evidenceApi } from '@/api/catalog';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { Badge, Ltr, PageHeader, StatusBadge } from '@/components/ui/display';
import { Drawer } from '@/components/ui/overlays';
import { DefinitionList } from '@/components/ui/display';
import { Callout, LoadingState } from '@/components/ui/feedback';
import { SearchInput, Select } from '@/components/ui/inputs';
import { Button } from '@/components/ui/Button';
import { DemoBadge, usePermission } from '@/components/workflow';
import { classificationLabels, evidenceTypeLabels } from '@/utils/dictionary';
import { formatJalaliDate, formatNumber } from '@/utils/format';

const RELATION_LABELS: Record<Evidence['relation'], string> = {
  supports: 'پشتیبان نتیجه',
  limits: 'محدودکننده نتیجه',
  contradicts: 'ناقض نتیجه',
  describes: 'توصیف‌کننده',
};

export default function EvidencePage() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [selected, setSelected] = useState<Evidence | null>(null);
  const link = usePermission('evidence.link');

  const { data, isLoading } = useQuery({ queryKey: ['evidence'], queryFn: evidenceApi.list });

  const rows = useMemo(
    () =>
      (data ?? []).filter((item) => {
        if (search && !`${item.title} ${item.sourceLabel}`.includes(search.trim())) return false;
        if (type !== 'all' && item.type !== type) return false;
        return true;
      }),
    [data, search, type],
  );

  if (isLoading) return <LoadingState rows={4} />;

  const restricted = (data ?? []).filter((item) => !item.accessible);

  const columns: Column<Evidence>[] = [
    {
      key: 'title',
      header: 'عنوان',
      sortValue: (e) => e.title,
      cell: (e) => (
        <div className="min-w-0">
          <p className="font-medium">{e.title}</p>
          <p className="text-2xs text-muted">{e.sourceLabel}</p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'نوع',
      sortValue: (e) => e.type,
      cell: (e) => <Badge tone="muted">{evidenceTypeLabels[e.type]}</Badge>,
    },
    {
      key: 'relation',
      header: 'نسبت با نتیجه',
      cell: (e) => (
        <Badge tone={e.relation === 'contradicts' ? 'danger' : e.relation === 'limits' ? 'warning' : 'success'}>
          {RELATION_LABELS[e.relation]}
        </Badge>
      ),
    },
    {
      key: 'subject',
      header: 'موضوع پیوست',
      cell: (e) => <span className="text-xs">{e.linkedSubject.title}</span>,
      optional: true,
    },
    {
      key: 'access',
      header: 'دسترسی',
      cell: (e) =>
        e.accessible ? (
          <StatusBadge label="قابل مشاهده" tone="success" kind="ok" />
        ) : (
          <StatusBadge label="دسترسی محدود" tone="warning" kind="locked" />
        ),
    },
    {
      key: 'issued',
      header: 'تاریخ صدور',
      sortValue: (e) => e.issuedAt,
      cell: (e) => <span className="text-xs text-muted">{formatJalaliDate(e.issuedAt)}</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="حاکمیت و خروجی"
        title="شواهد و مستندات"
        description="هر شاهد با نوع، مرجع، نسخه و نسبت آن با نتیجه ثبت می‌شود. وجود سند به‌معنای تأیید نتیجه نیست؛ برخی شواهد محدودکننده یا ناقض‌اند."
        breadcrumb={[{ label: 'خانه', to: '/dashboard' }, { label: 'شواهد' }]}
        meta={<DemoBadge />}
        actions={
          <Button variant="primary" disabledReason={link.reason}>
            پیوست شاهد جدید
          </Button>
        }
      />

      {restricted.length > 0 && (
        <Callout tone="neutral" className="mb-4" title="سند با دسترسی محدود">
          {formatNumber(restricted.length)} سند وجود دارد که با نقش فعلی قابل مشاهده نیست. وجود سند اعلام
          می‌شود اما محتوای آن نمایش داده نمی‌شود.
        </Callout>
      )}

      <div className="mb-4 grid gap-2 sm:grid-cols-2">
        <SearchInput value={search} onChange={setSearch} label="جست‌وجوی شاهد" placeholder="عنوان یا مرجع…" />
        <Select
          aria-label="نوع شاهد"
          value={type}
          onChange={(event) => setType(event.target.value)}
          options={[
            { value: 'all', label: 'همه انواع' },
            ...Object.entries(evidenceTypeLabels).map(([value, label]) => ({ value, label })),
          ]}
        />
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(e) => e.id}
        onRowClick={setSelected}
        caption="فهرست شواهد"
        emptyTitle="شاهدی یافت نشد"
      />

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.title ?? ''}
        subtitle={selected ? evidenceTypeLabels[selected.type] : undefined}
      >
        {selected && (
          <div className="space-y-4">
            <DefinitionList
              columns={1}
              items={[
                { label: 'مرجع', value: selected.sourceLabel },
                { label: 'نسخه', value: <Ltr>{selected.versionLabel}</Ltr> },
                { label: 'تاریخ صدور', value: formatJalaliDate(selected.issuedAt) },
                { label: 'دامنه اعتبار', value: selected.scope },
                { label: 'طبقه‌بندی', value: classificationLabels[selected.classification] },
                { label: 'نسبت با نتیجه', value: RELATION_LABELS[selected.relation] },
                {
                  label: 'موضوع پیوست',
                  value: (
                    <span>
                      {selected.linkedSubject.title}{' '}
                      <span className="text-2xs text-muted">({selected.linkedSubject.type})</span>
                    </span>
                  ),
                },
              ]}
            />
            {selected.accessible ? (
              <Callout tone="neutral">
                محتوای این سند در محیط نمایشی بارگذاری نشده است. در محیط عملیاتی، فایل با همان نسخه ثبت‌شده
                در دسترس قرار می‌گیرد.
              </Callout>
            ) : (
              <Callout tone="warning" title="دسترسی به محتوای این سند محدود است">
                وجود سند و نسبت آن با نتیجه اعلام می‌شود تا تصویر تصمیم ناقص نماند، اما محتوا با نقش فعلی
                قابل مشاهده نیست.
              </Callout>
            )}
            <Link to="/reports" className="inline-block text-[13px] text-primary-700 hover:underline">
              مشاهده گزارش‌هایی که به این شاهد استناد می‌کنند
            </Link>
          </div>
        )}
      </Drawer>
    </div>
  );
}
