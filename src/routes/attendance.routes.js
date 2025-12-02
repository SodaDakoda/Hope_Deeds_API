const express = require("express");
const { authRequired, requireRole } = require("../middleware/auth");

const {
  checkIn,
  checkOut,
  getAttendanceForUser,
  getAttendanceForShift,
  adminEditAttendance,
} = require("../controllers/attendance.controller");

const router = express.Router();

router.post("/checkin", authRequired, checkIn);
router.post("/checkout", authRequired, checkOut);

router.get(
  "/user/:id",
  authRequired,
  requireRole("admin", "manager"),
  getAttendanceForUser
);
router.get(
  "/shift/:id",
  authRequired,
  requireRole("admin", "manager"),
  getAttendanceForShift
);

router.put(
  "/:id",
  authRequired,
  requireRole("admin", "manager"),
  adminEditAttendance
);

module.exports = router;
