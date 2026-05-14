import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool, transaction } from '../config/db.js';
import { assignExistingTasksToUser } from '../services/assignment-service.js';
import { syncUserClearance } from '../services/clearance-service.js';

const defaultPasswordHash = await bcrypt.hash('password123', 10);
const executivePasswordHash = await bcrypt.hash('executive123', 10);

const sections = [
  [1, 'BSIT 3-A', 3],
  [2, 'BSIT 3-B', 3]
];

const users = [
  {
    studentId: null,
    fullName: 'System Administrator',
    email: 'admin@syncclear.com',
    password: defaultPasswordHash,
    role: 'admin',
    sectionId: null
  },
  {
    studentId: 'EXEC-001',
    fullName: 'Default Executive',
    email: 'executive@syncclear.local',
    password: executivePasswordHash,
    role: 'executive',
    sectionId: 1
  },
  {
    studentId: 'REP-001',
    fullName: 'Juan Dela Cruz',
    email: 'rep1@syncclear.com',
    password: defaultPasswordHash,
    role: 'representative',
    sectionId: 1
  },
  {
    studentId: 'REP-002',
    fullName: 'Maria Santos',
    email: 'rep2@syncclear.com',
    password: defaultPasswordHash,
    role: 'representative',
    sectionId: 2
  },
  {
    studentId: '2026-0001',
    fullName: 'Liam Bautista',
    email: 'student1@syncclear.com',
    password: defaultPasswordHash,
    role: 'student',
    sectionId: 1
  },
  {
    studentId: '2026-0002',
    fullName: 'Sofia Aquino',
    email: 'student2@syncclear.com',
    password: defaultPasswordHash,
    role: 'student',
    sectionId: 2
  },
  {
    studentId: 'STUDENT-TEST',
    fullName: 'Juan Dela Cruz',
    email: 'student@test.com',
    password: defaultPasswordHash,
    role: 'student',
    sectionId: 1
  }
];

await transaction(async (db) => {
  for (const [id, name, yearLevel] of sections) {
    await db.execute(
      `INSERT INTO sections (id, section_name, year_level)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE section_name = VALUES(section_name), year_level = VALUES(year_level)`,
      [id, name, yearLevel]
    );
  }

  for (const user of users) {
    await db.execute(
      `INSERT INTO users (student_id, full_name, email, password, role, section_id)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         student_id = VALUES(student_id),
         full_name = VALUES(full_name),
         password = VALUES(password),
         role = VALUES(role),
         section_id = VALUES(section_id)`,
      [user.studentId, user.fullName, user.email, user.password, user.role, user.sectionId]
    );

    const [[savedUser]] = await db.execute('SELECT id, role, section_id FROM users WHERE email = ?', [user.email]);
    if (!savedUser) continue;

    if (savedUser.role === 'representative') {
      await db.execute("UPDATE users SET role = 'student' WHERE section_id = ? AND role IN ('rep', 'representative') AND id <> ?", [
        savedUser.section_id,
        savedUser.id
      ]);
      await db.execute('DELETE FROM representatives WHERE user_id = ? OR section_id = ?', [savedUser.id, savedUser.section_id]);
      await db.execute('INSERT INTO representatives (user_id, section_id) VALUES (?, ?)', [savedUser.id, savedUser.section_id]);
    }

    if (savedUser.section_id) {
      await assignExistingTasksToUser(db, savedUser.id, savedUser.section_id);
      await syncUserClearance(db, savedUser.id);
    }
  }
});

await pool.end();

console.log('Demo accounts are ready.');
console.log('Executive: executive@syncclear.local / executive123');
console.log('Admin: admin@syncclear.com / password123');
console.log('Representatives: rep1@syncclear.com, rep2@syncclear.com / password123');
console.log('Students: student1@syncclear.com, student2@syncclear.com, student@test.com / password123');
