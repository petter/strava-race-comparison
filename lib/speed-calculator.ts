import { Activity, ActivityPoint } from '../types/strava';

export interface ActivityStats {
  distance: number;
  speed: number;
  progress: number;
  timeElapsed: number;
  lat: number;
  lng: number;
}

export function getCurrentActivityStats(activity: Activity, currentTime: number): ActivityStats | null {
  const points = activity.points;
  if (points.length === 0) return null;

  // Find current position and interpolate between points
  let currentPoint = points[0];
  for (let i = 0; i < points.length - 1; i++) {
    if (currentTime >= points[i].time && currentTime <= points[i + 1].time) {
      const progress = (currentTime - points[i].time) / (points[i + 1].time - points[i].time);
      currentPoint = {
        ...points[i],
        distance: points[i].distance ? 
          points[i].distance! + (points[i + 1].distance! - points[i].distance!) * progress : 
          0,
        time: currentTime,
        lat: points[i].lat + (points[i + 1].lat - points[i].lat) * progress,
        lng: points[i].lng + (points[i + 1].lng - points[i].lng) * progress
      };
      break;
    } else if (currentTime > points[i + 1].time) {
      currentPoint = points[i + 1];
    }
  }

  const currentDistance = currentPoint.distance || 0;
  
  // Calculate speed using a 10-second rolling window for very smooth results
  let currentSpeed = 0;
  const windowSeconds = 10;
  const windowStartTime = Math.max(0, currentTime - windowSeconds);
  
  // Get all points within the averaging window
  const windowPoints = points.filter(point => 
    point.time >= windowStartTime && point.time <= currentTime
  );
  
  if (windowPoints.length >= 2) {
    // Use first and last points in the window for most stable calculation
    const firstPoint = windowPoints[0];
    const lastPoint = windowPoints[windowPoints.length - 1];
    
    const timeDiff = lastPoint.time - firstPoint.time;
    const distDiff = (lastPoint.distance || 0) - (firstPoint.distance || 0);
    
    if (timeDiff >= 2 && distDiff >= 0) { // Require at least 2 seconds of data
      currentSpeed = (distDiff / timeDiff) * 3.6; // Convert m/s to km/h
    }
  }
  
  // Fallback: try with a smaller 5-second window if 10-second doesn't work
  if (currentSpeed === 0) {
    const smallerWindowStart = Math.max(0, currentTime - 5);
    const smallerWindowPoints = points.filter(point => 
      point.time >= smallerWindowStart && point.time <= currentTime
    );
    
    if (smallerWindowPoints.length >= 2) {
      const firstPoint = smallerWindowPoints[0];
      const lastPoint = smallerWindowPoints[smallerWindowPoints.length - 1];
      
      const timeDiff = lastPoint.time - firstPoint.time;
      const distDiff = (lastPoint.distance || 0) - (firstPoint.distance || 0);
      
      if (timeDiff > 0 && distDiff >= 0) {
        currentSpeed = (distDiff / timeDiff) * 3.6;
      }
    }
  }
  
  // Final fallback to overall average speed
  if (currentSpeed === 0 && currentTime > 0) {
    currentSpeed = (currentDistance / currentTime) * 3.6;
  }

  const progressPercent = (currentDistance / activity.totalDistance) * 100;

  return {
    distance: currentDistance,
    speed: Math.max(0, currentSpeed),
    progress: progressPercent,
    timeElapsed: currentTime,
    lat: currentPoint.lat,
    lng: currentPoint.lng
  };
}

export function formatSpeed(speed: number): string {
  return `${speed.toFixed(1)} km/h`;
}

export function formatPace(speed: number): string {
  if (speed <= 0) return '--:--';
  
  const paceMinutesPerKm = 60 / speed; // minutes per km
  const minutes = Math.floor(paceMinutesPerKm);
  const seconds = Math.round((paceMinutesPerKm - minutes) * 60);
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}