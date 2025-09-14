import { useState, useEffect, useCallback } from 'react';
import { 
  getTransportModes, 
  setTransportModes, 
  getPrimaryTransportMode,
  isTransportModeEnabled,
  syncTransportModes,
  type TransportMode 
} from '../transportSettings';

/**
 * React hook for managing user's transportation mode preferences
 * Provides easy access to transport settings with automatic state management
 * Now supports database persistence with local storage fallback
 */
export const useTransportSettings = () => {
  const [transportModes, setTransportModesState] = useState<TransportMode[]>(['driving']);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load transport modes on mount
  useEffect(() => {
    loadTransportModes();
  }, []);

  const loadTransportModes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const modes = await getTransportModes();
      setTransportModesState(modes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transport modes');
      console.error('Error loading transport modes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const syncWithServer = useCallback(async () => {
    try {
      setSyncing(true);
      setError(null);
      const modes = await syncTransportModes();
      setTransportModesState(modes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync transport modes');
      console.error('Error syncing transport modes:', err);
    } finally {
      setSyncing(false);
    }
  }, []);

  const updateTransportModes = useCallback(async (newModes: TransportMode[]) => {
    try {
      setError(null);
      // Optimistic update
      setTransportModesState(newModes);
      
      // Save to server and local storage
      await setTransportModes(newModes);
    } catch (err) {
      // Revert optimistic update on error
      await loadTransportModes();
      setError(err instanceof Error ? err.message : 'Failed to update transport modes');
      console.error('Error updating transport modes:', err);
      throw err;
    }
  }, [loadTransportModes]);

  const toggleTransportMode = useCallback(async (mode: TransportMode) => {
    try {
      setError(null);
      const currentModes = [...transportModes];
      
      if (currentModes.includes(mode)) {
        // Don't allow removing if it's the only mode
        if (currentModes.length === 1) {
          throw new Error('At least one transportation mode must be selected');
        }
        const newModes = currentModes.filter(m => m !== mode);
        await updateTransportModes(newModes);
      } else {
        const newModes = [...currentModes, mode];
        await updateTransportModes(newModes);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle transport mode');
      throw err;
    }
  }, [transportModes, updateTransportModes]);

  const getPrimaryMode = useCallback(async (): Promise<TransportMode> => {
    try {
      return await getPrimaryTransportMode();
    } catch (err) {
      console.error('Error getting primary transport mode:', err);
      return 'driving'; // fallback
    }
  }, []);

  const isModeEnabled = useCallback((mode: TransportMode): boolean => {
    return transportModes.includes(mode);
  }, [transportModes]);

  return {
    transportModes,
    loading,
    syncing,
    error,
    updateTransportModes,
    toggleTransportMode,
    getPrimaryMode,
    isModeEnabled,
    refresh: loadTransportModes,
    syncWithServer,
  };
};

export default useTransportSettings;