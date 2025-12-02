const express = require("express");
const {
  kioskCheckIn,
  kioskCheckOut,
  kioskCurrentRoster,
} = require("../controllers/kiosk.controller");

const { authRequired, requireRole } = require("../middleware/auth");

const router = express.Router();

// For now: kiosk actions require an admin/manager token
router.post(
  "/checkin",
  authRequired,
  requireRole("admin", "manager"),
  kioskCheckIn
);

router.post(
  "/checkout",
  authRequired,
  requireRole("admin", "manager"),
  kioskCheckOut
);

router.get(
  "/current-roster",
  authRequired,
  requireRole("admin", "manager"),
  kioskCurrentRoster
);

module.exports = router;
