import React from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { syncService } from '../lib/sync-service';

// Minimal inline component - just add this to any screen
export function InlineSendButton() {
  const handleSend = async () => {
    try {
      console.log('🚀 INLINE: Sending data to Supabase...');
      const result = await syncService.sendAllDataToSupabase();
      
      Alert.alert(
        result.success ? 'SUCCESS' : 'ERROR',
        result.success ? 'Data sent to Supabase!' : result.error
      );
    } catch (error) {
      Alert.alert('ERROR', error.message);
    }
  };

  return (
    <View style={{ padding: 20, backgroundColor: 'white' }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' }}>
        Send SQLite Data to Supabase
      </Text>
      
      <TouchableOpacity
        onPress={handleSend}
        style={{
          backgroundColor: '#FF9500',
          padding: 15,
          borderRadius: 8,
          alignItems: 'center',
          marginBottom: 10,
        }}
      >
        <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
          SEND DATA TO SUPABASE
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        onPress={async () => {
          try {
            const result = await syncService.testSupabaseConnection();
            Alert.alert('Connection Test', result.success ? 'Working!' : result.error);
          } catch (error) {
            Alert.alert('Error', error.message);
          }
        }}
        style={{
          backgroundColor: '#007AFF',
          padding: 15,
          borderRadius: 8,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
          TEST CONNECTION
        </Text>
      </TouchableOpacity>
    </View>
  );
}
