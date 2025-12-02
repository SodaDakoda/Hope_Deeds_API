const express = require("express");
const { authRequired, requireRole } = require("../middleware/auth");

const {
  getOrgOverview,
  getUpcomingShifts,
  getRecentAttendance,
  getPendingVolunteers,
} = require("../controllers/admin.controller");

const router = express.Router();

// All admin routes require admin OR manager
router.use(authRequired, requireRole("admin", "manager"));

router.get("/overview", getOrgOverview);
router.get("/upcoming-shifts", getUpcomingShifts);
router.get("/recent-attendance", getRecentAttendance);
router.get("/pending-volunteers", getPendingVolunteers);

module.exports = router;
