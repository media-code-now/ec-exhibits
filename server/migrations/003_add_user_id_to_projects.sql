-- Migration: Add user_id to projects table for user-based data isolation
-- Database: Neon Postgres
-- Date: 2025-11-19

-- Step 1: Add user_id column to projects table
ALTER TABLE projects 
ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Step 2: Create index for better query performance
CREATE INDEX idx_projects_user_id ON projects(user_id);

-- Step 3: (Optional) Backfill existing projects with a default user
-- Uncomment and replace 'your-user-id-here' with an actual user ID from your users table
-- You can find a user ID by running: SELECT id, email FROM users LIMIT 5;
-- UPDATE projects SET user_id = 'your-user-id-here' WHERE user_id IS NULL;

-- Step 4: (Optional) Make user_id required after backfilling
-- Uncomment after you've backfilled all existing projects
-- ALTER TABLE projects ALTER COLUMN user_id SET NOT NULL;

-- Verification queries:
-- Check the column was added:
-- \d projects

-- Check existing projects:
-- SELECT id, name, user_id FROM projects LIMIT 10;

-- Check users for backfilling:
-- SELECT id, email, display_name FROM users;
