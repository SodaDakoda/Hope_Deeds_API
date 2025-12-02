const express = require("express");
const {
  createOrganization,
  getOrganizationById,
} = require("../controllers/organizations.controller");
const { authRequired, requireRole } = require("../middleware/auth");

const router = express.Router();

// For now, leave this open so you can create orgs while developing.
// Later: router.post("/", authRequired, requireRole("admin"));
router.post("/", createOrganization);

// View an organization (admin/manager only)
router.get(
  "/:id",
  authRequired,
  requireRole("admin", "manager"),
  getOrganizationById
);

module.exports = router;
