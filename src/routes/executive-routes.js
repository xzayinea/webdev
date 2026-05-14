import express from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { pool, query, transaction } from '../config/db.js';
import { requireRole, executiveRoles } from '../middleware/auth.js';
import { assignExistingTasksToUser, assignRequirementToScope, selectedSectionIds } from '../services/assignment-service.js';
import { syncAllClearance, syncUserClearance } from '../services/clearance-service.js';
import { buildPagination, getPagination, pageUrl } from '../services/pagination-service.js';
import { hasAttemptedDashboardHighlightChanges, normalizeDashboardHighlights } from '../services/highlights-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const highlightsUploadDir = path.join(__dirname, '..', '..', 'uploads', 'highlights');
fs.mkdirSync(highlightsUploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, highlightsUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
});

const router = express.Router();
router.use(requireRole(executiveRoles));

function intValue(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function returnTo(body, fallback = 'dashboard') {
  return String(body.return_to || fallback).replace(/[^a-z-]/g, '') || fallback;
}

function parseDashboardHighlightsRequest(req) {
  const highlightsMap = {};

  const body = req.body || {};

  // Multer (via append-field) typically expands bracket notation into nested objects:
  // req.body.highlights = { "1": { title: "...", ... }, "2": {...} }
  // Older/alternate middleware can keep flat keys like: "highlights[1][title]": "..."
  if (body?.highlights && typeof body.highlights === 'object') {
    for (const [index, fields] of Object.entries(body.highlights)) {
      if (!fields || typeof fields !== 'object') continue;
      highlightsMap[index] ||= {};
      for (const [field, value] of Object.entries(fields)) {
        highlightsMap[index][field] = value;
      }
    }
  } else {
    // Parse flat multipart field names like highlights[1][title]
    Object.keys(body).forEach((key) => {
      const match = key.match(/^highlights\[(\d+)\]\[(\w+)\]$/);
      if (!match) return;
      const index = match[1];
      const field = match[2];
      highlightsMap[index] ||= {};
      highlightsMap[index][field] = body[key];
    });
  }

  // Allow the client to send an existing server image path when swapping cards without uploading a new file.
  // Only accept paths under the expected uploads directory to avoid arbitrary file references.
  for (const highlight of Object.values(highlightsMap)) {
    if (!highlight?.image_path) continue;
    const candidate = String(highlight.image_path || '').trim();
    if (!candidate) continue;
    highlight.image_path = candidate.startsWith('/uploads/highlights/') ? candidate : '';
  }

  // Attach uploaded files (multer uses fieldname as sent by the browser)
  if (Array.isArray(req.files)) {
    for (const file of req.files) {
      const match = file.fieldname.match(/^highlights\[(\d+)\]\[image\]$/);
      if (!match) continue;
      const index = match[1];
      highlightsMap[index] ||= {};
      highlightsMap[index].image_path = `/uploads/highlights/${file.filename}`;
    }
  }

  return Object.values(highlightsMap);
}

async function saveDashboardHighlights(req) {
  const highlights = parseDashboardHighlightsRequest(req);
  let savedCount = 0;
  let clearedCount = 0;

  await transaction(async (db) => {
    for (const highlight of highlights) {
      const id = intValue(highlight.id);
      const title = String(highlight.title || '').trim();
      const description = String(highlight.description || '');
      const eventDate = String(highlight.event_date || '').trim();
      const displayHighlight = highlight.display_highlight !== undefined ? intValue(highlight.display_highlight) : 1;
      const cardPosition = highlight.card_position ? intValue(highlight.card_position) : null;
      const hasAttemptedChanges = hasAttemptedDashboardHighlightChanges({
        description,
        event_date: eventDate,
        image_path: highlight.image_path
      });

      // If a card had an existing highlight but the title was cleared, treat it as "remove from landing".
      if (id > 0 && !title) {
        await db.execute(
          `UPDATE landing_highlights
           SET card_position = NULL, display_highlight = 0
           WHERE id = ? AND type = 'announcement'`,
          [id]
        );
        clearedCount++;
        continue;
      }

      // Ignore completely empty cards with no existing highlight.
      if (!title) {
        if (hasAttemptedChanges) {
          throw new Error('Title is required to save a highlight (image/description changes were detected).');
        }
        continue;
      }

      if (!eventDate) {
        throw new Error(`Event date is required for highlight: "${title}"`);
      }

      if (!cardPosition || ![1, 2, 3].includes(cardPosition)) {
        throw new Error(`Invalid card position for highlight: "${title}"`);
      }

      // Enforce at most one highlight per card slot.
      await db.execute(
        `UPDATE landing_highlights
         SET card_position = NULL
         WHERE type = 'announcement' AND card_position = ? AND id <> ?`,
        [cardPosition, id || 0]
      );

      if (id > 0) {
        const imagePath = highlight.image_path;
        const sql = imagePath
          ? `UPDATE landing_highlights
             SET title = ?, description = ?, event_date = ?, image_path = ?, display_highlight = ?, card_position = ?
             WHERE id = ? AND type = 'announcement'`
          : `UPDATE landing_highlights
             SET title = ?, description = ?, event_date = ?, display_highlight = ?, card_position = ?
             WHERE id = ? AND type = 'announcement'`;
        const params = imagePath
          ? [title, description, eventDate, imagePath, displayHighlight, cardPosition, id]
          : [title, description, eventDate, displayHighlight, cardPosition, id];
        const [result] = await db.execute(sql, params);

        if (!result?.affectedRows) {
          await db.execute(
            `INSERT INTO landing_highlights (title, description, event_date, type, display_highlight, created_by, scope, image_path, card_position)
             VALUES (?, ?, ?, 'announcement', ?, ?, 'public', ?, ?)`,
            [title, description, eventDate, displayHighlight, req.session.user.id, imagePath || null, cardPosition]
          );
        }
      } else {
        await db.execute(
          `INSERT INTO landing_highlights (title, description, event_date, type, display_highlight, created_by, scope, image_path, card_position)
           VALUES (?, ?, ?, 'announcement', ?, ?, 'public', ?, ?)`,
          [title, description, eventDate, displayHighlight, req.session.user.id, highlight.image_path || null, cardPosition]
        );
      }

      savedCount++;
    }
  });

  return { savedCount, clearedCount };
}

router.get('/', (req, res) => res.redirect('/executive/dashboard'));

router.get('/dashboard', async (req, res, next) => {
  try {
    let moneySummary = { collected: 0, outstanding: 0 };
    let topSummary = { section_count: 0, member_count: 0, pending_reviews: 0 };
    let sections = [];
    let highlights = [];

    try {
      const result = await query(
        `SELECT
           COALESCE(SUM(CASE WHEN ra.status = 'paid' THEN r.amount ELSE 0 END), 0) AS collected,
           COALESCE(SUM(CASE WHEN ra.status = 'unpaid' THEN r.amount ELSE 0 END), 0) AS outstanding
         FROM requirement_assignments ra
         JOIN requirements r ON r.id = ra.requirement_id
         WHERE r.requirement_type IN ('payment', 'fine')`
      );
      if (result && result[0]) {
        moneySummary = result[0];
      }
    } catch (error) {
      console.error('Error fetching money summary:', error);
    }

    try {
      const result = await query(
        `SELECT
           (SELECT COUNT(*) FROM sections) AS section_count,
           (SELECT COUNT(*) FROM users WHERE section_id IS NOT NULL AND role IN ('student', 'rep', 'representative', 'executive')) AS member_count,
           (SELECT COUNT(*) FROM requirement_assignments ra JOIN requirements r ON r.id = ra.requirement_id WHERE r.requirement_type = 'requirement' AND ra.submission_status = 'submitted') AS pending_reviews`
      );
      if (result && result[0]) {
        topSummary = result[0];
      }
    } catch (error) {
      console.error('Error fetching top summary:', error);
    }

    try {
      sections = await query(
        `SELECT s.id, s.section_name,
           COALESCE(rep.full_name, 'No representative') AS representative,
           COUNT(DISTINCT st.id) AS member_count,
           COUNT(CASE WHEN r.requirement_type IN ('payment', 'fine') THEN ra.id END) AS money_total,
           COALESCE(SUM(CASE WHEN r.requirement_type IN ('payment', 'fine') AND ra.status = 'paid' THEN 1 ELSE 0 END), 0) AS money_paid,
           COALESCE(SUM(CASE WHEN r.requirement_type IN ('payment', 'fine') AND ra.status = 'unpaid' THEN r.amount ELSE 0 END), 0) AS unpaid_balance,
           COUNT(CASE WHEN r.requirement_type = 'requirement' THEN ra.id END) AS requirement_total,
           COALESCE(SUM(CASE WHEN r.requirement_type = 'requirement' AND ra.submission_status = 'verified' THEN 1 ELSE 0 END), 0) AS requirement_verified,
           COALESCE(SUM(CASE WHEN r.requirement_type = 'requirement' AND ra.submission_status = 'submitted' THEN 1 ELSE 0 END), 0) AS pending_reviews,
           MAX(COALESCE(ra.reviewed_at, ra.submitted_at, ra.paid_at, ra.created_at, st.created_at)) AS last_updated
         FROM sections s
         LEFT JOIN representatives reps ON reps.section_id = s.id
         LEFT JOIN users rep ON rep.id = reps.user_id
         LEFT JOIN users st ON st.section_id = s.id AND st.role IN ('student', 'rep', 'representative', 'executive')
         LEFT JOIN requirement_assignments ra ON ra.student_id = st.id
         LEFT JOIN requirements r ON r.id = ra.requirement_id
         GROUP BY s.id, s.section_name
         ORDER BY s.section_name`
      );
    } catch (error) {
      console.error('Error fetching sections:', error);
      sections = [];
    }

    try {
      highlights = await query(
        `SELECT id, title, description, image_path, event_date, scope, display_highlight, type, card_position, created_at, updated_at
         FROM landing_highlights
         WHERE type = 'announcement' AND card_position BETWEEN 1 AND 3
         ORDER BY card_position ASC, updated_at DESC, id DESC`
      );
      highlights = normalizeDashboardHighlights(highlights, 3);
    } catch (error) {
      if (error.code !== 'ER_NO_SUCH_TABLE') {
        console.error('Error fetching highlights:', error);
      }
      highlights = [];
    }
    
    res.render('executive/dashboard', { title: 'Executive Board', active: 'dashboard', moneySummary, topSummary, sections, highlights });
  } catch (error) {
    next(error);
  }
});

router.get('/sections', async (req, res, next) => {
  try {
    const sections = await query(
      `SELECT s.id, s.section_name, s.year_level,
         COALESCE(rep.full_name, 'No representative') AS representative,
         COUNT(DISTINCT st.id) AS member_count,
         COUNT(CASE WHEN r.requirement_type = 'requirement' THEN ra.id END) AS requirement_total,
         COALESCE(SUM(CASE WHEN r.requirement_type = 'requirement' AND ra.submission_status = 'verified' THEN 1 ELSE 0 END), 0) AS requirement_verified,
         COUNT(CASE WHEN r.requirement_type IN ('payment', 'fine') THEN ra.id END) AS money_total,
         COALESCE(SUM(CASE WHEN r.requirement_type IN ('payment', 'fine') AND ra.status = 'paid' THEN 1 ELSE 0 END), 0) AS money_paid,
         COALESCE(SUM(CASE WHEN r.requirement_type IN ('payment', 'fine') AND ra.status = 'unpaid' THEN r.amount ELSE 0 END), 0) AS unpaid_balance
       FROM sections s
       LEFT JOIN representatives reps ON reps.section_id = s.id
       LEFT JOIN users rep ON rep.id = reps.user_id
       LEFT JOIN users st ON st.section_id = s.id AND st.role IN ('student', 'rep', 'representative', 'executive')
       LEFT JOIN requirement_assignments ra ON ra.student_id = st.id
       LEFT JOIN requirements r ON r.id = ra.requirement_id
       GROUP BY s.id, s.section_name, s.year_level, rep.full_name
       ORDER BY s.year_level, s.section_name`
    );
    res.render('executive/sections', { title: 'Sections', active: 'sections', sections });
  } catch (error) {
    next(error);
  }
});

router.get('/students', async (req, res, next) => {
  try {
    const sections = await query('SELECT id, section_name FROM sections ORDER BY section_name');
    const paginationInput = getPagination(req.query, { pageSize: 10 });
    const where = ["u.section_id IS NOT NULL", "u.role IN ('student', 'rep', 'representative', 'executive')"];
    const params = [];
    const having = [];

    const search = String(req.query.q || '').trim();
    const sectionId = intValue(req.query.section_id);
    const role = String(req.query.role || '');
    const paymentStatus = String(req.query.payment_status || '');
    const requirementStatus = String(req.query.requirement_status || '');

    if (search) {
      where.push('(u.full_name LIKE ? OR u.email LIKE ? OR u.student_id LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (sectionId > 0) {
      where.push('u.section_id = ?');
      params.push(sectionId);
    }
    if (['student', 'rep', 'representative', 'executive'].includes(role)) {
      where.push('u.role = ?');
      params.push(role);
    }
    if (paymentStatus === 'paid') having.push('unpaid_balance <= 0');
    if (paymentStatus === 'unpaid') having.push('unpaid_balance > 0');
    if (requirementStatus === 'complete') having.push('requirement_verified = requirement_total');
    if (requirementStatus === 'pending') having.push('requirement_verified < requirement_total');

    const baseSql =
      `SELECT u.id, u.student_id, u.full_name, u.email, u.role, u.section_id,
         COALESCE(s.section_name, 'Unassigned') AS section_name,
         COUNT(CASE WHEN r.requirement_type = 'requirement' THEN ra.id END) AS requirement_total,
         COALESCE(SUM(CASE WHEN r.requirement_type = 'requirement' AND ra.submission_status = 'verified' THEN 1 ELSE 0 END), 0) AS requirement_verified,
         COUNT(CASE WHEN r.requirement_type IN ('payment', 'fine') THEN ra.id END) AS money_total,
         COALESCE(SUM(CASE WHEN r.requirement_type IN ('payment', 'fine') AND ra.status = 'paid' THEN 1 ELSE 0 END), 0) AS money_paid,
         COALESCE(SUM(CASE WHEN r.requirement_type IN ('payment', 'fine') AND ra.status = 'unpaid' THEN r.amount ELSE 0 END), 0) AS unpaid_balance
       FROM users u
       LEFT JOIN sections s ON s.id = u.section_id
       LEFT JOIN requirement_assignments ra ON ra.student_id = u.id
       LEFT JOIN requirements r ON r.id = ra.requirement_id
       WHERE ${where.join(' AND ')}
       GROUP BY u.id, u.student_id, u.full_name, u.email, u.role, u.section_id, s.section_name
       ${having.length ? `HAVING ${having.join(' AND ')}` : ''}`;
    const countRows = await query(`SELECT COUNT(*) AS total FROM (${baseSql}) AS student_rows`, params);
    const students = await query(
      `${baseSql}
       ORDER BY section_name, full_name
       LIMIT ? OFFSET ?`,
      [...params, paginationInput.limit, paginationInput.offset]
    );
    const studentIds = students.map((student) => Number(student.id)).filter((id) => id > 0);
    const issuesByStudent = Object.fromEntries(studentIds.map((id) => [id, { requirements: [], money: [], submitted: [] }]));

    if (studentIds.length) {
      const placeholders = studentIds.map(() => '?').join(', ');
      const assignmentRows = await query(
        `SELECT ra.student_id, ra.submission_status, ra.status AS payment_status, ra.submission_note, ra.reviewed_note,
           r.requirement_name, r.requirement_type, r.description, r.amount, r.due_date
         FROM requirement_assignments ra
         JOIN requirements r ON r.id = ra.requirement_id
         WHERE ra.student_id IN (${placeholders})
         ORDER BY COALESCE(r.due_date, '9999-12-31'), r.requirement_type, r.requirement_name`,
        studentIds
      );

      for (const row of assignmentRows) {
        const bucket = issuesByStudent[row.student_id];
        if (!bucket) continue;

        if (row.requirement_type === 'requirement') {
          if (row.submission_status === 'submitted') bucket.submitted.push(row);
          if (row.submission_status !== 'verified') bucket.requirements.push(row);
        } else if (row.payment_status !== 'paid') {
          bucket.money.push(row);
        }
      }
    }

    res.render('executive/students', {
      title: 'Students',
      active: 'students',
      sections,
      students,
      issuesByStudent,
      filters: { search, sectionId, role, paymentStatus, requirementStatus },
      pagination: buildPagination(countRows[0]?.total, paginationInput),
      pageUrl: (page) => pageUrl(req, page)
    });
  } catch (error) {
    next(error);
  }
});

async function renderTasks(req, res, next) {
  try {
    const sections = await query('SELECT id, section_name FROM sections ORDER BY section_name');
    const paginationInput = getPagination(req.query, { pageSize: 10 });
    const type = ['requirement', 'payment', 'fine'].includes(String(req.query.type || '')) ? String(req.query.type) : '';
    const status = String(req.query.status || '');
    const due = String(req.query.due || '');
    const sectionId = intValue(req.query.section_id);
    const having = [];
    const where = [];
    const params = [];
    let sectionJoin = '';

    if (type) {
      where.push('r.requirement_type = ?');
      params.push(type);
    }

    if (status === 'pending') {
      having.push(`(
        (requirement_type = 'requirement' AND verified_count < assigned_count)
        OR (requirement_type IN ('payment', 'fine') AND paid_count < assigned_count)
      )`);
    }
    if (status === 'submitted') having.push('submitted_count > 0');
    if (status === 'complete') {
      having.push(`assigned_count > 0 AND (
        (requirement_type = 'requirement' AND verified_count = assigned_count)
        OR (requirement_type IN ('payment', 'fine') AND paid_count = assigned_count)
      )`);
    }
    if (status === 'unpaid') having.push("requirement_type IN ('payment', 'fine') AND paid_count < assigned_count");
    if (status === 'paid') having.push("requirement_type IN ('payment', 'fine') AND assigned_count > 0 AND paid_count = assigned_count");

    if (due === 'overdue') having.push('r.due_date IS NOT NULL AND r.due_date < CURDATE()');
    if (due === 'upcoming') having.push('r.due_date IS NOT NULL AND r.due_date >= CURDATE()');
    if (due === 'none') having.push('r.due_date IS NULL');

    if (sectionId > 0) {
      sectionJoin = `LEFT JOIN requirement_section_scopes rss_filter ON rss_filter.requirement_id = r.id`;
      having.push(`(
        FIND_IN_SET(?, COALESCE(scoped_section_ids, '')) > 0
        OR scoped_section_ids IS NULL
      )`);
      params.push(sectionId);
    }

    const baseSql =
      `SELECT r.id, r.requirement_name, r.requirement_type, r.description, r.amount, r.due_date, r.created_at,
         COUNT(DISTINCT ra.id) AS assigned_count,
         COUNT(DISTINCT CASE WHEN ra.submission_status = 'submitted' THEN ra.id END) AS submitted_count,
         COUNT(DISTINCT CASE WHEN ra.submission_status = 'verified' THEN ra.id END) AS verified_count,
         COUNT(DISTINCT CASE WHEN ra.status = 'paid' THEN ra.id END) AS paid_count,
         GROUP_CONCAT(DISTINCT rss.section_id) AS scoped_section_ids,
         GROUP_CONCAT(DISTINCT s.section_name ORDER BY s.section_name SEPARATOR ', ') AS scoped_sections
       FROM requirements r
       LEFT JOIN requirement_assignments ra ON ra.requirement_id = r.id
       LEFT JOIN requirement_section_scopes rss ON rss.requirement_id = r.id
       LEFT JOIN sections s ON s.id = rss.section_id
       ${sectionJoin}
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       GROUP BY r.id, r.requirement_name, r.requirement_type, r.description, r.amount, r.due_date, r.created_at
       ${having.length ? `HAVING ${having.join(' AND ')}` : ''}`;
    const countRows = await query(`SELECT COUNT(*) AS total FROM (${baseSql}) AS task_rows`, params);
    const tasks = await query(
      `${baseSql}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, paginationInput.limit, paginationInput.offset]
    );
    res.render('executive/tasks', {
      title: 'Tasks',
      active: 'tasks',
      sections,
      tasks,
      filters: { type, status, due, sectionId },
      pagination: buildPagination(countRows[0]?.total, paginationInput),
      pageUrl: (page) => pageUrl(req, page)
    });
  } catch (error) {
    next(error);
  }
}

router.get('/tasks', renderTasks);
router.get('/task', (req, res) => res.redirect('/executive/tasks'));
router.get('/requirements', (req, res) => res.redirect('/executive/tasks?type=requirement'));
router.get('/payments', (req, res) => res.redirect('/executive/tasks?type=payment'));
router.get('/fines', (req, res) => res.redirect('/executive/tasks?type=fine'));

router.get('/student-actions', async (req, res, next) => {
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
    res.render('executive/student-actions', { title: 'My Student Actions', active: 'student-actions', requirements, moneyTasks });
  } catch (error) {
    next(error);
  }
});

// Accomplishments and Events routes consolidated to highlights
// Landing content now uses landing_highlights table only

router.get('/events', async (req, res, next) => {
  try {
    const events = await query(
      `SELECT id, title, description, scope, event_date AS starts_at, NULL AS ends_at, NULL AS location, 0 AS registration_required, NULL AS registration_url, display_highlight AS display_event
       FROM landing_highlights
       WHERE type = 'event' OR type IS NULL
       ORDER BY event_date ASC, created_at DESC`
    );
    res.render('executive/events', { title: 'Events', active: 'events', events });
  } catch (error) {
    next(error);
  }
});

router.get('/highlights', (req, res) => res.redirect('/executive/dashboard'));

router.get('/accomplishments', async (req, res, next) => {
  try {
    let accomplishments = [];
    let sections = [];
    try {
      accomplishments = await query(
        `SELECT id, title, description, scope, display_highlight, metric_value, metric_label, display_order, created_at
         FROM landing_highlights
         WHERE type = 'accomplishment'
         ORDER BY display_order ASC, created_at DESC`
      );
    } catch (error) {
      if (error.code !== 'ER_NO_SUCH_TABLE') {
        throw error;
      }
    }
    
    try {
      sections = await query(
        `SELECT s.id, s.section_name,
           COALESCE(rep.full_name, 'No representative') AS representative,
           COUNT(DISTINCT st.id) AS member_count,
           COUNT(CASE WHEN r.requirement_type IN ('payment', 'fine') THEN ra.id END) AS money_total,
           COALESCE(SUM(CASE WHEN r.requirement_type IN ('payment', 'fine') AND ra.status = 'paid' THEN 1 ELSE 0 END), 0) AS money_paid,
           COUNT(CASE WHEN r.requirement_type = 'requirement' THEN ra.id END) AS requirement_total,
           COALESCE(SUM(CASE WHEN r.requirement_type = 'requirement' AND ra.submission_status = 'verified' THEN 1 ELSE 0 END), 0) AS requirement_verified
         FROM sections s
         LEFT JOIN representatives reps ON reps.section_id = s.id
         LEFT JOIN users rep ON rep.id = reps.user_id
         LEFT JOIN users st ON st.section_id = s.id AND st.role IN ('student', 'rep', 'representative', 'executive')
         LEFT JOIN requirement_assignments ra ON ra.student_id = st.id
         LEFT JOIN requirements r ON r.id = ra.requirement_id
         GROUP BY s.id, s.section_name
         ORDER BY s.section_name`
      );
    } catch (error) {
      console.error('Error fetching sections:', error);
      sections = [];
    }
    
    res.render('executive/accomplishments', { title: 'Accomplishments', active: 'accomplishments', accomplishments, sections, body: req.body });
  } catch (error) {
    next(error);
  }
});

router.get('/audit', async (req, res, next) => {
  try {
    const paginationInput = getPagination(req.query, { pageSize: 25 });
    const action = String(req.query.action || '').trim();
    const search = String(req.query.q || '').trim();
    const where = [];
    const params = [];

    if (action) {
      where.push('al.action = ?');
      params.push(action);
    }

    if (search) {
      where.push('(actor.full_name LIKE ? OR target.full_name LIKE ? OR r.requirement_name LIKE ? OR al.note LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const baseSql =
      `SELECT al.id, al.action, al.old_value, al.new_value, al.note, al.created_at,
         COALESCE(actor.full_name, 'System') AS actor_name,
         COALESCE(target.full_name, 'Deleted user') AS target_name,
         COALESCE(r.requirement_name, 'Deleted task') AS requirement_name,
         COALESCE(s.section_name, 'No section') AS section_name
       FROM audit_logs al
       LEFT JOIN users actor ON actor.id = al.actor_id
       LEFT JOIN users target ON target.id = al.target_user_id
       LEFT JOIN requirements r ON r.id = al.requirement_id
       LEFT JOIN sections s ON s.id = al.section_id
       ${whereSql}`;

    const countRows = await query(`SELECT COUNT(*) AS total FROM (${baseSql}) AS audit_rows`, params);
    const logs = await query(
      `${baseSql}
       ORDER BY created_at DESC, id DESC
       LIMIT ? OFFSET ?`,
      [...params, paginationInput.limit, paginationInput.offset]
    );
    const actions = await query('SELECT DISTINCT action FROM audit_logs ORDER BY action');

    res.render('executive/audit', {
      title: 'Audit Trail',
      active: 'audit',
      logs,
      actions,
      filters: { action, search },
      pagination: buildPagination(countRows[0]?.total, paginationInput),
      pageUrl: (page) => pageUrl(req, page)
    });
  } catch (error) {
    next(error);
  }
});

router.get('/settings', async (req, res, next) => {
  try {
    const sections = await query('SELECT id, section_name FROM sections ORDER BY section_name');
    const users = await query(
      `SELECT u.id, u.full_name, u.email, u.student_id, u.role, u.section_id, COALESCE(s.section_name, 'Unassigned') AS section_name
       FROM users u
       LEFT JOIN sections s ON s.id = u.section_id
       WHERE u.role <> 'admin'
       ORDER BY u.role, u.full_name`
    );
    res.render('executive/settings', { title: 'Settings', active: 'settings', sections, users });
  } catch (error) {
    next(error);
  }
});

router.post('/dashboard-highlights', upload.any(), async (req, res, next) => {
  try {
    const { savedCount, clearedCount } = await saveDashboardHighlights(req);
    if (savedCount === 0 && clearedCount === 0) {
      req.flash('error', 'No highlight changes were provided to save.');
      return res.redirect('/executive/dashboard');
    }
    req.flash('success', 'Highlights saved successfully.');
    return res.redirect('/executive/dashboard');
  } catch (error) {
    console.error('Error saving highlights:', error);
    req.flash('error', error.message || 'Failed to save highlights.');
    return res.redirect('/executive/dashboard');
  }
});

router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError || error.message === 'Only images are allowed') {
    const message = error.code === 'LIMIT_FILE_SIZE' ? 'Images must be 5MB or smaller.' : error.message;
    if (req.accepts('json') && !req.accepts('html')) {
      return res.status(400).json({ success: false, message });
    }
    req.flash('error', message);
    return res.redirect(req.get('Referer') || '/executive/dashboard');
  }
  return next(error);
});

router.post('/actions', upload.any(), async (req, res, next) => {
  const action = req.body.action;
  try {
    if (['add_requirement', 'update_requirement'].includes(action)) {
      const name = String(req.body.requirement_name || '').trim();
      const type = String(req.body.requirement_type || 'requirement');
      const description = String(req.body.description || '').trim() || null;
      const amount = type === 'requirement' ? 0 : Number(req.body.amount || 0);
      const dueDate = String(req.body.due_date || '').trim() || null;
      const sectionIds = await selectedSectionIds(req.body.section_ids);

      if (!name || !['requirement', 'payment', 'fine'].includes(type) || amount < 0 || (type !== 'requirement' && amount <= 0)) {
        req.flash('error', 'Enter a valid task.');
        return res.redirect(`/executive/${returnTo(req.body)}`);
      }

      await transaction(async (db) => {
        let requirementId = intValue(req.body.requirement_id);
        if (action === 'add_requirement') {
          const [result] = await db.execute(
            `INSERT INTO requirements (requirement_name, requirement_type, description, amount, due_date, created_by)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [name, type, description, amount, dueDate, req.session.user.id]
          );
          requirementId = result.insertId;
        } else {
          await db.execute(
            `UPDATE requirements SET requirement_name = ?, requirement_type = ?, description = ?, amount = ?, due_date = ?
             WHERE id = ?`,
            [name, type, description, amount, dueDate, requirementId]
          );
          await db.execute('DELETE FROM requirement_section_scopes WHERE requirement_id = ?', [requirementId]);
        }
        await assignRequirementToScope(db, requirementId, sectionIds);
        await syncAllClearance(db);
      });

      req.flash('success', action === 'add_requirement' ? 'Task deployed to students.' : 'Task updated.');
      return res.redirect(`/executive/${returnTo(req.body)}`);
    }

    if (action === 'delete_requirement') {
      await pool.execute('DELETE FROM requirements WHERE id = ?', [intValue(req.body.requirement_id)]);
      await syncAllClearance(pool);
      req.flash('success', 'Task deleted.');
      return res.redirect(`/executive/${returnTo(req.body)}`);
    }

    // Events functionality removed - landing_events table was dropped in migration 010
    if (['add_event', 'update_event', 'delete_event'].includes(action)) {
      req.flash('error', 'Events feature has been removed. Use Highlights instead.');
      return res.redirect('/executive/dashboard');
    }

    if (['add_highlight', 'update_highlight'].includes(action)) {
      const title = String(req.body.title || '').trim();
      const description = String(req.body.description || '').trim();
      const eventDate = String(req.body.event_date || '').trim();
      const type = String(req.body.type || 'announcement');
      const cardPosition = req.body.card_position ? intValue(req.body.card_position) : null;
      const displayHighlight = req.body.display_highlight ? 1 : 0;
      let imagePath = null;

      if (!title || !description || !eventDate || !['announcement', 'accomplishment'].includes(type) || (cardPosition && ![1, 2, 3].includes(cardPosition))) {
        req.flash('error', 'Enter a valid announcement.');
        return res.redirect('/executive/dashboard');
      }

      // Handle file upload if present (multer style)
      const file = Array.isArray(req.files) ? req.files.find(f => f.fieldname === 'image') : null;
      if (file) {
        imagePath = `/uploads/highlights/${file.filename}`;
      }

      try {
        if (action === 'add_highlight') {
          if (!imagePath) {
            req.flash('error', 'Please upload an image for the announcement.');
            return res.redirect('/executive/dashboard');
          }
          await pool.execute(
            `INSERT INTO landing_highlights
               (title, description, image_path, card_position, type, event_date, display_highlight, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, description, imagePath, cardPosition, type, eventDate, displayHighlight, req.session.user.id]
          );
          req.flash('success', 'Announcement added to the landing page.');
        } else {
          const highlightId = intValue(req.body.highlight_id);
          const updateFields = imagePath
            ? `title = ?, description = ?, image_path = ?, card_position = ?, type = ?, event_date = ?, display_highlight = ?`
            : `title = ?, description = ?, card_position = ?, type = ?, event_date = ?, display_highlight = ?`;
          const updateValues = imagePath
            ? [title, description, imagePath, cardPosition, type, eventDate, displayHighlight, highlightId]
            : [title, description, cardPosition, type, eventDate, displayHighlight, highlightId];

          await pool.execute(
            `UPDATE landing_highlights SET ${updateFields} WHERE id = ?`,
            updateValues
          );
          req.flash('success', 'Announcement updated.');
        }
      } catch (error) {
        if (error.code === 'ER_NO_SUCH_TABLE') {
          req.flash('error', 'Highlights feature is not yet available. Please contact administrator.');
        } else {
          throw error;
        }
      }
      return res.redirect('/executive/dashboard');
    }

    if (action === 'delete_highlight') {
      try {
        await pool.execute('DELETE FROM landing_highlights WHERE id = ?', [intValue(req.body.highlight_id)]);
        req.flash('success', 'Announcement deleted.');
      } catch (error) {
        if (error.code !== 'ER_NO_SUCH_TABLE') {
          throw error;
        }
      }
      return res.redirect('/executive/dashboard');
    }

    if (action === 'save_dashboard_highlights') {
      try {
        const { savedCount, clearedCount } = await saveDashboardHighlights(req);
        if (savedCount === 0 && clearedCount === 0) {
          return res.json({ success: false, message: 'No highlight changes were provided to save.' });
        }
        return res.json({ success: true, message: 'Highlights saved successfully' });
      } catch (error) {
        console.error('Error saving highlights:', error);
        return res.json({ success: false, message: error.message });
      }
    }

    if (action === 'add_section') {
      await pool.execute('INSERT INTO sections (section_name, year_level) VALUES (?, ?)', [
        String(req.body.section_name || '').trim(),
        intValue(req.body.year_level)
      ]);
      req.flash('success', 'Section added.');
      return res.redirect('/executive/sections');
    }

    if (action === 'update_section') {
      await pool.execute('UPDATE sections SET section_name = ?, year_level = ? WHERE id = ?', [
        String(req.body.section_name || '').trim(),
        intValue(req.body.year_level),
        intValue(req.body.section_id)
      ]);
      req.flash('success', 'Section updated.');
      return res.redirect('/executive/sections');
    }

    if (action === 'delete_section') {
      await transaction(async (db) => {
        const sectionId = intValue(req.body.section_id);
        await db.execute('DELETE FROM representatives WHERE section_id = ?', [sectionId]);
        await db.execute('UPDATE users SET section_id = NULL WHERE section_id = ?', [sectionId]);
        await db.execute('DELETE FROM sections WHERE id = ?', [sectionId]);
        await syncAllClearance(db);
      });
      req.flash('success', 'Section deleted. Former members are now unassigned.');
      return res.redirect('/executive/sections');
    }

    if (action === 'add_user') {
      const fullName = String(req.body.full_name || '').trim();
      const email = String(req.body.email || '').trim();
      const password = String(req.body.password || '');
      const role = String(req.body.role || 'student');
      const sectionId = intValue(req.body.section_id);
      const studentId = String(req.body.student_id || '').trim() || null;
      const hash = await bcrypt.hash(password, 10);

      await transaction(async (db) => {
        const [result] = await db.execute(
          `INSERT INTO users (student_id, full_name, email, password, role, section_id)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [studentId, fullName, email, hash, role, sectionId]
        );
        const userId = result.insertId;
        if (role === 'representative') {
          await db.execute("UPDATE users SET role = 'student' WHERE section_id = ? AND role IN ('rep', 'representative') AND id <> ?", [sectionId, userId]);
          await db.execute('DELETE FROM representatives WHERE user_id = ? OR section_id = ?', [userId, sectionId]);
          await db.execute('INSERT INTO representatives (user_id, section_id) VALUES (?, ?)', [userId, sectionId]);
        }
        await assignExistingTasksToUser(db, userId, sectionId);
        await syncUserClearance(db, userId);
      });

      req.flash('success', `${role} account added.`);
      return res.redirect(`/executive/${returnTo(req.body, 'students')}`);
    }

    if (action === 'update_user') {
      const userId = intValue(req.body.user_id);
      const sectionId = intValue(req.body.section_id);
      await pool.execute(
        `UPDATE users SET student_id = ?, full_name = ?, email = ?, section_id = ? WHERE id = ? AND role <> 'admin'`,
        [String(req.body.student_id || '').trim() || null, String(req.body.full_name || '').trim(), String(req.body.email || '').trim(), sectionId, userId]
      );
      await assignExistingTasksToUser(pool, userId, sectionId);
      await syncUserClearance(pool, userId);
      req.flash('success', 'User updated.');
      return res.redirect(`/executive/${returnTo(req.body, 'students')}`);
    }

    if (action === 'delete_student') {
      await pool.execute('DELETE FROM users WHERE id = ? AND role = "student"', [intValue(req.body.user_id)]);
      await syncAllClearance(pool);
      req.flash('success', 'Student removed.');
      return res.redirect(`/executive/${returnTo(req.body, 'students')}`);
    }

    if (action === 'elevate_user') {
      const userId = intValue(req.body.user_id);
      const role = String(req.body.role || '');
      const sectionId = intValue(req.body.section_id);

      if (!userId || !['executive', 'representative'].includes(role) || !sectionId) {
        req.flash('error', 'Select a valid user, role, and section.');
        return res.redirect('/executive/settings');
      }

      await transaction(async (db) => {
        const [users] = await db.execute('SELECT id, role FROM users WHERE id = ? AND role <> "admin"', [userId]);
        if (!users.length) throw new Error('User not found.');

        if (role === 'representative') {
          const [replacedUsers] = await db.execute('SELECT user_id FROM representatives WHERE section_id = ? AND user_id <> ?', [sectionId, userId]);
          await db.execute("UPDATE users SET role = 'student' WHERE section_id = ? AND role IN ('rep', 'representative') AND id <> ?", [sectionId, userId]);
          for (const replaced of replacedUsers) {
            await assignExistingTasksToUser(db, replaced.user_id, sectionId);
            await syncUserClearance(db, replaced.user_id);
          }
          await db.execute("UPDATE users SET role = 'representative', section_id = ? WHERE id = ?", [sectionId, userId]);
          await db.execute('DELETE FROM representatives WHERE user_id = ? OR section_id = ?', [userId, sectionId]);
          await db.execute('INSERT INTO representatives (user_id, section_id) VALUES (?, ?)', [userId, sectionId]);
        } else {
          await db.execute("UPDATE users SET role = 'executive', section_id = ? WHERE id = ?", [sectionId, userId]);
          await db.execute('DELETE FROM representatives WHERE user_id = ?', [userId]);
        }

        await assignExistingTasksToUser(db, userId, sectionId);
        await syncUserClearance(db, userId);
      });

      req.flash('success', `User elevated to ${role}.`);
      return res.redirect('/executive/settings');
    }

    // Accomplishment actions
    if (action === 'add_accomplishment') {
      try {
        const title = String(req.body.title || '').trim();
        const body = String(req.body.body || '').trim();
        const scope = String(req.body.scope || 'public');
        const metricLabel = String(req.body.metric_label || '').trim() || null;
        const metricValue = String(req.body.metric_value || '').trim() || null;
        const displayOrder = intValue(req.body.display_order);
        const displayAccomplishment = req.body.display_accomplishment ? 1 : 0;

        if (!title || !body) {
          req.flash('error', 'Title and description are required.');
          return res.redirect('/executive/accomplishments');
        }

        await pool.execute(
          `INSERT INTO landing_highlights (title, description, scope, type, display_highlight, metric_label, metric_value, display_order, created_by)
           VALUES (?, ?, ?, 'accomplishment', ?, ?, ?, ?, ?)`,
          [title, body, scope, displayAccomplishment, metricLabel, metricValue, displayOrder, req.session.user.id]
        );

        req.flash('success', 'Accomplishment published to landing page.');
        return res.redirect('/executive/accomplishments');
      } catch (error) {
        console.error('Error adding accomplishment:', error);
        req.flash('error', 'Failed to publish accomplishment.');
        return res.redirect('/executive/accomplishments');
      }
    }

    if (action === 'update_accomplishment') {
      try {
        const accomplishmentId = intValue(req.body.accomplishment_id);
        const title = String(req.body.title || '').trim();
        const body = String(req.body.body || '').trim();
        const scope = String(req.body.scope || 'public');
        const metricLabel = String(req.body.metric_label || '').trim() || null;
        const metricValue = String(req.body.metric_value || '').trim() || null;
        const displayOrder = intValue(req.body.display_order);
        const displayAccomplishment = req.body.display_accomplishment ? 1 : 0;

        if (!accomplishmentId || !title || !body) {
          req.flash('error', 'Title and description are required.');
          return res.redirect('/executive/accomplishments');
        }

        await pool.execute(
          `UPDATE landing_highlights SET title = ?, description = ?, scope = ?, display_highlight = ?, metric_label = ?, metric_value = ?, display_order = ?
           WHERE id = ? AND type = 'accomplishment'`,
          [title, body, scope, displayAccomplishment, metricLabel, metricValue, displayOrder, accomplishmentId]
        );

        req.flash('success', 'Accomplishment updated.');
        return res.redirect('/executive/accomplishments');
      } catch (error) {
        console.error('Error updating accomplishment:', error);
        req.flash('error', 'Failed to update accomplishment.');
        return res.redirect('/executive/accomplishments');
      }
    }

    if (action === 'delete_accomplishment') {
      try {
        const accomplishmentId = intValue(req.body.accomplishment_id);
        await pool.execute('DELETE FROM landing_highlights WHERE id = ? AND type = "accomplishment"', [accomplishmentId]);
        req.flash('success', 'Accomplishment deleted.');
        return res.redirect('/executive/accomplishments');
      } catch (error) {
        console.error('Error deleting accomplishment:', error);
        req.flash('error', 'Failed to delete accomplishment.');
        return res.redirect('/executive/accomplishments');
      }
    }

    req.flash('error', 'Unknown action.');
    return res.redirect('/executive/dashboard');
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      req.flash('error', 'That record already exists.');
      return res.redirect(`/executive/${returnTo(req.body)}`);
    }
    return next(error);
  }
});

export default router;
