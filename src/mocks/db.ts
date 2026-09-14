/**
 * In-memory mock backend.
 *
 * Holds the demo state and reproduces the parts of the backend contract the UI
 * depends on: lifecycle transitions, immutable submissions, asynchronous run
 * orchestration and the analytical result envelope. It is replaced entirely by
 * the FastAPI backend when `VITE_API_MODE=real`.
 */
import type {
  AnalyticalResult,
  AppNotification,
  AuditEntry,
  Dataset,
  DecisionPackage,
  Evidence,
  ModuleId,
  ReportVersion,
  ReviewBundle,
  Run,
  RunNode,
  RunState,
  Scenario,
  ScenarioOverrides,
  SpecialistModel,
  Study,
  UrbanRule,
} from '@/types/domain';
import { runAnalysis, derive, evaluateRuleChecks } from './engine';
import { demoRegions, demoStudies, demoUsers } from './data/core';
import { demoDatasets, demoEvidence, demoModels, demoRules } from './data/catalog';
import {
  demoAudit,
  demoDecisionPackages,
  demoNotifications,
  demoReports,
  demoReviews,
  demoScenarios,
  fixtureAssumptions,
} from './data/work';
import { demoLayers, demoParcels, demoServicePoints } from './data/gis';
import { contentHash, deterministicId } from '@/utils/id';

export const ALL_MODULES: ModuleId[] = [
  'M01', 'M02', 'M03', 'M04', 'M05', 'M06',
  'M07', 'M08', 'M09', 'M10', 'M11', 'M12',
];

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

interface State {
  users: typeof demoUsers;
  regions: typeof demoRegions;
  studies: Study[];
  datasets: Dataset[];
  rules: UrbanRule[];
  models: SpecialistModel[];
  evidence: Evidence[];
  scenarios: Scenario[];
  runs: Run[];
  results: Record<string, AnalyticalResult[]>;
  reviews: ReviewBundle[];
  reports: ReportVersion[];
  decisions: DecisionPackage[];
  notifications: AppNotification[];
  audit: AuditEntry[];
  /** wall-clock start of a simulated run, keyed by run id */
  runClocks: Record<string, number>;
}

const state: State = {
  users: clone(demoUsers),
  regions: clone(demoRegions),
  studies: clone(demoStudies),
  datasets: clone(demoDatasets),
  rules: clone(demoRules),
  models: clone(demoModels),
  evidence: clone(demoEvidence),
  scenarios: clone(demoScenarios),
  runs: [],
  results: {},
  reviews: clone(demoReviews),
  reports: clone(demoReports),
  decisions: clone(demoDecisionPackages),
  notifications: clone(demoNotifications),
  audit: clone(demoAudit),
  runClocks: {},
};

export const gis = {
  layers: clone(demoLayers),
  parcels: demoParcels,
  servicePoints: demoServicePoints,
};

/* ---------------------------------------------------------- run helpers -- */

function nodesFor(modules: ModuleId[], unavailable: ModuleId[]): RunNode[] {
  return modules.map((m) => {
    if (unavailable.includes(m)) {
      return {
        moduleId: m,
        state: 'blocked',
        reason: m === 'M07' ? 'MISSING_REQUIRED_INPUT' : 'MISSING_REQUIRED_INPUT',
        message:
          m === 'M07'
            ? 'شبکه معابر مسیریابی‌پذیر تأییدشده در دسترس نیست.'
            : 'ارتفاع معتبر ابنیه و مدل ارتفاعی زمین در دسترس نیست.',
      } satisfies RunNode;
    }
    return { moduleId: m, state: 'succeeded' } satisfies RunNode;
  });
}

function scenarioVersion(scenarioId: string, versionId?: string) {
  const scenario = state.scenarios.find((s) => s.id === scenarioId);
  if (!scenario) throw new Error('scenario not found');
  const version =
    scenario.versions.find((v) => v.id === (versionId ?? scenario.currentVersionId)) ??
    scenario.versions[scenario.versions.length - 1];
  return { scenario, version };
}

