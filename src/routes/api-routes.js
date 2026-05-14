import express from 'express';
import { query, transaction } from '../config/db.js';
import { isExecutive, representativeRoles, requireRole } from '../middleware/auth.js';
import { syncUserClearance } from '../services/clearance-service.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

router.get('/php-status', async (req, res) => {
  const phpInitPath = path.join(__dirname, '..', 'php', 'init.php');

  execFile('php', [phpInitPath, '--json'], { timeout: 5000 }, (error, stdout, stderr) => {
    if (error) {
      const message = stderr?.toString?.() || error.message || 'PHP status unavailable.';
      return res.status(500).json({ success: false, message });
    }

    try {
      const data = JSON.parse(String(stdout || ''));
      return res.json({ success: true, data });
    } catch {
      return res.status(500).json({ success: false, message: 'Invalid PHP status response.' });
    }
  });
});

router.get('/students/list', requireRole(representativeRoles), async (req, res, next) => {
  try {
    const sectionId = isExecutive(req.session.user)
      ? Number.parseInt(req.query.section_id, 10) || req.session.user.sectionId
      : req.session.user.sectionId;

    if (!sectionId) return res.json({ success: false, message: 'No section ID provided' });

    const students = await query(
      `SELECT u.id, u.student_id, u.full_name, u.email, u.role, u.clearance_status, s.section_name,
         COUNT(CASE WHEN r.requirement_type = 'requirement' THEN ra.id END) AS requirement_total,
         COALESCE(SUM(CASE WHEN r.requirement_type = 'requirement' AND ra.submission_status = 'verified' THEN 1 ELSE 0 END), 0) AS requirement_verified,
         COALESCE(SUM(CASE WHEN r.requirement_type = 'requirement' AND ra.submission_status = 'submitted' THEN 1 ELSE 0 END), 0) AS requirement_submitted,
         COUNT(CASE WHEN r.requirement_type IN ('payment', 'fine') THEN ra.id END) AS money_total,
         COALESCE(SUM(CASE WHEN r.requirement_type IN ('payment', 'fine') AND ra.status = 'paid' THEN 1 ELSE 0 END), 0) AS money_paid,
         COALESCE(SUM(CASE WHEN r.requirement_type IN ('payment', 'fine') AND ra.status = 'unpaid' THEN r.amount ELSE 0 END), 0) AS unpaid_balance
       FROM users u
       JOIN sections s ON u.section_id = s.id
       LEFT JOIN requirement_assignments ra ON ra.student_id = u.id
       LEFT JOIN requirements r ON r.id = ra.requirement_id
       WHERE u.section_id = ? AND u.role IN ('student', 'rep', 'representative', 'executive')
       GROUP BY u.id, u.student_id, u.full_name, u.email, u.role, u.clearance_status, s.section_name
       ORDER BY u.full_name`,
      [sectionId]
    );

    return res.json({ success: true, data: { students } });
  } catch (error) {
    return next(error);
  }
});

