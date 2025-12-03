const express = require("express");
const router = express.Router();

const {
  registerOrganization,
  loginOrganization,
  getMe,
} = require("../controllers/auth.controller");

const { authRequired } = require("../middleware/auth");

// FRONTEND EXPECTS THESE EXACT ENDPOINTS:

// Register Org
router.post("/register-org", registerOrganization);

// Login Org
router.post("/login", loginOrganization);

// Get logged-in org user
router.get("/me", authRequired, getMe);

module.exports = router;
