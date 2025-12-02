const express = require("express");
const {
  listVolunteers,
  getVolunteerDetails,
  updateVolunteer,
  approveBackgroundCheck,
  approveOrientation,
  deactivateVolunteer,
  addHours,
  listHours,
  deleteHour,
} = require("../controllers/volunteers.controller");

const { authRequired, requireRole } = require("../middleware/auth");

const router = express.Router();

// Admin/Manager: list volunteers in org
router.get("/", authRequired, requireRole("admin", "manager"), listVolunteers);

// Admin/Manager: get a single volunteer
router.get(
  "/:id",
  authRequired,
  requireRole("admin", "manager"),
  getVolunteerDetails
);

// Admin/Manager: update volunteer info
router.put(
  "/:id",
  authRequired,
  requireRole("admin", "manager"),
  updateVolunteer
);

// Admin/Manager: approve background check
router.patch(
  "/:id/background-check",
  authRequired,
  requireRole("admin", "manager"),
  approveBackgroundCheck
);

// Admin/Manager: approve orientation
router.patch(
  "/:id/orientation",
  authRequired,
  requireRole("admin", "manager"),
  approveOrientation
);

// Admin/Manager: deactivate volunteer
router.patch(
  "/:id/deactivate",
  authRequired,
  requireRole("admin", "manager"),
  deactivateVolunteer
);

// Volunteer hours system
router.get(
  "/:id/hours",
  authRequired,
  requireRole("admin", "manager"),
  listHours
);

router.post(
  "/:id/hours/add",
  authRequired,
  requireRole("admin", "manager"),
  addHours
);

router.delete(
  "/:id/hours/:hourId",
  authRequired,
  requireRole("admin", "manager"),
  deleteHour
);

module.exports = router;
