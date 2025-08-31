import React, { useState } from 'react';
import { MarkerType, WaypointData } from '../types/kakao';

interface KakaoControlsProps {
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
  onOpenRealRoute?: (travelMode: string) => void;
}

const KakaoControls: React.FC<KakaoControlsProps> = ({
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
  onClearRoute,
  onOpenRealRoute
}) => {
  const handleMarkerTypeChange = (type: MarkerType) => {
    onSetMarkerType(type);
    onMarkerUpdate(type, currentColor);
  };

  const handleColorChange = (color: string) => {
    onUpdateMarkerColor(color);
    onMarkerUpdate(currentMarkerType, color);
  };

  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [waypoints, setWaypoints] = useState<WaypointData[]>([
    { address: '', locked: false, travelMode: 'DRIVING' }
  ]);

  const addWaypoint = () => {
    setWaypoints([...waypoints, { address: '', locked: false, travelMode: 'DRIVING' }]);
  };

  const removeWaypoint = (index: number) => {
    setWaypoints(waypoints.filter((_, i) => i !== index));
  };

  const updateWaypoint = (index: number, field: keyof WaypointData, value: any) => {
    const updated = waypoints.map((wp, i) => 
      i === index ? { ...wp, [field]: value } : wp
    );
    setWaypoints(updated);
  };

  const handlePlanRoute = () => {
    if (!origin.trim() || !destination.trim()) {
      alert('출발지와 목적지를 입력해주세요.');
      return;
    }
    
    const waypointAddresses = waypoints
      .filter(wp => wp.address.trim())
      .map(wp => wp.address.trim());
    
    onPlanRoute(origin.trim(), destination.trim(), waypointAddresses);
  };

  const handlePlanOptimizedRoute = () => {
    if (!origin.trim() || !destination.trim()) {
      alert('출발지와 목적지를 입력해주세요.');
      return;
    }
    
    const waypointAddresses = waypoints
      .filter(wp => wp.address.trim())
      .map(wp => wp.address.trim());
    
    if (waypointAddresses.length === 0) {
      alert('최소 1개의 경유지를 입력해주세요.');
      return;
    }
    
    onPlanOptimizedRoute(origin.trim(), destination.trim(), waypointAddresses);
  };

  return (
    <>
      {/* 기본 컨트롤 */}
      <div className="controls">
        <button className="btn" onClick={onGetCurrentLocation}>
          🎯 내 위치 찾기
        </button>
        
        <button className="btn" onClick={onGenerateTreasures}>
          💎 보물 생성
        </button>
        
        <button className="btn" onClick={onClearTreasures}>
          🗑️ 보물 삭제
        </button>
        
        <div className="marker-options">
          <div 
            className={`marker-option ${currentMarkerType === 'image' ? 'active' : ''}`}
            onClick={() => handleMarkerTypeChange('image')}
          >
            🎨 이미지 마커
          </div>
        </div>
      </div>

      {/* 경로 계획 컨트롤 */}
      <div className="route-controls">
        <h3>🛣️ 경로 최적화</h3>
        <div className="route-input-group">
          <label>출발지:</label>
          <input
            type="text"
            className="route-input"
            placeholder="예: 서울역"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
          />
        </div>
        
        <div className="waypoints-section">
          <div className="waypoint-header">
            <label>경유지:</label>
            <button className="btn-small" onClick={addWaypoint}>
              ➕ 경유지 추가
            </button>
          </div>
          
          {waypoints.map((waypoint, index) => (
            <div key={index} className="waypoint-input-group">
              <input
                type="text"
                className="route-input"
                placeholder={`경유지 ${index + 1}`}
                value={waypoint.address}
                onChange={(e) => updateWaypoint(index, 'address', e.target.value)}
              />
              
              <select
                className="travel-mode-select"
                value={waypoint.travelMode}
                onChange={(e) => updateWaypoint(index, 'travelMode', e.target.value)}
                title="교통수단"
              >
                <option value="DRIVING">🚗 자동차</option>
                <option value="TRANSIT">🚌 대중교통</option>
                <option value="WALKING">🚶 도보</option>
                <option value="BICYCLING">🚴 자전거</option>
              </select>
              
              <button
                className={`lock-btn ${waypoint.locked ? 'locked' : ''}`}
                onClick={() => updateWaypoint(index, 'locked', !waypoint.locked)}
                title={waypoint.locked ? '잠금 해제 (최적화 가능)' : '순서 잠금 (노을/일출 등 시간 제약)'}
              >
                {waypoint.locked ? '🔒' : '🔓'}
              </button>
              
              <button
                className="remove-btn"
                onClick={() => removeWaypoint(index)}
                title="경유지 제거"
              >
                ❌
              </button>
            </div>
          ))}
        </div>
        
        <div className="route-input-group">
          <label>목적지:</label>
          <input
            type="text"
            className="route-input"
            placeholder="예: 강남역"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          />
        </div>
        
        <div className="controls">
          <button className="btn" onClick={handlePlanRoute}>
            📍 경로 계획
          </button>
          <button className="btn optimize-btn" onClick={handlePlanOptimizedRoute}>
            🎯 최적화 경로
          </button>
          <button className="btn" onClick={onClearRoute}>
            🗑️ 경로 삭제
          </button>
        </div>
        
        {/* 실제 경로 보기 버튼들 */}
        <div className="real-route-section">
          <h4 style={{textAlign: 'center', margin: '20px 0 10px', color: '#333'}}>
            🛣️ 카카오맵에서 실제 경로 보기
          </h4>
          <div className="controls">
            <button 
              className="btn" 
              onClick={() => onOpenRealRoute && onOpenRealRoute('DRIVING')}
              style={{ background: 'linear-gradient(45deg, #FF6B35, #F7931E)' }}
            >
              🚗 자동차
            </button>
            <button 
              className="btn" 
              onClick={() => onOpenRealRoute && onOpenRealRoute('WALKING')}
              style={{ background: 'linear-gradient(45deg, #4ECDC4, #44A08D)' }}
            >
              🚶 도보
            </button>
            <button 
              className="btn" 
              onClick={() => onOpenRealRoute && onOpenRealRoute('BICYCLING')}
              style={{ background: 'linear-gradient(45deg, #A8E6CF, #7FCDCD)' }}
            >
              🚴 자전거
            </button>
            <button 
              className="btn" 
              onClick={() => onOpenRealRoute && onOpenRealRoute('TRANSIT')}
              style={{ background: 'linear-gradient(45deg, #667eea, #764ba2)' }}
            >
              🚌 대중교통
            </button>
          </div>
          <p style={{textAlign: 'center', fontSize: '12px', color: '#666', margin: '10px 0'}}>
            ⚡ 먼저 경로를 계획한 후 위 버튼을 클릭하면 카카오맵에서 실제 도로 경로를 확인할 수 있습니다
          </p>
        </div>
      </div>
    </>
  );
};

export default KakaoControls;