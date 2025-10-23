import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, TouchableOpacity } from 'react-native';

import AddTaskModal from '@/components/add-task-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useDatabase } from '@/hooks/use-database';
import { useDeleteTask, useTasksByProject } from '@/hooks/use-tasks';
import { getProjectById } from '@/repositories/projects';

export default function ProjectDetailScreen() {
  const { projectId } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { isInitialized, isInitializing, error: dbError } = useDatabase();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  
  const { data: tasks, isLoading: tasksLoading } = useTasksByProject(parseInt(projectId));
  const deleteTaskMutation = useDeleteTask();

  useEffect(() => {
    const loadProjectData = async () => {
      try {
        setLoading(true);
        
        // Only load project data when database is initialized
        if (isInitialized && projectId) {
          const projectData = await getProjectById(parseInt(projectId));
          setProject(projectData);
        }
        
      } catch (err) {
        console.error('Failed to load project:', err);
        Alert.alert('Error', 'Failed to load project details');
      } finally {
        setLoading(false);
      }
    };

    loadProjectData();
  }, [projectId, isInitialized]);

  const handleAddTask = () => {
    setShowAddTaskModal(true);
  };

  const handleDeleteTask = async (taskId) => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTaskMutation.mutateAsync(taskId);
              Alert.alert('Success', 'Task deleted successfully!');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete task');
              console.error('Error deleting task:', error);
            }
          }
        }
      ]
    );
  };

  if (isInitializing) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <ThemedText>Initializing database...</ThemedText>
      </ThemedView>
    );
  }

  if (dbError) {
    return (
      <ThemedView style={styles.errorContainer}>
        <ThemedText style={styles.errorText}>Database Error: {dbError}</ThemedText>
      </ThemedView>
    );
  }

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <ThemedText>Loading project...</ThemedText>
      </ThemedView>
    );
  }

  if (!project) {
    return (
      <ThemedView style={styles.errorContainer}>
        <ThemedText style={styles.errorText}>Project not found</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Tasks List */}
      <ThemedView style={styles.content}>
        {tasksLoading ? (
          <ThemedView style={styles.loadingContainer}>
            <ActivityIndicator />
            <ThemedText>Loading tasks...</ThemedText>
          </ThemedView>
        ) : tasks && tasks.length > 0 ? (
          <FlatList
            data={tasks}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.taskItem}
                onPress={() => router.push(`/task/${item.id}`)}
                activeOpacity={0.7}
              >
                <TouchableOpacity 
                  onPress={(e) => {
                    e.stopPropagation(); // Prevent task navigation
                    handleDeleteTask(item.id);
                  }}
                  style={styles.checkboxContainer}
                >
                  <Ionicons 
                    name="square-outline" 
                    size={20} 
                    color={colorScheme === 'dark' ? '#888' : '#666'} 
                    style={styles.checkbox}
                  />
                </TouchableOpacity>
                <ThemedView style={styles.taskContent}>
                  <ThemedText type="defaultSemiBold" style={styles.taskTitle}>
                    {item.title}
                  </ThemedText>
                  <ThemedText style={styles.taskDescription}>
                    {item.description || 'No description'}
                  </ThemedText>
                </ThemedView>
              </TouchableOpacity>
            )}
            style={styles.tasksList}
            contentContainerStyle={styles.tasksListContent}
          />
        ) : (
          <ThemedView style={styles.emptyState}>
            <ThemedText style={styles.emptyText}>
              No tasks yet. Tap the + button to add your first task.
            </ThemedText>
          </ThemedView>
        )}
      </ThemedView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[
          styles.fab,
          { backgroundColor: '#FF6B35' }
        ]}
        onPress={handleAddTask}
        activeOpacity={0.8}
      >
        <Ionicons 
          name="add" 
          size={24} 
          color="white" 
        />
      </TouchableOpacity>

      {/* Add Task Modal */}
      <AddTaskModal
        visible={showAddTaskModal}
        onClose={() => setShowAddTaskModal(false)}
        projectId={projectId}
        projectName={project?.name}
      />
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
  content: {
    flex: 1,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 100, // Space for FAB
  },
  tasksList: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 12,
    marginTop: 10,
  },
  tasksListContent: {
    paddingBottom: 20,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 0, // No visible separators
  },
  checkboxContainer: {
    padding: 4,
    marginRight: 8,
  },
  checkbox: {
    marginTop: 2,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 22,
  },
  taskDescription: {
    fontSize: 14,
    opacity: 0.7,
    lineHeight: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.6,
    textAlign: 'center',
    lineHeight: 24,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
});
