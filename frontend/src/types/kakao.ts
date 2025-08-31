export interface Location {
  lat: number;
  lng: number;
}

export type MarkerType = 'image' | 'default';

export interface KakaoMarkerData {
  id: number;
  position: Location;
  type: MarkerType;
  color: string;
  title?: string;
}

export interface KakaoTreasureData {
  id: number;
  position: Location;
  title: string;
}

export interface WaypointData {
  address: string;
  locked: boolean;
  timeConstraint?: string;
  order?: number;
  travelMode?: 'DRIVING' | 'TRANSIT' | 'WALKING' | 'BICYCLING';
}