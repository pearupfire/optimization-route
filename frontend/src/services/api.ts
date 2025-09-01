import axios from 'axios';
import { Location, MarkerData, TreasureData, TreasureRequest, CollectTreasureResponse } from '../types';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const createMarker = async (markerData: Omit<MarkerData, 'id'>): Promise<MarkerData> => {
  const response = await api.post('/api/markers', markerData);
  return response.data;
};

export const getMarkers = async (): Promise<MarkerData[]> => {
  const response = await api.get('/api/markers');
  return response.data;
};

export const deleteMarker = async (markerId: number): Promise<void> => {
  await api.delete(`/api/markers/${markerId}`);
};

export const generateTreasures = async (request: TreasureRequest): Promise<TreasureData[]> => {
  const response = await api.post('/api/treasures', request);
  return response.data;
};

export const getTreasures = async (): Promise<TreasureData[]> => {
  const response = await api.get('/api/treasures');
  return response.data;
};

export const clearTreasures = async (): Promise<void> => {
  await api.delete('/api/treasures');
};

export const collectTreasure = async (
  treasureId: number,
  userLocation: Location
): Promise<CollectTreasureResponse> => {
  const response = await api.post(`/api/treasures/${treasureId}/collect`, userLocation);
  return response.data;
};

