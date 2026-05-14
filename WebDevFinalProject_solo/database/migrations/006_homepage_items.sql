CREATE TABLE IF NOT EXISTS homepage_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  item_type ENUM('accomplishment', 'event') NOT NULL DEFAULT 'accomplishment',
  title VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO homepage_items (item_type, title, description) VALUES
('accomplishment', 'Academic Excellence', 'CCIS continues to excel with strong student performance and successful graduate outcomes.'),
('accomplishment', 'Campus Growth', 'Our college supports growth in student services, programs, and academic support initiatives.'),
('accomplishment', 'Efficient Clearance', 'Streamlined clearance workflows help students and staff complete requirements faster.'),
('event', 'Graduation Ceremony', 'Celebrate student achievement at the upcoming graduation ceremony.'),
('event', 'Career Fair', 'Connect with employers and prepare for your next career step.'),
('event', 'Seminar Series', 'Attend seminars and workshops to boost academic and professional skills.');
