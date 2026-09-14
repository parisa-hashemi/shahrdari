import { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/layouts/AppShell';
import { RequireAuth } from '@/layouts/RequireAuth';
import { LoadingState } from '@/components/ui/feedback';

const load = (factory: Parameters<typeof lazy>[0]) => {
  const Component = lazy(factory as never);
  return (
    <Suspense fallback={<LoadingState rows={3} />}>
      <Component />
    </Suspense>
  );
};

export const router = createBrowserRouter([
  { path: '/login', element: load(() => import('@/features/auth/LoginPage')) },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: load(() => import('@/features/dashboard/DashboardPage')) },
      { path: 'journey', element: load(() => import('@/features/journey/JourneyPage')) },

      { path: 'studies', element: load(() => import('@/features/studies/StudyListPage')) },
      { path: 'studies/new', element: load(() => import('@/features/studies/StudyCreatePage')) },
      { path: 'studies/:studyId', element: load(() => import('@/features/studies/StudyWorkspacePage')) },

      { path: 'regions', element: load(() => import('@/features/regions/RegionsPage')) },

      { path: 'datasets', element: load(() => import('@/features/datasets/DatasetCatalogPage')) },
      { path: 'datasets/ingest', element: load(() => import('@/features/datasets/IngestPage')) },
      { path: 'datasets/connectors', element: load(() => import('@/features/datasets/ConnectorsPage')) },
      { path: 'datasets/quality', element: load(() => import('@/features/datasets/QualityPage')) },
      { path: 'datasets/quarantine', element: load(() => import('@/features/datasets/QuarantinePage')) },
      { path: 'datasets/compare', element: load(() => import('@/features/datasets/VersionComparePage')) },
      { path: 'datasets/:datasetId', element: load(() => import('@/features/datasets/DatasetDetailPage')) },

      { path: 'gis', element: load(() => import('@/features/gis/GisWorkspacePage')) },
      { path: 'gis/compare', element: load(() => import('@/features/gis/GisComparePage')) },

      { path: 'rules', element: load(() => import('@/features/rules/RulesPage')) },
      { path: 'rules/:ruleId', element: load(() => import('@/features/rules/RuleDetailPage')) },

      { path: 'scenarios', element: load(() => import('@/features/scenarios/ScenarioListPage')) },
      { path: 'scenarios/new', element: load(() => import('@/features/scenarios/ScenarioWizardPage')) },
      { path: 'scenarios/compare', element: load(() => import('@/features/scenarios/ScenarioComparePage')) },
      { path: 'scenarios/:scenarioId', element: load(() => import('@/features/scenarios/ScenarioDetailPage')) },

      { path: 'analysis', element: load(() => import('@/features/analyses/AnalysisCenterPage')) },
      { path: 'analysis/:moduleId', element: load(() => import('@/features/analyses/ModulePage')) },

      { path: 'models', element: load(() => import('@/features/models/ModelsPage')) },
      { path: 'models/:modelId', element: load(() => import('@/features/models/ModelDetailPage')) },

      { path: 'evidence', element: load(() => import('@/features/evidence/EvidencePage')) },

      { path: 'reports', element: load(() => import('@/features/reports/ReportsPage')) },

      { path: 'reviews', element: load(() => import('@/features/approvals/ReviewInboxPage')) },
      { path: 'reviews/:reviewId', element: load(() => import('@/features/approvals/ReviewDetailPage')) },
      { path: 'approvals', element: load(() => import('@/features/approvals/ApprovalsPage')) },

      { path: 'decision-packages', element: load(() => import('@/features/reports/DecisionPackagesPage')) },
      { path: 'decision-packages/:packageId', element: load(() => import('@/features/reports/DecisionPackageDetailPage')) },

      { path: 'copilot', element: load(() => import('@/features/copilot/CopilotPage')) },
      { path: 'settings', element: load(() => import('@/features/admin/SettingsPage')) },

      { path: '*', element: load(() => import('@/features/dashboard/NotFoundPage')) },
    ],
  },
]);