function executeRun(run: Run) {
  const { scenario, version } = scenarioVersion(run.scenarioId, run.scenarioVersionId);
  const output = runAnalysis({
    runId: run.id,
    scenarioVersionId: version.id,
    scopeLabel: scenario.areaLabel,
    periodLabel: 'دوره مرجع سناریو',
    overrides: version.overrides,
    assumptions: version.assumptions,
    modules: run.requestedModules,
  });
  state.results[run.id] = output.results;
  run.nodes = nodesFor(run.requestedModules, output.unavailableModules);
  run.inputManifestHash = output.inputManifestHash;
  run.state = output.unavailableModules.length > 0 ? 'partial' : 'succeeded';
  run.stage = 'completed';
  run.progressPct = 100;
  run.finishedAt = new Date().toISOString();
}

/** Seed the runs that the demo journey starts from. */
function seedRuns() {
  const seeds: { id: string; code: string; scenarioId: string; versionId: string; at: string }[] = [
    { id: 'run-2000', code: 'RUN-1405-2000', scenarioId: 'scn-s0', versionId: 'scv-s0-1', at: '2026-06-02T08:35:00Z' },
    { id: 'run-2001', code: 'RUN-1405-2001', scenarioId: 'scn-s1', versionId: 'scv-s1-2', at: '2026-09-02T09:12:00Z' },
    { id: 'run-2002', code: 'RUN-1405-2002', scenarioId: 'scn-s2', versionId: 'scv-s2-1', at: '2026-07-14T11:45:00Z' },
  ];
  seeds.forEach((seed) => {
    const run: Run = {
      id: seed.id,
      code: seed.code,
      scenarioId: seed.scenarioId,
      scenarioName: state.scenarios.find((s) => s.id === seed.scenarioId)?.name ?? '',
      scenarioVersionId: seed.versionId,
      requestedModules: ALL_MODULES,
      state: 'queued',
      stage: 'queued',
      progressPct: 0,
      startedAt: seed.at,
      nodes: [],
      inputManifestHash: '',
    };
    executeRun(run);
    run.finishedAt = seed.at;
    state.runs.push(run);
  });

  // one failed run, so the failure UX is reachable in the demo
  const failed: Run = {
    id: 'run-1998',
    code: 'RUN-1405-1998',
    scenarioId: 'scn-s2',
    scenarioName: 'بدیل فرضی با عبور از محدودیت‌ها (S2)',
    scenarioVersionId: 'scv-s2-1',
    requestedModules: ALL_MODULES,
    state: 'failed',
    stage: 'executing',
    progressPct: 34,
    startedAt: '2026-07-13T18:02:00Z',
    finishedAt: '2026-07-13T18:04:00Z',
    nodes: ALL_MODULES.map((m) => ({
      moduleId: m,
      state: m === 'M01' || m === 'M02' ? 'succeeded' : 'blocked',
      reason: m === 'M01' || m === 'M02' ? undefined : 'DEPENDENCY_FAILED',
    })),
    inputManifestHash: 'sha256:0000deadbeef',
    failureReason:
      'اتصال به سرویس اجرای ماژول‌ها در میانه اجرا قطع شد و اجرا در مهلت تعیین‌شده تکمیل نشد.',
    suggestedAction:
      'وضعیت داده‌های ورودی را بررسی کنید و سپس اجرای جدیدی ثبت کنید. اجرای قبلی بازگشایی نمی‌شود.',
  };
  state.runs.push(failed);
}
seedRuns();

