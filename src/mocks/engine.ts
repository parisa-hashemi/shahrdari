/**
 * Deterministic mock analytical engine.
 *
 * This reproduces the SYNTHETIC density fixture of FSD-B14.2/B14.3 exactly.
 * It is NOT a scientific model and contains no real Tehran parcel, rule,
 * capacity or approved coefficient. Every coefficient below is a labelled
 * synthetic fixture value, surfaced to the user as such.
 *
 * The engine lives in the mock layer only. When the FastAPI backend is
 * connected, `src/api/*` returns server results with the same envelope and
 * this file is no longer executed.
 */
import type {
  AnalyticalResult,
  MissingReason,
  ModuleId,
  Provenance,
  RuleCheck,
  ScenarioAssumptions,
  ScenarioOverrides,
} from '@/types/domain';
import { contentHash, deterministicId } from '@/utils/id';

/** Synthetic coefficients — FSD-B14.2. Not municipal standards. */
export const SYNTHETIC_COEFFICIENTS = {
  personTripEndsPerResidentDay: 2.5,
  motorizedPersonShare: 0.6,
  vehicleOccupancy: 1.5,
  parkingSpacesPerDwelling: 1.25,
  educationSeatsPerPerson: 0.15,
  healthBedsPerPerson: 0.004,
  greenAreaPerPersonM2: 9,
  waterLitrePerPersonDay: 150,
  wastewaterReturnRatio: 0.8,
  electricityKwhPerGrossM2Year: 40,
  gasM3PerGrossM2Year: 3,
  electricityEmissionKgPerKwh: 0.4,
  gasEmissionKgPerM3: 2,
} as const;

/** Synthetic numerical limits — FSD-B14.2. */
export const SYNTHETIC_LIMITS = {
  maxFar: 3.0,
  maxCoverage: 0.6,
  maxFloors: 5,
} as const;

const METHOD_VERSION = 'fixture-1.0.0';
const GENERATED_AT = '2026-09-01T08:00:00Z';

function round(value: number, dp = 6): number {
  const f = 10 ** dp;
  return Math.round(value * f) / f;
}

interface Ctx {
  runId: string;
  scenarioVersionId: string;
  scopeLabel: string;
  periodLabel: string;
  overrides: ScenarioOverrides;
  assumptions: ScenarioAssumptions;
}

interface DerivedValues {
  gfaM2: number;
  netResidentialM2: number;
  dwellings: number;
  residents: number;
  far: number;
  coverage: number;
  personTripEnds: number;
  vehicleTripEnds: number;
  requiredParking: number;
  parkingShortfall: number;
  educationDemand: number;
  educationGap: number;
  healthDemand: number;
  healthGap: number;
  greenDemand: number;
  greenGap: number;
  waterM3Day: number;
  wastewaterM3Day: number;
  electricityKwhYear: number;
  gasM3Year: number;
  electricityEmissions: number;
  gasEmissions: number;
  totalEmissions: number;
}

