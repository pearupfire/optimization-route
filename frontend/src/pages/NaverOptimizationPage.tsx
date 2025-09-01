import React, { useState } from 'react';
import NaverMapComponent from '../components/NaverMapComponent';
import NaverControls from '../components/NaverControls';
import StatusMessage from '../components/StatusMessage';
import { Location, MarkerType } from '../types';
import { getNaverRoute, NaverDirectionRequest } from '../services/api';

declare global {
  interface Window {
    naver: any;
  }
}

const NaverOptimizationPage: React.FC = () => {
  const [map, setMap] = useState<any>(null);
  const [currentMarker, setCurrentMarker] = useState<any>(null);
  const [currentMarkerType, setCurrentMarkerType] = useState<MarkerType>('image');
  const [currentColor, setCurrentColor] = useState('#FF0000');
  const [treasures, setTreasures] = useState<{marker: any, id: number}[]>([]);
  const [userPosition, setUserPosition] = useState<Location | null>(null);
  const [polylines, setPolylines] = useState<any[]>([]);
  const [sequenceMarkers, setSequenceMarkers] = useState<any[]>([]);
  const [status, setStatus] = useState({
    message: '위치 권한을 허용하고 \'내 위치 찾기\' 버튼을 클릭해주세요!',
    type: 'loading' as 'loading' | 'error' | 'success'
  });

  const updateStatus = (message: string, type: 'loading' | 'error' | 'success') => {
    setStatus({ message, type });
  };

  const getCurrentLocation = () => {
    updateStatus('위치를 찾는 중...', 'loading');
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation: Location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          
          setUserPosition(userLocation);
          
          if (map && window.naver) {
            const moveLatLng = new window.naver.maps.LatLng(userLocation.lat, userLocation.lng);
            map.setCenter(moveLatLng);
            map.setZoom(15);
            
            if (currentMarker) {
              currentMarker.setMap(null);
            }
            
            createCustomMarker(userLocation);
            updateStatus(`위치를 찾았습니다! (${userLocation.lat.toFixed(6)}, ${userLocation.lng.toFixed(6)})`, 'success');
          }
        },
        (error) => {
          updateStatus('위치를 가져올 수 없습니다. 위치 권한을 확인해주세요.', 'error');
          console.error('Geolocation error:', error);
        }
      );
    } else {
      updateStatus('이 브라우저는 위치 서비스를 지원하지 않습니다.', 'error');
    }
  };

  const createCustomMarker = (location: Location) => {
    if (!map || !window.naver) return;

    const position = new window.naver.maps.LatLng(location.lat, location.lng);
    
    const marker = new window.naver.maps.Marker({
      position: position,
      map: map,
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
            <path d="M16 0C7.2 0 0 7.2 0 16c0 8.8 16 24 16 24s16-15.2 16-24C32 7.2 24.8 0 16 0z" fill="#FF0000" stroke="white" stroke-width="2"/>
            <circle cx="16" cy="16" r="6" fill="white"/>
          </svg>
        `),
        scaledSize: new window.naver.maps.Size(32, 40),
        anchor: new window.naver.maps.Point(16, 40)
      }
    });
    
    setCurrentMarker(marker);
    
    const infoWindow = new window.naver.maps.InfoWindow({
      content: '<div style="padding:10px; text-align:center;"><strong>내 위치</strong></div>'
    });
    
    window.naver.maps.Event.addListener(marker, 'click', () => {
      infoWindow.open(map, marker);
    });
  };

  const generateRandomTreasures = () => {
    if (!map || !userPosition || !window.naver) {
      updateStatus('먼저 내 위치를 찾아주세요!', 'error');
      return;
    }
    
    clearTreasures();
    updateStatus('보물을 생성하는 중...', 'loading');
    
    const newTreasures: {marker: any, id: number}[] = [];
    const treasureCount = 5;
    
    for (let i = 0; i < treasureCount; i++) {
      const offsetLat = (Math.random() - 0.5) * 0.01;
      const offsetLng = (Math.random() - 0.5) * 0.01;
      
      const treasureLocation = {
        lat: userPosition.lat + offsetLat,
        lng: userPosition.lng + offsetLng
      };
      
      const position = new window.naver.maps.LatLng(treasureLocation.lat, treasureLocation.lng);
      
      const marker = new window.naver.maps.Marker({
        position: position,
        map: map,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
              <rect x="8" y="12" width="24" height="18" fill="#8B4513" stroke="#654321" stroke-width="2" rx="2"/>
              <rect x="10" y="14" width="20" height="14" fill="#DAA520" stroke="#B8860B" stroke-width="1" rx="1"/>
              <circle cx="20" cy="21" r="3" fill="#FFD700" stroke="#FFA500" stroke-width="1"/>
              <rect x="17" y="18" width="6" height="2" fill="#FFA500" rx="1"/>
            </svg>
          `),
          scaledSize: new window.naver.maps.Size(40, 40),
          anchor: new window.naver.maps.Point(20, 20)
        }
      });
      
      const infoWindow = new window.naver.maps.InfoWindow({
        content: `<div style="padding:5px; text-align:center;"><strong>보물 ${i + 1}</strong></div>`
      });
      
      window.naver.maps.Event.addListener(marker, 'click', () => {
        infoWindow.open(map, marker);
      });
      
      newTreasures.push({ marker, id: i });
    }
    
    setTreasures(newTreasures);
    updateStatus(`${treasureCount}개의 보물이 생성되었습니다!`, 'success');
  };

  const clearTreasures = () => {
    treasures.forEach(treasure => treasure.marker.setMap(null));
    setTreasures([]);
    updateStatus('보물이 모두 제거되었습니다.', 'success');
  };

  const clearRoute = () => {
    polylines.forEach(polyline => polyline.setMap(null));
    setPolylines([]);
    
    sequenceMarkers.forEach(marker => marker.setMap(null));
    setSequenceMarkers([]);
    
    updateStatus('경로가 제거되었습니다.', 'success');
  };

  // 거리 계산 함수 (Haversine formula)
  const calculateDistance = (point1: Location, point2: Location): number => {
    const R = 6371; // 지구 반지름 (km)
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLng = (point2.lng - point1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // 네이버 지도용 경로 최적화 알고리즘 (Nearest Neighbor)
  const optimizeRouteOrder = (origin: Location, destinations: Location[], destinationNames: string[]): {
    order: number[],
    totalDistance: number,
    optimizedNames: string[]
  } => {
    if (destinations.length === 0) return { order: [], totalDistance: 0, optimizedNames: [] };
    
    const visited = new Array(destinations.length).fill(false);
    const result: number[] = [];
    let currentLocation = origin;
    let totalDistance = 0;
    
    // Nearest Neighbor 알고리즘
    for (let i = 0; i < destinations.length; i++) {
      let nearestIndex = -1;
      let nearestDistance = Infinity;
      
      for (let j = 0; j < destinations.length; j++) {
        if (!visited[j]) {
          const distance = calculateDistance(currentLocation, destinations[j]);
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestIndex = j;
          }
        }
      }
      
      if (nearestIndex !== -1) {
        visited[nearestIndex] = true;
        result.push(nearestIndex);
        currentLocation = destinations[nearestIndex];
        totalDistance += nearestDistance;
      }
    }
    
    return {
      order: result,
      totalDistance,
      optimizedNames: result.map(index => destinationNames[index])
    };
  };

  // 현실적인 경로 포인트 생성 (곡선 효과와 도로를 따라가는 시뮬레이션)
  const generateRealisticPath = (start: Location, end: Location): any[] => {
    const points = [];
    const numPoints = 20; // 중간 포인트 개수
    
    // 직선 거리가 짧으면 포인트 수 줄이기
    const distance = calculateDistance(start, end);
    const actualNumPoints = Math.max(5, Math.min(numPoints, Math.floor(distance * 200)));
    
    for (let i = 0; i <= actualNumPoints; i++) {
      const ratio = i / actualNumPoints;
      
      // 기본 직선 보간
      const lat = start.lat + (end.lat - start.lat) * ratio;
      const lng = start.lng + (end.lng - start.lng) * ratio;
      
      // 곡선 효과를 위한 오프셋 추가 (도로를 따라가는 것처럼)
      let latOffset = 0;
      let lngOffset = 0;
      
      if (actualNumPoints > 5) {
        // 중간 지점에서 약간의 곡선 효과
        const curve = Math.sin(ratio * Math.PI) * 0.001; // 곡선 강도
        const perpendicular = Math.PI / 2; // 수직 방향
        
        latOffset = curve * Math.cos(perpendicular);
        lngOffset = curve * Math.sin(perpendicular);
        
        // 랜덤한 작은 변화 (도로의 굽이굽이 효과)
        if (i > 0 && i < actualNumPoints) {
          latOffset += (Math.random() - 0.5) * 0.0005;
          lngOffset += (Math.random() - 0.5) * 0.0005;
        }
      }
      
      points.push(new window.naver.maps.LatLng(lat + latOffset, lng + lngOffset));
    }
    
    return points;
  };

  // Naver Geocoding을 위한 함수 (간단한 검색 구현)
  const geocodeAddress = async (address: string): Promise<Location> => {
    // 주요 도시들의 좌표 (테스트용)
    const locations: {[key: string]: Location} = {
      '서울': { lat: 37.5665, lng: 126.9780 },
      '서울역': { lat: 37.5547, lng: 126.9707 },
      '강남': { lat: 37.4979, lng: 127.0276 },
      '강남역': { lat: 37.4979, lng: 127.0276 },
      '홍대': { lat: 37.5563, lng: 126.9236 },
      '홍대입구': { lat: 37.5563, lng: 126.9236 },
      '명동': { lat: 37.5636, lng: 126.9834 },
      '이태원': { lat: 37.5346, lng: 126.9947 },
      '부산': { lat: 35.1796, lng: 129.0756 },
      '부산역': { lat: 35.1158, lng: 129.0422 },
      '대구': { lat: 35.8714, lng: 128.6014 },
      '인천': { lat: 37.4563, lng: 126.7052 },
      '인천공항': { lat: 37.4602, lng: 126.4407 },
      '광주': { lat: 35.1595, lng: 126.8526 },
      '대전': { lat: 36.3504, lng: 127.3845 },
      '울산': { lat: 35.5384, lng: 129.3114 },
      '제주': { lat: 33.4996, lng: 126.5312 },
      '제주공항': { lat: 33.5067, lng: 126.4930 },
      '경복궁': { lat: 37.5788, lng: 126.9770 },
      '남산타워': { lat: 37.5512, lng: 126.9882 },
      '롯데타워': { lat: 37.5125, lng: 127.1025 },
      '동대문': { lat: 37.5705, lng: 127.0098 },
      '잠실': { lat: 37.5133, lng: 127.1028 },
      '여의도': { lat: 37.5219, lng: 126.9245 }
    };
    
    const normalizedAddress = address.trim();
    
    // 정확히 일치하는 주소 찾기
    if (locations[normalizedAddress]) {
      return locations[normalizedAddress];
    }
    
    // 부분 매칭 시도
    for (const [key, location] of Object.entries(locations)) {
      if (normalizedAddress.includes(key) || key.includes(normalizedAddress)) {
        return location;
      }
    }
    
    // 매칭되는 주소가 없으면 서울 기본 좌표 반환
    console.warn(`주소 '${address}'를 찾을 수 없어 서울 좌표를 반환합니다.`);
    return { lat: 37.5665, lng: 126.9780 };
  };

  // 기본 경로 계획 (입력된 순서대로)
  const handlePlanRoute = async (origin: string, destination: string, waypoints: string[]) => {
    if (!map || !window.naver) {
      updateStatus('지도가 준비되지 않았습니다.', 'error');
      return;
    }

    updateStatus('경로를 계획하는 중...', 'loading');
    
    try {
      clearRoute();
      
      const allLocations = [origin, ...waypoints, destination].filter(loc => loc.trim());
      
      if (allLocations.length < 2) {
        updateStatus('최소 출발지와 목적지를 입력해주세요.', 'error');
        return;
      }
      
      console.log('기본 경로 순서:', allLocations);
      updateStatus(`${allLocations.length}개 지점의 경로를 계획 중...`, 'loading');
      
      await renderBasicRoute(allLocations);
      
    } catch (error) {
      console.error('기본 경로 계획 오류:', error);
      updateStatus('경로 계획 중 오류가 발생했습니다. 주소를 정확히 입력해주세요.', 'error');
    }
  };

  // 최적화된 경로 계획
  const handlePlanOptimizedRoute = async (origin: string, destination: string, waypoints: string[]) => {
    if (!map || !window.naver) {
      updateStatus('지도가 준비되지 않았습니다.', 'error');
      return;
    }

    updateStatus('경로 최적화 중...', 'loading');
    
    try {
      clearRoute();
      
      // 모든 주소를 좌표로 변환
      const originCoords = await geocodeAddress(origin);
      const waypointCoords = await Promise.all(waypoints.map(wp => geocodeAddress(wp)));
      const destinationCoords = await geocodeAddress(destination);
      
      const allDestinations = [...waypointCoords, destinationCoords];
      const allDestinationNames = [...waypoints, destination];
      
      // 경로 최적화
      const optimized = optimizeRouteOrder(originCoords, allDestinations, allDestinationNames);
      
      console.log('최적화된 순서:', optimized.optimizedNames);
      console.log('예상 총 거리:', optimized.totalDistance.toFixed(1), 'km');
      
      updateStatus(`경로 최적화 완료! 예상 거리: ${optimized.totalDistance.toFixed(1)}km`, 'success');
      
      // 최적화된 순서로 경로 표시
      const allOptimizedPoints = [origin, ...optimized.optimizedNames];
      await renderOptimizedRoute(allOptimizedPoints);
      
    } catch (error) {
      console.error('경로 최적화 오류:', error);
      updateStatus('경로 최적화 중 오류가 발생했습니다. 주소를 정확히 입력해주세요.', 'error');
    }
  };

  // 실제 경로 렌더링 (네이버 Direction API 사용)
  const renderBasicRoute = async (locations: string[]) => {
    if (!map || !window.naver) return;
    
    const newPolylines: any[] = [];
    const newSequenceMarkers: any[] = [];
    
    try {
      // 모든 위치를 좌표로 변환
      const coords = await Promise.all(locations.map(location => geocodeAddress(location)));
      
      let totalDistance = 0;
      
      // 각 구간별로 실제 경로 가져오기 (네이버 Direction API 사용)
      for (let i = 0; i < coords.length - 1; i++) {
        try {
          const request: NaverDirectionRequest = {
            start: `${coords[i].lng},${coords[i].lat}`,
            goal: `${coords[i + 1].lng},${coords[i + 1].lat}`,
            option: 'traoptimal'
          };
          
          console.log(`구간 ${i+1} 경로 요청:`, request);
          const routeResponse = await getNaverRoute(request);
          
          if (routeResponse.route && routeResponse.route.traoptimal && routeResponse.route.traoptimal.length > 0) {
            const route = routeResponse.route.traoptimal[0];
            totalDistance += route.summary.distance / 1000; // 미터를 킬로미터로 변환
            
            // 실제 경로 패스를 폴리라인으로 변환
            const routePath = route.path.map((coord: number[]) => 
              new window.naver.maps.LatLng(coord[1], coord[0]) // [경도, 위도] -> [위도, 경도]
            );
            
            const polyline = new window.naver.maps.Polyline({
              path: routePath,
              strokeWeight: 6,
              strokeColor: '#4285F4',
              strokeOpacity: 0.8,
              strokeStyle: 'solid'
            });
            
            polyline.setMap(map);
            newPolylines.push(polyline);
            
            console.log(`✅ 구간 ${i+1} 실제 경로 표시 성공`, route.summary);
          } else {
            throw new Error('No route found');
          }
        } catch (error) {
          // API 호출 실패시 경로를 표시하지 않고 에러 메시지만 출력
          console.error(`구간 ${i+1} Direction API 실패:`, error);
          alert(`실제 경로 데이터를 가져올 수 없습니다. 네이버 API 설정을 확인해주세요.`);
          return;
        }
      }
      
      // 순서 마커 표시
      coords.forEach((coord, index) => {
        const position = new window.naver.maps.LatLng(coord.lat, coord.lng);
        
        const marker = new window.naver.maps.Marker({
          position: position,
          map: map,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" width="30" height="40" viewBox="0 0 30 40">
                <path d="M15 0C6.7 0 0 6.7 0 15c0 8.3 15 25 15 25s15-16.7 15-25C30 6.7 23.3 0 15 0z" fill="#4285F4" stroke="white" stroke-width="2"/>
                <text x="15" y="20" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="white">${index + 1}</text>
              </svg>
            `),
            scaledSize: new window.naver.maps.Size(30, 40),
            anchor: new window.naver.maps.Point(15, 40)
          }
        });
        
        const infoWindow = new window.naver.maps.InfoWindow({
          content: `<div style="padding:8px; font-weight:bold; color:#4285F4;">${index + 1}. ${locations[index]}</div>`
        });
        
        window.naver.maps.Event.addListener(marker, 'click', () => {
          infoWindow.open(map, marker);
        });
        
        newSequenceMarkers.push(marker);
      });
      
      setPolylines(newPolylines);
      setSequenceMarkers(newSequenceMarkers);
      
      // 전체 경로가 보이도록 지도 범위 조정
      const bounds = new window.naver.maps.LatLngBounds();
      coords.forEach(coord => {
        bounds.extend(new window.naver.maps.LatLng(coord.lat, coord.lng));
      });
      map.fitBounds(bounds);
      
      const distanceText = totalDistance > 0 ? `${totalDistance.toFixed(1)}km` : '계산됨';
      const estimatedTime = totalDistance > 0 ? Math.round(totalDistance * 2) : 0;
      const durationText = estimatedTime > 0 ? `약 ${estimatedTime}분` : '알 수 없음';
      
      const hasRealRoutes = newPolylines.some(p => p.strokeStyle === 'solid');
      const routeType = hasRealRoutes ? '🛣️ 실제 도로 경로' : '📍 추정 경로';
      
      updateStatus(`${routeType} 계획 완료! 총 거리: ${distanceText}, 예상 시간: ${durationText}`, 'success');
      
    } catch (error) {
      console.error('기본 경로 렌더링 오류:', error);
      updateStatus('경로를 표시하는 중 오류가 발생했습니다.', 'error');
    }
  };

  // 최적화된 경로 렌더링 (곡선 효과 적용)
  const renderOptimizedRoute = async (locations: string[]) => {
    if (!map || !window.naver) return;
    
    const newPolylines: any[] = [];
    const newSequenceMarkers: any[] = [];
    
    try {
      // 모든 위치를 좌표로 변환
      const coords = await Promise.all(locations.map(location => geocodeAddress(location)));
      
      let totalDistance = 0;
      
      // 각 구간별로 실제 경로 생성 (네이버 Direction API 사용)
      for (let i = 0; i < coords.length - 1; i++) {
        try {
          const request = {
            start: `${coords[i].lng},${coords[i].lat}`,
            goal: `${coords[i + 1].lng},${coords[i + 1].lat}`,
            option: 'traoptimal' as const
          };
          
          console.log(`최적화 구간 ${i+1} 경로 요청:`, request);
          const routeResponse = await getNaverRoute(request);
          
          if (routeResponse.route && routeResponse.route.traoptimal && routeResponse.route.traoptimal.length > 0) {
            const route = routeResponse.route.traoptimal[0];
            totalDistance += route.summary.distance / 1000; // 미터를 킬로미터로 변환
            
            // 실제 경로 패스를 폴리라인으로 변환
            const routePath = route.path.map((coord: number[]) => 
              new window.naver.maps.LatLng(coord[1], coord[0]) // [경도, 위도] -> [위도, 경도]
            );
            
            const polyline = new window.naver.maps.Polyline({
              path: routePath,
              strokeWeight: 6,
              strokeColor: '#FF0000', // 빨간색으로 최적화된 경로 구분
              strokeOpacity: 0.8,
              strokeStyle: 'solid'
            });
            
            polyline.setMap(map);
            newPolylines.push(polyline);
            
            console.log(`✅ 최적화 구간 ${i+1} 실제 경로 표시 성공`, route.summary);
          } else {
            throw new Error('No route found');
          }
        } catch (error) {
          // API 호출 실패시 경로를 표시하지 않고 에러 메시지만 출력
          console.error(`최적화 구간 ${i+1} Direction API 실패:`, error);
          alert(`최적화 경로의 실제 경로 데이터를 가져올 수 없습니다. 네이버 API 설정을 확인해주세요.`);
          return;
        }
      }
      
      // 순서 마커 표시
      coords.forEach((coord, index) => {
        const position = new window.naver.maps.LatLng(coord.lat, coord.lng);
        
        const marker = new window.naver.maps.Marker({
          position: position,
          map: map,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" width="30" height="40" viewBox="0 0 30 40">
                <path d="M15 0C6.7 0 0 6.7 0 15c0 8.3 15 25 15 25s15-16.7 15-25C30 6.7 23.3 0 15 0z" fill="#FF0000" stroke="white" stroke-width="2"/>
                <text x="15" y="20" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="white">${index + 1}</text>
              </svg>
            `),
            scaledSize: new window.naver.maps.Size(30, 40),
            anchor: new window.naver.maps.Point(15, 40)
          }
        });
        
        const infoWindow = new window.naver.maps.InfoWindow({
          content: `<div style="padding:8px; font-weight:bold; color:#FF0000;">${index + 1}. ${locations[index]}</div>`
        });
        
        window.naver.maps.Event.addListener(marker, 'click', () => {
          infoWindow.open(map, marker);
        });
        
        newSequenceMarkers.push(marker);
      });
      
      setPolylines(newPolylines);
      setSequenceMarkers(newSequenceMarkers);
      
      // 전체 경로가 보이도록 지도 범위 조정
      const bounds = new window.naver.maps.LatLngBounds();
      coords.forEach(coord => {
        bounds.extend(new window.naver.maps.LatLng(coord.lat, coord.lng));
      });
      map.fitBounds(bounds);
      
      const distanceText = totalDistance > 0 ? `${totalDistance.toFixed(1)}km` : '계산됨';
      const estimatedTime = totalDistance > 0 ? Math.round(totalDistance * 2) : 0;
      const durationText = estimatedTime > 0 ? `약 ${estimatedTime}분` : '알 수 없음';
      
      updateStatus(`🎯 최적화된 경로 완료! 총 거리: ${distanceText}, 예상 시간: ${durationText} (실제 경로)`, 'success');
      
    } catch (error) {
      console.error('경로 렌더링 오류:', error);
      updateStatus('경로를 표시하는 중 오류가 발생했습니다.', 'error');
    }
  };


  return (
    <div className="container">
      <h1>Naver Map Test Page</h1>
      
      <NaverControls
        onGetCurrentLocation={getCurrentLocation}
        onGenerateTreasures={generateRandomTreasures}
        onClearTreasures={clearTreasures}
        currentMarkerType={currentMarkerType}
        onSetMarkerType={setCurrentMarkerType}
        currentColor={currentColor}
        onUpdateMarkerColor={setCurrentColor}
        onMarkerUpdate={(type, color) => {
          setCurrentMarkerType(type);
          setCurrentColor(color);
        }}
        onPlanRoute={handlePlanRoute}
        onPlanOptimizedRoute={handlePlanOptimizedRoute}
        onClearRoute={clearRoute}
      />
      
      <NaverMapComponent
        onMapLoad={setMap}
      />
      
      <StatusMessage 
        message={status.message}
        type={status.type}
      />
    </div>
  );
};

export default NaverOptimizationPage;