import type { MapLayer, ParcelFeature } from '@/types/domain';
import { gis } from '@/mocks/db';
import type { ServicePoint } from '@/mocks/data/gis';
import { call } from './client';

export const gisApi = {
  /** GET /map-layers */
  layers: () => call<MapLayer[]>('/map-layers', () => gis.layers),

  /** GET /features?layer_id=... */
  features: (layerId = 'lyr-parcels') =>
    call<ParcelFeature[]>(`/features?layer_id=${layerId}`, () =>
      gis.parcels.filter((p) => p.layerId === layerId),
    ),

  feature: (id: string) =>
    call<ParcelFeature | undefined>(`/features/${id}`, () => gis.parcels.find((p) => p.id === id)),

  servicePoints: () => call<ServicePoint[]>('/features?layer_id=lyr-services', () => gis.servicePoints),
};
