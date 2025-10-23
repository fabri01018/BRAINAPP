import { getDb, withRetry } from '../lib/database.js';
import { syncService } from '../lib/sync-service.js';

export async function getAllProjects() {
  return await withRetry(async () => {
    const db = getDb();
    const projects = await db.getAllAsync('SELECT * FROM projects ORDER BY id');
    return projects;
  });
}

export async function getProjectById(id) {
  return await withRetry(async () => {
    const db = getDb();
    const project = await db.getFirstAsync('SELECT * FROM projects WHERE id = ?', [id]);
    return project;
  });
}

export async function createProject(name) {
  console.log(`📝 Creating new project: "${name}"`);
  return await withRetry(async () => {
    const db = getDb();
    const result = await db.runAsync('INSERT INTO projects (name) VALUES (?)', [name]);
    const projectId = result.lastInsertRowId;
    
    console.log(`✅ Project created locally with ID: ${projectId}`);
    
    // Add sync metadata
    await syncService.insertSyncMetadata('projects', projectId);
    console.log(`📤 Project ${projectId} marked for sync to Supabase`);
    
    return { id: projectId, name };
  });
}

export async function updateProject(id, name) {
  console.log(`📝 Updating project ${id} to: "${name}"`);
  return await withRetry(async () => {
    const db = getDb();
    const result = await db.runAsync(
      'UPDATE projects SET name = ? WHERE id = ?',
      [name, id]
    );
    
    if (result.changes === 0) {
      console.error(`❌ Project ${id} not found for update`);
      throw new Error('Project not found');
    }
    
    console.log(`✅ Project ${id} updated locally`);
    
    // Update sync metadata
    await syncService.insertSyncMetadata('projects', id);
    console.log(`📤 Project ${id} marked for sync to Supabase`);
    
    return { id, name };
  });
}

export async function deleteProject(id) {
  console.log(`🗑️ Deleting project ${id}`);
  return await withRetry(async () => {
    const db = getDb();
    
    // First delete all tasks in this project
    const tasksResult = await db.runAsync('DELETE FROM tasks WHERE project_id = ?', [id]);
    console.log(`🗑️ Deleted ${tasksResult.changes} tasks from project ${id}`);
    
    // Then delete the project
    const result = await db.runAsync('DELETE FROM projects WHERE id = ?', [id]);
    
    if (result.changes === 0) {
      console.error(`❌ Project ${id} not found for deletion`);
      throw new Error('Project not found');
    }
    
    console.log(`✅ Project ${id} deleted locally`);
    
    // Update sync metadata
    await syncService.insertSyncMetadata('projects', id);
    console.log(`📤 Project ${id} deletion marked for sync to Supabase`);
    
    return { id };
  });
}
