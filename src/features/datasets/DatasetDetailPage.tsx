import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DatasetVersion, QualityFinding } from '@/types/domain';
import { datasetsApi } from '@/api/catalog';
import { auditApi } from '@/api/governance';
import {
  Badge,
  Card,
  CardHeader,
  DefinitionList,
  Ltr,
  PageHeader,
  StatusBadge,
  Tabs,
  Timeline,
} from '@/components/ui/display';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/overlays';
import { Callout, EmptyState, LoadingState, ErrorState } from '@/components/ui/feedback';
import { DemoBadge, usePermission } from '@/components/workflow';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import {
  classificationLabels,
  datasetStatusLabels,
  findingCategoryLabels,
  qualityLabels,
} from '@/utils/dictionary';
import { formatJalaliDate, formatNumber, formatRelative } from '@/utils/format';
import { DATASET_TONE } from './DatasetCatalogPage';

function FindingRow({ finding }: { finding: QualityFinding }) {
  const tone =
    finding.severity === 'blocking' ? 'danger' : finding.severity === 'warning' ? 'warning' : 'muted';
  return (
    <li className="rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-[13px] font-medium">{finding.title}</p>
        <span className="flex items-center gap-1.5">
          <Badge tone="muted">{findingCategoryLabels[finding.category] ?? finding.category}</Badge>
          <Badge tone={tone}>
            {finding.severity === 'blocking' ? 'مسدودکننده' : finding.severity === 'warning' ? 'هشدار' : 'اطلاعی'}
          </Badge>
        </span>
      </div>
      <p className="mt-1 text-xs leading-6 text-muted">{finding.detail}</p>
      <p className="mt-1 text-2xs text-faint">
        رکوردهای متأثر: <span className="num">{formatNumber(finding.affectedRows)}</span>
        <span className="mx-2">·</span>
        کد یافته: <Ltr>{finding.code}</Ltr>
      </p>
    </li>
  );
}

