import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { SpecialistModel } from '@/types/domain';
import { modelsApi } from '@/api/catalog';
import { DataTable, type Column } from '@/components/tables/DataTable';
import {
  Badge,
  Card,
  CardHeader,
  DefinitionList,
  Ltr,
  PageHeader,
  StatusBadge,
  type Tone,
} from '@/components/ui/display';
import { Button } from '@/components/ui/Button';
import { Callout, EmptyState, LoadingState } from '@/components/ui/feedback';
import { DemoBadge, usePermission } from '@/components/workflow';
import { methodClassLabels, modelStatusLabels, moduleTitles } from '@/utils/dictionary';
import { formatJalaliDate } from '@/utils/format';

const STATUS_TONE: Record<SpecialistModel['status'], { tone: Tone; kind: 'ok' | 'warn' | 'error' | 'pending' | 'blocked' }> = {
  available: { tone: 'success', kind: 'ok' },
  running: { tone: 'info', kind: 'pending' },
  unvalidated: { tone: 'warning', kind: 'warn' },
  expired: { tone: 'warning', kind: 'warn' },
  unavailable: { tone: 'muted', kind: 'blocked' },
  error: { tone: 'danger', kind: 'error' },
};

export function ModelsPage() {
  const navigate = useNavigate();
  const register = usePermission('model.register');
  const { data, isLoading } = useQuery({ queryKey: ['models'], queryFn: modelsApi.list });

  if (isLoading) return <LoadingState rows={4} />;
  const models = data ?? [];

  const columns: Column<SpecialistModel>[] = [
    {
      key: 'name',
      header: 'مدل',
      sortValue: (m) => m.name,
      cell: (m) => (
        <div className="min-w-0">
          <p className="font-medium">{m.name}</p>
          <p className="text-2xs text-muted">{m.ownerOrg}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'وضعیت',
      sortValue: (m) => m.status,
      cell: (m) => (
        <StatusBadge
          label={modelStatusLabels[m.status]}
          tone={STATUS_TONE[m.status].tone}
          kind={STATUS_TONE[m.status].kind}
        />
      ),
    },
    {
      key: 'validation',
      header: 'اعتبارسنجی',
      cell: (m) => (
        <Badge
          tone={
            m.validationStatus === 'validated' ? 'success' : m.validationStatus === 'pending' ? 'warning' : 'muted'
          }
        >
          {m.validationStatus === 'validated'
            ? 'اعتبارسنجی‌شده'
            : m.validationStatus === 'pending'
              ? 'در انتظار اعتبارسنجی'
              : 'اعتبارسنجی نشده'}
        </Badge>
      ),
    },
    {
      key: 'modules',
      header: 'ماژول‌های متصل',
      cell: (m) => <span className="text-xs">{m.linkedModules.join('، ') || '—'}</span>,
    },
    {
      key: 'version',
      header: 'نسخه',
      cell: (m) => <Ltr className="text-xs">{m.versionLabel}</Ltr>,
    },
    {
      key: 'lastRun',
      header: 'آخرین اجرا',
      sortValue: (m) => m.lastRunAt ?? '',
      cell: (m) => (
        <span className="text-xs text-muted">
          {m.lastRunAt ? formatJalaliDate(m.lastRunAt) : 'اجرا نشده است'}
        </span>
      ),
      optional: true,
    },
  ];

  const unavailable = models.filter((m) => m.status !== 'available');

  return (
    <div>
      <PageHeader
        eyebrow="تحلیل"
        title="مخزن مدل‌های تخصصی"
        description="مدل‌ها با دامنه اعتبار، محدودیت‌ها و وضعیت اعتبارسنجی ثبت می‌شوند. اجرای مدل خارج از دامنه اعتبار مجاز نیست و نتیجه‌ای تولید نمی‌کند."
        breadcrumb={[{ label: 'خانه', to: '/dashboard' }, { label: 'مدل‌های تخصصی' }]}
        meta={<DemoBadge />}
        actions={
          <Button variant="primary" disabledReason={register.reason}>
            ثبت مدل جدید
          </Button>
        }
      />

      {unavailable.length > 0 && (
        <Callout tone="neutral" className="mb-4" title="مدل‌های غیرقابل استفاده">
          مدل‌هایی که اعتبارسنجی نشده، منقضی یا در دسترس نیستند در تحلیل به‌کار نمی‌روند. خروجی وابسته به
          آن‌ها با دلیل «مدل در دسترس نیست» ثبت می‌شود.
        </Callout>
      )}

      <DataTable
        rows={models}
        columns={columns}
        rowKey={(m) => m.id}
        onRowClick={(m) => navigate(`/models/${m.id}`)}
        caption="فهرست مدل‌ها"
        emptyTitle="مدلی ثبت نشده است"
      />
    </div>
  );
}

export function ModelDetailPage() {
  const { modelId = '' } = useParams();
  const validate = usePermission('model.validate');
  const { data, isLoading } = useQuery({ queryKey: ['model', modelId], queryFn: () => modelsApi.get(modelId) });

  if (isLoading) return <LoadingState rows={3} />;
  if (!data) return <EmptyState title="مدل یافت نشد" />;

  const tone = STATUS_TONE[data.status];

  return (
    <div>
      <PageHeader
        title={data.name}
        description={data.purpose}
        breadcrumb={[
          { label: 'خانه', to: '/dashboard' },
          { label: 'مدل‌های تخصصی', to: '/models' },
          { label: data.name },
        ]}
        meta={
          <>
            <StatusBadge label={modelStatusLabels[data.status]} tone={tone.tone} kind={tone.kind} />
            <Badge tone="muted">{methodClassLabels[data.methodClass]}</Badge>
            <Ltr className="text-xs text-muted">{data.versionLabel}</Ltr>
            <DemoBadge />
          </>
        }
        actions={
          <Button variant="primary" disabledReason={validate.reason}>
            ثبت نتیجه اعتبارسنجی
          </Button>
        }
      />

      {data.status !== 'available' && (
        <Callout tone="warning" title="این مدل در تحلیل به‌کار نمی‌رود" className="mb-4">
          {data.status === 'expired'
            ? 'دوره اعتبار مدل به پایان رسیده است. تا تمدید اعتبار، خروجی‌های وابسته تولید نمی‌شوند.'
            : data.status === 'unvalidated'
              ? 'مدل هنوز اعتبارسنجی نشده است. استفاده از خروجی اعتبارسنجی‌نشده در تصمیم‌گیری مجاز نیست.'
              : 'مدل در حال حاضر در دسترس نیست. این وضعیت با خطای اجرا تفاوت دارد.'}
        </Callout>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="شناسنامه مدل" />
          <DefinitionList
            columns={2}
            items={[
              { label: 'سازمان مالک', value: data.ownerOrg },
              { label: 'مجوز استفاده', value: data.licenseLabel },
              { label: 'دامنه اعتبار', value: data.validityRange },
              {
                label: 'وضعیت اعتبارسنجی',
                value:
                  data.validationStatus === 'validated'
                    ? 'اعتبارسنجی‌شده'
                    : data.validationStatus === 'pending'
                      ? 'در انتظار اعتبارسنجی'
                      : 'اعتبارسنجی نشده',
              },
              {
                label: 'آخرین اجرا',
                value: data.lastRunAt ? formatJalaliDate(data.lastRunAt, true) : 'اجرا نشده است',
              },
              {
                label: 'ماژول‌های متصل',
                value: (
                  <span className="flex flex-wrap gap-1.5">
                    {data.linkedModules.map((id) => (
                      <Link key={id} to={`/analysis/${id}`}>
                        <Badge tone="primary">{`${id} — ${moduleTitles[id]}`}</Badge>
                      </Link>
                    ))}
                  </span>
                ),
              },
            ]}
          />
        </Card>

        <Card>
          <CardHeader title="محدودیت‌ها" subtitle="مرزهایی که خارج از آن‌ها خروجی معتبر نیست" />
          <ul className="space-y-1.5 text-[13px] leading-7">
            {data.limitations.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-2.5 inline-block h-1 w-1 shrink-0 rounded-full bg-border-strong" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title="ورودی‌های لازم" />
          <ul className="space-y-1 text-[13px]">
            {data.inputs.map((input) => (
              <li key={input}>{input}</li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="خروجی‌ها" />
          <ul className="space-y-1 text-[13px]">
            {data.outputs.map((output) => (
              <li key={output}>{output}</li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
