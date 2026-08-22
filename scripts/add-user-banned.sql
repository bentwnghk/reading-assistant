-- Migration: Add banned flag to users (super-admin ban feature)

ALTER TABLE users ADD COLUMN IF NOT EXISTS banned BOOLEAN DEFAULT FALSE;
