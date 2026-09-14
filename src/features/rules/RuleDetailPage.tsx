import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { rulesApi } from '@/api/catalog';
import {
  Badge,
  Card,
  CardHeader,
  DefinitionList,
  Ltr,
  PageHeader,
  StatusBadge,
  Timeline,
} from '@/components/ui/display';
import { Button } from '@/components/ui/Button';
import { Callout, EmptyState, LoadingState } from '@/components/ui/feedback';
import { DemoBadge, usePermission } from '@/components/workflow';
import { ruleStatusLabels } from '@/utils/dictionary';
import { formatJalaliDate } from '@/utils/format';
import { RULE_TONE } from './RulesPage';

export default function RuleDetailPage() {
  const { ruleId = '' } = useParams();
  const publish = usePermission('rule.publish');
  const { data, isLoading } = useQuery({ queryKey: ['rule', ruleId], queryFn: () => rulesApi.get(ruleId) });
  const { data: allRules = [] } = useQuery({ queryKey: ['rules'], queryFn: rulesApi.list });

  if (isLoading) return <LoadingState rows={3} />;
  if (!data) return <EmptyState title="قانون یافت نشد" />;

  const conflicts = (data.conflictsWith ?? [])
    .map((code) => allRules.find((r) => r.code === code))
    .filter(Boolean);
  const tone = RULE_TONE[data.status];

  return (
    <div>
      <PageHeader
        title={data.title}
        description={data.assertionSummary}
        breadcrumb={[
          { label: 'خانه', to: '/dashboard' },
          { label: 'قوانین', to: '/rules' },
          { label: data.title },
        ]}
        meta={
          <>
            <Ltr className="text-xs text-muted">{data.code}</Ltr>
            <StatusBadge label={ruleStatusLabels[data.status]} tone={tone.tone} kind={tone.kind} />
            <Badge tone={data.severity === 'blocking' ? 'danger' : 'info'}>
              {data.severity === 'blocking' ? 'مسدودکننده' : 'توصیه‌ای'}
            </Badge>
            {data.isSynthetic && <Badge tone="warning">قانون نمونه</Badge>}
            <DemoBadge />
          </>
        }
        actions={
          <Button variant="primary" disabledReason={publish.reason}>
            انتشار نسخه قانون
          </Button>
        }
      />

      {data.status === 'conflicted' && (
        <Callout tone="danger" title="این قانون تعارض حل‌نشده دارد" className="mb-4">
          تا زمانی که مرجع مربوط تعارض را حل نکند، بررسی انطباق برای این قانون نتیجه «نامشخص» می‌دهد.
          سامانه به‌صورت خودکار یکی از دو قانون را ترجیح نمی‌دهد.
        </Callout>
      )}

      {data.isSynthetic && (
        <Callout tone="warning" className="mb-4">
          این قانون برای نمایش سازوکار سامانه ساخته شده و مصوبه رسمی نیست. مقادیر حدی آن مبنای تصمیم
          قانونی قرار نمی‌گیرد.
        </Callout>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="متن و مرجع قانون" />
          <DefinitionList
            columns={2}
            items={[
              { label: 'مرجع', value: data.sourceLabel },
              { label: 'مکان‌نما در مرجع', value: <Ltr>{data.sourceLocator}</Ltr> },
              { label: 'قلمرو اعمال', value: data.jurisdiction },
              { label: 'نسخه', value: <Ltr>{data.versionLabel}</Ltr> },
              { label: 'اعتبار از', value: formatJalaliDate(data.effectiveFrom) },
              {
                label: 'اعتبار تا',
                value: data.effectiveTo ? formatJalaliDate(data.effectiveTo) : 'بدون انقضای ثبت‌شده',
              },
            ]}
          />
          {data.interpretationNote && (
            <div className="mt-4 rounded-lg border border-border bg-surface-2 p-3">
              <p className="text-xs font-medium text-muted">یادداشت تفسیری</p>
              <p className="mt-1 text-[13px] leading-7">{data.interpretationNote}</p>
              <p className="mt-2 text-2xs leading-6 text-muted">
                تفسیر، بخشی از قانون نیست و به‌صورت جداگانه ثبت و نسخه‌بندی می‌شود تا در بازبینی قابل ردیابی
                باشد.
              </p>
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="ورودی‌های لازم برای ارزیابی" />
            <ul className="space-y-1.5 text-[13px]">
              {data.requiredInputs.map((input) => (
                <li key={input} className="flex items-start gap-2">
                  <span className="mt-2 inline-block h-1 w-1 rounded-full bg-border-strong" aria-hidden />
                  {input}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-2xs leading-6 text-muted">
              نبود هر یک از این ورودی‌ها، نتیجه بررسی را «نامشخص» می‌کند، نه «مجاز».
            </p>
          </Card>

          <Card>
            <CardHeader title="مسئولیت‌ها" />
            <DefinitionList
              columns={1}
              items={[
                { label: 'بازبین', value: data.reviewerName ?? 'تعیین نشده است' },
                { label: 'مرجع تأیید', value: data.approverName ?? 'تعیین نشده است' },
              ]}
            />
          </Card>
        </div>
      </div>

      {conflicts.length > 0 && (
        <Card className="mt-4">
          <CardHeader title="قوانین در تعارض" subtitle="هر دو قانون معتبرند و انتخاب خودکار انجام نمی‌شود" />
          <ul className="space-y-2">
            {conflicts.map((rule) => (
              <li key={rule!.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3">
                <div>
                  <Link to={`/rules/${rule!.id}`} className="text-[13px] font-medium hover:text-primary-700">
                    {rule!.title}
                  </Link>
                  <p className="text-xs text-muted">{rule!.assertionSummary}</p>
                </div>
                <Ltr className="text-2xs text-faint">{rule!.code}</Ltr>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="mt-4">
        <CardHeader title="تاریخچه نسخه" />
        <Timeline
          items={[
            {
              id: 'v-current',
              title: `نسخه ${data.versionLabel} — ${ruleStatusLabels[data.status]}`,
              meta: `اعتبار از ${formatJalaliDate(data.effectiveFrom)}`,
              tone: data.status === 'conflicted' ? 'danger' : 'success',
            },
            {
              id: 'v-prev',
              title: 'نسخه پیشین — بازنشسته',
              meta: 'نتایج تحلیلی پیشین همچنان به نسخه‌ای که با آن ارزیابی شده‌اند متصل‌اند.',
              tone: 'muted',
            },
          ]}
        />
      </Card>
    </div>
  );
}
