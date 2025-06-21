-- backend/src/db/migrations/004_add_wall_constraints.sql
-- Add wall-specific constraints and indexes

-- Add check constraint for valid wall types
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'walls_type_check' 
        AND table_name = 'walls'
    ) THEN
        ALTER TABLE walls ADD CONSTRAINT walls_type_check 
        CHECK (type IN ('wall', 'barrier', 'obstacle'));
    END IF;
END $$;

-- Add check constraint for non-negative coordinates
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'walls_coordinates_check' 
        AND table_name = 'walls'
    ) THEN
        ALTER TABLE walls ADD CONSTRAINT walls_coordinates_check 
        CHECK (x_position >= 0 AND y_position >= 0);
    END IF;
END $$;

-- Add unique constraint to prevent duplicate walls at same position
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'walls_unique_position' 
        AND table_name = 'walls'
    ) THEN
        ALTER TABLE walls ADD CONSTRAINT walls_unique_position 
        UNIQUE (simulation_id, x_position, y_position);
    END IF;
END $$;

-- Create additional indexes for wall queries
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_walls_type') THEN
        CREATE INDEX idx_walls_type ON walls(type);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_walls_coordinates') THEN
        CREATE INDEX idx_walls_coordinates ON walls(x_position, y_position);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_walls_simulation_coordinates') THEN
        CREATE INDEX idx_walls_simulation_coordinates ON walls(simulation_id, x_position, y_position);
    END IF;
END $$;