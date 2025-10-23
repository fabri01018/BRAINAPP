import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createTask, deleteTask, getAllTasks, getTasksByProjectId } from '../repositories/tasks.js';
import { useDatabase } from './use-database';

export function useTasks() {
  const { isInitialized } = useDatabase();
  
  return useQuery({
    queryKey: ['tasks'],
    queryFn: getAllTasks,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: isInitialized, // Only run when database is initialized
  });
}

export function useTasksByProject(projectId) {
  const { isInitialized } = useDatabase();
  
  return useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => getTasksByProjectId(projectId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: isInitialized && !!projectId, // Only run when database is initialized and projectId exists
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ projectId, title, description }) => 
      createTask(projectId, title, description),
    onSuccess: (newTask) => {
      // Invalidate and refetch tasks after creating a new one
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', newTask.project_id] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (taskId) => deleteTask(taskId),
    onSuccess: () => {
      // Invalidate and refetch tasks after deleting one
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
