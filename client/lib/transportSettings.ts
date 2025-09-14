import AsyncStorage from '@react-native-async-storage/async-storage';

export type TransportMode = 'walking' | 'driving' | 'transit' | 'bicycling';

export const TRANSPORT_MODES = {
  walking: { name: 'Walking', icon: 'walk' as const },
  driving: { name: 'Driving', icon: 'car' as const },
  transit: { name: 'Public Transit', icon: 'bus' as const },
  bicycling: { name: 'Bicycling', icon: 'bicycle' as const },
} as const;

const STORAGE_KEY = 'transportModes';
const DEFAULT_MODES: TransportMode[] = ['driving'];

// API configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_SERVER_URL || 'http://localhost:3000';

/**
 * Get auth token from AsyncStorage
 */
const getAuthToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem('authToken');
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

/**
 * Get current user ID from AsyncStorage
 */
const getCurrentUserId = async (): Promise<string | null> => {
  try {
    const userData = await AsyncStorage.getItem('userData');
    if (userData) {
      const user = JSON.parse(userData);
      return user.id || user.googleId;
    }
    return null;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return null;
  }
};

/**
 * Fetch transport modes from the server
 */
const fetchTransportModesFromServer = async (): Promise<TransportMode[] | null> => {
  try {
    const userId = await getCurrentUserId();
    const token = await getAuthToken();
    
    if (!userId || !token) {
      console.log('No user ID or token available for server fetch');
      return null;
    }

    console.log(`Fetching transport modes from: ${API_BASE_URL}/api/users/${userId}/transport-settings`);
    
    const response = await fetch(`${API_BASE_URL}/api/users/${userId}/transport-settings`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`Server response status: ${response.status}`);

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data.transportModes) {
        console.log('Successfully fetched transport modes from server:', data.data.transportModes);
        return data.data.transportModes;
      }
    } else if (response.status === 404) {
      // User not found, return null to use defaults
      console.log('User not found on server, using defaults');
      return null;
    } else {
      console.error('Server response error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Server error details:', errorText);
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching transport modes from server:', error);
    if (error instanceof TypeError && error.message.includes('Network request failed')) {
      console.error('Network error - check if server is running and API_BASE_URL is correct:', API_BASE_URL);
    }
    return null;
  }
};

/**
 * Save transport modes to the server
 */
const saveTransportModesToServer = async (modes: TransportMode[]): Promise<boolean> => {
  try {
    const userId = await getCurrentUserId();
    const token = await getAuthToken();
    
    if (!userId || !token) {
      console.log('No user ID or token available for server save');
      return false;
    }

    console.log(`Saving transport modes to: ${API_BASE_URL}/api/users/${userId}/transport-settings`);
    console.log('Transport modes to save:', modes);

    const response = await fetch(`${API_BASE_URL}/api/users/${userId}/transport-settings`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transportModes: modes }),
    });

    console.log(`Save response status: ${response.status}`);

    if (response.ok) {
      const data = await response.json();
      console.log('Successfully saved transport modes to server:', data);
      return data.success;
    } else {
      console.error('Server save error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Server save error details:', errorText);
      return false;
    }
  } catch (error) {
    console.error('Error saving transport modes to server:', error);
    if (error instanceof TypeError && error.message.includes('Network request failed')) {
      console.error('Network error - check if server is running and API_BASE_URL is correct:', API_BASE_URL);
    }
    return false;
  }
};

/**
 * Get transport modes from local storage
 */
const getTransportModesFromStorage = async (): Promise<TransportMode[]> => {
  try {
    const savedModes = await AsyncStorage.getItem(STORAGE_KEY);
    if (savedModes) {
      const parsed = JSON.parse(savedModes) as TransportMode[];
      // Validate that all modes are valid
      const validModes = parsed.filter(mode => mode in TRANSPORT_MODES);
      return validModes.length > 0 ? validModes : DEFAULT_MODES;
    }
    return DEFAULT_MODES;
  } catch (error) {
    console.error('Error loading transport modes from storage:', error);
    return DEFAULT_MODES;
  }
};

/**
 * Save transport modes to local storage
 */
const saveTransportModesToStorage = async (modes: TransportMode[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(modes));
  } catch (error) {
    console.error('Error saving transport modes to storage:', error);
    throw error;
  }
};

/**
 * Get the user's selected transportation modes
 * First tries to fetch from server, falls back to local storage
 */
export const getTransportModes = async (): Promise<TransportMode[]> => {
  try {
    // Try to get from server first
    const serverModes = await fetchTransportModesFromServer();
    if (serverModes) {
      // Update local cache
      await saveTransportModesToStorage(serverModes);
      return serverModes;
    }
    
    // Fallback to local storage
    return await getTransportModesFromStorage();
  } catch (error) {
    console.error('Error loading transport modes:', error);
    return DEFAULT_MODES;
  }
};

/**
 * Save the user's selected transportation modes
 * Saves to both server and local storage
 */
export const setTransportModes = async (modes: TransportMode[]): Promise<void> => {
  try {
    // Ensure at least one mode is selected
    const validModes = modes.length > 0 ? modes : DEFAULT_MODES;
    
    // Save to local storage first (immediate feedback)
    await saveTransportModesToStorage(validModes);
    
    // Try to save to server (don't fail if this doesn't work)
    const serverSaved = await saveTransportModesToServer(validModes);
    if (!serverSaved) {
      console.warn('Failed to save transport modes to server, but saved locally');
    }
  } catch (error) {
    console.error('Error saving transport modes:', error);
    throw error;
  }
};

/**
 * Sync transport modes from server to local storage
 * Useful for when user logs in or app starts
 */
export const syncTransportModes = async (): Promise<TransportMode[]> => {
  try {
    const serverModes = await fetchTransportModesFromServer();
    if (serverModes) {
      await saveTransportModesToStorage(serverModes);
      return serverModes;
    }
    
    // If server doesn't have data, use local and potentially upload
    const localModes = await getTransportModesFromStorage();
    if (localModes && localModes.length > 0) {
      // Try to upload local modes to server
      await saveTransportModesToServer(localModes);
    }
    
    return localModes;
  } catch (error) {
    console.error('Error syncing transport modes:', error);
    return await getTransportModesFromStorage();
  }
};

/**
 * Add a transportation mode to the user's preferences
 */
export const addTransportMode = async (mode: TransportMode): Promise<TransportMode[]> => {
  const currentModes = await getTransportModes();
  if (!currentModes.includes(mode)) {
    const newModes = [...currentModes, mode];
    await setTransportModes(newModes);
    return newModes;
  }
  return currentModes;
};

/**
 * Remove a transportation mode from the user's preferences
 */
export const removeTransportMode = async (mode: TransportMode): Promise<TransportMode[]> => {
  const currentModes = await getTransportModes();
  
  // Don't allow removing if it's the only mode
  if (currentModes.length <= 1) {
    throw new Error('At least one transportation mode must be selected');
  }
  
  const newModes = currentModes.filter(m => m !== mode);
  await setTransportModes(newModes);
  return newModes;
};

/**
 * Check if a specific transportation mode is enabled
 */
export const isTransportModeEnabled = async (mode: TransportMode): Promise<boolean> => {
  const currentModes = await getTransportModes();
  return currentModes.includes(mode);
};

/**
 * Get the primary (first) transportation mode for default routing
 */
export const getPrimaryTransportMode = async (): Promise<TransportMode> => {
  const modes = await getTransportModes();
  return modes[0] || 'driving';
};