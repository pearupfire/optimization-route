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

// 네이버 Direction API 관련 타입
export interface NaverDirectionRequest {
  start: string; // "경도,위도" 형태
  goal: string;  // "경도,위도" 형태
  waypoints?: string; // "경도,위도|경도,위도" 형태 (최대 5개)
  option?: 'trafast' | 'tracomfort' | 'traoptimal'; // 자동차 경로 옵션
}

export interface NaverDirectionResponse {
  code: number;
  message: string;
  currentDateTime: string;
  route: {
    trafast?: Array<{
      summary: {
        distance: number;
        duration: number;
        departureTime: string;
        bbox: number[][];
      };
      path: number[][]; // [경도, 위도] 배열
      section: any[];
      guide: any[];
    }>;
    traoptimal?: Array<{
      summary: {
        distance: number;
        duration: number;
        departureTime: string;
        bbox: number[][];
      };
      path: number[][]; // [경도, 위도] 배열
      section: any[];
      guide: any[];
    }>;
  };
}

// 네이버 Direction API 호출 (백엔드를 통해)
export const getNaverRoute = async (request: NaverDirectionRequest): Promise<NaverDirectionResponse> => {
  try {
    const response = await api.post('/api/naver/directions', request);
    return response.data;
  } catch (error) {
    console.error('네이버 Direction API 호출 실패:', error);
    throw error;
  }
};