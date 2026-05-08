-- Create the projects table for resource grouping
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Add project_id foreign key to apps
ALTER TABLE apps ADD COLUMN project_id TEXT REFERENCES projects(id) ON DELETE SET NULL;

-- Add project_id foreign key to databases
ALTER TABLE databases ADD COLUMN project_id TEXT REFERENCES projects(id) ON DELETE SET NULL;