/** Pure arithmetic core — the same inputs always give the same numbers. */
export function derive(
  overrides: ScenarioOverrides,
  a: ScenarioAssumptions,
): DerivedValues {
  const c = SYNTHETIC_COEFFICIENTS;
  const gfaM2 = round(overrides.footprintM2 * overrides.floors);
  const netResidentialM2 = round(gfaM2 * a.netResidentialEfficiency);
  const dwellings = Math.floor(round(netResidentialM2 / a.meanDwellingAreaM2, 4));
  const residents = round(dwellings * a.householdSize * a.occupancy);
  const far = round(gfaM2 / a.parcelAreaM2);
  const coverage = round(overrides.footprintM2 / a.parcelAreaM2);

  const personTripEnds = round(residents * c.personTripEndsPerResidentDay);
  const vehicleTripEnds = round(
    (personTripEnds * c.motorizedPersonShare) / c.vehicleOccupancy,
  );

  // Rounded upward once per parcel — FSD-B14.2
  const requiredParking = Math.ceil(round(dwellings * c.parkingSpacesPerDwelling, 4));
  const parkingShortfall = Math.max(0, requiredParking - overrides.parkingSupplySpaces);

  const educationDemand = round(residents * c.educationSeatsPerPerson);
  const healthDemand = round(residents * c.healthBedsPerPerson);
  const greenDemand = round(residents * c.greenAreaPerPersonM2);

  const waterM3Day = round((residents * c.waterLitrePerPersonDay) / 1000);
  const wastewaterM3Day = round(waterM3Day * c.wastewaterReturnRatio);
  const electricityKwhYear = round(gfaM2 * c.electricityKwhPerGrossM2Year);
  const gasM3Year = round(gfaM2 * c.gasM3PerGrossM2Year);
  const electricityEmissions = round(electricityKwhYear * c.electricityEmissionKgPerKwh);
  const gasEmissions = round(gasM3Year * c.gasEmissionKgPerM3);

  return {
    gfaM2,
    netResidentialM2,
    dwellings,
    residents,
    far,
    coverage,
    personTripEnds,
    vehicleTripEnds,
    requiredParking,
    parkingShortfall,
    educationDemand,
    educationGap: round(Math.max(0, educationDemand - overrides.educationCapacitySeats)),
    healthDemand,
    healthGap: round(Math.max(0, healthDemand - overrides.healthCapacityBeds)),
    greenDemand,
    greenGap: round(Math.max(0, greenDemand - overrides.greenAreaM2)),
    waterM3Day,
    wastewaterM3Day,
    electricityKwhYear,
    gasM3Year,
    electricityEmissions,
    gasEmissions,
    totalEmissions: round(electricityEmissions + gasEmissions),
  };
}

/* ---------------------------------------------------------- provenance --- */

function baseProvenance(
  subtype: Provenance['methodSubtype'],
  params: Provenance['parameterRefs'],
  extra: Partial<Provenance> = {},
): Provenance {
  const methodClass: Provenance['methodClass'] =
    subtype === 'deterministic_calculation' || subtype === 'rule_evaluation'
      ? 'deterministic'
      : subtype === 'expert_judgment'
        ? 'expert_judgment'
        : 'model_based';
  return {
    methodClass,
    methodSubtype: subtype,
    methodVersion: METHOD_VERSION,
    parameterRefs: params,
    inputRefs: [
      { label: 'قطعات و کاربری اراضی (نمونه)', versionLabel: 'v3.2 (۱۴۰۵/۰۲)' },
      { label: 'ابنیه و طبقات (نمونه)', versionLabel: 'v2.1 (۱۴۰۴/۱۱)' },
    ],
    generatedAt: GENERATED_AT,
    ...extra,
  };
}

interface ResultInput {
  moduleId: ModuleId;
  metricCode: string;
  metricTitle: string;
  value: number | null;
  unitCode: string;
  provenance: Provenance;
  availability?: AnalyticalResult['availability'];
  missingReason?: MissingReason;
  precision?: number;
  uncertainty?: AnalyticalResult['uncertainty'];
  desiredDirection?: AnalyticalResult['desiredDirection'];
  coveragePct?: number;
}

function makeResult(ctx: Ctx, input: ResultInput): AnalyticalResult {
  const availability =
    input.availability ??
    (input.provenance.methodClass === 'model_based' ? 'proxy' : 'computed');
  return {
    id: deterministicId('res', `${ctx.runId}:${input.metricCode}`),
    runId: ctx.runId,
    moduleId: input.moduleId,
    metricCode: input.metricCode,
    metricTitle: input.metricTitle,
    value: input.value,
    unitCode: input.unitCode,
    availability,
    missingReason: input.missingReason,
    geographicScope: ctx.scopeLabel,
    temporalScope: ctx.periodLabel,
    coverage: { describedPct: input.coveragePct ?? 100 },
    quality: availability === 'not_available' ? 'unknown' : 'medium',
    uncertainty:
      input.uncertainty ??
      (availability === 'computed'
        ? {
            status: 'not_quantified',
            interpretation:
              'محاسبه بر پایه ورودی‌های انتخاب‌شده قطعی است؛ عدم قطعیت ورودی‌ها جداگانه ارزیابی نشده است.',
          }
        : {
            status: 'qualitative',
            interpretation:
              'برآورد مشروط بر ضرایب نمونه؛ دقت واقعی نیازمند کالیبراسیون و تأیید متخصص است.',
          }),
    provenance: input.provenance,
    classification: 'restricted_municipal',
    precision: input.precision,
    desiredDirection: input.desiredDirection,
  };
}

