import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCreateTask } from '@/hooks/use-tasks';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

export default function AddTaskModal({ visible, onClose, projectId, projectName }) {
  const colorScheme = useColorScheme();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const createTaskMutation = useCreateTask();

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    try {
      await createTaskMutation.mutateAsync({
        projectId: parseInt(projectId),
        title: title.trim(),
        description: description.trim() || null,
      });
      
      // Reset form
      setTitle('');
      setDescription('');
      onClose();
      
      Alert.alert('Success', 'Task created successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to create task');
      console.error('Error creating task:', error);
    }
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    onClose();
  };

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
          <ThemedText type="title" style={styles.title}>Add Task</ThemedText>
          <TouchableOpacity 
            onPress={handleSubmit} 
            style={[
              styles.saveButton,
              { backgroundColor: createTaskMutation.isPending ? '#ccc' : '#007AFF' }
            ]}
            disabled={createTaskMutation.isPending}
          >
            <ThemedText style={styles.saveButtonText}>
              {createTaskMutation.isPending ? 'Saving...' : 'Save'}
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
          <ThemedText style={styles.projectName}>{projectName}</ThemedText>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Title *</ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colorScheme === 'dark' ? '#333' : '#fff',
                  color: colorScheme === 'dark' ? '#fff' : '#000',
                  borderColor: colorScheme === 'dark' ? '#555' : '#ddd',
                }
              ]}
              value={title}
              onChangeText={setTitle}
              placeholder="Enter task title"
              placeholderTextColor={colorScheme === 'dark' ? '#888' : '#999'}
              autoFocus
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Description</ThemedText>
            <TextInput
              style={[
                styles.textArea,
                {
                  backgroundColor: colorScheme === 'dark' ? '#333' : '#fff',
                  color: colorScheme === 'dark' ? '#fff' : '#000',
                  borderColor: colorScheme === 'dark' ? '#555' : '#ddd',
                }
              ]}
              value={description}
              onChangeText={setDescription}
              placeholder="Enter task description (optional)"
              placeholderTextColor={colorScheme === 'dark' ? '#888' : '#999'}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
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
  projectName: {
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
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 100,
  },
});
