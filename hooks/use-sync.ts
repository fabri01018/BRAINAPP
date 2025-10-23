import { useCallback, useEffect, useState } from 'react';
import { SYNC_CONFIG } from '../lib/supabase.js';
import { syncService } from '../lib/sync-service.js';

export function useSync() {
  const [syncStatus, setSyncStatus] = useState(SYNC_CONFIG.SYNC_STATUS.IDLE);
  const [syncData, setSyncData] = useState({});
  const [isOnline, setIsOnline] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [syncInProgress, setSyncInProgress] = useState(false);

  // Sync status listener
  useEffect(() => {
    const unsubscribe = syncService.addSyncListener(({ status, ...data }) => {
      setSyncStatus(status);
      setSyncData(data);
      
      if (status === SYNC_CONFIG.SYNC_STATUS.SYNCING) {
        setSyncInProgress(true);
      } else {
        setSyncInProgress(false);
        if (data.lastSyncTime) {
          setLastSyncTime(data.lastSyncTime);
        }
      }
    });

    // Get initial status
    const initialStatus = syncService.getSyncStatus();
    setIsOnline(initialStatus.isOnline);
    setLastSyncTime(initialStatus.lastSyncTime);
    setSyncInProgress(initialStatus.syncInProgress);

    return unsubscribe;
  }, []);

  // Manual sync function
  const sync = useCallback(async (force = false) => {
    try {
      const result = await syncService.sync(force);
      return result;
    } catch (error) {
      console.error('Sync error:', error);
      return { success: false, error: error.message };
    }
  }, []);

  // Check connection
  const checkConnection = useCallback(async () => {
    try {
      const isConnected = await syncService.checkConnection();
      setIsOnline(isConnected);
      return isConnected;
    } catch (error) {
      console.error('Connection check error:', error);
      setIsOnline(false);
      return false;
    }
  }, []);

  // Get sync history
  const getSyncHistory = useCallback(async (limit = 10) => {
    try {
      return await syncService.getSyncHistory(limit);
    } catch (error) {
      console.error('Error getting sync history:', error);
      return [];
    }
  }, []);

  return {
    syncStatus,
    syncData,
    isOnline,
    lastSyncTime,
    syncInProgress,
    sync,
    checkConnection,
    getSyncHistory
  };
}

export function useAutoSync(interval = SYNC_CONFIG.AUTO_SYNC_INTERVAL) {
  const { sync, isOnline, syncInProgress } = useSync();
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);

  useEffect(() => {
    if (!autoSyncEnabled || !isOnline || syncInProgress) return;

    const intervalId = setInterval(async () => {
      try {
        await sync();
      } catch (error) {
        console.error('Auto sync error:', error);
      }
    }, interval);

    return () => clearInterval(intervalId);
  }, [autoSyncEnabled, isOnline, syncInProgress, interval, sync]);

  const toggleAutoSync = useCallback(() => {
    setAutoSyncEnabled(prev => !prev);
  }, []);

  return {
    autoSyncEnabled,
    toggleAutoSync
  };
}

export function useSyncStatus() {
  const [status, setStatus] = useState(syncService.getSyncStatus());

  useEffect(() => {
    const unsubscribe = syncService.addSyncListener(() => {
      setStatus(syncService.getSyncStatus());
    });

    return unsubscribe;
  }, []);

  return status;
}
