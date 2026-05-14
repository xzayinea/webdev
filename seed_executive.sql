USE school_project;

ALTER TABLE users
MODIFY role ENUM('admin', 'executive', 'rep', 'representative', 'student') NOT NULL DEFAULT 'student';

INSERT INTO users (student_id, full_name, email, password, role, section_id)
VALUES (
    'EXEC-001',
    'Default Executive',
    'executive@syncclear.local',
    '$2a$12$3lgoxVNQWz3.a/5zjAft3.WT9wGvn1Hk8enZkuRvAORvZHx/6jbz6',
    'executive',
    1
)
ON DUPLICATE KEY UPDATE
    full_name = VALUES(full_name),
    password = VALUES(password),
    role = VALUES(role),
    section_id = VALUES(section_id);
