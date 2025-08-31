import React, { useEffect, useRef } from 'react';
import { Location } from '../types/kakao';

declare global {
  interface Window {
    kakao: any;
  }
}

interface KakaoMapComponentProps {
  onMapLoad: (map: any) => void;
  userPosition?: Location | null;
  width?: string;
  height?: string;
}

const KakaoMapComponent: React.FC<KakaoMapComponentProps> = ({ 
  onMapLoad, 
  userPosition,
  width = '100%', 
  height = '400px' 
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 스크립트가 이미 index.html에 로드되어 있음
    if (window.kakao && window.kakao.maps) {
      window.kakao.maps.load(() => {
        initializeMap();
      });
    } else {
      // API가 아직 로드되지 않았다면 잠시 기다림
      const checkInterval = setInterval(() => {
        if (window.kakao && window.kakao.maps) {
          clearInterval(checkInterval);
          window.kakao.maps.load(() => {
            initializeMap();
          });
        }
      }, 100);

      // 10초 후 타임아웃
      setTimeout(() => {
        clearInterval(checkInterval);
        console.error('Kakao Maps API load timeout');
      }, 10000);
    }

    function initializeMap() {
      if (!window.kakao || !window.kakao.maps || !window.kakao.maps.LatLng) {
        console.error('Kakao Maps API is not properly loaded');
        return;
      }

      if (mapContainer.current) {
        const options = {
          center: new window.kakao.maps.LatLng(37.5665, 126.9780), // Seoul
          level: 3
        };

        const map = new window.kakao.maps.Map(mapContainer.current, options);
        
        // 지도 클릭 이벤트
        window.kakao.maps.event.addListener(map, 'click', (mouseEvent: any) => {
          const latlng = mouseEvent.latLng;
          console.log('지도 클릭:', latlng.getLat(), latlng.getLng());
        });
        
        onMapLoad(map);
      }
    }
  }, [onMapLoad]);

  // 사용자 위치가 변경되면 지도 중심 이동
  useEffect(() => {
    // 이 효과는 부모 컴포넌트에서 직접 처리됨
  }, [userPosition]);

  return (
    <div 
      ref={mapContainer} 
      className="map-container"
      style={{ 
        width, 
        height
      }}
    />
  );
};

export default KakaoMapComponent;