import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ModuleId, ScenarioOverrides } from '@/types/domain';
import { scenariosApi } from '@/api/scenarios';
import { studiesApi } from '@/api/studies';
import { MODULES } from '@/api/analysis';
import { derive, evaluateRuleChecks, SYNTHETIC_LIMITS } from '@/mocks/engine';
import { fixtureAssumptions } from '@/mocks/data/work';
import {
  Badge,
  Card,
  CardHeader,
  DefinitionList,
  Ltr,
  PageHeader,
  Stepper,
  StatusBadge,
} from '@/components/ui/display';
import { Button } from '@/components/ui/Button';
import { Checkbox, Field, RangeSlider, Select, TextArea, TextInput } from '@/components/ui/inputs';
import { Callout, LoadingState, PermissionDeniedState } from '@/components/ui/feedback';
import { DemoBadge, usePermission } from '@/components/workflow';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { missingReasonLabels, ruleOutcomeLabels } from '@/utils/dictionary';
import { formatNumber } from '@/utils/format';

const STEPS = [
  { key: 'study', label: 'مطالعه و مبنا' },
  { key: 'params', label: 'پارامترهای کالبدی' },
  { key: 'assumptions', label: 'فرض‌های تحلیلی' },
  { key: 'pins', label: 'تثبیت داده و قوانین' },
  { key: 'modules', label: 'انتخاب تحلیل‌ها' },
  { key: 'review', label: 'مرور و اجرا' },
];

const DEFAULT_OVERRIDES: ScenarioOverrides = {
  footprintM2: 600,
  floors: 5,
  parkingSupplySpaces: 30,
  educationCapacitySeats: 12,
  healthCapacityBeds: 0.3,
  greenAreaM2: 600,
};

