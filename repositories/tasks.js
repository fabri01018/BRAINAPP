import { getDb, withRetry } from '../lib/database.js';
import { syncService } from '../lib/sync-service.js';

export async function getAllTasks() {
  return await withRetry(async () => {
    const db = getDb();
    const tasks = await db.getAllAsync(`
      SELECT t.*, p.name as project_name 
      FROM tasks t 
      LEFT JOIN projects p ON t.project_id = p.id 
      ORDER BY t.id
    `);
    return tasks;
  });
}

export async function getTasksByProjectId(projectId) {
  return await withRetry(async () => {
    const db = getDb();
    const tasks = await db.getAllAsync(
      'SELECT * FROM tasks WHERE project_id = ? ORDER BY id',
      [projectId]
    );
    return tasks;
  });
}

export async function getTaskById(id) {
  return await withRetry(async () => {
    const db = getDb();
    const task = await db.getFirstAsync(`
      SELECT t.*, p.name as project_name 
      FROM tasks t 
      LEFT JOIN projects p ON t.project_id = p.id 
      WHERE t.id = ?
    `, [id]);
    return task;
  });
}

export async function createTask(projectId, title, description = null) {
  console.log(`📝 Creating new task: "${title}" in project ${projectId}`);
  return await withRetry(async () => {
    const db = getDb();
    const result = await db.runAsync(
      'INSERT INTO tasks (project_id, title, description) VALUES (?, ?, ?)',
      [projectId, title, description]
    );
    const taskId = result.lastInsertRowId;
    
    console.log(`✅ Task created locally with ID: ${taskId}`);
    
    // Add sync metadata
    await syncService.insertSyncMetadata('tasks', taskId);
    console.log(`📤 Task ${taskId} marked for sync to Supabase`);
    
    return { id: taskId, project_id: projectId, title, description };
  });
}

export async function updateTask(id, updates) {
  console.log(`📝 Updating task ${id}:`, updates);
  return await withRetry(async () => {
    const db = getDb();
    const { project_id, title, description } = updates;
    
    const result = await db.runAsync(
      'UPDATE tasks SET project_id = ?, title = ?, description = ? WHERE id = ?',
      [project_id, title, description, id]
    );
    
    if (result.changes === 0) {
      console.error(`❌ Task ${id} not found for update`);
      throw new Error('Task not found');
    }
    
    console.log(`✅ Task ${id} updated locally`);
    
    // Update sync metadata
    await syncService.insertSyncMetadata('tasks', id);
    console.log(`📤 Task ${id} marked for sync to Supabase`);
    
    return { id, ...updates };
  });
}

export async function deleteTask(id) {
  console.log(`🗑️ Deleting task ${id}`);
  return await withRetry(async () => {
    const db = getDb();
    
    // First delete task_tags relationships
    const tagsResult = await db.runAsync('DELETE FROM task_tags WHERE task_id = ?', [id]);
    console.log(`🗑️ Deleted ${tagsResult.changes} tag relationships for task ${id}`);
    
    // Then delete the task
    const result = await db.runAsync('DELETE FROM tasks WHERE id = ?', [id]);
    
    if (result.changes === 0) {
      console.error(`❌ Task ${id} not found for deletion`);
      throw new Error('Task not found');
    }
    
    console.log(`✅ Task ${id} deleted locally`);
    
    // Update sync metadata
    await syncService.insertSyncMetadata('tasks', id);
    console.log(`📤 Task ${id} deletion marked for sync to Supabase`);
    
    return { id };
  });
}

export async function getTaskTags(taskId) {
  return await withRetry(async () => {
    const db = getDb();
    const tags = await db.getAllAsync(`
      SELECT t.* 
      FROM tags t 
      INNER JOIN task_tags tt ON t.id = tt.tag_id 
      WHERE tt.task_id = ?
    `, [taskId]);
    return tags;
  });
}

export async function addTagToTask(taskId, tagId) {
  return await withRetry(async () => {
    const db = getDb();
    await db.runAsync(
      'INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)',
      [taskId, tagId]
    );
    return { task_id: taskId, tag_id: tagId };
  });
}

export async function removeTagFromTask(taskId, tagId) {
  return await withRetry(async () => {
    const db = getDb();
    const result = await db.runAsync(
      'DELETE FROM task_tags WHERE task_id = ? AND tag_id = ?',
      [taskId, tagId]
    );
    return { task_id: taskId, tag_id: tagId };
  });
}
