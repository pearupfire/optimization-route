import React, { useState, useEffect } from 'react';
import MapComponent from '../components/MapComponent';
import Controls from '../components/Controls';
import StatusMessage from '../components/StatusMessage';
import FirebasePushNotification from '../components/FirebasePushNotification';
import PWAInstaller from '../components/PWAInstaller';
import { Location, MarkerType } from '../types';
import * as api from '../services/api';

function MapPage() {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [currentMarker, setCurrentMarker] = useState<google.maps.Marker | null>(null);
  const [treasures, setTreasures] = useState<{marker: google.maps.Marker, id: number}[]>([]);
  const [userPosition, setUserPosition] = useState<Location | null>(null);
  const [prevPosition, setPrevPosition] = useState<Location | null>(null);
  const [userHeading, setUserHeading] = useState<number>(0);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [directionsRenderers, setDirectionsRenderers] = useState<google.maps.DirectionsRenderer[]>([]);
  const [sequenceMarkers, setSequenceMarkers] = useState<google.maps.Marker[]>([]);
  const [status, setStatus] = useState({
    message: '위치 권한을 허용하고 \'내 위치 찾기\' 버튼을 클릭해주세요!',
    type: 'loading' as 'loading' | 'error' | 'success'
  });

  const updateStatus = React.useCallback((message: string, type: 'loading' | 'error' | 'success') => {
    setStatus(prevStatus => {
      // 동일한 상태면 업데이트 건너뛰기
      if (prevStatus.message === message && prevStatus.type === type) {
        return prevStatus;
      }
      return { message, type };
    });
  }, []);

  const getCurrentLocation = () => {
    if (watchId !== null) {
      // 위치 추적 중지
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      updateStatus('위치 추적이 중지되었습니다.', 'success');
      return;
    }
    
    updateStatus('위치를 찾는 중...', 'loading');
    
    if (navigator.geolocation) {
      // 실시간 위치 추적 시작
      const id = navigator.geolocation.watchPosition(
        (position) => {
          const userLocation: Location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          
          // 방향 정보 가져오기 (null일 경우 기본값 0)
          const heading = position.coords.heading !== null ? position.coords.heading : 0;
          
          console.log('GPS 정보:', {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            heading: position.coords.heading,
            speed: position.coords.speed,
            accuracy: position.coords.accuracy
          });
          
          // 움직임으로 방향 계산 (GPS heading이 없을 경우)
          let calculatedHeading = heading;
          if (position.coords.heading === null && prevPosition) {
            calculatedHeading = calculateBearing(
              prevPosition.lat, prevPosition.lng,
              userLocation.lat, userLocation.lng
            );
            console.log('계산된 방향:', calculatedHeading);
          }
          
          // 테스트용: 매번 다른 방향으로 설정 (실제 운용시 제거)
          // calculatedHeading = Math.random() * 360;
          
          setPrevPosition(userLocation);
          setUserPosition(userLocation);
          setUserHeading(calculatedHeading);
          
          if (map) {
            // 처음에만 중심 이동
            if (!currentMarker) {
              map.setCenter(userLocation);
              map.setZoom(16);
            }
            
            createCustomMarker(userLocation, calculatedHeading);
          }
          
          updateStatus(
            `위치 추적 중... (${userLocation.lat.toFixed(6)}, ${userLocation.lng.toFixed(6)}) 방향: ${calculatedHeading.toFixed(0)}°`,
            'success'
          );
        },
        (error) => {
          let errorMessage = '위치를 가져올 수 없습니다: ';
          switch(error.code) {
            case error.PERMISSION_DENIED:
              errorMessage += '위치 권한이 거부되었습니다.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage += '위치 정보를 사용할 수 없습니다.';
              break;
            case error.TIMEOUT:
              errorMessage += '위치 요청이 시간 초과되었습니다.';
              break;
            default:
              errorMessage += '알 수 없는 오류가 발생했습니다.';
          }
          updateStatus(errorMessage, 'error');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0  // 캐시 사용 안함, 항상 새 위치 요청
        }
      );
      
      setWatchId(id);
    } else {
      updateStatus('이 브라우저는 지리적 위치를 지원하지 않습니다.', 'error');
    }
  };

  const createCustomMarker = (location: Location, heading: number = 0) => {
    if (!map) return;

    // 기존 마커 완전히 제거
    if (currentMarker) {
      currentMarker.setMap(null);
    }

    console.log('마커 생성 - 방향:', heading);

    let markerOptions: google.maps.MarkerOptions = {
      position: location,
      map: map,
      title: `내 위치 (방향: ${heading.toFixed(0)}°)`
    };

    markerOptions.icon = {
      url: '/character.png',
      scaledSize: new google.maps.Size(40, 40),
      anchor: new google.maps.Point(20, 20),
      rotation: heading  // Google Maps 자체 회전 기능 사용
    };

    const marker = new google.maps.Marker(markerOptions);
    setCurrentMarker(marker);

    const infoWindow = new google.maps.InfoWindow({
      content: `
        <div style="padding: 10px; text-align: center;">
          <h3 style="margin: 0 0 10px 0; color: #333;">📍 내 위치</h3>
          <p style="margin: 0; color: #666;">위도: ${location.lat.toFixed(6)}</p>
          <p style="margin: 0; color: #666;">경도: ${location.lng.toFixed(6)}</p>
          <p style="margin: 5px 0 0 0; color: #4285F4; font-weight: bold;">🧭 방향: ${heading.toFixed(0)}°</p>
        </div>
      `
    });

    marker.addListener('click', () => {
      infoWindow.open(map, marker);
    });
  };

  const generateTreasures = async () => {
    if (!userPosition || !map) {
      updateStatus('먼저 내 위치를 찾아주세요!', 'error');
      return;
    }

    try {
      treasures.forEach(treasure => {
        treasure.marker.setMap(null);
      });
      setTreasures([]);
      
      const treasureData = await api.generateTreasures({
        center_location: userPosition,
        count: 5,
        radius_km: 0.01
      });

      const treasureMarkers = treasureData.map((treasure, index) => {
        const marker = new google.maps.Marker({
          position: treasure.location,
          map: map,
          title: treasure.title || `보물상자 ${index + 1}`,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
                <rect x="8" y="12" width="24" height="18" fill="#8B4513" stroke="#654321" stroke-width="2" rx="2"/>
                <rect x="10" y="14" width="20" height="14" fill="#DAA520" stroke="#B8860B" stroke-width="1" rx="1"/>
                <circle cx="20" cy="21" r="3" fill="#FFD700" stroke="#FFA500" stroke-width="1"/>
                <rect x="17" y="18" width="6" height="2" fill="#FFA500" rx="1"/>
                <text x="20" y="35" text-anchor="middle" font-size="8" fill="#654321">💎</text>
              </svg>
            `),
            scaledSize: new google.maps.Size(40, 40),
            anchor: new google.maps.Point(20, 20)
          },
          animation: google.maps.Animation.BOUNCE
        });

        const distance = calculateDistance(
          userPosition.lat, userPosition.lng,
          treasure.location.lat, treasure.location.lng
        ).toFixed(2);

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 10px; text-align: center;">
              <h3 style="margin: 0 0 10px 0; color: #8B4513;">💎 ${treasure.title}</h3>
              <p style="margin: 0; color: #666;">거리: ${distance}km</p>
              <p style="margin: 5px 0; color: #666;">위도: ${treasure.location.lat.toFixed(6)}</p>
              <p style="margin: 0; color: #666;">경도: ${treasure.location.lng.toFixed(6)}</p>
              <button onclick="window.collectTreasure(${treasure.id})" style="
                margin-top: 10px;
                padding: 8px 16px; 
                background: linear-gradient(45deg, #DAA520, #B8860B); 
                color: white; 
                border: none; 
                border-radius: 15px; 
                cursor: pointer;
                font-weight: bold;
              ">보물 수집 (10m 이내)</button>
            </div>
          `
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });

        setTimeout(() => {
          marker.setAnimation(null);
        }, 2000);

        return { marker, id: treasure.id };
      });

      setTreasures(treasureMarkers);
      updateStatus(`${treasureData.length}개의 보물이 10m 반경에 생성되었습니다!`, 'success');
    } catch (error) {
      updateStatus('보물 생성 중 오류가 발생했습니다.', 'error');
    }
  };

  const clearTreasures = async () => {
    treasures.forEach(treasure => {
      if (treasure.marker) {
        treasure.marker.setMap(null);
      }
    });
    
    setTreasures([]);
    
    try {
      await api.clearTreasures();
      updateStatus('모든 보물이 제거되었습니다.', 'success');
    } catch (error) {
      updateStatus('보물 제거 중 오류가 발생했습니다.', 'error');
    }
  };

  const collectTreasure = React.useCallback(async (treasureId: number) => {
    if (!userPosition) {
      updateStatus('현재 위치를 확인할 수 없습니다!', 'error');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const currentLocation: Location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        try {
          const result = await api.collectTreasure(treasureId, currentLocation);
          
          if (result.success) {
            console.log('보물 수집 성공, treasureId:', treasureId);
            setTreasures(prevTreasures => {
              console.log('현재 보물 개수:', prevTreasures.length);
              const updatedTreasures = prevTreasures.filter(treasure => {
                if (treasure.id === treasureId) {
                  console.log('보물 마커 제거 중, ID:', treasure.id);
                  treasure.marker.setMap(null);
                  return false;
                }
                return true;
              });
              console.log('업데이트 후 보물 개수:', updatedTreasures.length);
              return updatedTreasures;
            });
          }

          updateStatus(result.message, result.success ? 'success' : 'error');
        } catch (error) {
          updateStatus('보물 수집 중 오류가 발생했습니다.', 'error');
        }
      },
      () => {
        updateStatus('현재 위치를 확인할 수 없습니다!', 'error');
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  }, [userPosition, updateStatus]);

  useEffect(() => {
    (window as any).collectTreasure = collectTreasure;
  }, [collectTreasure]);

  // 컴포넌트 언마운트 시 위치 추적 정리
  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  const planRoute = async (origin: string, destination: string, waypoints: string[], travelModes?: string[]) => {
    if (!map) {
      updateStatus('지도가 로드되지 않았습니다.', 'error');
      return;
    }

    try {
      updateStatus('경로를 계획하는 중...', 'loading');
      clearRoute();

      const validWaypoints = waypoints.filter(wp => wp.trim() !== '');
      
      if (validWaypoints.length === 0) {
        await planSimpleRoute(origin, destination);
        return;
      }

      const allPoints = [origin.trim(), ...validWaypoints.map(wp => wp.trim()), destination.trim()];
      const segments = [];
      for (let i = 0; i < allPoints.length - 1; i++) {
        segments.push({
          origin: allPoints[i],
          destination: allPoints[i + 1]
        });
      }

      console.log('기본 경로 구간:', segments);
      await renderBasicRoute(segments, travelModes);

    } catch (error) {
      console.error('Route planning error:', error);
      updateStatus(
        '경로 계획 중 오류가 발생했습니다. 주소를 정확히 입력해주세요.', 
        'error'
      );
    }
  };

  const planOptimizedRoute = async (origin: string, destination: string, waypoints: string[], waypointData?: any, travelModes?: string[]) => {
    if (!map) {
      updateStatus('지도가 로드되지 않았습니다.', 'error');
      return;
    }

    try {
      updateStatus('경로 최적화 중...', 'loading');
      clearRoute();

      const validWaypoints = waypoints.filter(wp => wp.trim() !== '');
      
      if (validWaypoints.length === 0) {
        await planSimpleRoute(origin, destination);
        return;
      }

      console.log('좌표 변환 시작...');
      const originCoords = await getCoordinates(origin.trim());
      const destinationCoords = await getCoordinates(destination.trim());
      
      const waypointCoords = [];
      for (const waypoint of validWaypoints) {
        const coords = await getCoordinates(waypoint.trim());
        waypointCoords.push(coords);
      }

      console.log('출발지:', originCoords, '목적지:', destinationCoords, '경유지:', waypointCoords);

      const allDestinations = [...waypointCoords, destinationCoords];
      const allDestinationNames = [...validWaypoints, destination.trim()];
      
      let optimized;
      
      if (waypointData?.hasConstraints) {
        const constraints = [
          ...waypointData.waypoints.map((wp: any) => ({ 
            locked: wp.locked, 
            order: wp.order 
          })),
          { locked: false }
        ];
        
        console.log('제약 조건:', constraints);
        optimized = optimizeRouteOrderWithConstraints(originCoords, allDestinations, allDestinationNames, constraints);
        
        const lockedCount = constraints.filter(c => c.locked).length;
        updateStatus(`제약 조건 적용 중... (잠긴 경유지: ${lockedCount}개)`, 'loading');
      } else {
        optimized = optimizeRouteOrder(originCoords, allDestinations, allDestinationNames);
      }
      
      console.log('최적화된 순서:', optimized.optimizedNames);
      console.log('예상 총 거리:', optimized.totalDistance.toFixed(1), 'km');

      updateStatus(`경로 최적화 완료! 예상 거리: ${optimized.totalDistance.toFixed(1)}km. 실제 경로를 계산 중...`, 'loading');

      const allOptimizedPoints = [origin.trim(), ...optimized.optimizedNames];
      const segments = [];
      for (let i = 0; i < allOptimizedPoints.length - 1; i++) {
        segments.push({
          origin: allOptimizedPoints[i],
          destination: allOptimizedPoints[i + 1]
        });
      }

      console.log('최적화된 경로 구간:', segments);
      await renderOptimizedRoute(segments, true, travelModes);

    } catch (error) {
      console.error('Route optimization error:', error);
      updateStatus(
        '경로 최적화 중 오류가 발생했습니다. 주소를 정확히 입력해주세요.', 
        'error'
      );
    }
  };

  const planSimpleRoute = async (origin: string, destination: string) => {
    const directionsService = new google.maps.DirectionsService();
    const travelModes = [
      google.maps.TravelMode.DRIVING,
      google.maps.TravelMode.TRANSIT,
      google.maps.TravelMode.WALKING,
      google.maps.TravelMode.BICYCLING
    ];

    for (const travelMode of travelModes) {
      try {
        const request: google.maps.DirectionsRequest = {
          origin: origin.trim(),
          destination: destination.trim(),
          travelMode: travelMode,
          region: 'KR',
          language: 'ko'
        };

        const result = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
          directionsService.route(request, (result, status) => {
            if (status === 'OK' && result) {
              resolve(result);
            } else {
              reject(new Error(`${travelMode}: ${status}`));
            }
          });
        });

        const renderer = new google.maps.DirectionsRenderer({
          draggable: travelMode === google.maps.TravelMode.DRIVING,
          polylineOptions: {
            strokeColor: travelMode === google.maps.TravelMode.DRIVING ? '#4285F4' : 
                        travelMode === google.maps.TravelMode.TRANSIT ? '#34A853' : '#EA4335',
            strokeWeight: 6,
            strokeOpacity: 0.8
          }
        });

        renderer.setDirections(result);
        renderer.setMap(map!);
        setDirectionsRenderers([renderer]);

        const leg = result.routes[0].legs[0];
        const modeText = travelMode === google.maps.TravelMode.DRIVING ? '🚗 자동차' :
                         travelMode === google.maps.TravelMode.TRANSIT ? '🚌 대중교통' : '🚶 도보';

        updateStatus(
          `경로 계획 완료! ${modeText} - 거리: ${leg.distance?.text}, 시간: ${leg.duration?.text}`,
          'success'
        );
        return;

      } catch (err) {
        console.log(`${travelMode} 실패:`, err);
        continue;
      }
    }

    throw new Error('모든 교통수단으로 경로를 찾을 수 없습니다.');
  };

  const renderBasicRoute = async (segments: {origin: string, destination: string}[], segmentTravelModes?: string[]) => {
    const directionsService = new google.maps.DirectionsService();

    let allResults = [];
    let totalDistance = 0;
    let totalDuration = 0;
    let segmentModes = [];

    try {
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const travelModeStr = segmentTravelModes?.[i] || 'DRIVING';
        const travelMode = (google.maps.TravelMode as any)[travelModeStr] || google.maps.TravelMode.DRIVING;
        
        const request: google.maps.DirectionsRequest = {
          origin: segment.origin,
          destination: segment.destination,
          waypoints: [],
          travelMode: travelMode,
          region: 'KR',
          language: 'ko'
        };

        const result = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
          directionsService.route(request, (result, status) => {
            console.log(`${segment.origin} -> ${segment.destination} (${travelModeStr}):`, status);
            if (status === 'OK' && result) {
              resolve(result);
            } else {
              reject(new Error(`${travelModeStr}: ${status}`));
            }
          });
        });

        allResults.push(result);
        segmentModes.push(travelMode);
        
        const leg = result.routes[0].legs[0];
        totalDistance += leg.distance?.value || 0;
        totalDuration += leg.duration?.value || 0;
      }
    } catch (err) {
      console.log('경로 계산 실패:', err);
      throw err;
    }

    if (allResults.length === 0) {
      throw new Error('경로를 찾을 수 없습니다.');
    }

    const newRenderers = [];

    for (let i = 0; i < allResults.length; i++) {
      const result = allResults[i];
      const travelMode = segmentModes[i];
      
      const baseColor = travelMode === google.maps.TravelMode.DRIVING ? '#4285F4' : 
                        travelMode === google.maps.TravelMode.TRANSIT ? '#34A853' : 
                        travelMode === google.maps.TravelMode.BICYCLING ? '#FF9800' : '#EA4335';
      
      const renderer = new google.maps.DirectionsRenderer({
        draggable: travelMode === google.maps.TravelMode.DRIVING,
        polylineOptions: {
          strokeColor: baseColor,
          strokeWeight: 6,
          strokeOpacity: 0.8
        },
        suppressMarkers: i > 0,
        preserveViewport: i > 0
      });

      renderer.setDirections(result);
      renderer.setMap(map!);
      newRenderers.push(renderer);
    }

    setDirectionsRenderers(newRenderers);
    await createSequenceMarkers(segments);

    const distanceText = totalDistance > 0 ? `${(totalDistance / 1000).toFixed(1)}km` : '알 수 없음';
    const durationText = totalDuration > 0 ? `${Math.round(totalDuration / 60)}분` : '알 수 없음';
    
    const modeTexts = segmentModes.map(mode => {
      return mode === google.maps.TravelMode.DRIVING ? '🚗' :
             mode === google.maps.TravelMode.TRANSIT ? '🚌' : 
             mode === google.maps.TravelMode.BICYCLING ? '🚴' : '🚶';
    }).join(' → ');

    updateStatus(
      `경로 계획 완료! ${modeTexts} (${segments.length}개 구간) - 총 거리: ${distanceText}, 총 시간: ${durationText}`,
      'success'
    );
  };

  const renderOptimizedRoute = async (segments: {origin: string, destination: string}[], isOptimized: boolean = false, segmentTravelModes?: string[]) => {
    const directionsService = new google.maps.DirectionsService();

    let allResults = [];
    let totalDistance = 0;
    let totalDuration = 0;
    let segmentModes = [];

    try {
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const travelModeStr = segmentTravelModes?.[i] || 'DRIVING';
        const travelMode = (google.maps.TravelMode as any)[travelModeStr] || google.maps.TravelMode.DRIVING;
        
        const request: google.maps.DirectionsRequest = {
          origin: segment.origin,
          destination: segment.destination,
          waypoints: [],
          travelMode: travelMode,
          region: 'KR',
          language: 'ko'
        };

        const result = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
          directionsService.route(request, (result, status) => {
            console.log(`${segment.origin} -> ${segment.destination} (${travelModeStr}):`, status);
            if (status === 'OK' && result) {
              resolve(result);
            } else {
              reject(new Error(`${travelModeStr}: ${status}`));
            }
          });
        });

        allResults.push(result);
        segmentModes.push(travelMode);
        
        const leg = result.routes[0].legs[0];
        totalDistance += leg.distance?.value || 0;
        totalDuration += leg.duration?.value || 0;
      }
    } catch (err) {
      console.log('최적화된 경로 계산 실패:', err);
      throw err;
    }

    if (allResults.length === 0) {
      throw new Error('최적화된 경로를 찾을 수 없습니다.');
    }

    const newRenderers = [];

    for (let i = 0; i < allResults.length; i++) {
      const result = allResults[i];
      const travelMode = segmentModes[i];
      
      const baseColor = travelMode === google.maps.TravelMode.DRIVING ? '#4285F4' : 
                        travelMode === google.maps.TravelMode.TRANSIT ? '#34A853' : 
                        travelMode === google.maps.TravelMode.BICYCLING ? '#FF9800' : '#EA4335';
      
      const renderer = new google.maps.DirectionsRenderer({
        draggable: travelMode === google.maps.TravelMode.DRIVING,
        polylineOptions: {
          strokeColor: baseColor,
          strokeWeight: 6,
          strokeOpacity: 0.8
        },
        suppressMarkers: i > 0,
        preserveViewport: i > 0
      });

      renderer.setDirections(result);
      renderer.setMap(map!);
      newRenderers.push(renderer);
    }

    setDirectionsRenderers(newRenderers);
    await createSequenceMarkers(segments);

    const distanceText = totalDistance > 0 ? `${(totalDistance / 1000).toFixed(1)}km` : '알 수 없음';
    const durationText = totalDuration > 0 ? `${Math.round(totalDuration / 60)}분` : '알 수 없음';
    
    const modeTexts = segmentModes.map(mode => {
      return mode === google.maps.TravelMode.DRIVING ? '🚗' :
             mode === google.maps.TravelMode.TRANSIT ? '🚌' : 
             mode === google.maps.TravelMode.BICYCLING ? '🚴' : '🚶';
    }).join(' → ');

    const routeTypeText = isOptimized ? '최적화된 경로!' : '경로 계획 완료!';
    updateStatus(
      `${routeTypeText} ${modeTexts} (${segments.length}개 구간) - 총 거리: ${distanceText}, 총 시간: ${durationText}`,
      'success'
    );
  };

  const createSequenceMarkers = async (segments: {origin: string, destination: string}[]) => {
    sequenceMarkers.forEach(marker => marker.setMap(null));
    
    const newSequenceMarkers = [];
    const allPoints = [segments[0].origin, ...segments.map(s => s.destination)];
    
    for (let i = 0; i < allPoints.length; i++) {
      try {
        const coords = await getCoordinates(allPoints[i]);
        
        const markerLabel = i === 0 ? 'START' : 
                           i === allPoints.length - 1 ? 'END' : 
                           i.toString();
        
        const markerColor = i === 0 ? '#4CAF50' : 
                           i === allPoints.length - 1 ? '#F44336' : 
                           '#2196F3';
        
        const marker = new google.maps.Marker({
          position: coords,
          map: map,
          icon: {
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" width="30" height="40" viewBox="0 0 30 40">
                <path d="M15 0C6.7 0 0 6.7 0 15c0 8.3 15 25 15 25s15-16.7 15-25C30 6.7 23.3 0 15 0z" fill="${markerColor}" stroke="white" stroke-width="2"/>
                <text x="15" y="20" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="white">${markerLabel}</text>
              </svg>
            `)}`,
            scaledSize: new google.maps.Size(30, 40),
            anchor: new google.maps.Point(15, 40)
          },
          title: `${i === 0 ? '출발지' : i === allPoints.length - 1 ? '목적지' : `${i}번째 경유지`}: ${allPoints[i]}`,
          zIndex: 1000
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 10px; text-align: center;">
              <h4 style="margin: 0 0 5px 0; color: ${markerColor};">
                ${i === 0 ? '🚩 출발지' : i === allPoints.length - 1 ? '🏁 목적지' : `📍 ${i}번째 경유지`}
              </h4>
              <p style="margin: 0; font-weight: bold;">${allPoints[i]}</p>
              <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">
                ${i === 0 ? '여행의 시작점입니다' : 
                  i === allPoints.length - 1 ? '최종 목적지입니다' : 
                  `${i === 1 ? '첫 번째' : i === 2 ? '두 번째' : i === 3 ? '세 번째' : `${i}번째`} 방문할 장소입니다`}
              </p>
            </div>
          `
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });

        newSequenceMarkers.push(marker);
      } catch (error) {
        console.error(`순서 마커 생성 실패: ${allPoints[i]}`, error);
      }
    }
    
    setSequenceMarkers(newSequenceMarkers);
  };

  const clearRoute = () => {
    directionsRenderers.forEach(renderer => {
      renderer.setMap(null);
    });
    setDirectionsRenderers([]);
    
    sequenceMarkers.forEach(marker => {
      marker.setMap(null);
    });
    setSequenceMarkers([]);
    
    if (directionsRenderers.length > 0 || sequenceMarkers.length > 0) {
      updateStatus('경로가 제거되었습니다.', 'success');
    }
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const calculateBearing = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;
    
    const y = Math.sin(dLng) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
    
    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    return (bearing + 360) % 360; // 0-360도로 정규화
  };

  const getCoordinates = async (address: string): Promise<{lat: number, lng: number}> => {
    const geocoder = new google.maps.Geocoder();
    
    return new Promise((resolve, reject) => {
      geocoder.geocode({
        address: address,
        region: 'KR',
        language: 'ko'
      }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const location = results[0].geometry.location;
          resolve({
            lat: location.lat(),
            lng: location.lng()
          });
        } else {
          reject(new Error(`Geocoding 실패: ${address} - ${status}`));
        }
      });
    });
  };

  const optimizeRouteOrderWithConstraints = (
    origin: Location, 
    destinations: Location[], 
    destinationNames: string[], 
    constraints: { locked: boolean; order?: number }[]
  ): {
    order: number[],
    totalDistance: number,
    optimizedNames: string[]
  } => {
    if (destinations.length === 0) return { order: [], totalDistance: 0, optimizedNames: [] };
    
    const result = [];
    const visited = new Array(destinations.length).fill(false);
    let currentLocation = origin;
    let totalDistance = 0;

    const lockedWaypoints = constraints
      .map((constraint, index) => ({ ...constraint, originalIndex: index }))
      .filter(constraint => constraint.locked)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    for (const locked of lockedWaypoints) {
      const index = locked.originalIndex;
      if (!visited[index]) {
        const distance = calculateDistance(
          currentLocation.lat, currentLocation.lng,
          destinations[index].lat, destinations[index].lng
        );
        
        visited[index] = true;
        result.push({
          index,
          name: destinationNames[index],
          distance,
          locked: true
        });
        totalDistance += distance;
        currentLocation = destinations[index];
      }
    }

    while (result.length < destinations.length) {
      let nearestIndex = -1;
      let nearestDistance = Infinity;

      for (let j = 0; j < destinations.length; j++) {
        if (!visited[j] && !constraints[j].locked) {
          const distance = calculateDistance(
            currentLocation.lat, currentLocation.lng,
            destinations[j].lat, destinations[j].lng
          );
          
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestIndex = j;
          }
        }
      }

      if (nearestIndex !== -1) {
        visited[nearestIndex] = true;
        result.push({
          index: nearestIndex,
          name: destinationNames[nearestIndex],
          distance: nearestDistance,
          locked: false
        });
        totalDistance += nearestDistance;
        currentLocation = destinations[nearestIndex];
      } else {
        break;
      }
    }

    return { 
      order: result.map(r => r.index), 
      totalDistance, 
      optimizedNames: result.map(r => r.name)
    };
  };

  const optimizeRouteOrder = (origin: Location, destinations: Location[], destinationNames: string[]): {
    order: number[],
    totalDistance: number,
    optimizedNames: string[]
  } => {
    const constraints = destinations.map(() => ({ locked: false }));
    return optimizeRouteOrderWithConstraints(origin, destinations, destinationNames, constraints);
  };

  return (
    <div className="App">
      <div className="container">
        <h1>Google Map 경로 최적화</h1>
        
        <Controls
          onGetCurrentLocation={getCurrentLocation}
          onGenerateTreasures={generateTreasures}
          onClearTreasures={clearTreasures}
          onPlanRoute={planRoute}
          onPlanOptimizedRoute={planOptimizedRoute}
          onClearRoute={clearRoute}
        />
        
        <StatusMessage message={status.message} type={status.type} />
        
        <PWAInstaller onStatusUpdate={updateStatus} />
        
        <FirebasePushNotification onStatusUpdate={updateStatus} />
        
        <MapComponent onMapLoad={setMap} />
      </div>
    </div>
  );
}

export default MapPage;