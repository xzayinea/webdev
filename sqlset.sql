CREATE DATABASE IF NOT EXISTS school_project;
USE school_project;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS requirement_section_scopes;
DROP TABLE IF EXISTS requirement_assignments;
DROP TABLE IF EXISTS requirements;
DROP TABLE IF EXISTS representatives;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS sections;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE sections (
    id INT PRIMARY KEY AUTO_INCREMENT,
    section_name VARCHAR(50) NOT NULL UNIQUE,
    year_level INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id VARCHAR(50) UNIQUE DEFAULT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'executive', 'rep', 'representative', 'student') NOT NULL DEFAULT 'student',
    section_id INT NULL,
    org_fee_status ENUM('unpaid', 'paid') NOT NULL DEFAULT 'unpaid',
    org_shirt_status ENUM('unpaid', 'paid') NOT NULL DEFAULT 'unpaid',
    document_status ENUM('missing', 'submitted', 'verified') NOT NULL DEFAULT 'missing',
    clearance_status ENUM('pending', 'cleared', 'has_fines') NOT NULL DEFAULT 'pending',
    document_path VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL
);

CREATE TABLE representatives (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    section_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
    UNIQUE (user_id),
    UNIQUE (section_id)
);

CREATE TABLE requirements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    requirement_name VARCHAR(120) NOT NULL,
    requirement_type ENUM('requirement', 'payment', 'fine') NOT NULL DEFAULT 'requirement',
    description TEXT NULL,
    amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    due_date DATE NULL,
    created_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE requirement_assignments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    requirement_id INT NOT NULL,
    student_id INT NOT NULL,
    status ENUM('unpaid', 'paid') NOT NULL DEFAULT 'unpaid',
    submission_status ENUM('pending', 'submitted', 'verified', 'rejected') NOT NULL DEFAULT 'pending',
    submission_path VARCHAR(255) NULL,
    submission_note TEXT NULL,
    reviewed_note TEXT NULL,
    submitted_at TIMESTAMP NULL,
    reviewed_at TIMESTAMP NULL,
    reviewed_by INT NULL,
    paid_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (requirement_id) REFERENCES requirements(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE (requirement_id, student_id)
);

CREATE TABLE requirement_section_scopes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    requirement_id INT NOT NULL,
    section_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (requirement_id) REFERENCES requirements(id) ON DELETE CASCADE,
    FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
    UNIQUE (requirement_id, section_id)
);

CREATE TABLE audit_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    actor_id INT NULL,
    target_user_id INT NULL,
    requirement_id INT NULL,
    assignment_id INT NULL,
    section_id INT NULL,
    action VARCHAR(80) NOT NULL,
    old_value VARCHAR(120) NULL,
    new_value VARCHAR(120) NULL,
    note TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (requirement_id) REFERENCES requirements(id) ON DELETE SET NULL,
    FOREIGN KEY (assignment_id) REFERENCES requirement_assignments(id) ON DELETE SET NULL,
    FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL
);

INSERT INTO sections (id, section_name, year_level) VALUES
(1, 'BSIT 3-A', 3),
(2, 'BSIT 3-B', 3),
(3, 'BSCS 1-A', 1),
(4, 'BSCS 1-B', 1),
(5, 'BSIT 2-A', 2),
(6, 'BSIT 2-B', 2),
(7, 'BSIS 4-A', 4),
(8, 'BSIS 4-B', 4);

