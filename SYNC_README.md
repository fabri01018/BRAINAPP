# Database Sync Feature

This note-taking app now includes a comprehensive syncing feature that allows you to synchronize your local SQLite database with a Supabase cloud database. This enables data backup, cross-device synchronization, and offline-first functionality.

## Features

- **Bidirectional Sync**: Changes made locally are uploaded to Supabase, and changes from other devices are downloaded
- **Offline Support**: Work offline and sync when connection is restored
- **Auto Sync**: Automatic synchronization every 5 minutes (configurable)
- **Manual Sync**: Force sync on demand
- **Conflict Resolution**: Last-write-wins strategy for handling conflicts
- **Sync Status**: Real-time sync status indicators
- **Sync History**: Track sync operations and errors
- **Metadata Tracking**: Efficient change tracking to minimize sync operations

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note down your project URL and anon key from the project settings

### 2. Set Up Supabase Database Tables

Run the following SQL commands in your Supabase SQL editor to create the required tables:

```sql
-- Create projects table
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tasks table
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tags table
CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create task_tags junction table
CREATE TABLE task_tags (
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);

-- Create indexes for better performance
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_task_tags_task_id ON task_tags(task_id);
CREATE INDEX idx_task_tags_tag_id ON task_tags(tag_id);

-- Enable Row Level Security (RLS) - optional but recommended
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_tags ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust based on your security needs)
CREATE POLICY "Allow all operations on projects" ON projects FOR ALL USING (true);
CREATE POLICY "Allow all operations on tasks" ON tasks FOR ALL USING (true);
CREATE POLICY "Allow all operations on tags" ON tags FOR ALL USING (true);
CREATE POLICY "Allow all operations on task_tags" ON task_tags FOR ALL USING (true);
```

### 3. Configure Environment Variables

Update your `app.json` file with your Supabase credentials:

```json
{
  "expo": {
    "extra": {
      "supabaseUrl": "https://your-project-id.supabase.co",
      "supabaseAnonKey": "your-anon-key-here"
    }
  }
}
```

Alternatively, you can set environment variables:

```bash
export EXPO_PUBLIC_SUPABASE_URL="https://your-project-id.supabase.co"
export EXPO_PUBLIC_SUPABASE_ANON_KEY="your-anon-key-here"
```

### 4. Initialize Sync

The sync feature will automatically initialize when the app starts. You can also manually trigger sync using the provided UI components.

## Usage

### Using Sync Components

```jsx
import { SyncStatusIndicator, SyncButton, SyncSettings } from './components/sync-components';

// In your main app component
function App() {
  return (
    <View>
      <SyncStatusIndicator />
      <SyncButton />
      {/* Your app content */}
    </View>
  );
}

// In a settings screen
function SettingsScreen() {
  return (
    <View>
      <SyncSettings />
    </View>
  );
}
```

### Using Sync Hooks

```jsx
import { useSync, useAutoSync } from './hooks/use-sync';

function MyComponent() {
  const { sync, syncStatus, isOnline, lastSyncTime } = useSync();
  const { autoSyncEnabled, toggleAutoSync } = useAutoSync();

  const handleManualSync = async () => {
    const result = await sync(true);
    if (result.success) {
      console.log('Sync completed successfully');
    } else {
      console.error('Sync failed:', result.error);
    }
  };

  return (
    <View>
      <Text>Status: {syncStatus}</Text>
      <Text>Online: {isOnline ? 'Yes' : 'No'}</Text>
      <Text>Last Sync: {lastSyncTime || 'Never'}</Text>
      <Button title="Sync Now" onPress={handleManualSync} />
    </View>
  );
}
```

## Sync Behavior

### Automatic Sync
- Syncs every 5 minutes when online
- Can be disabled/enabled via UI
- Only syncs when there are pending changes

### Manual Sync
- Force sync on demand
- Useful for immediate synchronization
- Shows progress and status

### Conflict Resolution
- Uses "last-write-wins" strategy
- Timestamps are compared to determine the latest change
- Local changes take precedence in case of tie

### Offline Support
- All operations work offline
- Changes are queued for sync when online
- Sync metadata tracks pending changes

## Troubleshooting

### Common Issues

1. **"Supabase not configured" error**
   - Ensure your Supabase URL and anon key are correctly set in `app.json`
   - Check that environment variables are properly loaded

2. **Sync fails with authentication error**
   - Verify your Supabase anon key is correct
   - Check that RLS policies allow the operations you're trying to perform

3. **Data not syncing**
   - Check your internet connection
   - Verify Supabase project is active and accessible
   - Check sync history for error details

4. **Performance issues**
   - Large datasets may take time to sync initially
   - Consider implementing pagination for very large datasets
   - Monitor sync logs for bottlenecks

### Debug Mode

Enable debug logging by adding this to your app:

```jsx
import { syncService } from './lib/sync-service';

// Add sync listener for debugging
syncService.addSyncListener((status, data) => {
  console.log('Sync Status:', status, data);
});
```

## API Reference

### SyncService

The main sync service provides these methods:

- `sync(force)` - Perform sync operation
- `checkConnection()` - Check Supabase connectivity
- `getSyncStatus()` - Get current sync status
- `getSyncHistory(limit)` - Get sync operation history
- `clearSyncMetadata()` - Clear all sync metadata (reset)

### Sync Hooks

- `useSync()` - Main sync hook with status and controls
- `useAutoSync(interval)` - Auto-sync hook with interval control
- `useSyncStatus()` - Simple sync status hook

### Sync Components

- `SyncStatusIndicator` - Shows current sync status
- `SyncButton` - Manual sync button with auto-sync toggle
- `SyncSettings` - Comprehensive sync settings screen

## Security Considerations

- The current implementation uses public access policies
- For production apps, implement proper authentication
- Consider using Supabase Auth for user-specific data
- Implement proper RLS policies based on your security requirements

## Performance Tips

- Sync operations are batched for efficiency
- Only changed records are synchronized
- Metadata tables track changes to minimize sync overhead
- Consider implementing pagination for large datasets

## Future Enhancements

- Real-time sync using Supabase subscriptions
- Conflict resolution strategies
- Selective sync (sync only specific projects/tasks)
- Sync compression for large datasets
- Background sync on app resume
