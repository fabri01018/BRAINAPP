import { useColorScheme } from '@/hooks/use-color-scheme';
import { useDatabase } from '@/hooks/use-database';
import { useDeleteProject, useProjects } from '@/hooks/use-projects';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { useSync } from '../hooks/use-sync';
import { syncService } from '../lib/sync-service';
import AddProjectModal from './add-project-modal';
import EditProjectModal from './edit-project-modal';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

const { width: screenWidth } = Dimensions.get('window');
const SIDEBAR_WIDTH = screenWidth * 0.8;
const HAMBURGER_SIZE = 24;

export default function DraggableSidebar({ children }) {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { isInitialized, isInitializing, error: dbError } = useDatabase();
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const deleteProjectMutation = useDeleteProject();
  const { sync, syncInProgress, syncStatus, isOnline } = useSync();
  const [isOpen, setIsOpen] = useState(false);
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const [showProjectOptions, setShowProjectOptions] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const translateX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const hamburgerRotation = useRef(new Animated.Value(0)).current;

  const openSidebar = () => {
    setIsOpen(true);
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(hamburgerRotation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeSidebar = () => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: -SIDEBAR_WIDTH,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(hamburgerRotation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsOpen(false);
    });
  };

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event) => {
    if (event.nativeEvent.state === 5) { // END
      const { translationX, velocityX } = event.nativeEvent;
      
      if (translationX > SIDEBAR_WIDTH / 2 || velocityX > 500) {
        openSidebar();
      } else {
        closeSidebar();
      }
    }
  };

  const hamburgerIconRotation = hamburgerRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const hamburgerIconOpacity = hamburgerRotation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  const closeIconRotation = hamburgerRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['-45deg', '0deg'],
  });

  const closeIconOpacity = hamburgerRotation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const navigateToScreen = (screen) => {
    router.push(`/${screen}`);
    closeSidebar();
  };

  const navigateToProject = (projectId) => {
    // Check if this is the inbox project
    const inboxProject = projects?.find(p => p.name === 'Inbox');
    if (inboxProject && projectId === inboxProject.id) {
      router.push('/inbox');
    } else {
      router.push(`/project/${projectId}`);
    }
    closeSidebar();
  };

  const handleSync = async () => {
    try {
      const result = await sync(true);
      if (result.success) {
        console.log('Sync completed successfully');
      } else {
        console.error('Sync failed:', result.error);
      }
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
  };

  const handleDebug = async () => {
    try {
      await syncService.debugLocalData();
    } catch (error) {
      console.error('Debug failed:', error);
    }
  };

  const handleSendData = async () => {
    try {
      const result = await syncService.sendAllDataToSupabase();
      
      if (result.success) {
        console.log('✅ Data sent to Supabase successfully!');
      } else {
        console.error('❌ Failed to send data:', result.error);
      }
    } catch (error) {
      console.error('❌ Send data failed:', error);
    }
  };

  const handleProjectOptions = (project) => {
    setSelectedProject(project);
    setShowProjectOptions(true);
  };

  const handleOptionSelect = (option) => {
    if (option === 'Delete') {
      Alert.alert(
        'Delete Project',
        `Are you sure you want to delete "${selectedProject?.name}"? This will also delete all tasks in this project.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Delete', 
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteProjectMutation.mutateAsync(selectedProject.id);
                Alert.alert('Success', 'Project deleted successfully!');
                closeProjectOptions();
              } catch (error) {
                Alert.alert('Error', 'Failed to delete project');
                console.error('Error deleting project:', error);
              }
            }
          }
        ]
      );
    } else if (option === 'Edit') {
      // Close the options popup but keep the selected project for editing
      setShowProjectOptions(false);
      setShowEditProjectModal(true);
    } else {
      console.log(`Selected option "${option}" for project:`, selectedProject?.name);
      // TODO: Implement the actual functionality for Archive option
      closeProjectOptions();
    }
  };

  const closeProjectOptions = () => {
    setShowProjectOptions(false);
    setSelectedProject(null);
  };

  const closeEditModal = () => {
    setShowEditProjectModal(false);
    setSelectedProject(null);
  };

  return (
    <View style={styles.container}>
      {/* Main Content */}
      <View style={styles.mainContent}>
        {children}
      </View>

      {/* Hamburger Button */}
      <TouchableOpacity
        style={[
          styles.hamburgerButton,
          { backgroundColor: colorScheme === 'dark' ? '#333' : '#fff' }
        ]}
        onPress={isOpen ? closeSidebar : openSidebar}
        activeOpacity={0.7}
      >
        <Animated.View
          style={[
            styles.hamburgerLine,
            {
              transform: [{ rotate: hamburgerIconRotation }],
              opacity: hamburgerIconOpacity,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.hamburgerLine,
            {
              transform: [{ rotate: closeIconRotation }],
              opacity: closeIconOpacity,
            },
          ]}
        />
      </TouchableOpacity>

      {/* Overlay */}
      {isOpen && (
        <Animated.View
          style={[
            styles.overlay,
            { opacity: overlayOpacity }
          ]}
        >
          <TouchableOpacity
            style={styles.overlayTouchable}
            onPress={closeSidebar}
            activeOpacity={1}
          />
        </Animated.View>
      )}

      {/* Sidebar */}
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        enabled={isOpen}
      >
        <Animated.View
          style={[
            styles.sidebar,
            {
              transform: [{ translateX }],
              backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#f8f9fa',
            },
          ]}
        >
          <ScrollView style={styles.sidebarScrollView} showsVerticalScrollIndicator={false}>
            <ThemedView style={styles.sidebarContent}>
              <View style={styles.sidebarItems}>
                {/* Database Status */}
                {isInitializing ? (
                  <ThemedText style={styles.loadingText}>Initializing database...</ThemedText>
                ) : dbError ? (
                  <ThemedText style={styles.errorText}>Database error: {dbError}</ThemedText>
                ) : projectsLoading ? (
                  <ThemedText style={styles.loadingText}>Loading projects...</ThemedText>
                ) : projects && projects.length > 0 ? (
                  projects.map((project) => (
                    <TouchableOpacity 
                      key={project.id}
                      style={styles.inboxItem}
                      onPress={() => {
                        if (project.name === 'Inbox') {
                          navigateToProject(project.id);
                        } else {
                          navigateToProject(project.id);
                        }
                      }}
                    >
                      <Ionicons 
                        name={project.name === 'Inbox' ? 'mail-outline' : 'folder-outline'}
                        size={22} 
                        color={colorScheme === 'dark' ? '#fff' : '#000'} 
                      />
                      <ThemedText style={styles.inboxItemText}>{project.name}</ThemedText>
                      <TouchableOpacity 
                        style={styles.verticalDots}
                        onPress={() => handleProjectOptions(project)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.dot} />
                        <View style={styles.dot} />
                        <View style={styles.dot} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))
                ) : (
                  <ThemedText style={styles.noProjectsText}>No projects yet</ThemedText>
                )}
              </View>

              {/* Send Data Button - NEW */}
              <TouchableOpacity 
                style={styles.sendDataButton}
                onPress={handleSendData}
              >
                <Ionicons 
                  name="send" 
                  size={20} 
                  color="#FFFFFF" 
                />
                <ThemedText style={styles.sendDataButtonText}>
                  Send SQLite Data to Supabase
                </ThemedText>
              </TouchableOpacity>

              {/* Sync Button */}
              <TouchableOpacity 
                style={[
                  styles.syncButton,
                  syncInProgress && styles.syncButtonActive
                ]}
                onPress={handleSync}
                disabled={syncInProgress}
              >
                {syncInProgress ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons 
                    name="cloud-upload-outline" 
                    size={20} 
                    color="#FFFFFF" 
                  />
                )}
                <ThemedText style={styles.syncButtonText}>
                  {syncInProgress ? 'Syncing...' : 'Sync to Supabase'}
                </ThemedText>
              </TouchableOpacity>

              {/* Sync Status Indicator */}
              <View style={styles.syncStatusContainer}>
                <Ionicons 
                  name={isOnline ? "wifi" : "wifi-off"} 
                  size={14} 
                  color={isOnline ? "#34C759" : "#FF3B30"} 
                />
                <ThemedText style={[
                  styles.syncStatusText,
                  { color: isOnline ? "#34C759" : "#FF3B30" }
                ]}>
                  {isOnline ? 'Online' : 'Offline'}
                </ThemedText>
              </View>

              {/* Debug Button */}
              <TouchableOpacity 
                style={styles.debugButton}
                onPress={handleDebug}
              >
                <Ionicons 
                  name="bug-outline" 
                  size={16} 
                  color="#FF9500" 
                />
                <ThemedText style={styles.debugButtonText}>
                  Debug Data
                </ThemedText>
              </TouchableOpacity>

              {/* Add Project Button */}
              <TouchableOpacity 
                style={styles.addProjectButton}
                onPress={() => {
                  setShowAddProjectModal(true);
                  closeSidebar();
                }}
              >
                <Ionicons 
                  name="add" 
                  size={20} 
                  color="#007AFF" 
                />
                <ThemedText style={styles.addProjectText}>Add Project</ThemedText>
              </TouchableOpacity>
            </ThemedView>
          </ScrollView>
        </Animated.View>
      </PanGestureHandler>

      {/* Add Project Modal */}
      <AddProjectModal
        visible={showAddProjectModal}
        onClose={() => setShowAddProjectModal(false)}
      />

      {/* Edit Project Modal */}
      <EditProjectModal
        visible={showEditProjectModal}
        onClose={closeEditModal}
        project={selectedProject}
      />

      {/* Project Options Popup */}
      <Modal
        visible={showProjectOptions && !showEditProjectModal}
        transparent={true}
        animationType="fade"
        onRequestClose={closeProjectOptions}
      >
        <TouchableWithoutFeedback onPress={closeProjectOptions}>
          <View style={styles.popupOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.popupContainer}>
                <ThemedText style={styles.popupTitle}>
                  {selectedProject?.name} Options
                </ThemedText>
                
                <TouchableOpacity 
                  style={styles.popupOption}
                  onPress={() => handleOptionSelect('Edit')}
                >
                  <Ionicons name="pencil" size={20} color="#007AFF" />
                  <ThemedText style={styles.popupOptionText}>Edit Project</ThemedText>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.popupOption}
                  onPress={() => handleOptionSelect('Archive')}
                >
                  <Ionicons name="archive" size={20} color="#FF9500" />
                  <ThemedText style={styles.popupOptionText}>Archive Project</ThemedText>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.popupOption}
                  onPress={() => handleOptionSelect('Delete')}
                >
                  <Ionicons name="trash" size={20} color="#FF3B30" />
                  <ThemedText style={styles.popupOptionText}>Delete Project</ThemedText>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  mainContent: {
    flex: 1,
  },
  hamburgerButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  hamburgerLine: {
    position: 'absolute',
    width: 20,
    height: 2,
    backgroundColor: '#333',
    borderRadius: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
  },
  overlayTouchable: {
    flex: 1,
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  sidebarScrollView: {
    flex: 1,
  },
  sidebarContent: {
    paddingTop: 100,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sidebarTitle: {
    marginBottom: 30,
    fontSize: 24,
    fontWeight: 'bold',
  },
  sidebarItems: {
    gap: 15,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    gap: 15,
  },
  sidebarItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  inboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 15,
    borderRadius: 8,
    gap: 15,
    backgroundColor: 'rgba(0,122,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,122,255,0.2)',
    marginBottom: 8,
  },
  inboxItemText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
  },
  projectsSection: {
    marginTop: 10,
    marginBottom: 10,
  },
  projectsSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    opacity: 0.8,
  },
  projectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginLeft: 8,
    borderRadius: 6,
    gap: 10,
  },
  projectItemText: {
    fontSize: 14,
    fontWeight: '400',
    flex: 1,
  },
  loadingText: {
    fontSize: 12,
    opacity: 0.6,
    marginLeft: 8,
    fontStyle: 'italic',
  },
  noProjectsText: {
    fontSize: 12,
    opacity: 0.6,
    marginLeft: 8,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 12,
    color: 'red',
    marginLeft: 8,
    fontStyle: 'italic',
  },
  debugText: {
    fontSize: 10,
    color: 'red',
    marginLeft: 8,
    fontStyle: 'italic',
  },
  addProjectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    gap: 10,
    backgroundColor: 'rgba(0,122,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,122,255,0.3)',
    borderStyle: 'dashed',
  },
  addProjectText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    gap: 10,
    backgroundColor: '#34C759',
    marginBottom: 12,
  },
  syncButtonActive: {
    backgroundColor: '#007AFF',
  },
  syncButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  syncStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
    marginBottom: 15,
  },
  syncStatusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  debugButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 6,
    backgroundColor: 'rgba(255,149,0,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,149,0,0.3)',
    marginBottom: 12,
  },
  debugButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FF9500',
  },
  sendDataButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 8,
    gap: 10,
    backgroundColor: '#FF9500',
    marginBottom: 15,
    marginTop: 10,
  },
  sendDataButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  verticalDots: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 'auto',
    paddingRight: 8,
    gap: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#999',
  },
  popupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popupContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    minWidth: 250,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  popupTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
    color: '#000',
  },
  popupOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 12,
  },
  popupOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
});
