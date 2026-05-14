USE school_project;

-- Replace these password hashes after creating real accounts through the register form.
-- New student accounts default to role='student'. Assign section_id so representatives can manage them.

UPDATE users
SET role = 'representative', section_id = 1
WHERE email = 'representative@example.com';

UPDATE users
SET role = 'student', section_id = 1
WHERE email = 'student@example.com';
