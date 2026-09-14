import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { scenariosApi } from '@/api/scenarios';
import { useScenarioResults, buildComparison } from '@/hooks/useAnalysis';
import { Card, CardHeader, DeltaPill, Ltr, PageHeader, Badge } from '@/components/ui/display';
import { Select } from '@/components/ui/inputs';
import { Callout, LoadingState, EmptyState } from '@/components/ui/feedback';
import { ResultValue } from '@/components/provenance/ResultCard';
import { DemoBadge } from '@/components/workflow';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { formatNumber } from '@/utils/format';

export default function ScenarioComparePage() {
  const baselineDefault = useWorkspaceStore((s) => s.baselineScenarioId);
  const [baselineId, setBaselineId] = useState(baselineDefault);
  const [leftId, setLeftId] = useState('scn-s1');
  const [rightId, setRightId] = useState('scn-s2');

  const { data: scenarios = [], isLoading } = useQuery({
    queryKey: ['scenarios', 'all'],
    queryFn: () => scenariosApi.list(),
  });

  const baseline = useScenarioResults(baselineId);
  const left = useScenarioResults(leftId);
  const right = useScenarioResults(rightId);

  if (isLoading) return <LoadingState rows={4} />;
  if (scenarios.length === 0) return <EmptyState title="سناریویی برای مقایسه وجود ندارد" />;

  const leftRows = buildComparison(baseline.byMetric, left.byMetric);
  const rightRows = buildComparison(baseline.byMetric, right.byMetric);
  const notComparable = leftRows.filter((row) => !row.comparable).length;

  const options = scenarios.map((s) => ({ value: s.id, label: s.name }));

  return (
    <div>
      <PageHeader
        eyebrow="تحلیل"
        title="مقایسه سناریوها"
        description="مقایسه تنها روی شاخص‌هایی انجام می‌شود که در همه سناریوها تولید شده‌اند و واحد و دامنه یکسان دارند. جای خالی، صفر تفسیر نمی‌شود."
        breadcrumb={[
          { label: 'خانه', to: '/dashboard' },
          { label: 'سناریوها', to: '/scenarios' },
          { label: 'مقایسه' },
        ]}
        meta={<DemoBadge />}
      />

      <div className="mb-4 grid gap-2 md:grid-cols-3">
        <label className="text-xs text-muted">
          سناریوی مبنا
          <Select
            className="mt-1"
            value={baselineId}
            onChange={(event) => setBaselineId(event.target.value)}
            options={options}
          />
        </label>
        <label className="text-xs text-muted">
          سناریوی نخست
          <Select
            className="mt-1"
            value={leftId}
            onChange={(event) => setLeftId(event.target.value)}
            options={options}
          />
        </label>
        <label className="text-xs text-muted">
          سناریوی دوم
          <Select
            className="mt-1"
            value={rightId}
            onChange={(event) => setRightId(event.target.value)}
            options={options}
          />
        </label>
      </div>

      {notComparable > 0 && (
        <Callout tone="warning" className="mb-4" title="بخشی از شاخص‌ها قابل مقایسه نیستند">
          {formatNumber(notComparable)} شاخص در دست‌کم یکی از سناریوها تولید نشده است. این موارد از
          محاسبه تغییر کنار گذاشته شده‌اند تا مقایسه گمراه‌کننده نباشد.
        </Callout>
      )}

      <Card padded={false}>
        <div className="border-b border-border p-4">
          <CardHeader
            title="جدول مقایسه"
            subtitle={`مبنا: ${scenarios.find((s) => s.id === baselineId)?.name ?? '—'}`}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-[13px]">
            <thead className="bg-surface-2 text-xs text-muted">
              <tr>
                <th className="px-3 py-2.5 text-start">شاخص</th>
                <th className="px-3 py-2.5 text-start">مبنا</th>
                <th className="px-3 py-2.5 text-start">
                  {scenarios.find((s) => s.id === leftId)?.name ?? 'سناریو ۱'}
                </th>
                <th className="px-3 py-2.5 text-start">تغییر</th>
                <th className="px-3 py-2.5 text-start">
                  {scenarios.find((s) => s.id === rightId)?.name ?? 'سناریو ۲'}
                </th>
                <th className="px-3 py-2.5 text-start">تغییر</th>
              </tr>
            </thead>
            <tbody>
              {leftRows.map((row, index) => {
                const rightRow = rightRows[index];
                return (
                  <tr key={row.code} className="border-b border-border last:border-0">
                    <td className="px-3 py-2.5">
                      <span className="font-medium">{row.title}</span>
                      <Ltr className="block text-2xs text-faint">{row.code}</Ltr>
                    </td>
                    <td className="px-3 py-2.5">
                      <ResultValue result={row.baseline} />
                    </td>
                    <td className="px-3 py-2.5">
                      <ResultValue result={row.scenario} />
                    </td>
                    <td className="px-3 py-2.5">
                      <DeltaPill delta={row.delta} percent={row.deltaPercent} direction={row.direction} precision={row.precision} />
                    </td>
                    <td className="px-3 py-2.5">
                      <ResultValue result={rightRow?.scenario} />
                    </td>
                    <td className="px-3 py-2.5">
                      <DeltaPill
                        delta={rightRow?.delta ?? null}
                        percent={rightRow?.deltaPercent ?? null}
                        direction={row.direction}
                        precision={row.precision}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="mt-4">
        <CardHeader title="بده‌بستان‌ها" subtitle="جهت مطلوب هر شاخص در محاسبه بهبود لحاظ شده است" />
        <ul className="space-y-1.5 text-[13px] leading-7">
          {leftRows
            .filter((row) => row.comparable && row.delta !== null && row.delta !== 0)
            .slice(0, 6)
            .map((row) => (
              <li key={row.code} className="flex flex-wrap items-center gap-2">
                <Badge tone="muted">{row.title}</Badge>
                <span className="text-muted">
                  {row.direction === 'neutral'
                    ? 'جهت مطلوب برای این شاخص تعریف نشده است؛ تغییر صرفاً گزارش می‌شود.'
                    : (row.direction === 'increase' && (row.delta ?? 0) > 0) ||
                        (row.direction === 'decrease' && (row.delta ?? 0) < 0)
                      ? 'تغییر در جهت مطلوب است.'
                      : 'تغییر در جهت نامطلوب است و نیازمند توضیح در گزارش است.'}
                </span>
              </li>
            ))}
        </ul>
        <Link to="/reports" className="mt-3 inline-block text-xs text-primary-700 hover:underline">
          انتقال این مقایسه به گزارش
        </Link>
      </Card>
    </div>
  );
}
