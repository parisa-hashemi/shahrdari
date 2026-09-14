import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { MapLayer } from '@/types/domain';
import { gisApi } from '@/api/gis';
import { scenariosApi } from '@/api/scenarios';
import { MapCanvas } from '@/components/maps/MapCanvas';
import { Card, CardHeader, DefinitionList, Ltr, PageHeader, Badge } from '@/components/ui/display';
import { Select } from '@/components/ui/inputs';
import { Callout, LoadingState } from '@/components/ui/feedback';
import { DemoBadge } from '@/components/workflow';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { formatNumber } from '@/utils/format';
import { scenarioStateLabels, interpretationLabels } from '@/utils/dictionary';

export default function GisComparePage() {
  const baselineId = useWorkspaceStore((s) => s.baselineScenarioId);
  const [layers, setLayers] = useState<MapLayer[]>([]);
  const [proposedId, setProposedId] = useState('');

  const layersQuery = useQuery({ queryKey: ['map-layers'], queryFn: gisApi.layers });
  const featuresQuery = useQuery({ queryKey: ['features'], queryFn: () => gisApi.features() });
  const scenariosQuery = useQuery({ queryKey: ['scenarios', 'all'], queryFn: () => scenariosApi.list() });

  useEffect(() => {
    if (layersQuery.data) setLayers(layersQuery.data.map((l) => ({ ...l })));
  }, [layersQuery.data]);

  if (layersQuery.isLoading || featuresQuery.isLoading || scenariosQuery.isLoading) {
    return <LoadingState rows={4} />;
  }

  const scenarios = scenariosQuery.data ?? [];
  const baseline = scenarios.find((s) => s.id === baselineId) ?? scenarios[0];
  const proposed =
    scenarios.find((s) => s.id === proposedId) ?? scenarios.find((s) => !s.isBaseline) ?? scenarios[0];
  const parcels = featuresQuery.data ?? [];
  const focusParcel = parcels.find((p) => p.externalId === 'P-1042') ?? parcels[0];

  const baseVersion = baseline?.versions.find((v) => v.id === baseline.currentVersionId);
  const propVersion = proposed?.versions.find((v) => v.id === proposed.currentVersionId);

  return (
    <div>
      <PageHeader
        title="مقایسه وضع موجود و پیشنهادی"
        description="سمت راست وضع مشاهده‌شده و سمت چپ وضع پیشنهادی سناریو است. مقادیر پیشنهادی «مشاهده» نیستند و در همه خروجی‌ها با همین برچسب حمل می‌شوند."
        breadcrumb={[
          { label: 'خانه', to: '/dashboard' },
          { label: 'GIS و نقشه', to: '/gis' },
          { label: 'مقایسه' },
        ]}
        meta={<DemoBadge />}
        actions={
          <Select
            aria-label="سناریوی پیشنهادی"
            value={proposed?.id ?? ''}
            onChange={(event) => setProposedId(event.target.value)}
            options={scenarios
              .filter((s) => !s.isBaseline)
              .map((s) => ({ value: s.id, label: s.name }))}
          />
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[14px] font-semibold">وضع موجود — {baseline?.name}</h2>
            <Badge tone="success">مشاهده‌شده</Badge>
          </div>
          <MapCanvas
            parcels={parcels}
            layers={layers}
            focusIds={focusParcel ? [focusParcel.id] : []}
            variant="existing"
            height={420}
            showControls={false}
          />
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[14px] font-semibold">وضع پیشنهادی — {proposed?.name}</h2>
            <Badge tone="warning">
              {propVersion ? interpretationLabels[propVersion.interpretation] : 'پیشنهادی'}
            </Badge>
          </div>
          <MapCanvas
            parcels={parcels}
            layers={layers}
            focusIds={focusParcel ? [focusParcel.id] : []}
            variant="proposed"
            height={420}
            showControls={false}
          />
        </div>
      </div>

      <Callout tone="warning" className="mt-4" title="تفکیک مشاهده از پیشنهاد">
        هاشور در نقشه سمت چپ، محدوده‌ای را نشان می‌دهد که مقادیر آن از سناریو می‌آید نه از داده ثبت‌شده.
        این تمایز در گزارش‌ها و بسته تصمیم نیز حفظ می‌شود.
      </Callout>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader
            title="پارامترهای وضع موجود"
            subtitle={baseVersion ? `نسخه ${baseVersion.versionLabel} — ${scenarioStateLabels[baseVersion.state]}` : undefined}
          />
          {baseVersion && (
            <DefinitionList
              columns={2}
              items={[
                { label: 'سطح اشغال', value: <span className="num">{formatNumber(baseVersion.overrides.footprintM2)} m²</span> },
                { label: 'طبقات', value: <span className="num">{formatNumber(baseVersion.overrides.floors)}</span> },
                { label: 'پارکینگ', value: <span className="num">{formatNumber(baseVersion.overrides.parkingSupplySpaces)}</span> },
                { label: 'فضای سبز', value: <span className="num">{formatNumber(baseVersion.overrides.greenAreaM2)} m²</span> },
              ]}
            />
          )}
        </Card>
        <Card>
          <CardHeader
            title="پارامترهای سناریو"
            subtitle={propVersion ? `نسخه ${propVersion.versionLabel} — ${scenarioStateLabels[propVersion.state]}` : undefined}
          />
          {propVersion && (
            <DefinitionList
              columns={2}
              items={[
                { label: 'سطح اشغال', value: <span className="num">{formatNumber(propVersion.overrides.footprintM2)} m²</span> },
                { label: 'طبقات', value: <span className="num">{formatNumber(propVersion.overrides.floors)}</span> },
                { label: 'پارکینگ', value: <span className="num">{formatNumber(propVersion.overrides.parkingSupplySpaces)}</span> },
                { label: 'فضای سبز', value: <span className="num">{formatNumber(propVersion.overrides.greenAreaM2)} m²</span> },
              ]}
            />
          )}
          <p className="mt-3 text-2xs text-muted">
            اثر انگشت ورودی: <Ltr>{propVersion?.inputManifestHash ?? '—'}</Ltr>
          </p>
        </Card>
      </div>

      <div className="mt-4">
        <Link to={`/scenarios/${proposed?.id}`} className="text-[13px] text-primary-700 hover:underline">
          مشاهده نتایج تحلیلی این سناریو
        </Link>
      </div>
    </div>
  );
}
