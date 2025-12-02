const express = require("express");
const {
  createShift,
  getShiftDetails,
  updateShift,
  deleteShift,
  signupForShift,
  cancelShiftSignup,
  listShiftSignups,
} = require("../controllers/shifts.controller");
const { authRequired, requireRole } = require("../middleware/auth");

const router = express.Router();

// Admin/Manager: create shift
router.post("/", authRequired, requireRole("admin", "manager"), createShift);

// Anyone in org (admin/manager/volunteer): view shift
router.get("/:id", authRequired, getShiftDetails);

// Admin/Manager: update shift
router.put("/:id", authRequired, requireRole("admin", "manager"), updateShift);

// Admin/Manager: delete shift
router.delete(
  "/:id",
  authRequired,
  requireRole("admin", "manager"),
  deleteShift
);

// Volunteer signup
router.post("/:id/signup", authRequired, signupForShift);
router.delete("/:id/signup", authRequired, cancelShiftSignup);

// Admin/Manager: view signups
router.get(
  "/:id/signups",
  authRequired,
  requireRole("admin", "manager"),
  listShiftSignups
);

module.exports = router;
