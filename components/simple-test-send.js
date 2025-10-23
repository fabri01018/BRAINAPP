import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { syncService } from '../lib/sync-service';

export function SimpleTestSend() {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSendData = async () => {
    setIsLoading(true);
    try {
      console.log('🚀 SIMPLE TEST: Starting data send...');
      const result = await syncService.sendAllDataToSupabase();
      
      if (result.success) {
        Alert.alert(
          'SUCCESS!', 
          'Data sent to Supabase successfully! Check your Supabase dashboard.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'ERROR', 
          `Failed to send data: ${result.error}`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Simple test send error:', error);
      Alert.alert('ERROR', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      console.log('🧪 SIMPLE TEST: Testing Supabase connection...');
      const result = await syncService.testSupabaseConnection();
      
      if (result.success) {
        Alert.alert('CONNECTION TEST', 'Supabase connection is working!');
      } else {
        Alert.alert('CONNECTION TEST FAILED', result.error);
      }
    } catch (error) {
      Alert.alert('CONNECTION TEST FAILED', error.message);
    }
  };

  const handleCheckLocalData = async () => {
    try {
      console.log('📊 SIMPLE TEST: Checking local data...');
      const localData = await syncService.debugLocalData();
      
      Alert.alert(
        'LOCAL DATA SUMMARY',
        `Projects: ${localData.projects?.length || 0}\nTasks: ${localData.tasks?.length || 0}\nTags: ${localData.tags?.length || 0}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('ERROR', error.message);
    }
  };

  return (
    <ScrollView style={styles.scrollContainer}>
      <View style={styles.container}>
        <Text style={styles.title}>SEND SQLITE DATA TO SUPABASE</Text>
        
        <TouchableOpacity
          style={[styles.button, styles.mainButton]}
          onPress={handleSendData}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'SENDING...' : 'SEND SQLITE DATA'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.testButton]}
          onPress={handleTestConnection}
        >
          <Text style={styles.buttonText}>TEST CONNECTION</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.infoButton]}
          onPress={handleCheckLocalData}
        >
          <Text style={styles.buttonText}>CHECK LOCAL DATA</Text>
        </TouchableOpacity>

        <Text style={styles.instructions}>
          Tap "SEND SQLITE DATA" to send all your local data to Supabase.
          Check the console for detailed logs.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: '#F0F0F0',
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FFFFFF',
    margin: 10,
    borderRadius: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: '#000000',
    backgroundColor: '#FFFF00',
    padding: 10,
    borderRadius: 5,
  },
  button: {
    backgroundColor: '#FF0000',
    padding: 20,
    borderRadius: 5,
    marginBottom: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
    borderWidth: 2,
    borderColor: '#000000',
  },
  mainButton: {
    backgroundColor: '#00FF00',
  },
  testButton: {
    backgroundColor: '#0000FF',
  },
  infoButton: {
    backgroundColor: '#FF8000',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  instructions: {
    fontSize: 14,
    color: '#000000',
    textAlign: 'center',
    marginTop: 20,
    backgroundColor: '#E0E0E0',
    padding: 10,
    borderRadius: 5,
  },
});
