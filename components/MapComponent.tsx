'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { Activity, ActivityPoint } from '../types/strava';

import 'mapbox-gl/dist/mapbox-gl.css';

interface MapComponentProps {
  activities: Activity[];
  currentTime: number;
  isPlaying: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export default function MapComponent({ activities, currentTime, isPlaying, isFullscreen, onToggleFullscreen }: MapComponentProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<{ [activityId: string]: mapboxgl.Marker }>({});
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!mapboxToken || mapboxToken === 'your_mapbox_token_here') {
      console.error('Please set your Mapbox access token in .env.local');
      return;
    }

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: [10.7579, 59.9311], // Oslo
      zoom: 14
    });

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  // Handle map resize when switching modes
  useEffect(() => {
    if (map.current) {
      // Small delay to ensure DOM has updated
      setTimeout(() => {
        map.current?.resize();
      }, 100);
    }
  }, [isFullscreen]);

  // Add route sources and layers
  useEffect(() => {
    if (!map.current || !mapLoaded || activities.length === 0) return;

    activities.forEach((activity) => {
      const sourceId = `route-${activity.id}`;
      const layerId = `route-layer-${activity.id}`;

      // Create GeoJSON from activity points
      const routeGeoJSON = {
        type: 'Feature' as const,
        properties: {},
        geometry: {
          type: 'LineString' as const,
          coordinates: activity.points.map(point => [point.lng, point.lat])
        }
      };

      // Add source
      if (!map.current!.getSource(sourceId)) {
        map.current!.addSource(sourceId, {
          type: 'geojson',
          data: routeGeoJSON
        });

        // Add layer
        map.current!.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': activity.athlete.color,
            'line-width': 4,
            'line-opacity': 0.7
          }
        });
      }

      // Create marker for current position
      if (!markers.current[activity.id]) {
        const el = document.createElement('div');
        el.className = 'marker';
        el.style.backgroundColor = activity.athlete.color;
        el.style.width = '12px';
        el.style.height = '12px';
        el.style.borderRadius = '50%';
        el.style.border = '2px solid white';
        el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';

        markers.current[activity.id] = new mapboxgl.Marker(el)
          .setLngLat([activity.points[0].lng, activity.points[0].lat])
          .addTo(map.current!);
      }
    });

    // Fit map to show all routes if we have activities
    if (activities.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      activities.forEach(activity => {
        activity.points.forEach(point => {
          bounds.extend([point.lng, point.lat]);
        });
      });
      map.current!.fitBounds(bounds, { padding: 50 });
    }

  }, [activities, mapLoaded]);

  // Update marker positions based on current time
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    activities.forEach((activity) => {
      const marker = markers.current[activity.id];
      if (!marker) return;

      // Find the current position based on time
      const currentPoint = getCurrentPosition(activity.points, currentTime);
      if (currentPoint) {
        marker.setLngLat([currentPoint.lng, currentPoint.lat]);
      }
    });
  }, [currentTime, activities, mapLoaded]);

  return (
    <div className={`relative h-full w-full ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : ''}`}>
      <div ref={mapContainer} className="h-full w-full" />
      
      {/* Fullscreen toggle button */}
      {onToggleFullscreen && (
        <button
          onClick={onToggleFullscreen}
          className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg p-2 hover:bg-white transition-colors shadow-lg"
          title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          {isFullscreen ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
            </svg>
          )}
        </button>
      )}

      {/* Current activity stats overlay in fullscreen */}
      {isFullscreen && activities.length > 0 && (
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg p-4 min-w-96 shadow-lg">
          <h3 className="font-semibold text-lg mb-3">Race Progress</h3>
          <div className="space-y-3 max-h-72 overflow-y-auto">
            {activities
              .map(activity => {
                const currentStats = getCurrentPositionStats(activity, currentTime);
                return { activity, stats: currentStats };
              })
              .sort((a, b) => (b.stats?.distance || 0) - (a.stats?.distance || 0))
              .map(({ activity, stats }, index) => (
                <div key={activity.id} className="border-b border-gray-100 pb-2 last:border-b-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: activity.athlete.color }}
                      />
                      <span className="font-medium text-sm">{activity.athlete.name}</span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        #{index + 1}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 ml-5">
                    <div>
                      <span className="block font-medium">Distance</span>
                      <span className="font-mono">{stats ? `${(stats.distance / 1000).toFixed(2)}km` : '0km'}</span>
                    </div>
                    <div>
                      <span className="block font-medium">Speed</span>
                      <span className="font-mono">{stats ? formatSpeed(stats.speed) : '0.0 km/h'}</span>
                    </div>
                    <div>
                      <span className="block font-medium">Pace</span>
                      <span className="font-mono">{stats ? formatPace(stats.speed) : '--:--'}</span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {(!process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || 
        process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN === 'your_mapbox_token_here') && (
        <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
          <div className="text-center p-4">
            <p className="text-gray-600 mb-2">Please set your Mapbox access token</p>
            <p className="text-sm text-gray-500">
              Add NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN to your .env.local file
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to get current position stats for fullscreen overlay
function getCurrentPositionStats(activity: Activity, currentTime: number) {
  const currentPoint = getCurrentPosition(activity.points, currentTime);
  if (!currentPoint) return null;

  // Calculate current speed based on recent movement
  const points = activity.points;
  let speed = 0;
  
  // Find the segment this point is in and calculate speed
  for (let i = 0; i < points.length - 1; i++) {
    if (currentTime >= points[i].time && currentTime <= points[i + 1].time) {
      const timeDiff = points[i + 1].time - points[i].time;
      const distDiff = (points[i + 1].distance || 0) - (points[i].distance || 0);
      if (timeDiff > 0) {
        speed = (distDiff / timeDiff) * 3.6; // Convert m/s to km/h
      }
      break;
    }
  }

  return {
    distance: currentPoint.distance || 0,
    lat: currentPoint.lat,
    lng: currentPoint.lng,
    speed: speed
  };
}

// Format speed as km/h
function formatSpeed(speed: number): string {
  return `${speed.toFixed(1)} km/h`;
}

// Format pace as min/km
function formatPace(speed: number): string {
  if (speed <= 0) return '--:--';
  
  const paceMinutesPerKm = 60 / speed; // minutes per km
  const minutes = Math.floor(paceMinutesPerKm);
  const seconds = Math.round((paceMinutesPerKm - minutes) * 60);
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Helper function to get current position based on time
function getCurrentPosition(points: ActivityPoint[], currentTime: number): ActivityPoint | null {
  if (points.length === 0) return null;
  
  // If before start, return first point
  if (currentTime <= points[0].time) {
    return points[0];
  }
  
  // If after end, return last point
  if (currentTime >= points[points.length - 1].time) {
    return points[points.length - 1];
  }
  
  // Find the two points to interpolate between
  for (let i = 0; i < points.length - 1; i++) {
    if (currentTime >= points[i].time && currentTime <= points[i + 1].time) {
      const progress = (currentTime - points[i].time) / (points[i + 1].time - points[i].time);
      
      // Linear interpolation
      return {
        lat: points[i].lat + (points[i + 1].lat - points[i].lat) * progress,
        lng: points[i].lng + (points[i + 1].lng - points[i].lng) * progress,
        time: currentTime,
        distance: points[i].distance ? 
          points[i].distance! + (points[i + 1].distance! - points[i].distance!) * progress : 
          undefined,
        elevation: points[i].elevation ? 
          points[i].elevation! + (points[i + 1].elevation! - points[i].elevation!) * progress : 
          undefined
      };
    }
  }
  
  return points[points.length - 1];
}