const express = require("express");
const router = express.Router();

const {
  registerOrganization,
  loginOrganization,
  getMe,
} = require("../controllers/auth.controller");

const { authRequired } = require("../middleware/auth");

// ORG AUTH ROUTES
router.post("/org/register", registerOrganization);
router.post("/org/login", loginOrganization);
router.get("/org/me", authRequired, getMe);

module.exports = router;