export default function DatasetDetailPage() {
  const { datasetId = '' } = useParams();
  const [tab, setTab] = useState('overview');
  const [publishTarget, setPublishTarget] = useState<DatasetVersion | null>(null);
  const user = useAuthStore((s) => s.user);
  const pushToast = useUiStore((s) => s.pushToast);
  const queryClient = useQueryClient();
  const publishPerm = usePermission('dataset.publish');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dataset', datasetId],
    queryFn: () => datasetsApi.get(datasetId),
  });
  const { data: audit = [] } = useQuery({ queryKey: ['audit'], queryFn: auditApi.list });

  const publish = useMutation({
    mutationFn: (version: DatasetVersion) => datasetsApi.publish(datasetId, version.id, user.displayName),
    onSuccess: (_result, version) => {
      queryClient.invalidateQueries();
      pushToast({
        title: 'نسخه منتشر شد',
        description: `نسخه ${version.versionLabel} اکنون برای انتخاب در تحلیل در دسترس است.`,
        variant: 'success',
      });
    },
    onError: () =>
      pushToast({ title: 'انتشار انجام نشد', description: 'وضعیت نسخه تغییر کرده است.', variant: 'error' }),
  });

  if (isLoading) return <LoadingState rows={4} />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;
  if (!data) return <EmptyState title="قلم داده یافت نشد" description="ممکن است حذف یا بازنشسته شده باشد." />;

  const current = data.versions.find((v) => v.id === data.currentVersionId) ?? data.versions[0];
  const relatedAudit = audit.filter((entry) => entry.subjectTitle.includes(data.title));
  const blockingFindings = data.versions.flatMap((v) => v.findings.filter((f) => f.severity === 'blocking'));

  return (
    <div>
      <PageHeader
        title={data.title}
        description={data.permittedUse}
        breadcrumb={[
          { label: 'خانه', to: '/dashboard' },
          { label: 'داده‌ها', to: '/datasets' },
          { label: data.title },
        ]}
        meta={
          <>
            <Ltr className="text-xs text-muted">{data.code}</Ltr>
            <StatusBadge
              label={datasetStatusLabels[current.status]}
              tone={DATASET_TONE[current.status].tone}
              kind={DATASET_TONE[current.status].kind}
            />
            <Badge tone="muted">{classificationLabels[data.classification]}</Badge>
            <DemoBadge />
          </>
        }
      />

      {current.status === 'quarantined' && (
        <Callout tone="danger" title="این نسخه قرنطینه است" className="mb-4">
          {current.quarantineReason} تا رفع ایراد، این نسخه در تحلیل قابل انتخاب نیست و خروجی وابسته با
          وضعیت «تولید نشده» گزارش می‌شود.
        </Callout>
      )}

      <Tabs
        className="mb-4"
        value={tab}
        onChange={setTab}
        items={[
          { key: 'overview', label: 'نمای کلی' },
          { key: 'versions', label: 'نسخه‌ها', badge: formatNumber(data.versions.length) },
          {
            key: 'quality',
            label: 'کیفیت',
            badge: blockingFindings.length ? formatNumber(blockingFindings.length) : undefined,
          },
          { key: 'usage', label: 'سازگاری تحلیلی' },
          { key: 'history', label: 'رویدادها' },
        ]}
      />

      {tab === 'overview' && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="شناسنامه قلم داده" />
            <DefinitionList
              columns={2}
              items={[
                { label: 'سازمان متولی', value: data.ownerOrg },
                { label: 'مسئول داده', value: data.stewardName },
                {
                  label: 'منبع',
                  value:
                    data.sourceType === 'connector'
                      ? 'اتصال‌دهنده سامانه‌ای'
                      : data.sourceType === 'upload'
                        ? 'بارگذاری دستی'
                        : 'گزارش بیرونی',
                },
                { label: 'نوع داده', value: data.dataKind === 'spatial' ? 'مکانی' : data.dataKind === 'tabular' ? 'جدولی' : 'سند' },
                { label: 'پوشش مکانی', value: data.spatialCoverage },
                { label: 'پوشش زمانی', value: data.temporalCoverage },
                { label: 'نسخه جاری', value: <Ltr>{current.versionLabel}</Ltr> },
                { label: 'اثر انگشت محتوا', value: <Ltr>{current.contentHash}</Ltr> },
              ]}
            />
          </Card>
          <Card>
            <CardHeader title="کیفیت نسخه جاری" />
            <DefinitionList
              columns={1}
              items={[
                { label: 'ارزیابی کلی', value: qualityLabels[current.qualityScore] ?? current.qualityScore },
                { label: 'تعداد رکورد', value: <span className="num">{formatNumber(current.rowCount)}</span> },
                { label: 'تاریخ منبع', value: formatJalaliDate(current.sourceDate) },
                {
                  label: 'انتشار',
                  value: current.publishedAt ? formatJalaliDate(current.publishedAt, true) : 'منتشر نشده است',
                },
              ]}
            />
            <p className="mt-3 text-xs leading-6 text-muted">
              کیفیت، ارزیابی تناسب داده با کاربرد است و جایگزین صحت‌سنجی میدانی نیست.
            </p>
          </Card>
        </div>
      )}

      {tab === 'versions' && (
        <div className="space-y-3">
          {data.versions.map((version) => {
            const tone = DATASET_TONE[version.status];
            const canPublish = version.status === 'ready';
            return (
              <Card key={version.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Ltr className="text-[14px] font-semibold">{version.versionLabel}</Ltr>
                      <StatusBadge label={datasetStatusLabels[version.status]} tone={tone.tone} kind={tone.kind} />
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      <span className="num">{formatNumber(version.rowCount)}</span> رکورد
                      <span className="mx-2">·</span>
                      تاریخ منبع {formatJalaliDate(version.sourceDate)}
                      {version.publishedAt && (
                        <>
                          <span className="mx-2">·</span>
                          انتشار {formatJalaliDate(version.publishedAt)}
                        </>
                      )}
                    </p>
                    {version.quarantineReason && (
                      <p className="mt-1.5 text-xs leading-6 text-danger">{version.quarantineReason}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant={canPublish ? 'primary' : 'secondary'}
                    disabledReason={
                      publishPerm.reason ??
                      (canPublish ? null : 'تنها نسخه‌ای که اعتبارسنجی را با موفقیت گذرانده باشد قابل انتشار است.')
                    }
                    loading={publish.isPending && publishTarget?.id === version.id}
                    onClick={() => setPublishTarget(version)}
                  >
                    انتشار نسخه
                  </Button>
                </div>
                {version.findings.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {version.findings.map((finding) => (
                      <FindingRow key={finding.code} finding={finding} />
                    ))}
                  </ul>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {tab === 'quality' && (
        <Card>
          <CardHeader
            title="یافته‌های کنترل کیفیت"
            subtitle="یافته‌ها به تفکیک دسته و شدت — یافته مسدودکننده مانع انتشار می‌شود"
          />
          {data.versions.flatMap((v) => v.findings).length === 0 ? (
            <EmptyState
              title="یافته‌ای ثبت نشده است"
              description="اعتبارسنجی این قلم داده بدون ایراد گزارش شده است."
            />
          ) : (
            <ul className="space-y-2">
              {data.versions.flatMap((version) =>
                version.findings.map((finding) => (
                  <FindingRow key={`${version.id}-${finding.code}`} finding={finding} />
                )),
              )}
            </ul>
          )}
        </Card>
      )}

      {tab === 'usage' && (
        <Card>
          <CardHeader title="سازگاری تحلیلی" subtitle="این قلم داده برای کدام تحلیل‌ها کافی است" />
          <DefinitionList
            columns={1}
            items={[
              { label: 'شرایط استفاده مجاز', value: data.permittedUse },
              {
                label: 'محدودیت‌ها',
                value:
                  'کاربرد خارج از پوشش مکانی یا زمانی اعلام‌شده، خروجی را نامعتبر می‌کند و در گزارش با وضعیت «خارج از دامنه» ثبت می‌شود.',
              },
              {
                label: 'وابستگی تحلیل‌ها',
                value: (
                  <span>
                    ماژول‌هایی که به این قلم داده متکی‌اند، در صورت نبود نسخه منتشرشده، نتیجه تولید نمی‌کنند.{' '}
                    <Link to="/analysis" className="text-primary-700 underline">
                      مرکز تحلیل
                    </Link>
                  </span>
                ),
              },
            ]}
          />
        </Card>
      )}

      {tab === 'history' && (
        <Card>
          <CardHeader title="رویدادهای ثبت‌شده" />
          {relatedAudit.length === 0 ? (
            <EmptyState title="رویدادی ثبت نشده است" description="تغییرات این قلم داده پس از انجام، اینجا ثبت می‌شود." />
          ) : (
            <Timeline
              items={relatedAudit.map((entry) => ({
                id: entry.id,
                title: `${entry.actor} — ${entry.action}`,
                meta: `${formatRelative(entry.at)}${entry.toVersion ? ` · نسخه ${entry.toVersion}` : ''}`,
                body: entry.reason,
                tone: entry.outcome === 'rejected' ? 'danger' : 'success',
              }))}
            />
          )}
        </Card>
      )}

      <ConfirmDialog
        open={Boolean(publishTarget)}
        title="انتشار نسخه داده"
        confirmLabel="انتشار نسخه"
        busy={publish.isPending}
        onCancel={() => setPublishTarget(null)}
        onConfirm={() => {
          if (publishTarget) publish.mutate(publishTarget);
          setPublishTarget(null);
        }}
        description={
          <div className="space-y-2">
            <p>با انتشار این نسخه:</p>
            <ul className="list-disc space-y-1 ps-5">
              <li>نسخه منتشرشده فعلی به وضعیت «جایگزین‌شده» می‌رود.</li>
              <li>تحلیل‌های جدید می‌توانند این نسخه را انتخاب کنند.</li>
              <li>تحلیل‌های پیشین به نسخه‌ای که با آن اجرا شده‌اند متصل می‌مانند.</li>
            </ul>
          </div>
        }
      />
    </div>
  );
}
