import React, { useState } from 'react';
import { MarkerType } from '../types';

interface NaverControlsProps {
  onGetCurrentLocation: () => void;
  onGenerateTreasures: () => void;
  onClearTreasures: () => void;
  currentMarkerType: MarkerType;
  onSetMarkerType: (type: MarkerType) => void;
  currentColor: string;
  onUpdateMarkerColor: (color: string) => void;
  onMarkerUpdate: (type: MarkerType, color: string) => void;
  onPlanRoute: (origin: string, destination: string, waypoints: string[]) => void;
  onPlanOptimizedRoute: (origin: string, destination: string, waypoints: string[]) => void;
  onClearRoute: () => void;
}

const NaverControls: React.FC<NaverControlsProps> = ({
  onGetCurrentLocation,
  onGenerateTreasures,
  onClearTreasures,
  currentMarkerType,
  onSetMarkerType,
  currentColor,
  onUpdateMarkerColor,
  onMarkerUpdate,
  onPlanRoute,
  onPlanOptimizedRoute,
  onClearRoute
}) => {
  const handleMarkerTypeChange = (type: MarkerType) => {
    onSetMarkerType(type);
    onMarkerUpdate(type, currentColor);
  };

  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [waypoints, setWaypoints] = useState(['']);
  const [transportMode, setTransportMode] = useState<'car' | 'public' | 'walk' | 'bicycle'>('car');

  const addWaypoint = () => {
    setWaypoints([...waypoints, '']);
  };

  const removeWaypoint = (index: number) => {
    setWaypoints(waypoints.filter((_, i) => i !== index));
  };

  const updateWaypoint = (index: number, value: string) => {
    const newWaypoints = [...waypoints];
    newWaypoints[index] = value;
    setWaypoints(newWaypoints);
  };

  const openNaverMapApp = (routeType: string, start: string, dest: string, waypoints: string[] = []) => {
    // URL 인코딩
    const encodeParam = (str: string) => encodeURIComponent(str);
    
    let url = `nmap://route/${routeType}?`;
    
    // 목적지 설정
    url += `dname=${encodeParam(dest)}`;
    
    // 출발지 설정 (지정되지 않으면 현재 위치 사용)
    if (start) {
      url += `&sname=${encodeParam(start)}`;
    }
    
    // 경유지 설정 (최대 5개까지)
    waypoints.slice(0, 5).forEach((waypoint, index) => {
      if (waypoint.trim()) {
        url += `&v${index + 1}name=${encodeParam(waypoint)}`;
      }
    });
    
    // 앱 이름 설정
    url += `&appname=${encodeParam(window.location.origin)}`;
    
    console.log('네이버 지도 앱 열기:', url);
    
    // 새 창에서 URL Scheme 실행
    const newWindow = window.open(url, '_blank');
    
    // URL Scheme이 실행되지 않으면 네이버 지도 다운로드 페이지로 이동
    setTimeout(() => {
      if (newWindow) {
        newWindow.location.href = 'https://play.google.com/store/apps/details?id=com.nhn.android.nmap';
      }
    }, 1000);
  };

  const handlePlanRoute = () => {
    if (origin && destination) {
      const validWaypoints = waypoints.filter(wp => wp.trim() !== '');
      
      if (transportMode === 'car') {
        // 자동차: 웹에서 실제 경로 표시
        onPlanRoute(origin, destination, validWaypoints);
      } else {
        // 대중교통/도보/자전거: 네이버 지도 앱으로 연결
        const routeType = transportMode === 'public' ? 'public' : 
                         transportMode === 'walk' ? 'walk' : 'bicycle';
        openNaverMapApp(routeType, origin, destination, validWaypoints);
      }
    }
  };

  const handlePlanOptimizedRoute = () => {
    if (origin && destination) {
      const validWaypoints = waypoints.filter(wp => wp.trim() !== '');
      
      if (transportMode === 'car') {
        // 자동차: 웹에서 최적화된 경로 표시
        onPlanOptimizedRoute(origin, destination, validWaypoints);
      } else {
        // 다른 교통수단은 최적화 미지원
        alert('최적화된 경로는 자동차 모드에서만 지원됩니다. 일반 경로로 진행합니다.');
        const routeType = transportMode === 'public' ? 'public' : 
                         transportMode === 'walk' ? 'walk' : 'bicycle';
        openNaverMapApp(routeType, origin, destination, validWaypoints);
      }
    }
  };

  return (
    <div className="controls">
      <button className="btn" onClick={onGetCurrentLocation} style={{
        padding: '8px 16px',
        backgroundColor: '#1EC800',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        marginRight: '10px'
      }}>
        📍 내 위치 찾기
      </button>
      <button className="btn" onClick={onGenerateTreasures} style={{
        padding: '8px 16px',
        backgroundColor: '#FF6B35',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        marginRight: '10px'
      }}>
        💎 보물 생성
      </button>
      <button className="btn" onClick={onClearTreasures} style={{
        padding: '8px 16px',
        backgroundColor: '#666',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        marginRight: '10px'
      }}>
        🗑️ 보물 지우기
      </button>
      
      <div className="marker-options" style={{ margin: '20px 0' }}>
        <div 
          style={{
            padding: '8px 12px',
            backgroundColor: currentMarkerType === 'image' ? '#1EC800' : '#f0f0f0',
            color: currentMarkerType === 'image' ? 'white' : '#333',
            cursor: 'pointer',
            borderRadius: '4px',
            display: 'inline-block'
          }}
          onClick={() => handleMarkerTypeChange('image')}
        >
          🖼️ 이미지 마커
        </div>
      </div>
      
      <div className="route-controls" style={{ 
        marginTop: '20px', 
        padding: '20px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '8px' 
      }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>🗺️ 네이버 지도 경로 계획</h3>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>출발지:</label>
          <input
            type="text"
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
            placeholder="예: 서울역, 강남구청, 명동"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '10px', 
            fontWeight: 'bold' 
          }}>
            경유지 (선택사항):
          </label>
          {waypoints.map((waypoint, index) => (
            <div key={index} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              marginBottom: '8px',
              gap: '8px'
            }}>
              <input
                type="text"
                style={{
                  flex: 1,
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
                placeholder={`경유지 ${index + 1} (예: 홍대입구역, 이태원역)`}
                value={waypoint}
                onChange={(e) => updateWaypoint(index, e.target.value)}
              />
              {waypoints.length > 1 && (
                <button 
                  onClick={() => removeWaypoint(index)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  제거
                </button>
              )}
            </div>
          ))}
          <button 
            onClick={addWaypoint}
            style={{
              padding: '6px 12px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              marginTop: '5px'
            }}
          >
            ➕ 경유지 추가
          </button>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>목적지:</label>
          <input
            type="text"
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
            placeholder="예: 부산역, 제주공항, 경복궁"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>교통수단 선택:</label>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {[
              { value: 'car', label: '🚗 자동차', color: '#1EC800' },
              { value: 'public', label: '🚇 대중교통', color: '#007bff' },
              { value: 'walk', label: '🚶 도보', color: '#28a745' },
              { value: 'bicycle', label: '🚲 자전거', color: '#ffc107' }
            ].map((mode) => (
              <button
                key={mode.value}
                onClick={() => setTransportMode(mode.value as any)}
                style={{
                  padding: '8px 12px',
                  backgroundColor: transportMode === mode.value ? mode.color : '#f8f9fa',
                  color: transportMode === mode.value ? 'white' : '#333',
                  border: `1px solid ${mode.color}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: transportMode === mode.value ? 'bold' : 'normal'
                }}
              >
                {mode.label}
              </button>
            ))}
          </div>
          {transportMode !== 'car' && (
            <p style={{ 
              fontSize: '12px', 
              color: '#666', 
              marginTop: '5px',
              fontStyle: 'italic'
            }}>
              ⚠️ {transportMode === 'public' ? '대중교통' : transportMode === 'walk' ? '도보' : '자전거'} 경로는 네이버 지도 앱으로 연결됩니다.
            </p>
          )}
        </div>

        <div style={{ 
          display: 'flex', 
          gap: '10px', 
          flexWrap: 'wrap' 
        }}>
          <button 
            onClick={handlePlanRoute}
            style={{
              padding: '10px 16px',
              backgroundColor: '#1EC800',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            🚗 경로 계획
          </button>
          <button 
            onClick={handlePlanOptimizedRoute}
            style={{
              padding: '10px 16px',
              backgroundColor: '#FF6B35',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            🎯 최적화 경로
          </button>
          <button 
            onClick={onClearRoute}
            style={{
              padding: '10px 16px',
              backgroundColor: '#666',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            🗑️ 경로 지우기
          </button>
        </div>
        
        <div style={{ marginTop: '15px', fontSize: '12px', color: '#666' }}>
          <p style={{ margin: '5px 0' }}>💡 팁: 네이버 지도에서 경로 직선을 그려서 대략적인 경로를 보여줍니다.</p>
          <p style={{ margin: '5px 0' }}>🎯 최적화 경로는 Nearest Neighbor 알고리즘으로 최단 거리를 계산합니다.</p>
        </div>
      </div>
    </div>
  );
};

export default NaverControls;