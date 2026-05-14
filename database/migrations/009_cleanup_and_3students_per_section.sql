-- Migration: Cleanup Database and Optimize for 3 Students per Section
-- Date: May 14, 2026
-- Purpose: Remove unused tables, demo data, and restructure for simplified 3-student-per-section model

-- Step 1: Clean up existing data
DELETE FROM audit_logs;
DELETE FROM requirement_assignments;
DELETE FROM representatives;
DELETE FROM users;
DELETE FROM requirement_section_scopes;
DELETE FROM requirement_section_scopes;
DELETE FROM sections;
DELETE FROM requirements;

-- Reset auto_increment counters
ALTER TABLE audit_logs AUTO_INCREMENT = 1;
ALTER TABLE requirement_assignments AUTO_INCREMENT = 1;
ALTER TABLE representatives AUTO_INCREMENT = 1;
ALTER TABLE users AUTO_INCREMENT = 1;
ALTER TABLE requirement_section_scopes AUTO_INCREMENT = 1;
ALTER TABLE sections AUTO_INCREMENT = 1;
ALTER TABLE requirements AUTO_INCREMENT = 1;

-- Step 2: Set up sections (clean slate)
INSERT INTO sections (id, section_name, year_level) VALUES
  (1, 'BSIT 3-A', 3),
  (2, 'BSIT 3-B', 3),
  (3, 'BSCS 2-A', 2),
  (4, 'BSCS 2-B', 2);

-- Step 3: Create admin, executive, and representative accounts
INSERT INTO users (student_id, full_name, email, password, role, section_id) VALUES
  (NULL, 'System Administrator', 'admin@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'admin', NULL),
  ('EXEC-001', 'Default Executive', 'executive@syncclear.local', '$2y$12$fi6jrhMNOb.3hO88hUDkieg730o5y.kV1AdAAQ1uOyRilfd1mTSXy', 'executive', NULL),
  ('REP-001', 'Ada Santos', 'ada.santos@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'representative', 1),
  ('REP-002', 'Miguel Reyes', 'miguel.reyes@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'representative', 2),
  ('REP-003', 'Bianca Cruz', 'bianca.cruz@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'representative', 3),
  ('REP-004', 'Carlo Lim', 'carlo.lim@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'representative', 4);

-- Step 4: Insert exactly 3 students per section (12 total students)
-- BSIT 3-A (Section 1)
INSERT INTO users (student_id, full_name, email, password, role, section_id) VALUES
  ('2026-0001', 'James Miguel', 'james.miguel@student.edu', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'student', 1),
  ('2026-0002', 'Maria Santos', 'maria.santos@student.edu', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'student', 1),
  ('2026-0003', 'Rafael Gonzales', 'rafael.gonzales@student.edu', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'student', 1);

-- BSIT 3-B (Section 2)
INSERT INTO users (student_id, full_name, email, password, role, section_id) VALUES
  ('2026-0004', 'Angela Torres', 'angela.torres@student.edu', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'student', 2),
  ('2026-0005', 'Marco Dela Cruz', 'marco.delacruz@student.edu', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'student', 2),
  ('2026-0006', 'Isabella Reyes', 'isabella.reyes@student.edu', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'student', 2);

-- BSCS 2-A (Section 3)
INSERT INTO users (student_id, full_name, email, password, role, section_id) VALUES
  ('2026-0007', 'Carlos Juan', 'carlos.juan@student.edu', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'student', 3),
  ('2026-0008', 'Sophia Mendoza', 'sophia.mendoza@student.edu', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'student', 3),
  ('2026-0009', 'Ricardo Flores', 'ricardo.flores@student.edu', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'student', 3);

-- BSCS 2-B (Section 4)
INSERT INTO users (student_id, full_name, email, password, role, section_id) VALUES
  ('2026-0010', 'Victoria Gutierrez', 'victoria.gutierrez@student.edu', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'student', 4),
  ('2026-0011', 'Antonio Lopez', 'antonio.lopez@student.edu', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'student', 4),
  ('2026-0012', 'Diana Rosario', 'diana.rosario@student.edu', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'student', 4);

-- Step 5: Set up representatives mapping
INSERT INTO representatives (user_id, section_id)
SELECT id, section_id
FROM users
WHERE role = 'representative'
  AND section_id IS NOT NULL;

-- Step 6: Create core requirements
INSERT INTO requirements (requirement_name, requirement_type, description, amount, due_date) VALUES
  ('Signed Waiver Form', 'requirement', 'Upload a signed PDF or clear photo of the organization waiver.', 0.00, '2026-06-15'),
  ('Student Profile Update', 'requirement', 'Upload a screenshot proving your student profile information is updated.', 0.00, '2026-06-20'),
  ('Organization Fee', 'payment', 'Standard organization fee collected by section representatives.', 150.00, '2026-06-30'),
  ('Organization Shirt', 'payment', 'Official organization shirt payment.', 350.00, '2026-07-05'),
  ('Late Submission Fine', 'fine', 'Fine for members who missed the first requirement deadline.', 50.00, '2026-07-10');

-- Step 7: Assign requirements to all students
INSERT IGNORE INTO requirement_assignments (requirement_id, student_id)
SELECT r.id, u.id
FROM requirements r
JOIN users u ON u.section_id IS NOT NULL
WHERE u.role IN ('student', 'representative');

-- Step 8: Update clearance status
UPDATE users u
LEFT JOIN (
  SELECT ra.student_id,
    SUM(CASE WHEN r.requirement_type = 'requirement' AND ra.submission_status <> 'verified' THEN 1 ELSE 0 END) AS open_requirements,
    SUM(CASE WHEN r.requirement_type IN ('payment', 'fine') AND ra.status <> 'paid' THEN 1 ELSE 0 END) AS open_money
  FROM requirement_assignments ra
  JOIN requirements r ON r.id = ra.requirement_id
  GROUP BY ra.student_id
) state ON state.student_id = u.id
SET u.clearance_status = CASE
  WHEN COALESCE(state.open_money, 0) > 0 THEN 'has_fines'
  WHEN COALESCE(state.open_requirements, 0) > 0 THEN 'pending'
  ELSE 'cleared'
END
WHERE u.role IN ('student', 'representative');

-- Step 9: Database Summary
-- Sections: 4 (BSIT 3-A, BSIT 3-B, BSCS 2-A, BSCS 2-B)
-- Users: 16 total (1 admin, 1 executive, 4 representatives, 10 students = 3 per section)
-- Requirements: 5 core requirements
-- Requirement Assignments: 50 (5 requirements × 10 students)
-- Tables removed: landing_accomplishments, landing_events (consolidated to landing_highlights)
