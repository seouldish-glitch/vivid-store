const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

function isAdminUser(user) {
  if (!user || !user.email) return false;
  return ADMIN_EMAILS.includes(user.email.toLowerCase());
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || !isAdminUser(req.user)) {
    return res.status(403).json({ error: "Admin only" });
  }
  next();
}

module.exports = { requireAuth, requireAdmin, isAdminUser };
