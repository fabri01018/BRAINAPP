import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { syncService } from '../lib/sync-service';

export function TestDataSend() {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSendData = async () => {
    setIsLoading(true);
    try {
      console.log('🚀 TEST: Starting data send...');
      const result = await syncService.sendAllDataToSupabase();
      
      if (result.success) {
        Alert.alert(
          'Success!', 
          'Data sent to Supabase successfully! Check your Supabase dashboard.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Error', 
          `Failed to send data: ${result.error}`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Test send error:', error);
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      console.log('🧪 TEST: Testing Supabase connection...');
      const result = await syncService.testSupabaseConnection();
      
      if (result.success) {
        Alert.alert('Connection Test', 'Supabase connection is working!');
      } else {
        Alert.alert('Connection Test Failed', result.error);
      }
    } catch (error) {
      Alert.alert('Connection Test Failed', error.message);
    }
  };

  const handleCheckLocalData = async () => {
    try {
      console.log('📊 TEST: Checking local data...');
      const localData = await syncService.debugLocalData();
      
      Alert.alert(
        'Local Data Summary',
        `Projects: ${localData.projects?.length || 0}\nTasks: ${localData.tasks?.length || 0}\nTags: ${localData.tags?.length || 0}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleCheckSupabaseData = async () => {
    try {
      console.log('📊 TEST: Checking Supabase data...');
      const supabaseData = await syncService.debugSupabaseData();
      
      let message = 'Supabase Data Summary:\n';
      if (supabaseData.error) {
        message += `Error: ${supabaseData.error}`;
      } else {
        Object.keys(supabaseData).forEach(table => {
          const tableData = supabaseData[table];
          if (tableData.error) {
            message += `${table}: Error - ${tableData.error}\n`;
          } else {
            message += `${table}: ${tableData.records} records\n`;
          }
        });
      }
      
      Alert.alert('Supabase Data', message, [{ text: 'OK' }]);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Test Data Send to Supabase</Text>
      
      <TouchableOpacity
        style={[styles.button, styles.primaryButton]}
        onPress={handleSendData}
        disabled={isLoading}
      >
        <Ionicons name="send" size={20} color="#FFFFFF" />
        <Text style={styles.buttonText}>
          {isLoading ? 'Sending...' : 'Send SQLite Data'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.secondaryButton]}
        onPress={handleTestConnection}
      >
        <Ionicons name="flask" size={20} color="#FFFFFF" />
        <Text style={styles.buttonText}>Test Connection</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.infoButton]}
        onPress={handleCheckLocalData}
      >
        <Ionicons name="folder" size={20} color="#FFFFFF" />
        <Text style={styles.buttonText}>Check Local Data</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.infoButton]}
        onPress={handleCheckSupabaseData}
      >
        <Ionicons name="cloud" size={20} color="#FFFFFF" />
        <Text style={styles.buttonText}>Check Supabase Data</Text>
      </TouchableOpacity>

      <Text style={styles.instructions}>
        Use these buttons to test sending your SQLite data to Supabase.
        Check the console for detailed logs.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    margin: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333333',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 15,
    minHeight: 50,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  primaryButton: {
    backgroundColor: '#FF9500',
    shadowColor: '#FF9500',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  secondaryButton: {
    backgroundColor: '#8E8E93',
    shadowColor: '#8E8E93',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  infoButton: {
    backgroundColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
    textAlign: 'center',
  },
  instructions: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginTop: 15,
    fontStyle: 'italic',
    lineHeight: 20,
  },
});
