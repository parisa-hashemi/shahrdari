import { useMemo, useRef, useState } from 'react';
import { Minus, Plus, Crosshair } from 'lucide-react';
import type { MapLayer, ParcelFeature } from '@/types/domain';
import type { ServicePoint } from '@/mocks/data/gis';
import { MAP_EXTENT, MAP_BLOCKS, MAP_STREETS } from '@/mocks/data/gis';
import { IconButton } from '@/components/ui/Button';
import { formatNumber } from '@/utils/format';
import { cn } from '@/utils/cn';

/**
 * Mock map renderer.
 *
 * Geometry is drawn from a local metric plane so the demo is deterministic and
 * works with no tile server. Feature screens talk to this component through a
 * narrow prop interface, so a MapLibre GL implementation using municipal tiles
 * can be substituted without touching them (see README, "Backend integration").
 */

const USE_COLORS: Record<string, string> = {
  مسکونی: '#cbd8e3',
  مختلط: '#e2d4c0',
  خدماتی: '#cfe0d5',
  تجاری: '#e6d2d2',
  'فضای سبز': '#c8ddc4',
};

function heightColor(floors: number, height: number | null): string {
  if (height === null) return '#e6e2d8';
  if (floors <= 3) return '#dfe8ef';
  if (floors <= 5) return '#9dbcd2';
  return '#4f8ab0';
}

export interface MapCanvasProps {
  parcels: ParcelFeature[];
  layers: MapLayer[];
  servicePoints?: ServicePoint[];
  selectedId?: string | null;
  onSelect?: (parcel: ParcelFeature | null) => void;
  /** parcels drawn with the scenario emphasis outline */
  focusIds?: string[];
  /** 'existing' paints observed use; 'proposed' paints the scenario overlay */
  variant?: 'existing' | 'proposed';
  height?: number;
  className?: string;
  showControls?: boolean;
}