/* --------------------------------------------------------- rule checks --- */

export function evaluateRuleChecks(
  d: DerivedValues,
  overrides: ScenarioOverrides,
): RuleCheck[] {
  const far: RuleCheck = {
    ruleCode: 'SYN-FAR-01',
    ruleTitle: 'حداکثر تراکم ساختمانی (نمونه)',
    outcome: d.far <= SYNTHETIC_LIMITS.maxFar ? 'pass' : 'fail',
    observed: { value: d.far, unit: 'نسبت' },
    limit: { value: SYNTHETIC_LIMITS.maxFar, unit: 'نسبت' },
    reason:
      d.far <= SYNTHETIC_LIMITS.maxFar
        ? 'نسبت زیربنا به مساحت قطعه از حد نمونه فراتر نرفته است.'
        : 'نسبت زیربنا به مساحت قطعه از حد نمونه فراتر رفته است.',
    sourceLabel: 'محدودیت عددی نمونه (فیکسچر)',
    versionLabel: 'fixture-1.0.0',
  };
  const coverage: RuleCheck = {
    ruleCode: 'SYN-COV-01',
    ruleTitle: 'حداکثر سطح اشغال (نمونه)',
    outcome: d.coverage <= SYNTHETIC_LIMITS.maxCoverage ? 'pass' : 'fail',
    observed: { value: d.coverage, unit: 'نسبت' },
    limit: { value: SYNTHETIC_LIMITS.maxCoverage, unit: 'نسبت' },
    reason: 'مقایسه سطح اشغال با حد عددی نمونه.',
    sourceLabel: 'محدودیت عددی نمونه (فیکسچر)',
    versionLabel: 'fixture-1.0.0',
  };
  const floors: RuleCheck = {
    ruleCode: 'SYN-FLR-01',
    ruleTitle: 'حداکثر تعداد طبقات (نمونه)',
    outcome: overrides.floors <= SYNTHETIC_LIMITS.maxFloors ? 'pass' : 'fail',
    observed: { value: overrides.floors, unit: 'طبقه' },
    limit: { value: SYNTHETIC_LIMITS.maxFloors, unit: 'طبقه' },
    reason: 'مقایسه تعداد طبقات با حد عددی نمونه.',
    sourceLabel: 'محدودیت عددی نمونه (فیکسچر)',
    versionLabel: 'fixture-1.0.0',
  };
  const parking: RuleCheck = {
    ruleCode: 'SYN-PRK-01',
    ruleTitle: 'تأمین پارکینگ موردنیاز (نمونه)',
    outcome: d.parkingShortfall === 0 ? 'pass' : 'fail',
    observed: { value: overrides.parkingSupplySpaces, unit: 'واحد پارکینگ' },
    limit: { value: d.requiredParking, unit: 'واحد پارکینگ' },
    reason:
      d.parkingShortfall === 0
        ? 'عرضه مستند برابر یا بیشتر از الزام نمونه است.'
        : 'عرضه مستند کمتر از الزام نمونه است؛ کسری ثبت شد.',
    sourceLabel: 'محدودیت عددی نمونه (فیکسچر)',
    versionLabel: 'fixture-1.0.0',
  };
  const setback: RuleCheck = {
    ruleCode: 'SYN-SBK-01',
    ruleTitle: 'عقب‌نشینی و فاصله از حدود (نمونه)',
    outcome: 'unknown',
    reason: 'هندسه عقب‌نشینی در داده ورودی موجود نیست؛ نتیجه نامشخص باقی می‌ماند.',
    sourceLabel: 'محدودیت عددی نمونه (فیکسچر)',
    versionLabel: 'fixture-1.0.0',
  };
  const zoning: RuleCheck = {
    ruleCode: 'SYN-ZON-01',
    ruleTitle: 'انطباق پهنه‌بندی (نمونه)',
    outcome: 'unknown',
    conflictStatus: 'unresolved',
    reason:
      'دو سند مرجع با دامنه هم‌پوشان برای این پهنه ثبت شده‌اند؛ سلسله‌مراتب تأییدشده موجود نیست.',
    sourceLabel: 'محدودیت عددی نمونه (فیکسچر)',
    versionLabel: 'fixture-1.0.0',
  };
  return [far, coverage, floors, parking, setback, zoning];
}

