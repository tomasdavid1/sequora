-- Test users for TOC platform
-- Run this in Supabase SQL Editor

-- Insert test users into the existing User table
INSERT INTO public."User" (id, email, name, role, createdAt, updatedAt) VALUES
-- Admin user
('admin-001', 'admin@healthx.com', 'Admin User', 'ADMIN', NOW(), NOW()),

-- Staff users (nurses, doctors)
('staff-001', 'nurse1@healthx.com', 'Sarah Johnson', 'STAFF', NOW(), NOW()),
('staff-002', 'doctor1@healthx.com', 'Dr. Michael Chen', 'STAFF', NOW(), NOW()),
('staff-003', 'nurse2@healthx.com', 'Maria Rodriguez', 'STAFF', NOW(), NOW()),

-- Patient users
('patient-001', 'patient1@example.com', 'John Smith', 'PATIENT', NOW(), NOW()),
('patient-002', 'patient2@example.com', 'Jane Doe', 'PATIENT', NOW(), NOW()),
('patient-003', 'patient3@example.com', 'Robert Wilson', 'PATIENT', NOW(), NOW())

ON CONFLICT (id) DO NOTHING;

-- Create corresponding auth users (if using Supabase Auth)
-- Note: These will need to be created through the Supabase Auth UI or API
-- For now, we'll just create the User records

-- Update the landing page to show proper buttons
-- This will be handled in the Next.js code, not SQL
