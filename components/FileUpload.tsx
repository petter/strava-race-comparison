'use client';

import { useState, useRef } from 'react';
import { parseGPX } from '../lib/gpx-parser';
import { Activity } from '../types/strava';

interface FileUploadProps {
  onActivityAdded: (activity: Activity) => void;
  onError: (error: string) => void;
}

export default function FileUpload({ onActivityAdded, onError }: FileUploadProps) {
  const [loading, setLoading] = useState(false);
  const [athleteName, setAthleteName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.gpx')) {
      onError('Please select a GPX file');
      return;
    }

    if (!athleteName.trim()) {
      onError('Please enter the athlete name');
      return;
    }

    setLoading(true);

    try {
      const content = await file.text();
      const activity = parseGPX(content, athleteName.trim());
      onActivityAdded(activity);
      setAthleteName('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      if (error instanceof Error) {
        onError(`GPX parsing error: ${error.message}`);
      } else {
        onError('Failed to parse GPX file');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 border-t border-gray-200 p-4">
      <div className="text-sm text-gray-600 mb-3">
        <strong>Alternative:</strong> Upload GPX files exported from Strava
      </div>
      
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label htmlFor="athlete-name" className="block text-xs text-gray-700 mb-1">
            Athlete Name
          </label>
          <input
            id="athlete-name"
            type="text"
            value={athleteName}
            onChange={(e) => setAthleteName(e.target.value)}
            placeholder="Enter athlete name"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            disabled={loading}
          />
        </div>
        
        <div className="flex-1">
          <label htmlFor="gpx-file" className="block text-xs text-gray-700 mb-1">
            GPX File
          </label>
          <input
            ref={fileInputRef}
            id="gpx-file"
            type="file"
            accept=".gpx"
            onChange={handleFileSelect}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            disabled={loading}
          />
        </div>
      </div>

      <div className="mt-2 text-xs text-gray-500">
        Export GPX from Strava: Activity → 3-dots menu → Export GPX
      </div>

      {loading && (
        <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
          Processing GPX file...
        </div>
      )}
    </div>
  );
}