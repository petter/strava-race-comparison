'use client';

import { Activity } from '../types/strava';

interface ActivityPanelProps {
  activities: Activity[];
  currentTime: number;
}

export default function ActivityPanel({ activities, currentTime }: ActivityPanelProps) {
  const getCurrentStats = (activity: Activity) => {
    // Find current position and stats
    const points = activity.points;
    if (points.length === 0) return null;

    let currentPoint = points[0];
    for (let i = 0; i < points.length - 1; i++) {
      if (currentTime >= points[i].time && currentTime <= points[i + 1].time) {
        const progress = (currentTime - points[i].time) / (points[i + 1].time - points[i].time);
        currentPoint = {
          ...points[i],
          distance: points[i].distance ? 
            points[i].distance! + (points[i + 1].distance! - points[i].distance!) * progress : 
            0,
          time: currentTime
        };
        break;
      } else if (currentTime > points[i + 1].time) {
        currentPoint = points[i + 1];
      }
    }

    const currentDistance = currentPoint.distance || 0;
    const currentSpeed = currentTime > 0 ? (currentDistance / currentTime) * 3.6 : 0; // km/h
    const progressPercent = (currentDistance / activity.totalDistance) * 100;

    return {
      distance: currentDistance,
      speed: currentSpeed,
      progress: progressPercent,
      timeElapsed: currentTime
    };
  };

  const formatDistance = (meters: number): string => {
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(2)}km`;
  };

  const formatSpeed = (kmh: number): string => {
    return `${kmh.toFixed(1)} km/h`;
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Sort activities by current distance (leader first)
  const sortedActivities = [...activities].sort((a, b) => {
    const statsA = getCurrentStats(a);
    const statsB = getCurrentStats(b);
    if (!statsA || !statsB) return 0;
    return statsB.distance - statsA.distance;
  });

  return (
    <div className="bg-white border-l border-gray-200 p-4 overflow-y-auto">
      <h2 className="text-lg font-semibold mb-4">Race Progress</h2>
      
      {activities.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>No activities added yet</p>
          <p className="text-sm mt-2">Add Strava activities to start racing!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedActivities.map((activity, index) => {
          const stats = getCurrentStats(activity);
          if (!stats) return null;

          const isLeader = index === 0;
          const isFinished = stats.progress >= 100;

          return (
            <div
              key={activity.id}
              className={`p-3 rounded-lg border-2 ${
                isLeader ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'
              } ${isFinished ? 'opacity-75' : ''}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: activity.athlete.color }}
                  />
                  <span className="font-medium">{activity.athlete.name}</span>
                  {isLeader && !isFinished && (
                    <span className="text-xs bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full">
                      LEADER
                    </span>
                  )}
                  {isFinished && (
                    <span className="text-xs bg-green-400 text-green-900 px-2 py-1 rounded-full">
                      FINISHED
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  #{index + 1}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Distance:</span>
                  <span className="font-mono">{formatDistance(stats.distance)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Speed:</span>
                  <span className="font-mono">{formatSpeed(stats.speed)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Time:</span>
                  <span className="font-mono">{formatTime(stats.timeElapsed)}</span>
                </div>

                {/* Progress bar */}
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{Math.round(stats.progress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${Math.min(stats.progress, 100)}%`,
                        backgroundColor: activity.athlete.color 
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}