/** Advance simulated runs; called on every read so polling shows progress. */
export function tickRuns() {
  const now = Date.now();
  state.runs.forEach((run) => {
    const startedAt = state.runClocks[run.id];
    if (!startedAt) return;
    if (run.state === 'succeeded' || run.state === 'partial' || run.state === 'failed' || run.state === 'cancelled') return;
    const elapsed = now - startedAt;
    if (run.state === 'cancelling') {
      if (elapsed > 1200) {
        run.state = 'cancelled';
        run.stage = 'completed';
        run.finishedAt = new Date().toISOString();
      }
      return;
    }
    if (elapsed < 1400) {
      run.state = 'queued';
      run.stage = 'queued';
      run.progressPct = 5;
    } else if (elapsed < 3000) {
      run.state = 'running';
      run.stage = 'preparing';
      run.progressPct = 22;
    } else if (elapsed < 6200) {
      run.state = 'running';
      run.stage = 'executing';
      run.progressPct = 38 + Math.min(40, Math.round((elapsed - 3000) / 80));
    } else if (elapsed < 7600) {
      run.state = 'running';
      run.stage = 'validating';
      run.progressPct = 88;
    } else {
      executeRun(run);
      delete state.runClocks[run.id];
      const finalState = run.state as RunState;
      pushNotification({
        kind: 'run_completed',
        title: finalState === 'partial' ? 'تحلیل تکمیل شد (تکمیل جزئی)' : 'تحلیل تکمیل شد',
        body: `اجرای «${run.scenarioName}» به پایان رسید.`,
        severity: finalState === 'partial' ? 'warning' : 'success',
        link: `/scenarios/${run.scenarioId}`,
      });
    }
  });
}

function pushNotification(input: Omit<AppNotification, 'id' | 'at' | 'read'>) {
  state.notifications.unshift({
    ...input,
    id: deterministicId('ntf', `${input.title}-${state.notifications.length}`),
    at: new Date().toISOString(),
    read: false,
  });
}

function pushAudit(entry: Omit<AuditEntry, 'id' | 'at'>) {
  state.audit.unshift({
    ...entry,
    id: deterministicId('aud', `${entry.action}-${state.audit.length}`),
    at: new Date().toISOString(),
  });
}

/* ------------------------------------------------------------- accessors -- */

