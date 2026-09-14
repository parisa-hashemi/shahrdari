import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Layers as LayersIcon, MapPin } from 'lucide-react';
import type { MapLayer, ParcelFeature } from '@/types/domain';
import { gisApi } from '@/api/gis';
import { evidenceApi } from '@/api/catalog';
import { MapCanvas } from '@/components/maps/MapCanvas';
import {
  Badge,
  Card,
  CardHeader,
  DefinitionList,
  Ltr,
  PageHeader,
  StatusBadge,
} from '@/components/ui/display';
import { Drawer } from '@/components/ui/overlays';
import { Button } from '@/components/ui/Button';
import { Callout, LoadingState, ErrorState } from '@/components/ui/feedback';
import { SearchInput } from '@/components/ui/inputs';
import { DemoBadge } from '@/components/workflow';
import { qualityLabels } from '@/utils/dictionary';
import { formatNumber } from '@/utils/format';
import { cn } from '@/utils/cn';

export function LayerPanel({
  layers,
  onToggle,
  onOpacity,
}: {
  layers: MapLayer[];
  onToggle: (id: string) => void;
  onOpacity: (id: string, value: number) => void;
}) {
  return (
    <Card>
      <CardHeader
        title="لایه‌ها"
        subtitle="هر لایه به نسخه مشخصی از یک قلم داده متصل است"
        icon={<LayersIcon size={15} />}
      />
      <ul className="space-y-3">
        {layers.map((layer) => {
          const unavailable = layer.loadState !== 'ready';
          return (
            <li key={layer.id} className={cn('rounded-lg border border-border p-2.5', unavailable && 'bg-surface-2')}>
              <div className="flex items-start justify-between gap-2">
                <label className="flex min-w-0 items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-1 h-3.5 w-3.5 accent-[color:var(--c-primary-600)]"
                    checked={layer.visible && !unavailable}
                    disabled={unavailable}
                    onChange={() => onToggle(layer.id)}
                  />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium">{layer.title}</span>
                    <span className="block text-2xs text-muted">
                      {layer.datasetLabel} — نسخه <Ltr>{layer.versionLabel}</Ltr>
                    </span>
                  </span>
                </label>
                {unavailable && <StatusBadge label="در دسترس نیست" tone="muted" kind="blocked" />}
              </div>

              {unavailable ? (
                <p className="mt-1.5 text-2xs leading-5 text-muted">
                  نسخه منتشرشده‌ای برای این لایه وجود ندارد؛ لایه خالی نمایش داده نمی‌شود تا با «نبود
                  پدیده» اشتباه گرفته نشود.
                </p>
              ) : (
                <>
                  <label className="mt-2 flex items-center gap-2 text-2xs text-muted">
                    شفافیت
                    <input
                      type="range"
                      min={20}
                      max={100}
                      value={Math.round(layer.opacity * 100)}
                      onChange={(event) => onOpacity(layer.id, Number(event.target.value) / 100)}
                      className="h-1 flex-1 accent-[color:var(--c-primary-600)]"
                      aria-label={`شفافیت لایه ${layer.title}`}
                    />
                    <span className="num">{formatNumber(Math.round(layer.opacity * 100))}٪</span>
                  </label>
                  {layer.legend.length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                      {layer.legend.map((entry) => (
                        <li key={entry.label} className="flex items-center gap-1.5 text-2xs text-muted">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-sm border border-border"
                            style={{ background: entry.color }}
                            aria-hidden
                          />
                          {entry.label}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export function FeatureDrawer({
  feature,
  onClose,
}: {
  feature: ParcelFeature | null;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { data: evidence = [] } = useQuery({ queryKey: ['evidence'], queryFn: evidenceApi.list });
  if (!feature) return null;
  const linked = evidence.filter((item) => feature.evidenceIds.includes(item.id));
  const a = feature.attributes;

  return (
    <Drawer
      open={Boolean(feature)}
      onClose={onClose}
      title={`قطعه ${feature.externalId}`}
      subtitle={`${a.useCode} — پهنه ${a.zoneCode}`}
      footer={
        <Button variant="primary" block onClick={() => navigate('/scenarios/new')}>
          ساخت سناریو بر پایه این قطعه
        </Button>
      }
    >
      <div className="space-y-4">
        <DefinitionList
          columns={2}
          items={[
            { label: 'مساحت قطعه', value: <span className="num">{formatNumber(a.parcelAreaM2)} m²</span> },
            { label: 'سطح اشغال', value: <span className="num">{formatNumber(a.footprintM2)} m²</span> },
            { label: 'تعداد طبقات', value: <span className="num">{formatNumber(a.floors)}</span> },
            { label: 'زیربنای ناخالص', value: <span className="num">{formatNumber(a.gfaM2)} m²</span> },
            {
              label: 'ارتفاع',
              value:
                a.heightM === null ? (
                  <span className="text-muted">ثبت نشده است</span>
                ) : (
                  <span className="num">{formatNumber(a.heightM, { precision: 1 })} متر</span>
                ),
            },
            {
              label: 'پارکینگ مستند',
              value:
                a.parkingSpaces === null ? (
                  <span className="text-muted">ثبت نشده است</span>
                ) : (
                  <span className="num">{formatNumber(a.parkingSpaces)} واحد</span>
                ),
            },
            {
              label: 'واحد مسکونی',
              value:
                a.dwellings === null ? (
                  <span className="text-muted">ثبت نشده است</span>
                ) : (
                  <span className="num">{formatNumber(a.dwellings)}</span>
                ),
            },
            { label: 'کیفیت داده', value: qualityLabels[feature.qualityStatus] ?? feature.qualityStatus },
          ]}
        />

        <Callout tone="neutral" title="منشأ داده این قطعه">
          {feature.datasetLabel} — نسخه <Ltr>{feature.versionLabel}</Ltr>
          <br />
          مرجع: {feature.sourceLabel}
          <br />
          پوشش زمانی: {feature.temporalCoverage}
        </Callout>

        <div>
          <p className="mb-1.5 text-xs font-medium text-muted">شواهد پیوست</p>
          {linked.length === 0 ? (
            <p className="text-[13px] text-muted">سند پشتیبانی برای این قطعه ثبت نشده است.</p>
          ) : (
            <ul className="space-y-1.5">
              {linked.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2 text-[13px]">
                  <Link to="/evidence" className="truncate hover:text-primary-700">
                    {item.title}
                  </Link>
                  <Badge tone={item.accessible ? 'muted' : 'warning'}>
                    {item.accessible ? item.versionLabel : 'دسترسی محدود'}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-2xs leading-6 text-muted">
          مقادیر «ثبت نشده» به‌معنای صفر نیستند. در تحلیل، این اقلام با دلیل «ورودی الزامی موجود نیست»
          گزارش می‌شوند.
        </p>
      </div>
    </Drawer>
  );
}

export default function GisWorkspacePage() {
  const [selected, setSelected] = useState<ParcelFeature | null>(null);
  const [search, setSearch] = useState('');
  const [layerState, setLayerState] = useState<MapLayer[]>([]);

  const layersQuery = useQuery({ queryKey: ['map-layers'], queryFn: gisApi.layers });
  const featuresQuery = useQuery({ queryKey: ['features'], queryFn: () => gisApi.features() });
  const pointsQuery = useQuery({ queryKey: ['service-points'], queryFn: gisApi.servicePoints });

  useEffect(() => {
    if (layersQuery.data) setLayerState(layersQuery.data.map((l) => ({ ...l })));
  }, [layersQuery.data]);

  const parcels = featuresQuery.data ?? [];
  const matches = useMemo(() => {
    if (!search.trim()) return [];
    return parcels.filter((p) => p.externalId.includes(search.trim())).slice(0, 6);
  }, [parcels, search]);

  if (layersQuery.isLoading || featuresQuery.isLoading) return <LoadingState rows={4} />;
  if (layersQuery.isError) return <ErrorState onRetry={() => layersQuery.refetch()} />;

  return (
    <div>
      <PageHeader
        eyebrow="داده و مکان"
        title="نقشه شهری"
        description="نمایش وضع موجود بر پایه نسخه‌های منتشرشده داده. با انتخاب هر قطعه، ویژگی‌ها همراه با منبع، نسخه و کیفیت نمایش داده می‌شود."
        breadcrumb={[{ label: 'خانه', to: '/dashboard' }, { label: 'GIS و نقشه' }]}
        meta={<DemoBadge />}
        actions={
          <Link
            to="/gis/compare"
            className="inline-flex h-9 items-center rounded-md border border-border-strong px-3.5 text-sm hover:bg-surface-2"
          >
            مقایسه وضع موجود و پیشنهادی
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <div className="space-y-4">
          <Card>
            <SearchInput
              value={search}
              onChange={setSearch}
              label="جست‌وجوی قطعه"
              placeholder="شناسه قطعه، مثلاً P-1042"
            />
            {matches.length > 0 && (
              <ul className="mt-2 space-y-1">
                {matches.map((parcel) => (
                  <li key={parcel.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(parcel)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-start text-[13px] hover:bg-surface-2"
                    >
                      <MapPin size={13} className="text-muted" />
                      <Ltr>{parcel.externalId}</Ltr>
                      <span className="text-2xs text-muted">{parcel.attributes.useCode}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <LayerPanel
            layers={layerState}
            onToggle={(id) =>
              setLayerState((prev) => prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)))
            }
            onOpacity={(id, value) =>
              setLayerState((prev) => prev.map((l) => (l.id === id ? { ...l, opacity: value } : l)))
            }
          />
        </div>

        <div className="space-y-3">
          <MapCanvas
            parcels={parcels}
            layers={layerState}
            servicePoints={pointsQuery.data ?? []}
            selectedId={selected?.id}
            onSelect={setSelected}
            height={560}
          />
          <p className="text-2xs leading-6 text-muted">
            نمایش نقشه در این نسخه بر پایه هندسه نمونه محلی است و مختصات آن واقعی نیست. با اتصال به
            سرویس کاشی شهرداری، همین رابط بدون تغییر صفحات جایگزین می‌شود.
          </p>
        </div>
      </div>

      <FeatureDrawer feature={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
