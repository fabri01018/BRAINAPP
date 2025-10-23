import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAutoSync, useSync } from '../hooks/use-sync';
import { SYNC_CONFIG } from '../lib/supabase';
import { syncService } from '../lib/sync-service';

export function SyncStatusIndicator() {
  const { syncStatus, syncData, isOnline, lastSyncTime } = useSync();

  const getStatusColor = () => {
    switch (syncStatus) {
      case SYNC_CONFIG.SYNC_STATUS.SYNCING:
        return '#007AFF';
      case SYNC_CONFIG.SYNC_STATUS.SUCCESS:
        return '#34C759';
      case SYNC_CONFIG.SYNC_STATUS.ERROR:
        return '#FF3B30';
      default:
        return isOnline ? '#8E8E93' : '#FF9500';
    }
  };

  const getStatusIcon = () => {
    switch (syncStatus) {
      case SYNC_CONFIG.SYNC_STATUS.SYNCING:
        return 'sync';
      case SYNC_CONFIG.SYNC_STATUS.SUCCESS:
        return 'checkmark-circle';
      case SYNC_CONFIG.SYNC_STATUS.ERROR:
        return 'warning';
      default:
        return isOnline ? 'cloud-outline' : 'cloud-offline';
    }
  };

  const getStatusText = () => {
    switch (syncStatus) {
      case SYNC_CONFIG.SYNC_STATUS.SYNCING:
        return syncData.message || 'Syncing...';
      case SYNC_CONFIG.SYNC_STATUS.SUCCESS:
        return `Last sync: ${lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString() : 'Never'}`;
      case SYNC_CONFIG.SYNC_STATUS.ERROR:
        return syncData.message || 'Sync failed';
      default:
        return isOnline ? 'Ready to sync' : 'Offline';
    }
  };

  return (
    <View style={styles.container}>
      <Ionicons 
        name={getStatusIcon()} 
        size={16} 
        color={getStatusColor()} 
        style={styles.icon}
      />
      <Text style={[styles.text, { color: getStatusColor() }]}>
        {getStatusText()}
      </Text>
    </View>
  );
}

