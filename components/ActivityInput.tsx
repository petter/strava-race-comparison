'use client';

import { useState } from 'react';
import { StravaAPI, extractActivityIdFromUrl } from '../lib/strava-api';
import { Activity } from '../types/strava';

interface ActivityInputProps {
  onActivityAdded: (activity: Activity) => void;
  onError: (error: string) => void;
  isAuthenticated: boolean;
  onAuthRequired: () => void;
}

export default function ActivityInput({ 
  onActivityAdded, 
  onError, 
  isAuthenticated,
  onAuthRequired 
}: ActivityInputProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      onAuthRequired();
      return;
    }

    if (!url.trim()) {
      onError('Please enter a Strava activity URL');
      return;
    }

    const activityId = extractActivityIdFromUrl(url.trim());
    if (!activityId) {
      onError('Invalid Strava activity URL. Please use a URL like: https://www.strava.com/activities/123456789');
      return;
    }

    setLoading(true);
    
    try {
      const tokens = JSON.parse(localStorage.getItem('strava_tokens') || '{}');
      if (!tokens.access_token) {
        onAuthRequired();
        return;
      }

      const stravaAPI = new StravaAPI(tokens.access_token);
      const activity = await stravaAPI.getActivityWithStreams(activityId);
      
      onActivityAdded(activity);
      setUrl(''); // Clear the input after successful addition
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Unauthorized')) {
          onAuthRequired();
        } else {
          onError(error.message);
        }
      } else {
        onError('Failed to fetch activity data');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 p-4">
      <form onSubmit={handleSubmit} className="flex gap-2 items-center">
        <div className="flex-1">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter Strava activity URL (e.g., https://www.strava.com/activities/15716034102)"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            disabled={loading}
          />
        </div>
        
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Loading...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add Activity
            </>
          )}
        </button>
      </form>

      {!isAuthenticated && (
        <p className="text-sm text-amber-600 mt-2">
          ⚠️ You need to authenticate with Strava to add activities. Click "Add Activity" to sign in.
        </p>
      )}
    </div>
  );
}