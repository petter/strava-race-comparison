import { Activity } from '../types/strava';

// Sample route data - a loop around a park with realistic GPS coordinates
const generateRoutePoints = (startLat: number, startLng: number, offsetLat: number, offsetLng: number, duration: number) => {
  const points = [];
  const totalPoints = Math.floor(duration / 10); // One point every 10 seconds
  
  for (let i = 0; i < totalPoints; i++) {
    const progress = i / totalPoints;
    // Create a roughly circular route
    const angle = progress * 2 * Math.PI;
    const radiusLat = 0.005; // ~500m radius
    const radiusLng = 0.007;
    
    const lat = startLat + offsetLat + Math.cos(angle) * radiusLat;
    const lng = startLng + offsetLng + Math.sin(angle) * radiusLng;
    const time = i * 10;
    const distance = progress * 3200; // ~3.2km total distance
    const elevation = 100 + Math.sin(angle * 2) * 20; // Some elevation variation
    
    points.push({
      lat,
      lng,
      time,
      distance,
      elevation
    });
  }
  
  return points;
};

export const sampleActivities: Activity[] = [
  {
    id: '1',
    name: 'Morning Run with Sarah',
    athlete: {
      id: 'sarah-123',
      name: 'Sarah Johnson',
      color: '#FF6B6B' // Red
    },
    points: generateRoutePoints(59.9311, 10.7579, 0, 0, 1800), // 30 minutes, Oslo coordinates
    totalDistance: 3200,
    totalTime: 1800,
    startTime: '2025-01-15T08:00:00Z'
  },
  {
    id: '2',
    name: 'Park Loop Challenge',
    athlete: {
      id: 'mike-456',
      name: 'Mike Chen',
      color: '#4ECDC4' // Teal
    },
    points: generateRoutePoints(59.9311, 10.7579, 0.001, 0.001, 1650), // 27.5 minutes, slightly different start
    totalDistance: 3200,
    totalTime: 1650,
    startTime: '2025-01-15T08:00:00Z'
  },
  {
    id: '3',
    name: 'Easy Jog',
    athlete: {
      id: 'anna-789',
      name: 'Anna Peterson',
      color: '#45B7D1' // Blue
    },
    points: generateRoutePoints(59.9311, 10.7579, -0.001, 0.002, 2100), // 35 minutes, different start
    totalDistance: 3200,
    totalTime: 2100,
    startTime: '2025-01-15T08:00:00Z'
  },
  {
    id: '4',
    name: 'Speed Training',
    athlete: {
      id: 'tom-012',
      name: 'Tom Wilson',
      color: '#F7DC6F' // Yellow
    },
    points: generateRoutePoints(59.9311, 10.7579, 0.002, -0.001, 1500), // 25 minutes, fastest time
    totalDistance: 3200,
    totalTime: 1500,
    startTime: '2025-01-15T08:00:00Z'
  }
];