-- Initial Database Schema Migration
-- This migration sets up all tables, indexes, RLS policies, and seed data

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Import the full schema
\i ../schema.sql
