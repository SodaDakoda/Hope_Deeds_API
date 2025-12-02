const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

function authRequired(req, res, next) {
  const header = req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "Missing or invalid Authorization header" });
  }

  const token = header.replace("Bearer ", "").trim();

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { id, role, organizationId }
    next();
  } catch (err) {
    console.error("JWT error:", err);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Pass roles like: requireRole("admin", "manager")
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ error: "Forbidden: insufficient permissions" });
    }
    next();
  };
}

module.exports = {
  authRequired,
  requireRole,
};
