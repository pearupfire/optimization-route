import React, { useState } from 'react';
import { MarkerType } from '../types';

interface ControlsProps {
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

const Controls: React.FC<ControlsProps> = ({
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

  const handleColorChange = (color: string) => {
    onUpdateMarkerColor(color);
    onMarkerUpdate(currentMarkerType, color);
  };

  interface WaypointData {
    address: string;
    locked: boolean;
    timeConstraint?: string; // HH:MM 형식
    order?: number; // 잠긴 경우 고정 순서
    travelMode?: 'DRIVING' | 'TRANSIT' | 'WALKING' | 'BICYCLING'; // 해당 구간의 교통수단
  }

  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [waypoints, setWaypoints] = useState<WaypointData[]>([
    { address: '', locked: false, travelMode: 'DRIVING' }
  ]);
  const [originTravelMode, setOriginTravelMode] = useState<'DRIVING' | 'TRANSIT' | 'WALKING' | 'BICYCLING'>('DRIVING');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const addWaypoint = () => {
    setWaypoints([...waypoints, { address: '', locked: false, travelMode: 'DRIVING' }]);
  };

  const removeWaypoint = (index: number) => {
    setWaypoints(waypoints.filter((_, i) => i !== index));
  };

  const updateWaypoint = (index: number, value: string) => {
    const newWaypoints = [...waypoints];
    newWaypoints[index] = { ...newWaypoints[index], address: value };
    setWaypoints(newWaypoints);
  };

  const toggleWaypointLock = (index: number) => {
    const newWaypoints = [...waypoints];
    const wasLocked = newWaypoints[index].locked;
    
    if (wasLocked) {
      // 잠금 해제
      newWaypoints[index] = {
        ...newWaypoints[index],
        locked: false,
        timeConstraint: undefined,
        order: undefined
      };
    } else {
      // 잠금 설정 - 현재 순서로 고정
      newWaypoints[index] = {
        ...newWaypoints[index],
        locked: true,
        order: index + 1 // 1-based order
      };
    }
    
    setWaypoints(newWaypoints);
  };

  const updateTimeConstraint = (index: number, time: string) => {
    const newWaypoints = [...waypoints];
    newWaypoints[index] = {
      ...newWaypoints[index],
      timeConstraint: time
    };
    setWaypoints(newWaypoints);
  };

  const updateWaypointTravelMode = (index: number, mode: 'DRIVING' | 'TRANSIT' | 'WALKING' | 'BICYCLING') => {
    const newWaypoints = [...waypoints];
    newWaypoints[index] = {
      ...newWaypoints[index],
      travelMode: mode
    };
    setWaypoints(newWaypoints);
  };

  const handlePlanRoute = () => {
    if (origin && destination) {
      const validWaypoints = waypoints
        .filter(wp => wp.address.trim() !== '')
        .map(wp => wp.address);
      
      const travelModes = [originTravelMode, ...waypoints
        .filter(wp => wp.address.trim() !== '')
        .map(wp => wp.travelMode!)
      ];
      
      (onPlanRoute as any)(origin, destination, validWaypoints, travelModes);
    }
  };

  const handlePlanOptimizedRoute = () => {
    if (origin && destination) {
      // 잠금된 경유지와 일반 경유지 분리
      const validWaypoints = waypoints.filter(wp => wp.address.trim() !== '');
      const waypointData = {
        waypoints: validWaypoints,
        hasConstraints: validWaypoints.some(wp => wp.locked)
      };
      
      const travelModes = [originTravelMode, ...validWaypoints.map(wp => wp.travelMode!)];
      
      // onPlanOptimizedRoute에 추가 데이터 전달
      (onPlanOptimizedRoute as any)(origin, destination, validWaypoints.map(wp => wp.address), waypointData, travelModes);
    }
  };

  // 드래그 앤 드롭 핸들러들
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    // 잠긴 경유지는 드래그 불가
    if (waypoints[draggedIndex].locked || waypoints[dropIndex].locked) {
      setDraggedIndex(null);
      return;
    }

    const newWaypoints = [...waypoints];
    const draggedItem = newWaypoints[draggedIndex];
    
    // 드래그된 아이템 제거
    newWaypoints.splice(draggedIndex, 1);
    
    // 새 위치에 삽입
    const adjustedDropIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex;
    newWaypoints.splice(adjustedDropIndex, 0, draggedItem);
    
    setWaypoints(newWaypoints);
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="controls">
      <button className="btn" onClick={onGetCurrentLocation}>
        📍 내 위치 찾기
      </button>
      <button className="btn" onClick={onGenerateTreasures}>
        💎 보물 생성
      </button>
      <button className="btn" onClick={onClearTreasures}>
        🗑️ 보물 지우기
      </button>
      
      <div className="marker-options">
        <div 
          className={`marker-option ${currentMarkerType === 'image' ? 'active' : ''}`}
          onClick={() => handleMarkerTypeChange('image')}
        >
          🖼️ 이미지 마커
        </div>
      </div>
      
      <div className="route-controls">
        <h3>🗺️ 경로 계획</h3>
        <p className="route-help">
          💡 정확한 주소나 잘 알려진 장소명을 입력해주세요.<br/>
          예시: "서울역", "강남구청", "명동성당", "홍대입구역"
        </p>
        
        <div className="route-input-group">
          <label>출발지:</label>
          <input
            type="text"
            className="route-input"
            placeholder="예: 서울역, 강남구청"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
          />
          <div className="travel-mode-selector">
            <label>교통수단:</label>
            <select 
              value={originTravelMode} 
              onChange={(e) => setOriginTravelMode(e.target.value as any)}
              className="travel-mode-select"
            >
              <option value="DRIVING">🚗 자동차</option>
              <option value="TRANSIT">🚌 대중교통</option>
              <option value="WALKING">🚶 도보</option>
              <option value="BICYCLING">🚴 자전거</option>
            </select>
          </div>
        </div>

        <div className="waypoints-section">
          <label>경유지 (🔒 잠금으로 순서 고정 가능):</label>
          {waypoints.map((waypoint, index) => (
            <div 
              key={index} 
              className={`waypoint-input-group ${draggedIndex === index ? 'dragging' : ''} ${waypoint.locked ? 'locked' : ''}`}
              draggable={waypoints.length > 1 && !waypoint.locked}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
            >
              <div className={`drag-handle ${waypoint.locked ? 'locked' : ''}`}>
                <span className="drag-icon">{waypoint.locked ? '🔒' : '⋮⋮'}</span>
              </div>
              
              <div className="waypoint-main">
                <input
                  type="text"
                  className="route-input"
                  placeholder={`경유지 ${index + 1} (예: 명동역, 노을 명소)`}
                  value={waypoint.address}
                  onChange={(e) => updateWaypoint(index, e.target.value)}
                />
                
                <div className="travel-mode-selector">
                  <label>교통수단:</label>
                  <select 
                    value={waypoint.travelMode || 'DRIVING'} 
                    onChange={(e) => updateWaypointTravelMode(index, e.target.value as any)}
                    className="travel-mode-select"
                  >
                    <option value="DRIVING">🚗 자동차</option>
                    <option value="TRANSIT">🚌 대중교통</option>
                    <option value="WALKING">🚶 도보</option>
                    <option value="BICYCLING">🚴 자전거</option>
                  </select>
                  <span className="travel-mode-help">다음 구간으로</span>
                </div>
                
                {waypoint.locked && (
                  <div className="time-constraint">
                    <label className="time-label">방문 시간:</label>
                    <input
                      type="time"
                      className="time-input"
                      value={waypoint.timeConstraint || ''}
                      onChange={(e) => updateTimeConstraint(index, e.target.value)}
                      placeholder="HH:MM"
                    />
                    <span className="constraint-info">
                      순서: {waypoint.order}번째
                    </span>
                  </div>
                )}
              </div>

              <div className="waypoint-controls">
                <button 
                  className={`lock-btn ${waypoint.locked ? 'locked' : ''}`}
                  onClick={() => toggleWaypointLock(index)}
                  title={waypoint.locked ? '잠금 해제 (최적화 가능)' : '순서 잠금 (노을/일출 등 시간 제약)'}
                >
                  {waypoint.locked ? '🔒' : '🔓'}
                </button>
                
                {waypoints.length > 1 && (
                  <button 
                    className="remove-waypoint-btn"
                    onClick={() => removeWaypoint(index)}
                  >
                    ❌
                  </button>
                )}
              </div>
            </div>
          ))}
          <button className="add-waypoint-btn" onClick={addWaypoint}>
            ➕ 경유지 추가
          </button>
        </div>

        <div className="route-input-group">
          <label>목적지:</label>
          <input
            type="text"
            className="route-input"
            placeholder="예: 홍대입구역, 이태원역"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          />
        </div>

        <div className="route-buttons">
          <button className="btn route-btn" onClick={handlePlanRoute}>
            🚗 경로 계획
          </button>
          <button className="btn route-btn optimize-btn" onClick={handlePlanOptimizedRoute}>
            🎯 최적화 경로
          </button>
          <button className="btn route-btn" onClick={onClearRoute}>
            🗑️ 경로 지우기
          </button>
        </div>
      </div>
      
    </div>
  );
};

export default Controls;