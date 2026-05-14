DELETE FROM audit_logs;
DELETE FROM requirement_assignments;
DELETE FROM representatives;
DELETE FROM users;
DELETE FROM requirement_section_scopes;
DELETE FROM sections;

ALTER TABLE audit_logs AUTO_INCREMENT = 1;
ALTER TABLE requirement_assignments AUTO_INCREMENT = 1;
ALTER TABLE representatives AUTO_INCREMENT = 1;
ALTER TABLE users AUTO_INCREMENT = 1;
ALTER TABLE requirement_section_scopes AUTO_INCREMENT = 1;
ALTER TABLE sections AUTO_INCREMENT = 1;

INSERT INTO sections (id, section_name, year_level) VALUES
  (1, 'BSIT 3-A', 3),
  (2, 'BSIT 3-B', 3),
  (3, 'BSCS 2-A', 2),
  (4, 'BSCS 2-B', 2);

INSERT INTO users (student_id, full_name, email, password, role, section_id) VALUES
  (NULL, 'System Administrator', 'admin@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'admin', NULL),
  ('EXEC-001', 'Default Executive', 'executive@syncclear.local', '$2y$12$fi6jrhMNOb.3hO88hUDkieg730o5y.kV1AdAAQ1uOyRilfd1mTSXy', 'executive', NULL),
  ('REP-001', 'Ada Santos', 'rep1@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'representative', 1),
  ('REP-002', 'Miguel Reyes', 'rep2@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'representative', 2),
  ('REP-003', 'Bianca Cruz', 'rep3@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'representative', 3),
  ('REP-004', 'Carlo Lim', 'rep4@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'representative', 4);

CREATE TEMPORARY TABLE roster_numbers (n INT PRIMARY KEY);

INSERT INTO roster_numbers (n) VALUES
  (1), (2), (3), (4), (5), (6), (7), (8), (9), (10),
  (11), (12), (13), (14), (15), (16), (17), (18), (19), (20),
  (21), (22), (23), (24), (25), (26), (27), (28), (29), (30);

INSERT INTO users (student_id, full_name, email, password, role, section_id)
SELECT
  CONCAT('2026-', LPAD(((s.id - 1) * 30) + rn.n, 4, '0')),
  CONCAT('Student ', s.section_name, ' ', LPAD(rn.n, 2, '0')),
  CONCAT('student', ((s.id - 1) * 30) + rn.n, '@syncclear.com'),
  '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m',
  'student',
  s.id
FROM sections s
CROSS JOIN roster_numbers rn
ORDER BY s.id, rn.n;

DROP TEMPORARY TABLE roster_numbers;

INSERT INTO representatives (user_id, section_id)
SELECT id, section_id
FROM users
WHERE role = 'representative'
  AND section_id IS NOT NULL;

INSERT IGNORE INTO requirement_assignments (requirement_id, student_id)
SELECT r.id, u.id
FROM requirements r
JOIN users u ON u.section_id IS NOT NULL
WHERE u.role IN ('student', 'representative');

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
