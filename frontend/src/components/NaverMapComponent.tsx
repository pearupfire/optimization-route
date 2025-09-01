import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    naver: any;
  }
}

interface NaverMapComponentProps {
  onMapLoad?: (map: any) => void;
}

const NaverMapComponent: React.FC<NaverMapComponentProps> = ({ onMapLoad }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    // 네이버 지도 API 인증 실패 처리
    (window as any).navermap_authFailure = function() {
      console.error('Naver Maps API 인증에 실패했습니다. API 키를 확인해주세요.');
      alert('네이버 지도 API 인증에 실패했습니다. API 키를 확인해주세요.');
    };

    const initializeMap = () => {
      if (mapRef.current && window.naver && window.naver.maps) {
        const defaultLocation = new window.naver.maps.LatLng(37.5665, 126.9780); // Seoul

        const mapOptions = {
          center: defaultLocation,
          zoom: 15,
          mapTypeControl: true,
          mapTypeControlOptions: {
            style: window.naver.maps.MapTypeControlStyle.BUTTON,
            position: window.naver.maps.Position.TOP_RIGHT
          },
          zoomControl: true,
          zoomControlOptions: {
            style: window.naver.maps.ZoomControlStyle.LARGE,
            position: window.naver.maps.Position.TOP_LEFT
          }
        };

        mapInstance.current = new window.naver.maps.Map(mapRef.current, mapOptions);
        
        if (onMapLoad) {
          onMapLoad(mapInstance.current);
        }
      }
    };

    const loadNaverMapScript = () => {
      if (window.naver && window.naver.maps) {
        initializeMap();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${process.env.REACT_APP_NAVER_MAP_CLIENT_ID}`;
      script.async = true;
      script.onload = initializeMap;
      script.onerror = () => {
        console.error('Failed to load Naver Maps API');
      };
      
      document.head.appendChild(script);

      return () => {
        document.head.removeChild(script);
      };
    };

    const cleanup = loadNaverMapScript();

    return () => {
      if (cleanup) cleanup();
    };
  }, [onMapLoad]);

  return (
    <div 
      ref={mapRef} 
      id="naverMap" 
      className="map-container"
      style={{ 
        width: '100%', 
        height: '500px',
        border: '1px solid #ddd',
        borderRadius: '8px'
      }} 
    />
  );
};

export default NaverMapComponent;