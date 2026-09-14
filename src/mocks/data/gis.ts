/**
 * Mock GIS content.
 *
 * Geometry lives in a local metric plane (metres) so the demo map is fully
 * deterministic and works without network tiles. The map component is behind
 * a narrow interface (`components/maps/MapCanvas`), so a real MapLibre GL
 * implementation with municipal tiles can replace it without touching the
 * feature screens.
 */
import type { MapLayer, ParcelFeature } from '@/types/domain';

/** Deterministic pseudo-random generator (mulberry32). */
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const MAP_EXTENT = { width: 1200, height: 780 };

/**
 * Block layout. Streets are the gaps between blocks, so the canvas reads as a
 * city fabric rather than scattered rectangles.
 */
const BLOCK_COLS = 6;
const BLOCK_ROWS = 4;
const MARGIN = 46;
const STREET = 34;
const BLOCK_W = Math.round((MAP_EXTENT.width - MARGIN * 2 - STREET * (BLOCK_COLS - 1)) / BLOCK_COLS);
const BLOCK_H = Math.round((MAP_EXTENT.height - MARGIN * 2 - STREET * (BLOCK_ROWS - 1)) / BLOCK_ROWS);

export interface Block {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export const MAP_BLOCKS: Block[] = Array.from({ length: BLOCK_COLS * BLOCK_ROWS }, (_, i) => {
  const col = i % BLOCK_COLS;
  const row = Math.floor(i / BLOCK_COLS);
  return {
    id: `B-${row + 1}${col + 1}`,
    x: MARGIN + col * (BLOCK_W + STREET),
    y: MARGIN + row * (BLOCK_H + STREET),
    w: BLOCK_W,
    h: BLOCK_H,
  };
});

/** Street centre lines, for the road layer. */
export const MAP_STREETS: { x1: number; y1: number; x2: number; y2: number; primary: boolean }[] = [
  ...Array.from({ length: BLOCK_COLS - 1 }, (_, c) => {
    const x = MARGIN + (c + 1) * BLOCK_W + c * STREET + STREET / 2;
    return { x1: x, y1: 10, x2: x, y2: MAP_EXTENT.height - 10, primary: c === 2 };
  }),
  ...Array.from({ length: BLOCK_ROWS - 1 }, (_, r) => {
    const y = MARGIN + (r + 1) * BLOCK_H + r * STREET + STREET / 2;
    return { x1: 10, y1: y, x2: MAP_EXTENT.width - 10, y2: y, primary: r === 1 };
  }),
];

const zoneCodes = ['Z-M1', 'Z-R2', 'Z-R3', 'Z-S1', 'Z-G1'];
const useCodes = ['مسکونی', 'مختلط', 'خدماتی', 'تجاری', 'فضای سبز'];

/** The reference parcel sits in the middle of a block on the northern axis. */
const REFERENCE_BLOCK_INDEX = 8;

function buildParcels(): ParcelFeature[] {
  const rand = rng(140506);
  const out: ParcelFeature[] = [];
  const gap = 3;
  let index = 0;

  MAP_BLOCKS.forEach((block, blockIndex) => {
    const cols = 4;
    const rows = 3;
    const cellW = (block.w - gap * (cols - 1)) / cols;
    const cellH = (block.h - gap * (rows - 1)) / rows;

    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const x = Math.round(block.x + c * (cellW + gap));
        const y = Math.round(block.y + r * (cellH + gap));
        const w = Math.round(cellW);
        const h = Math.round(cellH);
        const isReference = blockIndex === REFERENCE_BLOCK_INDEX && r === 1 && c === 1;

        if (isReference) {
          // Reference fixture parcel — FSD-B14.2 (1,000 m², 500 m² footprint, 4 floors)
          out.push({
            id: 'P-1042',
            externalId: 'TEH-06-1042',
            layerId: 'lyr-parcels',
            polygon: [
              [x, y],
              [x + w, y],
              [x + w, y + h],
              [x, y + h],
            ],
            attributes: {
              zoneCode: 'Z-M1',
              useCode: 'مسکونی',
              parcelAreaM2: 1000,
              footprintM2: 500,
              floors: 4,
              gfaM2: 2000,
              heightM: null,
              parkingSpaces: 18,
              dwellings: 20,
            },
            datasetLabel: 'قطعات و کاربری اراضی (نمونه)',
            versionLabel: 'v3.2',
            sourceLabel: 'اداره کل شهرسازی — تحویل نمونه',
            temporalCoverage: '۱۴۰۵/۰۲',
            qualityStatus: 'medium',
            evidenceIds: ['ev-002', 'ev-006'],
          });
          continue;
        }

        index += 1;
        const parcelArea = Math.round(w * h * 1.6);
        const coverage = 0.35 + rand() * 0.3;
        const floors = 2 + Math.floor(rand() * 6);
        const footprint = Math.round(parcelArea * coverage);
        // green space clusters on block edges, so land use reads as a pattern
        const edge = r === 0 || r === rows - 1 || c === 0 || c === cols - 1;
        const zoneIdx = edge && rand() > 0.82 ? 4 : Math.floor(rand() * 4);
        const hasHeight = rand() > 0.31;
        const hasParking = rand() > 0.42;

        out.push({
          id: `P-${2000 + index}`,
          externalId: `TEH-06-${2000 + index}`,
          layerId: 'lyr-parcels',
          polygon: [
            [x, y],
            [x + w, y],
            [x + w, y + h],
            [x, y + h],
          ],
          attributes: {
            zoneCode: zoneCodes[zoneIdx],
            useCode: useCodes[zoneIdx],
            parcelAreaM2: parcelArea,
            footprintM2: footprint,
            floors,
            gfaM2: footprint * floors,
            heightM: hasHeight ? Math.round(floors * 3.2 * 10) / 10 : null,
            parkingSpaces: hasParking ? Math.floor(rand() * 24) : null,
            dwellings: Math.max(1, Math.round((footprint * floors * 0.8) / 85)),
          },
          datasetLabel: 'قطعات و کاربری اراضی (نمونه)',
          versionLabel: 'v3.2',
          sourceLabel: 'اداره کل شهرسازی — تحویل نمونه',
          temporalCoverage: '۱۴۰۵/۰۲',
          qualityStatus: hasHeight ? 'medium' : 'low',
          evidenceIds: ['ev-002'],
        });
      }
    }
  });

  return out;
}

