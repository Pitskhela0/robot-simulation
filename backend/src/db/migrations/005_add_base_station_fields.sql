-- backend/src/db/migrations/005_add_base_station_fields.sql
-- Add base station coordinates to simulations table

-- Add base station coordinate columns
ALTER TABLE simulations 
ADD COLUMN IF NOT EXISTS base_station_x INTEGER,
ADD COLUMN IF NOT EXISTS base_station_y INTEGER;

-- Add check constraints to ensure coordinates are non-negative when provided
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'simulations_base_station_x_check' 
        AND table_name = 'simulations'
    ) THEN
        ALTER TABLE simulations ADD CONSTRAINT simulations_base_station_x_check 
        CHECK (base_station_x IS NULL OR base_station_x >= 0);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'simulations_base_station_y_check' 
        AND table_name = 'simulations'
    ) THEN
        ALTER TABLE simulations ADD CONSTRAINT simulations_base_station_y_check 
        CHECK (base_station_y IS NULL OR base_station_y >= 0);
    END IF;
END $$;

-- Create index for base station coordinates (for future queries)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_simulations_base_station') THEN
        CREATE INDEX idx_simulations_base_station ON simulations(base_station_x, base_station_y);
    END IF;
END $$;