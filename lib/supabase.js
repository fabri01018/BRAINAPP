import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Supabase configuration
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔧 Supabase Configuration Check:');
console.log('📡 Supabase URL:', supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'NOT SET');
console.log('🔑 Supabase Anon Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'NOT SET');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase configuration missing!');
  console.error('📋 Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your environment variables or app.json');
  console.error('🔧 Example app.json configuration:');
  console.error(`
  {
    "extra": {
      "supabaseUrl": "https://your-project.supabase.co",
      "supabaseAnonKey": "your-anon-key"
    }
  }
  `);
} else {
  console.log('✅ Supabase configuration found');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    enabled: true,
  },
});

// Add request/response logging
const originalFrom = supabase.from;
supabase.from = function(table) {
  const query = originalFrom.call(this, table);
  
  // Log outgoing requests
  const originalSelect = query.select;
  const originalInsert = query.insert;
  const originalUpdate = query.update;
  const originalDelete = query.delete;
  
  query.select = function(...args) {
    console.log(`📤 Supabase SELECT query to ${table}:`, args);
    return originalSelect.apply(this, args);
  };
  
  query.insert = function(...args) {
    console.log(`📤 Supabase INSERT query to ${table}:`, args);
    return originalInsert.apply(this, args);
  };
  
  query.update = function(...args) {
    console.log(`📤 Supabase UPDATE query to ${table}:`, args);
    return originalUpdate.apply(this, args);
  };
  
  query.delete = function(...args) {
    console.log(`📤 Supabase DELETE query to ${table}:`, args);
    return originalDelete.apply(this, args);
  };
  
  return query;
};

// Sync configuration
export const SYNC_CONFIG = {
  // Sync intervals (in milliseconds)
  AUTO_SYNC_INTERVAL: 5 * 60 * 1000, // 5 minutes
  RETRY_DELAY: 30 * 1000, // 30 seconds
  MAX_RETRIES: 3,
  
  // Batch sizes for sync operations
  BATCH_SIZE: 50,
  
  // Tables to sync
  TABLES: ['projects', 'tasks', 'tags', 'task_tags'],
  
  // Sync status
  SYNC_STATUS: {
    IDLE: 'idle',
    SYNCING: 'syncing',
    ERROR: 'error',
    SUCCESS: 'success'
  }
};

// Helper function to check if Supabase is configured
export function isSupabaseConfigured() {
  return !!(supabaseUrl && supabaseAnonKey);
}
