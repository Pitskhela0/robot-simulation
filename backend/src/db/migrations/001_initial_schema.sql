-- backend/src/db/migrations/001_initial_schema.sql
-- Simple initial database schema for robot simulation application

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Simulations table  
CREATE TABLE IF NOT EXISTS simulations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    grid_width INTEGER NOT NULL DEFAULT 10,
    grid_height INTEGER NOT NULL DEFAULT 10,
    status VARCHAR(50) DEFAULT 'created',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);

-- Robots table
CREATE TABLE IF NOT EXISTS robots (
    id SERIAL PRIMARY KEY,
    simulation_id INTEGER REFERENCES simulations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    x_position INTEGER DEFAULT 0,
    y_position INTEGER DEFAULT 0,
    direction VARCHAR(10) DEFAULT 'north',
    battery_level INTEGER DEFAULT 100,
    status VARCHAR(50) DEFAULT 'idle',
    color VARCHAR(7) DEFAULT '#3B82F6',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    simulation_id INTEGER REFERENCES simulations(id) ON DELETE CASCADE,
    robot_id INTEGER REFERENCES robots(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL,
    description TEXT,
    target_x INTEGER,
    target_y INTEGER,
    priority INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);

-- Walls table
CREATE TABLE IF NOT EXISTS walls (
    id SERIAL PRIMARY KEY,
    simulation_id INTEGER REFERENCES simulations(id) ON DELETE CASCADE,
    x_position INTEGER NOT NULL,
    y_position INTEGER NOT NULL,
    type VARCHAR(50) DEFAULT 'wall',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Statistics table
CREATE TABLE IF NOT EXISTS statistics (
    id SERIAL PRIMARY KEY,
    simulation_id INTEGER REFERENCES simulations(id) ON DELETE CASCADE,
    robot_id INTEGER REFERENCES robots(id) ON DELETE CASCADE,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10,2) NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_simulations_user_id ON simulations(user_id);
CREATE INDEX IF NOT EXISTS idx_simulations_status ON simulations(status);
CREATE INDEX IF NOT EXISTS idx_robots_simulation_id ON robots(simulation_id);
CREATE INDEX IF NOT EXISTS idx_robots_position ON robots(x_position, y_position);
CREATE INDEX IF NOT EXISTS idx_tasks_simulation_id ON tasks(simulation_id);
CREATE INDEX IF NOT EXISTS idx_tasks_robot_id ON tasks(robot_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_walls_simulation_id ON walls(simulation_id);
CREATE INDEX IF NOT EXISTS idx_walls_position ON walls(x_position, y_position);
CREATE INDEX IF NOT EXISTS idx_statistics_simulation_id ON statistics(simulation_id);
CREATE INDEX IF NOT EXISTS idx_statistics_robot_id ON statistics(robot_id);
CREATE INDEX IF NOT EXISTS idx_statistics_recorded_at ON statistics(recorded_at);