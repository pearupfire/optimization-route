export interface Location {
  lat: number;
  lng: number;
}

export type MarkerType = 'image';

export interface MarkerData {
  id: number;
  location: Location;
  marker_type: string;
  color: string;
  title?: string;
}

export interface TreasureData extends MarkerData {
  title: string;
}

export interface TreasureRequest {
  center_location: Location;
  count: number;
  radius_km: number;
}

export interface CollectTreasureResponse {
  success: boolean;
  message: string;
  remaining_treasures?: number;
  distance_meters: number;
}