export function SyncButton() {
  const { sync, syncInProgress, syncStatus } = useSync();
  const { autoSyncEnabled, toggleAutoSync } = useAutoSync();
  const [exportInProgress, setExportInProgress] = React.useState(false);

  const handleSync = async () => {
    try {
      await sync(true);
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
  };

  const handleExportData = async () => {
    Alert.alert(
      'Export Data to Supabase',
      'This will send all your local data to Supabase. Do you want to continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Export', 
          onPress: async () => {
            setExportInProgress(true);
            try {
              console.log('🚀 Starting data export...');
              const result = await syncService.exportAllDataToSupabase({
                clearSupabaseFirst: false,
                skipExisting: true,
                batchSize: 10,
                onProgress: (progress) => {
                  console.log(`📊 Export progress: ${progress.exported}/${progress.total} records`);
                }
              });

              if (result.success) {
                Alert.alert(
                  'Export Successful',
                  `Successfully exported ${result.totalExported} records to Supabase in ${result.duration}ms`
                );
              } else {
                Alert.alert(
                  'Export Failed',
                  `Export failed: ${result.error}`
                );
              }
            } catch (error) {
              console.error('Export failed:', error);
              Alert.alert('Export Failed', error.message);
            } finally {
              setExportInProgress(false);
            }
          }
        }
      ]
    );
  };

  const handleClearAndExport = async () => {
    Alert.alert(
      'Clear Supabase and Export',
      'This will DELETE ALL DATA in Supabase and replace it with your local data. This action cannot be undone!',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear & Export', 
          style: 'destructive',
          onPress: async () => {
            setExportInProgress(true);
            try {
              console.log('🚀 Starting clear and export...');
              const result = await syncService.exportAllDataToSupabase({
                clearSupabaseFirst: true,
                skipExisting: false,
                batchSize: 10,
                onProgress: (progress) => {
                  console.log(`📊 Export progress: ${progress.exported}/${progress.total} records`);
                }
              });

              if (result.success) {
                Alert.alert(
                  'Export Successful',
                  `Successfully cleared Supabase and exported ${result.totalExported} records in ${result.duration}ms`
                );
              } else {
                Alert.alert(
                  'Export Failed',
                  `Export failed: ${result.error}`
                );
              }
            } catch (error) {
              console.error('Export failed:', error);
              Alert.alert('Export Failed', error.message);
            } finally {
              setExportInProgress(false);
            }
          }
        }
      ]
    );
  };

  const handleDirectSend = async () => {
    Alert.alert(
      'Send SQLite Data to Supabase',
      'This will send all your local SQLite data directly to Supabase. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Send Data', 
          onPress: async () => {
            setExportInProgress(true);
            try {
              console.log('🚀 Starting direct data send...');
              const result = await syncService.sendAllDataToSupabase();

              if (result.success) {
                Alert.alert(
                  'Data Sent Successfully',
                  `All SQLite data has been sent to Supabase! Check the console for details.`
                );
              } else {
                Alert.alert(
                  'Send Failed',
                  `Failed to send data: ${result.error}`
                );
              }
            } catch (error) {
              console.error('Send failed:', error);
              Alert.alert('Send Failed', error.message);
            } finally {
              setExportInProgress(false);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.syncButtonContainer}>
      <TouchableOpacity
        style={[
          styles.syncButton,
          (syncInProgress || exportInProgress) && styles.syncButtonDisabled
        ]}
        onPress={handleSync}
        disabled={syncInProgress || exportInProgress}
      >
        {syncInProgress ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Ionicons name="sync" size={20} color="#FFFFFF" />
        )}
        <Text style={styles.syncButtonText}>
          {syncInProgress ? 'Syncing...' : 'Sync Now'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.exportButton,
          exportInProgress && styles.syncButtonDisabled
        ]}
        onPress={handleExportData}
        disabled={exportInProgress}
      >
        {exportInProgress ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Ionicons name="cloud-upload" size={20} color="#FFFFFF" />
        )}
        <Text style={styles.syncButtonText}>
          {exportInProgress ? 'Exporting...' : 'Export Data'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.clearExportButton,
          exportInProgress && styles.syncButtonDisabled
        ]}
        onPress={handleClearAndExport}
        disabled={exportInProgress}
      >
        <Ionicons name="trash" size={20} color="#FFFFFF" />
        <Text style={styles.syncButtonText}>
          Clear & Export
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.directSendButton,
          exportInProgress && styles.syncButtonDisabled
        ]}
        onPress={handleDirectSend}
        disabled={exportInProgress}
      >
        <Ionicons name="send" size={20} color="#FFFFFF" />
        <Text style={styles.syncButtonText}>
          Send SQLite Data
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.autoSyncButton}
        onPress={toggleAutoSync}
      >
        <Ionicons 
          name={autoSyncEnabled ? "pause-circle" : "play-circle"} 
          size={20} 
          color={autoSyncEnabled ? "#34C759" : "#8E8E93"} 
        />
        <Text style={[
          styles.autoSyncText,
          { color: autoSyncEnabled ? "#34C759" : "#8E8E93" }
        ]}>
          Auto Sync {autoSyncEnabled ? 'ON' : 'OFF'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export function DataExportPanel() {
  const [exportInProgress, setExportInProgress] = React.useState(false);
  const [exportProgress, setExportProgress] = React.useState(null);
  const [lastExportResult, setLastExportResult] = React.useState(null);

  const handleExportData = async (options = {}) => {
    setExportInProgress(true);
    setExportProgress({ exported: 0, total: 0, errors: 0 });
    
    try {
      console.log('🚀 Starting data export with options:', options);
      const result = await syncService.exportAllDataToSupabase({
        clearSupabaseFirst: options.clearSupabaseFirst || false,
        skipExisting: options.skipExisting !== false,
        batchSize: options.batchSize || 10,
        onProgress: (progress) => {
          setExportProgress(progress);
          console.log(`📊 Export progress: ${progress.exported}/${progress.total} records`);
        }
      });

      setLastExportResult(result);
      
      if (result.success) {
        Alert.alert(
          'Export Successful',
          `Successfully exported ${result.totalExported} records to Supabase in ${result.duration}ms`
        );
      } else {
        Alert.alert(
          'Export Failed',
          `Export failed: ${result.error}`
        );
      }
    } catch (error) {
      console.error('Export failed:', error);
      Alert.alert('Export Failed', error.message);
    } finally {
      setExportInProgress(false);
      setExportProgress(null);
    }
  };

  const testSupabaseConnection = async () => {
    try {
      console.log('🧪 Testing Supabase connection...');
      const result = await syncService.testSupabaseConnection();
      
      if (result.success) {
        Alert.alert('Connection Test', 'Supabase connection test passed successfully!');
      } else {
        Alert.alert('Connection Test Failed', result.error);
      }
    } catch (error) {
      Alert.alert('Connection Test Failed', error.message);
    }
  };

  return (
    <View style={styles.settingsContainer}>
      <Text style={styles.settingsTitle}>Data Export to Supabase</Text>
      
      <View style={styles.exportSection}>
        <Text style={styles.sectionTitle}>Export Options</Text>
        
        <TouchableOpacity
          style={[
            styles.exportButton,
            exportInProgress && styles.syncButtonDisabled
          ]}
          onPress={() => handleExportData({ skipExisting: true })}
          disabled={exportInProgress}
        >
          <Ionicons name="cloud-upload" size={20} color="#FFFFFF" />
          <Text style={styles.syncButtonText}>
            Export Data (Skip Existing)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.clearExportButton,
            exportInProgress && styles.syncButtonDisabled
          ]}
          onPress={() => handleExportData({ clearSupabaseFirst: true, skipExisting: false })}
          disabled={exportInProgress}
        >
          <Ionicons name="trash" size={20} color="#FFFFFF" />
          <Text style={styles.syncButtonText}>
            Clear Supabase & Export All
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.testButton,
            exportInProgress && styles.syncButtonDisabled
          ]}
          onPress={testSupabaseConnection}
          disabled={exportInProgress}
        >
          <Ionicons name="flask" size={20} color="#FFFFFF" />
          <Text style={styles.syncButtonText}>
            Test Supabase Connection
          </Text>
        </TouchableOpacity>
      </View>

      {exportInProgress && exportProgress && (
        <View style={styles.progressContainer}>
          <Text style={styles.progressTitle}>Export Progress</Text>
          <Text style={styles.progressText}>
            Exported: {exportProgress.exported} / {exportProgress.total} records
          </Text>
          <Text style={styles.progressText}>
            Errors: {exportProgress.errors}
          </Text>
          <ActivityIndicator size="large" color="#007AFF" style={styles.progressIndicator} />
        </View>
      )}

      {lastExportResult && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>
            Last Export Result
          </Text>
          <Text style={[
            styles.resultStatus,
            { color: lastExportResult.success ? '#34C759' : '#FF3B30' }
          ]}>
            {lastExportResult.success ? 'SUCCESS' : 'FAILED'}
          </Text>
          <Text style={styles.resultDetails}>
            Records: {lastExportResult.totalExported || 0}
          </Text>
          <Text style={styles.resultDetails}>
            Errors: {lastExportResult.totalErrors || 0}
          </Text>
          <Text style={styles.resultDetails}>
            Duration: {lastExportResult.duration || 0}ms
          </Text>
          {lastExportResult.error && (
            <Text style={styles.errorText}>
              Error: {lastExportResult.error}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

export function SyncSettings() {
  const { syncStatus, syncData, isOnline, lastSyncTime, getSyncHistory } = useSync();
  const { autoSyncEnabled, toggleAutoSync } = useAutoSync();
  const [syncHistory, setSyncHistory] = React.useState([]);

  React.useEffect(() => {
    const loadHistory = async () => {
      const history = await getSyncHistory(5);
      setSyncHistory(history);
    };
    loadHistory();
  }, [getSyncHistory]);

  return (
    <View style={styles.settingsContainer}>
      <Text style={styles.settingsTitle}>Sync Settings</Text>
      
      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Connection Status</Text>
        <View style={styles.statusContainer}>
          <Ionicons 
            name={isOnline ? "wifi" : "wifi-off"} 
            size={16} 
            color={isOnline ? "#34C759" : "#FF3B30"} 
          />
          <Text style={[
            styles.statusText,
            { color: isOnline ? "#34C759" : "#FF3B30" }
          ]}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>

      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Auto Sync</Text>
        <TouchableOpacity
          style={styles.toggleContainer}
          onPress={toggleAutoSync}
        >
          <Ionicons 
            name={autoSyncEnabled ? "toggle" : "toggle-outline"} 
            size={24} 
            color={autoSyncEnabled ? "#34C759" : "#8E8E93"} 
          />
          <Text style={[
            styles.toggleText,
            { color: autoSyncEnabled ? "#34C759" : "#8E8E93" }
          ]}>
            {autoSyncEnabled ? 'Enabled' : 'Disabled'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Last Sync</Text>
        <Text style={styles.settingValue}>
          {lastSyncTime ? new Date(lastSyncTime).toLocaleString() : 'Never'}
        </Text>
      </View>

      {syncStatus === SYNC_CONFIG.SYNC_STATUS.ERROR && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Sync Error</Text>
          <Text style={styles.errorMessage}>
            {syncData.error || 'Unknown error occurred'}
          </Text>
        </View>
      )}

      <View style={styles.historyContainer}>
        <Text style={styles.historyTitle}>Recent Sync History</Text>
        {syncHistory.map((entry, index) => (
          <View key={index} style={styles.historyItem}>
            <Text style={styles.historyTime}>
              {new Date(entry.started_at).toLocaleString()}
            </Text>
            <Text style={[
              styles.historyStatus,
              { color: entry.status === 'success' ? '#34C759' : '#FF3B30' }
            ]}>
              {entry.status.toUpperCase()}
            </Text>
            <Text style={styles.historyMessage}>
              {entry.message}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  icon: {
    marginRight: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
  },
  syncButtonContainer: {
    padding: 16,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34C759',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  clearExportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  directSendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9500',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  syncButtonDisabled: {
    backgroundColor: '#8E8E93',
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  autoSyncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  autoSyncText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  settingsContainer: {
    padding: 16,
  },
  settingsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingValue: {
    fontSize: 14,
    color: '#8E8E93',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginVertical: 12,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: 14,
    color: '#FF3B30',
  },
  historyContainer: {
    marginTop: 20,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  historyItem: {
    backgroundColor: '#F2F2F7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  historyTime: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
  historyStatus: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  historyMessage: {
    fontSize: 14,
    color: '#1C1C1E',
  },
  exportSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1C1C1E',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8E8E93',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  progressContainer: {
    backgroundColor: '#F2F2F7',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1C1C1E',
  },
  progressText: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  progressIndicator: {
    marginTop: 8,
  },
  resultContainer: {
    backgroundColor: '#F2F2F7',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1C1C1E',
  },
  resultStatus: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  resultDetails: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