/* ------------------------------------------------------------- modules --- */

const UNAVAILABLE_NOTE =
  'داده/مدل معتبر برای این خروجی در محیط نمایشی موجود نیست؛ مقدار صفر نیست و نباید صفر تفسیر شود.';

function unavailable(
  ctx: Ctx,
  moduleId: ModuleId,
  metricCode: string,
  metricTitle: string,
  unitCode: string,
  reason: MissingReason,
): AnalyticalResult {
  return makeResult(ctx, {
    moduleId,
    metricCode,
    metricTitle,
    value: null,
    unitCode,
    availability: 'not_available',
    missingReason: reason,
    coveragePct: 0,
    uncertainty: { status: 'not_quantified', interpretation: UNAVAILABLE_NOTE },
    provenance: baseProvenance('specialist_model', [], {
      modelRefs: [],
      inputRefs: [{ label: 'ورودی موردنیاز ثبت‌نشده', versionLabel: '—' }],
    }),
  });
}

export interface EngineOutput {
  results: AnalyticalResult[];
  ruleChecks: RuleCheck[];
  derived: DerivedValues;
  unavailableModules: ModuleId[];
  inputManifestHash: string;
}

export function runAnalysis(params: {
  runId: string;
  scenarioVersionId: string;
  scopeLabel: string;
  periodLabel: string;
  overrides: ScenarioOverrides;
  assumptions: ScenarioAssumptions;
  modules: ModuleId[];
}): EngineOutput {
  const ctx: Ctx = { ...params };
  const d = derive(params.overrides, params.assumptions);
  const a = params.assumptions;
  const c = SYNTHETIC_COEFFICIENTS;
  const results: AnalyticalResult[] = [];
  const wanted = new Set(params.modules);

  const P = (symbol: string, value: string, unit: string, source = 'ضریب نمونه (فیکسچر FSD-B14.2)') => ({
    symbol,
    value,
    unit,
    sourceLabel: source,
  });

  /* M01 — rule and state comparison */
  if (wanted.has('M01')) {
    results.push(
      makeResult(ctx, {
        moduleId: 'M01',
        metricCode: 'M01.far_ratio',
        metricTitle: 'تراکم ساختمانی (FAR)',
        value: d.far,
        unitCode: 'نسبت',
        precision: 2,
        desiredDirection: 'neutral',
        provenance: baseProvenance('deterministic_calculation', [
          P('مساحت قطعه', String(a.parcelAreaM2), 'm²', 'داده نمونه قطعه'),
        ]),
      }),
      makeResult(ctx, {
        moduleId: 'M01',
        metricCode: 'M01.coverage_ratio',
        metricTitle: 'سطح اشغال',
        value: d.coverage,
        unitCode: 'نسبت',
        precision: 2,
        provenance: baseProvenance('deterministic_calculation', [
          P('مساحت قطعه', String(a.parcelAreaM2), 'm²', 'داده نمونه قطعه'),
        ]),
      }),
      makeResult(ctx, {
        moduleId: 'M01',
        metricCode: 'M01.violation_count',
        metricTitle: 'تعداد مغایرت‌های عددی',
        value: evaluateRuleChecks(d, params.overrides).filter((r) => r.outcome === 'fail').length,
        unitCode: 'مورد',
        precision: 0,
        desiredDirection: 'decrease',
        provenance: baseProvenance('rule_evaluation', [], {
          ruleRefs: [
            { code: 'SYN-FAR-01', title: 'حداکثر تراکم (نمونه)', versionLabel: 'fixture-1.0.0' },
            { code: 'SYN-COV-01', title: 'حداکثر سطح اشغال (نمونه)', versionLabel: 'fixture-1.0.0' },
            { code: 'SYN-FLR-01', title: 'حداکثر طبقات (نمونه)', versionLabel: 'fixture-1.0.0' },
          ],
        }),
      }),
      makeResult(ctx, {
        moduleId: 'M01',
        metricCode: 'M01.unresolved_checks',
        metricTitle: 'کنترل‌های نامشخص',
        value: evaluateRuleChecks(d, params.overrides).filter((r) => r.outcome === 'unknown').length,
        unitCode: 'مورد',
        precision: 0,
        desiredDirection: 'decrease',
        provenance: baseProvenance('rule_evaluation', []),
      }),
    );
  }

  /* M02 — building capacity */
  if (wanted.has('M02')) {
    results.push(
      makeResult(ctx, {
        moduleId: 'M02',
        metricCode: 'M02.gfa',
        metricTitle: 'زیربنای ناخالص',
        value: d.gfaM2,
        unitCode: 'm²',
        precision: 0,
        desiredDirection: 'neutral',
        provenance: baseProvenance('deterministic_calculation', [
          P('سطح اشغال', String(params.overrides.footprintM2), 'm²', 'ورودی سناریو'),
          P('تعداد طبقات', String(params.overrides.floors), 'طبقه', 'ورودی سناریو'),
        ]),
      }),
      makeResult(ctx, {
        moduleId: 'M02',
        metricCode: 'M02.net_residential',
        metricTitle: 'زیربنای خالص مسکونی',
        value: d.netResidentialM2,
        unitCode: 'm²',
        precision: 0,
        provenance: baseProvenance('deterministic_calculation', [
          P('ضریب کارایی خالص', String(a.netResidentialEfficiency), '—'),
        ]),
      }),
      makeResult(ctx, {
        moduleId: 'M02',
        metricCode: 'M02.footprint',
        metricTitle: 'سطح اشغال زمین',
        value: params.overrides.footprintM2,
        unitCode: 'm²',
        precision: 0,
        provenance: baseProvenance('deterministic_calculation', []),
      }),
    );
  }

  /* M03 — population capacity */
  if (wanted.has('M03')) {
    results.push(
      makeResult(ctx, {
        moduleId: 'M03',
        metricCode: 'M03.dwellings',
        metricTitle: 'ظرفیت واحد مسکونی',
        value: d.dwellings,
        unitCode: 'واحد',
        precision: 0,
        availability: 'proxy',
        provenance: baseProvenance('proxy_estimate', [
          P('متوسط مساحت خالص واحد', String(a.meanDwellingAreaM2), 'm²'),
        ]),
      }),
      makeResult(ctx, {
        moduleId: 'M03',
        metricCode: 'M03.households',
        metricTitle: 'ظرفیت خانوار',
        value: d.dwellings,
        unitCode: 'خانوار',
        precision: 0,
        availability: 'proxy',
        provenance: baseProvenance('proxy_estimate', [
          P('ضریب اشغال', String(a.occupancy), '—'),
        ]),
      }),
      makeResult(ctx, {
        moduleId: 'M03',
        metricCode: 'M03.potential_residents',
        metricTitle: 'جمعیت بالقوه در اشغال کامل',
        value: d.residents,
        unitCode: 'نفر',
        precision: 0,
        availability: 'proxy',
        provenance: baseProvenance('proxy_estimate', [
          P('بعد خانوار', String(a.householdSize), 'نفر/واحد'),
          P('ضریب اشغال', String(a.occupancy), '—'),
        ]),
        uncertainty: {
          status: 'qualitative',
          interpretation:
            'ظرفیت بالقوه است، نه پیش‌بینی جمعیت. پیش‌بینی جمعیت نیازمند مدل جمعیتی تأییدشده است.',
          exclusions: ['پیش‌بینی جمعیت واقعی', 'روند مهاجرت', 'نرخ خالی‌ماندن واحدها'],
        },
      }),
      unavailable(ctx, 'M03', 'M03.population_forecast', 'پیش‌بینی جمعیت واقعی', 'نفر', 'MODEL_UNAVAILABLE'),
    );
  }

  /* M04 — trip generation */
  if (wanted.has('M04')) {
    results.push(
      makeResult(ctx, {
        moduleId: 'M04',
        metricCode: 'M04.person_trip_ends',
        metricTitle: 'سرانجام سفر نفری روزانه',
        value: d.personTripEnds,
        unitCode: 'سرانجام سفر/روز',
        precision: 1,
        availability: 'proxy',
        desiredDirection: 'neutral',
        provenance: baseProvenance('proxy_estimate', [
          P('نرخ تولید سفر', String(c.personTripEndsPerResidentDay), 'سرانجام سفر/نفر/روز'),
        ]),
      }),
      makeResult(ctx, {
        moduleId: 'M04',
        metricCode: 'M04.vehicle_trip_ends',
        metricTitle: 'سرانجام سفر وسیله نقلیه روزانه',
        value: d.vehicleTripEnds,
        unitCode: 'سرانجام سفر خودرو/روز',
        precision: 1,
        availability: 'proxy',
        desiredDirection: 'decrease',
        provenance: baseProvenance('proxy_estimate', [
          P('سهم سفر موتوری', String(c.motorizedPersonShare), '—'),
          P('ضریب سرنشین', String(c.vehicleOccupancy), 'نفر/خودرو'),
        ]),
      }),
      unavailable(ctx, 'M04', 'M04.assignment', 'تخصیص سفر و ازدحام شبکه', 'وسیله/ساعت', 'MODEL_UNAVAILABLE'),
      unavailable(ctx, 'M04', 'M04.travel_time', 'زمان سفر شبکه', 'دقیقه', 'MISSING_REQUIRED_INPUT'),
    );
  }

  /* M05 — parking */
  if (wanted.has('M05')) {
    results.push(
      makeResult(ctx, {
        moduleId: 'M05',
        metricCode: 'M05.required_spaces',
        metricTitle: 'پارکینگ موردنیاز (الزام)',
        value: d.requiredParking,
        unitCode: 'واحد پارکینگ',
        precision: 0,
        availability: 'proxy',
        desiredDirection: 'neutral',
        provenance: baseProvenance('proxy_estimate', [
          P('الزام پارکینگ', String(c.parkingSpacesPerDwelling), 'واحد/واحد مسکونی'),
        ]),
      }),
      makeResult(ctx, {
        moduleId: 'M05',
        metricCode: 'M05.documented_supply',
        metricTitle: 'عرضه مستند',
        value: params.overrides.parkingSupplySpaces,
        unitCode: 'واحد پارکینگ',
        precision: 0,
        provenance: baseProvenance('external_supplied', [], {
          inputRefs: [{ label: 'ظرفیت پارکینگ اعلامی سناریو', versionLabel: 'ورودی کاربر' }],
        }),
        uncertainty: {
          status: 'qualitative',
          interpretation:
            'عرضه مستند فقط شامل ظرفیت ثبت‌شده است. نبود ثبت به معنای صفر نیست.',
        },
      }),
      makeResult(ctx, {
        moduleId: 'M05',
        metricCode: 'M05.shortfall',
        metricTitle: 'کسری پارکینگ',
        value: d.parkingShortfall,
        unitCode: 'واحد پارکینگ',
        precision: 0,
        availability: 'proxy',
        desiredDirection: 'decrease',
        provenance: baseProvenance('proxy_estimate', []),
      }),
      unavailable(ctx, 'M05', 'M05.market_demand', 'تقاضای مدل‌شده بازار پارکینگ', 'واحد پارکینگ', 'MODEL_UNAVAILABLE'),
    );
  }

  /* M06 — service demand */
  if (wanted.has('M06')) {
    const svc = (
      code: string,
      title: string,
      value: number,
      unit: string,
      coeff: string,
      coeffUnit: string,
      precision: number,
      dir: AnalyticalResult['desiredDirection'] = 'neutral',
    ) =>
      makeResult(ctx, {
        moduleId: 'M06',
        metricCode: code,
        metricTitle: title,
        value,
        unitCode: unit,
        precision,
        availability: 'proxy',
        desiredDirection: dir,
        provenance: baseProvenance('proxy_estimate', [P('سرانه', coeff, coeffUnit)]),
      });
    results.push(
      svc('M06.education_demand', 'تقاضای آموزشی', d.educationDemand, 'معادل صندلی', String(c.educationSeatsPerPerson), 'صندلی/نفر', 1),
      svc('M06.education_gap', 'کسری آموزشی', d.educationGap, 'معادل صندلی', String(c.educationSeatsPerPerson), 'صندلی/نفر', 1, 'decrease'),
      svc('M06.health_demand', 'تقاضای بهداشتی-درمانی', d.healthDemand, 'معادل تخت', String(c.healthBedsPerPerson), 'تخت/نفر', 3),
      svc('M06.health_gap', 'کسری بهداشتی-درمانی', d.healthGap, 'معادل تخت', String(c.healthBedsPerPerson), 'تخت/نفر', 3, 'decrease'),
      svc('M06.green_demand', 'تقاضای فضای سبز', d.greenDemand, 'm²', String(c.greenAreaPerPersonM2), 'm²/نفر', 0),
      svc('M06.green_gap', 'کسری فضای سبز', d.greenGap, 'm²', String(c.greenAreaPerPersonM2), 'm²/نفر', 0, 'decrease'),
    );
  }

  /* M07 — accessibility (no approved routable network in the fixture) */
  if (wanted.has('M07')) {
    results.push(
      unavailable(ctx, 'M07', 'M07.network_coverage', 'پوشش شبکه‌محور خدمات', '٪', 'MISSING_REQUIRED_INPUT'),
      unavailable(ctx, 'M07', 'M07.catchment_population', 'جمعیت درون حوزه دسترسی', 'نفر', 'MISSING_REQUIRED_INPUT'),
      unavailable(ctx, 'M07', 'M07.underserved_area', 'پهنه کم‌برخوردار', 'm²', 'MISSING_REQUIRED_INPUT'),
    );
  }

  /* M08 — infrastructure demand */
  if (wanted.has('M08')) {
    const inf = (
      code: string,
      title: string,
      value: number,
      unit: string,
      coeff: string,
      coeffUnit: string,
      precision: number,
    ) =>
      makeResult(ctx, {
        moduleId: 'M08',
        metricCode: code,
        metricTitle: title,
        value,
        unitCode: unit,
        precision,
        availability: 'proxy',
        desiredDirection: 'decrease',
        provenance: baseProvenance('proxy_estimate', [P('ضریب', coeff, coeffUnit)]),
        uncertainty: {
          status: 'qualitative',
          interpretation:
            'برآورد تحلیلی تقاضا است و ظرفیت مهندسی تأییدشده شبکه محسوب نمی‌شود.',
          exclusions: ['ظرفیت انشعاب', 'وضعیت شبکه موجود', 'پیک مصرف'],
        },
      });
    results.push(
      inf('M08.water', 'تقاضای آب', d.waterM3Day, 'm³/روز', String(c.waterLitrePerPersonDay), 'لیتر/نفر/روز', 1),
      inf('M08.wastewater', 'بار فاضلاب', d.wastewaterM3Day, 'm³/روز', String(c.wastewaterReturnRatio), 'ضریب بازگشت', 2),
      inf('M08.electricity', 'مصرف برق سالانه', d.electricityKwhYear, 'kWh/سال', String(c.electricityKwhPerGrossM2Year), 'kWh/m²/سال', 0),
      inf('M08.gas', 'مصرف گاز سالانه', d.gasM3Year, 'm³/سال', String(c.gasM3PerGrossM2Year), 'm³/m²/سال', 0),
      unavailable(ctx, 'M08', 'M08.peak_load', 'پیک بار برق', 'kW', 'MISSING_REQUIRED_INPUT'),
      unavailable(ctx, 'M08', 'M08.connection_capacity', 'ظرفیت انشعاب تأییدشده', '—', 'MISSING_REQUIRED_INPUT'),
    );
  }

  /* M09 — shadow and solar (no validated height/terrain/solar inputs) */
  if (wanted.has('M09')) {
    results.push(
      unavailable(ctx, 'M09', 'M09.shadow_duration', 'مدت سایه‌اندازی', 'ساعت/روز', 'MISSING_REQUIRED_INPUT'),
      unavailable(ctx, 'M09', 'M09.solar_access', 'دسترسی به تابش', 'ساعت/روز', 'MISSING_REQUIRED_INPUT'),
    );
  }

  /* M10 — energy and environment */
  if (wanted.has('M10')) {
    results.push(
      makeResult(ctx, {
        moduleId: 'M10',
        metricCode: 'M10.electricity_emissions',
        metricTitle: 'انتشار ناشی از برق',
        value: d.electricityEmissions,
        unitCode: 'kgCO2e/سال',
        precision: 0,
        availability: 'proxy',
        desiredDirection: 'decrease',
        provenance: baseProvenance('proxy_estimate', [
          P('ضریب انتشار برق', String(c.electricityEmissionKgPerKwh), 'kgCO2e/kWh'),
        ]),
      }),
      makeResult(ctx, {
        moduleId: 'M10',
        metricCode: 'M10.gas_emissions',
        metricTitle: 'انتشار ناشی از گاز',
        value: d.gasEmissions,
        unitCode: 'kgCO2e/سال',
        precision: 0,
        availability: 'proxy',
        desiredDirection: 'decrease',
        provenance: baseProvenance('proxy_estimate', [
          P('ضریب انتشار گاز', String(c.gasEmissionKgPerM3), 'kgCO2e/m³'),
        ]),
      }),
      makeResult(ctx, {
        moduleId: 'M10',
        metricCode: 'M10.total_operational_emissions',
        metricTitle: 'انتشار عملیاتی کل (برآورد جانشین)',
        value: d.totalEmissions,
        unitCode: 'kgCO2e/سال',
        precision: 0,
        availability: 'proxy',
        desiredDirection: 'decrease',
        provenance: baseProvenance('proxy_estimate', []),
        uncertainty: {
          status: 'qualitative',
          interpretation:
            'مرز حسابرسی: تنها مصرف عملیاتی برق و گاز. انتشار تجسم‌یافته و حمل‌ونقل خارج از دامنه است.',
          exclusions: ['انتشار تجسم‌یافته مصالح', 'انتشار حمل‌ونقل', 'اثر جزیره حرارتی'],
        },
      }),
      unavailable(ctx, 'M10', 'M10.embodied_emissions', 'انتشار تجسم‌یافته', 'kgCO2e', 'NOT_SUPPORTED'),
      unavailable(ctx, 'M10', 'M10.heat_island', 'اثر جزیره حرارتی', '°C', 'MODEL_UNAVAILABLE'),
    );
  }

  const unavailableModules: ModuleId[] = [];
  (['M07', 'M09'] as ModuleId[]).forEach((m) => {
    if (wanted.has(m)) unavailableModules.push(m);
  });

  return {
    results,
    ruleChecks: evaluateRuleChecks(d, params.overrides),
    derived: d,
    unavailableModules,
    inputManifestHash: contentHash({
      overrides: params.overrides,
      assumptions: params.assumptions,
      modules: params.modules,
      methodVersion: METHOD_VERSION,
    }),
  };
}

