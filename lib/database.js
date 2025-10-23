import * as SQLite from 'expo-sqlite';

let db;
let initPromise = null;

export async function initDatabase() {
  if (db) return;
  if (initPromise) return initPromise;

  initPromise = _initDatabase();

  try {
    await initPromise;
  } finally {
    initPromise = null;
  }
}

async function _initDatabase() {
  try {
    console.log('Starting database initialization...');

    if (db) {
      try {
        await db.closeAsync();
      } catch (closeError) {
        console.log('Error closing existing database:', closeError.message);
      }
      db = null;
    }

    db = await SQLite.openDatabaseAsync('projects.db');
    console.log('Database opened successfully');

    // Create projects table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL
      );
    `);

    // Create tasks table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        FOREIGN KEY (project_id) REFERENCES projects(id)
      );
    `);

    // Create tags table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL
      );
    `);

    // Create task_tags table (many-to-many)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS task_tags (
        task_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        PRIMARY KEY (task_id, tag_id),
        FOREIGN KEY (task_id) REFERENCES tasks(id),
        FOREIGN KEY (tag_id) REFERENCES tags(id)
      );
    `);

    // Create sync metadata tables
    try {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS sync_metadata (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          table_name TEXT NOT NULL,
          record_id INTEGER NOT NULL,
          last_modified DATETIME DEFAULT CURRENT_TIMESTAMP,
          sync_status TEXT DEFAULT 'pending',
          supabase_id TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(table_name, record_id)
        )
      `);

      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS sync_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sync_type TEXT NOT NULL,
          status TEXT NOT NULL,
          message TEXT,
          records_synced INTEGER DEFAULT 0,
          error_details TEXT,
          started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          completed_at DATETIME
        )
      `);
    } catch (syncTableError) {
      console.error('Error creating sync tables:', syncTableError);
      // Continue without sync tables for now
    }

    // Insert sample data if projects table is empty
    const result = await db.getFirstAsync('SELECT COUNT(*) AS count FROM projects');
    if (result.count === 0) {
      await addSampleData();
    } else {
      // Check if inbox exists, if not create it
      const inboxExists = await db.getFirstAsync('SELECT COUNT(*) AS count FROM projects WHERE name = ?', ['Inbox']);
      if (inboxExists.count === 0) {
        console.log('Creating missing inbox project...');
        await db.runAsync('INSERT INTO projects (name) VALUES (?)', ['Inbox']);
        console.log('Inbox project created');
      }
    }

    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    db = null;
    throw error;
  }
}

async function addSampleData() {
  try {
    console.log('Adding sample data...');
    
    // Add Inbox project first (main project)
    const inboxIdResult = await db.runAsync(
      'INSERT INTO projects (name) VALUES (?)',
      ['Inbox']
    );
    const inboxId = inboxIdResult.lastInsertRowId;
    console.log('Inbox project created with ID:', inboxId);

    // Add a sample project
    const projectIdResult = await db.runAsync(
      'INSERT INTO projects (name) VALUES (?)',
      ['My First Project']
    );
    const projectId = projectIdResult.lastInsertRowId;
    console.log('Project created with ID:', projectId);

    if (!projectId || !inboxId) {
      throw new Error('Failed to get project ID from insert result');
    }

    // Add sample tasks to inbox
    const inboxTask1 = await db.runAsync(
      'INSERT INTO tasks (project_id, title, description) VALUES (?, ?, ?)',
      [inboxId, 'Welcome to Inbox', 'This is your main workspace for quick tasks']
    );

    // Add sample tasks to regular project
    const task1 = await db.runAsync(
      'INSERT INTO tasks (project_id, title, description) VALUES (?, ?, ?)',
      [projectId, 'Design UI', 'Create wireframes']
    );
    const task2 = await db.runAsync(
      'INSERT INTO tasks (project_id, title, description) VALUES (?, ?, ?)',
      [projectId, 'Build API', 'Set up backend endpoints']
    );

    console.log('Tasks created with IDs:', inboxTask1.lastInsertRowId, task1.lastInsertRowId, task2.lastInsertRowId);

    // Add sample tags
    const tag1 = await db.runAsync(
      'INSERT INTO tags (name) VALUES (?)',
      ['UI']
    );
    const tag2 = await db.runAsync(
      'INSERT INTO tags (name) VALUES (?)',
      ['Backend']
    );

    console.log('Tags created with IDs:', tag1.lastInsertRowId, tag2.lastInsertRowId);

    // Link tasks with tags
    await db.runAsync('INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)', [task1.lastInsertRowId, tag1.lastInsertRowId]);
    await db.runAsync('INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)', [task2.lastInsertRowId, tag2.lastInsertRowId]);

    console.log('Sample data added successfully');
  } catch (error) {
    console.error('Error adding sample data:', error);
    throw error;
  }
}

// Accessor for database
export function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
  return db;
}

// Helper: execute with retry
export async function withRetry(operation, maxRetries = 3) {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      await initDatabase();
      return await operation();
    } catch (error) {
      lastError = error;
      console.log(`Retry ${i + 1}/${maxRetries} failed: ${error.message}`);
      db = null;
      initPromise = null;
      await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)));
    }
  }
  throw lastError;
}
