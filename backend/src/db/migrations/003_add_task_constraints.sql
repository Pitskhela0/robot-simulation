-- backend/src/db/migrations/003_add_task_constraints.sql
-- Add task-specific constraints and indexes

-- Add check constraint for valid task types
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'tasks_type_check' 
        AND table_name = 'tasks'
    ) THEN
        ALTER TABLE tasks ADD CONSTRAINT tasks_type_check 
        CHECK (type IN ('pickup', 'putdown', 'cleaning', 'inspection'));
    END IF;
END $$;

-- Add check constraint for valid task status
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'tasks_status_check' 
        AND table_name = 'tasks'
    ) THEN
        ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
        CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'failed'));
    END IF;
END $$;

-- Add check constraint for valid priority (1-10)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'tasks_priority_check' 
        AND table_name = 'tasks'
    ) THEN
        ALTER TABLE tasks ADD CONSTRAINT tasks_priority_check 
        CHECK (priority >= 1 AND priority <= 10);
    END IF;
END $$;

-- Add check constraint for non-negative coordinates
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'tasks_coordinates_check' 
        AND table_name = 'tasks'
    ) THEN
        ALTER TABLE tasks ADD CONSTRAINT tasks_coordinates_check 
        CHECK (target_x >= 0 AND target_y >= 0);
    END IF;
END $$;

-- Create additional indexes for task queries
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tasks_type') THEN
        CREATE INDEX idx_tasks_type ON tasks(type);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tasks_priority') THEN
        CREATE INDEX idx_tasks_priority ON tasks(priority DESC);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tasks_coordinates') THEN
        CREATE INDEX idx_tasks_coordinates ON tasks(target_x, target_y);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tasks_created_at') THEN
        CREATE INDEX idx_tasks_created_at ON tasks(created_at);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tasks_status_priority') THEN
        CREATE INDEX idx_tasks_status_priority ON tasks(status, priority DESC);
    END IF;
END $$;