export default function ScenarioWizardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const pushToast = useUiStore((s) => s.pushToast);
  const setActiveScenario = useWorkspaceStore((s) => s.setActiveScenario);
  const baselineScenarioId = useWorkspaceStore((s) => s.baselineScenarioId);
  const permission = usePermission('scenario.create');
  const runPermission = usePermission('run.execute');

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [studyId, setStudyId] = useState('');
  const [baselineId, setBaselineId] = useState(baselineScenarioId);
  const [overrides, setOverrides] = useState<ScenarioOverrides>(DEFAULT_OVERRIDES);
  const [modules, setModules] = useState<ModuleId[]>(MODULES.map((m) => m.id));

  const { data: studies = [], isLoading } = useQuery({
    queryKey: ['studies', {}],
    queryFn: () => studiesApi.list(),
  });
  const { data: scenarios = [] } = useQuery({
    queryKey: ['scenarios', 'all'],
    queryFn: () => scenariosApi.list(),
  });

  const derived = useMemo(() => derive(overrides, fixtureAssumptions), [overrides]);
  const ruleChecks = useMemo(() => evaluateRuleChecks(derived, overrides), [derived, overrides]);
  const failing = ruleChecks.filter((c) => c.outcome === 'fail');
  const unknown = ruleChecks.filter((c) => c.outcome === 'unknown');
  const baseline = scenarios.find((s) => s.id === baselineId);
  const study = studies.find((s) => s.id === studyId) ?? studies[0];

  const submit = useMutation({
    mutationFn: async () => {
      const scenario = await scenariosApi.create({
        name,
        studyId: study.id,
        purpose,
        ownerName: user.displayName,
        baselineScenarioId: baselineId,
        overrides,
      });
      await scenariosApi.execute(scenario.id, modules, user.displayName);
      return scenario;
    },
    onSuccess: (scenario) => {
      queryClient.invalidateQueries();
      setActiveScenario(scenario.id);
      pushToast({
        title: 'سناریو ساخته شد و اجرا آغاز شد',
        description: 'می‌توانید صفحه را ترک کنید؛ اجرا در پس‌زمینه ادامه می‌یابد.',
        variant: 'success',
      });
      navigate(`/scenarios/${scenario.id}`);
    },
    onError: () =>
      pushToast({
        title: 'ایجاد سناریو انجام نشد',
        description: 'اقدام پیشنهادی: مقادیر را بررسی و دوباره تلاش کنید.',
        variant: 'error',
      }),
  });

  if (!permission.allowed) {
    return (
      <div>
        <PageHeader eyebrow="تحلیل"
        title="ایجاد سناریو" breadcrumb={[{ label: 'سناریوها', to: '/scenarios' }, { label: 'ایجاد' }]} />
        <PermissionDeniedState description={permission.reason ?? undefined} />
      </div>
    );
  }

  if (isLoading) return <LoadingState rows={3} />;

  const canContinue =
    step === 0 ? Boolean(name.trim() && (studyId || studies[0])) : step === 4 ? modules.length > 0 : true;

  return (
    <div>
      <PageHeader
        title="ایجاد سناریو"
        description="سناریو با پارامترهای صریح ساخته می‌شود و پیش از اجرا، نسخه داده و بسته قوانین تثبیت می‌شود تا نتیجه بازتولیدپذیر بماند."
        breadcrumb={[
          { label: 'خانه', to: '/dashboard' },
          { label: 'سناریوها', to: '/scenarios' },
          { label: 'ایجاد سناریو' },
        ]}
        meta={<DemoBadge />}
      />

      <Card className="mb-4">
        <Stepper steps={STEPS} current={step} onSelect={(index) => index < step && setStep(index)} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div>
          {step === 0 && (
            <Card>
              <CardHeader title="مطالعه و سناریوی مبنا" subtitle="هر سناریو در بستر یک مطالعه و نسبت به یک مبنا معنا دارد" />
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="نام سناریو" required>
                  {({ id }) => (
                    <TextInput
                      id={id}
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="مثلاً: افزایش تراکم محور شمالی"
                    />
                  )}
                </Field>
                <Field label="مطالعه" required>
                  {({ id }) => (
                    <Select
                      id={id}
                      value={study?.id ?? ''}
                      onChange={(event) => setStudyId(event.target.value)}
                      options={studies.map((s) => ({ value: s.id, label: s.title }))}
                    />
                  )}
                </Field>
                <Field label="سناریوی مبنا" hint="مقایسه‌ها نسبت به این سناریو انجام می‌شود" required>
                  {({ id }) => (
                    <Select
                      id={id}
                      value={baselineId}
                      onChange={(event) => setBaselineId(event.target.value)}
                      options={scenarios
                        .filter((s) => s.isBaseline)
                        .map((s) => ({ value: s.id, label: s.name }))}
                    />
                  )}
                </Field>
                <Field label="هدف سناریو" hint="این متن در گزارش و بسته تصمیم بازتاب می‌یابد">
                  {({ id }) => (
                    <TextArea
                      id={id}
                      value={purpose}
                      onChange={(event) => setPurpose(event.target.value)}
                      rows={3}
                      placeholder="پرسشی که این سناریو به آن پاسخ می‌دهد…"
                    />
                  )}
                </Field>
              </div>
            </Card>
          )}

          {step === 1 && (
            <Card>
              <CardHeader
                title="پارامترهای کالبدی"
                subtitle="مقادیر پیشنهادی؛ این اعداد مشاهده نیستند و در همه خروجی‌ها با همین برچسب حمل می‌شوند"
              />
              <div className="space-y-5">
                <RangeSlider
                  label="سطح اشغال"
                  unit="m²"
                  min={200}
                  max={900}
                  step={10}
                  value={overrides.footprintM2}
                  onChange={(value) => setOverrides((o) => ({ ...o, footprintM2: value }))}
                />
                <RangeSlider
                  label="تعداد طبقات"
                  min={1}
                  max={10}
                  step={1}
                  value={overrides.floors}
                  onChange={(value) => setOverrides((o) => ({ ...o, floors: value }))}
                />
                <RangeSlider
                  label="عرضه پارکینگ"
                  unit="واحد"
                  min={0}
                  max={80}
                  step={1}
                  value={overrides.parkingSupplySpaces}
                  onChange={(value) => setOverrides((o) => ({ ...o, parkingSupplySpaces: value }))}
                />
                <RangeSlider
                  label="ظرفیت آموزشی تخصیص‌یافته"
                  unit="معادل صندلی"
                  min={0}
                  max={60}
                  step={1}
                  value={overrides.educationCapacitySeats}
                  onChange={(value) => setOverrides((o) => ({ ...o, educationCapacitySeats: value }))}
                />
                <RangeSlider
                  label="فضای سبز تخصیص‌یافته"
                  unit="m²"
                  min={0}
                  max={2000}
                  step={50}
                  value={overrides.greenAreaM2}
                  onChange={(value) => setOverrides((o) => ({ ...o, greenAreaM2: value }))}
                />
              </div>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <CardHeader
                title="فرض‌های تحلیلی"
                subtitle="فرض‌ها صریح‌اند و همراه هر نتیجه گزارش می‌شوند"
              />
              <DefinitionList
                columns={2}
                items={[
                  { label: 'مساحت قطعه', value: <span className="num">{formatNumber(fixtureAssumptions.parcelAreaM2)} m²</span> },
                  { label: 'ضریب مفید مسکونی', value: <span className="num">{formatNumber(fixtureAssumptions.netResidentialEfficiency, { precision: 2 })}</span> },
                  { label: 'متوسط مساحت واحد', value: <span className="num">{formatNumber(fixtureAssumptions.meanDwellingAreaM2)} m²</span> },
                  { label: 'ضریب اشغال واحد', value: <span className="num">{formatNumber(fixtureAssumptions.occupancy, { precision: 2 })}</span> },
                  { label: 'بعد خانوار', value: <span className="num">{formatNumber(fixtureAssumptions.householdSize, { precision: 1 })} نفر</span> },
                ]}
              />
              <Callout tone="neutral" className="mt-4">
                این فرض‌ها از فیکسچر نمونه سند مشخصات می‌آیند تا نتایج دمو دقیقاً بازتولیدپذیر باشند. در
                محیط عملیاتی، فرض‌ها از پارامترهای مصوب منطقه خوانده می‌شوند.
              </Callout>
            </Card>
          )}

          {step === 3 && (
            <Card>
              <CardHeader
                title="تثبیت نسخه داده و بسته قوانین"
                subtitle="با اجرا، این نسخه‌ها قفل می‌شوند و تغییرات بعدی، نتیجه این اجرا را تغییر نمی‌دهد"
              />
              <DefinitionList
                columns={1}
                items={[
                  {
                    label: 'اقلام داده تثبیت‌شده',
                    value: (
                      <ul className="space-y-1">
                        {(baseline?.datasetPins ?? []).map((pin) => (
                          <li key={pin.label} className="flex items-center justify-between gap-2">
                            <span>{pin.label}</span>
                            <Badge tone="primary">
                              نسخه <Ltr>{pin.versionLabel}</Ltr>
                            </Badge>
                          </li>
                        ))}
                        {(baseline?.datasetPins ?? []).length === 0 && (
                          <li className="text-muted">قلم داده‌ای تثبیت نشده است.</li>
                        )}
                      </ul>
                    ),
                  },
                  {
                    label: 'بسته قوانین',
                    value: <Ltr>{baseline?.rulePackVersionLabel ?? 'rulepack-synthetic-v3'}</Ltr>,
                  },
                ]}
              />
              <Callout tone="warning" className="mt-4" title="لایه شبکه معابر در دسترس نیست">
                نسخه منتشرشده‌ای برای شبکه معابر وجود ندارد. ماژول «دسترسی و پوشش» اجرا نخواهد شد و نتیجه
                آن با وضعیت «تولید نشده» گزارش می‌شود.
              </Callout>
            </Card>
          )}

          {step === 4 && (
            <Card>
              <CardHeader
                title="انتخاب تحلیل‌ها"
                subtitle="وابستگی‌ها رعایت می‌شوند؛ ماژولی که پیش‌نیازش اجرا نشود، نتیجه تولید نمی‌کند"
                action={
                  <Button
                    size="sm"
                    onClick={() =>
                      setModules(modules.length === MODULES.length ? [] : MODULES.map((m) => m.id))
                    }
                  >
                    {modules.length === MODULES.length ? 'برداشتن همه' : 'انتخاب همه'}
                  </Button>
                }
              />
              <ul className="space-y-2">
                {MODULES.map((module) => (
                  <li key={module.id} className="rounded-lg border border-border p-3">
                    <Checkbox
                      checked={modules.includes(module.id)}
                      onChange={(checked) =>
                        setModules((prev) =>
                          checked ? [...prev, module.id] : prev.filter((m) => m !== module.id),
                        )
                      }
                      label={
                        <span className="flex flex-wrap items-center gap-2">
                          <Badge tone="muted">{module.id}</Badge>
                          <span className="font-medium">{module.title}</span>
                          {!module.availableInDemo && (
                            <StatusBadge label="در این محیط اجرا نمی‌شود" tone="muted" kind="blocked" />
                          )}
                        </span>
                      }
                      description={
                        <>
                          {module.purpose}
                          {module.dependsOn.length > 0 && (
                            <span className="mt-0.5 block text-2xs">
                              پیش‌نیاز: {module.dependsOn.join('، ')}
                            </span>
                          )}
                          {!module.availableInDemo && module.unavailableReason && (
                            <span className="mt-0.5 block text-2xs">
                              دلیل: {missingReasonLabels[module.unavailableReason]}
                            </span>
                          )}
                        </>
                      }
                    />
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <Card>
                <CardHeader title="مرور نهایی" />
                <DefinitionList
                  columns={2}
                  items={[
                    { label: 'نام سناریو', value: name || '—' },
                    { label: 'مطالعه', value: study?.title ?? '—' },
                    { label: 'سناریوی مبنا', value: baseline?.name ?? '—' },
                    { label: 'تعداد تحلیل انتخاب‌شده', value: <span className="num">{formatNumber(modules.length)}</span> },
                  ]}
                />
              </Card>

              <Card>
                <CardHeader
                  title="پیش‌بررسی انطباق با قوانین"
                  subtitle="این ارزیابی پیش از اجرا انجام می‌شود و مانع اجرا نیست"
                />
                <ul className="space-y-2">
                  {ruleChecks.map((check) => (
                    <li key={check.ruleCode} className="rounded-lg border border-border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[13px] font-medium">{check.ruleTitle}</span>
                        <StatusBadge
                          label={ruleOutcomeLabels[check.outcome]}
                          tone={
                            check.outcome === 'pass'
                              ? 'success'
                              : check.outcome === 'fail'
                                ? 'danger'
                                : check.outcome === 'unknown'
                                  ? 'warning'
                                  : 'muted'
                          }
                          kind={
                            check.outcome === 'pass'
                              ? 'ok'
                              : check.outcome === 'fail'
                                ? 'error'
                                : check.outcome === 'unknown'
                                  ? 'unknown'
                                  : 'blocked'
                          }
                        />
                      </div>
                      <p className="mt-1 text-xs leading-6 text-muted">{check.reason}</p>
                      {check.observed?.value != null && check.limit?.value != null && (
                        <p className="mt-1 text-2xs text-faint">
                          مقدار محاسبه‌شده: <span className="num">{formatNumber(check.observed.value, { precision: 2 })}</span>
                          <span className="mx-2">·</span>
                          حد مجاز: <span className="num">{formatNumber(check.limit.value, { precision: 2 })}</span>
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </Card>

              {failing.length > 0 && (
                <Callout tone="warning" title="این سناریو از حدود نمونه فراتر می‌رود">
                  سناریو با {formatNumber(failing.length)} تخلف ثبت می‌شود. اجرا ممکن است، اما نسخه با برچسب
                  «فراتر از حد مجاز» ثبت می‌شود تا در بررسی و تأیید قابل تشخیص باشد.
                </Callout>
              )}
              {unknown.length > 0 && (
                <Callout tone="danger" title="بررسی نامشخص به‌دلیل تعارض قوانین">
                  {formatNumber(unknown.length)} بررسی به‌دلیل تعارض حل‌نشده، نتیجه «نامشخص» دارد. این
                  موارد به‌عنوان «مجاز» گزارش نمی‌شوند.
                </Callout>
              )}
            </div>
          )}
        </div>

        {/* live preview */}
        <aside className="space-y-4">
          <Card>
            <CardHeader title="پیش‌نمایش زنده" subtitle="بر پایه پارامترهای انتخابی" />
            <DefinitionList
              columns={1}
              items={[
                { label: 'زیربنای ناخالص', value: <span className="num">{formatNumber(derived.gfaM2)} m²</span> },
                { label: 'تراکم ساختمانی', value: <span className="num">{formatNumber(derived.far, { precision: 2 })}</span> },
                { label: 'سطح اشغال', value: <span className="num">{formatNumber(derived.coverage * 100, { precision: 0 })}٪</span> },
                { label: 'ظرفیت واحد', value: <span className="num">{formatNumber(derived.dwellings)}</span> },
                { label: 'جمعیت بالقوه', value: <span className="num">{formatNumber(derived.residents)} نفر</span> },
                { label: 'کسری پارکینگ', value: <span className="num">{formatNumber(derived.parkingShortfall)} واحد</span> },
              ]}
            />
            <p className="mt-3 text-2xs leading-6 text-muted">
              حدود نمونه: تراکم {formatNumber(SYNTHETIC_LIMITS.maxFar, { precision: 1 })}، سطح اشغال{' '}
              {formatNumber(SYNTHETIC_LIMITS.maxCoverage * 100)}٪، طبقات {formatNumber(SYNTHETIC_LIMITS.maxFloors)}
            </p>
          </Card>
        </aside>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <Button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          مرحله قبل
        </Button>
        {step < STEPS.length - 1 ? (
          <Button
            variant="primary"
            disabledReason={canContinue ? null : 'برای ادامه، اطلاعات این مرحله را کامل کنید.'}
            onClick={() => setStep((s) => s + 1)}
          >
            مرحله بعد
          </Button>
        ) : (
          <Button
            variant="primary"
            loading={submit.isPending}
            disabledReason={runPermission.reason}
            onClick={() => submit.mutate()}
          >
            ثبت سناریو و اجرای تحلیل
          </Button>
        )}
      </div>
    </div>
  );
}
