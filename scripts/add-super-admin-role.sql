-- Migration: Add super-admin role to user_roles check constraint
-- Run this script to update existing databases

-- Drop the existing check constraint
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;

-- Add the new check constraint with super-admin included
ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_check 
  CHECK (role IN ('super-admin', 'admin', 'teacher', 'student'));
