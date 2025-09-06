export interface ActivityPoint {
  lat: number;
  lng: number;
  time: number; // seconds from start
  elevation?: number;
  distance?: number; // cumulative distance in meters
}

export interface Activity {
  id: string;
  name: string;
  athlete: {
    id: string;
    name: string;
    color: string; // hex color for map display
  };
  points: ActivityPoint[];
  totalDistance: number; // meters
  totalTime: number; // seconds
  startTime: string; // ISO string
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number; // seconds from start
  playbackSpeed: number;
}