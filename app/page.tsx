"use client";

import { useState, useEffect, useRef } from "react";
import MapComponent from "../components/MapComponent";
import PlaybackControls from "../components/PlaybackControls";
import ActivityPanel from "../components/ActivityPanel";
import ActivityInput from "../components/ActivityInput";
import AuthButton from "../components/AuthButton";
import FileUpload from "../components/FileUpload";
import { PlaybackState, Activity } from "../types/strava";
import { isTokenExpired } from "../lib/strava-auth";

export default function Home() {
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    currentTime: 0,
    playbackSpeed: 1,
  });

  const [activities, setActivities] = useState<Activity[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string>("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>();

  // Check authentication status on mount
  useEffect(() => {
    const tokens = localStorage.getItem("strava_tokens");
    if (tokens) {
      try {
        const parsedTokens = JSON.parse(tokens);
        if (
          parsedTokens.access_token &&
          !isTokenExpired(parsedTokens.expires_at)
        ) {
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem("strava_tokens");
        }
      } catch {
        localStorage.removeItem("strava_tokens");
      }
    }
  }, []);

  // Calculate max time across all activities
  const maxTime =
    activities.length > 0
      ? Math.max(...activities.map((activity) => activity.totalTime))
      : 0;

  // Animation loop
  useEffect(() => {
    if (!playbackState.isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const animate = (currentTime: number) => {
      if (lastTimeRef.current) {
        const deltaTime = (currentTime - lastTimeRef.current) / 1000; // Convert to seconds

        setPlaybackState((prev) => {
          const newTime = Math.min(
            prev.currentTime + deltaTime * prev.playbackSpeed,
            maxTime
          );

          // Auto-pause when reaching the end
          if (newTime >= maxTime) {
            return { ...prev, currentTime: maxTime, isPlaying: false };
          }

          return { ...prev, currentTime: newTime };
        });
      }

      lastTimeRef.current = currentTime;

      if (playbackState.isPlaying) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [playbackState.isPlaying, playbackState.playbackSpeed, maxTime]);

  const handlePlayPause = () => {
    setPlaybackState((prev) => ({
      ...prev,
      isPlaying: !prev.isPlaying,
    }));
    lastTimeRef.current = undefined;
  };

  const handleSeek = (time: number) => {
    setPlaybackState((prev) => ({
      ...prev,
      currentTime: time,
    }));
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackState((prev) => ({
      ...prev,
      playbackSpeed: speed,
    }));
  };

  const handleReset = () => {
    setPlaybackState((prev) => ({
      ...prev,
      currentTime: 0,
      isPlaying: false,
    }));
    lastTimeRef.current = undefined;
  };

  const handleActivityAdded = (activity: Activity) => {
    setActivities((prev) => [...prev, activity]);
    setError("");
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleAuthRequired = () => {
    window.location.href = "/auth/strava";
  };

  const handleSignOut = () => {
    localStorage.removeItem("strava_tokens");
    setIsAuthenticated(false);
    setActivities([]); // Clear all activities
  };

  const clearError = () => {
    setError("");
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header - hide in fullscreen */}
      {!isFullscreen && (
        <header className="bg-white border-b border-gray-200 p-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Strava Race Comparison
              </h1>
              <p className="text-gray-600">
                Watch your activities race against each other
              </p>
            </div>
            <AuthButton
              isAuthenticated={isAuthenticated}
              onSignOut={handleSignOut}
            />
          </div>
        </header>
      )}

      {/* Input sections - hide in fullscreen */}
      {!isFullscreen && (
        <>
          <ActivityInput
            onActivityAdded={handleActivityAdded}
            onError={handleError}
            isAuthenticated={isAuthenticated}
            onAuthRequired={handleAuthRequired}
          />

          <FileUpload
            onActivityAdded={handleActivityAdded}
            onError={handleError}
          />

          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mx-4 mt-2">
              <div className="flex justify-between items-center">
                <p className="text-red-700">{error}</p>
                <button
                  onClick={clearError}
                  className="text-red-400 hover:text-red-600"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <div className="flex-1 flex">
        <div className={`flex-1 flex flex-col ${isFullscreen ? "w-full" : ""}`}>
          <div className="flex-1">
            <MapComponent
              activities={activities}
              currentTime={playbackState.currentTime}
              isPlaying={playbackState.isPlaying}
              isFullscreen={isFullscreen}
              onToggleFullscreen={toggleFullscreen}
            />
          </div>
          <div
            className={
              isFullscreen ? "absolute bottom-0 left-0 right-0 z-50" : ""
            }
          >
            <PlaybackControls
              playbackState={playbackState}
              maxTime={maxTime}
              onPlayPause={handlePlayPause}
              onSeek={handleSeek}
              onSpeedChange={handleSpeedChange}
              onReset={handleReset}
            />
          </div>
        </div>

        {/* Activity Panel - hide in fullscreen */}
        {!isFullscreen && (
          <div className="w-80">
            <ActivityPanel
              activities={activities}
              currentTime={playbackState.currentTime}
            />
          </div>
        )}
      </div>
    </div>
  );
}
