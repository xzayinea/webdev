import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { pool, query } from '../config/db.js';
import { requireRole, studentRoles } from '../middleware/auth.js';
import { syncUserClearance } from '../services/clearance-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'requirements');
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (['application/pdf', 'image/jpeg', 'image/png'].includes(file.mimetype)) return cb(null, true);
    return cb(new Error('Only PDF, JPG, and PNG files are allowed.'));
  }
});

const router = express.Router();
router.use(requireRole(studentRoles));

router.get('/', (req, res) => res.redirect('/student/dashboard'));

router.get('/dashboard', async (req, res, next) => {
  try {
    const userId = req.session.user.id;
    const requirements = await query(
      `SELECT ra.id AS assignment_id, ra.status AS payment_status, ra.submission_status,
         ra.submission_path, ra.submission_note, ra.reviewed_note, ra.submitted_at, ra.reviewed_at,
         r.requirement_name, r.description, r.amount, r.due_date
       FROM requirement_assignments ra
       JOIN requirements r ON r.id = ra.requirement_id
       WHERE ra.student_id = ? AND r.requirement_type = 'requirement'
       ORDER BY COALESCE(r.due_date, '9999-12-31'), r.created_at DESC`,
      [userId]
    );
    const moneyTasks = await query(
      `SELECT ra.id AS assignment_id, ra.status AS payment_status, ra.submission_status,
         ra.submission_path, ra.submission_note, ra.reviewed_note, ra.submitted_at, ra.reviewed_at, ra.paid_at,
         r.requirement_name, r.requirement_type, r.description, r.amount, r.due_date
       FROM requirement_assignments ra
       JOIN requirements r ON r.id = ra.requirement_id
       WHERE ra.student_id = ? AND r.requirement_type IN ('payment', 'fine')
       ORDER BY ra.status DESC, COALESCE(r.due_date, '9999-12-31'), r.created_at DESC`,
      [userId]
    );
    res.render('student/dashboard', { title: 'Student Dashboard', active: 'dashboard', requirements, moneyTasks });
  } catch (error) {
    next(error);
  }
});

router.get('/settings', (req, res) => {
  res.redirect('/account/profile');
});

router.post('/requirements/upload', upload.single('submission'), async (req, res, next) => {
  const assignmentId = Number.parseInt(req.body.assignment_id, 10);
  const note = String(req.body.submission_note || '').trim() || null;
  const userId = req.session.user.id;

  try {
    if (!assignmentId || !req.file) {
      req.flash('error', 'Please choose a valid file.');
      return res.redirect('/student/dashboard');
    }

    const rows = await query(
      `SELECT ra.id, ra.submission_path
       FROM requirement_assignments ra
       JOIN requirements r ON r.id = ra.requirement_id
       WHERE ra.id = ? AND ra.student_id = ? AND r.requirement_type = 'requirement'`,
      [assignmentId, userId]
    );
    const assignment = rows[0];
    if (!assignment) {
      req.flash('error', 'Requirement not found.');
      return res.redirect('/student/dashboard');
    }

    const extension = path.extname(req.file.originalname).toLowerCase();
    const fileName = `requirement_${assignmentId}_user_${userId}_${Date.now()}${extension}`;
    const finalPath = path.join(uploadDir, fileName);
    fs.renameSync(req.file.path, finalPath);
    const publicPath = `uploads/requirements/${fileName}`;

    await pool.execute(
      `UPDATE requirement_assignments
       SET submission_status = 'submitted',
           submission_path = ?,
           submission_note = ?,
           reviewed_note = NULL,
           submitted_at = NOW(),
           reviewed_at = NULL,
           reviewed_by = NULL
       WHERE id = ? AND student_id = ?`,
      [publicPath, note, assignmentId, userId]
    );

    if (assignment.submission_path) {
      const oldPath = path.resolve(path.join(__dirname, '..', '..', assignment.submission_path));
      if (oldPath.startsWith(uploadDir) && fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    await syncUserClearance(pool, userId);
    req.flash('success', 'Requirement submitted for representative review.');
    return res.redirect('/student/dashboard');
  } catch (error) {
    return next(error);
  }
});

router.post('/payments/upload', upload.single('submission'), async (req, res, next) => {
  const assignmentId = Number.parseInt(req.body.assignment_id, 10);
  const note = String(req.body.submission_note || '').trim() || null;
  const userId = req.session.user.id;

  try {
    if (!assignmentId || !req.file) {
      req.flash('error', 'Please choose a valid payment proof file.');
      return res.redirect('/student/dashboard');
    }

    const rows = await query(
      `SELECT ra.id, ra.submission_path
       FROM requirement_assignments ra
       JOIN requirements r ON r.id = ra.requirement_id
       WHERE ra.id = ? AND ra.student_id = ? AND r.requirement_type IN ('payment', 'fine')`,
      [assignmentId, userId]
    );
    const assignment = rows[0];
    if (!assignment) {
      req.flash('error', 'Payment task not found.');
      return res.redirect('/student/dashboard');
    }

    const extension = path.extname(req.file.originalname).toLowerCase();
    const fileName = `payment_${assignmentId}_user_${userId}_${Date.now()}${extension}`;
    const finalPath = path.join(uploadDir, fileName);
    fs.renameSync(req.file.path, finalPath);
    const publicPath = `uploads/requirements/${fileName}`;

    await pool.execute(
      `UPDATE requirement_assignments
       SET submission_status = 'submitted',
           submission_path = ?,
           submission_note = ?,
           reviewed_note = NULL,
           submitted_at = NOW(),
           reviewed_at = NULL,
           reviewed_by = NULL
       WHERE id = ? AND student_id = ?`,
      [publicPath, note, assignmentId, userId]
    );

    if (assignment.submission_path) {
      const oldPath = path.resolve(path.join(__dirname, '..', '..', assignment.submission_path));
      if (oldPath.startsWith(uploadDir) && fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    await syncUserClearance(pool, userId);
    req.flash('success', 'Payment proof submitted for representative review.');
    return res.redirect('/student/dashboard');
  } catch (error) {
    return next(error);
  }
});

router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError || error.message === 'Only PDF, JPG, and PNG files are allowed.') {
    req.flash('error', error.code === 'LIMIT_FILE_SIZE' ? 'File must be 5MB or smaller.' : error.message);
    return res.redirect('/student/dashboard');
  }
  return next(error);
});

export default router;
