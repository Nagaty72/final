'use client';
import { useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

if (typeof window !== 'undefined') {
  window.L = L;
  require('leaflet.heat');
}

const HeatmapLayer = ({ points }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !points || points.length === 0) return;

    // Default configuration for heat layer
    const heatLayer = L.heatLayer(points, {
      radius: 25,
      blur: 15,
      maxZoom: 10,
      gradient: {
        0.4: 'blue',
        0.6: 'cyan',
        0.7: 'lime',
        0.8: 'yellow',
        1.0: 'red'
      }
    }).addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, points]);

  return null;
};

export default function HeatmapComponent({ points }) {
  // Approximate bounds for Egypt to keep the map restricted
  const maxBounds = [
    [21.5, 24.5], // South-West coordinates
    [32.0, 37.0]  // North-East coordinates
  ];

  return (
    <MapContainer 
      center={[26.8206, 30.8025]} 
      zoom={6} 
      style={{ height: '100%', width: '100%', borderRadius: '12px', zIndex: 0 }}
      maxBounds={maxBounds}
      maxBoundsViscosity={1.0}
      minZoom={5}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      <HeatmapLayer points={points} />
    </MapContainer>
  );
}
