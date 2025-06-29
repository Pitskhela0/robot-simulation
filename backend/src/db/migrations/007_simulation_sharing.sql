-- backend/src/db/migrations/007_simulation_sharing.sql
-- Add simulation sharing capabilities

-- Add is_public column to simulations table
ALTER TABLE simulations ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Create simulation_shares table
CREATE TABLE IF NOT EXISTS simulation_shares (
    id SERIAL PRIMARY KEY,
    simulation_id INTEGER REFERENCES simulations(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    permission_level VARCHAR(10) NOT NULL,
    shared_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    shared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    message TEXT,
    expires_at TIMESTAMP, -- Optional: for temporary shares
    
    -- Prevent duplicate shares
    UNIQUE(simulation_id, user_id)
);

-- Add permission level constraint
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'simulation_shares_permission_level_check' 
        AND table_name = 'simulation_shares'
    ) THEN
        ALTER TABLE simulation_shares ADD CONSTRAINT simulation_shares_permission_level_check 
        CHECK (permission_level IN ('read', 'write', 'admin'));
    END IF;
END $$;

-- Create indexes for better performance
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_simulation_shares_simulation_id') THEN
        CREATE INDEX idx_simulation_shares_simulation_id ON simulation_shares(simulation_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_simulation_shares_user_id') THEN
        CREATE INDEX idx_simulation_shares_user_id ON simulation_shares(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_simulation_shares_shared_by') THEN
        CREATE INDEX idx_simulation_shares_shared_by ON simulation_shares(shared_by);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_simulation_shares_expires_at') THEN
        CREATE INDEX idx_simulation_shares_expires_at ON simulation_shares(expires_at) WHERE expires_at IS NOT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_simulations_is_public') THEN
        CREATE INDEX idx_simulations_is_public ON simulations(is_public) WHERE is_public = true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_simulations_user_id_status') THEN
        CREATE INDEX idx_simulations_user_id_status ON simulations(user_id, status);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_simulations_updated_at') THEN
        CREATE INDEX idx_simulations_updated_at ON simulations(updated_at DESC);
    END IF;
END $$;

-- Create updated_at trigger for simulation_shares
CREATE OR REPLACE FUNCTION update_simulation_shares_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_simulation_shares_updated_at'
    ) THEN
        CREATE TRIGGER update_simulation_shares_updated_at 
            BEFORE UPDATE ON simulation_shares 
            FOR EACH ROW EXECUTE FUNCTION update_simulation_shares_updated_at_column();
    END IF;
END $$;

-- Create function to check if user can access simulation
CREATE OR REPLACE FUNCTION user_can_access_simulation(
    p_simulation_id INTEGER,
    p_user_id INTEGER,
    p_required_permission VARCHAR DEFAULT 'read'
)
RETURNS BOOLEAN AS $$
DECLARE
    v_is_owner BOOLEAN := false;
    v_is_public BOOLEAN := false;
    v_permission_level VARCHAR;
BEGIN
    -- Check if user is the owner
    SELECT (user_id = p_user_id), is_public
    INTO v_is_owner, v_is_public
    FROM simulations
    WHERE id = p_simulation_id;
    
    -- Owner has all permissions
    IF v_is_owner THEN
        RETURN true;
    END IF;
    
    -- Public simulations allow read access
    IF v_is_public AND p_required_permission = 'read' THEN
        RETURN true;
    END IF;
    
    -- Check shared permissions
    SELECT permission_level
    INTO v_permission_level
    FROM simulation_shares
    WHERE simulation_id = p_simulation_id AND user_id = p_user_id;
    
    -- No shared access
    IF v_permission_level IS NULL THEN
        RETURN false;
    END IF;
    
    -- Check permission level
    CASE p_required_permission
        WHEN 'read' THEN
            RETURN true; -- Any share level allows read
        WHEN 'write' THEN
            RETURN v_permission_level IN ('write', 'admin');
        WHEN 'admin' THEN
            RETURN v_permission_level = 'admin';
        WHEN 'share' THEN
            RETURN v_permission_level = 'admin';
        WHEN 'delete' THEN
            RETURN v_permission_level = 'admin';
        ELSE
            RETURN false;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Create function to get user's simulations with permissions
CREATE OR REPLACE FUNCTION get_user_simulations_with_permissions(
    p_user_id INTEGER,
    p_include_shared BOOLEAN DEFAULT true,
    p_include_public BOOLEAN DEFAULT false
)
RETURNS TABLE (
    simulation_id INTEGER,
    simulation_name VARCHAR,
    simulation_description TEXT,
    grid_width INTEGER,
    grid_height INTEGER,
    status VARCHAR,
    is_public BOOLEAN,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    owner_id INTEGER,
    owner_email VARCHAR,
    owner_first_name VARCHAR,
    owner_last_name VARCHAR,
    permission_level VARCHAR,
    is_owner BOOLEAN,
    can_read BOOLEAN,
    can_write BOOLEAN,
    can_delete BOOLEAN,
    can_share BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        s.id as simulation_id,
        s.name as simulation_name,
        s.description as simulation_description,
        s.grid_width,
        s.grid_height,
        s.status,
        s.is_public,
        s.created_at,
        s.updated_at,
        owner.id as owner_id,
        owner.email as owner_email,
        owner.first_name as owner_first_name,
        owner.last_name as owner_last_name,
        COALESCE(ss.permission_level, CASE WHEN s.user_id = p_user_id THEN 'owner' ELSE NULL END) as permission_level,
        (s.user_id = p_user_id) as is_owner,
        true as can_read, -- If returned, user can read
        CASE 
            WHEN s.user_id = p_user_id THEN true
            WHEN ss.permission_level IN ('write', 'admin') THEN true
            ELSE false
        END as can_write,
        CASE 
            WHEN s.user_id = p_user_id THEN true
            WHEN ss.permission_level = 'admin' THEN true
            ELSE false
        END as can_delete,
        CASE 
            WHEN s.user_id = p_user_id THEN true
            WHEN ss.permission_level = 'admin' THEN true
            ELSE false
        END as can_share
    FROM simulations s
    JOIN users owner ON s.user_id = owner.id
    LEFT JOIN simulation_shares ss ON s.id = ss.simulation_id AND ss.user_id = p_user_id
    WHERE 
        s.user_id = p_user_id -- User's own simulations
        OR (p_include_shared AND ss.user_id IS NOT NULL) -- Shared simulations
        OR (p_include_public AND s.is_public = true) -- Public simulations
    ORDER BY s.updated_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to duplicate simulation
CREATE OR REPLACE FUNCTION duplicate_simulation(
    p_source_simulation_id INTEGER,
    p_new_owner_id INTEGER,
    p_new_name VARCHAR DEFAULT NULL,
    p_new_description TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_source_sim RECORD;
    v_new_simulation_id INTEGER;
    v_robot_mapping JSONB := '{}';
    v_old_robot_id INTEGER;
    v_new_robot_id INTEGER;
    v_robot RECORD;
    v_task RECORD;
    v_wall RECORD;
BEGIN
    -- Get source simulation
    SELECT * INTO v_source_sim
    FROM simulations
    WHERE id = p_source_simulation_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Source simulation not found';
    END IF;
    
    -- Create new simulation
    INSERT INTO simulations (
        user_id, name, description, grid_width, grid_height,
        base_station_x, base_station_y, status, is_public
    ) VALUES (
        p_new_owner_id,
        COALESCE(p_new_name, 'Copy of ' || v_source_sim.name),
        COALESCE(p_new_description, 'Duplicated from "' || v_source_sim.name || '"'),
        v_source_sim.grid_width,
        v_source_sim.grid_height,
        v_source_sim.base_station_x,
        v_source_sim.base_station_y,
        'created',
        false -- Duplicates are private by default
    )
    RETURNING id INTO v_new_simulation_id;
    
    -- Copy robots and create mapping
    FOR v_robot IN 
        SELECT * FROM robots WHERE simulation_id = p_source_simulation_id
    LOOP
        INSERT INTO robots (
            simulation_id, name, version, x_position, y_position,
            direction, battery_level, status, color
        ) VALUES (
            v_new_simulation_id, v_robot.name, v_robot.version,
            v_robot.x_position, v_robot.y_position, v_robot.direction,
            v_robot.battery_level, v_robot.status, v_robot.color
        )
        RETURNING id INTO v_new_robot_id;
        
        -- Store robot ID mapping for tasks
        v_robot_mapping := jsonb_set(
            v_robot_mapping, 
            ARRAY[v_robot.id::text], 
            to_jsonb(v_new_robot_id)
        );
    END LOOP;
    
    -- Copy tasks (with robot mappings)
    FOR v_task IN 
        SELECT * FROM tasks WHERE simulation_id = p_source_simulation_id
    LOOP
        INSERT INTO tasks (
            simulation_id, robot_id, type, description,
            target_x, target_y, priority, status
        ) VALUES (
            v_new_simulation_id,
            CASE 
                WHEN v_task.robot_id IS NOT NULL THEN 
                    (v_robot_mapping->>v_task.robot_id::text)::INTEGER
                ELSE NULL
            END,
            v_task.type, v_task.description,
            v_task.target_x, v_task.target_y, v_task.priority, 'pending'
        );
    END LOOP;
    
    -- Copy walls
    FOR v_wall IN 
        SELECT * FROM walls WHERE simulation_id = p_source_simulation_id
    LOOP
        INSERT INTO walls (
            simulation_id, x_position, y_position, type
        ) VALUES (
            v_new_simulation_id, v_wall.x_position, v_wall.y_position, v_wall.type
        );
    END LOOP;
    
    RETURN v_new_simulation_id;
END;
$$ LANGUAGE plpgsql;

-- Create view for simulation statistics
CREATE OR REPLACE VIEW simulation_stats AS
SELECT 
    s.id as simulation_id,
    s.user_id,
    s.name,
    s.status,
    s.is_public,
    s.created_at,
    s.updated_at,
    COUNT(DISTINCT r.id) as robot_count,
    COUNT(DISTINCT t.id) as task_count,
    COUNT(DISTINCT w.id) as wall_count,
    COUNT(DISTINCT ss.user_id) as shared_user_count,
    COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed') as completed_tasks,
    COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'pending') as pending_tasks,
    COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'in_progress') as active_tasks
FROM simulations s
LEFT JOIN robots r ON s.id = r.simulation_id
LEFT JOIN tasks t ON s.id = t.simulation_id  
LEFT JOIN walls w ON s.id = w.simulation_id
LEFT JOIN simulation_shares ss ON s.id = ss.simulation_id
GROUP BY s.id, s.user_id, s.name, s.status, s.is_public, s.created_at, s.updated_at;

-- Insert some sample data for testing (optional)
-- Uncomment the following lines if you want sample sharing data

/*
-- Sample sharing (only if users exist)
INSERT INTO simulation_shares (simulation_id, user_id, permission_level, shared_by, message) 
SELECT 1, 2, 'write', 1, 'Sharing for collaboration'
WHERE EXISTS (SELECT 1 FROM simulations WHERE id = 1) 
  AND EXISTS (SELECT 1 FROM users WHERE id = 1)
  AND EXISTS (SELECT 1 FROM users WHERE id = 2)
  AND NOT EXISTS (SELECT 1 FROM simulation_shares WHERE simulation_id = 1 AND user_id = 2);
*/