import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { datasetsApi } from '@/api/catalog';
import {
  Badge,
  Card,
  CardHeader,
  DefinitionList,
  Ltr,
  PageHeader,
  StatusBadge,
} from '@/components/ui/display';
import { Callout, EmptyState, LoadingState } from '@/components/ui/feedback';
import { Select } from '@/components/ui/inputs';
import { DemoBadge } from '@/components/workflow';
import { formatJalaliDate, formatNumber, formatRelative } from '@/utils/format';
import { findingCategoryLabels } from '@/utils/dictionary';

/* --------------------------------------------------------------- connectors */

const CONNECTORS = [
  {
    id: 'cn-cadastre',
    title: 'اتصال‌دهنده کاداستر شهری',
    owner: 'سازمان فناوری اطلاعات شهرداری',
    state: 'ready' as const,
    lastSync: '2026-04-28T06:10:00Z',
    cadence: 'روزانه — ۰۶:۰۰',
    note: 'آخرین همگام‌سازی بدون خطا انجام شد.',
  },
  {
    id: 'cn-permits',
    title: 'اتصال‌دهنده پروانه‌های ساختمانی',
    owner: 'معاونت شهرسازی و معماری',
    state: 'degraded' as const,
    lastSync: '2026-04-21T05:40:00Z',
    cadence: 'هفتگی — شنبه',
    note: 'سرویس مبدأ در دو نوبت اخیر پاسخ نداده است؛ داده جدیدی دریافت نشده و مقدار قدیمی جایگزین نشده است.',
  },
  {
    id: 'cn-network',
    title: 'اتصال‌دهنده شبکه معابر',
    owner: 'معاونت حمل‌ونقل و ترافیک',
    state: 'unavailable' as const,
    lastSync: undefined,
    cadence: 'تعریف نشده',
    note: 'اتصال هنوز برقرار نشده است. تحلیل‌های شبکه‌محور (M07) به همین دلیل اجرا نمی‌شوند.',
  },
];

