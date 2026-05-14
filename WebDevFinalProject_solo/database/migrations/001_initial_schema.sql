CREATE TABLE IF NOT EXISTS sections (
  id INT PRIMARY KEY AUTO_INCREMENT,
  section_name VARCHAR(50) NOT NULL UNIQUE,
  year_level INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
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

CREATE TABLE IF NOT EXISTS representatives (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  section_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
  UNIQUE (user_id),
  UNIQUE (section_id)
);

CREATE TABLE IF NOT EXISTS requirements (
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

CREATE TABLE IF NOT EXISTS requirement_assignments (
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

CREATE TABLE IF NOT EXISTS requirement_section_scopes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  requirement_id INT NOT NULL,
  section_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (requirement_id) REFERENCES requirements(id) ON DELETE CASCADE,
  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
  UNIQUE (requirement_id, section_id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
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
