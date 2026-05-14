import { pool } from '../config/db.js';

const USER_REFRESH_MS = 60_000;

export async function attachViewData(req, res, next) {
  try {
    const sessionUser = req.session.user || null;

    // Keep the session user lightweight but ensure profile media stays in sync.
    // Some pages read directly from the database (account profile), while others
    // rely on session (sidebar/dashboard). If the avatar is missing/stale, refresh
    // a small set of fields periodically.
    if (sessionUser?.id) {
      const now = Date.now();
      const lastRefresh = Number(sessionUser._lastUserRefreshAt || 0);
      const shouldRefresh =
        !sessionUser.profileAvatarPath ||
        !sessionUser.profileBannerPath ||
        !sessionUser.profileAccentColor ||
        now - lastRefresh > USER_REFRESH_MS;

      if (shouldRefresh) {
        try {
          const [rows] = await pool.execute(
            `SELECT u.full_name, u.role, u.section_id,
                    u.profile_status, u.profile_bio,
                    u.profile_avatar_path, u.profile_banner_path, u.profile_accent_color,
                    COALESCE(s.section_name, 'Unassigned') AS section_name
               FROM users u
               LEFT JOIN sections s ON s.id = u.section_id
              WHERE u.id = ?
              LIMIT 1`,
            [sessionUser.id]
          );
          const user = rows?.[0];
          if (user) {
            sessionUser.fullName = user.full_name ?? sessionUser.fullName;
            sessionUser.role = user.role ?? sessionUser.role;
            sessionUser.sectionId = user.section_id ?? sessionUser.sectionId;
            sessionUser.sectionName = user.section_name ?? sessionUser.sectionName;
            sessionUser.profileStatus = user.profile_status ?? sessionUser.profileStatus;
            sessionUser.profileBio = user.profile_bio ?? sessionUser.profileBio;
            sessionUser.profileAvatarPath = user.profile_avatar_path ?? sessionUser.profileAvatarPath;
            sessionUser.profileBannerPath = user.profile_banner_path ?? sessionUser.profileBannerPath;
            sessionUser.profileAccentColor = user.profile_accent_color ?? sessionUser.profileAccentColor;
            sessionUser._lastUserRefreshAt = now;
          }
        } catch {
          // If DB is unavailable, keep rendering with what we have.
        }
      }
    }

    res.locals.user = sessionUser;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    res.locals.query = req.query || {};
    res.locals.originalUrl = req.originalUrl;
    return next();
  } catch (error) {
    return next(error);
  }
}
