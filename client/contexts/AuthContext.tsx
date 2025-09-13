import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const locationTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      stopLocationTracking();
    };
  }, []);

  const updateUserLocation = async (userId: string, authToken: string): Promise<boolean> => {
    try {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        return false;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;

      // Send location to server
      const response = await fetch(`http://10.37.96.184:3000/api/users/${userId}/location`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          lat: latitude,
          lng: longitude,
        }),
      });

      const data = await response.json();
      if (data.success) {
        console.log('Location updated successfully');
        return true;
      } else {
        console.error('Failed to update location:', data.error);
        return false;
      }
    } catch (error) {
      console.error('Error updating location:', error);
      return false;
    }
  };

  const startLocationTracking = (userId: string, authToken: string) => {
    // Clear any existing timer
    if (locationTimerRef.current) {
      clearInterval(locationTimerRef.current);
    }

    // Update location immediately
    updateUserLocation(userId, authToken);

    // Set up recurring location updates every 1 minute (60000 ms)
    locationTimerRef.current = setInterval(() => {
      updateUserLocation(userId, authToken);
    }, 60000);
  };

  const stopLocationTracking = () => {
    if (locationTimerRef.current) {
      clearInterval(locationTimerRef.current);
      locationTimerRef.current = null;
    }
  };

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('authToken');
      const storedUser = await AsyncStorage.getItem('userData');
      
      if (storedToken && storedUser) {
        const userData = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(userData);
        // Start location tracking for returning user
        startLocationTracking(userData.id, storedToken);
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (userData: User, authToken: string) => {
    try {
      await AsyncStorage.setItem('authToken', authToken);
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      setUser(userData);
      setToken(authToken);
      // Start location tracking immediately after login
      startLocationTracking(userData.id, authToken);
    } catch (error) {
      console.error('Error storing auth:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Stop location tracking before clearing auth
      stopLocationTracking();
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userData');
      setUser(null);
      setToken(null);
    } catch (error) {
      console.error('Error clearing auth:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};