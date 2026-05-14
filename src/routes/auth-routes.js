import express from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';

const router = express.Router();

function dashboardPath(user) {
  if (!user) return '/login';
  if (['admin', 'executive'].includes(user.role)) return '/executive/dashboard';
  if (['rep', 'representative'].includes(user.role)) return '/representative/dashboard';
  return '/student/dashboard';
}

function landingScopeWhere(user) {
  return user ? "scope IN ('public', 'students')" : "scope = 'public'";
}

router.get('/', async (req, res, next) => {
  try {
    const visibleScope = landingScopeWhere(req.session.user);
    const [[summary]] = await pool.execute(
      `SELECT
         (SELECT COUNT(*) FROM sections) AS section_count,
         (SELECT COUNT(*) FROM users WHERE section_id IS NOT NULL AND role IN ('student', 'rep', 'representative', 'executive')) AS member_count,
         (SELECT COUNT(*) FROM users WHERE clearance_status = 'cleared' AND section_id IS NOT NULL) AS cleared_count,
         (SELECT COUNT(*) FROM requirement_assignments ra JOIN requirements r ON r.id = ra.requirement_id WHERE r.requirement_type = 'requirement' AND ra.submission_status = 'submitted') AS pending_reviews,
         (SELECT COALESCE(SUM(r.amount), 0) FROM requirement_assignments ra JOIN requirements r ON r.id = ra.requirement_id WHERE r.requirement_type IN ('payment', 'fine') AND ra.status = 'paid') AS collected_funds`
    );

    const [sections] = await pool.execute(
      `SELECT s.section_name,
         COUNT(DISTINCT st.id) AS member_count,
         COUNT(CASE WHEN r.requirement_type = 'requirement' THEN ra.id END) AS requirement_total,
         COALESCE(SUM(CASE WHEN r.requirement_type = 'requirement' AND ra.submission_status = 'verified' THEN 1 ELSE 0 END), 0) AS requirement_verified,
         COUNT(CASE WHEN r.requirement_type IN ('payment', 'fine') THEN ra.id END) AS money_total,
         COALESCE(SUM(CASE WHEN r.requirement_type IN ('payment', 'fine') AND ra.status = 'paid' THEN 1 ELSE 0 END), 0) AS money_paid
       FROM sections s
       LEFT JOIN users st ON st.section_id = s.id AND st.role IN ('student', 'rep', 'representative', 'executive')
       LEFT JOIN requirement_assignments ra ON ra.student_id = st.id
       LEFT JOIN requirements r ON r.id = ra.requirement_id
       GROUP BY s.id, s.section_name
       ORDER BY member_count DESC, s.section_name
       LIMIT 6`
    );

    // Accomplishments table dropped - consolidated into landing_highlights
    const accomplishments = [];

    // Events table dropped - use landing_highlights instead
    const events = [];

    let highlights = [];
    try {
      const visibleScope = landingScopeWhere(req.session.user);
      const [highlightsData] = await pool.execute(
        `SELECT id, title, description, image_path, event_date, card_position, type
         FROM landing_highlights
         WHERE display_highlight = 1
           AND card_position BETWEEN 1 AND 3
           AND ${visibleScope}
         ORDER BY card_position ASC`
      );
      highlights = highlightsData;
    } catch (error) {
      // Table may not exist yet, silently continue
      if (error.code !== 'ER_NO_SUCH_TABLE') {
        throw error;
      }
    }

    return res.render('public/home', {
      title: 'SyncClear',
      summary,
      sections,
      accomplishments,
      events,
      highlights,
      dashboardUrl: dashboardPath(req.session.user)
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect(dashboardPath(req.session.user));
  return res.render('auth/index', {
    title: 'SyncClear | Login',
    initialMode: req.query.mode === 'register' ? 'register' : 'login'
  });
});

router.post('/auth/register', async (req, res, next) => {
  const firstName = String(req.body.first_name || '').trim();
  const lastName = String(req.body.last_name || '').trim();
  const studentId = String(req.body.username || '').trim();
  const email = String(req.body.email || '').trim();
  const password = String(req.body.password || '');
  const confirmPassword = String(req.body.confirm_password || '');

  if (!firstName || !lastName || !studentId || !email || !password) {
    req.flash('error', 'Complete all required fields.');
    return res.redirect('/login?mode=register');
  }

  if (password !== confirmPassword) {
    req.flash('error', 'Passwords do not match.');
    return res.redirect('/login?mode=register');
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    await pool.execute(
      `INSERT INTO users (student_id, full_name, email, password, role, section_id)
       VALUES (?, ?, ?, ?, 'student', 1)`,
      [studentId, `${firstName} ${lastName}`, email, hash]
    );
    req.flash('success', 'Account created successfully. Please sign in.');
    return res.redirect('/login');
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      req.flash('error', 'Email or student ID already taken.');
      return res.redirect('/login?mode=register');
    }
    return next(error);
  }
});

router.post('/auth/login', async (req, res, next) => {
  const email = String(req.body.email || '').trim();
  const password = String(req.body.password || '');

  try {
    const [rows] = await pool.execute(
      `SELECT u.*, COALESCE(s.section_name, 'Unassigned') AS section_name
       FROM users u
       LEFT JOIN sections s ON s.id = u.section_id
       WHERE u.email = ?`,
      [email]
    );
    const user = rows[0];

    if (!user) {
      req.flash('error', 'Invalid email or password.');
      return res.redirect('/login');
    }

    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      req.flash('error', 'Invalid email or password.');
      return res.redirect('/login');
    }

    req.session.user = {
      id: user.id,
      fullName: user.full_name,
      role: user.role,
      sectionId: user.section_id,
      sectionName: user.section_name,
      profileStatus: user.profile_status,
      profileBio: user.profile_bio,
      profileAvatarPath: user.profile_avatar_path,
      profileBannerPath: user.profile_banner_path,
      profileAccentColor: user.profile_accent_color
    };

    if (['admin', 'executive'].includes(user.role)) return res.redirect('/executive/dashboard');
    if (['rep', 'representative'].includes(user.role)) return res.redirect('/representative/dashboard');
    return res.redirect('/student/dashboard');
  } catch (error) {
    req.flash('error', 'An error occurred during login. Please try again.');
    return res.redirect('/login');
  }
});

router.post('/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destroy error:', err);
      // Still redirect even if error occurs
    }
    // Clear all potential session cookies
    res.clearCookie('connect.sid');
    res.clearCookie('sessionId');
    res.clearCookie('sid');
    res.redirect('/');
  });
});

export default router;
