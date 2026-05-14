DELETE FROM requirements
WHERE requirement_name IN ('add weiver in said drive', 'sdad', 'asd', 'w');

UPDATE requirements
SET requirement_name = 'Organization Shirt',
    requirement_type = 'payment',
    description = 'Official organization shirt payment.',
    amount = 350.00,
    due_date = '2026-07-05'
WHERE requirement_name = 'Org Shirt';

UPDATE requirements
SET requirement_name = 'Signed Waiver Form',
    requirement_type = 'requirement',
    description = 'Upload a signed PDF or clear photo of the organization waiver.',
    amount = 0.00,
    due_date = '2026-06-15'
WHERE requirement_name = 'Waiver Form';

INSERT INTO requirements (requirement_name, requirement_type, description, amount, due_date, created_by)
SELECT 'Student Profile Update', 'requirement', 'Upload a screenshot proving your student profile information is updated.', 0.00, '2026-06-20', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM requirements WHERE requirement_name = 'Student Profile Update'
);

INSERT INTO requirements (requirement_name, requirement_type, description, amount, due_date, created_by)
SELECT 'Organization Fee', 'payment', 'Standard organization fee collected by section representatives.', 150.00, '2026-06-30', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM requirements WHERE requirement_name = 'Organization Fee'
);

INSERT INTO requirements (requirement_name, requirement_type, description, amount, due_date, created_by)
SELECT 'Late Submission Fine', 'fine', 'Fine for members who missed the first requirement deadline.', 50.00, '2026-07-10', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM requirements WHERE requirement_name = 'Late Submission Fine'
);

INSERT IGNORE INTO requirement_assignments (requirement_id, student_id)
SELECT r.id, u.id
FROM requirements r
JOIN users u ON u.section_id IS NOT NULL
WHERE u.role IN ('student', 'rep', 'representative', 'executive')
  AND r.requirement_name IN (
    'Signed Waiver Form',
    'Student Profile Update',
    'Organization Fee',
    'Organization Shirt',
    'Late Submission Fine'
  );

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
WHERE u.role IN ('student', 'rep', 'representative', 'executive');
