-- Add missing columns to Supabase tables for sync functionality
-- Run this SQL in your Supabase SQL editor

-- Add created_at and updated_at columns to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add created_at and updated_at columns to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add created_at and updated_at columns to tags table
ALTER TABLE tags ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE tags ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add created_at and updated_at columns to task_tags table
ALTER TABLE task_tags ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE task_tags ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create triggers to automatically update the updated_at column
-- Projects table trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at 
    BEFORE UPDATE ON projects 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at 
    BEFORE UPDATE ON tasks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tags_updated_at ON tags;
CREATE TRIGGER update_tags_updated_at 
    BEFORE UPDATE ON tags 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_task_tags_updated_at ON task_tags;
CREATE TRIGGER update_task_tags_updated_at 
    BEFORE UPDATE ON task_tags 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update existing records to have current timestamp
UPDATE projects SET created_at = NOW(), updated_at = NOW() WHERE created_at IS NULL;
UPDATE tasks SET created_at = NOW(), updated_at = NOW() WHERE created_at IS NULL;
UPDATE tags SET created_at = NOW(), updated_at = NOW() WHERE created_at IS NULL;
UPDATE task_tags SET created_at = NOW(), updated_at = NOW() WHERE created_at IS NULL;
