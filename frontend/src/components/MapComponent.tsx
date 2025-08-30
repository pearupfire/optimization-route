import React, { useEffect, useRef } from 'react';
import { Wrapper } from '@googlemaps/react-wrapper';

interface MapComponentProps {
  onMapLoad: (map: google.maps.Map) => void;
}

const MapInner: React.FC<MapComponentProps> = ({ onMapLoad }) => {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mapRef.current) {
      const defaultLocation = { lat: 37.5665, lng: 126.9780 }; // Seoul

      const map = new google.maps.Map(mapRef.current, {
        zoom: 15,
        center: defaultLocation,
        styles: [
          {
            featureType: 'all',
            elementType: 'geometry',
            stylers: [{ color: '#f5f5f5' }]
          },
          {
            featureType: 'water',
            elementType: 'all',
            stylers: [{ color: '#667eea' }]
          },
          {
            featureType: 'road',
            elementType: 'all',
            stylers: [{ color: '#ffffff' }]
          }
        ],
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true
      });

      onMapLoad(map);
    }
  }, [onMapLoad]);

  return <div ref={mapRef} id="map" className="map-container" />;
};

const MapComponent: React.FC<MapComponentProps> = ({ onMapLoad }) => {
  return (
    <Wrapper apiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY || ""}>
      <MapInner onMapLoad={onMapLoad} />
    </Wrapper>
  );
};

export default MapComponent;