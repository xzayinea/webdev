export const executiveRoles = ['admin', 'executive'];
export const representativeRoles = ['admin', 'executive', 'rep', 'representative'];
export const studentRoles = ['student', 'rep', 'representative', 'executive'];

export function requireAuth(req, res, next) {
  if (!req.session.user) {
    req.flash('error', 'Please log in first.');
    return res.redirect('/');
  }
  return next();
}

export function requireRole(roles) {
  return (req, res, next) => {
    if (!req.session.user || !roles.includes(req.session.user.role)) {
      req.flash('error', 'You do not have access to that page.');
      return res.redirect('/');
    }
    return next();
  };
}

export function currentUser(req) {
  return req.session.user || null;
}

export function isExecutive(user) {
  return user && executiveRoles.includes(user.role);
}