export const db = {
  state,

  users: () => state.users,
  regions: () => state.regions,

  /* --- studies --- */
  studies: () => state.studies,
  study: (id: string) => state.studies.find((s) => s.id === id),
  createStudy: (input: {
    title: string;
    code: string;
    studyType: Study['studyType'];
    regionId: string;
    ownerName: string;
    referenceDate: string;
    planningHorizon: string;
    classification: Study['classification'];
  }): Study => {
    const region = state.regions.find((r) => r.id === input.regionId);
    const study: Study = {
      id: deterministicId('std', `${input.code}-${state.studies.length}`),
      code: input.code,
      title: input.title,
      studyType: input.studyType,
      status: 'draft',
      ownerName: input.ownerName,
      regionId: input.regionId,
      regionTitle: region?.title ?? '—',
      templateVersionLabel: `tpl-${input.studyType}-v1`,
      boundaryVersionLabel: region?.boundaryVersionLabel ?? 'boundary-v1',
      referenceDate: input.referenceDate,
      planningHorizon: input.planningHorizon,
      classification: input.classification,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      revision: 1,
      progress: {
        tasksCompleted: 0,
        tasksTotal: 12,
        dataReadinessPct: 0,
        analysisReadinessPct: 0,
        acceptedDeliverables: 0,
      },
      chapters: [
        { key: 'ch-0', index: 0, title: 'فصل ۰ — مبانی و داده‌ها', status: 'needs_data', ownerName: input.ownerName, requiredInputs: 8, boundInputs: 0 },
        { key: 'ch-1', index: 1, title: 'وضع موجود', status: 'not_started', ownerName: input.ownerName, requiredInputs: 5, boundInputs: 0 },
        { key: 'ch-2', index: 2, title: 'بدیل‌ها', status: 'not_started', ownerName: input.ownerName, requiredInputs: 4, boundInputs: 0 },
        { key: 'ch-3', index: 3, title: 'ارزیابی و پایش', status: 'not_started', ownerName: input.ownerName, requiredInputs: 3, boundInputs: 0 },
      ],
      participants: [{ name: input.ownerName, role: 'MUNICIPAL_EXPERT' }],
      blockers: ['فصل ۰ کامل نشده است؛ پیش از فعال‌سازی، بستن اقلام داده الزامی است.'],
    };
    state.studies.unshift(study);
    pushAudit({
      actor: input.ownerName,
      role: 'MUNICIPAL_EXPERT',
      action: 'ایجاد مطالعه',
      subjectType: 'مطالعه',
      subjectTitle: study.title,
      outcome: 'success',
    });
    return study;
  },
  transitionStudy: (id: string, to: Study['status'], actor: string, reason?: string) => {
    const study = state.studies.find((s) => s.id === id);
    if (!study) throw new Error('study not found');
    const from = study.status;
    study.status = to;
    study.revision += 1;
    study.updatedAt = new Date().toISOString();
    pushAudit({
      actor,
      role: 'MUNICIPAL_EXPERT',
      action: `تغییر وضعیت مطالعه (${from} ← ${to})`,
      subjectType: 'مطالعه',
      subjectTitle: study.title,
      fromVersion: `rev ${study.revision - 1}`,
      toVersion: `rev ${study.revision}`,
      reason,
      outcome: 'success',
    });
    if (to === 'in_review') {
      const bundle: ReviewBundle = {
        id: deterministicId('rev', `${study.id}-${state.reviews.length}`),
        code: `RV-1405-${1000 + state.reviews.length}`,
        subjectType: 'study',
        subjectId: study.id,
        subjectTitle: study.title,
        bundleHash: contentHash({ study: study.id, revision: study.revision }),
        submittedBy: actor,
        submittedAt: new Date().toISOString(),
        stepKey: 'technical_review',
        assignedTo: 'فرزانه صادقی',
        assignedRole: 'REVIEWER',
        state: 'pending',
        dimension: 'arithmetic_data_quality',
        immutable: true,
        staleAgainstCurrent: false,
        comments: [],
      };
      state.reviews.unshift(bundle);
      pushNotification({
        kind: 'approval_pending',
        title: 'موردی برای بررسی ارسال شد',
        body: `«${study.title}» برای بررسی ارسال شد و نسخه ارسالی قفل شده است.`,
        severity: 'info',
        link: '/reviews',
      });
    }
    return study;
  },

  /* --- datasets --- */
  datasets: () => state.datasets,
  dataset: (id: string) => state.datasets.find((d) => d.id === id),
  publishDatasetVersion: (datasetId: string, versionId: string, actor: string) => {
    const dataset = state.datasets.find((d) => d.id === datasetId);
    const version = dataset?.versions.find((v) => v.id === versionId);
    if (!dataset || !version) throw new Error('dataset version not found');
    dataset.versions.forEach((v) => {
      if (v.status === 'published') v.status = 'superseded';
    });
    version.status = 'published';
    version.publishedAt = new Date().toISOString();
    dataset.currentVersionId = version.id;
    pushAudit({
      actor,
      role: 'SECRETARIAT',
      action: 'انتشار نسخه داده',
      subjectType: 'نسخه داده',
      subjectTitle: `${dataset.title} — ${version.versionLabel}`,
      toVersion: version.versionLabel,
      outcome: 'success',
    });
    return dataset;
  },

  /* --- rules / models / evidence --- */
  rules: () => state.rules,
  rule: (id: string) => state.rules.find((r) => r.id === id),
  models: () => state.models,
  model: (id: string) => state.models.find((m) => m.id === id),
  evidence: () => state.evidence,

  /* --- scenarios --- */
  scenarios: () => state.scenarios,
  scenario: (id: string) => state.scenarios.find((s) => s.id === id),
  createScenario: (input: {
    name: string;
    studyId: string;
    purpose: string;
    ownerName: string;
    baselineScenarioId: string;
    overrides: ScenarioOverrides;
  }): Scenario => {
    const study = state.studies.find((s) => s.id === input.studyId);
    const baseline = state.scenarios.find((s) => s.id === input.baselineScenarioId);
    const id = deterministicId('scn', `${input.name}-${state.scenarios.length}`);
    const versionId = `${id}-v1`;
    const overCaps =
      input.overrides.floors > 5 ||
      input.overrides.footprintM2 / fixtureAssumptions.parcelAreaM2 > 0.6 ||
      (input.overrides.footprintM2 * input.overrides.floors) / fixtureAssumptions.parcelAreaM2 > 3;
    const scenario: Scenario = {
      id,
      code: `SC-${String(state.scenarios.length + 1).padStart(2, '0')}`,
      name: input.name,
      studyId: input.studyId,
      studyTitle: study?.title ?? '—',
      regionId: study?.regionId ?? 'r06',
      purpose: input.purpose,
      ownerName: input.ownerName,
      isBaseline: false,
      baselineScenarioId: input.baselineScenarioId,
      areaLabel: baseline?.areaLabel ?? 'قطعه نمونه P-1042 — محور شمالی',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentVersionId: versionId,
      rulePackVersionLabel: 'rulepack-synthetic-v3',
      datasetPins: baseline?.datasetPins ?? [],
      versions: [
        {
          id: versionId,
          versionLabel: 'v1',
          state: 'draft',
          interpretation: overCaps ? 'hypothetical_override' : 'proposed_unverified',
          overrides: input.overrides,
          assumptions: fixtureAssumptions,
          createdAt: new Date().toISOString(),
          inputManifestHash: contentHash(input.overrides),
        },
      ],
    };
    state.scenarios.unshift(scenario);
    pushAudit({
      actor: input.ownerName,
      role: 'MUNICIPAL_EXPERT',
      action: 'ایجاد سناریو',
      subjectType: 'سناریو',
      subjectTitle: scenario.name,
      outcome: 'success',
    });
    return scenario;
  },
  freezeScenarioVersion: (scenarioId: string, actor: string) => {
    const { scenario, version } = scenarioVersion(scenarioId);
    version.state = 'frozen';
    version.frozenAt = new Date().toISOString();
    scenario.updatedAt = version.frozenAt;
    pushAudit({
      actor,
      role: 'MUNICIPAL_EXPERT',
      action: 'قفل‌کردن نسخه سناریو',
      subjectType: 'سناریو',
      subjectTitle: scenario.name,
      toVersion: `${version.versionLabel} (قفل‌شده)`,
      outcome: 'success',
    });
    return scenario;
  },

  /* --- runs --- */
  runs: () => {
    tickRuns();
    return state.runs;
  },
  run: (id: string) => {
    tickRuns();
    return state.runs.find((r) => r.id === id);
  },
  runsForScenario: (scenarioId: string) => {
    tickRuns();
    return state.runs.filter((r) => r.scenarioId === scenarioId);
  },
  /**
   * Most recent run for a scenario, whatever its state — an in-progress run
   * has to be visible, otherwise the monitor never appears and the client has
   * nothing to poll against.
   */
  latestRunForScenario: (scenarioId: string) => {
    tickRuns();
    const list = state.runs
      .filter((r) => r.scenarioId === scenarioId)
      .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
    return list[0];
  },
  createRun: (input: { scenarioId: string; modules: ModuleId[]; actor: string }): Run => {
    const { scenario, version } = scenarioVersion(input.scenarioId);
    if (version.state === 'draft') {
      version.state = 'frozen';
      version.frozenAt = new Date().toISOString();
    }
    const id = deterministicId('run', `${input.scenarioId}-${state.runs.length}`);
    const run: Run = {
      id,
      code: `RUN-1405-${2100 + state.runs.length}`,
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      scenarioVersionId: version.id,
      requestedModules: input.modules,
      state: 'queued',
      stage: 'queued',
      progressPct: 3,
      startedAt: new Date().toISOString(),
      nodes: input.modules.map((m) => ({ moduleId: m, state: 'pending' })),
      inputManifestHash: version.inputManifestHash,
    };
    state.runs.unshift(run);
    state.runClocks[id] = Date.now();
    pushAudit({
      actor: input.actor,
      role: 'MUNICIPAL_EXPERT',
      action: 'ثبت اجرای تحلیل',
      subjectType: 'اجرا',
      subjectTitle: run.code,
      reason: `اجرای ${input.modules.length} ماژول درخواست‌شده`,
      outcome: 'success',
    });
    return run;
  },
  cancelRun: (id: string) => {
    const run = state.runs.find((r) => r.id === id);
    if (!run) throw new Error('run not found');
    if (['succeeded', 'partial', 'failed', 'cancelled', 'timed_out'].includes(run.state)) {
      throw new Error('STATE_CONFLICT');
    }
    run.state = 'cancelling';
    return run;
  },
  results: (runId: string) => {
    tickRuns();
    return state.results[runId] ?? [];
  },
  /** Rule evaluation for the current version of a scenario (M01 detail view). */
  ruleChecks: (scenarioId: string) => {
    const { version } = scenarioVersion(scenarioId);
    return evaluateRuleChecks(derive(version.overrides, version.assumptions), version.overrides);
  },
  derived: (scenarioId: string) => {
    const { version } = scenarioVersion(scenarioId);
    return derive(version.overrides, version.assumptions);
  },

  /* --- governance --- */
  reviews: () => state.reviews,
  review: (id: string) => state.reviews.find((r) => r.id === id),
  decideReview: (id: string, decision: 'approve' | 'reject' | 'request_changes', reason: string, actor: string) => {
    const review = state.reviews.find((r) => r.id === id);
    if (!review) throw new Error('review not found');
    review.state =
      decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : 'changes_requested';
    review.decidedAt = new Date().toISOString();
    review.decisionReason = reason;
    pushAudit({
      actor,
      role: 'REVIEWER',
      action: `ثبت تصمیم بررسی (${review.state})`,
      subjectType: 'بسته بررسی',
      subjectTitle: review.subjectTitle,
      reason,
      outcome: 'success',
    });
    if (review.subjectType === 'study') {
      const study = state.studies.find((s) => s.id === review.subjectId);
      if (study) {
        if (decision === 'approve') study.status = 'approved';
        if (decision === 'request_changes' || decision === 'reject') study.status = 'changes_requested';
        study.updatedAt = new Date().toISOString();
      }
    }
    pushNotification({
      kind: decision === 'request_changes' ? 'changes_requested' : 'approval_pending',
      title:
        decision === 'approve'
          ? 'تصمیم تأیید ثبت شد'
          : decision === 'reject'
            ? 'مورد رد شد'
            : 'درخواست اصلاح ثبت شد',
      body: `«${review.subjectTitle}» — ${reason}`,
      severity: decision === 'approve' ? 'success' : 'warning',
      link: '/reviews',
    });
    return review;
  },
  addReviewComment: (id: string, text: string, anchor: string, author: string) => {
    const review = state.reviews.find((r) => r.id === id);
    if (!review) throw new Error('review not found');
    review.comments.push({
      id: deterministicId('cmt', `${id}-${review.comments.length}`),
      author,
      role: 'REVIEWER',
      at: new Date().toISOString(),
      anchor,
      text,
      resolved: false,
    });
    return review;
  },

  reports: () => state.reports,
  report: (id: string) => state.reports.find((r) => r.id === id),
  createReport: (input: { title: string; studyId: string; scenarioIds: string[]; missing: ModuleId[] }) => {
    const report: ReportVersion = {
      id: deterministicId('rpt', `${input.title}-${state.reports.length}`),
      code: `RP-1405-${100 + state.reports.length}`,
      title: input.title,
      studyId: input.studyId,
      scenarioIds: input.scenarioIds,
      state: 'draft',
      versionLabel: 'v1',
      generatedAt: new Date().toISOString(),
      sections: [
        { key: 'summary', title: 'خلاصه تصمیم', included: true, complete: true },
        { key: 'baseline', title: 'وضع موجود', included: true, complete: true },
        { key: 'scenario', title: 'تعریف سناریو', included: true, complete: true },
        { key: 'results', title: 'نتایج تحلیلی', included: true, complete: input.missing.length === 0 },
        { key: 'limitations', title: 'محدودیت‌ها و داده‌های ناموجود', included: true, complete: true },
      ],
      incompleteEvidence: input.missing.length > 0,
      missingAnalyses: input.missing,
      language: 'fa',
      classification: 'restricted_municipal',
    };
    state.reports.unshift(report);
    return report;
  },

  decisions: () => state.decisions,
  decision: (id: string) => state.decisions.find((d) => d.id === id),
  createDecisionPackage: (input: {
    title: string;
    studyId: string;
    baselineScenarioId: string;
    proposedScenarioId: string;
    runId: string;
    summary: string;
    keyChanges: string[];
    limitations: string[];
    missing: ModuleId[];
  }) => {
    const study = state.studies.find((s) => s.id === input.studyId);
    const pkg: DecisionPackage = {
      id: deterministicId('dp', `${input.title}-${state.decisions.length}`),
      code: `DP-1405-${100 + state.decisions.length}`,
      title: input.title,
      studyId: input.studyId,
      studyTitle: study?.title ?? '—',
      baselineScenarioId: input.baselineScenarioId,
      proposedScenarioId: input.proposedScenarioId,
      runId: input.runId,
      createdAt: new Date().toISOString(),
      state: 'draft',
      versionLabel: 'v1',
      summary: input.summary,
      keyChanges: input.keyChanges,
      limitations: input.limitations,
      missingAnalyses: input.missing,
      reviewBundleIds: [],
      approvals: [],
    };
    state.decisions.unshift(pkg);
    pushNotification({
      kind: 'report_ready',
      title: 'بسته تصمیم ایجاد شد',
      body: `«${pkg.title}» به‌عنوان پیش‌نویس ثبت شد.`,
      severity: 'success',
      link: `/decision-packages/${pkg.id}`,
    });
    return pkg;
  },
  submitDecisionPackage: (id: string, actor: string) => {
    const pkg = state.decisions.find((d) => d.id === id);
    if (!pkg) throw new Error('decision package not found');
    pkg.state = 'in_review';
    const bundle: ReviewBundle = {
      id: deterministicId('rev', `${pkg.id}-${state.reviews.length}`),
      code: `RV-1405-${2000 + state.reviews.length}`,
      subjectType: 'report',
      subjectId: pkg.id,
      subjectTitle: pkg.title,
      bundleHash: contentHash({ pkg: pkg.id, at: pkg.createdAt }),
      submittedBy: actor,
      submittedAt: new Date().toISOString(),
      stepKey: 'decision_endorsement',
      assignedTo: 'حسین امیری',
      assignedRole: 'APPROVING_AUTHORITY',
      state: 'pending',
      dimension: 'decision_endorsement',
      immutable: true,
      staleAgainstCurrent: false,
      comments: [],
    };
    state.reviews.unshift(bundle);
    pkg.reviewBundleIds.push(bundle.id);
    return pkg;
  },

  /* --- notifications & audit --- */
  notifications: () => state.notifications,
  markNotificationRead: (id: string) => {
    const n = state.notifications.find((x) => x.id === id);
    if (n) n.read = true;
    return state.notifications;
  },
  markAllNotificationsRead: () => {
    state.notifications.forEach((n) => {
      n.read = true;
    });
    return state.notifications;
  },
  audit: () => state.audit,
};
