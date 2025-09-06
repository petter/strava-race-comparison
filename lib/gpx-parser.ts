import { Activity, ActivityPoint } from "../types/strava";

export interface GPXTrackPoint {
  lat: number;
  lng: number;
  ele?: number;
  time?: Date;
}

export function parseGPX(
  gpxContent: string,
  athleteName: string = "GPX Upload"
): Activity {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(gpxContent, "text/xml");

  // Check for parsing errors
  const parseError = xmlDoc.querySelector("parsererror");
  if (parseError) {
    throw new Error("Invalid GPX file format");
  }

  const trackPoints: GPXTrackPoint[] = [];
  const trkpts = xmlDoc.querySelectorAll("trkpt");

  if (trkpts.length === 0) {
    throw new Error("No track points found in GPX file");
  }

  // Extract track points
  trkpts.forEach((trkpt) => {
    const lat = parseFloat(trkpt.getAttribute("lat") || "0");
    const lng = parseFloat(trkpt.getAttribute("lon") || "0");

    if (lat === 0 && lng === 0) return;

    const point: GPXTrackPoint = { lat, lng };

    // Extract elevation
    const eleElement = trkpt.querySelector("ele");
    if (eleElement) {
      point.ele = parseFloat(eleElement.textContent || "0");
    }

    // Extract time
    const timeElement = trkpt.querySelector("time");
    if (timeElement) {
      point.time = new Date(timeElement.textContent || "");
    }

    trackPoints.push(point);
  });

  if (trackPoints.length === 0) {
    throw new Error("No valid track points found in GPX file");
  }

  // Convert to Activity format
  const points: ActivityPoint[] = [];
  let totalDistance = 0;
  const startTime = trackPoints[0]?.time || new Date();

  trackPoints.forEach((point, index) => {
    let time = 0;

    // Calculate time from start
    if (point.time && startTime) {
      time = Math.floor((point.time.getTime() - startTime.getTime()) / 1000);
    } else {
      // If no time data, estimate based on index (assume 1 point per second)
      time = index;
    }

    // Calculate cumulative distance
    if (index > 0) {
      const prevPoint = trackPoints[index - 1];
      const segmentDistance = calculateDistance(
        prevPoint.lat,
        prevPoint.lng,
        point.lat,
        point.lng
      );
      totalDistance += segmentDistance;
    }

    points.push({
      lat: point.lat,
      lng: point.lng,
      time,
      distance: totalDistance,
      elevation: point.ele,
    });
  });

  // Extract activity name from GPX metadata
  const nameElement = xmlDoc.querySelector("name");
  const activityName = nameElement?.textContent || "GPX Activity";

  // Generate unique ID and color
  const activityId = `gpx_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;
  const colors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#F7DC6F",
    "#BB8FCE",
    "#85C1E9",
    "#F8C471",
    "#82E0AA",
  ];
  const colorIndex = Math.floor(Math.random() * colors.length);

  const totalTime = points.length > 0 ? points[points.length - 1].time : 0;

  return {
    id: activityId,
    name: activityName,
    athlete: {
      id: `gpx_${Date.now()}`,
      name: athleteName,
      color: colors[colorIndex],
    },
    points,
    totalDistance,
    totalTime,
    startTime: startTime.toISOString(),
  };
}

// Calculate distance between two lat/lng points using Haversine formula
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}