-- Email: admin@syncclear.com | Password: password123
INSERT INTO users (full_name, email, password, role) VALUES
('System Administrator', 'admin@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'admin');

-- Email: executive@syncclear.local | Password: executive123
INSERT INTO users (student_id, full_name, email, password, role, section_id) VALUES
('EXEC-001', 'Default Executive', 'executive@syncclear.local', '$2y$12$fi6jrhMNOb.3hO88hUDkieg730o5y.kV1AdAAQ1uOyRilfd1mTSXy', 'executive', 1);

-- Representative emails: rep1@syncclear.com through rep8@syncclear.com | Password: password123
INSERT INTO users (id, student_id, full_name, email, password, role, section_id) VALUES
(101, 'REP-001', 'Juan Dela Cruz', 'rep1@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'representative', 1),
(102, 'REP-002', 'Maria Santos', 'rep2@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'representative', 2),
(103, 'REP-003', 'Carlo Reyes', 'rep3@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'representative', 3),
(104, 'REP-004', 'Alyssa Garcia', 'rep4@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'representative', 4),
(105, 'REP-005', 'Miguel Ramos', 'rep5@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'representative', 5),
(106, 'REP-006', 'Bianca Cruz', 'rep6@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'representative', 6),
(107, 'REP-007', 'Paolo Mendoza', 'rep7@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'representative', 7),
(108, 'REP-008', 'Nina Villanueva', 'rep8@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'representative', 8);

INSERT INTO representatives (user_id, section_id) VALUES
(101, 1), (102, 2), (103, 3), (104, 4), (105, 5), (106, 6), (107, 7), (108, 8);

-- Student emails: student1@syncclear.com through student40@syncclear.com | Password: password123
INSERT INTO users (id, student_id, full_name, email, password, role, section_id) VALUES
(201, '2026-0001', 'Liam Bautista', 'student1@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'student', 1),
(202, '2026-0002', 'Sofia Aquino', 'student2@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'student', 1),
(203, '2026-0003', 'Noah Lim', 'student3@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'student', 1),
(204, '2026-0004', 'Mika Tan', 'student4@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'student', 1),
(205, '2026-0005', 'Ethan Yu', 'student5@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'student', 1),
(206, '2026-0006', 'Iris Navarro', 'student6@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'student', 2),
(207, '2026-0007', 'Lucas Sy', 'student7@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'student', 2),
(208, '2026-0008', 'Clara Ong', 'student8@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'student', 2),
(209, '2026-0009', 'Andre Flores', 'student9@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'student', 2),
(210, '2026-0010', 'Rhea Mercado', 'student10@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'student', 2),
(211, '2026-0011', 'Gab Cruz', 'student11@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'student', 3),
(212, '2026-0012', 'Ella David', 'student12@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'student', 3),
(213, '2026-0013', 'Theo Enriquez', 'student13@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'student', 3),
(214, '2026-0014', 'Aya Ferrer', 'student14@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'student', 3),
(215, '2026-0015', 'Ken Gonzales', 'student15@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'student', 3),
(216, '2026-0016', 'Mia Herrera', 'student16@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'student', 4),
(217, '2026-0017', 'Zed Ibarra', 'student17@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'student', 4),
(218, '2026-0018', 'Lea Jimenez', 'student18@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'student', 4),
(219, '2026-0019', 'Owen Kho', 'student19@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'student', 4),
(220, '2026-0020', 'Tala Lopez', 'student20@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'student', 4),
(221, '2026-0021', 'Rafi Manalo', 'student21@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'student', 5),
(222, '2026-0022', 'Jana Natividad', 'student22@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'student', 5),
(223, '2026-0023', 'Coby Ortega', 'student23@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'student', 5),
(224, '2026-0024', 'Yna Paredes', 'student24@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'student', 5),
(225, '2026-0025', 'Nico Quiambao', 'student25@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'student', 5),
(226, '2026-0026', 'Sam Rivera', 'student26@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'student', 6),
(227, '2026-0027', 'Dani Salazar', 'student27@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'student', 6),
(228, '2026-0028', 'Renz Torres', 'student28@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'student', 6),
(229, '2026-0029', 'Kara Uy', 'student29@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'student', 6),
(230, '2026-0030', 'Vince Valdez', 'student30@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'student', 6),
(231, '2026-0031', 'Bea Wong', 'student31@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'student', 7),
(232, '2026-0032', 'Ian Xavier', 'student32@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'student', 7),
(233, '2026-0033', 'Jill Yabut', 'student33@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'student', 7),
(234, '2026-0034', 'Mark Zamora', 'student34@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'student', 7),
(235, '2026-0035', 'Cia Angeles', 'student35@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'student', 7),
(236, '2026-0036', 'Elio Bernardo', 'student36@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'student', 8),
(237, '2026-0037', 'Faye Castillo', 'student37@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'student', 8),
(238, '2026-0038', 'Gino Diaz', 'student38@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'student', 8),
(239, '2026-0039', 'Hazel Estrella', 'student39@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'student', 8),
(240, '2026-0040', 'Ivan Fajardo', 'student40@syncclear.com', '$2y$12$PVcDC5/aWcFsDLoF1MrHwOJK2xNPKe7/1q0JKuFsYd3L0hVoDwZ8m', 'student', 8);

INSERT INTO requirements (id, requirement_name, requirement_type, description, amount, due_date, created_by) VALUES
(1, 'Signed Waiver Form', 'requirement', 'Upload a signed PDF or clear photo of the organization waiver.', 0.00, '2026-06-15', NULL),
(2, 'Student Profile Update', 'requirement', 'Upload a screenshot proving your student profile information is updated.', 0.00, '2026-06-20', NULL),
(3, 'Organization Fee', 'payment', 'Standard organization fee collected by section representatives.', 150.00, '2026-06-30', NULL),
(4, 'Organization Shirt', 'payment', 'Official organization shirt payment.', 350.00, '2026-07-05', NULL),
(5, 'Late Submission Fine', 'fine', 'Fine for members who missed the first requirement deadline.', 50.00, '2026-07-10', NULL);

INSERT INTO requirement_assignments (requirement_id, student_id, status, submission_status)
SELECT r.id, u.id,
       CASE
           WHEN r.requirement_type IN ('payment', 'fine') AND MOD(u.id + r.id, 3) = 0 THEN 'paid'
           ELSE 'unpaid'
       END,
       CASE
           WHEN r.requirement_type = 'requirement' AND MOD(u.id + r.id, 4) = 0 THEN 'verified'
           WHEN r.requirement_type = 'requirement' AND MOD(u.id + r.id, 4) = 1 THEN 'submitted'
           WHEN r.requirement_type = 'requirement' AND MOD(u.id + r.id, 4) = 2 THEN 'rejected'
           ELSE 'pending'
       END
FROM requirements r
JOIN users u ON u.section_id IS NOT NULL
WHERE u.role IN ('student', 'representative', 'executive');

UPDATE requirement_assignments
SET paid_at = NOW()
WHERE status = 'paid';

UPDATE requirement_assignments
SET submitted_at = NOW()
WHERE submission_status IN ('submitted', 'verified', 'rejected');

UPDATE requirement_assignments
SET reviewed_at = NOW(), reviewed_by = 101
WHERE submission_status IN ('verified', 'rejected');

UPDATE users u
LEFT JOIN (
    SELECT ra.student_id,
           COALESCE(SUM(CASE WHEN r.requirement_type = 'requirement' AND ra.submission_status <> 'verified' THEN 1 ELSE 0 END), 0) AS open_requirements,
           COALESCE(SUM(CASE WHEN r.requirement_type IN ('payment', 'fine') AND ra.status <> 'paid' THEN r.amount ELSE 0 END), 0) AS unpaid_balance
    FROM requirement_assignments ra
    JOIN requirements r ON r.id = ra.requirement_id
    GROUP BY ra.student_id
) status ON status.student_id = u.id
SET u.clearance_status = CASE
    WHEN COALESCE(status.open_requirements, 0) = 0 AND COALESCE(status.unpaid_balance, 0) <= 0 THEN 'cleared'
    WHEN COALESCE(status.unpaid_balance, 0) > 0 THEN 'has_fines'
    ELSE 'pending'
END
WHERE u.section_id IS NOT NULL;
