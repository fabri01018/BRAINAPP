import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUpdateProject } from '@/hooks/use-projects';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

export default function EditProjectModal({ visible, onClose, project }) {
  const colorScheme = useColorScheme();
  const [projectName, setProjectName] = useState('');
  const updateProjectMutation = useUpdateProject();

  // Set initial project name when modal opens
  useEffect(() => {
    if (project && visible) {
      setProjectName(project.name);
    }
  }, [project, visible]);

  const handleSubmit = async () => {
    if (!projectName.trim()) {
      Alert.alert('Error', 'Please enter a project name');
      return;
    }

    if (projectName.trim() === project?.name) {
      Alert.alert('No Changes', 'The project name is the same as before');
      return;
    }

    try {
      await updateProjectMutation.mutateAsync({
        id: project.id,
        name: projectName.trim()
      });
      
      // Reset form
      setProjectName('');
      onClose();
      
      Alert.alert('Success', 'Project updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update project');
      console.error('Error updating project:', error);
    }
  };

  const handleClose = () => {
    setProjectName('');
    onClose();
  };

  if (!project) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colorScheme === 'dark' ? '#fff' : '#000'} />
          </TouchableOpacity>
          <ThemedText type="title" style={styles.title}>Edit Project</ThemedText>
          <TouchableOpacity 
            onPress={handleSubmit} 
            style={[
              styles.saveButton,
              { backgroundColor: updateProjectMutation.isPending ? '#ccc' : '#007AFF' }
            ]}
            disabled={updateProjectMutation.isPending}
          >
            <ThemedText style={styles.saveButtonText}>
              {updateProjectMutation.isPending ? 'Saving...' : 'Save'}
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Project Info */}
        <View style={styles.projectInfo}>
          <Ionicons 
            name="folder-outline" 
            size={16} 
            color={colorScheme === 'dark' ? '#fff' : '#000'} 
          />
          <ThemedText style={styles.projectInfoText}>
            Editing "{project.name}"
          </ThemedText>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Project Name *</ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colorScheme === 'dark' ? '#333' : '#fff',
                  color: colorScheme === 'dark' ? '#fff' : '#000',
                  borderColor: colorScheme === 'dark' ? '#555' : '#ddd',
                }
              ]}
              value={projectName}
              onChangeText={setProjectName}
              placeholder="Enter project name"
              placeholderTextColor={colorScheme === 'dark' ? '#888' : '#999'}
              autoFocus
            />
          </View>

          <View style={styles.helpText}>
            <Ionicons 
              name="information-circle-outline" 
              size={16} 
              color={colorScheme === 'dark' ? '#888' : '#666'} 
            />
            <ThemedText style={styles.helpTextContent}>
              You can rename your project at any time. The change will be synced across all your devices.
            </ThemedText>
          </View>
        </View>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  projectInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,122,255,0.1)',
    gap: 8,
  },
  projectInfoText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
  form: {
    flex: 1,
    padding: 20,
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  helpText: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
  helpTextContent: {
    fontSize: 14,
    opacity: 0.7,
    flex: 1,
    lineHeight: 20,
  },
});
