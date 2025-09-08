import { Activity, ActivityPoint } from '../types/strava';

export interface StravaDetailedActivity {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  type: string;
  start_date: string;
  start_date_local: string;
  athlete: {
    id: number;
    firstname?: string;
    lastname?: string;
  };
  map: {
    id: string;
    polyline: string;
    summary_polyline: string;
  };
}

export interface StravaStreamSet {
  latlng?: {
    type: 'latlng';
    data: [number, number][]; // [lat, lng] pairs
    series_type: string;
    original_size: number;
    resolution: string;
  };
  time?: {
    type: 'time';
    data: number[]; // seconds from start
    series_type: string;
    original_size: number;
    resolution: string;
  };
  distance?: {
    type: 'distance';
    data: number[]; // meters
    series_type: string;
    original_size: number;
    resolution: string;
  };
  altitude?: {
    type: 'altitude';
    data: number[]; // meters
    series_type: string;
    original_size: number;
    resolution: string;
  };
  velocity_smooth?: {
    type: 'velocity_smooth';
    data: number[]; // m/s
    series_type: string;
    original_size: number;
    resolution: string;
  };
}

export class StravaAPI {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async getActivity(activityId: string | number): Promise<StravaDetailedActivity> {
    const response = await fetch(`https://www.strava.com/api/v3/activities/${activityId}`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized: Please re-authenticate with Strava');
      }
      if (response.status === 403) {
        throw new Error('Forbidden: You do not have access to this activity');
      }
      if (response.status === 404) {
        throw new Error('Activity not found');
      }
      throw new Error(`Failed to fetch activity: ${response.statusText}`);
    }

    return response.json();
  }

  async getActivityStreams(
    activityId: string | number, 
    streamTypes: string[] = ['latlng', 'time', 'distance', 'altitude'],
    resolution: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<StravaStreamSet> {
    const types = streamTypes.join(',');
    const url = `https://www.strava.com/api/v3/activities/${activityId}/streams?keys=${types}&key_by_type=true&resolution=${resolution}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized: Please re-authenticate with Strava');
      }
      if (response.status === 403) {
        throw new Error('Forbidden: You do not have access to this activity streams');
      }
      if (response.status === 404) {
        throw new Error('Activity streams not found');
      }
      throw new Error(`Failed to fetch activity streams: ${response.statusText}`);
    }

    return response.json();
  }

  async getActivityWithStreams(activityId: string | number): Promise<Activity> {
    const [activity, streams] = await Promise.all([
      this.getActivity(activityId),
      this.getActivityStreams(activityId)
    ]);

    return this.convertToActivity(activity, streams);
  }

  private convertToActivity(stravaActivity: StravaDetailedActivity, streams: StravaStreamSet): Activity {
    const points: ActivityPoint[] = [];

    if (streams.latlng && streams.time) {
      const latlngData = streams.latlng.data;
      const timeData = streams.time.data;
      const distanceData = streams.distance?.data || [];
      const altitudeData = streams.altitude?.data || [];

      for (let i = 0; i < latlngData.length; i++) {
        const [lat, lng] = latlngData[i];
        const time = timeData[i] || 0;
        const distance = distanceData[i] || 0;
        const elevation = altitudeData[i] || undefined;

        points.push({
          lat,
          lng,
          time,
          distance,
          elevation
        });
      }
    }

    // Generate a color based on athlete ID for consistency
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#F7DC6F', '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA',
      '#E74C3C', '#3498DB', '#9B59B6', '#F39C12', '#E67E22', '#1ABC9C', '#2ECC71', '#34495E',
      '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3', '#00BCD4', '#009688', '#4CAF50',
      '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800', '#FF5722', '#795548', '#607D8B'
    ];
    const colorIndex = stravaActivity.athlete.id % colors.length;

    // Handle athlete name more robustly
    let athleteName = 'Unknown Athlete';
    if (stravaActivity.athlete.firstname || stravaActivity.athlete.lastname) {
      const firstName = stravaActivity.athlete.firstname || '';
      const lastName = stravaActivity.athlete.lastname || '';
      athleteName = `${firstName} ${lastName}`.trim();
    }

    return {
      id: stravaActivity.id.toString(),
      name: stravaActivity.name,
      athlete: {
        id: stravaActivity.athlete.id.toString(),
        name: athleteName,
        color: colors[colorIndex]
      },
      points,
      totalDistance: stravaActivity.distance,
      totalTime: stravaActivity.moving_time,
      startTime: stravaActivity.start_date
    };
  }
}

export function extractActivityIdFromUrl(url: string): string | null {
  const match = url.match(/\/activities\/(\d+)/);
  return match ? match[1] : null;
}