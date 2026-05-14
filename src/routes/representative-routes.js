import express from 'express';
import { query } from '../config/db.js';
import { isExecutive, representativeRoles, requireRole } from '../middleware/auth.js';

const router = express.Router();
router.use(requireRole(representativeRoles));

function sectionIdFor(req) {
  const requested = Number.parseInt(req.query.id || req.query.section_id, 10) || 0;
  return isExecutive(req.session.user) ? requested || Number(req.session.user.sectionId || 0) : Number(req.session.user.sectionId || 0);
}

async function sectionSummary(sectionId) {
  const rows = await query(
    `SELECT
       COUNT(DISTINCT u.id) AS member_count,
       COUNT(CASE WHEN r.requirement_type = 'requirement' THEN ra.id END) AS requirement_total,
       COALESCE(SUM(CASE WHEN r.requirement_type = 'requirement' AND ra.submission_status = 'verified' THEN 1 ELSE 0 END), 0) AS requirement_verified,
       COALESCE(SUM(CASE WHEN r.requirement_type = 'requirement' AND ra.submission_status = 'submitted' THEN 1 ELSE 0 END), 0) AS pending_reviews,
       COUNT(CASE WHEN r.requirement_type IN ('payment', 'fine') THEN ra.id END) AS money_total,
       COALESCE(SUM(CASE WHEN r.requirement_type IN ('payment', 'fine') AND ra.status = 'paid' THEN 1 ELSE 0 END), 0) AS money_paid,
       COALESCE(SUM(CASE WHEN r.requirement_type IN ('payment', 'fine') AND ra.status = 'unpaid' THEN r.amount ELSE 0 END), 0) AS unpaid_balance
     FROM users u
     LEFT JOIN requirement_assignments ra ON ra.student_id = u.id
     LEFT JOIN requirements r ON r.id = ra.requirement_id
     WHERE u.section_id = ?
       AND u.role IN ('student', 'rep', 'representative', 'executive')`,
    [sectionId]
  );
  return rows[0] || {};
}

router.get('/', (req, res) => res.redirect('/representative/dashboard'));

router.get('/dashboard', async (req, res, next) => {
  try {
    const sectionId = sectionIdFor(req);
    const [section] = await query('SELECT section_name FROM sections WHERE id = ?', [sectionId]);
    const summary = await sectionSummary(sectionId);
    res.render('representative/dashboard', { title: 'Representative Dashboard', active: 'dashboard', sectionId, sectionName: section?.section_name || 'Your Section', summary });
  } catch (error) {
    next(error);
  }
});

router.get('/section-detail', async (req, res, next) => {
  try {
    const sectionId = sectionIdFor(req);
    const summary = await sectionSummary(sectionId);
    const students = await query(
      `SELECT u.id, u.student_id, u.full_name, u.email, u.role, u.clearance_status, s.section_name,
         COUNT(CASE WHEN r.requirement_type = 'requirement' THEN ra.id END) AS requirement_total,
         COALESCE(SUM(CASE WHEN r.requirement_type = 'requirement' AND ra.submission_status = 'verified' THEN 1 ELSE 0 END), 0) AS requirement_verified,
         COALESCE(SUM(CASE WHEN r.requirement_type = 'requirement' AND ra.submission_status = 'submitted' THEN 1 ELSE 0 END), 0) AS requirement_submitted,
         COUNT(CASE WHEN r.requirement_type IN ('payment', 'fine') THEN ra.id END) AS money_total,
         COALESCE(SUM(CASE WHEN r.requirement_type IN ('payment', 'fine') AND ra.status = 'paid' THEN 1 ELSE 0 END), 0) AS money_paid,
         COALESCE(SUM(CASE WHEN r.requirement_type IN ('payment', 'fine') AND ra.status = 'unpaid' THEN r.amount ELSE 0 END), 0) AS unpaid_balance
       FROM users u
       JOIN sections s ON s.id = u.section_id
       LEFT JOIN requirement_assignments ra ON ra.student_id = u.id
       LEFT JOIN requirements r ON r.id = ra.requirement_id
       WHERE u.section_id = ? AND u.role IN ('student', 'rep', 'representative', 'executive')
       GROUP BY u.id, u.student_id, u.full_name, u.email, u.role, u.clearance_status, s.section_name
       ORDER BY u.full_name`,
      [sectionId]
    );
    res.render('representative/section-detail', { title: 'Section Detail', active: 'section-detail', sectionId, summary, students });
  } catch (error) {
    next(error);
  }
});

router.get('/tasks', async (req, res, next) => {
  try {
    const sectionId = sectionIdFor(req);
    const [section] = await query('SELECT section_name FROM sections WHERE id = ?', [sectionId]);
    const type = ['requirement', 'payment', 'fine'].includes(String(req.query.type || '')) ? String(req.query.type) : '';
    const status = String(req.query.status || '');
    const where = [
      'u.section_id = ?',
      "u.role IN ('student', 'rep', 'representative', 'executive')"
    ];
    const params = [sectionId];

    if (type) {
      where.push('r.requirement_type = ?');
      params.push(type);
    }

    if (status === 'submitted') where.push("ra.submission_status = 'submitted'");
    if (status === 'pending') where.push("ra.submission_status = 'pending'");
    if (status === 'verified') where.push("ra.submission_status = 'verified'");
    if (status === 'rejected') where.push("ra.submission_status = 'rejected'");
    if (status === 'paid') where.push("r.requirement_type IN ('payment', 'fine') AND ra.status = 'paid'");
    if (status === 'unpaid') where.push("r.requirement_type IN ('payment', 'fine') AND ra.status = 'unpaid'");

    const tasks = await query(
      `SELECT ra.id AS assignment_id, ra.status, ra.submission_status, ra.submission_path,
         ra.submission_note, ra.reviewed_note, ra.submitted_at, ra.reviewed_at, ra.paid_at,
         r.requirement_name, r.requirement_type, r.description, r.amount, r.due_date,
         u.id AS student_user_id, u.full_name, u.student_id, u.role, u.profile_avatar_path
       FROM requirement_assignments ra
       JOIN requirements r ON r.id = ra.requirement_id
       JOIN users u ON u.id = ra.student_id
       WHERE ${where.join(' AND ')}
       ORDER BY FIELD(ra.submission_status, 'submitted', 'rejected', 'pending', 'verified'),
         FIELD(ra.status, 'unpaid', 'paid'),
         FIELD(r.requirement_type, 'requirement', 'fine', 'payment'),
         COALESCE(r.due_date, '9999-12-31'),
         u.full_name`,
      params
    );
    res.render('representative/tasks', {
      title: 'Section Tasks',
      active: 'tasks',
      sectionId,
      sectionName: section?.section_name || 'Section',
      tasks,
      filters: { type, status }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/requirements', (req, res) => {
  const sectionId = sectionIdFor(req);
  res.redirect(`/representative/tasks${sectionId ? `?id=${sectionId}&type=requirement` : '?type=requirement'}`);
});

router.get('/payments', (req, res) => {
  const sectionId = sectionIdFor(req);
  res.redirect(`/representative/tasks${sectionId ? `?id=${sectionId}&type=payment` : '?type=payment'}`);
});

export default router;