/** Metric codes that M11 aligns between baseline and proposed scenario. */
export const COMPARABLE_METRICS: {
  code: string;
  title: string;
  unit: string;
  precision: number;
  direction: 'increase' | 'decrease' | 'neutral';
}[] = [
  { code: 'M02.gfa', title: 'زیربنای ناخالص', unit: 'm²', precision: 0, direction: 'neutral' },
  { code: 'M03.dwellings', title: 'ظرفیت واحد مسکونی', unit: 'واحد', precision: 0, direction: 'increase' },
  { code: 'M03.potential_residents', title: 'جمعیت بالقوه', unit: 'نفر', precision: 0, direction: 'neutral' },
  { code: 'M04.vehicle_trip_ends', title: 'سفر خودرو روزانه', unit: 'سرانجام سفر/روز', precision: 1, direction: 'decrease' },
  { code: 'M05.shortfall', title: 'کسری پارکینگ', unit: 'واحد', precision: 0, direction: 'decrease' },
  { code: 'M06.green_gap', title: 'کسری فضای سبز', unit: 'm²', precision: 0, direction: 'decrease' },
  { code: 'M06.education_gap', title: 'کسری آموزشی', unit: 'معادل صندلی', precision: 1, direction: 'decrease' },
  { code: 'M08.water', title: 'تقاضای آب', unit: 'm³/روز', precision: 1, direction: 'decrease' },
  { code: 'M10.total_operational_emissions', title: 'انتشار عملیاتی', unit: 'kgCO2e/سال', precision: 0, direction: 'decrease' },
  { code: 'M07.network_coverage', title: 'پوشش شبکه‌محور خدمات', unit: '٪', precision: 0, direction: 'increase' },
  { code: 'M09.shadow_duration', title: 'مدت سایه‌اندازی', unit: 'ساعت/روز', precision: 1, direction: 'decrease' },
];
