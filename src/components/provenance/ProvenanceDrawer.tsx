import { useState } from 'react';
import { ChevronDown, FileText, Layers, Ruler, ShieldCheck, Sigma, UserCheck } from 'lucide-react';
import type { AnalyticalResult } from '@/types/domain';
import { Drawer } from '@/components/ui/overlays';
import { Badge, DefinitionList, Ltr } from '@/components/ui/display';
import { Callout } from '@/components/ui/feedback';
import { AvailabilityBadge, MethodBadge } from './AvailabilityBadge';
import {
  availabilityLabels,
  methodClassLabels,
  missingReasonLabels,
  uncertaintyLabels,
} from '@/utils/dictionary';
import { formatJalaliDate, formatNumber } from '@/utils/format';
import { cn } from '@/utils/cn';

function Section({
  title,
  icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-start text-[13px] font-medium hover:bg-surface-2"
      >
        <span className="flex items-center gap-2">
          <span className="text-muted">{icon}</span>
          {title}
        </span>
        <ChevronDown size={15} className={cn('text-faint transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="border-t border-border px-3 py-3">{children}</div>}
    </div>
  );
}

export function ProvenanceDrawer({
  result,
  open,
  onClose,
}: {
  result: AnalyticalResult | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!result) return null;
  const p = result.provenance;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="منشأ و پشتوانه نتیجه"
      subtitle={result.metricTitle}
      width="lg"
    >
      <div className="space-y-4">
        {/* Plain-language summary first; technical detail on demand */}
        <div className="rounded-lg border border-border bg-surface-2 p-3.5">
          <p className="text-xs text-muted">مقدار گزارش‌شده</p>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="num text-2xl font-semibold">
              {result.value === null ? '—' : formatNumber(result.value, { precision: result.precision })}
            </span>
            <span className="text-xs text-muted">{result.unitCode}</span>
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <AvailabilityBadge availability={result.availability} missingReason={result.missingReason} />
            <MethodBadge subtype={p.methodSubtype} />
            <Badge tone="muted">{uncertaintyLabels[result.uncertainty.status]}</Badge>
          </div>
          <p className="mt-3 text-[13px] leading-7 text-muted">
            {result.value === null
              ? `این نتیجه تولید نشده است. ${result.missingReason ? missingReasonLabels[result.missingReason] : ''} مقدار «صفر» نیست و نباید صفر تفسیر شود.`
              : `این مقدار با روش «${methodClassLabels[p.methodClass]}» و بر پایه نسخه‌های داده و پارامترهای فهرست‌شده در همین صفحه تولید شده است.`}
          </p>
        </div>

        {result.uncertainty.interpretation && (
          <Callout tone="neutral" title="تفسیر و محدودیت">
            {result.uncertainty.interpretation}
            {result.uncertainty.exclusions && result.uncertainty.exclusions.length > 0 && (
              <ul className="mt-1.5 list-disc space-y-0.5 ps-5">
                {result.uncertainty.exclusions.map((item) => (
                  <li key={item}>خارج از دامنه: {item}</li>
                ))}
              </ul>
            )}
          </Callout>
        )}

        <Section title="روش و نسخه روش" icon={<Sigma size={15} />} defaultOpen>
          <DefinitionList
            columns={2}
            items={[
              { label: 'طبقه روش', value: methodClassLabels[p.methodClass] },
              { label: 'نسخه روش', value: <Ltr>{p.methodVersion}</Ltr> },
              { label: 'دامنه مکانی', value: result.geographicScope },
              { label: 'دوره زمانی', value: result.temporalScope },
              {
                label: 'پوشش',
                value: `${formatNumber(result.coverage?.describedPct ?? 0)}٪ از محدوده توصیف‌شده`,
              },
              { label: 'زمان تولید', value: formatJalaliDate(p.generatedAt, true) },
            ]}
          />
        </Section>

        <Section title="پارامترهای استفاده‌شده" icon={<Ruler size={15} />}>
          {p.parameterRefs.length === 0 ? (
            <p className="text-[13px] text-muted">پارامتر عددی مستقلی در این نتیجه استفاده نشده است.</p>
          ) : (
            <ul className="space-y-2">
              {p.parameterRefs.map((param) => (
                <li key={param.symbol} className="flex flex-wrap items-baseline justify-between gap-2 text-[13px]">
                  <span>{param.symbol}</span>
                  <span className="flex items-center gap-2">
                    <span className="num font-medium">{formatNumber(Number(param.value), { precision: 3 })}</span>
                    <span className="text-xs text-muted">{param.unit}</span>
                    <Badge tone="muted">{param.sourceLabel}</Badge>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="داده ورودی و نسخه داده" icon={<Layers size={15} />}>
          <ul className="space-y-2">
            {p.inputRefs.map((input) => (
              <li key={input.label} className="flex flex-wrap items-baseline justify-between gap-2 text-[13px]">
                <span>{input.label}</span>
                <Badge tone="primary">
                  نسخه <Ltr>{input.versionLabel}</Ltr>
                </Badge>
              </li>
            ))}
          </ul>
        </Section>

        {p.ruleRefs && p.ruleRefs.length > 0 && (
          <Section title="قوانین اعمال‌شده" icon={<ShieldCheck size={15} />}>
            <ul className="space-y-2">
              {p.ruleRefs.map((rule) => (
                <li key={rule.code} className="flex flex-wrap items-baseline justify-between gap-2 text-[13px]">
                  <span>
                    {rule.title} <Ltr className="text-muted">{rule.code}</Ltr>
                  </span>
                  <Badge tone="muted">
                    نسخه <Ltr>{rule.versionLabel}</Ltr>
                  </Badge>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section title="مدل تخصصی" icon={<FileText size={15} />}>
          {p.modelRefs && p.modelRefs.length > 0 ? (
            <ul className="space-y-2">
              {p.modelRefs.map((model) => (
                <li key={model.modelId} className="flex items-baseline justify-between gap-2 text-[13px]">
                  <span>{model.name}</span>
                  <Badge tone="info">
                    نسخه <Ltr>{model.versionLabel}</Ltr>
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] leading-7 text-muted">
              هیچ مدل تخصصی ثبت‌شده‌ای در تولید این نتیجه اجرا نشده است.
            </p>
          )}
        </Section>

        <Section title="تصمیم انسانی" icon={<UserCheck size={15} />}>
          {p.humanDecision ? (
            <p className="text-[13px] leading-7">
              {p.humanDecision.actor} — {p.humanDecision.action} —{' '}
              {formatJalaliDate(p.humanDecision.at, true)}
            </p>
          ) : (
            <p className="text-[13px] leading-7 text-muted">
              تاکنون تصمیم انسانی ثبت‌شده‌ای به این نتیجه پیوست نشده است. تأیید نتیجه در گردش‌کار بررسی و
              تأیید انجام می‌شود و به‌معنای اعتبار قانونی یا صدور مجوز نیست.
            </p>
          )}
        </Section>

        <div className="rounded-lg border border-border bg-surface-2 p-3 text-xs leading-6 text-muted">
          شناسه نتیجه: <Ltr>{result.id}</Ltr>
          <span className="mx-2">·</span>
          شناسه اجرا: <Ltr>{result.runId}</Ltr>
          <span className="mx-2">·</span>
          وضعیت دسترسی: {availabilityLabels[result.availability]}
        </div>
      </div>
    </Drawer>
  );
}
