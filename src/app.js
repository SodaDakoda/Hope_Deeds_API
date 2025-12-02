const kioskRoutes = require("./routes/kiosk.routes");
const opportunityRoutes = require("./routes/opportunities.routes");
const shiftRoutes = require("./routes/shifts.routes");
const volunteerRoutes = require("./routes/volunteers.routes");
const attendanceRoutes = require("./routes/attendance.routes");
const adminRoutes = require("./routes/admin.routes");

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const authRoutes = require("./routes/auth.routes");
const orgRoutes = require("./routes/organizations.routes");

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "HopeDeeds API is running" });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/organizations", orgRoutes);
app.use("/api/opportunities", opportunityRoutes);
app.use("/api/shifts", shiftRoutes);
app.use("/api/kiosk", kioskRoutes);
app.use("/api/volunteers", volunteerRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/admin", adminRoutes);

// Basic error handler
app.use((err, req, res, next) => {
  console.error("ERROR:", err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || "Internal server error",
  });
});

module.exports = app;