export function ConnectorsPage() {
  return (
    <div>
      <PageHeader
        title="اتصال‌دهنده‌ها"
        description="اتصال‌دهنده‌ها داده را از سامانه‌های مبدأ دریافت می‌کنند. نبود همگام‌سازی به‌معنای مقدار صفر نیست؛ داده صرفاً به‌روزرسانی نشده است."
        breadcrumb={[
          { label: 'خانه', to: '/dashboard' },
          { label: 'داده‌ها', to: '/datasets' },
          { label: 'اتصال‌دهنده‌ها' },
        ]}
        meta={<DemoBadge />}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        {CONNECTORS.map((connector) => (
          <Card key={connector.id}>
            <CardHeader
              title={connector.title}
              subtitle={connector.owner}
              action={
                connector.state === 'ready' ? (
                  <StatusBadge label="فعال" tone="success" kind="ok" />
                ) : connector.state === 'degraded' ? (
                  <StatusBadge label="ناپایدار" tone="warning" kind="warn" />
                ) : (
                  <StatusBadge label="برقرار نشده" tone="muted" kind="blocked" />
                )
              }
            />
            <DefinitionList
              columns={1}
              items={[
                { label: 'دوره همگام‌سازی', value: connector.cadence },
                {
                  label: 'آخرین همگام‌سازی موفق',
                  value: connector.lastSync ? formatJalaliDate(connector.lastSync, true) : 'انجام نشده است',
                },
              ]}
            />
            <p className="mt-3 text-xs leading-6 text-muted">{connector.note}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ quality */

export function QualityPage() {
  const { data, isLoading } = useQuery({ queryKey: ['datasets'], queryFn: datasetsApi.list });
  const [severity, setSeverity] = useState('all');

  const findings = useMemo(
    () =>
      (data ?? []).flatMap((dataset) =>
        dataset.versions.flatMap((version) =>
          version.findings.map((finding) => ({ dataset, version, finding })),
        ),
      ),
    [data],
  );

  const filtered = findings.filter((row) => severity === 'all' || row.finding.severity === severity);

  if (isLoading) return <LoadingState rows={3} />;

  return (
    <div>
      <PageHeader
        title="کنترل کیفیت داده"
        description="یافته‌های اعتبارسنجی همه اقلام داده در یک نما. یافته مسدودکننده مانع انتشار نسخه می‌شود و تا رفع آن، خروجی وابسته تولید نمی‌شود."
        breadcrumb={[
          { label: 'خانه', to: '/dashboard' },
          { label: 'داده‌ها', to: '/datasets' },
          { label: 'کنترل کیفیت' },
        ]}
        meta={<DemoBadge />}
        actions={
          <Select
            aria-label="شدت یافته"
            value={severity}
            onChange={(event) => setSeverity(event.target.value)}
            options={[
              { value: 'all', label: 'همه شدت‌ها' },
              { value: 'blocking', label: 'مسدودکننده' },
              { value: 'warning', label: 'هشدار' },
              { value: 'info', label: 'اطلاعی' },
            ]}
          />
        }
      />

      {filtered.length === 0 ? (
        <EmptyState title="یافته‌ای با این فیلتر وجود ندارد" description="شدت دیگری را انتخاب کنید." />
      ) : (
        <div className="space-y-2.5">
          {filtered.map(({ dataset, version, finding }) => (
            <Card key={`${version.id}-${finding.code}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium">{finding.title}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    <Link to={`/datasets/${dataset.id}`} className="hover:text-primary-700">
                      {dataset.title}
                    </Link>
                    <span className="mx-2">·</span>
                    نسخه <Ltr>{version.versionLabel}</Ltr>
                  </p>
                </div>
                <span className="flex items-center gap-1.5">
                  <Badge tone="muted">{findingCategoryLabels[finding.category] ?? finding.category}</Badge>
                  <Badge
                    tone={
                      finding.severity === 'blocking'
                        ? 'danger'
                        : finding.severity === 'warning'
                          ? 'warning'
                          : 'muted'
                    }
                  >
                    {finding.severity === 'blocking'
                      ? 'مسدودکننده'
                      : finding.severity === 'warning'
                        ? 'هشدار'
                        : 'اطلاعی'}
                  </Badge>
                </span>
              </div>
              <p className="mt-2 text-xs leading-6 text-muted">{finding.detail}</p>
              <p className="mt-1 text-2xs text-faint">
                رکوردهای متأثر: <span className="num">{formatNumber(finding.affectedRows)}</span>
                <span className="mx-2">·</span>
                کد یافته: <Ltr>{finding.code}</Ltr>
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- quarantine */

export function QuarantinePage() {
  const { data, isLoading } = useQuery({ queryKey: ['datasets'], queryFn: datasetsApi.list });

  const rows = (data ?? []).flatMap((dataset) =>
    dataset.versions.filter((v) => v.status === 'quarantined').map((version) => ({ dataset, version })),
  );

  if (isLoading) return <LoadingState rows={3} />;

  return (
    <div>
      <PageHeader
        title="قرنطینه داده"
        description="نسخه قرنطینه‌شده وجود دارد اما در تحلیل قابل انتخاب نیست. این وضعیت آگاهانه است تا داده مشکوک، بی‌سروصدا وارد محاسبه نشود."
        breadcrumb={[
          { label: 'خانه', to: '/dashboard' },
          { label: 'داده‌ها', to: '/datasets' },
          { label: 'قرنطینه' },
        ]}
        meta={<DemoBadge />}
      />

      {rows.length === 0 ? (
        <EmptyState title="نسخه قرنطینه‌شده‌ای وجود ندارد" description="همه نسخه‌ها اعتبارسنجی را گذرانده‌اند." />
      ) : (
        <div className="space-y-3">
          {rows.map(({ dataset, version }) => (
            <Card key={version.id}>
              <CardHeader
                title={
                  <Link to={`/datasets/${dataset.id}`} className="hover:text-primary-700">
                    {dataset.title}
                  </Link>
                }
                subtitle={`نسخه ${version.versionLabel} — ${formatRelative(dataset.updatedAt)}`}
                action={<StatusBadge label="قرنطینه" tone="danger" kind="error" />}
              />
              <Callout tone="danger" title="علت قرنطینه">
                {version.quarantineReason}
              </Callout>
              <div className="mt-3">
                <p className="mb-1.5 text-xs font-medium text-muted">مسیر رفع</p>
                <ol className="list-decimal space-y-1 ps-5 text-[13px] leading-7">
                  <li>یافته‌های مسدودکننده را در صفحه قلم داده بررسی کنید.</li>
                  <li>نسخه اصلاح‌شده را بارگذاری کنید؛ نسخه قرنطینه‌شده حذف نمی‌شود و در تاریخچه می‌ماند.</li>
                  <li>پس از اعتبارسنجی موفق، انتشار توسط دبیرخانه انجام می‌شود.</li>
                </ol>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------- version compare */

export function VersionComparePage() {
  const { data, isLoading } = useQuery({ queryKey: ['datasets'], queryFn: datasetsApi.list });
  const datasets = data ?? [];
  const [datasetId, setDatasetId] = useState('');
  const dataset = datasets.find((d) => d.id === datasetId) ?? datasets[0];
  const [leftId, setLeftId] = useState('');
  const [rightId, setRightId] = useState('');

  if (isLoading) return <LoadingState rows={3} />;
  if (!dataset) return <EmptyState title="قلم داده‌ای در دسترس نیست" />;

  const left = dataset.versions.find((v) => v.id === leftId) ?? dataset.versions[dataset.versions.length - 1];
  const right = dataset.versions.find((v) => v.id === rightId) ?? dataset.versions[0];
  const rowDelta = right.rowCount - left.rowCount;

  return (
    <div>
      <PageHeader
        title="مقایسه نسخه‌های داده"
        description="تفاوت دو نسخه در تعداد رکورد، کیفیت و یافته‌ها. تغییر نسخه، نتایج تحلیل‌های پیشین را بازنویسی نمی‌کند."
        breadcrumb={[
          { label: 'خانه', to: '/dashboard' },
          { label: 'داده‌ها', to: '/datasets' },
          { label: 'مقایسه نسخه‌ها' },
        ]}
        meta={<DemoBadge />}
      />

      <div className="mb-4 grid gap-2 md:grid-cols-3">
        <Select
          aria-label="قلم داده"
          value={dataset.id}
          onChange={(event) => {
            setDatasetId(event.target.value);
            setLeftId('');
            setRightId('');
          }}
          options={datasets.map((d) => ({ value: d.id, label: d.title }))}
        />
        <Select
          aria-label="نسخه مبنا"
          value={left.id}
          onChange={(event) => setLeftId(event.target.value)}
          options={dataset.versions.map((v) => ({ value: v.id, label: `نسخه ${v.versionLabel}` }))}
        />
        <Select
          aria-label="نسخه مقایسه"
          value={right.id}
          onChange={(event) => setRightId(event.target.value)}
          options={dataset.versions.map((v) => ({ value: v.id, label: `نسخه ${v.versionLabel}` }))}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {[left, right].map((version, index) => (
          <Card key={version.id}>
            <CardHeader
              title={
                <span>
                  {index === 0 ? 'نسخه مبنا' : 'نسخه مقایسه'} — <Ltr>{version.versionLabel}</Ltr>
                </span>
              }
            />
            <DefinitionList
              columns={1}
              items={[
                { label: 'تعداد رکورد', value: <span className="num">{formatNumber(version.rowCount)}</span> },
                { label: 'تاریخ منبع', value: formatJalaliDate(version.sourceDate) },
                { label: 'تعداد یافته', value: <span className="num">{formatNumber(version.findings.length)}</span> },
                { label: 'اثر انگشت محتوا', value: <Ltr>{version.contentHash}</Ltr> },
              ]}
            />
          </Card>
        ))}
      </div>

      <Card className="mt-4">
        <CardHeader title="خلاصه تفاوت" />
        <ul className="space-y-1.5 text-[13px] leading-7">
          <li>
            تغییر تعداد رکورد:{' '}
            <span className="num font-medium">
              {rowDelta > 0 ? '+' : rowDelta < 0 ? '−' : ''}
              {formatNumber(Math.abs(rowDelta))}
            </span>{' '}
            رکورد
          </li>
          <li>
            یافته‌های جدید نسبت به نسخه مبنا:{' '}
            <span className="num font-medium">
              {formatNumber(
                right.findings.filter((f) => !left.findings.some((lf) => lf.code === f.code)).length,
              )}
            </span>
          </li>
          <li>
            وضعیت نسخه مقایسه: {right.status === 'published' ? 'قابل انتخاب در تحلیل' : 'در تحلیل قابل انتخاب نیست'}
          </li>
        </ul>
      </Card>
    </div>
  );
}
