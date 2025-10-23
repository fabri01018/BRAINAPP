import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createProject, deleteProject, getAllProjects, updateProject } from '../repositories/projects.js';
import { useDatabase } from './use-database';

export function useProjects() {
  const { isInitialized } = useDatabase();
  
  return useQuery({
    queryKey: ['projects'],
    queryFn: getAllProjects,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: isInitialized, // Only run when database is initialized
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      // Invalidate and refetch projects after creating a new one
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      // Invalidate and refetch projects after deleting one
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, name }) => updateProject(id, name),
    onSuccess: () => {
      // Invalidate and refetch projects after updating one
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
