-- backend/src/db/migrations/002_add_robot_version.sql
-- Add robot version column and update constraints

-- Add version column to robots table
ALTER TABLE robots ADD COLUMN IF NOT EXISTS version VARCHAR(10) DEFAULT 'V1';

-- Update battery_level column to allow higher capacities for V2 and V3 robots
ALTER TABLE robots ALTER COLUMN battery_level TYPE INTEGER;

-- Add check constraint for valid robot versions
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'robots_version_check' 
        AND table_name = 'robots'
    ) THEN
        ALTER TABLE robots ADD CONSTRAINT robots_version_check 
        CHECK (version IN ('V1', 'V2', 'V3'));
    END IF;
END $$;

-- Add check constraint for valid robot status
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'robots_status_check' 
        AND table_name = 'robots'
    ) THEN
        ALTER TABLE robots ADD CONSTRAINT robots_status_check 
        CHECK (status IN ('idle', 'moving', 'working', 'charging'));
    END IF;
END $$;

-- Add check constraint for valid battery level (0 to 200 for V3 robots)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'robots_battery_level_check' 
        AND table_name = 'robots'
    ) THEN
        ALTER TABLE robots ADD CONSTRAINT robots_battery_level_check 
        CHECK (battery_level >= 0 AND battery_level <= 200);
    END IF;
END $$;

-- Add check constraint for valid direction
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'robots_direction_check' 
        AND table_name = 'robots'
    ) THEN
        ALTER TABLE robots ADD CONSTRAINT robots_direction_check 
        CHECK (direction IN ('north', 'south', 'east', 'west'));
    END IF;
END $$;

-- Create index for robot version for performance
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_robots_version') THEN
        CREATE INDEX idx_robots_version ON robots(version);
    END IF;
END $$;

-- Create index for robot status for performance
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_robots_status') THEN
        CREATE INDEX idx_robots_status ON robots(status);
    END IF;
END $$;