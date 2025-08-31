import React, { useState, useEffect } from 'react';
import KakaoMapComponent from '../components/KakaoMapComponent';
import KakaoControls from '../components/KakaoControls';
import StatusMessage from '../components/StatusMessage';
import { Location, MarkerType, KakaoMarkerData, KakaoTreasureData } from '../types/kakao';

declare global {
  interface Window {
    kakao: any;
  }
}

const KakaoOptimizationPage: React.FC = () => {
  const [map, setMap] = useState<any>(null);
  const [currentMarker, setCurrentMarker] = useState<any>(null);
  const [currentMarkerType, setCurrentMarkerType] = useState<MarkerType>('image');
  const [currentColor, setCurrentColor] = useState('#FF0000');
  const [treasures, setTreasures] = useState<{marker: any, id: number}[]>([]);
  const [userPosition, setUserPosition] = useState<Location | null>(null);
  const [polylines, setPolylines] = useState<any[]>([]);
  const [sequenceMarkers, setSequenceMarkers] = useState<any[]>([]);
  const [lastRouteData, setLastRouteData] = useState<{locations: string[], coords: Location[]} | null>(null);
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
          
          if (map) {
            const moveLatLon = new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng);
            map.setCenter(moveLatLon);
            map.setLevel(3);
            
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
    if (!map || !window.kakao) return;

    const position = new window.kakao.maps.LatLng(location.lat, location.lng);
    
    let marker: any;
    if (currentMarkerType === 'image') {
      // 이미지 마커
      const imageSrc = 'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_red.png';
      const imageSize = new window.kakao.maps.Size(64, 69);
      const imageOption = { offset: new window.kakao.maps.Point(27, 69) };
      const markerImage = new window.kakao.maps.MarkerImage(imageSrc, imageSize, imageOption);
      
      marker = new window.kakao.maps.Marker({
        position: position,
        image: markerImage
      });
    } else {
      // 기본 마커
      marker = new window.kakao.maps.Marker({
        position: position
      });
    }
    
    marker.setMap(map);
    setCurrentMarker(marker);
    
    // 인포윈도우
    const infoWindow = new window.kakao.maps.InfoWindow({
      content: '<div style="padding:5px;">내 위치</div>'
    });
    
    window.kakao.maps.event.addListener(marker, 'click', () => {
      infoWindow.open(map, marker);
    });
  };

  const generateRandomTreasures = () => {
    if (!map || !userPosition) {
      updateStatus('먼저 내 위치를 찾아주세요!', 'error');
      return;
    }
    
    clearTreasures();
    updateStatus('보물을 생성하는 중...', 'loading');
    
    const newTreasures: {marker: any, id: number}[] = [];
    const treasureCount = 5;
    
    for (let i = 0; i < treasureCount; i++) {
      // 현재 위치 주변 1km 반경 내 랜덤 위치
      const offsetLat = (Math.random() - 0.5) * 0.01;
      const offsetLng = (Math.random() - 0.5) * 0.01;
      
      const treasureLocation = {
        lat: userPosition.lat + offsetLat,
        lng: userPosition.lng + offsetLng
      };
      
      const position = new window.kakao.maps.LatLng(treasureLocation.lat, treasureLocation.lng);
      
      // 보물 마커 이미지
      const imageSrc = 'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_blue.png';
      const imageSize = new window.kakao.maps.Size(64, 69);
      const imageOption = { offset: new window.kakao.maps.Point(27, 69) };
      const markerImage = new window.kakao.maps.MarkerImage(imageSrc, imageSize, imageOption);
      
      const marker = new window.kakao.maps.Marker({
        position: position,
        image: markerImage
      });
      
      marker.setMap(map);
      
      // 인포윈도우
      const infoWindow = new window.kakao.maps.InfoWindow({
        content: `<div style="padding:5px;">보물 ${i + 1}</div>`
      });
      
      window.kakao.maps.event.addListener(marker, 'click', () => {
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
    // 기존 경로 제거
    polylines.forEach(polyline => polyline.setMap(null));
    setPolylines([]);
    
    // 순서 마커 제거
    sequenceMarkers.forEach(marker => marker.setMap(null));
    setSequenceMarkers([]);
    
    updateStatus('경로가 제거되었습니다.', 'success');
  };

  // 카카오맵용 경로 최적화 알고리즘 (Nearest Neighbor)
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

  // 카카오맵 실제 경로 URL 생성
  const generateKakaoRouteURL = (locations: string[], coords: Location[], travelMode: string = 'car') => {
    if (locations.length < 2 || coords.length < 2) return null;
    
    // 경유지는 최대 5개까지만 (카카오맵 제한)
    const maxWaypoints = Math.min(locations.length - 2, 5);
    const routeLocations = locations.slice(0, maxWaypoints + 2);
    const routeCoords = coords.slice(0, maxWaypoints + 2);
    
    // URL 형식: /link/by/{이동수단}/위치1/위치2/위치3...
    const modeMap: {[key: string]: string} = {
      'DRIVING': 'car',
      'WALKING': 'walk', 
      'BICYCLING': 'bicycle',
      'TRANSIT': 'traffic'
    };
    
    const mode = modeMap[travelMode] || 'car';
    const locationParts = routeLocations.map((location, index) => 
      `${encodeURIComponent(location)},${routeCoords[index].lat},${routeCoords[index].lng}`
    );
    
    return `https://map.kakao.com/link/by/${mode}/${locationParts.join('/')}`;
  };

  // 카카오맵에서 실제 경로 보기
  const openRealRoute = (travelMode: string = 'car') => {
    if (!lastRouteData) {
      updateStatus('먼저 경로를 계획해주세요!', 'error');
      return;
    }
    
    const url = generateKakaoRouteURL(lastRouteData.locations, lastRouteData.coords, travelMode);
    if (url) {
      window.open(url, '_blank');
      updateStatus('카카오맵에서 실제 경로를 확인해보세요!', 'success');
    } else {
      updateStatus('경로 URL 생성에 실패했습니다.', 'error');
    }
  };

  const handlePlanRoute = async (origin: string, destination: string, waypoints: string[]) => {
    if (!map || !window.kakao) {
      updateStatus('지도가 준비되지 않았습니다.', 'error');
      return;
    }

    updateStatus('경로를 계획하는 중...', 'loading');
    
    try {
      clearRoute();
      
      // 입력된 순서대로 경로 계획 (최적화하지 않음)
      const allLocations = [origin, ...waypoints, destination].filter(loc => loc.trim());
      
      if (allLocations.length < 2) {
        updateStatus('최소 출발지와 목적지를 입력해주세요.', 'error');
        return;
      }
      
      console.log('기본 경로 순서:', allLocations);
      
      updateStatus(`${allLocations.length}개 지점의 경로를 계획 중...`, 'loading');
      
      // 입력된 순서대로 경로 표시
      renderBasicRoute(allLocations);
      
    } catch (error) {
      console.error('기본 경로 계획 오류:', error);
      updateStatus('경로 계획 중 오류가 발생했습니다. 주소를 정확히 입력해주세요.', 'error');
    }
  };

  const handlePlanOptimizedRoute = async (origin: string, destination: string, waypoints: string[]) => {
    if (!map || !window.kakao) {
      updateStatus('지도가 준비되지 않았습니다.', 'error');
      return;
    }

    updateStatus('경로 최적화 중...', 'loading');
    
    try {
      clearRoute();
      
      // 카카오맵 Geocoder로 주소를 좌표로 변환 (주소 + 키워드 검색)
      const geocoder = new window.kakao.maps.services.Geocoder();
      
      const geocodePromise = (address: string): Promise<Location> => {
        return new Promise((resolve, reject) => {
          // 먼저 주소 검색 시도
          geocoder.addressSearch(address, (result: any, status: any) => {
            if (status === window.kakao.maps.services.Status.OK) {
              resolve({
                lat: parseFloat(result[0].y),
                lng: parseFloat(result[0].x)
              });
            } else {
              // 주소 검색 실패시 키워드 검색 시도
              const places = new window.kakao.maps.services.Places();
              places.keywordSearch(address, (result: any, status: any) => {
                if (status === window.kakao.maps.services.Status.OK) {
                  resolve({
                    lat: parseFloat(result[0].y),
                    lng: parseFloat(result[0].x)
                  });
                } else {
                  reject(new Error(`주소/키워드 검색 실패: ${address}. 더 구체적인 주소나 장소명을 입력해주세요.`));
                }
              });
            }
          });
        });
      };

      // 모든 주소를 좌표로 변환
      const originCoords = await geocodePromise(origin);
      const waypointCoords = await Promise.all(waypoints.map(wp => geocodePromise(wp)));
      const destinationCoords = await geocodePromise(destination);
      
      const allDestinations = [...waypointCoords, destinationCoords];
      const allDestinationNames = [...waypoints, destination];
      
      // 경로 최적화
      const optimized = optimizeRouteOrder(originCoords, allDestinations, allDestinationNames);
      
      console.log('최적화된 순서:', optimized.optimizedNames);
      console.log('예상 총 거리:', optimized.totalDistance.toFixed(1), 'km');
      
      updateStatus(`경로 최적화 완료! 예상 거리: ${optimized.totalDistance.toFixed(1)}km`, 'success');
      
      // 최적화된 순서로 경로 표시
      const allOptimizedPoints = [origin, ...optimized.optimizedNames];
      renderOptimizedRoute(allOptimizedPoints);
      
    } catch (error) {
      console.error('경로 최적화 오류:', error);
      updateStatus('경로 최적화 중 오류가 발생했습니다. 주소를 정확히 입력해주세요.', 'error');
    }
  };

  const renderBasicRoute = async (locations: string[]) => {
    if (!map || !window.kakao) return;
    
    const geocoder = new window.kakao.maps.services.Geocoder();
    const newPolylines: any[] = [];
    const newSequenceMarkers: any[] = [];
    
    try {
      // 모든 위치를 좌표로 변환 (주소 검색 + 키워드 검색)
      const coords = await Promise.all(locations.map(location => 
        new Promise<Location>((resolve, reject) => {
          // 먼저 주소 검색 시도
          geocoder.addressSearch(location, (result: any, status: any) => {
            if (status === window.kakao.maps.services.Status.OK) {
              resolve({
                lat: parseFloat(result[0].y),
                lng: parseFloat(result[0].x)
              });
            } else {
              // 주소 검색 실패시 키워드 검색 시도
              const places = new window.kakao.maps.services.Places();
              places.keywordSearch(location, (result: any, status: any) => {
                if (status === window.kakao.maps.services.Status.OK) {
                  resolve({
                    lat: parseFloat(result[0].y),
                    lng: parseFloat(result[0].x)
                  });
                } else {
                  reject(new Error(`주소/키워드 검색 실패: ${location}. 더 구체적인 주소나 장소명을 입력해주세요.`));
                }
              });
            }
          });
        })
      ));
      
      // 입력된 순서대로 경로 선 그리기
      for (let i = 0; i < coords.length - 1; i++) {
        const linePath = [
          new window.kakao.maps.LatLng(coords[i].lat, coords[i].lng),
          new window.kakao.maps.LatLng(coords[i + 1].lat, coords[i + 1].lng)
        ];
        
        const polyline = new window.kakao.maps.Polyline({
          path: linePath,
          strokeWeight: 5,
          strokeColor: '#4285F4', // Google Maps 스타일 파란색
          strokeOpacity: 0.8,
          strokeStyle: 'solid'
        });
        
        polyline.setMap(map);
        newPolylines.push(polyline);
      }
      
      // 순서 마커 표시
      coords.forEach((coord, index) => {
        const position = new window.kakao.maps.LatLng(coord.lat, coord.lng);
        
        // 순서 번호 마커
        const marker = new window.kakao.maps.Marker({
          position: position
        });
        
        marker.setMap(map);
        
        // 순서 표시 인포윈도우
        const infoWindow = new window.kakao.maps.InfoWindow({
          content: `<div style="padding:8px; font-weight:bold; color:#4285F4;">${index + 1}. ${locations[index]}</div>`
        });
        
        infoWindow.open(map, marker);
        
        newSequenceMarkers.push(marker);
      });
      
      setPolylines(newPolylines);
      setSequenceMarkers(newSequenceMarkers);
      
      // 전체 경로가 보이도록 지도 범위 조정
      const bounds = new window.kakao.maps.LatLngBounds();
      coords.forEach(coord => {
        bounds.extend(new window.kakao.maps.LatLng(coord.lat, coord.lng));
      });
      map.setBounds(bounds);
      
      updateStatus(`경로 계획 완료! 총 ${locations.length}개 지점을 순서대로 연결했습니다.`, 'success');
      
      // 경로 데이터 저장 (실제 경로 보기용)
      setLastRouteData({ locations, coords });
      
    } catch (error) {
      console.error('기본 경로 렌더링 오류:', error);
      updateStatus('경로를 표시하는 중 오류가 발생했습니다.', 'error');
    }
  };

  const renderOptimizedRoute = async (locations: string[]) => {
    if (!map || !window.kakao) return;
    
    const geocoder = new window.kakao.maps.services.Geocoder();
    const newPolylines: any[] = [];
    const newSequenceMarkers: any[] = [];
    
    try {
      // 모든 위치를 좌표로 변환 (주소 검색 + 키워드 검색)
      const coords = await Promise.all(locations.map(location => 
        new Promise<Location>((resolve, reject) => {
          // 먼저 주소 검색 시도
          geocoder.addressSearch(location, (result: any, status: any) => {
            if (status === window.kakao.maps.services.Status.OK) {
              resolve({
                lat: parseFloat(result[0].y),
                lng: parseFloat(result[0].x)
              });
            } else {
              // 주소 검색 실패시 키워드 검색 시도
              const places = new window.kakao.maps.services.Places();
              places.keywordSearch(location, (result: any, status: any) => {
                if (status === window.kakao.maps.services.Status.OK) {
                  resolve({
                    lat: parseFloat(result[0].y),
                    lng: parseFloat(result[0].x)
                  });
                } else {
                  reject(new Error(`주소/키워드 검색 실패: ${location}. 더 구체적인 주소나 장소명을 입력해주세요.`));
                }
              });
            }
          });
        })
      ));
      
      // 경로 선 그리기
      for (let i = 0; i < coords.length - 1; i++) {
        const linePath = [
          new window.kakao.maps.LatLng(coords[i].lat, coords[i].lng),
          new window.kakao.maps.LatLng(coords[i + 1].lat, coords[i + 1].lng)
        ];
        
        const polyline = new window.kakao.maps.Polyline({
          path: linePath,
          strokeWeight: 5,
          strokeColor: '#FF0000',
          strokeOpacity: 0.7,
          strokeStyle: 'solid'
        });
        
        polyline.setMap(map);
        newPolylines.push(polyline);
      }
      
      // 순서 마커 표시
      coords.forEach((coord, index) => {
        const position = new window.kakao.maps.LatLng(coord.lat, coord.lng);
        
        // 순서 번호 마커
        const marker = new window.kakao.maps.Marker({
          position: position
        });
        
        marker.setMap(map);
        
        // 순서 표시 인포윈도우
        const infoWindow = new window.kakao.maps.InfoWindow({
          content: `<div style="padding:5px; font-weight:bold;">${index + 1}. ${locations[index]}</div>`
        });
        
        infoWindow.open(map, marker);
        
        newSequenceMarkers.push(marker);
      });
      
      setPolylines(newPolylines);
      setSequenceMarkers(newSequenceMarkers);
      
      // 전체 경로가 보이도록 지도 범위 조정
      const bounds = new window.kakao.maps.LatLngBounds();
      coords.forEach(coord => {
        bounds.extend(new window.kakao.maps.LatLng(coord.lat, coord.lng));
      });
      map.setBounds(bounds);
      
      // 경로 데이터 저장 (실제 경로 보기용)
      setLastRouteData({ locations, coords });
      
    } catch (error) {
      console.error('경로 렌더링 오류:', error);
      updateStatus('경로를 표시하는 중 오류가 발생했습니다.', 'error');
    }
  };

  return (
    <div className="container">
      <h1>🗺️ 카카오맵으로 경로 최적화</h1>
      
      <KakaoControls
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
        onOpenRealRoute={openRealRoute}
      />
      
      <KakaoMapComponent
        onMapLoad={setMap}
        userPosition={userPosition}
        width="100%"
        height="500px"
      />
      
      <StatusMessage 
        message={status.message}
        type={status.type}
      />
    </div>
  );
};

export default KakaoOptimizationPage;