export function MapCanvas({
  parcels,
  layers,
  servicePoints = [],
  selectedId,
  onSelect,
  focusIds = [],
  variant = 'existing',
  height = 520,
  className,
  showControls = true,
}: MapCanvasProps) {
  const [zoom, setZoom] = useState(1);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const layerVisible = useMemo(
    () => Object.fromEntries(layers.map((l) => [l.id, l.visible && l.loadState === 'ready'])),
    [layers],
  );
  const layerOpacity = useMemo(
    () => Object.fromEntries(layers.map((l) => [l.id, l.opacity])),
    [layers],
  );

  const width = MAP_EXTENT.width / zoom;
  const viewHeight = MAP_EXTENT.height / zoom;
  const offsetX = (MAP_EXTENT.width - width) / 2;
  const offsetY = (MAP_EXTENT.height - viewHeight) / 2;

  const heightLayerOn = layerVisible['lyr-height'];

  return (
    <div className={cn('relative overflow-hidden rounded-xl border border-border bg-[#f7f8f6]', className)}>
      <svg
        ref={svgRef}
        role="img"
        aria-label="نقشه محدوده مطالعه — داده نمایشی"
        viewBox={`${offsetX} ${offsetY} ${width} ${viewHeight}`}
        style={{ height }}
        className="w-full touch-none"
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const rx = (event.clientX - rect.left) / rect.width;
          const ry = (event.clientY - rect.top) / rect.height;
          setCursor({
            x: Math.round(offsetX + rx * width),
            y: Math.round(offsetY + ry * viewHeight),
          });
        }}
        onMouseLeave={() => setCursor(null)}
      >
        <defs>
          <pattern id="hatch" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="6" stroke="#96610b" strokeWidth="2" />
          </pattern>
        </defs>

        {/* ground: the street surface everything else sits on */}
        <rect x={0} y={0} width={MAP_EXTENT.width} height={MAP_EXTENT.height} fill="#eceee9" />

        {/* street network */}
        <g>
          {MAP_STREETS.map((street, index) => (
            <line
              key={index}
              x1={street.x1}
              y1={street.y1}
              x2={street.x2}
              y2={street.y2}
              stroke="#ffffff"
              strokeWidth={street.primary ? 20 : 13}
              strokeLinecap="round"
            />
          ))}
          {MAP_STREETS.filter((s) => s.primary).map((street, index) => (
            <line
              key={`c-${index}`}
              x1={street.x1}
              y1={street.y1}
              x2={street.x2}
              y2={street.y2}
              stroke="#d8ded6"
              strokeWidth={1}
              strokeDasharray="10 8"
            />
          ))}
        </g>

        {/* city blocks */}
        {layerVisible['lyr-blocks'] && (
          <g opacity={layerOpacity['lyr-blocks']}>
            {MAP_BLOCKS.map((block) => (
              <rect
                key={block.id}
                x={block.x - 2}
                y={block.y - 2}
                width={block.w + 4}
                height={block.h + 4}
                rx={3}
                fill="#f4f5f2"
                stroke="#9aa8b4"
                strokeWidth={1}
              />
            ))}
          </g>
        )}

        {/* parcels */}
        {layerVisible['lyr-parcels'] && (
          <g opacity={layerOpacity['lyr-parcels']}>
            {parcels.map((parcel) => {
              const isSelected = parcel.id === selectedId;
              const isFocus = focusIds.includes(parcel.id);
              const points = parcel.polygon.map(([x, y]) => `${x},${y}`).join(' ');
              const fill = heightLayerOn
                ? heightColor(parcel.attributes.floors, parcel.attributes.heightM)
                : USE_COLORS[parcel.attributes.useCode] ?? '#dde3e8';

              // building footprint, drawn to scale inside the plot so coverage
              // is legible without reading a single number
              const xs = parcel.polygon.map(([x]) => x);
              const ys = parcel.polygon.map(([, y]) => y);
              const px = Math.min(...xs);
              const py = Math.min(...ys);
              const pw = Math.max(...xs) - px;
              const ph = Math.max(...ys) - py;
              const ratio = Math.sqrt(
                Math.min(0.92, Math.max(0.15, parcel.attributes.footprintM2 / parcel.attributes.parcelAreaM2)),
              );
              const bw = pw * ratio;
              const bh = ph * ratio;

              return (
                <g key={parcel.id}>
                <polygon
                  points={points}
                  fill={isFocus && variant === 'proposed' ? 'url(#hatch)' : fill}
                  stroke={isSelected ? '#1c4964' : isFocus ? '#96610b' : '#aab6c0'}
                  strokeWidth={isSelected ? 2.4 : isFocus ? 2 : 0.6}
                  tabIndex={onSelect ? 0 : undefined}
                  role={onSelect ? 'button' : undefined}
                  aria-label={`قطعه ${parcel.externalId}`}
                  className={cn(onSelect && 'cursor-pointer outline-none focus-visible:stroke-[#1c4964]')}
                  onClick={() => onSelect?.(parcel)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelect?.(parcel);
                    }
                  }}
                />
                {!(isFocus && variant === 'proposed') && (
                  <rect
                    x={px + (pw - bw) / 2}
                    y={py + (ph - bh) / 2}
                    width={bw}
                    height={bh}
                    fill="#7e8a95"
                    opacity={0.32}
                    pointerEvents="none"
                  />
                )}
                </g>
              );
            })}
          </g>
        )}

        {/* service points */}
        {layerVisible['lyr-services'] &&
          servicePoints.map((point) => (
            <g key={point.id} opacity={layerOpacity['lyr-services']}>
              <circle
                cx={point.x}
                cy={point.y}
                r={7}
                fill={point.kind === 'education' ? '#2f6d94' : '#a32b21'}
                stroke="#fff"
                strokeWidth={2}
              />
            </g>
          ))}
      </svg>

      {showControls && (
        <>
          <div className="absolute top-3 end-3 flex flex-col gap-1.5">
            <IconButton
              label="بزرگ‌نمایی"
              icon={<Plus size={15} />}
              variant="secondary"
              size="sm"
              onClick={() => setZoom((z) => Math.min(4, z * 1.35))}
            />
            <IconButton
              label="کوچک‌نمایی"
              icon={<Minus size={15} />}
              variant="secondary"
              size="sm"
              onClick={() => setZoom((z) => Math.max(1, z / 1.35))}
            />
            <IconButton
              label="بازگشت به نمای کامل"
              icon={<Crosshair size={15} />}
              variant="secondary"
              size="sm"
              onClick={() => setZoom(1)}
            />
          </div>

          {/* scale + coordinates + CRS label */}
          <div className="pointer-events-none absolute bottom-3 start-3 flex items-center gap-3 rounded-md bg-surface/92 px-2.5 py-1.5 text-2xs text-muted shadow-card">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-[3px] w-12 border-x border-b border-border-strong" aria-hidden />
              <span className="num">{formatNumber(Math.round(100 / zoom))} متر</span>
            </span>
            <span className="ltr-token">CRS: EPSG:32639</span>
            {cursor && (
              <span className="num">
                X {formatNumber(cursor.x, { grouping: false })} / Y {formatNumber(cursor.y, { grouping: false })}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
