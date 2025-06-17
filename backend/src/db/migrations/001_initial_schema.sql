-- backend/src/db/migrations/001_initial_schema.sql
-- Simple initial database schema for robot simulation application

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Simulations table  
CREATE TABLE IF NOT EXISTS simulations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Robots table
CREATE TABLE IF NOT EXISTS robots (
    id SERIAL PRIMARY KEY,
    simulation_id INTEGER,
    name VARCHAR(100) NOT NULL,
    x_position INTEGER DEFAULT 0,
    y_position INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    simulation_id INTEGER,
    robot_id INTEGER,
    type VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Walls table
CREATE TABLE IF NOT EXISTS walls (
    id SERIAL PRIMARY KEY,
    simulation_id INTEGER,
    x_position INTEGER NOT NULL,
    y_position INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Statistics table
CREATE TABLE IF NOT EXISTS statistics (
    id SERIAL PRIMARY KEY,
    simulation_id INTEGER,
    robot_id INTEGER,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10,2) NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);