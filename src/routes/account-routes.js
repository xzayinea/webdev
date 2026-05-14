import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { pool, query } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const profileUploadDir = path.join(__dirname, '..', '..', 'uploads', 'profiles');
fs.mkdirSync(profileUploadDir, { recursive: true });

const upload = multer({
  dest: profileUploadDir,
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype)) return cb(null, true);
    return cb(new Error('Only JPG, PNG, WEBP, and GIF images are allowed.'));
  }
});

const router = express.Router();
router.use(requireAuth);

function normalizeAccent(value) {
  const color = String(value || '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#2f80ed';
}

function publicUploadPath(file, prefix, userId) {
  if (!file) return null;
  const extension = path.extname(file.originalname).toLowerCase() || '.png';
  const fileName = `${prefix}_${userId}_${Date.now()}${extension}`;
  const finalPath = path.join(profileUploadDir, fileName);
  fs.renameSync(file.path, finalPath);
  return `uploads/profiles/${fileName}`;
}

function deleteOldProfileFile(publicPath) {
  if (!publicPath) return;
  const filePath = path.resolve(path.join(__dirname, '..', '..', publicPath));
  if (filePath.startsWith(profileUploadDir) && fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

router.get('/profile', async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT u.id, u.student_id, u.full_name, u.email, u.role, u.section_id,
         u.profile_bio, u.profile_status, u.profile_avatar_path, u.profile_banner_path, u.profile_accent_color,
         COALESCE(s.section_name, 'Unassigned') AS section_name
       FROM users u
       LEFT JOIN sections s ON s.id = u.section_id
       WHERE u.id = ?`,
      [req.session.user.id]
    );
    const account = rows[0];
    if (!account) {
      req.flash('error', 'Account not found.');
      return res.redirect('/');
    }
    return res.render('account/profile', { title: 'My Profile', active: 'profile', account, isSelf: true });
  } catch (error) {
    return next(error);
  }
});

router.get('/profile/:id', async (req, res, next) => {
  const requestedId = Number.parseInt(req.params.id, 10) || 0;
  const viewer = req.session.user;

  try {
    if (!requestedId) {
      req.flash('error', 'Invalid profile link.');
      return res.redirect('/');
    }

    if (requestedId === viewer.id) return res.redirect('/account/profile');

    const rows = await query(
      `SELECT u.id, u.student_id, u.full_name, u.email, u.role, u.section_id,
         u.profile_bio, u.profile_status, u.profile_avatar_path, u.profile_banner_path, u.profile_accent_color,
         COALESCE(s.section_name, 'Unassigned') AS section_name
       FROM users u
       LEFT JOIN sections s ON s.id = u.section_id
       WHERE u.id = ?`,
      [requestedId]
    );
    const account = rows[0];
    if (!account) {
      req.flash('error', 'Profile not found.');
      return res.redirect('/');
    }

    const isExecutive = ['admin', 'executive'].includes(viewer.role);
    const isRepresentative = ['rep', 'representative'].includes(viewer.role);
    const sameSection = Number(viewer.sectionId || 0) && Number(viewer.sectionId) === Number(account.section_id || 0);

    if (!isExecutive && !(isRepresentative && sameSection)) {
      req.flash('error', 'You do not have access to that profile.');
      return res.redirect('/');
    }

    return res.render('account/profile', {
      title: `${account.full_name} · Profile`,
      active: '',
      account,
      isSelf: false
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/avatar', async (req, res, next) => {
  try {
    const userId = req.session.user.id;
    const rows = await query(`SELECT profile_avatar_path FROM users WHERE id = ?`, [userId]);
    const avatarPath = rows?.[0]?.profile_avatar_path;
    if (!avatarPath) return res.status(404).end();
    return res.redirect(`/${avatarPath}`);
  } catch (error) {
    return next(error);
  }
});

router.post('/profile', upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'banner', maxCount: 1 }]), async (req, res, next) => {
  const userId = req.session.user.id;
  const fullName = String(req.body.full_name || '').trim();
  const status = String(req.body.profile_status || '').trim().slice(0, 80) || null;
  const bio = String(req.body.profile_bio || '').trim().slice(0, 280) || null;
  const accentColor = normalizeAccent(req.body.profile_accent_color);

  try {
    if (!fullName) {
      req.flash('error', 'Name is required.');
      return res.redirect('/account/profile');
    }

    const existingRows = await query(
      `SELECT profile_avatar_path, profile_banner_path FROM users WHERE id = ?`,
      [userId]
    );
    const existing = existingRows[0];
    if (!existing) {
      req.flash('error', 'Account not found.');
      return res.redirect('/');
    }

    const avatarPath = publicUploadPath(req.files?.avatar?.[0], 'avatar', userId);
    const bannerPath = publicUploadPath(req.files?.banner?.[0], 'banner', userId);

    await pool.execute(
      `UPDATE users
       SET full_name = ?,
           profile_status = ?,
           profile_bio = ?,
           profile_accent_color = ?,
           profile_avatar_path = COALESCE(?, profile_avatar_path),
           profile_banner_path = COALESCE(?, profile_banner_path)
       WHERE id = ?`,
      [fullName, status, bio, accentColor, avatarPath, bannerPath, userId]
    );

    if (avatarPath) deleteOldProfileFile(existing.profile_avatar_path);
    if (bannerPath) deleteOldProfileFile(existing.profile_banner_path);

    req.session.user.fullName = fullName;
    req.session.user.sectionName ||= 'Unassigned';
    req.session.user.profileStatus = status;
    req.session.user.profileBio = bio;
    req.session.user.profileAvatarPath = avatarPath || req.session.user.profileAvatarPath || existing.profile_avatar_path;
    req.session.user.profileBannerPath = bannerPath || req.session.user.profileBannerPath || existing.profile_banner_path;
    req.session.user.profileAccentColor = accentColor;

    req.flash('success', 'Profile updated.');
    return res.redirect('/account/profile');
  } catch (error) {
    return next(error);
  }
});

router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError || error.message === 'Only JPG, PNG, WEBP, and GIF images are allowed.') {
    req.flash('error', error.code === 'LIMIT_FILE_SIZE' ? 'Images must be 4MB or smaller.' : error.message);
    return res.redirect('/account/profile');
  }
  return next(error);
});

export default router;
