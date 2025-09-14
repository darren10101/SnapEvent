import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export interface TravelOption {
  mode: string;
  duration: number;
  durationText: string;
  distance: number;
  distanceText: string;
}

export interface FriendTravelTime {
  friendId: string;
  travelOptions: TravelOption[];
  fastestOption: TravelOption;
  isLoading: boolean;
  error: string | null;
}

export interface UseFriendTravelTimesReturn {
  friendTravelTimes: Map<string, FriendTravelTime>;
  calculateTravelTime: (friendId: string) => Promise<void>;
  recalculateAllTravelTimes: (friendIds: string[]) => Promise<void>;
  isCalculating: boolean;
  error: string | null;
}

export function useFriendTravelTimes(): UseFriendTravelTimesReturn {
  const [friendTravelTimes, setFriendTravelTimes] = useState<Map<string, FriendTravelTime>>(new Map());
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { user, token } = useAuth();

  const calculateTravelTime = useCallback(async (friendId: string) => {
    if (!user || !token || !friendId) {
      console.log('Missing user, token, or friendId');
      return;
    }

    // Set loading state for this specific friend
    setFriendTravelTimes(prev => new Map(prev.set(friendId, {
      friendId,
      travelOptions: [],
      fastestOption: {} as TravelOption,
      isLoading: true,
      error: null
    })));

    setIsCalculating(true);
    setError(null);

    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/users/${user.id}/travel-time`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetUserId: friendId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to calculate travel time');
      }

      const data = await response.json();
      
      if (data.success) {
        setFriendTravelTimes(prev => new Map(prev.set(friendId, {
          friendId,
          travelOptions: data.data.travelOptions,
          fastestOption: data.data.fastestOption,
          isLoading: false,
          error: null
        })));
      } else {
        throw new Error(data.error || 'Failed to calculate travel time');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Error calculating travel time:', errorMessage);
      
      setFriendTravelTimes(prev => new Map(prev.set(friendId, {
        friendId,
        travelOptions: [],
        fastestOption: {} as TravelOption,
        isLoading: false,
        error: errorMessage
      })));
      
      setError(errorMessage);
    } finally {
      setIsCalculating(false);
    }
  }, [user, token]);

  const recalculateAllTravelTimes = useCallback(async (friendIds: string[]) => {
    console.log('Recalculating travel times for all friends due to transport mode change');
    
    // Clear existing travel times
    setFriendTravelTimes(new Map());
    
    // Recalculate for each friend
    for (const friendId of friendIds) {
      await calculateTravelTime(friendId);
    }
  }, [calculateTravelTime]);

  return {
    friendTravelTimes,
    calculateTravelTime,
    recalculateAllTravelTimes,
    isCalculating,
    error
  };
}