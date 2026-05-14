CREATE TABLE IF NOT EXISTS landing_accomplishments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(140) NOT NULL,
  body TEXT NOT NULL,
  scope ENUM('public', 'students') NOT NULL DEFAULT 'public',
  display_accomplishment TINYINT(1) NOT NULL DEFAULT 1,
  metric_label VARCHAR(80) NULL,
  metric_value VARCHAR(80) NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS landing_events (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(140) NOT NULL,
  description TEXT NULL,
  scope ENUM('public', 'students') NOT NULL DEFAULT 'public',
  starts_at DATETIME NOT NULL,
  ends_at DATETIME NULL,
  location VARCHAR(160) NULL,
  registration_required TINYINT(1) NOT NULL DEFAULT 0,
  registration_url VARCHAR(255) NULL,
  display_event TINYINT(1) NOT NULL DEFAULT 1,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
