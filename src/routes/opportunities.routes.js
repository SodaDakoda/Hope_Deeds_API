const express = require("express");
const {
  createOpportunity,
  listOpportunitiesForOrg,
  getOpportunityDetails,
  updateOpportunity,
  deleteOpportunity,
} = require("../controllers/opportunities.controller");
const { authRequired, requireRole } = require("../middleware/auth");

const router = express.Router();

// List all opportunities for current user's org
router.get("/", authRequired, listOpportunitiesForOrg);

// Get single opportunity (with shifts) for current user's org
router.get("/:id", authRequired, getOpportunityDetails);

// Admin / Manager only: create opportunity for their org
router.post(
  "/",
  authRequired,
  requireRole("admin", "manager"),
  createOpportunity
);

// Admin / Manager only: update
router.put(
  "/:id",
  authRequired,
  requireRole("admin", "manager"),
  updateOpportunity
);

// Admin / Manager only: delete (cascades shifts + signups)
router.delete(
  "/:id",
  authRequired,
  requireRole("admin", "manager"),
  deleteOpportunity
);

module.exports = router;