export const demoParcels: ParcelFeature[] = buildParcels();

export const demoLayers: MapLayer[] = [
  {
    id: 'lyr-parcels',
    title: 'قطعات و کاربری اراضی',
    kind: 'fill',
    datasetLabel: 'قطعات و کاربری اراضی (نمونه)',
    versionLabel: 'v3.2',
    visible: true,
    opacity: 0.9,
    classification: 'restricted_municipal',
    loadState: 'ready',
    legend: [
      { label: 'مسکونی', color: '#cbd8e3' },
      { label: 'مختلط', color: '#e2d4c0' },
      { label: 'خدماتی', color: '#cfe0d5' },
      { label: 'تجاری', color: '#e6d2d2' },
      { label: 'فضای سبز', color: '#c8ddc4' },
    ],
  },
  {
    id: 'lyr-blocks',
    title: 'بلوک‌های شهری',
    kind: 'line',
    datasetLabel: 'مرز بلوک (نمونه)',
    versionLabel: 'boundary-v4',
    visible: true,
    opacity: 0.6,
    classification: 'unrestricted_internal',
    loadState: 'ready',
    legend: [{ label: 'مرز بلوک', color: '#9aa8b4' }],
  },
  {
    id: 'lyr-height',
    title: 'ارتفاع ابنیه',
    kind: 'fill',
    datasetLabel: 'ابنیه، طبقات و ارتفاع (نمونه)',
    versionLabel: 'v2.1',
    visible: false,
    opacity: 0.75,
    classification: 'restricted_municipal',
    loadState: 'ready',
    legend: [
      { label: 'تا ۳ طبقه', color: '#dfe8ef' },
      { label: '۴ تا ۵ طبقه', color: '#9dbcd2' },
      { label: '۶ طبقه و بیشتر', color: '#4f8ab0' },
      { label: 'ارتفاع ثبت‌نشده', color: '#e6e2d8' },
    ],
  },
  {
    id: 'lyr-services',
    title: 'مراکز خدمات',
    kind: 'point',
    datasetLabel: 'مراکز خدمات آموزشی و درمانی (نمونه)',
    versionLabel: 'v1.5',
    visible: true,
    opacity: 1,
    classification: 'unrestricted_internal',
    loadState: 'ready',
    legend: [
      { label: 'آموزشی', color: '#2f6d94' },
      { label: 'درمانی', color: '#a32b21' },
    ],
  },
  {
    id: 'lyr-network',
    title: 'شبکه معابر مسیریابی‌پذیر',
    kind: 'line',
    datasetLabel: 'شبکه معابر (نمونه)',
    versionLabel: 'v1.0 — منتشرنشده',
    visible: false,
    opacity: 0.8,
    classification: 'restricted_municipal',
    loadState: 'unavailable',
    legend: [{ label: 'در دسترس نیست', color: '#8a99a7' }],
  },
];

export interface ServicePoint {
  id: string;
  kind: 'education' | 'health';
  x: number;
  y: number;
  title: string;
}

export const demoServicePoints: ServicePoint[] = [
  { id: 'sv-1', kind: 'education', x: 240, y: 190, title: 'مرکز آموزشی نمونه ۱' },
  { id: 'sv-2', kind: 'education', x: 760, y: 430, title: 'مرکز آموزشی نمونه ۲' },
  { id: 'sv-3', kind: 'health', x: 560, y: 620, title: 'مرکز درمانی نمونه ۱' },
  { id: 'sv-4', kind: 'health', x: 980, y: 240, title: 'مرکز درمانی نمونه ۲' },
];
