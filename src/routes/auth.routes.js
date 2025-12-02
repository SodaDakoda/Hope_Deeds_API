const express = require("express");
const router = express.Router();
const {
  registerOrganization,
  loginOrganization,
  getMe,
} = require("../controllers/auth.controller");
const { authRequired } = require("../middleware/auth");

// REGISTER ORG
router.post("/register-org", registerOrganization);

// LOGIN ORG
router.post("/login-org", loginOrganization);

// GET CURRENT USER (org admin)
router.get("/me", authRequired, getMe);

module.exports = router;
