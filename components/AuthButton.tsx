'use client';

import { getStravaAuthUrl } from '../lib/strava-auth';

interface AuthButtonProps {
  isAuthenticated: boolean;
  onSignOut: () => void;
}

export default function AuthButton({ isAuthenticated, onSignOut }: AuthButtonProps) {
  const handleSignIn = () => {
    window.location.href = getStravaAuthUrl();
  };

  if (isAuthenticated) {
    return (
      <button
        onClick={onSignOut}
        className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
      >
        Sign Out
      </button>
    );
  }

  return (
    <button
      onClick={handleSignIn}
      className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors flex items-center gap-2"
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.599h4.172L10.463 0l-7.921 15.609h4.172"/>
      </svg>
      Connect with Strava
    </button>
  );
}