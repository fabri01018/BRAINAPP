import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getTaskById } from '@/repositories/tasks';

export default function TaskDetailScreen() {
  const { taskId } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');

  useEffect(() => {
    const loadTaskData = async () => {
      try {
        setLoading(true);
        
        // Load task details
        const taskData = await getTaskById(parseInt(taskId));
        setTask(taskData);
        setEditedTitle(taskData.title);
        setEditedDescription(taskData.description || '');
        
      } catch (err) {
        console.error('Failed to load task:', err);
        Alert.alert('Error', 'Failed to load task details');
      } finally {
        setLoading(false);
      }
    };

    if (taskId) {
      loadTaskData();
    }
  }, [taskId]);

  const handleEditTitle = () => {
    setIsEditingTitle(true);
  };

  const handleEditDescription = () => {
    setIsEditingDescription(true);
  };

  const handleSaveTitle = async () => {
    if (editedTitle.trim() !== task.title) {
      try {
        // TODO: Implement update task functionality
        Alert.alert('Save Title', 'Title update functionality will be implemented here');
        setTask({ ...task, title: editedTitle.trim() });
      } catch (error) {
        Alert.alert('Error', 'Failed to update title');
        setEditedTitle(task.title); // Reset on error
      }
    }
    setIsEditingTitle(false);
  };

  const handleSaveDescription = async () => {
    if (editedDescription !== (task.description || '')) {
      try {
        // TODO: Implement update task functionality
        Alert.alert('Save Description', 'Description update functionality will be implemented here');
        setTask({ ...task, description: editedDescription });
      } catch (error) {
        Alert.alert('Error', 'Failed to update description');
        setEditedDescription(task.description || ''); // Reset on error
      }
    }
    setIsEditingDescription(false);
  };

  const handleCancelEdit = () => {
    setEditedTitle(task.title);
    setEditedDescription(task.description || '');
    setIsEditingTitle(false);
    setIsEditingDescription(false);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            // TODO: Implement delete task functionality
            Alert.alert('Delete', 'Delete functionality will be implemented here');
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <ThemedText>Loading task...</ThemedText>
      </ThemedView>
    );
  }

  if (!task) {
    return (
      <ThemedView style={styles.errorContainer}>
        <ThemedText style={styles.errorText}>Task not found</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backButton}
        >
          <Ionicons 
            name="arrow-back" 
            size={24} 
            color={colorScheme === 'dark' ? '#fff' : '#000'} 
          />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <ThemedText type="title" style={styles.projectName}>
            {task.project_name}
          </ThemedText>
          <Ionicons 
            name="chevron-down" 
            size={16} 
            color={colorScheme === 'dark' ? '#888' : '#666'} 
          />
        </View>
        <TouchableOpacity 
          onPress={() => Alert.alert('More Options', 'More options functionality will be implemented here')} 
          style={styles.moreButton}
        >
          <Ionicons 
            name="ellipsis-vertical" 
            size={24} 
            color={colorScheme === 'dark' ? '#fff' : '#000'} 
          />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ThemedView style={styles.content}>
        {/* Date and Repetition Row */}
        <View style={styles.dateRow}>
          <View style={styles.dateLeft}>
            <Ionicons 
              name="square-outline" 
              size={20} 
              color={colorScheme === 'dark' ? '#888' : '#666'} 
            />
            <ThemedText style={styles.dateText}>Date and repetition</ThemedText>
          </View>
          <TouchableOpacity style={styles.bookmarkButton}>
            <Ionicons 
              name="bookmark-outline" 
              size={20} 
              color={colorScheme === 'dark' ? '#888' : '#666'} 
            />
          </TouchableOpacity>
        </View>

        {/* Task Title */}
        <TouchableOpacity 
          style={styles.titleSection}
          onPress={handleEditTitle}
        >
          {isEditingTitle ? (
            <TextInput
              style={[
                styles.titleInput,
                {
                  backgroundColor: colorScheme === 'dark' ? '#333' : '#fff',
                  color: colorScheme === 'dark' ? '#fff' : '#000',
                  borderColor: colorScheme === 'dark' ? '#555' : '#ddd',
                }
              ]}
              value={editedTitle}
              onChangeText={setEditedTitle}
              onBlur={handleSaveTitle}
              onEndEditing={handleSaveTitle}
              autoFocus
              multiline
            />
          ) : (
            <ThemedText type="title" style={styles.taskTitle}>
              {task.title}
            </ThemedText>
          )}
        </TouchableOpacity>

        {/* Task Description */}
        <TouchableOpacity 
          style={styles.descriptionSection}
          onPress={handleEditDescription}
        >
          {isEditingDescription ? (
            <TextInput
              style={[
                styles.descriptionInput,
                {
                  backgroundColor: colorScheme === 'dark' ? '#333' : '#fff',
                  color: colorScheme === 'dark' ? '#fff' : '#000',
                  borderColor: colorScheme === 'dark' ? '#555' : '#ddd',
                }
              ]}
              value={editedDescription}
              onChangeText={setEditedDescription}
              onBlur={handleSaveDescription}
              onEndEditing={handleSaveDescription}
              placeholder="Enter description..."
              placeholderTextColor={colorScheme === 'dark' ? '#888' : '#999'}
              multiline
              textAlignVertical="top"
              autoFocus
            />
          ) : (
            <ThemedText style={styles.taskDescription}>
              {task.description || 'Tap to add description...'}
            </ThemedText>
          )}
        </TouchableOpacity>
      </ThemedView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navButton}>
          <Ionicons 
            name="bookmark-outline" 
            size={24} 
            color={colorScheme === 'dark' ? '#888' : '#666'} 
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton}>
          <Ionicons 
            name="list-outline" 
            size={24} 
            color={colorScheme === 'dark' ? '#888' : '#666'} 
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton}>
          <Ionicons 
            name="images-outline" 
            size={24} 
            color={colorScheme === 'dark' ? '#888' : '#666'} 
          />
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    fontSize: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 60, // Account for status bar
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  projectName: {
    fontSize: 18,
    fontWeight: '600',
  },
  moreButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  dateLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateText: {
    fontSize: 16,
    opacity: 0.7,
  },
  bookmarkButton: {
    padding: 4,
  },
  titleSection: {
    marginBottom: 16,
    paddingVertical: 8,
  },
  taskTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 32,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 32,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 40,
  },
  descriptionSection: {
    flex: 1,
    paddingVertical: 8,
  },
  taskDescription: {
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.8,
    minHeight: 100,
  },
  descriptionInput: {
    fontSize: 16,
    lineHeight: 24,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  navButton: {
    padding: 8,
  },
});
