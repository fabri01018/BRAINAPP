import { getDb, withRetry } from '../lib/database.js';
import { syncService } from '../lib/sync-service.js';

export async function getAllTags() {
  return await withRetry(async () => {
    const db = getDb();
    const tags = await db.getAllAsync('SELECT * FROM tags ORDER BY name');
    return tags;
  });
}

export async function getTagById(id) {
  return await withRetry(async () => {
    const db = getDb();
    const tag = await db.getFirstAsync('SELECT * FROM tags WHERE id = ?', [id]);
    return tag;
  });
}

export async function createTag(name) {
  return await withRetry(async () => {
    const db = getDb();
    const result = await db.runAsync('INSERT INTO tags (name) VALUES (?)', [name]);
    const tagId = result.lastInsertRowId;
    
    // Add sync metadata
    await syncService.insertSyncMetadata('tags', tagId);
    
    return { id: tagId, name };
  });
}

export async function updateTag(id, name) {
  return await withRetry(async () => {
    const db = getDb();
    const result = await db.runAsync(
      'UPDATE tags SET name = ? WHERE id = ?',
      [name, id]
    );
    
    if (result.changes === 0) {
      throw new Error('Tag not found');
    }
    
    // Update sync metadata
    await syncService.insertSyncMetadata('tags', id);
    
    return { id, name };
  });
}

export async function deleteTag(id) {
  return await withRetry(async () => {
    const db = getDb();
    
    // First delete task_tags relationships
    await db.runAsync('DELETE FROM task_tags WHERE tag_id = ?', [id]);
    
    // Then delete the tag
    const result = await db.runAsync('DELETE FROM tags WHERE id = ?', [id]);
    
    if (result.changes === 0) {
      throw new Error('Tag not found');
    }
    
    // Update sync metadata
    await syncService.insertSyncMetadata('tags', id);
    
    return { id };
  });
}

export async function getTasksByTagId(tagId) {
  return await withRetry(async () => {
    const db = getDb();
    const tasks = await db.getAllAsync(`
      SELECT t.*, p.name as project_name 
      FROM tasks t 
      INNER JOIN task_tags tt ON t.id = tt.task_id 
      LEFT JOIN projects p ON t.project_id = p.id 
      WHERE tt.tag_id = ?
      ORDER BY t.id
    `, [tagId]);
    return tasks;
  });
}