router.post('/requirements/review', requireRole(representativeRoles), async (req, res, next) => {
  const assignmentId = Number.parseInt(req.body.assignment_id, 10);
  const status = String(req.body.submission_status || '');
  const note = String(req.body.reviewed_note || '').trim() || null;
  const requestedSectionId = Number.parseInt(req.body.section_id, 10) || 0;
  const sectionId = isExecutive(req.session.user) ? requestedSectionId : req.session.user.sectionId;

  if (!assignmentId || !['verified', 'rejected'].includes(status)) {
    req.flash('error', 'Invalid review action.');
    return res.redirect(`/representative/tasks${sectionId ? `?id=${sectionId}&type=requirement` : '?type=requirement'}`);
  }

  try {
    const reviewed = await transaction(async (db) => {
      const [before] = await db.execute(
        `SELECT ra.submission_status, ra.requirement_id, ra.student_id, u.section_id
         FROM requirement_assignments ra
         JOIN users u ON u.id = ra.student_id
         WHERE ra.id = ?`,
        [assignmentId]
      );

      const params = [status, note, req.session.user.id, assignmentId];
      let guard = '';
      if (sectionId) {
        guard = ' AND u.section_id = ?';
        params.push(sectionId);
      }

      const [result] = await db.execute(
        `UPDATE requirement_assignments ra
         JOIN users u ON u.id = ra.student_id
         JOIN requirements r ON r.id = ra.requirement_id
         SET ra.submission_status = ?, ra.reviewed_note = ?, ra.reviewed_at = NOW(), ra.reviewed_by = ?
         WHERE ra.id = ? AND r.requirement_type = 'requirement' AND ra.submission_status = 'submitted'${guard}`,
        params
      );

      if (result.affectedRows === 0) return null;

      const item = before[0];
      if (item) {
        await syncUserClearance(db, item.student_id);
        await db.execute(
          `INSERT INTO audit_logs (actor_id, target_user_id, requirement_id, assignment_id, section_id, action, old_value, new_value, note)
           VALUES (?, ?, ?, ?, ?, 'requirement_review', ?, ?, ?)`,
          [req.session.user.id, item.student_id, item.requirement_id, assignmentId, item.section_id, item.submission_status, status, note]
        );
      }
      return item;
    });

    if (!reviewed) {
      req.flash('error', 'Submission not found or already reviewed.');
      return res.redirect(`/representative/tasks${sectionId ? `?id=${sectionId}&type=requirement` : '?type=requirement'}`);
    }

    req.flash('success', 'Requirement submission reviewed.');
    return res.redirect(`/representative/tasks${sectionId ? `?id=${sectionId}&type=requirement` : '?type=requirement'}`);
  } catch (error) {
    return next(error);
  }
});

router.post('/requirements/payment', requireRole(representativeRoles), async (req, res, next) => {
  const assignmentId = Number.parseInt(req.body.assignment_id, 10);
  const status = String(req.body.status || '');
  const note = String(req.body.reviewed_note || '').trim() || null;
  const requestedSectionId = Number.parseInt(req.body.section_id, 10) || 0;
  const sectionId = isExecutive(req.session.user) ? requestedSectionId : req.session.user.sectionId;

  if (!assignmentId || !['paid', 'unpaid'].includes(status)) {
    req.flash('error', 'Invalid payment update.');
    return res.redirect(`/representative/tasks${sectionId ? `?id=${sectionId}&type=payment` : '?type=payment'}`);
  }

  try {
    const reviewed = await transaction(async (db) => {
      const [before] = await db.execute(
        `SELECT ra.status, ra.submission_status, ra.requirement_id, ra.student_id, u.section_id
         FROM requirement_assignments ra
         JOIN users u ON u.id = ra.student_id
         WHERE ra.id = ?`,
        [assignmentId]
      );

      const submissionStatus = status === 'paid' ? 'verified' : 'rejected';
      const params = [status, status, submissionStatus, note, req.session.user.id, assignmentId];
      let guard = '';
      if (sectionId) {
        guard = ' AND u.section_id = ?';
        params.push(sectionId);
      }

      const [result] = await db.execute(
        `UPDATE requirement_assignments ra
         JOIN requirements r ON r.id = ra.requirement_id
         JOIN users u ON u.id = ra.student_id
         SET ra.status = ?,
             ra.paid_at = CASE WHEN ? = 'paid' THEN NOW() ELSE NULL END,
             ra.submission_status = ?,
             ra.reviewed_note = ?,
             ra.reviewed_at = NOW(),
             ra.reviewed_by = ?
         WHERE ra.id = ? AND r.requirement_type IN ('payment', 'fine')${guard}`,
        params
      );

      if (result.affectedRows === 0) return null;

      const item = before[0];
      if (item) {
        await syncUserClearance(db, item.student_id);
        await db.execute(
          `INSERT INTO audit_logs (actor_id, target_user_id, requirement_id, assignment_id, section_id, action, old_value, new_value, note)
           VALUES (?, ?, ?, ?, ?, 'payment_status_change', ?, ?, ?)`,
          [req.session.user.id, item.student_id, item.requirement_id, assignmentId, item.section_id, item.status, status, note]
        );
      }
      return item;
    });

    if (!reviewed) {
      req.flash('error', 'Payment task not found.');
      return res.redirect(`/representative/tasks${sectionId ? `?id=${sectionId}&type=payment` : '?type=payment'}`);
    }

    req.flash('success', 'Payment status updated.');
    return res.redirect(`/representative/tasks${sectionId ? `?id=${sectionId}&type=payment` : '?type=payment'}`);
  } catch (error) {
    return next(error);
  }
});

export default router;
